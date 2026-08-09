# Development Plan: Issue #414

## Issue Summary

**Title**: [Integrate] WelcomeScreen re-skin
**Type**: feature (Storybook-part integration, presentation only)
**Complexity**: SMALL
**Estimated Lines**: ~150-180 lines (issue's own estimate is ~250 LOC; actual is lower because both new pieces — `ThemeSwatchRail`, `ThemeSampleCard` — already ship from #413 and this is wiring + test/i18n cleanup, not new UI)

## Intent Verification

- [x] `WelcomeScreen` renders `ThemeSwatchRail` (not `ThemeChipGrid`) directly below the picker label, and a live `ThemeSampleCard` above it, sourced from `useThemeContext()`.
- [x] Tapping any of the 7 swatches calls `setTheme(id)`; the hero band, body copy, sample card, and footer/CTA all re-skin immediately (via Unistyles' existing reactive `theme.colors.*` usage — no new re-skin logic needed).
- [x] `Get Started` still calls `onGetStarted` (App.tsx's `markSeen`), which the existing `useFirstLaunch` flow persists as `hasSeenWelcome`, unchanged by this PR.
- [~] `WelcomeScreen.stories.tsx` renders without throwing "useThemeContext must be used within a ThemeProvider" — the `ThemeProvider` wrapper is in place and type-checks, but the story was not rendered in on-device Storybook.
- [x] `bun run test --testPathPatterns WelcomeScreen` is green; `bun run type-check` and `bun run lint` are clean.

## Dependencies

| Issue | Title                                                                         | Status    | Type                     |
| ----- | ----------------------------------------------------------------------------- | --------- | ------------------------ |
| #500  | A11y: keep theme and density radio choices reachable in native screen readers | ✅ CLOSED | Blocker                  |
| #413  | [Storybook] ThemeSwatchRail + ThemeSampleCard                                 | ✅ CLOSED | Blocker (Storybook gate) |

**Status**: ✅ All dependencies met. Both blockers are closed; `ThemeSwatchRail`/`ThemeSampleCard` are built and verified in Storybook with zero importers outside their own directories today (confirmed — only `SettingsThemeSection`, itself unmounted pending #416, imports them).

## Objective

Re-skin `WelcomeScreen` from the old `ThemeChipGrid` picker + inline "sample card" `View` to the verified `ThemeSwatchRail` + live `ThemeSampleCard` (#413), matching the `SettingsThemeSection` (#415) wiring pattern one-for-one. Presentation + mounting only — no new UI, no changes to the theme-persistence path or the first-run gate.

## Decisions

| ID  | Decision                                                                                                                                                                                                                                                                                               | Alternatives Considered                                                                                            | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | `WelcomeScreen` calls `useThemeContext()` itself to get `themeName`/`setTheme`, then passes `selectedThemeId={themeName} onSelect={setTheme}` to `ThemeSwatchRail` and `themeId={themeName}` to `ThemeSampleCard`.                                                                                     | Have `WelcomeScreen` keep local `useState` and sync it to the theme separately.                                    | `ThemeSwatchRail`/`ThemeSampleCard` are stateless/controlled (`src/components/ThemeSwatchRail/ThemeSwatchRail.tsx:14-17`). The exact same hook call already drives the old `ThemeChipGrid` (`src/components/ThemeChipGrid/ThemeChipGrid.tsx:10`), and `WelcomeScreen.test.tsx:10-21` already mocks `useThemeContext` with a `setTheme` spy — the test file was written anticipating this exact wiring. No local state needed; the global theme _is_ the Welcome screen's state, same as `ThemeChipGrid` today.                                                                                                                                                                                                                              |
| D2  | Mount `<ThemeSampleCard themeId={themeName} />` directly in the `ScrollView`, with no `Card` wrapper. Delete the inline `Card size="compact"` + `sampleRow`/`sampleBadge`/`sampleText` block and its styles.                                                                                           | Keep wrapping it in the shared `Card` component for visual consistency with the rest of the screen.                | `ThemeSampleCard` already renders its own card chrome — border, radius, background, and per-theme `shadowStyle` (`src/components/ThemeSampleCard/ThemeSampleCard.tsx:33-40`). The one other integration of this exact component, `SettingsThemeSection.tsx:39-42`, mounts it bare inside a plain `View`, not inside `Card`. Double-wrapping would nest two card frames.                                                                                                                                                                                                                                                                                                                                                                     |
| D3  | Drop the `welcome:sample.progress` i18n key from `en`/`de`/`pseudo` `welcome.json`.                                                                                                                                                                                                                    | Leave the orphaned key in place.                                                                                   | The issue's verbatim key list for the re-skinned screen (hero, intro, themePicker, cta) does not include a `sample.*` key — the sample card's copy now comes entirely from `common:theme.preview.*` (`ThemeSampleCard.tsx:112-119`, already covers title/progress/cta). Once the inline sample block is deleted (D2), `welcome:sample.progress` has zero remaining references (verified via repo-wide grep) — removing it avoids a checked-in dead key across 3 locale files.                                                                                                                                                                                                                                                               |
| D4  | Rewrite the `WelcomeScreen.test.tsx` radiogroup assertion to query via `screen.getByLabelText(t("common:theme.picker.groupLabel")).props.accessibilityRole`, not `screen.getByRole("radiogroup")`.                                                                                                     | Leave the existing `getByRole("radiogroup")` assertion as-is.                                                      | `ThemeSwatchRail`'s group wrapper deliberately omits the `accessible` prop (`ThemeSwatchRail.tsx:39-59`, hardened by #500) so its 7 child radios stay individually reachable — but RNTL's `getByRole` only matches elements with a truthy `accessible` prop. Issue #500's own dev plan (`docs/plans/dev-plans/issue-500-a11y-radio-reachability.md`, D2) documents this exact gap and explicitly calls out `#414 (WelcomeScreen)` as a future caller that must use `getByLabelText(...).props.accessibilityRole` instead. `ThemeSwatchRail.test.tsx:66-76` already uses this pattern.                                                                                                                                                       |
| D5  | Rewrite "renders all 7 theme option labels" to assert via `screen.getByLabelText(themeA11yLabel(t, id))` for each of the 7 options, not `screen.getByText(...options.<id>.label)`.                                                                                                                     | Leave the `getByText` assertions as-is.                                                                            | `ThemeSwatchRail` only renders one theme's name/description as visible `<Text>` (the selected one, in its caption) — the other 6 exist solely as each swatch's `accessibilityLabel` (`ThemeSwatchRail.tsx:70-76`, via the shared `themeA11yLabel` helper). `getByText` for the 6 unselected labels will not match post-swap; `getByLabelText` is exactly the pattern `ThemeSwatchRail.test.tsx:26-33` already uses to assert the same "7 reachable options" property.                                                                                                                                                                                                                                                                       |
| D6  | Drop the `welcome:sample.progress` entry from the pseudo-locale `it.each` list in `WelcomeScreen.test.tsx`, and change the "renders the sample card content" test to assert `common:theme.preview.title`/`.progress` (still rendered, now via `ThemeSampleCard`) instead of `welcome:sample.progress`. | Keep asserting the removed key (test would fail) or duplicate `ThemeSampleCard`'s own pseudo-locale coverage here. | The key is deleted (D3), so any reference to it must go. `ThemeSampleCard` is unit-tested for pseudo/i18n routing already at the component level in principle (its own copy is display-only and theme-independent) — `WelcomeScreen`'s job is to prove it _mounted_, not to re-verify `ThemeSampleCard` internals, matching the "integration test, not duplicate unit test" pattern used elsewhere in this screen's test file (e.g. it does not re-verify every `ThemeSwatchRail` a11y behavior, just that 7 radios + 1 radiogroup exist).                                                                                                                                                                                                  |
| D7  | Wrap `WelcomeScreen.stories.tsx`'s story in a local `ThemeProvider`, mirroring `ThemeSwitcher.stories.tsx`'s `StoryProviders` helper.                                                                                                                                                                  | Leave the story unwrapped (status quo).                                                                            | `WelcomeScreen` will now call `useThemeContext()` directly (D1), which throws outside a `ThemeProvider` (`src/hooks/useTheme.ts:66-69`). There is no global `ThemeProvider` decorator in `.storybook/preview.tsx` (only a Unistyles `UnistylesRuntime.setTheme` toggle). `ThemeSwitcher.stories.tsx:13-32` already solves this exact problem for a component with the same dependency, wiring `setTheme` straight to `UnistylesRuntime.setTheme` (persistence is a Storybook no-op). Note: this indicates the _current_ `WelcomeScreen.stories.tsx` is already broken today (it mounts `ThemeChipGrid`, which also calls `useThemeContext()` unguarded) — this PR fixes that latent gap as a byproduct, not a new regression it introduces. |

## Affected Areas

- `src/screens/WelcomeScreen/WelcomeScreen.tsx`: swap `ThemeChipGrid` → `ThemeSwatchRail`; swap the inline sample `Card` block → `ThemeSampleCard`; source both from `useThemeContext()`.
- `src/screens/WelcomeScreen/WelcomeScreen.styles.ts`: remove now-dead `sampleRow`/`sampleBadge`/`sampleBadgeText`/`sampleText`/`sampleMeta` styles.
- `src/screens/WelcomeScreen/WelcomeScreen.stories.tsx`: wrap the story in a `ThemeProvider` (D7).
- `src/screens/WelcomeScreen/__tests__/WelcomeScreen.test.tsx`: update the radiogroup assertion (D4), the "7 labels" assertion (D5), the sample-card content assertion + pseudo `it.each` list (D6).
- `src/i18n/resources/en/welcome.json`, `de/welcome.json`, `pseudo/welcome.json`: remove the orphaned `sample.progress` key (D3).

## Implementation Plan

### Step 1: Swap the picker + sample card in `WelcomeScreen`

**Files**: `src/screens/WelcomeScreen/WelcomeScreen.tsx`, `src/screens/WelcomeScreen/WelcomeScreen.styles.ts`, `src/i18n/resources/en/welcome.json`, `src/i18n/resources/de/welcome.json`, `src/i18n/resources/pseudo/welcome.json`
**Commit**: `feat(native-rd): re-skin WelcomeScreen with ThemeSwatchRail + live ThemeSampleCard`
**Changes**:

- [x] Import `ThemeSwatchRail` (from `../../components/ThemeSwatchRail`), `ThemeSampleCard` (from `../../components/ThemeSampleCard`), and `useThemeContext` (from `../../hooks/useTheme`); remove the `ThemeChipGrid` and `Card` imports.
- [x] Destructure `const { themeName, setTheme } = useThemeContext();` alongside the existing `useUnistyles()` call.
- [x] Replace the `<Card size="compact">...</Card>` sample block with `<ThemeSampleCard themeId={themeName} />`.
- [x] Replace `<ThemeChipGrid />` with `<ThemeSwatchRail selectedThemeId={themeName} onSelect={setTheme} />`.
- [x] Remove the now-unused `sampleRow`/`sampleBadge`/`sampleBadgeText`/`sampleText`/`sampleMeta` entries from `WelcomeScreen.styles.ts`.
- [x] Remove the `sample.progress` key from `en/welcome.json`, `de/welcome.json`, `pseudo/welcome.json` (D3).

### Step 2: Update `WelcomeScreen` tests for the new a11y contract

**Files**: `src/screens/WelcomeScreen/__tests__/WelcomeScreen.test.tsx`
**Commit**: `test(native-rd): update WelcomeScreen tests for the ThemeSwatchRail a11y contract`
**Changes**:

- [x] Import `themeA11yLabel` from `../../../i18n/labels`.
- [x] Rewrite "renders all 7 theme option labels" to assert `screen.getByLabelText(themeA11yLabel(i18n.t.bind(i18n), option.id))` for each of the 7 `themeOptions` (D5).
- [x] Rewrite "theme options container has accessibilityRole=radiogroup" to assert via `screen.getByLabelText(i18n.t("common:theme.picker.groupLabel")).props.accessibilityRole === "radiogroup"` (D4).
- [x] Update "renders the sample card content" to drop the `welcome:sample.progress` assertion and instead assert `screen.getByText(i18n.t("common:theme.preview.progress"))` (D6) alongside the existing `common:theme.preview.title` assertion.
- [x] Remove `"welcome:sample.progress"` from the pseudo-locale `it.each` key list (D6).
- [x] Leave the "theme options have accessibilityRole=radio" test as-is — `screen.getAllByRole("radio")` still resolves 7 elements since each swatch `Pressable` keeps its own `accessible` prop.

### Step 3: Fix the Storybook story

**Files**: `src/screens/WelcomeScreen/WelcomeScreen.stories.tsx`
**Commit**: `chore(native-rd): wrap WelcomeScreen story with a ThemeProvider so the rail renders in Storybook`
**Changes**:

- [x] Add a local `StoryProviders` wrapper (pattern: `src/components/ThemeSwitcher/ThemeSwitcher.stories.tsx:13-32`) supplying a `ThemeProvider` whose `setTheme` calls `UnistylesRuntime.setTheme` and returns `true`.
- [x] Wrap the existing `Default` story's `<WelcomeScreen onGetStarted={...} />` in `<StoryProviders>`.

## Testing Strategy

- [x] Unit tests for `WelcomeScreen` (Jest 30, `@testing-library/react-native` v13) — extend the existing `src/screens/WelcomeScreen/__tests__/WelcomeScreen.test.tsx` in place; no new test file needed since `ThemeSwatchRail`/`ThemeSampleCard` already carry their own full unit coverage.
- [x] `bun run test --testPathPatterns WelcomeScreen` green; `bun run type-check` and `bun run lint` clean.
- [ ] Manual (NOT RUN — needs a device/sim pass): `npx expo run:ios` (or Simulator), first-run flow — verify tapping each of Full Ride, Night Ride, and one shadow-off theme (e.g. Bold Ink) live-updates hero band, body, sample card, and footer CTA colors; verify `Get Started` still navigates to Goals and the gate does not replay on relaunch.
- [ ] Manual (NOT RUN — needs on-device Storybook): open `Screens/WelcomeScreen` in on-device Storybook and confirm it renders without the "useThemeContext must be used within a ThemeProvider" crash (regression check for D7).

## Not in Scope

| Item                                                                                        | Reason                                                                                                                                                                                                       | Follow-up                               |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| Wiring `SettingsThemeSection`/`ThemeSwatchRail` into `SettingsScreen`                       | That's #415 (Storybook, closed)/#416 (Integrate) — `SettingsScreen.tsx` still mounts the old `ThemeSwitcher` and is untouched here.                                                                          | #416                                    |
| Fixing `ThemeSwitcher`'s `accessible={true}` radio-collapse bug                             | #416 unmounts it; #500's own plan scoped this out for the same reason. `ThemeChipGrid` carried the identical bug and was deleted outright in self-review rather than left unmounted — see the Discovery Log. | none — component goes unmounted in #416 |
| Any change to `hasSeenWelcome` persistence, `useFirstLaunch`, or `App.tsx`'s first-run gate | Issue is presentation + mounting only; the gate is explicitly called out as "unchanged" in the issue body and confirmed untouched in `App.tsx`.                                                              | none                                    |
| New Storybook stories for `ThemeSwatchRail`/`ThemeSampleCard`                               | Already shipped and story-gated by #413 (closed) — no new un-storied UI is introduced by this issue.                                                                                                         | none                                    |

## Discovery Log

- [2026-08-09 12:00] Steps 1 and 2 landed as ONE commit, not two. The plan's Step 1 (component swap + `welcome:sample.progress` removal) does not type-check on its own: `WelcomeScreen.test.tsx` still referenced the deleted key, and typed-i18n makes that a hard `tsc` error, not just a red test. Splitting would have produced a non-buildable commit, which violates the atomic-commit rule. Step 3 (Storybook) stayed its own commit.
- [2026-08-09 12:00] Added one test not in the plan: `calls setTheme when a swatch is pressed`. It's the only assertion covering the actual integration point this issue creates (rail `onSelect` → `useThemeContext().setTheme`) — Intent Verification criterion 2 was otherwise untested at the screen level.
- [2026-08-09 12:00] The "renders all 7 theme option labels" test was renamed to "renders all 7 theme options as labelled swatches" and rewritten as a loop over `themeOptions` rather than 7 literal `getByText` calls (D5).

### Self-review findings (all fixed on this branch)

`/self-review` ran local validation + three review agents; CodeRabbit CLI was unavailable (not installed). Zero CRITICAL findings. Five items surfaced and were all fixed rather than deferred:

- [2026-08-09] **Silent persist failure (HIGH).** `onSelect={setTheme}` discarded the boolean that signals a failed Evolu write (#503), so a first-run theme pick that wouldn't survive a restart gave no feedback — the one screen where an ND user picks the variant they need. Now mirrors `ThemeSwitcher`'s toast. Required wrapping `App.tsx`'s first-launch branch in a `ToastProvider`: the else-branch's lives inside `NavigationContainer`, `useToast` throws without one, and `test-utils` supplies one globally — so a WelcomeScreen-only fix would have had green tests and crashed on first launch. Contradicts this plan's "no change to `App.tsx`" scope line, but the alternative was shipping the silent failure.
- [2026-08-09] **Swatch rail overflowed its container (MEDIUM).** 7 x 48pt + 6 x 12pt = 408pt against ~361pt of usable width, inside a horizontal `ScrollView` with the indicator disabled — the 7th theme sat ~1pt from the edge, reading as "there are only 6 themes". Shrinking can't fix it (44pt a11y floor; 7 x 44 + 6 x 8 still overflows a 375pt SE), so the swatches now wrap. Regression-guarded in `ThemeSwatchRail.test.tsx`.
- [2026-08-09] **`ThemeSampleCard` had no visible edge (MEDIUM).** It filled with `colors.background` behind a 1pt border; `WelcomeScreen` paints its page with that same token and always previews the active theme, so fills matched exactly — and `cardElevationSmall` is disabled in the highContrast, autismFriendly and lowInfo variants. Now uses the `Card` component's tokens (`backgroundSecondary` + `borderWidth.thick`), covered per-theme.
- [2026-08-09] **Theme wiring was untested (MEDIUM).** The `useThemeContext` mock hard-coded `themeName: "light-default"` and nothing asserted on it, so replacing both `themeId`/`selectedThemeId` props with that literal kept every test green — this issue's headline behavior had no guard. Mock is now mutable, driven to `dark-default`.
- [2026-08-09] **Deleted `ThemeChipGrid` (LOW).** This issue removed its last production importer. Left in place it would have shipped a second theme picker still carrying the #500 collapse bug with no surface to fix it on. Its test coverage is fully mirrored by `ThemeSwatchRail`'s; `swatch-utils.ts` moved to `ThemeSwatchRail/`.
- [2026-08-09] Also restored pseudo-locale coverage for `common:theme.preview.*` (it moved out of `welcome:sample.*` and landed nowhere) and wrapped `i18n.changeLanguage` in `act()`, which was emitting 15 warnings per run.

**Still open:** both manual verification steps above remain unrun, and the wrap + card-surface changes are visual — they need the device pass before merge.
