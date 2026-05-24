import type { Locale } from "expo-localization";

import { enUS } from "../../__tests__/mocks/expo-localization";
import { selectSupportedLanguage } from "../language";

// RN's jest setup sets __DEV__ as a runtime global; TS doesn't see it here.
const devGlobal = global as unknown as { __DEV__: boolean };

const withLanguageCode = (code: string | null): Locale => ({
  ...enUS,
  languageCode: code,
  languageTag: code ? `${code}-XX` : "und",
});

describe("selectSupportedLanguage", () => {
  const originalDev = devGlobal.__DEV__;
  const originalPseudoEnv = process.env.EXPO_PUBLIC_I18N_PSEUDO;

  afterEach(() => {
    devGlobal.__DEV__ = originalDev;
    if (originalPseudoEnv === undefined) {
      delete process.env.EXPO_PUBLIC_I18N_PSEUDO;
    } else {
      process.env.EXPO_PUBLIC_I18N_PSEUDO = originalPseudoEnv;
    }
  });

  describe("without pseudo env var", () => {
    beforeEach(() => {
      delete process.env.EXPO_PUBLIC_I18N_PSEUDO;
    });

    test.each<[string, Locale[], "en" | "de"]>([
      ["en-US locale", [withLanguageCode("en")], "en"],
      ["de-DE locale", [withLanguageCode("de")], "de"],
      ["es-ES locale falls back to en", [withLanguageCode("es")], "en"],
      ["null languageCode falls back to en", [withLanguageCode(null)], "en"],
      ["empty locales array falls back to en", [], "en"],
    ])("%s → %s", (_label, locales, expected) => {
      expect(selectSupportedLanguage(locales)).toBe(expected);
    });
  });

  describe("pseudo activation", () => {
    test("returns pseudo when __DEV__ and EXPO_PUBLIC_I18N_PSEUDO=true", () => {
      devGlobal.__DEV__ = true;
      process.env.EXPO_PUBLIC_I18N_PSEUDO = "true";
      expect(selectSupportedLanguage([withLanguageCode("en")])).toBe("pseudo");
    });

    test("ignores pseudo env var outside __DEV__", () => {
      devGlobal.__DEV__ = false;
      process.env.EXPO_PUBLIC_I18N_PSEUDO = "true";
      expect(selectSupportedLanguage([withLanguageCode("en")])).toBe("en");
    });

    test("ignores env var values other than literal 'true'", () => {
      devGlobal.__DEV__ = true;
      process.env.EXPO_PUBLIC_I18N_PSEUDO = "1";
      expect(selectSupportedLanguage([withLanguageCode("en")])).toBe("en");
    });

    test("pseudo path ignores device locale entirely", () => {
      devGlobal.__DEV__ = true;
      process.env.EXPO_PUBLIC_I18N_PSEUDO = "true";
      expect(selectSupportedLanguage([withLanguageCode("de")])).toBe("pseudo");
      expect(selectSupportedLanguage([])).toBe("pseudo");
    });
  });
});
