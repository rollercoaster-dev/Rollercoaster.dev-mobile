# Issue #991 — i18n Stable Test IDs

**Branch:** `feat/issue-991-i18n-testids`
**Milestone:** #30 — native-rd i18n
**Wave:** 1 (cross-cutting prereq) — should land before #992 and screen migrations

## Goal

Add stable selectors to load-bearing first-test-path UI so later i18n migrations can change visible copy without forcing every screen test to change at the same time.

This is not a blanket "replace all text assertions" pass. Keep assertions against user-generated content and meaningful visible copy when they prove the UI contract. Replace text queries where the test is really trying to press or locate a stable control.

## Readiness

- #988 foundation is closed.
- The current branch has been renamed to repo convention: `feat/issue-991-i18n-testids`.
- Existing worktree has unrelated theme/density changes; do not revert or mix with #991 except where a touched component is directly in scope.

## Research Snapshot

Target from the issue body: Welcome, Goals, Focus Mode, NewGoal, Settings, and capture screens.

Text-query counts in first-test-path screen tests:

| Test file                     | Text query count | Notes                                                                                     |
| ----------------------------- | ---------------: | ----------------------------------------------------------------------------------------- |
| `FocusModeScreen.test.tsx`    |               39 | Heavy interaction surface: mark complete, delete evidence, alerts/toasts, carousel state. |
| `VoiceMemoScreen.test.tsx`    |               24 | Recording controls and permission/error states.                                           |
| `SettingsScreen.test.tsx`     |               22 | Mostly section/theme/density labels; use roles for controls where possible.               |
| `WelcomeScreen.test.tsx`      |               16 | Theme selection and get-started CTA.                                                      |
| `GoalsScreen.test.tsx`        |               16 | Empty state CTA, goal cards, long-press delete flow.                                      |
| `CaptureLinkScreen.test.tsx`  |               14 | Form fields/buttons/error messages.                                                       |
| `NewGoalModal.test.tsx`       |               11 | Already has `new-goal-title` and `create-goal`; mainly update tests to use them.          |
| `CapturePhoto.test.tsx`       |               11 | Capture/library buttons.                                                                  |
| `CaptureTextNote.test.tsx`    |                9 | Note body, caption, save button, counter.                                                 |
| `CaptureFile.test.tsx`        |                8 | Choose-file button.                                                                       |
| `CaptureVideoScreen.test.tsx` |                8 | Video controls; mocked camera/player IDs already exist.                                   |

Existing useful selector support:

- `Button`, `IconButton`, and `Input` already accept `testID`.
- `NewGoalModal` already exposes `new-goal-title` and `create-goal`.
- `FocusPillTabBar` already uses `tab-*` IDs and `tab-fab-new-goal`.
- `CompletionFlowScreen` has targeted completion IDs, but it is not primary #991 scope unless touched by Focus/Goals flows.
- `CaptureVideoScreen` tests already rely on mocked `camera-view` / `video-player` IDs.

Selector gaps:

- `GoalCard` has no root/card `testID`, so goal list tests rely on goal title text for press and long-press.
- `StepCard` has no root/card/evidence/complete IDs, so Focus tests press `"Mark complete"` repeatedly.
- `FAB` and `FABMenu` have no `testID`, so Focus evidence-menu tests depend on labels.
- `EvidenceTypePicker` has no stable IDs for planned/type chips.
- `SettingsRow` has no `testID`, so settings tests lean on row labels.
- `ThemeChipGrid` has no chip IDs. Note: this file is already modified in the worktree by unrelated theme work; coordinate carefully before editing it.
- Capture screens need IDs for primary actions and form inputs where not already covered.

## Naming Convention

Use semantic, screen/component scoped IDs. Avoid copy-derived IDs.

Recommended pattern:

- Screen sections: `<screen>-<section>` (`settings-theme-section`, `goals-empty-state`)
- Buttons/actions: `<screen>-<action>-button` (`welcome-get-started-button`, `capture-photo-take-button`)
- Inputs: `<screen>-<field>-input` (`capture-link-url-input`, `capture-note-content-input`)
- Repeated items: `<component>-<stable-id>` or pass `testID` from screen (`goal-card-${goal.id}`, `step-card-${step.id}`)
- Menu items: `<menu>-item-${type}` (`evidence-menu-item-photo`)

