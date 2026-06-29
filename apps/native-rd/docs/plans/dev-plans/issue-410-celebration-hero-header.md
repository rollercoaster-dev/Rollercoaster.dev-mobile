# Development Plan: Issue #410

## Issue Summary

**Title**: [Storybook] Badge Detail — celebration hero header
**Type**: feature (new presentational component — Track D1 of Epic #384)
**Complexity**: SMALL
**Estimated Lines**: ~300 lines

## Intent Verification

Observable criteria derived from the issue. These describe what success looks like from a user/system perspective — not generic checklists.

- [ ] `CelebrationHeroHeader` renders a full purple band with a centered `BadgeRenderer` at 146px, a back-arrow touchable, and a ⋯ overflow touchable in web Storybook
- [ ] The `VerifiedCredentialChip` sub-component renders a pill with a green checkmark, the badge title, and the earned date underneath the badge, in every story
- [ ] `Confetti` (the existing component) is visible and animates inside the band in the `Designed` story, and is absent in the `Undesigned` story
- [ ] Switching the Storybook global theme toolbar through all 7 themes — `light-default`, `dark-default`, `light-highContrast`, `light-dyslexia`, `light-autismFriendly`, `light-lowVision`, `light-lowInfo` — produces no hardcoded hex in the band (band bg = `theme.chrome.screenHeaderBg`, chip border = `theme.chrome.screenHeaderBorder`, etc.)
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

## Decisions

| ID  | Decision                                                                                                          | Alternatives Considered                                        | Rationale                                                                                                                                                                                                                                                                                                               |
| --- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| D1  | Band background token = `theme.chrome.screenHeaderBg`                                                             | Hardcoded `palette.purple400`; a new `heroSurface` token       | `screenHeaderBg` already carries the per-theme purple (`#a78bfa` light-default, `#2a1d4e` dark-default, `#000000` highContrast, `#8860a0` dyslexia/autismFriendly, `#6d5d7d` lowVision, `#222222` lowInfo) — exactly the right semantic. Hardcoding breaks ND themes; a new token is unwarranted when this one matches. |
| D2  | Badge size = 146 logical pixels                                                                                   | 160px (old BadgeDetailScreen preview container)                | 160px was the old floating overlay size. 146px matches the HTML prototype exactly and keeps the band height comfortable without inflating it.                                                                                                                                                                           |
| D3  | `Confetti` placement = `position: "absolute"`, `inset: 0`, `pointerEvents: "none"`, `accessibilityElementsHidden` | None                                                           | `Confetti` is already implemented this way internally; the hero band is `overflow: "hidden"` so particles that exit the band clip naturally. The existing component's `accessibilityElementsHidden` prop eliminates screen-reader noise.                                                                                |
| D4  | Undesigned fallback = `createDefaultBadgeDesign(goalTitle, palette.purple400)`                                    | Blank space; initial-on-flat-colour `View`                     | `BadgeRenderer` already handles a `BadgeDesign` that is a monogram-initial on a color, which is the pre-designer state. Using `createDefaultBadgeDesign` keeps the fallback identical to what the badge designer produces before the user customises anything. The prop for this is `BadgeDesign                        | null` — null triggers the fallback internally. |
| D5  | `VerifiedCredentialChip` = inline sub-component in the same file                                                  | Separate component in `src/components/`                        | It is specific to this header band and has no known reuse outside Badge Detail. A top-level component would be premature extraction; the `[Integrate]` issue can decide if it needs to be promoted.                                                                                                                     |
| D6  | Storybook theme coverage = Storybook global theme toolbar (no AllThemesMatrix render)                             | An `AllThemesMatrix` story that renders 7 side-by-side columns | The issue's acceptance criteria say "theme toolbar or an `AllThemesMatrix` story". The toolbar approach avoids layout complexity and is the established pattern for `ScreenHeader`, `GoalsCockpit`, and other single-component stories in this repo. The reviewer switches the toolbar and eyeballs.                    |
| D7  | File location = `src/screens/BadgeDetailScreen/CelebrationHeroHeader.tsx`                                         | `src/components/CelebrationHeroHeader/`                        | `GoalsCockpit` lives under `src/screens/GoalsScreen/` — the established pattern for presentational views that belong to a single screen track. The integration issue (#380) will `import` from the same dir without a path change.                                                                                      |

## Affected Areas

- `apps/native-rd/src/screens/BadgeDetailScreen/CelebrationHeroHeader.tsx` — new presentational component (band + chip + confetti + overflow)
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
  badgeTitle: string
  earnedDate: string | null         // null → chip hides the date sub-line
  isVerified: boolean               // controls chip visibility
  showConfetti: boolean
  onBack: () => void
  onOverflow: () => void
  ```
- [ ] Render the outer band `View` using `styles.band` (background = `theme.chrome.screenHeaderBg`, bottom border = `theme.chrome.screenHeaderBorder`, `overflow: "hidden"`)
- [ ] Render the nav row (`onBack` back-arrow left, `onOverflow` ⋯ right), both wrapped in `Pressable` with `minHeight: 44`, `minWidth: 44`, `accessibilityRole="button"`, `accessibilityLabel`
- [ ] Render `BadgeRenderer` centered at `size={146}`; when `badgeDesign` is null, call `createDefaultBadgeDesign(badgeTitle, palette.purple400)` to produce the monogram fallback
- [ ] Render `VerifiedCredentialChip` below the badge (inline sub-component): green checkmark icon via `Check` from `phosphor-react-native`, badge title text, optional earned date sub-line; background = `theme.surfaceBorder.surfaceCardBg`, border = `theme.chrome.screenHeaderBorder`, borderRadius = `theme.radius.pill`, `shadowStyle(theme, "cardElevationSmall")`; hidden when `!isVerified`
- [ ] Render `<Confetti visible={showConfetti} />` in `position: "absolute"`, `inset: 0`, `pointerEvents: "none"` inside the band (clips at `overflow: "hidden"`)
- [ ] Styles in `CelebrationHeroHeader.styles.ts` using `StyleSheet.create((theme) => ...)` — zero hardcoded hex; tokens: `theme.chrome.screenHeaderBg`, `theme.chrome.screenHeaderFg`, `theme.chrome.screenHeaderBorder`, `theme.surfaceBorder.surfaceCardBg`, `theme.colors.success`, `theme.space.*`, `theme.borderWidth.*`, `theme.radius.*`, `shadowStyle(theme, ...)`

### Step 2: Storybook stories

**Files**: `CelebrationHeroHeader.stories.tsx`
**Commit**: `feat(badge-detail): CelebrationHeroHeader Storybook stories`
**Changes**:

- [ ] Define `meta` with `title: "Screens/BadgeDetail/CelebrationHeroHeader"`, `component: CelebrationHeroHeader`, `args` using noop callbacks
- [ ] `Designed` story — a fully-decorated `BadgeDesign` (circle, purple fill, Trophy icon, banner "REWIRED"), `isVerified: true`, `showConfetti: true`, `earnedDate: "Jun 18, 2026"`. This is the primary story reviewers switch themes on
- [ ] `Undesigned` story — `badgeDesign: null`, `isVerified: false`, `showConfetti: false`, `earnedDate: null`; confirms the monogram fallback renders cleanly across themes without confetti or chip
- [ ] `NoConfetti` story — same as `Designed` but `showConfetti: false`, confirms static state (useful for ND themes where `useAnimationPref` might suppress animation anyway)

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

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->
