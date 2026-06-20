# Development Plan: Issue #292

## Issue Summary

**Title**: A-reading: goal-card next-step resolution + FocusMode/MiniTimeline
**Type**: feature
**Complexity**: MEDIUM
**Estimated Lines**: ~300–380 lines (production) + ~120 lines (tests)

## Intent Verification

Observable criteria derived from the issue. These describe what success looks
like from a user/system perspective.

- [x] When an active goal has sub-steps, the GoalCard "next step" line resolves
      to the title of the next pending **leaf** (a step whose `parentStepId` is
      non-null), not the parent step that contains it.
- [x] When the next pending item is a leaf, the GoalCard shows a quiet context
      line — "↳ in [parent title]" — below the leaf hero line, using a muted
      style distinct from the hero text.
- [x] When an active goal has only flat top-level steps (no sub-steps), the
      GoalCard behaviour is unchanged: the next pending step title is the hero,
      no context line appears.
- [x] FocusModeScreen's snap-to-first-pending on mount resolves to the first
      pending leaf (not a parent whose children are all pending).
- [x] In FocusModeScreen, the MiniTimeline strip renders each parent's children
      as **smaller nodes inline on the same track**, joined to the parent by short
      connector segments and grouped under a bottom-border "shelf" — the
      `grp-indent` treatment the prototype's `indent` layout actually renders (the
      record's Q3 "indented sub-spine"). Children are NOT offset onto a second row.
- [x] Completing the last child of a parent step leaves the parent's status
      unchanged (`pending`) — no auto-state transition fires. The parent remains
      visually distinct ("pending") on the MiniTimeline even when all its
      children are completed. (No completion logic touched; the parent's connector
      reflects only its own `status`, so it stays dashed in the invite state.)
