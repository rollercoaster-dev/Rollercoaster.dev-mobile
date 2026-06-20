# Development Plan: Issues #290 + #291 (Combined Vertical Slice)

## Issue Summary

**Titles**:

- #290 — A-data: additive parentStepId + sibling-ordinal semantics + queries
- #291 — A-authoring: sub-step affordance in NewGoalModal + EditModeScreen

**Type**: feature
**Complexity**: LARGE
**Estimated Lines**: ~700–780 production lines (see per-commit breakdown)

> **Scope note (user decision, 2026-06-20):** This PR knowingly exceeds the
> epic's "one PR per child ≤500 LOC" guidance. The user chose to ship the
> full A-authoring feature in a single device-testable PR: #290 data + #291
> authoring with **full create parity** (sub-step affordance in NewGoalModal
> _and_ EditModeScreen) and **drag-to-reparent** (promote/demote leaf steps
> via drag, bounded by the one-level depth cap). Reading surfaces (#292/#293)
> and the exhaustive a11y/test matrix (#294) remain deferred.

## Intent Verification

Observable criteria derived from both issues. Verifiable by running the app
or reading tests.

- [ ] A step row in EditModeScreen has an "Add sub-step" affordance that is
      absent on any row that already has a parent (no depth beyond one level).
- [ ] Tapping "Add sub-step" on a top-level step creates a new step with
      that step's id as `parentStepId` and appends it indented under its parent.
- [ ] Children are rendered as visually indented rows under a left-rail cue;
      top-level steps are rendered without indentation — the distinction is
      visible without relying on colour alone.
- [ ] Drag-reorder in EditModeScreen supports both reordering and reparenting,
      bounded by the one-level depth cap: - Reorder within a sibling group (children among children, roots among roots). - **Promote**: drag a leaf child out to top-level → `parentStepId` cleared. - **Demote**: drag a top-level _leaf_ under another top-level step →
      `parentStepId` set to that step. - **Refused drops** (one-level guard): demoting a step that itself has
      children (would create grandchildren); dropping under a non-root step.
      Refused drops snap back with no data change.
- [ ] "Add sub-step" control is absent on a step that already has a parent
      (`parentStepId !== null`).
- [ ] A flat step (no children) and a top-level step with no sub-step added
      remain first-class — no standing nag toward structure.
- [ ] Create parity holds via EditMode: a newly created goal (which routes
      NewGoalModal → BadgeDesigner → EditMode) exposes the same "Add sub-step"
      affordance on its steps; flat steps remain the default path. (Revised
      2026-06-20 — NewGoalModal itself is title-only, see Discovery Log.)
- [ ] `stepsByGoalQuery` returns all steps for a goal in parent→children
      order: top-level steps ordered by `ordinal`, each immediately followed
      by its children ordered by `ordinal` (JS grouping after a single query).
- [ ] Tie-break on `(ordinal ASC, createdAt ASC)` is applied in
      `stepsByGoalQuery` so duplicate ordinals from concurrent writes produce
      a deterministic display order.
- [ ] Type-check and lint pass with zero new errors.
- [ ] New tests cover: grouping logic, tie-break, sibling reorder scoping,
      no-depth-beyond-one guard, "Add sub-step" affordance visibility, child
      row indentation rendered.

## Dependencies

| Issue | Title                                      | Status  | Type         |
| ----- | ------------------------------------------ | ------- | ------------ |
| #290  | A-data: additive parentStepId + queries    | In-plan | Sequential   |
| #289  | Prototype record (approved grammar/layout) | Merged  | Reference    |
| #288  | Epic: Step model (Must-Not-Do list)        | Open    | Epic context |

**Status**: No external blockers. #290 and #291 are combined here. #290 data
layer must be committed before #291 UI work, but both land in one PR.

## Objective

Ship the full A-authoring feature in one device-testable PR. Data layer first
(schema column + queries + data-layer tests), then authoring UI: indented
child rows, "Add sub-step" affordance in **both** NewGoalModal and
EditModeScreen (full create parity, D7), and **drag-to-reparent** (promote/
demote leaf steps, bounded by the one-level cap, D8). Reading surfaces
(GoalCard, FocusModeScreen, TimelineJourneyScreen) and the exhaustive a11y
contract pass remain deferred to #292, #293, and #294.

## Decisions

| ID  | Decision                                                                                                                                      | Alternatives Considered                                   | Rationale                                                                                                                                                                                                                                                                                                                                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | JS grouping after flat query, not a GROUP BY CTE                                                                                              | Recursive CTE; dedicated grouped query                    | Spike confirms JS grouping is trivial at this depth; avoids Evolu CTE complexity                                                                                                                                                                                                                                                                     |
| D2  | `stepsByGoalQuery` stays flat, grouping helper lives beside it                                                                                | Separate `groupedStepsByGoalQuery`                        | Consumers that don't need hierarchy (stepsForActiveGoalsQuery) are unaffected; backward compat                                                                                                                                                                                                                                                       |
| D3  | Tie-break on `(ordinal ASC, createdAt ASC)` in query ORDER BY                                                                                 | Fractional indexing; random tiebreak                      | Spike explicitly recommends `(ordinal, createdAt)`; createdAt is an Evolu system column, always present                                                                                                                                                                                                                                              |
| D4  | Sibling-scoped reorder via new `reorderSubSteps` function                                                                                     | Extend `reorderSteps` with a parent arg                   | Clean separation: `reorderSteps` stays for top-level, `reorderSubSteps` for children; call sites are obvious                                                                                                                                                                                                                                         |
| D5  | "Add sub-step" inline ghost row below parent (shared StepList)                                                                                | Bottom sheet; long-press menu; ⋯ overflow                 | Q7 from the prototype: 1 tap below the friction threshold; ghost row is discoverable without pressuring structure                                                                                                                                                                                                                                    |
| D6  | "Add sub-step" available only once a parent step exists                                                                                       | Available from the first/empty row                        | No step to parent onto until one exists; keeps the empty-state clean                                                                                                                                                                                                                                                                                 |
| D7  | **Create parity via EditMode** — affordance lives in the shared StepList, which the create flow reaches through EditMode (revised 2026-06-20) | Build a draft-step UI inside NewGoalModal                 | **Discovery (2026-06-20):** NewGoalModal is title-only and `createGoal()`s immediately, then routes through BadgeDesigner → `replace("EditMode")`. New goals are authored in EditMode, so the sub-step affordance (Steps 4–5) gives create parity for free. Original D7 (wire NewGoalModal) was built on a false premise; user chose to drop Step 6. |
| D8  | **Drag-to-reparent** — leaf promote/demote on drop; refuse only one-level-violating drops (user decision)                                     | Sibling-only reorder with snap-back on any boundary cross | User wants the intuitive "just drag it" behaviour; the one-level cap forces refusing parent-with-children demotes and non-root targets, but leaf promote/demote is allowed                                                                                                                                                                           |
| D9  | `updateStep` parentStepId field is **wired**, not just plumbed                                                                                | Leave it type-only                                        | D8 needs it: reparenting on drop calls `updateStep(id, { parentStepId })`                                                                                                                                                                                                                                                                            |
| D10 | `groupStepsByParent` returns the tree; separate `flattenGroupedSteps` produces render order                                                   | One flat-output function                                  | Two named pure utilities, each unit-testable; resolves the tree-vs-flat naming mismatch (former Q6)                                                                                                                                                                                                                                                  |
| D11 | Left rail = 2px (`borderWidth.thick`) in `theme.colors.border`                                                                                | Softer textMuted hairline                                 | Matches the neo-brutalist design language; distinction is visible without colour-only reliance (former Q4)                                                                                                                                                                                                                                           |

## Affected Areas

- `apps/native-rd/src/db/schema.ts`: add `parentStepId: nullOr(StepId)` to
  the `step` table definition.
- `apps/native-rd/src/db/queries.ts`: add `groupStepsByParent` (tree) and
  `flattenGroupedSteps` (render order) helpers; extend `stepsByGoalQuery` to
  ORDER BY `(ordinal ASC, createdAt ASC)`; add `createSubStep`,
  `reorderSubSteps`, and a `reparentStep` path on `updateStep`
  (`parentStepId` now wired, not type-only); export from `index.ts`.
- `apps/native-rd/src/db/index.ts`: export new symbols.
- `apps/native-rd/src/db/__tests__/queries.step.test.ts`: extend with
  grouping, tie-break, and reorder-scoping tests.
- `apps/native-rd/src/components/StepList/StepList.tsx`: accept a
  `parentStepId` field on the `Step` interface; render indented child rows
  under a left rail; expose `onCreateSubStep` callback; suppress "Add
  sub-step" on steps that already have a parent.
- `apps/native-rd/src/components/StepList/StepList.styles.ts`: add styles
  for `childRow`, `leftRail`, and `addSubStepRow`.
- `apps/native-rd/src/components/StepList/__tests__/` (new file):
  core-path tests for indentation rendering and "Add sub-step" guard.
- `apps/native-rd/src/screens/EditModeScreen/EditModeScreen.tsx`: wire
  `handleCreateSubStep` and `handleReorderSubSteps` to the updated StepList;
  pass `parentStepId` through to the flat step shape; call
  `groupStepsByParent` to produce the ordered list.
- `apps/native-rd/src/screens/EditModeScreen/__tests__/EditModeScreen.test.tsx`:
  extend with "Add sub-step" tap test, indentation presence test, and a
  reparent (promote/demote) drag test.
- `apps/native-rd/src/screens/NewGoalModal/NewGoalModal.tsx`: wire the shared
  StepList affordance into the create flow — `onCreateSubStep` builds the
  pending sub-step in local draft state before the goal is persisted.
- `apps/native-rd/src/screens/NewGoalModal/NewGoalModal.styles.ts`: only if
  new layout is needed beyond what StepList provides.
- `apps/native-rd/src/screens/NewGoalModal/__tests__/NewGoalModal.test.tsx`:
  extend with a create-time sub-step test.
- `apps/native-rd/src/i18n/resources/en/editGoal.json`: new keys for "Add
  sub-step" affordance and a11y labels.
- `apps/native-rd/src/i18n/resources/de/editGoal.json`: mirror keys
  (placeholder copy identical to en until a translation pass).
- `apps/native-rd/src/i18n/resources/pseudo/editGoal.json`: mirror keys
  (bracketed pseudo copy).

NewGoalModal: **changed** under this plan (D7 full create parity) — wires the
shared StepList sub-step affordance into the create draft flow.

## Implementation Plan

### Step 1: Schema — additive `parentStepId` column

**Estimated LOC**: ~8 lines (schema.ts diff)
**Running total**: ~8

**Files**: `src/db/schema.ts`
**Commit**: `feat(db): add nullable parentStepId to step schema`

**Changes**:

- [x] Add `parentStepId: nullOr(StepId)` to the `step` table object in
      `Schema`, immediately after `goalId`. No other change.
- [x] Confirm existing rows will read `null` for this column (Evolu additive
      guarantee — no migration needed; document in the inline comment).

### Step 2: Queries — grouping helper, tie-break, sub-step CRUD, sibling reorder

**Estimated LOC**: ~120 lines (queries.ts) + ~15 lines (index.ts re-exports)
**Running total**: ~143

**Files**: `src/db/queries.ts`, `src/db/index.ts`
**Commit**: `feat(db): grouping/flatten helpers, tie-break, createSubStep, reorderSubSteps, reparent`

**Changes**:

- [x] Update `stepsByGoalQuery` to order by `ordinal ASC, createdAt ASC`
      (replacing the existing single `ordinal ASC` ordering). This is the
      tie-break from the spike.
- [x] Add `groupStepsByParent` pure function (no Evolu calls) that takes the
      flat query result and returns `GroupedStep[]` where each top-level step
      carries a `children: GroupedStep[]` array. Depth is capped at one level —
      any row with a `parentStepId` that is itself not a root is treated as a
      root (guard for cycles and orphans from soft-deletes).
- [x] Add `flattenGroupedSteps(grouped: GroupedStep[]): GroupedStep[]` pure
      function: returns render order — each root immediately followed by its
      children. This is what StepList consumes (D10).
- [x] Add `createSubStep(goalId, parentStepId, title, ordinal?, plannedEvidenceTypes?)`:
      calls `evolu.insert("step", { ..., parentStepId })`. Follows the same
      validation pattern as `createStep`. `ordinal` defaults to
      `maxSiblingOrdinal + 1` when not supplied (caller is responsible for
      computing this from the grouped list).
- [x] Add `reorderSubSteps(goalId, parentStepId, childStepIds)`: same
      implementation shape as `reorderSteps` but scoped to the supplied child
      IDs. _(Implemented via shared private `applyStepOrdinals` helper that
      `reorderSteps` now also uses — avoids ~40 lines of duplication; behaviour
      of `reorderSteps` unchanged.)_
- [x] Update `updateStep` to accept an optional `parentStepId?: StepId | null`
      field and **wire it** (D9) — used by drag-to-reparent (D8). Setting it to
      `null` promotes a child to top-level; setting it to a root step's id
      demotes a leaf under that step. The one-level guard lives in the caller
      (StepList drag handler), not here.
- [x] Export `groupStepsByParent`, `flattenGroupedSteps`, `createSubStep`,
      `reorderSubSteps` from `src/db/index.ts`. _(Also exported the
      `GroupedStep` type.)_

**Type shapes to add (in queries.ts, above the Step CRUD section)**:

```ts
export interface GroupedStep {
  // all columns from the step table row
  id: StepId;
  goalId: GoalId;
  parentStepId: StepId | null;
  title: string | null;
  ordinal: number | null;
  status: string | null;
  completedAt: string | null;
  plannedEvidenceTypes: string | null;
  children: GroupedStep[]; // always empty for child rows (depth = 1)
}
```

### Step 3: Data-layer tests

**Estimated LOC**: ~95 lines
**Running total**: ~238

**Files**: `src/db/__tests__/queries.step.test.ts`
**Commit**: `test(db): grouping, flatten, tie-break, reorderSubSteps, reparent`

**Changes**:

- [x] `groupStepsByParent` — flat goal (all null parentStepId) returns all
      steps as roots with empty `children` arrays.
- [x] `groupStepsByParent` — mixed goal: top-level step A has children B and
      C; B and C appear in A.children, not at root level.
- [x] `groupStepsByParent` — ordinal tie-break: two children with the same
      ordinal are ordered by `createdAt` ascending (fabricate two rows
      differing only in a mock createdAt string; confirm the earlier one
      comes first). Since `groupStepsByParent` is a pure JS function
      operating on the already-ordered query result, this test mocks the
      input array in the expected post-query order to confirm the grouper
      preserves it.
- [x] `groupStepsByParent` — orphan guard: a row whose `parentStepId` points
      to a nonexistent root is promoted to root level rather than silently
      dropped.
- [x] `groupStepsByParent` — depth guard: a child-of-a-child (parent is itself
      a non-root) is promoted to root, never nested two deep. _(Added beyond
      plan — directly exercises the one-level cap.)_
- [x] `createSubStep` — throws on empty title (validation parity with
      `createStep`).
- [x] `createSubStep` — succeeds with valid title and parentStepId.
- [x] `reorderSubSteps` — reorders three sibling IDs without throwing.
- [x] `reorderSubSteps` — empty child list does not throw.
- [x] `flattenGroupedSteps` — a parent with two children flattens to
      `[parent, childA, childB]` render order; a flat goal round-trips unchanged.
- [x] `updateStep` reparent — setting `parentStepId` to null and to a root id
      both call the Evolu update with the right payload (existing mock pattern).

### Step 4: StepList — parentStepId field, child indentation, "Add sub-step" affordance

**Estimated LOC**: ~155 lines (StepList.tsx) + ~35 lines (StepList.styles.ts)
**Running total**: ~428

**Files**:

- `src/components/StepList/StepList.tsx`
- `src/components/StepList/StepList.styles.ts`

**Commit**: `feat(ui): StepList child indentation and add-sub-step affordance`
(`553ffaa7`). i18n strings (Step 7) were pulled forward to land first
(`0221ef9d`) — the keys are type-checked, so the UI commit can't compile
without them. See Discovery Log [2026-06-20 04:xx].

**Changes**:

- [x] Extend the `Step` interface with `parentStepId?: string | null`.
- [x] Add `onCreateSubStep?: (parentStepId: string, title: string, plannedEvidenceTypes: EvidenceTypeValue[]) => void` to `StepListProps`.
- [x] Accept a flat `steps` list (already grouped by the caller via
      `groupStepsByParent`) where children immediately follow their parent.
      StepList does **not** call groupStepsByParent internally — the caller
      (EditModeScreen) produces the ordered flat list. _(Documented in the
      `Step.parentStepId` doc-comment.)_
- [x] For rendering: if a step has `parentStepId != null`, render it as a
      child row: left rail (`theme.borderWidth.thick` vertical bar in
      `theme.colors.border`), `paddingLeft: theme.space[4]` on the wrapper
      for the indented content area. _(Used `space[4]`=16 not `space[6]`=24 —
      the card already has its own horizontal padding; 16 reads as one clear
      indent level without over-pushing.)_
- [x] For top-level steps: if `parentStepId == null` and `onCreateSubStep`
      is defined, render a ghost "+ sub-step" row beneath the step row (only
      when `editingId !== step.id` — don't stack the ghost with the edit
      input). This affordance is absent on child rows (depth guard).
- [x] Tapping the ghost row sets a `addingSubStepForId` local state; renders
      a TextInput inline (same style as the existing edit input); on submit
      calls `onCreateSubStep(step.id, trimmedTitle, subStepTypes)`. _(Inline
      input also shows an EvidenceTypePicker for create-time type parity with
      the new-step row; defaults to `[text]`.)_
- [x] The "Add sub-step" ghost and inline input carry
      `accessibilityLabel={t("editGoal:stepList.addSubStepA11yLabel", { title })}`
      / `addSubStepInputA11yLabel`, an `addSubStepA11yHint`, and the ghost row
      meets the 44pt minimum touch target (`minHeight: 44`). Both carry
      stable `testID`s (`step-list-add-sub-step-<id>`,
      `step-list-sub-step-input-<id>`) for Step 8 tests.
- [ ] **DEFERRED — drag-to-reparent (D8).** Blocked on a UX decision, not
      built in this commit. The existing drag gesture tracks **vertical
      translation only** (`translationY` → `hoverIndex`); with that single
      signal a drop position cannot distinguish "reorder a leaf root after the
      preceding root" from "demote that leaf under the preceding root" — both
      map to the same index. See Discovery Log [2026-06-20] and the new open
      question; `classifyDrop` + `onReparentStep` + gesture wiring wait on the
      chosen disambiguation (x-offset indent signal vs. explicit promote/demote
      buttons vs. fast-follow). Pairs naturally with Step 5 wiring.
- [x] Add styles: `childRowWrapper` (indent), `leftRail` (thick vertical bar),
      `childRowContent`, `addSubStepGhost` (muted dashed row, no shadow),
      `addSubStepText` (textMuted), `addSubStepInputRow`, `addSubStepInputCard`,
      `addSubStepInput`, `addSubStepPickerRow`.

### Step 5: EditModeScreen — wire sub-step handlers, pass grouped flat list

**Estimated LOC**: ~70 lines
**Running total**: ~498

**Files**: `src/screens/EditModeScreen/EditModeScreen.tsx`
**Commit**: `feat(edit): wire createSubStep, reorderSubSteps, reparent in EditModeScreen`

**Changes**:

- [ ] Import `groupStepsByParent`, `createSubStep`, `reorderSubSteps` from
      `../../db`.
- [ ] After `stepRows = useQuery(stepsByGoalQuery(...))`, compute
      `const flatGrouped = flattenGroupedSteps(groupStepsByParent(stepRows))`
      (parents first, each immediately followed by children) for passing to
      StepList.
- [ ] Map `flatGrouped` to the `Step[]` shape StepList expects, including the
      new `parentStepId` field.
- [ ] Add `handleCreateSubStep(parentStepId, title, plannedEvidenceTypes)`:
      compute `maxChildOrdinal` among existing children of that parent from
      `flatGrouped`; call `createSubStep(goalId, parentStepId, title, maxChildOrdinal + 1, plannedEvidenceTypes)`.
- [ ] Add `handleReorderSubSteps(parentStepId, childStepIds)`: calls
      `reorderSubSteps(goalId as GoalId, parentStepId as StepId, childStepIds as StepId[])`.
- [ ] Pass `onCreateSubStep={handleCreateSubStep}` to StepList.
- [ ] Add `handleReparentStep(stepId, newParentStepId)`: calls
      `updateStep(stepId as StepId, { parentStepId: newParentStepId as StepId | null })`,
      then recomputes sibling ordinals in the destination group (append to end).
      Pass as `onReparentStep` to StepList.
- [ ] `onReorderSteps` stays wired to top-level reorder; sub-step reorder uses
      `handleReorderSubSteps`. StepList's `classifyDrop` decides which fires.

### Step 6: ~~NewGoalModal — create-time sub-step affordance~~ — DROPPED (2026-06-20)

**Status**: DROPPED. See Discovery Log + revised D7. `NewGoalModal` is a
title-only modal that persists the goal immediately and routes through
BadgeDesigner → `replace("EditMode")`. Step authoring (and therefore the
sub-step affordance from Steps 4–5) happens in EditMode for both new and
existing goals, so create parity holds with no NewGoalModal change.
**Running total after drop**: ~498 (Step 5).

### Step 7: i18n strings — DONE (pulled forward ahead of Step 4)

**Status**: DONE, committed `0221ef9d` **before** the Step 4 UI commit. The
i18n keys are type-checked (typed resources), so the StepList UI in Step 4
can't compile until they exist — they had to land first. See Discovery Log.

**Estimated LOC**: ~18 lines (3 files, ~6 keys each)
**Running total**: ~561

**Files**:

- `src/i18n/resources/en/editGoal.json`
- `src/i18n/resources/de/editGoal.json`
- `src/i18n/resources/pseudo/editGoal.json`

**Commit**: `feat(i18n): add sub-step affordance strings to editGoal namespace`

**New keys under `stepList`** (all six added):

```json
"addSubStepLabel": "Add sub-step",
"addSubStepA11yLabel": "Add sub-step under \"{{title}}\"",
"addSubStepA11yHint": "Type a sub-step title and press return to add",
"addSubStepInputA11yLabel": "New sub-step title for \"{{title}}\"",
"subStepDeleteA11yLabel": "Delete sub-step \"{{title}}\"",
"subStepEditA11yLabel": "Edit sub-step: {{title}}"
```

- [x] German keys: real German translations ("Unterschritt …") to match the
      existing fully-translated `de/editGoal.json` (no `[NEEDS_TRANSLATION]`
      convention in this repo).
- [x] Pseudo keys: generated via `bun run gen:pseudo` (not hand-written).
      Reverted unrelated drift the generator surfaced in
      `pseudo/completion.json`.

### Step 8: Tests — StepList, EditModeScreen, NewGoalModal

**Estimated LOC**: ~120 lines (three test files)
**Running total**: ~681

**Files**:

- `src/components/StepList/__tests__/StepList.test.tsx` (new)
- `src/screens/EditModeScreen/__tests__/EditModeScreen.test.tsx` (extend)

(NewGoalModal test dropped with Step 6 — see Discovery Log.)

**Commit**: `test(ui): StepList indentation + reparent classify + edit sub-step wiring`

**StepList tests (new file)**:

- [ ] Top-level step renders "Add sub-step" ghost row when `onCreateSubStep`
      is provided.
- [ ] Child step (parentStepId set) does NOT render "Add sub-step" ghost row
      (depth guard).
- [ ] Tapping the "Add sub-step" ghost row on a parent shows the inline
      input.
- [ ] Typing in the inline input and submitting calls `onCreateSubStep` with
      the correct `parentStepId`.
- [ ] Child row has a left rail element in the rendered tree (test-id or
      a11y label).
- [ ] `classifyDrop` pure helper: leaf-to-top-level → promote; leaf-into-root
      → demote; parent-with-children demote → refused; non-root target →
      refused. (Table-driven `test.each`.)

**EditModeScreen tests (extend existing)**:

- [ ] When stepRows include a child step (parentStepId set), the screen
      renders the child indented beneath its parent.
- [ ] `createSubStep` is called when the "Add sub-step" flow is completed.
- [ ] A promote drop calls `updateStep` with `parentStepId: null`.

**NewGoalModal tests**: dropped with Step 6 (see Discovery Log).

### Step 9: LOC recount and check-in gate

This step has no code. This PR is **knowingly over** the usual ≤500 cap (user
decision — see Scope note). Expected: ~560 production lines + ~120 test lines.
Before opening the PR, run `git diff --stat`. If production files exceed
**~650** lines, stop and check in with the user rather than trimming silently
— the in-scope features (create parity D7, drag-to-reparent D8) are all
user-requested, so the lever is splitting the PR, not dropping scope. Candidate
split if needed: land #290 data + EditMode authoring first, NewGoalModal create
parity + drag-to-reparent as a fast-follow.

## Testing Strategy

- [x] Unit tests: `groupStepsByParent` grouping + tie-break + orphan guard
      (Jest 30, pure function — no Evolu mock needed)
- [x] Unit tests: `createSubStep`, `reorderSubSteps` validation (existing
      Evolu mock pattern from `queries.step.test.ts`)
- [ ] Component tests: StepList indentation + affordance guard
      (`@testing-library/react-native` v13)
- [ ] Component tests: EditModeScreen wiring (extend existing test)
- [ ] Test file paths mirror `src/` under `src/__tests__/` for db tests;
      component tests stay adjacent to the component (`__tests__` sibling)
- [ ] Manual: create a goal in NewGoalModal, add a sub-step under a step
      in the modal itself (create parity), save, verify it persisted indented
- [ ] Manual: in EditModeScreen add a sub-step, verify indented rendering,
      drag to reorder among siblings, confirm the parent is not moved
- [ ] Manual: drag a child out to top-level (promote) and a top-level leaf
      under another step (demote); confirm a parent-with-children refuses to
      demote (snaps back)
- [ ] Manual: confirm a sub-step's "Add sub-step" affordance is absent
      (no depth beyond one level)
- [ ] Manual: confirm a flat step next to a parent-with-children still shows
      as first-class (same visual weight)

## Not in Scope

| Item                                                              | Reason                                                                                                                  | Follow-up    |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------ |
| GoalCard reading surface (next pending leaf vs parent)            | Deferred by user scope decision                                                                                         | #292         |
| FocusModeScreen + MiniTimeline sub-step rendering                 | Deferred by user scope decision                                                                                         | #292         |
| TimelineJourneyScreen sub-step rendering                          | Deferred by user scope decision                                                                                         | #293         |
| Exhaustive a11y contract pass (full 44pt + role audit)            | Deferred by user scope decision                                                                                         | #294         |
| Duplicate-ordinal interleave permutation test matrix              | Deferred by user scope decision                                                                                         | #294         |
| Full reorder permutation tests                                    | Deferred by user scope decision                                                                                         | #294         |
| Progress counting rule (leaf-only vs every-unit vs parent-satis.) | Prototype record open question                                                                                          | Post-Stage-6 |
| Cycle guard for concurrent parentStepId writes (CRDT edge)        | Single-device; spike flags for ADR                                                                                      | Schema ADR   |
| Orphan promotion policy on parent soft-delete                     | Single-device; read-time policy                                                                                         | Schema ADR   |
| Drag-to-reparent inside the create modal                          | Restructure is the EditMode job                                                                                         | —            |
| Sub-step affordance wired into NewGoalModal itself                | NewGoalModal is title-only; create flow routes through EditMode which already has the affordance (Discovery 2026-06-20) | —            |
| German translation of new i18n keys                               | Placeholder copy sufficient for dev                                                                                     | Translation  |
| `stepsForActiveGoalsQuery` extended for parentStepId              | Used only by GoalCard — deferred to #292                                                                                | #292         |

_No items deferred from the Must-Not-Do list: no auto-complete, no depth
beyond one level, no blocking/hiding of incomplete siblings, flat steps
remain first-class._

## Discovery Log

- [2026-06-20 02:27] **Step 6 dropped (D7 premise was wrong).** The plan
  assumed `NewGoalModal` builds steps in local draft state, so a sub-step
  affordance could be wired in "before the goal is saved." It does not:
  `NewGoalModal` is a title-only modal that calls `createGoal()` immediately
  and navigates to `BadgeDesigner`, which then `navigation.replace`s to
  `EditMode`. `StepList` is used in exactly one place (EditModeScreen). Steps
  and sub-steps are authored in EditMode for **both** new and existing goals,
  so "full create parity" (D7's intent) is delivered for free by Steps 4–5 —
  there is nothing to build in NewGoalModal. User decision (2026-06-20): drop
  Step 6 and its NewGoalModal create-sub-step test; parity holds via the
  EditMode authoring surface. See updated D7 and Not-in-Scope.

- [2026-06-20 02:35] **Step 2 done.** `reorderSubSteps` and `reorderSteps`
  now share a private `applyStepOrdinals(context, stepIds)` helper rather than
  duplicating the ~40-line ordinal-update loop (D4 still holds — two public
  functions, obvious call sites). `reorderSteps` behaviour unchanged; existing
  tests cover it. Also exported the `GroupedStep` type from `db/index.ts`.
  Commits: `a95380d7` (Step 1 schema), `6fe20ef4` (Step 2 queries).

- [2026-06-20 03:10] **Step 3 done** (commit `368c6f7`). 10 new tests across
  `groupStepsByParent`, `flattenGroupedSteps`, `createSubStep`,
  `reorderSubSteps`, and `updateStep` reparent; suite now 50/50 green.
  Two gotchas worth recording for the remaining steps:
  - **`bun test` segfaults** on this suite (Bun v1.3.13 native runner crashes
    with a SIGSEGV). Use `npx jest --no-coverage <pattern>` — the project is
    Jest-based; the CLAUDE.md `bun test --testPathPatterns` shorthand is not
    usable here. Applies to all test steps (4, 8).
  - **Mock vs. real type mismatch.** The Evolu mock (`setup.ts`) returns the
    raw insert/update payload, but TypeScript sees Evolu's real `Result<…>`
    return type. Asserting on the payload requires `as unknown as { … }`
    (double cast) — a plain `as` fails type-check (TS2352, no overlap).
  - Added one test beyond the plan: a **depth guard** case proving a
    child-of-a-child is promoted to root (exercises the one-level cap, which
    the original orphan-guard test only touched indirectly).

- [2026-06-20 04:30] **Step 7 (i18n) pulled forward ahead of Step 4.** The
  plan ordered i18n last, but the i18n resources are type-checked (typed
  resource keys). Referencing `addSubStepLabel`/`addSubStepA11yLabel`/etc. from
  StepList before the keys exist fails `tsc` (TS2345). So the keys had to land
  first — committed `0221ef9d` (i18n), then `553ffaa7` (UI). German got real
  translations (no `[NEEDS_TRANSLATION]` convention exists here); pseudo was
  generated with `bun run gen:pseudo`, and an unrelated drift the generator
  surfaced in `pseudo/completion.json` was reverted to keep the commit focused.

- [2026-06-20 04:30] **Step 4 split: drag-to-reparent (D8) DEFERRED — blocked
  on a UX decision.** Shipped the unambiguous, high-value half of Step 4
  (parentStepId field, child indentation + left rail, "Add sub-step" ghost row
  - inline input + a11y + styles). Did **not** wire drag-to-reparent. Reason:
    the existing StepList drag gesture (`DraggableStepItem` → `handleDragMove`)
    tracks **`translationY` only** — it converts vertical offset to a single
    `hoverIndex`. With one positional signal, a drop cannot be classified
    unambiguously: dropping a leaf root just below another root is **identical**
    to demoting it under that root (same target index). Default-to-reorder breaks
    the primary demote case ("nest B under a still-childless A"); default-to-demote
    breaks leaf-root reordering. Y-only drag genuinely can't express reparent
    intent. D8 assumed it could — that premise is wrong. **Open question for the
    user (see below).** `classifyDrop` + `onReparentStep` + gesture wiring wait on
    the chosen disambiguation. All 22 existing StepList tests still pass; the
    shipped half is backward-compatible (new props are optional).

  **Resolution options (recommend A):**
  - **A — horizontal-offset indent signal.** Thread `translationX` through the
    pan gesture; past a threshold right = demote intent, left = promote intent,
    else reorder. Standard outliner-style reparent gesture; keeps the approved
    grammar, adds one mechanic. ~1 small PR-worth on top of Step 5.
  - **B — explicit promote/demote buttons.** Add ⇤/⇥ controls beside the
    existing ↑/↓ reorder buttons (already shown for screen-reader / reduced-
    motion users). Unambiguous, fully accessible, no gesture change — but two
    affordances for movement.
  - **C — descope drag-reparent to a fast-follow.** Ship #290/#291 with
    add-sub-step authoring + sibling reorder only; reparenting becomes its own
    issue. Smallest now, but loses D8's "just drag it" intent.
