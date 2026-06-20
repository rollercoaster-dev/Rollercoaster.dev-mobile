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
- [ ] NewGoalModal exposes the same "Add sub-step" affordance (full create
      parity): a step created in the modal can have a sub-step added under it
      before the goal is saved; flat steps remain the default path.
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

| ID  | Decision                                                                                                  | Alternatives Considered                                   | Rationale                                                                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | JS grouping after flat query, not a GROUP BY CTE                                                          | Recursive CTE; dedicated grouped query                    | Spike confirms JS grouping is trivial at this depth; avoids Evolu CTE complexity                                                                                           |
| D2  | `stepsByGoalQuery` stays flat, grouping helper lives beside it                                            | Separate `groupedStepsByGoalQuery`                        | Consumers that don't need hierarchy (stepsForActiveGoalsQuery) are unaffected; backward compat                                                                             |
| D3  | Tie-break on `(ordinal ASC, createdAt ASC)` in query ORDER BY                                             | Fractional indexing; random tiebreak                      | Spike explicitly recommends `(ordinal, createdAt)`; createdAt is an Evolu system column, always present                                                                    |
| D4  | Sibling-scoped reorder via new `reorderSubSteps` function                                                 | Extend `reorderSteps` with a parent arg                   | Clean separation: `reorderSteps` stays for top-level, `reorderSubSteps` for children; call sites are obvious                                                               |
| D5  | "Add sub-step" inline ghost row below parent (shared StepList)                                            | Bottom sheet; long-press menu; ⋯ overflow                 | Q7 from the prototype: 1 tap below the friction threshold; ghost row is discoverable without pressuring structure                                                          |
| D6  | "Add sub-step" available only once a parent step exists                                                   | Available from the first/empty row                        | No step to parent onto until one exists; keeps the empty-state clean                                                                                                       |
| D7  | **Full create parity** — NewGoalModal gets the same affordance as EditModeScreen (user decision)          | Defer create path to a follow-up                          | User chose one device-testable PR satisfying #291 as written; the shared StepList component makes the create affordance cheap (built once)                                 |
| D8  | **Drag-to-reparent** — leaf promote/demote on drop; refuse only one-level-violating drops (user decision) | Sibling-only reorder with snap-back on any boundary cross | User wants the intuitive "just drag it" behaviour; the one-level cap forces refusing parent-with-children demotes and non-root targets, but leaf promote/demote is allowed |
| D9  | `updateStep` parentStepId field is **wired**, not just plumbed                                            | Leave it type-only                                        | D8 needs it: reparenting on drop calls `updateStep(id, { parentStepId })`                                                                                                  |
| D10 | `groupStepsByParent` returns the tree; separate `flattenGroupedSteps` produces render order               | One flat-output function                                  | Two named pure utilities, each unit-testable; resolves the tree-vs-flat naming mismatch (former Q6)                                                                        |
| D11 | Left rail = 2px (`borderWidth.thick`) in `theme.colors.border`                                            | Softer textMuted hairline                                 | Matches the neo-brutalist design language; distinction is visible without colour-only reliance (former Q4)                                                                 |

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

- [ ] Add `parentStepId: nullOr(StepId)` to the `step` table object in
      `Schema`, immediately after `goalId`. No other change.
- [ ] Confirm existing rows will read `null` for this column (Evolu additive
      guarantee — no migration needed; document in the inline comment).

### Step 2: Queries — grouping helper, tie-break, sub-step CRUD, sibling reorder

**Estimated LOC**: ~120 lines (queries.ts) + ~15 lines (index.ts re-exports)
**Running total**: ~143

**Files**: `src/db/queries.ts`, `src/db/index.ts`
**Commit**: `feat(db): grouping/flatten helpers, tie-break, createSubStep, reorderSubSteps, reparent`

**Changes**:

- [ ] Update `stepsByGoalQuery` to order by `ordinal ASC, createdAt ASC`
      (replacing the existing single `ordinal ASC` ordering). This is the
      tie-break from the spike.
- [ ] Add `groupStepsByParent` pure function (no Evolu calls) that takes the
      flat query result and returns `GroupedStep[]` where each top-level step
      carries a `children: GroupedStep[]` array. Depth is capped at one level —
      any row with a `parentStepId` that is itself not a root is treated as a
      root (guard for cycles and orphans from soft-deletes).
- [ ] Add `flattenGroupedSteps(grouped: GroupedStep[]): GroupedStep[]` pure
      function: returns render order — each root immediately followed by its
      children. This is what StepList consumes (D10).
- [ ] Add `createSubStep(goalId, parentStepId, title, ordinal?, plannedEvidenceTypes?)`:
      calls `evolu.insert("step", { ..., parentStepId })`. Follows the same
      validation pattern as `createStep`. `ordinal` defaults to
      `maxSiblingOrdinal + 1` when not supplied (caller is responsible for
      computing this from the grouped list).
