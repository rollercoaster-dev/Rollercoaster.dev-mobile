# Design Token Simplification and Chrome Plan

**Status:** Proposed
**Date:** 2026-04-28
**Scope:** `packages/design-tokens`, `apps/native-rd/src/themes`, native-rd app chrome

## Problem

The current design-token system has grown past the product need:

- native-rd exposes 7 peer themes, but the theme code generates 14 combinations by crossing light/dark with accessibility variants.
- `@rollercoaster-dev/design-tokens` is documented as the source of truth, but native-rd still patches colors, aliases, line heights, and theme shapes in `src/themes/adapter.ts`.
- The package already generates `chromeHeader*`, `chromeTabBar*`, and related semantic colors, but native-rd does not compose them into `ComposedTheme`.
- App headers and safe-area backgrounds currently use `theme.colors.accentYellow`, making brand yellow do app-shell work that should belong to chrome tokens.
- The token package exports formats that are not currently consumed, which increases maintenance cost.

## Goal

Make the theme system boring and explicit:

- 7 named product themes, matching the Settings UI.
- One native theme contract consumed by Unistyles.
- Dedicated app-shell chrome roles for headers, top bars, tab bars, and modal chrome.
- No implicit dark/accessibility theme matrix unless each combination is deliberately designed and tested.

## Non-Goals

- Redesigning the visual language.
- Removing neurodivergent-friendly themes.
- Refactoring unrelated component styles.
- Replacing Unistyles.

## Decisions

| ID  | Decision                                                                                                                         | Rationale                                                                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| D1  | Treat themes as 7 named product themes: `default`, `dark`, `highContrast`, `dyslexia`, `lowVision`, `autismFriendly`, `lowInfo`. | This matches the UI and avoids unsupported combinations like `dark-dyslexia`.       |
| D2  | Compose generated semantic chrome tokens into native-rd as `theme.chrome`.                                                       | Header/tab/modal colors are app-shell semantics, not general accent colors.         |
| D3  | Keep `theme.colors.accentYellow` for content accents, status badges, and reward/journey moments.                                 | Yellow remains a brand/content token, but no longer owns headers.                   |
| D4  | Make `packages/design-tokens` generate the native theme shape directly or nearly directly.                                       | The adapter should become a compatibility shim, not a second source of truth.       |
| D5  | Add validation before removing outputs.                                                                                          | Existing web consumers still use CSS outputs, so removals should be evidence-based. |

## Implementation Plan

### Step 1: Add chrome to native-rd composed themes

**Files:**

- `apps/native-rd/src/themes/adapter.ts`
- `apps/native-rd/src/themes/variants.ts`
- `apps/native-rd/src/themes/compose.ts`
- `apps/native-rd/src/themes/index.ts`

**Changes:**

- Add `chrome` to `ComposedTheme`.
- Use `lightChromeColors` / `darkChromeColors` as base chrome modes.
- Apply `chromeVariants` alongside color and narrative variant overrides.
- Type the chrome override path so missing generated fields fail TypeScript.

**Acceptance:**

- `theme.chrome.chromeHeaderBg`, `theme.chrome.chromeHeaderFg`, and `theme.chrome.chromeHeaderBorder` are available in Unistyles stylesheets.
- Existing `theme.colors.*` consumers continue to type-check.

### Step 2: Move app headers off accent yellow

**Files:**

- `apps/native-rd/src/screens/GoalsScreen/GoalsScreen.tsx`
- `apps/native-rd/src/screens/GoalsScreen/GoalsScreen.styles.ts`
- `apps/native-rd/src/screens/BadgesScreen/BadgesScreen.tsx`
- `apps/native-rd/src/screens/BadgesScreen/BadgesScreen.styles.ts`
- `apps/native-rd/src/screens/SettingsScreen/SettingsScreen.tsx`
- `apps/native-rd/src/screens/SettingsScreen/SettingsScreen.styles.ts`
- `apps/native-rd/src/screens/TimelineJourneyScreen/TimelineJourneyScreen.tsx`
- `apps/native-rd/src/screens/TimelineJourneyScreen/TimelineJourneyScreen.styles.ts`
- `apps/native-rd/src/screens/FocusModeScreen/FocusModeScreen.tsx`
- `apps/native-rd/src/screens/FocusModeScreen/FocusModeScreen.styles.ts`
- `apps/native-rd/src/screens/BadgeDesignerScreen/BadgeDesignerScreen.tsx`
- `apps/native-rd/src/screens/BadgeDesignerScreen/BadgeDesignerScreen.styles.ts`
- `apps/native-rd/src/badges/IconPickerModal.styles.ts`

**Changes:**

