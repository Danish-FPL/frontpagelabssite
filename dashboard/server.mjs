// Growth Command — local-only internal dashboard for FrontPage Labs.
//
// Bare Node http (no express), a single-file vanilla front end, and a signed
// HttpOnly cookie derived from a shared PIN. No build step, no framework. It
// lives outside `src/` and `public/`, so Astro never sees it and it can never
// be published with the marketing site.
//
// What it does now (v2, 2026-09): prospects and touches live in Airtable (or a
// local JSON file until Airtable is configured), the Today tab rations the
// day's outreach by the caps in settings, Claude drafts each message from the
// prospect's own website, and Danish sends every one by hand. The only
// outbound calls are Airtable, the Anthropic API, and prospects' public sites.
// No endpoint ever contacts a prospect.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { join, dirname, extname, normalize as normPath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';

import { getStore, tableNames } from './lib/store.mjs';
import { usingAirtable, readTable } from './lib/airtable.mjs';
import { normalize, shape, dedupeIndex, findDuplicate, addToIndex, toCsv, STAGES, OPEN_STAGES, CSV_COLUMNS } from './lib/prospects.mjs';
import { buildToday } from './lib/queue.mjs';
import * as T from './lib/touches.mjs';
import { getSettings, saveSettings } from './lib/settings.mjs';
import { localDate, toLocalDate, daysBetween } from './lib/localdate.mjs';
import { hasDrafter, draftFor, startBatch, batchStatus, costToday, MODEL } from './lib/drafter.mjs';
import { hasResearch, research } from './lib/research.mjs';
import { weeklyReport } from './lib/report.mjs';
import { CHANNELS, SEQUENCES, stepAt } from './lib/sequences.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(HERE, 'public');
const SAMPLE_FILE = join(HERE, 'data', 'sample-data.json');
const AUDIT_FILE = join(HERE, 'data', 'site-audit.json');

const PORT = Number(process.env.FPL_DASH_PORT || 4787);
// Dev default keeps the board runnable out of the box; set FPL_DASH_PIN before
// this is ever pointed at real client data.
const PIN = process.env.FPL_DASH_PIN || '2468';
const STAFF = (process.env.FPL_DASH_STAFF || 'Danish').split(',').map((s) => s.trim()).filter(Boolean);

const COOKIE = 'fpl_dash';
const MAX_AGE = 7 * 24 * 60 * 60; // 7 days
const BOARD_TTL_MS = 2 * 60 * 1000;
const MAX_BODY = 2 * 1024 * 1024;

/* -------------------------------------------------------------------------
   Auth — HMAC over the staff name, keyed by the PIN. Changing the PIN
   invalidates every outstanding cookie, which is the intended behaviour.
   ------------------------------------------------------------------------- */

const sign = (value) => createHmac('sha256', PIN).update(value).digest('hex');

function makeToken(staff) {
  return `${Buffer.from(staff).toString('base64url')}.${sign(staff)}`;
}

