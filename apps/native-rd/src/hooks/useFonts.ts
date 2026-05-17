/**
 * Fonts hook
 *
 * Fonts are bundled as native resources via the `expo-font` config plugin in
 * `app.json` (see the `fonts` array). On iOS they're added to UIAppFonts; on
 * Android they live in `assets/fonts/` and are matched by React Native's
 * ReactFontManager via the `<family>(_bold|_italic|_bold_italic)?.ttf` filename
 * convention. No runtime registration is needed — this hook just reports
 * ready so the splash-screen gate in App.tsx has a single place to plug into.
 */
export function useFonts() {
  return { fontsLoaded: true, fontError: null, isReady: true };
}
