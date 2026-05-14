# Development Plan: Issue #821

## Issue Summary

**Title**: design-tokens: full semantic token sweep for current product design
**Type**: enhancement
**Complexity**: LARGE
**Estimated Lines**: ~800–1000 lines (across token JSON, build scripts, TypeScript interfaces, theme overrides, and docs)

## Intent Verification

Observable criteria derived from the issue. These describe what success looks like from a user/system perspective.

- [ ] When running `bun run build` in `packages/design-tokens`, the pipeline completes cleanly with no warnings or errors
- [ ] `build/unistyles/colorModes.ts` exports a `Colors` interface with all new semantic role keys (chrome, action, surface, border, journey, badge/reward)
- [ ] `build/unistyles/variants.ts` exports per-theme `VariantOverride` constants that include overrides for all new semantic roles where themes differ
- [ ] `build/css/tokens.css` contains `--ob-*` CSS custom properties for every new semantic token key, grouped under the SEMANTIC TOKENS section
- [ ] `build/css/themes.css` contains theme-class overrides for the new semantic tokens for each of the 7 non-default themes
- [ ] `src/tokens/semantic.json` and new semantic JSON files remain valid DTCG token format (`$value`/`$type`)
- [ ] All previously exported token keys remain present in all outputs (additive change, no removals)
- [ ] `CHANGELOG.md` has a new entry describing the expanded semantic model
- [ ] `src/tokens/colors.json` primitive palette is unchanged (no new hex values added — only new semantic aliases pointing at existing primitives)

## Dependencies

| Issue             | Title | Status | Type |
| ----------------- | ----- | ------ | ---- |
| (none identified) | —     | —      | —    |

**Status**: All dependencies met.

---

## Objective

Expand `packages/design-tokens` from its current flat semantic layer (which covers generic surface/interactive/feedback roles) into a full release-ready taxonomy that maps every major UI role in the native-rd and openbadges-system apps. The expansion covers six new semantic categories — chrome, action, surface/border, journey, badge/reward, and typography structure — plus a variant override mechanism so individual themes can tune semantics selectively rather than being forced to re-declare broad base-color groups.

---

## Decisions

| ID  | Decision                                                                                                                                                                               | Alternatives Considered                         | Rationale                                                                                                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Add new semantic categories as separate JSON files (`src/tokens/chrome.json`, `journey.json`, etc.) rather than expanding the existing `semantic.json`                                 | Extending `semantic.json` in-place              | `semantic.json` is already 267 lines and the Style Dictionary config categorises it by `filePath`. Separate files keep concerns isolated and make the Style Dictionary grouping unambiguous. |
| D2  | Keep the existing `Colors` interface in `colorModes.ts` intact and add new interfaces (`ChromeColors`, `ActionColors`, etc.) exported alongside it                                     | Replacing `Colors` with a single mega-interface | Additive approach preserves backward compatibility for existing native-rd consumers that type against `Colors`.                                                                              |
| D3  | Extend `build-unistyles.js` with new builder functions (one per semantic category) rather than one monolithic function                                                                 | Rewriting the main build function               | Matches the existing pattern (`buildPalette`, `buildColorModes`, `buildVariants`, `buildNarrative`).                                                                                         |
| D4  | Add new semantic token keys to the `build-themes.js` `pathMappings` table rather than changing the theme JSON structure                                                                | Introducing a new theme section key             | The existing flat `pathMappings` table is the authoritative bridge between theme JSON paths and CSS variable names. Extending it preserves the established mapping convention.               |
| D5  | Theme JSON sections for new semantic categories use a new top-level key `semantic` (e.g., `theme.semantic.chrome.*`) rather than adding to the existing `surface`/`interactive` groups | Extending existing groups                       | Keeps structural separation clear; avoids silently changing existing CSS vars for existing theme groups.                                                                                     |

---

## Affected Areas

