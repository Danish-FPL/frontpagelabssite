// prospects.mjs — one row shape for every prospect, wherever it came from.
//
// Every source (manual form, CSV, bookmarklet, research, promoted site lead)
// funnels through normalize() so the store and the UI see a single shape, and
// dedupeKeys() so the same business can never land twice under a different
// capitalization, a www. prefix, or a formatted phone number.

import { stepAt, stepsFor, CHANNELS, channelKey } from './sequences.mjs';
import { daysBetween, toLocalDate } from './localdate.mjs';

export const STAGES = ['New', 'Contacted', 'Call Booked', 'Proposal', 'Won', 'Lost'];
export const OPEN_STAGES = ['New', 'Contacted', 'Call Booked', 'Proposal'];
export const SEQ_STATUS = ['Active', 'Replied', 'Finished', 'Stopped', 'External'];
export const INDUSTRIES = ['Real Estate Brokerage', 'Developer', 'Property Management', 'Service Business', 'E-commerce', 'Other'];
export const SERVICES = ['Website', 'Website + Ads', 'Landing Page Offer', 'SEO', 'Ads', 'Branding', 'Unknown'];
export const SOURCES = ['Manual', 'CSV', 'Bookmarklet', 'Research', 'Inbound'];

const str = (v, max = 500) => String(v ?? '').trim().slice(0, max);

export const normEmail = (v) => str(v, 200).toLowerCase();

export const normDigits = (v) => {
  const d = String(v || '').replace(/\D/g, '');
  return d.length >= 10 ? d.slice(-10) : d;
};

