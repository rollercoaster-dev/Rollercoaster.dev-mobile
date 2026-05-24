# Development Plan: Issue #61

## Issue Summary

**Title**: i18n: native German locale files (Expo locales/\*.json)
**Type**: enhancement
**Complexity**: SMALL
**Estimated Lines**: ~160 lines

## Intent Verification

Observable criteria derived from the issue. These describe what success looks like from a user/system perspective.

- [ ] **Manual native-build gate** — when the device language is set to German, iOS permission dialogs (camera, microphone, photo library) show German copy. Verify on a simulator/device with language=Deutsch after the next `npx expo prebuild` + `expo run:ios` cycle.
- [ ] **Manual native-build gate** — the `.lproj/de.lproj/` directory is generated and picked up. Verify after prebuild.
- [ ] **Manual native-build gate** — `npx expo prebuild --platform ios` generates `ios/*/Supporting/de.lproj/InfoPlist.strings`.
- [ ] **Manual native-build gate** — `npx expo prebuild --platform android` generates `android/app/src/main/res/xml/locales_config.xml` with both `en` and `de`.
- [x] BCP 47 tags in `app.json` (`en`, `de`) match the language codes used in `src/i18n/language.ts` and `src/i18n/index.ts`.
- [x] `locales/en.json` mirrors the permission strings currently in `app.json` (verbatim English copy, no new content invented).
- [x] `locales/de.json` contains German equivalents for every key present in `locales/en.json`.

## Dependencies

| Issue | Title                                     | Status | Type                                                         |
| ----- | ----------------------------------------- | ------ | ------------------------------------------------------------ |
| #76   | i18n: ship minimal German first-test path | OPEN   | Soft (this issue blocks #76 closeout; no dependency inbound) |

**Status**: No inbound blockers. This issue blocks #76 closeout; the dependency is outbound.

