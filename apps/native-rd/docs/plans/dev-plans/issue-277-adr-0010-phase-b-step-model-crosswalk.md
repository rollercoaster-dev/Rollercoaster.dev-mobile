# Development Plan: Issue #277

## Issue Summary

**Title:** ADR-0010: per-letter A-H <-> Phase B crosswalk (supersedes ADR-0006)
**Type:** Documentation / architecture decision
**Complexity:** Medium
**Issue:** https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/277

## Objective

Draft ADR-0010 as the Phase B commitment crosswalk for the Step model's A-H
taxonomy. For each of the eight letters and ten candidate enrichments, record:

- what Phase B commits to building;
- what Phase B explicitly does not commit to building;
- which already-settled structural guardrails constrain the work; and
- which details remain open for prototyping or later ADRs.

ADR-0010 supersedes ADR-0006's research-level Step-model scope decision without
reopening the vocabulary and guardrails frozen by PR #219.

## Source Of Truth

- `apps/native-rd/CONTEXT.md`
- `apps/native-rd/docs/research/step-model-gap.md`
- `apps/native-rd/docs/decisions/ADR-0001-iteration-strategy.md`
- `apps/native-rd/docs/decisions/ADR-0006-iteration-b-scope-amendment.md`
- `apps/native-rd/docs/decisions/index.md`
- Issue #277

When these sources differ in altitude, use `CONTEXT.md` for frozen vocabulary
and structural guardrails, `step-model-gap.md` for research framing and open
questions, and ADR-0006 for the decision being superseded.

## Scope Boundaries

### In Scope

- One new ADR:
  `apps/native-rd/docs/decisions/ADR-0010-phase-b-step-model-crosswalk.md`.
- A per-enrichment Phase B crosswalk covering A, B-soft, B-deadlines, C-order,
  C-waiting, D, E, F, G, and H.
- A status update in ADR-0006 that points readers to ADR-0010.
- An ADR index entry for ADR-0010.
- Reference-only treatment of settled structural guardrails.

### Out Of Scope

- Database tables, columns, enums, migrations, or state-machine design.
- UI treatments, interaction flows, component choices, or screen placement.
- Closing the open questions about substructure depth, state vocabulary scope,
  H's UI treatment, temporal functions and Slots, or task-view behavior.
- Treating the Slot hypothesis as a settled data model.
- Implementation tickets for individual enrichments.
- Rewriting the research scenarios or frozen vocabulary.

## Locked Guardrails

These are inputs to ADR-0010, not decisions for ADR-0010 to reconsider.

- [x] State the universal no-auto-state rule: time passing never changes a
      Step's state.
- [x] State that the app never interprets, scores, or aggregates an absence.
- [x] Apply that rule across marker, deadline, and recurrence temporal
      functions.
- [x] Preserve B-deadlines as a prototype candidate while excluding the
      missed-deadline-ledger shape.
- [x] Preserve G's existence-as-opt-in: a review exists only when the user
      creates one.
- [x] Exclude prompts, scoring, completion triggers, nudges, and per-goal-type
      review defaults from G.
- [x] Describe Slot as a working hypothesis whose final shape depends on
      prototyping.
- [x] Keep C-as-constraint out: ordering may inform the user, but the app does
      not refuse actions because a prerequisite is incomplete.

## Decision Record Shape

Use a compact crosswalk table as the core of ADR-0010. Each row should contain:

| Column                    | Purpose                                             |
| ------------------------- | --------------------------------------------------- |
| Enrichment                | Canonical A-H identifier                            |
| Phase B commitment        | User-visible capability Phase B agrees to provide   |
| Explicit non-commitment   | Nearby punitive, premature, or out-of-scope shape   |
| Guardrails and open edges | Locked constraints plus prototype-dependent details |

Keep the table at story altitude. A row should be concrete enough to guide
later ADRs and tickets, but should not prescribe schema or UI.

## Tracking Plan

### Step 1: Establish ADR Framing

- [x] Add ADR metadata: date, status (accepted in this PR), owner, and a
      `Supersedes` link to ADR-0006.
- [x] Explain that ADR-0006 admitted Step-model enrichment into Phase B at
      research altitude.
- [x] Explain that PR #219 froze the vocabulary and user-altitude framing.
- [x] Define ADR-0010's job as choosing Phase B commitments, not mechanisms.
- [x] Add a short section carrying the locked guardrails forward by reference.

### Step 2: Decide A - Granularity / Substructure

- [x] Commit Phase B to Steps containing Steps so users can preserve known or
      discovered substructure.
- [x] Cover both known-up-front structure and structure discovered mid-work.
- [x] Explicitly avoid deciding one-level, two-level, or arbitrary depth.
- [x] Note that task-view interpretation remains an open follow-up.

### Step 3: Decide B-soft - Soft Temporal Placement

- [x] Commit Phase B to a soft temporal function that creates a time foothold,
      such as "for Tuesday."
- [x] Distinguish temporal placement from deadline accountability.
- [x] Apply the universal no-auto-state rule.
- [x] Leave marker interaction, persistence, and task-view treatment to
      prototyping.

### Step 4: Decide B-deadlines - Deadline Prototype

- [x] Keep deadline as a candidate temporal function Phase B will prototype.
- [x] Require the prototype to demonstrate useful meaning without automatic
      state changes or user evaluation.
- [x] Explicitly exclude overdue status, missed-deadline ledgers, absence
      counts, and pressure-oriented accountability behavior.
