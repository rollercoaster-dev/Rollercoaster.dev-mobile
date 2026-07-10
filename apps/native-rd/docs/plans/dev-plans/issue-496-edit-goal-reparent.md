# Development Plan: Issue #496

## Issue Summary

**Title**: [Storybook] Edit Goal — preserve reparent, promote, and demote
**Type**: feature (Storybook-first)
**Complexity**: MEDIUM–LARGE
**Estimated Lines**: ~750 changed LOC (incl. stories/tests)
**Branch**: `feat/issue-496-edit-goal-reparent`

Part of **Epic #384 — Full Ride redesign**. Storybook prerequisite for #446 (the
[Integrate] issue that wires the redesigned editor to Evolu). The existing
`EditModeScreen` + `StepList` support full reparent (drag/dwell + accessible
"Nest under…" / "Un-nest"); the redesigned `EditGoalView` / `EditGoalStepList`
currently exposes sibling reorder only, using **one root `useEditGoalDrag`
instance plus one independent `useEditGoalDrag` per parent** (each scoped to its
own sibling group). That architecture cannot receive a child drag gesture at the
root level, so promote / move-between-parents by drag is impossible today.

Per Joe's product decision the redesign must **retain full functionality** —
promote, demote, and move-between-parents — with the same one-level hierarchy
guard and destination-ordinal rules. This issue is **Storybook + component-test
only**. No screen integration, no Evolu writes, no i18n resource additions
beyond forwarding optional copy props. The [Integrate] issue (#446) will thread
real `t()` + persistence through the contract this issue lands.

## Intent Verification

Observable criteria derived from the issue acceptance checklist. Verifiable by
running Storybook / Jest component tests.

- [ ] A child can be promoted to a root (`onReparentStep(id, null)` fires from
      the redesigned list, via drag-above-parent and via the Un-nest button).
- [ ] A leaf root can be nested under a valid root (`onReparentStep(id, target)`
      fires; ineligible targets are refused).
- [ ] A child can move between valid parents with correct sibling ordinals.
- [ ] A parent-with-children and any depth>1 operation is refused (no callback
      fires; snap-back; no Nest-under control renders).
- [ ] Equivalent non-gesture controls (Nest-under picker + Un-nest button) are
      available to screen-reader / reduced-motion users.
- [ ] A child row is wired to the shared hierarchy drag coordinator (component
      test proves a sub-step drag dispatches through the unified hook, not a
      parent-local hook).
- [ ] Component tests cover callback payloads and hierarchy guards.
- [ ] New Goal wizard can reuse the same step-editor contract — `onReparentStep`
      is a real `NewGoalWizardProps` member, forwarded to `EditGoalStepList`,
      and tested both enabled and omitted.

## Dependencies

| Issue | Title                                           | Status | Type    |
| ----- | ----------------------------------------------- | ------ | ------- |
| #445  | EditGoalView redesign host                      | ✅     | Context |
| #489  | Extract EditGoalStepList                        | ✅     | Context |
| #459  | Sub-step reorder in EditGoalStepList            | ✅     | Context |
| #460  | Step delete in EditGoalStepList                 | ✅     | Context |
| #490  | NewGoalWizard reuses EditGoalStepList           | ✅     | Context |
| #330  | StepList drag-reparent gesture (reference impl) | ✅     | Pattern |

`classifyDrop` (StepList) and `useEditGoalDrag` are already live and tested.
No blockers.

## Objective

Replace the per-parent independent drag-hook architecture with a **single
flattened hierarchy coordinator** (`useEditGoalHierarchyDrag`) that owns one flat
index space, one shared row-geometry registry (absolute coordinates), dwell-arm
state, and `classifyDrop` dispatch for reorder + reparent. Thread its handlers
and flat indices through `EditGoalStepList` → both `EditGoalStepRow` (root) and
`EditGoalSubStepList` → `EditGoalSubStepRow` (children). Add the reparent
contract prop (`onReparentStep`) to `EditGoalView`, `EditGoalStepList`, and
`NewGoalWizard` (forwarded). Add an accessible "Nest under…" picker + "Un-nest"
button to the redesigned rows. Add a small pure `applyReparent` helper for
stateful stories/tests and a nested-reparent unit test for append ordering. Add
component tests proving a child row is wired to the shared coordinator. No
`EditModeScreen`, no Evolu, no `StepList` changes, `classifyDrop` unchanged.

## Decisions

| ID  | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Alternatives Considered                            | Rationale                                                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Reuse `classifyDrop` **unchanged** as the drag-reparent decision layer                                                                                                                                                                                                                                                                                                                                                                                              | Reimplement a flatter classifier                   | It encodes the one-level cap, parent-with-children refusal, positional promote, dwell-demote — already unit-tested (13 cases); no duplication (review #6).                                                |
| R2  | **One unified coordinator hook** `useEditGoalHierarchyDrag` replaces both the root `useEditGoalDrag` and every per-parent instance. Always called.                                                                                                                                                                                                                                                                                                                  | Root-only reparent hook; conditional hook calls    | A root-only hook cannot receive child drag gestures (review #1). Conditional hooks violate the rules of hooks (review #2). One flat index space is required for cross-group promote/move-between-parents. |
| R3  | Row geometry is registered by **row id** into a single `Map<rowId, {absoluteY, height}>` measured via `onLayout` + `measureInWindow`, shared by all rows (root + sub-step).                                                                                                                                                                                                                                                                                         | Nested `onLayout` `y` values compared directly     | Nested `y` is relative to the parent card, not the list — comparing them across groups is invalid (review #1). Absolute geometry gives one coordinate space for `classifyDrop` hover math.                |
| R4  | The **root row header** (drag handle + title + chips) is the hit/geometry target; the **animated drag surface** still moves the whole parent+children group (the existing `children`-slot transform in `EditGoalStepRow`). The registered geometry covers the root header band only.                                                                                                                                                                                | Register the whole group height as the root target | The drag starts on the header; `classifyDrop` needs the header band to decide promote/demote/reorder. The group moves together visually but the classifier sees header bands (review #1).                 |
| R5  | `onReparentStep(stepId, newParentStepId \| null)` is the single reparent contract prop on `EditGoalView`, `EditGoalStepList`, and `NewGoalWizard`. Optional; when omitted the coordinator collapses to local sibling reorder only (handlers no-op on reparent results).                                                                                                                                                                                             | Separate promote/demote callbacks                  | Mirrors `StepList`/`EditModeScreen`; the [Integrate] issue already has a working `handleReparentStep`. Optional preserves the reorder-only wizard path (review #2).                                       |
| R6  | `EditGoalStep` and `EditGoalSubStep` shapes are **unchanged** — no `parentStepId` added. The adapter owns the flat `ClassifyStep[]` shape.                                                                                                                                                                                                                                                                                                                          | Add `parentStepId` to `EditGoalStep`               | Review #4: the adapter owns the flat shape; adding the field is redundant and pollutes the redesigned model.                                                                                              |
| R7  | `flattenEditGoalSteps()` flattens `EditGoalStep[]` → `ClassifyStep[]` (parent `{id, parentStepId: null}` then its `subSteps` `{id, parentStepId: parent.id}`) in render order. The coordinator maps flat indices ↔ row ids via the same order.                                                                                                                                                                                                                      | Make `classifyDrop` aware of the nested shape      | Keeps `classifyDrop` untouched and shared between both list implementations (R1).                                                                                                                         |
| R8  | Accessible controls: "Nest under…" picker of eligible roots + "Un-nest" button, gated on `showAccessibleControls`. ↑/↓ fallback stays **sibling-reorder only** — never reparent.                                                                                                                                                                                                                                                                                    | ↑/↓ implicitly promote/demote; drag-only           | Q1/Q2 from #330 stand: any eligible root reachable, no O(n²) buttons; predictable for SR/reduced-motion users (WCAG 3.2).                                                                                 |
| R9  | A pure `applyReparent(steps, stepId, newParentId)` helper removes the step from its source sibling group and appends it to the destination group (root group for promote, target parent's `subSteps` for demote). Used by stateful stories/tests. Production emits only the existing callback (R5).                                                                                                                                                                 | Stories mutate state ad hoc                        | Review #5: destination append ordering must be evidenced. Production persistence (ordinal normalization) is #446's job.                                                                                   |
| R10 | Copy props (nest-under trigger/picker title/a11y, un-nest a11y, reparent announce) are optional with English defaults — i18n-free per D9 of #445.                                                                                                                                                                                                                                                                                                                   | Hardcode `t()` calls                               | The redesigned editor is i18n-free; the [Integrate] issue passes `t()`-backed builders.                                                                                                                   |
| R11 | `NewGoalWizard` gains `onReparentStep?` on its props and forwards it to `EditGoalStepList`, plus the nest/un-nest copy props (forwarded). Tested both enabled and omitted.                                                                                                                                                                                                                                                                                          | Claim the wizard forwards it without code change   | Review #3: the wizard renders `EditGoalStepList` internally; the prop must be added explicitly.                                                                                                           |
| R12 | Dwell-arm `armedTargetId` + `DWELL_ARM_MS = 220` live in the unified coordinator (JS state + ref mirror), disarmed on hovered-row-id change, arming only on root headers that are valid `classifyDrop` dwell targets.                                                                                                                                                                                                                                               | Per-parent dwell state                             | One coordinator owns all drag state; matches #330/D14 with the shared row-id geometry registry from R3.                                                                                                   |
| R13 | **`canDrag` is derived from the flattened hierarchy + edit state + available actions**, not local sibling count. When reparent is enabled: a lone child is draggable (it can promote / move between parents), and a lone leaf root is draggable when ≥1 other valid root target exists. When reparent is omitted, the old simple sibling-count behavior is retained (`steps.length > 1` for roots, `subSteps.length > 1` within a parent).                          | Keep `canDrag = siblingCount > 1` always           | The per-parent hook made lone children undraggable, blocking promote/move-between-parents — a correctness gap once reparent is enabled (review: canDrag).                                                 |
| R14 | Row geometry is **screen-absolute** (`measureInWindow`). During edge auto-scroll the pointer is normalized by the current scroll delta (or rows are remeasured at drag-start) so the registry never goes stale. Drop-outline `top` values rendered inside the list are converted from absolute `y` to **list-local** coordinates via a measured list origin (`measureInWindow` on the list container); an absolute `y` is never rendered directly as a local `top`. | Render absolute y directly; trust onLayout y       | Screen-absolute geometry drifts under programmatic scroll; nested onLayout y is parent-relative. Both must be normalized to one list-local space for hover math and outline rendering (review: geometry). |
| R15 | Row refs call `measureInWindow` from `onLayout` **and** on drag-start refresh; `onLayout` alone reports parent-relative `y` and does not provide absolute coordinates. A `refreshGeometry(rowId)` is exposed so the coordinator can remeasure the dragged row (and, if needed, neighbors) when a drag begins.                                                                                                                                                       | onLayout-only measurement                          | Explicit: onLayout is relative + fires only on layout change; absolute coordinates require an imperative measure (review: geometry).                                                                      |

## Affected Areas

- `src/components/EditGoalView/EditGoalView.tsx` — add `onReparentStep` + copy
  props; forward to `EditGoalStepList`.
- `src/components/EditGoalView/EditGoalStepList.tsx` — replace the root +
  per-parent `useEditGoalDrag` calls with **one** `useEditGoalHierarchyDrag`;
  thread flat indices + shared handlers into both root rows and
  `EditGoalSubStepList`; compute `rootTargets` / `canNestUnder` / `canUnNest`;
  render dwell-arm + drop outlines.
- `src/components/EditGoalView/EditGoalSubStepList.tsx` — stop instantiating its
  own `useEditGoalDrag`; instead receive the coordinator's handlers + the
  sub-step's flat index + shared `registerRowLayout` and forward them to
  `EditGoalSubStepRow`.
- `src/components/EditGoalView/EditGoalStepRow.tsx` — accept `flatIndex`,
  `isArmedTarget`, `canNestUnder`, `nestTargets`, `onNestUnder`, `canUnNest`,
  `onUnNest`, shared `onDragStart/onDragMove/onDragEnd` + `registerRowLayout`
  (absolute geometry), + copy props. The root header is the registered hit
  target; the `children` slot still transforms with the card during drag.
- `src/components/EditGoalView/EditGoalSubStepRow.tsx` — accept `flatIndex`,
  shared drag handlers + `registerRowLayout`, `canUnNest` + `onUnNest` + copy
  props. No nest-under control (one-level cap).
- `src/components/EditGoalView/useEditGoalHierarchyDrag.ts` — **new** unified
  coordinator: flat index space, shared row-geometry registry keyed by row id
  (absolute `y`/`height`), dwell-arm, `classifyDrop` dispatch via
  `flattenEditGoalSteps`. Always called; reparent path no-ops when
  `onReparentStep` is omitted.
- `src/components/EditGoalView/flattenEditGoalSteps.ts` — **new** pure adapter
  (`EditGoalStep[]` → `ClassifyStep[]`).
- `src/components/EditGoalView/applyReparent.ts` — **new** pure nested reparent
  helper for stateful stories/tests.
- `src/components/EditGoalView/EditGoalView.styles.ts` — add `armedTargetItem`
  (sustained dashed `success` border, static, all motion settings) and
  nested/group drop-outline styles; picker Modal styles adapted to the mint rail.
- `src/components/NewGoalWizard/NewGoalWizard.tsx` — add `onReparentStep?` +
  nest/un-nest copy props to `NewGoalWizardProps`; forward to `EditGoalStepList`.
- `src/components/EditGoalView/EditGoalView.stories.tsx` — reparent stories using
  `applyReparent` for stateful local state.
- `src/components/NewGoalWizard/NewGoalWizard.stories.tsx` — add a
  `BuildStepReparent` story exercising the forwarded `onReparentStep`.
- `src/components/EditGoalView/__tests__/EditGoalView.test.tsx` — reparent
  contract + SR-control + child-wired-to-coordinator component tests.
- `src/components/EditGoalView/__tests__/flattenEditGoalSteps.test.ts` — **new**.
- `src/components/EditGoalView/__tests__/applyReparent.test.ts` — **new**
  promote/demote/move-between-parents append-ordering tests.
- `src/components/NewGoalWizard/__tests__/NewGoalWizard.test.tsx` — extend with
  `onReparentStep` forwarded (enabled + omitted).
- `src/components/EditGoalView/__tests__/geometryNormalize.test.ts` — **new**
  pure tests for absolute→local outline conversion and scroll-delta pointer
  normalization (R14).

**Not touched**: `EditModeScreen`, `StepList`, `classifyDrop.ts`, `db/queries.ts`,
i18n resources.

## Implementation Plan

### Step 1 — Pure helpers: `flattenEditGoalSteps` + `applyReparent`

**Files**: `flattenEditGoalSteps.ts` (new), `applyReparent.ts` (new),
`__tests__/flattenEditGoalSteps.test.ts` (new),
`__tests__/applyReparent.test.ts` (new).

**Commit**: `feat(editgoal): add flatten + applyReparent pure helpers`

- [ ] `flattenEditGoalSteps(steps: EditGoalStep[]): ClassifyStep[]` — each
      parent emits `{ id, parentStepId: null }` then its `subSteps[]` as
      `{ id, parentStepId: parent.id }`, in render order.
- [ ] `applyReparent(steps, stepId, newParentId): EditGoalStep[]` — removes the
      step (root or sub-step) from its source location and appends it to the
      destination: `newParentId === null` → append to the root array; otherwise
      append to that parent's `subSteps[]`. Returns a new array (immutable).
      Refuses (returns input unchanged) when the move would violate the one-
      level cap (a parent-with-children demoted) — mirroring `classifyDrop`'s
      guard, for story safety.
- [ ] `flattenEditGoalSteps` tests: flat list; one parent + 3 sub-steps; two
      parents each with children; empty; parent with `subSteps: []`.
- [ ] `applyReparent` tests (review #5): promote a child → appended to root
      array, source parent's `subSteps` loses it; demote a leaf root → appended
      to target parent's `subSteps`, root array loses it; move-between-parents
      → removed from source parent, appended to destination parent's
      `subSteps` at the end; refused parent-with-children demote → unchanged.

**~110 LOC.**

---

### Step 2 — `useEditGoalHierarchyDrag` unified coordinator

**Files**: `useEditGoalHierarchyDrag.ts` (new),
`__tests__/useEditGoalHierarchyDrag.test.ts` (new).

**Commit**: `feat(editgoal): unified hierarchy drag coordinator hook`

- [ ] **Always called** (review #2). Params: `steps: EditGoalStep[]`,
      `onReorderSteps`, `onReorderSubSteps`, `onReparentStep?`,
      `dragScrollController?`, `announceReorder`, reparent announce builders.
- [ ] Maintains the **flat index space** via `flattenEditGoalSteps`; exposes a
      `flatIndexForRowId(rowId)` and `rowIdForFlatIndex(i)` map so root and
      sub-step rows can register and receive handlers by flat index.
- [ ] **Shared row-geometry registry**: `Map<rowId, { absoluteY, height }>`.
      `registerRowLayout(rowId, layout)` is called by every row's `onLayout` +
      `measureInWindow` (review #1/R3). Hover math (`rowIndexAtY`) uses absolute
      `y` from this registry, so nested `onLayout` `y` values are never compared
      directly. **R15**: `onLayout` alone reports parent-relative `y`; rows must
      call `measureInWindow` (from `onLayout` and on drag-start refresh) to
      populate `absoluteY`. The coordinator exposes `refreshGeometry(rowId)` so
      drag-start remeasures the dragged row (and neighbors if needed) — the
      registry never goes stale.
- [ ] **R14 geometry normalization**: the list container measures its own
      screen-absolute origin (`measureInWindow` → `listOriginY`). Drop-outline
      `top` values are computed as `absoluteY - listOriginY` before rendering
      inside the list — an absolute `y` is never rendered directly as a local
      `top`. During edge auto-scroll, the pointer `absoluteY` used for hover
      math is normalized by the current scroll delta
      (`pointerListY = absoluteY + scrollDelta`) or rows are remeasured, so the
      screen-absolute registry stays correct while content scrolls.
- [ ] Root header geometry (R4): a root row registers the **header band**
      (`absoluteY`/`height` of the header, not the whole parent+children group).
      The animated drag surface (the `children` slot transform in
      `EditGoalStepRow`) still moves the whole group visually.
- [ ] Dwell-arm: `armedTargetId` state + ref, `DWELL_ARM_MS = 220`, disarmed on
      hovered-row-id change, armed only on root header bands that are valid
      `classifyDrop` dwell targets (leaf dragged, target is a root, not self).
- [ ] `handleDragEnd` calls `classifyDrop(flatSteps, draggedFlatIndex,
    hoverFlatIndex, armedTargetIdRef.current)` and dispatches: - `reorder` + `parentStepId === null` → `onReorderSteps(orderedIds)` - `reorder` + `parentStepId !== null` → `onReorderSubSteps(parent, ids)` - `reparent` → `onReparentStep?.(stepId, newParentStepId)` (no-op if
      omitted) - `none` → snap-back.
- [ ] **R13 `canDrag` derivation**: the coordinator exposes a
      `canDragRow(rowId)` (and the list derives `canDrag` per row) from the
      flattened hierarchy + `editingId` + available actions: - reparent **omitted**: a root is draggable when `rootCount > 1` and no
      row is being edited; a sub-step is draggable when its parent has
      `> 1` sub-step and no row is being edited (old sibling-count
      behavior). - reparent **enabled**: a root is draggable when (`rootCount > 1` **or**
      it is a leaf with ≥1 other valid root target) and no row is being
      edited; a sub-step is draggable when (its parent has `> 1` sub-step
      **or** reparent is enabled — a lone child can promote / move) and no
      row is being edited.
      A row being inline-edited disables drag for every row (existing
      invariant), so a lone child can promote only when not editing.
- [ ] `moveStep(flatIndex, direction)` stays **sibling-scoped** (R8): resolves
      the sibling group from the flat step's `parentStepId`, swaps within it,
      dispatches the right reorder callback; at a group boundary it is a no-op
      (never reparent).
- [ ] Exposes: `draggedRowId`, `isDragging`, `armedTargetId`, `dropOutline`
      (`{top,height,kind}` for insertion-line / nested-outline / group-outline,
      computed from the shared absolute geometry), `dragScrollCompensation`,
      `registerRowLayout`, `handleDragStart(rowId)`, `handleDragMove`,
      `handleDragEnd`, `moveStep(rowId, dir)`.
- [ ] Unit tests: sibling reorder (root + sub-step); promote (child → root via
      positional drop); demote via armed target; move-between-parents
      (positional demote into another group); refused parent-with-children;
      refused depth>1; refused armed-target-equals-dragged; reparent path is a
      no-op when `onReparentStep` is omitted (reorder still works). **Do not
      re-test `classifyDrop`'s own guards** (review #6) — only the dispatch
      wiring + the omitted-prop collapse.
- [ ] **R13 `canDrag` regression test**: with reparent enabled and a parent
      that has a **single** sub-step, that lone child is draggable and a
      promote (`onReparentStep(id, null)`) can be dispatched through the
      coordinator — guards against the old sibling-count gate blocking the
      single-child promotion path. Also: a lone leaf root with another valid
      root target is draggable when reparent is enabled; the same lone root is
      **not** draggable when reparent is omitted (old behavior).
- [ ] **R14 geometry normalization unit test**: given a registry of absolute
      `y`/`height` and a `listOriginY`, drop-outline `top` equals
      `absoluteY - listOriginY` (never the raw absolute `y`); and given a
      pointer `absoluteY` plus a scroll delta, the normalized list-local
      pointer is `absoluteY + scrollDelta`. Keep these as pure functions
      tested in `__tests__/geometryNormalize.test.ts`.

**~230 LOC.**

---

### Step 3 — Thread the coordinator through the list + rows

**Files**: `EditGoalStepList.tsx`, `EditGoalSubStepList.tsx`,
`EditGoalStepRow.tsx`, `EditGoalSubStepRow.tsx`, `EditGoalView.styles.ts`.

**Commit**: `feat(editgoal): thread unified hierarchy drag through rows`

- [ ] `EditGoalStepList`:
  - Add `onReparentStep?` + nest/un-nest copy props to `EditGoalStepListProps`.
  - Call `useEditGoalHierarchyDrag` **once** (replacing the root
    `useEditGoalDrag` call). Always called (review #2).
  - Stop passing a per-parent `useEditGoalDrag` to `EditGoalSubStepList`;
    instead pass the coordinator's shared `handleDragStart/Move/End`,
    `registerRowLayout`, `dragScrollCompensation`, `dropOutline`, and the
    sub-step's `flatIndex`, plus `armedTargetId`/`canUnNest`/`onUnNest`.
  - Compute `rootTargets` (all parent ids+titles), `canNestUnder` (leaf root
    with ≥1 other root), `canUnNest` (is a sub-step) per row.
  - Render `armedTargetItem` on the armed root header; render drop outlines from
    `dropOutline`.
- [ ] `EditGoalSubStepList`: remove its own `useEditGoalDrag` instantiation
      (review #1). Receive and forward the coordinator's handlers + `flatIndex` per
      sub-step + shared `registerRowLayout`. It becomes a thin mapping over
      `EditGoalSubStepRow`.
- [ ] `EditGoalStepRow`:
  - Accept `flatIndex`, shared `onDragStart/Move/End` (keyed by row id, not
    local index), `registerRowLayout` (absolute geometry for the header band),
    `isArmedTarget`, `canNestUnder`, `nestTargets`, `onNestUnder`, `canUnNest`,
    `onUnNest`, + copy props.
  - `onLayout` + `measureInWindow` register the **header band** into the shared
    registry (R4/R15): `onLayout` provides relative `y`/`height`; an imperative
    `measureInWindow` (called from `onLayout` and on drag-start refresh via the
    coordinator's `refreshGeometry`) provides the screen-absolute `y`. The
    `children` slot still transforms with the card during drag (whole group
    moves).
  - **R13**: `canDrag` is received from the list (derived from the flattened
    hierarchy + edit state + available actions), not computed from local
    sibling count. The row renders its drag gesture only when `canDrag` is true.
  - **R14**: drop-outline `top` values consumed by the list are list-local
    (absolute `y` minus the measured list origin); the row never renders an
    absolute `y` as a local `top`.
  - Accessible controls render inside `rowControls` when
    `showAccessibleControls`: "Nest under…" IconButton opens a `Modal` picker
    (reusing `DraggableStepItem`'s picker pattern, adapted to mint-rail tokens)
    listing eligible roots; "Un-nest" IconButton calls `onUnNest`.
- [ ] `EditGoalSubStepRow`: accept `flatIndex`, shared drag handlers +
      `registerRowLayout` (absolute geometry, R15: `measureInWindow` from
      `onLayout` + drag-start refresh), `canDrag` (R13: derived from the flattened
      hierarchy — a lone child is draggable when reparent is enabled), `canUnNest`
  - `onUnNest` + copy props. No nest-under control (one-level cap). Its
    `onLayout` + `measureInWindow` register its absolute band into the shared
    registry.
- [ ] Styles: `armedTargetItem` (dashed `success` border, static, all motion
      settings), `nestedDropOutline` / `groupDropOutline`, picker
      `overlay/container/card/row/rowText/title` adapted to the redesigned tokens.

**~220 LOC.**

---

### Step 4 — `EditGoalView` forwards the reparent contract

**Files**: `EditGoalView.tsx`.

**Commit**: `feat(editgoal): thread onReparentStep + nest/un-nest copy through host`

- [ ] Add `onReparentStep?` + nest/un-nest copy props to `EditGoalViewProps`.
- [ ] Forward to `EditGoalStepList` alongside the existing reorder/evidence
      props. No behavioural change in the host — it remains a thin composition;
      the nest picker `Modal` lives in `EditGoalStepRow`.

**~30 LOC.**

---

### Step 5 — `NewGoalWizard` forwards `onReparentStep`

**Files**: `NewGoalWizard.tsx`, `NewGoalWizard.stories.tsx`.

**Commit**: `feat(wizard): forward onReparentStep through NewGoalWizard`

- [ ] Add `onReparentStep?: (stepId: string, newParentStepId: string | null) => void`
      to `NewGoalWizardProps` (review #3) + the nest/un-nest copy props
      (forwarded, English defaults).
- [ ] Forward `onReparentStep` + copy to the internal `EditGoalStepList` on the
      build step.
- [ ] Add a `BuildStepReparent` story: stateful local steps using
      `applyReparent`, exercising nest/un-nest via the wizard's build screen.

**~40 LOC.**

---

### Step 6 — Stories

**Files**: `EditGoalView.stories.tsx`.

**Commit**: `test(storybook): reparent promote/demote/move-between-parents/invalid stories`

- [ ] `InteractiveEditGoal` gains a `reparent(stepId, newParent)` handler using
      `applyReparent` so the reviewer sees the real nesting change in local
      state (review #5).
- [ ] `ReparentInteraction` — long-press a leaf root, dwell on another root
      ~220ms → dashed arm → release to nest.
- [ ] `PromoteInteraction` — long-press a sub-step, drag above its parent group
      → promotes to a root.
- [ ] `MoveBetweenParents` — two parents each with sub-steps; drag a sub-step
      into the other parent's child block.
- [ ] `InvalidReparentTargets` — a parent-with-children (cannot be demoted) and
      a sub-step (cannot be demoted further); snap-back + no control.
- [ ] `AccessibleNestControls` — static anatomy with
      `showAccessibleControls` forced on: "Nest under…" trigger + picker open,
      "Un-nest" on a sub-step.

**~60 LOC.**

---

### Step 7 — Component + integration tests

**Files**: `__tests__/EditGoalView.test.tsx` (extend),
`__tests__/NewGoalWizard.test.tsx` (extend).

**Commit**: `test(editgoal): reparent contract, child-coordinator wiring, wizard forwarding`

- [ ] `EditGoalView.test.tsx`:
  - `onReparentStep` fires with `(id, null)` via the Un-nest button (deterministic
    SR path in Node; drag-path dispatch is covered by the hook's unit tests).
  - `onReparentStep` fires with `(id, targetId)` via the Nest-under picker.
  - A parent-with-children renders no "Nest under…" control; the hook refuses
    the drop (no callback).
  - A sub-step renders no "Nest under…" control (one-level cap) but renders
    "Un-nest".
  - `canNestUnder` is false when there is only one root.
  - Moving between parents dispatches `onReparentStep(id, newParentId)` and
    does **not** dispatch `onReorderSubSteps` for the source parent.
  - `↑/↓` on a child at its group boundary does not promote (no
    `onReparentStep`).
  - **Child-wired-to-coordinator integration test (review #6)**: render
    `EditGoalView` with two parents + sub-steps, spy on `onReparentStep`, drive
    a sub-step's drag handlers through the shared coordinator (via the row's
    `onDragStart`/`onDragMove`/`onDragEnd` props, gestures mocked as in the
    existing test file), and assert the reparent callback fires with the
    correct `newParentStepId` — proving the sub-step row is wired to the
    unified hierarchy coordinator, not a parent-local hook. Also assert a
    sibling sub-step reorder dispatches `onReorderSubSteps` through the same
    coordinator.
  - **R13 single-child promotion regression (component)**: render a parent with
    a single sub-step and `onReparentStep` enabled; assert the lone sub-step
    row is draggable (`canDrag` true) and that driving its drag to promote
    dispatches `onReparentStep(id, null)` — the component-level proof that the
    old sibling-count gate no longer blocks the single-child promote path.
  - `EditGoalView` forwards `onReparentStep` through to the list (prop-chain
    regression guard).
- [ ] `NewGoalWizard.test.tsx`:
  - `onReparentStep` is forwarded: render the build step, open the nest picker
    on a leaf root, select a target → `onReparentStep` fires (review #3).
  - Omitted `onReparentStep`: the build step still reorders (no reparent
    control rendered, reorder callbacks work).
- [ ] Do **not** duplicate `classifyDrop`'s existing guard tests (review #6).

**~80 LOC.**

---

## Testing Strategy

- [ ] Unit tests for `flattenEditGoalSteps` (Step 1).
- [ ] Unit tests for `applyReparent` append ordering (Step 1, review #5).
- [ ] Unit tests for `useEditGoalHierarchyDrag` dispatch wiring + omitted-prop
      collapse + R13 `canDrag` derivation / lone-child promote (Step 2). No
      `classifyDrop` guard duplication (review #6).
- [ ] Pure unit tests for geometry normalization (absolute→local outline
      conversion + scroll-delta pointer normalization) (Step 2, R14).
- [ ] Component tests for `EditGoalView` reparent contract + SR controls +
      child-wired-to-coordinator integration (Step 7, review #6).
- [ ] Component tests for `NewGoalWizard` forwarding (enabled + omitted)
      (Step 7, review #3).
- [ ] `reorderStepIds` (existing) and `classifyDrop` (existing, 13 cases) are
      reused unchanged — no new tests there.
- [ ] `bun run type-check` + `bun run lint` after each commit; component tests
      via `bash apps/native-rd/scripts/jest-node.sh` (Bun segfaults on RN
      component suites — tooling note from #330).
- [ ] Storybook manual QA: each new story across the 7 themes (toolbar
      switcher — `EditGoalView` re-renders post-mount, so no live per-cell
      matrix, per the existing `AllThemesMatrix` note).

## Not in Scope

| Item                                                            | Reason                                                                | Follow-up          |
| --------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------ |
| `EditModeScreen` / `StepList` integration                       | This is the Storybook redesign track                                  | #446 ([Integrate]) |
| Evolu persistence (`updateStep`/`reorderSubSteps` ordinal norm) | Persistence is the [Integrate] issue's job                            | #446               |
| i18n resource keys (en/de/pseudo)                               | Redesigned editor is i18n-free; copy via props                        | #446               |
| Position-implied insert on demote (land at drop slot)           | Append-to-end first, per #330/Q5                                      | Post-#446          |
| Auto-scroll of the Storybook stage                              | Short story lists don't scroll; `dragScrollController` stays optional | #446               |
| `classifyDrop` changes or re-tests of its guards                | Reused unchanged (R1, review #6)                                      | —                  |
| `EditModeScreen` reparent regression coverage                   | `StepList`/`EditModeScreen` unchanged; covered by #330's tests        | —                  |

## Open Questions

None — all decisions settled per the issue brief and the review:

- One unified flattened hierarchy coordinator with absolute row-id geometry
  (R2/R3/R4, review #1).
- Always-called hook; reorder-only collapse when `onReparentStep` omitted
  (R2/R5, review #2).
- `NewGoalWizardProps.onReparentStep` added + forwarded + tested both ways
  (R11, review #3).
- No `parentStepId` on `EditGoalStep`; the adapter owns the flat shape (R6,
  review #4).
- `applyReparent` pure helper evidences append ordering; production emits only
  the callback (R9, review #5).
- Component integration test proves a child row is wired to the shared
  coordinator; `classifyDrop` unchanged, no guard-test duplication (Step 7,
  review #6).
- LOC estimate revised to ~750 to cover the coordinator, threading, wizard
  prop, helper, and tests honestly (review #7).
