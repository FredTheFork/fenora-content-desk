/**
 * Timezone helpers. Everything the desk shows and compares is expressed as
 * wall-clock strings in the desk's own timezone (YYYY-MM-DD and HH:MM), which
 * compare correctly with plain string comparison and never drift with DST.
 */

export const DEFAULT_TZ = 'Europe/London';

const partsCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string, opts: Intl.DateTimeFormatOptions) {
  const key = `${timeZone}|${JSON.stringify(opts)}`;
  let f = partsCache.get(key);
  if (!f) {
    try {
      f = new Intl.DateTimeFormat('en-GB', { timeZone, ...opts });
    } catch {
      f = new Intl.DateTimeFormat('en-GB', { ...opts });
    }
    partsCache.set(key, f);
  }
  return f;
}

export function isValidTimeZone(tz: string): boolean {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Current wall clock in `timeZone`. */
export function nowIn(timeZone: string): { date: string; time: string; stamp: string } {
  const tz = isValidTimeZone(timeZone) ? timeZone : DEFAULT_TZ;
  const parts = formatter(tz, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const hour = get('hour') === '24' ? '00' : get('hour');
  const date = `${get('year')}-${get('month')}-${get('day')}`;
  const time = `${hour}:${get('minute')}`;
  return { date, time, stamp: `${date}T${time}` };
}

export function today(timeZone: string): string {
  return nowIn(timeZone).date;
}

/** Add whole days to a YYYY-MM-DD string (date-only arithmetic, DST-safe). */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday */
export function weekday(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

/** Monday-based week key, e.g. 2026-W39 — used to cap posts per week. */
export function weekKey(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3); // Thursday of this week
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const ftDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - ftDay + 3);
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 864e5));
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function weekdayName(date: string, short = true): string {
  const n = DAY_NAMES[weekday(date)];
  return short ? n.slice(0, 3) : n;
}

/** "Mon 28 Sep" */
export function prettyDate(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  return `${weekdayName(date)} ${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]}`;
}

/** "Mon 28 Sep · 08:15" */
export function prettyStamp(date: string, time: string): string {
  return `${prettyDate(date)} · ${time}`;
}

export function relativeDayLabel(date: string, timeZone: string): string | null {
  const t = today(timeZone);
  if (date === t) return 'Today';
  if (date === addDays(t, 1)) return 'Tomorrow';
  if (date === addDays(t, -1)) return 'Yesterday';
  return null;
}

export const TIME_ZONES = [
  'Europe/London',
  'Europe/Dublin',
  'Europe/Paris',
  'Europe/Madrid',
  'Europe/Berlin',
  'Europe/Amsterdam',
  'Europe/Rome',
  'Europe/Lisbon',
  'Europe/Warsaw',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Sao_Paulo',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Australia/Perth',
  'UTC',
];
