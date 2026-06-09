# Phase B Step-Model Prototype Plan

## Purpose

This plan translates
[ADR-0010](../decisions/ADR-0010-phase-b-step-model-crosswalk.md)'s Phase B
Step-model commitments into prototype work.

The goal is not to jump directly from the crosswalk to schema or production UI.
The goal is to learn the shape of the features in a controlled order:

- start with isolated capabilities;
- test one uncertainty at a time;
- preserve all ADR-0010 guardrails;
- work toward an integrated Step experience; and
- produce evidence for later schema, design, and implementation decisions.

## Prototype Principles

- Prototype behavior before schema.
- Keep early prototypes reversible.
- Test one uncertainty at a time where possible.
- Use the existing personas and failure scenarios from
  [step-model-gap.md](../research/step-model-gap.md).
- Judge features together only after understanding their isolated behavior.
- Preserve the universal no-auto-state rule in every temporal experiment.
- Do not turn absence into a score, interpretation, count, prompt, or verdict.
- Treat Slot as a working hypothesis until prototyping proves or rejects it.
- Keep G review opt-in structural: the review exists only when the user creates
  one.

## Prototype Medium

The medium determines what evidence a prototype can produce, so it is chosen
deliberately per cluster, not defaulted. The menu, roughly in order of cost:

- **Paper or sketch:** vocabulary, naming, and presentation questions.
- **Clickable flow (Figma or similar):** navigation, placement, and
  composition questions.
- **Throwaway screen in the app behind a dev flag:** interaction-feel
  questions that need real input, real lists, and real device ergonomics.
- **Lived-with build:** questions that only answer themselves across real
  days of use.

Some questions cannot be answered below a certain rung:

- Stage 3's time questions — "what remains visible after a date passes,"
  Slot persistence, recurrence behavior — require a lived-with build. Paper
  cannot simulate a Tuesday passing.
- F's friction question requires real mid-work conditions; a walkthrough of a
  capture flow measures nothing about capture under load.
- E's vocabulary and H's presentation can start on paper and only move up a
  rung when naming stabilizes.

Stage 0 records the medium menu; each stage's entry includes choosing the
medium per prototype and noting it in the prototype record.

## Evidence Sources

Prototype evidence comes from two sources with different weight:

- **Self-testing and living-with (continuous, weakest):** Joe builds, walks
  the persona scenarios, and lives with on-device prototypes day to day. This
  is the default evidence stream for every prototype and is enough to justify
  the **revise**, **split**, and **more prototyping** decision-gate outcomes.
- **Real ND users (required at gates):** a stage's findings cannot graduate
  through a decision gate to a schema ADR, design decision, or implementation
  issue on self-testing alone. At least one session with a real ND user on
  that stage's prototypes is required evidence first.

The reason for the gate requirement is structural, not procedural: this is an
anti-pathologizing instrument, and the designer cannot surprise himself with a
shame response he designed against. ADR-0006 exists because real user testing
falsified the flat Step; the same channel is what validates its replacement.

A prototype record based on self-testing only says so explicitly in its
Observations section, so later readers can weigh the evidence correctly.

## Target Vision

The integrated direction is a Step model where a user can decompose real work,
carry context, work with time without shame, and preserve learning without the
app turning into a constraint engine or surveillance surface.

One target journey:

1. A user creates a Goal and decomposes one Step into known substructure.
2. They order the sub-steps because the sequence is part of the learning.
3. One sub-step becomes externally waiting, so the app names that waiting
   without implying user failure.
4. Another sub-step carries a one-line context note so the user can re-enter
   the work later.
5. A Step is placed softly "for Tuesday" as a time foothold.
6. During work, the user discovers new substructure and captures it without
   leaving the work mentally.
7. A Step's premise turns out wrong; the original Step persists as a learning,
   and the corrected Step follows from it.
8. Later, if the user chooses, they attach a free-form review to the Goal and
   use prior learnings as material for future similar work.

This is a direction for prototypes, not a production interaction contract.

## Feature Shape Template

