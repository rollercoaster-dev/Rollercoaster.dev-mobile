/**
 * Format a date string as a human-readable short date (e.g. "Jan 28, 2026"
 * for `en`, "28. Jan. 2026" for `de`).
 *
 * `locale` is a BCP-47 tag — pass `i18n.language` from the calling component so
 * the date matches the active UI language. Hermes ships `Intl.DateTimeFormat`
 * with locale data on-device (verified in the #66 spike), so non-English tags
 * localise rather than silently falling back. Defaults to `en-US` for callers
 * outside the React tree.
 *
 * Returns empty string for null/undefined, returns the raw string if parsing
 * fails. A malformed `locale` tag (which makes `Intl` throw `RangeError`) falls
 * back to the default locale rather than crashing the caller.
 */
export function formatDate(
  dateStr: string | null | undefined,
  locale: string = "en-US",
): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  try {
    return d.toLocaleDateString(locale, options);
  } catch (e) {
    // Intl throws RangeError on a malformed BCP-47 tag — fall back to the
    // default locale so a bad caller-supplied tag never crashes the UI.
    if (e instanceof RangeError) return d.toLocaleDateString("en-US", options);
    throw e;
  }
}

/**
 * Convert a zero-based index to a lowercase letter ordinal: 0→"a", 25→"z",
 * 26→"aa", 27→"ab", … (bijective base-26, like spreadsheet column names).
 *
 * Used for sub-step labels on the timeline sub-spine (#293). Sub-step count
 * isn't constrained at the data layer, so a naive `String.fromCharCode(97+i)`
 * would emit non-letter glyphs past index 25 (e.g. 26→`{`); this wraps to
 * multi-letter ordinals instead. Negative or non-integer indices clamp to 0.
 */
export function toLetterOrdinal(index: number): string {
  let n = Math.max(0, Math.floor(index));
  let result = "";
  do {
    result = String.fromCharCode(97 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return result;
}

/**
 * Format milliseconds as MM:SS string.
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}
