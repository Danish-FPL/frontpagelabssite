// touches.mjs — every state change a prospect goes through, logged as a touch.
//
// A "touch" is one row in the Touches table: what went out (kind Sent, with the
// exact body), or what happened (Reply, Not Interested, Snoozed, Stage Change,
// Call Booked, Note). Each helper writes the touch AND patches the prospect so
// the two can never disagree.

import { nextTouchAfter, stepAt, isFirstStep, channelKey, CHANNELS } from './sequences.mjs';
import { localDate, addDays, toLocalDate } from './localdate.mjs';

const now = () => new Date().toISOString();

async function write(store, prospect, touch, patch) {
  const t = await store.createTouch({
    prospectId: prospect.id, company: prospect.name,
    channel: touch.channel || prospect.channel, kind: touch.kind, step: touch.step || '',
    subject: touch.subject || '', body: touch.body || '', staff: touch.staff || '', at: now(),
  });
  const updated = Object.keys(patch).length ? await store.updateProspect(prospect.id, patch) : prospect;
  return { touch: t, prospect: updated };
}

/** A message went out by hand. Advances the sequence when it was the current channel's step. */
export async function logSent(store, prospect, { channel, step, subject = '', body = '', staff = '' }) {
  const ch = CHANNELS.includes(channel) ? channel : prospect.channel;
  const today = localDate();
  const patch = { lastTouch: today };
  if (prospect.stage === 'New') patch.stage = 'Contacted';

  const current = stepAt(prospect.channel, prospect.stepSent);
  const stepKey = step || current?.key || '';
  if (ch === prospect.channel && prospect.seqStatus === 'Active' && current && current.key === stepKey) {
    const stepSent = prospect.stepSent + 1;
    const next = nextTouchAfter(ch, stepSent, today);
    patch.stepSent = stepSent;
    patch.nextTouch = next || '';
    patch.seqStatus = next ? 'Active' : 'Finished';
    const nextStep = next ? stepAt(ch, stepSent) : null;
    patch.nextStep = nextStep ? `${nextStep.label} on ${ch}` : 'Sequence finished. Switch channel or close.';
  }
  return write(store, prospect, { kind: 'Sent', channel: ch, step: stepKey, subject, body, staff }, patch);
}

export async function markReplied(store, prospect, { staff = '', note = '' } = {}) {
  const today = localDate();
  const patch = { seqStatus: 'Replied', lastTouch: today, nextTouch: today, nextStep: 'They replied. Answer them.' };
  if (prospect.stage === 'New') patch.stage = 'Contacted';
  return write(store, prospect, { kind: 'Reply', body: note, staff }, patch);
}

export async function markNotInterested(store, prospect, { staff = '', reason = '' } = {}) {
  const patch = { seqStatus: 'Stopped', stage: 'Lost', nextTouch: '', nextStep: reason ? `Not interested: ${reason}` : 'Not interested' };
  return write(store, prospect, { kind: 'Not Interested', body: reason, staff }, patch);
}

export async function snooze(store, prospect, { days = 3, staff = '' } = {}) {
  const d = Math.min(90, Math.max(1, Math.round(Number(days) || 3)));
  const nextTouch = addDays(localDate(), d);
  return write(store, prospect, { kind: 'Snoozed', body: `${d} day${d === 1 ? '' : 's'}`, staff }, { nextTouch });
}

export async function switchChannel(store, prospect, { channel, staff = '' }) {
  if (!CHANNELS.includes(channel)) throw Object.assign(new Error('Unknown channel'), { status: 400 });
  const first = stepAt(channel, 0);
  const patch = { channel, stepSent: 0, seqStatus: 'Active', nextTouch: localDate(), nextStep: `${first.label} on ${channel}` };
  return write(store, prospect, { kind: 'Note', channel, body: `Switched to ${channel}`, staff }, patch);
}

export async function setStage(store, prospect, { stage, staff = '' }) {
  const patch = { stage };
  if (stage === 'Lost') patch.seqStatus = 'Stopped';
  else if (['Call Booked', 'Proposal', 'Won'].includes(stage) && prospect.seqStatus === 'Active') patch.seqStatus = 'Replied';
  const kind = stage === 'Call Booked' ? 'Call Booked' : 'Stage Change';
  return write(store, prospect, { kind, body: `${prospect.stage} → ${stage}`, staff }, patch);
}

export async function addNote(store, prospect, { body, staff = '' }) {
  return write(store, prospect, { kind: 'Note', body, staff }, {});
}

/** Counts for the day, per channel key: first touches (what caps count) and all sends. */
export function sentToday(touches, today = localDate()) {
  const out = { new: {}, all: {}, followUps: 0 };
  for (const c of CHANNELS) { out.new[channelKey(c)] = 0; out.all[channelKey(c)] = 0; }
  for (const t of touches) {
    if (t.kind !== 'Sent' || toLocalDate(t.at) !== today) continue;
    const k = channelKey(t.channel);
    if (!(k in out.all)) continue;
    out.all[k] += 1;
    if (isFirstStep(t.channel, t.step)) out.new[k] += 1;
    else out.followUps += 1;
  }
  return out;
}
