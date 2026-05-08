# Native RD Translation Research

**Date:** 2026-05-02
**Status:** Recommended approach
**Scope:** Runtime UI strings, accessibility copy, locale formatting, and native app metadata for `apps/native-rd`.

---

## Summary

Add translations to `native-rd` with `expo-localization` for device locale data and `i18next` + `react-i18next` for the React layer. Keep translation resources bundled in the app at first, use English as the canonical source language, and migrate strings incrementally by feature area.

This fits the current app because:

- `native-rd` is Expo 54 / React Native 0.81 / React 19 and already uses config plugins in `app.json`.
- The app is local-first, so translations should work offline without fetching language bundles.
- There are many hard-coded visible and accessibility strings across screens, components, constants, and tests.
- Existing utilities hard-code locale behavior, for example `formatDate` uses `en-US`.
- The app already has a shared `Text` component that can carry RTL and web language behavior later.

The first production-ready milestone should be English-only infrastructure plus one second locale behind the same mechanism. That proves locale selection, fallback behavior, plurals, tests, and app metadata localization before the whole app is migrated.

---

## Current State

There is no app-level translation layer today. A repository scan found over 1,200 likely user-facing string literals under `src/` excluding tests and stories. Not all of those are translation candidates, but the count is high enough that migration should be staged.

Important current string surfaces:

- Screens and components use direct labels, placeholders, headings, button text, toast text, `Alert.alert` copy, and accessibility labels.
- `src/types/evidence.ts` stores user-facing evidence option labels next to domain types.
- `src/hooks/useTheme.ts` stores theme option names and descriptions next to theme IDs.
- `src/utils/format.ts` formats dates with `toLocaleDateString("en-US")`.
- `src/utils/formatEvidenceLabel.ts` hand-rolls English pluralization.
- `app.json` contains native permission strings for microphone, camera, video, and photos.
- Tests assert English copy directly in many places, which is fine for the initial English fallback but needs helpers once locale behavior is tested.

Do not translate user-generated content: goal titles, step titles, evidence captions, badge names/descriptions produced from user input, imported Open Badges data, URLs, file names, and credential payloads.

---

## Options Considered

| Option                                            | Fit                | Pros                                                                                                                          | Cons                                                                                       | Verdict                                                            |
| ------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `i18n-js` + `expo-localization`                   | Good for tiny apps | Expo guide uses it as a simple example; small API                                                                             | Weaker React integration, weaker type-safety story, fewer ecosystem tools                  | Too limited for this app's size                                    |
| `i18next` + `react-i18next` + `expo-localization` | Best fit           | Mature React hook API, fallback chains, plurals, interpolation, typed resources, optional translation-management integrations | Adds two JS dependencies and migration discipline                                          | Recommended                                                        |
| `react-intl` / FormatJS + `expo-localization`     | Viable             | Strong ICU/message formatting model                                                                                           | React Native/Hermes may require more Intl polyfill care; heavier provider/message workflow | Consider only if ICU message extraction becomes a hard requirement |
| Custom `t()` helper                               | Poor               | Minimal dependency footprint                                                                                                  | Recreates fallback, plural, interpolation, and tooling concerns                            | Do not build this                                                  |

---

## Recommendation

Use:

- `expo-localization` for locale discovery, supported locale declarations, per-app language support, and RTL configuration.
- `i18next` for resources, fallback, interpolation, plurals, and locale-aware formatting hooks.
- `react-i18next` for component integration through `useTranslation`.
- Bundled JSON translation resources under `src/i18n/`, not remote bundles, for offline behavior and translation-tool compatibility. Type safety is layered on via i18next module augmentation.

Install from the app directory so Expo picks the SDK-compatible native module:

```bash
cd apps/native-rd
bunx expo install expo-localization
bun add i18next react-i18next
```

Use JSON resource files so external translation tools (Crowdin, Lokalise, Phrase, Weblate) can consume them without bespoke extraction tooling:

```text
src/i18n/
  index.ts
  language.ts
  resources/
    en.json
    pseudo.json
  __tests__/
    i18n.test.ts
  i18next.d.ts
```

`tsconfig.json` already has `resolveJsonModule: true` (Expo TS preset default), so JSON imports work out of the box. Type safety comes from `i18next.d.ts` declaring `Resources` from a typed import of `en.json`, which gives autocomplete and key safety without coupling the resource format to TypeScript.

The English JSON file is the canonical source. Pseudo locale can be generated from `en.json` by a script rather than hand-maintained.

---

## Initial Runtime Shape

Initialize i18next before the app renders, using bundled resources and English fallback:

```ts
// src/i18n/index.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import en from "./resources/en.json";
import pseudo from "./resources/pseudo.json";
import { selectSupportedLanguage } from "./language";

export const defaultNS = "translation";
export const resources = {
  en: { translation: en },
  pseudo: { translation: pseudo },
} as const;

i18n.use(initReactI18next).init({
  resources,
  lng: selectSupportedLanguage(getLocales()),
  fallbackLng: "en",
  supportedLngs: ["en", "pseudo"],
  nonExplicitSupportedLngs: true,
  defaultNS,
  initAsync: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export { i18n };
```

Then import `./src/i18n` once near app startup, before screens render. A small `I18nLocaleBridge` component can call `useLocales()` from `expo-localization` and `i18n.changeLanguage(...)` when Android locale settings change while the app is foregrounded. Expo documents that iOS results remain stable while the app is running, while Android can change without a restart.

Use typed string keys with i18next module augmentation. This is the documented default for `react-i18next` and the pattern most contributors and code-review tooling expect:

```tsx
// src/i18n/i18next.d.ts
import "i18next";
import en from "./resources/en.json";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: typeof en };
  }
}
```

```tsx
const { t } = useTranslation();

<Button label={t("common.actions.save")} onPress={onSave} />;
```

This gives autocomplete on the dotted key path and type errors for missing keys, without the visual noise of selector callbacks.

---

## Resource Design

Keep keys semantic and grouped by user workflow rather than by component file:

```json
{
  "common": {
    "actions": {
      "save": "Save",
      "cancel": "Cancel",
      "delete": "Delete",
      "dismiss": "Dismiss"
    },
    "evidence": {
      "item_zero": "+ add evidence",
      "item_one": "{{count}} item",
      "item_other": "{{count}} items"
    }
  },
  "evidenceTypes": {
    "photo": {
      "label": "Take Photo",
      "shortLabel": "Photo"
    }
  },
  "screens": {
    "goals": {
      "title": "Goals",
      "emptyTitle": "No goals yet",
      "createAccessibilityLabel": "Create new goal"
    }
  }
}
```

Guidelines:

- Keep copy with translator context in comments only when needed. For example, explain whether "goal" is a noun or app concept.
- Use interpolation for dynamic text instead of template strings around translated fragments.
- Use i18next plural keys for counts. Avoid English-only helpers such as `count !== 1 ? "s" : ""`.
- Keep domain IDs separate from display strings. For example, evidence types should keep stable IDs in `src/types/evidence.ts`, while labels come from `t()`.
- Keep accessibility labels and hints in resources too. They are user-facing copy, not test internals.
- Add a pseudo locale early. It catches fixed-width text, string concatenation, and untranslated fallbacks without waiting for a human translation.

---

## App Config and Native Strings

Runtime translations do not cover native permission dialogs, app names, or platform-localized strings generated from `app.json`.

Add the `expo-localization` config plugin with supported locales:

```json
[
  "expo-localization",
  {
    "supportedLocales": {
      "ios": ["en"],
      "android": ["en"]
    }
  }
]
```

When adding a real second language, also add Expo `locales` files for native metadata and permission prompts. Keep JS resource language tags and `app.json` locale keys aligned using BCP 47 language tags such as `en`, `en-US`, or `es`.

Only enable `extra.supportsRTL` when the app is ready to validate RTL layouts with real or pseudo-RTL locale testing. The current app uses many custom layouts and badge design surfaces, so RTL should be treated as a separate QA milestone rather than toggled casually.