- `packages/design-tokens/src/tokens/chrome.json` — new file: chrome/header/tab-bar/modal-shell semantic tokens
- `packages/design-tokens/src/tokens/action.json` — new file: action (button) role tokens for primary, secondary, destructive, disabled, selection states
- `packages/design-tokens/src/tokens/surface-border.json` — new file: card, sheet, input, structure, subtle border, focus border
- `packages/design-tokens/src/tokens/journey.json` — new file: journey/progress/timeline/goal/completion tokens
- `packages/design-tokens/src/tokens/badge-reward.json` — new file: badge chrome, accents, palette, celebration tokens
- `packages/design-tokens/src/tokens/typography-roles.json` — new file: structured typography role tokens (heading scale, label, caption, body)
- `packages/design-tokens/src/tokens/semantic.json` — minor additions for any gaps discovered; existing keys unchanged
- `packages/design-tokens/src/themes/dark.json` — add `semantic` section with overrides for all new categories
- `packages/design-tokens/src/themes/high-contrast.json` — same
- `packages/design-tokens/src/themes/autism-friendly.json` — same
- `packages/design-tokens/src/themes/dyslexia-friendly.json` — same
- `packages/design-tokens/src/themes/low-vision.json` — same
- `packages/design-tokens/src/themes/low-info.json` — same
- `packages/design-tokens/src/themes/large-text.json` — same (typography overrides)
- `packages/design-tokens/build-themes.js` — extend `pathMappings` table with all new semantic token paths
- `packages/design-tokens/build-unistyles.js` — add builder functions for new semantic interfaces; update index barrel
- `packages/design-tokens/CHANGELOG.md` — document the expanded semantic model

---

## Implementation Plan

### Step 1: Chrome and app-shell semantic tokens

**Files**:

- `packages/design-tokens/src/tokens/chrome.json` (new)

**Commit**: `feat(design-tokens): add chrome semantic tokens for header, tab-bar, and modal shells`

**Changes**:

- [ ] Create `src/tokens/chrome.json` with DTCG `$value`/`$type` entries referencing existing primitives:
  ```
  chrome-header-bg         → {card}
  chrome-header-fg         → {foreground}
  chrome-header-border     → {border}
  chrome-tab-bar-bg        → {card}
  chrome-tab-bar-fg        → {muted-foreground}
  chrome-tab-bar-active-fg → {primary}
  chrome-tab-bar-indicator → {primary}
  chrome-modal-bg          → {card}
  chrome-modal-fg          → {foreground}
  chrome-modal-overlay     → rgba(0,0,0,0.5) [literal]
  chrome-modal-border      → {border}
  chrome-top-bar-bg        → {background}
  chrome-top-bar-fg        → {foreground}
  chrome-top-bar-shadow    → {shadow.sm}
  ```
- [ ] Run `bun run build` and confirm `--ob-chrome-*` vars appear in `build/css/tokens.css`

### Step 2: Action role semantic tokens

**Files**:

- `packages/design-tokens/src/tokens/action.json` (new)

**Commit**: `feat(design-tokens): add action semantic tokens for button and interactive states`

**Changes**:

- [ ] Create `src/tokens/action.json`:
  ```
  action-primary-bg              → {primary}
  action-primary-fg              → {primary-foreground}
  action-primary-hover-bg        → {primary-dark}
  action-primary-active-bg       → {primary-dark}
  action-secondary-bg            → {secondary}
  action-secondary-fg            → {secondary-foreground}
  action-secondary-hover-bg      → {color.secondary-dark}
  action-destructive-bg          → {destructive}
  action-destructive-fg          → {destructive-foreground}
  action-destructive-hover-bg    → {color.error}
  action-disabled-bg             → {bg-disabled}
  action-disabled-fg             → {text-disabled}
  action-disabled-border         → {color.gray.300}
  action-selection-bg            → {highlight}
  action-selection-fg            → {highlight-foreground}
  action-selection-border        → {primary}
  ```
