import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";

import { selectSupportedLanguage } from "./language";
import en from "./resources/en.json";
import pseudo from "./resources/pseudo.json";

const resources = {
  en: { translation: en },
  pseudo: { translation: pseudo },
} as const;

// eslint-disable-next-line import/no-named-as-default-member -- i18next.use() is the documented chainable init API
i18n.use(initReactI18next).init({
  resources,
  lng: selectSupportedLanguage(getLocales()),
  fallbackLng: "en",
  supportedLngs: ["en", "pseudo"],
  nonExplicitSupportedLngs: true,
  defaultNS: "translation",
  initAsync: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export { i18n };
