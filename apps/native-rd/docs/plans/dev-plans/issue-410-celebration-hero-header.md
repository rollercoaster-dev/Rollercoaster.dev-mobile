# Development Plan: Issue #410

## Issue Summary

**Title**: [Storybook] Badge Detail — celebration hero header
**Type**: feature (new presentational component — Track D1 of Epic #384)
**Complexity**: SMALL
**Estimated Lines**: ~300 lines

## Intent Verification

Observable criteria derived from the issue. These describe what success looks like from a user/system perspective — not generic checklists.

- [ ] `CelebrationHeroHeader` renders a full celebration band with a centered `BadgeRenderer` at 146px, a prominent goal-title heading below it, a back-arrow touchable, and a ⋯ overflow touchable in web Storybook
- [ ] The `VerifiedCredentialChip` sub-component renders a pill with a green checkmark and a single-line credential label (`credentialLabel` prop, e.g. "Verifiable · earned Jun 18, 2026"), under the title, when `isVerified`
- [ ] The decorative sparkle layer (6 static ✦/◆ glyphs, the prototype's `showConfetti` treatment — **not** the falling `Confetti` component) is visible in the band in the `Designed` story and absent in the `Undesigned` story
- [ ] Switching the Storybook global theme toolbar through all 7 themes — `light-default`, `dark-default`, `light-highContrast`, `light-dyslexia`, `light-autismFriendly`, `light-lowVision`, `light-lowInfo` — produces no hardcoded hex in the band (band bg = `theme.chrome.celebrationBg` once the token lands; chip border = `theme.chrome.screenHeaderBorder`, etc.)
- [ ] The `Undesigned` story shows the monogram-initial fallback (`createDefaultBadgeDesign`) in the hero slot, not an empty space or broken render
- [ ] The back-arrow and overflow button both have `accessibilityRole="button"` and `accessibilityLabel`, and meet the 44pt minimum touch target
- [ ] `bun run test --testPathPatterns CelebrationHeroHeader` passes; no screen imports `CelebrationHeroHeader`

## Dependencies

| Issue | Title | Status |
| ----- | ----- | ------ |
| none  | —     | —      |

**Status**: All dependencies met — start now.

## Objective

Create `CelebrationHeroHeader` as a pure, prop-driven presentational component: the purple/themed celebration band for the Badge Detail screen. Ships only to Storybook in this issue; no app wiring. The `[Integrate]` issue for Badge Detail (#380, rescheduled) depends on this component being verified here first.

## Revision — 2026-06-29 (prototype re-check)

After building against the plan, a re-check of the authoritative prototype (`prototypes/screen-redesign/Badge Detail C Prototype.dc.html`, linked from issue #410) surfaced three deviations the original plan got wrong. The first two are implemented on-branch; the third is gated on a separate token PR.

1. **Sparkles, not Confetti.** The prototype's `showConfetti` toggle controls **6 small static ✦/◆ glyphs** scattered in the band at 0.4–0.55 opacity — _not_ the full-screen falling `Confetti` component (that is the goal-completion burst). Reimplemented as an inline `Sparkles` layer coloured from `theme.chrome.screenHeaderFg`. (**D3 revised.**)
2. **Title heading + credential chip.** The prototype shows a prominent goal-title **heading** below the badge, and the chip is a single line "✓ Verifiable · earned {date}". The original chip folded title+date together. Title moved to a `display` heading; chip now takes a pre-composed `credentialLabel` prop (stories pass English fixtures, #380 supplies `t()`). Prop `earnedDate` → `credentialLabel`. (**D8 added.**)
3. **Yellow celebration band via a new token.** The prototype band is celebration **yellow** (`#ffe50c`), a distinct "payoff" surface from the purple screen-header chrome. No per-theme yellow token exists and the AC requires all-7-theme + zero-hex. Decision (user, 2026-06-29): **add a per-theme `celebration-*` token first** (separate design-tokens PR), then point the band at it. Until then the band stays on `screenHeaderBg`. Proposed per-theme values mirror the existing, contrast-validated `chrome-top-bar-*` palette (yellow for light/dark/lowVision, white for highContrast/lowInfo, cream for dyslexia, muted gold for autismFriendly). (**D1 revised; see Follow-ups.**)

   **Resolved 2026-06-29:** Q1=A + Q2=recommended, shipped on this branch. New `celebration-bg/fg` chrome token added to `packages/design-tokens` (commit `ca84cace`) with per-theme overrides per the Q2 table; `CelebrationHeroHeader` band/title/sparkles/chip-border swapped to `celebrationBg/Fg`; new `IconButton` `tone="celebration"` resolves ink to `celebrationFg` (the `chrome` tone's `chromeTabBarFg` goes light in dyslexia/autismFriendly and fails on yellow); `celebration` pair added to `contrastPairs.ts`. Contrast test passes across all 7 themes.

## Decisions

| ID  | Decision                                                                                                                                           | Alternatives Considered                                        | Rationale                                                                                                                                                                                                                                                                                                                                                        |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| D1  | ~~Band background token = `theme.chrome.screenHeaderBg`~~ → **superseded:** `theme.chrome.celebrationBg` (new per-theme token, shipped 2026-06-29) | Hardcoded `palette.purple400`; a new `heroSurface` token       | `screenHeaderBg` already carried the per-theme purple but the prototype band is celebration **yellow**, a distinct payoff surface. A dedicated `celebration-bg/fg` token (per-theme, contrast-validated, mirroring `chrome-top-bar-*`) keeps the celebration surface semantic-clean and lets ND themes neutralise the yellow without touching the purple chrome. |
| D2  | Badge size = 146 logical pixels                                                                                                                    | 160px (old BadgeDetailScreen preview container)                | 160px was the old floating overlay size. 146px matches the HTML prototype exactly and keeps the band height comfortable without inflating it.                                                                                                                                                                                                                    |
| D3  | ~~`Confetti` placement~~ → **superseded:** static inline `Sparkles` layer (6 ✦/◆ glyphs), NOT the `Confetti` component (Revision 2026-06-29)       | None                                                           | `Confetti` is already implemented this way internally; the hero band is `overflow: "hidden"` so particles that exit the band clip naturally. The existing component's `accessibilityElementsHidden` prop eliminates screen-reader noise.                                                                                                                         |
| D4  | Undesigned fallback = `createDefaultBadgeDesign(goalTitle, palette.purple400)`                                                                     | Blank space; initial-on-flat-colour `View`                     | `BadgeRenderer` already handles a `BadgeDesign` that is a monogram-initial on a color, which is the pre-designer state. Using `createDefaultBadgeDesign` keeps the fallback identical to what the badge designer produces before the user customises anything. The prop for this is `BadgeDesign                                                                 | null` — null triggers the fallback internally. |
| D5  | `VerifiedCredentialChip` = inline sub-component in the same file                                                                                   | Separate component in `src/components/`                        | It is specific to this header band and has no known reuse outside Badge Detail. A top-level component would be premature extraction; the `[Integrate]` issue can decide if it needs to be promoted.                                                                                                                                                              |
| D6  | Storybook theme coverage = Storybook global theme toolbar (no AllThemesMatrix render)                                                              | An `AllThemesMatrix` story that renders 7 side-by-side columns | The issue's acceptance criteria say "theme toolbar or an `AllThemesMatrix` story". The toolbar approach avoids layout complexity and is the established pattern for `ScreenHeader`, `GoalsCockpit`, and other single-component stories in this repo. The reviewer switches the toolbar and eyeballs.                                                             |
| D7  | File location = `src/screens/BadgeDetailScreen/CelebrationHeroHeader.tsx`                                                                          | `src/components/CelebrationHeroHeader/`                        | `GoalsCockpit` lives under `src/screens/GoalsScreen/` — the established pattern for presentational views that belong to a single screen track. The integration issue (#380) will `import` from the same dir without a path change.                                                                                                                               |

## Affected Areas

- `apps/native-rd/src/screens/BadgeDetailScreen/CelebrationHeroHeader.tsx` — new presentational component (band + title + chip + static sparkles + overflow)
- `apps/native-rd/src/screens/BadgeDetailScreen/CelebrationHeroHeader.styles.ts` — Unistyles `StyleSheet.create((theme) => ...)` for the band; no hardcoded hex
- `apps/native-rd/src/screens/BadgeDetailScreen/CelebrationHeroHeader.stories.tsx` — Storybook stories: `Designed`, `Undesigned`, `NoConfetti`
- `apps/native-rd/src/screens/BadgeDetailScreen/__tests__/CelebrationHeroHeader.test.tsx` — unit tests (mirrors `GoalsCockpit.test.tsx` pattern)

No existing files are modified. No screen imports the new component.

## Implementation Plan

### Step 1: Component skeleton + styles

**Files**: `CelebrationHeroHeader.tsx`, `CelebrationHeroHeader.styles.ts`
**Commit**: `feat(badge-detail): CelebrationHeroHeader component + styles`
**Changes**:

- [ ] Define `CelebrationHeroHeaderProps` interface:
  ```
  badgeDesign: BadgeDesign | null   // null → monogram fallback
  badgeTitle: string                // also the prominent title heading
  credentialLabel: string | null    // pre-composed "Verifiable · earned …"; null hides chip
  isVerified: boolean               // controls chip visibility
  showConfetti: boolean             // controls the static sparkle layer
  onBack: () => void
  onOverflow: () => void
  ```
- [x] Render the outer band `View` using `styles.band` (background = `theme.chrome.screenHeaderBg` for now; → `celebrationBg` once the token lands, bottom border = `theme.chrome.screenHeaderBorder`, `overflow: "hidden"`)
- [x] Render the nav row (`onBack` back-arrow left, `onOverflow` ⋯ right) using `IconButton tone="chrome"` (md = 44pt, already supplies `accessibilityRole="button"` + label + toned icon — DRY vs raw `Pressable`)
- [x] Render `BadgeRenderer` centered at `size={146}`; when `badgeDesign` is null, call `createDefaultBadgeDesign(badgeTitle, palette.purple400)` to produce the monogram fallback
- [x] Render the goal-title `Text variant="display"` heading (color `theme.chrome.screenHeaderFg`, `accessibilityRole="header"`) below the badge
- [x] Render `VerifiedCredentialChip` below the title (inline sub-component): green `Check` icon + single-line `credentialLabel`; background = `theme.surfaceBorder.surfaceCardBg`, border = `theme.chrome.screenHeaderBorder`, borderRadius = `theme.radius.pill`, `shadowStyle(theme, "cardElevationSmall")`; hidden when `!isVerified || !credentialLabel`
- [x] Render the static `Sparkles` layer (6 ✦/◆ `phosphor-react-native` glyphs, `position: "absolute"`, `inset: 0`, `pointerEvents: "none"`, a11y-hidden) behind the content when `showConfetti`; clips at the band's `overflow: "hidden"` — **not** the `Confetti` component
- [x] Styles using `StyleSheet.create((theme) => ...)` — zero hardcoded hex; tokens: `theme.chrome.screenHeaderBg`/`Fg`/`Border`, `theme.surfaceBorder.surfaceCardBg`/`Fg`, `theme.colors.success`, `theme.space.*`, `theme.borderWidth.*`, `theme.radius.*`, `theme.fontWeight.*`, `shadowStyle(theme, ...)`

### Step 2: Storybook stories

**Files**: `CelebrationHeroHeader.stories.tsx`
**Commit**: `feat(badge-detail): CelebrationHeroHeader Storybook stories`
**Changes**:

- [ ] Define `meta` with `title: "Screens/BadgeDetail/CelebrationHeroHeader"`, `component: CelebrationHeroHeader`, `args` using noop callbacks
- [x] `Designed` story — a fully-decorated `BadgeDesign` (circle, purple fill, Trophy icon, banner "REWIRED"), `isVerified: true`, `showConfetti: true`, `credentialLabel: "Verifiable · earned Jun 18, 2026"`. Primary story reviewers switch themes on
- [x] `Undesigned` story — `badgeDesign: null`, `isVerified: false`, `showConfetti: false`, `credentialLabel: null`; confirms the monogram fallback renders cleanly across themes without sparkles or chip
- [x] `NoConfetti` story — same as `Designed` but `showConfetti: false`, confirms the band without the sparkle layer

### Step 3: Unit tests

**Files**: `src/screens/BadgeDetailScreen/__tests__/CelebrationHeroHeader.test.tsx`
**Commit**: `test(badge-detail): CelebrationHeroHeader unit tests`
**Changes**:

- [ ] `renderWithProviders` + `screen`/`fireEvent` from `src/__tests__/test-utils` (mirrors `GoalsCockpit.test.tsx`)
- [ ] Test: back-arrow press fires `onBack`
- [ ] Test: overflow press fires `onOverflow`
- [ ] Test: `VerifiedCredentialChip` is present when `isVerified: true`, absent when `isVerified: false`
- [ ] Test: `BadgeRenderer` is rendered (check `testID="badge-renderer"`) when `badgeDesign` is supplied
- [ ] Test: monogram fallback path — when `badgeDesign: null`, component still renders without throwing (confirm `badge-renderer` testID is still on screen, because `createDefaultBadgeDesign` produces a valid `BadgeDesign`)
- [ ] Test: back-arrow has `accessibilityRole="button"` and non-empty `accessibilityLabel`
- [ ] Test: overflow button has `accessibilityRole="button"` and non-empty `accessibilityLabel`
- [ ] Use `test.each` for the isVerified/chip presence pair

## Testing Strategy

- [ ] Unit tests: `bun run test --testPathPatterns CelebrationHeroHeader` — Jest 30, `@testing-library/react-native` v13
- [ ] Test file: `src/screens/BadgeDetailScreen/__tests__/CelebrationHeroHeader.test.tsx` (mirrors `src/` structure under `src/__tests__/` via symlink pattern used by sibling tests in the same dir)
- [ ] Manual Storybook: open web Storybook, navigate to `Screens/BadgeDetail/CelebrationHeroHeader`, switch global theme toolbar through all 7 entries, verify band bg/border change per theme with zero white (#ffffff / #a78bfa) showing as hardcoded bleed
- [ ] `bun run type-check` and `bun run lint` must pass before PR

## Not in Scope

| Item                                                  | Reason                                                                                                                                            | Follow-up                                |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| App wiring (screen import)                            | Explicitly excluded by issue — "No app wiring"                                                                                                    | #380 ([Integrate] Badge Detail assembly) |
| Evidence "proof spine"                                | Separate Track D2 issue                                                                                                                           | #411 or equivalent                       |
| Share + export sheet                                  | Track D3 issue                                                                                                                                    | #412 or equivalent                       |
| ⋯ overflow menu implementation (rendering menu items) | This issue delivers the touchable affordance only; the menu content belongs to the integration issue where real actions (share, delete) are wired | #380                                     |
| `AllThemesMatrix` multi-column layout story           | Theme toolbar is sufficient per issue acceptance; D6 above                                                                                        | none                                     |
| i18n of chip text ("Verifiable · earned …")           | Story uses hardcoded English fixture strings; i18n keys are added in the `[Integrate]` issue (#380) when the component is wired to real data      | #380                                     |

## Follow-ups

| Item                                                                      | Why                                                                                                                                                                                | Owner                                                                         |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| ~~**New `celebration-*` chrome token** (per-theme, contrast-validated)~~  | ~~The band should be the prototype's celebration **yellow**, not purple `screenHeaderBg`.~~ **Done 2026-06-29** (commit `ca84cace`).                                               | ~~Separate design-tokens PR~~ → shipped on this branch                        |
| ~~Point band bg / title / sparkle / nav-icon fg at `celebrationBg`/`Fg`~~ | ~~Once the token lands, switch `styles.band` off `screenHeaderBg` and route the title + sparkle + nav-icon foregrounds through `celebrationFg` (a `celebration` IconButton tone)~~ | ~~This issue, after the token PR merges~~ → **Done 2026-06-29** (this branch) |
| i18n of `credentialLabel` + nav a11y labels                               | Component takes English via props/literals; `t()` wiring happens at integration                                                                                                    | #380                                                                          |

## Open Questions (resolved — 2026-06-29)

Q1=A + Q2=recommended, shipped on this branch. See Revision §3 above and the Discovery Log.

## Discovery Log

- [2026-06-29] Prototype re-check (issue-linked `Badge Detail C Prototype.dc.html`) found the `showConfetti` decoration is 6 static ✦/◆ glyphs, not the falling `Confetti` component → reimplemented as inline `Sparkles`.
- [2026-06-29] Prototype has a standalone goal-title heading + a single-line "✓ Verifiable · earned {date}" chip → title moved out of the chip; chip prop `earnedDate` → `credentialLabel`.
- [2026-06-29] Prototype band is celebration yellow (`#ffe50c`); no per-theme yellow token exists. User decision: add a per-theme `celebration-*` token (separate PR) before swapping the band off `screenHeaderBg`. Proposed values mirror the existing contrast-validated `chrome-top-bar-*` palette.
- [2026-06-29] `IconButton tone="chrome"` (md = 44pt) used for back/overflow instead of raw `Pressable` — supplies role/label/toned-icon, matches existing `BadgeDetailScreen`.
- [2026-06-29] Q1/Q2 resolved (A + recommended). New `celebration-bg/fg` token added to `packages/design-tokens` with per-theme overrides mirroring `chrome-top-bar-*`; `CelebrationHeroHeader` band/title/sparkles/chip-border swapped to `celebrationBg/Fg`; new `IconButton` `tone="celebration"` resolves to `celebrationFg` (the `chrome` tone's `chromeTabBarFg` goes light in dyslexia/autismFriendly and fails on yellow); `celebration` pair added to `contrastPairs.ts`. Contrast + IconButton + CelebrationHeroHeader tests green across all themes.
