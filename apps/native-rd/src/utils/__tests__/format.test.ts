import { formatDate, formatDuration } from "../format";

describe("formatDate", () => {
  // Fixed local-time noon (no trailing `Z`) so the assertions depend on neither
  // the runner's clock nor its timezone — a UTC instant could roll to Jan 29 in
  // far-eastern zones (e.g. UTC+14) and break the `/28/` check.
  const ISO = "2026-01-28T12:00:00";

  it("defaults to en-US short date", () => {
    expect(formatDate(ISO)).toBe("Jan 28, 2026");
  });

  it("localises month and ordering for the given BCP-47 tag", () => {
    const de = formatDate(ISO, "de");
    // German short date puts the day first and abbreviates the month
    // differently — the exact ICU string can vary, so assert the shape that
    // proves localisation happened rather than the en-US output.
    expect(de).not.toBe(formatDate(ISO, "en-US"));
    expect(de).toMatch(/28/);
    expect(de).toMatch(/2026/);
  });

  it("returns empty string for null/undefined", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate(undefined)).toBe("");
  });

  it("returns the raw string when parsing fails", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });

  it("falls back to the default locale for a malformed BCP-47 tag", () => {
    // "en_US" (underscore) is invalid and makes Intl throw RangeError; the
    // result should match the en-US output rather than propagate the throw.
    expect(formatDate(ISO, "en_US")).toBe(formatDate(ISO, "en-US"));
  });
});

describe("formatDuration", () => {
  it("formats milliseconds as zero-padded MM:SS", () => {
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(5_000)).toBe("00:05");
    expect(formatDuration(65_000)).toBe("01:05");
    expect(formatDuration(600_000)).toBe("10:00");
  });
});