- [x] Avoid deciding whether deadline survives prototyping into the final
      interaction model.

### Step 5: Decide C-order - Sequence As Syllabus

- [x] Commit Phase B to user-authored ordering or dependency information that
      preserves the sequence of learning and work.
- [x] Frame the relationship as informative structure rather than enforcement.
- [x] Explicitly exclude dependency-as-constraint-engine behavior.
- [x] Leave graph representation and editing UI to later design work.

### Step 6: Decide C-waiting - External Waiting

- [x] Commit Phase B to representing that a Step is waiting on an external
      person, organization, event, or condition.
- [x] Preserve the distinction between external waiting and user inaction.
- [x] Ensure the vocabulary names state without scoring the user.
- [x] Avoid locking whether waiting is modeled as a state, relation, metadata,
      or combination of those.

### Step 7: Decide D - Per-Step Context

- [x] Commit Phase B to a lightweight context surface attached to the relevant
      Step or temporal unit.
- [x] Preserve the one-line retrieval-support intent.
- [x] Cover expected-date context and notes-for-future-self without merging D
      into evidence or review.
- [x] Avoid deciding field structure, length limits, or editor treatment.

### Step 8: Decide E - Richer State Vocabulary

- [x] Commit Phase B to vocabulary richer than `pending` / `completed`.
- [x] Require state names to describe experience without pathologizing or
      scoring it.
- [x] Preserve the universal rule that time never assigns a state.
- [x] Leave the final vocabulary, user-renaming behavior, per-goal scope, and
      system-derived states open.

### Step 9: Decide F - Mid-Work Capture

- [x] Commit Phase B to a low-friction landing place for structure or insight
      discovered during work.
- [x] Connect the commitment to preserving bursts of thought before a context
      switch.
- [x] Keep F distinct from completion evidence and from G reviews.
- [x] Avoid prescribing tap counts, navigation, modal structure, or capture
      media.

### Step 10: Decide G - User-Created Goal Review

- [x] Commit Phase B to a free-form review that the user may attach to a goal
      whenever they choose.
- [x] Define the review's existence as the opt-in.
- [x] Preserve its forward-reference target: future similar work across goals.
- [x] Explicitly exclude prompts, completion triggers, scores, nudges, required
      reviews, and per-goal-type defaults.
- [x] Keep G distinct from H's step-level learning artifact.

### Step 11: Decide H - Misfire As Learning

- [x] Commit Phase B to preserving a falsified Step as a learning rather than
      replacing or deleting it.
- [x] Commit to a follows-from relationship to the immediately corrected Step
      within the same goal.
- [x] Preserve the structural distinction between a wrong premise and user
      failure.
- [x] Keep H distinct from absence, incomplete work, and G's broader review.
- [x] Leave fields, transition mechanics, and UI treatment to later decisions.

### Step 12: Record Consequences And Follow-Ups

- [x] State that later schema ADRs must implement these commitments without
      weakening the guardrails.
- [x] Name the unresolved questions without attempting to close them.
- [x] Note that design and implementation tickets should be derived only after
      the crosswalk is accepted.
- [x] State that ADR-0010 replaces ADR-0006 as the current Phase B Step-model
      scope reference.

### Step 13: Apply Supersession Updates

- [x] Update ADR-0006's status line to point to ADR-0010 using the existing
      ADR-0001 / ADR-0006 supersession pattern.
- [x] Keep ADR-0006's accepted body unchanged.
- [x] Add ADR-0010 to `docs/decisions/index.md` with the correct status and
      verification date.
- [x] Check references that call ADR-0006 the current Step-model scope and
      update only those that would otherwise become misleading.

### Step 14: Validate The Decision

- [x] Confirm all ten enrichment rows are present: A, B-soft, B-deadlines,
      C-order, C-waiting, D, E, F, G, and H.
- [x] Confirm every row has a commitment and an explicit non-commitment.
- [x] Confirm the no-auto-state rule applies to every temporal function.
- [x] Confirm B-deadlines is not accidentally removed from Phase B.
- [x] Confirm G has no prompt or implicit opt-in.
- [x] Confirm Slot remains explicitly prototype-dependent.
- [x] Confirm C-as-constraint remains out.
- [x] Search for schema-shaped commitments, UI prescriptions, or accidental
      resolution of the five open questions and remove them.
- [x] Run Markdown lint or the repository's relevant docs validation.
- [x] Run `git diff --check`.

## Review Prompts

Use these questions while reviewing each row:

1. Is this a user-visible Phase B commitment, or did it drift into an
   implementation mechanism?
2. Does the explicit non-commitment block the most likely punitive or
   pathologizing interpretation?
3. Does the row preserve the vocabulary in `CONTEXT.md`?
4. Did the row accidentally close an open question that requires prototyping?
5. Is the distinction from adjacent letters clear, especially B-soft versus
   B-deadlines, C-order versus C-waiting, D versus F, and G versus H?

## Definition Of Done

- ADR-0010 is accepted as the per-enrichment Phase B commitment crosswalk.
- ADR-0006 points readers to ADR-0010 and otherwise remains immutable.
- The decisions index includes ADR-0010.
- Every candidate enrichment has an explicit commitment, non-commitment, and
  guardrail/open-edge statement.
- No schema, enum, state machine, or UI treatment is prematurely decided.
- The resulting ADR is sufficient to draft focused schema, prototype, design,
  and implementation follow-ups without reopening Phase B scope.
