/**
 * serve.mjs — FrontPage Labs Hero Lab server.
 *
 *   npm run hero-lab   →   http://localhost:3007/
 *
 * Serves the lab UI (lab.html + injector.js) AND proxies the Astro dev server
 * so the preview iframe is same-origin with the lab. That is the whole trick:
 * the thing in the frame is the REAL page, not a mock, so what you tune is
 * what ships.
 *
 *   POST /save            — writes data/variants.json (the file
 *                           src/data/landing.ts reads, so saving a variant
 *                           publishes its /lp/<slug> page)
 *   GET  /meta            — saved page slugs, project list, LAN URL
 *   GET  /preview/<id>    — the real page with variant <id> injected,
 *                           chrome-free, for real-phone preview over LAN
 *   GET  /shot?variant=id — Puppeteer screenshot → exports/ (needs puppeteer)
 *   *                     — proxied to Astro dev
 *
 * Astro's HMR client and dev toolbar are stripped out of proxied HTML: an
 * HMR reload mid-edit would wipe the injected preview, and the toolbar would
 * float over the design. The lab reloads the frame itself when it needs to.
 *
 * Binds 0.0.0.0 so a phone on the same Wi-Fi can open the /preview URLs.
 */

import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { connect as netConnect } from 'node:net';
import { networkInterfaces } from 'node:os';

const LAB = dirname(fileURLToPath(import.meta.url));
const ROOT = join(LAB, '..');
const PORT = Number(process.env.FPL_LAB_PORT) || 3007;
const ASTRO_PORT = Number(process.env.FPL_ASTRO_PORT) || 4321;
// Astro dev binds ::1 on this machine, so `localhost` resolves and
// `127.0.0.1` does not. Probe both and keep whichever answers.
const ASTRO_HOSTS = [`http://localhost:${ASTRO_PORT}`, `http://127.0.0.1:${ASTRO_PORT}`];
let ASTRO = ASTRO_HOSTS[0];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

function send(res, code, type, body, extra = {}) {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store', ...extra });
  res.end(body);
}
const sendJson = (res, code, obj) => send(res, code, MIME['.json'], JSON.stringify(obj));

function lanIp() {
  for (const addrs of Object.values(networkInterfaces())) {
    for (const a of addrs || []) if (a.family === 'IPv4' && !a.internal) return a.address;
  }
  return null;
}

/* -------------------------------------------------------------------------
   Astro dev server — started for you if it isn't already up.
   ------------------------------------------------------------------------- */

let astroChild = null;

async function astroUp() {
  for (const host of ASTRO_HOSTS) {
    try {
      const res = await fetch(host + '/', { method: 'HEAD' });
      if (res.status < 500) { ASTRO = host; return true; }
    } catch {
      /* try the next host */
    }
  }
  return false;
}

async function ensureAstro() {
  if (await astroUp()) return 'already running';
  astroChild = spawn('npx', ['astro', 'dev', '--port', String(ASTRO_PORT)], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  astroChild.stderr.on('data', (b) => process.stderr.write(`  astro │ ${b}`));
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await astroUp()) return 'started';
  }
  throw new Error(`Astro dev never came up on port ${ASTRO_PORT}. Run "npm run dev" in another terminal.`);
}

for (const signal of ['SIGINT', 'SIGTERM', 'exit']) {
  process.on(signal, () => {
    if (astroChild) astroChild.kill();
    if (signal !== 'exit') process.exit(0);
  });
}

/* -------------------------------------------------------------------------
   Variants + project list
   ------------------------------------------------------------------------- */

const VARIANTS_FILE = join(LAB, 'data', 'variants.json');

async function readVariants() {
  try {
    return JSON.parse(await readFile(VARIANTS_FILE, 'utf8'));
  } catch {
    return { variants: [], activeId: null };
  }
}

/** Project titles, scraped out of src/data/projects.ts so the showcase
 *  picker offers real options without importing TypeScript here. */
