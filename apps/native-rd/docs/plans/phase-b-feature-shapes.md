# Phase B Feature Shapes

Filled feature-shape sections for the seven Step-model features (ADR-0010
commitments, renamed and consolidated by
[ADR-0011](../decisions/ADR-0011-step-model-names.md)), written just-in-time
per stage as described in
[phase-b-step-model-prototypes.md](./phase-b-step-model-prototypes.md)
(§Feature Shape Template). A prototype does not start until its own section
exists here.

Each section uses the template from the prototype plan: User Need, Smallest
Useful Shape, Later Integrated Shape, Must Not Do, Prototype Questions,
Scenario, Evidence To Collect, Exit Criteria, Dependencies.

## Status

| Feature                                                 | Stage   | Status                         |
| ------------------------------------------------------- | ------- | ------------------------------ |
| **A: Substeps** (formerly Granularity / Substructure)   | Stage 1 | Drafted 2026-06-11 — in review |
| **E: Step states** (formerly Richer state vocabulary)   | Stage 1 | Not started                    |
| **Scratchpad** (absorbs D + F)                          | Stage 2 | Not started                    |
| **C: Dependencies** (merges C-order + C-waiting)        | Stage 2 | Not started                    |
| **B: Planning** (merges B-soft, B-deadlines, repeating) | Stage 3 | Not started                    |
| **H: Learnings** (formerly Misfire as learning)         | Stage 4 | Not started                    |
| **G: Review**                                           | Stage 4 | Not started                    |

Sections are appended below as each stage starts.

