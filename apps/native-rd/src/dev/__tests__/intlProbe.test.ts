import { createInstance } from "i18next";
import { runIntlProbe, runPluralResolutionProbe } from "../intlProbe";

/**
 * These run under Node/Jest, which ships a full ICU `Intl`. So they assert the
 * *expected-correct* baseline (every API present, ar resolving six categories)
 * and that the runners never throw. The engine-specific Hermes result is only
 * observable on-device via the probe screen — see
 * `docs/research/hermes-intl-spike-66-findings.md`.
 */

describe("runIntlProbe", () => {
  const results = runIntlProbe();

  it("returns a well-formed result per probed API", () => {
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(typeof r.api).toBe("string");
      expect(["supported", "missing", "partial"]).toContain(r.status);
      expect(typeof r.detail).toBe("string");
    }
  });

  it("reports full Intl support under Node's ICU", () => {
    const missing = results.filter((r) => r.status === "missing");
    expect(missing).toEqual([]);
  });

  it("resolves Arabic to six plural categories", () => {
    const ar = results.find((r) => r.api === "PluralRules (ar)");
    expect(ar?.status).toBe("supported");
    expect(ar?.detail).toContain("6 categories");
  });
});

describe("runPluralResolutionProbe", () => {
  function freshI18n() {
    const i18n = createInstance();
    // `initAsync: false` forces synchronous init (matching the app config in
    // src/i18n/index.ts) so the instance is fully ready before the probe reads
    // it — otherwise init resolves on a later tick and the tests race it.
    i18n.init({
      lng: "en",
      fallbackLng: "en",
      resources: {},
      initAsync: false,
    });
    return i18n;
  }

  it("returns a probe per locale with one row per tested count", () => {
    const probes = runPluralResolutionProbe(freshI18n());
    expect(probes.map((p) => p.locale)).toEqual(["en", "de", "ar"]);
    for (const p of probes) {
      expect(p.rows.length).toBeGreaterThan(0);
    }
  });

  it("picks the correct suffix per CLDR category under full ICU", () => {
    const probes = runPluralResolutionProbe(freshI18n());
    const ar = probes.find((p) => p.locale === "ar");
    const suffixFor = (count: number) =>
      ar?.rows.find((row) => row.count === count)?.rendered;

    // The degradation tells: with real PluralRules these are distinct
    // categories; the dummyRule would collapse them to "other".
    expect(suffixFor(0)).toBe("zero");
    expect(suffixFor(3)).toBe("few");
    expect(suffixFor(11)).toBe("many");
  });

  it("shows German does not degrade (one/other matches the dummyRule)", () => {
    const probes = runPluralResolutionProbe(freshI18n());
    const de = probes.find((p) => p.locale === "de");
    expect(de?.rows.find((row) => row.count === 1)?.rendered).toBe("one");
    expect(de?.rows.find((row) => row.count === 2)?.rendered).toBe("other");
  });
});
