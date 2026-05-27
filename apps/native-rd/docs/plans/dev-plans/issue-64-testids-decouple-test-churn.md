# Development Plan: Issue #64

## Issue Summary

**Title**: i18n: add stable testIDs to load-bearing UI to decouple test churn
**Type**: refactor / test hygiene
**Complexity**: SMALL
**Estimated Lines**: ~360 lines changed (tests ~300, source ~60)

## Intent Verification

Observable criteria derived from the issue. These describe what success looks like from a user/system perspective — not generic checklists.

- [x] Every `fireEvent.press` or `fireEvent` targeting a load-bearing interactive element (GoalCard, StepCard mark-complete, EditMode CTA button) uses `getByTestId` or an accessibility-role query — not `getByText` on UI copy
- [x] `getByText("Step 1 of 2")`, `getByText("Mark complete")`, `getByText("Focus Mode")`, `getByText("Goal not found.")` and similar i18n-wrapped strings are replaced with `i18n.t()` lookups in FocusModeScreen.test.tsx
- [x] `getByText("Start Working")` / `getByText("Back to Focus")` in EditModeScreen.test.tsx use `getByTestId("start-working")` / `getByTestId("back-to-focus")` (testIDs already exist in source)
- [x] `getByText("00:00")` in VoiceMemoScreen.test.tsx and CaptureVideoScreen.test.tsx uses `getByTestId("voice-timer")` / `getByTestId("video-recorder-timer")` (with `toHaveTextContent` to keep the value check)
- [x] `getByRole("button")` / `getByRole("checkbox")` accessibility-driven queries are preserved everywhere they are already stronger than testID; checkbox/dialog presses upgraded _to_ role queries (D1)
- [x] All Jest tests pass: `npx jest --no-coverage`

## Dependencies

| Issue | Title                                                     | Status    | Type    |
| ----- | --------------------------------------------------------- | --------- | ------- |
| #70   | i18n: migrate evidence capture (photo, video, voice memo) | ✅ CLOSED | Blocker |
| #71   | i18n: migrate evidence capture (text note, file, link)    | ✅ CLOSED | Blocker |
| #72   | i18n: migrate evidence capture permission-denied UI       | ✅ CLOSED | Blocker |

**Status**: ✅ All dependencies met

## Objective

Replace brittle `getByText("English copy")` assertions in screen tests with stable queries — either `getByTestId`, `getByRole`, or `i18n.t()`-wrapped `getByText`. Add the small number of source testIDs needed to support the new queries. Preserve all a11y-driven assertions.

## Decisions

| ID  | Decision                                                                                                                      | Alternatives Considered                        | Rationale                                                                                                                                                           |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Replace "Mark complete" via `getByRole("checkbox", { name: i18n.t(...) })`, not a new testID                                  | Add `testID="step-card-checkbox"` to Checkbox  | `Checkbox` already exposes `accessibilityRole="checkbox"` + `accessibilityLabel`; role query is stronger a11y coverage                                              |
| D2  | Keep `getByText("Badges")` in FocusPillTabBar line 96                                                                         | Replace with testID                            | That assertion intentionally verifies label text is visible for the active tab — it is the behavior under test, not a proxy for element presence                    |
| D3  | Keep `getByText("Learn TypeScript")` / goal title assertions that verify USER DATA renders                                    | Replace with testID                            | Goal titles are dynamic user content, not UI copy; asserting by value is correct here                                                                               |
| D4  | Replace `getByText("Learn TypeScript")` in `fireEvent` calls (GoalCard press/longPress) with `getByTestId(`goal-card-${id}`)` | Keep text-based fireEvent                      | Text-based fireEvent on a translatable label is brittle; testID targets the correct interaction surface                                                             |
| D5  | Replace `getByText("Step 1 of 2")` etc. with `i18n.t("common:stepCard.progress", {...})` in tests                             | Add testID to step counter Text                | Step counter text is already i18n-wrapped in source; test just needs to use the same key. No source change needed.                                                  |
| D6  | Add `testID="voice-timer"` to VoiceMemoScreen timer Text; `testID="video-recorder-timer"` to VideoRecorder timer Text         | Use `getByLabelText` with the a11y timer label | Timer elements already have `accessibilityLabel` with formatted time — `getByLabelText` is also valid here. testID is slightly clearer for a purely visual element. |
| D7  | Add `testID={`goal-card-${goal.id}`}` to GoalCard root                                                                        | Static testID                                  | Dynamic ID lets test fixture target specific cards by ID                                                                                                            |