- [ ] Add `reorderSubSteps(goalId, parentStepId, childStepIds)`: same
      implementation shape as `reorderSteps` but scoped to the supplied child
      IDs.
- [ ] Update `updateStep` to accept an optional `parentStepId?: StepId | null`
      field and **wire it** (D9) — used by drag-to-reparent (D8). Setting it to
      `null` promotes a child to top-level; setting it to a root step's id
      demotes a leaf under that step. The one-level guard lives in the caller
      (StepList drag handler), not here.
- [ ] Export `groupStepsByParent`, `flattenGroupedSteps`, `createSubStep`,
      `reorderSubSteps` from `src/db/index.ts`.

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

- [ ] `groupStepsByParent` — flat goal (all null parentStepId) returns all
      steps as roots with empty `children` arrays.
- [ ] `groupStepsByParent` — mixed goal: top-level step A has children B and
      C; B and C appear in A.children, not at root level.
- [ ] `groupStepsByParent` — ordinal tie-break: two children with the same
      ordinal are ordered by `createdAt` ascending (fabricate two rows
      differing only in a mock createdAt string; confirm the earlier one
      comes first). Since `groupStepsByParent` is a pure JS function
      operating on the already-ordered query result, this test mocks the
      input array in the expected post-query order to confirm the grouper
      preserves it.
- [ ] `groupStepsByParent` — orphan guard: a row whose `parentStepId` points
      to a nonexistent root is promoted to root level rather than silently
      dropped.
- [ ] `createSubStep` — throws on empty title (validation parity with
      `createStep`).
- [ ] `createSubStep` — succeeds with valid title and parentStepId.
- [ ] `reorderSubSteps` — reorders three sibling IDs without throwing.
- [ ] `reorderSubSteps` — empty child list does not throw.
- [ ] `flattenGroupedSteps` — a parent with two children flattens to
      `[parent, childA, childB]` render order; a flat goal round-trips unchanged.
- [ ] `updateStep` reparent — setting `parentStepId` to null and to a root id
      both call the Evolu update with the right payload (existing mock pattern).

### Step 4: StepList — parentStepId field, child indentation, "Add sub-step" affordance

**Estimated LOC**: ~155 lines (StepList.tsx) + ~35 lines (StepList.styles.ts)
**Running total**: ~428

**Files**:

- `src/components/StepList/StepList.tsx`
- `src/components/StepList/StepList.styles.ts`

**Commit**: `feat(ui): StepList child indentation and add-sub-step affordance`

**Changes**:

- [ ] Extend the `Step` interface with `parentStepId?: string | null`.
- [ ] Add `onCreateSubStep?: (parentStepId: string, title: string, plannedEvidenceTypes: EvidenceTypeValue[]) => void` to `StepListProps`.
- [ ] Accept a flat `steps` list (already grouped by the caller via
      `groupStepsByParent`) where children immediately follow their parent.
      StepList does **not** call groupStepsByParent internally — the caller
      (EditModeScreen) produces the ordered flat list.
- [ ] For rendering: if a step has `parentStepId != null`, render it as a
      child row: left rail (2px vertical bar in `theme.colors.border`, or a
      theme token equivalent), `paddingLeft: theme.space[6]` (or equivalent)
      for the indented content area.
- [ ] For top-level steps: if `parentStepId == null` and `onCreateSubStep`
      is defined, render a ghost "+ sub-step" row beneath the step row (only
      when `editingId !== step.id` — don't stack the ghost with the edit
      input). This affordance is absent on child rows (depth guard).
- [ ] Tapping the ghost row sets a `addingSubStepForId` local state; renders
      a TextInput inline (same style as the existing edit input); on submit
      calls `onCreateSubStep(step.id, trimmedTitle, newSubStepTypes)`.
- [ ] The new input has `accessibilityRole="none"` on the container,
      `accessibilityLabel={t("editGoal:stepList.addSubStepA11yLabel", { title: step.title })}` on the TextInput, and meets the 44×44pt minimum touch target on the "Add sub-step" ghost row.
- [ ] Drag-to-reparent (D8): on drop, classify the move from the drop position
      in the flat list: - Same sibling group → reorder via `onReorderSteps` / `onReorderSubSteps`. - Leaf dropped at top-level (no parent above it) → **promote**: call
      `onReparentStep(stepId, null)`. - Leaf dropped inside a root's child range → **demote**: call
      `onReparentStep(stepId, thatRootId)`. - **Refuse** (snap back, optional haptic, no callback) when the one-level
      cap would break: the moved step has its own children (can't demote a
      parent), or the drop target/context is itself a child (non-root target).
      Add `onReparentStep?: (stepId: string, newParentStepId: string | null) => void`
      to `StepListProps`. Keep the classification in a small pure helper
      (`classifyDrop`) so it is unit-testable without the gesture layer.
- [ ] Add styles: `childRow` (left rail + indented padding), `leftRail`
      (thin vertical border), `addSubStepGhost` (muted row, no shadow),
      `addSubStepText` (textMuted colour), `addSubStepInputRow`.

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

