# Phase B Step-Model Prototype Plan

## Purpose

This plan translates
[ADR-0010](../decisions/ADR-0010-phase-b-step-model-crosswalk.md)'s Phase B
Step-model commitments — renamed and consolidated into seven features by
[ADR-0011](../decisions/ADR-0011-step-model-names.md) — into prototype work.

The goal is not to jump directly from the commitments to schema or production
UI. The goal is to learn the shape of the features in a controlled order:

- start with isolated capabilities;
- test one uncertainty at a time;
- preserve all ADR-0010 guardrails;
- work toward an integrated Step experience; and
- produce evidence for later schema, design, and implementation decisions.

## The seven features

| Feature             | Formerly (ADR-0010)                              |
| ------------------- | ------------------------------------------------ |
| **A: Substeps**     | A: Granularity / substructure                    |
| **B: Planning**     | B-soft + B-deadlines + the recurrence/Slot spike |
| **C: Dependencies** | C-order + C-waiting                              |
| **Scratchpad**      | D: Per-step context + F: Mid-work capture        |
| **E: Step states**  | E: Richer state vocabulary                       |
| **G: Review**       | G: User-created goal review                      |
| **H: Learnings**    | H: Misfire as learning                           |

What each one is lives in [`CONTEXT.md`](../../CONTEXT.md) (the living
definitions) and ADR-0011 (the re-map and what it decided).

## Prototype Principles

- Prototype behavior before schema.
- Keep early prototypes reversible.
- Test one uncertainty at a time where possible.
- Use the existing personas and failure scenarios from
  [step-model-gap.md](../research/step-model-gap.md).
- Judge features together only after understanding their isolated behavior.
- Preserve the universal no-auto-state rule in every time experiment.
- Do not turn absence into a score, interpretation, count, prompt, or verdict.
- Use the phone's built-in tools (calendar, reminders) before building an
  in-app equivalent; the in-app Slot model is probably unnecessary, and
  Stage 3 verifies that rather than assuming it either way.
- Keep G review opt-in structural: the review exists only when the user creates
  one.

## Prototype Medium

The medium determines what evidence a prototype can produce, so it is chosen
deliberately per stage, not defaulted. The menu, roughly in order of cost:

- **Paper or sketch:** naming and presentation questions.
- **Clickable flow (HTML preferred; Figma or similar also fits):** navigation,
  placement, and composition questions. HTML is the default on this rung — it
  is quick, genuinely interactive, and makes generating several variants of
  the same surface side by side cheap, which is exactly what
  compare-the-presentations questions need.
- **Throwaway screen in the app behind a dev flag:** interaction-feel
  questions that need real input, real lists, and real device ergonomics.
- **Lived-with build:** questions that only answer themselves across real
  days of use.

Some questions cannot be answered below a certain rung:

- Stage 3's planning questions — "what remains visible after a date passes,"
  whether calendar delegation actually covers the repeating scenarios —
  require a lived-with build. Paper cannot simulate a Tuesday passing.
- The Scratchpad's mid-work friction question requires real mid-work
  conditions; a walkthrough of a capture flow measures nothing about capture
  under load. (Ink input in React Native is a real lift, but it prototypes
  cheap in HTML.)
- E's word pools and H's presentation can start on paper and only move up a
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
showed the flat Step couldn't hold real work; the same channel is what
validates its replacement.

A prototype record based on self-testing only says so explicitly in its
Observations section, so later readers can weigh the evidence correctly.

## Target Vision

The integrated direction is a Step model where a user can break real work
into substeps, carry context, work with time without shame, and keep
learnings without the app turning into a constraint engine or surveillance
surface.

One target journey:

1. A user creates a Goal and breaks one Step into the substeps they already
   know about.
2. They reorder the substeps because the sequence is part of the learning.
3. One substep depends on something external — a person, a reply — so the
   app names that dependency without implying user failure.
4. Another substep carries a short note so the user can re-enter the work
   later.
5. A Step is planned "for Tuesday" — a date, pushed one-way to the phone's
   calendar if the user wants it there.
6. During work, the user throws a discovery onto the scratchpad without
   leaving the work mentally, and later drags it out to become a substep.
