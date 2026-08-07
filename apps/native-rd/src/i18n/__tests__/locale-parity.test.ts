import { i18n, NAMESPACES } from "../index";

// Every non-en locale is checked against en, because `fallbackLng: "en"` makes
// a missing key invisible: the UI silently renders English instead of failing.
// For pseudo that defeats leak detection during dev; for de it ships untranslated
// strings to real users. Both drift modes fail loudly here.
const TRANSLATION_LOCALES = ["de", "pseudo"] as const;

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [prefix];
  }
  const entries = Object.entries(value as Record<string, unknown>);
  // Treat empty objects as leaves so structural drift (adding/removing an
  // empty branch in one locale) fails parity instead of slipping past.
  if (entries.length === 0) {
    return [prefix];
  }
  const result: string[] = [];
  for (const [key, child] of entries) {
    const path = prefix ? `${prefix}.${key}` : key;
    result.push(...flattenKeys(child, path));
  }
  return result;
}

const CASES = TRANSLATION_LOCALES.flatMap((locale) =>
  NAMESPACES.map((ns) => [locale, ns] as const),
);

describe("i18n locale key parity", () => {
  test.each(CASES)(
    "%s has identical key sets to en in the %s namespace",
    (locale, ns) => {
      const enKeys = new Set(flattenKeys(i18n.getResourceBundle("en", ns)));
      const localeKeys = new Set(
        flattenKeys(i18n.getResourceBundle(locale, ns)),
      );
      const missing = [...enKeys].filter((k) => !localeKeys.has(k)).sort();
      const extra = [...localeKeys].filter((k) => !enKeys.has(k)).sort();
      expect({ missing, extra }).toEqual({ missing: [], extra: [] });
    },
  );
});
