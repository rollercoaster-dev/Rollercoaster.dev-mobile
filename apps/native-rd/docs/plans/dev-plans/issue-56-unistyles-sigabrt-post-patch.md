# Development Plan: Issue #56

## Issue Summary

**Title**: [Sentry NATIVE-RD-9] SIGABRT: pointer being freed was not allocated (\_\_pthread_kill)
**Type**: bug
**Complexity**: MEDIUM
**Estimated Lines**: ~165 lines (patch extension ~70 C++ lines + JS guard extension ~30 lines + useTheme throwing stub ~5 lines hook + ~10 lines test update + test additions ~50 lines)

## Intent Verification

Observable criteria derived from the issue and the 2026-06-11 update:

- [ ] When a user switches theme via `ThemeSwitcher` or `ThemeChipGrid` while the app is in the foreground, no SIGABRT occurs on `iPhone18,1 / iOS 27.0` (or similar modern hardware).
- [ ] A rapid sequence of theme toggles (10+ alternations between any two themes) in a freshly installed `0.1.14+N` build does not crash within a 60-second window.
- [ ] Sentry NATIVE-RD-9 receives no new events for 72 hours after a production build containing the fix ships to at least one device.
- [ ] Sentry NATIVE-RD-4 (same crash family, grouped separately by top frame) also receives no new events for 72 hours after the same build ships.
- [ ] The unistyles patch file at `patches/react-native-unistyles@3.2.5.patch` is updated to include the additional C++ change(s) and the bun.lock patch-hash fingerprint changes on `bun install`.

_These are the criteria a reviewer can verify: a manual theme-switch loop on device + Sentry silence. Automated tests verify the JS-layer intent (debounce/serialization logic) but cannot cover the C++ crash path._

## Dependencies

| Issue | Title                                                    | Status              | Type           |
| ----- | -------------------------------------------------------- | ------------------- | -------------- |
| #270  | Vendor unistyles PR #1191 via patch-package...           | Closed (2026-06-07) | Prereq (done)  |
| #54   | [Sentry NATIVE-RD-4] Unistyles ShadowTreeManager SIGSEGV | Closed (2026-06-07) | Related (done) |

**Status**: No open blockers. PR #271 (patch vendor) is merged. The patches are present and installed. This issue extends that work.

## Objective

The vendored PR #1191 patch (commit `5571c60`) added four C++ guards against stale-family processing in the shadow tree update path. Those guards are present and compiled into the installed package. Despite this, Sentry NATIVE-RD-9 continued firing on `0.1.14+18` — a post-patch production build — with the crash landing in the same `HybridStyleSheet::applyDependencyChanges` → `ShadowTreeManager::updateShadowTree` → `unique_ptr::operator=` → `___BUG_IN_CLIENT_OF_LIBMALLOC` chain.

This plan diagnoses why the patch is insufficient and chooses between two fix vectors:

1. **Patch extension** — identify the remaining unsafe code path in the patched C++ and extend the `patches/react-native-unistyles@3.2.5.patch` file to cover it.
2. **JS-layer debounce/serialization** — add a rapid-fire guard in `useThemePersistence.setTheme` (and `useTheme.setTheme`) so that back-to-back theme switches within a single JS task cannot produce concurrent C++ shadow tree mutations.

Both vectors are in scope; the implementation plan picks the one(s) warranted by the analysis below.

## Diagnosis: Why the Existing Patch Did Not Fix It

### What PR #1191 / the Vendored Patch Does

The patch adds four guards:

| Guard                                                                 | Location                       | What it prevents                                                                                          |
| --------------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `suspendShadowNode` calls `trafficController.removeShadowNode`        | `UnistylesRegistry.cpp:125`    | Pending traffic-controller update for a family that is being suspended is flushed before the next commit. |
| `buildDependencyMap` skips suspended families                         | `UnistylesRegistry.cpp:153`    | Suspended families are not included in the dependency map that drives `rebuildShadowLeafUpdates`.         |
| `getUpdates()` → `takeUpdates()` (drain by move + clear `_canCommit`) | `ShadowTrafficController.h:24` | Prevents the same update batch from being processed twice if `updateShadowTree` is re-entered.            |
| `updateShadowTree` erases non-active families before committing       | `ShadowTreeManager.cpp:19`     | A family that was suspended between `takeUpdates()` and the `nativeProps_DEPRECATED` mutation is dropped. |
| `isActiveUnistylesFamily` helper                                      | `UnistylesRegistry.cpp:134`    | Utility predicate used by the erasure guard above.                                                        |

### Where the Patch Falls Short

The crash stack from 2026-06-10 is:

```
HybridStyleSheet::applyDependencyChanges  (line 365 in the patched source)
  → ShadowTreeManager::updateShadowTree   (line ~20)
    → ShadowTrafficController::withLock   (implicit via lambda)
      → unique_ptr::operator=             (nativeProps_DEPRECATED assignment, line 41/44 or 64/67)
        → ___BUG_IN_CLIENT_OF_LIBMALLOC_POINTER_BEING_FREED_WAS_NOT_ALLOCATED
```

The `nativeProps_DEPRECATED` assignment at line 41/44 in the RN >= 0.81 branch is:

```cpp
if (mutableFamily->nativeProps_DEPRECATED && mutableFamily->nativeProps_DEPRECATED->isObject()) {
    mutableFamily->nativeProps_DEPRECATED->update(safeProps);   // line 42: update() on a freed/wild ptr
} else {
    mutableFamily->nativeProps_DEPRECATED = std::make_unique<folly::dynamic>(safeProps);  // line 44: assignment
}
```

The crash message "pointer being freed was not allocated" is the malloc allocator's abort triggered by a double-free or use-after-free on the `folly::dynamic` object owned by `nativeProps_DEPRECATED`. The `unique_ptr<folly::dynamic>` holds a raw heap allocation managed by folly; if the `ShadowNodeFamily` object itself is partially torn down while the unique_ptr still holds a live pointer to the old allocation, the `operator=` or `update()` call writes through a dangling pointer into freed memory.

**Two plausible remaining races:**

**Race A — Theme change fires during screen transition (React Navigation unmount path):**
When the user taps a theme option and the screen or a descendant is simultaneously being unmounted by React Navigation (e.g. tabbing away), React's reconciler calls the Babel-transform-injected `ShadowRegistry.unlink()` for the unmounting component. `unlinkShadowNodeWithUnistyles` erases the family from `_shadowRegistry` and `_suspendedFamilies` and calls `removeShadowNode`. Concurrently, the JS `setTheme()` call has already dispatched `onPlatformDependenciesChange` on the C++ side, which calls `applyDependencyChanges` → `rebuildShadowLeafUpdates` → `setUpdates` → (later) `updateShadowTree`. If `unlink` races between `setUpdates` and `updateShadowTree`, the family is no longer in `_shadowRegistry` but its pointer is still in `_unistylesUpdates` (because `removeShadowNode` was called on an entry that had just been re-added or concurrently modified). The `isActiveUnistylesFamily` check in `updateShadowTree` should catch this — but the check reads `_shadowRegistry` without the lock already held (the lock is acquired by `withLock`, and `isActiveUnistylesFamily` is called within that lock). **This should be caught by the existing patch IF the mutex is actually serializing the two threads.** The mutex is `std::mutex` inside `ShadowTrafficController` — it covers `trafficController` operations but NOT direct reads of `_shadowRegistry` or `_suspendedFamilies` in `UnistylesRegistry` itself. `isActiveUnistylesFamily` reads `_shadowRegistry` and `_suspendedFamilies` while holding the `trafficController` mutex, but `unlinkShadowNodeWithUnistyles` also acquires the same mutex when it calls `trafficController.withLock`. So they should be serialized. **This race is therefore likely NOT the remaining bug.**

