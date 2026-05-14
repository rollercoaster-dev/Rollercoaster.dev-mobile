# Dependabot / SDK 55 — Finish Plan

> Imported from `openbadges-monorepo` on 2026-05-14. Waves that target `apps/openbadges-modular-server` or `apps/openbadges-system` (e.g. W2.1, W2.4) are historical context — those apps are not part of this repo. Only the native-rd-specific waves are actionable here.

**Companion docs:**

- Source plan (rationale + design): [`../completed/issue-1044-expo-sdk-55-source-plan.md`](../completed/issue-1044-expo-sdk-55-source-plan.md)
- Original status snapshot (Wave 0, superseded): [`../completed/issue-1044-expo-sdk-55-status.md`](../completed/issue-1044-expo-sdk-55-status.md)
- Tracking issue: [#1044](https://github.com/rollercoaster-dev/monorepo/issues/1044)
- Merged PR: [#1045](https://github.com/rollercoaster-dev/monorepo/pull/1045)

**Last updated:** 2026-05-10 (post-#1045 merge, after #1046 regenerated)

---

## How to resume from cold context

If you're reading this with no conversation history, here's the orientation:

1. The Expo SDK 54 → 55 migration **shipped** in PR #1045, merged 2026-05-10 12:54 UTC (`de74755b`).
2. Wave 0 (the SDK 55 PR itself) is **done**.
3. Wave 1 (split bundled dependabot PRs) is **active**.
4. Wave 2 (file tracking issues for deferred majors) is **pending**.
5. There is no in-flight work on disk — the working tree should be clean.
6. Recommended starting branch: `main`. Run `git checkout main && git pull` before Wave 1 work.

To verify state matches what this plan assumes:

```bash
git log origin/main --oneline -3   # should include de74755b "Merge pull request #1045"
gh pr list --state open --search "dependabot" --json number,title,mergeStateStatus
```

---

## ✅ Wave 0 — DONE (PR #1045)

**Merged:** 2026-05-10 12:54 UTC, commit `de74755b`.

**What landed:**

- Expo SDK 54 → 55 (atomic), per `bunx expo install --fix`
- React 19.1.0 → 19.2.0, RN 0.81.5 → 0.83.6
- Reanimated 4.1 → 4.2.1, Worklets 0.5.1 → 0.7.4
- All `expo-*` packages aligned to SDK-55 pins
- `@sentry/react-native` 8.10 → 7.11 (forced by SDK 55's `bundledNativeModules.json` — revisit when Expo bumps the pin)
- `app.json`: explicit `expo-font` plugin, dropped duplicate Sentry plugin entry
- `src/services/sentry.ts`: removed `attachAllThreads` (v8-only); v7's `attachThreads: false` preserves privacy posture
- `scripts/run-ios.sh`: `--device "${IOS_DEVICE_ID}"` is now gated behind a non-E2E check, so destructive Maestro flows can never reinstall on a developer's daily-driver iPhone

**Verified in #1045:**

- ✅ All 11 CI checks green (typecheck, lint, unit, integration, build, E2E, CodeQL, CodeRabbit, native-rd CI, docs freshness)
- ✅ iOS Debug compile (`xcodebuild ... -sdk iphonesimulator`) — 0 errors
- ✅ Android Debug compile (`./gradlew :app:assembleDebug`) — 314 MB Debug APK, 0 errors
- ✅ Runtime on iPhone 17 Pro sim: app boots, JS bundle executes, WelcomeScreen renders, no Sentry/Reanimated init errors
- ✅ Badge creation flow exercised end-to-end manually (covers OB3 self-signing, expo-sqlite, Reanimated)

**Pre-existing followup, not blocking merge:**

- `e2e/flows/goal-lifecycle-complete.yaml` Maestro flow has stale selectors from in-flight UI work. Not introduced by SDK 55. Tracked as W2.7 below.

---

## Active wave: Wave 1 — Split bundled dependabot PRs

### Live state (2026-05-10, post-#1045-merge)

| PR        | Title                                                                   | Status     | Action                     |
| --------- | ----------------------------------------------------------------------- | ---------- | -------------------------- |
| **#1046** | prod-deps group, **23 updates** (regenerated successor to closed #1043) | `UNSTABLE` | Split — see §1.2           |
| **#1033** | dev-deps group, 11 updates                                              | `UNSTABLE` | Split — see §1.1           |
| #1041     | `react-native-view-shot` 4 → 5                                          | `CLEAN`    | **Defer to SDK 56** — W2.2 |
| #1035     | `@hono/zod-openapi` 0.19 → **1.4.0**                                    | `CLEAN`    | Migrate as own PR — W2.1   |

**Important finding from #1046's diff:** dependabot is _still_ proposing trojan-horse RN/Expo bumps even after SDK 55 merged. Specifically `react-native 0.83.6 → 0.85.3` (which violates SDK 55's pin), `react-native-reanimated 4.2.1 → 4.3.1`, `react-native-worklets 0.7.4 → 0.8.3`, `react-native-quick-crypto 1.0.12 → 1.1.2`, plus all `@react-navigation/*` and `@storybook/*-ondevice`. Same split-and-defer pattern as #1034 originally. **Do not merge #1046 as-is.**

### 1.1 Split #1033 → `chore/deps/dev-deps-safe`

```bash
git checkout main && git pull
git checkout -b chore/deps/dev-deps-safe
```

**Keep in the new branch:**

- `@types/node` 25.6.0 → 25.6.2
- `turbo` 2.9.7 → 2.9.10
- `terser` 5.46.2 → 5.47.1
- `vue-tsc` 3.2.7 → 3.2.8
- `@babel/preset-env` 7.29.3 → 7.29.5
- `react-test-renderer` 19.1.0 → 19.2.6 _(safe — paired with React 19.2 already in main)_
- `kysely` 0.28.16 → 0.28.17
- `postcss` 8.5.12 → 8.5.14

**Drop (each gets its own ticket — Wave 2):**

- `jest` 30.3 → 30.4.1 (regression — W2.3)
- `babel-jest` 30.3 → 30.4.1 (same release line as jest — W2.3)
- `unplugin-vue-router` 0.12 → 0.19 (7-minor jump — W2.4)

**Verify before push:**

```bash
bun install
bun run type-check
bun run lint
bun --filter openbadges-system test
bun --filter native-rd test:ci
```

**Close #1033** with a comment linking to the new safe-PR.

### 1.2 Split #1046 → `chore/deps/prod-deps-safe`

```bash
git checkout main && git pull
git checkout -b chore/deps/prod-deps-safe
```

**Keep in the new branch (web-app patches, all SDK-55-safe):**

- `vue` 3.5.33 → 3.5.34
- `hono` 4.12.16 → 4.12.18
- `@typescript-eslint/eslint-plugin` 8.59.1 → 8.59.2
- `@typescript-eslint/parser` 8.59.1 → 8.59.2
- `nock` 14.0.14 → 14.0.15

**Drop (one or more become Wave 2 tickets):**

- `react 19.2.0 → 19.2.6` — patch but RN-paired, hold with React Native
- `react-dom 19.2.0 → 19.2.6` — same
- `react-native 0.83.6 → 0.85.3` — **violates SDK 55 pin**, blocked till SDK 56 — W2.2-adj
- `react-native-reanimated 4.2.1 → 4.3.1` — needs SDK 55 compat verification — defer
- `react-native-worklets 0.7.4 → 0.8.3` — pairs with reanimated — defer
- `react-native-gesture-handler 2.30.1 → 2.31.2` — defer
- `react-native-keyboard-controller 1.20.7 → 1.21.7` — defer
- `react-native-safe-area-context 5.6.2 → 5.7.0` — defer
- `react-native-screens 4.23.0 → 4.24.0` — defer
- `react-native-svg 15.15.3 → 15.15.4` — defer
- `react-native-quick-crypto 1.0.12 → 1.1.2` — W2.5
- `@react-native-community/slider 5.1.2 → 5.2.0` — RN-version-sensitive, verify
- `@react-navigation/*` (3 packages) — defer with RN bumps
- `@storybook/react-native + addons` 10.3.2 → 10.4.0 — Storybook RN 10.4 requires RN ≥ 0.83 (we're at 0.83.6 so probably OK, verify on SDK 55)

**Verify before push:** same commands as 1.1.

**Close #1046** with a comment linking to the new safe-PR.

### Wave 1 exit criteria

- Two safe-bump PRs merged.
- #1033 and #1046 closed with linking comments.
- CI green on `main` for one cycle before Wave 2.

---

## Wave 2 — Tracking issues for deferred majors

These are pure GitHub paperwork. Auto-mode policy: **do not file these without explicit user direction** — they post to a work tracker and shouldn't be created autonomously.

### Files to create

When directed, file these seven issues on `rollercoaster-dev/monorepo`. Templates below are minimal — flesh out per project conventions.

| #    | Title                                                      | Body anchor                                                                                                                                                                                                    |
| ---- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W2.1 | `chore: migrate @hono/zod-openapi 0.19 → 1.4.0`            | Touches `apps/openbadges-modular-server/src/api/controllers/assets.controller.ts`. Read v1.0 release notes — `OpenAPIHono`/`createRoute` signatures changed. Smoke `/swagger` + `/openapi.json`. Closes #1035. |
| W2.2 | `chore: bump react-native-view-shot 4 → 5`                 | **Defer to SDK 56.** v5 needs RN ≥ 0.84; SDK 55 caps us at 0.83.6. Park with `blocked-by: sdk-56` label. Closes #1041.                                                                                         |
| W2.3 | `chore: jest 30.4.x regression — pin or wait`              | Wait for 30.4.2+ or upstream fix to `_moduleMocker.clearMocksOnScope`. If dependabot keeps re-proposing, pin `jest@30.3.0` in root `package.json` `overrides`.                                                 |
| W2.4 | `chore: migrate unplugin-vue-router 0.12 → 0.19`           | 7-minor jump. Affects auto-generated route types in `apps/openbadges-system/typed-router.d.ts`. Smoke test all routes.                                                                                         |
| W2.5 | `chore: bump react-native-quick-crypto 1.0.12 → 1.1.2`     | Not managed by `expo install`. OB3 self-signing depends on this — add a sign-and-verify integration test before merging.                                                                                       |
| W2.6 | `chore: revisit Sentry RN v8 on SDK 55`                    | Re-evaluate when Expo bumps `@sentry/react-native` in `bundledNativeModules.json` for SDK 55.x or SDK 56. Currently pinned at v7.11.0.                                                                         |
| W2.7 | `chore(native-rd): patch Maestro flows after dev UI drift` | `goal-lifecycle-complete.yaml` first-assertion fails — selectors stale relative to current UI. Manual walkthrough of badge flow passes. Not introduced by SDK 55.                                              |

### Wave 2 exit criteria

- All seven issues filed.
- This finish plan moved to [`docs/plans/completed/`](../completed/) once Wave 1 + Wave 2 are done, per the AGENTS.md plan-storage convention. The Wave 0 source plan and status snapshot are already archived there.

---

## Suggested execution order from cold

1. **Verify orientation:**
   ```bash
   git checkout main && git pull
   git log --oneline -3   # confirm de74755b is the SDK 55 merge
   gh pr list --search "dependabot" --state open --json number,title,mergeStateStatus
   ```
2. **File Wave 2 tickets** (W2.1–W2.7) — only when explicitly directed. Captures deferred work so it doesn't get lost.
3. **Execute Wave 1.1** — split #1033 → `chore/deps/dev-deps-safe`. Open PR, get review, merge.
4. **Wait for CI green on `main`** for one cycle.
5. **Execute Wave 1.2** — split #1046 → `chore/deps/prod-deps-safe`. Open PR, get review, merge.

---

## Permanent caveats / context

- **Trojan-horse pattern is recurring.** Dependabot keeps proposing `react-native 0.85.3` even though Expo SDK 55 pins 0.83.6. This is structural, not a one-off. Until we leave Expo's managed workflow or SDK 56 lands, every regenerated prod-deps group will need filtering.
- **`bundledNativeModules.json` is the source of truth** for "which version pairs are blessed by Expo SDK 55." Live at `node_modules/.bun/expo@55.*/node_modules/expo/bundledNativeModules.json`. Use it to validate any `react-native-*` or `@sentry/react-native` bump before merging.
- **CI cannot validate native compile.** Until #901 (Mac mini self-hosted runner) lands, native build verification is local-only on a developer's Mac. Plan accordingly for any future SDK bump.
- **`bun run native:ios:e2e` always uses a simulator** (not the dev's `IOS_DEVICE_ID`). Plain `bun run native:ios` still respects `IOS_DEVICE_ID` for on-device dev iteration. This contract is enforced in `apps/native-rd/scripts/run-ios.sh` — change deliberately.
