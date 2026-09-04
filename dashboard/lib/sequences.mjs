// sequences.mjs — the four outreach cadences, as data.
//
// A prospect is on ONE channel at a time (their `channel` column) and walks
// its steps in order. `day` is the gap from the previous step. After the last
// step is sent the sequence is Finished; "switch channel" starts them over on
// another channel without a second record.
//
// Pure module, no I/O, covered by sequences.test.mjs.

import { addDays } from './localdate.mjs';

export const CHANNELS = ['Email', 'LinkedIn', 'Instagram', 'Call'];

export const channelKey = (channel) => String(channel || '').toLowerCase();

export const SEQUENCES = {
  Email: [
    { key: 'first', label: 'First touch', day: 0, maxChars: 1200, link: true },
    { key: 'follow-up', label: 'Follow-up', day: 4, maxChars: 800, link: true },
    { key: 'breakup', label: 'Breakup', day: 12, maxChars: 700, link: true },
  ],
  LinkedIn: [
    { key: 'connect', label: 'Connection note', day: 0, maxChars: 200, link: false },
    {
      key: 'message', label: 'First message', day: 3, maxChars: 600, link: false,
      gate: 'Send only if they accepted the connection. If not yet, snooze it.',
    },
  ],
  Instagram: [
    { key: 'dm', label: 'Cold DM', day: 0, maxChars: 500, link: false },
    { key: 'dm-follow-up', label: 'Follow-up DM', day: 3, maxChars: 400, link: false },
  ],
  Call: [
    { key: 'call', label: 'Cold call', day: 0, maxChars: 900, link: false },
    { key: 'call-2', label: 'Second attempt', day: 5, maxChars: 700, link: false },
  ],
};

export const stepsFor = (channel) => SEQUENCES[channel] || [];

/** The step a prospect is about to send, given how many they have sent. Null when finished. */
export function stepAt(channel, stepSent) {
  const steps = stepsFor(channel);
  const i = Math.max(0, Number(stepSent) || 0);
  return steps[i] || null;
}

export const stepIndexOf = (channel, key) => stepsFor(channel).findIndex((s) => s.key === key);

export function stepLabel(channel, key) {
  const s = stepsFor(channel).find((x) => x.key === key);
  return s ? s.label : key || '';
}

/** True when `key` is the opening step of its channel (what the daily caps count). */
export function isFirstStep(channel, key) {
  const steps = stepsFor(channel);
  return steps.length > 0 && steps[0].key === key;
}

/**
 * After a step has just been sent (stepSent is now the count INCLUDING it),
 * when is the next one due? Null means the sequence is finished.
 */
export function nextTouchAfter(channel, stepSent, fromDate) {
  const next = stepsFor(channel)[stepSent];
  if (!next) return null;
  return addDays(fromDate, next.day);
}
