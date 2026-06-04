import { i18n, NAMESPACES } from "../index";

// With every namespace JSON = {} the typed t() rejects arbitrary string keys
// (a feature, not a bug — real keys arrive as each screen migrates). Cast here
// so the smoke test exercises the runtime fallback behavior: missing keys should
// return a string, not throw.
const tUnsafe = i18n.t.bind(i18n) as unknown as (key: string) => string;

describe("i18n bootstrap", () => {
  test("initializes synchronously with en as the resolved language", () => {
    expect(i18n.isInitialized).toBe(true);
    expect(i18n.language).toBe("en");
  });

  test("missing keys return a string instead of throwing", () => {
    expect(() => tUnsafe("totally.missing.key")).not.toThrow();
    expect(typeof tUnsafe("totally.missing.key")).toBe("string");
  });

  test("changeLanguage to pseudo does not throw with empty resources", async () => {
    await expect(i18n.changeLanguage("pseudo")).resolves.toBeDefined();
    expect(i18n.language).toBe("pseudo");
    await i18n.changeLanguage("en");
  });

  test("changeLanguage to de does not throw with empty resources", async () => {
    await expect(i18n.changeLanguage("de")).resolves.toBeDefined();
    expect(i18n.language).toBe("de");
    await i18n.changeLanguage("en");
  });

  test("accepts regional tags via nonExplicitSupportedLngs", async () => {
    // With nonExplicitSupportedLngs: true, changeLanguage("en-GB") must not
    // reject as an unsupported language. We don't pin resolvedLanguage here —
    // its semantics shifted between i18next majors and aren't load-bearing.
    await expect(i18n.changeLanguage("en-GB")).resolves.toBeDefined();
    expect(i18n.languages).toContain("en");
    await i18n.changeLanguage("en");
  });

  test("every declared namespace is registered for en, de, and pseudo", () => {
    for (const ns of NAMESPACES) {
      expect(i18n.hasResourceBundle("en", ns)).toBe(true);
      expect(i18n.hasResourceBundle("de", ns)).toBe(true);
      expect(i18n.hasResourceBundle("pseudo", ns)).toBe(true);
    }
  });
});
