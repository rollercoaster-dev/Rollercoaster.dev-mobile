# Development Plan: Issue #416

## Issue Summary

**Title**: [Integrate] SettingsScreen re-skin
**Type**: feature (integration/wiring — `[Integrate]` track)
**Complexity**: SMALL
**Estimated Lines**: ~150-180 lines

## Intent Verification

- [ ] `SettingsScreen` renders, in order: header "Settings", Theme section (rail + live sample card), Content Density (3 rows), Onboarding ("Replay welcome" row), About (app/version/built-with) — matching `SettingsFrame.dc.html`'s Theme → Density → Onboarding → About stack.
- [ ] Tapping a theme swatch in the Settings Theme section calls `useThemeContext().setTheme`, which re-skins the whole app (verified across Full Ride / Night Ride / one shadow-off theme per acceptance criteria), and shows the existing `settings:errors.themeSaveFailed` toast only when persistence fails.
- [ ] Tapping a density row calls `useDensity().setDensity` exactly as today (unchanged behavior — only the presentational component changes from ad hoc `SettingsRow`s to `SettingsDensityRows`).
- [ ] Tapping "Replay welcome" navigates to a modal `Welcome` screen inside `SettingsStack` that renders the unmodified `WelcomeScreen`; dismissing it (its existing "Get started" CTA) returns to Settings without touching the `hasSeenWelcome` flag.
- [ ] The old `ThemeSwitcher` mount is gone from `SettingsScreen`; `__DEV__`-gated Language and Dev-tools sections still render only under `__DEV__`.
- [ ] `bun run test --testPathPatterns SettingsScreen` is green; `bun run type-check` and `bun run lint` are clean.

## Dependencies

| Issue | Title                                                              | Status                                     | Type    |
| ----- | ------------------------------------------------------------------ | ------------------------------------------ | ------- |
| #500  | A11y: keep theme/density radios reachable in native screen readers | ✅ Met (closed 2026-08-07)                 | Blocker |
| #415  | [Storybook] Settings theme-picker + density rows                   | ✅ Met (closed)                            | Blocker |
| #413  | Welcome rail (`ThemeSwatchRail`/`ThemeSampleCard`)                 | ✅ Met (implied closed — #415 built on it) | Soft    |

**Status**: ✅ All dependencies met. No blockers.

## Objective

Slim `SettingsScreen.tsx` from a screen that builds its own ad hoc theme/density UI into a thin container that mounts the two verified, storied presentational components from #415 (`SettingsThemeSection`, `SettingsDensityRows`) in the real section order, adds the Onboarding "Replay welcome" row, and leaves About / dev-only sections untouched.

## Decisions

