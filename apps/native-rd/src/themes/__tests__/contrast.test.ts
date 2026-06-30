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
 * KNOWN_FAILURES is an optional ratchet for staged contrast fixes. It should
 * usually stay empty; only add a cell when intentionally landing the gate before
 * its paired token recipe. The gate enforces two invariants:
 *   1. Any pair × theme NOT listed must pass (≥4.5) — catches new regressions.
 *   2. Any listed entry must STILL fail — the moment a fix lands, its line must
 *      be deleted here in the same PR or this test goes red. That keeps the
 *      allowlist honest instead of letting fixed entries rot in place.
 *
 * Key format: `${themeName}:${pairKey}`.
 */
const KNOWN_FAILURES = new Set<string>([
  // TODO(#406-follow-up): upstream token fix needed in packages/design-tokens.
  // The journey-step active/complete bg tokens for these ND variants land
  // 3.8–4.5:1 against their (inherited light) foreground — sub-AA but well
  // above the 3:1 hard floor, same class as the success/warning/info cells in
  // "Theme Refactor Prep Spec.md" §1. The real fix is darkening the bg (or
  // flipping the fg) in packages/design-tokens/src/themes/*.json, which is
  // #375/#376-class work, not #406. Listed here so the gate still guards
  // against further regressions without blocking the journey wiring.
  "light-dyslexia:journeyStepActive", // 4.23:1
  "light-dyslexia:journeyStepComplete", // 3.94:1
  "light-autismFriendly:journeyStepComplete", // 3.81:1
  "light-highContrast:journeyStepComplete", // 4.46:1
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

/**
 * Sub-step indentation rail — the only net-new colour relationship introduced
 * by the substructure grammar (#291 `StepList.styles.ts` `leftRail`): a vertical
 * divider painted in `colors.border` over `colors.background`.
 *
 * It is `accessibilityElementsHidden` decoration, so the 4.5:1 TEXT gate above
 * does not apply. As a structural graphical object it is held to the WCAG 1.4.11
 * NON-TEXT floor (3:1) — the same "3:1 hard floor" the KNOWN_FAILURES note
 * references — so the parent→child indentation stays perceivable in every ND
 * variant (the rail reinforces position-based indentation; colour is never the
 * sole channel — D11). The substructure's text/glyphs reuse already-gated pairs:
 * sub-step titles → `body`/`muted`, timeline sub-step node glyphs → `journey*`.
 */
describe("Sub-step indentation rail meets non-text contrast (#294)", () => {
  const NON_TEXT_MIN = 3.0;

  // Reduced-visual-noise variants intentionally soften the border token below
  // the 3:1 floor: autismFriendly desaturates, lowInfo strips complexity, and
  // dyslexia sits on a cream field. The rail is pure decoration there — the
  // parent→child relationship is carried by indentation position, never colour
  // alone (D11) — so a soft rail loses no information. Everywhere else the rail
  // is a load-bearing divider and must clear the 3:1 non-text floor. If a token
  // change pushes one of these above 3:1, drop it from this set.
  const INTENTIONALLY_SOFT_RAIL = new Set<string>([
    "light-dyslexia",
    "light-autismFriendly",
    "light-lowInfo",
  ]);

  test.each(themeNames)("%s · sub-step rail (border on background)", (name) => {
    const theme = themes[name];
    const ratio = getContrastRatio(
      theme.colors.border,
      theme.colors.background,
    );
    if (INTENTIONALLY_SOFT_RAIL.has(name)) {
      // Decorative-only here; just guard that the rail is still a distinct
      // colour from the surface (never literally invisible).
      expect(ratio).toBeGreaterThan(1);
    } else {
      expect(ratio).toBeGreaterThanOrEqual(NON_TEXT_MIN);
    }
  });
});