---

## Locale Formatting

Replace locale-hard-coded utilities with locale-aware helpers:

- `formatDate(date, languageTag)` should use the resolved i18next language or the first Expo locale.
- `formatEvidenceLabel(count)` should become a translation call with `count`.
- Durations like `MM:SS` can stay numeric for now, but surrounding labels such as "Duration: {{duration}}" must be translated as whole strings.
- Avoid concatenating translated fragments. Translate the full sentence or label.

For date, number, list, and relative-time formatting, prefer the standard `Intl` APIs through i18next formatting where practical. Validate Hermes support for each formatter before adding broad use. If a formatter is missing, add the narrow FormatJS polyfill for that API and locale data rather than a blanket polyfill set.

---

## Migration Plan

1. Add foundation:
   - Dependencies, `src/i18n`, English resources, pseudo locale, locale selection tests, and app startup import.
   - Add an `expo-localization` Jest mock.
   - Update `src/__tests__/test-utils.tsx` only if provider wiring is needed.

2. Migrate shared labels:
   - `common.actions`
   - evidence type labels
   - theme option labels and descriptions
   - status labels
   - shared component accessibility labels and hints

3. Migrate high-traffic screens:
   - Welcome
   - Goals
   - Focus Mode
   - New/Edit Goal
   - Settings

4. Migrate evidence capture and playback:
   - Photo, video, voice memo, text note, file, and link flows
   - Permission-denied UI copy
   - Error and discard confirmations

5. Migrate badge surfaces:
   - Badge list/detail labels
   - Badge designer controls
   - Keep badge credential/user-entered values untranslated.

6. Add native locale files:
   - App display name if needed
   - Permission strings
   - Platform-localized strings

7. Add QA gates:
   - Unit tests for fallback, interpolation, plurals, and language selection.
   - Snapshot or Testing Library checks under pseudo locale for representative screens.
   - Manual iOS and Android checks for text expansion, accessibility labels, and per-app language behavior.

---

## Testing Strategy

Keep most existing tests on English resources so current assertions remain meaningful during migration. Add focused i18n tests instead of duplicating every screen test per locale.

Recommended tests:

- `selectSupportedLanguage` maps `en-US` to `en`, unsupported locales to `en`, and pseudo locale when explicitly selected in test mode.
- Missing non-English keys fall back to English.
- Pluralized labels render correct zero, one, and other forms.
- A representative screen renders pseudo-locale strings without raw keys.
- Accessibility labels use translated strings.

For tests that should not care about exact English copy, prefer role and label assertions through `t()` or small test helpers. Do not weaken accessibility tests just to avoid translation churn.

---

## Scope and Effort Estimate

Based on a code scan of `apps/native-rd/src` on 2026-05-02:

- 393 label/title/placeholder/description-style assignments across 113 files
- 214 `accessibilityLabel` usages across 85 files
- 51 `Alert.alert` call sites across 15 files
- ~17 screens, ~50+ components

These are upper bounds. Many literals are not user-facing (test fixtures, story names, internal IDs).

| Phase                                                                          | Files touched                 | Effort (focused dev) |
| ------------------------------------------------------------------------------ | ----------------------------- | -------------------- |
| 1. Foundation: deps, `src/i18n/`, language selection, mocks, pseudo locale     | ~10 new + 2 modified          | 1–2 days             |
| 2. Shared labels: `common.actions`, evidence types, theme, status, shared a11y | ~25–30 files                  | 1–2 days             |
| 3. High-traffic screens: Welcome, Goals, Focus, NewGoal, Settings              | ~5 screens + tests            | 2 days               |
| 4. Capture flows: photo, video, voice, text, file, link + permission denials   | ~8 screens + tests            | 2 days               |
| 5. Badge surfaces: list, detail, designer                                      | ~6 files                      | 1–2 days             |
| 6. Native locale files (only when adding a real second language)               | `app.json` + `locales/*.json` | 0.5 day              |
| 7. QA gates: unit tests, pseudo-locale snapshot pass, manual iOS/Android       | tests                         | 1–2 days             |

