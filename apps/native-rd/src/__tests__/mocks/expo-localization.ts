import type { Locale } from "expo-localization";

export const enUS: Locale = {
  languageTag: "en-US",
  languageCode: "en",
  languageScriptCode: "Latn",
  regionCode: "US",
  languageRegionCode: "US",
  currencyCode: "USD",
  currencySymbol: "$",
  languageCurrencyCode: "USD",
  languageCurrencySymbol: "$",
  decimalSeparator: ".",
  digitGroupingSeparator: ",",
  textDirection: "ltr",
  measurementSystem: "us",
  temperatureUnit: "fahrenheit",
};

export const getLocales = (): Locale[] => [enUS];
export const useLocales = (): Locale[] => [enUS];