**Race B — Theme change fires while the family pointer itself is freed (dangling family pointer):**
`ShadowNodeFamily` objects are managed by React's C++ runtime (Fabric), not by unistyles. When a component unmounts, Fabric may free the `ShadowNodeFamily` before all outstanding references to its address are drained. If unistyles holds a raw `const ShadowNodeFamily*` in `_shadowRegistry` or `_unistylesUpdates` after the family is freed, any subsequent dereference (including `const_cast<ShadowNodeFamily*>(family)->nativeProps_DEPRECATED`) is a use-after-free. The vendored patch uses `removeShadowNode` to clean up `_unistylesUpdates` entries when `suspendShadowNode` is called — but `suspendShadowNode` is called via the Babel transform's `ShadowRegistry.suspend()` API, which is triggered by React's effect cleanup. If the effect cleanup (JS side) races with the Fabric dealloc (C++ side), the family pointer may already be invalid before `suspend()` or `unlink()` runs. This is the classic use-after-free that the upstream maintainer's broader fix (tracking shared ownership, not raw pointers) would address — but PR #1191 only partially mitigates it.

**Race C — Rapid successive theme switches from the JS layer:**
The user's documented repro is "theme switch" — likely a quick tap sequence. `useThemePersistence.setTheme` calls `runWhenActive(() => UnistylesRuntime.setTheme(name))`. `runWhenActive` fires immediately when active (no debounce). Two rapid taps → two `setTheme` calls → two `onPlatformDependenciesChange` dispatches on the C++ side before the first shadow tree update completes. The `takeUpdates()` change (PR #1191) drains the queue after each commit — but `rebuildShadowLeafUpdates` calls `setUpdates` and then `resumeUnistylesTraffic`, which sets `_canCommit = true`. If a second `applyDependencyChanges` is dispatched while the first is in the `nativeProps_DEPRECATED` mutation loop, and the second dispatch calls `setUpdates` merging new pointers into `_unistylesUpdates`, the data structure is mutated from a second thread while the first thread iterates it. **This is a real remaining race not covered by the mutex** — `setUpdates` is called inside `withLock` and so is the iteration in `updateShadowTree`, but `onPlatformDependenciesChange` dispatches its callback asynchronously via a JS runtime scheduler (see `HybridStyleSheet.cpp:268` — the lambda captures `weakSelf` and runs on `rt`). Two simultaneous `setTheme()` invocations from JS trigger two independent scheduler tasks that may run in sequence on the same runtime thread but with the lock released between `resumeUnistylesTraffic` (end of `rebuildShadowLeafUpdates`) and `updateShadowTree` being called at line 365. During that window, a second `rebuildShadowLeafUpdates` can `setUpdates` again — and then the first `updateShadowTree` call (which has already left `withLock`) calls `updateShadowTree` → enters `withLock` → `takeUpdates` — now with data from the second call merged in — and processes families that may already have stale `nativeProps_DEPRECATED` state from the second iteration.

**Most likely culprit for the post-patch continuing crash: Race C** — rapid-fire theme switches on a foreground device during interactive use. The JS-layer guard (`runWhenActive`) only guards background-while-active but does not serialize or debounce rapid foreground calls. The vendored patch mitigated the single-call background case (Race A / old crash) but not the multi-call race (Race C).

### Upstream Version Status

`react-native-unistyles` latest published version in the 3.x line is **3.2.5** (confirmed via npm registry check 2026-06-11). There is no newer release. PR #1191 remains unmerged upstream. No higher version to upgrade to.

## Options