## Affected Areas

- `src/components/GoalCard/GoalCard.tsx`: add `testID` prop (dynamic, keyed on `goal.id`)
- `src/components/VideoRecorder/VideoRecorder.tsx`: add `testID="video-recorder-timer"` to the recording timer `Text`
- `src/screens/VoiceMemoScreen/VoiceMemoScreen.tsx`: add `testID="voice-timer"` to the timer `Text`
- `src/screens/GoalsScreen/__tests__/GoalsScreen.test.tsx`: migrate `fireEvent` calls from `getByText(title)` to `getByTestId(`goal-card-${id}`)`; keep `getByText` assertions that verify user data renders
- `src/screens/FocusModeScreen/__tests__/FocusModeScreen.test.tsx`: replace ~30 brittle assertions (Step N of M, Mark complete, Focus Mode, Goal not found, Delete evidence?, Delete, Cancel, Evidence deleted, Could not update step) with `i18n.t()` equivalents; replace `fireEvent.press(getByText("Mark complete"))` with `getByRole("checkbox", { name: i18n.t(...) })`
- `src/screens/EditModeScreen/__tests__/EditModeScreen.test.tsx`: replace `getByText("Start Working")` / `getByText("Back to Focus")` with existing `getByTestId`; replace `getByText("Edit Goal")`, `getByText("Goal not found.")`, `getByText("3 steps")`, `getByText("Title cannot be empty")`, `getByText("Failed to update title")` with `i18n.t()` equivalents
- `src/screens/WelcomeScreen/__tests__/WelcomeScreen.test.tsx`: replace `/rollercoaster\.dev is your personal goal tracker\./` regex with `i18n.t("welcome:intro.body1")`
- `src/screens/VoiceMemoScreen/__tests__/VoiceMemoScreen.test.tsx`: replace `getByText("00:00")` etc. with `getByTestId("voice-timer")`
- `src/screens/CaptureVideoScreen/__tests__/CaptureVideoScreen.test.tsx`: replace `getByText("00:00")` with `getByTestId("video-recorder-timer")`

## Implementation Plan

### Step 1: Add testIDs to GoalCard and timer components

**Files**:

- `src/components/GoalCard/GoalCard.tsx`
- `src/screens/VoiceMemoScreen/VoiceMemoScreen.tsx`
- `src/components/VideoRecorder/VideoRecorder.tsx`

**Commit**: `test(testids): add testID to GoalCard, VoiceMemo timer, VideoRecorder timer`

**Changes**:

- [x] In `GoalCard.tsx`: pass `testID={`goal-card-${goal.id}`}` to the root `<Card>` component. Verify `Card` forwards `testID` — if not, add `testID?: string` to `CardProps` and forward it.
- [x] In `VoiceMemoScreen.tsx`: add `testID="voice-timer"` to the `<Text style={styles.timerText} ...>` element (around line 161)
- [x] In `VideoRecorder.tsx`: add `testID="video-recorder-timer"` to the recording-mode timer `<Text>` element (around line 289, the one with `styles.timerRecording`)

**Note on Card forwarding**: Check `src/components/Card/Card.tsx` for testID prop forwarding before making this change.

### Step 2: Migrate GoalsScreen test to testID-based fireEvent

**Files**:

- `src/screens/GoalsScreen/__tests__/GoalsScreen.test.tsx`

**Commit**: `test(testids): migrate GoalsScreen fireEvent to goal-card testID`

**Changes**:

