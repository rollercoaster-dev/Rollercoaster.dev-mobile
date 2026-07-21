# Development Plan: Issue #454

## Issue Summary

**Title**: Schema: step dependency + due-date fields to back the C·B band
**Type**: enhancement
**Complexity**: SMALL
**Estimated Lines**: ~150 lines

## Intent Verification

Observable criteria derived from the issue's scope and acceptance intent.

- [ ] `updateStep` can set `afterStepId`, `waitingOnLabel`, `waitingOnExpectedAt`, and `dueAt` independently (each field updates without touching the others), and can clear each back to `null`.
- [ ] A step with all four new fields `null` (every existing row, pre- and post-migration) round-trips through `stepsByGoalQuery` unchanged — no migration file, no backfill, existing `queries.step.test.ts` assertions keep passing untouched.
- [ ] `resolveStepDependencyBand(step, goalSteps)` returns all-`null` fields for a step with no dependency/date data — i.e. there is nothing for a future band to render, matching "hidden while empty, nothing changes visually until data exists."
- [ ] `resolveStepDependencyBand` resolves a non-null `afterStepId` to the referenced sibling's `title` when that sibling is present in `goalSteps`; returns `afterStepTitle: null` when the id isn't found (e.g. the referenced step was soft-deleted).
- [ ] `bun run type-check`, `bun run lint`, and `bun run test --testPathPatterns queries.step` all pass with no new failures.

## Dependencies

| Issue | Title                                             | Status                      | Type                                                 |
| ----- | ------------------------------------------------- | --------------------------- | ---------------------------------------------------- |
| #417  | `[Foundation]` Add `paused` step status           | ✅ Closed                   | Prior art (same additive-column pattern)             |
| #407  | `[Storybook]` Timeline metadata band + substeps   | ✅ Closed                   | Consumer (story-only today)                          |
| #408  | `[Storybook]` Focus Mode — Current Task Card view | ✅ Closed                   | Consumer (story-only today)                          |
| #378  | `[Integrate]` Timeline assembly                   | Open                        | Downstream (this issue unblocks it, not the reverse) |
| #377  | `[Integrate]` Focus Mode rebuild                  | Open (split into #466/#467) | Downstream                                           |

**Status**: ✅ All dependencies met. The issue body names #378/#377 as consumers this schema unblocks, not as prerequisites — no "Blocked by"/"Depends on" marker is present in the issue body. No blockers found via `gh issue view`.

## Objective

