# Development Plan: Issue #413

## Issue Summary

**Title**: [Storybook] ThemeSwatchRail + ThemeSampleCard
**Type**: feature
**Complexity**: SMALL
**Estimated Lines**: ~240 lines (implementation ~130, stories ~60, tests ~50)

## Intent Verification

Observable criteria derived from the issue. These describe what success looks like from a user/system perspective.

- [ ] `ThemeSampleCard` rendered for each of the 7 product themes in Storybook shows its own bg color, border, shadow presence/absence, and font — verifiable by eye in the theme toolbar or an AllThemesMatrix story row
- [ ] Night Ride sample card shows a vertical offset shadow (`0px 6px 0 0`), not a `3px 3px` hard shadow — its darkShadow token maps hardMd to `{offsetX:0, offsetY:6, opacity:1}` (**whether this should be shadowless is deferred to #429**, see Decisions D7)
- [ ] Bold Ink, Still Water, and Loud & Clear sample cards show no visible shadow (all hard\* token opacities are 0 for those variants)
- [ ] Warm Studio sample card renders with Lexend font body and soft blurred shadow (`opacity:0.1`), not the hard brutalist offset
- [ ] Loud & Clear and Clean Signal sample cards render with Atkinson Hyperlegible font
- [ ] Clean Signal sample card shows the full `2px 2px 0` hard shadow (lowInfo keeps hardSm/hardMd at opacity 0.8 with no `shadows.opacity` override) (**whether this should be shadowless is deferred to #429**, see Decisions D7)
- [ ] `ThemeSwatchRail` renders one circular 3-stripe swatch per theme using the same `getSwatch` color extraction pattern as `ThemeChipGrid`
- [ ] Selecting a swatch fires `onSelect(themeId)` with the correct theme ID; selected swatch shows a checkmark or active indicator
- [ ] All 7 swatches are wrapped in a `radiogroup` with E2E gating (same pattern as `ThemeChipGrid` and `ThemeSwitcher`); each swatch has `accessibilityRole="radio"` + `themeA11yLabel`
- [ ] Each swatch Pressable meets the 44pt min touch target requirement
- [ ] Zero hardcoded hex colors — all colors sourced from `themes[id].colors.*` and `shadowStyle(cardTheme, "cardElevationSmall")` / `"cardElevation"`
- [ ] No screen imports these components — they remain purely presentational pending #414 and #415

## Dependencies

| Issue | Title                  | Status | Type |
| ----- | ---------------------- | ------ | ---- |
| none  | No dependencies listed | N/A    | N/A  |

**Status**: No dependencies — start now.

## Objective

Extract the per-theme preview card logic already embedded in `ThemeSwitcher` into a standalone `ThemeSampleCard` component, and build a new `ThemeSwatchRail` that renders 7 circular 3-stripe swatches using the color extraction pattern from `ThemeChipGrid`. Both components are pure and theme-parametrized — they share the picker vocabulary that Welcome (#414) and Settings (#415) will mount.

## Decisions

| ID  | Decision                                                                                                                       | Alternatives Considered                                            | Rationale                                                                                                                                                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | `previewStyles(themeId)` logic extracted verbatim from `ThemeSwitcher`                                                         | Rewrite from scratch; leave inline in ThemeSwitcher                | The existing function already correctly threads `themes[id]`, `variantOverrides[variant]`, and `shadowStyle`; extracting avoids drift                                                                                                                                                                                  |
| D2  | `ThemeSampleCard` accepts `themeId: ThemeName` prop (not `theme` object)                                                       | Accept full `ComposedTheme`; accept both                           | `themeId` keeps the public surface minimal and mirrors how ThemeSwitcher iterates `themeOptions`                                                                                                                                                                                                                       |
| D3  | Shadow honesty is driven purely by existing tokens — no new logic required                                                     | Conditionally branch on variant to zero shadows                    | `shadowStyle(themes[id], "cardElevationSmall")` already returns 0 for Bold Ink/Still Water/Loud & Clear (token opacity=0); Night Ride gets offset shadow from darkShadow; no manual branching needed                                                                                                                   |
| D4  | `ThemeSwatchRail` is controlled (accepts `selectedThemeId` + `onSelect`)                                                       | Uncontrolled with internal state                                   | Welcome and Settings each own theme state; keeping the rail stateless makes it testable without a ThemeProvider                                                                                                                                                                                                        |
| D5  | `getSwatch` / `stripeWidths` extracted from `ThemeChipGrid` into a shared util file                                            | Inline in ThemeSwatchRail; duplicate values                        | Single source of truth; ThemeChipGrid can import from the same util, avoiding silent drift between the two swatch surfaces                                                                                                                                                                                             |
| D6  | Circular swatch shape: fixed 48pt diameter Pressable with `borderRadius: 24`                                                   | Pill shape; square with rounding                                   | Matches prototype description; 48pt satisfies 44pt min touch target with margin to spare                                                                                                                                                                                                                               |
| D7  | Build to the **real token output** for all 7 themes; Night Ride / Clean Signal shadow _intent_ reviewed separately in **#429** | Hardcode shadow-off for those two to match issue AC; block on #429 | User decision (2026-06-30): components are pure and honestly render token output either way, so they ship now. The two issue-AC bullets claiming those themes are shadowless are factually wrong vs the tokens — whether the _tokens_ should change is a design call tracked in #429, not a change to these components |

## Affected Areas

- `src/components/ThemeSampleCard/ThemeSampleCard.tsx` — new component (extracted from ThemeSwitcher's previewStyles + sampleCard/badge render)
- `src/components/ThemeSampleCard/ThemeSampleCard.styles.ts` — new (shell styles; inline styles remain in previewStyles for per-theme overrides)
- `src/components/ThemeSampleCard/ThemeSampleCard.stories.tsx` — new (Default story + AllThemesMatrix story)
- `src/components/ThemeSampleCard/index.ts` — new barrel
- `src/components/ThemeSampleCard/__tests__/ThemeSampleCard.test.tsx` — new tests
- `src/components/ThemeSwatchRail/ThemeSwatchRail.tsx` — new component
- `src/components/ThemeSwatchRail/ThemeSwatchRail.styles.ts` — new
- `src/components/ThemeSwatchRail/ThemeSwatchRail.stories.tsx` — new
- `src/components/ThemeSwatchRail/index.ts` — new barrel
- `src/components/ThemeSwatchRail/__tests__/ThemeSwatchRail.test.tsx` — new tests
- `src/components/ThemeChipGrid/swatch-utils.ts` — new shared utility extracted from `ThemeChipGrid.tsx` (`getSwatch` + `stripeWidths`)
- `src/components/ThemeChipGrid/ThemeChipGrid.tsx` — updated to import from `swatch-utils` (no behavioral change)

## Implementation Plan

### Step 1: Extract shared swatch utilities from ThemeChipGrid

**Files**: `src/components/ThemeChipGrid/swatch-utils.ts`, `src/components/ThemeChipGrid/ThemeChipGrid.tsx`
**Commit**: `refactor(ThemeChipGrid): extract getSwatch + stripeWidths to swatch-utils`
**Changes**:

- [ ] Create `swatch-utils.ts` with `ChipSwatch` interface, `getSwatch(themeName: ThemeName): ChipSwatch`, and `stripeWidths: Record<ThemeName, [number, number]>` — exact values from current `ThemeChipGrid.tsx`
- [ ] Update `ThemeChipGrid.tsx` to import from `./swatch-utils` in place of the inlined definitions
- [ ] Verify `bun run test --testPathPatterns ThemeChipGrid` still passes — no behavioral change

### Step 2: ThemeSampleCard component

**Files**: `src/components/ThemeSampleCard/ThemeSampleCard.tsx`, `ThemeSampleCard.styles.ts`, `index.ts`
**Commit**: `feat(ThemeSampleCard): extract per-theme preview card from ThemeSwitcher`
**Changes**:

- [ ] Props interface: `{ themeId: ThemeName }` — no callbacks, pure display
- [ ] Move `previewStyles(themeId)` function verbatim from `ThemeSwitcher.tsx` into this file (or a co-located `previewStyles.ts`); it already correctly handles `themes[themeId]`, `parseThemeName`, `variantOverrides[variant]`, `size`/`lineHeight` scale, `fontFamily`, and `shadowStyle(cardTheme, "cardElevationSmall")`
- [ ] Render the card: `View[sampleCard]` → `View[badge]` with `★` text → `View[sampleTextCol]` with title and meta texts → `View[ctaPill]` with CTA text
- [ ] i18n keys (already confirmed present in `en/common.json`): `common:theme.preview.title` ("Daily reading"), `common:theme.preview.progress` ("3 of 5 done"), `common:theme.preview.cta` ("+ ADD")
- [ ] Badge uses `cardTheme.colors.accentPurple` bg and `cardTheme.colors.accentPurpleFg` text — tokens confirmed present in `ComposedTheme.colors`
- [ ] Shell `ThemeSampleCard.styles.ts` holds any static wrapper styles needed; per-theme inline styles stay in `previewStyles`

### Step 3: ThemeSampleCard stories and tests

**Files**: `src/components/ThemeSampleCard/ThemeSampleCard.stories.tsx`, `src/components/ThemeSampleCard/__tests__/ThemeSampleCard.test.tsx`
**Commit**: `test(ThemeSampleCard): stories and unit tests covering all 7 themes`
**Changes**:

- [ ] Story 1 `Default`: renders `ThemeSampleCard` for `"light-default"`
- [ ] Story 2 `AllThemesMatrix`: renders all 7 theme IDs side by side in a `ScrollView` — reviewer visual gate for the honesty matrix
- [ ] Unit tests using `renderWithProviders` (same pattern as `ThemeSwitcher.test.tsx` and `ThemeChipGrid.test.tsx`):
  - [ ] `test.each(themeOptions)` — each theme ID renders without crashing
  - [ ] The card text content shows the correct i18n strings (`"Daily reading"`, `"3 of 5 done"`, `"+ ADD"`)
  - [ ] No `accessibilityRole` on the card itself — it is display-only, not interactive

### Step 4: ThemeSwatchRail component

**Files**: `src/components/ThemeSwatchRail/ThemeSwatchRail.tsx`, `ThemeSwatchRail.styles.ts`, `index.ts`
**Commit**: `feat(ThemeSwatchRail): horizontal circular swatch rail with radio a11y`
**Changes**:

- [ ] Props interface: `{ selectedThemeId: ThemeName; onSelect: (id: ThemeName) => void }`
- [ ] Render a horizontal `ScrollView` (or `FlatList`) of 7 circular Pressables using `getSwatch` and `stripeWidths` from `swatch-utils.ts`
- [ ] Swatch shape: 48pt circular `Pressable` (`borderRadius: 24`, overflow hidden) containing three vertical stripes — `stripeBg` fills remainder, `stripe1` covers `w1%`, `stripe2` covers `w2%` (same flex-row layout as `ThemeChipGrid`)
- [ ] Selected treatment: `borderColor: themes[id].colors.accentPurple`, border width 3, plus a `✓` overlay text with `colors.accentPurple`; unselected: `borderColor: themes[id].colors.border`, border width 1
- [ ] Selected theme name and description displayed below the rail using `t("common:theme.options.<id>.label")` / `.description`
- [ ] a11y: same E2E-gated radiogroup pattern from `ThemeSwitcher` / `ThemeChipGrid`; each Pressable gets `accessibilityRole="radio"`, `accessibilityState={{ checked: isSelected }}`, `accessibilityLabel={themeA11yLabel(t, id)}`; rail wrapper gets `accessibilityRole="radiogroup"` label "Theme selection" (guarded by `EXPO_PUBLIC_E2E_MODE`)
- [ ] Pressable min hit area: 48pt height/width meets 44pt requirement

### Step 5: ThemeSwatchRail stories and tests

**Files**: `src/components/ThemeSwatchRail/ThemeSwatchRail.stories.tsx`, `src/components/ThemeSwatchRail/__tests__/ThemeSwatchRail.test.tsx`
**Commit**: `test(ThemeSwatchRail): stories and unit tests`
**Changes**:

- [ ] Story 1 `Default`: rail with `selectedThemeId="light-default"` and a no-op `onSelect`
- [ ] Story 2 `NightRideSelected`: shows the dark theme selected, verifying the dark swatch colors render
- [ ] Unit tests mirroring `ThemeChipGrid.test.tsx` pattern:
  - [ ] Renders one radio per theme with correct `themeA11yLabel`
  - [ ] `checked` state is `true` for `selectedThemeId`, `false` for others
  - [ ] `onSelect` called with correct `ThemeName` when swatch pressed
  - [ ] `radiogroup` present in production mode; absent in E2E mode (`EXPO_PUBLIC_E2E_MODE=true`)

## Testing Strategy

- [ ] Unit tests via `bun run test --testPathPatterns "ThemeSampleCard|ThemeSwatchRail|ThemeChipGrid"` — all must pass after Step 1 refactor and new components
- [ ] Test files at `src/components/ThemeSampleCard/__tests__/ThemeSampleCard.test.tsx` and `src/components/ThemeSwatchRail/__tests__/ThemeSwatchRail.test.tsx`, mirroring the established `ThemeChipGrid`/`ThemeSwitcher` test structure (`renderWithProviders`, `themeA11yLabel`, `test.each`)
- [ ] `bun run test` (node-wrapped jest) — never `bun test` or `npx jest`
- [ ] Storybook visual gate: load `ThemeSampleCard.AllThemesMatrix` and verify all 7 rows in the browser — Night Ride shows a vertical 6px shadow, Bold Ink/Still Water/Loud & Clear show no shadow, Warm Studio shows soft shadow + Lexend, Clean Signal shows the hard 3px offset shadow
- [ ] Type-check passes: `bun run type-check`

## Shadow Honesty Matrix (verified from built token output)

| Theme        | ThemeName              | Shadow behavior in `cardElevationSmall`                           |
| ------------ | ---------------------- | ----------------------------------------------------------------- |
| Full Ride    | `light-default`        | Hard offset `2px 2px 0` (hardSm opacity=0.8, shadows.opacity=1.0) |
| Night Ride   | `dark-default`         | Vertical offset `0px 6px 0` (darkShadow.hardSm opacity=1.0)       |
| Bold Ink     | `light-highContrast`   | No shadow (all hardX opacity=0; shadows.opacity=0)                |
| Warm Studio  | `light-dyslexia`       | Soft blurred shadow (hardSm opacity=0.1, radius=2)                |
| Still Water  | `light-autismFriendly` | No shadow (all hardX opacity=0; shadows.opacity=0)                |
| Loud & Clear | `light-lowVision`      | No shadow (all hardX opacity=0; shadows.opacity=0)                |
| Clean Signal | `light-lowInfo`        | Hard offset `2px 2px 0` (hardSm opacity=0.8, no opacity override) |

Note: The issue body states Clean Signal has "shadows.opacity: 0" — this is incorrect per the built tokens. `lowInfo` variant sets `shadow: shadowVariants.lowInfo` but does NOT set `shadows: { opacity: 0 }`, so `shadows.opacity` remains 1.0. The hard shadow `hardMd.opacity=0.8` is fully rendered. This plan reflects the actual token behavior.

Note: The issue body states Night Ride shadow "composes to 0 (border carries depth)" — also incorrect. Night Ride uses `darkShadow` where `hardSm = {offsetX:0, offsetY:6, radius:0, opacity:1}`, so a real shadow is visible. It differs from the light hard shadow (no X offset, pure vertical drop) but is not zero.

## Not in Scope

| Item                                                           | Reason                                                                                                        | Follow-up |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------- |
| Mounting in Welcome screen                                     | #414 owns that wiring                                                                                         | #414      |
| Mounting in Settings screen                                    | #415 owns that wiring                                                                                         | #415      |
| Persisting theme selection to storage                          | ThemeProvider / useThemePersistence handles                                                                   | existing  |
| Refactoring ThemeSwitcher to use ThemeSampleCard               | Separate concern; no user-facing change                                                                       | none      |
| `largeText` variant as a swatch option                         | Not a runtime picker option per `themeOptions` in `useTheme.ts`                                               | by design |
| Changing Night Ride / Clean Signal shadow tokens to shadowless | Components render token output faithfully; whether those tokens match design intent is a separate design call | #429      |

## Discovery Log

- [2026-06-30] Research caught two factual errors in issue #413's acceptance criteria: it claims Night Ride (`dark-default`) and Clean Signal (`light-lowInfo`) render with zero shadow. Verified against `src/themes/variants.ts`: only `highContrast`/`lowVision`/`autismFriendly` set `shadows: { opacity: 0 }`; `lowInfo` (variants.ts:148-155) does not, and Night Ride's `darkShadow` renders a `0px 6px 0` drop. User decision (Review-tokens-separately): build the pure components to real token output now; track the shadow-token design-intent question in **#429**. The two AC bullets above are annotated as deferred.

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->