| #   | Option                                                            | Description                                                                                                                                                                                                                                                                                                                | Risk                                                                                                                                | Recommendation                             |
| --- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| A   | **JS debounce in `useThemePersistence.setTheme`**                 | Add a `useRef`-based leading-edge debounce (e.g. 300ms) or a single in-flight guard that drops duplicate calls while a theme change is pending. No C++ change required.                                                                                                                                                    | Low — entirely in JS, easily tested. Does not fix the C++ bug but makes the race window negligibly small for human-speed taps.      | **Recommended as first fix**               |
| B   | **Extend the C++ patch: guard `nativeProps_DEPRECATED` mutation** | In `ShadowTreeManager.cpp`, before the `mutableFamily->nativeProps_DEPRECATED` mutation loop (lines 40-45), add a check that the family is still in `_shadowRegistry` (i.e. call `registry.isActiveUnistylesFamily(family)` before writing `nativeProps_DEPRECATED`). Extend `patches/react-native-unistyles@3.2.5.patch`. | Medium — modifying a C++ patch file requires a native rebuild and careful diff hygiene; risk of introducing a different regression. | **Recommended in addition to A**           |
| C   | **Reopen upstream issue / file new upstream issue**               | File or comment on the upstream repo with the post-patch stack and the iPhone18,1/iOS 27 repro scenario. No code change; escalates pressure.                                                                                                                                                                               | Low-risk, low-reward short-term.                                                                                                    | Recommended as a parallel action (no code) |
| D   | **Temporarily disable in-app theme switching**                    | Remove the `ThemeSwitcher` and `ThemeChipGrid` components or make them inert until upstream fixes the crash.                                                                                                                                                                                                               | High — regresses UX. 8 users affected is non-trivial but not catastrophic.                                                          | Rejected                                   |
| E   | **Upgrade unistyles**                                             | No 3.x version newer than 3.2.5 exists.                                                                                                                                                                                                                                                                                    | N/A — not available.                                                                                                                | Not applicable                             |

**Recommended path: A + B in sequence, C as a parallel no-code action.**

## Affected Areas

- `patches/react-native-unistyles@3.2.5.patch`: extend with additional C++ guard in `ShadowTreeManager.cpp` before `nativeProps_DEPRECATED` mutation (Option B)
- `apps/native-rd/src/hooks/useThemePersistence.ts`: add leading-edge debounce to `setTheme` (Option A)
- `apps/native-rd/src/hooks/__tests__/useThemePersistence.test.ts`: extend to cover debounce behavior
- `package.json` (root, `patchedDependencies`) and `bun.lock`: no new entry needed — existing `react-native-unistyles@3.2.5` entry stays; `bun install` updates the patch hash
- `apps/native-rd/src/hooks/useTheme.ts`: the outer-provider `setTheme` is a structurally unreachable foot-gun (the inner `ThemedApp` overrides the context with `useThemePersistence.setTheme` before any consumer mounts). Replace its body with a `throw new Error(...)` stub so any future refactor that re-exposes this path fails loud rather than silently bypassing persistence + the in-flight guard.
- `apps/native-rd/src/hooks/__tests__/useTheme.test.ts`: update the existing assertions that exercise `setTheme` — switch them to assert the throw, OR remove them if they assert the old direct-call behavior (will confirm during implementation).

## Implementation Plan

### Step 1: Extend the C++ patch — guard `nativeProps_DEPRECATED` mutation for non-active families

**Files**: `patches/react-native-unistyles@3.2.5.patch`
**Commit**: `fix(native-rd): extend unistyles patch — guard nativeProps_DEPRECATED for non-active families`
**Changes**:

- [ ] Open `patches/react-native-unistyles@3.2.5.patch`. In the `ShadowTreeManager.cpp` hunk, within the `for (const auto& [family, props] : updates)` loop (the `#if REACT_NATIVE_VERSION_MINOR >= 81` branch), add a guard before the `mutableFamily->nativeProps_DEPRECATED` mutation:

  ```cpp
  for (const auto& [family, props] : updates) {
      // --- ADD: skip families that became non-active after takeUpdates() ---
      if (!registry.isActiveUnistylesFamily(family)) {
          continue;
      }
      // --- END ADD ---
      auto safeProps = props.isObject() ? props : folly::dynamic::object();
      // ... existing nativeProps_DEPRECATED mutation ...
  }
  ```

