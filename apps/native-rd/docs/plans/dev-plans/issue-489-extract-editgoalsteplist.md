# Development Plan: Issue #489

## Issue Summary

**Title**: [Refactor] Extract EditGoalStepList — reusable step-editor row/list layer from EditGoalView
**Type**: refactor
**Complexity**: SMALL
**Estimated Lines**: ~150-250 lines moved (net new/changed lines much smaller — mostly cut-and-paste plus prop plumbing)

## Intent Verification

- [ ] `EditGoalStepList.tsx` exists and exports a component that renders the step rows, sub-step blocks, and add-step affordance, with all of the editing/drag/pendingDelete state that used to live in `EditGoalView` now local to it.
- [ ] `EditGoalView.test.tsx` passes with zero changes to its assertions/queries/testIDs — only import-path edits are permitted (and per D2 below, even those should be zero, since the types and `EditGoalView` component keep their current file/path).
- [ ] `EditGoalView.stories.tsx` renders identically in Storybook (same testIDs, same interaction behavior for drag/reorder, inline rename, evidence picker, and delete-confirm flows) with at most import-path edits.
- [ ] `EditGoalView` barrel (`index.ts`) exports `EditGoalStepList` and its props type alongside the existing exports, so issue #490 (New Goal build-step swap) can `import { EditGoalStepList } from ".../EditGoalView"` without reaching into a non-barrel path.
- [ ] No new props exist on `EditGoalStepList` beyond what `EditGoalView` already threads down today (no props added "for the wizard" — that's #490's job).
- [ ] `git diff` on `EditGoalView.tsx` shows only removals (state/handlers/JSX that moved out) plus the new composition calling `EditGoalStepList` — no rewritten logic, no behavior changes.

## Dependencies

| Issue | Title                                                                   | Status                     | Type                                                         |
| ----- | ----------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------ |
| #384  | Epic: redesigned step editor                                            | Open (epic, tracking only) | Context                                                      |
| #445  | EditGoalView (original row/drag implementation)                         | ✅ Merged                  | Context (prior art)                                          |
| #459  | Edit Goal sub-step reorder (`EditGoalSubStepList` extraction precedent) | ✅ Merged                  | Prior art                                                    |
| #460  | Edit Goal per-row delete (confirm-delete modal, `pendingDelete` state)  | ✅ Merged                  | Context                                                      |
| #490  | [Storybook] New Goal build step — swap in `EditGoalStepList`            | Open                       | Downstream consumer (blocked BY this issue, not the reverse) |

**Status**: ✅ All dependencies met. #489 has `dep:independent` — nothing blocks starting it. It is itself a blocker for #490, but that is a downstream direction and doesn't affect this plan.

## Objective

