# Issue #325: Badge detail — can't navigate back to the badge list after baking

## Summary

After baking a badge and tapping **View Badge**, the back button and Badges tab can't return to the full badge list — the user is stranded on `BadgeDetail`. Intermittent: only when the Badges tab hasn't been opened yet in the current session. Fix by passing **`initial: false`** on the cross-tab `navigate` (so React Navigation seeds the stack's `initialRouteName` beneath the deep-linked `BadgeDetail`) **plus** an explicit `initialRouteName` on the stack (the root it seeds). Both are required; `initialRouteName` alone does nothing for an imperative `navigate`.

## Complexity: Low

- Step 1 (the fix, this PR): ~25 LOC across three nav stacks (`initialRouteName`) + three screens (`initial: false`). Verified manually on device.
- Step 2 (automated regression coverage): deferred to a follow-up issue — Jest is the wrong tool here (see Step 2). Prefer a Maestro e2e flow.

## Analysis

### Current State

- `TabNavigator` (`@react-navigation/bottom-tabs`) mounts tabs lazily.
- `CompletionFlowScreen.handleViewBadge` (`screens/CompletionFlowScreen/CompletionFlowScreen.tsx:434`) does a cross-tab `parentNav.navigate("BadgesTab", { screen: "BadgeDetail", params })`.
- `BadgesStack` (`navigation/BadgesStack.tsx`) declares `Badges` then `BadgeDetail` but sets **no `initialRouteName`**.
- All back affordances in `BadgeDetailScreen` call `navigation.goBack()` (lines 235, 255, 480, 555).

### Root Cause

When the cross-tab `navigate("BadgesTab", { screen: "BadgeDetail" })` fires and `BadgesStack` has not mounted yet, React Navigation builds the nested stack's state **directly from the navigate params** as `[BadgeDetail]` — no `Badges` screen beneath it. This is `getStateFromParams` in `useNavigationBuilder.js:142-156`: for a `{ screen }` param with `initial !== false` it returns `{ routes: [{ name: screen }] }`, which **takes precedence over `initialRouteName`**. So `initialRouteName` alone is a no-op on this path.

With only `[BadgeDetail]` in the stack:

- `goBack()` (the back affordances at `BadgeDetailScreen` lines 235, 255, 480, 555) has nothing to pop to and falls through to the tab navigator — no back.
- The **Badges tab press** also does nothing: the native stack's built-in "re-press active tab → pop to top" listener (`createNativeStackNavigator.js:45-58`) only fires when `state.index > 0`. At index 0 there is nothing to pop.

When the Badges tab _was_ visited earlier in the session, the stack is already `[Badges]`, so the same `navigate` pushes → `[Badges, BadgeDetail]` and both back and tab work — hence the intermittency.

The fix is to pass **`initial: false`** on the cross-tab navigate. `getStateFromParams` then returns `undefined`, so the stack initializes from its `initialRouteName` (`Badges`) and the `NAVIGATE` to `BadgeDetail` pushes on top → `[Badges, BadgeDetail]`, index 1. Both back and tab now reach the list. (Same class of bug the `TimelineJourney` route partially works around via its `originBadgeId` param, `navigation/types.ts:29-37`.)

## Implementation Plan

### Step 1: `initial: false` on the cross-tab navigates + `initialRouteName` on the stacks _(applied)_

The two pieces are interdependent — `initial: false` seeds whatever `initialRouteName` declares, so both are needed.

- `navigation/BadgesStack.tsx` → `initialRouteName="Badges"`; `GoalsStack.tsx` → `initialRouteName="Goals"`; `SettingsStack.tsx` → `initialRouteName="Settings"`.
- Add `initial: false` to every cross-tab `navigate` into a **non-root** nested screen:
  - `CompletionFlowScreen.tsx:439` — `BadgesTab → BadgeDetail` (the reported "View Badge" path).
  - `TimelineJourneyScreen.tsx:113` and `:242` — `BadgesTab → BadgeDetail` (timeline "back" hops home).
  - `BadgeDetailScreen.tsx:221` — `GoalsTab → TimelineJourney` (seeds `Goals` beneath, fixes the same dead-tab-press on a cold `GoalsTab`).
- `BadgesScreen.tsx:42` navigates `GoalsTab → { screen: "Goals" }` — that target **is** the root, so `initial:false` is irrelevant there; left unchanged.
- `SettingsStack` has no cross-tab entry into a non-root screen today; its `initialRouteName` is purely defensive but harmless.

### Step 2 (follow-up issue, NOT this PR): automated regression coverage

We investigated unit-testing this fix and concluded Jest is the wrong tool for it. Recorded here so the follow-up doesn't relitigate:

- **The blocker:** `jest.config.js:71` maps `^@react-navigation/native$` to a passthrough mock globally, so no Jest test sees real navigation state. That mapping is resolver-level — `jest.unmock` can't undo it per-file. **15 test files** currently depend on that implicit global mock.
- **Headless-core test (tried, rejected):** you _can_ assert the React Navigation contract by importing `@react-navigation/core` + `/routers` directly (they're unmocked) and building a trivial navigator — it runs without native deps and proved the mechanism (`initial: false` + `initialRouteName` → `[Badges, BadgeDetail]`). But because the test supplies `initial: false` itself, **it would still pass if production dropped `initial: false`** — it characterises the library, not our call sites. Low regression value for real config overhead (separate Jest config to drop the mock + transitive `core`/`routers` declared for `tsc`). Not worth shipping.
- **Two real options for the follow-up:**
  1. **Maestro e2e** (`flows/`, `test:e2e`) — drive cold-launch → bake → View Badge → back/tab on a simulator. Highest fidelity; exercises the actual `initial: false` call site. The right guard for a "can the user navigate back" bug.
  2. **Make the `@react-navigation/native` mock opt-in** (remove the global `moduleNameMapper` entry; have the 15 dependent specs `jest.mock` it explicitly). Unlocks real-navigator unit tests repo-wide, but it's a cross-cutting refactor with a 15-file blast radius — its own PR.
- **Recommendation:** file as a follow-up issue; prefer the Maestro flow for this specific regression, track the mock-opt-in refactor separately.

## Verification

This fix is verified **manually on the simulator** (the authoritative check — the bug only manifests with real navigation state, which the Jest suite mocks away):

1. Cold-launch (do **not** open Badges tab) → Goals → complete a goal → bake → **View Badge** → back button and Badges tab both reach the badge list. ✅ confirmed 2026-06-19.
2. Previously-working path (open Badges tab first, then bake → View Badge) → no regression.

> Note when testing locally: a JS reload does **not** retro-seed `Badges` beneath a `BadgeDetail` that was already pushed by pre-fix code — that stuck screen stays stuck. Fully reload/restart (no nav-state persistence; `App.tsx:96`) and re-run the flow to exercise the fixed navigate.

## Dependencies

- None. No new packages.
