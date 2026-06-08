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

## Prototype Sequence

The prototype sequence should move from simple Step richness toward integrated
behavior. Do not launch ten independent feature tracks at once.

### Stage 0: Baseline

Purpose: establish what the current Step can and cannot hold before adding new
capabilities.

- Document current Step behavior: title, order, evidence, and
  `pending` / `completed`.
- Reconfirm the task view promise: one next step per active goal.
- Create a lightweight prototype shell or low-fidelity flow format if needed.
- Define common evaluation criteria for all prototypes.

Exit criteria:

- Current behavior is documented clearly enough to compare against prototypes.
- Prototype evidence format is agreed.
- Guardrail checklist is available for every prototype.

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

## Open Questions Register

Track unresolved questions in this table as prototypes produce evidence.

| Question                     | Current Hypothesis                                                                                                 | Blocking Prototype            | Owner | Status |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------- | ----- | ------ |
| Substructure depth           | Two levels may cover the current scenarios, but arbitrary depth may better match learning structures.              | A + task view prototype       | Joe   | Open   |
| State vocabulary scope       | A base vocabulary with user-renamable or extendable labels may be enough, but per-goal scope is unresolved.        | E prototype                   | Joe   | Open   |
| H UI treatment               | A learning may need to show both original framing and learned outcome, but exact presentation is unresolved.       | H prototype                   | Joe   | Open   |
| Temporal functions and Slots | Recurrence may need dated Slots; marker and deadline may not.                                                      | Stage 3 time prototypes       | Joe   | Open   |
| Task-view implications       | "Next Step" may mean next leaf, next umbrella, next non-waiting Step, or next dated unit depending on composition. | Stage 5 integration prototype | Joe   | Open   |

## Relationship To ADRs

- **ADR-0010** decides what Phase B commits to and refuses.
- **This plan** defines how to learn the feature shape before production work.
- **Later ADRs** should record durable schema, state, relationship, and
  interaction decisions that emerge from prototype evidence.