Cut the top-level step-row rendering, drag/reorder orchestration wiring, inline-rename state, evidence-picker state, and delete-confirm state out of `EditGoalView.tsx` into a new sibling component `EditGoalStepList.tsx`, so `EditGoalView` becomes a thin composition (header, goal-title card, optional description, `EditGoalStepList`, dates info banner, Done footer) and the row/list layer becomes independently reusable by the New Goal wizard (#490). Zero behavior change; only file organization changes.

## Decisions

| ID  | Decision                                                                                                                                                                                                                                                                                                                         | Alternatives Considered                                                                                                                        | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Everything driven by `editingId`/`editText`/`editingEvidenceId`/`pendingDelete`/`newStepTitle`/the `useEditGoalDrag` instance/`screenReaderActive`/`animationPref` moves into `EditGoalStepList`, including the evidence-picker `Modal` and the `ConfirmDeleteModal` (the "those two" the issue leaves to implementer judgment). | Leave the two modals in `EditGoalView` and thread picker/delete state back up via callbacks.                                                   | Modals are driven entirely by state that's moving anyway (`editingEvidenceId`, `pendingDelete`); lifting them back to `EditGoalView` would mean either duplicating that state in both files or adding new callback props "for the modals" — which contradicts "no new props for the wizard yet." Keeping them with their state is the seam with the smallest prop surface.                                                                                                  |
| D2  | All exported types (`EditGoalStep`, `EditGoalSubStep`, `EditGoalChipTone`, `EditGoalDateDepChip`, `EditGoalViewProps`) **stay defined in `EditGoalView.tsx`**; `EditGoalStepList.tsx` does `import type { ... } from "./EditGoalView"` — the same pattern `EditGoalStepRow.tsx` already uses today.                              | Move step/sub-step types into `EditGoalStepList.tsx` (arguably "belongs" there now) and have `EditGoalView.tsx` re-export or import them back. | `EditGoalView.test.tsx` and `EditGoalView.stories.tsx` import `EditGoalStep`/`EditGoalSubStep`/`EditGoalViewProps` from `../EditGoalView` / `./EditGoalView` today. Keeping the types where they are means those two files need **zero** import-path changes, not just "changes limited to import paths" — the strongest possible reading of the issue's zero-behavior-change bar. Type-only imports don't create a runtime circular-dependency risk between the two files. |
| D3  | `EditGoalStepList` does **not** get the "Steps" section label + count row folded in as a separate prop-free responsibility — it owns rendering `stepsSectionLabel` + `stepCountLabel(steps.length)` above the rows, matching where that JSX already sits immediately above the step-row loop.                                    | Leave the "Steps" header + count in `EditGoalView` and only move the row loop itself.                                                          | The header text is derived from `steps.length`, which is exactly the data `EditGoalStepList` now owns; splitting the label from the count it describes across two files/components adds a prop (`stepCount` or duplicate `steps`) for no behavior benefit. `EditGoalView` keeps the surrounding `stepsHeader`/`stepsLabel` _style_ only insofar as `EditGoalStepList` reuses the same shared `EditGoalView.styles.ts` object (D4).                                          |
| D4  | Keep a single shared `EditGoalView.styles.ts` for `EditGoalView`, `EditGoalStepRow`, `EditGoalSubStepList`, and the new `EditGoalStepList` — do not split into a per-component styles file.                                                                                                                                      | Split out `EditGoalStepList.styles.ts` per the issue's "possibly styles" hedge.                                                                | The three existing files in this directory already share one styles module with no reported friction; splitting adds a file and import-path churn for zero functional gain in a change explicitly scoped as cut-and-move. Revisit only if a future issue's diff shows the shared file becoming unwieldy.                                                                                                                                                                    |
| D5  | `useAnimationPref()` and the `screenReaderActive` `AccessibilityInfo` effect move into `EditGoalStepList` wholesale (not left in `EditGoalView` and passed down as props).                                                                                                                                                       | Keep the hook call in `EditGoalView` and pass `animationPref`/`showAccessibleControls` down as new props.                                      | Grep of `EditGoalView.tsx` confirms `animationPref` and `screenReaderActive` are read _only_ to compute `showAccessibleControls`, which is used _only_ inside the step-row/sub-step JSX that is moving. Nothing else in the file's returned tree depends on them, so there's no reason for `EditGoalView` to keep the subscription.                                                                                                                                         |

## Affected Areas

- `apps/native-rd/src/components/EditGoalView/EditGoalStepList.tsx` (new): step-row list, sub-step block rendering, add-step affordance, drag orchestration wiring (`useEditGoalDrag`), inline-rename state, evidence-picker state + `Modal`, delete-confirm state + `ConfirmDeleteModal`, screen-reader/animation-pref subscriptions.
- `apps/native-rd/src/components/EditGoalView/EditGoalView.tsx`: slimmed to header, optional description block, goal-title card, `EditGoalStepList`, dates info banner, Done footer. `EditGoalViewProps` unchanged (same external callback surface); internally most props now pass straight through to `EditGoalStepList`.
- `apps/native-rd/src/components/EditGoalView/index.ts`: add `export { EditGoalStepList } from "./EditGoalStepList";` and `export type { EditGoalStepListProps } from "./EditGoalStepList";`.
- `apps/native-rd/src/components/EditGoalView/EditGoalView.styles.ts`: unchanged (shared, D4) — verify no styles were scoped in a way that assumes single-file usage (none found; `styles.rowCard`, `styles.dropLine`, etc. are already imported cross-file by `EditGoalStepRow`/`EditGoalSubStepList`).
- `apps/native-rd/src/components/EditGoalView/__tests__/EditGoalView.test.tsx`: expected zero changes (D2) — re-run to confirm; do not edit unless the test run surfaces a real gap.
- `apps/native-rd/src/components/EditGoalView/EditGoalView.stories.tsx`: expected zero changes (D2) — re-run Storybook to confirm; do not edit unless it breaks.

## Implementation Plan

### Step 1: Extract `EditGoalStepList` and slim `EditGoalView`

**Files**: `apps/native-rd/src/components/EditGoalView/EditGoalStepList.tsx` (new), `apps/native-rd/src/components/EditGoalView/EditGoalView.tsx`
**Commit**: `refactor(edit-goal): extract EditGoalStepList from EditGoalView`
**Changes**:

- [ ] Create `EditGoalStepList.tsx` with `EditGoalStepListProps` covering: `steps`, `onReorderSteps`, `onReorderSubSteps`, `onAddStep`, `onStepTitleChange`, `onStepEvidenceChange`, `onAddSubStep`, `onSubStepTitleChange`, `onSubStepEvidenceChange`, `onDeleteSubStep`, `onDeleteStep`, `dragScrollController`, plus the copy props that only the list/rows use today: `stepsSectionLabel`, `addStepPlaceholder`, `evidencePickerTitle`, `evidenceTypesLabel`, `stepCountLabel`, `addSubStepLabel`, `breakIntoSubStepsLabel`, `newSubStepTitle`, `addStepButtonLabel`, `closeLabel`, `breakIntoSubStepsA11yLabel`, `addSubStepA11yLabel`, `announceReorder`, `deleteStepConfirmTitle`, `deleteStepConfirmMessage`, `deleteSubStepConfirmTitle`, `deleteSubStepConfirmMessage`.
- [ ] Move into `EditGoalStepList`: `newStepTitle`/`editingId`/`editText`/`editingEvidenceId`/`screenReaderActive`/`pendingDelete` state, the `useEditGoalDrag` call, the `useAnimationPref` call, the `screenReaderActive` effect, `handleAddStep`, `findSubStep`, `beginEdit`, `commitEditing`, `handleAddSubStep`, `handleToggleEvidence`, `renderSubStepBlock`, and the JSX block from `stepsHeader` through the evidence-picker `Modal` and `ConfirmDeleteModal` (per D1/D3).
- [ ] Import shared types (`EditGoalStep`, `EditGoalSubStep`, `EditGoalChipTone`) via `import type { ... } from "./EditGoalView"` (D2) — do not redefine them.
- [ ] Slim `EditGoalView.tsx`: remove the moved state/handlers/JSX; render `<EditGoalStepList {...forwarded props} />` in their place; keep `goalTitle`/`onGoalTitleChange`/`description`/`onDescriptionChange`/header/footer/`onOverflowPress`/`onBack`/`onDone` local.
- [ ] Update both files' top-of-file doc comments to describe the new split (mirror the existing "Drag orchestration lives in useEditGoalDrag; the row anatomy in EditGoalStepRow" convention already in `EditGoalView.tsx`'s header comment).
- [ ] Run `bun run test --testPathPatterns EditGoalView` and confirm `EditGoalView.test.tsx` passes with no edits.
- [ ] Load Storybook (`Iteration B/Goals/EditGoalView`) and manually verify: drag reorder, ↑/↓ fallback, inline rename, evidence picker toggle, sub-step add/reorder/delete, top-level step delete-confirm — all unchanged, across at least one light and one dark/high-contrast theme.

