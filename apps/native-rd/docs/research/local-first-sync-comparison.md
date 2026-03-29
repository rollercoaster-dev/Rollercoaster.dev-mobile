# Local-First Sync Research: Sync-Ready Database for React Native

**Date:** 2026-02-02
**Status:** Research complete, decision pending
**Context:** Choosing a sync-ready local-first data layer for the native app, building on ADR-0002's local-first principles

---

## Requirements

1. **Local-first** — full offline functionality, data stored on device
2. **Sync-ready from day one** — multi-device sync and optional cloud backup baked into the architecture
3. **Conflict resolution** — handles concurrent edits across devices
4. **Expo compatibility** — managed workflow or dev builds
5. **SQLite preferred** — monorepo uses Drizzle ORM + SQLite
6. **End-to-end encryption** — user data must be encryptable before sync
7. **Self-hostable sync server** — no vendor lock-in, users own their infrastructure
8. **Open source** — aligns with project values

---

## Top Contenders

### PowerSync

**GitHub:** Active, production-ready | **Client SDK:** Apache 2.0 & MIT | **Server:** FSL (free Open Edition)

**Architecture:** Client-side SQLite syncs with a backend database (Postgres/MongoDB/MySQL) via PowerSync service. Real-time streaming sync over WebSocket. Server-authoritative conflict resolution.

**Strengths:**

- Official Drizzle ORM integration (`@powersync/drizzle-driver`, beta) — existing monorepo schema can migrate
- Excellent Expo/React Native SDK (v1.29.0, Jan 2026)
- Self-hostable Open Edition (free)
- Superior performance benchmarks for large datasets
- Battle-tested in production apps
- Rust-based sync client (as of Jan 2026)

**Weaknesses:**

- E2EE is not built-in — server can see plaintext data
- Requires implementing application-layer encryption for true E2EE (encrypt fields before write, decrypt on read)
- Requires a backend database (Postgres/MongoDB/MySQL) for sync
- FSL license for server (not fully open source)

