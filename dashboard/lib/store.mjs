// store.mjs — where prospects and touches live.
//
// One interface, two backends:
//   airtableStore  when AIRTABLE_API_KEY and AIRTABLE_BASE_ID are set (the same
//                  check netlify/functions/submit-lead.mjs makes), against two
//                  tables in the FrontPage Labs base
//   jsonStore      otherwise, over data/prospects.json and data/touches.json,
//                  so the board runs before Airtable is configured
//
// Column names are byte-exact and live ONLY in the PF and TF maps below. A
// typo here 422s every write with an error that never names the column, which
// is why GET /api/verify probes them one at a time.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { usingAirtable, readTable, createRecords, patchRecord, probeFields, recordUrl } from './airtable.mjs';
import { blank } from './prospects.mjs';
import { toLocalDate } from './localdate.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, '..', 'data');

const PROSPECTS = () => (process.env.AIRTABLE_PROSPECTS_TABLE || 'Prospects').trim();
const TOUCHES = () => (process.env.AIRTABLE_TOUCHES_TABLE || 'Touches').trim();

// Prospect field → Airtable column.
export const PF = {
  name: 'Company', contact: 'Contact', email: 'Email', phone: 'Phone', website: 'Website',
  linkedinUrl: 'LinkedIn URL', instagramUrl: 'Instagram URL', industry: 'Industry', city: 'City',
  service: 'Service Fit', value: 'Value', stage: 'Stage', channel: 'Channel',
  seqStatus: 'Sequence Status', stepSent: 'Step Sent', nextTouch: 'Next Touch', lastTouch: 'Last Touch',
  nextStep: 'Next Step', source: 'Source', owner: 'Owner', notes: 'Notes',
  siteText: 'Site Text', siteFetched: 'Site Fetched', drafts: 'Draft Cache',
};

// Touch field → Airtable column.
export const TF = {
  prospectId: 'Prospect ID', company: 'Company', channel: 'Channel', kind: 'Kind', step: 'Step',
  subject: 'Subject', body: 'Body', staff: 'Staff', at: 'Sent At',
};

const DATE_FIELDS = new Set(['nextTouch', 'lastTouch', 'siteFetched']);
const SELECT_FIELDS = new Set(['industry', 'service', 'stage', 'channel', 'seqStatus', 'source']);

// The working set: anything still in play. Closed deals fall out after 90
// days so the read stays small as the table grows. If a column is missing the
// formula 422s and airtable.mjs falls back to reading everything.
const WORKING_SET = `OR({${PF.seqStatus}}='Active', AND({${PF.stage}}!='Won', {${PF.stage}}!='Lost'), IF({${PF.lastTouch}}, IS_AFTER({${PF.lastTouch}}, DATEADD(TODAY(), -90, 'days')), 0))`;

// ── Mapping ──────────────────────────────────────────────────────────────────
function prospectFromRecord(rec) {
  const f = rec.fields || {};
  const p = blank();
  for (const [key, col] of Object.entries(PF)) {
    const v = f[col];
    if (v === undefined || v === null) continue;
    if (key === 'drafts') { try { p.drafts = JSON.parse(v) || {}; } catch { p.drafts = {}; } }
    else if (key === 'value' || key === 'stepSent') p[key] = Number(v) || 0;
    else if (DATE_FIELDS.has(key)) p[key] = toLocalDate(v);
    else p[key] = String(v);
  }
  if (!p.seqStatus) p.seqStatus = 'Active';
  if (!p.stage) p.stage = 'New';
  p.id = rec.id;
  p.created = rec.createdTime || '';
  p.recordUrl = recordUrl(PROSPECTS(), rec.id);
  return p;
}

function prospectToFields(patch) {
  const out = {};
  for (const [key, col] of Object.entries(PF)) {
    if (!(key in patch)) continue;
    let v = patch[key];
    if (key === 'drafts') v = JSON.stringify(v || {});
    else if (key === 'value' || key === 'stepSent') v = Number(v) || 0;
    else if (DATE_FIELDS.has(key)) v = v ? toLocalDate(v) || null : null;
    else if (SELECT_FIELDS.has(key)) v = v ? String(v) : null;
    else v = v === undefined || v === null ? '' : String(v);
    out[col] = v;
  }
  return out;
}

