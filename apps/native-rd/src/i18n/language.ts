import type { Locale } from "expo-localization";

export type SupportedLanguage = "en" | "pseudo" | "de";

/**
 * Resolves the initial i18next language from the device's ordered locale list.
 *
 * Two dev-only gates layer on top of the en default:
 * - Pseudo: `__DEV__` AND `EXPO_PUBLIC_I18N_PSEUDO=true` (length/encoding QA).
 * - German: `__DEV__` AND `EXPO_PUBLIC_I18N_DE=true` AND device locale `de*`.
 *
 * Production bundles cannot boot in pseudo or de regardless of env or device
 * locale. `de` is a prototype lane for #136 (Tolgee in-context editing); real
 * German shipping lives in #76.
 */
export function selectSupportedLanguage(
  locales: readonly Locale[],
): SupportedLanguage {
  if (__DEV__ && process.env.EXPO_PUBLIC_I18N_PSEUDO === "true") {
    return "pseudo";
  }
  const code = locales[0]?.languageCode ?? "en";
  if (__DEV__ && process.env.EXPO_PUBLIC_I18N_DE === "true" && code === "de") {
    return "de";
  }
  return code === "en" ? "en" : "en";
}
