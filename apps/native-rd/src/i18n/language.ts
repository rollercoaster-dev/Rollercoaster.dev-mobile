import type { Locale } from "expo-localization";

export type SupportedLanguage = "en" | "de" | "pseudo";

/**
 * Resolves the initial i18next language from the device's ordered locale list.
 * Pseudo is dev-only (gated by `__DEV__` AND `EXPO_PUBLIC_I18N_PSEUDO=true`);
 * production bundles cannot boot in pseudo.
 */
export function selectSupportedLanguage(
  locales: readonly Locale[],
): SupportedLanguage {
  if (__DEV__ && process.env.EXPO_PUBLIC_I18N_PSEUDO === "true") {
    return "pseudo";
  }
  const code = locales[0]?.languageCode ?? "en";
  if (code === "de") return "de";
  return "en";
}
