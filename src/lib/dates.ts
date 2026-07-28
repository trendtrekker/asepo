/**
 * ISO ("YYYY-MM-DD") date-string helpers for the meal plan.
 *
 * Everything here builds and reads dates from *local* Y/M/D components, never
 * `toISOString()` / `new Date(iso)` — both of those round-trip through UTC,
 * which silently shifts the calendar day for anyone west of UTC (an evening
 * in US timezones can land on the next UTC day). For "which day is this
 * meal on," that's a real off-by-one bug, not a rounding curiosity.
 */

const pad = (n: number) => String(n).padStart(2, '0');

export function toIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayIso(): string {
  return toIso(new Date());
}

export function addDays(iso: string, n: number): string {
  const d = fromIso(iso);
  d.setDate(d.getDate() + n);
  return toIso(d);
}

/** Monday of the week containing this date — matches WEEK_DAYS' Mon..Sun order. */
export function startOfWeek(iso: string): string {
  const d = fromIso(iso);
  const mondayOffset = (d.getDay() + 6) % 7; // getDay(): Sun=0..Sat=6
  return addDays(iso, -mondayOffset);
}

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function weekdayShort(iso: string): string {
  return WEEKDAY_LABELS[fromIso(iso).getDay()];
}

/** e.g. "Jul 28 – Aug 3" — handles a month (or year) boundary mid-week. */
export function formatWeekRange(startIso: string): string {
  const start = fromIso(startIso);
  const end = fromIso(addDays(startIso, 6));
  const startLabel = `${MONTH_LABELS[start.getMonth()]} ${start.getDate()}`;
  const endLabel =
    start.getMonth() === end.getMonth()
      ? `${end.getDate()}`
      : `${MONTH_LABELS[end.getMonth()]} ${end.getDate()}`;
  return `${startLabel} – ${endLabel}`;
}

/** e.g. "Thu, Jul 31" — used for confirmation toasts. */
export function formatShortDate(iso: string): string {
  const d = fromIso(iso);
  return `${weekdayShort(iso)}, ${MONTH_LABELS[d.getMonth()]} ${d.getDate()}`;
}
