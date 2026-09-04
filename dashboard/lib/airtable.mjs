// airtable.mjs — the one door to Airtable for Growth Command.
//
// Raw fetch against the REST API, no SDK. Everything is paced through a single
// gate because Prospects and Touches live in the SAME base as the site's live
// Leads table: Airtable allows 5 requests per second per base and answers a
// burst with a 429 plus a ~30 second lockout on the whole base, which would
// also reject a visitor's form submission landing at that moment.
//
// Field names are the caller's problem (see the PF and TF maps in store.mjs).
// Airtable rejects a whole write on one unknown column name with an error that
// never says which, so probeFields() checks them one at a time.

const API_KEY = () => (process.env.AIRTABLE_API_KEY || '').trim();
const BASE_ID = () => (process.env.AIRTABLE_BASE_ID || '').trim();

export const usingAirtable = () => !!(API_KEY() && BASE_ID());

const headers = () => ({ Authorization: `Bearer ${API_KEY()}`, 'Content-Type': 'application/json' });
const tableApi = (table) => `https://api.airtable.com/v0/${BASE_ID()}/${encodeURIComponent(table)}`;

export const recordUrl = (table, id) => `https://airtable.com/${BASE_ID()}/${encodeURIComponent(table)}/${id}`;

// ── Rate gate ────────────────────────────────────────────────────────────────
const MIN_GAP_MS = 260; // about 3.8 requests a second, under the 5/s ceiling
let gate = Promise.resolve();
export function paced(fn) {
  const turn = gate.then(fn);
  gate = gate.then(() => new Promise((r) => setTimeout(r, MIN_GAP_MS)));
  return turn;
}

export async function atFetch(table, path = '', opts = {}, timeoutMs = 20000) {
  return paced(async () => {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(tableApi(table) + path, { ...opts, headers: headers(), signal: ctl.signal });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(`Airtable ${table} ${res.status}: ${JSON.stringify(data.error || data)}`);
        err.status = res.status;
        throw err;
      }
      return data;
    } finally {
      clearTimeout(t);
    }
  });
}

// ── Reads ────────────────────────────────────────────────────────────────────
// Paginated read. `filterByFormula` and `sortField` are best effort: a formula
// or sort that names a column the table lacks 422s, and we would rather show
// the whole table than a blank board, so both fall away on that error.
export async function readTable(table, { filterByFormula = '', sortField = '', desc = true, fields = [] } = {}) {
  const page = async ({ withFilter, withSort }) => {
    const out = [];
    let offset = null;
    do {
      const q = new URLSearchParams();
      q.set('pageSize', '100');
      if (withFilter && filterByFormula) q.set('filterByFormula', filterByFormula);
      if (withSort && sortField) {
        q.set('sort[0][field]', sortField);
        q.set('sort[0][direction]', desc ? 'desc' : 'asc');
      }
      for (const f of fields) q.append('fields[]', f);
      if (offset) q.set('offset', offset);
      const data = await atFetch(table, '?' + q.toString());
      out.push(...(data.records || []));
      offset = data.offset || null;
    } while (offset);
    return out;
  };
  try {
    return await page({ withFilter: true, withSort: true });
  } catch (e) {
    if (e.status === 422 && (filterByFormula || sortField)) {
      console.warn(`  airtable: ${table} filter/sort rejected (${e.message}); reading unfiltered.`);
      return page({ withFilter: false, withSort: false });
    }
    throw e;
  }
}

// ── Writes ───────────────────────────────────────────────────────────────────
// `typecast: true` lets a new single-select value create its own option, so a
// fresh Source or Industry never 422s.
export async function createRecords(table, fieldsList) {
  const created = [];
  for (let i = 0; i < fieldsList.length; i += 10) {
    const chunk = fieldsList.slice(i, i + 10).map((fields) => ({ fields }));
    const data = await atFetch(table, '', {
      method: 'POST',
      body: JSON.stringify({ records: chunk, typecast: true }),
    });
    created.push(...(data.records || []));
  }
  return created;
}

export async function patchRecord(table, id, fields) {
  const data = await atFetch(table, `/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields, typecast: true }),
  });
  return data;
}

// ── Schema probe ─────────────────────────────────────────────────────────────
// One `fields[]` GET per column. 422 means the column is missing or misnamed;
// anything else is a real failure and is reported as such.
export async function probeFields(table, names) {
  const missing = [];
  for (const name of names) {
    try {
      await atFetch(table, `?maxRecords=1&${new URLSearchParams({ 'fields[]': name })}`);
    } catch (e) {
      if (e.status === 422) missing.push(name);
      else return { ok: false, table, reason: e.message };
    }
  }
  return missing.length
    ? { ok: false, table, missing, reason: `Missing or misnamed column(s) in ${table}: ${missing.join(', ')}` }
    : { ok: true, table, fields: names };
}
