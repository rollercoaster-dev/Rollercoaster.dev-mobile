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
- [ ] **No auto-judgment:** time passing never changed a Step's state, and the
      app never authored a verdict about the user (failed, missed, behind,
      streak-broken) anywhere in this prototype — date, deadline, and repeating
      alike. App-maintained bookkeeping that asserts nothing about the user
      (advancing `in-progress` when a step is paused/completed) is allowed; the
      forbidden thing is judgment, not automation. See
      [ADR-0012](../decisions/ADR-0012-no-auto-judgment.md).
- [ ] **Absence is uninterpreted:** no surface scored, counted, aggregated,
      prompted about, or drew a conclusion from an absence (a Tuesday that
      didn't happen, a passed date, a blank note).
- [ ] **Dependencies inform, never enforce:** nothing was blocked, hidden, or
      dimmed because a dependency wasn't satisfied or a prerequisite was
      incomplete.
- [ ] **Waiting is not failure:** an external dependency (if present) was
      named without implying user inaction or fault.
- [ ] **G opt-in is structural:** no review prompt, completion trigger, nudge,
      score, or per-goal-type default appeared.
- [ ] **The calendar holds repetition:** no non-Stage-3 prototype baked in an
      in-app repetition or Slot model; repeating shapes delegate to the
      phone's calendar until Stage 3 says otherwise.
- [ ] **No app-icon badge counts:** nothing put a count on the app icon — a
      red "3" is a missed-things ledger. Ever.
- [ ] **Task-view promise holds:** "one next step per active goal" survived —
      goal card and focus mode still resolve to one next thing.
- [ ] **H preserves, never replaces:** a Step that didn't go to plan (if
      present) persisted as a learning; nothing was deleted or overwritten to
      "correct" it.
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
  (e.g. `A-substructure.md`). Multiple passes over the same thing append
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

| Prototype          | Medium                                                    | Why                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------ | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A: Substeps**    | HTML layout pass first; dev-flag screen for what survives | A's first question is a layout question: one way of showing "a step inside a step" that must hold across create (NewGoalModal), edit, goal card, focus mode + MiniTimeline, and the journey timeline. HTML renders all five surfaces with 2-3 candidate layouts side by side cheaply, in the app's token language. Device ergonomics, tap-count friction, and the cold-return test still need the app rung afterward. |
| **E: Step states** | Paper or HTML; move up only when naming stabilizes        | Words and naming question — color as the state's identity, a word from a small pool as the label. HTML earns its place here too once there are states to see in a list, not just name.                                                                                                                                                                                                                                |

The original third Stage 1 row, **D: Per-step context**, moved with D into
the Stage 2 Scratchpad when
[ADR-0011](../decisions/ADR-0011-step-model-names.md) merged D and F. The
Scratchpad's medium is chosen when Stage 2 starts.

## Stage 1 order

Stage 1 starts with **A**, not D — Joe's call, 2026-06-11. The plan's D → E →
A order was escalating-complexity, not a dependency chain, so this is a
sequencing deviation, not a scope change. (D has since moved to Stage 2 with
the Scratchpad merge; Stage 1 is now A then E.) E's feature shape is written
just-in-time when its prototype starts, per the plan.

## Stage 1 timebox (proposal)

**Proposed:** Stage 1 closes when each of A and E has a prototype record with
a decision-gate outcome, or after **3 calendar weeks** from the first
prototype session, whichever comes first — at which point outcomes are
recorded with the evidence in hand (continue / revise / defer / escalate)
rather than silently extending.

Joe sets the real number; this line exists so the timebox is agreed before
Stage 1 starts, as the plan requires.

## Data-layer feasibility spike

The plan's half-day spike has been run. Findings:
[evolu-step-model-feasibility-spike.md](../research/evolu-step-model-feasibility-spike.md).
Short version: A, sibling ordering, and E are all cheap for the Evolu/SQLite stack; no
blocker for Stage 1.
