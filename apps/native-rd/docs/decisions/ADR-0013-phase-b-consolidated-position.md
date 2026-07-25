# ADR-0013: Phase B consolidated position — scope, step model, guardrails

**Date:** 2026-07-25
**Status:** Proposed — becomes Accepted with Joe's sign-off. Accepting this ADR
also accepts [ADR-0011](./ADR-0011-step-model-names.md) and
[ADR-0012](./ADR-0012-no-auto-judgment.md), whose decisions are restated here
unchanged.
**Owner:** Joe
**Supersedes, as the current Phase B reference only:**
[ADR-0001](./ADR-0001-iteration-strategy.md) (Iteration B section),
[ADR-0006](./ADR-0006-iteration-b-scope-amendment.md),
[ADR-0010](./ADR-0010-phase-b-step-model-crosswalk.md),
[ADR-0011](./ADR-0011-step-model-names.md),
[ADR-0012](./ADR-0012-no-auto-judgment.md). All five remain the unedited
historical record and the source of rationale.

---

## Context

The current Phase B position was readable only by mentally diffing a chain of
partial supersessions: ADR-0001 set B's scope, ADR-0006 amended it, ADR-0010
replaced the step-model slice, ADR-0011 renamed and regrouped ADR-0010's rows,
and ADR-0012 renamed and re-scoped one guardrail. Reconstructing net truth from
that chain is exactly where drift happens — ADR-0012's context section records
a review misreading the guardrail because a living doc paraphrased the chain
wrong.

This ADR restates the complete current position in one place. **It makes no new
decisions.** Every commitment, non-commitment, and guardrail below traces to an
ADR in the chain; where wording differs, the source ADR governs.

## Decision

### Iteration B scope (current)

In scope: multiple concurrent goals; pause and resume goals; reorganize steps
between goals (move, copy); scope adjustment (shrink a goal, split it);
multi-device sync via Evolu; hosted verifiable badge link as primary export;
and the seven step-model features below. _(ADR-0001 as amended by ADR-0006)_

Out of scope: goal journal (deferred pending user signal), factual nudges
(deferred pending user signal), badge-to-goal linking (moved to Iteration C;
the `goalId` FK on badges stays), learning stack (removed 2026-05-18).
_(ADR-0006, ADR-0001)_

### The seven step-model features

Names from ADR-0011; commitments and refusals from ADR-0010 carried forward
unweakened. The full per-letter guardrails and open edges live in ADR-0010's
crosswalk table and ADR-0011's re-map table.

| Feature                         | Committed                                                                                                                                                                              | Refused                                                                                                                              |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **A: Substeps**                 | Steps can contain steps — known-up-front or discovered mid-work. Must still serve the task view's "one next step per active goal" promise.                                             | No depth decision yet (one level, two, arbitrary). Task view does not become an outline browser.                                     |
| **B: Planning**                 | Three time shapes: a date ("for Tuesday"), a deadline, repeating. Delegate to phone tools: one-way calendar push, user-set fire-once reminders. Slot hypothesis: probably unnecessary. | No overdue status, missed-deadline ledgers, absence counts, re-pings, or reading the calendar back. A passed deadline stays factual. |
| **C: Dependencies**             | A step can depend on another step (internal) or a person/org/reply/event (external). Waiting is a **relation**, not a state. Informs the user.                                         | Never blocks, hides, or dims. No constraint engine. External waiting is never framed as user failure.                                |
| **Scratchpad** (formerly D + F) | One freeform pad (ink, images, text, fragments) absorbing per-step context and mid-work capture. Items drag out to become a substep, evidence, or note.                                | Nothing lands anywhere automatically — you drag it. Not evidence's register, not a review, no required flow.                         |
| **E: Step states**              | Vocabulary richer than `pending`/`completed`. Color is the state's identity; a word from a per-state pool is always adjacent. `in-progress` is app-maintained (see guardrail below).   | No final state set locked, no time-derived `missed`. `locked` is retired. Color never the sole carrier.                              |
| **G: Review**                   | A free-form review the user may attach to a goal **anytime** — a final edit pass over the goal's scratchpad. The completion-flow text field is the doorway, not the feature.           | No prompt, requirement, completion trigger, score, nudge, or per-goal-type default. Skipping leaves no trace. Opt-in is structural.  |
| **H: Learnings**                | What didn't go to plan, preserved and linked to the corrected step that follows. User assigns the label with their own word. Displayed with pride, per-item, in the goal journey.      | Never counted or aggregated ("no 3 learnings this month"). Not an absence, not user failure, not a G review. Never replaced/deleted. |

### Guardrails (current)

- **No auto-judgment — forbidden, always.** The app never decides the user
  failed, missed, fell behind, or broke a streak; never counts, scores, or
  aggregates an absence; time passing never changes a step's state. _(ADR-0012,
  renaming ADR-0010's no-auto-state)_
- **Auto-bookkeeping — allowed, and the reason to build software.** Tracking
  which step you're on, advancing on pause/complete, 3-of-5-done, parent-done
  arithmetic. The test: does it interpret absence as failure or score the user?
  Forbidden. Is it reversible bookkeeping the user could do by hand? Do it.
  _(ADR-0012)_
- **Every state is hand-editable.** The user overrides anything the app shows;
  the override keeps automation on the right side of the line. _(ADR-0012)_
- **`in-progress` is a real, app-maintained state** — at most one per goal,
  auto-advancing when a step is paused or completed. _(ADR-0012)_
- **No app-icon badge counts, ever.** A red "3" is a missed-things ledger.
  _(ADR-0011)_

### Reading rule

This ADR and [`index.md`](./index.md) are the current reference. Read the
superseded chain only when rationale or history is needed. Changes to anything
restated here require a new ADR superseding ADR-0013 (and, where the change
touches the anti-pathologizing core, saying so explicitly). Do not amend this
ADR in place.

## Consequences

- Living docs (CONTEXT.md, feature shapes, prototype plans) cite ADR-0013 for
  the current position instead of the chain.
- The open questions remain open and tracked in the
  [Open Questions Register](../plans/phase-b-step-model-prototypes.md#open-questions-register):
  substructure depth, state pools and per-goal customization, H's UI treatment,
  calendar-delegation coverage, task-view implications, and ADR-0012's reopened
  A-prototype Q9 (auto-complete of parents as prototype question).
- Superseded ADRs carry a status-line pointer here; their bodies stay unedited.
- When a future chain of partial supersessions on any topic reaches roughly
  three deep, write a new consolidating ADR like this one.

---

_Proposed 2026-07-25. One document to know where we stand; five to know why._
