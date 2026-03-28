# Architecture: Local-First Sync

**Date:** 2026-02-02
**Status:** Superseded — decision made 2026-02-08
**Owner:** Joe

> ⚠️ **Decision made:** Evolu was selected as the sync layer. See [ADR-0003: Sync Layer Decision](../decisions/ADR-0003-sync-layer-decision.md) and [Evolu Prototype Findings](../research/evolu-prototype-findings.md). The sections below are historical research context.

---

## Overview

The sync layer sits below the app and above the database. The app never talks to the network directly — it reads and writes to a local database, and the sync layer handles replication in the background.

```
App (React Native)
  ↕ reads/writes
Local Database (SQLite)
  ↕ sync layer handles replication
Sync Service (self-hosted relay or server)
  ↕ replicates to
Other Devices (same user's phone, tablet, laptop)
```

### Rules

- The app never waits for the network. All reads and writes are local.
- Sync happens in the background. The user doesn't think about it.
- If sync fails, the app works exactly the same. Data syncs when connectivity returns.
- Conflicts are resolved automatically (CRDT) or by last-write-wins. The user never sees a merge conflict dialog.

---

## Sync Layer Candidates

Two options remain after research. See [Local-First Sync Comparison](../research/local-first-sync-comparison.md) for the full evaluation.

### PowerSync

- SQLite-based sync with Drizzle ORM integration
- Server-authoritative conflict resolution
- Self-hostable Open Edition (free, FSL license)
- E2EE requires application-layer implementation
- Production-ready, battle-tested

### Evolu

- SQLite + CRDT-based sync
- Automatic conflict resolution (Last Write Wins)
- Self-hostable relay (MIT license, stateless)
- E2EE built in (mnemonic-derived encryption key)
- Uses Kysely (not Drizzle), smaller community

**Decision deferred until prototyping.** Both are viable. The prototypes will determine the choice.

---

## What Syncs

### Syncs across user's devices

All user-created data:

- Goals, Steps, JournalEntries
- Evidence metadata (type, description, timestamps)
- Badges (OB3 credential JSON)
- GoalLinks, LearningStack
- SkillTreeNodes, SkillTreeEdges
- Theme preference, accessibility settings
- Tags

### Syncs with caution (large files)

Evidence files (photos, videos, voice memos) and baked badge images are large. Options:

| Strategy | Behavior | Trade-off |
|----------|----------|-----------|
| **Metadata only, files on demand** | Other devices see evidence exists, download on tap | Saves bandwidth, slight delay on first view |
| **Threshold-based** | < 10MB syncs automatically, larger files on demand | Good default, most photos and voice memos sync |
| **User-controlled** | Settings: "sync media over wifi only," "sync media never" | Maximum user control, more settings to manage |

Recommended: **threshold-based as default, user can override.** Photos and voice memos sync automatically. Videos sync on demand or wifi-only.

### Never syncs (device-specific)

- Private key material (generated per device, stored in SecureStore)
- Cache and temp files
- Local file paths (URIs are device-specific, resolved per device)

---

## Encryption Strategy

All synced data is encrypted before leaving the device. The sync server cannot read your data.

### If Evolu (built-in E2EE)

- Encryption key derived from a mnemonic (12-24 words)
- User writes down the mnemonic once during setup
- New devices enter the mnemonic to join the sync group
- Relay server only sees encrypted blobs
- No additional encryption work needed in the app

### If PowerSync (application-layer E2EE)

- App encrypts sensitive fields before writing to SQLite
- PowerSync syncs encrypted data unaware of the content
- Other devices decrypt on read
- Key management is our responsibility:
  - Generate encryption key on first launch
  - Store in Expo SecureStore
  - Transfer to new devices via QR code, mnemonic, or OS keychain backup

### Regardless of choice

- The sync server never sees plaintext goal titles, evidence, journal entries, or badge content
- Evidence files are encrypted before upload
- Private signing keys never leave the device — each device has its own keypair for badge signing
- Key loss = data loss (for synced encrypted data). Local data remains accessible on the original device.

### Key Recovery

Key recovery is an open design problem. If you lose your mnemonic/encryption key and lose your device, synced data is unrecoverable. This is the trade-off of true E2EE.

**Mitigations:**

