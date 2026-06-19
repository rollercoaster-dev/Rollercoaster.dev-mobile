# Development Plan: Issue #289

## Issue Summary

**Title**: A-record: grammar close-out — approved grammar + observations into the prototype record
**Type**: documentation
**Complexity**: TRIVIAL
**Estimated Lines**: ~100 lines

## Intent Verification

Observable criteria derived from the issue. These describe what success looks like from a user/system perspective — not generic checklists.

- [ ] `A-substructure.md` contains a new dated section (2026-06-11 ND-user session) that records Joe's per-surface observations for each layout across all five surfaces (create, edit, goal card, focus + MiniTimeline, journey timeline).
- [ ] The record names indentation as the approved layout with Joe's rationale, explicitly noting the override of the 2026-06-13 analytical walkthrough's lean toward containment-as-base.
- [ ] The guardrail checklist in the new section is answered against the ND-user session, including a clear PASS for the task-view promise (indentation's leaf-led goal card resolves to one next action).
- [ ] The Decision section for the new session records outcome = "graduate to implementation" with evidence weight = ND-user evidence.
- [ ] The Open Questions Register's Substep-depth row (phase-b-step-model-prototypes.md) still carries the Q6 verbatim from 2026-06-13 and remains Open — no state change.

## Dependencies

| Issue | Title                             | Status                | Type |
| ----- | --------------------------------- | --------------------- | ---- |
| #288  | Epic: sub-steps (A: substructure) | Unknown — parent epic | Soft |

**Status**: No blockers. Issue body states "can start immediately."

## Objective

Append a new section to `apps/native-rd/docs/plans/phase-b-prototype-records/A-substructure.md` recording Joe's ND-user session (2026-06-11): per-surface observations across the three layouts (Indentation / Containment / Breadcrumb), his rationale for selecting indentation, a guardrail checklist answered against the session, and a Decision section graduating the feature to implementation. Confirm the Open Questions Register's Q6/Substep-depth row is already correct and unchanged.

## Decisions

| ID  | Decision                                                                                                                                         | Alternatives Considered               | Rationale                                                                                                                                                                                                                                                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Append a new `## Prototype: A — ND-user session (2026-06-11)` section rather than editing the existing 2026-06-13 analytical walkthrough section | Editing the existing section in place | The conventions file (`phase-b-stage-0-deliverables.md`) says multiple passes append dated sections to the same file; the two sessions are distinct evidence tiers and must remain separately attributable.                                                                                                                                                                          |
| D2  | Do not record drill-in (Option 4 from `a-substructure-flow.html`) in the new session section                                                     | Include Option 4                      | The issue body says "the three layouts were Indentation / Containment / Breadcrumb — there was no fourth option" in the ND-user gate context. Drill-in appeared only in the flow prototype (a later, interactive medium) and was not part of the layout-pass evaluation Joe ran on 2026-06-11. If Joe's session did include drill-in, this needs clarification (see Open Questions). |
| D3  | Leave the 2026-06-13 analytical walkthrough section unchanged                                                                                    | Update or supersede it                | The issue says the ND-user tier is decisive and overrides the containment-as-base lean, but the walkthrough's structural observations remain accurate evidence. The new section should reference the override explicitly rather than rewriting history.                                                                                                                              |

## Affected Areas

- `apps/native-rd/docs/plans/phase-b-prototype-records/A-substructure.md`: append new ND-user session section (~100 lines)
- `apps/native-rd/docs/plans/phase-b-step-model-prototypes.md`: verify (read-only confirm) the Substep-depth row is correct; no edit expected

## Implementation Plan

### Step 1: Confirm the Open Questions Register state

**Files**: `apps/native-rd/docs/plans/phase-b-step-model-prototypes.md`
**Commit**: none (read-only verification step, folded into Step 2's commit)
**Changes**:

- [ ] Read the Substep-depth row — confirm it contains the Q6 verbatim ("Step 4 — inventory wants its own sub-structure") dated 2026-06-13, status Open, owned by Joe
- [ ] If the row is already correct, no edit needed; record the confirmation in the Discovery Log
- [ ] If the row is missing the Q6 verbatim, update it as a separate minor fix before writing the record section

### Step 2: Append the ND-user session section to A-substructure.md

**Files**: `apps/native-rd/docs/plans/phase-b-prototype-records/A-substructure.md`
**Commit**: `docs(native-rd): record ND-user session + approved grammar in A-substructure record (#289)`
**Changes**:

- [ ] Append `## Prototype: A — ND-user session (2026-06-11)` after the existing `## Prototype: A — substep layout pass (2026-06-11)` section (maintaining the convention of dated sections)
- [ ] Add **Hypothesis** sub-section: the ND-user gate can resolve what analytical self-testing cannot — which layout survives lived use on the real app's surfaces.
- [ ] Add **Session** sub-section: Joe (ND user, primary audience); date 2026-06-11; prototypes evaluated: `a-substructure-layouts.html`; three layouts: Indentation / Containment / Breadcrumb.
- [ ] Add **Observations** sub-section with per-surface breakdown — REQUIRES JOE'S INPUT (see Open Questions). Placeholder structure:
  - Create — NewGoalModal
  - Edit — EditModeScreen
  - Goal card
  - Focus — StepCard + MiniTimeline
  - Journey — TimelineJourneyScreen
- [ ] Note that the leaf-led goal card (indentation's treatment) satisfies the task-view promise cleanly — the layout's core strength here.
- [ ] Add note that this overrides the 2026-06-13 analytical walkthrough's lean toward containment-as-base: "The ND-user tier is decisive per the gate; containment-as-base is set aside."
- [ ] Add **Guardrail Check** sub-section: copy the full 10-item checklist from `phase-b-stage-0-deliverables.md` and answer each line against the ND-user session. Task-view promise = PASS (indentation's leaf-led goal card resolves to exactly one next action). Other lines: N/A unless Joe's session exercised them (see Open Questions).
- [ ] Add **Decision** sub-section:
  - Outcome: graduate to implementation
  - Approved layout: **indentation** (children indented under a left rail; reading surfaces lead with the leaf, parent as quiet context; containment and breadcrumb dropped)
  - Evidence weight: ND-user evidence — Joe is the app's primary-audience ND user
  - Note: depth (Q6) stays open per the Open Questions Register; graduates only after Stage 6

## Testing Strategy

- [ ] Manual review: read the full `A-substructure.md` file after edit to confirm the new section is structurally consistent with the existing section and with `C-dependencies.md` and `E-step-states.md` as reference records
- [ ] Manual review: confirm the Open Questions Register's Substep-depth row is unchanged after the commit

## Not in Scope

| Item                                                                             | Reason                                                                                                                                                         | Follow-up                                    |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Updating the Open Questions Register's "Goal-card readout under A" row to Closed | The issue does not direct closing it; the ND-user session may confirm leaf-led, but closing the register row is a separate decision Joe should make explicitly | New issue or follow-up in this one           |
| Recording drill-in (Option 4) from `a-substructure-flow.html`                    | Not part of the three-layout ND-user gate; flow prototype was a separate, later medium                                                                         | If applicable, warrants its own record entry |
| Updating the dev-flag implementation plan for the hybrid                         | Implementation planning is downstream of the record; this issue is the record only                                                                             | Issue #288 epic children                     |

_One item deferred pending clarification: see Open Questions Q2 re: whether drill-in was part of Joe's session._

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->

**Pre-implementation findings (researcher, 2026-06-20):**

- The existing A-substructure.md has one section: `## Prototype: A — substep layout pass (2026-06-11)` covering the 2026-06-13 analytical walkthrough. The section header date (2026-06-11) appears to refer to the prototype build date, not the walkthrough date — the walkthrough is dated 2026-06-13 in the Observations text. The new section header should use a date that Joe confirms (see Open Questions Q1).
- The `a-substructure-flow.html` prototype added a fourth option (drill-in / structure as navigation) that is not present in the static gallery. The issue body explicitly says "the three layouts were Indentation / Containment / Breadcrumb — there was no fourth option," which is accurate for the 2026-06-11 static-gallery session. Drill-in appeared only in the flow prototype built afterward.
- The Open Questions Register's Substep-depth row already carries the Q6 verbatim ("Step 4 — inventory wants its own sub-structure") dated 2026-06-13, status Open. No edit is needed — the issue's "Confirm ... stays open" check passes as-is.
- The guardrail checklist has 10 items (not a shorter set); all 10 must appear in the new section per `phase-b-stage-0-deliverables.md` conventions, with non-exercised items marked N/A.
- `C-dependencies.md` and `E-step-states.md` provide structural reference for what a pending / filled section looks like. The new section is a filled session record, not a pending one.