export function normUrl(v) {
  let u = str(v, 400);
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u.replace(/^\/+/, '');
  try {
    const url = new URL(u);
    if (!/\./.test(url.hostname)) return '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

export function normDomain(v) {
  try {
    return new URL(normUrl(v)).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

export function normLinkedin(v) {
  const u = normUrl(v);
  const m = u.match(/linkedin\.com\/(in|company)\/([^/?#]+)/i);
  return m ? `${m[1].toLowerCase()}/${decodeURIComponent(m[2]).toLowerCase()}` : '';
}

export function normInstagram(v) {
  const s = str(v, 200);
  if (!s) return '';
  const m = s.match(/instagram\.com\/([^/?#]+)/i);
  const handle = m ? m[1] : s.replace(/^@/, '');
  return /^[a-z0-9._]{1,30}$/i.test(handle) ? handle.toLowerCase() : '';
}

export function firstNameOf(contact) {
  const c = str(contact, 120).replace(/^(dr|mr|mrs|ms|prof)\.?\s+/i, '');
  const first = c.split(/[\s,]+/)[0] || '';
  return first.replace(/[^\p{L}'-]/gu, '');
}

/** Which channel to start on, from the contact info present. */
export function pickChannel(p) {
  if (p.email) return 'Email';
  if (p.linkedinUrl) return 'LinkedIn';
  if (p.instagramUrl) return 'Instagram';
  if (p.phone) return 'Call';
  return 'Email';
}

export function reachOf(p) {
  return {
    email: !!p.email,
    linkedin: !!p.linkedinUrl,
    instagram: !!p.instagramUrl,
    call: !!p.phone,
  };
}

/** Blank prospect with every field present, so the store never writes undefined. */
export function blank() {
  return {
    id: '', name: '', contact: '', email: '', phone: '', website: '', linkedinUrl: '', instagramUrl: '',
    industry: 'Other', city: '', service: 'Unknown', value: 0,
    stage: 'New', channel: 'Email', seqStatus: 'Active', stepSent: 0,
    nextTouch: '', lastTouch: '', nextStep: '', source: 'Manual', owner: '', notes: '',
    siteText: '', siteFetched: '', drafts: {}, created: '', recordUrl: '',
  };
}

/**
 * Turn untrusted input (a form body, a CSV row, a bookmarklet payload) into a
 * clean prospect. Unknown keys are dropped; every value is trimmed and capped.
 */
export function normalize(input = {}, { source = 'Manual', owner = '' } = {}) {
  const p = blank();
  p.name = str(input.name ?? input.company, 160);
  p.contact = str(input.contact, 120);
  p.email = normEmail(input.email);
  if (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) p.email = '';
  p.phone = str(input.phone, 40);
  p.website = normUrl(input.website);
  const li = normUrl(input.linkedinUrl ?? input.linkedin);
  p.linkedinUrl = normLinkedin(li) ? li : '';
  const ig = normInstagram(input.instagramUrl ?? input.instagram);
  p.instagramUrl = ig ? `https://www.instagram.com/${ig}/` : '';
  p.industry = INDUSTRIES.includes(input.industry) ? input.industry : guessIndustry(input.industry) || 'Other';
  p.city = str(input.city, 80);
  p.service = SERVICES.includes(input.service) ? input.service : 'Unknown';
  p.value = Math.max(0, Math.round(Number(String(input.value ?? 0).replace(/[^\d.]/g, '')) || 0));
  p.stage = STAGES.includes(input.stage) ? input.stage : 'New';
  p.channel = CHANNELS.includes(input.channel) ? input.channel : pickChannel(p);
  p.seqStatus = SEQ_STATUS.includes(input.seqStatus) ? input.seqStatus : 'Active';
  p.stepSent = Math.max(0, Math.round(Number(input.stepSent) || 0));
  p.nextTouch = toLocalDate(input.nextTouch);
  p.lastTouch = toLocalDate(input.lastTouch);
  p.nextStep = str(input.nextStep, 200);
  p.source = SOURCES.includes(input.source) ? input.source : SOURCES.includes(source) ? source : 'Manual';
  p.owner = str(input.owner || owner, 60);
  p.notes = str(input.notes, 5000);
  return p;
}

// A CSV "Category" column or a bookmarklet guess often says "realtor" or
// "property manager" rather than our exact select values.
export function guessIndustry(text) {
  const t = String(text || '').toLowerCase();
  if (!t) return '';
  if (/(property manag|hoa|association manag|leasing|apartments?)/.test(t)) return 'Property Management';
  if (/(develop|builder|construction|custom home)/.test(t)) return 'Developer';
  if (/(realt|broker|real estate|agent|homes for sale)/.test(t)) return 'Real Estate Brokerage';
  if (/(shop|store|ecommerce|e-commerce|boutique|retail|products?)/.test(t)) return 'E-commerce';
  if (/(service|plumb|hvac|roof|clean|landscap|law|legal|dental|therap|salon|studio|repair|contractor|clinic|fitness|gym)/.test(t)) return 'Service Business';
  return '';
}

/** Keys used to spot duplicates. Any one match means the same business. */
export function dedupeKeys(p) {
  const keys = [];
  if (p.email) keys.push('email:' + p.email);
  const dom = normDomain(p.website);
  if (dom) keys.push('domain:' + dom);
  const li = normLinkedin(p.linkedinUrl);
  if (li) keys.push('li:' + li);
  const ig = normInstagram(p.instagramUrl);
  if (ig) keys.push('ig:' + ig);
  const ph = normDigits(p.phone);
  if (ph.length === 10) keys.push('phone:' + ph);
  return keys;
}

/** Build an index of existing prospects by dedupe key. */
export function dedupeIndex(list) {
  const idx = new Map();
  for (const p of list) for (const k of dedupeKeys(p)) if (!idx.has(k)) idx.set(k, p);
  return idx;
}

/** Returns the existing prospect a new one collides with, or null. */
export function findDuplicate(p, idx) {
  for (const k of dedupeKeys(p)) {
    const hit = idx.get(k);
    if (hit) return { existing: hit, key: k };
  }
  // No contact keys at all: fall back to company name plus city so a bare
  // "name only" import cannot create the same business twice.
  if (!dedupeKeys(p).length && p.name) {
    const k = 'name:' + p.name.toLowerCase() + '|' + p.city.toLowerCase();
    const hit = idx.get(k);
    if (hit) return { existing: hit, key: k };
  }
  return null;
}

export function addToIndex(idx, p) {
  for (const k of dedupeKeys(p)) if (!idx.has(k)) idx.set(k, p);
  if (p.name) {
    const k = 'name:' + p.name.toLowerCase() + '|' + p.city.toLowerCase();
    if (!idx.has(k)) idx.set(k, p);
  }
}

/**
 * The API contract: a stored prospect plus the fields the UI derives. `touches`
 * is this prospect's touch list (already filtered), `today` is a Chicago date.
 */
export function shape(p, { touches = [], today }) {
  const step = p.seqStatus === 'Active' ? stepAt(p.channel, p.stepSent) : null;
  const due = p.seqStatus === 'Active' && !!step && (!p.nextTouch || p.nextTouch <= today);
  const overdueDays = due && p.nextTouch ? Math.max(0, daysBetween(p.nextTouch, today)) : 0;
  const sent = touches.filter((t) => t.kind === 'Sent');
  return {
    ...p,
    firstName: firstNameOf(p.contact),
    touches: sent.length,
    hasSite: !!p.website,
    nextStepDue: p.nextTouch,
    reach: reachOf(p),
    channelKey: channelKey(p.channel),
    due,
    stepIndex: step ? stepsFor(p.channel).indexOf(step) : -1,
    stepKey: step ? step.key : '',
    stepLabel: step ? step.label : p.seqStatus === 'Finished' ? 'Sequence finished' : '',
    stepGate: step?.gate || '',
    stepMaxChars: step?.maxChars || 0,
    isFollowUp: !!step && p.stepSent > 0,
    overdueDays,
  };
}

// ── CSV ──────────────────────────────────────────────────────────────────────
export const CSV_COLUMNS = [
  ['name', 'Company'], ['contact', 'Contact'], ['email', 'Email'], ['phone', 'Phone'],
  ['website', 'Website'], ['linkedinUrl', 'LinkedIn URL'], ['instagramUrl', 'Instagram URL'],
  ['industry', 'Industry'], ['city', 'City'], ['service', 'Service Fit'], ['value', 'Value'],
  ['stage', 'Stage'], ['channel', 'Channel'], ['seqStatus', 'Sequence Status'], ['stepSent', 'Step Sent'],
  ['nextTouch', 'Next Touch'], ['lastTouch', 'Last Touch'], ['source', 'Source'], ['owner', 'Owner'], ['notes', 'Notes'],
];

const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

export function toCsv(rows) {
  const head = CSV_COLUMNS.map(([, label]) => csvCell(label)).join(',');
  const lines = rows.map((p) => CSV_COLUMNS.map(([key]) => csvCell(p[key])).join(','));
  return [head, ...lines].join('\r\n') + '\r\n';
}
