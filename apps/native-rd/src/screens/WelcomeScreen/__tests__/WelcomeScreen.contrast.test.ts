/**
 * Welcome hero and footer text contrast in every product theme (#758).
 *
 * Styles resolve against light-default by default, where the hero's old ink
 * (accentPurpleFg) and the band's ink (screenHeaderFg) are the same colour. So
 * this resolves WelcomeScreen.styles once per theme and measures each text
 * colour against the surface it is painted on.
 */
import { getContrastRatio } from "../../../utils/accessibility";
import { themes, themeNames, type ThemeName } from "../../../themes/compose";
import { AA_NORMAL } from "../../../themes/contrastPairs";

type WelcomeStyles = typeof import("../WelcomeScreen.styles").styles;

function stylesFor(name: ThemeName): WelcomeStyles {
  let styles!: WelcomeStyles;
  // Same pattern as typography-preferences.test.tsx: point the mock's
  // initial theme at the theme under test, then load the styles fresh.
  jest.isolateModules(() => {
    const { StyleSheet } =
      require("react-native-unistyles") as typeof import("react-native-unistyles");
    StyleSheet.configure({
      themes: { ...themes, "light-default": themes[name] },
    });
    styles = (require("../WelcomeScreen.styles") as { styles: WelcomeStyles })
      .styles;
  });
  return styles;
}

describe("Welcome text contrast (#758)", () => {
  test.each(themeNames)("%s · hero text on the header band", (name) => {
    const s = stylesFor(name);
    const bandBg = themes[name].chrome.screenHeaderBg;
    expect(
      getContrastRatio(s.heroGreeting.color, bandBg),
    ).toBeGreaterThanOrEqual(AA_NORMAL);
    expect(getContrastRatio(s.heroTitle.color, bandBg)).toBeGreaterThanOrEqual(
      AA_NORMAL,
    );
  });

  test.each(themeNames)("%s · footnote on the footer band", (name) => {
    const s = stylesFor(name);
    expect(
      getContrastRatio(s.footnote.color, s.footer.backgroundColor),
    ).toBeGreaterThanOrEqual(AA_NORMAL);
  });
});
