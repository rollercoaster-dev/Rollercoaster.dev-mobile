# ADR-0012: No-auto-judgment (reframing the no-auto-state guardrail)

**Date:** 2026-06-14
**Status:** Proposed — becomes Accepted with Joe's sign-off
**Owner:** Joe
**Supersedes:** [ADR-0010](./ADR-0010-phase-b-step-model-crosswalk.md) — the
no-auto-state guardrail's name and scope only; carried forward by
[ADR-0011](./ADR-0011-step-model-names.md) untouched until now.

---

## Context

ADR-0010 committed Phase B to a **no-auto-state** guardrail: "time passing never
changes a Step's state." Its purpose is the ADR-0006 anti-pathologizing core —
the app must never decide the user failed, missed, fell behind, or broke a
streak.

In the living docs the name drifted. "No-auto-state" hardened into "the app
never decides _any_ state," and the E feature-shape draft restated it as "the
user sets a step's state by hand" / "the app never deciding which state a step
is in." Under that reading, a review flagged `in-progress` — the app
highlighting the step you're working on — as a _guardrail violation_.

That is the wrong line. An app that cannot track which step you're on, advance
when you finish one, or do any bookkeeping is a digital legal pad. The point of
building software is leverage; the guardrail was never meant to forbid that. The
original ADR-0010 text is in fact narrow — only _time_ and _absence_ — and the
broad gloss was the drift, not the commitment.

## Decision

**Rename the guardrail to no-auto-judgment** and split the two things that wore
one name:

- **Auto-judgment — forbidden, always.** The app decides the user failed,
  missed, fell behind, or broke a streak; the app counts, scores, or aggregates
  an _absence_. This is the ADR-0006 / ADR-0010 commitment, unchanged.
- **Auto-bookkeeping — allowed, and the reason to build software.** The app
  tracks which step you're on, advances it when you pause or complete one, shows
  3-of-5-done, marks a parent done when every child is checked. Reversible,
  correctable, asserts nothing about the user's worth.

**The test for any automation:** does it interpret an _absence_ as failure, or
count/score the user against a standard? Then it is forbidden. Is it reversible
bookkeeping the user could have done by hand? Then do it — making the process
easier is the job.

**`in-progress` becomes a real, app-maintained state.** At most one per goal: a
pointer to the step the user is on. When that step is **paused** or
**completed**, the app advances `in-progress` to the next pending step on its
own (start a step, realize you need the next one first, pause it, and the next
becomes in-progress without a second tap). This is bookkeeping, exempt from the
rule. Today it is UI-derived from focus selection (`src/types/steps.ts`); under
E it is persisted.

**Every state is hand-editable.** The user can set any state by hand, overriding
whatever the app shows; setting `in-progress` on a step clears it from whichever
step held it. The override is what keeps the automation on the right side of the
line — a default the user can always correct, never a verdict imposed.

**`locked` is retired.** It survives today only as a `StatusBadge` variant that
`TimelineStep` maps `pending` onto. "Locked" implies a gate the user can't pass
— dependency framing (C) and failure-flavored. Under E, `pending` is just
`pending`; an unsatisfied dependency is shown by C's relation, not a state.

## Consequences

- CONTEXT.md § Step states adopts no-auto-judgment, adds `in-progress` and a
  hand-editable note, and retires `locked`.
- The E feature shape ([phase-b-feature-shapes.md §E](../plans/phase-b-feature-shapes.md))
  gains `in-progress` + the pause→auto-advance behavior and a prototype question
  testing whether the auto-advance reads as helpful or as the app deciding for
  the user.
- The Stage 0 guardrail checklist line renames to **No auto-judgment** with the
  bookkeeping carve-out; the prototype plan's principle renames to match.
- **Reopens A-prototype Q9.** The A substep record (Q9) recorded parent
  completion as manual-only on no-auto-state grounds. Under no-auto-judgment,
  "all parts checked → parent done" is reversible arithmetic, not a verdict, so
  auto-complete is now _permissible_ — a prototype question, not a settled
  manual-only rule. The recorded observation stands; the constraint behind it
  changes.
- ADR-0010 and ADR-0011 stay unedited records; this ADR supersedes ADR-0010 for
  the guardrail's name and scope only.

## What does not change

- The anti-pathologizing core is untouched and absolute: no verdicts, no scoring
  or aggregating absence, no time-based state change, no missed-things ledgers,
  no app-icon badge counts. `missed`, `paused`, and `completed` remain user-set.
- This ADR widens what _automation_ is permitted; it does not weaken any
  protection against judgment. If a later change touches the anti-pathologizing
  commitment itself, it needs its own ADR superseding ADR-0010.

## Supersession

Supersedes ADR-0010 for the no-auto-state guardrail's name and scope only.
Changes to the anti-pathologizing commitments themselves still require a new ADR
superseding ADR-0010. Do not amend this ADR in place.
