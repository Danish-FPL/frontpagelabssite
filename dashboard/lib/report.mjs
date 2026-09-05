// report.mjs — what went out and what came back, by week and channel.
//
// Counts straight from the Touches list: Sent, Reply, Call Booked, Not
// Interested. Reply rate is replies over sends in the same week, which is a
// rough but honest number when the sequences are a few days long.

import { isoWeek, toLocalDate, localDate } from './localdate.mjs';
import { CHANNELS, channelKey } from './sequences.mjs';

const KINDS = { Sent: 'sent', Reply: 'replies', 'Call Booked': 'calls', 'Not Interested': 'notInterested' };

export function weeklyReport({ touches, weeks = 8, today = localDate() }) {
  const n = Math.min(26, Math.max(1, Math.round(Number(weeks) || 8)));
  const byWeek = new Map();
  const blankRow = () => {
    const row = { total: { sent: 0, replies: 0, calls: 0, notInterested: 0 } };
    for (const c of CHANNELS) row[channelKey(c)] = { sent: 0, replies: 0, calls: 0, notInterested: 0 };
    return row;
  };
  // Seed the last n weeks so empty weeks still show.
  const thisMonday = isoWeek(today).monday;
  for (let i = 0; i < n; i++) {
    const [y, m, d] = thisMonday.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d - 7 * i)).toISOString().slice(0, 10);
    const wk = isoWeek(date);
    byWeek.set(wk.label, { label: wk.label, monday: wk.monday, ...blankRow() });
  }
  for (const t of touches) {
    const field = KINDS[t.kind];
    if (!field) continue;
    const day = toLocalDate(t.at);
    if (!day) continue;
    const wk = isoWeek(day).label;
    const row = byWeek.get(wk);
    if (!row) continue;
    const ch = channelKey(t.channel);
    if (row[ch]) row[ch][field] += 1;
    row.total[field] += 1;
  }
  const rows = [...byWeek.values()].sort((a, b) => (a.monday < b.monday ? 1 : -1));
  const rate = (o) => (o.sent ? Math.round((o.replies / o.sent) * 100) : 0);
  for (const r of rows) {
    for (const c of CHANNELS) r[channelKey(c)].replyRate = rate(r[channelKey(c)]);
    r.total.replyRate = rate(r.total);
  }
  const totals = blankRow();
  for (const r of rows) {
    for (const k of [...CHANNELS.map(channelKey), 'total']) {
      for (const f of ['sent', 'replies', 'calls', 'notInterested']) totals[k][f] += r[k][f];
    }
  }
  for (const k of [...CHANNELS.map(channelKey), 'total']) totals[k].replyRate = rate(totals[k]);
  return { weeks: rows, totals, since: rows[rows.length - 1]?.monday || today, today };
}
