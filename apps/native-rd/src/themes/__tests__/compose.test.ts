import { themeNames, themes, composeTheme } from "../compose";
import { variantOverrides } from "../variants";

describe("theme registry", () => {
  it("registers only the seven product themes exposed by the app", () => {
    expect(themeNames).toEqual([
      "light-default",
      "dark-default",
      "light-highContrast",
      "light-dyslexia",
      "light-autismFriendly",
      "light-lowVision",
      "light-lowInfo",
    ]);
    expect(Object.keys(themes)).toEqual(themeNames);
  });

  it("still supports composing unsupported combinations for previews", () => {
    const theme = composeTheme("dark", "dyslexia");
    expect(theme.variant).toBe("dyslexia");
  });

  it("exposes redesign chrome tokens for every product theme", () => {
    for (const name of themeNames) {
      const theme = themes[name];
      expect(theme.chrome.screenHeaderBg).toBeTruthy();
      expect(theme.chrome.screenHeaderFg).toBeTruthy();
      expect(theme.chrome.screenHeaderBorder).toBeTruthy();
      expect(theme.chrome.brandAccentBg).toBeTruthy();
      expect(theme.chrome.brandAccentFg).toBeTruthy();
      expect(theme.chrome.brandAccentBorder).toBeTruthy();
      expect(theme.chrome.brandAccentBg).not.toBe(
        theme.colors.backgroundTertiary,
      );
    }
  });

  it("exposes journey tokens for every product theme", () => {
    // #406 wired the journey-* group through adapter/compose/variants so the
    // step-state color map can read theme.journey.*. Assert it resolves for
    // every product theme, and that the highContrast variant override lands.
    for (const name of themeNames) {
      const theme = themes[name];
      expect(theme.journey.journeyStepBg).toBeTruthy();
      expect(theme.journey.journeyStepActiveBg).toBeTruthy();
      expect(theme.journey.journeyStepCompleteBg).toBeTruthy();
      expect(theme.journey.journeyGoalBg).toBeTruthy();
    }
    // highContrast overrides the active node to pure black (journeyVariants).
    expect(themes["light-highContrast"].journey.journeyStepActiveBg).toBe(
      "#000000",
    );
  });

  it("maps semantic elevation roles to each theme's hard* shadow tokens", () => {
    // withSemanticShadows wires cardElevation←hardMd, cardElevationSmall←hardSm,
    // modalElevation←hardLg for every theme. Pin the mapping the whole shadow
    // commit rests on so a role can't silently drift.
    for (const name of themeNames) {
      const { shadow } = themes[name];
      expect(shadow.cardElevation).toEqual(shadow.hardMd);
      expect(shadow.cardElevationSmall).toEqual(shadow.hardSm);
      expect(shadow.modalElevation).toEqual(shadow.hardLg);
    }
  });

  it("composes per-theme elevation from design tokens", () => {
    // Shadow-off accessibility themes (Bold Ink / Still Water / Loud & Clear)
    // author hard* = none, so every elevation role renders at zero opacity.
    for (const name of [
      "light-highContrast",
      "light-autismFriendly",
      "light-lowVision",
    ] as const) {
      expect(themes[name].shadow.cardElevation.opacity).toBe(0);
      expect(themes[name].shadow.cardElevationSmall.opacity).toBe(0);
      expect(themes[name].shadow.modalElevation.opacity).toBe(0);
    }

    // Themes that deliberately KEEP elevation (recorded discovery from the #376
    // plan): Full Ride is the base hard shadow, Clean Signal retains the full
    // hard offset, Warm Studio keeps a soft shadow.
    expect(themes["light-default"].shadow.cardElevation.opacity).toBe(0.8);
    expect(themes["light-lowInfo"].shadow.cardElevation.opacity).toBe(0.8);
    expect(themes["light-dyslexia"].shadow.cardElevation.opacity).toBeCloseTo(
      0.1,
    );

    // Night Ride uses its authored lg cutout for every elevation role.
    const darkLg = themes["dark-default"].shadow.lg;
    expect(themes["dark-default"].shadow.cardElevation).toEqual(darkLg);
    expect(themes["dark-default"].shadow.cardElevationSmall).toEqual(darkLg);
    expect(themes["dark-default"].shadow.modalElevation).toEqual(darkLg);
  });

  it("provides a shadow override for every variant that opts into one", () => {
    // Guards build-unistyles.js's `if (differs)` emit: a variant whose authored
    // shadows ever equalled base would be dropped from the generated
    // shadowVariants, leaving variantOverrides[v].shadow undefined and silently
    // falling back to base. Assert the expected overrides resolve.
    const variantsWithShadow = [
      "highContrast",
      "dyslexia",
      "lowVision",
      "autismFriendly",
      "lowInfo",
    ] as const;
    for (const variant of variantsWithShadow) {
      expect(variantOverrides[variant].shadow).toBeDefined();
      expect(variantOverrides[variant].shadow?.cardElevation).toBeDefined();
    }
  });
});
