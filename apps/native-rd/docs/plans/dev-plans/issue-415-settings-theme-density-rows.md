# Development Plan: Issue #415

## Issue Summary

**Title**: [Storybook] Settings theme-picker (reuse Welcome rail) + density rows
**Type**: feature
**Complexity**: MEDIUM
**Estimated Lines**: ~400 lines (2 new components incl. stories/tests ~330, shared a11y extension to `SettingsRow`/`SettingsSection` ~50, i18n key ~10, barrels ~10)

## Intent Verification

- [x] A `SettingsThemeSection` story renders `SettingsSection` (titled) wrapping the merged `ThemeSwatchRail` + `ThemeSampleCard` from #413, controlled by local story state — tapping a swatch updates the sample card live, matching the Welcome rail's interaction exactly (no second picker form-factor).
- [x] A `SettingsDensityRows` story renders exactly three `SettingsRow`s (Compact / Default / Comfortable) inside a `SettingsSection` — never a slider — with the active row showing `✓` and `accessibilityState.checked` true.
- [x] Both new components render correctly for all 7 product themes via an `AllThemesMatrix` story (same pattern as `ThemeSampleCard.stories.tsx`) — zero hardcoded hex, all colors from `theme.*`/`themes[id]`.
- [x] The three density rows are grouped as `radiogroup` (role) with each row exposing `accessibilityRole="radio"` + a label + `accessibilityState.checked` — verified by RNTL `getAllByRole("radio")` returning exactly 3, mirroring `ThemeSwatchRail`'s existing radio contract.
- [x] Every row/swatch Pressable has a rendered touch target ≥44pt (`SettingsRow.container.minHeight: 48` already satisfies this; `ThemeSwatchRail` swatch is 48pt — both verified in code: `SettingsRow.styles.ts:8`, `ThemeSwatchRail.styles.ts:3`).
- [x] `grep -rn "ThemeSwatchRail\|ThemeSampleCard\|SettingsThemeSection\|SettingsDensityRows" src/screens` returns no matches — nothing is imported by a screen yet (matches #413's own verification pattern and this issue's explicit AC).
- [x] `ThemeSwitcher` and its two existing importers (`SettingsScreen.tsx`, `TestScreen.tsx`) are untouched — `git diff` shows no changes to those three files.

## Dependencies

| Issue | Title                                         | Status                                           | Type    |
| ----- | --------------------------------------------- | ------------------------------------------------ | ------- |
| #413  | [Storybook] ThemeSwatchRail + ThemeSampleCard | ✅ Met — CLOSED, merged via PR #430 (2026-06-30) | Blocker |

**Status**: ✅ All dependencies met.

**Verification performed**: `gh issue view 413` → `state: CLOSED`, `closedAt: 2026-06-30T13:55:50Z`. `gh pr list --state merged --search "closes #413"` → PR #430 "feat(theme-picker): ThemeSwatchRail + ThemeSampleCard (#413)", merged. Confirmed on this branch's tree: `src/components/ThemeSwatchRail/` and `src/components/ThemeSampleCard/` both exist with `.tsx`, `.styles.ts`, `.stories.tsx`, `index.ts`, `__tests__/`. **Not a blocker — safe to implement.**

## Objective

Build two new, pure, presentational Storybook-only components for the Settings screen's re-skin (Track F1), without wiring either into `SettingsScreen.tsx` (that's #416):

1. `SettingsThemeSection` — mounts `SettingsSection` + the reused `ThemeSwatchRail` + live `ThemeSampleCard` (#413), replacing `ThemeSwitcher`'s form factor for Settings.
2. `SettingsDensityRows` — mounts `SettingsSection` + three `SettingsRow`s for Compact/Default/Comfortable density, with proper `radiogroup`/`radio` semantics (a gap the already-shipped, DB-wired density UI in `SettingsScreen.tsx` doesn't have today).

## Decisions

| ID  | Decision                                                                                                                                                                               | Alternatives Considered                                                                                                                                    | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Build two new named components, `SettingsThemeSection` and `SettingsDensityRows`, under `src/components/`, controlled (props, no context/DB reads)                                     | Ad-hoc composition inline in a `.stories.tsx` only, no new src component                                                                                   | `SettingsScreen.tsx` already has a private, unexported `DensityPicker` function wired to `useDensity()` — it satisfies the visual AC today but isn't reusable/storyable in isolation and isn't exported. #416 needs concrete, controlled components to import and wire to `useThemeContext`/`useDensity`; matches the #413 pattern of shipping controlled, context-free components                                                                                                                                                               |
| D2  | `SettingsThemeSection` wraps `ThemeSwatchRail` + `ThemeSampleCard` in a single internal `<View>` passed as `SettingsSection`'s only child (not two top-level children)                 | Pass rail and card as two separate `SettingsSection` children                                                                                              | `SettingsSection` inserts a divider (`testID="settings-separator"`) between top-level children — two children would put an unwanted rule between the rail and its live preview; a single wrapping View keeps that pairing visually joined while still using `SettingsSection`'s title/border/shadow chrome                                                                                                                                                                                                                                       |
| D3  | Extend `SettingsRow` with an optional `accessibilityRole?: "button" \| "radio"` and `checked?: boolean` prop (default: existing `"button"` behavior, fully backward-compatible)        | Build a bespoke one-off Pressable inside `SettingsDensityRows` instead of touching `SettingsRow`; leave density rows as plain buttons (no radio semantics) | The issue's own ND/a11y acceptance line ("radiogroup/radio roles + labels") applies to the whole issue, not just the theme picker — today's `SettingsRow` only supports `accessibilityRole="button"`, so density rows can't satisfy that AC without either a role option on `SettingsRow` or a duplicate row primitive. Extending the prop is additive/opt-in — the sole existing importer (`SettingsScreen.tsx`) is untouched since it doesn't pass the new props, so `git diff` on that file stays empty per the Intent Verification checklist |
| D4  | Extend `SettingsSection` with an optional `accessibilityRole`/`accessibilityLabel` pass-through onto its `rows` container (used to mark the density group as a `radiogroup`)           | Add a second wrapping `<View accessibilityRole="radiogroup">` inside `SettingsDensityRows`'s children                                                      | A second wrapping View would make `SettingsSection` see one child instead of three, silently dropping the built-in divider between the three density rows (see D2's opposite problem); passing the role straight onto `SettingsSection`'s own existing rows container preserves dividers with zero new nesting                                                                                                                                                                                                                                   |
| D5  | Section header for the reused theme picker gets a **new** `settings:theme.title` key (`"Theme"`, mirroring `settings:density.title`/`"Content Density"`) added to `en`, `de`, `pseudo` | Reuse existing `common:theme.picker.title` ("Pick what feels right") from `ThemeSwitcher`; leave header blank                                              | The issue text names both `common:theme.*` and `settings` as candidate sources — ambiguous. `settings:theme.title` is consistent with the sibling `settings:density.title` pattern already used one section down and matches the `SettingsFrame.dc.html` prototype's all-caps section label "Theme" (a content label, not the ThemeSwitcher-specific "Pick what feels right" copy). **Confirmed by Joe 2026-07-02** (was flagged as a copy call) — add new `settings:theme.title` = `"Theme"`                                                    |
| D6  | `SettingsDensityRows` does not call `useDensity()` — it takes `selectedLevel: DensityLevel` + `onSelect: (level) => void` as props, same controlled shape as `ThemeSwatchRail`         | Reuse the real `useDensity()` hook directly inside the new component                                                                                       | This issue is Storybook-only ("not yet imported by any screen"); wiring to the DB-backed hook is #416's job. Keeping it controlled also means no `Suspense`/`ErrorBoundary` wrapper is needed in Storybook, unlike the real `DensityPicker` in `SettingsScreen.tsx`                                                                                                                                                                                                                                                                              |

## Affected Areas

- `src/components/SettingsThemeSection/SettingsThemeSection.tsx` — new; composes `SettingsSection` + `ThemeSwatchRail` + `ThemeSampleCard`, controlled via `selectedThemeId`/`onSelect`
- `src/components/SettingsThemeSection/SettingsThemeSection.styles.ts` — new; padding/gap for the rail+card wrapper View
- `src/components/SettingsThemeSection/SettingsThemeSection.stories.tsx` — new; `Default` (interactive, local state) + `AllThemesMatrix`
- `src/components/SettingsThemeSection/__tests__/SettingsThemeSection.test.tsx` — new
- `src/components/SettingsThemeSection/index.ts` — new barrel
- `src/components/SettingsDensityRows/SettingsDensityRows.tsx` — new; three `SettingsRow`s in a `radiogroup`, controlled via `selectedLevel`/`onSelect`
- `src/components/SettingsDensityRows/SettingsDensityRows.styles.ts` — new; intentionally-empty `StyleSheet.create({})` (component adds no styling of its own) required by the per-component styles-file structural convention — see Discovery Log
- `src/components/SettingsDensityRows/SettingsDensityRows.stories.tsx` — new; `Default` (interactive) + `AllThemesMatrix`
- `src/components/SettingsDensityRows/__tests__/SettingsDensityRows.test.tsx` — new
- `src/components/SettingsDensityRows/index.ts` — new barrel
- `src/components/SettingsRow/SettingsRow.tsx` — extend: optional `accessibilityRole?: "button" | "radio"` + `checked?: boolean`, backward-compatible default
- `src/components/SettingsRow/__tests__/SettingsRow.test.tsx` — add radio-role coverage
- `src/components/SettingsSection/SettingsSection.tsx` — extend: optional `accessibilityRole`/`accessibilityLabel` pass-through onto the `rows` container
- `src/components/SettingsSection/__tests__/SettingsSection.test.tsx` — add group-role coverage
- `src/i18n/resources/en/settings.json`, `de/settings.json`, `pseudo/settings.json` — add `theme.title` key alongside the existing `density.title` sibling

**Explicitly not touched** (verified by grep, must stay that way): `src/screens/SettingsScreen/SettingsScreen.tsx`, `src/screens/TestScreen/TestScreen.tsx`, `src/components/ThemeSwitcher/**` — these are #416's responsibility.

## Implementation Plan

### Step 1: Extend `SettingsRow` + `SettingsSection` with opt-in radiogroup semantics

**Files**: `src/components/SettingsRow/SettingsRow.tsx`, `src/components/SettingsRow/__tests__/SettingsRow.test.tsx`, `src/components/SettingsSection/SettingsSection.tsx`, `src/components/SettingsSection/__tests__/SettingsSection.test.tsx`
**Commit**: `feat(settings-row): add opt-in radio accessibility role`
**Changes**:

- [x] Add `accessibilityRole?: "button" | "radio"` and `checked?: boolean` to `SettingsRowProps`; when `onPress` is set and `accessibilityRole === "radio"`, render `accessibilityRole="radio"` + `accessibilityState={{ checked }}` instead of the current hardcoded `"button"`; default (`undefined`) preserves today's exact behavior
- [x] Add `accessibilityRole?: "radiogroup"` and `accessibilityLabel?: string` to `SettingsSectionProps`, spread onto the `styles.rows` container (defaults to no a11y role change, matching today) — also added `accessible?: boolean` so the E2E grouping-drop (Step 3) can be applied via these props
- [x] Add test: `SettingsRow` with `accessibilityRole="radio"` + `checked` exposes `getByRole("radio")` with correct `accessibilityState`
- [x] Add test: `SettingsSection` with `accessibilityRole="radiogroup"` exposes `getByRole("radiogroup")`
- [x] Confirm via `git diff` that no other caller (`SettingsScreen.tsx`) changes behavior — existing `SettingsRow`/`SettingsSection` tests pass unmodified

### Step 2: `SettingsThemeSection` — reused rail + sample card under Settings chrome

**Files**: `src/components/SettingsThemeSection/*`, `src/i18n/resources/{en,de,pseudo}/settings.json`
**Commit**: `feat(settings-theme-section): mount ThemeSwatchRail + ThemeSampleCard under SettingsSection`
**Changes**:

- [x] Add `settings:theme.title` = `"Theme"` (en) / `"Thema"` (de) / pseudo-transform (matching the existing `[Çøñţêñţ Đêñšïţý······]`-style pseudo encoding used for `density.title`) to all three locale files
- [x] `SettingsThemeSection.tsx`: `{ selectedThemeId: ThemeName; onSelect: (id: ThemeName) => void }` props; renders `<SettingsSection title={t("settings:theme.title")}><View style={styles.content}><ThemeSwatchRail .../><ThemeSampleCard .../></View></SettingsSection>`
- [x] `SettingsThemeSection.styles.ts`: padding + vertical gap for the wrapper View (rail/card need their own inset since `SettingsSection`'s `rows` container has no built-in padding — that lives inside `SettingsRow` today, which this wrapper doesn't use)
- [x] `SettingsThemeSection.stories.tsx`: `Default` story with local `useState<ThemeName>` (same `InteractiveRail` pattern as `ThemeSwatchRail.stories.tsx`) + `AllThemesMatrix` story (7 themes, each self-selected, on own background — mirrors `ThemeSampleCard.stories.tsx`)
- [x] Tests: renders title, renders rail + card, tapping a swatch calls `onSelect`, `AllThemesMatrix`-equivalent `it.each(themeOptions)` smoke coverage per theme (no hardcoded hex assertion needed — inherited from #413's components)

### Step 3: `SettingsDensityRows` — three-row density radiogroup

**Files**: `src/components/SettingsDensityRows/*`
**Commit**: `feat(settings-density-rows): three-row density radiogroup component`
**Changes**:

- [x] `SettingsDensityRows.tsx`: `{ selectedLevel: DensityLevel; onSelect: (level: DensityLevel) => void }` props; renders `<SettingsSection title={t("settings:density.title")} accessibilityRole="radiogroup" accessibilityLabel="Content density selection">` wrapping `densityOptions.map(...)` → `<SettingsRow accessibilityRole="radio" checked={selectedLevel === option.id} label={t(...)} value={selectedLevel === option.id ? "✓" : t(...description)} onPress={() => onSelect(option.id)} />`
- [x] Mirror `ThemeSwatchRail`'s E2E-mode grouping drop (`EXPO_PUBLIC_E2E_MODE === "true"` → `accessible: false` on the group) for Maestro element-lookup parity, applied via the new `SettingsSection` a11y props from Step 1
- [x] `SettingsDensityRows.stories.tsx`: `Default` story with local `useState<DensityLevel>` + `AllThemesMatrix` story (7 themes)
- [x] Tests: exactly 3 `getAllByRole("radio")`, active row has `checked: true` + shows `✓`, tapping a row calls `onSelect` with the right `DensityLevel`, radiogroup role present (non-E2E) / absent (E2E env var set)

## Testing Strategy

- [ ] Unit tests for `SettingsThemeSection`, `SettingsDensityRows`, plus the extended `SettingsRow`/`SettingsSection` (Jest 30, `@testing-library/react-native` v13)
- [ ] Test files colocated in each component's own `__tests__/` directory, matching the existing convention for `ThemeSwatchRail`, `ThemeSampleCard`, `SettingsRow`, `SettingsSection` (not the top-level mirrored `src/__tests__/` tree)
- [ ] Use `test.each`/`it.each(themeOptions)` for the 7-theme smoke coverage, not 7 duplicated test bodies
- [ ] Run via `bun run test --testPathPatterns "SettingsThemeSection|SettingsDensityRows|SettingsRow|SettingsSection"` — never `bun test` or plain `npx jest`
- [ ] Manual/visual: open Storybook, confirm `SettingsThemeSection` and `SettingsDensityRows` under both the global theme toolbar and their own `AllThemesMatrix` stories across all 7 themes; confirm tapping a swatch/row updates local story state live
- [ ] Regression check: `bun run test --testPathPatterns "SettingsScreen"` still passes unmodified (confirms Step 1's additive changes don't disturb the live screen)

## Not in Scope

| Item                                                                                                                | Reason                                                                                                                                                           | Follow-up             |
| ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| Wiring `SettingsThemeSection`/`SettingsDensityRows` into `SettingsScreen.tsx`                                       | This is a Storybook-only verification issue per its own AC ("not yet imported by any screen")                                                                    | #416                  |
| Deleting `ThemeSwitcher` or its usages in `SettingsScreen.tsx`/`TestScreen.tsx`                                     | Explicitly owned by #416, not this issue                                                                                                                         | #416                  |
| Fixing the a11y semantics (radio role) of the already-shipped, DB-wired `DensityPicker` inside `SettingsScreen.tsx` | That local, unexported function isn't touched by this issue; #416 will replace it wholesale with `SettingsDensityRows`, inheriting the fix                       | #416                  |
| A real density provider/context (beyond the existing `useDensity()` hook, which already exists and is untouched)    | Density persistence and live scaling already ship today via `useDensity()`/`useUserSettingsRow()`; this issue only needs a controlled, presentational radiogroup | none — already exists |
| "Replay welcome" row / About section chrome                                                                         | Explicitly called out in the issue as container chrome owned by #416                                                                                             | #416                  |
| Adding rows not in the issue (e.g. "Reduce motion", reminders)                                                      | Issue brief explicitly forbids inventing rows                                                                                                                    | none                  |

## Resolved Questions (start-issue, 2026-07-02)

All four open questions were confirmed by Joe at the recommended defaults — no plan changes needed:

1. **Theme section header** → add new `settings:theme.title` = `"Theme"` (D5), _not_ reuse `common:theme.picker.title`.
2. **Radio semantics** → extend the shared `SettingsRow`/`SettingsSection` additively (D3/D4), _not_ a separate one-off primitive. This is the only step touching files outside the two new component dirs; the sole `SettingsRow` importer (`SettingsScreen.tsx`) stays untouched because it never passes the new props.
3. **Component names** → `SettingsThemeSection` + `SettingsDensityRows` (D1).
4. **Live `DensityPicker` a11y gap** in `SettingsScreen.tsx` → left to #416 (not a separate follow-up); #416 replaces that function wholesale with `SettingsDensityRows`.

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->

- [2026-07-02] Step 1: `SettingsSection` also gained an optional `accessible?: boolean` prop (plan named only `accessibilityRole`/`accessibilityLabel`). Reason: Step 3's E2E grouping-drop mirrors `ThemeSwatchRail`, which sets `accessible: false` on the group in E2E mode — that requires `SettingsSection` to pass `accessible` through to the rows container. Still additive/backward-compatible (undefined = today's behavior).
- [2026-07-02] Step 3: added `SettingsDensityRows/SettingsDensityRows.styles.ts` (an empty, documented `StyleSheet.create({})`) — the plan's Affected Areas omitted it, but `src/__tests__/structure/component-structure.test.ts` + `naming-conventions.test.ts` require every component dir to contain a `<Name>.styles.ts` file. The component genuinely has no styles of its own (pure composition of `SettingsSection` + `SettingsRow`; D4 forbids an extra wrapper View), so the file is intentionally empty with a comment explaining why. Folded into the Step 3 commit.
- [2026-07-02] Visual note for #416 reviewer: `SettingsDensityRows` rows carry `onPress`, so `SettingsRow` renders its `›` chevron alongside the `✓`/description value — identical to the already-shipped `DensityPicker` in `SettingsScreen.tsx`. Not a regression and not in this issue's ACs; flagged so #416 (which swaps this component in) can decide whether a radio row should keep the chevron.