Note from milestone doc: "#61 should land after runtime terminology stabilizes enough to keep permission strings consistent with in-app copy." Most screen migrations (#67–#72) are in progress. The permission strings in `app.json` are stable and do not depend on any migrated namespace. Landing now is safe per the milestone doc's operational order (step 3 in "Then — sequential again").

## Objective

Add native locale support for English and German by:

1. Expanding the bare `"expo-localization"` plugin entry in `app.json` to a configured array entry with `supportedLocales` for `["en", "de"]` on both iOS and Android.
2. Adding a `locales` field to `app.json` pointing to per-locale JSON files at `apps/native-rd/locales/en.json` and `apps/native-rd/locales/de.json`.
3. Creating `locales/en.json` that mirrors the current `app.json` permission strings verbatim.
4. Creating `locales/de.json` with generated German translations of every key in `en.json`, pending native-speaker review before #76 closes.
5. Wiring the `"de"` language code into `src/i18n/language.ts` so the runtime i18next instance selects German for German-locale devices.

This is the minimal set of changes for native permission dialogs to appear in German. It does not touch any screen-level JS namespace JSONs — those are owned by #67–#72.

## Decisions

| ID  | Decision                                                                                                                             | Alternatives Considered                                                            | Rationale                                                                                                                                                                                                                                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Use the `locales` field in `app.json` (pointing to `locales/en.json` and `locales/de.json`) rather than inlining translation objects | Inline the translation object directly in `app.json`; use a separate config plugin | Expo config-plugins `withLocales` resolves path-based entries at prebuild time. Path-based keeps `app.json` readable and allows the locale files to grow without cluttering the config. The path is relative to the app root (`apps/native-rd/`).                                                                                                                                         |
| D2  | `supportedLocales` as a flat array `["en", "de"]` on both platforms rather than per-platform objects                                 | `{ ios: ["en", "de"], android: ["en", "de"] }` object shape                        | The plugin source (`withExpoLocalization.js` lines 28–31) accepts either a flat array or a `{ ios, android }` object and applies the flat array to both platforms. A flat array is less verbose for the common case of identical platform support.                                                                                                                                        |
| D3  | Add `"de"` to `SupportedLanguage` union and fix the identity stub in `selectSupportedLanguage`                                       | Leave `language.ts` alone for this PR                                              | The `language.ts` comment explicitly reads "When a second user-facing language ships (#1029), the false branch becomes 'de'." This is that moment. The runtime and native layers must align: if the device is German but `selectSupportedLanguage` always returns `"en"`, `i18next` will never serve German copy even after #67–#72 land. This PR is the natural place to close that gap. |
| D4  | Extend the i18n bootstrap test to cover `"de"` as a registered language                                                              | Add a dedicated test file                                                          | The existing `i18n.test.ts` already has a `changeLanguage` smoke test. Extending it is lower friction than a new file and keeps locale coverage in one place.                                                                                                                                                                                                                             |

## Affected Areas

- `apps/native-rd/app.json`: expand bare `"expo-localization"` plugin entry to configured array entry with `supportedLocales`; add `"locales"` field pointing to `locales/en.json` and `locales/de.json`.
- `apps/native-rd/locales/en.json`: new file — mirrors all native permission strings currently in `app.json`.
- `apps/native-rd/locales/de.json`: new file — German translations of every key in `en.json`.
- `apps/native-rd/src/i18n/language.ts`: expand `SupportedLanguage` union to include `"de"`; fix the identity stub so `languageCode === "de"` returns `"de"`.
- `apps/native-rd/src/i18n/index.ts`: add `"de"` to `supportedLngs`; wire de namespace imports (stub `{}` objects for now, parallel to how `en` namespaces were seeded empty at foundation).
- `apps/native-rd/src/i18n/__tests__/i18n.test.ts`: extend bootstrap test to assert `"de"` is a supported language and that `changeLanguage("de")` resolves without error.

## Implementation Plan

### Step 1: Expand expo-localization plugin config and wire locales field in app.json

**Files**: `apps/native-rd/app.json`

**Commit**: `feat(native-rd): configure expo-localization supportedLocales and locales field`

**Changes**:

- [x] Replace the bare `"expo-localization"` entry (line 104 of current `app.json`) with:
  ```json
  [
    "expo-localization",
    {
      "supportedLocales": ["en", "de"]
    }
  ]
  ```
- [x] Add a top-level `"locales"` field inside `"expo"` (alongside `"plugins"`, `"extra"`, etc.):
  ```json
  "locales": {
    "en": "./locales/en.json",
    "de": "./locales/de.json"
  }
  ```
  The path is relative to the `app.json` file location (`apps/native-rd/`).

This commit alone is CI-greenable: `expo-localization` is already installed, the plugin accepts this shape, and the JSON files pointed to will be created in Step 2.

Note: `allowDynamicLocaleChangesAndroid` defaults to `true` in the plugin. Leave it at default for now — Android locale-change-while-foregrounded strategy is deferred per the milestone doc (#994 removed, not in scope).

### Step 2: Create locales/en.json (English native strings baseline)

**Files**: `apps/native-rd/locales/en.json` (new file)

**Commit**: `feat(native-rd): add locales/en.json native permission strings baseline`

**Changes**:

- [x] Create `apps/native-rd/locales/` directory.
- [x] Create `apps/native-rd/locales/en.json` with the following content, mirroring exactly the strings currently in `app.json` (plugin entries take precedence over `infoPlist` keys at prebuild time — the `locales` field writes to `InfoPlist.strings`, while `infoPlist` writes directly to `Info.plist`; both are needed for a complete baseline):

  ```json
  {
    "CFBundleDisplayName": "Rollercoaster.dev",
    "NSMicrophoneUsageDescription": "Allow $(PRODUCT_NAME) to record voice memos as evidence for your goals.",
    "NSCameraUsageDescription": "Allow $(PRODUCT_NAME) to use the camera to take photos as evidence.",
    "NSMicrophoneUsageDescription_video": "Allow $(PRODUCT_NAME) to record audio when capturing video evidence.",
    "NSPhotoLibraryUsageDescription": "Allow $(PRODUCT_NAME) to access your photos for evidence capture.",
    "ios": {
      "NSCameraUsageDescription": "Allow $(PRODUCT_NAME) to use the camera to take photos as evidence.",
      "NSMicrophoneUsageDescription": "Allow $(PRODUCT_NAME) to record voice memos as evidence for your goals."
    },
    "android": {
      "app_name": "Rollercoaster.dev"
    }
  }
  ```

  **Key mapping note**: The `locales` JSON structure supported by `@expo/config-plugins` uses top-level keys for `InfoPlist.strings` entries on iOS, the `"ios"` sub-key for keys written into `InfoPlist.strings` per locale, and the `"android"` sub-key for `strings.xml` values. The permission strings that need localizing are:

  | Key                              | Source in current app.json                                                  | Plugin                              |
  | -------------------------------- | --------------------------------------------------------------------------- | ----------------------------------- |
  | `NSMicrophoneUsageDescription`   | `ios.infoPlist` and `expo-audio` plugin `microphonePermission`              | `expo-audio` / `expo-camera`        |
  | `NSCameraUsageDescription`       | `expo-image-picker` `cameraPermission` and `expo-camera` `cameraPermission` | `expo-image-picker` / `expo-camera` |
  | `NSPhotoLibraryUsageDescription` | `expo-image-picker` `photosPermission`                                      | `expo-image-picker`                 |
  | `CFBundleDisplayName`            | `expo.name` ("Rollercoaster.dev")                                           | Core Expo                           |

  The exact top-level vs `ios`/`android` key structure should be validated against `@expo/config-plugins/build/utils/locales.js` behavior (reviewed in research). Top-level keys go into `InfoPlist.strings` (iOS) or `strings.xml` (Android). The `ios` sub-object keys also go into `InfoPlist.strings`. The `android` sub-object keys go into the Android `strings.xml` for that locale.

- [x] ~~Add a brief `# locales/en.json` comment block at the top of the file~~ — skipped per Discovery Log (would clutter native build output).

### Step 3: Create locales/de.json (German native strings)

**Files**: `apps/native-rd/locales/de.json` (new file)

**Commit**: `feat(native-rd): add locales/de.json German native permission strings (generated, pending review)`

**Changes**:

- [x] Create `apps/native-rd/locales/de.json` with German translations for every key in `locales/en.json`:

  ```json
  {
    "CFBundleDisplayName": "Rollercoaster.dev",
    "NSMicrophoneUsageDescription": "Erlaube $(PRODUCT_NAME), Sprachnotizen als Nachweise für deine Ziele aufzunehmen.",
    "NSCameraUsageDescription": "Erlaube $(PRODUCT_NAME), die Kamera zu verwenden, um Fotos als Nachweise aufzunehmen.",
    "NSPhotoLibraryUsageDescription": "Erlaube $(PRODUCT_NAME), auf deine Fotos zuzugreifen, um Nachweise zu erfassen.",
    "ios": {
      "NSCameraUsageDescription": "Erlaube $(PRODUCT_NAME), die Kamera zu verwenden, um Fotos als Nachweise aufzunehmen.",
      "NSMicrophoneUsageDescription": "Erlaube $(PRODUCT_NAME), Sprachnotizen als Nachweise für deine Ziele aufzunehmen."
    },
    "android": {
      "app_name": "Rollercoaster.dev"
    }
  }
  ```

  Translation notes:
  - `$(PRODUCT_NAME)` is an iOS build variable — preserve it verbatim in the German string, same as the English source.
  - "Nachweis/Nachweise" is used for "evidence" (singular/plural) to match the ND-first terminology planned for the JS resources. Confirm with native-speaker review before #76 closes.
  - "Ziel/Ziele" is used for "goal/goals". Same review gate.
  - App display name stays "Rollercoaster.dev" (brand name, not translated).
  - `app_name` on Android is also "Rollercoaster.dev" (brand name).

- [x] Add a `"_review_status"` key to `de.json` with value `"generated — requires native-speaker review before #76 closes"` so it is visible in the file and in diffs.

### Step 4: Wire "de" into the runtime i18n layer and extend tests

**Files**: `apps/native-rd/src/i18n/language.ts`, `apps/native-rd/src/i18n/index.ts`, `apps/native-rd/src/i18n/__tests__/i18n.test.ts`

**Commit**: `feat(native-rd): add "de" to i18next supportedLngs and selectSupportedLanguage`

**Changes**:

- [x] In `src/i18n/language.ts`:
  - Expand `SupportedLanguage` type: `export type SupportedLanguage = "en" | "de" | "pseudo";`
  - Replace identity stub with explicit `de` branch (early-return form).
  - Removed the `#1029` extension-marker comment.

- [x] In `src/i18n/index.ts`:
  - Add `"de"` to `supportedLngs`: `supportedLngs: ["en", "de", "pseudo"]`
  - Add empty German namespace stubs to the `resources` object.

- [x] In `src/i18n/__tests__/i18n.test.ts`:
  - Added `changeLanguage("de")` smoke test.
  - Extended namespace-registered test to cover `"de"`.

- [x] In `src/i18n/__tests__/language.test.ts`:
  - Updated the existing `test.each` row: `"de-DE locale"` now expects `"de"` (was `"en"` under the identity stub).

- [x] Create `apps/native-rd/src/i18n/resources/de/` directory with 15 `{}` namespace stub files.

## Testing Strategy

- [ ] Unit: extend `src/i18n/__tests__/i18n.test.ts` — `changeLanguage("de")` smoke test, `hasResourceBundle` check for all namespaces × `"de"` (Jest 30, no native module needed).
- [ ] TypeScript: `bun run type-check` must pass — `SupportedLanguage` union expansion and the `resources` object addition are the only type-sensitive changes.
- [ ] Lint: `bun run lint` must pass.
- [ ] Native build validation (manual, not in CI): run `npx expo prebuild --platform ios` and confirm `ios/Rollercoasterdev/Supporting/de.lproj/InfoPlist.strings` exists with the German permission strings. Run `npx expo prebuild --platform android` and confirm `android/app/src/main/res/xml/locales_config.xml` lists both `en` and `de`. Actual permission dialog rendering requires a device or simulator with language set to German — this is documented as a manual tester gate before #76 closes, not a CI gate.

## Not in Scope

| Item                                                                 | Reason                                                                    | Follow-up                                              |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------ |
| Native-speaker review of `de.json`                                   | Requires a human reviewer; this PR ships generated German as a first pass | Before #76 closes                                      |
| German translations for JS namespace JSONs (`resources/de/*.json`)   | Screen-level copy is owned by #67–#72; only stubs (`{}`) land here        | First German translation batch (step 4, milestone doc) |
| Android live locale change subscription                              | Strategy punted per milestone doc (#994 removed)                          | Post-ship if needed                                    |
| RTL support                                                          | Not a German-language concern; separate QA milestone                      | Post-first-ship                                        |
| `formatDate` / `formatEvidenceLabel` locale-aware utilities          | #62, explicitly post-ship cleanup                                         | #62                                                    |
| Plural keys (`_zero`, `_one`, `_other`) in German                    | Requires Hermes Intl spike (#66) first                                    | #66                                                    |
| Per-app language selection UI (iOS 16+ per-app language in Settings) | Out of scope for this milestone                                           | Post-beta                                              |

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->

### Implementation deviations

- [2026-05-24] Step 2 — dropped the `NSMicrophoneUsageDescription_video` key from the plan template. It is not a real iOS InfoPlist key (iOS uses a single `NSMicrophoneUsageDescription` for all microphone access contexts, including video capture audio). Including it would pollute `InfoPlist.strings` with a key iOS never reads.
- [2026-05-24] Step 2 — duplicated the four real InfoPlist keys into the `ios` sub-object so the iOS branch is explicit. Top-level keys already cover iOS in the current `@expo/config-plugins` behavior, but the duplication is harmless and makes the file's iOS surface obvious to a future reader. Plan template had a partial subset (camera + mic only) in the `ios` sub-object.
- [2026-05-24] Step 2 — skipped the `_comment` key suggested by the plan. A `_comment` would be emitted to `InfoPlist.strings` / `strings.xml` and clutter the generated native files. Plan documentation lives in this dev plan; the file itself is small and self-documenting.

### Review-pass corrections (2026-05-24)

- [2026-05-24] Reverted the top-level-plus-`ios:` duplication in `locales/{en,de}.json` (deviation above). Re-reading `@expo/config-plugins@55.0.10/build/utils/locales.js` `getResolvedLocalesAsync` showed top-level keys are merged into BOTH `InfoPlist.strings` AND Android `strings.xml`. The "belt-and-suspenders" duplication was leaking iOS-shaped keys (`NSCameraUsageDescription`, etc.) into Android resources as no-op entries. Now using pure platform-scoped form: only `ios:` and `android:` sub-objects, no top-level InfoPlist keys.
- [2026-05-24] Removed `_review_status` meta key from `locales/de.json`. The resolver does NOT strip `_`-prefixed keys; it would have been written verbatim into `de.lproj/InfoPlist.strings`. The native-speaker review gate is tracked in this dev plan and on issue #76 — that is the source of truth, not a file marker.
- [2026-05-24] Corrects an earlier research entry that read the config-plugins behavior as "Android only reads the `android` sub-object." Android `strings.xml` is built from `{ ...topLevel, ...android }`, so top-level keys leak into Android unless the file is platform-scoped.

### Pre-implementation research findings

- [2026-05-24] `expo-localization` is already registered as a bare plugin string in `app.json` line 104. It needs to be expanded to the array-with-options form to accept `supportedLocales`. The bare string form with no options currently skips all `withExpoLocalizationIos` and `withExpoLocalizationAndroid` platform logic (the plugin returns early if `supportedLocales == null` and RTL flags are not set).
- [2026-05-24] The `locales` field is handled by `@expo/config-plugins`'s core `withLocales` mod (not by `expo-localization` itself). It reads `app.json`'s `expo.locales` map and writes `InfoPlist.strings` (iOS) and locale `strings.xml` (Android) at prebuild time. The path values are resolved relative to the project root (`apps/native-rd/`).
- [2026-05-24] No `locales/` directory exists yet at `apps/native-rd/locales/`. Must be created.
- [2026-05-24] `language.ts` has a deliberate identity stub (`code === "en" ? "en" : "en"`) with a comment pointing to this exact use case. It was left as a two-branch stub waiting for German to ship.
- [2026-05-24] `src/i18n/index.ts` `supportedLngs` currently lists only `["en", "pseudo"]`. Adding `"de"` here is required for i18next to resolve German locales; without it, German device users would always fall back to `"en"` at runtime even after JS namespace translations land.
- [2026-05-24] The `locales` JSON structure for `@expo/config-plugins` uses top-level keys for iOS `InfoPlist.strings`, plus optional `"ios"` and `"android"` sub-objects. Top-level keys are merged with `ios` sub-object keys on iOS. Android only reads the `"android"` sub-object. This was confirmed by reading `@expo/config-plugins@55.0.10/build/utils/locales.js` directly.
- [2026-05-24] Issue #76 (closeout gate) is open. This issue blocks it. No inbound blockers on this PR.