Filled feature-shape sections live in
[phase-b-feature-shapes.md](./phase-b-feature-shapes.md), one section per
enrichment. They are written just-in-time, not all up front: each stage begins
by instantiating the template for that stage's letters, and a prototype does
not start until its letter's feature shape exists.

Each feature-shape section should use this template:

```markdown
## <Letter>: <Feature Name>

### User Need

What user problem from the scenarios this feature answers.

### Smallest Useful Shape

The smallest behavior worth prototyping in isolation.

### Later Integrated Shape

How the feature may behave once combined with the rest of the Step model.

### Must Not Do

Punitive, pathologizing, premature, or out-of-scope behavior this feature must
avoid.

### Prototype Questions

The specific uncertainties the prototype should answer.

### Scenario

The persona/scenario slice used to test the feature.

### Evidence To Collect

What observations, notes, screenshots, or user reactions count as useful
prototype evidence.

### Exit Criteria

What must be true before this feature can move to schema/design decisions,
implementation planning, or removal from Phase B.

### Dependencies

Other Step-model capabilities this feature depends on or affects.
```

## Priority And Cut Line

The stage order below is also the priority order. If Phase B runs out of
runway, the cut line is explicit rather than improvised:

- **Must-have: Stages 0-2.** The baseline, Step richness (D, E, A), and
  working-with-Steps (F, C-order, C-waiting) clusters are the Phase B core.
  Phase B is not done without decision-gate outcomes for these.
- **Committed but deferrable: Stages 3-4.** Time (B-soft, B-deadlines,
  recurrence/Slot) and learning (H, G) remain ADR-0010 commitments, but their
  prototype work may be deferred to a later phase if runway forces it. A
  deferral is recorded as a decision-gate outcome, not left implicit.
- **Removing a letter from Phase B entirely** still requires a new ADR
  superseding ADR-0010 for that letter. The cut line governs prototype
  sequencing and deferral; it does not quietly shrink the commitment.

Each stage gets a timebox agreed when the stage starts (Stage 0 sets Stage 1's
timebox, and so on). When a timebox expires, record a decision-gate outcome
with the evidence in hand — continue, revise, defer, or escalate — instead of
silently extending the stage.

## Prototype Sequence

The prototype sequence should move from simple Step richness toward integrated
behavior. Do not launch ten independent feature tracks at once.

**Next action:** complete Stage 0 before starting an enrichment prototype. Its
baseline, evidence format, and guardrail checklist become shared inputs to every
later stage.

### Stage 0: Baseline

Purpose: establish what the current Step can and cannot hold before adding new
capabilities.

- Document current Step behavior — the full surface, not just the schema:
  title, user-reorderable `ordinal` ordering, `pending` / `completed` plus the
  UI-derived `in-progress`, `completedAt`, `plannedEvidenceTypes`, and the
  six-modality evidence capture suite attachable to a Step at any time.
- Reconfirm the task view promise: one next step per active goal. Its two
  living implementations today: each goal card surfaces its first pending
  step's title, and focus mode snaps to the first pending step on load.
- Create a lightweight prototype shell or low-fidelity flow format if needed.
- Define common evaluation criteria for all prototypes.

Exit criteria:

- Current behavior is documented clearly enough to compare against prototypes.
- Prototype evidence format is agreed.
- Guardrail checklist is available for every prototype.

Stage 0 deliverables:

- A baseline record of the current Step behavior and task-view contract —
  seeded with file refs in
  [phase-b-stage-0-baseline.md](./phase-b-stage-0-baseline.md).
- A reusable prototype record copied from the template below.
- A reusable guardrail checklist covering no-auto-state, absence handling,
  G opt-in, Slot uncertainty, and informative-only ordering.
- The prototype medium menu, with the medium chosen for each Stage 1
  prototype.

### Stage 1: Step Richness

Purpose: learn what a richer Step is before testing time, reviews, or learning
history.

Prototype in this cluster:

- **D: Per-step context**
- **E: Richer state vocabulary**
- **A: Substructure**

Why this order:

- D is the smallest enrichment: a Step can carry re-entry context.
- E names what kind of Step experience the app can represent.
- A changes Step shape by allowing Steps to contain Steps.

Key questions:

