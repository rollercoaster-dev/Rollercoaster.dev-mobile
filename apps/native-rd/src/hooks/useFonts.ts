import { useFonts as useExpoFonts } from "expo-font";

/**
 * Custom font loading hook
 *
 * Loads custom fonts for accessibility themes:
 * - OpenDyslexic for dyslexia theme
 * - Atkinson Hyperlegible for low vision theme
 *
 * Returns loading state for splash screen handling.
 */
export function useFonts() {
  const [fontsLoaded, fontError] = useExpoFonts({
    OpenDyslexic: require("../../assets/fonts/OpenDyslexic-Regular.otf"),
    "OpenDyslexic-Bold": require("../../assets/fonts/OpenDyslexic-Bold.otf"),
    AtkinsonHyperlegible: require("../../assets/fonts/AtkinsonHyperlegible-Regular.ttf"),
    "AtkinsonHyperlegible-Bold": require("../../assets/fonts/AtkinsonHyperlegible-Bold.ttf"),
  });

  // Log font loading errors but don't block rendering
  if (fontError) {
    console.warn("Font loading error:", fontError);
  }

  return {
    fontsLoaded,
    fontError,
    isReady: fontsLoaded || !!fontError,
  };
}
