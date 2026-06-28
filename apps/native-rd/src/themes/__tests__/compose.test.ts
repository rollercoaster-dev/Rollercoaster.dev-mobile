import { themeNames, themes, composeTheme } from "../compose";

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

  it("composes per-theme elevation from design tokens", () => {
    for (const name of [
      "light-highContrast",
      "light-autismFriendly",
      "light-lowVision",
    ] as const) {
      expect(themes[name].shadow.cardElevation.opacity).toBe(0);
      expect(themes[name].shadow.cardElevationSmall.opacity).toBe(0);
      expect(themes[name].shadow.modalElevation.opacity).toBe(0);
    }

    expect(themes["dark-default"].shadow.cardElevation).toEqual(
      themes["dark-default"].shadow.lg,
    );
    expect(themes["dark-default"].shadow.modalElevation).toEqual(
      themes["dark-default"].shadow.lg,
    );
  });
});
