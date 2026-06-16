# Expo SDK 55 → 56 Upgrade

**Status:** Executed (static gates green) — see _Execution outcome_ below. Native rebuild still pending.
**Date:** 2026-06-16
**Owner:** Joe
**Goal:** Bump `apps/native-rd` from Expo SDK 55 to 56 (React Native 0.83 → 0.85, React stays 19.2) with the minimum correct set of code and config changes, on branch `dependencies/expo-55-56`.

---

## Why this, why now

The branch `dependencies/expo-55-56` exists to take native-rd to SDK 56, but no work has started — the app is still on `expo@~55.0.25` / `react-native@0.83.6`. SDK 56 brings RN 0.85, faster builds, and the new stable Expo UI/file-system APIs, but the immediate driver is staying on a supported SDK before the gap widens.

Before planning, the codebase was audited against the [SDK 56 changelog](https://expo.dev/changelog/sdk-56) and the [Expo Router 55→56 migration guide](https://docs.expo.dev/router/migrate/sdk-55-to-56/). The headline result: **most of SDK 56's breaking changes don't touch this app**, and the entire router migration guide is irrelevant here.

## Scoping finding: the router migration does NOT apply

This app uses **bare React Navigation v7** directly (`src/navigation/` — `createNativeStackNavigator`, `createBottomTabNavigator`), and **`expo-router` is not installed**. The headline SDK 56 breaking change ("expo-router decoupled from react-navigation") and the whole 55→56 router migration guide do not apply. `@react-navigation/*` stays a normal dependency; existing imports across `src/screens/**` and `src/navigation/**` remain valid; no `expo-codemod` is needed.

## Audit of SDK 56 breaking changes vs this codebase

| SDK 56 breaking change                                | Applies?   | Why                                                                                             |
| ----------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------- |
| expo-router decoupled from react-navigation           | **No**     | expo-router not installed; bare RN v7                                                           |
| `expo-file-system` `copy()`/`move()` now async        | **Yes**    | 4 sync call sites (see below)                                                                   |
| `expo/fetch` is now the global `fetch`                | Low risk   | No `fetch()` call sites in `src/`; opt-out `EXPO_PUBLIC_USE_RN_FETCH=1` if a regression appears |
| `@expo/vector-icons` no longer a default dep          | **No**     | Not used anywhere                                                                               |
| `@expo/dom-webview` default WebView                   | **No**     | `react-native-webview` not used                                                                 |
| Calendar/Contacts/MediaLibrary legacy APIs deprecated | **No**     | Not used                                                                                        |
| Min iOS 16.4 (was 15.1), Xcode 26.4                   | Infra note | No explicit `deploymentTarget`; inherits Expo default — verify EAS image                        |

## Changes

### 1. Bump Expo SDK and aligned packages

```
bunx expo install expo@^56
bunx expo install --fix
```

`expo install --fix` realigns every `expo-*` package and the RN-ecosystem packages it owns (`react-native@0.85`, `react-native-screens`, `react-native-safe-area-context`, `react-native-svg`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-worklets`). React stays `19.2`.

**Community packages Expo does not own** — verify each against RN 0.85 and bump manually if needed:
`react-native-unistyles`, `react-native-nitro-modules`, `react-native-quick-crypto`, `react-native-keyboard-controller`, `react-native-edge-to-edge`, `react-native-view-shot`, `@react-native-community/datetimepicker`, `@react-navigation/*` (v7 — confirm a patch supporting RN 0.85; no API change expected).

Then run `bunx expo-doctor` and resolve any version-mismatch warnings.

### 2. Fix `expo-file-system` async copy/move (the one code change)

`File.copy()`/`File.move()` now return Promises. The three storage helpers are declared **synchronous** and their callers expect sync returns. Preserve behavior with the new `*Sync` variants (the changelog explicitly provides `copySync()`/`moveSync()`):

- `src/utils/videoStorage.ts:43` — `source.move(...)` → `source.moveSync(...)`
- `src/utils/videoStorage.ts:52` — `source.copy(...)` → `source.copySync(...)`
- `src/utils/fileStorage.ts:90` — `source.copy(...)` → `source.copySync(...)`
- `src/utils/imageStorage.ts:28` — `source.copy(...)` → `source.copySync(...)`

Minimal, drop-in fix — no signature or caller changes. Going async would ripple into every caller for no benefit; these copies already ran synchronously on SDK 55.

> Leave `src/badges/badgeImageGenerator.ts:127` alone — `pixelData.copy(...)` is a Node `Buffer.copy`, unrelated to expo-file-system.

### 3. Config touch-ups (verify, likely no change)

- `app.json`: no explicit iOS `deploymentTarget`; SDK 56 default rises to 16.4 automatically. The `expo-build-properties` plugin sets `ios.buildReactNativeFromSource: true` — leave as-is unless the build breaks (SDK 56 adds precompiled XCFrameworks, but source builds still work).
- `eas.json`: confirm the EAS build image supports Xcode 26.4 for SDK 56 (Expo picks a compatible default; no edit expected).

## Verification

1. **Static gates** (repo root): `bun install`, then `bun run type-check`, `bun run lint`, `bun run test` — the storage-util and screen tests exercise the file-system paths.
2. **`bunx expo-doctor`** — clean, no dependency-version warnings.
3. **Native rebuild required** (RN 0.85 = new native binaries). Build a fresh dev client locally — do **not** run `eas build`/`eas submit` (off-limits per project rules). Use `bun run native:ios` / `bun run native:android` (or `bunx expo run:ios`). On first launch, smoke-test the changed FS paths:
   - Record a video → confirm it persists (move path, `videoStorage.ts`).
   - Pick a video / image / file from the OS picker → confirm it copies into app storage (copy paths in all three util files).
   - Capture a badge / evidence flow end-to-end → no FS errors in the console.
4. **fetch sanity** (low risk): exercise a network call (badge bake / sync) once on-device; if it regresses, set `EXPO_PUBLIC_USE_RN_FETCH=1` in `.env`.

## Out of scope (explicitly)

- Expo Router migration / `expo-codemod` — not installed.
- `@expo/vector-icons` → `@react-native-vector-icons` codemod — not used.
- Adopting new SDK 56 features (Expo UI stable, Stack v5 toolbar, FS task/progress APIs) — separate follow-ups, not part of the version bump.

## Commits (atomic)

1. `chore(native-rd): bump to Expo SDK 56` — `expo install --fix` + dev-dep/test-tooling bumps (`package.json` + `bun.lock`).
2. `fix(native-rd): use copySync/moveSync for expo-file-system SDK 56` — the 4 storage call sites + their 3 test mocks.
3. `test(native-rd): align Jest + RN 0.85 test expectations for SDK 56` — `jest.config.js`, `jest.resolver.js`, BadgeEarnedModal Image-source normalization.
4. `chore(native-rd): SDK 56 config + lint adjustments` — `app.json` schema migration (`newArchEnabled`/`splash` → `expo-splash-screen` plugin) + `eslint.config.js` react-hooks `warn` overrides.

## Execution outcome (2026-06-16)

The headline audit held: bare React Navigation untouched, no router migration, the 4 FS sync call sites were the only production-code change. But execution surfaced several items the plan had marked "likely no change" — all genuinely SDK-56-driven:

- **`@sentry/react-native` downgrade reverted.** `expo install --fix` tried to pin `~8.14.0` → `~7.11.0` (SDK 56's bundled list lags the Sentry release; 8.14.0 is npm `latest` and deliberately chosen in #1016). Reverted to `~8.14.0` and added to `expo.install.exclude` so future `--fix` runs don't re-downgrade it.
- **Jest preset moved (RN 0.85).** `react-native/jest/*` was extracted to the separate `@react-native/jest-preset@0.85.3` package. Installed it and repointed `testEnvironment`, `setupFiles`, and `jest.resolver.js` (3 references).
- **`react-test-renderer` aligned.** `--fix` bumped React to `19.2.3` but left `react-test-renderer` at `19.2.0`; `@testing-library/react-native` enforces a match. Bumped to `19.2.3`.
- **Test mocks updated.** The 3 storage-util test mocks defined `File.copy/move`; updated to `copySync/moveSync` to match the production change. `BadgeEarnedModal` test: RN 0.85 normalizes the host `Image` `source` prop to an array (`[{uri}]`) — added a flatten helper so the assertion is shape-agnostic.
- **`app.json` schema migration.** SDK 56 dropped `newArchEnabled` (new arch is the only mode) and the top-level `splash` block. Removed both; installed `expo-splash-screen@56.0.10` and moved the splash config to its plugin (behaviour-preserving).
- **Lint: react-hooks v6.** `eslint-config-expo@56` enables `eslint-plugin-react-hooks` v6 at `error`, surfacing **40 pre-existing findings** across ~17 files (none from this bump). Per decision, downgraded the 5 affected rules to `warn` in `eslint.config.js` and filed **#319** to fix them and restore `error`. Also bumped the SDK-coupled dev deps (`babel-preset-expo`, `eslint-config-expo`, `jest-expo`) to 56.

**Static gates:** `type-check` ✅, `lint` ✅ (0 errors, warnings only), `test` ✅ (177 suites / 8852 tests).

**`expo-doctor`:** the one SDK-56-introduced failure (config schema) is fixed. Three checks still fail, all pre-existing/environmental and out of scope for this bump:

- Metro `resolver.unstable_enableSymlinks` — intentional, committed override required for Bun's symlinked `node_modules`.
- Missing peer `@react-native-community/slider` — Storybook-only (`@storybook/addon-ondevice-controls`); never in `package.json`.
- Duplicate native modules — inherent Bun-monorepo slot hoisting (same version under multiple peer-hash slots); survives a clean reinstall; already worked around for `react-native` in `jest.resolver.js`.
