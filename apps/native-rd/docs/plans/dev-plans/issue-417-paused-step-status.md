# Development Plan: Issue #417

## Issue Summary

**Title**: [Foundation] Add `paused` step status + Set aside / Pick back up
**Type**: enhancement
**Complexity**: SMALL
**Estimated Lines**: ~280 lines

## Intent Verification

Observable criteria derived from the issue acceptance criteria:

- [x] When a step is paused via `pauseStep(id)`, the write sets `status === "paused"`. _Asserted_ by the `pauseStep` unit test (`evolu.update("step", { id, status: StepStatus.paused })`); `updatedAt` is auto-stamped by Evolu on every write (#381 D2).
- [x] When a paused step is resumed via `resumeStep(id)`, the step's `status` returns to `"pending"` and `completedAt` is left untouched (expected null under the invariant that only non-completed steps can be paused). _Asserted_ status by the `resumeStep` unit test; `resumeStep` intentionally omits `completedAt` from the update payload — it never set it (D2), so there is nothing to clear.
- [x] `resolveNextActionableStep` given a flat list `[paused, pending]` returns `{ kind: "flat", index: 1 }`. _Asserted_ — "paused first, pending second" case.
- [x] `resolveNextActionableStep` given a list where the only non-completed step is paused returns `{ kind: "none" }`. _Asserted_ — "paused-only flat → none" and "all completed or paused → none" cases.
- [x] A goal with a paused step and all other steps completed does **not** show the "Mark complete" affordance in FocusModeScreen. _Verified by inspection_ — `allStepsComplete` (FocusModeScreen.tsx:313-315) is `.every(=== completed)`; paused fails it, so `canMarkComplete` is false. Locked by the D6 contract test.
- [x] Progress ratio in `buildCockpitGoal` treats paused steps as part of the denominator — 2 completed + 1 paused shows `2/3`. _Verified by inspection_ — `buildCockpitGoal` (GoalsScreen.tsx:61-65) numerator = `=== completed`, denominator = `steps.length` (paused rows are non-deleted, so counted). No code change needed (D5).
- [x] `bun run type-check`, `bun run lint`, and `bun run test` all pass with no new failures. _Verified_ — type-check 4/4, lint clean, full suite 9264/9264.
- [x] No new UI affordances are introduced (no new screen components, no new props on existing screens). _Verified_ — diff is schema/types/queries/tests + two exhaustiveness `Record` entries + the `NodeStatus` → `StepStatus` collapse; no new components, props, or screens.

## Dependencies

| Issue  | Title                                  | Status | Type |
| ------ | -------------------------------------- | ------ | ---- |
| (none) | This is order:1 — no declared blockers | —      | —    |

**Status**: All dependencies met. Issues #406, #377, #378 are listed as things this issue **unblocks**, not as prerequisites.

## Objective

Add `paused` as a persisted `StepStatus` value in the DB schema and the UI type, plus two mutations (`pauseStep` / `resumeStep`). Update `resolveNextActionableStep` to skip paused steps. State and test the progress-counting and goal-completion rules. No UI changes.

## Decisions

| ID  | Decision                                                                                                | Alternatives Considered               | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | No migration file required                                                                              | Drizzle migration, SQLite ALTER TABLE | Evolu stores all columns as a schemaless JSON blob internally; new enum values are additive, existing rows keep their existing string values (`"pending"`/`"completed"`). The `parentStepId` column was added the same way (see `schema.ts:111` comment). No `ALTER TABLE` or migration file needed.                                                                                                                                                                                                                                         |
| D2  | `pauseStep` / `resumeStep` naming                                                                       | `setAsideStep` / `pickUpStep`         | Mirrors the existing `completeStep` / `uncompleteStep` verb pattern. The UI label "Set aside / Pick back up" lives in #377/#408; the mutation name can be more terse.                                                                                                                                                                                                                                                                                                                                                                        |
| D3  | `resolveNextActionableStep` skips paused exactly like completed for purposes of the child-pending check | Treat paused as pending in child scan | The child-pending scan at line 517 (`c.status !== StepStatus.completed`) must also skip paused children to avoid surfacing a paused child as the next action. The parent-level skip at line 526 (`step.status === StepStatus.completed`) must also skip `paused`. Both sites updated.                                                                                                                                                                                                                                                        |
| D4  | `isPendingStep` stays pending-only (not updated to include paused)                                      | Add paused to isPendingStep           | `isPendingStep` is used in FocusModeScreen's auto-advance logic (line 425) to find the next card to snap to after completing a step. Paused steps should not be auto-advanced to — they were deliberately set aside. The issue text also explicitly says "`isPendingStep` at `:346` stays pending-only."                                                                                                                                                                                                                                     |
| D5  | Progress denominator includes paused                                                                    | Exclude paused from denominator       | `buildCockpitGoal` (GoalsScreen.tsx:61-65) counts `steps.length` as the total. Paused steps count in the denominator — set-aside ≠ deleted. Only `completed` steps count toward the numerator. This matches the issue recommendation and preserves the every-unit rule (#292). No code change needed in `buildCockpitGoal` since it already uses `steps.length` (non-deleted) as the denominator — `paused` rows are non-deleted so they are naturally included.                                                                             |
| D6  | Goal completion requires every step `=== StepStatus.completed` — paused blocks it                       | Allow paused to not block             | `FocusModeScreen` line 313-315: `allStepsComplete = stepRows.every(s => s.status === StepStatus.completed)`. A paused step has `status === "paused"` which fails this check, so the `canMarkComplete` gate already blocks completion with a paused step — no behavior change. To make the contract test assert production logic (not a copy of the rule), the inline `.every` was extracted to a shared `areAllStepsComplete(rows)` predicate in `queries.ts` that FocusModeScreen now calls; the test asserts that helper (PR #433 review). |
| D7  | Steps 1 + 2 land in one commit, not two                                                                 | Keep the plan's two separate commits  | The husky pre-commit hook runs a full `bun run type-check`. Adding `paused` to `StepStatus` without updating its exhaustive `Record<StepStatus>` consumers (TimelineStep) leaves the tree non-compiling, so a Step-1-only commit can't pass the hook. The two are one atomic, buildable unit; the commit message documents both halves.                                                                                                                                                                                                      |

## Affected Areas

- `apps/native-rd/src/db/schema.ts`: Add `paused: NonEmptyString1000.orThrow("paused")` to `StepStatus` (line 43-46).
- `apps/native-rd/src/types/steps.ts`: Add `"paused"` to the UI `StepStatus` union. Collapse the `TimelineNode.tsx` `NodeStatus = StepStatus | "paused"` workaround into just `StepStatus` (with a follow-up note — see Not in Scope).
- `apps/native-rd/src/db/queries.ts`: Add `pauseStep` and `resumeStep` functions (mirror `completeStep` / `uncompleteStep`). Update `resolveNextActionableStep` at lines 517-526 to skip `paused` in both the child-scan and the top-level loop. Add the `areAllStepsComplete(rows)` predicate (the data-layer rule behind FocusModeScreen's "Mark complete" gate — see D6).
- `apps/native-rd/src/db/index.ts`: Export `pauseStep`, `resumeStep`, and `areAllStepsComplete`.
- `apps/native-rd/src/screens/FocusModeScreen/FocusModeScreen.tsx`: Replace the inline `allStepsComplete` `.every` with a call to the shared `areAllStepsComplete` predicate (behavior-identical; lets the D6 contract test assert production logic — see D6).
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

- [x] In `schema.ts`, add `paused: NonEmptyString1000.orThrow("paused")` to the `StepStatus` const (after `pending`, before `completed`). Update the JSDoc comment.
- [x] In `types/steps.ts`, add `"paused"` to the `StepStatus` union type. Update the comment to reflect that `paused` is now persisted (not UI-derived).
- [x] Run `bun run type-check` — TypeScript surfaced exactly the two predicted gaps: `TimelineStep.tsx` `statusToVariant` (41) and `statusToLabelKey` (47). `ProgressDots`/`MiniTimeline` use individual `=== "completed"` checks (not exhaustive), so they did not break.

### Step 2: Fix `Record<StepStatus>` exhaustiveness gaps

**Files**:

- `apps/native-rd/src/components/TimelineStep/TimelineStep.tsx`
- `apps/native-rd/src/components/TimelineNode/TimelineNode.tsx`

**Commit**: `fix(components): add paused branch to StepStatus Record maps`

**Changes**:

- [x] In `TimelineStep.tsx`, add `"paused": "locked"` to `statusToVariant` (paused step shows as locked/not-yet-actionable badge variant — same as pending; a follow-up can refine once the #406-follow-up design token lands).
- [x] In `TimelineStep.tsx`, add `"paused": "pending"` to `statusToLabelKey` (for now; the label key mapping can be a dedicated `"paused"` key once the StatusBadge vocabulary expands in a later issue).
- [x] In `TimelineNode.tsx`, remove the `// TODO: collapse into StepStatus once the data layer supports paused.` workaround: delete the local `type NodeStatus = StepStatus | "paused"` declaration and replace the `NodeStatus` usage with `StepStatus` directly.

### Step 3: Add `pauseStep` / `resumeStep` mutations

**Files**:

- `apps/native-rd/src/db/queries.ts`
- `apps/native-rd/src/db/index.ts`

**Commit**: `feat(db): add pauseStep and resumeStep mutations`

**Changes**:

- [x] Add `pauseStep(id: StepId)` function after `uncompleteStep`. Pattern: `evolu.update("step", { id, status: StepStatus.paused })`. No `completedAt` manipulation — paused steps were never completed. Bumps `updatedAt` automatically (Evolu stamps it on every write — this satisfies the cockpit recency ranking rule, #381 D2). Breadcrumb uses the shared `"toggle"` verb (see Discovery Log 2026-06-30 16:12).
- [x] Add `resumeStep(id: StepId)` function immediately after `pauseStep`. Pattern: `evolu.update("step", { id, status: StepStatus.pending })`. Mirrors the breadcrumb + error-handling shape of `uncompleteStep`.
- [x] Export both from `src/db/index.ts`.

### Step 4: Update `resolveNextActionableStep` to skip paused

**Files**:

- `apps/native-rd/src/db/queries.ts`

**Commit**: `fix(db): resolveNextActionableStep skips paused steps`

**Changes**:

- [x] Child-pending scan (queries.ts:517): `c.status !== StepStatus.completed` → `&& c.status !== StepStatus.paused`. A paused child is not the next action.
- [x] Top-level skip (queries.ts:526): `if (step.status === StepStatus.completed) continue;` → also `|| step.status === StepStatus.paused`. A paused top-level step is skipped, surfacing the next pending one.
- [x] Updated the JSDoc for `resolveNextActionableStep` to state that paused steps are skipped along with completed ones. Edge case left to #377/#378 — see Not in Scope.

### Step 5: Tests

**Files**:

- `apps/native-rd/src/db/__tests__/queries.step.test.ts`

**Commit**: `test(db): resolver skips paused; pauseStep/resumeStep round-trip; goal completion blocked by paused`

**Changes**:

- [x] Added `resolveNextActionableStep` regression cases to the existing `test.each` block (alongside the #337 leaf/invite/flat cases):
  - `"paused-only flat → none"`: single paused flat step → `{ kind: "none" }`
  - `"paused first, pending second → skips paused, returns pending"`: `[paused-flat, pending-flat]` → `{ kind: "flat", index: 1 }`
  - `"paused child skipped, next pending child returned"`: parent with one paused child and one pending child → `{ kind: "leaf", index: 2, parentIndex: 0 }`
  - `"all steps completed or paused → none"`: mix of `completed` and `paused` rows → `{ kind: "none" }`
- [x] Added a `describe("pauseStep / resumeStep (#417)")` block:
  - `pauseStep` calls `evolu.update` with `status: StepStatus.paused`, the correct `id`, and no `completedAt` key.
  - `resumeStep` calls `evolu.update` with `status: StepStatus.pending` and the correct `id`.
- [x] Added a `describe("goal completion semantics — paused blocks completion (D6)")` block asserting the production predicate `areAllStepsComplete` (extracted to `queries.ts` and now called by FocusModeScreen's `allStepsComplete` gate, replacing the inline `.every`): `false` when any step is `paused` or the list is empty, `true` when all are completed. Testing the shared helper — not a re-implementation — keeps the contract honest if the gate's rule changes. No render needed.

## Testing Strategy

- [x] Unit tests only — no render tests (no UI introduced).
- [x] Test file: `src/db/__tests__/queries.step.test.ts` (mirrors `src/db/queries.ts` structure).
- [x] Use `test.each` for the new resolver cases (consistent with the existing block).
- [x] Run: `bun run test --testPathPatterns queries.step` — 67 passed.
- [x] Run: `bun run test --testPathPatterns queries` — 166 passed (6 suites).
- [x] Run: `bun run type-check` — no remaining exhaustiveness gaps.
- [x] Run: `bun run lint` — no new lint errors.
- [x] Manual: full `bun run test` suite — see Phase 4 final validation.

## Not in Scope

| Item                                                                        | Reason                                                                                                                                                                                                                                                                                                                                                                                                                                     | Follow-up                                                          |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| "Set aside / Pick back up" button in FocusModeScreen                        | Lives in Focus rebuild (#377)                                                                                                                                                                                                                                                                                                                                                                                                              | #377                                                               |
| "Set aside" breakdown count on Timeline                                     | Lives in Timeline assembly (#378)                                                                                                                                                                                                                                                                                                                                                                                                          | #378                                                               |
| `paused` colour token (`journey-step-paused-bg/fg`)                         | The `stepStateColorMap.ts` already uses an `accentPurpleLight` fallback with a `TODO(#406-follow-up)` comment; token is a design-system issue                                                                                                                                                                                                                                                                                              | Follow-up design-tokens issue (referenced in stepStateColorMap.ts) |
| StatusBadge "paused" variant for `TimelineStep`                             | `statusToVariant` maps paused → `"locked"` as a placeholder; a dedicated variant would need new StatusBadge/i18n work                                                                                                                                                                                                                                                                                                                      | #378 or follow-up                                                  |
| FocusModeScreen `uiSteps` mapping for `paused`                              | Currently maps `row.status === StepStatus.completed` → `"completed"`, else position-based `"in-progress"` or `"pending"`. Adding `"paused"` UI rendering belongs to #377 which owns FocusModeScreen                                                                                                                                                                                                                                        | #377                                                               |
| `invite` state when a pending parent's only non-completed child is `paused` | The resolver still returns `{ kind: "invite" }` for a pending parent whose children are all `completed`-or-`paused` (no pending child). Whether "all substeps done" should read as invite when one is merely set-aside is a UI-semantics call. The UI that can create a paused sub-step doesn't exist until #377/#378, which own FocusMode/Timeline rendering. Left unchanged here to keep the resolver change to the two specified sites. | #377/#378                                                          |

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->

- [2026-06-30 16:08] Merged Step 1 + Step 2 into a single commit (`feat(db): add paused to StepStatus enum and UI type`). The husky `prepare-commit-msg`/pre-commit chain runs a full `bun run type-check`, so a Step-1-only commit (union member added, exhaustive `Record<StepStatus>` consumers not yet updated) would fail to commit. Adding the union member and fixing its consumers are inseparable as a buildable unit. See decision D7.
- [2026-06-30 16:12] Step 3: `breadcrumb({ category: "step", message: ... })` rejects `"pause"`/`"resume"` — the `step` category's message union is `"create" | "update" | "delete" | "reorder" | "toggle"` (sentry-report.ts:130), and `"defer"` belongs to the `appstate` category only. Per the convention comment at sentry-report.ts:125, step state-flips share the single `"toggle"` breadcrumb (as complete/uncomplete do), so both mutations use `"toggle"`. No breadcrumb-enum expansion needed (out of scope).
