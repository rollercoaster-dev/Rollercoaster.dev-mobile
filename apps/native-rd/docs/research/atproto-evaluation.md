# AT Protocol (atproto) — Evaluation for native-rd

**Date:** 2026-07-29
**Status:** Draft — research, not a decision
**Owner:** Joe

**Scope reference:** [ADR-0001 §Iteration B](../decisions/ADR-0001-iteration-strategy.md), [ADR-0003 Sync Layer](../decisions/ADR-0003-sync-layer-decision.md), [badge-export.md §Tier 3](./badge-export.md), [sync-and-backend-architecture.md](./sync-and-backend-architecture.md)

---

## TL;DR

**atproto is a public identity-and-hosting layer. It is not a sync layer, not a credential format, and it has no private data story.**

That decides most of this evaluation. Our badge visibility model has three states; atproto is relevant to exactly one of them:

| Visibility state ([sync-and-backend-architecture.md](./sync-and-backend-architecture.md)) | atproto fit                                                                  |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Private** (local only, no URL)                                                          | **None.** Never touches the network. Unchanged.                              |
| **Shared** (private link, revocable)                                                      | **None.** atproto has no access control. Stays on our own infrastructure.    |
| **Public** (openly discoverable, indexed)                                                 | **Strong.** This is the one thing atproto is genuinely best in the world at. |

For the Public state, publishing a badge as a record in the user's own atproto repo would:

- give the credential a **stable HTTPS + `at://` address the user owns**, not one we host — this is OB 3.0 §5.2 "Web Resource" delivery, the tier every major issuer converged on ([badge-export.md §Tier 3](./badge-export.md))
- take us **off the critical path** for public badge hosting: no S3 bucket, no database, no auth — a stateless unwrapper page at most
- give the user a **human-readable, domain-verified identity** (`lina.rollercoaster.dev`) and, unlike `did:key`, **key rotation and account recovery**
- make public badges **discoverable through the firehose** without us building any social graph

**Recommendation:** treat this as an Iteration B/D spike for the **Public** visibility state only. Do not touch Evolu. Do not make it a prerequisite for earning, holding, or privately keeping a badge. The two blocking questions before committing are the **irrevocability of public records** and whether an **account + email requirement** is acceptable on an opt-in path in an app whose pitch is "no accounts, no passwords, no cloud sign-in."

---

## What atproto actually is

| Primitive           | What it is                                                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **DID** (`did:plc`) | Portable account identity. Controlled by _rotation keys_; resolvable via the PLC directory. Supports recovery.             |
| **Handle**          | A domain the user (or we) control, verified against the DID. `lina.rollercoaster.dev`.                                     |
| **PDS**             | Personal Data Server hosting the user's **repo** — a signed, content-addressed set of JSON records. Self-hostable.         |
| **Record**          | One JSON document at `at://did:plc:…/<collection>/<rkey>`, also fetchable over HTTPS from the PDS.                         |
| **Lexicon**         | The schema system. Anyone can define their own NSIDs; the PDS accepts unknown collections (validated only for known ones). |
| **Relay/firehose**  | Public event stream of all repo commits. Any indexer can consume it, no API key.                                           |

Two facts do most of the work for us:

1. **The PDS accepts arbitrary third-party collections.** Custom lexicons have been writable to hosted PDSs since Feb 2024; rate limits apply, not type restrictions. We do not need permission or a partnership to publish `dev.rollercoaster.badge.*` records.
2. **`did:plc` verificationMethod now accepts arbitrary key types, explicitly including Ed25519** (PLC directory change, June 2025, max 10 methods per account, stated purpose: "expanding compatibility with non-atproto apps and services"). The app's SecureStore Ed25519 badge key can be **published in the user's DID document** — so the key that signed the credential is resolvable from the same identity that hosts it.

---

## How it lands against decisions already made

### Evolu is still the sync layer

[ADR-0003](../decisions/ADR-0003-sync-layer-decision.md) chose Evolu; [ADR-0004](../decisions/ADR-0004-data-model-storage.md) built the schema on Evolu-native types. atproto is not a competitor here and must not become one:

