#!/usr/bin/env node
// Checks the Airtable tables against what the site and the dashboard write.
//
//   node scripts/check-airtable.mjs            # all three tables
//   node scripts/check-airtable.mjs Prospects  # just one
//
// Reads AIRTABLE_API_KEY / AIRTABLE_BASE_ID and the three table-name vars from
// .env (or the environment), then reports, per table: every column the code
// needs and whether it exists, whether its type matches, whether each select
// option is present, any extra columns, and a peek at the first rows.
// Read-only: it never writes or deletes anything.
//
// The token needs `schema.bases:read` on top of the data scopes to see field
// names. Missing columns exit 1; type and option mismatches are warnings,
// because every write uses typecast and a text column accepts a select value.

import { readFileSync } from 'node:fs';

// Keep in step with the COLUMNS map in netlify/functions/submit-lead.mjs and
// the PF / TF maps in dashboard/lib/store.mjs.
const TABLES = {
  Leads: {
    env: 'AIRTABLE_LEADS_TABLE', def: 'Leads',
    fields: [
      { name: 'Source', type: 'singleSelect' }, { name: 'Page', type: 'singleLineText' }, { name: 'Name', type: 'singleLineText' },
      { name: 'Email', type: 'email' }, { name: 'Phone', type: 'phoneNumber' }, { name: 'Website', type: 'singleLineText' },
      { name: 'Business', type: 'multilineText' }, { name: 'Message', type: 'multilineText' }, { name: 'Frustration', type: 'multilineText' },
      { name: 'Goal', type: 'multilineText' }, { name: 'Channel', type: 'singleLineText' }, { name: 'Submitted', type: 'dateTime' },
    ],
  },
  Prospects: {
    env: 'AIRTABLE_PROSPECTS_TABLE', def: 'Prospects',
    fields: [
      { name: 'Company', type: 'singleLineText' }, { name: 'Contact', type: 'singleLineText' }, { name: 'Email', type: 'email' },
      { name: 'Phone', type: 'phoneNumber' }, { name: 'Website', type: 'url' }, { name: 'LinkedIn URL', type: 'url' }, { name: 'Instagram URL', type: 'url' },
      { name: 'Industry', type: 'singleSelect', options: ['Real Estate Brokerage', 'Developer', 'Property Management', 'Service Business', 'E-commerce', 'Other'] },
      { name: 'City', type: 'singleLineText' },
      { name: 'Service Fit', type: 'singleSelect', options: ['Website', 'Website + Ads', 'Landing Page Offer', 'SEO', 'Ads', 'Branding', 'Unknown'] },
      { name: 'Value', type: 'currency' },
      { name: 'Stage', type: 'singleSelect', options: ['New', 'Contacted', 'Call Booked', 'Proposal', 'Won', 'Lost'] },
      { name: 'Channel', type: 'singleSelect', options: ['Email', 'LinkedIn', 'Instagram', 'Call'] },
      { name: 'Sequence Status', type: 'singleSelect', options: ['Active', 'Replied', 'Finished', 'Stopped', 'External'] },
      { name: 'Step Sent', type: 'number' }, { name: 'Next Touch', type: 'date' }, { name: 'Last Touch', type: 'date' },
      { name: 'Next Step', type: 'singleLineText' },
      { name: 'Source', type: 'singleSelect', options: ['Manual', 'CSV', 'Bookmarklet', 'Research', 'Inbound'] },
      { name: 'Owner', type: 'singleLineText' }, { name: 'Notes', type: 'multilineText' },
      { name: 'Site Text', type: 'multilineText' }, { name: 'Site Fetched', type: 'date' }, { name: 'Draft Cache', type: 'multilineText' },
    ],
  },
  Touches: {
    env: 'AIRTABLE_TOUCHES_TABLE', def: 'Touches',
    fields: [
      { name: 'Prospect ID', type: 'singleLineText' }, { name: 'Company', type: 'singleLineText' },
      { name: 'Channel', type: 'singleSelect', options: ['Email', 'LinkedIn', 'Instagram', 'Call'] },
      { name: 'Kind', type: 'singleSelect', options: ['Sent', 'Reply', 'Call Booked', 'Not Interested', 'Snoozed', 'Stage Change', 'Note'] },
      { name: 'Step', type: 'singleLineText' }, { name: 'Subject', type: 'singleLineText' }, { name: 'Body', type: 'multilineText' },
      { name: 'Staff', type: 'singleLineText' }, { name: 'Sent At', type: 'dateTime' },
    ],
  },
};

