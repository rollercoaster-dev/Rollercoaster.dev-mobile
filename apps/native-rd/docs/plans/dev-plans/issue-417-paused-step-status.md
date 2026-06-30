# Development Plan: Issue #417

## Issue Summary

**Title**: [Foundation] Add `paused` step status + Set aside / Pick back up
**Type**: enhancement
**Complexity**: SMALL
**Estimated Lines**: ~280 lines

## Intent Verification

Observable criteria derived from the issue acceptance criteria:

- [ ] When a step is paused via `pauseStep(id)`, a subsequent Evolu query for that step returns `status === "paused"` and `updatedAt` is newer than before the call.
- [ ] When a paused step is resumed via `resumeStep(id)`, the step's `status` returns to `"pending"` and `completedAt` is null.
- [ ] `resolveNextActionableStep` given a flat list `[paused, pending]` returns `{ kind: "flat", index: 1 }` — the paused step is skipped.
- [ ] `resolveNextActionableStep` given a list where the only non-completed step is paused returns `{ kind: "none" }`.
- [ ] A goal with a paused step and all other steps completed does **not** show the "Mark complete" affordance in FocusModeScreen (paused step is not `=== StepStatus.completed`).
- [ ] Progress ratio in `buildCockpitGoal` treats paused steps as part of the denominator — a goal with 2 completed and 1 paused shows `2/3` progress.
- [ ] `bun run type-check`, `bun run lint`, and `bun run test` all pass with no new failures.
- [ ] No new UI affordances are introduced (no new screen components, no new props on existing screens).

## Dependencies

| Issue  | Title                                  | Status | Type |
| ------ | -------------------------------------- | ------ | ---- |
| (none) | This is order:1 — no declared blockers | —      | —    |

**Status**: All dependencies met. Issues #406, #377, #378 are listed as things this issue **unblocks**, not as prerequisites.

## Objective

Add `paused` as a persisted `StepStatus` value in the DB schema and the UI type, plus two mutations (`pauseStep` / `resumeStep`). Update `resolveNextActionableStep` to skip paused steps. State and test the progress-counting and goal-completion rules. No UI changes.

## Decisions

