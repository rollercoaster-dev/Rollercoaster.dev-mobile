# Sync and Backend Architecture

**Date:** 2026-05-22 (extracted from iteration-b-learning-journey.md; original authoring 2026-05-18)
**Status:** In progress
**Owner:** Joe

**Scope reference:** [ADR-0001 §Iteration B](../decisions/ADR-0001-iteration-strategy.md)

---

Iteration B requires backend infrastructure for two reasons: multi-device sync and badge sharing. These share the same backend with different access modes.

## User Stories

### Malik Gets a New Phone

Malik does his actual Blender work at his desktop but logs progress and records voice memos on his phone. He gets a new phone. He opens the app, enters his backup phrase, and everything is there — all his goals, all his steps, all the voice memos. He didn't lose anything.

**Features:** Multi-device sync, encrypted file storage (pro)
**ND pattern:** Continuity across devices with no accounts, no passwords, no cloud sign-in

### Lina Shares With Her Librarian

Lina's head librarian is writing a funding proposal and asks if Lina has anything to include. Lina opens her "Local History Archivist" badge. She doesn't want it fully public — she taps "Share with someone" and gets a private link. She pastes it into an email. The librarian opens it on her desktop — she sees the badge, the evidence, the verification. Nothing was transcoded. Nothing was lost. Anyone else who stumbles across the URL gets nothing — the link only works for people Lina has sent it to.

Later, when the proposal is submitted, Lina revokes the link.

**Features:** Badge sharing — shared (private link, revocable)
**ND pattern:** Sharing on your own terms; access you can take back

### Sam's Private Badge

Sam earns his 90-day badge. He doesn't share it with anyone. It lives on his phone, private, no URL — visible to nobody but him. He knows it's real because the evidence is real.

Six months later he decides to share it with his sponsor. He generates a private link and sends it. His sponsor is the only person who can open it. When the conversation is done, Sam revokes the link.

**Features:** Badge visibility — private (default), shared (private link)
**ND pattern:** Privacy as the default, sharing as a deliberate act you can undo

## Badge visibility states

All badges are private by default. The user explicitly changes visibility.

| State       | What it means                                                                                  | URL              | Revocable         |
| ----------- | ---------------------------------------------------------------------------------------------- | ---------------- | ----------------- |
| **Private** | Local only. No server. No URL.                                                                 | No               | —                 |
| **Shared**  | Private link sent to specific people. Not publicly discoverable. Server stores the credential. | Yes — token URL  | Yes               |
| **Public**  | Openly discoverable. Indexed. Anyone can find it.                                              | Yes — public URL | Yes (unpublishes) |

Iteration D is where the recipient becomes an actor — verifying, attesting, their identity mattering to the badge. In B, sharing is purely a view access question; any "verification" a viewer sees (e.g. in Lina's story) is the inline OB3 cryptographic check rendered by the hosting page, not a human attesting.

## What leaves the device and when

| Data                                         | When                                     | Access                        | Readable by                                   |
| -------------------------------------------- | ---------------------------------------- | ----------------------------- | --------------------------------------------- |
| CRDT rows (goals, steps, journal entries)    | On sync                                  | Evolu relay — encrypted blobs | Nobody — relay cannot read content            |
| Evidence files (photos, voice memos, videos) | On sync (pro)                            | Encrypted file storage        | Owner only, via mnemonic-derived key          |
| OB3 badge credential                         | When user sets badge to Shared or Public | Token URL or public URL       | Shared: link recipients only. Public: anyone. |

Nothing reaches the server without a user action. Evidence files are encrypted before upload. Badge credentials only reach the server when the user explicitly shares or publishes them.

## Components

**Evolu relay (`relay.rollercoaster.dev`)**
Stateless message bus for CRDT sync. MIT-licensed Docker container. Sees encrypted blobs and IP addresses — no plaintext, no user accounts.

**File and credential storage**
S3-compatible storage serving two purposes:

- Evidence files — encrypted client-side, keyed to mnemonic. Server cannot read them.
- Badge credentials — unencrypted when shared/public, served at `badges.rollercoaster.dev/v/<id>` with access control for shared badges.

## Feature tiers

| Feature                                          | Free                                | Pro                         |
| ------------------------------------------------ | ----------------------------------- | --------------------------- |
| Badge sharing — shared (private link, revocable) | Yes                                 | —                           |
| Badge sharing — public                           | Yes                                 | —                           |
| Multi-device sync (CRDT metadata)                | Yes                                 | —                           |
| Evidence file sync (photos, voice memos, videos) | No — local only                     | Yes — auto, threshold-based |
| Self-hosted relay + file storage                 | Yes — bring your own infrastructure | —                           |

Evidence files on the free tier are local only. The upgrade moment is natural: switching phones and discovering your in-progress voice memos didn't follow you.

## The privacy promise holds because

- Evidence files cannot be read without the user's key
- Badge credentials only reach the server by explicit user action
- Private badges never leave the device
- The relay sees only encrypted CRDT operations
- Self-hosting is a genuine option for both components
- IP addresses and connection timestamps are unavoidable; documented in the privacy policy

## Self-hosting

The relay and file storage are both self-hostable. This fits a federated future where institutions run their own nodes and badges flow between them — the Iteration D community layer starting to have an infrastructure story.

Investigation areas:

- What does a minimal self-hosted stack look like? (Relay Docker container + S3-compatible storage — could be a single `docker-compose.yml`)
- How does the app discover a custom relay? (Settings screen, QR code, deep link?)
- Can two self-hosted nodes exchange badges? (Federation protocol — deferred to D, but the architecture should not close this door)

## Open questions

- Is the Evolu relay and file storage the same deployable component or separate?
- How does access control work for shared (private) badge links — token in the URL, or server-side allowlist?
- Privacy policy scope: what do we disclose about IP logging on the hosted relay?
