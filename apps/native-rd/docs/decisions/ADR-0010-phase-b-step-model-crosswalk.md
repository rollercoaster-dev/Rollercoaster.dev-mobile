# ADR-0010: Phase B step-model crosswalk

**Date:** 2026-06-08
**Status:** Accepted
**Owner:** Joe
**Supersedes:** [ADR-0006](./ADR-0006-iteration-b-scope-amendment.md) — Step-model enrichment scope only

---

## Context

[ADR-0006](./ADR-0006-iteration-b-scope-amendment.md) amended Iteration B to
include Step-model enrichment after user testing showed that the flat
`pending` / `completed` Step could not hold real work. It admitted the
research-level A-G taxonomy from
[step-model-gap.md](../research/step-model-gap.md) into Phase B scope.

PR #219 then froze the Step-model vocabulary and user-altitude framing in
[`CONTEXT.md`](../../CONTEXT.md) and `step-model-gap.md`, including the current
A-H taxonomy where C has separate ordering and external-waiting forms. That
changed the work needed next. Phase B no longer needs another research pass
deciding whether the Step model matters; it needs a per-letter crosswalk that
says what Phase B is committed to building, what it explicitly refuses to
build, and which details remain prototype-dependent.

This ADR supplies that crosswalk. It is a scope-shaping decision, not a schema,
state-machine, or UI decision.

## Structural Guardrails

The following guardrails are already settled by `CONTEXT.md` and
`step-model-gap.md`; this ADR carries them forward rather than reopening them:

- **Universal no-auto-state rule:** time passing never changes a Step's state.
- The app never interprets, scores, or aggregates an absence.
- The no-auto-state rule applies across temporal functions: marker, deadline,
  and recurrence.
- **B-deadlines remains a candidate temporal function** for prototyping. What
  is out is the missed-deadline-ledger shape.
- **G's opt-in is the existence of a review.** The user attaches a review when
  they want one, including never.
- G has no prompt, completion trigger, score, nudge, required review, or
  per-goal-type default.
- **Slot remains a working hypothesis.** A recurring Step may produce dated
  Slots, but the final model, interaction behavior, persistence behavior, and
  task-view treatment require prototyping.
- **C-as-constraint is out.** Ordering may inform the user, but the app does
  not refuse an action because a prerequisite is incomplete.

## Decision

Phase B commits to the following Step-model crosswalk:

| Enrichment                          | Phase B commitment                                                                                                                           | Explicit non-commitment                                                                                                                                        | Guardrails and open edges                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **A: Granularity / substructure**   | Steps can contain Steps so a user can preserve known-up-front substructure and structure discovered mid-work.                                | Phase B does not decide one-level, two-level, or arbitrary depth in this ADR. It also does not turn the task view into an outline browser.                     | Substructure must still serve the task view's "one next step per active goal" promise. Depth, traversal, and task-view interpretation remain follow-up decisions.                                                                                                                                                                                                                                                                                                                                                                                            |
| **B-soft: Soft temporal placement** | A Step can carry a soft temporal placement that creates a time foothold, such as "for Tuesday."                                              | Soft placement is not deadline accountability, streak tracking, attendance tracking, or proof that the user should have done something.                        | Time passing never changes state or interprets absence. Marker persistence, interaction behavior, and task-view presentation require prototyping.                                                                                                                                                                                                                                                                                                                                                                                                            |
| **B-deadlines: Deadline prototype** | Deadline remains a candidate temporal function to prototype in Phase B.                                                                      | Phase B does not commit to overdue status, missed-deadline ledgers, absence counts, pressure-oriented accountability, or automatic promotion to `missed`.      | The prototype has to prove that a deadline can provide useful meaning without violating the no-auto-state rule. Whether deadline survives into the final Phase B interaction model remains open.                                                                                                                                                                                                                                                                                                                                                             |
| **C-order: Sequence as syllabus**   | Phase B supports user-authored ordering or dependency information that preserves the sequence of learning and work.                          | Phase B does not build a constraint engine that blocks, hides, or refuses actions because a prerequisite is incomplete.                                        | The relationship is informative, not punitive. Graph representation, editing mechanics, and task-view behavior remain design and schema follow-ups.                                                                                                                                                                                                                                                                                                                                                                                                          |
| **C-waiting: External waiting**     | Phase B can represent that a Step is waiting on an external person, organization, event, or condition.                                       | External waiting is not collapsed into ordinary `pending`, and it is not treated as user failure or user inaction.                                             | The vocabulary names state without scoring the user. Whether waiting is a state, relation, metadata field, or combination remains a later decision.                                                                                                                                                                                                                                                                                                                                                                                                          |
| **D: Per-step context**             | Phase B provides a lightweight context surface attached to the relevant Step or temporal unit so tacit knowledge can be retrieved later.     | D is not proof-a-step-is-done (evidence's register), not a G review, and not a general journal replacement.                                                    | Per-step free-form text already exists as text evidence (`CaptureTextNote` → evidence row, attachable at any time, not only at completion), so D is defined relative to that channel: the open question is whether context must be a distinct thing — own retrieval surface, prominence at re-entry, separate from the evidence record — or a presentation/retrieval layer over the existing channel. The commitment covers expected-date context and notes-for-future-self. Field shape, length limits, editor treatment, and attachment point remain open. |
| **E: Richer state vocabulary**      | Phase B supports vocabulary richer than `pending` / `completed` so user experience can be named without being pathologized.                  | This ADR does not lock the final state set, decide user-renamable labels, or make `missed` an automatic time-derived state.                                    | Time never assigns state. State vocabulary scope, per-goal customization, and system-derived states such as `learning` remain open questions.                                                                                                                                                                                                                                                                                                                                                                                                                |
| **F: Mid-work capture**             | Phase B gives users a low-friction landing place for structure or insight discovered during work.                                            | F's output is not an evidence record and not a goal review. F also does not require this ADR to choose a modal, tap count, capture medium, or navigation path. | A six-modality capture suite already ships and is reachable mid-work, but everything it captures lands as evidence — so F's open questions are narrower than "build a landing place": whether the existing flow is low-friction enough under real mid-work load, and where captured structure (a new sub-step, not an evidence record) lands. The capture surface must preserve bursts of thought before a context switch. Exact interaction design belongs in later implementation planning.                                                                |
| **G: User-created goal review**     | Phase B supports a free-form review that the user may attach to a goal whenever they choose.                                                 | The app does not prompt for a review, require one, trigger one at completion, score one, nudge one, or configure review defaults by goal type.                 | The review's existence is the opt-in. G's forward-reference target is future similar work across goals. G stays distinct from H's step-level learning artifact.                                                                                                                                                                                                                                                                                                                                                                                              |
| **H: Misfire as learning**          | Phase B preserves a falsified Step as a learning and relates it to the immediately corrected Step that follows from it within the same goal. | H is not an absence, an incomplete Step, a user failure, or a G review. The misfired Step is not replaced or deleted.                                          | H preserves the structural distinction between a wrong premise and user failure. Fields, transition mechanics, and UI treatment remain later decisions.                                                                                                                                                                                                                                                                                                                                                                                                      |

## Consequences

- ADR-0010 replaces ADR-0006 as the current Phase B Step-model scope reference.
- Later schema ADRs, prototype plans, design tickets, and implementation issues
  must implement these commitments without weakening the structural guardrails.
- The unresolved questions from `step-model-gap.md` remain unresolved here:
  substructure depth, state vocabulary scope, H's UI treatment, temporal
  functions and Slots, and task-view implications. Their status is tracked in
  the prototype plan's
  [Open Questions Register](../plans/phase-b-step-model-prototypes.md#open-questions-register).
- Phase B follow-up work should be drafted per capability or tightly related
  group of capabilities. This ADR authorizes that follow-up work; it does not
  choose its schema or UI.

## Supersession

This ADR supersedes ADR-0006 for Step-model enrichment scope. ADR-0006 remains
the historical record of the 2026-05-23 amendment that removed goal journal,
factual nudges, and badge-to-goal linking from Iteration B.

Changes to this crosswalk require a new ADR that supersedes ADR-0010. Do not
amend this ADR in place.

---

_Accepted 2026-06-08._
