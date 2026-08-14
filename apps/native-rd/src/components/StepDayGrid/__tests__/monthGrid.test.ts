import {
  dayKey,
  daysInMonth,
  groupMarksByDay,
  isPastDay,
  leadingBlanks,
  localDate,
  shiftMonth,
  toDayKey,
} from "../monthGrid";

// The prototype's pinned instant — Wed 24 June 2026.
const NOW_KEY = "2026-06-24";

describe("dayKey / toDayKey", () => {
  it("zero-pads month and day and 1-indexes the month", () => {
    expect(dayKey(2026, 0, 5)).toBe("2026-01-05");
    expect(dayKey(2026, 11, 31)).toBe("2026-12-31");
  });

  it("reads the local calendar day off a Date, not the UTC one", () => {
    // Constructed local-midnight; a UTC-based reading would shift the day for
    // anyone west of UTC.
    expect(toDayKey(new Date(2026, 5, 24))).toBe("2026-06-24");
    // Late-evening local time must still report the same day.
    expect(toDayKey(new Date(2026, 5, 24, 23, 30))).toBe("2026-06-24");
  });
});

describe("localDate", () => {
  it("takes a year literally — 0–99 is not 1900–1999", () => {
    // `new Date(50, 0, 1)` is 1950. Month navigation is unbounded, so a
    // two-digit year is reachable and must stay itself.
    expect(localDate(50, 0, 1).getFullYear()).toBe(50);
    expect(localDate(99, 11, 31).getFullYear()).toBe(99);
  });

  it("is local midnight, not UTC", () => {
    const date = localDate(2026, 5, 24);
    expect(toDayKey(date)).toBe("2026-06-24");
    expect(date.getHours()).toBe(0);
    expect(date.getMinutes()).toBe(0);
  });

  it("rolls an out-of-range month or day over, as Date does", () => {
    expect(toDayKey(localDate(2026, 12, 1))).toBe("2027-01-01");
    expect(toDayKey(localDate(2026, -1, 1))).toBe("2025-12-01");
    // Day 0 is the last day of the previous month — what daysInMonth relies on.
    expect(toDayKey(localDate(2026, 6, 0))).toBe("2026-06-30");
  });
});

describe("leadingBlanks (Monday-first)", () => {
  test.each([
    // [year, month (0-indexed), weekday of the 1st, expected blanks]
    [2026, 10, "Sunday", 6], // Nov 2026 starts on a Sunday — the max
    [2026, 5, "Monday", 0], // Jun 2026 starts on a Monday — the min
    [2026, 8, "Tuesday", 1], // Sep 2026
    [2026, 6, "Wednesday", 2], // Jul 2026
    [2027, 3, "Thursday", 3], // Apr 2027
    [2026, 4, "Friday", 4], // May 2026
    [2026, 7, "Saturday", 5], // Aug 2026
  ])("%i-%i (1st is a %s) → %i blanks", (year, month, _weekday, expected) => {
    expect(leadingBlanks(year, month)).toBe(expected);
  });
});

describe("daysInMonth", () => {
  test.each([
    [2026, 1, 28], // Feb 2026 — common year
    [2028, 1, 29], // Feb 2028 — leap year
    [2026, 3, 30], // Apr
    [2026, 6, 31], // Jul
  ])("%i-%i → %i days", (year, month, expected) => {
    expect(daysInMonth(year, month)).toBe(expected);
  });
});

describe("shiftMonth", () => {
  it("wraps December → January, carrying the year", () => {
    expect(shiftMonth({ year: 2026, month: 11 }, 1)).toEqual({
      year: 2027,
      month: 0,
    });
  });

  it("wraps January → December, carrying the year back", () => {
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({
      year: 2025,
      month: 11,
    });
  });

  it("keeps a two-digit year in its own century", () => {
    expect(shiftMonth({ year: 99, month: 0 }, -1)).toEqual({
      year: 98,
      month: 11,
    });
  });

  it("is unbounded — twelve steps forward is the same month a year on", () => {
    let month = { year: 2026, month: 5 };
    for (let i = 0; i < 12; i += 1) month = shiftMonth(month, 1);
    expect(month).toEqual({ year: 2027, month: 5 });
  });
});

describe("isPastDay", () => {
  test.each([
    ["2026-06-23", true, "the day before now"],
    ["2026-06-24", false, "now itself — strict <, so today is not past"],
    ["2026-06-25", false, "the day after now"],
    ["2025-12-31", true, "a previous year"],
    ["2027-01-01", false, "a later year"],
  ])("%s → %s (%s)", (key, expected) => {
    expect(isPastDay(key, NOW_KEY)).toBe(expected);
  });
});

describe("groupMarksByDay", () => {
  it("groups labels by day, preserving input order", () => {
    expect(
      groupMarksByDay([
        { date: "2026-06-30", label: "3" },
        { date: "2026-06-26", label: "2" },
        { date: "2026-06-30", label: "a" },
        { date: "2026-06-30", label: "b" },
      ]),
    ).toEqual({
      "2026-06-30": ["3", "a", "b"],
      "2026-06-26": ["2"],
    });
  });

  it("returns an empty map for no marks", () => {
    expect(groupMarksByDay([])).toEqual({});
  });
});
