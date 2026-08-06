# Development Plan: Issue #536

## Issue Summary

**Title**: [Fix] Resolver: a paused child must not read as done — split `invite` from `parked` (#533 F2)
**Type**: bug
**Complexity**: SMALL
**Estimated Lines**: ~130 lines

## Intent Verification

- [ ] `resolveNextActionableStep` returns `{ kind: "invite" }` for a pending parent **only when every child is `completed`**.
- [ ] `resolveNextActionableStep` returns `{ kind: "parked" }` for a pending parent whose non-completed children are all `paused` (all-paused, or a completed+paused mix) — never `invite`.
- [ ] A pending child still wins over everything, including under a completed parent — unchanged, pinned by the existing test at `queries.step.test.ts` and the guardrail at `queries.guardrails.test.ts:42-49`.
- [ ] Paused steps still never surface as the next action — `queries.step.test.ts`'s existing paused-skip cases keep passing unmodified.
- [ ] `GoalsScreen`, `TimelineJourneyScreen`, `FocusModeScreen` all compile against the 5-member `NextActionableStep` union through one shared exhaustiveness-checked helper, not three independent re-derivations.
- [ ] `areAllStepsComplete`'s docstring no longer claims it gates `FocusModeScreen`'s "Mark complete" — it names its actual sole consumer (`TimelineJourneyScreen` → `FinishLine` → `TimelineNode`'s `celebrate` prop).

## Dependencies

| Issue | Title                                                               | Status                       | Type                                                     |
| ----- | ------------------------------------------------------------------- | ---------------------------- | -------------------------------------------------------- |
| #535  | ADR-0014: containment offers, never asserts, never refuses          | ✅ Met (closed, merged #543) | Sequential ("land after")                                |
| #533  | Research: parent ↔ sub-step containment semantics                   | ✅ Met (closed, merged #539) | Soft (source of F2 finding)                              |
| #417  | Foundation: `paused` step status + Set aside / Pick back up         | ✅ Met (closed)              | Soft (named the deferral this issue resolves)            |
| #466  | Focus Mode rebuild 1/2 — strip old chrome + mount Current Task Card | ✅ Met (closed)              | Soft (expired #417's deferral precondition)              |
| #292  | Goal-card next-step resolution + FocusMode/MiniTimeline             | ✅ Met (closed)              | Soft (owns the every-unit progress rule, untouched here) |
| #378  | Timeline assembly — reconciled nodes + metadata + FinishLine        | ✅ Met (closed)              | Soft (mentioned as related, not touched)                 |

**Status**: ✅ All dependencies met. No blockers.

## Objective

Split the resolver's overloaded "is any child still pending?" predicate into two questions it currently conflates: what to offer next (skip `paused`, unchanged) vs. whether the subtree is actually finished (`paused` must not count as done). `invite` narrows to require every child `completed`; a pending parent whose non-completed children are all `paused` gets a new, distinct resolver kind — `parked` — so the dishonest "all parts done, want to close this?" copy can never appear over steps that were merely set aside. Also correct `areAllStepsComplete`'s stale docstring per #533 D4.

## Decisions

| ID  | Decision                                                                                                                                                                                                                                                                                     | Alternatives Considered                                                                                                          | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | New kind is named `parked` (literal `kind: "parked"`), not `invite`.                                                                                                                                                                                                                         | `"setAsideParent"`, `"allPaused"`, reusing `invite` with a flag.                                                                 | Research doc explicitly recommends reusing the `parked` name (§F2 "The `parked` collision"): "the parent-level case is the same concept scoped to a subtree" as the existing goal-level `focusMode:parked.*` state. ADR-0014's containment table independently describes the same case as "a distinct non-actionable state." No new i18n keys are introduced by this change (see D5/Not in Scope), so the i18n-namespace half of the naming note doesn't need resolving yet — only the resolver-kind name does.                                                                  |
| D2  | `invite` requires `children.every(c => c.status === StepStatus.completed)`; anything else with `children.length > 0` and no pending child is `parked`.                                                                                                                                       | Compute `pausedCount` and require `pausedCount === children.length` for `parked` (i.e. treat a completed+paused mix as neither). | The predicate already established that a mix must not be `invite` (issue: "mixed completed+paused → new kind" is an explicit acceptance case). Since `pendingChild` already filters out anything that isn't `completed`/`paused`, by the time we reach this branch every child is one of those two — so "not all completed" ⇔ "at least one paused" ⇔ `parked`. No third bucket exists to assign a completed+paused mix to.                                                                                                                                                      |
| D3  | `parked.childCount` is the total number of children (`children.length`), mirroring `invite.childCount`'s field shape exactly (same type, same position in the returned object).                                                                                                              | Add a `pausedCount` field distinguishing how many are set aside.                                                                 | `invite.childCount` is documented as "how many are done," which for `invite` always equals `children.length` (all are done, by the new D2 rule). For `parked` there is no existing consumer that reads a paused-specific count — `StepOverviewCard` (the surface that will eventually render this state, per #537) already takes the full child-row array, not a resolver-computed count. Keeping the field shape identical avoids inventing a number nothing consumes yet; #537/#538 can add a paused-specific figure if a concrete copy need appears.                          |
| D4  | Consumers reach the new kind through one shared, exhaustiveness-checked helper (`resolveActionableIndex`, exported next to `resolveNextActionableStep` in `queries.ts`) rather than three independently rewritten ternaries.                                                                 | Add a local `switch` + `assertNever` in each of the three screen files.                                                          | Precedent at `queries.ts:565-568` already states the reason the bucketing itself is centralized: "Shared by FocusModeScreen ... and GoalsScreen ... so the leaf/invite/flat bucketing ... live[s] in one place (#337) rather than being copy-pasted into each screen." The same rationale applies to consuming the result. The codebase's existing exhaustiveness idiom is a local `assertNever(value: never): never` (see `EvidenceContent.tsx:69`, `ProofCard.tsx:57`, `guilloche.ts:370`) — this plan reuses that idiom once, inside `queries.ts`, instead of three times.    |
| D5  | No new i18n keys or UI copy are added in this issue.                                                                                                                                                                                                                                         | Add a placeholder `focusMode:currentTask.parked.*` (or similarly namespaced) key now so #537 doesn't have to.                    | The issue's own scope is the resolver + exhaustive consumption of its return value; rendering the parked state's copy is explicitly `#537`'s job ("Focus Mode stops discarding the resolver's structural return value" — ADR-0014 Consequences). Adding copy here without a mounted consumer risks guessing at namespacing before the UI that needs it exists. The `parked`/`focusMode:parked.*` naming collision the issue flags is deferred, undecided, to whichever of #537/#538 first needs a new key — flagged again below under Not in Scope so it isn't silently dropped. |
| D6  | `GoalsScreen`/`TimelineJourneyScreen`/`FocusModeScreen`'s three test-file "faithful copy" mocks of `resolveNextActionableStep` (each carries a `// Keep in sync with resolveNextActionableStep in src/db/queries.ts.` comment) are updated in lockstep with the production predicate change. | Leave the mocks alone since no acceptance criterion names them.                                                                  | The mocks exist specifically so each screen's tests exercise real leaf/invite/flat/parked bucketing instead of a stub (their own comments say so). Leaving them on the old predicate means the screens' test suites would keep asserting against pre-fix behavior — a correctness regression in the test suite itself, not just an omission.                                                                                                                                                                                                                                     |

## Affected Areas

- `src/db/queries.ts`: split the `invite`/new-kind predicate in `resolveNextActionableStep` (`:610-634`); add `"parked"` to the `NextActionableStep` union (`:557-561`) and its docstring (`:545-556`, `:563-583`); add exported `resolveActionableIndex` helper + local `assertNever`; correct `areAllStepsComplete`'s stale docstring (`:372-378`).
- `src/db/index.ts`: export the new `resolveActionableIndex` helper alongside `resolveNextActionableStep` (`:28`) and `NextActionableStep` (`:72`).
- `src/screens/GoalsScreen/GoalsScreen.tsx`: `buildCockpitGoal` (`:73-75`) — route through `resolveActionableIndex` instead of the inline `next.kind === "none" ? ...` ternary.
- `src/screens/TimelineJourneyScreen/TimelineJourneyScreen.tsx`: `findCurrentLeafId` (`:53-62`) — same swap; update its docstring's "as is the invite state" line to mention `parked`.
- `src/screens/FocusModeScreen/FocusModeScreen.tsx`: `resolveFocusStepId` (`:97-100`) — same swap.
- `src/screens/GoalsScreen/__tests__/GoalsScreen.test.tsx`: update the "faithful copy" `resolveNextActionableStep` mock (`:38-86`) to the new predicate (this mock currently doesn't even skip `paused` in `pendingChild` — bring it in line with the real function while touching it, per its own "keep in sync" comment).
- `src/screens/TimelineJourneyScreen/__tests__/TimelineJourneyScreen.test.tsx`: update its `resolveNextActionableStep` mock (`:117-167`) to the new predicate.
- `src/screens/FocusModeScreen/__tests__/FocusModeScreen.test.tsx`: update its `resolveNextActionableStep` mock (`:188-228`) to the new predicate.
- `src/db/__tests__/queries.step.test.ts`: add `test.each` cases for `parked` (all-paused, mixed completed+paused) to the existing `resolveNextActionableStep` describe block (`:490-605`).

## Implementation Plan

### Step 1: Split the resolver predicate and add the `parked` kind

**Files**: `src/db/queries.ts`, `src/db/index.ts`
**Commit**: `fix(native-rd): split invite from parked in resolveNextActionableStep`
**Changes**:

- [ ] Add `{ kind: "parked"; index: number; childCount: number }` to the `NextActionableStep` union.
- [ ] Update the union's docstring: "four states" → "five states"; add a `parked` bullet documenting it as a pending parent whose non-completed children are all `paused` — distinct from `invite`, `childCount` is the total child count.
- [ ] In `resolveNextActionableStep`, after the existing `pendingChild`/skip checks, replace the unconditional `invite` return with: if `children.length > 0`, branch on `children.every(c => c.status === StepStatus.completed)` → `invite` when true, `parked` when false; else `flat`.
- [ ] Update the function's docstring paragraph on paused steps to note the `parked` kind exists for the all-paused/mixed case, rather than implying that case always collapses to `none`.
- [ ] Add `export function resolveActionableIndex(result: NextActionableStep): number | null` next to `resolveNextActionableStep`, implemented as a `switch` over `result.kind` (`"none"` → `null`; `"leaf" | "invite" | "flat" | "parked"` → `result.index`) with a local `assertNever(value: never): never` default branch, matching the existing idiom in `EvidenceContent.tsx` / `ProofCard.tsx` / `guilloche.ts`.
- [ ] Correct `areAllStepsComplete`'s docstring (`:372-378`): remove the claim it backs `FocusModeScreen`'s "Mark complete" gate; state plainly it gates nothing and name its sole live consumer (`TimelineJourneyScreen` → `FinishLine` → `TimelineNode.celebrate`, a star colour), per #533 D4 / research §Correction.
- [ ] Export `resolveActionableIndex` from `src/db/index.ts` next to `resolveNextActionableStep`.

### Step 2: Route the three consuming surfaces through the shared helper

**Files**: `src/screens/GoalsScreen/GoalsScreen.tsx`, `src/screens/TimelineJourneyScreen/TimelineJourneyScreen.tsx`, `src/screens/FocusModeScreen/FocusModeScreen.tsx`
**Commit**: `fix(native-rd): consume resolveNextActionableStep exhaustively in all three surfaces`
**Changes**:

- [ ] `GoalsScreen.buildCockpitGoal`: replace `next.kind === "none" ? null : (steps[next.index]?.title ?? null)` with `resolveActionableIndex(next)` → index-or-null → title lookup.
- [ ] `TimelineJourneyScreen.findCurrentLeafId`: same swap for `result`; update its docstring's "as is the invite state (all children done, parent still open)" line to add "... or the parked state (all remaining children set aside)".
- [ ] `FocusModeScreen.resolveFocusStepId`: same swap for `actionable`.
- [ ] No behavior change intended for any of the three screens — a `parked` parent still surfaces its own row index exactly as `invite`/`flat`/`leaf` do today (deciding whether it _should_ look different is #537's job per ADR-0014 Consequences, not this issue's).

### Step 3: Update the three test-file resolver mocks

**Files**: `src/screens/GoalsScreen/__tests__/GoalsScreen.test.tsx`, `src/screens/TimelineJourneyScreen/__tests__/TimelineJourneyScreen.test.tsx`, `src/screens/FocusModeScreen/__tests__/FocusModeScreen.test.tsx`
**Commit**: `test(native-rd): sync screen resolveNextActionableStep mocks with the parked split`
**Changes**:

- [ ] Update each "faithful copy" mock's invite branch to the same `children.every(completed)` split, returning `"parked"` for the mixed/all-paused case.
- [ ] `GoalsScreen.test.tsx`'s mock currently doesn't skip `paused` in its `pendingChild` filter at all (no `paused` in its local `StepStatus` shim either) — bring it in line with the real resolver's paused-skip behavior while editing this mock, so it doesn't silently diverge further.
- [ ] No new test _cases_ required in this step (that's Step 4) — this step only keeps the mocks honest for whatever the existing screen tests already exercise.

### Step 4: Unit tests for the new kind

**Files**: `src/db/__tests__/queries.step.test.ts`
**Commit**: `test(native-rd): cover invite/parked split in resolveNextActionableStep`
**Changes**:

- [ ] Add `test.each` rows to the existing `resolveNextActionableStep` describe block: all-children-completed → `invite` (already covered by the existing "invite state" case — confirm, don't duplicate); all-children-paused → `parked`; mixed completed+paused children → `parked`; any pending child present → `leaf` (already covered — confirm).
- [ ] Confirm the existing guardrail test (`queries.guardrails.test.ts:27-40`, all children `completed`) still asserts `invite` — no change needed there, it's the case this fix preserves.

## Testing Strategy

- [ ] Unit tests for `resolveNextActionableStep`'s new branch in `src/db/__tests__/queries.step.test.ts` (Jest 30, `test.each`, mirrors existing fixture style).
- [ ] Existing `src/db/__tests__/queries.guardrails.test.ts` parity tests re-run unmodified and must keep passing (they lock the all-`completed` → `invite` case this fix doesn't touch).
- [ ] Screen-level suites (`GoalsScreen.test.tsx`, `TimelineJourneyScreen.test.tsx`, `FocusModeScreen.test.tsx`) re-run after their mock updates; no new screen-level assertions required since no screen behavior changes.
- [ ] Manual: not required — this is a pure data-layer branch with no new mounted UI.
- [ ] Run `bun run type-check` — the `resolveActionableIndex` `assertNever` branch is the mechanism that actually enforces "exhaustively matched" from the acceptance criteria; a compile pass is part of verifying it.

## Not in Scope

| Item                                                                                                                                             | Reason                                                                                                            | Follow-up                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Rendering a distinct `parked` card/state in Focus Mode (mounting `FocusCurrentTaskCard`'s missing parent variant, or reusing `FocusParkedState`) | ADR-0014 Consequences assigns this to "#537 (Focus Mode stops discarding the resolver's structural return value)" | #537                                          |
| Namespacing new i18n keys for the parent-level parked copy so they don't collide with `focusMode:parked.*` (goal-level)                          | No copy is added by this issue (D5) — the collision only matters once a key is actually written                   | #537 (or #538, whichever needs the first key) |
| The `parked` kind's `childCount` distinguishing "paused" from "completed" children                                                               | No current consumer reads that distinction (D3); `StepOverviewCard` already has full child rows                   | #537, if a concrete copy need appears         |
| F6 (parent completed + children pending is silently unaccounted for) — the cascade-down "parts offer"                                            | Named in ADR-0014 Consequences as `#538`'s job, not F2's                                                          | #538                                          |
| F4 (Timeline gaining step actions)                                                                                                               | ADR-0014/research verdict is "keep" as-is; no issue filed                                                         | none                                          |
| F5 (every-unit progress counting parents + children as peers)                                                                                    | Named, cited tradeoff (#292 R1); nothing here reopens it                                                          | none                                          |

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->
