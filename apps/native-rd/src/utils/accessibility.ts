/**
 * Accessibility utilities for WCAG compliance
 */

export type WCAGLevel = "AA" | "AAA";
export type TextSize = "normal" | "large";

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate relative luminance of a color
 * Formula from WCAG 2.0: https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
function getRelativeLuminance(r: number, g: number, b: number): number {
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  const R =
    rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const G =
    gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const B =
    bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Calculate contrast ratio between two colors
 * Formula from WCAG 2.0: https://www.w3.org/TR/WCAG20/#contrast-ratiodef
 *
 * @param foreground - Hex color string (e.g., '#000000')
 * @param background - Hex color string (e.g., '#FFFFFF')
 * @returns Contrast ratio (1-21)
 */
export function getContrastRatio(
  foreground: string,
  background: string,
): number {
  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);

  if (!fg || !bg) {
    throw new Error("Invalid hex color format");
  }

  const fgLuminance = getRelativeLuminance(fg.r, fg.g, fg.b);
  const bgLuminance = getRelativeLuminance(bg.r, bg.g, bg.b);

  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color combination meets WCAG requirements
 *
 * @param foreground - Hex color string
 * @param background - Hex color string
 * @param level - WCAG level ('AA' or 'AAA')
 * @param textSize - Text size ('normal' or 'large')
 * @returns Object with pass/fail status and contrast ratio
 */
export function meetsWCAG(
  foreground: string,
  background: string,
  level: WCAGLevel = "AA",
  textSize: TextSize = "normal",
): { passes: boolean; ratio: number; required: number } {
  const ratio = getContrastRatio(foreground, background);

  // WCAG requirements:
  // AA Normal: 4.5:1, AA Large: 3:1
  // AAA Normal: 7:1, AAA Large: 4.5:1
  const requirements = {
    AA: { normal: 4.5, large: 3 },
    AAA: { normal: 7, large: 4.5 },
  };

  const required = requirements[level][textSize];

  return {
    passes: ratio >= required,
    ratio: Math.round(ratio * 100) / 100,
    required,
  };
}

/**
 * Get recommended text color (black or white) for a given background
 *
 * @param background - Hex color string
 * @returns '#000000' or '#FFFFFF'
 */
export function getRecommendedTextColor(
  background: string,
): "#000000" | "#FFFFFF" {
  const whiteContrast = getContrastRatio("#FFFFFF", background);
  const blackContrast = getContrastRatio("#000000", background);

  return whiteContrast > blackContrast ? "#FFFFFF" : "#000000";
}

/**
 * Safe wrapper around getRecommendedTextColor with fallback.
 * Use this in rendering code where a thrown error would break the UI.
 * Warns once per caller/background pair to avoid log spam in render loops.
 */
const warnedSafeTextColorKeys = new Set<string>();

export function getSafeTextColor(
  background: string,
  caller?: string,
): "#000000" | "#FFFFFF" {
  try {
    return getRecommendedTextColor(background);
  } catch (error) {
    const tag = caller ?? "getSafeTextColor";
    const warnKey = `${tag}:${background}`;
    if (!warnedSafeTextColorKeys.has(warnKey)) {
      warnedSafeTextColorKeys.add(warnKey);
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `[${tag}] contrast calculation failed for "${background}": ${message}. Falling back to #FFFFFF.`,
      );
    }
    return "#FFFFFF";
  }
}
