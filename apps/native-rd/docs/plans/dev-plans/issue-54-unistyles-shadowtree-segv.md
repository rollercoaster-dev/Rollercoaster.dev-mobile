# Development Plan: Issue #54

## Issue Summary

**Title**: [Sentry NATIVE-RD-4] Unistyles ShadowTreeManager::updateShadowTree SIGSEGV
**Type**: bug
**Complexity**: SMALL
**Estimated Lines**: ~80 LOC (workaround code + tests)

## Intent Verification

Observable criteria derived from the issue:

- [ ] When the device system theme is changed while the app is backgrounded, then the app is foregrounded, a SIGSEGV/SIGABRT crash in `ShadowTreeManager::updateShadowTree` does NOT occur.
- [ ] When `UnistylesRuntime.setTheme()` is called while the app is in the background (AppState !== 'active'), the call is deferred or suppressed, not fired immediately.
- [ ] After foregrounding, the deferred theme is applied correctly so the UI reflects the intended theme.
- [ ] Sentry issue NATIVE-RD-4 is marked resolved via the Sentry API.

_Note: deterministic reproduction in a local emulator has NOT been confirmed. Success criteria for the first two points may need to be validated via the reproduction strategy below rather than automated tests._

## Dependencies

| Issue | Title | Status |
| ----- | ----- | ------ |
| None  | —     | —      |

**Status**: All dependencies met. No blockers.

## Objective

Prevent the SIGSEGV crash (Sentry NATIVE-RD-4) by ensuring `UnistylesRuntime.setTheme()` and `UnistylesRuntime.updateTheme()` are never called while the app is in a non-active state. This is a defensive app-level workaround while the upstream library bug (open as `jpudysz/react-native-unistyles#1179`) remains unresolved. The plan also covers marking the Sentry issue resolved and filing an upstream comment if warranted.

## Decisions

| ID  | Decision                                                                                                                                           | Alternatives Considered                                                                                                                                                                          | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | App-level guard: suppress / queue `UnistylesRuntime.setTheme()` and `updateTheme()` when `AppState.currentState !== 'active'`, flush on foreground | (a) Do nothing — accept crash rate; (b) Upgrade to latest release (3.2.5 — no fix for this crash family); (c) Patch the library locally; (d) Implement PR #1191's C++ drain fix as a local patch | Upgrade does not fix this: 3.2.5 contains no shadow tree crash fixes. PR #1191 (the C++ fix) was closed unmerged because the maintainer requires a repro. The app-level guard is the mitigation confirmed in the PR #1191 thread ("downstream beta app confirmed removing rapid/back-to-back setTheme() calls stopped the crash"). It is entirely in our code, ships in one PR, and is reversible when upstream ships a fix. |
| D2  | Guard both `setTheme` call sites (`useThemePersistence`) and `updateTheme` call site (`useDensity`)                                                | Guard only `setTheme`                                                                                                                                                                            | `useDensity` calls `UnistylesRuntime.updateTheme()` for all 7 themes on density change; `updateTheme` goes through the same `applyDependencyChanges` → `updateShadowTree` path. Guarding only `setTheme` leaves a second trigger.                                                                                                                                                                                            |
| D3  | Queue the deferred call and flush on `AppState 'active'` event, not silently drop it                                                               | Silently drop the update                                                                                                                                                                         | Dropping the call means the user's theme choice (applied while backgrounded) is lost on foreground. Queuing and flushing preserves intent.                                                                                                                                                                                                                                                                                   |
| D4  | Implement the guard in a new shared `useAppStateGuard` hook that wraps `UnistylesRuntime` calls, rather than inlining `AppState` checks everywhere | Inline AppState checks in each call site                                                                                                                                                         | The two affected hooks (`useThemePersistence`, `useDensity`) have similar structures. A shared primitive is easier to test and will be useful if additional Unistyles call sites emerge.                                                                                                                                                                                                                                     |

## Upstream Research Summary

**Current pinning:** `react-native-unistyles@^3.2.5` — resolves to **3.2.5** (confirmed from bun.lock).

**Crash family history:**

| Upstream issue | Description                                                                                      | Status                                  |
| -------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------- |
| #658           | SIGSEGV in shadowTreeManager (Android, RN beta era)                                              | Closed                                  |
| #919           | Crash on screen rotation, dangling ShadowNodeFamily pointer                                      | Closed/Fixed                            |
| #1068          | Android sporadic production crash in ShadowTreeManager                                           | Closed (PR #1071)                       |
| #1160          | iOS SIGABRT in `ShadowTreeManager::updateShadowTree`, adaptive themes                            | Closed (fixed in 3.2.2+ per maintainer) |
| **#1179**      | iOS heap corruption in `updateShadowTree`, `setAdaptiveThemes(false)` + `setTheme()` rapid calls | **OPEN, 3.2.4+, no fix**                |