- An atproto repo is **public by default**. Goals, steps, journal entries, evidence, and energy/mood-adjacent data are exactly what [personal-data-verification.md](../architecture/personal-data-verification.md) says must not leave the device without a deliberate, reviewed act.
- The **Private Data Working Group** is designing PDS-gated "namespaces" with collection-level access control — and explicitly **not** encryption at rest. It is unshipped and not close. Until then there is no atproto equivalent of the Evolu relay's "sees encrypted blobs, can read nothing."
- So: **atproto is a publication target, never a sync substrate.** Evolu remains the source of truth; a published badge is a derived, opt-in copy.

### It does not fix the OB3 compliance gaps — and it is not needed for #7

[ob3-compliance-status.md](../architecture/ob3-compliance-status.md) lists 6 validator errors plus non-resolvable `did:key`. atproto closes **none** of them:

- Gaps 1–4 are JSON shape. Gap 5 is RDFC-1.0 canonicalization + `eddsa-rdfc-2022` + multibase. Transport-independent, exactly as with [Pear](./pear-p2p-evaluation.md).
- **Gap 7 is fixed by correct encoding alone.** A properly formed `did:key` (multibase `z…` + `0xed01` multicodec) resolves deterministically, offline, with no network and no directory. Do not let "atproto gives us a resolvable DID" justify a dependency — the fix is a local encoding correction, and it should ship on its own.

What `did:plc` adds **beyond** a correct `did:key` is the part worth wanting:

