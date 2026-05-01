# Design Token Migration Audit

**Status:** Proposed mapping — REVIEW REQUIRED before any code change
**Date:** 2026-04-28
**Companion to:** [design-token-system-map.md](./design-token-system-map.md) (current state)
**Purpose:** for every `theme.colors.X` reference in the app, propose a semantic home (or "stays in base"). Reviewed by user before any TypeScript edits.

---

## Migration shape

- **540 `theme.colors.*` references** across **126 files**
- **17 distinct keys** in use
- Distribution is heavily skewed: top 6 keys (`border`, `text`, `textMuted`, `background`, `textSecondary`, `backgroundSecondary`) account for 444/540 (82%). Most are base colors, not feature-semantic.

## Guiding principle (corrected)

The package's 6 semantic systems (`chrome`, `action`, `surfaceBorder`, `journey`, `badgeReward`, `typographyRole`) **enrich, not replace** the flat `Colors` shape. Generic `text`/`background`/`border` stay flat. Feature-specific uses (app-shell yellow, button accents, journey progress, badge rewards) move to their semantic home.

## Migration verdict per key

| Key                   | Count | Verdict                                                                  | Semantic home                                  | Risk                      |
| --------------------- | ----: | ------------------------------------------------------------------------ | ---------------------------------------------- | ------------------------- |
| `border`              |   107 | **Stays flat** (it IS the base border)                                   | —                                              | n/a                       |
| `text`                |    97 | **Stays flat** (base foreground)                                         | —                                              | n/a                       |
| `textMuted`           |    69 | **Stays flat** OR move to `typographyRole.typoCaptionColor`              | typographyRole?                                | low — needs decision      |
| `background`          |    69 | **Stays flat** (base background)                                         | —                                              | n/a                       |
| `textSecondary`       |    54 | **Stays flat** (no clean semantic home)                                  | —                                              | n/a                       |
| `backgroundSecondary` |    48 | **Stays flat** OR move to `surfaceBorder.surfaceCardBg`                  | surfaceBorder?                                 | low — needs decision      |
| `accentPrimary`       |    40 | **Mixed** — buttons → `action`, accents stay flat                        | action.actionPrimaryBg (buttons only)          | medium                    |
| `accentYellow`        |    17 | **14 chrome → `chromeTopBarBg`**, 3 content stay flat                    | chrome.chromeTopBarBg                          | medium — see detail below |
| `backgroundTertiary`  |    10 | **Stays flat** OR move to `surfaceBorder.surfaceSunkenBg`                | surfaceBorder?                                 | low — needs decision      |
| `warning`             |     9 | **Stays flat** (no system covers status colors)                          | —                                              | n/a                       |
| `error`               |     6 | **Stays flat** for fills; `borderDestructive` for borders                | surfaceBorder.borderDestructive (borders only) | low                       |
| `shadow`              |     4 | **Stays flat** (just a color value used by `shadowStyle` helper)         | —                                              | n/a                       |
| `accentPurple`        |     4 | **Mixed** — TabNavigator uses it; should move to `chrome.chromeTabBarBg` | chrome.chromeTabBarBg (tab bar only)           | medium                    |
| `success`             |     2 | **Stays flat** (status color)                                            | —                                              | n/a                       |
| `focusRing`           |     2 | **Move** to `surfaceBorder.borderFocus`                                  | surfaceBorder.borderFocus                      | low                       |
| `accentPurpleLight`   |     2 | **Stays flat**                                                           | —                                              | n/a                       |
| `accentSecondary`     |     1 | **Stays flat**                                                           | —                                              | n/a                       |

**Summary:** of 540 references, ~430 stay flat (base colors), ~110 are migration candidates, and the high-risk subset is **17 `accentYellow` + 4 `accentPurple` + 2 `focusRing` + ~40 `accentPrimary` button uses** ≈ 60 references that actually move.

---

## High-risk: every `accentYellow` reference, classified