- What context is enough to help re-entry without becoming a journal?
- Which state distinctions are meaningful without becoming labels of failure?
- How much substructure can serve real work without breaking "one next step"?

Deliberately left dangling — Stage 1 must not stall trying to close these:

- **Substructure depth** is not resolved here. Stage 1's A prototype gathers
  behavior evidence, but the depth question graduates only after Stage 5's
  task-view composition (see the Open Questions Register).
- **The `learning` state** is out of Stage 1's E scope. E will bump into it;
  park it for Stage 4's H prototype rather than resolving it early.

### Stage 2: Working With Steps

Purpose: test how Steps change while the user is doing real work.

Prototype in this cluster:

- **F: Mid-work capture**
- **C-order: Sequence as syllabus**
- **C-waiting: External waiting**

Why this order:

- F tests whether discovered structure can land before it is lost.
- C-order tests whether the app can hold sequence as learning.
- C-waiting tests whether the app can name external waiting without scoring the
  user.

Key questions:

- Where does a captured sub-step land?
- Is ordering informative without becoming enforcement?
- Is external waiting a state, relationship, context note, or combination?

### Stage 3: Time

Purpose: test temporal footholds only after the Step itself has enough shape to
carry them.

Prototype in this cluster:

- **B-soft: Soft temporal placement**
- **B-deadlines: Deadline prototype**
- **Recurrence and Slot hypothesis**

Why this order:

- B-soft tests time as a foothold, not accountability.
- B-deadlines tests whether deadline meaning can survive without overdue
  behavior.
- Recurrence and Slot experiments test whether dated units are the right shape
  for recurring Steps.

Key questions:

- What remains visible after a date passes?
- Can a deadline be useful without pressure, scoring, or automatic state?
- Does recurrence need a distinct Slot model?
- Does context belong to the recurring Step, a dated Slot, or both?

### Stage 4: Learning

Purpose: test learning artifacts once Step identity, history, and context are
stable enough to support them.

Prototype in this cluster:

- **H: Misfire as learning**
- **G: User-created goal review**

Why this order:

- H depends on a Step persisting with history and a corrected Step following
  from it.
- G depends on enough goal history to make a free-form review useful.

Key questions:

- What does the user need to preserve from a falsified Step?
- How does the corrected Step follow from the learning without erasing it?
- How does a prior learning become available during a later review?
- Can G remain discoverable without prompts, nudges, or completion triggers?

Stage 4 also closes the `learning`-state edge that Stage 1's E prototype
deliberately parked: whether learning is a state, a transition result, or
both (see the E + H row in the Integration Matrix).

### Stage 5: Integration

Purpose: verify that the features still work when composed.

Prototype integrated persona journeys:

- Tomás: substructure, sequence, context, H learning, later G review.
- Ava: external waiting, expected-date context, richer state vocabulary.
- Malik: discovered substructure and mid-work capture.
- Sam: soft recurrence, Slot hypothesis, optional context, no scoring or
  absence interpretation.

Key questions:

- What counts as the next Step when substructure, order, waiting, and time all
  exist?
- Which relationships compete for attention?
- Do any combined surfaces accidentally imply a score or verdict?
- Are the features still comprehensible without a schema explanation?

Exit criteria:

- Integrated prototypes preserve every ADR-0010 guardrail.
- Conflicting interactions are identified and either resolved or tracked for a
  later ADR.
- The next schema/design ADRs can be scoped from evidence, not speculation.

## Data-Layer Feasibility Spike

Schema decisions stay deferred, but feasibility should not be a surprise. A
half-day, evidence-only spike runs alongside Stage 1 and answers, against the
actual Evolu/SQLite stack (`src/db/schema.ts`):

- Can Evolu represent recursive Steps (A: Steps containing Steps) without
  fighting the sync model?
- Can sibling ordering (C-order) survive local-first sync without conflict
  pathologies?
- Can the `pending` / `completed` state set widen (E) without a destructive
  migration?

The output is a short feasibility note, not a schema decision and not a
migration. Its only job is to surface "the data layer cannot model this
cheaply" before a prototype proves a behavior the stack cannot persist —
that finding is dramatically cheaper during Stage 1 than after it.

