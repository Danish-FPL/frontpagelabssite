// The board payload.
//
// The laptop server builds this from Airtable and layers on the outreach
// queue, drafting state and settings. None of that is here on purpose: those
// paths hold in-memory job state and an Anthropic key, and neither belongs on
// a public address. See command/README.md.
//
// What this serves is the committed board — the sample CRM records plus the
// real site-audit log — bundled at deploy time by build.mjs.

import { BOARD } from '../../shared/board.js';
import { whoami, staffList, json } from '../../shared/auth.js';

export async function onRequest({ request, env }) {
  const who = await whoami(request, env);
  if (!who) return json({ ok: false, error: 'Not signed in' }, 401);

  return json({
    ok: true,
    staff: who,
    staffList: staffList(env),
    servedAt: new Date().toISOString(),
    // Tells the UI, and anyone reading a response, which copy they are on.
    host: 'cloudflare',
    ...BOARD,
  });
}