- [ ] Run `bun run build` and confirm `--ob-action-*` vars appear in CSS output

### Step 3: Surface and border role semantic tokens

**Files**:

- `packages/design-tokens/src/tokens/surface-border.json` (new)

**Commit**: `feat(design-tokens): add surface and border semantic tokens for cards, sheets, inputs`

**Changes**:

- [ ] Create `src/tokens/surface-border.json`:
  ```
  surface-card-bg            → {card}
  surface-card-fg            → {card-foreground}
  surface-sheet-bg           → {popover}
  surface-sheet-fg           → {popover-foreground}
  surface-input-bg           → {input}
  surface-input-fg           → {foreground}
  surface-sunken-bg          → {muted}
  surface-elevated-bg        → {card}
  border-default             → {border}
  border-strong              → {color.black}
  border-subtle              → {stroke-muted}
  border-input               → {color.gray.300}
  border-focus               → {ring}
  border-destructive         → {destructive}
  border-success             → {success}
  ```
- [ ] Run `bun run build`

### Step 4: Journey semantic tokens

**Files**:

- `packages/design-tokens/src/tokens/journey.json` (new)

**Commit**: `feat(design-tokens): add journey semantic tokens for goals, progress, and timeline`

**Changes**:

- [ ] Create `src/tokens/journey.json`:
  ```
  journey-goal-bg            → {color.accent-yellow}
  journey-goal-fg            → {color.black}
  journey-goal-border        → {border}
  journey-step-bg            → {muted}
  journey-step-fg            → {foreground}
  journey-step-active-bg     → {primary}
  journey-step-active-fg     → {primary-foreground}
  journey-step-complete-bg   → {success}
  journey-step-complete-fg   → {success-foreground}
  journey-progress-track     → {color.gray.200}
  journey-progress-fill      → {primary}
  journey-timeline-line      → {border}
  journey-timeline-node-bg   → {card}
  journey-timeline-node-fg   → {foreground}
  journey-completion-bg      → {success}
  journey-completion-fg      → {success-foreground}
  journey-completion-accent  → {color.accent-yellow}
  ```
- [ ] Run `bun run build`

### Step 5: Badge and reward semantic tokens

**Files**:

- `packages/design-tokens/src/tokens/badge-reward.json` (new)

**Commit**: `feat(design-tokens): add badge and reward semantic tokens for chrome, palette, and celebration`

**Changes**:

- [ ] Create `src/tokens/badge-reward.json`:
  ```
  reward-badge-chrome-bg       → {card}
  reward-badge-chrome-fg       → {foreground}
  reward-badge-chrome-border   → {border}
  reward-badge-accent-1        → {color.accent-yellow}
  reward-badge-accent-2        → {color.accent-mint}
  reward-badge-accent-3        → {color.accent-purple}
  reward-badge-accent-4        → {color.accent-teal}
  reward-badge-accent-5        → {color.accent-orange}
  reward-badge-label-bg        → {highlight}
  reward-badge-label-fg        → {highlight-foreground}
  reward-celebration-burst-1   → {color.accent-yellow}
  reward-celebration-burst-2   → {color.accent-orange}
  reward-celebration-burst-3   → {color.accent-purple}
  reward-celebration-burst-4   → {color.accent-teal}
  reward-celebration-text      → {foreground}
  reward-level-novice-bg       → {color.accent-mint}
  reward-level-intermediate-bg → {color.accent-sky}
  reward-level-advanced-bg     → {color.accent-purple}
  reward-level-expert-bg       → {color.accent-yellow}
  ```
- [ ] Run `bun run build`

### Step 6: Typography role semantic tokens

**Files**:

- `packages/design-tokens/src/tokens/typography-roles.json` (new)

**Commit**: `feat(design-tokens): add typography role semantic tokens for structured text hierarchy`

**Changes**:

