# Slice 3 — Data layer (Evolu)

**Status:** not-started
**Drafted:** —
**Reviewed:** —

## Scope

The local-first CRDT data layer. Reviewed before any domain slice because every domain screen reads from `queries.ts` and writes against the Evolu schema — those abstractions need to be on the page before the leaves are read.

**In scope:**

- `src/db/index.ts` — Evolu instance + `EvoluAppProvider` export barrel
- `src/db/evolu.ts` — client setup + config
- `src/db/schema.ts` — CRDT table definitions (Goal, Step, Evidence, Badge, Breadcrumb, UserSettings)
- `src/db/queries.ts` — typed query helpers (per-table getters/setters)
- `src/db/__tests__/**` — queries.goal, .evidence, .badge, .step, .breadcrumb, .settings test suites
- `src/hooks/useUserSettingsRow.ts` — reactive UserSettings row observer
- `src/hooks/useThemePersistence.ts` — persistence half of the theme system (writes to userSettings)

**Deferred:**

- Domain-specific query reads — discussed contextually in slices 6 (Goals), 7 (Evidence), 9 (Badges)
- Sync transport / server pairing (if/when added) — out of scope for this tour pass
- Evolu observability via Sentry — slice 1

## File map

_(filled in during prep)_

## Mental model

_(filled in after walkthrough — expect: Evolu's CRDT model, query subscriptions, reactive vs imperative reads, where mutations sit on the JS thread vs SQLite worker)_

## RN concepts encountered

_(filled in during walkthrough — expect: `expo-sqlite` backing Evolu, async query results vs synchronous React rendering, suspense vs loading-flag patterns)_

## Lens scan

### type-safety

### RN/Expo idiom

### perf hot paths

### a11y / ND-a11y

### test coverage gaps

## Findings

- _(none yet)_

## Open questions

- _(none yet)_
