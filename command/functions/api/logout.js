import { clearCookie, json } from '../../shared/auth.js';

export async function onRequest({ request }) {
  if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
  return json({ ok: true }, 200, { 'set-cookie': clearCookie() });
}
