# Theme Persistence — Issue #943

**Tracking issue:** [#943 — fix(native-rd): persist theme switching after theme model cleanup](https://github.com/rollercoaster-dev/openbadges-monorepo/issues/943)
**Branch:** `theme-persistence-debugging`
**Milestone:** native-rd: Beta Stabilization & Cleanup
**Last updated:** 2026-05-13

---

## How to resume from cold context

If you're reading this with no conversation history, here's the orientation:

1. The bug: native-rd applies theme selection in-memory via `UnistylesRuntime.setTheme()` only. The `userSettings.theme` column exists in Evolu but is never read or written, so the app resets to `light-default` on every restart.
2. The fix is **narrowly scoped** — persist + restore the saved theme via Evolu, validate against the 7 exposed `themeOptions`. No changes to `themes/compose.ts` or the 14-theme registry.
3. **Scope note:** Issue #943's body says the work "should be coordinated with #940". #940 is marked CLOSED but the actual cleanup didn't ship — `themes/compose.ts:278-289` still registers all 14 `colorMode × variant` themes. **We are intentionally not finishing #940 inside #943.** If you want that cleanup, reopen #940 as a follow-up.
4. The parallel pattern to mirror is `apps/native-rd/src/hooks/useDensity.ts` — reads via `useUserSettingsRow()`, writes via `updateUserSettings()`, runs inside `EvoluAppProvider`, applies via `UnistylesRuntime`.

To verify state matches what this plan assumes:

```bash
git status                                                              # should be clean
grep -n "initialTheme" apps/native-rd/unistyles.ts                      # still "light-default"
grep -n "UnistylesRuntime.setTheme" apps/native-rd/src/hooks/useTheme.ts # still no persistence
gh issue view 943 --json state                                          # state: OPEN
```

---

## Problem statement

`apps/native-rd/src/hooks/useTheme.ts:89-91` calls `UnistylesRuntime.setTheme(name)` only — no Evolu write. `apps/native-rd/unistyles.ts:11` hardcodes `initialTheme: "light-default"`. The Evolu `userSettings.theme` column (`apps/native-rd/src/db/schema.ts:156`) and the `updateUserSettings({ theme })` validator (`apps/native-rd/src/db/queries.ts:1123-1136`) both exist but are unused. Result: every restart resets the theme to light.

A secondary structural problem: `App.tsx:82` calls `useTheme()` **outside** `EvoluAppProvider`, so the obvious patch (read Evolu inside `useTheme`) is impossible without a provider-order change.

---

## Scope

**In scope:**

- Persist theme selection to `userSettings.theme` (Evolu) on every `setTheme()` call.
- Restore saved theme on app start, validated against the 7 entries in `themeOptions`.
- Map invalid/legacy saved values (e.g. `dark-dyslexia` from earlier beta builds) to `light-default` and log a warning.
- Unit tests for the persistence hook (read, write, validation, fallback).
- Maestro flow for the restart-persistence acceptance criterion.

**Out of scope (deferred):**

- Cleaning up `themes/compose.ts` to register only 7 themes (that's #940's body — reopen separately if wanted).
- Synchronous warm-store read (SecureStore/MMKV) to eliminate first-frame flash. Acceptable per issue: "unless a deliberate loading state is shown first" — `ThemedApp`'s existing `isFirstLaunch === null` loading branch is that state.
- Refactoring `useAnimationPref.ts:50` to stop reading `UnistylesRuntime.themeName` directly (adjacent but independent).

---

## Design decisions

### D1. Source of truth: Evolu `userSettings.theme`

Already exists, already supported by `updateUserSettings`, already syncs across devices via Evolu. Matches the design-principles doc the issue cites.

### D2. Bootstrap pattern: mirror `useDensity`

`useDensity` reads `useUserSettingsRow()` inside `ThemedApp` (which lives inside `EvoluAppProvider`) and pushes the saved value into `UnistylesRuntime` via a `useEffect`. We add a parallel `useThemePersistence()` hook that does the same for `theme`.

### D3. Provider order: nested override, no top-level refactor

`App.tsx` keeps calling `useTheme()` at the top (Unistyles state must be readable before `EvoluAppProvider` mounts — `useFonts` returns `null` until ready, but the `ThemeProvider` wraps `EvoluAppProvider`). Inside `ThemedApp` we mount a **second** `ThemeProvider` whose `setTheme` writes to Evolu. React's nested-context-wins rule means all `ThemeSwitcher` / `ThemeChipGrid` consumers (which live below `EvoluAppProvider`) get the persisting version. The outer provider's `setTheme` remains a thin Unistyles-only fallback for anything mounted above `EvoluAppProvider` (currently nothing, but keeps the contract intact).

### D4. Validation: explicit set, not heuristic

```ts
const VALID_THEME_NAMES = new Set<ThemeName>(themeOptions.map((o) => o.id));

export function isValidThemeName(name: unknown): name is ThemeName {
  return typeof name === "string" && VALID_THEME_NAMES.has(name as ThemeName);
}
```

Anything failing the guard → fall back to `light-default`, log via `Logger`, **do not** auto-write the fallback (leaves room for a future migration table and avoids stomping if the user upgrades back to a build that re-supports a removed theme).

### D5. Flash policy

Accept a one-frame `light-default` flash on cold start because:

- `ThemedApp` already gates UI behind `isFirstLaunch === null` and renders a neutral background.
- `useUserSettingsRow` resolves on the same render Evolu hydrates SQLite, typically within the same frame the loading view paints.
- A truly flash-free fix requires a synchronous warm store, which is a larger architectural change and not what #943 asks for.

If the flash proves visible during manual testing, escalate to a separate ticket — do not expand this PR.

---

## Implementation steps (atomic commits)

### Commit 1 — `feat(native-rd): theme persistence hook + validation`

**Files:**

- `apps/native-rd/src/hooks/useTheme.ts` — export `VALID_THEME_NAMES`, `isValidThemeName`. Keep existing `useTheme()` unchanged (it stays the Unistyles-state hook for the outer provider).
- `apps/native-rd/src/hooks/useThemePersistence.ts` _(new)_ — reads `useUserSettingsRow()`, validates `settings.theme`, calls `UnistylesRuntime.setTheme(saved)` on first valid read and on subsequent changes from outside this device (cross-device sync). Returns a persisting `setTheme(name)` that calls both `UnistylesRuntime.setTheme(name)` and `updateUserSettings(settings.id, { theme: name })`.
- `apps/native-rd/src/hooks/__tests__/useThemePersistence.test.ts` _(new)_ — cases:
  - saved `null` → no `UnistylesRuntime.setTheme` call (preserves initial)
  - saved `"dark-default"` → `UnistylesRuntime.setTheme("dark-default")` called once
  - saved `"dark-dyslexia"` (legacy) → fallback to `light-default`, warning logged, no write-back
  - `setTheme("dark-default")` → both `UnistylesRuntime.setTheme` and `updateUserSettings` called with the same value
  - `setTheme` is a no-op when `settings` is `null` (Evolu still hydrating)

**Validation:**

```bash
bun --filter native-rd type-check
bun test --testPathPatterns useThemePersistence
```

### Commit 2 — `feat(native-rd): wire theme persistence into ThemedApp`

**Files:**

- `apps/native-rd/App.tsx` — inside `ThemedApp`, call `useThemePersistence()` and wrap the existing tree in a nested `<ThemeProvider value={{...themeContext, setTheme: persistingSetTheme}}>`. Order: must wrap `NavigationContainer` and the loading-state `<View>` branch so all consumers see the persisting setter.
- No changes to `unistyles.ts` (initial theme stays `light-default`; persistence reapplies on hydrate).

**Validation:**

```bash
bun --filter native-rd type-check
bun --filter native-rd lint
npx expo run:ios          # manual: change theme, kill app, relaunch, verify saved theme restores
```

### Commit 3 — `test(native-rd): restart-persistence Maestro flow`

**Files:**

- `apps/native-rd/e2e/flows/settings-theme-persists-restart.yaml` _(new)_ — extends the existing `settings-theme-switch.yaml`:
  1. Launch app (existing flow's setup)
  2. Tap `Night Ride. Dark mode`
  3. Assert `selected-theme` visible
  4. `launchApp` again **without** `clearState` (so SQLite survives)
  5. Navigate to Settings tab
  6. Assert `Night Ride. Dark mode` is the current selection (use `selected-theme` testID + label check)
- If `selected-theme` testID doesn't expose the selected label, add an `accessibilityValue.text` or `testID` augmentation in `ThemeSwitcher.tsx` so the assertion is deterministic. Mirror the pattern already used in `ThemeChipGrid` if it has one.

**Validation:**

```bash
# Per maestro-e2e skill conventions:
maestro test apps/native-rd/e2e/flows/settings-theme-persists-restart.yaml
```

### Commit 4 _(optional)_ — `docs(native-rd): theme persistence architecture note`

Short ADR-style note in `apps/native-rd/docs/architecture/` describing the read/write pattern and why the persistence layer validates against the 7 exposed themes rather than the 14 registered ones. Link from `apps/native-rd/docs/architecture/index.md`.

Defer if the work above already lands cleanly — code is short and self-explanatory.

---

## Acceptance criteria — mapped to issue #943

| Issue criterion                                                                 | Covered by                                                                                                                                                                   |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Selecting `Night Ride` persists across full restart                             | Commit 2 (impl) + Commit 3 (Maestro flow)                                                                                                                                    |
| All supported exposed themes persist across restart                             | Commit 1 unit test (parameterized over `themeOptions`)                                                                                                                       |
| Invalid/legacy saved values don't crash, resolve to documented fallback         | Commit 1 — `isValidThemeName` guard + `light-default` fallback + log                                                                                                         |
| `themeOptions`, `themeNames`, persisted values, validation all agree after #940 | **Partial:** persistence aligns with the 7 `themeOptions`. The 14-theme registry mismatch is documented as out-of-scope (see Scope) and tracked by reopening #940 if wanted. |
| No visible reset to `light-default` after dark theme saved                      | Commit 2 leverages `ThemedApp`'s existing `isFirstLaunch === null` loading branch as the deliberate loading state                                                            |
| Unit tests cover read/write + invalid saved values                              | Commit 1 test file                                                                                                                                                           |
| E2E verifies select → restart → still selected                                  | Commit 3                                                                                                                                                                     |

---

## Risks & open questions

- **R1 — Provider nesting subtlety:** if anything mounts between the outer `ThemeProvider` and `ThemedApp`'s inner provider and calls `setTheme`, it'll get the non-persisting version. Today nothing does, but if `WelcomeScreen` ever gets a theme picker we'll need to revisit. Document in the new hook's comment.
- **R2 — Cross-device sync:** Evolu syncs `userSettings.theme` across devices. If device A changes theme, device B's `useThemePersistence` will receive the change via `useUserSettingsRow` reactivity and call `UnistylesRuntime.setTheme()` mid-session. That's the desired behavior, but verify it doesn't trigger a re-render storm in Storybook or test environments where `UnistylesRuntime` is mocked.
- **R3 — Test mocks:** `UnistylesRuntime` is a native module. Existing tests under `apps/native-rd/src/components/Theme*/__tests__/` already handle this — reuse those mock patterns.
- **R4 — Flash visibility:** If manual QA finds the cold-start flash unacceptable, file a separate ticket for a synchronous warm-store read. Do not expand this PR.

---

## Out-of-band follow-ups to file (post-merge)

1. **Reopen #940** with a note that registry cleanup didn't actually ship and is now blocked by post-#943 validation set choices.
2. **Adjacent fix in `useAnimationPref.ts:50`** — it reads `UnistylesRuntime.themeName` directly instead of going through `useThemeContext`. Same pattern bug, different hook. Small follow-up.
