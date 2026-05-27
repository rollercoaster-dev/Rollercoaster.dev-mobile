/**
 * Hermes `Intl` coverage probe (issue #66).
 *
 * Pure, runtime-agnostic logic for the `__DEV__` probe screen. Each probe
 * constructs and exercises an `Intl.*` API the way i18next 26 does internally
 * (see `node_modules/i18next/dist/cjs/i18next.js` lines 1060, 1367-1392, 2144)
 * and reports whether the *current JS engine* implements it.
 *
 * On Hermes, missing APIs (`PluralRules`, `RelativeTimeFormat`, `DisplayNames`,
 * `ListFormat`, `Locale`, `Segmenter`) throw on construction. Under Node/Jest
 * everything is present, so this runner is exercised for shape/non-throwing in
 * tests — the engine-specific result only shows on-device.
 *
 * See `docs/research/hermes-intl-spike-66-findings.md`.
 */

import type { i18n as I18nType } from "i18next";

export type IntlProbeStatus = "supported" | "missing" | "partial";

export interface IntlProbeResult {
  /** The `Intl.*` API exercised. */
  api: string;
  status: IntlProbeStatus;
  /** Human-readable output or error message — what the engine actually did. */
  detail: string;
}

/** Run one probe, classifying a thrown error as `missing`. */
function probe(
  api: string,
  fn: () => string,
  status: IntlProbeStatus = "supported",
): IntlProbeResult {
  try {
    return { api, status, detail: fn() };
  } catch (err) {
    return {
      api,
      status: "missing",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Probe every `Intl.*` API i18next 26 touches, against the current engine.
 * Locales chosen to exercise non-Latin / richly-inflected paths: `de`
 * (one/other), `ar` (six plural categories), `zh-CN`.
 */
export function runIntlProbe(): IntlProbeResult[] {
  const results: IntlProbeResult[] = [];

  results.push(
    probe("getCanonicalLocales", () =>
      JSON.stringify(Intl.getCanonicalLocales("EN-us")),
    ),
  );

  results.push(
    probe("supportedValuesOf(calendar)", () => {
      // supportedValuesOf is ES2022 — older Hermes lacks it entirely.
      const fn = (
        Intl as unknown as {
          supportedValuesOf?: (key: string) => string[];
        }
      ).supportedValuesOf;
      if (typeof fn !== "function") throw new Error("not a function");
      return `${fn("calendar").length} calendars`;
    }),
  );

  results.push(
    probe("Collator (de)", () => {
      const order = new Intl.Collator("de").compare("ä", "z");
      return `compare('ä','z') = ${order}`;
    }),
  );

  results.push(
    probe("DateTimeFormat (de)", () =>
      new Intl.DateTimeFormat("de", { dateStyle: "long" }).format(
        new Date(Date.UTC(2026, 4, 27)),
      ),
    ),
  );

  results.push(
    probe("NumberFormat (de)", () =>
      new Intl.NumberFormat("de").format(1234567.89),
    ),
  );

  // formatToParts is the known iOS gap: present but may return an empty/degraded
  // array even when NumberFormat.format works.
  results.push(
    probe("NumberFormat.formatToParts (de)", () => {
      const parts = new Intl.NumberFormat("de").formatToParts(1234.5);
      if (!Array.isArray(parts) || parts.length === 0) {
        throw new Error("empty parts array (iOS gap)");
      }
      return `${parts.length} parts`;
    }),
  );

  // The crux: i18next calls `new Intl.PluralRules(code, { type })` (line 1060).
  // Native `ar` resolves to six categories; a missing impl throws here.
  results.push(
    probe("PluralRules (ar)", () => {
      const cats = new Intl.PluralRules("ar").resolvedOptions()
        .pluralCategories;
      return `${cats.length} categories: ${cats.join("/")}`;
    }),
  );

  results.push(
    probe("PluralRules ordinal (en)", () => {
      const cats = new Intl.PluralRules("en", {
        type: "ordinal",
      }).resolvedOptions().pluralCategories;
      return `${cats.length} categories: ${cats.join("/")}`;
    }),
  );

  results.push(
    probe("RelativeTimeFormat (de)", () =>
      new Intl.RelativeTimeFormat("de", { numeric: "auto" }).format(-1, "day"),
    ),
  );

  results.push(
    probe("ListFormat (de)", () =>
      new Intl.ListFormat("de", { type: "conjunction" }).format([
        "a",
        "b",
        "c",
      ]),
    ),
  );

  results.push(
    probe("Locale (de)", () => {
      const l = new Intl.Locale("de-DE");
      return `language=${l.language} region=${l.region}`;
    }),
  );

  results.push(
    probe("Segmenter (zh-CN)", () => {
      const Seg = (Intl as unknown as { Segmenter?: unknown }).Segmenter;
      if (typeof Seg !== "function") throw new Error("not a function");
      const seg = new (Seg as new (
        locale: string,
        opts: { granularity: string },
      ) => { segment: (s: string) => Iterable<unknown> })("zh-CN", {
        granularity: "word",
      });
      return `${[...seg.segment("你好世界")].length} segments`;
    }),
  );

  return results;
}

export interface PluralResolutionRow {
  count: number;
  /** The i18next plural suffix actually resolved (`one`, `other`, `few`, …). */
  rendered: string;
}

export interface PluralResolutionProbe {
  locale: string;
  /** CLDR categories the engine reports for this locale (`?` if unavailable). */
  engineCategories: string;
  rows: PluralResolutionRow[];
}

const PROBE_NS = "common";
const PROBE_KEY = "__intlProbe_box";

/**
 * Demonstrate i18next's plural-suffix resolution per locale. Injects an
 * ephemeral resource bundle with every CLDR category so the resolved suffix is
 * observable regardless of whether the locale ships real copy.
 *
 * When `Intl.PluralRules` is missing, i18next's `dummyRule` collapses *every*
 * locale to `one`/`other` — so `ar` count=3 renders `other` instead of `few`,
 * and `en` ordinals collapse. This is the empirical degradation the spike
 * confirms. `de` is included to show it does *not* degrade (de cardinals are
 * already one/other, identical to the dummy).
 */
export function runPluralResolutionProbe(
  i18n: I18nType,
): PluralResolutionProbe[] {
  // Cover all six CLDR categories. i18next selects the suffix; the value is the
  // category name so the resolution is visible in the rendered string.
  const allForms = {
    [`${PROBE_KEY}_zero`]: "zero",
    [`${PROBE_KEY}_one`]: "one",
    [`${PROBE_KEY}_two`]: "two",
    [`${PROBE_KEY}_few`]: "few",
    [`${PROBE_KEY}_many`]: "many",
    [`${PROBE_KEY}_other`]: "other",
  };

  const locales = ["en", "de", "ar"];
  const counts = [0, 1, 2, 3, 6, 11, 100];

  return locales.map((locale) => {
    i18n.addResourceBundle(locale, PROBE_NS, allForms, true, true);

    let engineCategories = "?";
    try {
      engineCategories = new Intl.PluralRules(locale)
        .resolvedOptions()
        .pluralCategories.join("/");
    } catch {
      engineCategories = "missing (dummyRule → one/other)";
    }

    // The probe key is injected at runtime, so it is absent from i18next's
    // typed resource map — call through a loosened signature.
    const translate = i18n.t as unknown as (
      key: string,
      opts: { count: number; lng: string },
    ) => string;
    const rows = counts.map((count) => ({
      count,
      rendered: translate(`${PROBE_NS}:${PROBE_KEY}`, { count, lng: locale }),
    }));

    return { locale, engineCategories, rows };
  });
}
