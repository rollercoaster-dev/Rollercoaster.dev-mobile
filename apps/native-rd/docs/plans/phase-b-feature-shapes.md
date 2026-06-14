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
| **E: Step states** (formerly Richer state vocabulary)   | Stage 1 | Drafted 2026-06-14             |
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
- **Scratchpad (Stage 5)** — where discovered substeps land; out of scope
  here but shaped by what A builds.
- **E: Step states** — substeps will eventually carry richer states; this
  prototype keeps `pending`/`completed`.
- **Data layer** — feasibility confirmed by the
  [Evolu spike](../research/evolu-step-model-feasibility-spike.md): additive
  `parentStepId` column, no migration, recursive queries available if ever
  needed.

## E: Step states (formerly Richer state vocabulary)

### User Need

A step today is `pending`, `completed`, or the UI-derived `in-progress` — one
undone state that erases the difference between "haven't started," "set this
aside," and "still chewing on it" ([CONTEXT.md § Step states](../../CONTEXT.md)).
Users need a few more states, in words that feel like theirs. The user can set
any state by hand; the app maintains the bookkeeping states (which step you're
on) automatically, but never authors a judgment about the user — the
no-auto-judgment line, not no-automation (CONTEXT.md § Step states).

### Smallest Useful Shape

Reuse the existing focus-mode state pill (`StatusBadge`, via
[`StepCard.tsx`](../../src/components/StepCard/StepCard.tsx)) and let it carry a
few colored states instead of the current three. Each state is **a color plus a
base name**, and the user can **rename** any state — the renamed word stays
next to the color. **The user can set any state by hand**, overriding whatever
the app is showing. Color is the identity; the word rides alongside it and is
never replaced by it.

Candidate set, from CONTEXT.md, kept minimal:

- `pending` and `completed` — the existing two.
- `in-progress` — the step you're on. At most one per goal; it's an
  app-maintained **pointer**, not a verdict — pure bookkeeping the user would
  otherwise do by hand. When the in-progress step is paused or completed, the
  app **auto-advances** in-progress to the next pending step (the "one next
  step" the task view already promises). The user can also move it by hand —
  setting in-progress on any step clears it from the one that had it. The auto
  part is allowed precisely because it makes no claim about the user; it just
  tracks where they are.
- `paused` — user-set; it tells the goal view the step **can be skipped**, so
  the "one next step" readout routes past it to the next pending step. The user
  pauses and unpauses a step; the app never pauses one on its own. (Pausing the
  in-progress step is the canonical trigger for the auto-advance above: you
  start a step, realize you need the next one first, pause this one, and the
  next becomes in-progress without a second tap.)
- `missed` — present only as a state the **user** can set by hand; never
  applied by the app, never by time passing. The prototype tests whether it
  earns a place at all.

Out of scope here: `waiting-external` (a C dependency relation, not a state),
the `learning` state (parked for Stage 4's H), and Slot (the calendar holds
repetition).

### Later Integrated Shape

- A step's state travels with substeps (A) and with learnings (H reuses an E
  state plus a follows-from link).
- The random-word-from-a-pool playfulness (ADR-0011) sits above this baseline —
  prototyped only if colored, renameable states earn it.

### Must Not Do

- No auto-judgment: time never changes a state, and the app never authors a
  verdict about the user — `missed`, `paused`, and `completed` are user-set, and
  no state is ever derived from an absence or the clock. (App-maintained
  `in-progress` is bookkeeping, not a verdict, and is exempt — see Smallest
  Useful Shape.)
- No counting, scoring, or aggregating states.
- No "failed / overdue / skipped" base names (CONTEXT.md _Avoid_ list).
- Color is never the sole carrier — the word is always visible beside it.

### Prototype Questions

1. Which states earn a place beyond `pending`/`completed` — does `missed`
   belong, set by hand?
2. Do the base names read right before anyone renames them, and does "pending"
   still read like database-speak?
3. Does color + word stay legible in highContrast and the muted autismFriendly
   palette?
4. Does letting a user rename a state make it feel like theirs, or just add a
   step?
5. When the goal view skips a `paused` step, what does the card show — the next
   pending step — and what happens when every remaining step is paused? (Touches
   the task-view promise; a paused step stays visible in the step list, it is
   not hidden.)
6. Does the pause → next-becomes-in-progress auto-advance read as the app being
   helpful, or as the app deciding something for the user? Does it ever advance
   to a step the user didn't want next — and is a hand-override enough to undo
   it, or does the auto-advance need to be opt-in?

### Scenario

Tomás missing two practice-panel weekends
([CONTEXT.md example dialogue](../../CONTEXT.md)) — the case that asks whether
`missed` is a state and whether the user, not the app, sets it.

### Evidence To Collect

- Which base states got used, which got renamed, and to what.
- Screenshots of the pills in highContrast and autismFriendly.
- Whether any state read as a label of failure.

### Exit Criteria

- The prototype questions above have recorded answers (or recorded non-answers
  with what blocked them).
- Guardrail checklist from
  [phase-b-stage-0-deliverables.md](./phase-b-stage-0-deliverables.md) passes —
  especially no-auto-judgment and absence-uninterpreted.
- A decision-gate outcome is recorded; graduation to a schema ADR or design
  decision additionally requires real ND-user evidence (self-testing caps the
  outcome at revise / split / more prototyping).

### Dependencies

- **Existing step pill** (`StatusBadge`) — the surface reused; the prototype
  widens its state set.
- **Task-view contract** — `paused` routes the "one next step" readout past the
  step; the readout must still resolve to one next thing (baseline record
  §Task-view contract).
- **A: Substeps** — substeps will carry states too; this prototype keeps to
  flat steps.
- **H: Learnings** — H reuses an E state (Stage 4); the `learning` state is
  parked until then.
