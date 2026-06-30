# Development Plan: Issue #413

## Issue Summary

**Title**: [Storybook] ThemeSwatchRail + ThemeSampleCard
**Type**: feature
**Complexity**: SMALL
**Estimated Lines**: ~240 lines (implementation ~130, stories ~60, tests ~50)

## Intent Verification

Observable criteria derived from the issue. These describe what success looks like from a user/system perspective.

- [x] `ThemeSampleCard` rendered for each of the 7 product themes in Storybook shows its own bg color, border, shadow presence/absence, and font — `AllThemesMatrix` story renders all 7 on their own backgrounds; `it.each(themeIds)` covers all 7 in tests (final by-eye gate is the reviewer's)
- [x] Night Ride sample card shows a vertical offset shadow (`0px 6px 0 0`), not a `3px 3px` hard shadow — rendered faithfully via `shadowStyle(themes["dark-default"], "cardElevationSmall")` over the darkShadow token (**design intent deferred to #429**, see Decisions D7)
- [x] Bold Ink, Still Water, and Loud & Clear sample cards show no visible shadow (all hard\* token opacities are 0 for those variants)
- [x] Warm Studio sample card renders with Lexend font body and soft blurred shadow (`opacity:0.1`), not the hard brutalist offset — `fontFamily` threaded from `variantOverrides["dyslexia"]`
- [x] Loud & Clear and Clean Signal sample cards render with Atkinson Hyperlegible font
- [x] Clean Signal sample card shows the full `2px 2px 0` hard shadow (lowInfo keeps hardSm/hardMd at opacity 0.8 with no `shadows.opacity` override) (**design intent deferred to #429**, see Decisions D7)
- [x] `ThemeSwatchRail` renders one circular 3-stripe swatch per theme using the same `getSwatch` color extraction pattern as `ThemeChipGrid` (now shared via `swatch-utils.ts`)
- [x] Selecting a swatch fires `onSelect(themeId)` with the correct theme ID; selected swatch shows a checkmark + 3pt accent border (tested)
- [x] All 7 swatches are wrapped in a `radiogroup` with E2E gating (same pattern as `ThemeChipGrid` and `ThemeSwitcher`); each swatch has `accessibilityRole="radio"` + `themeA11yLabel` (tested, incl. E2E-mode drop)
- [x] Each swatch Pressable meets the 44pt min touch target requirement (48pt fixed diameter)
- [x] Zero hardcoded hex colors — all colors sourced from `themes[id].colors.*` and `shadowStyle(cardTheme, "cardElevationSmall")`
- [x] No screen imports these components — they remain purely presentational pending #414 and #415 (grep confirmed)

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

- [x] Create `swatch-utils.ts` with `ChipSwatch` interface, `getSwatch(themeName: ThemeName): ChipSwatch`, and `stripeWidths: Record<ThemeName, [number, number]>` — exact values from current `ThemeChipGrid.tsx`
- [x] Update `ThemeChipGrid.tsx` to import from `./swatch-utils` in place of the inlined definitions
- [x] Verify `bun run test --testPathPatterns ThemeChipGrid` still passes — no behavioral change (5/5 pass)

### Step 2: ThemeSampleCard component

**Files**: `src/components/ThemeSampleCard/ThemeSampleCard.tsx`, `ThemeSampleCard.styles.ts`, `index.ts`
**Commit**: `feat(ThemeSampleCard): extract per-theme preview card from ThemeSwitcher`
**Changes**:

- [x] Props interface: `{ themeId: ThemeName }` — no callbacks, pure display
- [x] Extracted the **card subset** of `previewStyles(themeId)` from `ThemeSwitcher.tsx` (sampleCard/badge/badgeText/sampleTitle/sampleMeta/ctaPill/ctaText); threads `themes[themeId]`, `parseThemeName`, `variantOverrides[variant]`, `size` scale, `fontFamily`, and `shadowStyle(cardTheme, "cardElevationSmall")`. Dropped `label`/`description`/`checkmark` (picker-header styles, not part of the card) and the now-unused `lineHeight`/`lhScale` — see Discovery Log
- [x] Render the card: `View[sampleCard]` → `View[badge]` with `★` text → `View[sampleTextCol]` with title and meta texts → `View[ctaPill]` with CTA text
- [x] i18n keys (confirmed present in `en/common.json`): `common:theme.preview.title` ("Daily reading"), `common:theme.preview.progress` ("3 of 5 done"), `common:theme.preview.cta` ("+ ADD")
- [x] Badge uses `cardTheme.colors.accentPurple` bg and `cardTheme.colors.accentPurpleFg` text — tokens confirmed present in `ComposedTheme.colors`
- [x] Shell `ThemeSampleCard.styles.ts` holds the static `sampleTextCol`; per-theme inline styles stay in `previewStyles`

### Step 3: ThemeSampleCard stories and tests

**Files**: `src/components/ThemeSampleCard/ThemeSampleCard.stories.tsx`, `src/components/ThemeSampleCard/__tests__/ThemeSampleCard.test.tsx`
**Commit**: `test(ThemeSampleCard): stories and unit tests covering all 7 themes`
**Changes**:

- [x] Story 1 `Default`: renders `ThemeSampleCard` for `"light-default"`
- [x] Story 2 `AllThemesMatrix`: renders all 7 theme IDs stacked, each on its own theme background with a `themeId` caption — reviewer visual gate for the honesty matrix (uses a plain `View`, not a nested `ScrollView`; the Storybook preview decorator already supplies the scroll container — see Discovery Log)
- [x] Unit tests using `renderWithProviders` (same pattern as `ThemeSwitcher.test.tsx` and `ThemeChipGrid.test.tsx`):
  - [x] `it.each(themeIds)` — each theme ID renders without crashing
  - [x] The card text content shows the correct i18n strings (`"Daily reading"`, `"3 of 5 done"`, `"+ ADD"`)
  - [x] No interactive `accessibilityRole` on the card — asserted no `button`/`radio` role present (display-only)

### Step 4: ThemeSwatchRail component

**Files**: `src/components/ThemeSwatchRail/ThemeSwatchRail.tsx`, `ThemeSwatchRail.styles.ts`, `index.ts`
**Commit**: `feat(ThemeSwatchRail): horizontal circular swatch rail with radio a11y`
**Changes**:

- [x] Props interface: `{ selectedThemeId: ThemeName; onSelect: (id: ThemeName) => void }`
- [x] Render a horizontal `ScrollView` of 7 circular Pressables using `getSwatch` and `stripeWidths` from `swatch-utils.ts`
- [x] Swatch shape: 48pt circular `Pressable` (`borderRadius: 24`, overflow hidden) containing three vertical stripes — `stripeBg` fills remainder (absolute-fill `stripeRow`), `stripe1` covers `w1%`, `stripe2` covers `w2%` (same flex-row layout as `ThemeChipGrid`)
- [x] Selected treatment: `borderColor: themes[id].colors.accentPurple`, border width 3, plus a `✓` overlay text with `colors.accentPurple`; unselected: `borderColor: themes[id].colors.border`, border width 1
- [x] Selected theme name and description displayed below the rail using `t("common:theme.options.<id>.label")` / `.description`
- [x] a11y: same E2E-gated radiogroup pattern from `ThemeSwitcher` / `ThemeChipGrid`; each Pressable gets `accessibilityRole="radio"`, `accessibilityState={{ checked: isSelected }}`, `accessibilityLabel={themeA11yLabel(t, id)}`; rail wrapper gets `accessibilityRole="radiogroup"` label "Theme selection" (guarded by `EXPO_PUBLIC_E2E_MODE`)
- [x] Pressable min hit area: 48pt height/width meets 44pt requirement

### Step 5: ThemeSwatchRail stories and tests

**Files**: `src/components/ThemeSwatchRail/ThemeSwatchRail.stories.tsx`, `src/components/ThemeSwatchRail/__tests__/ThemeSwatchRail.test.tsx`
**Commit**: `test(ThemeSwatchRail): stories and unit tests`
**Changes**:

- [x] Story 1 `Default`: rail with `selectedThemeId="light-default"` — wrapped in a stateful `InteractiveRail` (instead of a no-op `onSelect`) so swatches respond to taps in the visual gate (see Discovery Log)
- [x] Story 2 `NightRideSelected`: shows the dark theme selected, verifying the dark swatch colors render
- [x] Unit tests mirroring `ThemeChipGrid.test.tsx` pattern:
  - [x] Renders one radio per theme with correct `themeA11yLabel`
  - [x] `checked` state is `true` for `selectedThemeId`, `false` for others
  - [x] `onSelect` called with correct `ThemeName` when swatch pressed
  - [x] `radiogroup` present in production mode; absent in E2E mode (`EXPO_PUBLIC_E2E_MODE=true`)

## Testing Strategy

- [x] Unit tests via `bun run test --testPathPatterns "ThemeSampleCard|ThemeSwatchRail|ThemeChipGrid"` — all pass after Step 1 refactor and new components (ThemeChipGrid 5/5, ThemeSampleCard 9/9, ThemeSwatchRail 5/5)
- [x] Test files at `src/components/ThemeSampleCard/__tests__/ThemeSampleCard.test.tsx` and `src/components/ThemeSwatchRail/__tests__/ThemeSwatchRail.test.tsx`, mirroring the established `ThemeChipGrid`/`ThemeSwitcher` test structure (`renderWithProviders`, `themeA11yLabel`, `it.each`)
- [x] `bun run test` (node-wrapped jest) — full suite 9284/9284 pass; never `bun test` or `npx jest`
- [ ] Storybook visual gate (reviewer): load `ThemeSampleCard.AllThemesMatrix` and verify all 7 rows in the browser — Night Ride shows a vertical 6px shadow, Bold Ink/Still Water/Loud & Clear show no shadow, Warm Studio shows soft shadow + Lexend, Clean Signal shows the hard 3px offset shadow
- [x] Type-check passes: `bun run type-check`

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

- [2026-06-30] `ThemeSampleCard` renders only the sample card, not the picker option header. Extracted just the card subset of `previewStyles` (sampleCard/badge/badgeText/sampleTitle/sampleMeta/ctaPill/ctaText); `label`/`description`/`checkmark` belong to the `ThemeSwitcher` option wrapper and would be dead code here. The now-unused `lhScale`/`lineHeight` import (they only fed `label`/`description`) was removed in a follow-up `refactor` commit after ESLint flagged it.
- [2026-06-30] Dropped `marginTop: 12` from the standalone `sampleCard`. In `ThemeSwitcher` it separated the card from the header text above it inside a picker option; a standalone presentational card shouldn't impose its own outer margin — spacing is the parent's job (Welcome/Settings, or the story container).
- [2026-06-30] `AllThemesMatrix` story renders a plain stacked `View` (each card on its own theme background with a `themeId` caption) rather than its own `ScrollView`. The Storybook preview decorator (`.storybook/preview.tsx`) already wraps every story in a vertical `ScrollView`; nesting a second same-orientation scroll view is an RN anti-pattern. Net effect matches the plan's "7 rows" intent.
- [2026-06-30] `ThemeSwatchRail` `Default` story uses a stateful `InteractiveRail` wrapper instead of the planned no-op `onSelect`, so swatches actually respond to taps in the visual gate — a better demonstration of the controlled (D4) contract. `NightRideSelected` stays static to show the dark swatch in its selected state.
