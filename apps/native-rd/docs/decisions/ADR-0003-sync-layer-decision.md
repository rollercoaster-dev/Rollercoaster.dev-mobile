# ADR-0003: Sync Layer Decision

**Date:** 2026-02-08
**Status:** Accepted
**Owner:** Joe

---

## Context

The native rollercoaster.dev app requires a local-first data layer with multi-device sync capability. While sync functionality ships in Iteration B, the data architecture must be sync-ready from day one to avoid costly migrations later.

Key requirements:
1. **Local-first** — full offline functionality, data stored on device
2. **Sync-ready** — multi-device sync architecture baked in from the start
3. **Conflict resolution** — handles concurrent edits across devices
4. **End-to-end encryption** — user data must be private, even from the sync server
5. **Self-hostable** — no vendor lock-in, users own their infrastructure
6. **Expo compatibility** — works with Expo 54 + React Native 0.81 + Hermes

We evaluated three primary candidates:
- **PowerSync** — Client-side SQLite with server-authoritative sync
- **Evolu** — CRDT-based local-first database with stateless relay
- **RxDB** — Reactive NoSQL with backend-agnostic replication

A working prototype was built using Evolu to validate compatibility with our stack (Issue #6, branch `issue-6-prototype-sync-evolu-expo-crud-mnemonic`).

## Decision

Use **Evolu** as the sync-ready data layer for native-rd.

## Comparison

| Requirement | PowerSync | Evolu | RxDB |
|-------------|-----------|-------|------|
| Local-first SQLite | ✅ | ✅ | ⚠️ Premium only |
| Built-in E2EE | ❌ App-layer only | ✅ Core feature | ⚠️ Premium only |
| Self-hostable | ✅ Free edition | ✅ MIT relay | ✅ |
| Conflict resolution | Server-side | ✅ CRDT auto | ✅ Customizable |
| Expo 54 compatible | ✅ | ✅ Validated | ✅ |
| Drizzle ORM support | ⚠️ Beta | ❌ Uses Kysely | ❌ NoSQL |
| License | Apache/MIT + FSL | ✅ MIT | Apache + Premium |
| Maintenance | ✅ Production | ⚠️ Single maintainer | ✅ Mature |

## Rationale

1. **E2EE is fundamental, not bolted on** — Evolu's encryption key is derived from a mnemonic. All data is encrypted before leaving the device. The relay server literally cannot read user data. This aligns with our privacy-first values and eliminates application-layer encryption complexity.

2. **Zero-backend architecture** — Evolu's stateless relay can run serverless or as a simple Docker container. No database server required. Users can self-host trivially or use the official relay.

3. **CRDT-based conflict resolution** — Last-write-wins CRDTs eliminate manual conflict handling. The data model (Goal → Step → Evidence → Badge) is append-mostly, making CRDTs a natural fit.

4. **Validated with our stack** — Prototype successfully ran on Expo 54 + React Native 0.81 + Hermes. All core features work: CRDT storage, CRUD operations, data persistence, owner identity, mnemonic backup.

5. **MIT licensed** — Fully open source. No FSL concerns, no premium tiers.

6. **Philosophically aligned** — Evolu's privacy-first, user-owned-data philosophy matches rollercoaster.dev's values.

## Consequences

**Positive:**
- Built-in end-to-end encryption with no application-layer crypto code needed
- Automatic conflict resolution via CRDTs
- Self-hostable relay server (MIT licensed, stateless)
- Mnemonic-based identity enables multi-device sync without accounts
- Zero backend database required (no Postgres/MySQL to manage)
- Smaller community = less churn, more stability

**Negative / Risks:**
- Uses Kysely query builder instead of Drizzle ORM (monorepo uses Drizzle)
- Single primary maintainer (though codebase is stable and well-documented)
- CRDT overhead may limit performance for very large datasets (unlikely for Iteration A)
- Evolu v8 has breaking changes on the horizon (stay on v7.4 for now)

**Mitigations:**
- Kysely provides excellent type-safe queries and integrates well with TypeScript
- Evolu's API surface is small and stable — low risk of breaking changes
- Iteration A datasets are small (goals, steps, evidence, badges)
- Monitor v8 migration path; plan upgrade during Iteration B development
- `react-native-quick-crypto` dependency adds bundle size (OpenSSL); evaluate `expo-crypto` as future alternative

## Implementation Notes

Evolu requires polyfills for Hermes:
- 7× `set.prototype.*` packages (difference, intersection, etc.)
- `AbortSignal.any` / `AbortSignal.timeout` polyfills
- `Promise.withResolvers` polyfill

Entry point must use `require()` instead of `import` to guarantee crypto initialization order before Evolu loads.

See [Evolu Prototype Findings](../research/evolu-prototype-findings.md) for complete setup documentation.

## Related Documents

- [Evolu Prototype Findings](../research/evolu-prototype-findings.md)
- [Local-First Sync Comparison](../research/local-first-sync-comparison.md)
- [ADR-0001: Iteration Strategy](./ADR-0001-iteration-strategy.md)
- [ADR-0004: Data Model & Storage Decision](./ADR-0004-data-model-storage.md)
- [Data Model Architecture](../architecture/data-model.md)

---

_Accepted 2026-02-08. Privacy first, sync ready, zero compromises._