| Property                               | `did:key` (today's design)                        | `did:plc`                                                         |
| -------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------- |
| Resolvable                             | Yes, once encoded correctly — offline, no network | Yes, via PLC directory (network required)                         |
| Human-meaningful                       | No — an opaque `z…` string                        | Yes — a domain handle                                             |
| **Key rotation / recovery**            | **No. Lose the phone, lose the identity.**        | Yes — rotation keys, recovery path                                |
| Supports path-suffixed achievement IDs | No (flagged in gap #7 — needs HTTPS URIs)         | Yes — every record has an HTTPS + `at://` address                 |
| Trust model                            | Self-sovereign; nobody can rewrite it             | Hosted PDS holds the rotation key unless self-hosted — see Risk 4 |

The rotation/recovery row is a real product problem independent of atproto: today the badge signing key lives only in Expo SecureStore. If it is not covered by the Evolu mnemonic, a lost phone makes every badge the user ever signed permanently unattributable. That deserves its own answer regardless of what we decide here.

### It is a cheaper Tier 3 than the one already planned

[badge-export.md §Tier 3](./badge-export.md) plans `badges.rollercoaster.dev/v/<id>`, backed by S3 credential storage with access control ([sync-and-backend-architecture.md §Components](./sync-and-backend-architecture.md)). For **public** badges, the user's PDS replaces that storage entirely.

Honest caveat: `com.atproto.repo.getRecord` returns a `{uri, cid, value}` envelope, not a bare VC, and external verifiers ([verifybadge.org](https://verifybadge.org), an employer's tool) want a plain HTTPS URL serving the credential. So we still ship a resolver page — but it becomes **stateless**: fetch the record, unwrap `value`, render the verification UI. A static page or a tiny worker. No bucket, no database, no auth, nothing of the user's to lose or leak. The **Shared** (private-link) state still needs our own infrastructure, so this reduces the backend rather than removing it.

### Iteration D endorsement: complementary to Pear, not competing

An endorsement can be a record in the **endorser's own** repo pointing at the badge's `at://` URI — signed, attributable, publicly checkable, requiring no server from us and no device-to-device channel.

But it is **public**, and it requires the endorser to have an atproto account. [pear-p2p-evaluation.md](./pear-p2p-evaluation.md) identified the Iteration D need as _private, offline, device-to-device_ mentor review. These are different jobs:

- **Private mentor review** (a sponsor, a therapist-adjacent mentor, a colleague) → QR hand-off / thin relay / Pear. Not atproto.
- **Public vouching** ("I'll say in the open that I saw this work") → atproto records are a clean fit.

[ADR-0012](../decisions/ADR-0012-no-auto-judgment.md) still binds: an endorsement record carries "I reviewed this evidence," never a score.

---

## Sketch: what publishing would look like

Two lexicons under an authority we own, published via DNS TXT at `_lexicon.badge.rollercoaster.dev` → our DID:

| NSID                                  | Record contents                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------- |
| `dev.rollercoaster.badge.credential`  | The signed OB3 VC, plus a blob ref to the baked PNG                             |
| `dev.rollercoaster.badge.endorsement` | `subject` = `at://` URI of a credential record, plus what the endorser reviewed |

Flow for one public badge:

1. User earns a badge. Nothing leaves the device. **(Unchanged — this is the default and stays the default.)**
2. User chooses **Publish publicly** and passes the existing disclosure review screen ([personal-data-verification.md §Required UX Controls](../architecture/personal-data-verification.md)).
3. First time only: connect or create an atproto identity (OAuth; `@atproto/oauth-client-*`, with an existing React Native client using expo-sqlite for session storage).
4. One-time identity binding: add the app's Ed25519 badge key to the DID document as a verificationMethod, via `com.atproto.identity.signPlcOperation` (email-token gated on a hosted PDS).
5. `com.atproto.repo.putRecord` writes the credential record; the baked PNG goes up as a blob.
6. The badge now has a permanent public address the user owns. Our resolver page renders it for verifiers.
7. **Unpublish** deletes the record — see Risk 1 for what that does and does not guarantee.

The signing path in `packages/openbadges-core` and `SecureStoreKeyProvider` is untouched. This is purely a publication step bolted after it.

---

## Risks

**1. "Revocable" becomes weaker than we currently promise.** [sync-and-backend-architecture.md](./sync-and-backend-architecture.md) lists Public as "Revocable (unpublishes)". With our own S3 that is literally true. On atproto, deleting a record removes it from the PDS and emits a delete event, but the firehose is public and third-party indexers and archives may retain copies. We cannot promise erasure — only unpublishing from the source of truth. **This is the biggest values conflict and must be settled before anything ships.** UX copy would have to say it plainly, in the same register as the existing "exported copies cannot be recalled" warning.

**2. Correlation.** A public repo ties every published badge to one DID and one handle — precisely the long-lived-identifier correlation risk [personal-data-verification.md §Privacy Risk](../architecture/personal-data-verification.md) warns about, and W3C VC privacy guidance with it. Mitigations: publish only what the user explicitly marks public, never evidence files, default to DID-only or display-name disclosure, and let the publishing identity be **separate from any personal Bluesky account**.

**3. Onboarding friction, against an explicit product promise.** Malik's story is "no accounts, no passwords, no cloud sign-in." atproto needs a PDS, a handle, and (for the PLC operation) a verified email. Containment: strictly opt-in, reached only when the user wants a public badge, never on the path to earning or keeping one. Optionally we run a handle service so users get `<name>.rollercoaster.dev` instead of choosing a PDS — nice, but scope.

**4. Hosted PDS means custodial identity.** For a hosted account the PDS operator holds the rotation key and can therefore rewrite the DID document — including the verificationMethod the badge depends on. A correct `did:key` has no such actor. Self-hosting, or user-held rotation keys, closes it. The honest framing: `did:key` is self-sovereign but unrecoverable; `did:plc` is recoverable but trusts an operator unless self-hosted. Both are defensible; the choice should be conscious and probably the user's.

**5. Ecosystem risk.** Bluesky is a single VC-funded company (Series B, $100M) that operates the main PDS, the relay, and the PLC directory. The protocol is open and self-hostable, and the values overlap is much better than the crypto-adjacent concern raised for Pear — but for a _public credential permanence_ story, "who runs the directory in ten years" is a fair question to ask out loud.

---

## Recommendation

1. **Do not touch Evolu, and do not put any private data in a repo.** atproto is a publication target for the Public visibility state only.
2. **Ship the OB3 punch-list independently.** Gaps 1–5 and the `did:key` encoding fix in #7 are prerequisites for any of this being worth publishing, and none of them need atproto.
3. **Spike, time-boxed, after the punch-list:** publish one signed credential as a `dev.rollercoaster.badge.credential` record from the app, add the badge key as a DID verificationMethod, and verify the record through a stateless unwrapper page with [verifybadge.org](https://verifybadge.org). That single flow answers whether the RN OAuth client, the PLC operation, and the unwrapping story hold up.
4. **Settle Risk 1 before designing UX.** If we are not willing to tell users "public means public forever, in practice," the whole idea stops here and Tier 3 stays on our own infrastructure.
5. **Park the discovery upside.** If issuers ever publish badge opportunities as atproto records, [openbadges-external-earning-research.md](./openbadges-external-earning-research.md) gets a free import channel. Speculative — note it, do not plan on it.

**Net:** atproto is a good answer to a narrow question we have already scoped — _where do public badges live, and under whose control_ — and a bad answer to every other question in this architecture. It earns a spike on the Public path, not a foundational bet.

---

## Open questions

- Is the badge signing key covered by the Evolu mnemonic? If not, key loss already breaks badge attribution today, independent of atproto.
- Are we willing to state "public is permanent in practice" in UX copy? (Blocks everything else.)
- Record size limits: does a VC plus metadata fit comfortably in one record, with the baked PNG as a blob?
- Do we run a handle service (`<name>.rollercoaster.dev`) to avoid making users pick a PDS — and what does that commit us to operationally?
- Should the publishing identity be deliberately separate from a user's existing Bluesky account, and can the UI make that choice legible without a lecture?
- If a user self-hosts a PDS, does the resolver page work unchanged? (It should — the DID resolves to their PDS endpoint.)

---

## Related documents

- [badge-export.md](./badge-export.md) — Tier 3 hosted verification link; the plan atproto would partly replace
- [sync-and-backend-architecture.md](./sync-and-backend-architecture.md) — visibility states, what leaves the device
- [pear-p2p-evaluation.md](./pear-p2p-evaluation.md) — the private, offline half of Iteration D
- [OB3 Compliance Status](../architecture/ob3-compliance-status.md) — the punch-list atproto does not touch
- [Personal Data and Badge Verification](../architecture/personal-data-verification.md) — disclosure modes, correlation risk
- [ADR-0003: Sync Layer](../decisions/ADR-0003-sync-layer-decision.md) / [ADR-0004: Data Model](../decisions/ADR-0004-data-model-storage.md) — why atproto is not a sync candidate
- [ADR-0012: No-auto-judgment](../decisions/ADR-0012-no-auto-judgment.md) — endorsement, not grading

## Sources

- [AT Protocol](https://atproto.com/) · [Lexicons](https://atproto.com/guides/lexicon) · [Publishing Lexicons](https://atproto.com/guides/publishing-lexicons)
- [OAuth for AT Protocol](https://atproto.com/blog/oauth-atproto) · [`@aquareum/atproto-oauth-client-react-native`](https://www.npmjs.com/package/@aquareum/atproto-oauth-client-react-native)
- [did:plc specification](https://web.plc.directory/spec/v0.1/did-plc) · [Relaxing DID PLC Verification Method Constraints (June 2025)](https://github.com/bluesky-social/atproto/discussions/3928)
- [`com.atproto.identity.requestPlcOperationSignature`](https://docs.bsky.app/docs/api/com-atproto-identity-request-plc-operation-signature) · [Account Migration](https://atproto.com/guides/account-migration)
- [Enable creation of unknown record types](https://github.com/bluesky-social/atproto/commit/6dfc899d995a0a7b0eb33ea1661e5c3660e38f90) · [Custom Lexicons on a server you don't own](https://github.com/bluesky-social/atproto/discussions/3116)
- [Private Data Working Group](https://atproto.wiki/en/working-groups/private-data) · [Building on AT Protocol (dbushell, 2026-03)](https://dbushell.com/2026/03/10/building-on-at-protocol/)
