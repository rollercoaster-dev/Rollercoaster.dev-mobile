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
});