- Replace header and safe-area `theme.colors.accentYellow` usage with:
  - `theme.chrome.chromeHeaderBg`
  - `theme.chrome.chromeHeaderFg`
  - `theme.chrome.chromeHeaderBorder`
- Keep yellow where it marks content state, progress, reward, or status.
- Keep media viewer overlays black/white because they are intentionally full-screen media chrome.

**Acceptance:**

- Top-level app headers are no longer yellow in the default theme unless the chrome token explicitly says they should be.
- Text in headers uses chrome foreground, not generic text when the header background differs.
- Tab bar can move to `theme.chrome.chromeTabBar*` in the same slice if the type change is already touching navigation.

### Step 3: Flatten the theme model

**Files:**

- `apps/native-rd/src/themes/compose.ts`
- `apps/native-rd/src/hooks/useTheme.ts`
- `apps/native-rd/src/hooks/useDensity.ts`
- `apps/native-rd/src/components/ThemeSwitcher/ThemeSwitcher.tsx`
- related tests

**Changes:**

- Replace `ColorMode x Variant` theme generation with an explicit `themeDefinitions` list.
- Make `ThemeName` a union of the 7 exposed product themes.
- Remove dark/accessibility combinations from `themeNames`.
- Keep a compatibility map only if existing persisted settings need migration.

**Acceptance:**

- `themeOptions.length === themeNames.length`.
- No generated `dark-dyslexia`, `dark-lowVision`, or similar names remain.
- Density updates still apply to every available theme.

### Step 4: Reduce adapter responsibilities

**Files:**

- `packages/design-tokens/build-unistyles.js`
- `packages/design-tokens/src/tokens/*.json`
- `apps/native-rd/src/themes/adapter.ts`

**Changes:**

- Move app-required aliases and colors into package tokens or local native-rd constants with clear ownership.
- Generate absolute React Native line heights in the package output instead of recomputing them in the app.
- Remove duplicate or dead semantic mappings, including duplicate JSON keys.

**Acceptance:**

- `adapter.ts` becomes a small import boundary with minimal compatibility aliases.
- Token changes require edits in one layer, not package plus native adapter.

### Step 5: Validate and update docs

**Files:**

- `apps/native-rd/docs/architecture/design-token-system.md`
- `apps/native-rd/docs/design/nd-themes.md`
- token tests / theme tests

**Changes:**

- Rewrite docs around the 7-theme contract.
- Document chrome roles and when to use `theme.chrome` versus `theme.colors`.
- Add checks for:
  - duplicate JSON keys in token/theme sources
  - generated export paths existing
  - theme-name snapshot
  - header foreground/background contrast

**Acceptance:**

- Docs match code.
- `bun run type-check` passes in native-rd.
- `bun test` passes for affected theme and component tests.
- `bun run build` passes in `packages/design-tokens`.

## Suggested Commit Slices

1. `feat(native-rd): expose chrome tokens in composed themes`
2. `fix(native-rd): use chrome tokens for app headers`
3. `refactor(native-rd): flatten theme names to exposed product themes`
4. `refactor(design-tokens): reduce native adapter responsibilities`
5. `docs(native-rd): document simplified design token contract`

## Open Questions

- Should `largeText` remain a selectable theme, or become an independent text-size preference like density?
- Should the default header background be `chromeHeaderBg = card` or `chromeTopBarBg = background`?
- Should tab bar migration happen with header chrome, or as a separate app-shell pass?

---

## Learnings — 2026-04-28 (after attempting Steps 1 and 2)

The chrome-composition approach was wrong. Visual test in dark theme exposed it. Recording here so the next attempt does not repeat the mistake.

### What was built

- **Step 1** (commit `7c817ca6`): composed the package's `chrome` semantic system into `ComposedTheme.chrome`, with per-variant overrides wired through `chromeVariants`. Type-only addition. No visual change.
- **Step 2** (commit `a1c4a663`): migrated 14 `theme.colors.accentYellow` chrome references in 7 screens to `theme.chrome.chromeTopBarBg` (and `chromeTopBarFg` for the two screens that paired their title color in styles).

### Why it broke

The package's `chromeTopBarBg` is designed as a **brand-prominent identity band**, with deliberate yellow carryover into dark theme (dark.json keeps `chrome-top-bar-bg: #ffe50c`). On light theme this matches the existing brand: yellow band on white body. **On dark theme the same yellow band sits incongruously on `#1a1033` dark navy** — high-energy yellow stripe clashing with calm indigo body. It looks broken.

I rationalised this earlier in the audit ("yellow on dark = `narrative.climb.bg` + `interactive.highlight`, deliberate brand carryover"). That rationalisation was wrong about the _design intent_. The colour values are theme-internally consistent; they just don't match the user's vision for what a header should be.