- [ ] The same guard pattern should be applied in the `#else` branch (pre-RN 0.81) inside the `shadowTreeRegistry.enumerate` lambda → `for (const auto& [family, props] : updates)` loop.
- [ ] Run `bun install` to re-apply the patch and update the bun.lock patch hash.
- [ ] Verify the patch applies cleanly: check that `takeUpdates` / `isActiveUnistylesFamily` symbols appear in `node_modules/.bun/react-native-unistyles@3.2.5+*/node_modules/react-native-unistyles/cxx/shadowTree/ShadowTreeManager.cpp`.
- [ ] **Note**: requires a native rebuild to take effect in a running app — document in the commit message that `npx expo run:ios` is required after this step.

**Estimated lines changed in patch file**: ~20 lines (two `if (!registry.isActiveUnistylesFamily(...)) continue;` hunks, each ~8 lines of diff context).

### Step 2: Add JS-layer leading-edge debounce to `useThemePersistence.setTheme`

**Files**: `apps/native-rd/src/hooks/useThemePersistence.ts`, `apps/native-rd/src/hooks/__tests__/useThemePersistence.test.ts`
**Commit**: `fix(native-rd): debounce setTheme in useThemePersistence to prevent rapid-fire shadow-tree races`
**Changes**:

- [ ] In `useThemePersistence.ts`, add a `lastThemeCallRef = useRef<number>(0)` tracking the last call timestamp (or a simpler `pendingThemeRef = useRef<ThemeName | null>(null)` in-flight guard).

  **Recommended approach**: in-flight guard (simpler, avoids timer leaks):

  ```typescript
  const inFlightThemeRef = useRef<ThemeName | null>(null);

  const setTheme = useCallback((name: ThemeName) => {
    if (!isValidThemeName(name)) { ... }
    // Drop rapid-fire duplicate or concurrent call; the in-flight call will apply the last-written ref.
    if (inFlightThemeRef.current !== null) {
      lastAppliedRef.current = name; // update intent; the flush will pick it up
      return;
    }
    inFlightThemeRef.current = name;
    lastAppliedRef.current = name;
    runWhenActive(() => {
      UnistylesRuntime.setTheme(name);
      inFlightThemeRef.current = null;
    });
    if (!settings) return;
    try { updateUserSettings(settings.id, { theme: name }); }
    catch (error) { ... }
  }, [settings, runWhenActive]);
  ```

  _This drops the second tap if a theme change is already in-flight. The Sentry repro is a rapid toggle; this makes the second tap a no-op until the first resolves. Single taps are unaffected (in-flight clears synchronously when active)._

- [ ] Update `__tests__/useThemePersistence.test.ts`:
  - [ ] Add a test: two rapid calls to `setTheme('dark-default')` then `setTheme('light-default')` → `UnistylesRuntime.setTheme` is called only once (the first call) within a single active-state frame.
  - [ ] Add a test: after `setTheme` resolves (in-flight cleared), a subsequent call succeeds normally.
  - [ ] Use `test.each` if there are symmetric cases for the in-flight / already-active / backgrounded axes.

**Estimated lines**: ~30 lines in hook, ~25 lines in tests.

### Step 3: Replace `useTheme().setTheme` with a throwing stub

**Files**: `apps/native-rd/src/hooks/useTheme.ts`, `apps/native-rd/src/hooks/__tests__/useTheme.test.ts`
**Commit**: `refactor(native-rd): replace unreachable useTheme().setTheme with throwing stub`
**Changes**:

- [ ] In `useTheme.ts:87-89`, replace the `useCallback` body with a throw:

  ```typescript
  const setTheme = useCallback((_name: ThemeName) => {
    throw new Error(
      "useTheme().setTheme is the outer-provider stub and is structurally unreachable — consume via useThemeContext() inside ThemedApp where useThemePersistence overrides it with the persisting, in-flight-guarded setTheme.",
    );
  }, []);
  ```

- [ ] Open `useTheme.test.ts` and update any assertion that exercises `setTheme` directly: either assert it throws, or remove the case if it duplicates coverage already in `useThemePersistence.test.ts`.
- [ ] Confirm via `bun run type-check` and `bun test --testPathPatterns useTheme` that no production caller invokes `useTheme().setTheme` (only `useTheme.test.ts` currently does so).