Add four additive, nullable Evolu columns to the `step` table — `afterStepId` (intra-goal dependency), `waitingOnLabel` + `waitingOnExpectedAt` (external blocker + optional expected date), `dueAt` (due date) — plus a pure query-layer helper that resolves them into the exact shape the already-built `TimelineStep` (#407) and `FocusCurrentTaskCard` (#408) components expect for their C·B metadata band. No authoring UI, no display-string formatting, no urgency framing — schema + queries only, per the issue's explicit scope.

## Decisions

| ID  | Decision                                                                                                                                                                                                                                                                  | Alternatives Considered                                                                                      | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Four separate typed columns (`afterStepId: nullOr(StepId)`, `waitingOnLabel: nullOr(NonEmptyString1000)`, `waitingOnExpectedAt: nullOr(DateIso)`, `dueAt: nullOr(DateIso)`) rather than one JSON blob                                                                     | A single `dependencyMeta: nullOr(NonEmptyString)` JSON column (mirrors `plannedEvidenceTypes`)               | Matches the existing convention for scalar facts (`parentStepId`, `completedAt`) over the JSON-blob convention (used only for the variable-length `plannedEvidenceTypes` array). Typed columns let Kysely filter/sort on `dueAt` directly if a future issue needs "steps due soon" — a JSON blob would block that without an app-level scan.                                                                                                                                 |
| D2  | No migration file / no backfill                                                                                                                                                                                                                                           | Drizzle-style `ALTER TABLE` migration                                                                        | Same reasoning as `parentStepId` (#290) and `paused` (#417): Evolu stores rows as a schemaless blob, so existing rows simply read the four new columns as `null`. Documented inline in `schema.ts` next to the new fields, same as the two prior additive columns.                                                                                                                                                                                                           |
| D3  | The query layer returns **raw** data — the resolved sibling `title` (string \| null) and the raw `DateIso` values — not the final display strings (`"waiting on X · expected Jun 24"`, `"due Jun 12"`) that `TimelineStep`/`FocusCurrentTaskCard` already accept as props | Build the exact `{ afterStep?: string; waitingOn?: {who,expected}; dueDate?: string }` prop shape in this PR | **Precedent-dictated, not an open question.** `completedAt` (schema.ts:122) is stored and returned as raw `DateIso` in `GroupedStep`; the query layer's established convention is to return raw data and let screens format. No date-formatting utility exists in the codebase (`grep`'d — none), so introducing one is locale/a11y-sensitive presentation work that belongs with the screen wiring that consumes it (#377/#378). Matches the "schema + queries only" scope. |
| D4  | Dependency-title resolution is a **pure function** (`resolveStepDependencyBand(step, goalSteps)`) over an already-fetched flat step array, not a new SQL join/query                                                                                                       | A dedicated Kysely self-join query joining `step` to itself on `afterStepId`                                 | Every consumer of this data (#378 Timeline, and #407/#408 before it) already fetches the full per-goal step list via `stepsByGoalQuery`. A pure lookup avoids a second round-trip and matches the codebase's existing pure-helper convention (`groupStepsByParent`, `resolveNextActionableStep`, `areAllStepsComplete` — all operate on already-fetched rows, not fresh queries).                                                                                            |
| D5  | Write path is exposed by extending the existing generic `updateStep(id, fields)` with four new optional keys — no dedicated `setAfterStep`/`setDueDate` mutations                                                                                                         | New named mutation functions per field (mirroring `pauseStep`/`resumeStep`)                                  | There is no authoring UI to call a dedicated mutation from yet (explicit "must not do"). Adding the fields to `updateStep`'s existing optional-field pattern (same as `parentStepId`, `plannedEvidenceTypes`) keeps the write surface minimal now and leaves the eventual Set B/C authoring epic a single existing call to reach for, rather than new API surface invented speculatively today.                                                                              |
| D6  | `updateStep` does **not** validate that `afterStepId` points at a sibling in the same goal, or guard against self-reference / cycles                                                                                                                                      | Validate goal-match and reject self-reference in this PR                                                     | **Precedent-dictated, not an open question.** `parentStepId` is the exact analog and it is unguarded — queries.ts:611 explicitly states the structural constraint is "the caller's responsibility." No caller exists yet that could supply an invalid value (no authoring UI in this milestone). Structural guards belong with the future Set B/C authoring epic that actually produces the data.                                                                            |

## Affected Areas

- `apps/native-rd/src/db/schema.ts`: Add `afterStepId`, `waitingOnLabel`, `waitingOnExpectedAt`, `dueAt` to the `step` table definition (after `plannedEvidenceTypes`), each `nullOr(...)`, with a doc comment following the `parentStepId`/`paused` additive-column precedent.
- `apps/native-rd/src/db/queries.ts`:
  - Extend `updateStep`'s `fields` parameter type and body with the four new optional keys (pass-through pattern matching `parentStepId`/`ordinal`).
  - Add `afterStepId`, `waitingOnLabel`, `waitingOnExpectedAt`, `dueAt` to the `GroupedStep` interface (the shape #378's Timeline assembly will consume) so `groupStepsByParent`/`flattenGroupedSteps` callers get the fields for free via the existing `selectAll()`-backed `stepsByGoalQuery`.
  - Add `resolveStepDependencyBand(step, goalSteps)` — a pure function returning `{ afterStepTitle: string | null; waitingOnLabel: string | null; waitingOnExpectedAt: string | null; dueAt: string | null }`.
- `apps/native-rd/src/db/index.ts`: Export `resolveStepDependencyBand` (and its return type) alongside the existing `queries.ts` re-exports.
- `apps/native-rd/src/db/__tests__/queries.step.test.ts`: Add coverage for the `updateStep` field extensions and `resolveStepDependencyBand`.

## Implementation Plan

### Step 1: Add the four schema columns

**Files**: `apps/native-rd/src/db/schema.ts`
**Commit**: `feat(db): add step dependency and due-date columns to schema`
**Changes**:

- [ ] Add `afterStepId: nullOr(StepId)` to the `step` table, with a doc comment: intra-goal dependency reference (#454), additive/no migration, same pattern as `parentStepId`.
- [ ] Add `waitingOnLabel: nullOr(NonEmptyString1000)` — free-text external blocker label.
- [ ] Add `waitingOnExpectedAt: nullOr(DateIso)` — optional expected-resolution date for the external wait; only meaningful alongside `waitingOnLabel`, but not enforced at the schema level (matches the app's existing "nullable fields aren't cross-validated in the schema" precedent, e.g. `evidence.goalId`/`stepId`).
- [ ] Add `dueAt: nullOr(DateIso)` — due date.
- [ ] Import `DateIso` from `@evolu/common` (already imported for `dateToDateIso` — confirm the type import is present alongside it; `schema.ts` currently imports `DateIso` for `completedAt` already, so no new import line is expected).

### Step 2: Extend `updateStep` and `GroupedStep`

**Files**: `apps/native-rd/src/db/queries.ts`
**Commit**: `feat(db): support dependency and due-date fields in updateStep`
**Changes**:

- [ ] Add `afterStepId?: StepId | null`, `waitingOnLabel?: string | null`, `waitingOnExpectedAt?: string | null`, `dueAt?: string | null` to `updateStep`'s `fields` parameter type.
- [ ] In the body, pass each through when `!== undefined` (mirrors the existing `parentStepId` block at queries.ts:707-709 — `undefined` means "don't touch", `null` means "clear"). `waitingOnLabel` needs `NonEmptyString1000.orNull(...)` validation/trim when non-null, matching `title`'s pattern; empty-string input clears to `null` rather than throwing (the field is optional, unlike `title`).
- [ ] Add the same four fields to the `GroupedStep` interface (after `plannedEvidenceTypes`), each typed `string | null` (Evolu's `selectAll()` nullability convention already documented on the interface).

### Step 3: Add `resolveStepDependencyBand`

**Files**: `apps/native-rd/src/db/queries.ts`, `apps/native-rd/src/db/index.ts`
**Commit**: `feat(db): add resolveStepDependencyBand query helper`
**Changes**:

- [ ] Add an exported `StepDependencyBand` interface: `{ afterStepTitle: string | null; waitingOnLabel: string | null; waitingOnExpectedAt: string | null; dueAt: string | null }`.
- [ ] Add `resolveStepDependencyBand(step: StepDependencyRowLike, goalSteps: readonly StepDependencyRowLike[]): StepDependencyBand` near `groupStepsByParent` — looks up `step.afterStepId` in `goalSteps` by `id` and reads its `title`; passes `waitingOnLabel`/`waitingOnExpectedAt`/`dueAt` straight through. Document that this is deliberately **not** the final band display strings (see D3) — callers (#377/#378) format dates and assemble the "waiting on X · expected Y" / "due Z" text.
- [ ] Export `resolveStepDependencyBand` and `StepDependencyBand` from `apps/native-rd/src/db/index.ts`.

### Step 4: Tests

**Files**: `apps/native-rd/src/db/__tests__/queries.step.test.ts`
**Commit**: `test(db): cover step dependency and due-date fields`
**Changes**:

- [ ] `updateStep` round-trip cases: setting each of the four fields individually calls `evolu.update` with only that key present (plus `id`); setting a field to `null` clears it; omitting a field (`undefined`) leaves it out of the update payload entirely (existing convention for optional-field tests in this file).
- [ ] `waitingOnLabel` validation case: an empty/whitespace string clears to `null` rather than throwing (distinct from `title`, which throws on empty).
- [ ] `resolveStepDependencyBand` cases via `test.each`:
  - all four DB fields `null` → all four result fields `null`.
  - `afterStepId` pointing at a present sibling in `goalSteps` → `afterStepTitle` is that sibling's `title`.
  - `afterStepId` pointing at an id absent from `goalSteps` (soft-deleted/orphaned) → `afterStepTitle: null`.
  - `waitingOnLabel` set without `waitingOnExpectedAt` → `waitingOnExpectedAt: null` passes through unchanged (no forced pairing).
  - `dueAt` set alone (no dependency data at all) → only `dueAt` is non-null in the result.

## Testing Strategy

- [ ] Unit tests only — no render tests (no UI introduced). Jest 30, mirrors `src/db/queries.ts` structure per project convention.
- [ ] Test file: `apps/native-rd/src/db/__tests__/queries.step.test.ts` (existing file — extend, don't create a new one).
- [ ] Use `test.each` for the `resolveStepDependencyBand` cases (consistent with the existing `resolveNextActionableStep` block in the same file).
- [ ] Run: `bun run test --testPathPatterns queries.step`.
- [ ] Run: `bun run type-check` and `bun run lint`.
- [ ] Manual testing: none applicable — no UI surface changes.

## Not in Scope

| Item                                                                                                     | Reason                                                                                                                    | Follow-up                   |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Authoring UI (date picker, dependency/sibling picker, "waiting on" text entry)                           | Explicit "must not do" in the issue — belongs to the future Set B/C authoring epic (ADR-0010/0012-bound)                  | Future epic (not yet filed) |
| Display-string formatting ("waiting on X · expected Jun 24", "due Jun 12") from raw `DateIso`/title data | No date-formatting utility exists in the codebase yet; this is presentation logic tied to the screens that render it (D3) | #377, #378                  |
| Wiring `TimelineStep` (#407) / `FocusCurrentTaskCard` (#408) props to real query data                    | Both are story-only today by design; wiring is explicitly owned by the Timeline/Focus integration issues                  | #378, #377 (#466/#467)      |
| Validating `afterStepId` is same-goal / not self-referential / acyclic                                   | No authoring UI exists yet to produce an invalid value (D6)                                                               | Future authoring epic       |
| Overdue/urgency framing, red dates, badge counts on due dates                                            | Explicit hard "must not do" in the issue — dates inform, never alarm                                                      | none                        |

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->
