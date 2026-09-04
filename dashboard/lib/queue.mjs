// queue.mjs — which prospects go on the Today tab.
//
// Rules, in order:
//   1. Eligible: sequence Active, stage still open, reachable on its channel,
//      and due (Next Touch empty or on/before today).
//   2. Due follow-ups always show; they are conversations already started.
//   3. New first touches are rationed by the caps: per channel, and by the
//      shared daily total, allocated in channel order. What does not fit is
//      counted (and listed, capped) as overflow behind "Show more".
//
// Pure, covered by queue.test.mjs. `prospects` are already shaped rows.

import { OPEN_STAGES } from './prospects.mjs';
import { sentToday } from './touches.mjs';

export const CHANNEL_ORDER = ['email', 'linkedin', 'instagram', 'call'];
const OVERFLOW_LIST_MAX = 25;

const byDueAsc = (a, b) => (a.nextTouch || '9999') < (b.nextTouch || '9999') ? -1 : (a.nextTouch || '9999') > (b.nextTouch || '9999') ? 1 : 0;
const byFreshness = (a, b) =>
  (b.source === 'Inbound') - (a.source === 'Inbound')
  || (b.value || 0) - (a.value || 0)
  || String(b.created).localeCompare(String(a.created));

export function buildToday({ prospects, touches, caps, today }) {
  const sent = sentToday(touches, today);
  const queue = {}, overflow = {}, overflowList = {};
  let totalRemaining = Math.max(0, (caps.total ?? 0) - Object.values(sent.new).reduce((s, n) => s + n, 0));
  let followUpsDue = 0;

  for (const ch of CHANNEL_ORDER) {
    const eligible = prospects.filter((p) =>
      p.due && p.channelKey === ch && p.reach?.[ch] && OPEN_STAGES.includes(p.stage));
    const followUps = eligible.filter((p) => p.isFollowUp).sort(byDueAsc);
    const fresh = eligible.filter((p) => !p.isFollowUp).sort(byFreshness);
    const allow = Math.max(0, Math.min((caps[ch] ?? 0) - (sent.new[ch] || 0), totalRemaining));
    const take = fresh.slice(0, allow);
    totalRemaining -= take.length;
    followUpsDue += followUps.length;
    queue[ch] = [...followUps, ...take];
    overflow[ch] = fresh.length - take.length;
    overflowList[ch] = fresh.slice(take.length, take.length + OVERFLOW_LIST_MAX);
  }

  return {
    date: today,
    caps,
    sentToday: sent,
    queue,
    overflow,
    overflowList,
    followUpsDue,
    plannedNew: Object.values(queue).reduce((s, list) => s + list.filter((p) => !p.isFollowUp).length, 0),
  };
}