// Types Airtable reports that are close enough to what we asked for.
const COMPATIBLE = {
  singleLineText: ['singleLineText', 'multilineText', 'richText'],
  multilineText: ['multilineText', 'singleLineText', 'richText'],
  email: ['email', 'singleLineText'],
  phoneNumber: ['phoneNumber', 'singleLineText'],
  url: ['url', 'singleLineText'],
  singleSelect: ['singleSelect', 'singleLineText'],
  number: ['number', 'currency'],
  currency: ['currency', 'number'],
  date: ['date', 'dateTime'],
  dateTime: ['dateTime', 'date'],
};

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

const { AIRTABLE_API_KEY: key, AIRTABLE_BASE_ID: base } = process.env;
if (!key || !base) {
  console.error('Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID.');
  console.error('Put them in .env (see .env.example) and run this again.');
  process.exit(1);
}

const only = process.argv[2];
const wanted = Object.keys(TABLES).filter((k) => !only || k.toLowerCase() === only.toLowerCase());
if (!wanted.length) {
  console.error(`Unknown table "${only}". Choose one of: ${Object.keys(TABLES).join(', ')}`);
  process.exit(1);
}

const auth = { Authorization: `Bearer ${key}` };
const schemaRes = await fetch(`https://api.airtable.com/v0/meta/bases/${base}/tables`, { headers: auth });
if (!schemaRes.ok) {
  console.error(`Could not read the base schema (HTTP ${schemaRes.status}).`);
  console.error(await schemaRes.text());
  console.error('\nUsually this means the token lacks `schema.bases:read`, or');
  console.error('the base id is wrong, or the token has no access to this base.');
  process.exit(1);
}
const { tables } = await schemaRes.json();

let missingTotal = 0;
console.log(`Base ${base}\n`);

for (const label of wanted) {
  const spec = TABLES[label];
  const name = (process.env[spec.env] || spec.def).trim();
  const found = tables.find((t) => t.name === name || t.id === name);
  console.log(`── ${label}: "${name}"${found ? ` (${found.id})` : ''}`);
  if (!found) {
    console.log(`   MISSING TABLE. Tables here: ${tables.map((t) => t.name).join(', ')}`);
    console.log(`   Create it from the prompt in AIRTABLE-SETUP.md, or set ${spec.env} to the right name.\n`);
    missingTotal += spec.fields.length;
    continue;
  }
  const names = found.fields.map((f) => f.name);
  const missing = [];
  for (const want of spec.fields) {
    const field = found.fields.find((f) => f.name === want.name);
    if (!field) { missing.push(want.name); console.log(`   MISSING  ${want.name}`); continue; }
    const typeOk = (COMPATIBLE[want.type] || [want.type]).includes(field.type);
    let note = typeOk ? '' : `  ⚠ type is ${field.type}, expected ${want.type}`;
    if (want.options && field.type === 'singleSelect') {
      const have = (field.options?.choices || []).map((c) => c.name);
      const lack = want.options.filter((o) => !have.includes(o));
      if (lack.length) note += `  ⚠ options not yet present: ${lack.join(', ')} (typecast adds them on first write)`;
    }
    console.log(`   ok       ${want.name}  (${field.type})${note}`);
  }
  const extra = names.filter((n) => !spec.fields.some((f) => f.name === n));
  if (extra.length) console.log(`   extra columns (harmless): ${extra.join(', ')}`);

  const rowsRes = await fetch(`https://api.airtable.com/v0/${base}/${encodeURIComponent(found.id)}?pageSize=3`, { headers: auth });
  if (rowsRes.ok) {
    const { records } = await rowsRes.json();
    console.log(`   first rows: ${records.length === 0 ? 'none (clean)' : records.map((r) => r.fields.Company ?? r.fields.Name ?? r.fields.Email ?? r.fields['Prospect ID'] ?? '(blank)').join(' · ')}`);
  } else {
    console.log(`   could not read rows (HTTP ${rowsRes.status}); token may lack data.records:read`);
  }
  if (missing.length) console.log(`   → ${missing.length} column(s) missing. Add them in Airtable, exact spelling: ${missing.join(', ')}`);
  console.log('');
  missingTotal += missing.length;
}

console.log(missingTotal
  ? `RESULT: ${missingTotal} column(s) missing across ${wanted.length} table(s).`
  : `RESULT: schema is good for ${wanted.join(', ')}.`);
process.exit(missingTotal ? 1 : 0);
