# Development Plan: Issue #337

## Issue Summary

**Title**: A-reading: unify sub-step leaf-resolution + orphan-promotion into one helper
**Type**: refactor (tech-debt)
**Complexity**: SMALL
**Estimated Lines**: ~130 lines (helper ~40 + unit tests ~60 + consumer deltas ~30)

## Intent Verification

Observable criteria derived from the issue.

- [x] `apps/native-rd/src/db/queries.ts` exports a single `resolveNextActionableStep` helper that encodes both leaf-resolution and orphan-promotion in one place.
- [x] `findFirstPendingLeafIndex` in `FocusModeScreen.tsx` delegates to the helper; its own bucketing loop is deleted.
- [x] `buildGoalCardGoal`'s bucketing loop in `GoalsScreen.tsx` is deleted and replaced by a call to the helper.
- [x] All existing sub-step tests in `FocusModeScreen.test.tsx` (`describe("sub-steps (#292)")`) and `GoalsScreen.test.tsx` (`describe("sub-step next-step resolution")`) pass unmodified — no test fixtures or assertions change. (Each screen's `jest.mock("../../../db")` gained a faithful `resolveNextActionableStep` copy — a mock-setup addition, not a fixture/assertion change.)
- [x] `bun run type-check` and `bun run lint` exit clean (lint: 0 errors; only pre-existing warnings in untouched files).
- [x] No behaviour change: full suite green — 179 suites / 8968 tests; leaf / invite / flat / orphan / interleaved-query-order / completed-parent-pending-child all preserved.

## Dependencies

No dependencies. Issue body does not mention blockers. Parent epic #288 is the overarching sub-steps epic; #292 (which shipped the duplicated logic) is already merged.

| Issue | Title                                             | Status | Type         |
| ----- | ------------------------------------------------- | ------ | ------------ |
| #292  | Goal card, FocusMode snap, MiniTimeline sub-spine | Merged | context only |
| #288  | Epic: sub-steps (A: substructure)                 | Open   | parent epic  |

**Status**: All dependencies met.

## Objective

Extract the "next actionable step" resolution logic (leaf / invite / flat / orphan-promotion) that is currently copy-pasted in `FocusModeScreen.tsx:findFirstPendingLeafIndex` (lines 104-148) and `GoalsScreen.tsx:buildGoalCardGoal` (lines 50-99) into a single exported helper in `src/db/queries.ts`. Both screens then delegate to it. No query changes; no behaviour changes.

## Decisions

| ID  | Decision                                                                                                                                                     | Alternatives Considered                                                                       | Rationale                                                                                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Helper operates on a minimal `{ id, parentStepId, status }` shape, not `StepRowLike`                                                                         | Widen `stepsForActiveGoalsQuery` so GoalsScreen could call `groupStepsByParent` directly      | `stepsForActiveGoalsQuery` intentionally omits `ordinal`, `completedAt`, and `plannedEvidenceTypes` to prevent an N+1 on the home screen. There is no other pressure to widen it, so the issue's own preference ("minimal-shape resolver is PREFERRED") applies. |
| D2  | Helper lives in `src/db/queries.ts` alongside `groupStepsByParent` / `flattenGroupedSteps`                                                                   | New file `src/db/stepResolver.ts`                                                             | The existing grouping helpers are already here and already exported from the `src/db/index.ts` barrel. A separate file buys no clarity at this size and adds an extra import path.                                                                               |
| D3  | Helper returns a discriminated union `{ kind: 'leaf' \| 'invite' \| 'flat' \| 'none'; index: number; ... }` rather than two separate functions               | Return just the flat index (FocusMode need) or just the title/context pair (GoalsScreen need) | Both consumers can derive everything they need from one call. A discriminated return makes the three states explicit, eliminates the implicit "no pending child → check parent" chain, and makes tests easier to read.                                           |
| D4  | FocusModeScreen's `findFirstPendingLeafIndex` is converted to a thin wrapper that calls the helper and extracts `index`, keeping its public signature intact | Rename the function at call sites                                                             | Only one call site (`useEffect` line 319); still, keeping the local wrapper name avoids touching the test mock comment that references it. The wrapper is a one-liner and will be a TODO-comment candidate for a later cleanup.                                  |

## Affected Areas

- `apps/native-rd/src/db/queries.ts`: add `resolveNextActionableStep` (and its input type `NextActionableInput`) + export via barrel
- `apps/native-rd/src/db/index.ts`: add `resolveNextActionableStep` and `NextActionableInput` to the re-exports
- `apps/native-rd/src/db/__tests__/queries.step.test.ts`: new `describe("resolveNextActionableStep")` block covering all six cases
- `apps/native-rd/src/screens/FocusModeScreen/FocusModeScreen.tsx`: replace the body of `findFirstPendingLeafIndex` with a delegate call
- `apps/native-rd/src/screens/GoalsScreen/GoalsScreen.tsx`: replace the bucketing block inside `buildGoalCardGoal` with a delegate call

## Implementation Plan

### Step 1: Add `resolveNextActionableStep` helper + unit tests

**Files**:

- `apps/native-rd/src/db/queries.ts`
- `apps/native-rd/src/db/index.ts`
- `apps/native-rd/src/db/__tests__/queries.step.test.ts`

**Commit**: `refactor(db): add resolveNextActionableStep — single leaf/invite/flat/orphan resolver`

**Changes**:

- [ ] Define the minimal input type directly above the helper in `queries.ts`:

  ```typescript
  /** Minimal step shape that resolveNextActionableStep requires. */
  export interface NextActionableInput {
    id: string;
    parentStepId: string | null;
    status: string | null;
  }
  ```

- [ ] Define the discriminated result type:

  ```typescript
  export type NextActionableResult =
    | { kind: "leaf"; index: number; parentId: string }
    | { kind: "invite"; index: number; childCount: number }
    | { kind: "flat"; index: number }
    | { kind: "none" };
  ```

- [ ] Implement `resolveNextActionableStep`:

  ```typescript
  /**
   * Resolve the single next actionable step for a goal given a flat row array.
   *
   * Encodes the orphan-promotion rule (mirrors groupStepsByParent): a row whose
   * parentStepId is not a present top-level step surfaces as top-level so its
   * pending work stays reachable (#292).
   *
   * Handles four states:
   *   leaf   — first pending child under a top-level step
   *   invite — all children done, parent still pending
   *   flat   — pending top-level step with no children
   *   none   — nothing pending
   *
   * @param rows Flat, already-ordered rows (ordinal, createdAt).
   */
  export function resolveNextActionableStep(
    rows: readonly NextActionableInput[],
  ): NextActionableResult { ... }
  ```

  The body mirrors the logic currently in both consumers:
  1. Build `rootIds` (rows where `parentStepId == null`).
  2. Walk `rows` to bucket `childrenByParent` and `topLevel` using the same orphan-promotion rule both consumers already use.
  3. Iterate `topLevel`; for each step find its first pending child. If found, return `{ kind: 'leaf', index: <flat index of child>, parentId: step.id }`. If no pending child and parent is completed, `continue`. If no pending child and parent is pending and has children, return `{ kind: 'invite', index: <flat index of step>, childCount: children.length }`. If no pending child and parent is pending and has no children, return `{ kind: 'flat', index: <flat index of step> }`.
  4. Return `{ kind: 'none' }`.

  The flat `index` values are the row's position in the original `rows` array (same semantics as `findFirstPendingLeafIndex` today).

- [ ] Export from `src/db/index.ts`:

  ```typescript
  resolveNextActionableStep,
  type NextActionableInput,
  type NextActionableResult,
  ```

  (Add to the "Step" section of the existing barrel.)

- [ ] Add `describe("resolveNextActionableStep")` block in `queries.step.test.ts` with `test.each` cases covering:
  - empty rows → `{ kind: 'none' }`
  - flat goal, all pending → `{ kind: 'flat', index: 0 }`
  - flat goal, first step completed, second pending → `{ kind: 'flat', index: 1 }`
  - leaf state (first pending child) → `{ kind: 'leaf', index: <child flat index>, parentId: ... }`
  - partial leaf (earlier sibling completed) → `{ kind: 'leaf', index: <second child flat index> }`
  - invite state (all children done, parent pending) → `{ kind: 'invite', index: <parent flat index>, childCount: N }`
  - orphan (parent absent) → promotes to top-level, returns `{ kind: 'flat', index: <orphan flat index> }`
  - interleaved-query-order (child ordinal before parent) → correct flat index after bucketing
  - completed parent with pending child → `{ kind: 'leaf', ... }` (not skipped on parent status)
  - all steps completed → `{ kind: 'none' }`

  These mirror the named sub-step test fixtures in `FocusModeScreen.test.tsx` (`LEAF_STEPS`, `INVITE_STEPS`, `INTERLEAVED_STEPS`, `PARTIAL_LEAF_STEPS`, `ORPHAN_STEPS`, `COMPLETED_PARENT_PENDING_CHILD_STEPS`) so the unit tests are directly traceable to the existing screen integration tests.

### Step 2: Refactor FocusModeScreen consumer

**Files**: `apps/native-rd/src/screens/FocusModeScreen/FocusModeScreen.tsx`

**Commit**: `refactor(focus-mode): delegate findFirstPendingLeafIndex to resolveNextActionableStep`

**Changes**:

- [ ] Add `resolveNextActionableStep` to the import from `../../db` (line 44-56 import block).
- [ ] Replace the body of `findFirstPendingLeafIndex` (lines 114-148, the entire `rootIds` / `childrenByParent` / `topLevel` walk) with:
  ```typescript
  function findFirstPendingLeafIndex(
    rows: readonly {
      id: string;
      parentStepId: string | null;
      status: string | null;
    }[],
  ): number {
    const result = resolveNextActionableStep(rows);
    return result.kind === "none" ? -1 : result.index;
  }
  ```
  The function signature is unchanged; call site at line 319 (`findFirstPendingLeafIndex(stepRows)`) is unchanged.
- [ ] Verify: `FocusModeScreen.tsx` no longer contains a `rootIds`/`childrenByParent`/`topLevel` bucketing loop.

### Step 3: Refactor GoalsScreen consumer

**Files**: `apps/native-rd/src/screens/GoalsScreen/GoalsScreen.tsx`

**Commit**: `refactor(goals-screen): delegate buildGoalCardGoal bucketing to resolveNextActionableStep`

**Changes**:

- [ ] Add `resolveNextActionableStep` to the `../../db` import (line 15-21 import block).
- [ ] Delete the `rootIds` / `childrenByParent` / `topLevel` bucketing block (lines 50-63) and the `for (const step of topLevel)` resolution loop (lines 72-99) inside `buildGoalCardGoal`.
- [ ] Replace with a call to `resolveNextActionableStep(steps)` and a `switch` (or `if/else`) on `result.kind`:

  ```typescript
  const result = resolveNextActionableStep(steps);
  let nextStepTitle: string | null = null;
  let nextStepContext: string | null = null;
  if (result.kind === "leaf") {
    const leaf = steps[result.index];
    const parent = steps.find((s) => s.id === result.parentId);
    nextStepTitle = leaf?.title ?? null;
    nextStepContext = t("goals:card.nextStepContext", {
      parent: parent?.title ?? "",
    });
  } else if (result.kind === "flat") {
    nextStepTitle = steps[result.index]?.title ?? null;
  } else if (result.kind === "invite") {
    const parent = steps[result.index];
    nextStepTitle = parent?.title ?? null;
    nextStepContext = t("goals:card.allSubstepsDone", {
      count: result.childCount,
    });
  }
  // kind === 'none': both stay null
  ```

  Note: `buildGoalCardGoal` receives the per-goal slice (`steps: readonly StepRow[]`), so `steps.find` is still scoped to one goal. `result.parentId` is the id of the container parent (present in `steps` for the leaf case), so `steps.find` is O(n) over a small per-goal slice.

- [ ] Verify: `GoalsScreen.tsx` no longer contains a `rootIds`/`childrenByParent`/`topLevel` bucketing loop.

## Testing Strategy

- [x] Unit tests for `resolveNextActionableStep` in `apps/native-rd/src/db/__tests__/queries.step.test.ts` — one `describe` block, `test.each` for nine named cases. No new file. (`bun test`'s native runner trips on RN Flow types here; ran via `npx jest --no-coverage` per `CLAUDE.md`.)
- [x] Existing screen tests are the regression gate: `FocusModeScreen.test.tsx` (62 tests) and `GoalsScreen.test.tsx` (25 tests) pass unchanged — no fixture or assertion changes (only the faithful mock copy added).
- [x] Ran the full native-rd suite via jest: **179 suites / 8968 tests, all green.**
- [ ] Manual smoke check (NOT run — autonomous flow, no simulator): open FocusMode on a goal with sub-steps and confirm the carousel snaps to the first pending leaf; open GoalsScreen and confirm the next-step line reads the leaf title + parent context. Covered by the screen integration tests above; left for the reviewer / `/verify` if a device check is wanted.

## Not in Scope

| Item                                                                                                                                                                | Reason                                                                                                                       | Follow-up                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Widen `stepsForActiveGoalsQuery` to full `StepRowLike`                                                                                                              | Design tension in issue resolves to minimal-shape resolver (D1 above)                                                        | none                                                     |
| Moving the FocusModeScreen test mock (`groupStepsByParent` / `flattenGroupedSteps` faithful copies in the `jest.mock('../../../db')` block) to use the real helpers | Out of scope; mock structure is load-bearing for other tests in that file                                                    | Could be a follow-up cleanup once the refactor is stable |
| Removing the `findFirstPendingLeafIndex` wrapper function entirely                                                                                                  | Its one call site is trivial to update, but keeping the named function preserves the self-documenting intent at the use site | Future cleanup, track in PR review if desired            |

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->

- [2026-06-21] Type names: shipped as `NextActionableStepInput` / `NextActionableStep` (plan proposed `NextActionableInput` / `NextActionableResult`). The `…Step` suffix reads consistently with the `resolveNextActionableStep` function name. Behaviour identical.
- [2026-06-21] Test-mock copies: both screen tests mock `../../../db` with faithful inline copies of the pure helpers (`groupStepsByParent`, `flattenGroupedSteps`). Because `findFirstPendingLeafIndex` / `buildGoalCardGoal` now call `resolveNextActionableStep` from that module, each mock gained a faithful `resolveNextActionableStep` copy too — otherwise the delegated call resolves to `undefined`. No fixture or assertion changed; this is the established mock pattern in those files.
- [2026-06-21] Orphan-promotion "one place" scope: among the next-step resolvers it is now unified into `resolveNextActionableStep`. `groupStepsByParent` still independently encodes the rule for tree-building — unifying the two is out of scope per D1 (different output shapes; the minimal-query rows lack the full `StepRowLike` fields `groupStepsByParent` needs).
