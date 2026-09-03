# atproto spike — write and resolve one badge record (#614)

Evidence artefact for [ADR-0015](../../docs/decisions/ADR-0015-funded-scope-prototype-fund.md)
milestone 4 (public badges to the user's own atproto repo). It answers, with running code
rather than citations: can we write a record to a hosted PDS, resolve it by AT-URI and CID,
see it on the firehose, confirm it is invisible to Bluesky — and can a `did:key` stay the
credential issuer while atproto only hosts it?

This is a spike, not milestone 4. No app integration, no UI, no key-management hardening.

## Status

| Check                                                                                  | State                                                                   |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Reader path: resolve an AT-URI with no account, recompute CID from the returned bytes  | **Verified** against a live public record (`bsky.app` profile), CIDs match |
| did:key issuer: mint P-256, encode did:key, sign ES256 VC-JWT, verify offline          | **Verified** locally, no network                                         |
| Write a record to a hosted PDS and read it back by AT-URI + CID                        | Code complete — **not yet run**; needs a test account (see Reproduce)   |
| Host a did:key-issued credential in a did:plc repo, verify from read-back bytes        | Code complete — **not yet run**; same dependency                        |
| Firehose propagation observed via Jetstream                                            | Code complete — **not yet run**; same dependency                        |
| Absent from every Bluesky feed / search                                                | Code complete — **not yet run**; same dependency                        |
| What creating the identity actually required (email token, rotation-key custody)       | **Not yet recorded** — filled in from the first real signup             |

When the live runs happen, paste their output into [Run log](#run-log) below and flip the
rows. Until then this README describes what the code does, not what has been observed.

## What is here

```
lexicon/dev.rollercoaster.badge.spike.json  the record schema (spike-only NSID)
src/pds.ts              login, createRecord, getRecord, local CID recomputation
src/writeAndResolve.ts  bun run spike    — write one fixture record, read it back, check CIDs
src/didKeyIssuer.ts     bun run didkey   — the ADR-0015 did:key question, answered by construction
src/observeJetstream.ts bun run observe  — subscribe, write, catch the commit; then prove Bluesky shows nothing
src/resolve.ts          bun run resolve  — the no-account reader path, pure fetch, three hops
src/atUri.ts (+test)    AT-URI parse/build
```

The did:key encoder and the ES256 VC-JWT signer are **imported from
`packages/openbadges-core/src/crypto/`** by relative path — the same code the shipping app
uses. The spike adds no crypto of its own.

### NSID

`dev.rollercoaster.badge.spike`. Reverse-DNS under `rollercoaster.dev`, following the
convention in [atproto-evaluation.md](../../docs/research/atproto-evaluation.md), but with a
`.spike` leaf so throwaway records can never be confused with the future
`dev.rollercoaster.badge.credential` collection. A hosted PDS accepts any well-formed NSID; no
registration, DNS `_lexicon` record, or partnership is needed to write into it.

## The did:key question — answer: **yes**

ADR-0015 asks whether a correctly encoded `did:key` can stay the credential issuer while
atproto only hosts the credential — no PLC operation, no email token, no custodial rotation key
for the issuer identity.

**Yes, by construction.** `didKeyIssuer.ts` shows why:

1. The issuer identity is a P-256 keypair minted in WebCrypto and encoded as `did:key`.
   That is a pure function of the public key. No registry, no network, no email.
2. The credential is a VC-JWT whose `iss` is that `did:key`. It verifies offline: decode the
   `did:key` back to a JWK, verify the signature. No resolver is contacted.
3. The record is written into the test account's repo, whose DID is a `did:plc`. The PDS stores
   an unknown-lexicon record opaquely; it neither reads nor validates `iss`. Repo DID and
   issuer DID are simply different strings.

So the PLC operation, the email verification and the rotation key belong to the **hosting**
identity (the atproto account), not to the **issuing** identity (the badge key). A user who
never publishes never needs any of them — which is what the store copy "no account to use
the app" has to mean.

**The cost, as the ADR predicted:** `did:key` has no rotation and no recovery. Lose the private
key and every credential it signed loses its attribution — nothing can be re-pointed, because
there is nothing to point at but the key itself. The alternative (adding the badge key to the
`did:plc` document as a `verificationMethod`) buys rotation and recovery at the price of making
the issuer identity depend on the PLC directory and its email/rotation-key custody. Milestone 4
has to pick one; this spike shows both are technically open.

## What creating the identity required

_To be recorded from the first real signup on `bsky.social`._ The expected shape, which the
run will confirm or correct: an email address, an email verification code, a handle, and a
password; the PDS generates and **custodies** the repo signing key and the PLC rotation key —
the user never sees either. An app password (Settings → Privacy and security → App passwords)
is what the scripts log in with; it is revocable and never the account password.

## Firehose and Bluesky visibility

`observeJetstream.ts` subscribes to [Jetstream](https://github.com/bluesky-social/jetstream)
filtered to the test DID and our collection **before** writing, then writes and waits for the
commit event. Custom collections are relayed like any other — Jetstream's `wantedCollections`
takes arbitrary NSIDs.

Then it asks the Bluesky AppView (`public.api.bsky.app`) three things about the same account:
author feed, profile post count, and a post search for the record's unique note. All three
must come back empty. The AppView indexes `app.bsky.*` only; our record exists in the repo and
on the firehose, and nowhere in Bluesky.

## What is stubbed

- The record `credential` written by `spike`/`observe` is a fixture string. Only `didkey`
  writes a real signed VC-JWT, and its achievement is synthetic.
- The did:key private key is never persisted. Each `didkey` run is a fresh issuer.
- One hosted PDS (`bsky.social`). No self-hosted PDS, no custom handle, no DNS.
- No unpublish/delete flow — `com.atproto.repo.deleteRecord` exists; the spike doesn't call it.
- No tests beyond `atUri.test.ts`. This tree is outside CI by design.

## What milestone 4 still has to build

1. **Decide issuer identity**: `did:key` (no recovery) vs. badge key as a `did:plc`
   `verificationMethod` (PLC dependency). This spike shows both work; it does not choose.
2. **Opt-in publishing UX** with the disclosure review screen, and an unpublish path that is
   honest about firehose mirrors (records may already be copied).
3. **Account linking in the app**: OAuth (not app passwords) against the user's PDS from React
   Native; session storage in `expo-secure-store`.
4. **The real lexicon** `dev.rollercoaster.badge.credential` incl. a blob ref for the baked
   PNG, plus `…endorsement`; publish them via DNS `_lexicon` once consumers exist.
5. **A verifier page** that runs `resolve.ts`'s three hops in a browser and hands the JWT to an
   OB3 verifier — the "unwrapper" in atproto-evaluation.md.
6. **Discovery**: nothing indexes our collection. Own AppView is post-grant per ADR-0015.

## Reproduce

Needs Bun ≥ 1.3 and a **dedicated throwaway** account on a hosted PDS. Records are public and
propagate to the firehose the moment they are written; do not use a personal identity.

```sh
cd apps/native-rd/prototypes/atproto-spike
bun install

# no account needed:
bun test                                                # AT-URI helpers
bun run resolve at://bsky.app/app.bsky.actor.profile/self   # reader path against a public record
bun run didkey                                          # offline half runs, then stops at login

# with an account — create one at https://bsky.app, then an app password:
cp .env.example .env   # fill PDS_HANDLE and PDS_APP_PASSWORD
bun run spike          # write + read back + CID check
bun run didkey         # did:key issuer hosted in a did:plc repo
bun run observe        # Jetstream propagation + Bluesky absence
bun run resolve        # resolve the last-written record with no library, as a reader would
```

Every script exits non-zero on any mismatch. `.env` and `.last-record.json` are gitignored.

## Run log

_Paste live output here, with the date. Until this section has entries, the Status table's
"not yet run" rows stand._
