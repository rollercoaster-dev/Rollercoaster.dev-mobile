# Evolu Step-Model Feasibility Spike

**Date:** 2026-06-11
**Status:** Done — evidence-only, per the
[prototype plan's spike scope](../plans/phase-b-step-model-prototypes.md#data-layer-feasibility-spike).
This is a feasibility note, not a schema decision and not a migration.
**Verified against:** `@evolu/common` 7.4.1 (exact version in `bun.lock`;
claims read from the installed package source), Kysely 0.28.x (Evolu's
bundled query builder), and `src/db/schema.ts` / `src/db/queries.ts` as of
2026-06-11.

## Verdict

**No blocker.** All three Stage 1 questions are cheap for the Evolu/SQLite
stack. Two sync edge cases are noted for the eventual schema ADR; neither
affects single-device prototyping.

## Q1: Can Evolu represent recursive Steps (A)?

**Yes, additively.**

- **Schema change is non-destructive.** Evolu persists data as per-column
  CRDT messages (`{table, id, column, value, timestamp}` — visible in the
  `evolu_history` shape, `@evolu/common` `local-first/Schema.ts`). Adding a
  nullable `parentStepId: nullOr(StepId)` to the `step` table is a code-side
  schema addition; existing rows simply read `null`. No migration, no
  destructive change. This is the same shape as the existing `goalId` column —
  Evolu has no FK enforcement to fight; a self-referencing ID column is just
  another column.
- **Querying works at any depth, two ways.** Evolu's `createQuery` callback
  exposes exactly `selectFrom | fn | with | withRecursive` on its Kysely
  instance (`@evolu/common` 7.4.1, `local-first/Schema.ts:197-227`). So
  recursive CTEs are available if arbitrary depth ever needs them. For the
  one-to-two levels Phase B is prototyping, they aren't even necessary: the
  app already fetches all steps per goal in one query ordered by `ordinal`
  (`src/db/queries.ts:343`), and assembling a tree in JS from tens of rows is
  trivial.
- **Sync edge for the schema ADR (not for the prototype):** Evolu's
  column-level last-writer-wins means two devices can concurrently write
  `A.parentStepId = B` and `B.parentStepId = A` and both survive — a cycle.
  Convergent, but the read side needs a deterministic cycle guard (e.g. treat
  the cycle member with the older `updatedAt` as a root). Likewise,
  soft-deleting a parent orphans children; the read side needs a policy
  (promote to root vs hide with parent). Both are read-time policies, not
  schema problems, and single-device self-testing cannot hit the first one.

## Q2: Can sibling ordering (C-order) survive local-first sync?

**Yes — converges, with a cosmetic caveat.**

- Ordering already ships: `ordinal nullOr(Int)` (`schema.ts:111`), queries
  order by it, and drag-reorder batch-writes index `0..n` per step
  (`queries.ts:522-548` `reorderSteps`). Scoping the same mechanism to
  siblings under one parent is a `where parentStepId =` away.
- Under concurrent reorders on two devices, per-column LWW converges every
  step to one ordinal, but interleaved writes can yield duplicate ordinals or
  an order neither device authored. That is converged-but-surprising, not a
  conflict pathology — no divergence, no data loss. Known mitigations if it
  ever matters: fractional indexing, or a stable tie-break
  (`ordinal, createdAt`) in the query. Not needed for Stage 1.

## Q3: Can the state set widen (E) without a destructive migration?

**Yes — it's a code change, not a migration.**

- `status` is stored as text and validated app-side
  (`NonEmptyString1000`, `schema.ts:112`; the `StepStatus` enum at
  `schema.ts:43-46` is an application convention, not a DB constraint).
  Widening the vocabulary is editing the enum and the UI that renders it.
  Zero schema work.
- **Caveat for the schema ADR:** older app versions syncing with a newer one
  will receive status values they don't know. Storage-level fine; the app
  code must render unknown status strings with a sane fallback rather than
  crashing or coercing them to `pending`.

## Out of scope

B-soft, B-deadlines, recurrence, and Slot persistence were not assessed —
they are Stage 3 questions, and the plan scopes this spike to the three
Stage 1 questions above.