**Total: ~1.5–2 weeks of focused work**, longer if interleaved with other priorities. Most of the diff is mechanical (literal → `t()`) but generates significant test churn — every `getByText("Save")`-style assertion eventually needs a translation lookup or a stable test-id.

The lasting tax: every new feature now has a "did you wire i18n?" gate. An ESLint rule that flags raw string children inside JSX in `screens/` and `components/` is the cheapest way to keep the gate from regressing.

Bundle size impact: `i18next` ~28 KB minified, `react-i18next` ~12 KB. Acceptable for this app.

---

## Open Decisions

- **Live Android locale change.** Expo `useLocales()` updates while the app is foregrounded on Android. Decide before phase 1 whether to subscribe and call `i18n.changeLanguage(...)`, or require an app restart and document it in Settings. Recommend punting (require restart) until a real second language ships, since there is nothing to switch to in phase 1.
- **Hermes Intl coverage.** RN 0.81 ships Hermes with `Intl.NumberFormat`, `DateTimeFormat`, and `Collator` on iOS and Android. `Intl.RelativeTimeFormat` and `Intl.PluralRules` are present on both as of Hermes 0.12+. Validate during phase 1 with a smoke test rather than adding polyfills speculatively.
- **Test-id strategy.** Decide whether to add stable `testID` props to load-bearing UI before or during the migration. Adding them first decouples test churn from translation churn.

---

## Risks and Mitigations

| Risk                                                | Mitigation                                                                                                 |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Large migration creates noisy diffs                 | Migrate by workflow area and keep English resources matching current copy first                            |
| Typed resources slow TypeScript                     | Start typed; switch i18next selector mode to `"optimize"` only if type-check performance becomes a problem |
| Tests become brittle                                | Keep English fallback stable and add targeted locale tests                                                 |
| Native permission strings diverge from JS resources | Track native strings separately in Expo `locales` files                                                    |
| RTL breaks custom layouts                           | Do not enable RTL support until a dedicated RTL QA pass exists                                             |
| User data accidentally translated or normalized     | Keep generated/user credential data outside translation resources                                          |

---

## Source Notes

- Expo Localization guide: `expo-localization` reads device locale data, supported locales enable per-app language selection, and Expo documents separate handling for translating app metadata and RTL support. <https://docs.expo.dev/guides/localization/>
- Expo Localization SDK docs: `getLocales()` and `useLocales()` expose ordered user locale preferences; Android locale preferences can change while the app is running. <https://docs.expo.dev/versions/latest/sdk/localization/>
- React i18next quick start: `initReactI18next` wires i18next into React context and components use `useTranslation()`. <https://react.i18next.com/guides/quick-start>
- i18next configuration docs: bundled `resources`, `fallbackLng`, `supportedLngs`, `nonExplicitSupportedLngs`, and `initAsync: false` are supported initialization options. <https://www.i18next.com/overview/configuration-options>
- i18next TypeScript docs: typed resources and selector-style `t()` calls are supported, with `enableSelector` improving TypeScript key safety. <https://www.i18next.com/overview/typescript>
- i18next plural and formatting docs: plurals use `count`, and built-in formatting relies on standard `Intl` APIs that may need targeted polyfills in some runtimes. <https://www.i18next.com/translation-function/plurals> and <https://www.i18next.com/translation-function/formatting>
- FormatJS React Intl docs: React Native users need to verify runtime `Intl` support or polyfill required APIs, which is why this research does not recommend adopting React Intl first. <https://formatjs.github.io/docs/react-intl/>

---

## Decision

Adopt `expo-localization` + `i18next` + `react-i18next`, with bundled TypeScript resources and English fallback. Start with infrastructure, pseudo locale, and shared labels before migrating full screens. Treat native metadata localization and RTL support as explicit follow-up milestones, not automatic side effects of adding runtime translations.