- [ ] Create `src/tokens/typography-roles.json`:
  ```
  typo-display-size      → {font.size.display}
  typo-display-weight    → {font.weight.black}
  typo-display-family    → {font-headline}
  typo-display-tracking  → {font.letterSpacing.tight}
  typo-heading-1-size    → {font.size.4xl}
  typo-heading-1-weight  → {font.weight.bold}
  typo-heading-2-size    → {font.size.3xl}
  typo-heading-2-weight  → {font.weight.bold}
  typo-heading-3-size    → {font.size.2xl}
  typo-heading-3-weight  → {font.weight.semibold}
  typo-body-size         → {font.size.md}
  typo-body-weight       → {font.weight.normal}
  typo-body-line-height  → {font.lineHeight.normal}
  typo-body-sm-size      → {font.size.sm}
  typo-label-size        → {font.size.xs}
  typo-label-weight      → {font.weight.semibold}
  typo-label-tracking    → {font.letterSpacing.label}
  typo-caption-size      → {font.size.xs}
  typo-caption-color     → {muted-foreground}
  typo-mono-family       → {font-mono}
  typo-mono-size         → {font.size.sm}
  ```
- [ ] Run `bun run build`

### Step 7: Extend theme files with semantic overrides

**Files**:

- `packages/design-tokens/src/themes/dark.json`
- `packages/design-tokens/src/themes/high-contrast.json`
- `packages/design-tokens/src/themes/autism-friendly.json`
- `packages/design-tokens/src/themes/dyslexia-friendly.json`
- `packages/design-tokens/src/themes/low-vision.json`
- `packages/design-tokens/src/themes/low-info.json`
- `packages/design-tokens/src/themes/large-text.json`

**Commit**: `feat(design-tokens): add semantic section overrides to all theme files`

**Changes**:

Add a `"semantic"` top-level key inside each theme's `"theme"` object. Each theme only needs to override values that genuinely differ from the light defaults. Key overrides per theme:

