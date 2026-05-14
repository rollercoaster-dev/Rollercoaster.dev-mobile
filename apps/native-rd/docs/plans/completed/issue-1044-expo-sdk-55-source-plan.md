# Dependabot PR Triage & Merge Plan (May 2026)

> Imported from `openbadges-monorepo` on 2026-05-14 as historical record. References to `apps/openbadges-modular-server` and `apps/openbadges-system` are monorepo siblings not present in this repo; only the native-rd-related portions (Expo SDK 55, jest, react-native) are relevant going forward.

## Context

Dependabot opened 10 PRs against `main` (#1033–#1042). On the surface they look like routine bumps, but two are **trojan horses**:

- **#1034 "production-dependencies group"** silently bundles the **Expo SDK 54 → 55** upgrade (expo, react-native 0.81→0.85, react 19.1→19.2, reanimated, worklets, screens, nitro, gesture-handler, keyboard-controller, quick-crypto) inside a list of patch-level web-app bumps. It's also marked `DIRTY` (merge conflicts).
- **#1033 "dev-dependencies group"** bumps **jest 30.3.0 → 30.4.1**, which has a regression (`this._moduleMocker.clearMocksOnScope is not a function`) that crashes all 136 native-rd test suites at load time. CI is red because of this.

Treating either as a routine green-tick merge would either land an unplanned SDK upgrade on `main` or break CI for every downstream PR. The remaining seven PRs (#1036–#1042) are SDK-55 components that **must** ship together with the SDK bump — they cannot merge in isolation. #1035 is a separate `@hono/zod-openapi` 0.19→1.3 major bump that touches `apps/openbadges-modular-server/src/api/controllers/assets.controller.ts`.

The plan below sorts these into three waves: split out the safe patches and merge first, defer the SDK upgrade into a single coordinated migration PR, and handle each remaining major bump as its own ticket.

---

## PR Inventory

| PR    | Group / Package              | Risk                                                              | Decision                         |
| ----- | ---------------------------- | ----------------------------------------------------------------- | -------------------------------- |
| #1033 | dev-deps group (11)          | jest 30.3→30.4.1 breaks all native-rd jest suites                 | **Split**                        |
| #1034 | prod-deps group (25)         | Hides Expo SDK 54→55 + RN 0.81→0.85 + React 19.2; merge conflicts | **Split + close**                |
| #1035 | `@hono/zod-openapi` 0→1      | Major; touches `assets.controller.ts`                             | **Defer (own ticket)**           |
| #1036 | `expo-font` 14→55            | SDK-55 component                                                  | **Fold into SDK PR**             |
| #1037 | `babel-preset-expo` 54→55    | SDK-55 component                                                  | **Fold into SDK PR**             |
| #1038 | `expo` 54→55                 | SDK-55 root                                                       | **Fold into SDK PR**             |
| #1039 | `jest-expo` 54→55            | SDK-55 component                                                  | **Fold into SDK PR**             |
| #1040 | `expo-file-system` 19→55     | SDK-55 component                                                  | **Fold into SDK PR**             |
| #1041 | `react-native-view-shot` 4→5 | Major bump, RN-version-sensitive                                  | **Defer (with SDK PR or after)** |
| #1042 | `expo-camera` 17→55          | SDK-55 component                                                  | **Fold into SDK PR**             |

---

## Wave 1 — Safe patches (merge today)

Goal: capture the trivial bumps so we don't have to re-resolve conflicts on every other PR while we plan the SDK migration.

### 1a. Split #1033 → keep only safe dev-deps

Close #1033, ask dependabot to recreate as smaller groups, OR push a manual branch `chore/deps/dev-deps-safe` containing only:

- `@types/node` 25.6.0 → 25.6.2
- `turbo` 2.9.7 → 2.9.10
- `terser` 5.46.2 → 5.47.1
- `vue-tsc` 3.2.7 → 3.2.8
- `@babel/preset-env` 7.29.3 → 7.29.5
- `react-test-renderer` 19.1.0 → 19.2.6 — **HOLD**: must pair with React 19.2 in Wave 2; do not bump alone or web tests will mismatch
- `kysely` 0.28.16 → 0.28.17
- `postcss` 8.5.12 → 8.5.14

**Drop / hold for own ticket:**

- `jest` 30.3.0 → 30.4.1 — known regression, see CI run 25561354190; pin `30.3.0` in `bun pm trust`/`overrides` if needed, or wait for 30.4.2+
- `babel-jest` 30.3.0 → 30.4.1 — same release line as jest, hold
- `unplugin-vue-router` 0.12.0 → 0.19.2 — minor-but-large jump (7 minor versions), needs its own PR with manual smoke test of `apps/openbadges-system` routes

### 1b. Split #1034 → keep only safe production-deps

Close #1034 (it has conflicts anyway). Recreate as `chore/deps/prod-deps-safe` with only:

- `vue` 3.5.33 → 3.5.34
- `hono` 4.12.16 → 4.12.18
- `@typescript-eslint/eslint-plugin` 8.59.1 → 8.59.2
- `@typescript-eslint/parser` 8.59.1 → 8.59.2
- `@sentry/react-native` 8.10.0 → 8.11.0 — _only if_ SDK-55 PR isn't going up the same day; otherwise fold into Wave 2
- `nock` 14.0.14 → 14.0.15

**Hold for Wave 2 (Expo SDK 55 PR):**

- `react` 19.1.0 → 19.2.6
- `react-dom` 19.1.0 → 19.2.6
- `react-native` 0.81.5 → 0.85.3
- `react-native-gesture-handler` 2.28.0 → 2.31.2
- `react-native-keyboard-controller` 1.18.5 → 1.21.7
- `react-native-nitro-modules` 0.33.9 → 0.35.6
- `react-native-quick-crypto` 1.0.12 → 1.1.2
- `react-native-reanimated` 4.1.7 → 4.3.1
- `react-native-safe-area-context` 5.6.2 → 5.7.0
- `react-native-screens` 4.16.0 → 4.24.0
- `react-native-svg` 15.12.1 → 15.15.4
- `react-native-worklets` 0.5.1 → 0.8.3
- `@react-native-community/slider` 5.0.1 → 5.2.0
- `@react-navigation/*` (3 packages)
- `@storybook/*-ondevice-*` 10.3.2 → 10.4.0 — Storybook RN 10.4 requires RN ≥ 0.83; verify before folding

**Verify Wave 1 locally before pushing:**

- `bun install`
- `bun run type-check`
- `bun run lint`
- `bun --filter native-rd test:ci:smoke` (just confirms suite loads, doesn't run tests)
- `bun --filter openbadges-system test`

---

## Wave 2 — Expo SDK 55 migration (its own ticket, this week)

Open a tracked issue: **"chore(native-rd): upgrade to Expo SDK 55"**. Close PRs #1036, #1037, #1038, #1039, #1040, #1042 and roll their changes into one coordinated branch.

### Why one PR

Expo SDK upgrades modify the JS↔native bridge contract. Mixing SDK 54 `expo-camera` with SDK 55 `expo-file-system` will either fail at install (peer-dep mismatch) or crash at runtime (incompatible TurboModule signatures). The Expo team's own guidance is `npx expo install --fix` after bumping the `expo` SDK pin — which is exactly the atomic operation dependabot can't do.

### Procedure

1. Branch `chore/native-rd/expo-sdk-55` off main (post Wave 1).
2. In `apps/native-rd/package.json` set `"expo": "~55.0.23"` then run from `apps/native-rd/`:
   ```bash
   bunx expo install --fix
   ```
   (per memory: `feedback_eas_expo_cwd.md` — must `cd apps/native-rd` first or expo writes a stub `app.json` at cwd).
3. Bump in lockstep in the same PR:
   - `expo`, `expo-asset`, `expo-audio`, `expo-build-properties`, `expo-camera`, `expo-dev-client`, `expo-document-picker`, `expo-file-system`, `expo-font`, `expo-haptics`, `expo-image-picker`, `expo-secure-store`, `expo-sharing`, `expo-sqlite`, `expo-status-bar`, `expo-video`
   - `react` 19.2.6, `react-dom` 19.2.6, `react-native` 0.85.3
   - `react-native-reanimated` 4.3.1, `react-native-worklets` 0.8.3
   - `react-native-screens` 4.24.0, `react-native-gesture-handler` 2.31.2, `react-native-keyboard-controller` 1.21.7, `react-native-safe-area-context` 5.7.0, `react-native-svg` 15.15.4
   - `react-native-nitro-modules` 0.35.6, `react-native-quick-crypto` 1.1.2
   - `jest-expo` 55.0.17, `babel-preset-expo` 55.0.21
   - `react-test-renderer` 19.2.6 (held from Wave 1a)
   - `@storybook/react-native` 10.4.0 (+ ondevice addons) — verify SDK-55 compat
4. Read Expo SDK 55 changelog for **breaking changes**. Of note:
   - React 19.2 changes how `useEffect` cleanup runs in dev (StrictMode double-fire moved earlier); inspect timer-heavy hooks in `apps/native-rd/src/hooks/`.
   - `expo-file-system` next API was stabilised in SDK 54 → 55 may have removed legacy `FileSystem.documentDirectory`; check usages in `apps/native-rd/src/db/` and the badge-portfolio writers.
   - `react-native-reanimated` 4.3 + `worklets` 0.8 require matching native pods; iOS pod install must succeed.
5. Verify against the Expo SDK 55 React Native version requirement; confirm `react-native@0.85.3` is the SDK 55 pin (Expo enforces a specific RN; do not drift).
6. Update `apps/native-rd/ios/Podfile.lock` via `bunx pod-install` (from `apps/native-rd/`).
7. Consult `apps/native-rd/.claude/skills/native-rd-ios-build/` skill for the iOS rebuild playbook (memory ref: `native_rd_ios_build_gotchas.md`).

### Verification (Wave 2)

- `bun install` (from monorepo root)
- `bun --filter native-rd type-check`
- `bun --filter native-rd test:ci`
- `bun --filter native-rd lint`
- iOS: `bun --filter native-rd ios` (boot in simulator, hit `/`, `/goals`, `/badges`, exercise camera + file system + haptics + secure-store)
- Android: `bun --filter native-rd android`
- E2E: `bun --filter native-rd test:e2e` (Maestro)
- Sentry: confirm release events still post (Sentry RN may need a config tweak between 8.10 and 8.11)

### Critical files to inspect

- `apps/native-rd/package.json`
- `apps/native-rd/ios/Podfile`, `apps/native-rd/ios/Podfile.lock`
- `apps/native-rd/app.json` (SDK version field)
- `apps/native-rd/babel.config.js` (preset-expo + reanimated plugin order — reanimated plugin MUST be last)
- `apps/native-rd/metro.config.js`
- `apps/native-rd/src/db/` (expo-sqlite + expo-file-system usage)
- `apps/native-rd/jest.config.js` + `apps/native-rd/scripts/jest-node.sh` (jest-expo preset version)

---

## Wave 3 — Major-version one-offs (separate tickets, this/next week)

Each gets its own PR with a manual diff + smoke test. **Order matters only between #1041 and Wave 2** (RN-aware).

### #1035 — `@hono/zod-openapi` 0.19.10 → 1.3.0

- Single consumer: `apps/openbadges-modular-server/src/api/controllers/assets.controller.ts`
- Read the v1.0 release notes — `OpenAPIHono`/`createRoute` signatures changed (notably how `responses` schemas are typed and middleware composition).
- Verify: `bun --filter openbadges-modular-server type-check && bun --filter openbadges-modular-server test`
- Hit `/swagger` and `/openapi.json` locally to confirm spec generation still works.

### Jest 30.3 → 30.4.x (deferred from #1033)

- Wait for **30.4.2+** or upstream fix to `_moduleMocker.clearMocksOnScope` regression; check https://github.com/jestjs/jest/issues for the open ticket before retrying.
- If forced: pin `jest@30.3.0` in root `package.json` `overrides` to keep dependabot from re-proposing 30.4.x until a fix lands.

### `unplugin-vue-router` 0.12 → 0.19 (deferred from #1033)

- 7-minor jump. Read CHANGELOG for `apps/openbadges-system`. Likely affects auto-generated route types under `apps/openbadges-system/typed-router.d.ts` (or similar).
- Verify: dev server boots, all routes resolve, type-check passes.

### #1041 — `react-native-view-shot` 4 → 5

- Land **after** Wave 2 (v5 expects RN ≥ 0.84).
- Find usages: likely badge-portfolio screenshot/share flow in native-rd. Smoke-test the share path.

### #1034 leftovers requiring inspection

- `react-native-quick-crypto` 1.0.12 → 1.1.2 — folds into Wave 2 (RN-paired). This package is load-bearing for OB3 self-signing (memory: `native-rd` crypto stack); add a test that signs and verifies a credential before merging.

---

## Verification (overall)

After each wave merges to main:

1. `git pull && bun install` clean from a fresh checkout
2. `bun run type-check && bun run lint && bun test` from monorepo root
3. CI green on `main` for at least one cycle before opening the next wave
4. `bun --filter native-rd ios` boot for any wave touching native-rd

---

## Summary of immediate actions (in order)

1. Comment on #1033 + #1034 explaining the split (so the audit trail is clear) and **close** them.
2. Open `chore/deps/dev-deps-safe` PR (Wave 1a list).
3. Open `chore/deps/prod-deps-safe` PR (Wave 1b list).
4. Open tracking issue **"Upgrade native-rd to Expo SDK 55"**; close #1036, #1037, #1038, #1039, #1040, #1042 with a link to it.
5. Open issues for jest 30.4 regression, `unplugin-vue-router` 0.19, `@hono/zod-openapi` 1.x, `react-native-view-shot` 5.
6. Schedule Wave 2 (SDK 55) for a dedicated work block — not during a release window.
