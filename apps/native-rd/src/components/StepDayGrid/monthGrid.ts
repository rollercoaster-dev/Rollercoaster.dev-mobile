/**
 * Pure date helpers behind `StepDayGrid` (#574).
 *
 * Every function here works on **local** calendar days and plain
 * `YYYY-MM-DD` strings. Nothing parses an ISO string with `new Date(str)` and
 * nothing touches UTC: `Date.parse("2026-06-24")` is UTC midnight, so comparing
 * it against a local `now` flips sign for anyone east of UTC on the boundary
 * day. The grid is day-granular, so the comparison is day-granular too —
 * zero-padded `YYYY-MM-DD` sorts lexicographically in true chronological order.
 *
 * The month-shape maths is ported verbatim from the Direction D prototype
 * (`prototypes/screen-redesign/Set BC D Prototype.html`).
 */

/** A month the grid can display. `month` is 0-indexed, as `Date` has it. */
export interface GridMonth {
  year: number;
  month: number;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Build a `YYYY-MM-DD` key from local calendar parts (`month` 0-indexed). */
export function dayKey(year: number, month: number, day: number): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

/** The local calendar day a `Date` falls on, as `YYYY-MM-DD`. */
export function toDayKey(date: Date): string {
  return dayKey(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Local midnight on a calendar day (`month` 0-indexed, both `month` and `day`
 * may be out of range and roll over as `Date` does).
 *
 * Never `new Date(year, month, day)`: that constructor maps years 0–99 to
 * 1900–1999, so navigation into a two-digit year would silently jump nineteen
 * centuries — and month navigation here is unbounded, so that year is
 * reachable. `setFullYear` takes the year literally.
 */
export function localDate(year: number, month: number, day = 1): Date {
  const date = new Date(0);
  date.setFullYear(year, month, day);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Blank cells before the 1st in a **Monday-first** week.
 * `getDay()` is Sunday-0, so `(d + 6) % 7` rotates Monday to 0 — a month whose
 * 1st is a Sunday yields 6, a Monday-1st month yields 0.
 */
export function leadingBlanks(year: number, month: number): number {
  return (localDate(year, month, 1).getDay() + 6) % 7;
}

/** Day count in a month. Day 0 of the next month is the last of this one. */
export function daysInMonth(year: number, month: number): number {
  return localDate(year, month + 1, 0).getDate();
}

/** Step the displayed month by `delta`. Unbounded — wraps the year both ways. */
export function shiftMonth(current: GridMonth, delta: number): GridMonth {
  const next = localDate(current.year, current.month + delta, 1);
  return { year: next.getFullYear(), month: next.getMonth() };
}

/**
 * Strictly before today. Equal to today is **not** past — the same strict `<`
 * `waitingOnExpectedIsPast` uses (#571), and the prototype's `key < TODAY_ISO`.
 *
 * A past day only ever reads *quieter*. It is never disabled and never refused:
 * the `was expected` reading from #571 and an ordinary "I meant last Tuesday"
 * both depend on past days staying selectable (#574).
 */
export function isPastDay(key: string, nowKey: string): boolean {
  return key < nowKey;
}

/** Group mark labels by day, preserving input order within each day. */
export function groupMarksByDay(
  marks: readonly { date: string; label: string }[],
): Record<string, string[]> {
  const byDay: Record<string, string[]> = {};
  for (const mark of marks) {
    (byDay[mark.date] ??= []).push(mark.label);
  }
  return byDay;
}
