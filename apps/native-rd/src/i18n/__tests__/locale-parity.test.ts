import { i18n, NAMESPACES } from "../index";

// Pseudo locale's job is to make untranslated strings visible during dev.
// A key that exists in en but is missing in pseudo silently falls back to en,
// defeating the leak detection. This test fails loudly when that drift appears.
function flattenKeys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [prefix];
  }
  const result: string[] = [];
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    result.push(...flattenKeys(child, path));
  }
  return result;
}

describe("i18n locale key parity", () => {
  test.each(NAMESPACES)(
    "%s namespace has identical key sets in en and pseudo",
    (ns) => {
      const en = i18n.getResourceBundle("en", ns);
      const pseudo = i18n.getResourceBundle("pseudo", ns);
      const enKeys = new Set(flattenKeys(en));
      const pseudoKeys = new Set(flattenKeys(pseudo));
      const missingInPseudo = [...enKeys]
        .filter((k) => !pseudoKeys.has(k))
        .sort();
      const extraInPseudo = [...pseudoKeys]
        .filter((k) => !enKeys.has(k))
        .sort();
      expect({ missingInPseudo, extraInPseudo }).toEqual({
        missingInPseudo: [],
        extraInPseudo: [],
      });
    },
  );
});