_Rationale: by App.tsx composition, `<ThemeProvider value={themeState}>` (outer) wraps `EvoluAppProvider → SafeAreaProvider → KeyboardProvider → ThemedApp`. `ThemedApp` then re-provides `{ ...themeContext, setTheme: persistingSetTheme }` before any UI consumer mounts (TabNavigator, WelcomeScreen, ThemeSwitcher, ThemeChipGrid all live inside the inner provider and use `useThemeContext`). The outer `setTheme` is unreachable; keeping it as a silent direct `UnistylesRuntime.setTheme()` call is a latent foot-gun that bypasses persistence and the in-flight guard. Throwing is loud and prevents accidental reachability after future refactors._

**Estimated lines**: ~5 changed in hook, ~10 changed in test.

### Step 4: Sentry follow-up + PR description note for upstream

**Files**: none (external actions — captured in the PR description, not in a commit)
**Changes**:

- [ ] After a production build ships (EAS build + TestFlight / direct install), monitor Sentry NATIVE-RD-9 and NATIVE-RD-4 for 72 hours. If no new events: mark both resolved via the Sentry MCP (`update_issue` with `status: resolved`).
- [ ] In the PR description, add an "Upstream follow-up" section noting that — once merged — we should comment on upstream react-native-unistyles (issue #1179 or a new issue) with: post-patch crash stack on iPhone18,1 / iOS 27.0 / RN 0.83.6 / unistyles 3.2.5+patch, the two additional guards added in Step 1, and the JS-layer in-flight guard from Step 2. The actual comment posting is handled manually post-merge, not as part of this PR's commits.

## Testing Strategy

- [ ] Unit tests: extend `useThemePersistence.test.ts` — in-flight guard behavior (Jest 30, `@testing-library/react-native` v13)
- [ ] Mock `UnistylesRuntime.setTheme` as `jest.fn()` (already mocked in `src/__tests__/mocks/unistyles.ts`)
- [ ] Use `test.each` for the rapid-call × app-state matrix (active+rapid, background+rapid, active+single)
- [ ] Manual verification: on the `fix/issue-56-unistyles-double-free` branch, after `npx expo run:ios`, perform the documented repro:
  - Open Settings → Theme section
  - Tap theme options in rapid succession (10+ taps within ~2 seconds, alternating between at least two options)
  - Confirm no SIGABRT. Expected behaviour with the in-flight guard: the **first** tap of a rapid burst is the one that applies; subsequent taps that land while it is mid-flight are dropped. After the in-flight call settles (foreground: next tick; backgrounded: after AppState resume flushes the queued call), the next tap applies normally. The user must re-tap once the burst settles if they want a different theme — "last tap wins" is **not** the contract here.
  - Repeat from the Goals tab (navigation transition happening during theme tap)
- [ ] Sentry: monitor NATIVE-RD-9 (and NATIVE-RD-4 as a group) for 72 hours after a production build ships

**Note on determinism**: The crash rate has moved to 13 events / 8 users but the window for a single repro attempt is still probabilistic. The JS-layer in-flight guard (no timer; synchronous ref) makes the race window microseconds wide; confirmation relies on Sentry silence rather than a guaranteed single-session repro.

## Decisions

| ID  | Decision                                                                        | Alternatives Considered                                                                                                   | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | JS in-flight guard (not timer-based debounce) in `setThemePersistence.setTheme` | 300ms `setTimeout` debounce; cancellation-token pattern                                                                   | Timer leaks if component unmounts mid-debounce; in-flight guard is synchronous and leakless. Ref clears immediately when `runWhenActive` fires the callback in the active case.                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| D2  | Extend existing patch file rather than a second patch file                      | Add a second `.patch` file; fork unistyles into the monorepo                                                              | Bun `patchedDependencies` maps one entry per package version; a second file is not supported without a workaround. Extending the existing patch keeps the change co-located with the prior fix.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| D3  | Guard both the RN >= 0.81 and RN < 0.81 branches in `ShadowTreeManager.cpp`     | Guard only the >= 0.81 path (current RN is 0.83.6)                                                                        | Defensive: the patch file stays for the lifetime of 3.2.5 even if someone builds against an older RN target. Minimal extra diff.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| D4  | Replace `useTheme.ts` `setTheme` with a throwing stub                           | (a) Keep current direct `UnistylesRuntime.setTheme` call + comment; (b) Add the same in-flight guard for defense-in-depth | The outer provider's `setTheme` is structurally unreachable for user gestures — `ThemedApp` overrides the context with the persisting `setTheme` before any consumer mounts. Keeping it as a silent direct call is a foot-gun that bypasses persistence + the in-flight guard; adding a guard would be guarding a code path that should never run. A throw fails loud if a future refactor ever re-exposes it. (Per CLAUDE.md: prefer deletion over comment-explaining-why for unreachable code; here we substitute "throw" for "delete" because the type signature on the outer provider still needs a function.) |

## Not in Scope

| Item                                                           | Reason                                                                          | Follow-up                          |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------- |
| Upgrading to a newer unistyles 3.x version                     | 3.2.5 is the latest; no newer version exists as of 2026-06-11                   | Revisit when upstream ships 3.2.6+ |
| Fixing the root C++ ownership bug (raw pointer vs. shared_ptr) | Requires upstream cooperation; too invasive to patch locally                    | Upstream engagement in Step 3      |
| Adding E2E tests for the theme-switch crash path               | Maestro/Detox can't reproduce a C++ memory-safety race deterministically        | None                               |
| Disabling theme switching as a workaround                      | Unacceptable UX regression; 7 themes are a day-one ND accessibility requirement | N/A                                |
| Addressing issue #258 (lazy density)                           | Separate refactor; out of scope for a crash hotfix                              | #258                               |

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->

- [2026-06-11] Confirmed patch symbols (`takeUpdates`, `isActiveUnistylesFamily`, `removeShadowNode`) are present in `node_modules/.bun/react-native-unistyles@3.2.5+bba9d152f2b5d10c/`. Patch IS installed. The post-patch crash is a new code path not covered by PR #1191.
- [2026-06-11] RN version is 0.83.6 (>= 0.81), so the active branch in `ShadowTreeManager::updateShadowTree` is the `#if REACT_NATIVE_VERSION_MINOR >= 81` path using `UIManagerBinding::getBinding(rt)->getUIManager().updateShadowTree(std::move(tagToProps))`. The crash is at `unique_ptr::operator=` on `mutableFamily->nativeProps_DEPRECATED` before the `updateShadowTree` call.
- [2026-06-11] No upstream unistyles version newer than 3.2.5 exists in the npm registry. Option E (upgrade) is not available.
- [2026-06-11] `useTheme.ts` `setTheme` (outer provider) makes an unguarded direct `UnistylesRuntime.setTheme()` call. Verified via App.tsx that the outer provider's `setTheme` is structurally unreachable for user gestures: `App` wraps `EvoluAppProvider → SafeAreaProvider → KeyboardProvider → ThemedApp` in the outer `ThemeProvider`, but none of those four render UI that calls `setTheme`. `ThemedApp` then re-wraps children in an inner `ThemeProvider` with `setTheme: persistingSetTheme` from `useThemePersistence`, and all real consumers (`ThemeSwitcher.tsx:123`, `ThemeChipGrid.tsx:41`) read via `useThemeContext()` which always resolves to the inner provider. Joe confirmed `(c)` — replace with throwing stub rather than leave-and-comment (per CLAUDE.md: delete unreachable code; here "throw" substitutes for "delete" because the outer provider's type still requires a function).
- [2026-06-11] `useThemePersistence.setTheme` currently has no debounce or in-flight guard — `runWhenActive` fires the callback synchronously when the app is active. Rapid taps produce rapid-fire `UnistylesRuntime.setTheme` calls with no serialization.
