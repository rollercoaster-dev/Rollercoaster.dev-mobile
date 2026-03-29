# ADR-0004: Data Model & Storage Decision

**Date:** 2026-02-08
**Status:** Accepted
**Owner:** Joe

---

## Context

The data model for native-rd must support the core learning loop (Goal → Step → Evidence → Badge) while remaining sync-ready from day one. The model grows across iterations A through D, adding new entities without replacing existing ones.

Key requirements:

1. **Entity hierarchy** — Goals contain Steps, both can have Evidence, completed Goals earn Badges
2. **ULID identifiers** — Globally unique, lexicographically sortable, CRDT-compatible
3. **Sync-ready** — Schema must work with Evolu's CRDT-based sync (ADR-0003)
4. **Iteration-aware** — Schema for Iteration A must accommodate future expansions in B, C, and D
5. **SQLite storage** — Local-first, works offline, compatible with Expo
6. **Type-safe** — Strong TypeScript types at compile time

The full data model specification is documented in `docs/architecture/data-model.md`, covering all four iterations. This ADR formalizes the architectural decisions behind that model.

## Decision

Adopt the iterative data model defined in `docs/architecture/data-model.md` with:

- **ULIDs for all entity IDs** (using Evolu's `id()` branded types)
- **Evolu schema definition** (branded types, validation at type level)
- **Iteration A starting point** (Goal, Step, Evidence, Badge)
- **Sync-ready design** (even fields not exposed in A are planned for B)
- **Soft-delete pattern** (`isDeleted` flag, not hard deletes)

## Data Model Summary

### Iteration A — Core Loop

Four entities: **Goal → Step → Evidence → Badge**

```typescript
Goal {
  id: ULID
  title: NonEmptyString1000
  description: nullable NonEmptyString1000
  status: 'active' | 'completed'
  completedAt: nullable DateIso
}

Step {
  id: ULID
  goalId: ULID → Goal
  title: NonEmptyString1000
  ordinal: integer
  status: 'pending' | 'completed'
  completedAt: nullable DateIso
}

Evidence {
  id: ULID
  goalId: nullable ULID → Goal
  stepId: nullable ULID → Step
  type: 'photo' | 'screenshot' | 'text' | 'voice_memo' | 'video' | 'link' | 'file'
  uri: string (local file path or URL)
  description: nullable string
}

Badge {
  id: ULID
  goalId: ULID → Goal
  credential: JSON (OB3 Verifiable Credential)
  imageUri: string (baked badge image path)
}
```

**Relationships:**

- Goal 1:N Step
- Goal 1:N Evidence
- Step 1:N Evidence
- Goal 1:1 Badge (earned on completion)

### Future Iterations (Planned)

- **Iteration B** — Adds JournalEntry, GoalLink, LearningStack; extends Goal with `paused` status and tags; makes Step.goalId mutable
- **Iteration C** — Adds SkillTreeNode, SkillTreeEdge for spatial visualization
- **Iteration D** — Adds Verification, ShareRecord for peer verification

All entities use ULIDs. No entity is replaced or removed — each iteration adds a layer.

## Key Architectural Decisions

### 1. ULID Strategy

**Decision:** Use ULIDs (Universally Unique Lexicographically Sortable Identifiers) for all entity IDs.

**Rationale:**

- Globally unique without coordination (essential for CRDT sync)
- Sortable by creation time (useful for display ordering)
- Compatible with SQLite primary keys
- Work with both Evolu's CRDT model and potential future migrations

**Implementation:** Evolu's `id('TableName')` branded type generates ULIDs automatically.

### 2. Evidence Attachment Pattern

**Decision:** Evidence can attach to either a Goal or a Step (exactly one, not both).

**Rationale:**

- Step-level evidence: Proves completion of an individual step (Tomás photographing each circuit)
- Goal-level evidence: Proves overall progress or final result (Lina's before/after of the stage section)
- Flexibility supports different user workflows without forcing a single pattern

**Schema:** `goalId` and `stepId` are both nullable. Application logic ensures exactly one is set.

### 3. Badge as Self-Signed OB3 Credential

**Decision:** Badge entity stores the complete Open Badges 3.0 Verifiable Credential as JSON, plus a baked image.

**Rationale:**

- The OB3 credential is the portable artifact — everything else in the database is local convenience
- Storing the full credential JSON eliminates the need to rebuild it on export
- Baking the credential into the badge image makes it shareable and verifiable
- Self-signing uses the user's DID (derived from Evolu's mnemonic)

**Implementation:** Uses `openbadges-core` from the monorepo for credential creation and signing.

### 4. Soft-Delete Pattern

**Decision:** Use Evolu's `isDeleted` flag for deletions, not hard deletes.

**Rationale:**

- Required by Evolu's CRDT sync model (tombstones prevent deletion conflicts)
- Enables sync'd deletion across devices
- Allows future "undo delete" or "restore from backup" features
- System column auto-managed by Evolu

**Implementation:** Use `evolu.update('table', { id, isDeleted: sqliteTrue })` for deletes.

### 5. Sync-Ready Schema Design

**Decision:** Design Iteration A schema with Iteration B sync needs in mind, even if fields aren't exposed in A's UI.

**Rationale:**

- Avoids schema migrations between A and B
- Goals can have `paused` status even if A doesn't show it
- Steps can move between goals even if A doesn't allow it
- Evolu's schema is defined at compile time — adding fields later requires migration

**Mitigations:**

- Keep the schema minimal for A (only fields actually needed)
- Plan B/C/D additions now but implement incrementally
- Document the evolution in `data-model.md` so future context is preserved

## Storage Implementation

**Database:** SQLite (via `expo-sqlite`)
**ORM/Query Layer:** Kysely (via Evolu's `evolu.createQuery()`)
**Mutation API:** Evolu CRDT methods (`evolu.insert()`, `evolu.update()`)
**System Columns:** Auto-managed by Evolu (`createdAt`, `updatedAt`, `isDeleted`, `ownerId`)

### Schema Validation

Evolu uses branded types for compile-time validation:

- `NonEmptyString1000` — Non-empty string, max 1000 characters
- `nullOr(T)` — Nullable column
- `DateIso` — ISO 8601 date string (use `dateToDateIso()` helper)
- `id('TableName')` — Branded ULID type per table

Validation uses `.from()`, `.orThrow()`, or `.orNull()` — not Zod's `.safeParse()`.

### Current Implementation

As of 2026-02-18, Iteration A schema is fully implemented:

- ✅ **Goal table** — Defined in `src/db/schema.ts` with full CRUD operations in `src/db/queries.ts`
- ✅ **Step table** — Full CRUD operations including reorder support
- ✅ **Evidence table** — All 7 evidence types (photo, screenshot, text, voice_memo, video, link, file)
- ✅ **Badge table** — OB3 Verifiable Credential JSON + baked image URI
- ✅ **UserSettings table** — Singleton pattern for theme, density, animation preferences

## Consequences

**Positive:**

- Clean entity hierarchy matches the learning loop mental model
- ULIDs enable sync without coordination or collision risk
- Soft-delete pattern required by CRDTs, but also enables undo features
- Iterative model allows shipping Iteration A while planning for B/C/D
- Strong TypeScript types catch schema errors at compile time
- Evidence flexibility supports diverse user workflows

**Negative / Risks:**

- Evolu's schema is immutable after creation — adding fields requires migration
- Kysely query builder (not Drizzle ORM) differs from monorepo patterns
- Branded types increase type complexity (`.orThrow()` instead of `.safeParse()`)
- Evidence attachment pattern (goalId OR stepId) requires application-level validation

**Mitigations:**

- Plan schema additions early (documented in `data-model.md`)
- Kysely provides excellent type safety and SQL compatibility
- Evolu's validation API is well-documented in prototype findings
- Add runtime checks to ensure exactly one of goalId/stepId is set

## Open Questions

1. **Evidence storage** — Should large files (videos) sync, or just metadata? (Deferred to Iteration B)
2. **Step evidence rollup** — Should all step evidence auto-link to the badge, or user-selected? (Deferred to badge implementation)
3. **Goal hierarchy** — Nested goals vs flat with GoalLinks? (Current: flat, revisit in Iteration B)

## Related Documents

- [Data Model Architecture](../architecture/data-model.md) — Complete entity specifications
- [ADR-0001: Iteration Strategy](./ADR-0001-iteration-strategy.md) — Iteration scope and dependencies
- [ADR-0003: Sync Layer Decision](./ADR-0003-sync-layer-decision.md) — Evolu rationale
- [Evolu Prototype Findings](../research/evolu-prototype-findings.md) — Schema implementation details
- [Local-First Sync Comparison](../research/local-first-sync-comparison.md) — Sync requirements

---

_Accepted 2026-02-08. Grow the schema, never throw it away._