function touchFromRecord(rec) {
  const f = rec.fields || {};
  return {
    id: rec.id,
    prospectId: String(f[TF.prospectId] || ''),
    company: String(f[TF.company] || ''),
    channel: String(f[TF.channel] || ''),
    kind: String(f[TF.kind] || ''),
    step: String(f[TF.step] || ''),
    subject: String(f[TF.subject] || ''),
    body: String(f[TF.body] || ''),
    staff: String(f[TF.staff] || ''),
    at: String(f[TF.at] || rec.createdTime || ''),
  };
}

function touchToFields(t) {
  const out = {};
  for (const [key, col] of Object.entries(TF)) out[col] = t[key] === undefined || t[key] === null ? '' : String(t[key]);
  return out;
}

// ── Airtable backend ─────────────────────────────────────────────────────────
const airtableStore = {
  kind: 'airtable',
  async listProspects() {
    const recs = await readTable(PROSPECTS(), { filterByFormula: WORKING_SET });
    return recs.map(prospectFromRecord);
  },
  async listTouches({ days = 60 } = {}) {
    const recs = await readTable(TOUCHES(), {
      filterByFormula: `IS_AFTER({${TF.at}}, DATEADD(NOW(), -${Math.max(1, Math.round(days))}, 'days'))`,
      sortField: TF.at, desc: true,
    });
    return recs.map(touchFromRecord);
  },
  async createProspects(list) {
    const recs = await createRecords(PROSPECTS(), list.map(prospectToFields));
    return recs.map(prospectFromRecord);
  },
  async updateProspect(id, patch) {
    const rec = await patchRecord(PROSPECTS(), id, prospectToFields(patch));
    return prospectFromRecord(rec);
  },
  async createTouch(t) {
    const [rec] = await createRecords(TOUCHES(), [touchToFields(t)]);
    return touchFromRecord(rec);
  },
  async verify() {
    const p = await probeFields(PROSPECTS(), Object.values(PF));
    const t = await probeFields(TOUCHES(), Object.values(TF));
    return { ok: p.ok && t.ok, prospects: p, touches: t };
  },
};

// ── Local JSON backend ───────────────────────────────────────────────────────
const P_FILE = join(DATA, 'prospects.json');
const T_FILE = join(DATA, 'touches.json');
const newId = (prefix) => `${prefix}_${Date.now().toString(36)}${randomBytes(3).toString('hex')}`;

async function readJson(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')); } catch { return fallback; }
}
async function writeJson(file, obj) {
  await mkdir(DATA, { recursive: true });
  await writeFile(file, JSON.stringify(obj, null, 2) + '\n');
}

// Serialize local writes so two quick ticks cannot clobber each other.
let lock = Promise.resolve();
const locked = (fn) => (lock = lock.then(fn, fn));

const jsonStore = {
  kind: 'local',
  async listProspects() {
    const { prospects = [] } = await readJson(P_FILE, {});
    return prospects.map((p) => ({ ...blank(), ...p, recordUrl: '' }));
  },
  async listTouches({ days = 60 } = {}) {
    const { touches = [] } = await readJson(T_FILE, {});
    const since = Date.now() - days * 86400000;
    return touches.filter((t) => new Date(t.at).getTime() >= since).sort((a, b) => (a.at < b.at ? 1 : -1));
  },
  createProspects(list) {
    return locked(async () => {
      const db = await readJson(P_FILE, { prospects: [] });
      const made = list.map((p) => ({ ...blank(), ...p, id: newId('loc'), created: new Date().toISOString(), recordUrl: '' }));
      db.prospects.push(...made);
      await writeJson(P_FILE, db);
      return made;
    });
  },
  updateProspect(id, patch) {
    return locked(async () => {
      const db = await readJson(P_FILE, { prospects: [] });
      const i = db.prospects.findIndex((p) => p.id === id);
      if (i < 0) throw Object.assign(new Error('No such prospect'), { status: 404 });
      const allowed = {};
      for (const k of Object.keys(PF)) if (k in patch) allowed[k] = patch[k];
      db.prospects[i] = { ...db.prospects[i], ...allowed };
      await writeJson(P_FILE, db);
      return { ...blank(), ...db.prospects[i], recordUrl: '' };
    });
  },
  createTouch(t) {
    return locked(async () => {
      const db = await readJson(T_FILE, { touches: [] });
      const made = { ...t, id: newId('tch') };
      db.touches.push(made);
      await writeJson(T_FILE, db);
      return made;
    });
  },
  async verify() {
    return { ok: true, local: true, reason: 'Local JSON store; nothing to probe.' };
  },
};

export function getStore() {
  return usingAirtable() ? airtableStore : jsonStore;
}

export const tableNames = () => ({ prospects: PROSPECTS(), touches: TOUCHES() });
