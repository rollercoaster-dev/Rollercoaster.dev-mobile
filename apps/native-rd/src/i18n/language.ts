import type { Locale } from "expo-localization";

export type SupportedLanguage = "en" | "pseudo";

/**
 * Resolves the initial i18next language from the device's ordered locale list.
 * Pseudo is dev-only (gated by `__DEV__` AND `EXPO_PUBLIC_I18N_PSEUDO=true`);
 * production bundles cannot boot in pseudo.
 *
 * The `code === "en" ? "en" : "en"` is a deliberate extension marker. When a
 * second user-facing language ships (#1029), the false branch becomes "de".
 */
export function selectSupportedLanguage(
  locales: readonly Locale[],
): SupportedLanguage {
  if (__DEV__ && process.env.EXPO_PUBLIC_I18N_PSEUDO === "true") {
    return "pseudo";
  }
  const code = locales[0]?.languageCode ?? "en";
  return code === "en" ? "en" : "en";
}