**v3.2.5 release notes** contain no shadow tree crash fixes. The only relevant PR, #1191 (C++ drain fix), was closed unmerged — maintainer could not reproduce and requires a repro.

**Our crash vs. #1179:** Our Sentry culprit is `ShadowTreeManager::updateShadowTree` invoked from `HybridStyleSheet::applyDependencyChanges` (the symbol introduced in 3.2.4). Seer's root-cause analysis (background → foreground + theme change while paused) is mechanistically compatible with #1179's rapid back-to-back `onPlatformDependenciesChange` trigger. **We do NOT use `setAdaptiveThemes`** — `unistyles.ts` uses `initialTheme: "light-default"` with no `adaptiveThemes` setting, so the `setAdaptiveThemes(false) + setTheme()` exact sequence from #1179 does not apply. Our most likely trigger is: Evolu DB hydrates on foreground → `useThemePersistence` effect fires → calls `UnistylesRuntime.setTheme()` → shadow tree is stale from background suspension → crash.

**What upstream has confirmed:** The PR #1191 thread contains a direct statement that "removing rapid/back-to-back `UnistylesRuntime.setTheme()` calls stopped the crash in both iOS and Android beta builds." This is the mitigation we are implementing at the app level.

## App Lifecycle Analysis

Current code has no `AppState` listeners in any theme-related hook. The crash flow from Seer:

1. App backgrounds → React Navigation marks screens inactive, ShadowTree may be partially suspended
2. `applyDependencyChanges` is scheduled by Unistyles' `RuntimeScheduler`
3. App foregrounds → Evolu re-queries → `useThemePersistence` useEffect fires with the stored theme → calls `UnistylesRuntime.setTheme()` against a not-yet-reacquired ShadowTree → SIGSEGV

The existing `useThemePersistence` effect has a `lastAppliedRef` guard (deduplicates same-theme calls) but no AppState guard. `useDensity` has a similar structure with `UnistylesRuntime.updateTheme()` calls and also has no AppState guard.