## Integration Matrix

| Features          | Question                                                                 |
| ----------------- | ------------------------------------------------------------------------ |
| A + C-order       | Is order defined among siblings, leaves, umbrellas, or some combination? |
| A + F             | Where does a captured Step land?                                         |
| A + task view     | What counts as the next Step?                                            |
| B + E             | How is temporal metadata shown without causing state changes?            |
| B + D             | Does context belong to the recurring Step, a dated Slot, or both?        |
| B + task view     | What remains visible after a date passes?                                |
| C-waiting + E     | Is waiting a state, context, relationship, or combination?               |
| C-order + F       | Does captured structure enter the sequence immediately or later?         |
| D + F             | When is a captured note context, and when is it new substructure?        |
| E + H             | Is learning a state, a transition result, or both?                       |
| G + H             | How does a learning become available during later reflection?            |
| G + no prompts    | How is review discoverable without being prompted?                       |
| Slot + no scoring | How are blank dated units preserved without becoming counts?             |

## Prototype Record Template

Every prototype should leave a short record:

```markdown
## Prototype: <Name>

### Hypothesis

What this prototype is testing.

### What Was Built

Low-fidelity artifact, clickable flow, throwaway screen, paper sketch, or other
prototype material.

### Scenario Tested

Which persona and failure scenario were used.

### Observations

What happened during the test.

### Guardrail Check

Whether the prototype preserved ADR-0010 constraints.

### Decision

Continue, revise, split, defer, remove from Phase B, or escalate to ADR.

### New Questions

Questions created by the prototype.

### Recommended Follow-Up

Schema ADR, design decision, implementation issue, more prototype work, or
removal from scope.
```

## Decision Gates

Prototype findings can graduate into one of these outputs:

- **Schema ADR:** durable data model, state model, or relationship decision.
- **Design decision:** durable interaction, flow, or information-architecture
  decision.
- **Implementation issue:** production work is clear enough to build.
- **More prototyping:** the prototype found a real uncertainty that needs
  another pass.
- **Removed from Phase B:** the capability violates a guardrail, fails to earn
  its complexity, or depends on a later iteration.

Graduating to a schema ADR, design decision, or implementation issue requires
real ND user evidence, not self-testing alone (see Evidence Sources). The
other outcomes can rest on self-testing.

## Open Questions Register

This register is the canonical tracking home for the Step-model open
questions. [step-model-gap.md](../research/step-model-gap.md) holds the
research framing behind each question and ADR-0010 names them, but status,
hypotheses, and ownership are updated here only, as prototypes produce
evidence.

| Question                     | Current Hypothesis                                                                                                                                                                                 | Blocking Prototype            | Owner | Status |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ----- | ------ |
| Substructure depth           | Two levels may cover the current scenarios, but arbitrary depth may better match learning structures.                                                                                              | A + task view prototype       | Joe   | Open   |
| State vocabulary scope       | A base vocabulary with user-renamable or extendable labels may be enough, but per-goal scope is unresolved.                                                                                        | E prototype                   | Joe   | Open   |
| H UI treatment               | A learning may need to show both original framing and learned outcome, but exact presentation is unresolved.                                                                                       | H prototype                   | Joe   | Open   |
| Temporal functions and Slots | Recurrence may need dated Slots; marker and deadline may not.                                                                                                                                      | Stage 3 time prototypes       | Joe   | Open   |
| Task-view implications       | "Next Step" may mean next leaf, next umbrella, next non-waiting Step, or next dated unit depending on composition.                                                                                 | Stage 5 integration prototype | Joe   | Open   |
| D vs existing text evidence  | Per-step context exists today only as text evidence with evidence semantics; D may be a distinct surface (re-entry prominence, own retrieval) or a presentation/retrieval layer over that channel. | D prototype (Stage 1)         | Joe   | Open   |

## Relationship To ADRs

- **ADR-0010** decides what Phase B commits to and refuses.
- **This plan** defines how to learn the feature shape before production work.
- **Later ADRs** should record durable schema, state, relationship, and
  interaction decisions that emerge from prototype evidence.
