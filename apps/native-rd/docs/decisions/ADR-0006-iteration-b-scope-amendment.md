# ADR-0006: Iteration B scope amendment — drop three orphans, add step-model enrichment

**Date:** 2026-05-23
**Status:** Accepted
**Owner:** Joe
**Amends:** [ADR-0001](./ADR-0001-iteration-strategy.md) — Iteration B scope only

---

## Context

ADR-0001 fixed Iteration B's scope on 2026-02-02, before any user testing. Three months of post-acceptance feedback — including a deep-dive user-testing session with a friend — surfaced both overreach (features in the scope list with no research support and no user signal) and a critical gap (the step model is undersized; nobody can describe their actual work with it).

The B research pass that produced [step-model-gap.md](../research/step-model-gap.md) and [sync-and-backend-architecture.md](../research/sync-and-backend-architecture.md) made the misalignment explicit. This ADR records the amendment.

## Decision

### Removed from Iteration B

- **Goal journal** — deferred pending user feedback. Free-text reflective entries on top of an already-loaded B felt like solving a problem nobody has signaled yet. Re-evaluate after A ships and users tell us what's missing.
- **Factual nudges** — deferred pending user feedback. Value unclear; the surface area (ambient status banner vs. re-entry summary vs. push notifications) carries real ND-accessibility risk if we pick wrong without signal.
- **Badge-to-goal linking** — moved to Iteration C. C already scopes "user-drawn connections between badges and goals (prerequisites, progressions)," which is the broader version of the same primitive. The existing `goalId` FK on badges (noted in ADR-0001's "What already exists toward B" table) stays as-is — it's the data substrate the C feature will build on.

### Added to Iteration B

- **Step-model enrichment** — the A–G taxonomy and three-register thesis documented in [step-model-gap.md](../research/step-model-gap.md). Every user-testing session since 2026-02-02 named the step model as the thing that breaks; B is where it gets fixed.

## Rationale

ADR-0001's B was a 9-item list authored before any user testing. Three items had no research support and no user signal; one critical concept (step model) wasn't on the list at all. This amendment realigns B with what feedback actually surfaced.

We chose to record this as a new ADR rather than amend ADR-0001 in place, following both this repo's [`decisions/index.md`](./index.md) convention ("decisions are immutable once accepted") and the Pocock ADR pattern (tiny ADRs, change via supersession). ADR-0001 retains its 2026-02-02 body; its status line is updated to point readers here.

## Consequences

- ADR-0001's Iteration B section is now read alongside this ADR; the scope list in ADR-0001 lines 98–106 reflects the 2026-02-02 intent, not current scope.
- The `goalId` FK on badges is preserved through B even though B no longer owns badge-to-goal linking as a feature — moving the FK would create a migration with no current user.
- Goal journal and factual nudges are explicitly _deferred_, not _cut_. They may re-enter scope (in B or later) once user feedback gives a clear signal.
- Step-model enrichment becoming B scope means the A–G taxonomy decisions in step-model-gap.md are now schema-change decisions for B, not exploratory research.

---

_Accepted 2026-05-23._