No component uses `Appearance` (RN's system theme API) directly. We do not call `setAdaptiveThemes` anywhere. There is no existing `AppState` listener in the codebase for theme/density operations.

## Affected Areas

- `apps/native-rd/src/hooks/useAppStateGuard.ts`: **NEW** — shared hook that tracks `AppState`, returns whether Unistyles calls are safe, and queues/flushes deferred calls on resume.
- `apps/native-rd/src/hooks/useThemePersistence.ts`: **MODIFY** — wrap `UnistylesRuntime.setTheme()` with the guard.
- `apps/native-rd/src/hooks/useDensity.ts`: **MODIFY** — wrap `UnistylesRuntime.updateTheme()` loop with the guard.
- `apps/native-rd/src/hooks/__tests__/useAppStateGuard.test.ts`: **NEW** — unit tests for the guard hook.
- `apps/native-rd/src/hooks/__tests__/useThemePersistence.test.ts`: **MODIFY** — add coverage for the backgrounded case.
- `apps/native-rd/src/hooks/__tests__/useDensity.test.ts`: **NEW or MODIFY** — add coverage for the backgrounded density case.

## Implementation Plan

### Step 1: Add `useAppStateGuard` hook

**Files**: `apps/native-rd/src/hooks/useAppStateGuard.ts`, `apps/native-rd/src/hooks/__tests__/useAppStateGuard.test.ts`
**Commit**: `fix(native-rd): add useAppStateGuard to defer Unistyles calls while backgrounded`
**Changes**:

- [ ] Create `useAppStateGuard.ts`:
  - Subscribe to `AppState` change events using `AppState.addEventListener('change', ...)`.
  - Track `isActive: boolean` (true when `AppState.currentState === 'active'`).
  - Expose `runWhenActive(fn: () => void): void` — runs immediately if active, otherwise queues the function.
  - On transition to `'active'`, flush the queue in order.
  - Clean up listener and discard queue on unmount.
- [ ] Write `useAppStateGuard.test.ts`:
  - Test that `runWhenActive` fires immediately when active.
  - Test that `runWhenActive` queues when backgrounded and flushes in order on resume.
  - Test that the queue is cleared on unmount (no calls after unmount).
  - Use `test.each` for state transition paths (active → background → active, active → inactive → active).

### Step 2: Guard `useThemePersistence`

**Files**: `apps/native-rd/src/hooks/useThemePersistence.ts`, `apps/native-rd/src/hooks/__tests__/useThemePersistence.test.ts`
**Commit**: `fix(native-rd): defer setTheme() in useThemePersistence while app is backgrounded`
**Changes**:

- [ ] Import `useAppStateGuard` and call it inside `useThemePersistence`.
- [ ] Replace direct `UnistylesRuntime.setTheme(...)` calls with `runWhenActive(() => UnistylesRuntime.setTheme(...))`.
- [ ] Verify `lastAppliedRef` logic still deduplicates correctly after flush (the ref should be set before queuing, so a duplicate call queued before flush is still deduplicated).
- [ ] Add test cases to `useThemePersistence.test.ts`: when AppState is `'background'`, `setTheme` is NOT called immediately; when AppState becomes `'active'`, the queued call fires.

### Step 3: Guard `useDensity`

**Files**: `apps/native-rd/src/hooks/useDensity.ts`
**Commit**: `fix(native-rd): defer updateTheme() in useDensity while app is backgrounded`
**Changes**:

- [ ] Import `useAppStateGuard` and call it inside `useDensity`.
- [ ] Wrap the `applyDensityToAllThemes(densityLevel)` call inside `runWhenActive(...)`.
- [ ] Add or extend density hook tests to cover the backgrounded case.

### Step 4: Resolve Sentry

**Files**: none (external actions)
**Commit**: `docs(native-rd): document NATIVE-RD-4 workaround`
**Changes**:

- [ ] Mark Sentry NATIVE-RD-4 resolved via the Sentry MCP (`update_issue` with `status: resolved`).
- [ ] Update this plan's Discovery Log with the resolution date.
- [ ] No upstream engagement: we cannot provide a deterministic repro, and the maintainer has explicitly stated repro is the gating constraint. A no-repro comment would add maintainer-bandwidth noise without unlocking the fix. See Q4 discussion in plan history.

## Testing Strategy

- [ ] Unit tests: `useAppStateGuard` — AppState queue/flush behavior (Jest 30, `@testing-library/react-native` v13)
- [ ] Unit tests: `useThemePersistence` — guard integration; background suppression + foreground flush
- [ ] Unit tests: `useDensity` — guard integration for `updateTheme` loop
- [ ] Mock `AppState` from `react-native` in Jest using the standard `react-native` mock (already present in test setup)
- [ ] Manual reproduction attempt: change system appearance (Settings > Display & Brightness) while app is backgrounded, then foreground — run on a physical device or simulator with iOS 16+ since the crash shows `SIGSEGV` on iOS 16.3.
- [ ] Sentry: monitor NATIVE-RD-4 event count after shipping to confirm no new events.

**Note on determinism:** The crash is non-deterministic (3 users, 4 events over ~8 days). Unit tests cover the intent (calls are deferred). End-to-end confirmation requires Sentry silence after the release ships.

## Not in Scope

| Item                                                               | Reason                                                                                                                              | Follow-up                                          |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Upgrading `react-native-unistyles` beyond 3.2.5                    | No released version fixes this crash family as of 2026-06-07; upgrading is a routine semver bump that can happen independently      | Track in release maintenance                       |
| Submitting the C++ fix from PR #1191                               | Maintainer closed it for lack of repro; contributing a repro might unlock this path but is a separate effort                        | Consider if Sentry sees new events post-workaround |
| System appearance (dark mode) auto-tracking via `adaptiveThemes`   | We deliberately do not use it; adding it is a feature, not part of this bug fix                                                     | None                                               |
| Guarding the `setTheme` call in `useTheme.ts` (root hook)          | That call site is triggered by direct user action (pressing a button), which is only possible in the foreground; no background risk | None                                               |
| Refactoring density to apply lazily at theme-switch time (Shape B) | Structural refactor outside the scope of a crash hotfix; defensive guard (Shape A) is reversible and contained.                     | #258                                               |

## Discovery Log

- [2026-06-07] RN's Jest mock declares `AppState.currentState` as a plain value property (`jest.fn()`), not a getter — `jest.spyOn(AppState, "currentState", "get")` throws "Property currentState does not have access type get". Switched test helpers to direct property assignment with the original captured at module load and restored in `afterEach`.
- [2026-06-07] Implementation landed in 4 atomic commits on `feat/issue-54-unistyles-shadowtree-segv`: `useAppStateGuard` (primitive + 8 tests) → `useThemePersistence` guard wrap (4 added tests) → `useDensity` guard wrap (5 added tests, new file) → test-helper fix for the `currentState` spy issue above. Full suite: 176 suites / 8754 tests pass; typecheck and lint clean.
- [2026-06-07] Sentry resolution deferred until after the workaround ships in a release — closing NATIVE-RD-4 before the fix is in users' hands would lose the regression-watch signal.