function readToken(token) {
  if (!token || !token.includes('.')) return null;
  const [encoded, mac] = token.split('.');
  let staff;
  try {
    staff = Buffer.from(encoded, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  const expected = sign(staff);
  if (mac.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  return staff;
}

const parseCookies = (header = '') =>
  Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim().split('='))
      .filter(([k, v]) => k && v)
      .map(([k, ...rest]) => [k, decodeURIComponent(rest.join('='))]),
  );

const authed = (req) => readToken(parseCookies(req.headers.cookie)[COOKIE]);

/* -------------------------------------------------------------------------
   Board cache — prospects + touches, rebuilt every two minutes or on demand.
   Writes patch it in place so a tick shows instantly instead of waiting on a
   full Airtable re-read.
   ------------------------------------------------------------------------- */

let board = null;      // { prospects: [raw], touches: [raw], builtAt }
let building = null;   // in-flight rebuild, so parallel requests share it

async function loadBoard({ force = false } = {}) {
  const fresh = board && Date.now() - board.builtAt < BOARD_TTL_MS;
  if (fresh && !force) return board;
  if (!building) {
    building = (async () => {
      const store = getStore();
      const [prospects, touches] = await Promise.all([store.listProspects(), store.listTouches({ days: 60 })]);
      board = { prospects, touches, builtAt: Date.now() };
      return board;
    })().finally(() => { building = null; });
  }
  // Stale-while-revalidate: hand back what we have and let the rebuild land.
  if (board && !force) { building.catch((e) => console.error('  board refresh failed:', e.message)); return board; }
  return building;
}

function cachePatch(prospect, touch) {
  if (!board) return;
  if (prospect) {
    const i = board.prospects.findIndex((p) => p.id === prospect.id);
    if (i >= 0) board.prospects[i] = prospect; else board.prospects.unshift(prospect);
  }
  if (touch) board.touches.unshift(touch);
}

function cacheRemove(id) {
  if (board) board.prospects = board.prospects.filter((p) => p.id !== id);
}

async function findProspect(id) {
  await loadBoard();
  let p = board.prospects.find((x) => x.id === id);
  if (!p) { await loadBoard({ force: true }); p = board.prospects.find((x) => x.id === id); }
  if (!p) throw Object.assign(new Error('No such prospect on the board.'), { status: 404 });
  return p;
}

const touchesFor = (id) => (board ? board.touches.filter((t) => t.prospectId === id) : []);

function shaped(p, today = localDate()) {
  const s = shape(p, { touches: touchesFor(p.id), today });
  // 6,000 characters of site text per row is dead weight in the board payload.
  s.hasSiteText = !!p.siteText;
  delete s.siteText;
  return s;
}

async function sample() {
  let data = { clients: [], campaigns: [], templates: [] };
  try { data = JSON.parse(await readFile(SAMPLE_FILE, 'utf8')); } catch { /* fine */ }
  let siteAudit = [];
  try { siteAudit = JSON.parse(await readFile(AUDIT_FILE, 'utf8')).siteAudit ?? []; } catch { /* fine */ }
  return { clients: data.clients || [], campaigns: data.campaigns || [], templates: data.templates || [], siteAudit };
}

async function boardResponse(who, { refresh = false } = {}) {
  const { prospects, touches } = await loadBoard({ force: refresh });
  const today = localDate();
  const rows = prospects.map((p) => shaped(p, today));
  const settings = await getSettings();
  const todayQ = buildToday({ prospects: rows, touches, caps: settings.caps, today });
  const cutoff = new Date(Date.now() - 14 * 86400000).toISOString();
  const extra = await sample();
  return {
    ok: true,
    staff: who,
    staffList: STAFF,
    servedAt: new Date().toISOString(),
    builtAt: new Date(board.builtAt).toISOString(),
    backend: { store: getStore().kind, drafter: hasDrafter(), research: hasResearch(), model: MODEL, tables: tableNames(), spend: await costToday() },
    caps: settings.caps,
    stages: STAGES,
    channels: CHANNELS,
    sequences: SEQUENCES,
    today: todayQ,
    prospects: rows,
    recentTouches: touches.filter((t) => t.at >= cutoff).slice(0, 400),
    ...extra,
  };
}

/* -------------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------------- */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'cache-control': 'no-store', ...headers });
  res.end(body);
}

const sendJson = (res, status, obj, headers = {}) =>
  send(res, status, JSON.stringify(obj), { 'content-type': MIME['.json'], ...headers });

