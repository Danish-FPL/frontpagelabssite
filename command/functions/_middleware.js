// The gate. Everything under this project is internal, so the default is
// "signed out means you see the login page and nothing else".
//
// Pages runs middleware ahead of both functions and static assets, which is
// what makes it a real gate rather than a suggestion: without it, index.html
// would be served straight off the CDN to anyone who typed the URL.

import { whoami, secretProblem, json } from '../shared/auth.js';

// Reachable without a cookie. Everything else needs one.
const OPEN = new Set(['/login', '/login.html', '/api/login', '/api/staff']);

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const path = url.pathname;

  // A misconfigured secret takes the whole project down rather than falling
  // back to something guessable. Deliberately loud: this should be noticed.
  const problem = secretProblem(env);
  if (problem) {
    const body = `Growth Command is not configured.\n\n${problem}\n\nSet it with:\n  wrangler pages secret put FPL_DASH_PIN --project-name frontpagelabs-command\n`;
    return new Response(body, {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  if (OPEN.has(path)) return withNoStore(await next());

  const who = await whoami(request, env);
  if (!who) {
    // An API call gets a status it can act on; a page gets the login screen.
    if (path.startsWith('/api/')) return json({ ok: false, error: 'Not signed in' }, 401);
    return Response.redirect(new URL('/login', url).toString(), 302);
  }

  return withNoStore(await next());
}

// Nothing here is cacheable, and an internal board sitting in a shared cache
// is exactly the accident this project should not have.
function withNoStore(res) {
  const out = new Response(res.body, res);
  out.headers.set('cache-control', 'no-store');
  out.headers.set('x-robots-tag', 'noindex, nofollow');
  return out;
}
