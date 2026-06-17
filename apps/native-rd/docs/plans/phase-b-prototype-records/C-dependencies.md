# Prototype Record — C: Dependencies (merges C-order + C-waiting)

Feature shape: [phase-b-feature-shapes.md §C](../phase-b-feature-shapes.md#c-dependencies-merges-c-order--c-waiting)
Conventions: [phase-b-stage-0-deliverables.md](../phase-b-stage-0-deliverables.md)

## Prototype: C — dependency-marker treatments × task-view fork (2026-06-16)

### Hypothesis

There is one dependency-marker language that holds across all five step
surfaces and across both targets — internal (step→step) and external
(step→person/org/event) — that **informs without ever enforcing**; and the
open task-view fork (does "one next step" name a waiting step and stay put, or
route around to the next actionable step?) can be resolved by seeing both
behaviors side by side, including the extreme where every pending step is
waiting (Ava). Marker wording is "after / depends on" (internal) and "waiting
on … expected ⟨date⟩" (external) — never "blocked by" (feature shape Q1–Q3).

### What Was Built

`apps/native-rd/prototypes/C-dependencies.html` — a self-contained HTML page at
phone-viewport size, light-default token language mirrored from
`packages/design-tokens` (CSS shared with `a-substructure-layouts.html` so the
comparison measures the treatment, not HTML aesthetics).

- **Three candidate marker treatments**, switchable via `?treatment=` / arrow
  keys:
  - **Inline** — the relation as a quiet sub-line under the step title (lowest
    ink; whispers).
  - **Chip** — a tappable pill carrying the relation (internal = purple,
    external/waiting = amber + expected date).
  - **Connector** — an explicit arrow-led callout, plus an actual tie line on
    the journey between prerequisite and dependent (most graph-like; the only
    treatment that draws the relation as a relation).
- **Task-view fork as a toggle** (`?taskview=`): **name-and-stay** vs
  **route-around**. Affects the Goals card and Focus snap only. In both, every
  waiting step stays fully visible — nothing is blocked, hidden, dimmed, or
  disabled (guardrail). Route-around names the soonest waiting step in a quiet
  note — never a count (guardrail); when nothing is actionable (Ava), it shows
  the honest "everything here is waiting on other people — that's the system,
  not you" panel.
- **Three scenarios** (`?data=`): **Tomás** (internal ordering, with one
  already-satisfied dependency to see whether a met dependency reads as quiet
  history), **Ava** (external — every pending step waiting, the route-around
  extreme), **Combined** (one step stacking an internal + external marker, the
  Q7 legibility stressor).
- **Two views** (`?view=`): all five surfaces under one treatment, or one
  surface across all three treatments side by side.

**Medium:** HTML clickable comparison — the lowest rung that can show 3
treatments × 5 surfaces × 3 scenarios × 2 task-view behaviors side by side in
the app's token language; chosen per the prototype plan's medium menu (C's
first questions are marker-display and task-view-routing questions, which are
exactly the "compare the presentations" case HTML serves cheaply). Tap-count
friction for setting/clearing a dependency, cold-return reading of the Ava
goal, and the ND-user gate still need the dev-flag app rung afterward.

Run: `open apps/native-rd/prototypes/C-dependencies.html`

### Scenario Tested

See above — Tomás (internal), Ava's four-month wait (external), and a combined
Tomás-panel goal. Grounded in
[step-model-gap.md](../research/step-model-gap.md) (§ C-order, § Ava and the
four-month wait).

### Observations

**Pending — prototype built 2026-06-16, not yet walked.** The artifact exists;
the analytical walkthrough (read every treatment × surface × scenario ×
task-view state from rendered screenshots, as was done for A) is the next step,
and Joe's own lived self-testing and the ND-user gate are ahead of that. Until
the walkthrough runs, this section carries no findings.

When the walkthrough happens, record per feature-shape question (Q1–Q10),
calling the evidence tier explicitly (analytical self-testing is the weakest
tier, weaker than lived self-testing, both below the ND-user gate).

### Guardrail Check

To be answered against the walkthrough session. The lines this prototype most
exercises (copy the full checklist from
[phase-b-stage-0-deliverables.md](../phase-b-stage-0-deliverables.md) when
filling it in):

- **Dependencies inform, never enforce** — the load-bearing line for C: confirm
  nothing was blocked, hidden, dimmed, disabled, or refused in any treatment or
  task-view variant, and that route-around's de-emphasis stays on the right
  side of "hidden" (Q9).
- **Waiting is not failure** — confirm the external markers and the Ava
  "everything is waiting" panel name the world's timing, never user fault.
- **No auto-judgment** — confirm no passed expected date changed any state.
- **Task-view promise holds** — confirm both variants still resolve to exactly
  one featured next step per active goal.
- **No app-icon badge counts / no composed verdicts** — confirm the
  route-around waiting note names a specific step (never a count) and that
  waiting pills never read as a score or ledger.

### Decision

Pending the walkthrough. Self-testing caps the reachable outcome at revise /
split / more prototyping; graduation to a schema/relationship ADR or a design
decision requires the ND-user gate.

### New Questions

To be captured from the walkthrough.

### Recommended Follow-Up

- Run the analytical walkthrough and fill Observations + Guardrail Check +
  Decision above.
- Update the **Dependency display** and **C + task view** rows of the
  [Open Questions Register](../phase-b-step-model-prototypes.md#open-questions-register)
  with evidence once the walkthrough produces it.
- Carry whatever survives to a throwaway dev-flag screen for tap-count friction
  (set/clear a dependency) and the Ava cold-return test.
- Graduation to a schema/relationship ADR or design decision is gated on a real
  ND-user session per the plan's Evidence Sources.