async function sendFile(res, path) {
  try {
    const body = await readFile(path);
    send(res, 200, body, { 'content-type': MIME[extname(path)] || 'application/octet-stream' });
  } catch {
    send(res, 404, 'Not found', { 'content-type': 'text/plain' });
  }
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw Object.assign(new Error('Request body too large.'), { status: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    return {};
  }
}

const fail = (res, e) => {
  const status = e.status || 500;
  if (status >= 500 && status !== 503) console.error('  ', e);
  else if (status === 503) console.warn('  ', e.message);
  return sendJson(res, status, { ok: false, error: String(e.message || e), code: e.code || '' });
};

// The five prospect-transition helpers share one shape: find, act, patch cache.
async function transition(res, body, who, fn) {
  const p = await findProspect(String(body.id || ''));
  const { prospect, touch } = await fn(p);
  cachePatch(prospect, touch);
  return sendJson(res, 200, { ok: true, prospect: shaped(prospect), touch });
}

const EDITABLE = ['name', 'contact', 'email', 'phone', 'website', 'linkedinUrl', 'instagramUrl', 'industry', 'city', 'service', 'value', 'nextStep', 'nextTouch', 'notes', 'owner'];

/* -------------------------------------------------------------------------
   Routes
   ------------------------------------------------------------------------- */

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method;

  try {
    // ── Pre-auth ──────────────────────────────────────────────────────────
    if (path === '/api/login' && method === 'POST') {
      const { pin, staff } = await readBody(req);
      if (String(pin || '') !== PIN) return sendJson(res, 401, { ok: false, error: 'That PIN did not match.' });
      const who = String(staff || '').trim() || 'Team';
      return sendJson(res, 200, { ok: true, staff: who }, {
        'set-cookie': `${COOKIE}=${makeToken(who)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}`,
      });
    }
    if (path === '/api/logout' && method === 'POST') {
      return sendJson(res, 200, { ok: true }, { 'set-cookie': `${COOKIE}=; HttpOnly; Path=/; Max-Age=0` });
    }
    if (path === '/api/staff') return sendJson(res, 200, { staff: STAFF });
    if (path === '/login' || path === '/login.html') return sendFile(res, join(PUBLIC_DIR, 'login.html'));
    // The bookmarklet hands its payload over in the URL fragment; a 302 to
    // /login would eat it. The page itself carries no data and its API calls
    // still 401 without the cookie.
    if (path === '/capture') return sendFile(res, join(PUBLIC_DIR, 'capture.html'));

    // ── Everything below needs the cookie ─────────────────────────────────
    const who = authed(req);
    if (!who) {
      if (path.startsWith('/api/')) return sendJson(res, 401, { ok: false, error: 'Not signed in' });
      if (path === '/' || path === '/index.html' || path === '/bookmarklet') return send(res, 302, '', { location: '/login' });
    }

    if (path === '/' || path === '/index.html') return sendFile(res, join(PUBLIC_DIR, 'index.html'));
    if (path === '/bookmarklet') return sendFile(res, join(PUBLIC_DIR, 'bookmarklet.html'));

    if (path === '/api/data') {
      return sendJson(res, 200, await boardResponse(who, { refresh: url.searchParams.get('refresh') === '1' }));
    }

    if (path === '/api/verify') {
      return sendJson(res, 200, { ok: true, store: getStore().kind, ...(await getStore().verify()) });
    }

    if (path === '/api/settings') {
      if (method === 'POST') return sendJson(res, 200, { ok: true, ...(await saveSettings(await readBody(req))) });
      return sendJson(res, 200, { ok: true, ...(await getSettings()) });
    }

    // ── Prospects ─────────────────────────────────────────────────────────
    if (path === '/api/prospects' && method === 'POST') {
      const body = await readBody(req);
      const p = normalize(body, { source: body.source, owner: who });
      if (!p.name) return sendJson(res, 400, { ok: false, error: 'A company name is required.' });
      if (!p.nextTouch) p.nextTouch = localDate();
      const first = stepAt(p.channel, 0);
      if (!p.nextStep && first) p.nextStep = `${first.label} on ${p.channel}`;
      await loadBoard();
      const dup = findDuplicate(p, dedupeIndex(board.prospects));
      if (dup) return sendJson(res, 409, { ok: false, duplicate: true, error: `Already on the board as ${dup.existing.name}.`, existing: shaped(dup.existing), key: dup.key });
      const [made] = await getStore().createProspects([p]);
      cachePatch(made, null);
      return sendJson(res, 200, { ok: true, prospect: shaped(made) });
    }

    if (path === '/api/prospects/import' && method === 'POST') {
      const body = await readBody(req);
      const rows = Array.isArray(body.rows) ? body.rows.slice(0, 500) : [];
      await loadBoard();
      const idx = dedupeIndex(board.prospects);
      const toMake = [], skipped = [];
      rows.forEach((row, i) => {
        const p = normalize(row, { source: body.source || 'CSV', owner: who });
        if (!p.name) return skipped.push({ row: i + 1, reason: 'no company name' });
        const dup = findDuplicate(p, idx);
        if (dup) return skipped.push({ row: i + 1, name: p.name, reason: `duplicate of ${dup.existing.name}`, existingId: dup.existing.id });
        if (!p.nextTouch) p.nextTouch = localDate();
        const first = stepAt(p.channel, 0);
        if (!p.nextStep && first) p.nextStep = `${first.label} on ${p.channel}`;
        addToIndex(idx, p);
        toMake.push(p);
      });
      const made = toMake.length ? await getStore().createProspects(toMake) : [];
      for (const m of made) cachePatch(m, null);
      return sendJson(res, 200, { ok: true, added: made.length, skipped, prospects: made.map((m) => shaped(m)) });
    }

    if (path === '/api/prospects/update' && method === 'POST') {
      const body = await readBody(req);
      const p = await findProspect(String(body.id || ''));
      const patch = body.patch || {};
      if (patch.stage && patch.stage !== p.stage) {
        if (!STAGES.includes(patch.stage)) return sendJson(res, 400, { ok: false, error: 'Unknown stage.' });
        return transition(res, body, who, (x) => T.setStage(getStore(), x, { stage: patch.stage, staff: who }));
      }
      if (patch.channel && patch.channel !== p.channel) {
        return transition(res, body, who, (x) => T.switchChannel(getStore(), x, { channel: patch.channel, staff: who }));
      }
      const merged = normalize({ ...p, ...patch });
      const out = {};
      for (const k of EDITABLE) if (k in patch) out[k] = merged[k];
      if (!Object.keys(out).length) return sendJson(res, 200, { ok: true, prospect: shaped(p) });
      const updated = await getStore().updateProspect(p.id, out);
      cachePatch(updated, null);
      return sendJson(res, 200, { ok: true, prospect: shaped(updated) });
    }

    if (path === '/api/prospects/replied' && method === 'POST') {
      const body = await readBody(req);
      return transition(res, body, who, (p) => T.markReplied(getStore(), p, { staff: who, note: String(body.note || '').slice(0, 2000) }));
    }
    if (path === '/api/prospects/not-interested' && method === 'POST') {
      const body = await readBody(req);
      return transition(res, body, who, (p) => T.markNotInterested(getStore(), p, { staff: who, reason: String(body.reason || '').slice(0, 500) }));
    }
    if (path === '/api/prospects/snooze' && method === 'POST') {
      const body = await readBody(req);
      return transition(res, body, who, (p) => T.snooze(getStore(), p, { staff: who, days: body.days }));
    }
    if (path === '/api/prospects/switch-channel' && method === 'POST') {
      const body = await readBody(req);
      return transition(res, body, who, (p) => T.switchChannel(getStore(), p, { staff: who, channel: body.channel }));
    }
    if (path === '/api/prospects/note' && method === 'POST') {
      const body = await readBody(req);
      const text = String(body.body || '').trim().slice(0, 4000);
      if (!text) return sendJson(res, 400, { ok: false, error: 'Empty note.' });
      return transition(res, body, who, (p) => T.addNote(getStore(), p, { staff: who, body: text }));
    }

    if (path === '/api/prospects/export.csv') {
      await loadBoard();
      const channel = url.searchParams.get('channel') || '';
      const status = url.searchParams.get('status') || '';
      const mark = url.searchParams.get('markExternal') === '1';
      let rows = board.prospects.filter((p) => (!channel || p.channel.toLowerCase() === channel.toLowerCase()) && (!status || p.seqStatus.toLowerCase() === status.toLowerCase()));
      if (mark) {
        const store = getStore();
        for (const p of rows) {
          const updated = await store.updateProspect(p.id, { seqStatus: 'External', nextStep: 'Handed to the external sender' });
          cachePatch(updated, null);
        }
        rows = rows.map((p) => ({ ...p, seqStatus: 'External' }));
      }
      return send(res, 200, toCsv(rows), {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="prospects-${localDate()}.csv"`,
      });
    }

    // ── Touches ───────────────────────────────────────────────────────────
    if (path === '/api/touches' && method === 'POST') {
      const body = await readBody(req);
      const p = await findProspect(String(body.id || ''));
      const { prospect, touch } = await T.logSent(getStore(), p, {
        channel: body.channel, step: String(body.step || ''), subject: String(body.subject || '').slice(0, 300),
        body: String(body.body || '').slice(0, 6000), staff: who,
      });
      cachePatch(prospect, touch);
      const sent = T.sentToday(board.touches);
      return sendJson(res, 200, { ok: true, prospect: shaped(prospect), touch, sentToday: sent });
    }

    // ── Drafting ──────────────────────────────────────────────────────────
    if (path === '/api/draft' && method === 'POST') {
      const body = await readBody(req);
      const p = await findProspect(String(body.id || ''));
      const r = await draftFor({
        store: getStore(), prospect: shaped(p), channel: body.channel || p.channel, stepKey: body.step || '',
        touches: touchesFor(p.id), force: body.force === true, staff: who,
      });
      if (!r.cached) cachePatch(r.prospect, null);
      return sendJson(res, 200, { ok: true, cached: r.cached, key: r.key, draft: r.draft, prospect: shaped(r.prospect) });
    }

    if (path === '/api/drafts/batch' && method === 'POST') {
      if (!hasDrafter()) return sendJson(res, 503, { ok: false, error: 'Drafting is off: ANTHROPIC_API_KEY is not set.' });
      const body = await readBody(req);
      const data = await boardResponse(who);
      let rows = [];
      if (Array.isArray(body.ids) && body.ids.length) {
        rows = data.prospects.filter((p) => body.ids.includes(p.id));
      } else {
        for (const ch of Object.keys(data.today.queue)) rows.push(...data.today.queue[ch]);
      }
      const items = rows
        .filter((p) => p.stepKey && (body.force || !p.drafts?.[`${p.channelKey}:${p.stepKey}`]?.draft))
        .map((p) => ({ prospect: p, channel: p.channel, stepKey: p.stepKey, touches: touchesFor(p.id), force: body.force === true }));
      const job = startBatch({ store: getStore(), items, staff: who, onDone: (id, r) => { if (!r.cached) cachePatch(r.prospect, null); } });
      return sendJson(res, 200, { ok: true, job: job.id, total: job.total, skipped: rows.length - items.length });
    }
    if (path === '/api/drafts/batch' && method === 'GET') {
      const job = batchStatus(url.searchParams.get('job') || '');
      if (!job) return sendJson(res, 404, { ok: false, error: 'No such job (they expire after an hour).' });
      const { results, ...rest } = job;
      return sendJson(res, 200, { ok: true, ...rest, results });
    }

    // ── Research (gated) ──────────────────────────────────────────────────
    if (path === '/api/research' && method === 'POST') {
      const body = await readBody(req);
      await loadBoard();
      const r = await research({ query: body.query, count: body.count, existing: board.prospects, staff: who });
      return sendJson(res, 200, { ok: true, ...r });
    }

    // ── Inbound site leads (read-only view of the Leads table) ────────────
    if (path === '/api/leads') {
      if (!usingAirtable()) return sendJson(res, 200, { ok: true, leads: [], reason: 'Airtable is not configured.' });
      await loadBoard();
      const idx = dedupeIndex(board.prospects);
      const table = (process.env.AIRTABLE_LEADS_TABLE || 'Leads').trim();
      const recs = await readTable(table, { filterByFormula: `IS_AFTER({Submitted}, DATEADD(NOW(), -45, 'days'))`, sortField: 'Submitted', desc: true });
      const leads = recs.map((r) => {
        const f = r.fields || {};
        const guess = normalize({ company: f.Business || f.Name || '', contact: f.Name || '', email: f.Email || '', phone: f.Phone || '', website: f.Website || '', notes: [f.Frustration, f.Goal, f.Message].filter(Boolean).join(' | ') }, { source: 'Inbound' });
        const dup = guess.email || guess.phone ? findDuplicate(guess, idx) : null;
        return { id: r.id, source: f.Source || '', page: f.Page || '', submitted: f.Submitted || r.createdTime, name: f.Name || '', email: f.Email || '', phone: f.Phone || '', website: f.Website || '', business: f.Business || '', message: f.Message || '', frustration: f.Frustration || '', goal: f.Goal || '', promoted: dup ? { id: dup.existing.id, name: dup.existing.name } : null, guess };
      }).filter((l) => l.email || l.phone);
      return sendJson(res, 200, { ok: true, leads, table });
    }

    // ── Reporting ─────────────────────────────────────────────────────────
    if (path === '/api/report') {
      const weeks = Number(url.searchParams.get('weeks') || 8);
      const touches = weeks * 7 > 60 ? await getStore().listTouches({ days: weeks * 7 }) : (await loadBoard()).touches;
      return sendJson(res, 200, { ok: true, ...weeklyReport({ touches, weeks }) });
    }

    // ── Static assets, path-traversal guarded ─────────────────────────────
    const safe = normPath(path).replace(/^(\.\.[/\\])+/, '');
    const target = join(PUBLIC_DIR, safe);
    if (!target.startsWith(PUBLIC_DIR)) return send(res, 403, 'Forbidden', { 'content-type': 'text/plain' });
    return sendFile(res, target);
  } catch (e) {
    return fail(res, e);
  }
});

function lanUrls() {
  const out = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const n of list || []) if (n.family === 'IPv4' && !n.internal) out.push(`http://${n.address}:${PORT}`);
  }
  return out;
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  FrontPage Labs — Growth Command`);
  console.log(`  http://localhost:${PORT}`);
  for (const u of lanUrls()) console.log(`  ${u}  (phone on the same Wi-Fi)`);
  console.log(`  PIN: ${process.env.FPL_DASH_PIN ? '(from FPL_DASH_PIN)' : `${PIN} (dev default — set FPL_DASH_PIN)`}`);
  console.log(`  Store: ${usingAirtable() ? `Airtable (${tableNames().prospects} / ${tableNames().touches})` : 'local JSON in dashboard/data (set AIRTABLE_API_KEY + AIRTABLE_BASE_ID for Airtable)'}`);
  console.log(`  Drafting: ${hasDrafter() ? `on (${MODEL})` : 'off (set ANTHROPIC_API_KEY)'}   Research: ${hasResearch() ? 'on' : 'off'}\n`);
});
