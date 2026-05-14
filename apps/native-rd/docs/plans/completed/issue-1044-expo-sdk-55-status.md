# Dependabot / SDK 55 Status

> Imported from `openbadges-monorepo` on 2026-05-14 as historical record. References to `apps/openbadges-*` are monorepo siblings not present in this repo.

> **✅ SUPERSEDED — Wave 0 closed.** PR #1045 merged 2026-05-10 12:54 UTC (`de74755b`).
> See [`../active/issue-1044-dependabot-followup.md`](../active/issue-1044-dependabot-followup.md) for the active plan (Wave 1 + Wave 2).
> This file is retained as the historical snapshot taken on 2026-05-08 before the merge.

Source plan: [`issue-1044-expo-sdk-55-source-plan.md`](issue-1044-expo-sdk-55-source-plan.md)
Tracking issue: **#1044** (Expo SDK 55 epic, native-rd)
Merged PR: **#1045** (`chore/native-rd/expo-sdk-55`, merged 2026-05-10)

Last updated: 2026-05-08 (after iOS prebuild + Sentry verification)

---

## Done

### Issue triage

- **#1044** opened — Expo SDK 55 tracking epic (native-rd)
- **#1045** opened (draft) on `chore/native-rd/expo-sdk-55`
- Closed **#1036, #1037, #1038, #1039, #1040, #1042** with comments linking to #1044

### #1045 contents

- `package.json`:
  - `expo ~55.0.23`, `react-native 0.83.6`, `react 19.2.0`, `react-test-renderer 19.2.0`
  - All `expo-*` packages aligned to SDK-55 pins (per `expo install --fix`)
  - `@sentry/react-native` set to `~7.11.0` (was `8.10.0`) — see verification below
  - Reanimated 4.2.1 + Worklets 0.7.4
- `app.json`:
  - Added `expo-font` plugin (required in SDK 55)
  - Removed redundant top-level `@sentry/react-native` plugin entry (kept the `@sentry/react-native/expo` block)
- `src/services/sentry.ts`:
  - Removed `attachAllThreads: false` (v8-only). v7's `attachThreads: false` preserves the same privacy intent.

### Verified ✅

- Monorepo type-check 13/13 packages
- native-rd lint 0 errors
- native-rd `test:ci` 136 suites / 7932 tests
- `bunx pod-install` 123 pods
- **iOS prebuild green** (2026-05-08 17:59) — `npx expo prebuild --platform ios --clean` completes, CocoaPods installs cleanly
- **Sentry v7 pin verified correct** (2026-05-08, this session):
  - Expo SDK 55's `bundledNativeModules.json` explicitly pins `@sentry/react-native: ~7.11.0`
  - `bunx expo install --check @sentry/react-native` returns "Dependencies are up to date"
  - Sentry RN v8 peer-deps (`expo>=49`, `rn>=0.65`) would technically install on SDK 55, but v8 is not yet certified by Expo against SDK 55 — staying on v7 keeps us inside Expo's tested matrix
  - Privacy posture preserved: v7's single `attachThreads: false` produces equivalent output to v8's `attachThreads:false + attachAllThreads:false`

### Not yet verified ❌ (blocking #1045 readiness)

- **iOS native build** (`bun --filter native-rd ios`) — prebuild succeeded but full Xcode compile + boot has not been run yet. This is where SDK 54's `bindReactNativeFactory` would have surfaced.
- **Android prebuild + build** — `apps/native-rd/android/` is gitignored and still SDK-54-generated; `bunx expo prebuild --platform android` not yet run.
- **Sentry init at runtime** (v8→v7 downgrade)
- **OB3 self-signing round-trip** (quick-crypto path unchanged at 1.0.12)
- **expo-sqlite 16 → 55** runtime DB behavior with existing local data
- **Reanimated 4.2.1 + Worklets 0.7.4** native init on first boot
- **`jest --version` in resolved tree** (transitive jest after `jest-expo@55.0.17`)
- Maestro E2E suite

---

## Next steps (in execution order)

### Wave 0 — close out #1045 (blockers)

1. **iOS native build**: `cd apps/native-rd && bun --filter native-rd ios` — boot the app, watch the device console for Sentry init errors and Reanimated worklet errors.
2. **Android prebuild + build**: `bunx expo prebuild --platform android --clean && bun --filter native-rd android`.
3. Update PR #1045 body to note prebuild was required (current body claims pod-install was verified but doesn't note the iOS/Android compile + boot still needed).
4. Flip #1045 from draft once both platforms boot.

### Wave 1 — split safe patches out of bundled dependabot PRs

5. **Close #1033** (dev-deps grouped, 11 packages, CI failing). Recreate as `chore/deps/dev-deps-safe`:
   - Drop: `jest 30.4.x`, `babel-jest`, `unplugin-vue-router 0.19` (each gets its own tracking ticket — see Wave 2).
   - Keep: the safe patches.
6. **Close #1034** (prod-deps grouped, 25 packages, currently `DIRTY` with merge conflicts). Recreate as `chore/deps/prod-deps-safe`:
   - Drop: everything SDK-55-related (those are in #1045).
   - Keep: `vue`, `hono`, `typescript-eslint`, `nock`, etc.

### Wave 2 — open tracking issues (deferred work)

7. **`@hono/zod-openapi` 0.19 → 1.3** (#1035 still open) — needs migration of `apps/openbadges-modular-server/src/api/controllers/assets.controller.ts`.
8. **`react-native-view-shot` 4 → 5** (#1041 still open) — needs RN ≥ 0.84; SDK 55 caps us at 0.83.6, so deferred to SDK 56.
9. **jest 30.4.x regression** — track upstream fix; pin `jest@30.3.0` in root overrides if dependabot keeps re-proposing.
10. **`unplugin-vue-router` 0.12 → 0.19** migration.
11. **`react-native-quick-crypto` 1.0.12 → 1.1.2** (unmanaged by `expo install`; deferred).
12. **Sentry RN v8 revisit** (new) — re-evaluate when Expo bumps `@sentry/react-native` in `bundledNativeModules.json` for SDK 55.x or SDK 56.

---

## Decisions captured this session

### Sentry RN downgrade is correct (verified 2026-05-08)

- **Question**: is the v8 → v7 downgrade actually needed?
- **Answer**: yes for "stay on Expo's blessed set" reasons; not strictly enforced at the npm-resolution level. We keep v7.11.0 because:
  1. SDK 55's `bundledNativeModules.json` pins it.
  2. v8's native module hasn't been validated against RN 0.83's stricter New Arch enforcement.
  3. The only API delta we used (`attachAllThreads`) has equivalent behavior under v7 (`attachThreads: false`).
  4. We're prepping for TestFlight; this is not the moment to diverge from the tested matrix.
- **Revisit**: when Expo updates the SDK pin or SDK 56 lands.