Stage 1 starts with A — a deliberate sequencing choice recorded in
[phase-b-stage-0-deliverables.md](./phase-b-stage-0-deliverables.md#stage-1-order).
E follows; the other Stage 1 letter from the original plan, D, moved into the
Stage 2 Scratchpad when ADR-0011 merged D and F.

## A: Substeps (formerly Granularity / Substructure)

### User Need

ND users lose the gestalt that NT users hold as "the project"; substeps are
offloaded cognition ([step-model-gap.md](../research/step-model-gap.md),
register table). Two scenario shapes need them:

- **Known up front** — Tomás's practice panel has natural per-circuit
  substeps ([step-model-gap.md § Tomás and the practice panel](../research/step-model-gap.md#tomás-and-the-practice-panel)).
  Flat steps force a choice between one "Build practice panel" step
  that loses the circuits or three siblings that lose the step they belong
  to. Sam's program step work breaks down predictably from the literature and
  lands at two levels (goal → "Step work" → Steps 1/2/3)
  ([step-model-gap.md § Sam settles into a recovery practice](../research/step-model-gap.md#sam-settles-into-a-recovery-practice)).
- **Discovered mid-work** — a step looks atomic until you're inside it. Malik
  writes down one step, "UV unwrapping," and halfway through realizes it is
  itself five things (seams, projection, packing, checker-test, retopo-fix)
  he keeps re-learning each session
  ([step-model-gap.md § Malik discovers UV unwrapping](../research/step-model-gap.md#malik-discovers-uv-unwrapping)).
  The _discovery and capture_ of those substeps is the Scratchpad's question
  (Stage 2); this prototype only needs somewhere for a substep to exist once
  created.

This prototype tests the known-up-front shape.

### Smallest Useful Shape

A Step can contain Steps, one level deep. The first pass is a **layout
language**, not a single-surface mock: a way of showing "a step inside a
step" that holds across every surface where a step already appears —

- **NewGoalModal** — where substeps are added at creation;
- **EditModeScreen** — where structure is edited and reordered;
- **GoalsScreen / GoalCard** — the "one next step" readout;
- **FocusModeScreen + MiniTimeline** — the working surface and its strip;
- **TimelineJourneyScreen + TimelineStep** — the journey view.

Medium: an HTML prototype at phone-viewport size rendering the same goal,
broken into substeps (Tomás's panel), on all five surfaces, with two or three
candidate layouts (e.g. indentation, containment cards, breadcrumb-context)
as side-by-side variants. The variants must borrow the app's neo-brutalist
token language — borders, hard shadows, type scale — or the comparison
measures HTML aesthetics, not the layout. A layout that works on four
surfaces and fails on the fifth fails. Whatever survives moves to a throwaway
dev-flag screen for ergonomics and the cold-return test.

The behavior in either medium:

- create a substep under an existing step;
- see substeps grouped under their parent in the goal's step list;
- complete and reorder substeps among siblings (reusing `ordinal` semantics);
- parent completion stays fully manual — completing the last child changes
  nothing about the parent by itself.

Nothing else: no depth beyond one level, no collapse/expand machinery beyond
the minimum to stay legible, no capture flow, no new states.

### Later Integrated Shape

- Substeps carry order, dependencies (C — internal and external), and notes
  like any Step.
- The Scratchpad can land a discovered substep under the step being worked
  (Stage 2; Integration Matrix A + Scratchpad).
- The task view composes: "next step" resolves to leaf, parent, or
  next-without-unsatisfied-dependency depending on the Stage 5 answer
  (Integration Matrix A + task view).
- Sam's two-level shape (goal → step work → Steps 1/2/3) becomes
  representable if the depth question resolves that way after Stage 5.

### Must Not Do

- Decide substep depth — ADR-0010 explicitly defers it; the depth question
  graduates only after Stage 5 (Open Questions Register).
- Turn the task view or goal screen into an outline browser.
- Break the "one next step per active goal" promise — goal card and focus
  mode must still resolve to one next thing.
- Block, hide, or refuse anything because a parent or sibling is incomplete.
- Auto-complete a parent when its children complete — completion stays a user
  action.
- Make breaking a step into substeps feel required. A flat step remains a
  first-class way to hold work.

### Prototype Questions

1. Is there one layout for "a step inside a step" that survives all five
   surfaces, or do create/edit (authoring) and card/focus/timeline (reading)
   need different expressions of the same language?
2. When a goal's first pending step has substeps, what does the goal card
   show — the parent's title or the next pending leaf's? Which reads as
   "my next step" when Joe returns cold?
3. Same question for focus mode's snap-to-first-pending behavior — and what
   does the MiniTimeline strip do with substeps?
4. How does the journey timeline render substeps — as inline nodes, nested
   under the parent's node, or collapsed until the parent is opened?
5. On the create page, where does "add substep" live so it's available
   without feeling required — does its mere presence pressure every goal
   toward structure?
6. Does one level actually hold the practice panel's substeps, or does the
   work immediately want a second level (Sam's shape)? Record where it
   pinches; do not resolve it.
7. Where does "add substep" live in edit mode, and how many taps? Does it
   stay below the threshold where breaking a step up feels worth it?
8. Does the goal screen stay legible with 3-5 substeps under one parent, or
   does it start reading as an outline?
9. When the last substep completes, what does the parent invite — and is
   manual parent completion discoverable without being demanded?
10. Evidence already attaches per-step, so substeps inherit capture for
    free — but where does the parent's evidence view show a substep's
    evidence, if at all?

### Scenario

Primary: **Tomás and the practice panel** — "Build practice panel" broken
into the three circuits (15-amp lighting, 20-amp small-appliance, 240V dryer),
each with its own evidence. Secondary stressor: **Sam's step work** slice, run
once to observe (not resolve) where one level pinches. Malik is explicitly out
of scope — his path is the Scratchpad's.

### Evidence To Collect

- Screenshots: each candidate layout on each of the five surfaces, so the
  layouts can be compared per surface and a surface's failure is visible.
- Tap counts and friction notes for creating substeps during a realistic
  session of breaking a step up.
- A cold-return note: after a day away, what did "next step" read as, and was
  it right?
- Where one level pinched (question 3), verbatim, for the depth row of the
  Open Questions Register.
- Evidence-weight flag: self-testing only, unless an ND-user session happens
  within the stage.

### Exit Criteria

- The prototype questions above have recorded answers (or recorded
  non-answers with what blocked them).
- Guardrail checklist from
  [phase-b-stage-0-deliverables.md](./phase-b-stage-0-deliverables.md) passes,
  especially the task-view-promise line.
- A decision-gate outcome is recorded in the prototype record. Graduation to
  a schema ADR or implementation issue additionally requires real ND-user
  evidence; self-testing alone caps the outcome at revise / split / more
  prototyping.
- The depth question's register row is updated with evidence, and left open.

### Dependencies

- **Task-view contract** (baseline record §Task-view contract) — the surface
  A must not break; also where A's most interesting evidence lives.
- **C: Dependencies** — sibling ordering reuses `ordinal`; the among-whom
  question (siblings vs leaves vs parents) is Integration Matrix A + C.
- **Scratchpad (Stage 2)** — where discovered substeps land; out of scope
  here but shaped by what A builds.
- **E: Step states** — substeps will eventually carry richer states; this
  prototype keeps `pending`/`completed`.
- **Data layer** — feasibility confirmed by the
  [Evolu spike](../research/evolu-step-model-feasibility-spike.md): additive
  `parentStepId` column, no migration, recursive queries available if ever
  needed.