### Step 6: NewGoalModal — create-time sub-step affordance (D7 full parity)

**Estimated LOC**: ~45 lines
**Running total**: ~543

**Files**: `src/screens/NewGoalModal/NewGoalModal.tsx` (+ styles only if needed)
**Commit**: `feat(create): sub-step affordance in NewGoalModal draft flow`

**Changes**:

- [ ] NewGoalModal builds steps in local draft state before the goal is
      persisted. Extend the draft step shape with `parentStepId: string | null`
      and a client-side draft id so children can reference a not-yet-saved
      parent.
- [ ] Render the draft steps through the same shared StepList with
      `onCreateSubStep` wired to append a child draft under the given parent
      draft id (mirrors EditMode, but against draft state, not Evolu).
- [ ] On save, persist parents first (capturing their real `StepId`), then
      persist children with the resolved `parentStepId`. Keep ordinals
      sibling-scoped.
- [ ] No drag-to-reparent in the create modal — reorder/restructure is the
      EditMode job; create only needs add-sub-step. (Keeps the modal lean.)
- [ ] a11y labels reuse the same `editGoal:stepList.*` keys.

### Step 7: i18n strings

**Estimated LOC**: ~18 lines (3 files, ~6 keys each)
**Running total**: ~561

**Files**:

- `src/i18n/resources/en/editGoal.json`
- `src/i18n/resources/de/editGoal.json`
- `src/i18n/resources/pseudo/editGoal.json`

**Commit**: `feat(i18n): add sub-step affordance strings to editGoal namespace`

**New keys under `stepList`**:

```json
"addSubStepLabel": "Add sub-step",
"addSubStepA11yLabel": "Add sub-step under \"{{title}}\"",
"addSubStepA11yHint": "Type a sub-step title and press return to add",
"addSubStepInputA11yLabel": "New sub-step title for \"{{title}}\"",
"subStepDeleteA11yLabel": "Delete sub-step \"{{title}}\"",
"subStepEditA11yLabel": "Edit sub-step: {{title}}"
```

German keys: identical English copy as placeholder (tagged `[NEEDS_TRANSLATION]`
in the value string per existing convention, if that convention exists —
otherwise plain English until a translation pass).

Pseudo keys: `[` + English copy + `]` per the pseudoTransform pattern.

### Step 8: Tests — StepList, EditModeScreen, NewGoalModal

**Estimated LOC**: ~120 lines (three test files)
**Running total**: ~681

**Files**:

- `src/components/StepList/__tests__/StepList.test.tsx` (new)
- `src/screens/EditModeScreen/__tests__/EditModeScreen.test.tsx` (extend)
- `src/screens/NewGoalModal/__tests__/NewGoalModal.test.tsx` (extend)

**Commit**: `test(ui): StepList indentation + reparent classify + create/edit sub-step wiring`

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

**NewGoalModal tests (extend existing)**:

- [ ] Adding a sub-step in the create draft and saving persists the child
      with the resolved parent `StepId` (parents-first ordering).

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

- [ ] Unit tests: `groupStepsByParent` grouping + tie-break + orphan guard
      (Jest 30, pure function — no Evolu mock needed)
- [ ] Unit tests: `createSubStep`, `reorderSubSteps` validation (existing
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

| Item                                                              | Reason                                   | Follow-up    |
| ----------------------------------------------------------------- | ---------------------------------------- | ------------ |
| GoalCard reading surface (next pending leaf vs parent)            | Deferred by user scope decision          | #292         |
| FocusModeScreen + MiniTimeline sub-step rendering                 | Deferred by user scope decision          | #292         |
| TimelineJourneyScreen sub-step rendering                          | Deferred by user scope decision          | #293         |
| Exhaustive a11y contract pass (full 44pt + role audit)            | Deferred by user scope decision          | #294         |
| Duplicate-ordinal interleave permutation test matrix              | Deferred by user scope decision          | #294         |
| Full reorder permutation tests                                    | Deferred by user scope decision          | #294         |
| Progress counting rule (leaf-only vs every-unit vs parent-satis.) | Prototype record open question           | Post-Stage-6 |
| Cycle guard for concurrent parentStepId writes (CRDT edge)        | Single-device; spike flags for ADR       | Schema ADR   |
| Orphan promotion policy on parent soft-delete                     | Single-device; read-time policy          | Schema ADR   |
| Drag-to-reparent inside the create modal                          | Restructure is the EditMode job          | —            |
| German translation of new i18n keys                               | Placeholder copy sufficient for dev      | Translation  |
| `stepsForActiveGoalsQuery` extended for parentStepId              | Used only by GoalCard — deferred to #292 | #292         |

_No items deferred from the Must-Not-Do list: no auto-complete, no depth
beyond one level, no blocking/hiding of incomplete siblings, flat steps
remain first-class._

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->
