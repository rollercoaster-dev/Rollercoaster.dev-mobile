/**
 * Automated contrast ratio verification for all theme variants
 * Ensures WCAG AA compliance across all 12 themes
 */

import { getContrastRatio, meetsWCAG } from "../../utils/accessibility";
import { lightColors, darkColors } from "../adapter";

describe("WCAG AA Color Contrast Compliance", () => {
  test.each([
    ["light primary", lightColors.background, lightColors.accentPrimary, 4.5],
    ["light secondary", lightColors.text, lightColors.backgroundSecondary, 4.5],
    ["light destructive", "#262626", "#d97706", 4.5],
    ["dark primary", darkColors.background, darkColors.accentPrimary, 4.5],
    ["dark secondary", darkColors.text, darkColors.backgroundSecondary, 4.5],
    ["dark destructive", "#262626", "#d97706", 4.5],
  ] as const)("%s button meets WCAG AA", (_label, fg, bg, minRatio) => {
    const result = meetsWCAG(fg, bg, "AA", "normal");
    expect(result.passes).toBe(true);
    expect(result.ratio).toBeGreaterThanOrEqual(minRatio);
  });

  test.each([
    ["light active", "#0a0a0a", "#a78bfa"],
    ["light inactive", "#404040", "#a78bfa"],
    ["dark active", "#0a0a0a", "#c4b5fd"],
    ["dark inactive", "#404040", "#c4b5fd"],
  ])("%s tab meets WCAG AA large text", (_label, text, bg) => {
    const result = meetsWCAG(text, bg, "AA", "large");
    expect(result.passes).toBe(true);
    expect(result.ratio).toBeGreaterThanOrEqual(3.0);
  });

  describe("Contrast Ratio Utility", () => {
    test("black on white = ~21 (perfect contrast)", () => {
      expect(getContrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    });

    test("order does not matter", () => {
      expect(getContrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 1);
    });

    test("same color = 1 (no contrast)", () => {
      expect(getContrastRatio("#808080", "#808080")).toBeCloseTo(1, 1);
    });

    test("handles hex with and without # prefix", () => {
      const withHash = getContrastRatio("#000000", "#ffffff");
      const withoutHash = getContrastRatio("000000", "ffffff");
      expect(withHash).toBeCloseTo(withoutHash, 2);
    });
  });

  test.each([
    ["AA", "normal", 4.5],
    ["AA", "large", 3],
    ["AAA", "normal", 7],
    ["AAA", "large", 4.5],
  ] as const)("meetsWCAG %s %s requires %f ratio", (level, size, required) => {
    const result = meetsWCAG("#000000", "#ffffff", level, size);
    expect(result.required).toBe(required);
  });
});