- [x] Replace all `fireEvent.press(screen.getByText("Learn TypeScript"))` with `fireEvent.press(screen.getByTestId("goal-card-goal-1"))` (using the test fixture's known ID)
- [x] Replace all `fireEvent(screen.getByText("Learn TypeScript"), "longPress")` with `fireEvent(screen.getByTestId("goal-card-goal-1"), "longPress")`
- [x] Keep `expect(screen.getByText("Learn TypeScript")).toBeOnTheScreen()` — asserting that user-data goal titles render is correct and should not be changed
- [x] Keep `expect(screen.getByText("Open a savings account")).toBeOnTheScreen()` — same rationale (next-step title is user data)

### Step 3: Migrate FocusModeScreen test assertions

**Files**:

- `src/screens/FocusModeScreen/__tests__/FocusModeScreen.test.tsx`

**Commit**: `test(testids): migrate FocusModeScreen assertions to i18n.t() and role queries`

**Changes**:

- [x] `getByText("Focus Mode")` → `getByText(i18n.t("focusMode:title"))`
- [x] `getByText("Goal not found.")` → `getByText(i18n.t("focusMode:errors.goalNotFound"))`
- [x] `getByText("Step 1 of 2")` → `getByText(i18n.t("common:stepCard.progress", { current: 1, total: 2 }))` (and similarly for all Step N of M variants)
- [x] `fireEvent.press(screen.getByText("Mark complete"))` → `fireEvent.press(screen.getByRole("checkbox", { name: i18n.t("common:stepCard.checkbox.markComplete") }))`
- [x] `screen.getAllByText("Completed")` (line ~415) → `screen.getAllByRole("checkbox", { name: i18n.t("common:stepCard.checkbox.completed") })` — but note: "Completed" also appears as a StatusBadge. After i18n migration of StatusBadge, check what the assertion is actually testing. If it counts both StatusBadge and checkbox labels, a different approach (e.g. `getAllByLabelText`) may be needed. See open question OQ-1.
- [x] `getByText("Delete evidence?")` → `getByText(i18n.t("focusMode:confirmDelete.title"))`
- [x] `fireEvent.press(screen.getByText("Delete"))` → `fireEvent.press(screen.getByRole("button", { name: i18n.t("common:actions.delete") }))`
- [x] `fireEvent.press(screen.getByText("Cancel"))` → `fireEvent.press(screen.getByRole("button", { name: i18n.t("common:actions.cancel") }))`
- [x] `getByText("Evidence deleted")` → `getByText(i18n.t("focusMode:toast.evidenceDeleted"))`
- [x] `getByText("Could not update step: DB write failed")` → `getByText(i18n.t("focusMode:errors.couldNotUpdateStep", { message: "DB write failed" }))`
- [x] `getByText("Something went wrong")` — check the i18n key (`focusMode:errors.somethingWrong`) and which test uses this
- [x] Keep step title assertions: `getByText("Read docs")`, `getByText("Practice")`, `getByText("Build it")` — these are user-data step titles from the test fixture, not UI copy

### Step 4: Migrate EditModeScreen test assertions

**Files**:

- `src/screens/EditModeScreen/__tests__/EditModeScreen.test.tsx`

**Commit**: `test(testids): migrate EditModeScreen assertions to i18n.t() and existing testIDs`

**Changes**:

- [x] `getByText("Edit Goal")` → `getByText(i18n.t("editGoal:title"))`
- [x] `getByText("Goal not found.")` → `getByText(i18n.t("editGoal:errors.goalNotFound"))`
- [x] `getByText("3 steps")` → `getByText(i18n.t("editGoal:stepList.count_other", { count: 3 }))`
- [x] `getByText("Title cannot be empty")` → `getByText(i18n.t("editGoal:errors.titleRequired"))`
- [x] `getByText("Failed to update title")` → `getByText(i18n.t("editGoal:errors.updateTitleFailed"))`
- [x] `getByText("Start Working")` (in `expect`) → `getByTestId("start-working")`
- [x] `getByText("Back to Focus")` (in `expect`) → `getByTestId("back-to-focus")`
- [x] `fireEvent.press(screen.getByText("Start Working"))` → `fireEvent.press(screen.getByTestId("start-working"))`
- [x] `getByRole("button", { name: "Start Working" })` → `getByTestId("start-working")` OR keep role query with i18n name — check which is more readable in context
- [x] Keep step-title assertions: `getByText("Read docs")`, `getByText("Practice")`, `getByText("Build project")` — user data

### Step 5: Migrate WelcomeScreen and timer test assertions

**Files**:

- `src/screens/WelcomeScreen/__tests__/WelcomeScreen.test.tsx`
- `src/screens/VoiceMemoScreen/__tests__/VoiceMemoScreen.test.tsx`
- `src/screens/CaptureVideoScreen/__tests__/CaptureVideoScreen.test.tsx`

**Commit**: `test(testids): migrate WelcomeScreen regex + timer getByText to stable queries`

**Changes**:

- [x] In `WelcomeScreen.test.tsx`: replace `screen.getByText(/rollercoaster\.dev is your personal goal tracker\./)` with `screen.getByText(i18n.t("welcome:intro.body1"))`
- [x] In `VoiceMemoScreen.test.tsx`: replace `screen.getByText("00:00")` → `screen.getByTestId("voice-timer")`; `screen.getByText("00:03")` → `screen.getByTestId("voice-timer")`; `screen.getByText("00:10")` → `screen.getByTestId("voice-timer")`; `screen.getByText("01:05")` → `screen.getByTestId("voice-timer")`
- [x] In `CaptureVideoScreen.test.tsx`: replace `screen.getByText("00:00")` → `screen.getByTestId("video-recorder-timer")`

## Testing Strategy

- [x] Run full test suite after each step: `npx jest --no-coverage`
- [x] Run targeted tests during each step:
  - Step 1: `bun test --testPathPatterns GoalCard`
  - Step 2: `bun test --testPathPatterns GoalsScreen`
  - Step 3: `bun test --testPathPatterns FocusModeScreen`
  - Step 4: `bun test --testPathPatterns EditModeScreen`
  - Step 5: `bun test --testPathPatterns "WelcomeScreen|VoiceMemo|CaptureVideo"`
- [x] No snapshot updates expected (no snapshots exist for these screens)
- [x] Type-check after source changes: `bun run type-check`

## Not in Scope

| Item                                                                                                | Reason                                                                                                                                | Follow-up                                      |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Adding testIDs to BadgesScreen, BadgeDetailScreen, CompletionFlowScreen, EvidenceViewerScreen tests | These screens have brittle text assertions but are not in the issue's named scope (Welcome, Goals, Focus, NewGoal, Settings, capture) | Issue #64 can be extended or a new issue filed |
| Adding testIDs to component tests (StepList, GoalEvidenceCard, EvidenceDrawer, etc.)                | Component-level getByText assertions are testing component behavior, not screen integration — lower priority                          | None                                           |
| Adding testIDs to badge screen tests (BadgeDesignerScreen, BadgeRenderer)                           | Not in i18n migration scope for this milestone                                                                                        | None                                           |
| Migrating `getByText` assertions on user-generated content (goal titles, step titles) to testID     | User-data assertions by value are semantically correct                                                                                | None                                           |
| Pseudo-locale test assertions that use `getByText(pseudo)`                                          | These are already correct — they test i18n routing                                                                                    | None                                           |

## Open Questions

**OQ-1 — RESOLVED**: `getByRole("checkbox", { name: i18n.t("common:stepCard.checkbox.completed") })` scopes cleanly to the Checkbox — the StatusBadge has no checkbox role, so the ambiguity is gone with no source testID needed. Both `getAllByText("Completed")[length-1]` sites replaced with a single `getByRole` call. All 52 FocusModeScreen tests pass.

**OQ-2 — Card component testID forwarding**: `GoalCard` uses the shared `Card` component as its root. Before Step 1, verify `Card.tsx` accepts and forwards a `testID` prop. If not, a one-line prop-forwarding change is needed there too.

## Discovery Log

- [2026-05-27] OQ-2 resolved: `Card.tsx` did NOT forward `testID`. Added `testID?: string` to `CardProps` and forwarded to both the `Pressable` branch and the `View` branch. Custom `Text` component already spreads `...rest` to RN `Text`, so the timer testIDs forward with no `Text.tsx` change needed.
- [2026-05-27] `bun test --testPathPatterns` finds no files (bun's native runner doesn't match the jest suites); used `npx jest --no-coverage --testPathPatterns` instead, per `apps/native-rd/CLAUDE.md`. Step 1 source-change tests: 62 passed.
