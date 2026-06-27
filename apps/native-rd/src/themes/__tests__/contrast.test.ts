/**
 * Automated contrast ratio verification for all theme variants
 * Ensures WCAG AA compliance across all 12 themes
 */

import { getContrastRatio, meetsWCAG } from "../../utils/accessibility";
import { lightColors, darkColors, narrativeModes } from "../adapter";
import { themes, themeNames } from "../compose";
import { contrastPairs, AA_NORMAL } from "../contrastPairs";

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

  // Any surface painted accentYellow (#ffe50c, identical in both modes) — the
  // FAB, StatusBadge active variant, the focus overview's active part cell —
  // must use the climb-narrative on-yellow foreground, NOT theme.colors.text.
  // colors.text flips to #fafafa in dark and gives ~1.1:1 white-on-yellow; the
  // overview spine cell regressed exactly this way (#360).
  test.each([
    ["light", lightColors.accentYellow, narrativeModes.light.climb.text],
    ["dark", darkColors.accentYellow, narrativeModes.dark.climb.text],
  ] as const)(
    "%s in-progress text on accentYellow meets WCAG AA",
    (_label, bg, fg) => {
      const result = meetsWCAG(fg, bg, "AA", "normal");
      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    },
  );

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

/**
 * Theme-wide contrast gate — the React Native port of the "Contrast audit" in
 * `prototypes/screen-redesign/Theme Eval.dc.html`. Loops every product theme
 * over the canonical fg/bg pairs in `contrastPairs.ts` (the same constant the
 * `ContrastAudit` Storybook story renders), asserting WCAG AA (4.5:1).
 *
 * KNOWN_FAILURES is a *shrinking* allowlist of cells that do not yet pass,
 * captured from a fresh design-tokens build on 2026-06-26. The issue-375 theme
 * cleanup turns these green one PR at a time. The gate enforces two invariants:
 *   1. Any pair × theme NOT listed must pass (≥4.5) — catches new regressions.
 *   2. Any listed entry must STILL fail — the moment a fix lands, its line must
 *      be deleted here in the same PR or this test goes red. That keeps the
 *      allowlist honest instead of letting fixed entries rot in place.
 *
 * Key format: `${themeName}:${pairKey}`.
 */
const KNOWN_FAILURES = new Set<string>([
  "light-dyslexia:primary", // 4.23 — #fafafa on #4e7d9e
  "light-dyslexia:destructive", // 4.26 — #333333 on #b5913a
  "light-dyslexia:highlight", // 4.42 — #ffffff on #4e7d9e
  "light-highContrast:destructive", // 4.31 — #ffffff on #cc5500
  "light-autismFriendly:destructive", // 3.02 — #333333 on #8a7a5a
  "light-autismFriendly:tabActive", // 3.94 — #ffffff on #8a7a9a
  "light-autismFriendly:tabIdle", // 3.21 — #333333 on #8a7a9a
]);

describe("Theme contrast audit (all themes × canonical pairs)", () => {
  const cases = themeNames.flatMap((name) =>
    contrastPairs.map((pair) => [name, pair.key, pair] as const),
  );

  test.each(cases)("%s · %s meets WCAG AA", (name, _key, pair) => {
    const { fg, bg } = pair.getColors(themes[name]);
    const ratio = getContrastRatio(fg, bg);
    const failKey = `${name}:${pair.key}`;

    if (KNOWN_FAILURES.has(failKey)) {
      // Ratchet: if this now passes, delete the entry from KNOWN_FAILURES.
      expect(ratio).toBeLessThan(AA_NORMAL);
    } else {
      expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);
    }
  });

  test("KNOWN_FAILURES contains no stale (unknown) keys", () => {
    const valid = new Set(
      themeNames.flatMap((name) =>
        contrastPairs.map((pair) => `${name}:${pair.key}`),
      ),
    );
    const stale = [...KNOWN_FAILURES].filter((k) => !valid.has(k));
    expect(stale).toEqual([]);
  });
});
