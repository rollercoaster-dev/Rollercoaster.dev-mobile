# Hermes `Intl` Coverage Spike — Findings (Issue #66)

**Date:** 2026-05-27
**Status:** Complete — desk research + on-device probe confirmed on iOS sim and Android emulator (Hermes 0.14.1).
**Scope:** Verify the Hermes `Intl.*` support matrix on the _actual_ installed stack, confirm i18next 26's `PluralRules` fallback path, and produce the polyfill shortlist for #76 / #62.

> Sections 1–6 establish the matrix from static analysis + authoritative sources; **Section 7a holds the empirical on-device results** that confirm it (and correct it in two places: `supportedValuesOf` and the iOS `formatToParts` gap).

---

## 1. Actual stack vs. what the issue/doc assume

The issue body and the research doc both reference a stale stack. The installed reality:

| Component         | Issue #66 says | Research doc says | **Installed (verified)**                                  |
| ----------------- | -------------- | ----------------- | --------------------------------------------------------- |
| Expo SDK          | 55             | 54                | **55.0.26**                                               |
| React Native      | 0.81           | 0.81              | **0.83.6**                                                |
| Hermes engine     | "default"      | "0.12+"           | **hermes-v0.14.1**                                        |
| i18next           | 26.1           | —                 | **26.2.0**                                                |
| react-i18next     | —              | —                 | **17.0.8**                                                |
| expo-localization | —              | —                 | **55.0.15**                                               |
| JS engine config  | —              | —                 | Hermes (RN default, no `jsEngine` override in `app.json`) |

The drift matters because Hermes `Intl` support evolves between versions. The conclusion below holds regardless — upstream sources confirm the same gaps for Hermes 0.14 / RN 0.82–0.83 as for 0.81 — but **both the issue body and the research doc should have their version strings corrected.**

---

## 2. Verified `Intl.*` support matrix

Sourced from Hermes' own `doc/Features.md`, the callstack `agent-skills` reference (March 2026, cited by the issue), and a cross-version search confirming the gaps persist through Hermes 0.14 / RN 0.83. **Not yet confirmed on-device** — desk-verified only.

| API                          | Hermes native | Notes                                     |
| ---------------------------- | ------------- | ----------------------------------------- |
| `Intl.getCanonicalLocales()` | ✅            |                                           |
| `Intl.supportedValuesOf()`   | ✅            |                                           |
| `Intl.Collator`              | ✅            |                                           |
| `Intl.DateTimeFormat`        | ✅            |                                           |
| `Intl.NumberFormat`          | ⚠️ partial    | `formatToParts()` has a known **iOS** gap |
| `Intl.PluralRules`           | ❌            | **Not implemented at the engine level**   |
| `Intl.RelativeTimeFormat`    | ❌            |                                           |
| `Intl.DisplayNames`          | ❌            |                                           |
| `Intl.ListFormat`            | ❌            |                                           |
| `Intl.Locale`                | ❌            |                                           |
| `Intl.Segmenter`             | ❌            |                                           |

**Verdict:** Issue #66's matrix is **correct**. The research doc's Open Decision (`native-rd-translations-research.md` line 326 — _"`Intl.RelativeTimeFormat` and `Intl.PluralRules` are present on both as of Hermes 0.12+"_) is **factually wrong** and contradicts the authoritative sources. It must be corrected, not just have its provisional flag removed.

---

## 3. i18next 26.2.0 `PluralRules` fallback — confirmed in installed source

`node_modules/i18next/dist/cjs/i18next.js`:

- **Line 1032** — `dummyRule`:
  ```js
  const dummyRule = {
    select: (count) => (count === 1 ? "one" : "other"),
    resolvedOptions: () => ({ pluralCategories: ["one", "other"] }),
  };
  ```