- [x] **Invite state**: when the next pending top-level step is a parent whose
      children are all completed (but the parent is still `pending`), the GoalCard
      leads with the **parent** title as hero and a quiet `all {N} substeps done`
      context line (the prototype's `nextInfo` → `kind:'invite'` path). This is a
      readout only — it never changes the parent's state.
- [x] The "one next step per active goal" promise holds: a GoalCard always
      resolves to exactly one next action line — a pending leaf, a flat step, or
      (in the invite state) the parent whose completion is the manual next action —
      or no next-step line if there are no pending steps.
- [x] The progress count `N/M` on the GoalCard is **every-unit** (parents +
      children, i.e. all step rows) — decided 2026-06-20, matching the prototype's
      `progress()`. Applied consistently to both the label and the ProgressBar.
- [x] Type-check, lint, and tests pass clean. (179 suites / 8923 tests green.)

## Resolved Decisions (the issue's "resolve before build")

Settled against the prototype (`apps/native-rd/prototypes/a-substructure-layouts.html`,
`indent` layout) on 2026-06-20 — the prototype is the source of truth for these.

| #   | Question                                                                                                   | Resolution                                                                                                                                                                                                                              | Source                                     |
| --- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| R1  | **`N/M` progress count rule** (the issue's blocking open decision)                                         | **Every-unit** — count all step rows (parents + children). At `tomas-done` this reads `4/6`. This is the prototype's `progress()` behavior and the only rule where the parent's manual completion (the invite action) advances the bar. | Joe, 2026-06-20                            |
| R2  | MiniTimeline child rendering                                                                               | `grp-indent`: smaller child nodes **inline** on the same track, short connector segments, group wrapped in a bottom-border shelf. NOT a vertical offset or a second sub-track row.                                                      | Prototype `miniTimeline()` `indent` branch |
| R3  | `↳ in [parent]` context line on the FocusMode StepCard                                                     | **Included** (not GoalCard-only). The prototype's `renderFocus()` `indent`+leaf branch renders it under the step title.                                                                                                                 | Prototype `renderFocus()`                  |
| R4  | Goal-card behavior when all of a parent's children are done but the parent is still pending (invite state) | Card leads with the **parent** as hero + `all {N} substeps done` context. Readout only, no state change.                                                                                                                                | Prototype `nextInfo()` → `kind:'invite'`   |
| R5  | `t()` access inside `buildGoalCardGoal` (plain function)                                                   | Implementer's call (pass `t` as a param — the plan's default). Not a product decision.                                                                                                                                                  | —                                          |

## Dependencies

| Issue | Title                                           | Status       | Type         |
| ----- | ----------------------------------------------- | ------------ | ------------ |
| #290  | A-data: additive parentStepId + sibling-ordinal | Met (merged) | Hard blocker |
| #289  | Prototype record: approved indentation layout   | Met (merged) | Reference    |
| #288  | Epic: sub-steps (A: substructure)               | Open         | Epic context |

**Status**: All dependencies met. Commit 6367fe5 landed `parentStepId` on the
`step` schema, `groupStepsByParent`, `flattenGroupedSteps`, `createSubStep`,
`reorderSubSteps` in `queries.ts`, and the indented StepList rendering (commit
68a3f14 closed #289's layout record). This issue is unblocked.

## Objective

Wire the sub-step data model into the three reading surfaces:

1. **GoalCard** — resolve to the next pending leaf as hero, parent as quiet
   context ("↳ in [parent]"). Update `stepsForActiveGoalsQuery` to include
   `parentStepId` and the helper in `buildGoalCardGoal` to walk the leaf
   resolution.

2. **FocusModeScreen snap-to-first-pending** — update `findFirstPendingIndex`
   (or its call site) to skip parent steps that have children and resolve to
   the first pending leaf instead.

3. **MiniTimeline** — extend the `MiniTimelineStep` shape with an optional
   `isChild` flag and render indented child nodes for sub-steps in the
   indented sub-spine layout (Q3).

4. **StepCard in FocusModeScreen** — surface the "↳ in [parent]" context
   line on a leaf step card so the user knows which parent the leaf belongs
   to (mirrors the GoalCard treatment on the focus surface).

No data writes. No authoring UI. No completion-toggle behaviour changes.

## Decisions

Architectural and implementation choices made during research.

| ID  | Decision                                                                                                                                                                                                                                                                                                | Alternatives Considered                                                                                          | Rationale                                                                                                                                                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | `stepsForActiveGoalsQuery` adds `step.parentStepId` to its `select` clause                                                                                                                                                                                                                              | New dedicated query; re-use `stepsByGoalQuery` (N+1 per card)                                                    | The query already has the join to `goal`; adding one column avoids a second query subscription on the goals screen. `stepsForActiveGoalsQuery` is consumed only by GoalsScreen → `buildGoalCardGoal`, so the blast radius is narrow.                                                                        |
| D2  | Leaf resolution lives in `buildGoalCardGoal` (GoalsScreen), not in GoalCard or GoalCardGoal interface                                                                                                                                                                                                   | Push logic into GoalCard; compute in a new hook                                                                  | GoalsScreen already builds the `GoalCardGoal` shape from raw rows; keeping business logic at the build site keeps GoalCard a pure display component. GoalCardGoal interface can carry the resolved `nextStepContext` string (or null).                                                                      |
| D3  | GoalCard's interface adds `nextStepContext: string \| null` (the "↳ in [parent]" string, pre-composed by the caller)                                                                                                                                                                                    | GoalCard computes it from a `nextStepParentTitle` prop; GoalCard accesses sub-step data directly                 | Keeps GoalCard purely presentational. The caller (GoalsScreen) already owns the step rows and the leaf walk, so composing the context string there costs nothing extra.                                                                                                                                     |
| D4  | `findFirstPendingIndex` (in `queries.ts`) stays as-is; the FocusModeScreen call site wraps it with a leaf-resolution helper that operates on the same flat `stepRows`                                                                                                                                   | Modify `findFirstPendingIndex` to accept a tree; two different functions                                         | `findFirstPendingIndex` is a pure, tested utility; its single-column contract (`status`) is correct for flat goals and for child rows (which also have a `status`). The leaf-resolution pass runs before the call to pick the right index.                                                                  |
| D5  | MiniTimeline adds `isChild?: boolean` to `MiniTimelineStep` and renders child nodes **inline on the same track** — smaller node + short connector segment, the parent+children wrapped in a group with a bottom-border "shelf" (the prototype's `grp-indent`, R2). NOT a vertical offset or second row. | Vertical `marginTop` offset; separate sub-track row; `MiniTimelineChildNode` component; encode depth as a number | The prototype's `indent` layout renders `grp-indent` inline, not offset (R2 corrects the earlier offset idea). One-level cap is a hard constraint (schema.ts comment); `boolean` is the minimal shape. `isChild` drives a style + wrapper branch inside the existing node family — no new component needed. |
| D6  | FocusModeScreen passes `isChild` per step through the `stepsWithEvidence` pipeline via `stepRows` (which is `stepsByGoalQuery` — already `selectAll`, so `parentStepId` is present)                                                                                                                     | Separate `parentStepId` query; re-query inside MiniTimeline                                                      | `stepsByGoalQuery` uses `selectAll`, so `parentStepId` is already in `stepRows`. Computing `isChild = row.parentStepId !== null` is a one-liner in the existing `uiSteps` memo.                                                                                                                             |
| D7  | StepCard in FocusModeScreen receives an optional `parentTitle: string \| null` prop and renders a "↳ in [parent]" context line when non-null                                                                                                                                                            | Context line only on GoalCard; read-only label injected from FocusModeScreen                                     | Q2 says leaf-led on the goal card — the same principle applies to the focus step card. The parent title is available in `stepsWithEvidence` once we have the flat `stepRows` with `parentStepId`.                                                                                                           |
| D8  | Progress count is **every-unit** (R1): `stepsTotal` = all step rows, `stepsCompleted` = completed rows. Since the query now returns parents + children in one flat array, this is just counting every row — i.e. the **existing `steps.length` / completed-count behavior needs no change**.            | Leaf-only filter; parent-satisfied collapse; caller-controlled `progressMode` prop                               | Decided 2026-06-20 (R1). Every-unit is what the prototype renders and the only rule where the parent's manual completion advances the bar. No filtering logic to add — children arriving in the array make `steps.length` naturally every-unit.                                                             |

## Affected Areas

- `apps/native-rd/src/db/queries.ts`: extend `stepsForActiveGoalsQuery` to select `step.parentStepId`.
- `apps/native-rd/src/screens/GoalsScreen/GoalsScreen.tsx`: update `buildGoalCardGoal` to walk the leaf and compose `nextStepContext`; update `stepsByGoalId` map if `parentStepId` join changes the row shape.
- `apps/native-rd/src/components/GoalCard/GoalCard.tsx`: add `nextStepContext: string | null` field to `GoalCardGoal`; render "↳ in [parent]" line when non-null.
- `apps/native-rd/src/components/GoalCard/GoalCard.styles.ts`: add `nextStepContext` style (muted, smaller, capped to one line).
- `apps/native-rd/src/components/GoalCard/__tests__/GoalCard.test.tsx`: extend with context-line rendering and leaf-hero tests.
- `apps/native-rd/src/screens/GoalsScreen/__tests__/GoalsScreen.test.tsx`: extend with sub-step goal card resolution test.
- `apps/native-rd/src/components/MiniTimeline/MiniTimeline.tsx`: add `isChild?: boolean` to `MiniTimelineStep`; render child nodes indented (smaller node, visually subordinate).
- `apps/native-rd/src/components/MiniTimeline/MiniTimeline.styles.ts`: add `nodeChild` and `nodeChildCurrent` styles.
- `apps/native-rd/src/components/MiniTimeline/__tests__/MiniTimeline.test.tsx`: extend with `isChild` node rendering tests.
- `apps/native-rd/src/screens/FocusModeScreen/FocusModeScreen.tsx`: (a) compute `isChild` per step in `uiSteps` memo; (b) pass `isChild` through to `MiniTimelineStep`; (c) update snap-to-first-pending to resolve to the first pending leaf; (d) pass `parentTitle` to `StepCard` for leaf context line.
- `apps/native-rd/src/components/StepCard/StepCard.tsx`: add optional `parentTitle: string | null` prop; render "↳ in [parent]" context line when non-null.
- `apps/native-rd/src/components/StepCard/StepCard.styles.ts`: add `parentContext` style (muted, subordinate).
- `apps/native-rd/src/components/StepCard/__tests__/StepCard.test.tsx`: extend with parent-context rendering test.
- `apps/native-rd/src/screens/FocusModeScreen/__tests__/FocusModeScreen.test.tsx`: extend with leaf-snap and child-node rendering tests.
- `apps/native-rd/src/i18n/resources/en/goals.json`: add context line string (e.g., `"nextStepContext": "↳ in {{parent}}"`).
- `apps/native-rd/src/i18n/resources/de/goals.json`: German translation for context line.
- `apps/native-rd/src/i18n/resources/pseudo/goals.json`: pseudo translation.

## Implementation Plan

### Step 1: Extend `stepsForActiveGoalsQuery` to include `parentStepId`

**Files**: `apps/native-rd/src/db/queries.ts`
**Commit**: `feat(db): add parentStepId to stepsForActiveGoalsQuery for leaf resolution`
**Estimated LOC**: ~5 lines

**Changes**:

- [x] In `stepsForActiveGoalsQuery`, change the `.select(["step.id", "step.goalId", "step.title", "step.status"])` to add `"step.parentStepId"`.
- [x] Confirm the query's type (`typeof stepsForActiveGoalsQuery.Row`) now surfaces `parentStepId` as nullable — no other consumer of this query is affected (only GoalsScreen uses it).
- [x] Note: `stepsForActiveGoalsQuery` orders by `(step.goalId, step.ordinal)`. **Added `step.createdAt` tie-break** — child `ordinal` is sibling-scoped (0-based per parent) so it can collide with a top-level step's ordinal in the flat array; hierarchy is reconstructed by bucketing on `parentStepId` (not flat order), and the `createdAt` tie-break makes sibling order deterministic, matching `stepsByGoalQuery`.

### Step 2: GoalCard — leaf hero + parent context line

**Files**:

- `apps/native-rd/src/components/GoalCard/GoalCard.tsx`
- `apps/native-rd/src/components/GoalCard/GoalCard.styles.ts`
- `apps/native-rd/src/i18n/resources/en/goals.json`
- `apps/native-rd/src/i18n/resources/de/goals.json`
- `apps/native-rd/src/i18n/resources/pseudo/goals.json`

**Commit**: `feat(goal-card): leaf-led next-step with parent context line`
**Estimated LOC**: ~40 lines production + ~20 lines i18n

**Changes**:

- [x] Add `nextStepContext: string | null` to the `GoalCardGoal` interface. This is the pre-composed context string: `"↳ in [parent]"` for a leaf, `"all N substeps done"` in the invite state (R4), or null for a flat top-level step. GoalCard stays purely presentational — it renders `nextStep` (hero) + `nextStepContext` (quiet line) regardless of which case produced them, so **no structural GoalCard change is needed for the invite state**; the caller picks hero + context.
- [x] In the render: below the existing `nextStep` text (the hero), render `nextStepContext` when non-null, using a muted, slightly smaller text style with `testID="goal-card-next-step-context"`.
- [x] Add i18n key `goals:card.nextStepContext` with value `"↳ in {{parent}}"` (English). The caller composes via `t("goals:card.nextStepContext", { parent: parentTitle })` in GoalsScreen.
- [x] Add i18n key `goals:card.allSubstepsDone` with value `"all {{count}} substeps done"` (English) for the invite state (R4). Use i18next plural form (`allSubstepsDone_one` / `_other`) if the count can be 1.
- [x] German: provide real German for both keys (the `↳` glyph is visual; the words are locale-dependent). Pseudo: generate via `bun run gen:pseudo`.
- [x] Pseudo: generate via `bun run gen:pseudo`.
- [x] Add `nextStepContext` style: `theme.textStyles.caption` (or equivalent small body), `color: theme.colors.textMuted`, `marginTop: theme.space[1]`, `numberOfLines={1}`.
- [x] `accessibilityLabel` for the card: when `nextStepContext` is set, the existing `labelWithNextStep` key already includes `nextStep` (the leaf title). No new a11y key needed — the context line is visually subordinate and the leaf title is the semantically important piece already in the label. Confirm this is sufficient (if the context line needs to be announced separately, add a key in a follow-up).

### Step 3: GoalsScreen — leaf resolution in `buildGoalCardGoal`

**Files**:

- `apps/native-rd/src/screens/GoalsScreen/GoalsScreen.tsx`

**Commit**: `feat(goals-screen): resolve next pending leaf in buildGoalCardGoal`
**Estimated LOC**: ~35 lines

**Changes**:

- [x] Update `StepRow` type alias to include `parentStepId` (now returned by `stepsForActiveGoalsQuery`).
- [x] In `buildGoalCardGoal`, replace the current `steps.find(isPendingStep)?.title` lookup with a resolution that mirrors the prototype's `nextInfo()`. Walk the **top-level** steps (`parentStepId === null`) in order; for the first one that is not completed:
  1. **Flat** (no children): hero = step title, `nextStepContext = null`.
  2. **Leaf** (has children, at least one child pending): hero = first pending child's title, `nextStepContext = t("goals:card.nextStepContext", { parent: parentTitle })`.
  3. **Invite** (has children, all children completed, parent still pending — R4): hero = parent title, `nextStepContext = t("goals:card.allSubstepsDone", { count: childCount })`.
  - If no top-level step is pending: hero = null, context = null.
- [x] Reconstruct the parent→children grouping from the flat `steps` array (group by `parentStepId`), preserving query order so "first pending" is stable.
- [x] Progress count: **every-unit** (R1 / D8). Count all step rows — `stepsTotal = steps.length`, `stepsCompleted = steps.filter(isCompleted).length`. Because children now arrive in the same flat array, this is the existing behavior; no filtering needed. Apply the same numbers to the label and the ProgressBar fill.
- [x] Note: `t()` in GoalsScreen requires importing `useTranslation` in the function — `buildGoalCardGoal` is a plain function, not a component. Pass the `t` function as a parameter from `GoalList` where `useTranslation` is already called. Signature: `buildGoalCardGoal(goalRow, steps, t)`.

### Step 4: MiniTimeline — indented child nodes (sub-spine)

**Files**:

- `apps/native-rd/src/components/MiniTimeline/MiniTimeline.tsx`
- `apps/native-rd/src/components/MiniTimeline/MiniTimeline.styles.ts`

**Commit**: `feat(mini-timeline): indented child nodes for sub-steps (Q3 sub-spine)`
**Estimated LOC**: ~45 lines production + ~20 lines styles

**Changes**:

- [x] Extend `MiniTimelineStep` with `isChild?: boolean` (optional, false when absent).
- [x] In the render loop, match the prototype's `grp-indent` (R2) — children stay **inline on the same track**, not offset onto another row:
  - A parent followed by its children renders as a group: `[parent node] —· [child node] —· [child node] …`, where `—·` is a **short** connector segment (the prototype's `.seg-line.short`, dashed when the following node is pending, solid when completed).
  - Wrap that parent+children group in a container that carries a **bottom border** (the "shelf" — `grp-indent`'s `border-bottom`) so the sub-spine reads as subordinate without a vertical offset.
  - Standard (non-child) steps render exactly as today; the goal node at the end is unaffected.
- [x] Apply a `nodeChild` style: smaller diameter (prototype uses 9px child vs 14px standard; pick the RN-equivalent that keeps the 44pt touch target on the wrapping Pressable), same border weight. Add `nodeChildCurrent` for the current-index child (prototype bumps it to ~14px).
- [x] The goal node at the end of the track is unaffected (it is never a child).
- [x] Preserve existing a11y labels: `common:timeline.a11y.step` already has `{ index, status }`. For child nodes, pass the same index (1-based position in the full list, not sibling-position). This is adequate — a more specific "sub-step N of M under [parent]" label is a follow-up for #294's a11y pass.
- [x] Preserve the existing E2E mode gating logic — no changes needed there.

### Step 5: FocusModeScreen — wire `isChild`, leaf snap, `parentTitle` to StepCard

**Files**:

- `apps/native-rd/src/screens/FocusModeScreen/FocusModeScreen.tsx`

**Commit**: `feat(focus-mode): leaf snap, sub-spine timeline, parent context on step cards`
**Estimated LOC**: ~50 lines

**Changes**:

- [x] In the `uiSteps` memo: add `isChild: row.parentStepId !== null` to each mapped step. `stepsByGoalQuery` uses `selectAll`, so `parentStepId` is already present on `stepRows` rows.
- [x] Compute `parentTitle` for each step: for rows where `isChild` is true, find the parent row in `stepRows` by id (`stepRows.find(r => r.id === row.parentStepId)?.title ?? null`). Include `parentTitle: string | null` in the mapped `uiSteps` shape.
- [x] Update `timelineSteps` memo: map `{ status: s.status, isChild: s.isChild }` to pass `isChild` to MiniTimeline.
- [x] Update snap-to-first-pending (the `useEffect` that calls `findFirstPendingIndex`): replace `findFirstPendingIndex(stepRows)` with a leaf-aware version. Define a local helper `findFirstPendingLeafIndex(rows)` that walks the flat list and returns the index of the first row that is pending AND (`parentStepId !== null` OR has no children in the list). This ensures the carousel snaps to a leaf, not a parent whose children are all pending.
- [x] Pass `parentTitle` to `StepCard` for each card in the `stepsWithEvidence.map()` carousel render. Requires adding `parentTitle` to the `stepsWithEvidence` shape (add it in the `uiSteps` definition or the `stepsWithEvidence` enrichment pass).
- [x] The `allStepsComplete` guard and the snap-to-goal-card effect are unaffected — they check `stepRows` status, not hierarchy.

### Step 6: StepCard — parent context line

**Files**:

- `apps/native-rd/src/components/StepCard/StepCard.tsx`
- `apps/native-rd/src/components/StepCard/StepCard.styles.ts`

**Commit**: `feat(step-card): parent context line for sub-steps in focus mode`
**Estimated LOC**: ~30 lines production + ~15 lines styles

**Changes**:

- [x] Add `parentTitle?: string | null` to the `StepCard`'s `step` prop shape (the object passed in — not a top-level prop, to match the existing pattern).
- [x] When `parentTitle` is non-null, render a "↳ in [parentTitle]" text below the step title with a muted style (`theme.colors.textMuted`, `theme.textStyles.caption`), `testID="step-card-parent-context"`.
- [x] Reuse the `goals:card.nextStepContext` i18n key from Step 2 — or if the focus surface warrants its own key, add `focusMode:card.parentContext` with the same value. Decision: reuse the same key (it is surface-agnostic text). Confirm in implementation.
- [x] Style: same treatment as GoalCard context line — muted, one line, `marginTop: theme.space[1]`.
- [x] The `parentTitle` prop is optional and defaults to null — no breaking change for existing callers.

### Step 7: Tests

**Files**:

- `apps/native-rd/src/components/GoalCard/__tests__/GoalCard.test.tsx`
- `apps/native-rd/src/screens/GoalsScreen/__tests__/GoalsScreen.test.tsx`
- `apps/native-rd/src/components/MiniTimeline/__tests__/MiniTimeline.test.tsx`
- `apps/native-rd/src/components/StepCard/__tests__/StepCard.test.tsx`
- `apps/native-rd/src/screens/FocusModeScreen/__tests__/FocusModeScreen.test.tsx`

**Commit**: `test(reading): goal-card leaf resolution, mini-timeline sub-spine, step-card context`
**Estimated LOC**: ~120 lines

**Changes**:

**GoalCard tests (extend existing)**:

- [x] `nextStepContext` is rendered when non-null (testID `goal-card-next-step-context`).
- [x] `nextStepContext` is absent when null.
- [x] When `nextStepTitle` is null and `nextStepContext` is null, neither line renders.

**GoalsScreen tests (extend existing)**:

- [x] `buildGoalCardGoal` with a goal that has flat steps: `nextStepContext` is null, `nextStepTitle` is the first pending step.
- [x] `buildGoalCardGoal` with a goal that has a pending leaf: `nextStepTitle` is the leaf title, `nextStepContext` is the "↳ in [parent]" string.
- [x] `buildGoalCardGoal` **invite state** (R4): a parent whose children are all completed but parent still pending → `nextStepTitle` is the parent title, `nextStepContext` is the "all N substeps done" string.
- [x] `buildGoalCardGoal` with a goal where all steps are completed: `nextStepTitle` is null, `nextStepContext` is null.
- [x] **Progress count is every-unit** (R1): a goal with 1 parent + 3 children + 1 flat step (the `tomas-done` shape) reports `stepsTotal === 6`, and with s1 + all 3 children completed reports `stepsCompleted === 4` (i.e. `4/6`).

**MiniTimeline tests (extend existing)**:

- [x] A step with `isChild: true` renders a node with the `nodeChild` style (check `testID` or snapshot — prefer testID on the node View).
- [x] A step with `isChild: false` / absent renders the standard node.
- [x] Mix: a 3-step list with one child node renders 3 step nodes + 1 goal node (count unchanged).

**StepCard tests (extend existing)**:

- [x] `parentTitle` non-null renders the context line (`testID="step-card-parent-context"`).
- [x] `parentTitle` null/absent: context line is absent.

**FocusModeScreen tests (extend existing)**:

- [x] When step rows include a child (parentStepId non-null), the snap-to-first-pending effect resolves to the child's index, not the parent's index.
- [x] `timelineSteps` passed to MiniTimeline includes `isChild: true` for child steps (test via mock inspection or rendered node count).

## Testing Strategy

- [x] Unit tests for `buildGoalCardGoal` leaf resolution (Jest 30, pure function — no Evolu mock needed for the helper itself; wrap in GoalsScreen test with mocked `useQuery`).
- [x] Component tests: GoalCard context line, MiniTimeline `isChild` node, StepCard parent context.
- [x] Integration-style component test for FocusModeScreen snap-to-leaf (extend existing mock setup).
- [x] Test files mirror `src/` under existing `__tests__/` directories (no new paths needed).
- [x] Use `test.each` for context-line present/absent and `isChild` true/false cases.
- [x] Run: `npx jest --no-coverage --testPathPatterns "GoalCard|GoalsScreen|MiniTimeline|StepCard|FocusModeScreen"`.
- [x] Manual verification: create a goal with a parent step + two sub-steps, return to the goals list, confirm the GoalCard shows the leaf as hero with the "↳ in [parent]" context line. Enter focus mode, confirm the timeline shows child nodes subordinate to the parent node, confirm the step card for the leaf shows the context line.

## Not in Scope

Items explicitly deferred from this issue. Helps prevent scope creep during implementation.

| Item                                                                                                         | Reason                                                                                                                   | Follow-up    |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ------------ |
| TimelineJourneyScreen sub-step rendering                                                                     | Separate issue #293                                                                                                      | #293         |
| Exhaustive a11y contract pass (full 44pt audit, sub-step a11y labels)                                        | Separate issue #294                                                                                                      | #294         |
| StepCard toggle/complete behaviour with sub-steps                                                            | No behaviour change — completion is already fully manual                                                                 | none         |
| Rich parent "invite" affordance in FocusMode (Q9: childlist + "Mark complete" + "this stays your call" copy) | The minimal invite _readout_ (parent surfaced as hero, R4) IS in scope; the richer focus-mode affordance is post-Stage-6 | post-#292    |
| Drag-to-reparent in FocusMode / read surfaces                                                                | Authoring only (#330)                                                                                                    | #330         |
| Progress count rule lock-in                                                                                  | **Decided: every-unit** (R1) — no longer open                                                                            | done         |
| Depth beyond one level                                                                                       | Schema hard cap; graduates post-Stage-6                                                                                  | post-Stage-6 |
| Sub-step evidence rollup on parent step card                                                                 | Q10 from prototype record — parked                                                                                       | post-Stage-6 |

_No items from the ADR-0012 Must-Not-Do list are touched here: no auto-state, no absence scoring, no parent-completion inference._

## Discovery Log

Runtime discoveries made during implementation.

- [2026-06-20] **Step 1 — added `step.createdAt` tie-break** to `stepsForActiveGoalsQuery` (D1 left this as "verify"). Child `ordinal` is sibling-scoped (0-based per parent) and can collide with a top-level step's ordinal in the flat array, so flat order is not relied on for hierarchy; the consumer buckets on `parentStepId`. The tie-break only makes sibling order deterministic, matching `stepsByGoalQuery`.
- [2026-06-20] **D3 refinement — `nextStepContext` is `?: string | null` (optional), not required.** Keeps each commit independently buildable (GoalCard's interface change in Step 2 doesn't break GoalsScreen, which populates the field in Step 3) and gives a clean "absent ⇒ no context line" default. GoalsScreen (the only real caller) always sets it.
- [2026-06-20] **Step 6 implemented before Step 5.** FocusMode passes `parentTitle` into StepCard's `step` object, so StepCard had to accept the prop first for the FocusMode commit to type-check. Commit order only; no behavioural change.
- [2026-06-20] **StepCard context line uses its own key `common:stepCard.parentContext`** rather than reusing `goals:card.nextStepContext` (Step 6 listed this as an acceptable alternative). StepCard already binds the `common` namespace; reaching into the `goals` screen namespace from a shared component would be an odd coupling. Same glyph/text, surface-appropriate key.
- [2026-06-20] **Child node 44pt touch target** kept via a wider `hitSlop` (17 vs 15) on child Pressables — the visual node shrinks to 10px but the touch area stays ≥44pt. The full sub-step a11y audit remains #294.
- [2026-06-20] **Added `timeline-node-{index}` testID** to the MiniTimeline node View (bundled into the Step 7 test commit) so the sub-spine child-node size is assertable — the plan's preferred "testID on the node View" approach.
- [2026-06-20] **Note: `buildGoalCardGoal` (GoalsScreen) and `findFirstPendingLeafIndex` (FocusModeScreen) duplicate the `nextInfo()` resolution shape** (~10 lines each), per D2/D4 which deliberately localise the logic at each call site (different row shapes). Flagged for a possible future extraction into a shared `db` helper if the rule grows.