| ID  | Decision                                                                                                | Alternatives Considered               | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | No migration file required                                                                              | Drizzle migration, SQLite ALTER TABLE | Evolu stores all columns as a schemaless JSON blob internally; new enum values are additive, existing rows keep their existing string values (`"pending"`/`"completed"`). The `parentStepId` column was added the same way (see `schema.ts:111` comment). No `ALTER TABLE` or migration file needed.                                                                                                                                                             |
| D2  | `pauseStep` / `resumeStep` naming                                                                       | `setAsideStep` / `pickUpStep`         | Mirrors the existing `completeStep` / `uncompleteStep` verb pattern. The UI label "Set aside / Pick back up" lives in #377/#408; the mutation name can be more terse.                                                                                                                                                                                                                                                                                            |
| D3  | `resolveNextActionableStep` skips paused exactly like completed for purposes of the child-pending check | Treat paused as pending in child scan | The child-pending scan at line 517 (`c.status !== StepStatus.completed`) must also skip paused children to avoid surfacing a paused child as the next action. The parent-level skip at line 526 (`step.status === StepStatus.completed`) must also skip `paused`. Both sites updated.                                                                                                                                                                            |
| D4  | `isPendingStep` stays pending-only (not updated to include paused)                                      | Add paused to isPendingStep           | `isPendingStep` is used in FocusModeScreen's auto-advance logic (line 425) to find the next card to snap to after completing a step. Paused steps should not be auto-advanced to — they were deliberately set aside. The issue text also explicitly says "`isPendingStep` at `:346` stays pending-only."                                                                                                                                                         |
| D5  | Progress denominator includes paused                                                                    | Exclude paused from denominator       | `buildCockpitGoal` (GoalsScreen.tsx:61-65) counts `steps.length` as the total. Paused steps count in the denominator — set-aside ≠ deleted. Only `completed` steps count toward the numerator. This matches the issue recommendation and preserves the every-unit rule (#292). No code change needed in `buildCockpitGoal` since it already uses `steps.length` (non-deleted) as the denominator — `paused` rows are non-deleted so they are naturally included. |
| D6  | Goal completion requires every step `=== StepStatus.completed` — paused blocks it                       | Allow paused to not block             | `FocusModeScreen` line 313-315: `allStepsComplete = stepRows.every(s => s.status === StepStatus.completed)`. A paused step has `status === "paused"` which fails this check. The `canMarkComplete` gate therefore already blocks completion with a paused step — **no code change needed here**. Add a test to lock this contract.                                                                                                                               |

## Affected Areas

- `apps/native-rd/src/db/schema.ts`: Add `paused: NonEmptyString1000.orThrow("paused")` to `StepStatus` (line 43-46).
- `apps/native-rd/src/types/steps.ts`: Add `"paused"` to the UI `StepStatus` union. Collapse the `TimelineNode.tsx` `NodeStatus = StepStatus | "paused"` workaround into just `StepStatus` (with a follow-up note — see Not in Scope).
- `apps/native-rd/src/db/queries.ts`: Add `pauseStep` and `resumeStep` functions (mirror `completeStep` / `uncompleteStep`). Update `resolveNextActionableStep` at lines 517-526 to skip `paused` in both the child-scan and the top-level loop.
- `apps/native-rd/src/db/index.ts`: Export `pauseStep` and `resumeStep`.
- `apps/native-rd/src/db/__tests__/queries.step.test.ts`: Add `resolveNextActionableStep` regression cases for paused steps; add tests for `pauseStep` / `resumeStep` round-trip; add goal-completion-blocked-by-paused contract test.
- `apps/native-rd/src/components/TimelineNode/TimelineNode.tsx`: Remove the local `NodeStatus = StepStatus | "paused"` workaround now that `StepStatus` includes `"paused"` directly.
- `apps/native-rd/src/components/TimelineStep/TimelineStep.tsx`: Update `Record<StepStatus, StatusBadgeVariant>` and `Record<StepStatus, "done" | "active" | "pending">` maps to add `"paused"` entries (TypeScript exhaustiveness will require this).

## Implementation Plan

### Step 1: Extend `StepStatus` in DB schema and UI type

**Files**:

- `apps/native-rd/src/db/schema.ts`
- `apps/native-rd/src/types/steps.ts`

**Commit**: `feat(db): add paused to StepStatus enum and UI type`

**Changes**:

- [ ] In `schema.ts`, add `paused: NonEmptyString1000.orThrow("paused")` to the `StepStatus` const (after `pending`, before `completed`). Update the JSDoc comment.
- [ ] In `types/steps.ts`, add `"paused"` to the `StepStatus` union type. Update the comment to reflect that `paused` is now persisted (not UI-derived).
- [ ] Run `bun run type-check` — TypeScript will surface every exhaustive `Record<StepStatus, ...>` that needs updating. Collect the list (should be `TimelineStep.tsx` `statusToVariant` and `statusToLabelKey`).

### Step 2: Fix `Record<StepStatus>` exhaustiveness gaps

**Files**:

- `apps/native-rd/src/components/TimelineStep/TimelineStep.tsx`
- `apps/native-rd/src/components/TimelineNode/TimelineNode.tsx`

**Commit**: `fix(components): add paused branch to StepStatus Record maps`

**Changes**:

- [ ] In `TimelineStep.tsx`, add `"paused": "locked"` to `statusToVariant` (paused step shows as locked/not-yet-actionable badge variant — same as pending; a follow-up can refine once the #406-follow-up design token lands).
- [ ] In `TimelineStep.tsx`, add `"paused": "pending"` to `statusToLabelKey` (for now; the label key mapping can be a dedicated `"paused"` key once the StatusBadge vocabulary expands in a later issue).
- [ ] In `TimelineNode.tsx`, remove the `// TODO: collapse into StepStatus once the data layer supports paused.` workaround: delete the local `type NodeStatus = StepStatus | "paused"` declaration and replace the `NodeStatus` usage with `StepStatus` directly.

### Step 3: Add `pauseStep` / `resumeStep` mutations

**Files**:

- `apps/native-rd/src/db/queries.ts`
- `apps/native-rd/src/db/index.ts`

**Commit**: `feat(db): add pauseStep and resumeStep mutations`

**Changes**:

- [ ] Add `pauseStep(id: StepId)` function after `uncompleteStep` (~line 762). Pattern: `evolu.update("step", { id, status: StepStatus.paused })`. No `completedAt` manipulation — paused steps were never completed. Bumps `updatedAt` automatically (Evolu stamps it on every write — this satisfies the cockpit recency ranking rule, #381 D2).
- [ ] Add `resumeStep(id: StepId)` function immediately after `pauseStep`. Pattern: `evolu.update("step", { id, status: StepStatus.pending })`. Mirror the breadcrumb and error-handling shape of `uncompleteStep`.
- [ ] Export both from `src/db/index.ts`.

### Step 4: Update `resolveNextActionableStep` to skip paused

**Files**:

- `apps/native-rd/src/db/queries.ts`

**Commit**: `fix(db): resolveNextActionableStep skips paused steps`

**Changes**:

- [ ] At line 517 (child-pending scan): change `c.status !== StepStatus.completed` to `c.status !== StepStatus.completed && c.status !== StepStatus.paused`. A paused child is not the next action.
- [ ] At line 526 (top-level skip): change `if (step.status === StepStatus.completed) continue;` to `if (step.status === StepStatus.completed || step.status === StepStatus.paused) continue;`. A paused top-level step is skipped, surfacing the next pending one.
- [ ] Update the JSDoc for `resolveNextActionableStep` to mention that paused steps are skipped along with completed ones.

### Step 5: Tests

**Files**:

- `apps/native-rd/src/db/__tests__/queries.step.test.ts`

**Commit**: `test(db): resolver skips paused; pauseStep/resumeStep round-trip; goal completion blocked by paused`

**Changes**:

- [ ] Add `resolveNextActionableStep` regression cases to the existing `test.each` block (alongside the #337 leaf/invite/flat cases):
  - `"paused-only flat → none"`: single paused flat step → `{ kind: "none" }`
  - `"paused first, pending second → skips paused, returns pending"`: `[paused-flat, pending-flat]` → `{ kind: "flat", index: 1 }`
  - `"paused child skipped, next pending child returned"`: parent with one paused child and one pending child → `{ kind: "leaf", index: <pending-child-index>, parentIndex: <parent-index> }`
  - `"all steps completed or paused → none"`: mix of `completed` and `paused` rows → `{ kind: "none" }`
- [ ] Add a `describe("pauseStep / resumeStep")` block with:
  - `pauseStep` calls `evolu.update` with `status: StepStatus.paused` and the correct `id`.
  - `resumeStep` calls `evolu.update` with `status: StepStatus.pending` and the correct `id`.
  - (Mirror the existing `completeStep` / `uncompleteStep` test shape in the file.)
- [ ] Add a `describe("goal completion semantics — paused step blocks")` block with:
  - Assert that `stepRows.every(s => s.status === StepStatus.completed)` returns `false` when any step has `status === "paused"` (this locks D6's contract against regression). Use a plain unit assertion — no render needed.

## Testing Strategy

- [ ] Unit tests only — no render tests (no UI introduced).
- [ ] Test file: `src/db/__tests__/queries.step.test.ts` (mirrors `src/db/queries.ts` structure).
- [ ] Use `test.each` for the new resolver cases (consistent with the existing block at line 296).
- [ ] Run: `bun run test --testPathPatterns queries.step` to validate step tests.
- [ ] Run: `bun run test --testPathPatterns queries` to catch any query-level regressions.
- [ ] Run: `bun run type-check` to confirm no remaining exhaustiveness gaps.
- [ ] Run: `bun run lint` to confirm no new lint errors.
- [ ] Manual: confirm `bun run test` (full suite) passes.

## Not in Scope

| Item                                                 | Reason                                                                                                                                                                                              | Follow-up                                                          |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| "Set aside / Pick back up" button in FocusModeScreen | Lives in Focus rebuild (#377)                                                                                                                                                                       | #377                                                               |
| "Set aside" breakdown count on Timeline              | Lives in Timeline assembly (#378)                                                                                                                                                                   | #378                                                               |
| `paused` colour token (`journey-step-paused-bg/fg`)  | The `stepStateColorMap.ts` already uses an `accentPurpleLight` fallback with a `TODO(#406-follow-up)` comment; token is a design-system issue                                                       | Follow-up design-tokens issue (referenced in stepStateColorMap.ts) |
| StatusBadge "paused" variant for `TimelineStep`      | `statusToVariant` maps paused → `"locked"` as a placeholder; a dedicated variant would need new StatusBadge/i18n work                                                                               | #378 or follow-up                                                  |
| FocusModeScreen `uiSteps` mapping for `paused`       | Currently maps `row.status === StepStatus.completed` → `"completed"`, else position-based `"in-progress"` or `"pending"`. Adding `"paused"` UI rendering belongs to #377 which owns FocusModeScreen | #377                                                               |

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->
