# Data Model: rollercoaster.dev (native)

**Date:** 2026-02-02
**Status:** Draft — Iteration A fully implemented; B/C/D planned
**Owner:** Joe

---

## Overview

The data model grows with each iteration. Each layer builds on the last — no entity is thrown away or replaced.

```
Iteration A    Goal → Step → Evidence → Badge
Iteration B    + JournalEntry, GoalLink, LearningStack
Iteration C    + SkillTreeNode, SkillTreeEdge
Iteration D    + Verification, ShareRecord
```

---

## Iteration A — Core Loop

Four entities. The minimum needed to create a goal, break it into steps, attach evidence, and earn a badge.

```
Goal
 ├── Step (ordered, belongs to one goal)
 ├── Evidence (attached to goal or step)
 └── Badge (earned when goal completes)
```

### Goal

Something you're working toward.

| Field        | Type          | Notes                   |
| ------------ | ------------- | ----------------------- |
| id           | string (ULID) | Primary key             |
| title        | string        | Required                |
| description  | string        | Optional                |
| status       | enum          | `active` \| `completed` |
| created_at   | timestamp     |                         |
| completed_at | timestamp     | Null until completed    |

### Step

A manageable piece of a goal.

| Field        | Type          | Notes                    |
| ------------ | ------------- | ------------------------ |
| id           | string (ULID) | Primary key              |
| goal_id      | string        | Foreign key → Goal       |
| title        | string        | Required                 |
| ordinal      | integer       | Position in the list     |
| status       | enum          | `pending` \| `completed` |
| created_at   | timestamp     |                          |
| completed_at | timestamp     | Null until completed     |

### Evidence

Proof of work. Attached to a goal or a step.

| Field       | Type          | Notes                                                            |
| ----------- | ------------- | ---------------------------------------------------------------- |
| id          | string (ULID) | Primary key                                                      |
| goal_id     | string        | Nullable — set if attached to a goal                             |
| step_id     | string        | Nullable — set if attached to a step                             |
| type        | enum          | `photo` \| `text` \| `voice_memo` \| `video` \| `link` \| `file` |
| uri         | string        | Local file path or URL                                           |
| description | string        | Optional caption                                                 |
| created_at  | timestamp     |                                                                  |

Exactly one of `goal_id` or `step_id` is set. Evidence lives at both levels because sometimes proof is per-step (Tomás photographing each circuit) and sometimes it's for the whole goal (Lina's before/after of the section).

### Badge

An OB3 Verifiable Credential, earned on goal completion.

| Field      | Type          | Notes                               |
| ---------- | ------------- | ----------------------------------- |
| id         | string (ULID) | Primary key                         |
| goal_id    | string        | Foreign key → Goal                  |
| credential | JSON          | Full OB3 Verifiable Credential      |
| image_uri  | string        | Baked badge image (local file path) |
| created_at | timestamp     |                                     |

The `credential` field contains the complete OB3 JSON — issuer (self), recipient (self), achievement, evidence references, and cryptographic signature. This is the portable artifact. Everything else in this database is local convenience.

### Iteration A Relationships

```
Goal 1──* Step
Goal 1──* Evidence
Step 1──* Evidence
Goal 1──1 Badge (earned on completion)
```

---

## Iteration B — Learning Journey

Three new entities and Goal/Step get richer. Adds journey management, scope adjustment, and informal note-taking.

### Goal (extended)

| Field     | Type      | Notes                                               |
| --------- | --------- | --------------------------------------------------- |
| status    | enum      | `active` \| `paused` \| `completed` (paused is new) |
| paused_at | timestamp | Null unless paused                                  |
| tags      | string[]  | Freeform, for filtering and skill tree grouping     |

### Step (extended)

| Field   | Type   | Notes                                      |
| ------- | ------ | ------------------------------------------ |
| goal_id | string | Now mutable — steps can move between goals |

Steps moving between goals is how Eva reshapes her City Farm into a Neighborhood Compost Program — she moves the completed compost steps to a new, smaller goal.

### JournalEntry

Informal dated notes attached to a goal. Not evidence — just thinking.

| Field      | Type          | Notes              |
| ---------- | ------------- | ------------------ |
| id         | string (ULID) | Primary key        |
| goal_id    | string        | Foreign key → Goal |
| text       | string        | Required           |
| created_at | timestamp     |                    |

Examples: "I'm stuck on step 3," "realized this should be two goals," "came back after 3 months, the compost steps are actually done," "changed my approach because the first one wasn't working."

### GoalLink