**E2EE approach:** Encrypt sensitive fields at the application layer before writing to SQLite. PowerSync syncs encrypted blobs. Other devices decrypt on read. [Example: E2EE chat app with PowerSync + Supabase](https://www.powersync.com/blog/building-an-e2ee-chat-app-with-powersync-supabase)

---

### Evolu

**GitHub:** ~1.8k stars | **License:** MIT | **Actively maintained**

**Architecture:** CRDT-based (Last Write Wins + causally ordered logs). Every database change is a CRDT message. Stateless relay server handles sync and backup. SQLite on device.

**Strengths:**

- E2EE is built in and fundamental — server literally cannot read user data
- Fully MIT licensed (client + relay)
- Self-hostable relay (stateless, can run serverless, Docker image available)
- CRDT-based sync = automatic conflict resolution, no manual handling
- No vendor lock-in
- Philosophically aligned: privacy-first, user-owned data

**Weaknesses:**

- Uses Kysely as query builder, not Drizzle ORM — migration required
- Smaller community than PowerSync
- Expo SDK 54 support still being validated (GitHub Issue #578)
- Better suited for smaller datasets (CRDT overhead)
- Single primary maintainer

**E2EE approach:** Encryption key derived from mnemonic or hardware device. All data encrypted before leaving the device. Relay never sees plaintext. This is core architecture, not an add-on.

---

### RxDB

**GitHub:** ~22.7k stars | **License:** Apache 2.0 (core) | **Mature, active**

**Architecture:** Reactive NoSQL database with backend-agnostic replication. Supports HTTP, GraphQL, WebSocket, WebRTC (P2P), CouchDB replication protocols.

**Strengths:**

- Most mature and battle-tested (since 2016, 22k+ stars)
- Extremely flexible replication (any backend, any protocol)
- Self-hostable server plugin
- Largest community
- Client-side conflict resolution with custom handlers

**Weaknesses:**

- NoSQL document model (not relational like current SQLite setup)
- Not compatible with Drizzle ORM
- Premium required for SQLite storage adapter + encryption
- Steeper learning curve
- Different data modeling paradigm from existing monorepo

---

## Also Evaluated

### ElectricSQL

- Postgres-to-SQLite sync, open source (Apache 2.0), self-hostable
- Good Expo support, might work with Drizzle (untested)
- **No E2EE support**, requires Postgres backend
- Active but less mature than PowerSync

### Triplit

- Full-stack sync database, self-hostable (can deploy on Hono)
- Expo compatible with polyfills
- **Company folded** — now community-driven, uncertain future
- No E2EE, uses triples data model (not relational)

### Zero (Rocicorp)

- Ultra-fast sync engine, successor to Replicache
- React Native/Expo support added in v0.23
- Still in public alpha, Postgres-only, no E2EE

### WatermelonDB

- Built for React Native, lazy-loading, sync protocol
- In maintenance mode (last release May 2025)
- DIY backend, no Drizzle support

### VLCN/cr-sqlite

- CRDTs built into SQLite extension
- No explicit React Native support, DIY sync infrastructure

### Automerge / Yjs / Loro (CRDT libraries)

- Lower-level building blocks, not complete solutions
- Would require building storage + sync layers from scratch
- Yjs has `y-op-sqlite` persistence for React Native

---

## Comparison Matrix

|                         | PowerSync                      | Evolu                      | RxDB                 |
| ----------------------- | ------------------------------ | -------------------------- | -------------------- |
| **Expo support**        | Excellent                      | Good (maturing)            | Excellent            |
| **E2EE**                | App-layer (DIY)                | Built-in                   | Premium plugin       |
| **Drizzle ORM**         | Yes (official)                 | No (Kysely)                | No (own syntax)      |
| **Self-hostable**       | Yes (free tier)                | Yes (MIT)                  | Yes                  |
| **Conflict resolution** | Server-side                    | CRDT (automatic)           | Client-side (custom) |
| **Data model**          | Relational (SQLite)            | Relational (SQLite + CRDT) | NoSQL (document)     |
| **License**             | Apache 2.0 client / FSL server | MIT                        | Apache 2.0 / Premium |
| **Maturity**            | Production                     | Growing                    | Mature               |
| **Community**           | Active, growing                | Smaller                    | Largest (22k stars)  |
| **Backend required**    | Postgres/MongoDB/MySQL         | None (relay only)          | Flexible             |

---

## Core Trade-off

### PowerSync: Pragmatic choice

- Keeps Drizzle compatibility (huge win for monorepo alignment)
- Production-ready, great performance
- E2EE is possible but requires manual implementation
- Server (FSL license) is free but not fully open source

### Evolu: Philosophical choice

- E2EE is fundamental, not an afterthought
- Fully MIT, aligns with open-source values
- No backend database needed (just a stateless relay)
- CRDT conflict resolution is automatic
- Requires giving up Drizzle for Kysely
- Smaller, less battle-tested

---

## Alignment with Project Values

| Principle (from ADR-0002 & Vision)          | PowerSync                  | Evolu              |
| ------------------------------------------- | -------------------------- | ------------------ |
| "Users retain full control over badge data" | Partial (server sees data) | Full (E2EE)        |
| "Privacy by design"                         | Requires app-layer work    | Built-in           |
| "No vendor lock-in"                         | Free tier, self-hostable   | MIT, self-hostable |
| "Badges survive service shutdowns"          | Yes (local SQLite)         | Yes (local SQLite) |
| "Local storage as primary"                  | Yes                        | Yes                |
| "Easy export and migration"                 | Yes                        | Yes                |

---

## Open Questions

1. **Drizzle vs Kysely** — Is Drizzle compatibility important enough to choose PowerSync? Or can the native app use Kysely while the monorepo uses Drizzle, sharing only types?
2. **E2EE priority** — Is built-in E2EE a must-have for v1, or can app-layer encryption be added incrementally?
3. **Evolu maturity** — Does the Expo SDK 54 compatibility issue block us? Need to check current status.
4. **Shared types** — `openbadges-types` is framework-agnostic TypeScript. Both PowerSync and Evolu can use these types regardless of ORM choice.
5. **Dataset size** — For personal learning/goal tracking, datasets are small. Evolu's CRDT overhead may be irrelevant at this scale.
6. **Prototype both?** — Build a simple goal + badge store in both to evaluate real-world DX.

---

## Recommendation

**Leaning toward Evolu** for philosophical alignment (true E2EE, MIT license, no backend database needed, CRDT conflict resolution). The native app is a new codebase — there's no existing Drizzle migration to worry about. Kysely is also a good query builder.

**PowerSync remains the pragmatic fallback** if Evolu's Expo support proves too immature or if Drizzle compatibility with the monorepo becomes essential.

**Decision deferred until prototyping.** Build a minimal goal + badge CRUD with sync in both to evaluate real DX.

---

_Research conducted 2026-02-02. Sources include official docs, GitHub repos, PowerSync blog, Evolu docs, RxDB docs, and community comparisons._