### What the user actually wants

**The header background matches the theme's body background.** The header is a thin region holding the title text. It should blend with the body, with the existing hard shadow (`shadowStyle(theme, "hardMd")`) providing the visual separation. Yellow has no role at the header level in any theme.

- Light theme → header bg = `theme.colors.background` (white)
- Dark theme → header bg = `theme.colors.background` (`#1a1033`)
- All other themes → header bg = that theme's `theme.colors.background`
- Title text colour: stays as `theme.colors.text`. Already the correct contrast pair for `theme.colors.background` in every theme.

### The actual fix

Replace `theme.colors.accentYellow` with `theme.colors.background` in the same 14 chrome top-bar references. **No `ComposedTheme.chrome` field. No per-variant chrome overrides. No package-level changes.** The chrome semantic system in `@rollercoaster-dev/design-tokens` is solving a problem native-rd does not have.

Preserved as `git stash@{0}` on this worktree: `"WIP: simple swap accentYellow to background (14 chrome refs)"`. Files touched are exactly the same 13 the chrome migration touched, with two-character diffs in each.

### Implications for the rest of this plan

| ID  | Status                                                                                                                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Still correct — 7 named product themes.                                                                                                                                                                                                                                  |
| D2  | **Wrong as written.** Don't compose `chrome` into native-rd. The package's chrome system describes a brand band that doesn't exist in this app's design.                                                                                                                 |
| D3  | Still correct. The 3 remaining `accentYellow` content uses (`StatusBadge`, `GoalEvidenceCard`, `StepCard`) stay flat.                                                                                                                                                    |
| D4  | Orthogonal to the header fix. Can proceed independently if desired (the bigger simplification is to delete `palette.ts` / `tokens.ts` / `colorModes.ts` re-export shims — see [design-token-system-map.md](../architecture/design-token-system-map.md) friction points). |
| D5  | Still correct.                                                                                                                                                                                                                                                           |

### Step-level verdict

- **Step 1 (compose chrome)** — `theme.chrome.*` is now read by **zero** screens. All 7 screens that originally targeted the brand chrome band (Badges, Settings, FocusMode, TimelineJourney, BadgeDesigner, IconPickerModal, Goals) use `theme.colors.accentPurple` / `accentPurpleFg`. The chrome composition layer in `compose.ts` is dead code — safe to remove in a follow-up.
- **Step 2 (migrate `accentYellow` → `chromeTopBarBg`)** — **fully superseded.** All 7 screens use `accentPurple` / `accentPurpleFg`.
- **Step 3 (flatten 14 → 7 themes)** — still useful, independent of chrome.
- **Step 4 (reduce adapter)** — still useful, independent of chrome.
- **Step 5 (docs)** — still useful, but with the chrome-composition language removed.

### What to do with the existing commits

Three options (in order of recommendation):

1. **Revert Step 1 + Step 2 entirely**, apply the simple swap from `stash@{0}` as a single commit. Branch becomes: `[plan doc] + [adapter chrome re-exports — also unused, consider reverting] + [system map + audit docs] + [simple swap]`.
2. **Keep Step 1, revert Step 2**, apply the simple swap. Preserves chrome plumbing in the adapter and `ComposedTheme` as inert infrastructure for any future use, but `theme.chrome.*` has no readers. This is the worst of both — keeps complexity without consumers.
3. **Keep both and patch source JSON.** Update `packages/design-tokens/src/themes/dark.json` (and `low-vision.json`) to set `chrome-top-bar-bg: {color.background}`. Light theme stays yellow. Dark theme becomes navy. Preserves the chrome system but means the system's per-theme overrides are doing what `theme.colors.background` would do directly — added abstraction without payoff.

**Option 1 is recommended.** It matches the user's stated design intent and removes the architectural complexity that doesn't serve it.

### Process learning (not about code)

Three things contributed to the wrong build:

1. I treated the package's chrome system as a fact to consume rather than a design choice to evaluate. The chrome system was built for a different design vision (brand-prominent identity bands, web-app top bars). Native-rd's neo-brutalist header is not that. Should have asked: _what is the design intent of these headers in native-rd?_ before reaching for the package's pre-built abstraction.
2. I confirmed Q2 ("dark/lowVision yellow is correct as-shipped") based on internal palette consistency without showing the user a dark-theme screenshot. The screenshot would have answered the question in five seconds.
3. I declined to run the full pre-Step-2 visual baseline (7 themes × 1 screen) on the grounds that Step 1 was type-only. That logic was correct for Step 1, but it skipped the cheap insurance for Step 2 — and the dark-theme regression that the baseline would have caught is exactly what blew up in production-equivalent. **Visual baseline before any visual change, no exceptions.**
