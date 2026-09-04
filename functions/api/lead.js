// POST /api/lead — the Cloudflare Pages twin of netlify/functions/submit-lead.mjs.
//
// Both hosts serve this site: Cloudflare Pages is the free everyday preview
// (./ship.sh) and Netlify is the paid production host (./deploy.sh). A form
// that only works on one of them is a broken preview, so the same endpoint
// exists on both.
//
// The ONE difference is how each runtime hands over its environment: Netlify
// Functions read `process.env`, Pages Functions get an `env` argument. The
// COLUMNS map, the field cap, the placeholder mode and the progressive-save
// contract are deliberately identical — change one and change the other.
//
// Secrets live on the Pages project, not in the repo:
//   wrangler pages secret put AIRTABLE_API_KEY --project-name frontpagelabs
//   wrangler pages secret put AIRTABLE_BASE_ID --project-name frontpagelabs
//   wrangler pages secret put AIRTABLE_LEADS_TABLE --project-name frontpagelabs

const MAX_FIELD = 5000;

const COLUMNS = {
  source: 'Source',
  page: 'Page',
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  website: 'Website',
  business: 'Business',
  message: 'Message',
  frustration: 'Frustration',
  goal: 'Goal',
  channel: 'Channel',
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

// A single onRequest handler, not onRequestPost plus a method guard: exporting
// both makes the catch-all win and the method handler dead code.
export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return json({ ok: false, error: 'method' }, 405);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'bad json' }, 400);
  }

  const fields = {};
  for (const [key, column] of Object.entries(COLUMNS)) {
    const value = typeof body[key] === 'string' ? body[key].trim() : '';
    if (value) fields[column] = value.slice(0, MAX_FIELD);
  }
  fields['Submitted'] = new Date().toISOString();

  const {
    AIRTABLE_API_KEY,
    AIRTABLE_BASE_ID,
    AIRTABLE_LEADS_TABLE = 'Leads',
  } = env;

  // Placeholder mode: with no secrets set the preview still accepts leads and
  // shows the success state, it just stores nothing.
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.warn('[lead] Airtable env vars not set, lead NOT stored:', fields);
    return json({ ok: true, stored: false });
  }

  const recordId =
    typeof body.recordId === 'string' && /^rec[A-Za-z0-9]+$/.test(body.recordId)
      ? body.recordId
      : '';

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_LEADS_TABLE)}`;
  const res = await fetch(url, {
    method: recordId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      records: [recordId ? { id: recordId, fields } : { fields }],
      typecast: true,
    }),
  });

  if (!res.ok) {
    console.error('[lead] Airtable write failed', res.status, await res.text());
    return json({ ok: false, error: 'store' }, 502);
  }

  let id = recordId;
  try {
    const data = await res.json();
    id = data?.records?.[0]?.id ?? recordId;
  } catch {
    /* a stored lead with no id back just means the next step creates a row */
  }

  return json({ ok: true, stored: true, recordId: id });
}