- **dark**: chrome surfaces to dark bg (#241845 card), action-primary uses teal (#5eead4), journey-progress-fill → teal, badge accents adjusted for dark palette
- **high-contrast**: action-primary-bg → #000000, all borders → #000000 + thick, focus borders → #0055cc, disabled states use #606060
- **autism-friendly**: chrome/action colors use muted desaturated palette (#4d6d7d primary), all celebration/reward tokens muted
- **dyslexia-friendly**: typography role tokens use larger sizes and relaxed line-heights; body font switches to OpenDyslexic or Atkinson
- **low-vision**: all semantic colors use higher-contrast primitives, border-strong thicker, font sizes bumped
- **low-info**: chrome-modal-overlay removed (or set transparent), celebration tokens suppressed, journey accents muted
- **large-text**: typo-\* size tokens scaled up; line-height tokens use relaxed scale

### Step 8: Extend build-themes.js pathMappings

**Files**:

- `packages/design-tokens/build-themes.js`

**Commit**: `feat(design-tokens): extend pathMappings in build-themes.js for all new semantic token paths`

**Changes**:

- [ ] Add entries for every new semantic token category under `semantic.*` key prefix:
  ```js
  "semantic.chrome-header-bg": "chrome-header-bg",
  "semantic.chrome-tab-bar-active-fg": "chrome-tab-bar-active-fg",
  // ... all chrome.*, action.*, surface-border.*, journey.*, badge-reward.*, typo-* paths
  ```
- [ ] Run `bun run build:themes` and verify `--ob-chrome-*`, `--ob-action-*`, etc. appear in the dark theme class in `themes.css`

### Step 9: Extend build-unistyles.js with new semantic interfaces and builders

**Files**:

- `packages/design-tokens/build-unistyles.js`

**Commit**: `feat(design-tokens): add new semantic interfaces and builders to unistyles build pipeline`

**Changes**:

- [ ] Add a `buildSemanticColors()` async function that reads the new token JSON files and emits:
  - `ChromeColors` interface + `lightChromeColors` / `darkChromeColors` constants in `build/unistyles/chromeColors.ts`
  - `ActionColors` interface + `lightActionColors` / `darkActionColors` in `build/unistyles/actionColors.ts`
  - `SurfaceBorderColors` interface + light/dark constants in `build/unistyles/surfaceBorderColors.ts`
  - `JourneyColors` interface + light/dark constants in `build/unistyles/journeyColors.ts`
  - `BadgeRewardColors` interface + light/dark constants in `build/unistyles/badgeRewardColors.ts`
- [ ] Add theme variant extraction for each new interface (parallels existing `buildVariants`)
- [ ] Update `buildIndex()` to include barrel exports for all new files
- [ ] Run `bun run build:unistyles` and verify new `.ts` files appear in `build/unistyles/`

### Step 10: Update barrel index.ts exports

**Files**:

- `packages/design-tokens/build-unistyles.js` (index builder function, already updated in step 9)

**Commit**: `feat(design-tokens): update unistyles index barrel to export all new semantic interfaces`

This step is folded into step 9 — the index builder updated in that step already covers this. Keep as separate commit if the index changes are made independently during review.

### Step 11: Update CHANGELOG.md

**Files**:

- `packages/design-tokens/CHANGELOG.md`

**Commit**: `docs(design-tokens): update CHANGELOG for semantic token sweep release`

**Changes**:

- [ ] Add a new `## Unreleased` or `## 0.2.0` section documenting:
  - Six new semantic token categories added (chrome, action, surface-border, journey, badge-reward, typography-roles)
  - New Unistyles interfaces exported
  - Theme overrides added to all 7 non-default themes
  - Backward compatibility: all existing CSS variables and TypeScript exports preserved

---

## Testing Strategy

This package has no unit test suite — validation is done via build verification and manual CSS inspection.

- [ ] After each step, run `bun run build` from `packages/design-tokens/` and confirm zero errors/warnings from Style Dictionary, build-themes, and build-unistyles
- [ ] After step 8 (themes), run `bun run verify` (calls `scripts/verify-css.js`) to confirm CSS output is valid
- [ ] Spot-check `build/css/tokens.css` for presence of `--ob-chrome-*`, `--ob-action-*`, `--ob-surface-*`, `--ob-border-*`, `--ob-journey-*`, `--ob-reward-*`, `--ob-typo-*`
- [ ] Spot-check `build/css/themes.css` for dark theme overrides: `--ob-chrome-header-bg`, `--ob-action-primary-bg`
- [ ] Spot-check `build/unistyles/chromeColors.ts` and other new files for correct TypeScript shape
- [ ] Check that all previously existing keys in `build/unistyles/colorModes.ts` `Colors` interface remain present (backward compat)
- [ ] Verify `build/unistyles/index.ts` re-exports all new interfaces

---

## Not in Scope

| Item                                                                                                      | Reason                                                                                                                           | Follow-up                                                  |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Adding net-new primitive colors to `colors.json`                                                          | Issue explicitly states "existing primitive palette remains intact". All new semantic tokens must reference existing primitives. | Create a separate issue if new palette entries are needed. |
| Migrating existing `badge-*` and `form-*` component tokens in `components.json` to the new semantic layer | Would risk breaking existing CSS consumers in `openbadges-ui` and `openbadges-system`.                                           | Follow-up deprecation pass once consumers are updated.     |
| Updating `openbadges-ui` or `openbadges-system` to consume the new token names                            | Out of scope for the token package itself; consuming apps manage their own migration.                                            | Tracked under parent epic native-rd#240.                   |
| Adding new themes (e.g., a "high energy" or "celebration" theme variant)                                  | Not requested by this issue.                                                                                                     | New issue if needed.                                       |
| Generating a Storybook/overview HTML page for the new tokens                                              | Nice-to-have; the overview/ directory has hand-authored HTML pages that would need updating.                                     | Follow-up.                                                 |

---

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->