- **Line 1060** — `rule = new Intl.PluralRules(cleanedCode, { type })` inside a `try`. On `catch`, if `Intl` is undefined or the code has no region part, it returns `dummyRule` (lines 1063–1068).
- **Lines 1367–1392** — i18next's built-in formatters call `new Intl.NumberFormat`, `Intl.DateTimeFormat`, `Intl.RelativeTimeFormat`, `Intl.ListFormat` directly (the last two will throw on Hermes if those format names are used).
- **Line 2144** — `i18n.dir()` calls `new Intl.Locale(lng)` but it is **wrapped in try/catch** (lines 2143–2149) with a hardcoded RTL-language fallback list (line 2150). So `Intl.Locale`'s absence on Hermes is **non-fatal** — RTL direction detection silently degrades to the static list (which covers `ar`/`he`/`fa`/`ur`/etc.). This is a finding _beyond_ the issue's stated shortlist: i18next itself does **not** crash without `Intl.Locale`.

So the mechanism the issue describes is real: without a `PluralRules` polyfill, every locale resolves through `dummyRule`, which only knows `one`/`other`.

---

## 4. The German-degradation claim is overstated for the _shipped_ corpus

This is the spike's most important nuance. The issue says German "silently degrades." For the strings actually shipped today, **it does not**:

- **German CLDR cardinal categories are `one` / `other`** — _identical_ to `dummyRule`'s `count===1 ? 'one' : 'other'`. For any cardinal `_one`/`_other` key, the dummy rule produces the same result as real `Intl.PluralRules('de')`.
- The shipped `de` corpus contains **only `_one`/`_other` cardinal keys**. Verified: **zero `_zero` keys, zero ordinal keys** anywhere under `src/i18n/resources/` (locales: `en`, `de`, `pseudo`).
- The issue's specified probe call — `i18n.t('common.evidence.item', { count })` — targets a **key that does not exist**. The real keys are:
  - `common.evidence.label.goal_one` / `goal_other`, `step_one` / `step_other`
  - `common.evidence.evidenceCount.items_one` / `items_other`
  - The count-0 "+ add evidence" state is a **separate static key** (`evidenceCount.addEvidence`), _not_ a `_zero` plural.

**Consequence:** Running the probe exactly as the issue specifies would show _identical_ output with and without the polyfill for German — because (a) the key is wrong and (b) German `one`/`other` matches the dummy exactly. It would **not** demonstrate degradation.

### Where degradation actually bites

The dummy rule produces _wrong_ output only for:

1. **Locales with more than two plural categories** — Arabic (`zero`/`one`/`two`/`few`/`many`/`other` = 6), Polish/Russian/Czech/Lithuanian (3–4), Welsh, etc. These break badly under the dummy. **This is the real reason to polyfill.**
2. **Ordinal plurals** — English ordinal has `one`/`two`/`few`/`other` (1st, 2nd, 3rd, 4th); the dummy collapses these to `one`/`other`. (German ordinal is single-category, so German ordinals would be unaffected — but English ones break.) No ordinal keys exist in the corpus today.
3. **Explicit `_zero` keys** — i18next _does_ honor a custom `_zero` suffix via a dedicated zero-suffix lookup path (`needsZeroSuffixLookup`, lines 605 / 708–709 / 831–840), independent of CLDR. The earlier draft research doc's `item_zero` example was **never implemented** — no `_zero` key ships today.

**Reframed conclusion:** the `PluralRules` polyfill is **not** required for the current `en` + `de` release. It is a **pre-requisite for the next locale that has >2 plural categories, or for introducing ordinals / `_zero` keys.**

---

## 5. Polyfill shortlist (for #76 / #62)

Order polyfill imports _before_ `./src/i18n` initialization. Import only the locale data for locales actually shipped.

| Polyfill                                            | When required                                                                                           | For current en+de release?                    |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `@formatjs/intl-pluralrules` + `/locale-data/<lng>` | Adding a locale with >2 plural categories, **or** introducing ordinals, **or** introducing `_zero` keys | **Not yet** — en/de cardinals match the dummy |
| `@formatjs/intl-relativetimeformat` + locale data   | Only if a `relativetime` i18next formatter is used                                                      | Not used today                                |
| `@formatjs/intl-numberformat` + locale data         | Only if `NumberFormat.prototype.formatToParts()` is called on **iOS**                                   | Not used today                                |
| `@formatjs/intl-locale`                             | Not needed for i18next — `i18n.dir()` already try/catches and falls back                                | No                                            |
| `@formatjs/intl-listformat`                         | Only if a `list` i18next formatter is used                                                              | Not used today                                |