**14 of 17 are app-shell chrome.** Replace with `theme.chrome.chromeTopBarBg` (or `chromeHeaderBg` — see Open Question 1).

|   # | File                                                            | Line | Element          | Verdict                                                                   |
| --: | --------------------------------------------------------------- | ---: | ---------------- | ------------------------------------------------------------------------- |
|   1 | `screens/BadgesScreen/BadgesScreen.styles.ts`                   |   18 | `header`         | **chrome**                                                                |
|   2 | `screens/BadgesScreen/BadgesScreen.tsx`                         |   76 | `SafeAreaView`   | **chrome**                                                                |
|   3 | `badges/IconPickerModal.styles.ts`                              |   14 | `headerSafeArea` | **chrome**                                                                |
|   4 | `badges/IconPickerModal.styles.ts`                              |   29 | `header`         | **chrome**                                                                |
|   5 | `screens/TimelineJourneyScreen/TimelineJourneyScreen.styles.ts` |   12 | `topBar`         | **chrome**                                                                |
|   6 | `screens/TimelineJourneyScreen/TimelineJourneyScreen.tsx`       |  181 | `SafeAreaView`   | **chrome**                                                                |
|   7 | `screens/BadgeDesignerScreen/BadgeDesignerScreen.styles.ts`     |   20 | `header`         | **chrome**                                                                |
|   8 | `screens/BadgeDesignerScreen/BadgeDesignerScreen.tsx`           |  664 | `SafeAreaView`   | **chrome**                                                                |
|   9 | `screens/SettingsScreen/SettingsScreen.styles.ts`               |   18 | `header`         | **chrome**                                                                |
|  10 | `screens/SettingsScreen/SettingsScreen.tsx`                     |   37 | `SafeAreaView`   | **chrome**                                                                |
|  11 | `screens/GoalsScreen/GoalsScreen.styles.ts`                     |   18 | `header`         | **chrome**                                                                |
|  12 | `screens/GoalsScreen/GoalsScreen.tsx`                           |  128 | `SafeAreaView`   | **chrome**                                                                |
|  13 | `screens/FocusModeScreen/FocusModeScreen.styles.ts`             |   13 | `topBar`         | **chrome**                                                                |
|  14 | `screens/FocusModeScreen/FocusModeScreen.tsx`                   |  567 | `SafeAreaView`   | **chrome**                                                                |
|  15 | `components/StatusBadge/StatusBadge.styles.ts`                  |   17 | `variantActive`  | **content** — status accent. Stays flat OR `journey.journeyStepActiveBg`? |
|  16 | `components/GoalEvidenceCard/GoalEvidenceCard.styles.ts`        |   58 | bottom pill      | **content** — evidence indicator. Stays flat.                             |
|  17 | `components/StepCard/StepCard.styles.ts`                        |   52 | bottom pill      | **content** — step indicator. Stays flat.                                 |

The chrome cluster pattern is consistent: every screen has a `SafeAreaView` with yellow background + a `header` (or `topBar`) below it, also yellow. This is exactly the chrome top-bar role.

---

## Per-feature migration map (what moves to which semantic system)

### `chrome` — app shell

**Files affected:** 7 top-level screens + IconPickerModal.
**Tokens added to `ComposedTheme.chrome`:** `chromeTopBarBg`, `chromeTopBarFg`, `chromeHeaderBg`, `chromeHeaderFg`, `chromeHeaderBorder`, `chromeTabBarBg`, `chromeTabBarFg`, `chromeTabBarActiveFg`, `chromeTabBarIndicator`, `chromeModalBg`, `chromeModalFg`, `chromeModalBorder`, `chromeModalOverlay`.
**Migration:** the 14 chrome `accentYellow` refs above + `TabNavigator.tsx` (3 refs to `accentPurple`/`border`) + modal backdrops where they exist.

### `action` — buttons

