import { pinMatches, makeToken, setCookie, json } from '../../shared/auth.js';

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405);

  let body = {};
  try { body = await request.json(); } catch { /* treated as a bad PIN below */ }

  if (!(await pinMatches(String(body.pin || ''), env))) {
    // PBKDF2 already makes each attempt cost real work; this keeps a wrong
    // answer from returning noticeably faster than a right one.
    await new Promise((r) => setTimeout(r, 250));
    return json({ ok: false, error: 'That PIN did not match.' }, 401);
  }

  const who = String(body.staff || '').trim().slice(0, 60) || 'Team';
  return json({ ok: true, staff: who }, 200, { 'set-cookie': setCookie(await makeToken(who, env)) });
}