async function projectTitles() {
  try {
    const src = await readFile(join(ROOT, 'src', 'data', 'projects.ts'), 'utf8');
    return [...src.matchAll(/^\s*title:\s*["'](.+?)["'],\s*$/gm)].map((m) => m[1]);
  } catch {
    return [];
  }
}

/* -------------------------------------------------------------------------
   Proxy
   ------------------------------------------------------------------------- */

/** Hide Astro's floating dev toolbar — it sits on top of the hero, which is
 *  the one thing this tool exists to look at. HMR is left alone (its socket
 *  is proxied below): a reload after a save is exactly what we want, and the
 *  lab re-applies the variant on every frame load. */
function cleanDevHtml(html) {
  return html.replace(/<\/head>/, '<style>astro-dev-toolbar{display:none !important}</style></head>');
}

async function proxy(req, res, pathname, search, { transform } = {}) {
  let upstream;
  try {
    upstream = await fetch(ASTRO + pathname + search, {
      headers: { accept: req.headers.accept || '*/*' },
      redirect: 'manual',
    });
  } catch (err) {
    send(res, 502, 'text/html; charset=utf-8',
      `<h1>Astro dev is not reachable</h1><p>${ASTRO} — ${err.message}</p><p>Run <code>npm run dev</code>, then reload.</p>`);
    return;
  }

  const type = upstream.headers.get('content-type') || 'application/octet-stream';
  if (upstream.status >= 300 && upstream.status < 400 && upstream.headers.get('location')) {
    send(res, upstream.status, 'text/plain', '', { location: upstream.headers.get('location') });
    return;
  }

  if (type.includes('text/html')) {
    let html = cleanDevHtml(await upstream.text());
    if (transform) html = transform(html);
    send(res, upstream.status, MIME['.html'], html);
    return;
  }
  const buf = Buffer.from(await upstream.arrayBuffer());
  send(res, upstream.status, type, buf);
}

/* -------------------------------------------------------------------------
   Server
   ------------------------------------------------------------------------- */

function labFile(pathname) {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, '');
  const file = join(LAB, clean || 'lab.html');
  if (!file.startsWith(LAB)) return null;
  return existsSync(file) && !statSync(file).isDirectory() ? file : null;
}

async function nextExportPath(id) {
  const dir = join(LAB, 'exports');
  await mkdir(dir, { recursive: true });
  let n = 1;
  for (const f of (await readdir(dir)).filter((f) => f.endsWith('.png'))) {
    const m = f.match(/-(\d+)\.png$/);
    if (m) n = Math.max(n, Number(m[1]) + 1);
  }
  return join(dir, `hero-${id}-${n}.png`);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const path = url.pathname;

  if (req.method === 'POST' && path === '/save') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body);
        if (!Array.isArray(parsed.variants)) throw new Error('payload must have a variants array');
        const slugs = parsed.variants.filter((v) => !v.locked).map((v) => v.slug);
        if (new Set(slugs).size !== slugs.length) throw new Error('two variants share a slug — pages would collide');
        await mkdir(join(LAB, 'data'), { recursive: true });
        await writeFile(VARIANTS_FILE, JSON.stringify(parsed, null, 2) + '\n');
        const pages = slugs.filter(Boolean);
        sendJson(res, 200, { ok: true, pages });
        console.log(`  saved variants.json — ${pages.length} page(s): ${pages.map((s) => '/lp/' + s).join(', ')}`);
      } catch (e) {
        sendJson(res, 400, { ok: false, error: e.message });
      }
    });
    return;
  }

  if (req.method === 'GET' && path === '/meta') {
    const data = await readVariants();
    sendJson(res, 200, {
      pages: data.variants.filter((v) => !v.locked && v.slug).map((v) => v.slug),
      projects: await projectTitles(),
      lan: lanIp() ? `http://${lanIp()}:${PORT}` : null,
      astroUrl: ASTRO,
    });
    return;
  }

  // The lab owns `/`, so the site's home page needs its own address here.
  // Everything on the page links absolutely (/assets, /about), so it renders
  // exactly as it does on the real server.
  if (req.method === 'GET' && /^\/__home\/?$/.test(path)) {
    await proxy(req, res, '/', url.search);
    return;
  }

  // /preview/<id> — the real page with the variant injected, no lab chrome.
  const preview = path.match(/^\/preview\/([A-Za-z0-9_-]{1,32})\/?$/);
  if (req.method === 'GET' && preview) {
    const data = await readVariants();
    const variant = data.variants.find((v) => v.id === preview[1]);
    if (!variant) {
      send(res, 404, 'text/plain; charset=utf-8', `No variant "${preview[1]}" in data/variants.json — save from the lab first.`);
      return;
    }
    const target = variant.locked || !variant.slug ? '/' : `/lp/${variant.slug}/`;
    const boot =
      `<script>window.__FPL_HERO_LAB__=${JSON.stringify({
        variant,
        variants: data.variants.map((v) => ({ id: v.id, name: v.name })),
        noPills: url.searchParams.has('noPills'),
      })};</script>\n<script src="/injector.js"></script>\n`;
    await proxy(req, res, target, '', { transform: (html) => html.replace('</body>', boot + '</body>') });
    return;
  }

  // /shot?variant=<id> — optional; puppeteer is not a dependency of this repo.
  if (req.method === 'GET' && path === '/shot') {
    const id = url.searchParams.get('variant') || '';
    const width = Number(url.searchParams.get('w')) || 390;
    const height = Number(url.searchParams.get('h')) || 844;
    if (!/^[A-Za-z0-9_-]{1,32}$/.test(id)) { send(res, 400, 'text/plain', 'bad variant id'); return; }
    let browser;
    try {
      const { default: puppeteer } = await import('puppeteer');
      browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.setViewport({ width, height, deviceScaleFactor: 2 });
      await page.goto(`http://127.0.0.1:${PORT}/preview/${id}?noPills=1`, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise((r) => setTimeout(r, 1200));
      const png = await page.screenshot({ type: 'png' });
      const out = await nextExportPath(id);
      await writeFile(out, png);
      console.log(`  📸 ${out}`);
      send(res, 200, MIME['.png'], png, { 'content-disposition': `attachment; filename="${out.split('/').pop()}"` });
    } catch (e) {
      const missing = /Cannot find (package|module) 'puppeteer'/.test(String(e.message));
      send(res, missing ? 501 : 500, 'text/plain; charset=utf-8',
        missing ? 'Screenshots need puppeteer: npm i -D puppeteer' : 'Screenshot failed: ' + e.message);
    } finally {
      if (browser) await browser.close().catch(() => {});
    }
    return;
  }

  // Lab's own files first (lab.html, injector.js, data/variants.json).
  const file = labFile(path === '/' ? '/lab.html' : path);
  if (file) {
    try {
      send(res, 200, MIME[extname(file).toLowerCase()] || 'application/octet-stream', await readFile(file));
    } catch (e) {
      send(res, 500, 'text/plain', 'Server error: ' + e.message);
    }
    return;
  }

  // Everything else is the site.
  await proxy(req, res, path, url.search);
});

/* Vite's HMR socket. Without this the client retries forever and fills the
   console with handshake errors; with it, saving a variant reloads the frame
   on its own. Raw pipe — there is no HTTP semantics to preserve. */
server.on('upgrade', (req, socket, head) => {
  const target = new URL(ASTRO);
  const upstream = netConnect(Number(target.port), target.hostname, () => {
    const headers = ['Host: ' + target.host];
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      if (req.rawHeaders[i].toLowerCase() !== 'host') headers.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`);
    }
    upstream.write(`${req.method} ${req.url} HTTP/1.1\r\n${headers.join('\r\n')}\r\n\r\n`);
    if (head && head.length) upstream.write(head);
    upstream.pipe(socket);
    socket.pipe(upstream);
  });
  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
});

const status = await ensureAstro().catch((err) => {
  console.error(`\n  ${err.message}\n`);
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', () => {
  const lan = lanIp();
  console.log(`\n  FrontPage Labs — Hero Lab`);
  console.log(`  Lab:            http://localhost:${PORT}/`);
  console.log(`  Astro dev:      ${ASTRO} (${status})`);
  if (lan) console.log(`  Phone preview:  http://${lan}:${PORT}/preview/<variant>   (same Wi-Fi)`);
  console.log('');
});