- Clear onboarding about backup importance (without being preachy)
- Mnemonic reminder prompts (periodic, not nagging)
- Export as a second backup path (unencrypted OB3 JSON saved to user's files)
- OS-level backup integration where possible (iCloud Keychain, Google backup)

---

## Sync Timeline by Iteration

| Iteration | Sync status |
|-----------|------------|
| **A** | No sync. All data local. But data layer is sync-ready: ULIDs, no auto-increment IDs, no device-specific assumptions in schema. |
| **B** | Sync ships. Multi-device replication for all user data. Evidence file sync (threshold-based). |
| **C** | Skill tree positions and edges sync. |
| **D** | Shared badges and verifications sync. Device-to-device sharing may use a separate channel (Bluetooth, QR, local network). |

---

## Sync-Ready from Day One

Even though sync doesn't ship until iteration B, the data layer in iteration A must be sync-ready:

- **ULIDs for all IDs** — globally unique without coordination
- **No auto-increment IDs** — these conflict across devices
- **Timestamps on everything** — created_at, completed_at, paused_at for conflict resolution
- **No device-specific data in synced tables** — local file paths stored separately from evidence metadata
- **Schema designed for the chosen sync layer** — if Evolu, Kysely-compatible; if PowerSync, Drizzle-compatible

This is why the sync layer decision should happen before iteration A development begins, even though sync itself ships in B.

---

## Self-Hosted Sync Server

Users who want sync should be able to run their own sync infrastructure. No dependency on rollercoaster.dev cloud.

### If Evolu

- Relay is stateless, runs in Docker or serverless
- `docker run evoluhq/relay:latest`
- Free relay available for testing (`free.evoluhq.com`)
- User configures relay URL in app settings

### If PowerSync

- PowerSync Open Edition runs in Docker
- Requires a backend database (Postgres)
- `docker compose up` with provided config
- More infrastructure to manage than Evolu's stateless relay

### Cloud option

Rollercoaster.dev may offer a hosted sync service as an optional convenience. This is the "optional backup that releases community features" — not required, never the only option.

---

## Prototype Plan

Before committing, build two prototypes that answer specific questions.

### Prototype A: PowerSync + Expo

- Create goals and steps in local SQLite via Drizzle ORM
- Sync between two devices
- Implement application-layer encryption for goal titles
- Self-host PowerSync Open Edition
- **Must answer:** How much work is app-layer E2EE? Does Drizzle integration work smoothly? How does self-hosting feel?

### Prototype B: Evolu + Expo

- Create goals and steps in Evolu's local SQLite
- Sync between two devices via the free relay
- Verify E2EE works out of the box
- Test mnemonic-based device pairing
- **Must answer:** Does Evolu work with current Expo SDK? How does Kysely compare to Drizzle? Is CRDT conflict resolution invisible to the user?

### Shared across both prototypes

- Same data model (Goal, Step, Evidence metadata)
- Same simple UI (list of goals, tap to see steps, add button)
- Tested on iOS and Android
- Measured: initial setup complexity, sync latency, bundle size impact

### Decision Criteria

| Criterion | Weight | Notes |
|-----------|--------|-------|
| E2EE quality | High | Built-in vs DIY |
| Expo compatibility | High | Must work today, not "soon" |
| Developer experience | Medium | Schema definition, query ergonomics, debugging |
| Self-hosting simplicity | Medium | How easy for users to run their own sync |
| License alignment | Medium | MIT preferred over proprietary |
| Performance | Low | Both are fine for personal data volumes |
| Community size | Low | Nice to have, not a blocker |

Results documented in [ADR-0004: Sync Layer](../decisions/ADR-0004-sync-layer.md) after prototyping.

---

## Open Questions

1. **Evidence file sync protocol** — Do large files sync through the same channel as data, or a separate file storage layer?
2. **Selective sync** — Can users choose which goals sync and which stay device-only? (Privacy for sensitive goals)
3. **Multi-user sync** — Iteration D needs badges shared between different users, not just the same user's devices. Does the sync layer support this, or do we need a separate channel?
4. **Offline duration** — How long can two devices be offline independently before sync becomes problematic? (CRDT: indefinitely. Server-authoritative: depends.)
5. **Web client** — If a web version of the app exists someday, can the same sync layer support browser (IndexedDB) alongside mobile (SQLite)?

---

## Related Documents

- [Local-First Sync Comparison](../research/local-first-sync-comparison.md) — full research on all options
- [Data Model](./data-model.md) — entities and ID strategy
- [ADR-0001: Iteration Strategy](../decisions/ADR-0001-iteration-strategy.md) — sync ships in iteration B
- [Design Principles](../vision/design-principles.md) — local-first, you own everything
- [Monorepo ADR-0002: Local-First](https://github.com/rollercoaster-dev/monorepo/blob/main/apps/docs/decisions/ADR-0002-local-first-optional-sync.md) — foundational local-first decision

---

_Draft created 2026-02-02. Sync-ready from day one, sync ships in iteration B. Decision pending prototyping._