7. A Step doesn't go to plan; the user marks it with their own word, keeps it
   as a learning, and the corrected Step follows from it.
8. Later, if the user chooses, they make the goal's review — an edit pass
   over the scratchpad and the journey — and prior learnings become material
   for future similar work.

This is a direction for prototypes, not a production interaction contract.

## Feature Shape Template

Filled feature-shape sections live in
[phase-b-feature-shapes.md](./phase-b-feature-shapes.md), one section per
feature. They are written just-in-time, not all up front: each stage begins by
instantiating the template for that stage's features, and a prototype does not
start until its own feature shape exists.

Each feature-shape section should use this template:

```markdown
## <Identifier>: <Feature Name>

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

- **Must-have: Stages 0-2.** The baseline, Step richness (A: Substeps,
  E: Step states), and working-with-Steps (Scratchpad, C: Dependencies)
  stages are the Phase B core. Phase B is not done without decision-gate
  outcomes for these.
- **Committed but deferrable: Stages 3-4.** Planning (B) and learning (H, G)
  remain ADR-0010 commitments, but their prototype work may be deferred to a
  later phase if runway forces it. A deferral is recorded as a decision-gate
  outcome, not left implicit.
- **Removing one of the seven features from Phase B entirely** still requires a
  new ADR superseding ADR-0010. The cut line governs prototype sequencing and
  deferral; it does not quietly shrink the commitment.

Each stage gets a timebox agreed when the stage starts (Stage 0 sets Stage 1's
timebox, and so on). When a timebox expires, record a decision-gate outcome
with the evidence in hand — continue, revise, defer, or escalate — instead of
silently extending the stage.

## Prototype Sequence

The prototype sequence should move from simple Step richness toward integrated
behavior. Do not launch seven independent feature tracks at once.

> **Stage regrouping (2026-06-12):** ADR-0011's merges reshaped the stages —
> the old Stage 1 (D, E, A) and Stage 2 (F, C-order, C-waiting) could not
> survive D + F becoming the Scratchpad. The shape below is the proposed
> regrouping; the cut line, timebox, and evidence-source rules are unchanged.

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
  G opt-in, calendar-holds-repetition, no app-icon badge counts, and
  informative-only dependencies.
- The prototype medium menu, with the medium chosen for each Stage 1
  prototype.

The last three deliverables are drafted in
[phase-b-stage-0-deliverables.md](./phase-b-stage-0-deliverables.md), which
also records the Stage 1 timebox and the deliberate A-first Stage 1 order.

### Stage 1: Step Richness

Purpose: learn what a richer Step is before testing dependencies, time, or
learning history.

Prototype in this stage:

- **A: Substeps** (in flight — layout prototypes built, findings pending)
- **E: Step states**

Why this order:

- A changes Step shape by allowing Steps to contain Steps, and is already in
  flight.
- E names what kind of Step experience the app can represent — color as the
  state's identity, a word from a small pool as its label.

Key questions:

- How many substeps can serve real work without breaking "one next step"?
- Which state distinctions are meaningful without becoming labels of failure?
- Do the word pools land — does a randomly picked word read as playful or as
  noise, and do the pools hold up in highContrast and the muted
  autismFriendly palette?

Deliberately left dangling — Stage 1 must not stall trying to close these:

- **Substep depth** is not resolved here. Stage 1's A prototype gathers
  behavior evidence, but the depth question graduates only after Stage 6's
  task-view composition (see the Open Questions Register).
- **The `learning` state** is out of Stage 1's E scope. E will bump into it;
  park it for Stage 4's H prototype rather than resolving it early.

### Stage 2: Dependencies

Purpose: test how Steps relate to each other and to the outside world while
the user is doing real work.

Prototype in this stage:

- **C: Dependencies**

Why C here:

- C tests whether the app can hold dependencies — internal and external —
  that inform without scoring the user. It needs only the richer Step from
  Stage 1; it does not need the Scratchpad, which now lands last (Stage 5).

Key questions:

- What does the dependency marker say ("depends on" — never "blocked by"),
  and what does a step with a not-yet-satisfied dependency show?

### Stage 3: Planning

Purpose: test the three time shapes only after the Step itself has enough
shape to carry them.

Prototype in this stage:

- **B: Planning** — date, deadline, repeating
- **Calendar-delegation spike** (replaces the old Slot hypothesis): verify
  that one-way calendar push plus user-set reminders cover the repeating
  scenarios without an in-app recurrence model.

Key questions:

- What remains visible after a date passes?
- Can a deadline stay useful while staying factual — no red, no "overdue,"
  no alarm state, no automatic state change?
- Does calendar delegation cover Sam's Tuesdays, or does anything genuinely
  need to live in the app?
- Do one-shot reminders (fire once, no re-ping, no follow-up) carry their
  weight?

### Stage 4: Learning

Purpose: test learning artifacts once Step identity and states are stable
enough to support them.

Prototype in this stage:

- **H: Learnings**
- **G: Review**

Why this order:

- H is a combination of things Stages 1-2 built: an E state + a C-style link
  - journey display.
- G is **re-scoped to not require the Scratchpad** (which now lands at Stage
  5). For this stage the review is an edit pass over the goal's **journey and
  its H learnings** — both of which exist by now. The pad-curation facet of
  the review (`G + Scratchpad`: does curating consume the mess or copy it?) is
  deferred to the Scratchpad stage and its integration, not prototyped here.

Key questions:

- Does the two-question path ("What happened?" / "What does it change?")
  invite without gating — and does "not now" get used honestly?
- How does a learning display with pride in the journey — per-item, showable,
  never counted or aggregated?
- Does the completion-flow text field work as the doorway, with the full
  review reachable anytime from the goal?
- Can G remain discoverable without prompts, nudges, or completion triggers?

Stage 4 also closes the `learning`-state edge that Stage 1's E prototype
deliberately parked: the state is user-set with a pool word (ADR-0011); what
remains open is presentation and the two-question flow around it.

### Stage 5: Scratchpad

Purpose: prototype the Scratchpad last, in isolation, once every surface it
might touch already exists.

Prototype in this stage:

- **Scratchpad**

Why last:

- It is the feature with the most open conceptual and design questions while
  everything else is comparatively clear; sequencing it last lets the simpler,
  higher-priority features (Goals, Steps, dependencies, planning, learning)
  land and work first, leaving room to fail on the Scratchpad without
  jeopardizing them.
- By Stage 5 every drag-out target already exists — substeps (A), evidence and
  step notes, dependencies (C) — so the pad is prototyped against real
  landing places rather than speculative ones, and its integration becomes a
  defined question instead of a moving one.
- Nothing upstream depends on it: A and C only meet it in integration
  questions, and G's review has been re-scoped to not require the pad (Stage
  4). So the Scratchpad blocks no other feature.

Key questions:

- Per-goal pad or one global pad?
- Which drag-out targets exist (substep, evidence, step note), and does the
  original stay in the pad?
- Does the mid-work capture actually reduce friction under real mid-work
  conditions (the question that needs a lived-with build)?

> **Candidate to spin out (2026-06-14):** the Scratchpad may graduate into its
> own iteration/phase rather than closing inside Phase B. Its conceptual and
> design surface is large enough, and its isolation here clean enough, that
> deferring it to a dedicated iteration is a legitimate decision-gate outcome —
> recorded explicitly when the gate is reached, not assumed now.

### Stage 6: Integration

Purpose: verify that the features still work when composed.

Prototype integrated persona journeys:

- Tomás: substeps, internal dependencies, scratchpad notes, an H learning,
  later a G review.
- Ava: external dependencies, expected-date notes, step states.
- Malik: substeps discovered mid-work, captured on the scratchpad and dragged
  out.
- Sam: a repeating Tuesday held by the calendar, optional notes, no scoring
  or absence interpretation anywhere.

Key questions:

- What counts as the next Step when substeps, dependencies, and dates all
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

- Can Evolu represent Steps containing Steps (A: Substeps) without fighting
  the sync model?
- Can sibling ordering survive local-first sync without conflict pathologies?
- Can the `pending` / `completed` state set widen (E) without a destructive
  migration?

The output is a short feasibility note, not a schema decision and not a
migration. Its only job is to surface "the data layer cannot model this
cheaply" before a prototype proves a behavior the stack cannot persist —
that finding is dramatically cheaper during Stage 1 than after it.

**Status: done 2026-06-11.** Findings in
[evolu-step-model-feasibility-spike.md](../research/evolu-step-model-feasibility-spike.md)
— no blocker for any of the three questions.

## Integration Matrix

| Features       | Question                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------ |
| A + C          | Is order and dependency defined among siblings, leaves, parents, or some combination?                        |
| A + task view  | What counts as the next Step?                                                                                |
| A + Scratchpad | When a pad item is dragged out to become a substep, where does it land under a parent?                       |
| B + E          | How is planning information shown without implying a state change?                                           |
| B + task view  | What remains visible after a date passes?                                                                    |
| B + no counts  | Do passed dates stay factual on every surface — no red, no "overdue," no app-icon badge?                     |
| C + task view  | Does "one next step" route around a step whose external dependency isn't satisfied, or name it and stay put? |
| C + Scratchpad | Does dragged-out structure enter the order immediately or later?                                             |
| E + H          | A learning is an E state plus a follows-from link — does the journey display need anything beyond those two? |
| G + Scratchpad | What does the review's edit pass leave behind in the pad — does curating consume the mess or copy it?        |
| G + H          | How does a learning become available during a later review?                                                  |
| G + no prompts | How is the review discoverable without being prompted — doorway plus anytime-entry, nothing else?            |

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
research framing behind each question and ADR-0010/ADR-0011 name them, but
status, hypotheses, and ownership are updated here only, as prototypes
produce evidence.

| Question                  | Current Hypothesis                                                                                                                                                                                                                                                                | Blocking Prototype                       | Owner | Status |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ----- | ------ |
| Substep depth             | Two levels may cover the current scenarios, but arbitrary depth may better match learning structures. A layout-pass pinch (2026-06-13): one level holds Sam's Steps 1/2/3, but "Step 4 — inventory" wants its own sub-structure. Observed, not resolved; graduates after Stage 6. | A + task view prototype                  | Joe   | Open   |
| Goal-card readout under A | Layout pass (2026-06-13) leans **leaf-led**: a parent-led card surfaces the project area, costing an extra read to reach the action, and strains "one next step." Open until the real cold-return test on the dev-flag rung confirms it.                                          | A prototype (records: A-substructure.md) | Joe   | Open   |
| E word pools              | Color = state identity and word-from-a-pool are decided; pool contents get authored during prototyping. User-editable pools, and whether `pending`/`completed` keep their UI names, are open.                                                                                     | E prototype                              | Joe   | Open   |
| Scratchpad scope          | Probably per-goal rather than global; drag-out targets (substep, evidence, step note) and whether the original stays in the pad are open.                                                                                                                                         | Scratchpad prototype (Stage 5)           | Joe   | Open   |
| Scratchpad vs evidence    | The pad may absorb the re-entry role that per-step text evidence plays today, or sit beside it; what dragging out to "evidence" or "step note" does to the original is part of the same question.                                                                                 | Scratchpad prototype (Stage 5)           | Joe   | Open   |
| Dependency display        | "Depends on" (never "blocked by") is the working wording; what a step with a not-yet-satisfied dependency shows is unresolved.                                                                                                                                                    | C prototype (Stage 2)                    | Joe   | Open   |
| Calendar delegation       | The in-app Slot model is probably unnecessary — one-way calendar push plus user-set reminders may cover all repeating scenarios. Verify, don't assume.                                                                                                                            | Stage 3 planning prototypes              | Joe   | Open   |
| H invitation honesty      | The two-question path with a quiet "not now" should invite without gating — whether "not now" gets used honestly only shows up in real use.                                                                                                                                       | H prototype (Stage 4)                    | Joe   | Open   |
| Task-view implications    | "Next Step" may mean next leaf, next parent, next step without an unsatisfied dependency, or next dated step depending on composition.                                                                                                                                            | Stage 6 integration prototype            | Joe   | Open   |

## Relationship To ADRs

- **ADR-0010** decides what Phase B commits to and refuses.
- **ADR-0011** renames and consolidates the ten letter-rows into the seven
  features, carrying every commitment and guardrail forward.
- **This plan** defines how to learn the feature shape before production work.
- **Later ADRs** should record durable schema, state, relationship, and
  interaction decisions that emerge from prototype evidence.