| ID  | Decision                                                                                                                                                                                                                                                                                              | Alternatives Considered                                                                                                                                                                               | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Wire `SettingsThemeSection`'s controlled `selectedThemeId`/`onSelect` to `useThemeContext().themeName` / `setTheme`, showing `settings:errors.themeSaveFailed` on a `false` return — the exact pattern `ThemeSwitcher.tsx:159-169` already uses.                                                      | Leave `ThemeSwitcher` mounted alongside the new section; invent a new error key.                                                                                                                      | `SettingsThemeSection.tsx:14-31`'s own docstring states this component is "context-free ... only changes once #416 wires `onSelect` → `useThemeContext().setTheme`" — this is the component's documented contract, not a new design choice. The toast key already exists (`en/settings.json:29`) and is proven in `ThemeSwitcher`.                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| D2  | Wire `SettingsDensityRows`'s controlled `selectedLevel`/`onSelect` to the existing `useDensity()` hook (`densityLevel`/`setDensity`), reusing the current `DensityPicker`'s failure-toast logic (`settings:errors.densitySaveFailed`).                                                                | Keep the screen's inline `DensityPicker` function and just swap its children.                                                                                                                         | `SettingsDensityRows.tsx:32-35` docstring: "the parent (#416 `SettingsScreen`) owns `selectedLevel` and persists it via `useDensity()`" — again the component's documented contract. Behavior (toast on failed persist) is unchanged from today's `DensityPicker`, only the row markup moves into the shared component.                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| D3  | Add a new `Welcome` route to `SettingsStackParamList` / `SettingsStack.tsx`, presented with `presentation: "modal"`, rendering unmodified `WelcomeScreen` via a thin wrapper (`onGetStarted={() => navigation.goBack()}`). "Replay welcome" navigates there; no `hasSeenWelcome` mutation is touched. | (a) Reuse `App.tsx`'s first-launch conditional render path somehow; (b) add a DB "unseen" mutation so replay resets first-launch state; (c) inline a copy of `WelcomeScreen`'s JSX into a new screen. | `WelcomeScreen` is rendered by `App.tsx:82-84` entirely _outside_ any navigator (conditional on `useFirstLaunch()`, above `NavigationContainer`) — there is no existing "Welcome" route to navigate to, and (per `SettingsDensityRows.tsx:27-28`) only a mark-seen mutation (`markWelcomeSeen`, `db/queries.ts:1748`) exists — no reset-to-unseen mutation. Building one is out of scope for a ~150 LOC "nothing invented" issue. `presentation: "modal"` covering the tab bar with zero extra plumbing is exactly the precedent `GoalsStack.tsx`'s `NewGoal`/`CompletionFlow` screens set (`GoalsStack.tsx` D1 comment). Reusing `WelcomeScreen` unmodified satisfies "nothing invented"; goBack() on the CTA is the simplest exit that doesn't touch `hasSeenWelcome`. |
| D4  | New i18n keys: `settings:onboarding.title` = "Onboarding", `settings:onboarding.replayWelcome` = "Replay welcome" (en + de), regenerate `pseudo/settings.json` via `bun run gen:pseudo`.                                                                                                              | Reuse `welcome:*` namespace keys; hardcode English (i18n-skip) like `DevToolsSection`.                                                                                                                | Copy is taken verbatim from the prototype (`SettingsFrame.dc.html:106,108`: "Onboarding" / "Replay welcome"). This is a real, user-facing (non-`__DEV__`) row, so it must be translated like every other Settings row — `DevToolsSection`'s hardcoded-English precedent explicitly does not apply (that section is dev-only, exempted by its own docstring).                                                                                                                                                                                                                                                                                                                                                                                                             |
| D5  | Keep the `Suspense`+`ErrorBoundary` wrapper only around the density section (mirroring today's `DensityPicker` wrapping); leave the theme section and the new Onboarding section unwrapped, mirroring today's unwrapped `ThemeSwitcher`.                                                              | Wrap every new section in its own `Suspense`/`ErrorBoundary`.                                                                                                                                         | Preserves exactly today's boundary placement (`SettingsScreen.tsx:143-147`); no evidence in the codebase that the theme or onboarding sections need it, and expanding boundary usage isn't part of this issue's scope.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| D6  | Onboarding row uses the existing `SettingsRow` "button" affordance (plain `onPress` + chevron) — the same vocabulary `DevToolsSection`'s "Intl probe" row already uses (`SettingsScreen.tsx:118-121`).                                                                                                | A custom pressable card matching the prototype's raw `<div onClick>` markup pixel-for-pixel.                                                                                                          | #415/#416 issue text: "Use the existing `SettingsSection` + `SettingsRow` vocabulary — don't redesign rows into cards" (from the related #415 scope, carried into #416's "nothing invented" instruction). `SettingsRow.tsx:78` already renders the `›` chevron for any row with `onPress`, matching the prototype's tap affordance without new component work.                                                                                                                                                                                                                                                                                                                                                                                                           |

## Affected Areas

- `apps/native-rd/src/screens/SettingsScreen/SettingsScreen.tsx`: remove `ThemeSwitcher` import/mount and the inline `DensityPicker`; mount `SettingsThemeSection` (wired to `useThemeContext`) and `SettingsDensityRows` (wired to `useDensity`) in place; add an `OnboardingSection` component with the "Replay welcome" row navigating to `"Welcome"`.
- `apps/native-rd/src/navigation/types.ts`: add `Welcome: undefined` to `SettingsStackParamList`.
- `apps/native-rd/src/navigation/SettingsStack.tsx`: register a `Welcome` screen (`presentation: "modal"`) via a thin wrapper component that supplies `onGetStarted={() => navigation.goBack()}` to `WelcomeScreen`.
- `apps/native-rd/src/i18n/resources/en/settings.json`: add `onboarding.title`, `onboarding.replayWelcome`.
- `apps/native-rd/src/i18n/resources/de/settings.json`: add the German equivalents.
- `apps/native-rd/src/i18n/resources/pseudo/settings.json`: regenerated via `bun run gen:pseudo` (no hand edits).
- `apps/native-rd/src/screens/SettingsScreen/__tests__/SettingsScreen.test.tsx`: replace `ThemeSwitcher`-specific assertions with `SettingsThemeSection` wiring assertions (setTheme call, failure toast); replace inline density-row assertions with `SettingsDensityRows` wiring assertions (mostly unchanged behavior, new component); add Onboarding nav test + About/`__DEV__` regression coverage (unchanged sections, keep passing).

## Implementation Plan

### Step 1: Add the `Welcome` replay route

**Files**: `src/navigation/types.ts`, `src/navigation/SettingsStack.tsx`
**Commit**: `feat(native-rd): add modal Welcome replay route to SettingsStack`
**Changes**:

- [ ] Add `Welcome: undefined;` to `SettingsStackParamList` in `types.ts`.
- [ ] In `SettingsStack.tsx`, add a small wrapper component (e.g. `WelcomeReplayScreen`) that calls `useNavigation<NativeStackNavigationProp<SettingsStackParamList>>()` and renders `<WelcomeScreen onGetStarted={() => navigation.goBack()} />`.
- [ ] Register `<Stack.Screen name="Welcome" component={WelcomeReplayScreen} options={{ presentation: "modal" }} />`, matching the `GoalsStack.tsx` `NewGoal`/`CompletionFlow` modal precedent (covers the tab bar with no extra `tabBarStyle` plumbing).

### Step 2: Add Onboarding i18n keys

**Files**: `src/i18n/resources/en/settings.json`, `src/i18n/resources/de/settings.json`, `src/i18n/resources/pseudo/settings.json` (generated)
**Commit**: `feat(native-rd): add settings:onboarding i18n keys`
**Changes**:

- [ ] Add `"onboarding": { "title": "Onboarding", "replayWelcome": "Replay welcome" }` to `en/settings.json`, matching prototype copy verbatim (`SettingsFrame.dc.html:106,108`).
- [ ] Add the German equivalents to `de/settings.json` (plain, matter-of-fact register per `_register/settings.yml` notes — e.g. "Erneut ansehen" / "Willkommen" style, avoiding the banned phrasings list).
- [ ] Run `bun run gen:pseudo` to regenerate `pseudo/settings.json` — do not hand-edit it.

### Step 3: Wire `SettingsThemeSection` and `SettingsDensityRows` into `SettingsScreen`

**Files**: `src/screens/SettingsScreen/SettingsScreen.tsx`
**Commit**: `feat(native-rd): mount verified theme/density sections in SettingsScreen`
**Changes**:

- [ ] Remove the `ThemeSwitcher` import and its `<ThemeSwitcher />` mount.
- [ ] Remove the inline `DensityPicker` function; import `SettingsDensityRows` instead.
- [ ] Import `SettingsThemeSection`, `useThemeContext` (from `hooks/useTheme`).
- [ ] In `SettingsScreen`, destructure `{ themeName, setTheme } = useThemeContext()` and `{ densityLevel, setDensity } = useDensity()`.
- [ ] Render `<SettingsThemeSection selectedThemeId={themeName} onSelect={(id) => { if (!setTheme(id)) showToast({ message: t("settings:errors.themeSaveFailed") }); }} />` where the screen renders today, replacing the `ThemeSwitcher` mount. Requires pulling in `useToast()` at the screen level (currently only used inside `DensityPicker`).
- [ ] Wrap `SettingsDensityRows` the same way the old `DensityPicker` was wrapped (`Suspense` + `ErrorBoundary`), passing `selectedLevel={densityLevel}` and the same `onSelect` failure-toast logic as today's density picker.
- [ ] Keep `__DEV__ && <LanguagePicker />` and `__DEV__ && <DevToolsSection />` exactly as-is, in their current position.
- [ ] Keep the `About` `SettingsSection` and footer `Text` exactly as-is.

### Step 4: Add the Onboarding section

**Files**: `src/screens/SettingsScreen/SettingsScreen.tsx`
**Commit**: `feat(native-rd): add Onboarding replay-welcome row to SettingsScreen`
**Changes**:

- [ ] Add an `OnboardingSection` component (mirroring `DevToolsSection`'s shape) with a `SettingsSection` titled `t("settings:onboarding.title")` containing one `SettingsRow` labeled `t("settings:onboarding.replayWelcome")`, `onPress={() => navigation.navigate("Welcome")}`.
- [ ] Mount `<OnboardingSection />` between the density section and the About section (matching `SettingsFrame.dc.html`'s Theme → Density → Onboarding → About order) — i.e. after the `__DEV__` sections, before `About`, since the `__DEV__` sections are dev-only chrome not part of the real section order.

### Step 5: Update tests

**Files**: `src/screens/SettingsScreen/__tests__/SettingsScreen.test.tsx`
**Commit**: `test(native-rd): update SettingsScreen tests for theme/density/onboarding wiring`
**Changes**:

- [ ] Replace the `ThemeSwitcher`-shaped assertions ("renders … with all theme options", "renders theme options with radio accessibility roles", "calls setTheme when a theme option is pressed") with equivalent assertions against `SettingsThemeSection`'s rendered output (same `common:theme.options.*` keys/labels, same `mockSetTheme` mock already wired via the existing `useThemeContext` mock) — add a failure-toast test for `setTheme` returning `false`, mirroring the existing `setDensity` failure-toast test.
- [ ] Update the density assertions to target `SettingsDensityRows`'s rendered markup (labels/values are unchanged; the existing `mockSetDensity` mock and failure-toast test carry over largely unchanged).
- [ ] Add a mock for `useNavigation` (mirroring `BadgesScreen.test.tsx`'s `jest.mock("@react-navigation/native", ...)` pattern) and a test asserting `navigate("Welcome")` fires on "Replay welcome" press.
- [ ] Add/extend the pseudo-locale `it.each` table to include `settings:onboarding.title` and `settings:onboarding.replayWelcome`.
- [ ] Leave the About-section, footer, Sentry-debug-tools, and `LanguagePicker`/`DevToolsSection` `describe` blocks untouched — they cover code this issue does not change.

## Testing Strategy

- [ ] Unit tests for `SettingsScreen` wiring (Jest 30, `@testing-library/react-native` v13) per Step 5 above.
- [ ] Test file stays at `src/screens/SettingsScreen/__tests__/SettingsScreen.test.tsx` (existing location, mirrors `src/`).
- [ ] Reuse `test.each` for the pseudo-locale key table (existing pattern).
- [ ] No new visual/Storybook assertions — `SettingsThemeSection`/`SettingsDensityRows` visuals are already covered by #415's stories; this issue only tests wiring.
- [ ] Manual testing: run the app, confirm tapping a theme swatch in Settings re-skins the whole app live (Full Ride, Night Ride, one shadow-off theme e.g. `light-autismFriendly`), confirm density rows still scale spacing, confirm "Replay welcome" opens the Welcome modal and "Get started" dismisses back to Settings.

## Not in Scope

| Item                                                                                 | Reason                                                                                                                                                                                                                                         | Follow-up                                                                  |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Resetting `hasSeenWelcome` when "Replay welcome" is tapped                           | No reset mutation exists in the DB layer today; only `markWelcomeSeen` (forward) exists. Building one would exceed the ~150 LOC "nothing invented" budget and isn't required by the acceptance criteria (which only ask for a nav affordance). | none (raise as a separate issue if product wants true first-launch replay) |
| Reduce Motion settings row (`animationPref`)                                         | Explicitly flagged as a candidate follow-up in `SettingsDensityRows.tsx:24-25`, not part of this issue's scope (Theme/Density/Onboarding/About only).                                                                                          | none                                                                       |
| "Text size" row on `fontScale`                                                       | `SettingsDensityRows.tsx:29-30` notes nothing reads `fontScale` yet — building UI for it without a consumer is explicitly discouraged.                                                                                                         | none                                                                       |
| Changing `ThemeSwatchRail`/`ThemeSampleCard`/`SettingsRow`/`SettingsSection` visuals | All presentational parts are already verified in Storybook (#413/#415); this issue is wiring + presentation assembly only.                                                                                                                     | none                                                                       |

## Discovery Log

- [2026-08-08] **Step 3 plan defect — corrected.** The step said to destructure
  `useDensity()` in the `SettingsScreen` body. That would move the Evolu
  suspension OUTSIDE the `Suspense`/`ErrorBoundary` that D5 exists to preserve,
  suspending the whole screen instead of just the density section. Implemented
  with a thin `DensitySection` component that calls `useDensity()` _inside_ the
  boundary and renders `SettingsDensityRows`, keeping today's boundary
  placement exactly. `useThemeContext()` is a plain context (never suspends), so
  it is destructured at the screen level as planned.
- [2026-08-08] Steps 3 and 4 landed as one commit — both are edits to the same
  file assembling the same section stack; splitting them would have produced a
  non-building intermediate ordering with no review value.
- [2026-08-08] Test assertions changed shape more than Step 5 anticipated:
  `ThemeSwatchRail` renders only the _selected_ theme's label/description as
  text (the other six are swatches with `accessibilityLabel` only), so the
  per-theme assertions moved from `getByText(label)` to
  `getByLabelText(themeA11yLabel(t, id))`. Radio count is now 10 (7 swatches +
  3 density rows), not 7.
- [2026-08-08] `ThemeSwitcher` is still mounted by `TestScreen.tsx`, so the
  component, its stories and its tests stay — only the `SettingsScreen` mount
  was removed.
- [2026-08-08] Verified green: `bun run test` (211 suites / 10067 tests),
  `bun run type-check`, `bun run lint` (0 errors; 201 pre-existing warnings).
  Manual on-device verification of live re-skin / modal dismissal is still
  outstanding.
