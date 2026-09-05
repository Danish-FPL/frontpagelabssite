// drafter.mjs — Claude writes the draft, Danish sends it.
//
// One call per prospect per step, cached on the prospect's row so re-opening
// a row never re-bills. The prompt is two system blocks: the fact-free brief
// (cache_control on it, so the ~2,000 token doctrine is paid for once an
// hour, not once a draft) and the proof block. The user turn carries the
// prospect, their site text, the step rules, and what was already sent.
//
// Post-validation is the last line against the house style rules. Nothing in
// this module ever contacts a prospect: the only network calls are to the
// Anthropic API and to the prospect's own public website via sitefetch.mjs.

import Anthropic from '@anthropic-ai/sdk';
import { readFile, appendFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { fetchSiteText } from './sitefetch.mjs';
import { stepAt, stepsFor, channelKey } from './sequences.mjs';
import { localDate, daysBetween } from './localdate.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BRIEF_DIR = join(HERE, '..', 'brief');
const DATA = join(HERE, '..', 'data');
const LOG = join(DATA, 'draft-log.jsonl');

export const MODEL = process.env.FPL_DRAFT_MODEL || 'claude-sonnet-5';
// Sonnet 5 runs adaptive thinking by default. For a three-sentence message it
// adds seconds and cost for no visible gain, so it is off unless asked.
const THINKING = process.env.FPL_DRAFT_THINKING === '1' ? undefined : { type: 'disabled' };
const MAX_TOKENS = 1500;
const SITE_STALE_DAYS = 30;

// Dollars per million tokens, for the cost line in the log and the UI.
const PRICE = { in: 2, out: 10, cacheRead: 0.2, cacheWrite: 2.5 };

export const hasDrafter = () => !!(process.env.ANTHROPIC_API_KEY || '').trim();

let client = null;
export function getClient() {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

async function loadBrief() {
  const [brief, proof] = await Promise.all([
    readFile(join(BRIEF_DIR, 'fpl-brief.md'), 'utf8'),
    readFile(join(BRIEF_DIR, 'proof.md'), 'utf8'),
  ]);
  return { brief, proof };
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['observation', 'subject', 'draft', 'why_this_angle'],
  properties: {
    observation: { type: 'string', description: 'The one specific thing noticed about this prospect, so the sender can verify it.' },
    subject: { type: 'string', description: 'Email subject line. Empty string for every other channel.' },
    draft: { type: 'string', description: 'The message exactly as it should be sent. Plain text.' },
    why_this_angle: { type: 'string', description: 'One sentence on why this observation was chosen.' },
  },
};

// ── Validation ───────────────────────────────────────────────────────────────
const SPELLING = [
  [/\boptimi([sz])e/gi, 'optimize'], [/\boptimi([sz])ation/gi, 'optimization'], [/\borgani([sz])e/gi, 'organize'],
  [/\borganisation/gi, 'organization'], [/\bcolour/gi, 'color'], [/\bfavour/gi, 'favor'], [/\bcentre\b/gi, 'center'],
  [/\bbehaviour/gi, 'behavior'], [/\bcatalogue\b/gi, 'catalog'], [/\benquir/gi, 'inquir'], [/\bprioriti([sz])e/gi, 'prioritize'],
  [/\brealis(e|ing|ed)\b/gi, (m, t) => 'realiz' + t], [/\bneighbourhood/gi, 'neighborhood'], [/\blicence\b/gi, 'license'],
  [/\banalys(e|ing|ed)\b/gi, (m, t) => 'analyz' + t], [/\bprogramme\b/gi, 'program'], [/\bcancell(ed|ing)\b/gi, (m, t) => 'cancel' + t],
];
const URL_RE = /\bhttps?:\/\/\S+|\bwww\.\S+\.\S+|\b[a-z0-9-]+\.(?:com|org|net|io|co|us)\b(?:\/\S*)?/gi;
const OWN_LINK = /frontpagelabs\.com/i;
const BANNED = [
  /hope (this|you)('re| are)? (finds you|doing) well/i, /quick question/i, /keep this short/i, /circling back/i, /just following up/i,
  /game.?chang/i, /unlock/i, /elevate/i, /skyrocket/i, /leverage/i, /synergy/i, /cutting.?edge/i, /seamless/i, /robust/i,
  /love what you('re| are) doing/i, /\bAI\b|artificial intelligence|drafted by/i,
];

/**
 * Repairs what can be repaired, flags what should be looked at, rejects what
 * must not go out. Returns { text, warnings, rejected } where rejected is a
 * reason string or ''.
 */
export function validateDraft(text, { maxChars = 0, allowLink = true } = {}) {
  let t = String(text || '').replace(/\r\n/g, '\n').trim();
  const warnings = [];
  if (!t) return { text: '', warnings, rejected: 'empty draft' };

  const before = t;
  t = t.replace(/\s*—\s*/g, ', ').replace(/\s*–\s*/g, '-').replace(/\s*-{2,}\s*/g, ', ');
  t = t.replace(/!+/g, '.').replace(/\.{2,}/g, '.');
  t = t.replace(/\*\*|__|^#+[ \t]*/gm, '').replace(/^[ \t]*[-*•][ \t]+/gm, '');
  for (const [re, rep] of SPELLING) t = t.replace(re, rep);
  t = t.replace(/ {2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (t !== before) warnings.push('style repairs applied (dashes, exclamation marks, spelling, or markdown)');

  const links = t.match(URL_RE) || [];
  const foreign = links.filter((u) => !OWN_LINK.test(u));
  if (foreign.length) return { text: t, warnings, rejected: `contains a link that is not frontpagelabs.com (${foreign[0]})` };
  if (!allowLink && links.length) return { text: t, warnings, rejected: 'contains a link on a channel where links are not allowed' };
  if (links.length > 1) return { text: t, warnings, rejected: 'more than one link' };

  for (const re of BANNED) if (re.test(t)) return { text: t, warnings, rejected: `uses a banned phrase (${re.source.slice(0, 30)})` };

  if (maxChars && t.length > maxChars) return { text: t, warnings, rejected: `too long (${t.length} of ${maxChars} characters)` };

  if (/\b\w[\w' ]{0,20}, \w[\w' ]{0,20},? (and|or) \w[\w' ]{0,20}\b/.test(t)) warnings.push('possible rule-of-three; read it once');
  const fragments = (t.match(/(^|\n)[A-Z][^.\n]{2,24}\.(\s|$)/g) || []).length;
  if (fragments >= 2) warnings.push('several very short sentences; may read clipped');
  return { text: t, warnings, rejected: '' };
}

// ── Prompt assembly ──────────────────────────────────────────────────────────
function prospectBlock(p) {
  const lines = [
    `Company: ${p.name}`,
    p.contact ? `Contact: ${p.contact} (first name: ${p.firstName || p.contact.split(' ')[0]})` : 'Contact: unknown (do not invent a name; write without a greeting)',
    `Industry: ${p.industry}`,
    p.city ? `City: ${p.city}` : '',
    p.service && p.service !== 'Unknown' ? `Likely fit: ${p.service}` : '',
    p.website ? `Website: ${p.website}` : 'Website: none on file',
    p.notes ? `Notes from Danish: ${String(p.notes).slice(0, 800)}` : '',
  ].filter(Boolean);
  return lines.join('\n');
}

function stepRules(channel, step) {
  const rules = [
    `Channel: ${channel}`,
    `Step: ${step.label} (key ${step.key})`,
    `Hard length cap: ${step.maxChars} characters for the draft field`,
    step.link ? 'A single frontpagelabs.com link is allowed but not required.' : 'No links of any kind.',
    channel === 'Email' ? 'Return a subject line.' : 'Return an empty subject.',
  ];
  if (step.gate) rules.push(`Context: ${step.gate}`);
  return rules.join('\n');
}

function userMessage({ prospect, channel, step, siteText, siteError, priorSent, otherDrafts }) {
  const parts = [
    'TASK: Draft this one message for Danish to send by hand. Follow the brief. Return only the JSON object.',
    'PROSPECT:\n' + prospectBlock(prospect),
    'STEP RULES:\n' + stepRules(channel, step),
  ];
  if (siteText) parts.push('THEIR WEBSITE, STRIPPED TO TEXT (the only source for observations about the site):\n' + siteText);
  else parts.push(`THEIR WEBSITE: not available (${siteError || 'no website on file'}). Do not describe the site. Build on industry, city, and the notes.`);
  if (priorSent.length) {
    parts.push('ALREADY SENT TO THIS PROSPECT (reference, do not repeat):\n'
      + priorSent.map((t) => `[${t.channel}, ${t.step}, ${String(t.at).slice(0, 10)}]${t.subject ? ' Subject: ' + t.subject : ''}\n${t.body}`).join('\n\n'));
  }
  if (otherDrafts.length) {
    parts.push('DRAFTS ALREADY PREPARED FOR OTHER STEPS (do not reuse their observation or wording):\n'
      + otherDrafts.map((d) => `[${d.key}] ${d.observation}`).join('\n'));
  }
  return parts.join('\n\n');
}

const cost = (u = {}) =>
  ((u.input_tokens || 0) * PRICE.in + (u.output_tokens || 0) * PRICE.out
    + (u.cache_read_input_tokens || 0) * PRICE.cacheRead + (u.cache_creation_input_tokens || 0) * PRICE.cacheWrite) / 1e6;

async function callModel(system, text) {
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    ...(THINKING ? { thinking: THINKING } : {}),
    system,
    messages: [{ role: 'user', content: [{ type: 'text', text }] }],
    output_config: { format: { type: 'json_schema', schema: SCHEMA } },
  });
  if (response.stop_reason === 'refusal') throw Object.assign(new Error('The model declined to draft this one. Write it by hand.'), { code: 'REFUSAL', status: 422 });
  if (response.stop_reason === 'max_tokens') throw Object.assign(new Error('The draft ran past its token limit. Try again.'), { code: 'TRUNCATED', status: 502 });
  const raw = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw Object.assign(new Error('The model returned unparseable output. Try again.'), { code: 'BAD_JSON', status: 502 }); }
  return { parsed, usage: response.usage || {}, model: response.model };
}

async function log(entry) {
  try { await mkdir(DATA, { recursive: true }); await appendFile(LOG, JSON.stringify(entry) + '\n'); }
  catch (e) { console.error('  draft-log write failed:', e.message); }
}

// ── The public entry point ───────────────────────────────────────────────────
/**
 * Draft one step for one prospect. `prospect` is the SHAPED row (firstName
 * etc.), `touches` this prospect's touch list. Returns { draft, prospect,
 * cached } where prospect is the stored row after any site text / cache patch.
 */
export async function draftFor({ store, prospect, channel, stepKey, touches = [], force = false, staff = '' }) {
  if (!hasDrafter()) throw Object.assign(new Error('Drafting is off: ANTHROPIC_API_KEY is not set.'), { status: 503 });
  channel = channel || prospect.channel;
  const step = stepKey ? stepsFor(channel).find((s) => s.key === stepKey) : stepAt(channel, prospect.stepSent);
  if (!step) throw Object.assign(new Error('No such step for that channel.'), { status: 400 });
  const key = `${channelKey(channel)}:${step.key}`;
  const drafts = { ...(prospect.drafts || {}) };
  if (!force && drafts[key]?.draft) return { draft: drafts[key], prospect, cached: true, key };

  // Site text: fetch when missing or older than a month.
  const patch = {};
  let siteText = prospect.siteText || '';
  let siteError = '';
  const today = localDate();
  const stale = !prospect.siteFetched || daysBetween(prospect.siteFetched, today) > SITE_STALE_DAYS;
  if (prospect.website && (force || !siteText || stale)) {
    const got = await fetchSiteText(prospect.website);
    siteText = got.text || siteText;
    siteError = got.error;
    patch.siteText = siteText;
    patch.siteFetched = today;
  } else if (!prospect.website) {
    siteError = 'no website on file';
  }

  const priorSent = touches.filter((t) => t.kind === 'Sent' && t.body).slice(0, 6).reverse();
  const otherDrafts = Object.entries(drafts).filter(([k, d]) => k !== key && d?.observation).map(([k, d]) => ({ key: k, observation: d.observation }));
  const { brief, proof } = await loadBrief();
  const system = [
    { type: 'text', text: brief, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: proof },
  ];
  let text = userMessage({ prospect, channel, step, siteText, siteError, priorSent, otherDrafts });

  let result = null, usageTotal = {}, attempts = 0, lastReject = '';
  while (attempts < 2 && !result) {
    attempts += 1;
    const { parsed, usage, model } = await callModel(system, text);
    for (const k of Object.keys(usage)) usageTotal[k] = (usageTotal[k] || 0) + (usage[k] || 0);
    const v = validateDraft(parsed.draft, { maxChars: step.maxChars, allowLink: !!step.link });
    const subject = channel === 'Email' ? validateDraft(parsed.subject, { maxChars: 90, allowLink: false }).text.replace(/\n.*/s, '') : '';
    if (!v.rejected || attempts === 2) {
      result = {
        observation: String(parsed.observation || '').slice(0, 600),
        subject,
        draft: v.text,
        whyThisAngle: String(parsed.why_this_angle || '').slice(0, 300),
        model, at: new Date().toISOString(), step: step.key, channel,
        warnings: v.rejected ? [...v.warnings, `accepted with a problem: ${v.rejected}`] : v.warnings,
        cost: Number(cost(usageTotal).toFixed(4)),
      };
    } else {
      lastReject = v.rejected;
      text += `\n\nYOUR PREVIOUS DRAFT WAS REJECTED because it ${v.rejected}. Rewrite it so it does not. Previous draft:\n${v.text}`;
    }
  }

  drafts[key] = result;
  patch.drafts = drafts;
  const updated = await store.updateProspect(prospect.id, patch);
  await log({
    ts: result.at, staff, prospectId: prospect.id, company: prospect.name, channel, step: step.key,
    attempts, lastReject, siteChars: siteText.length, siteError,
    tokens: { in: usageTotal.input_tokens, out: usageTotal.output_tokens, cacheRead: usageTotal.cache_read_input_tokens, cacheWrite: usageTotal.cache_creation_input_tokens },
    cost: result.cost, warnings: result.warnings,
  });
  return { draft: result, prospect: updated, cached: false, key };
}

// ── Batch jobs ───────────────────────────────────────────────────────────────
// In-process job map. Concurrency 2: site fetches dominate latency and the API
// has no trouble with two at once. The UI polls GET /api/drafts/batch?job=.
const jobs = new Map();

export function startBatch({ store, items, staff = '', onDone }) {
  const id = randomBytes(4).toString('hex');
  const job = { id, total: items.length, done: 0, failed: [], results: {}, running: true, startedAt: new Date().toISOString(), cost: 0 };
  jobs.set(id, job);
  let i = 0;
  const worker = async () => {
    while (i < items.length) {
      const item = items[i++];
      try {
        const r = await draftFor({ store, ...item, staff });
        job.results[item.prospect.id] = { key: r.key, draft: r.draft, cached: r.cached };
        job.cost += r.cached ? 0 : (r.draft.cost || 0);
        if (onDone) onDone(item.prospect.id, r);
      } catch (e) {
        job.failed.push({ id: item.prospect.id, company: item.prospect.name, error: e.message });
      } finally {
        job.done += 1;
      }
    }
  };
  Promise.all([worker(), worker()]).finally(() => { job.running = false; job.cost = Number(job.cost.toFixed(4)); });
  // Keep finished jobs for an hour.
  setTimeout(() => jobs.delete(id), 3600000).unref();
  return job;
}

export const batchStatus = (id) => jobs.get(id) || null;

/** Sum of today's drafting cost from the log, for the header. */
export async function costToday() {
  try {
    const today = localDate();
    const lines = (await readFile(LOG, 'utf8')).split('\n').filter(Boolean);
    let sum = 0, n = 0;
    for (const l of lines) {
      try { const e = JSON.parse(l); if (String(e.ts).startsWith(today) && e.cost) { sum += e.cost; n += 1; } } catch { /* skip */ }
    }
    return { drafts: n, cost: Number(sum.toFixed(2)) };
  } catch { return { drafts: 0, cost: 0 }; }
}
