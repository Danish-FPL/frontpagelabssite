// Auth for the hosted copy of Growth Command.
//
// The laptop server (dashboard/server.mjs) signs an HMAC over the staff name
// keyed by the shared PIN. This is the same idea with two changes that a
// public URL demands:
//
//   1. The PIN is stretched with PBKDF2 before it is compared, so guessing is
//      expensive per attempt rather than free. On a laptop behind the LAN a
//      four-digit PIN is fine; on an address anyone can reach, 10,000
//      combinations fall in seconds against a plain compare.
//   2. The token carries its own expiry, so a stolen cookie dies on a clock
//      rather than living until the PIN changes.
//
// There is deliberately NO default secret. The laptop falls back to 2468 to
// stay runnable out of the box; here a missing secret takes the whole site to
// a 503, because a public board with a known password is worse than no board.

const enc = new TextEncoder();

export const COOKIE = 'fpl_dash';
export const MAX_AGE = 7 * 24 * 60 * 60; // seconds
// 100,000 is the ceiling the Workers runtime allows; asking for more throws
// NotSupportedError at request time, and `wrangler pages dev` does NOT enforce
// the cap, so this only shows up once deployed. Do not raise it.
const ITERATIONS = 100_000;
const MIN_SECRET = 8;

/** The dev default from the laptop server. Never acceptable on a public host. */
const DEV_DEFAULT = '2468';

export function secretProblem(env) {
  const pin = env.FPL_DASH_PIN;
  if (!pin) return 'FPL_DASH_PIN is not set on this Pages project.';
  if (pin === DEV_DEFAULT) return 'FPL_DASH_PIN is still the laptop dev default.';
  if (pin.length < MIN_SECRET) return `FPL_DASH_PIN is shorter than ${MIN_SECRET} characters.`;
  return null;
}

export const staffList = (env) =>
  (env.FPL_DASH_STAFF || 'Danish').split(',').map((s) => s.trim()).filter(Boolean);

const b64url = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const unb64url = (s) => {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/');
  return atob(pad + '='.repeat((4 - (pad.length % 4)) % 4));
};

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

/** PBKDF2 over the candidate, salted with the staff-independent app label. */
async function stretch(candidate) {
  const key = await crypto.subtle.importKey('raw', enc.encode(candidate), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode('fpl-growth-command'), iterations: ITERATIONS },
    key,
    256,
  );
  return hex(bits);
}

/** Length-independent compare, so a wrong guess leaks nothing through timing. */
function sameString(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function pinMatches(candidate, env) {
  if (typeof candidate !== 'string' || !candidate) return false;
  const [a, b] = await Promise.all([stretch(candidate), stretch(env.FPL_DASH_PIN)]);
  return sameString(a, b);
}

async function hmac(value, env) {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(env.FPL_DASH_PIN), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(value)));
}

export async function makeToken(staff, env) {
  const exp = String(Math.floor(Date.now() / 1000) + MAX_AGE);
  const payload = `${b64url(enc.encode(staff))}.${exp}`;
  return `${payload}.${await hmac(payload, env)}`;
}

/** Returns the staff name, or null for anything that does not verify. */
export async function readToken(token, env) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [encoded, exp, mac] = parts;

  const expected = await hmac(`${encoded}.${exp}`, env);
  if (!sameString(mac, expected)) return null;
  if (!/^\d+$/.test(exp) || Number(exp) < Math.floor(Date.now() / 1000)) return null;

  try {
    return new TextDecoder().decode(Uint8Array.from(unb64url(encoded), (c) => c.charCodeAt(0)));
  } catch {
    return null;
  }
}

export function cookieValue(header, name) {
  for (const part of (header || '').split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export const whoami = (request, env) =>
  readToken(cookieValue(request.headers.get('cookie'), COOKIE), env);

export const json = (obj, status = 200, headers = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });

export const setCookie = (token) =>
  `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}`;

export const clearCookie = () => `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
