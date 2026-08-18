// POST /api/lead — every form on the site lands here, then in Airtable.
//
// One function for all four forms (audit questionnaire, offer landings,
// service landings, /contact) so leads live in ONE table with a Source
// column, instead of four Netlify Forms buckets nobody checks.
//
// Env vars (Netlify dashboard → Site settings → Environment variables, and a
// local gitignored .env — see .env.example):
//   AIRTABLE_API_KEY      personal access token, scope data.records:write
//   AIRTABLE_BASE_ID      app… id of the FrontPage Labs leads base
//   AIRTABLE_LEADS_TABLE  table name or tbl… id (default "Leads")
//
// PLACEHOLDER MODE: until those vars are set, the function logs the lead and
// returns ok:true anyway — the site's forms keep working (visitors see
// success) and nothing is stored. Set the vars to switch storage on; no code
// change or redeploy of the pages is needed.
//
// Writes use typecast:true so Airtable auto-creates select options (e.g. a
// new Source value) instead of rejecting the record.

const MAX_FIELD = 5000; // Airtable long-text is generous; cap abuse anyway

// JSON body key → Airtable column. Add a form field here and create the
// matching column in Airtable; unknown body keys are dropped, never sent.
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

export default async function handler(req) {
  if (req.method !== 'POST') {
    return Response.json({ ok: false, error: 'method' }, { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: 'bad json' }, { status: 400 });
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
  } = process.env;

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.warn('[submit-lead] Airtable env vars not set — lead NOT stored:', fields);
    return Response.json({ ok: true, stored: false });
  }

  const res = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_LEADS_TABLE)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ records: [{ fields }], typecast: true }),
    }
  );

  if (!res.ok) {
    console.error('[submit-lead] Airtable write failed', res.status, await res.text());
    return Response.json({ ok: false, error: 'store' }, { status: 502 });
  }

  return Response.json({ ok: true, stored: true });
}

export const config = { path: '/api/lead' };
