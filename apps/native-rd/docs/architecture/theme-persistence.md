# Architecture: Theme Persistence

**Status:** Current
**Last Verified:** 2026-05-13
**Tracking issue:** [#943](https://github.com/rollercoaster-dev/openbadges-monorepo/issues/943)

---

## Purpose

Persist the user's theme selection across app restarts and across devices, without re-architecting the provider tree.

---

## Two-layer model

| Concern              | Owner                                          | Notes                                                    |
| -------------------- | ---------------------------------------------- | -------------------------------------------------------- |
| Active runtime theme | `react-native-unistyles` `UnistylesRuntime`    | In-memory; resets to `initialTheme` on every cold start. |
| Persistent storage   | Evolu `userSettings.theme` column              | Local-first SQLite, sync across devices.                 |
| Validation           | `VALID_THEME_NAMES` in `src/hooks/useTheme.ts` | The 7 entries in `themeOptions`.                         |

Unistyles is the **renderer**. Evolu is the **source of truth**. They are kept in sync by a single hook.

---

## The hook

`src/hooks/useThemePersistence.ts` mirrors the pattern established by `src/hooks/useDensity.ts`:

- **Read side** — `useUserSettingsRow()` returns the live `userSettings` row. A `useEffect` reacts to `settings.theme` changes:
  - `null` / `undefined` → no-op (stay on initial).
  - Valid `ThemeName` → `UnistylesRuntime.setTheme(value)` once per distinct value.
  - Invalid (legacy / garbage) → log a warning and `setTheme(FALLBACK_THEME_NAME)`. The fallback is **not** written back to Evolu; this leaves room to recover the original value if a future build re-supports it.
- **Write side** — exposed `setTheme(name)` validates, calls `UnistylesRuntime.setTheme(name)` for the optimistic UI update, then `updateUserSettings(settings.id, { theme: name })`. Errors from Evolu are swallowed so the UI still moves — the worst case is a single session not persisting.
- **Idempotence** — a `lastAppliedRef` guards against re-applying the same theme on every Evolu re-emission. Without it, every unrelated `userSettings` change (density, animation pref, hasSeenWelcome) would trigger a full Unistyles re-style pass.

---

## Provider order — nested override

`App.tsx` calls `useTheme()` at the root because Unistyles must be configured before any styled child mounts. That call sits **outside** `EvoluAppProvider`, so it cannot read Evolu directly.

The fix is a nested `<ThemeProvider>` inside `ThemedApp` (which lives inside `EvoluAppProvider`). React's nearest-context-wins rule means all descendants — `ThemeSwitcher`, `ThemeChipGrid`, `WelcomeScreen`, and the loading branch — see the persisting `setTheme`. The outer provider keeps a Unistyles-only fallback for anything that ever mounts above `EvoluAppProvider` (currently nothing).

```text
App
└── ThemeProvider (outer)             ← Unistyles-only setTheme
    └── EvoluAppProvider
        └── SafeAreaProvider
            └── ThemedApp
                └── ThemeProvider (inner, persisting)
                    └── NavigationContainer / WelcomeScreen / loading View
```

---

## Validation surface

`VALID_THEME_NAMES` is a `Set<ThemeName>` derived from the 7 exposed `themeOptions`. Both read and write paths gate on `isValidThemeName()`. This is intentionally **narrower** than the typed `ThemeName` union (14 values from `compose.ts`) — see _Known mismatch_ below.

---

## Known mismatch with `compose.ts`

`src/themes/compose.ts:278-289` registers all 14 combinations of `colorMode × variant`. The settings UI exposes only the 7 in `themeOptions`. Issue [#940](https://github.com/rollercoaster-dev/openbadges-monorepo/issues/940) intended to collapse the registry to 7 but the cleanup did not land.

The persistence layer treats the 7 as canonical: writes are restricted to that set, and reads outside the set fall back. We did **not** delete the extra 7 from the registry because hooks like `useDensity.ts:11` iterate `themeNames` to push per-theme density updates and shrinking the registry would silently drop coverage. Reopen #940 if/when that consolidation is wanted.

---

## Flash policy

Cold start sequence:

1. `unistyles.ts:11` configures `initialTheme: "light-default"`.
2. `App` mounts, fonts load, outer `ThemeProvider` mounts with Unistyles-only setter.
3. `EvoluAppProvider` hydrates SQLite.
4. `useThemePersistence` reads `userSettings.theme` and calls `UnistylesRuntime.setTheme(saved)`.
5. `ThemedApp`'s `isFirstLaunch === null` loading view paints a neutral background colored by whatever theme Unistyles has at that frame.
6. Loading branch resolves, real UI mounts with the saved theme.

The window between steps 1 and 4 is a single-frame `light-default` flash on cold start. This is acceptable per the issue's "unless a deliberate loading state is shown first" clause — step 5's neutral loading view is that state. Eliminating the flash entirely would require a synchronous warm store (SecureStore or MMKV) read before `StyleSheet.configure()` runs — a larger architectural change tracked separately.

---

## Cross-device sync

Because `userSettings.theme` flows through Evolu, a theme change on device A propagates to device B via the existing sync channel. `useThemePersistence`'s read effect reacts to the inbound update and calls `UnistylesRuntime.setTheme()` mid-session. The idempotence guard prevents double-application when the local write also triggers the same Evolu emission.

---

## Test coverage

| Layer                                                               | File                                                         |
| ------------------------------------------------------------------- | ------------------------------------------------------------ |
| Unit (read, write, validation, fallback, idempotence, cross-device) | `src/hooks/__tests__/useThemePersistence.test.ts` — 18 cases |
| E2E (immediate selection)                                           | `e2e/flows/settings-theme-switch.yaml`                       |
| E2E (restart persistence)                                           | `e2e/flows/settings-theme-persists-restart.yaml`             |

The E2E restart flow uses a combined `id="selected-theme"` + `text="Night Ride"` matcher so it fails closed if persistence regresses and the runtime defaults back to `light-default` after restart.

---

## Code map

- `src/hooks/useTheme.ts` — `themeOptions`, `VALID_THEME_NAMES`, `FALLBACK_THEME_NAME`, `isValidThemeName`, outer `useTheme()` hook.
- `src/hooks/useThemePersistence.ts` — Evolu read/write + Unistyles application.
- `App.tsx` — provider nesting (outer + inner `ThemeProvider`).
- `src/db/schema.ts:154-156` — `userSettings.theme` column.
- `src/db/queries.ts:1123-1136` — `updateUserSettings` theme branch.
- `src/themes/compose.ts:278-289` — 14-theme registry (see _Known mismatch_).
