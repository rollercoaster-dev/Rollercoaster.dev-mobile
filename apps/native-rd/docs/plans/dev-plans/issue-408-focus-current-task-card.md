# Development Plan: Issue #408

## Issue Summary

**Title**: [Storybook] Focus Mode — Current Task Card view
**Type**: feature (new component)
**Complexity**: MEDIUM
**Estimated Lines**: ~320 lines

Pure presentational, prop-driven hero card that replaces `StepCard`-inside-a-`CardCarousel`
in Focus Mode. Four states (in-progress, paused, completed, all-steps-complete), the E·C·B
metadata band, and an AllThemesMatrix story across all 7 product themes. Not imported by any
screen — Storybook only (#377 owns app wiring).

## Intent Verification

Observable criteria a reviewer can verify by running Storybook and the test suite:

- [ ] When `FocusCurrentTaskCard` renders with `status="in-progress"`, the state pill is silent
      (no pill rendered — "in-progress" position says it all per design brief), the title appears,
      the E·C·B band shows 0–3 truth-lines, the "Evidence · required" attribute is always
      present (every step requires evidence — full stop), planned evidence type + "change" affordance appear, captured
      evidence chips render in a rail, the pause CTA ("❙❙ Set this step aside") and the add-type
      CTA ("Add {type}") are both present, and the "✓ Mark complete" CTA appears only when
      captured evidence is present (never when the rail is empty).
- [ ] When `status="paused"`, the state pill (color + word from `stepStateColorMap`) renders
      beside the title, the "Set aside" body copy appears, and the "► Pick this back up"
      CTA is the sole action.
- [ ] When `status="completed"`, the state pill renders, the title appears, the captured
      evidence rail is present, and "Reopen this step" is the sole CTA.
- [ ] When `status="all-complete"`, no pill, the "Every step done." + trophy copy appears, and
      "Design your badge" CTA is present.
- [ ] The state pill color AND label both come from `stepStateColorMap` (same source as
      `TimelineNode` and `TimelineStep`); color is never the sole signal.
- [ ] The E·C·B metadata band renders 0–3 lines: dependency line uses "waiting on…" or
      "after …" (never "blocked by"); date line uses `theme.fontFamily.mono` with no red
      or overdue framing.
- [ ] No "missing", "needed", or "blocked" framing anywhere; "✓ Mark complete" is revealed
      by present evidence — not shown as disabled before evidence lands.
- [ ] Zero hardcoded hex values; all colors resolve through `theme.*` tokens via
      `StyleSheet.create((theme) => ...)`.
- [ ] All interactive elements have `accessibilityRole`, `accessibilityLabel`, and
      44pt minimum touch targets (`minHeight: 44`).
- [ ] Unit tests pass; component is not imported by any screen after this PR.

## Dependencies

| Issue | Title                                               | Status       | Type    |
| ----- | --------------------------------------------------- | ------------ | ------- |
| #406  | TimelineNode — one state-color language             | Met (CLOSED) | Blocker |
| #417  | Add `paused` step status + Set aside / Pick back up | Unmet (OPEN) | Soft    |

**Status**: The hard blocker (#406) is merged. `stepStateColorMap`, `stepStateNodeBg`,
`stepStateNodeFg`, `StepStateMapKey`, `themes`, `themeNames` are all live in the codebase at
`src/components/TimelineNode/stepStateColorMap.ts`.

#417 (paused DB status) is still open. The card's `paused` state is story-displayable now via
a prop — no DB wire needed for this deliverable. The implementation uses `StepStateMapKey`
which already includes `"paused"` (added in the #406 PR). The soft dependency is not a blocker.

## Objective

Build `src/components/FocusCurrentTaskCard/` — a standalone, prop-driven hero card for the
Focus Mode screen. Four states (in-progress, paused, completed, all-steps-complete), each with
a Storybook story and unit tests. The component consumes `stepStateColorMap` so its pill token
is structurally identical to the `TimelineNode` and `TimelineStep` pill — one color language,
enforced by shared code.

## Decisions

| ID  | Decision                                                                                                                          | Alternatives Considered                                         | Rationale                                                                                                                                                                                                                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | New `src/components/FocusCurrentTaskCard/` directory (not co-located with StepCard)                                               | Co-locate under `StepCard/` as a variant; co-locate with screen | `StepOverviewCard` lives inside `StepCard/` because it IS a StepCard variant (same dispatcher). `FocusCurrentTaskCard` is a different abstraction (hero view, not carousel card). A peer-level component dir is the correct scope.                                                                                         |
| D2  | `status` prop covers `"in-progress" \| "paused" \| "completed" \| "all-complete"` as a local union (not reusing `StepCardStatus`) | Extend `StepCardStatus`; extend `StepStateMapKey`               | `all-complete` is a card-level view state (all steps done), not a per-step DB status. Adding it to either existing type would pollute upstream consumers. Local `FocusCardStatus` type is cleanest.                                                                                                                        |
| D3  | In-progress state: no state pill rendered                                                                                         | Render pill with special "silent" styling                       | Design brief: "Pill stays silent for in-progress — position says it." The pill is omitted for this state only; present evidence still reveals "✓ Mark complete" via conditional rendering (not a disabled element).                                                                                                        |
| D4  | E·C·B band re-uses the `MetadataBand` internal pattern from `TimelineStep.tsx` — extracted into props, not component import       | Import `MetadataBand` from `TimelineStep`                       | `MetadataBand` is an unexported internal function in `TimelineStep.tsx`. Extracting it to a shared file would be correct long-term but is out of scope for this deliverable. The card owns its own inline band implementation, mirroring the same pattern. A follow-up to extract it is `FocusMetadataBand` scope, not C1. |
| D5  | `stateWordPill` styling mirrored from `TimelineStep.styles.ts`                                                                    | Share via a shared styles file                                  | Same rationale as D4: the pattern is established, the shared extraction is follow-up scope. The card's `.styles.ts` imports `stepStateNodeBg`/`stepStateNodeFg` directly, same as `TimelineStep.styles.ts`.                                                                                                                |

## Affected Areas

- `src/components/FocusCurrentTaskCard/FocusCurrentTaskCard.tsx` — new component (all 4 states)
- `src/components/FocusCurrentTaskCard/FocusCurrentTaskCard.styles.ts` — Unistyles stylesheet
- `src/components/FocusCurrentTaskCard/FocusCurrentTaskCard.stories.tsx` — per-state stories + AllThemesMatrix
- `src/components/FocusCurrentTaskCard/index.ts` — barrel export
- `src/components/FocusCurrentTaskCard/__tests__/FocusCurrentTaskCard.test.tsx` — unit tests
- `src/i18n/resources/en/focusMode.json` — new i18n keys for card copy
- `src/i18n/resources/de/focusMode.json` — German translations for new keys

## Implementation Plan

### Step 1: i18n keys for the four states

**Files**: `src/i18n/resources/en/focusMode.json`, `src/i18n/resources/de/focusMode.json`
**Commit**: `i18n(focusCurrentTaskCard): add copy keys for all 4 card states`
**Changes**:

- [ ] Add `focusMode:currentTask.inProgress.*` keys:
  - `helperLine`: `"Only evidence unlocks complete — nothing here blocks you."`
  - `evidenceRequired`: `"Evidence · required"`
  - `changeEvidenceType`: `"change"`
  - `evidenceRailLabel`: `"Captured"`
  - `addTypeCta`: `"Add {{type}}"`
  - `pauseCta`: `"❙❙ Set this step aside"`
  - `markCompleteCta`: `"✓ Mark complete"`
  - `markCompleteA11y`: `"Mark this step complete"`
  - `pauseA11y`: `"Set this step aside — pause it"`
- [ ] Add `focusMode:currentTask.paused.*` keys:
  - `body`: `"Set aside — still here, nothing lost. Your next step routes past it until you pick it back up."`
  - `pickUpCta`: `"► Pick this back up"`
  - `pickUpA11y`: `"Pick this step back up and continue"`
- [ ] Add `focusMode:currentTask.completed.*` keys:
  - `reopenCta`: `"Reopen this step"`
  - `reopenA11y`: `"Reopen this step to add more evidence or continue work"`
- [ ] Add `focusMode:currentTask.allComplete.*` keys:
  - `heading`: `"Every step done."`
  - `body`: `"🏆 Now design the badge that marks it — the keepsake comes at the end."`
  - `designBadgeCta`: `"Design your badge"`
  - `designBadgeA11y`: `"Design your badge to celebrate completing this goal"`
- [ ] Mirror keys into `de/focusMode.json` (German)

### Step 2: Component and styles

**Files**: `src/components/FocusCurrentTaskCard/FocusCurrentTaskCard.tsx`, `src/components/FocusCurrentTaskCard/FocusCurrentTaskCard.styles.ts`, `src/components/FocusCurrentTaskCard/index.ts`
**Commit**: `feat(focusCurrentTaskCard): four-state hero card with E·C·B band`
**Changes**:

- [ ] Define `FocusCardStatus = "in-progress" | "paused" | "completed" | "all-complete"` (local union)
- [ ] Define `FocusCapturedEvidenceItem` mirroring `CapturedEvidenceItem` from `StepCard.tsx:36-42` (id, type, caption)
- [ ] Define `FocusCurrentTaskCardProps`:
  - `status: FocusCardStatus`
  - `title: string`
  - `plannedEvidenceType?: string | null` — the primary planned type label (display-only for in-progress)
  - `capturedEvidence?: readonly FocusCapturedEvidenceItem[]`
  - `onPause?: () => void`
  - `onPickUp?: () => void`
  - `onMarkComplete?: () => void`
  - `onReopen?: () => void`
  - `onDesignBadge?: () => void`
  - `onChangeEvidenceType?: () => void` — opens #409
  - `afterStep?: string` — C band (dependency): "after [step]"
  - `waitingOn?: { who: string; expected?: string }` — C band (dependency): "waiting on [who] · expected [date]"
  - `dueDate?: string` — B band (date): "due [date]", mono, no red
- [ ] Implement `InProgressView` sub-function:
  - Title as `accessibilityRole="header"`
  - E·C·B band (0–3 lines) via inline `MetadataBand` function (mirrors `TimelineStep.tsx:259-286`); no state line (in-progress is silent)
  - "Evidence · required" attribute line — always shown (every step requires evidence); rendered in `theme.colors.textSecondary` as quiet text (Direction A's calm band, not a loud badge)
  - Planned evidence type + "change" affordance as a `Pressable` calling `onChangeEvidenceType` (accessibilityRole="button", minHeight 44)
  - Captured evidence rail (hidden when empty): label + chip row, same chip style as `StepCard.styles.ts:149-172`; chips are `accessibilityRole="text"`, never buttons
  - Helper line in `theme.colors.textSecondary`
  - Pause CTA (`Pressable`, accessibilityRole="button", minHeight 44, calls `onPause`)
  - "✓ Mark complete" CTA — conditional: only rendered when `capturedEvidence.length > 0` (evidence present reveals it; never shown as disabled when empty)
- [ ] Implement `PausedView` sub-function:
  - State pill via `StateWordPill` (see below) with `status="paused"` — color+word from `stepStateColorMap`
  - Title (`accessibilityRole="header"`)
  - Body copy
  - "► Pick this back up" CTA (`Pressable`, accessibilityRole="button", minHeight 44, calls `onPickUp`)
- [ ] Implement `CompletedView` sub-function:
  - State pill with `status="completed"`
  - Title (`accessibilityRole="header"`)
  - Captured evidence rail (same pattern as in-progress)
  - "Reopen this step" CTA (`Pressable`, calls `onReopen`)
- [ ] Implement `AllCompleteView` sub-function:
  - No pill
  - "Every step done." heading
  - Trophy body copy
  - "Design your badge" CTA (`Pressable`, calls `onDesignBadge`)
- [ ] Implement `StateWordPill` local function (mirrors `TimelineStep.tsx:242-248`):
  - Imports `stepStateNodeBg`, `stepStateNodeFg` from `../../components/TimelineNode/stepStateColorMap`
  - `StyleSheet.create((theme) => stateWordPill: (status) => ({ backgroundColor: stepStateNodeBg(theme, status), ... }))` pattern matching `TimelineStep.styles.ts:59-74`
  - Word sourced from `t(stepStateColorMap[status].badgeI18nKey)`
- [ ] Implement `MetadataBand` local function (mirrors `TimelineStep.tsx:259-286`):
  - C line: `waitingOn` → `"waiting on ${who}${expected ? ' · expected ' + expected : ''}"`, else `afterStep` → `"after ${afterStep}"`, else null
  - B line: `dueDate` → `"due ${dueDate}"` in `theme.fontFamily.mono` (no red, no "overdue")
  - Returns null when both are null
- [ ] `FocusCurrentTaskCard.styles.ts`: `StyleSheet.create((theme) => ...)` — no hardcoded hex; tokens from `theme.colors.*`, `theme.journey.*` (via helper fns), `theme.space.*`, `theme.radius.*`, `theme.borderWidth.*`, `theme.fontWeight.*`, `theme.fontFamily.*`, `theme.size.*`; `shadowStyle(theme, "cardElevation")` for card; `shadowStyle(theme, "cardElevationSmall")` for chips/CTAs
- [ ] `index.ts`: export `FocusCurrentTaskCard` and `FocusCardStatus`

### Step 3: Stories

**Files**: `src/components/FocusCurrentTaskCard/FocusCurrentTaskCard.stories.tsx`
**Commit**: `storybook(focusCurrentTaskCard): per-state stories + AllThemesMatrix`
**Changes**:

- [ ] `InProgress` story — evidence required + one planned type + two captured chips + pause + mark-complete visible
- [ ] `InProgressNoEvidence` story — no captured evidence, mark-complete NOT rendered
- [ ] `InProgressWithECBBand` story — all three band lines populated (afterStep, waitingOn is skipped to keep it a single C line; also a dueDate)
- [ ] `Paused` story
- [ ] `Completed` story — with captured evidence rail
- [ ] `AllComplete` story
- [ ] `AllThemesMatrix` story: reads `themes[name]` statically (same pattern as `TimelineNode.stories.tsx:213-254`); renders each of 4 states × 7 themes in a scrollable grid showing the state pill's bg+fg colors resolving from `stepStateNodeBg`/`stepStateNodeFg`; uses `MOOD_NAMES` map (copy from TimelineNode.stories.tsx:176-184)

### Step 4: Unit tests

**Files**: `src/components/FocusCurrentTaskCard/__tests__/FocusCurrentTaskCard.test.tsx`
**Commit**: `test(focusCurrentTaskCard): contract tests for all 4 states and no-"needed" rule`
**Changes**:

- [ ] Test each of the 4 states renders without crashing
- [ ] `test.each` over all 4 states: pill renders color+word (not color-only) — verify `accessibilityLabel` contains the state word
- [ ] In-progress: "✓ Mark complete" is NOT present when `capturedEvidence` is empty
- [ ] In-progress: "✓ Mark complete" IS present when `capturedEvidence` has items
- [ ] In-progress: `onMarkComplete` is called when CTA pressed
- [ ] In-progress: `onPause` is called when pause CTA pressed
- [ ] In-progress: `onChangeEvidenceType` is called when "change" affordance pressed
- [ ] Paused: `onPickUp` is called when pick-up CTA pressed
- [ ] Completed: `onReopen` is called when reopen CTA pressed
- [ ] AllComplete: `onDesignBadge` is called when design badge CTA pressed
- [ ] No "missing" / "needed" / "blocked" text ever renders (`test.each` over all states)
- [ ] Metadata band: "after [step]" line renders; "waiting on [who]" line renders; "due [date]" in mono (check `fontFamily` via style); date line never contains "overdue"
- [ ] A11y: all interactive elements have `accessibilityRole="button"` and non-empty `accessibilityLabel`
- [ ] A11y: all interactive elements have `minHeight: 44` (verify via style prop)

## Testing Strategy

- [ ] Unit tests via `bun run test --testPathPatterns FocusCurrentTaskCard` (Jest 30, `@testing-library/react-native` v13, `renderWithProviders` from `src/__tests__/test-utils.tsx`)
- [ ] Test file at `src/components/FocusCurrentTaskCard/__tests__/FocusCurrentTaskCard.test.tsx` (mirrors `src/` structure)
- [ ] Use `test.each` for per-state repetition (matches established pattern in `StepCard.test.tsx:50-62` and `TimelineNode.test.tsx:16-24`)
- [ ] Manual Storybook verification: run web Storybook, open each named story, flip theme toolbar through all 7 themes; confirm AllThemesMatrix grid colors match TimelineNode grid for the same states

## Not in Scope

| Item                                                          | Reason                                                                                      | Follow-up                   |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------- |
| App wiring / screen import                                    | Out of scope per issue — #377 owns Focus Mode screen integration                            | #377                        |
| #409 evidence type change bottom sheet                        | CTA calls `onChangeEvidenceType` prop (noop in stories); sheet is a separate issue          | #409                        |
| Extracting `MetadataBand` / `StateWordPill` to shared package | Correct long-term; scope is C1 card delivery                                                | Follow-up issue to file     |
| `journey-step-paused-bg/fg` design tokens                     | TODO noted in `stepStateColorMap.ts:79`; `paused` uses `accentPurpleLight` fallback for now | Follow-up per the #406 TODO |
| AllComplete as a screen-level state                           | "Nothing in progress / N set aside" all-paused screen state is #377                         | #377                        |

_No items deferred that are required to meet the acceptance criteria for this issue._

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->
