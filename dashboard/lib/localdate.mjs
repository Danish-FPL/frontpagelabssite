// localdate.mjs — every "today" in Growth Command is a Chicago calendar day.
//
// The queue, the daily caps, and the weekly report all bucket by date. Using
// toISOString().slice(0, 10) would flip to tomorrow at 7 PM Chicago time in
// summer, which silently resets the day's caps mid-evening. Everything goes
// through this one module instead.

export const TZ = 'America/Chicago';

const ymd = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
});

/** YYYY-MM-DD for a Date (default now) in Chicago time. */
export function localDate(d = new Date()) {
  return ymd.format(d);
}

/** Add n calendar days to a YYYY-MM-DD string. */
export function addDays(iso, n) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Whole days from a to b (b minus a), both YYYY-MM-DD. */
export function daysBetween(a, b) {
  const toUtc = (iso) => {
    const [y, m, d] = String(iso).split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86400000);
}

/** Accepts a YYYY-MM-DD or an ISO timestamp and returns the Chicago YYYY-MM-DD. */
export function toLocalDate(value) {
  if (!value) return '';
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '' : localDate(d);
}

/** ISO week label like 2026-W36 for a YYYY-MM-DD, plus the Monday that starts it. */
export function isoWeek(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay() || 7; // Monday = 1 … Sunday = 7
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - day + 1);
  const thursday = new Date(date);
  thursday.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((thursday - yearStart) / 86400000 + 1) / 7);
  return {
    label: `${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`,
    monday: monday.toISOString().slice(0, 10),
  };
}
