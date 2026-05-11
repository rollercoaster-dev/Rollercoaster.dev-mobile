/**
 * iOS falls back from DM Mono to a proportional font; ratios below 0.8 leave
 * path-text arcs shorter than the rendered glyphs, so TextPath drops chars
 * off both ends symmetrically on device while passing in simulator.
 */
const AVG_CHAR_WIDTH_RATIO = 0.8;

export function measureTextWidth(text: string, fontSize: number): number {
  if (typeof text !== "string" || !Number.isFinite(fontSize) || fontSize <= 0) {
    return 0;
  }
  return text.length * fontSize * AVG_CHAR_WIDTH_RATIO;
}
