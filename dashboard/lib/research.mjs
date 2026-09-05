// research.mjs — optional, paid, off by default.
//
// "Property managers in Naperville" in, a short list of real businesses with
// the source URLs Claude found them on out. It never writes: the UI shows the
// candidates with checkboxes and only the ones Danish ticks become prospects
// (Source = Research). Each call runs up to eight web searches and costs
// roughly five to fifteen cents, which is why FPL_RESEARCH_ENABLED=1 gates it.
//
// Pattern restored from CAF commit c90b6ab (scanPartners), updated to the
// current web_search tool type.

import { getClient, MODEL, hasDrafter } from './drafter.mjs';
import { normalize, dedupeIndex, findDuplicate } from './prospects.mjs';
import { readFile, appendFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const LOG = join(HERE, '..', 'data', 'draft-log.jsonl');

export const hasResearch = () => process.env.FPL_RESEARCH_ENABLED === '1' && hasDrafter();

const PRICE = { in: 2, out: 10, search: 10 / 1000 }; // dollars per 1M tokens; per search

export async function research({ query, count = 10, existing = [], staff = '' }) {
  if (!hasResearch()) throw Object.assign(new Error('Research is off. Set FPL_RESEARCH_ENABLED=1 (and an API key) to turn it on.'), { status: 503 });
  const q = String(query || '').trim().slice(0, 160);
  if (!q) throw Object.assign(new Error('Say what to look for, like "property managers in Naperville".'), { status: 400 });
  const n = Math.min(15, Math.max(3, Math.round(Number(count) || 10)));
  const idx = dedupeIndex(existing);
  const have = existing.map((p) => p.name).filter(Boolean).slice(0, 200);

  const prompt = `Find up to ${n} REAL, currently operating businesses matching: "${q}". Prefer the Chicago area unless the query names somewhere else.

Do NOT include any of these, which we already have:
${have.map((x) => '- ' + x).join('\n') || '- (none yet)'}

For each business find its own website (not a directory page), the name of the owner or a decision maker if it is public on their site, a public phone, a city, and a public LinkedIn or Instagram URL if their site links one. Read the business's own site when you can.

Reply with ONLY a JSON object, no other text, in exactly this shape:
{"businesses":[{"name":"","website":"","contact":"","phone":"","email":"","city":"","industry":"","linkedin":"","instagram":"","why":""}],"noMore":false}

Rules: only businesses you actually found via search; empty string for anything you could not verify; "industry" is one of Real Estate Brokerage, Developer, Property Management, Service Business, E-commerce, Other; "why" is one short factual line about why they might need website or marketing help, or empty; set "noMore" true if the area seems exhausted.`;

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 4000,
    thinking: { type: 'disabled' },
    tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 8 }],
    messages: [{ role: 'user', content: prompt }],
  });

  const sources = [];
  for (const b of response.content || []) {
    if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) {
      for (const r of b.content) if (r.type === 'web_search_result' && r.url) sources.push({ url: r.url, title: r.title || '' });
    }
  }
  const text = (response.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw Object.assign(new Error('The search came back with nothing parseable. Try a narrower query.'), { status: 502 });
  let parsed;
  try { parsed = JSON.parse(m[0]); } catch { throw Object.assign(new Error('The search result was not valid JSON. Try again.'), { status: 502 }); }

  const searches = response.usage?.server_tool_use?.web_search_requests || 0;
  const usage = response.usage || {};
  const costUsd = ((usage.input_tokens || 0) * PRICE.in + (usage.output_tokens || 0) * PRICE.out) / 1e6 + searches * PRICE.search;

  const candidates = [];
  for (const b of (parsed.businesses || []).slice(0, n)) {
    const p = normalize({ company: b.name, contact: b.contact, email: b.email, phone: b.phone, website: b.website, linkedin: b.linkedin, instagram: b.instagram, city: b.city, industry: b.industry, notes: b.why ? `Research: ${b.why}` : '' }, { source: 'Research' });
    if (!p.name) continue;
    const dup = findDuplicate(p, idx);
    const host = (() => { try { return new URL(p.website).hostname.replace(/^www\./, ''); } catch { return ''; } })();
    const mySources = sources.filter((s) => host && s.url.includes(host)).slice(0, 3);
    if (!mySources.length && sources.length) mySources.push(sources[0]);
    candidates.push({ ...p, duplicateOf: dup ? { id: dup.existing.id, name: dup.existing.name } : null, sources: mySources });
  }

  try {
    await mkdir(dirname(LOG), { recursive: true });
    await appendFile(LOG, JSON.stringify({ ts: new Date().toISOString(), type: 'research', staff, query: q, found: candidates.length, searches, cost: Number(costUsd.toFixed(4)) }) + '\n');
  } catch { /* log is best effort */ }

  return { query: q, candidates, noMore: parsed.noMore === true, searches, cost: Number(costUsd.toFixed(3)), sources: sources.slice(0, 20) };
}