### Step 2: Barrel export + typecheck/lint pass

**Files**: `apps/native-rd/src/components/EditGoalView/index.ts`
**Commit**: `refactor(edit-goal): export EditGoalStepList from the barrel`
**Changes**:

- [ ] Add `EditGoalStepList` component + `EditGoalStepListProps` type exports to `index.ts`, following the existing ordering (component, then its props type, matching the `EditGoalStepRow`/`EditGoalOverflowMenu` pattern already there).
- [ ] `bun run type-check` and `bun run lint` clean.
- [ ] `bun run test --testPathPatterns EditGoalView` clean (repeat, post-barrel-change, to catch any import cycle typecheck-only issue).

## Testing Strategy

- [ ] No new test file for this issue — `EditGoalView.test.tsx` is the existing coverage for this exact behavior (D12, #459, #460 blocks) and must pass unmodified.
- [ ] `bun run test --testPathPatterns EditGoalView` (Jest 30, `@testing-library/react-native` v13) — full run, not just a subset, since the moved code paths (drag, rename, evidence, delete) are all exercised here.
- [ ] Manual Storybook pass on `Iteration B/Goals/EditGoalView` per Step 1's checklist, across themes (at minimum `light-default` and one high-contrast/dark variant) — this is the visual gate, not just green CI (project memory: green type-check/lint/tests ≠ right design).
- [ ] Confirm `EditGoalView.stories.tsx`'s standalone `EditGoalStepRow` story (line ~246) still renders — it imports `EditGoalStepRow` directly and is unaffected by this extraction, but is a cheap regression check since it shares `EditGoalView.styles.ts`.

## Not in Scope

| Item                                                                                       | Reason                                                               | Follow-up                                |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | ---------------------------------------- |
| Wiring `EditGoalStepList` into the New Goal wizard's build-step tier                       | That's the actual swap; this issue only makes the component reusable | #490                                     |
| New props for wizard-specific needs (e.g., a step-count cap, wizard-flavored copy)         | Explicitly "must not do" in the issue body                           | #490 (or a follow-up if #490 needs more) |
| Splitting `EditGoalView.styles.ts` into per-component files                                | No current pain point; would add churn without benefit (D4)          | none                                     |
| Any visual/interaction change to drag, rename, evidence picker, or delete-confirm behavior | Issue is a pure cut-and-move refactor                                | none                                     |

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->
