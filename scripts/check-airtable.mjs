#!/usr/bin/env node
// Checks the Airtable Leads table against what the site actually writes.
//
//   node scripts/check-airtable.mjs
//
// Reads AIRTABLE_API_KEY / AIRTABLE_BASE_ID / AIRTABLE_LEADS_TABLE from .env
// (or the environment), then reports: every column the site needs and whether
// it exists, any extra columns, and the current row count. Read-only: it
// never writes or deletes anything.
//
// The token needs `schema.bases:read` on top of the data scopes for this to
// see field names.

import { readFileSync } from 'node:fs';

// Keep in step with the COLUMNS map in netlify/functions/submit-lead.mjs.
const REQUIRED = [
  'Source',
  'Page',
  'Name',
  'Email',
  'Phone',
  'Website',
  'Business',
  'Message',
  'Frustration',
  'Goal',
  'Channel',
  'Submitted',
];

// Minimal .env reader: KEY=value, ignoring blanks, comments and quotes.
function loadEnv() {
  try {
    for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const value = match[2].replace(/^["']|["']$/g, '');
      if (!process.env[match[1]]) process.env[match[1]] = value;
    }
  } catch {
    /* no .env is fine if the vars are already exported */
  }
}

loadEnv();

const {
  AIRTABLE_API_KEY: key,
  AIRTABLE_BASE_ID: base,
  AIRTABLE_LEADS_TABLE: table = 'Leads',
} = process.env;

if (!key || !base) {
  console.error('Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID.');
  console.error('Put them in .env (see .env.example) and run this again.');
  process.exit(1);
}

const auth = { Authorization: `Bearer ${key}` };

const schemaRes = await fetch(`https://api.airtable.com/v0/meta/bases/${base}/tables`, {
  headers: auth,
});

if (!schemaRes.ok) {
  console.error(`Could not read the base schema (HTTP ${schemaRes.status}).`);
  console.error(await schemaRes.text());
  console.error('\nUsually this means the token lacks `schema.bases:read`, or');
  console.error('the base id is wrong, or the token has no access to this base.');
  process.exit(1);
}

const { tables } = await schemaRes.json();
const found = tables.find((t) => t.name === table || t.id === table);

if (!found) {
  console.error(`No table named "${table}" in this base.`);
  console.error(`Tables here: ${tables.map((t) => t.name).join(', ')}`);
  process.exit(1);
}

const names = found.fields.map((f) => f.name);
const missing = REQUIRED.filter((n) => !names.includes(n));
const extra = names.filter((n) => !REQUIRED.includes(n));

console.log(`Base ${base}, table "${found.name}" (${found.id})\n`);

for (const name of REQUIRED) {
  const field = found.fields.find((f) => f.name === name);
  console.log(`  ${field ? 'ok     ' : 'MISSING'}  ${name}${field ? `  (${field.type})` : ''}`);
}

if (extra.length) {
  console.log(`\nExtra columns (harmless, the site never writes them):`);
  for (const name of extra) console.log(`  ${name}`);
}

// Row count, so it is obvious whether sample rows are still sitting there.
const rowsRes = await fetch(
  `https://api.airtable.com/v0/${base}/${encodeURIComponent(found.id)}?pageSize=3`,
  { headers: auth }
);

if (rowsRes.ok) {
  const { records } = await rowsRes.json();
  console.log(`\nFirst rows: ${records.length === 0 ? 'none (clean)' : records.length + ' shown'}`);
  for (const r of records) {
    const f = r.fields;
    console.log(`  ${f.Name ?? f.Email ?? f.Business ?? '(blank)'} — ${f.Source ?? 'no Source'}`);
  }
} else {
  console.log(`\nCould not read rows (HTTP ${rowsRes.status}); token may lack data.records:read.`);
}

console.log(
  missing.length
    ? `\nRESULT: ${missing.length} column(s) missing. Add them in Airtable, exact spelling: ${missing.join(', ')}`
    : `\nRESULT: schema is good. Set the same three vars on Netlify and ./ship.sh.`
);
process.exit(missing.length ? 1 : 0);