**Files affected:** `Button/`, `IconButton/`, `FAB/`, possibly `Checkbox/`, `Toast/`.
**Tokens added:** `actionPrimaryBg/Fg/HoverBg/ActiveBg`, `actionSecondaryBg/Fg/HoverBg`, `actionDestructiveBg/Fg/HoverBg`, `actionDisabledBg/Fg/Border`, `actionSelectionBg/Fg/Border`.
**Migration:** Button/IconButton/FAB switch from `accentPrimary`/`background`/`border` to action tokens. ~30 refs across button-family components.

### `surfaceBorder` — cards, inputs, focus

**Files affected:** `Card/`, `Input/`, `EvidenceItem/`, `EvidenceThumbnail/`, etc.
**Tokens added:** `surfaceCardBg/Fg`, `surfaceSheetBg/Fg`, `surfaceInputBg/Fg`, `surfaceSunkenBg`, `surfaceElevatedBg`, `borderDefault/Strong/Subtle/Input/Focus/Destructive/Success`.
**Migration:** **optional** — most card/input refs use generic `background`/`border` which can stay flat. Only worth migrating if we want fine-grained per-variant overrides on these surfaces.

### `journey` — goals, steps, timeline, progress

**Files affected:** `GoalCard/`, `StepCard/`, `StepList/`, `TimelineNode/`, `TimelineStep/`, `ProgressBar/`, `ProgressDots/`, `MiniTimeline/`, `FinishLine/`, `screens/TimelineJourneyScreen/`, `screens/CompletionFlowScreen/`.
**Tokens added:** `journeyGoalBg/Fg/Border`, `journeyStepBg/Fg`, `journeyStepActiveBg/Fg`, `journeyStepCompleteBg/Fg`, `journeyProgressTrack/Fill`, `journeyTimelineLine`, `journeyTimelineNodeBg/Fg`, `journeyCompletionBg/Fg/Accent`.
**Migration:** ~50 refs. **Highest design risk** — these components are visually distinctive in the neo-brutalist look. Visual diff per commit is non-negotiable.

### `badgeReward` — badge rendering, celebrations

**Files affected:** `BadgeCard/`, `BadgeRenderer.tsx`, `Confetti/`, `screens/BadgeEarnedModal/`, `screens/BadgeDetailScreen/`, `badges/*` editors.
**Tokens added:** `rewardBadgeChromeBg/Fg/Border`, `rewardBadgeAccent1-5`, `rewardBadgeLabelBg/Fg`, `rewardCelebrationBurst1-6`, `rewardCelebrationText`, `rewardLevelNoviceBg/IntermediateBg/AdvancedBg/ExpertBg`.
**Migration:** ~40 refs. Touches user-visible badge designs — the thing the user is most worried about destroying.

### `typographyRole` — caption color

**Files affected:** anywhere using `theme.colors.textMuted` for de-emphasized text.
**Tokens added:** `typoCaptionColor`.
**Migration:** **optional / cosmetic.** `textMuted` is fine where it stands. Only migrate if we want per-variant caption tuning.

---

## Decisions

**D1. Top-of-screen yellow → `chromeTopBarBg`.** Confirmed. The `SafeAreaView` + screen `header` band is the chrome top-bar role.

**D2. ~~Per-theme `chromeTopBarBg` values are correct as-shipped.~~ — SUPERSEDED.** A dark-theme visual test exposed that the package's `chromeTopBarBg` (yellow carryover into dark) clashes with the dark navy body. The chrome composition layer was abandoned for native-rd headers; screens now use `theme.colors.accentPurple` / `accentPurpleFg`. See the [plan doc Learnings](../plans/2026-04-28-design-token-simplification-and-chrome.md#learnings--2026-04-28-after-attempting-steps-1-and-2). Original review preserved below for historical context:

