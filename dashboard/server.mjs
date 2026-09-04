// Growth Command — local-only internal dashboard for FrontPage Labs.
//
// Deliberately mirrors the Chicagoland Auto Fair dashboard's architecture:
// bare Node http (no express), a single-file vanilla front end, and a signed
// HttpOnly cookie derived from a shared PIN. No build step, no framework.
//
// This lives outside `src/` and `public/`, so Astro never sees it and it can
// never be published with the marketing site.
//
// Data today comes from data/sample-data.json. Swapping in a real CRM means
// replacing loadData() — the JSON shape it returns is the contract the UI
// reads, so nothing in public/index.html needs to change.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(HERE, 'public');
const DATA_FILE = join(HERE, 'data', 'sample-data.json');
// Real, not placeholder: the site QA pass. Kept in its own file so the sample
// CRM data can be swapped out without losing it.
const AUDIT_FILE = join(HERE, 'data', 'site-audit.json');

const PORT = Number(process.env.FPL_DASH_PORT || 4787);
// Dev default keeps the wireframe runnable out of the box; set FPL_DASH_PIN
// before this is ever pointed at real client data.
const PIN = process.env.FPL_DASH_PIN || '2468';
const STAFF = (process.env.FPL_DASH_STAFF || 'Danish').split(',').map((s) => s.trim()).filter(Boolean);

const COOKIE = 'fpl_dash';
const MAX_AGE = 7 * 24 * 60 * 60; // 7 days

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
   Data
   ------------------------------------------------------------------------- */

async function loadData() {
  const raw = await readFile(DATA_FILE, 'utf8');
  const data = JSON.parse(raw);
  let siteAudit = [];
  try {
    siteAudit = JSON.parse(await readFile(AUDIT_FILE, 'utf8')).siteAudit ?? [];
  } catch {
    // No audit file is fine; the Site tab just shows empty.
  }
  return { ...data, siteAudit, staffList: STAFF, servedAt: new Date().toISOString() };
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
  for await (const chunk of req) chunks.push(chunk);
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    return {};
  }
}

/* -------------------------------------------------------------------------
   Routes
   ------------------------------------------------------------------------- */

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  if (path === '/api/login' && req.method === 'POST') {
    const { pin, staff } = await readBody(req);
    if (String(pin || '') !== PIN) {
      return sendJson(res, 401, { ok: false, error: 'That PIN did not match.' });
    }
    const who = String(staff || '').trim() || 'Team';
    return sendJson(
      res,
      200,
      { ok: true, staff: who },
      {
        'set-cookie': `${COOKIE}=${makeToken(who)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}`,
      },
    );
  }

  if (path === '/api/logout' && req.method === 'POST') {
    return sendJson(res, 200, { ok: true }, { 'set-cookie': `${COOKIE}=; HttpOnly; Path=/; Max-Age=0` });
  }

  if (path === '/api/staff') {
    return sendJson(res, 200, { staff: STAFF });
  }

  if (path === '/api/data') {
    const who = authed(req);
    if (!who) return sendJson(res, 401, { ok: false, error: 'Not signed in' });
    try {
      // `staff` last so the signed-in name always wins over anything in the file.
      return sendJson(res, 200, { ok: true, ...(await loadData()), staff: who });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: String(err.message || err) });
    }
  }

  if (path === '/login' || path === '/login.html') {
    return sendFile(res, join(PUBLIC_DIR, 'login.html'));
  }

  if (path === '/' || path === '/index.html') {
    if (!authed(req)) return send(res, 302, '', { location: '/login' });
    return sendFile(res, join(PUBLIC_DIR, 'index.html'));
  }

  // Static assets, path-traversal guarded.
  const safe = normalize(path).replace(/^(\.\.[/\\])+/, '');
  const target = join(PUBLIC_DIR, safe);
  if (!target.startsWith(PUBLIC_DIR)) return send(res, 403, 'Forbidden', { 'content-type': 'text/plain' });
  return sendFile(res, target);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  FrontPage Labs — Growth Command`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`  PIN: ${process.env.FPL_DASH_PIN ? '(from FPL_DASH_PIN)' : `${PIN} (dev default — set FPL_DASH_PIN)`}\n`);
});
