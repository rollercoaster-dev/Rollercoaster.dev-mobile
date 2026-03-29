# Evolu Prototype Findings

**Date:** 2026-02-07
**Status:** Validated — Evolu works with Expo 54 + Hermes
**Branch:** `issue-6-prototype-sync-evolu-expo-crud-mnemonic`
**Issue:** #6

---

## Summary

Evolu v7.4 runs successfully on Expo 54 (React Native 0.81, Hermes) with a dev build. All core features — CRDT-based local storage, CRUD operations, data persistence, owner identity, and mnemonic backup — work as expected. The setup requires polyfills for Hermes but is otherwise straightforward.

**Verdict: Keep Evolu as the data layer for Iteration A.**

---

## Setup Complexity

### Dependencies Added

- `@evolu/common`, `@evolu/react`, `@evolu/react-native` — core Evolu
- `expo-sqlite`, `expo-secure-store` — Expo native modules (auto-configured)
- `react-native-quick-crypto` — crypto primitives (required, no Expo Go)
- `react-native-svg` — used by Evolu's identicon component
- 7× `set.prototype.*` polyfills — Hermes lacks Set prototype methods

### Babel Plugins Required

- `@babel/plugin-transform-dynamic-import`
- `@babel/plugin-transform-modules-commonjs`
- `@babel/plugin-transform-explicit-resource-management`

### Polyfills Required (Hermes)

- **Set prototype methods** (difference, intersection, etc.) — must import `/auto` subpath to actually shim
- **AbortSignal.any / AbortSignal.timeout** — inline polyfill needed
- **Promise.withResolvers** — inline polyfill needed

### Key Setup Pitfall: Import Order

The entry point (`index.ts`) **must use `require()` instead of `import`** to guarantee execution order. Babel's `plugin-transform-modules-commonjs` hoists import-converted-requires above interleaved statements, which breaks the required crypto → polyfills → app initialization order.

```ts
// WRONG — crypto.install() runs after Evolu loads
import { install } from "react-native-quick-crypto";
install();
import "./polyfills";

// CORRECT — guaranteed sequential execution
const { install } = require("react-native-quick-crypto");
install();
require("./polyfills");
```

### Metro Config

- `.wasm` added to `assetExts` (Evolu bundles WASM for web)
- COOP/COEP headers added (for SharedArrayBuffer on web — not needed for native but doesn't hurt)

---

## CRDT Behavior

- Evolu uses CRDTs (Conflict-free Replicated Data Types) for all mutations
- No direct SQL for writes — mutations go through `evolu.insert()` / `evolu.update()`
- Reads use Kysely SQL query builder via `evolu.createQuery()`
- System columns (`createdAt`, `updatedAt`, `isDeleted`, `ownerId`) are auto-managed
- Soft-delete via `isDeleted: sqliteTrue` (SQLite boolean = `0 | 1`, not JS boolean)

### Schema Definition

Evolu uses branded types for schema validation at the type level:

- `NonEmptyString1000` — validated string with max 1000 chars
- `nullOr(T)` — nullable column
- `DateIso` — ISO date string (use `dateToDateIso()` helper)
- `id('TableName')` — branded ID type per table

Validation uses `.from()` (Result), `.orThrow()`, or `.orNull()` — not `.safeParse()` (Zod-style). This was a migration friction point from the docs.

---

## Bundle Size

| Package                        | node_modules size                   |
| ------------------------------ | ----------------------------------- |
| `@evolu/*` (total)             | 2.2 MB                              |
| `react-native-quick-crypto`    | 126 MB (includes OpenSSL framework) |
| `expo-sqlite`                  | 81 MB                               |
| `set.prototype.*` (7 packages) | ~760 KB                             |

- `react-native-quick-crypto` dominates due to bundled OpenSSL XCFramework. This is a native binary — it doesn't affect JS bundle size.
- Debug `.app` size: 118 MB (includes all debug symbols; production will be significantly smaller)
- Evolu's JS footprint (`@evolu/*`) is modest at 2.2 MB on disk

---

## Expo 54 Compatibility

| Feature                    | Status                                                             |
| -------------------------- | ------------------------------------------------------------------ |
| Dev build (native modules) | Works                                                              |
| Expo Go                    | Not supported (requires `react-native-quick-crypto` native module) |
| expo-sqlite integration    | Works via `@evolu/react-native/expo-sqlite`                        |
| expo-secure-store          | Auto-configured via config plugin                                  |
| Hermes engine              | Works with polyfills                                               |
| React Native 0.81          | Works                                                              |
| React 19                   | Works                                                              |
| Storybook coexistence      | Works (Storybook toggle preserved)                                 |

---

## DX Notes

### Positives

- **Zero backend** — no server to run, no sync config needed for local-only mode
- **Type-safe queries** — Kysely provides excellent autocomplete for SELECT queries
- **Branded types** — catch invalid data at compile time (e.g., empty strings, missing fields)
- **Auto-managed system columns** — no need to manually set createdAt/updatedAt
- **Owner identity built-in** — ownerId + mnemonic generated automatically
- **React Suspense integration** — `useQuery` suspends during first load

### Pain Points

- **Polyfill dance** — 3 categories of polyfills needed for Hermes, with subtle gotchas (`/auto` vs default import, `require()` vs `import`)
- **Import ordering sensitivity** — crypto must install before any Evolu module loads at the module level
- **No `.safeParse()`** — API uses `.from()` / `.orThrow()` / `.orNull()`, which is idiomatic but different from Zod conventions many devs expect
- **`isDeleted` type** — docs show `isDeleted: true` but the type expects `SqliteBoolean` (`0 | 1`); use `sqliteTrue` constant
- **`EvoluConfig.name`** — requires `SimpleName` branded type, not a plain string; use `SimpleName.orThrow('app-name')`
- **`useQuery` return type** — returns `QueryRows` (a readonly array), not `{ rows }` like some ORMs

### API Surface

The Evolu API is small and well-designed:

- `createEvolu(deps)(Schema, config)` — one instance per app
- `evolu.createQuery(cb)` — Kysely query builder
- `evolu.insert(table, data)` / `evolu.update(table, data)` — mutations return Result
- `useQuery(query)` — React hook with Suspense
- `evolu.appOwner` — Promise resolving to owner with mnemonic

---

## Recommendation for ADR-0004

**Adopt Evolu as the sync-ready data layer for native-rd.**

Reasons:

1. Works with current stack (Expo 54, Hermes, React 19)
2. Built-in E2EE via CRDT + owner keys — no application-layer encryption needed
3. MIT license — fully open source
4. Zero-backend architecture matches offline-first goals
5. Mnemonic-based identity enables future multi-device sync without accounts
6. Schema is already mapped to Iteration A data model
7. Polyfill complexity is a one-time setup cost, well-documented in this file

Risks to monitor:

- Evolu v8 is coming with breaking changes; stay on v7.4 for now
- `react-native-quick-crypto` is large (OpenSSL); evaluate `expo-crypto` as a future alternative
- Web support (via `@evolu/react/web`) was not tested in this prototype

---

## Related Documents

- [Local-First Sync Comparison](./local-first-sync-comparison.md) — original research
- [Data Model](../architecture/data-model.md) — Goal entity definition
- [ADR-0002: UI Library](../decisions/ADR-0002-ui-library-decision.md) — Unistyles decision
