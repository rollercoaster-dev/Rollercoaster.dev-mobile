# Research: Iteration B — Learning Journey

**Date:** 2026-05-18
**Status:** In progress
**Owner:** Joe

**Scope reference:** [ADR-0001 §Iteration B](../decisions/ADR-0001-iteration-strategy.md)
**Primary user story:** [Eva's Big Map](../vision/user-stories.md#evas-big-map)

---

## Where We Left Off

Features researched and resolved:

- **Multiple concurrent goals** — just needs `reorderGoals()` + drag-and-drop UI, same pattern as steps
- **Pause/resume** — schema change + UI, list treatment decided in prototyping
- **Sync and backend architecture** — fully documented below, including feature tiers, badge visibility states, self-hosting
- **Learning stack** — removed from B scope (see ADR-0001)

Still to research:

- **Reorganize steps / scope adjustment** — no deep dive yet
- **Goal journal** — no deep dive yet
- **Factual nudges** — no deep dive yet
- **Badge-to-goal linking** — under question; unclear what this gives the user that the goals list doesn't already provide. Needs a decision before any deep dive.
- **Step model richness (the gap)** — separate doc. Failure scenarios drafted in [step-model-gap.md](./step-model-gap.md); success scenarios and PM-tool research still to come.

---

## Current State

What exists toward each B feature as of 2026-05-18, verified against actual code.

| Feature                         | Schema                                              | Queries                                                 | UI               | Notes                                                                                                                                                                                 |
| ------------------------------- | --------------------------------------------------- | ------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Multiple concurrent goals       | `sortOrder` field exists, always written as `null`  | `activeGoalsQuery` and `stepsForActiveGoalsQuery` exist | No reordering UI | Same pattern as `reorderSteps()` — needs `reorderGoals()` + query ordered by `sortOrder` + drag-and-drop UI                                                                           |
| Pause/resume goals              | No `paused` status, no `paused_at` field            | `uncompleteGoal()` exists (reopen, not pause)           | No               | Needs `paused` added to `GoalStatus`, `paused_at` timestamp field. Paused goals stay in main list, visually distinct. List treatment (mixed vs grouped) to be decided in prototyping. |
| Reorganize steps between goals  | No mutation path for `step.goalId`                  | `reorderSteps()` only shuffles ordinals within a goal   | No               |                                                                                                                                                                                       |
| Scope adjustment (shrink/split) | —                                                   | —                                                       | No               | Depends on pause and step move                                                                                                                                                        |
| Goal journal                    | No `JournalEntry` table                             | —                                                       | No               |                                                                                                                                                                                       |
| ~~Learning stack~~              | Removed from B scope                                | —                                                       | —                | Goals list already shows all active goals. Visual relationships belong in Iteration C skill tree.                                                                                     |
| Factual nudges                  | —                                                   | `stepsForActiveGoalsQuery` provides the raw data        | No               |                                                                                                                                                                                       |
| Badge-to-goal linking           | No `GoalLink` table                                 | —                                                       | No               | Under question — unclear what this gives the user that the goals list doesn't already provide. Needs a decision before deep dive.                                                     |
| Multi-device sync               | Evolu installed, `ownerId` auto-present on all rows | —                                                       | No               | `createEvolu()` has no `syncUrl` — fully local                                                                                                                                        |
| Badge sharing (hosted link)     | No public badge IDs, no backend                     | —                                                       | No               |                                                                                                                                                                                       |

---

## User Stories

Eva's Big Map (in [user-stories.md](../vision/user-stories.md#evas-big-map)) covers pause/resume, multiple concurrent goals, step reorganization, and scope adjustment. The stories below cover the remaining B features.

---

### Ava Writes It Down

Ava's four months into her PIA assessment journey. She's just had her second diagnostic session. She opens the app to mark a step done, but what she wants to say doesn't feel like evidence — it's not proof of anything, just: _"She asked about my childhood and I cried for twenty minutes. I think that's good actually."_

She types it. It's not attached to a step. It's not going in the badge. It just sits with the goal, dated, for her to read later when she forgets what the middle of this felt like.

**Features:** Goal journal
**ND pattern:** Capturing the emotional weight of a process without forcing it to be evidence

---

### Malik Checks In

Malik hasn't opened the app in two weeks. He opens it on a Tuesday night and gets one quiet line at the top of his goals screen:

_"3 goals active. Last completed step: UV Unwrapping, 14 days ago."_

That's it. No "you've been away!" No streak. Just: here's where you are. He taps UV Unwrapping, remembers exactly where he stopped, and adds a step.

**Features:** Factual nudges
**ND pattern:** Information without pressure; no guilt framing, no time-based shame

---

### Tomás Connects the Dots

Tomás finishes his practice panel and earns a badge: "Residential Wiring: Practice Panel." He opens his bigger goal — "Get journeyman cert" — and links the badge to it. It now shows up as a completed contribution to the journeyman goal. The big goal feels less empty. He's not starting from zero.

**Features:** Badge-to-goal linking — _under question (see top); this story is the value-case to weigh against cutting it._
**ND pattern:** Making smaller wins visible as progress toward something larger

---

### Malik Gets a New Phone

Malik does his actual Blender work at his desktop but logs progress and records voice memos on his phone. He gets a new phone. He opens the app, enters his backup phrase, and everything is there — all his goals, all his steps, all the voice memos. He didn't lose anything.

**Features:** Multi-device sync, encrypted file storage (pro)
**ND pattern:** Continuity across devices with no accounts, no passwords, no cloud sign-in

---

### Lina Shares With Her Librarian

Lina's head librarian is writing a funding proposal and asks if Lina has anything to include. Lina opens her "Local History Archivist" badge. She doesn't want it fully public — she taps "Share with someone" and gets a private link. She pastes it into an email. The librarian opens it on her desktop — she sees the badge, the evidence, the verification. Nothing was transcoded. Nothing was lost. Anyone else who stumbles across the URL gets nothing — the link only works for people Lina has sent it to.

Later, when the proposal is submitted, Lina revokes the link.

**Features:** Badge sharing — shared (private link, revocable)
**ND pattern:** Sharing on your own terms; access you can take back

---

### Sam's Private Badge

Sam earns his 90-day badge. He doesn't share it with anyone. It lives on his phone, private, no URL — visible to nobody but him. He knows it's real because the evidence is real.

Six months later he decides to share it with his sponsor. He generates a private link and sends it. His sponsor is the only person who can open it. When the conversation is done, Sam revokes the link.

**Features:** Badge visibility — private (default), shared (private link)
**ND pattern:** Privacy as the default, sharing as a deliberate act you can undo

---

## Sync and Backend Architecture

Iteration B requires backend infrastructure for two reasons: multi-device sync and badge sharing. These share the same backend with different access modes.

### Badge visibility states

All badges are private by default. The user explicitly changes visibility.

| State       | What it means                                                                                  | URL              | Revocable         |
| ----------- | ---------------------------------------------------------------------------------------------- | ---------------- | ----------------- |
| **Private** | Local only. No server. No URL.                                                                 | No               | —                 |
| **Shared**  | Private link sent to specific people. Not publicly discoverable. Server stores the credential. | Yes — token URL  | Yes               |
| **Public**  | Openly discoverable. Indexed. Anyone can find it.                                              | Yes — public URL | Yes (unpublishes) |

Iteration D is where the recipient becomes an actor — verifying, attesting, their identity mattering to the badge. In B, sharing is purely a view access question; any "verification" a viewer sees (e.g. in Lina's story) is the inline OB3 cryptographic check rendered by the hosting page, not a human attesting.

### What leaves the device and when

| Data                                         | When                                     | Access                        | Readable by                                   |
| -------------------------------------------- | ---------------------------------------- | ----------------------------- | --------------------------------------------- |
| CRDT rows (goals, steps, journal entries)    | On sync                                  | Evolu relay — encrypted blobs | Nobody — relay cannot read content            |
| Evidence files (photos, voice memos, videos) | On sync (pro)                            | Encrypted file storage        | Owner only, via mnemonic-derived key          |
| OB3 badge credential                         | When user sets badge to Shared or Public | Token URL or public URL       | Shared: link recipients only. Public: anyone. |

Nothing reaches the server without a user action. Evidence files are encrypted before upload. Badge credentials only reach the server when the user explicitly shares or publishes them.

### Components

**Evolu relay (`relay.rollercoaster.dev`)**
Stateless message bus for CRDT sync. MIT-licensed Docker container. Sees encrypted blobs and IP addresses — no plaintext, no user accounts.

**File and credential storage**
S3-compatible storage serving two purposes:

- Evidence files — encrypted client-side, keyed to mnemonic. Server cannot read them.
- Badge credentials — unencrypted when shared/public, served at `badges.rollercoaster.dev/v/<id>` with access control for shared badges.

### Feature tiers

| Feature                                          | Free                                | Pro                         |
| ------------------------------------------------ | ----------------------------------- | --------------------------- |
| Badge sharing — shared (private link, revocable) | Yes                                 | —                           |
| Badge sharing — public                           | Yes                                 | —                           |
| Multi-device sync (CRDT metadata)                | Yes                                 | —                           |
| Evidence file sync (photos, voice memos, videos) | No — local only                     | Yes — auto, threshold-based |
| Self-hosted relay + file storage                 | Yes — bring your own infrastructure | —                           |

Evidence files on the free tier are local only. The upgrade moment is natural: switching phones and discovering your in-progress voice memos didn't follow you.

### The privacy promise holds because

- Evidence files cannot be read without the user's key
- Badge credentials only reach the server by explicit user action
- Private badges never leave the device
- The relay sees only encrypted CRDT operations
- Self-hosting is a genuine option for both components
- IP addresses and connection timestamps are unavoidable; documented in the privacy policy

### Self-hosting

The relay and file storage are both self-hostable. This fits a federated future where institutions run their own nodes and badges flow between them — the Iteration D community layer starting to have an infrastructure story.

Investigation areas:

- What does a minimal self-hosted stack look like? (Relay Docker container + S3-compatible storage — could be a single `docker-compose.yml`)
- How does the app discover a custom relay? (Settings screen, QR code, deep link?)
- Can two self-hosted nodes exchange badges? (Federation protocol — deferred to D, but the architecture should not close this door)

### Open questions

- Is the Evolu relay and file storage the same deployable component or separate?
- How does access control work for shared (private) badge links — token in the URL, or server-side allowlist?
- Privacy policy scope: what do we disclose about IP logging on the hosted relay?