Connects a badge to a goal it contributes toward. This is how smaller completed goals feed into larger ones.

| Field      | Type          | Notes               |
| ---------- | ------------- | ------------------- |
| id         | string (ULID) | Primary key         |
| badge_id   | string        | Foreign key → Badge |
| goal_id    | string        | Foreign key → Goal  |
| created_at | timestamp     |                     |

Tomás's "Build practice panel" badge links to his "Get journeyman cert" goal. The badge is evidence of progress toward the larger goal.

### LearningStack

Tracks the interrupt chain — what paused what, and the path back.

| Field          | Type          | Notes                                              |
| -------------- | ------------- | -------------------------------------------------- |
| id             | string (ULID) | Primary key                                        |
| goal_id        | string        | Foreign key → Goal (the goal that was interrupted) |
| interrupted_by | string        | Foreign key → Goal (what caused the pause)         |
| pushed_at      | timestamp     | When the interruption happened                     |
| popped_at      | timestamp     | Null until the interrupt resolves                  |

The stack from the learning graph vision: push when life interrupts, pop when you return. Stack depth shows how many levels of interruption you're in — information, not judgment.

### Iteration B Relationships

```
Goal 1──* JournalEntry
Badge *──* Goal (via GoalLink — badges contribute to goals)
Goal 1──* LearningStack (as interrupted goal)
Goal 1──* LearningStack (as interrupting goal)
```

---

## Iteration C — Skill Tree

Two new entities. The skill tree is a visual layer on top of existing data — not a separate data model.

### SkillTreeNode

A position on the canvas for an existing badge or goal.

| Field       | Type          | Notes                       |
| ----------- | ------------- | --------------------------- |
| id          | string (ULID) | Primary key                 |
| entity_type | enum          | `badge` \| `goal`           |
| entity_id   | string        | Foreign key → Badge or Goal |
| position_x  | float         | Canvas x coordinate         |
| position_y  | float         | Canvas y coordinate         |

Visual state is **derived, not stored:**

| State               | Condition                                                                      |
| ------------------- | ------------------------------------------------------------------------------ |
| **Earned** (solid)  | entity_type is `badge`, or entity_type is `goal` with status `completed`       |
| **Active** (glow)   | entity_type is `goal` with status `active`                                     |
| **Planned** (ghost) | entity_type is `goal` with status `pending` (goal exists but no steps started) |
| **Paused**          | entity_type is `goal` with status `paused`                                     |

When Eva completes her compost goal, the node goes from glow to solid automatically. The tree reflects reality.

### SkillTreeEdge

A user-drawn connection between two nodes.

| Field        | Type          | Notes                                              |
| ------------ | ------------- | -------------------------------------------------- |
| id           | string (ULID) | Primary key                                        |
| from_node_id | string        | Foreign key → SkillTreeNode                        |
| to_node_id   | string        | Foreign key → SkillTreeNode                        |
| label        | string        | Optional — "prerequisite," "leads to," or freeform |

### Skill Tree Design Choices

- **The tree is a view, not a copy.** Node state comes from the underlying goal/badge. No duplication.
- **The tree is opt-in.** Nodes that aren't placed on the canvas still exist as goals and badges. Some users may never open the tree view.
- **The tree is manual.** Users place nodes and draw connections. No AI, no auto-layout. The tree looks like your brain, not a curriculum.

### Iteration C Relationships

```
SkillTreeNode *──1 Badge (via entity_id where entity_type = badge)
SkillTreeNode *──1 Goal (via entity_id where entity_type = goal)
SkillTreeNode 1──* SkillTreeEdge (as from_node)
SkillTreeNode 1──* SkillTreeEdge (as to_node)
```

---

## Iteration D — Community

Two new entities. Adds peer verification and badge sharing.

### Verification

A cryptographic attestation that someone vouches for a badge.

| Field             | Type          | Notes                                                     |
| ----------------- | ------------- | --------------------------------------------------------- |
| id                | string (ULID) | Primary key                                               |
| badge_id          | string        | Foreign key → Badge                                       |
| verifier_did      | string        | The verifier's decentralized identifier                   |
| verifier_badge_id | string        | Optional — the verifier's own badge giving them authority |
| type              | enum          | `peer` \| `mentor`                                        |
| signature         | string        | Cryptographic proof                                       |
| created_at        | timestamp     |                                                           |

Carmen's verification of Kayla's badge includes Carmen's DID, her "Raised Bed Gardening" badge as authority, and a cryptographic signature. This data is embedded in the badge's OB3 credential JSON, making it portable — the verification travels with the badge.

### ShareRecord

