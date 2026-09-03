# Development Plan: Issue #635

## Issue Summary

**Title**: [Bug] Badge can be minted for a goal with zero completed steps — and a required E2E flow depends on it
**Type**: bug
**Complexity**: MEDIUM
**Estimated Lines**: ~400 (code + tests + i18n), plus a rewrite of one ~150-line E2E flow

## Objective

A goal mints a badge whose evidence does not demonstrate the goal was done. Close that by giving the goal the **strict evidence tier steps already have**, and surface it at the Bake button so nobody dead-ends in an error alert.

## The actual defect (supersedes the issue's own framing)

Steps have **two tiers**. Goals have **one**.

| Level | Floor (data layer)                                                     | Strict tier (what the UI gates on)                                                 |
| ----- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Step  | `canCompleteStep` — _some_ planned type captured (`db/queries.ts:333`) | `completionReady` — _every_ planned type captured (`FocusCurrentTaskCard.tsx:156`) |
| Goal  | `canCompleteGoal` — ≥1 typed row **anywhere** (`db/queries.ts:362`)    | **does not exist**                                                                 |

`canCompleteStep`'s own docstring says it plainly: _"Callers must not treat a `true` here as 'the card would offer completion'; it only means completion is permitted."_ `canCompleteGoal` has no such warning and no tier above it — it is a one-line stub (`evidence.some((e) => e.type !== null)`) wearing a decided-looking name.

So a 6-step goal with **one text note on step 1 and every step untouched** mints a badge today. Merely surfacing `canCompleteGoal` earlier in the UI would leave that exact case minting — it would fix the dead-end, not the bug. This plan builds the missing tier.

## Intent Verification

- [ ] A goal whose steps have not had their planned evidence captured cannot bake: "Bake my badge" is disabled with an inline reason naming what is outstanding.
- [ ] The 6-step / one-note case from the issue is blocked (this is the case a `canCompleteGoal`-only fix leaves open).
- [ ] A goal whose every step has all planned types captured bakes normally through to the reveal stage.
- [ ] No code path anywhere reads `step.status` or `areAllStepsComplete` to decide whether baking is permitted — the gate is purely evidence-based (ADR-0014).
- [ ] `FocusCurrentTaskCard`'s "Mark complete" reveal behaves byte-identically to today after being refactored onto the shared predicate.
- [ ] `finish-line-cta` stays tappable at every progress level; `TimelineNode`'s `celebrate` prop is untouched.
- [ ] `e2e/flows/full-ride.yaml` passes unmodified.

## Dependencies

No `Blocked by` / `Depends on` / `After` markers in the issue body.

### Ordering against #636 (worktree `spot-marmoset`, plan-only, nothing implemented)

**#636 must land after this, and must drop one of its claims.** #636's plan asserts "No hard dependencies… #635 referenced, not a blocker." That is wrong in one direction:

|                                        | #636 assumes                                                                     | This plan does                                             |
| -------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| the `useCreateBadge` no-evidence throw | reachable via UI; needs quieter logging so LogBox stops eating the celebrate CTA | unreachable in the normal flow — Bake is disabled upstream |
| `bake-recovery.yaml` phases 1–2        | deliberately trip the gate _at bake time_                                        | impossible — the flow is rewritten here                    |
| the flow file                          | patched in place                                                                 | renamed and rewritten (D5)                                 |

**This plan owns the E2E flow rewrite.** #636 keeps its `BadgeGateError` + `logger.info` change on its own merits (an expected rejection should not page Sentry or raise a redbox from the backstop path) but drops the E2E rationale for it, and stays scoped to its two genuinely undiagnosed failures (`full-ride` Charlie step, `step-timing-editor` depends-on toggle).

## Decisions

