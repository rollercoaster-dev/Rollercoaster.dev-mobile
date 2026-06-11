# Phase B Stage 0 Deliverables

**Date:** 2026-06-11
**Status:** Draft — pending Joe's review. The Stage 1 timebox below is a
proposal, not an agreement, until Joe confirms it.

This document completes the Stage 0 deliverables that the
[baseline record](./phase-b-stage-0-baseline.md) explicitly left out: the
guardrail checklist, the prototype evidence format, the Stage 1 medium
choices, and the Stage 1 timebox. The baseline record itself remains the
fourth deliverable, already done.

With this document accepted, Stage 0's exit criteria from the
[prototype plan](./phase-b-step-model-prototypes.md#stage-0-baseline) are met
and Stage 1 may start.

## Guardrail checklist

Copy this checklist into the **Guardrail Check** section of every prototype
record and answer each line. Sources: ADR-0010 §Structural Guardrails and the
prototype plan's principles. A "no" on any line is a finding, not a footnote —
record it and stop the prototype until resolved.

```markdown
- [ ] **No auto-state:** time passing never changed a Step's state anywhere in
      this prototype (applies to marker, deadline, and recurrence alike).
- [ ] **Absence is uninterpreted:** no surface scored, counted, aggregated,
      prompted about, or drew a conclusion from an absence (unfilled slot,
      passed date, blank note).
- [ ] **Ordering informs, never enforces:** nothing was blocked, hidden, or
      refused because a prerequisite was incomplete.
- [ ] **Waiting is not failure:** external waiting (if present) was named
      without implying user inaction or fault.
- [ ] **G opt-in is structural:** no review prompt, completion trigger, nudge,
      score, or per-goal-type default appeared.
- [ ] **Slot stays a hypothesis:** no non-Stage-3 prototype baked in Slot
      persistence or interaction assumptions.
- [ ] **Task-view promise holds:** "one next step per active goal" survived —
      goal card and focus mode still resolve to one next thing.
- [ ] **H preserves, never replaces:** a misfired Step (if present) persisted
      as a learning; nothing was deleted or overwritten to "correct" it.
- [ ] **No composed verdicts:** no combination of surfaces accidentally
      implied a score, streak, or judgment.
```

Most prototypes touch only a few lines; mark the rest "n/a — not exercised"
rather than deleting them, so the record shows what was checked.

## Prototype evidence format

The **Prototype Record Template** in the
[prototype plan](./phase-b-step-model-prototypes.md#prototype-record-template)
is the agreed format. Conventions on top of it:

- **Location:** one file per prototype in
  `docs/plans/phase-b-prototype-records/`, named `<letter>-<slug>.md`
  (e.g. `A-substructure.md`). Multiple passes over the same enrichment append
  dated sections to the same file rather than spawning new files.
- **Evidence weight is declared, not implied:** a record whose evidence is
  self-testing only says so in its Observations section, per the plan's
  Evidence Sources rules. Self-testing supports revise / split /
  more-prototyping outcomes; graduation to schema ADR, design decision, or
  implementation issue requires at least one real ND-user session first.
- **Medium is recorded** in the What Was Built section, with one line on why
  that rung of the medium menu was enough (or why a lower rung wasn't).

## Stage 1 medium choices

Per the medium menu in the prototype plan:

| Prototype               | Medium                                                                         | Why                                                                                                                                                                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A: Substructure**     | HTML design-language pass first; dev-flag screen for what survives            | A's first question is a design-language question: one grammar for "a step inside a step" that must hold across create (NewGoalModal), edit, goal card, focus mode + MiniTimeline, and the journey timeline. HTML renders all five surfaces with 2-3 candidate grammars side by side cheaply, in the app's token language. Device ergonomics, tap-count friction, and the cold-return test still need the app rung afterward. |
| **E: State vocabulary** | Paper or HTML; move up only when naming stabilizes                             | Vocabulary and naming question. HTML earns its place here too once there are states to see in a list, not just name.                                                                                                                                            |
| **D: Per-step context** | HTML for field shape and placement; dev-flag screen for re-entry feel         | The D-vs-evidence question (own surface vs retrieval layer) needs the re-entry moment on a real device; field shape, placement, and prominence variants do not.                                                                                                  |

## Stage 1 order

Stage 1 starts with **A**, not D — Joe's call, 2026-06-11. The plan's D → E →
A order was escalating-complexity, not a dependency chain, so this is a
sequencing deviation, not a scope change. D and E feature shapes are written
just-in-time when their prototypes start, per the plan.

## Stage 1 timebox (proposal)

**Proposed:** Stage 1 closes when each of A, E, D has a prototype record with
a decision-gate outcome, or after **3 calendar weeks** from the first
prototype session, whichever comes first — at which point outcomes are
recorded with the evidence in hand (continue / revise / defer / escalate)
rather than silently extending.

Joe sets the real number; this line exists so the timebox is agreed before
Stage 1 starts, as the plan requires.

## Data-layer feasibility spike

The plan's half-day spike has been run. Findings:
[evolu-step-model-feasibility-spike.md](../research/evolu-step-model-feasibility-spike.md).
Short version: A, C-order, and E are all cheap for the Evolu/SQLite stack; no
blocker for Stage 1.