**Recommended minimal shortlist when the trigger condition hits (per the issue's expectation):**

```ts
import "@formatjs/intl-pluralrules/polyfill-force";
import "@formatjs/intl-pluralrules/locale-data/en";
import "@formatjs/intl-pluralrules/locale-data/de";
// + one locale-data import per additional shipped locale
```

`polyfill-force` (vs `polyfill`) is correct here because Hermes exposes a partial `Intl` object — the non-force variant skips installation when `Intl.PluralRules` is "present," and we want to override Hermes' missing/partial implementation deterministically.

---

## 6. Recommended corrections to existing artifacts

1. **`native-rd-translations-research.md` line 326** — replace the wrong "PluralRules present since Hermes 0.12+" claim with the verified matrix (Section 2). Keep the provisional flag until the on-device probe runs.
2. **Issue #66 body** — correct the stack (`RN 0.83.6 / Hermes 0.14.1 / i18next 26.2.0`), the probe key (`common.evidence.item` → real keys in Section 4), and note that German cardinals won't demonstrate degradation; the probe should use **Arabic** (or an ordinal/`_zero` key) to actually exercise the dummy-rule gap.

---

## 7a. Empirical on-device results

Captured by running the `src/dev` probe in the dev client. Engine: **Hermes 0.14.1** (RN 0.83.6, Expo 55.0.26).

### iOS — iPhone 17 simulator (Xcode 26.2), 2026-05-27

| API                          | Desk-research expectation | **Observed on-device**                               | Note                                                            |
| ---------------------------- | ------------------------- | ---------------------------------------------------- | --------------------------------------------------------------- |
| `getCanonicalLocales`        | ✅                        | ✅ `["en-US"]`                                       |                                                                 |
| `supportedValuesOf`          | ✅ (per sources)          | **❌ missing** (`not a function`)                    | **Diverges from sources** — absent on this iOS build            |
| `Collator`                   | ✅                        | ✅ `compare('ä','z') = -1`                           |                                                                 |
| `DateTimeFormat`             | ✅                        | ✅ `27. Mai 2026`                                    |                                                                 |
| `NumberFormat`               | ✅                        | ✅ `1.234.567,89`                                    | correct de grouping/decimal                                     |
| `NumberFormat.formatToParts` | ⚠️ partial (iOS gap)      | **❌ missing** (`is not a function`)                 | **Worse than expected** — entirely absent, not a degraded array |
| `PluralRules`                | ❌                        | ❌ (`Cannot read property 'prototype' of undefined`) | confirmed                                                       |
| `PluralRules` (ordinal)      | ❌                        | ❌                                                   | confirmed                                                       |
| `RelativeTimeFormat`         | ❌                        | ❌                                                   | confirmed                                                       |
| `ListFormat`                 | ❌                        | ❌                                                   | confirmed                                                       |
| `Locale`                     | ❌                        | ❌                                                   | confirmed                                                       |
| `Segmenter`                  | ❌                        | ❌ (`not a function`)                                | confirmed                                                       |

**i18next plural resolution (dummyRule active, no polyfill):**

| count | en    | de    | ar        | correct ar (CLDR)               |
| ----- | ----- | ----- | --------- | ------------------------------- |
| 0     | zero  | zero  | zero      | zero                            |
| 1     | one   | one   | one       | one                             |
| 2     | other | other | **other** | two                             |
| 3     | other | other | **other** | few                             |
| 6     | other | other | **other** | few                             |
| 11    | other | other | **other** | many                            |
| 100   | other | other | other     | other (`other`/`many` per form) |

Confirmed empirically:

- **Arabic degrades** — counts 2/3/6/11 all collapse to `other` instead of `two`/`few`/`few`/`many`. This is the dummy-rule failure the polyfill fixes.
- **German does _not_ degrade** — `de` resolves identically to `en` (`one`/`other`), exactly as predicted, because de cardinals already match the dummy.
- **`count=0 → "zero"` for every locale** — confirms i18next's `_zero` suffix lookup is a non-CLDR feature that fires independent of `PluralRules`. So an explicit `_zero` key works even without the polyfill; what breaks is the CLDR categories (`two`/`few`/`many`).

Two corrections to the source-based matrix (Section 2): on this iOS Hermes build, **`supportedValuesOf` is missing** and **`NumberFormat.formatToParts` is entirely absent** (not merely the partial array the "known iOS gap" implied). Neither is used by the app today.

### Android — Pixel_6a emulator (API per AVD), 2026-05-27

Identical to iOS **except `formatToParts`**:

| API                          | iOS       | **Android**                |
| ---------------------------- | --------- | -------------------------- |
| `getCanonicalLocales`        | ✅        | ✅                         |
| `supportedValuesOf`          | ❌        | ❌ `not a function`        |
| `Collator`                   | ✅        | ✅                         |
| `DateTimeFormat`             | ✅        | ✅ `27. Mai 2026`          |
| `NumberFormat`               | ✅        | ✅ `1.234.567,89`          |
| `NumberFormat.formatToParts` | ❌ absent | **✅ supported (5 parts)** |
| `PluralRules` / ordinal      | ❌        | ❌                         |
| `RelativeTimeFormat`         | ❌        | ❌                         |
| `ListFormat`                 | ❌        | ❌                         |
| `Locale`                     | ❌        | ❌                         |
| `Segmenter`                  | ❌        | ❌ `not a function`        |

Plural resolution is **identical to iOS** on Android — `ar` counts 2/3/6/11 all collapse to `other`; `de`==`en`; `count=0`→`zero` everywhere.

**Platform takeaway:** `formatToParts` is the _only_ API that differs — present on Android, absent on iOS. This confirms the "iOS gap" is a genuine iOS-only omission. If the app ever calls `NumberFormat.prototype.formatToParts()`, it needs `@formatjs/intl-numberformat` **for iOS specifically**. Not used today.

---

## 7. Acceptance-criteria status

- [x] Probe screen checked into `src/dev/`, `__DEV__`-gated (`IntlProbeScreen.tsx`, reachable via Settings → Dev tools in dev builds)
- [x] iOS sim (Xcode 26.2) confirmed — Section 7a
- [x] Android emulator (Pixel_6a) confirmed — Section 7a
- [x] `Intl.PluralRules` confirmed missing on Hermes 0.14.1 (throws on both platforms)
- [x] `NumberFormat.formatToParts()` iOS gap reproduced (absent on iOS, present on Android)
- [x] Dummy-rule degradation empirically confirmed (Arabic collapse to `one`/`other`)
- [x] Polyfill shortlist documented (Section 5)

**Note on the research doc's provisional flag:** the wrong matrix claim in `native-rd-translations-research.md` was corrected, but the flag wording ("on-device probe still pending before this flag is removed") should be tightened now that the probe has run — left for the PR review pass.

The probe was revised from the issue spec, which was based on the draft research doc: it calls a runtime-injected 6-category bundle and tests `en`/`de`/**`ar`** (the issue's `de`-on-`common.evidence.item` would not have shown degradation — that key doesn't exist and de cardinals match the dummy).

---

## Sources

- Hermes `doc/Features.md` — <https://github.com/facebook/hermes/blob/main/doc/Features.md>
- callstack `agent-skills` — native SDKs over polyfills — <https://github.com/callstackincubator/agent-skills/blob/main/skills/react-native-best-practices/references/native-sdks-over-polyfills.md>
- iROOMit, "Hermes Intl Support in React Native on iOS" — <https://medium.com/@iROOMitEng/hermes-intl-support-in-react-native-on-ios-134b487bcce7>
- Installed source: `apps/native-rd/node_modules/i18next/dist/cjs/i18next.js` (v26.2.0), lines 1032, 1060, 1367–1392, 2144