| Theme            | `chromeTopBarBg`       | `chromeTopBarFg` | Status                                                                                                                        |
| ---------------- | ---------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| light            | `#ffe50c` (yellow)     | `#0a0a0a`        | brand ✓                                                                                                                       |
| dark             | `#ffe50c` (yellow)     | `#0a0a0a`        | theme's `highlight` + `narrative.climb.bg` are also yellow — deliberate brand carryover, differentiates from `#241845` card ✓ |
| highContrast     | `#ffffff`              | `#000000`        | max contrast ✓                                                                                                                |
| dyslexiaFriendly | `#f8f5e4` (cream)      | `#333333`        | low visual stress ✓                                                                                                           |
| autismFriendly   | `#d5c88a` (muted gold) | `#333333`        | desaturated brand ✓                                                                                                           |
| lowVision        | `#ffe50c` (yellow)     | `#000000`        | 19:1 contrast — best in palette; matches theme's `narrative.climb.bg` ✓                                                       |
| lowInfo          | `#ffffff`              | `#222222`        | reduced noise ✓                                                                                                               |

**No source-JSON changes needed.** The migration is purely additive: expose chrome on `ComposedTheme`, swap `theme.colors.accentYellow` → `theme.chrome.chromeTopBarBg` (+ pair foreground) in the 14 chrome refs.

## Open Questions

(Non-blocking — affect later steps, not the first commit.)

**Q3.** `StatusBadge variantActive` (yellow) — content, not chrome. Two choices:

- Stays as `theme.colors.accentYellow` (treat yellow as a brand accent for "active").
- Moves to `journey.journeyStepActiveBg` (currently `#3b82f6` blue in light mode — this would change the visual).
  **Default: stays yellow** unless you object.

**Q4.** `textMuted` and `backgroundSecondary` — migrate to `typographyRole`/`surfaceBorder`, or leave flat? They have no per-variant overrides today; migrating gives you that knob, but you may not need it. **Default: leave flat.**

**Q5.** `surfaceBorder` and `typographyRole` migrations are optional. Skip them entirely for v1 (smaller blast radius), or include them? **Default: skip for v1, revisit if per-variant tuning is wanted.**

---

## Proposed migration order (after questions answered)

Each step is one commit, with visual baseline screenshots before and after:

1. **Compose chrome into `ComposedTheme.chrome`** — no screen edits yet, just expose the tokens. Type-check passes, no visual change.
2. **Migrate the 14 chrome `accentYellow` refs to `theme.chrome.chromeTopBarBg`** + foreground + border. Visual diff: the 7 screens listed above.
3. **Migrate `TabNavigator` to `chrome.chromeTabBar*`** — single file, isolated.
4. **Compose `action` into `ComposedTheme.action`** — expose only.
5. **Migrate Button/IconButton/FAB to action tokens** — visual diff: every screen with buttons.
6. **Compose `journey` into `ComposedTheme.journey`** — expose only.
7. **Migrate journey-family components** — biggest design-risk slice. Visual diff: GoalsScreen, TimelineJourneyScreen, FocusModeScreen.
8. **Compose `badgeReward` into `ComposedTheme.badgeReward`** — expose only.
9. **Migrate badge-family components** — second-biggest design risk. Visual diff: BadgesScreen, BadgeDetailScreen, BadgeEarnedModal, BadgeDesignerScreen.
10. _(Optional)_ Compose `surfaceBorder` and `typographyRole` + migrate where worthwhile.
11. **Cleanup:** delete `palette.ts`/`tokens.ts`/`colorModes.ts` re-export shims; collapse 14→7 themes; rewrite `design-token-system.md`.

Each "compose" step is mechanical and zero-risk. Each "migrate" step requires visual sign-off before next step begins.

---

## What I will NOT do

- Touch any styles file before Q1–Q5 are answered.
- Combine "compose" + "migrate" into one commit.
- Delete the flat `Colors` shape — base colors stay there.
- "Clean up" any yellow accent (refs 15–17) without explicit reason.
- Skip the visual baseline.
