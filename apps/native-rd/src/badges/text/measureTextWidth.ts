/**
 * Char-width factor of 0.7em — empirically iOS falls back from "DM Mono" to
 * a non-monospace font, and 0.6em was too tight: text like "AWESOME" got
 * truncated because the arc was shorter than the rendered glyphs needed.
 */
const AVG_CHAR_WIDTH_RATIO = 0.7;

export function measureTextWidth(text: string, fontSize: number): number {
  if (typeof text !== "string" || !Number.isFinite(fontSize) || fontSize <= 0) {
    return 0;
  }
  return text.length * fontSize * AVG_CHAR_WIDTH_RATIO;
}