Do not use translated labels in IDs. For user-created IDs, use persisted row IDs rather than titles.

## Implementation Plan

### 1. Shared primitives and components

Add optional `testID` support where missing:

- `GoalCard`: add `testID?: string`, pass to `Card`; optionally expose child IDs like `${testID}-title`, `${testID}-progress`, `${testID}-next-step` only if tests need them.
- `StepCard`: add `testID?: string`, pass to `Card` or an inner root; add stable IDs for evidence button and complete checkbox area if needed.
- `FAB`: add `testID?: string`, pass to root `Pressable`.
- `FABMenu`: add `testID?: string`; expose menu items as `${testID}-item-${item.type}`.
- `EvidenceTypePicker`: add `testID?: string`; expose chips as `${testID}-option-${type}` or `${testID}-selected-${type}` in compact mode.
- `SettingsRow`: add `testID?: string`, pass to Pressable/root row and switch if useful.

Keep props optional so existing call sites remain unchanged.

### 2. First-test-path screens

Add IDs to load-bearing controls:

- Welcome: get-started button, theme chip grid/options.
- Goals: empty-state create CTA, goal cards by goal id.
- NewGoal: already has title input and create button; add close button if tests need it.
- Focus Mode: edit/back buttons, carousel/step cards, mark-complete path through `StepCard`, evidence FAB/menu, delete modal actions if those remain in scope.
- Settings: theme chips, density rows/options, version/dev row.
- Capture Photo/File/Link/Text/Video/Voice: primary save/capture/choose/retake/attach/discard buttons, critical inputs, permission/error CTAs.

Prefer wiring IDs through existing shared components instead of wrapping extra Views.

### 3. Test migration policy

Update tests where text queries are brittle:

- Replace `fireEvent.press(screen.getByText("..."))` with `getByTestId` or `getByRole` when the action is the real contract.
- Replace repeated state-driving text lookups (`"Mark complete"`, `"Save Link"`, `"Choose File"`) with IDs.
- Keep `getByText` for user-generated values (`goal.title`, note body, file name, URL), validation messages, and copy assertions that intentionally prove visible text still renders.
- Prefer `getByRole` for accessibility-specific tests and controls already well-labeled.

### 4. Validation

Run focused tests first:

```sh
bun --filter native-rd test \
  src/screens/WelcomeScreen \
  src/screens/GoalsScreen \
  src/screens/FocusModeScreen \
  src/screens/NewGoalModal \
  src/screens/SettingsScreen \
  src/screens/CapturePhoto \
  src/screens/CaptureVideoScreen \
  src/screens/VoiceMemoScreen \
  src/screens/CaptureTextNote \
  src/screens/CaptureFile \
  src/screens/CaptureLinkScreen
```

Then run:

```sh
bun --filter native-rd test
bun --filter native-rd type-check
```

## Risks

- **Diff can balloon.** Keep this to first-test-path load-bearing controls. Do not chase every text assertion across badges/designer/components.
- **Bad IDs can become another unstable contract.** Base repeated IDs on persisted row IDs/type IDs, not labels or array index unless the list is inherently static.
- **Theme worktree overlap.** `ThemeChipGrid` is already dirty from another task. Read and preserve those changes if adding chip IDs there.
- **Accessibility regressions.** Do not replace role-based tests that are intentionally checking accessibility behavior.

## Acceptance Mapping

| Issue criterion                    | Plan                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------ |
| Load-bearing UI has stable testIDs | Add IDs to shared primitives, screen CTAs, cards, menus, and capture controls.                   |
| Brittle text assertions migrated   | Replace action/state-driving text queries; keep meaningful visible-copy and user-content checks. |
| All tests pass                     | Focused first-test-path suite, then full native-rd test and type-check.                          |

## Suggested Commit Shape

1. `test(native-rd): add stable selectors to i18n path components`
2. `test(native-rd): migrate first-test-path tests off brittle copy selectors`

If the diff gets large, split by surface instead: shared components, Welcome/Goals/NewGoal/Settings, Focus, capture flows.
