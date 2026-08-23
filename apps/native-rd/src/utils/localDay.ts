/**
 * Pure **local**-calendar day helpers, plus the bridge between a plain
 * `YYYY-MM-DD` day and Evolu's branded `DateIso` timestamp.
 *
 * Lived under `StepDayGrid` while the grid was the only consumer (#574); moved
 * here for #576, where a screen has to convert the grid's day strings into
 * `DateIso` before writing them — and a screen must not import date maths from
 * a component directory.
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
import { dateToDateIso, err } from "@evolu/common";
import type { DateIso, DateIsoError, Result } from "@evolu/common";

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

/** `YYYY-MM-DD`, zero-padded — the only shape the day helpers here emit. */
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A grid day (`YYYY-MM-DD`) as a branded `DateIso` at **local** midnight.
 *
 * A due date is a *day*; `DateIso` is a timestamp — so the day has to be
 * anchored to some instant, and local midnight is the one that reads back as
 * the same day the user tapped (`Date.parse("2026-06-24")` is UTC midnight,
 * which formats as the 23rd for anyone west of Greenwich).
 *
 * Returns a `Result` rather than throwing: the caller already unwraps
 * `dateToDateIso` the same way for `completedAt` (`db/queries.ts`), and a
 * malformed key is a caller bug worth surfacing, not a silent `null` write.
 * A key that is not `YYYY-MM-DD` yields the same `DateIso` type error an
 * out-of-range date would, so callers have one failure branch, not two.
 */
export function localDayKeyToDateIso(
  key: string,
): Result<DateIso, DateIsoError> {
  if (!DAY_KEY.test(key)) {
    // Hand-built rather than routed through `dateToDateIso(new Date(NaN))`:
    // that call throws (`toISOString()` on an invalid Date is a RangeError)
    // instead of returning the Err a `Result`-returning function promises.
    return err({ type: "DateIso", value: key });
  }
  return dateToDateIso(
    localDate(
      Number(key.slice(0, 4)),
      Number(key.slice(5, 7)) - 1,
      Number(key.slice(8, 10)),
    ),
  );
}

/**
 * The local calendar day a stored `DateIso` falls on, as `YYYY-MM-DD`.
 *
 * Safe to parse with `new Date(...)` here: a `DateIso` is a full timestamp
 * (`2026-06-24T00:00:00.000Z`), not a date-only string, so there is no
 * UTC-midnight trap to fall into — the value names an instant and this reads
 * the local day containing it. Returns `null` for an unparseable value rather
 * than `"NaN-NaN-NaN"`, so a corrupt row degrades to "no day set".
 */
export function dateIsoToLocalDayKey(iso: string): string | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : toDayKey(date);
}