| ID  | Decision                                                                                                                                               | Alternatives Considered                                                                                | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **The goal's strict tier is `completionReady`, lifted one level: every step has ≥1 planned type and every planned type captured.**                     | (a) Issue's "all steps complete + evidence". (b) Surface the existing `canCompleteGoal` floor earlier. | (a) reads `step.status`, which `ADR-0014-containment-offers-never-refuses.md` forbids in its own words: _"no code path gates a goal on its steps."_ (b) does not fix the reported bug — one note on one step still mints. D1 is evidence-only: it never asks whether a step is _marked_ complete, only whether its planned evidence exists. Structure decides what evidence is expected, which is exactly ADR-0014's § Decision (_"Evidence gates completion; structure only decides what is offered"_). It also needs no new concept — it is the predicate `FocusCurrentTaskCard` has enforced per-step since #497 D1.                                                                     |
| D2  | **Extract the strict per-step predicate to `db/queries.ts` as `isStepEvidenceComplete`, and refactor `FocusCurrentTaskCard.completionReady` onto it.** | Inline a second copy of the logic for the goal check.                                                  | The two-tier contract currently lives only in a docstring warning, which is precisely why three separate readers (the #635 issue author, the first research pass, #636) each reached a different verdict about what gates completion. One named, exported predicate replaces the warning. **Verified no behavior change**: the card derives readiness via `getMissingQuickEvidenceOptions`, which filters `EVIDENCE_CAPTURE_OPTIONS`; `types/evidence.ts:54` defines `EVIDENCE_CAPTURE_OPTIONS = EVIDENCE_OPTIONS` and `:15` defines `QuickEvidenceType = EvidenceTypeValue`, so every evidence type is a capture option and the raw-planned-types formulation is equivalent, not stricter. |
| D3  | **`isGoalEvidenceComplete(steps, stepEvidence)` requires at least one step**, mirroring `completionReady`'s empty-plan guard.                          | Let `every()` pass vacuously on a stepless goal.                                                       | `FocusCurrentTaskCard.tsx:150-155` calls its guard "load-bearing": without it _"an empty plan would reveal 'Mark complete' with zero evidence — violating 'every step needs evidence' (#360/#408)."_ The same vacuous-truth hole exists one level up: `[].every(...)` is `true`, so a stepless goal would bake with nothing. Same guard, same reason.                                                                                                                                                                                                                                                                                                                                       |
| D4  | **The gate is rendered on `FinishDesignStage`'s Bake button, not on `finish-line-cta`.**                                                               | Issue's fix 2 — lock the FinishLine CTA.                                                               | Locking `finish-line-cta` is a chicken-and-egg lockout: the closing note on `FinishCelebrateStage` (the only goal-scoped evidence affordance, #449 D13) sits _behind_ that CTA. Gating at Bake also mirrors the step pattern exactly — `FocusCurrentTaskCard` reveals "Mark complete" only when its precondition holds, rather than blocking entry to the card.                                                                                                                                                                                                                                                                                                                             |
| D5  | **`e2e/flows/bake-recovery.yaml` → `evidence-gate.yaml`, rewritten**, `required` tag kept, `finish-baking-error-alert` / retry assertions dropped.     | (a) Repoint at a genuine deterministic bake failure. (b) Leave it to #636.                             | (a) has no UI-reachable candidate — every remaining failure mode (`bakePNG` corruption, `saveBadgePNG`/`readBadgePNG` FS errors, `keyProvider.sign`) needs code-level fault injection Maestro cannot do. The alert/retry UI is already covered at component level (`FinishBakingStage.test.tsx:117-230`, `CompletionFlowScreen.test.tsx:342-451`), which is the issue's own stated fallback. (b) is the collision documented under Dependencies. The rename reflects the changed subject: blocked-bake recovery, not bake-failure recovery.                                                                                                                                                 |
| D6  | **`useCreateBadge.ts:344`'s `canCompleteGoal` check stays as-is.**                                                                                     | Upgrade it to the strict predicate too.                                                                | #449 D13 already records its role as _"Backstop, not the primary UX."_ Leaving the floor there keeps the hook's contract stable for its existing tests and for the residual race (evidence deleted between design and baking). One doc line is added pointing at the new upstream tier. Deliberately **not** upgraded to strict: the hook receives a flat evidence array, not steps, and widening its signature would ripple into #636's in-flight work for no behavioral gain.                                                                                                                                                                                                             |
| D7  | **i18n: `en` + regenerated `pseudo` only.**                                                                                                            | Hand-author `de`.                                                                                      | `docs/i18n.md` steps 3/5/6 name exactly those two as the per-PR deliverable; German comes from the batch pipeline (ADR-0008/0009).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| D8  | **The "finish early" escape is replanning, not a new dialog** — drop or re-plan the steps you are not doing.                                           | Build an explicit "finish anyway" confirmation.                                                        | There is no `skipped` status (`types/steps.ts:8` — `completed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | in-progress | paused | pending`), and step delete/edit already exist in `EditModeScreen`. An offer to replan is ADR-0014-shaped; a confirmation dialog that mints an unevidenced badge is the thing the issue is asking us to stop. **Flagged for review** — see Open Question. |
| D9  | **`FinishLine`'s up-front "what's outstanding" messaging is deferred.**                                                                                | Build it here.                                                                                         | The issue carries `needs:design`, and the functional hole closes without it. Follow-up.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

## Affected Areas

- `src/db/queries.ts`: new `isStepEvidenceComplete`, new `isGoalEvidenceComplete`; `canCompleteGoal` docstring gains the two-tier crosswalk it currently lacks.
- `src/components/FocusCurrentTaskCard/FocusCurrentTaskCard.tsx`: `completionReady` refactored onto `isStepEvidenceComplete` (no behavior change).
- `src/screens/CompletionFlowScreen/CompletionFlowScreen.tsx`: query step evidence, compute `canBake`, thread to the design stage.
- `src/screens/CompletionFlowScreen/finishStageCopy.ts`: `designCopy` gains the blocked message.
- `src/components/FinishDesignStage/FinishDesignStage.tsx` + `.styles.ts`: `canBake` / `bakeBlockedMessage` props, disabled CTA, inline reason.
- `src/hooks/useCreateBadge.ts`: one doc line (D6).
- `src/i18n/resources/{en,pseudo}/completion.json`.
- `e2e/flows/bake-recovery.yaml` → `e2e/flows/evidence-gate.yaml`; `e2e/README.md`.
- Tests: `queries.test.ts`, `FocusCurrentTaskCard.test.tsx`, `FinishDesignStage.test.tsx`, `CompletionFlowScreen.test.tsx`.

## Implementation Plan

### Step 1: Name the two tiers in `db/queries.ts`

**Commit**: `refactor(db): extract isStepEvidenceComplete and add the goal-level tier`

- [ ] `isStepEvidenceComplete(plannedEvidenceTypesJson, stepEvidence)` — `plannedTypes.length > 0 && plannedTypes.every((t) => capturedTypes.includes(t))`, reusing `resolvePlannedEvidenceTypes` + `validateEvidenceType` already imported for `canCompleteStep`.
- [ ] `isGoalEvidenceComplete(steps, stepEvidence)` — `steps.length > 0 && steps.every((s) => isStepEvidenceComplete(s.plannedEvidenceTypes, evidenceFor(s.id)))`, grouping `stepEvidence` by `stepId`.
- [ ] Docstrings state the tier each one occupies and cross-reference the other three (`canCompleteStep`, `canCompleteGoal`) — the fix for the drift D2 describes.
- [ ] Amend `canCompleteGoal`'s docstring: it is the data-layer floor and the pre-mutation backstop, **not** the completion contract.
- [ ] Tests: step with no plan → false; partial capture → false; all planned captured → true; goal with zero steps → false; goal with one unsatisfied step → false; all steps satisfied → true; the issue's 6-step/one-note case → false.

### Step 2: Refactor `completionReady` onto the shared predicate

**Commit**: `refactor(focus): derive completionReady from isStepEvidenceComplete`

- [ ] Replace the inline `normalizedPlannedTypes.length > 0 && unsatisfiedTypes.length === 0` with the shared call. `getMissingQuickEvidenceOptions` stays — it still drives the capture-button row.
- [ ] Keep the existing comment's intent (the empty-plan guard is load-bearing) attached to the predicate, now in `queries.ts`.
- [ ] Tests: existing `FocusCurrentTaskCard` reveal cases must pass unchanged — that is the assertion that this is a no-op refactor.

### Step 3: `FinishDesignStage` gains a disableable Bake CTA

**Commit**: `feat(completion): let FinishDesignStage express a blocked Bake`

- [ ] `canBake?: boolean` (default `true`), `bakeBlockedMessage?: string`.
- [ ] `disabled={!canBake}` on the Bake `Button` (`Button.tsx:28` already supports it).
- [ ] When blocked, render the message with `testID="finish-design-bake-blocked"` in the footer.
- [ ] Tests: enabled by default; disabled + message when `canBake={false}`; `onBake` not fired while disabled.

### Step 4: Wire the gate into `CompletionFlowScreen`

**Commit**: `fix(completion): require every step's planned evidence before baking`

- [ ] Add `useQuery(stepEvidenceByGoalQuery(goalId))`; `stepRows` (already present, `CompletionFlowScreen.tsx:88`, `selectAll()` so it carries `plannedEvidenceTypes`) supplies the steps.
- [ ] `canBake = isGoalEvidenceComplete(stepRows, stepEvidence)`; pass it and the copy to `FinishDesignStage`.
- [ ] `designCopy(t)` gains `bakeBlockedMessage`.
- [ ] `useCreateBadge.ts:344` doc line (D6).
- [ ] Tests: no evidence → `canBake` false; partial (one of three steps satisfied) → false; all satisfied → true; goal-scoped closing note alone does **not** unblock (pins D1 against the old floor).

### Step 5: i18n

**Commit**: folded into Step 4

- [ ] `finish.design.bakeBlockedMessage` in `en/completion.json`. Draft, ND voice, states the condition without judgment: `"Every step needs the evidence it planned. Capture what's left and this opens up."`
- [ ] `bun run gen:pseudo`.

### Step 6: Rewrite the E2E flow

**Commit**: `test(e2e): repoint the gate flow at blocked-bake recovery`

- [ ] `git mv bake-recovery.yaml evidence-gate.yaml`; rewrite the header, which currently documents the bug as intent.
- [ ] Keep phase 1 (one-step goal, capture nothing, `focus-current-task-mark-complete` absent).
- [ ] Reach design via `finish-line-cta` → `finish-celebrate-cta` (both still live, D4); assert `finish-design-bake-blocked`.
- [ ] Recovery: capture the planned evidence, return, assert the block is gone, Bake through to `finish-reveal-stage`.
- [ ] Drop the `finish-baking-error-alert` / retry assertions (D5).
- [ ] Update `e2e/README.md`'s flow table and its "only place the error alert is asserted" claim.

## Testing Strategy

- [ ] Unit: the four predicates in `queries.test.ts`, including the issue's exact reproduction case.
- [ ] Regression: `FocusCurrentTaskCard` suite unchanged and passing (proves Step 2 is a no-op).
- [ ] Component: `FinishDesignStage` blocked/enabled states.
- [ ] Screen: `CompletionFlowScreen` evidence → `canBake` wiring, incl. the closing-note-alone negative.
- [ ] E2E: `evidence-gate.yaml` block → recover → reveal. `full-ride.yaml` unmodified — **verified compatible**: it captures every planned type on all three steps (`full-ride.yaml:263-458`) and deliberately skips the closing note (`:475`), which D1 does not require.
- [ ] Manual: 2-step goal, capture on step 1 only → Bake blocked with the reason; capture step 2 → Bake opens.

## Open Question (RESOLVED 2026-09-01)

**D8 — is replanning a good enough "finish early" escape?** **Yes — decided.** Ship as-is: strict gate + the existing replan/delete escape, no "finish anyway" confirmation dialog. If the friction is felt in practice, soften via follow-up (same pattern as D9). No plan changes needed.

## Not in Scope

| Item                                                       | Reason                                              | Follow-up      |
| ---------------------------------------------------------- | --------------------------------------------------- | -------------- |
| `FinishLine` up-front outstanding-evidence messaging       | `needs:design`; hole closes without it (D9)         | new issue      |
| `de` translations                                          | batch pipeline (D7)                                 | next i18n sync |
| Upgrading the `useCreateBadge` backstop to the strict tier | D6 — signature ripple into #636, no behavioral gain | none           |
| #636's `full-ride` / `step-timing-editor` failures         | separate, undiagnosed, no overlap                   | #636           |

## Discovery Log

- [2026-09-01] **D2's placement changed, not its substance.** The plan put both
  predicates in `db/queries.ts` and had `FocusCurrentTaskCard.completionReady`
  call `isStepEvidenceComplete`. Two problems surfaced on contact: the card
  holds an already-resolved `readonly EvidenceTypeValue[]`, not the JSON column,
  so it cannot call that signature at all; and `queries.ts` imports `evolu`, so
  either the presentational card or the screen would have taken a db-runtime
  dependency for one pure predicate. Resolved by splitting on data shape:
  - `isEvidencePlanSatisfied(plannedTypes, capturedTypes)` in
    `src/types/evidence.ts` — the leaf module both sides already share for
    `validateEvidenceType`. This is what the card calls.
  - `isStepEvidenceComplete` / `isGoalEvidenceComplete` in a new
    `src/db/evidenceGate.ts` — pure functions over row shapes, no Evolu import,
    re-exported from the `db` barrel. `CompletionFlowScreen` imports them from
    the leaf path directly, which is also what lets its test exercise the real
    predicate rather than a stub (the suite mocks the `../../db` barrel whole).

  `queries.ts` keeps the floors and the cross-referencing docstrings, which was
  D2's actual goal.

- [2026-09-01] **The blocked message replaces `bakeSubcopy` rather than stacking
  under it** — one line to read below the CTA, and no footer height jump when
  the gate opens.

- [2026-09-01] **Review pass — the blocked copy now names the gap.** Step 5
  drafted a generic line ("Every step needs the evidence it planned…"), but the
  Intent Verification bullet asks for "an inline reason **naming what is
  outstanding**", and the drafted string names the rule, not the gap. Closed
  with `countStepsMissingEvidence` behind a pluralized
  `bakeBlockedMessage_one/_other`. A step counts once no matter how many types
  it owes — the message points at steps, and a per-type total would overstate
  the work. This is not D9: D9 defers the _up-front_ `FinishLine` messaging,
  which is still deferred.

- [2026-09-01] **A stepless goal gets its own line.** Zero outstanding steps is
  not the same as bakeable (D3), so the count copy would have read "0 steps".
  `bakeBlockedNoSteps` points at adding a step, which is the actual escape.
  Found while wiring the count, not in the plan.

- [2026-09-01] **The blocked reason is also the CTA's `accessibilityHint`.** A
  disabled `Button` announces as "dimmed" and nothing else, leaving the reason
  in an unlinked sibling `Text` — the ND posture the issue invokes ("never
  dead-end someone") was visual-only. Flagged by both review axes.

- [2026-09-01] **The E2E recovery lap never taps "Mark complete."** The plan's
  version marked the step complete before re-entering the design stage (as the
  old flow did). Leaving it in-progress makes the flow fail if the gate ever
  regresses to reading `step.status`, which is Intent Verification bullet 4.