Tracks device-to-device badge sharing.

| Field           | Type          | Notes                 |
| --------------- | ------------- | --------------------- |
| id              | string (ULID) | Primary key           |
| badge_id        | string        | Foreign key → Badge   |
| shared_with_did | string        | The other party's DID |
| direction       | enum          | `sent` \| `received`  |
| shared_at       | timestamp     |                       |

### DID Management

- Each user gets a DID (likely `did:key` — generated locally from a keypair, no server needed)
- DID and private key are created silently in iteration A (needed for self-signing badges)
- The DID only becomes visible to the user in iteration D when sharing and verification matter
- Private key stored in Expo SecureStore (hardware-backed on iOS/Android)

### Iteration D Relationships

```
Badge 1──* Verification
Badge 1──* ShareRecord
```

---

## ID Strategy

All entities use ULIDs (Universally Unique Lexicographically Sortable Identifiers):

- Globally unique without coordination (important for sync)
- Sortable by creation time (useful for display ordering)
- Work well with SQLite and CRDTs
- Compatible with both PowerSync and Evolu

---

## Implementation Status (Iteration A)

| Entity                   | Status         | Notes                                                                                           |
| ------------------------ | -------------- | ----------------------------------------------------------------------------------------------- |
| **Goal**                 | ✅ Implemented | `src/db/schema.ts`, full CRUD in `src/db/queries.ts`                                            |
| **Step**                 | ✅ Implemented | Full CRUD including reorder support                                                             |
| **Evidence**             | ✅ Implemented | All 6 types (photo, text, voice_memo, video, link, file)                                        |
| **Badge**                | ✅ Implemented | OB3 Verifiable Credential JSON + baked image URI                                                |
| **UserSettings**         | ✅ Implemented | Singleton pattern; not in original Iteration A spec but added for theme/density/animation prefs |
| JournalEntry             | —              | Iteration B                                                                                     |
| GoalLink                 | —              | Iteration B                                                                                     |
| LearningStack            | —              | Iteration B                                                                                     |
| SkillTreeNode/Edge       | —              | Iteration C                                                                                     |
| Verification/ShareRecord | —              | Iteration D                                                                                     |

---

## Complete Entity Map

```
Goal
 ├── Step (1-many, ordered)
 ├── Evidence (1-many, also on steps)
 ├── Badge (1-1, on completion)
 ├── JournalEntry (1-many, iteration B)
 ├── GoalLink (many-many with Badge, iteration B)
 ├── LearningStack (interrupt tracking, iteration B)
 └── SkillTreeNode (visual position, iteration C)

Badge
 ├── Evidence (via goal and steps)
 ├── GoalLink (links to contributing goals, iteration B)
 ├── SkillTreeNode (visual position, iteration C)
 ├── Verification (peer/mentor attestation, iteration D)
 └── ShareRecord (sharing history, iteration D)

SkillTreeNode
 └── SkillTreeEdge (user-drawn connections, iteration C)
```

---

## Open Questions

1. **Evidence storage** — Local file paths work offline, but what happens on sync? Do evidence files sync too, or just metadata? Large videos could be problematic.
2. **Badge templates** — Should users be able to create badge templates (reusable badge designs) or is every badge unique to its goal?
3. **Step evidence rollup** — When a goal completes and a badge is created, does the badge reference all step-level evidence automatically, or does the user choose?
4. **Tag taxonomy** — Are tags fully freeform, or should there be suggested tags for common domains (programming, music, gardening)?
5. **Goal hierarchy** — Should goals be nestable (sub-goals) or flat with GoalLinks? The current model is flat. Eva's story could work either way.
6. **Journal entry types** — Just text for now, but should journal entries support voice memos or photos too? That blurs the line with evidence.

---

## Related Documents

- [ADR-0001: Iteration Strategy](../decisions/ADR-0001-iteration-strategy.md) — scope for each iteration
- [User Stories](../vision/user-stories.md) — scenarios that drove these entity designs
- [Learning Graph Vision (monorepo)](https://github.com/rollercoaster-dev/monorepo/blob/main/docs/vision/learning-graph.md) — learning stack concepts
- [Planning Graph Phase 2 (monorepo)](https://github.com/rollercoaster-dev/monorepo/blob/main/docs/plans/2026-01-29-planning-graph-phase2-design.md) — Plan/PlanStep model
- [Local-First Sync Comparison](../research/local-first-sync-comparison.md) — sync layer affects how IDs and conflicts work

---

_Draft created 2026-02-02. The model grows with each iteration — nothing is thrown away._
