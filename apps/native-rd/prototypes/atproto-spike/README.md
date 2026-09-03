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
| Write a record to a hosted PDS and read it back by AT-URI + CID                        | **Verified** 2026-09-03 against `bsky.social` — see Run log             |
| Host a did:key-issued credential in a did:plc repo, verify from read-back bytes        | **Verified** 2026-09-03 — answer: yes                                    |
| Firehose propagation observed via Jetstream                                            | **Verified** 2026-09-03 — commit event for exactly our record            |
| Invisible to the Bluesky AppView (author feed + post search), against a positive control | **Verified** 2026-09-03 — control post seen, spike record not            |
| What the identity actually involves (email, rotation-key custody)                      | **Recorded** from the PLC audit log; signup itself predates the spike     |

The live runs used the project's own account, `rollercoaster-dev.bsky.social`
(`did:plc:zhwenrx5y5dgfpu4cdaedbh7`), not a throwaway — a deliberate choice so the evidence
sits in Rollercoaster.dev's own repo. The spike records are still there; resolve them yourself
with the URIs in the [Run log](#run-log).

## What is here

```
lexicon/dev.rollercoaster.badge.spike.json  the record schema (spike-only NSID)
src/pds.ts              login, createRecord, getRecord, local CID recomputation
src/writeAndResolve.ts  bun run spike    — write one fixture record, read it back, check CIDs
src/didKeyIssuer.ts     bun run didkey   — the ADR-0015 did:key question, answered by construction
src/observeJetstream.ts bun run observe  — subscribe, write, catch the commit; then prove Bluesky shows nothing
src/resolve.ts          bun run resolve  — the no-account reader path, plain fetch, three hops
src/atUri.ts (+test)    AT-URI parse/build
```

The did:key encoder and the ES256 VC-JWT signer are **imported from
`packages/openbadges-core/src/crypto/`** by relative path — the same code the shipping app
uses. The spike adds no crypto of its own.

The lexicon JSON is **documentation of the record shape**, not enforcement: no script loads
it, and the PDS validates only lexicons it knows. Milestone 4 gets schema validation when the
real lexicon is published.

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

## What the hosting identity actually involves

The account predates this spike (created 2025-01-07 through the Bluesky app), so the signup
was not observed here. What the PLC directory records about it is public and is the evidence
that matters — [`plc.directory/did:plc:zhwenrx5y5dgfpu4cdaedbh7/log/audit`](https://plc.directory/did:plc:zhwenrx5y5dgfpu4cdaedbh7/log/audit):

- **Two rotation keys**, both `did:key:zQ3sh…` (secp256k1) — one is Bluesky's published
  recovery key, the other belongs to `bsky.social`. The account holder holds neither.
- **One `atproto` verificationMethod** — the repo signing key. Generated and held by the PDS
  (`rooter.us-west.host.bsky.network`). The account holder never sees it.
- The hosted-PDS signup requires an email address and email verification; the PDS performs
  the PLC genesis operation on the user's behalf. The user contributes a handle and a password
  and nothing cryptographic.

So on a hosted PDS the *hosting* identity is fully custodial: Bluesky can rotate or recover it,
the user cannot without Bluesky. That is exactly why the issuer identity should not depend on
it (next section). Scripts authenticate with a revocable app password, never the account
password.

## Firehose and Bluesky visibility

`observeJetstream.ts` subscribes to [Jetstream](https://github.com/bluesky-social/jetstream)
filtered to the test DID and our collection **before** writing, then writes and waits for the
commit event. Custom collections are relayed like any other — Jetstream's `wantedCollections`
takes arbitrary NSIDs.

Then the Bluesky check — with a **positive control**, because an empty feed on a fresh account
proves nothing on its own. The script posts one real `app.bsky.feed.post` carrying the same
unique marker, waits a few seconds for indexing, and asks the AppView (`public.api.bsky.app`)
for the author feed and a post search. The control post must appear; the spike record must not.
The control post is deleted afterwards; the spike record stays so `bun run resolve` keeps
working. If the control never shows up, the script reports the check as inconclusive and
fails rather than passing on an empty result.

## What is stubbed

- The record `credential` written by `spike`/`observe` is a fixture string. Only `didkey`
  writes a real signed VC-JWT, and its achievement is synthetic.
- The did:key private key is never persisted. Each `didkey` run is a fresh issuer.
- One hosted PDS (`bsky.social`). No self-hosted PDS, no custom handle, no DNS.
- No unpublish/delete flow — `com.atproto.repo.deleteRecord` exists; the spike doesn't call it.
- No tests beyond `atUri.test.ts`, run with Bun's own `bun test`. The app's "never `bun test`"
  rule is about its Jest suite; this tree is outside CI and Jest by design.

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
bun install                     # repo root — didKeyIssuer.ts imports openbadges-core source,
                                # whose `jose` resolves from the root install
cd apps/native-rd/prototypes/atproto-spike
bun install                     # the spike's own deps (@atproto/*, jose)

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

All runs 2026-09-03, `bsky.social`, account `rollercoaster-dev.bsky.social`. Records were
left in place — re-resolve them with `bun run resolve <uri>`.

### `bun run spike`

```
logged in as did:plc:zhwenrx5y5dgfpu4cdaedbh7 via https://bsky.social/

createRecord →
  uri  at://did:plc:zhwenrx5y5dgfpu4cdaedbh7/dev.rollercoaster.badge.spike/3mum73tifzo26
  cid  bafyreibvoc3jamn2bn35sj2u4slalguonutkv6m2tnr3da57xsqrpubpdu

getRecord (by AT-URI + CID) →
  value {"note":"writeAndResolve.ts — repo mechanics only, fixture payload (#614)","$type":"dev.rollercoaster.badge.spike","createdAt":"2026-09-03T10:03:30.483Z","credential":"fixture:not-a-real-credential"}

local CID (dag-cbor + sha2-256 of the returned value) bafyreibvoc3jamn2bn35sj2u4slalguonutkv6m2tnr3da57xsqrpubpdu

uri + cid round-trip AND cid matches local recomputation: true

OK — wrote .last-record.json for `bun run observe` / `bun run resolve`
```

### `bun run didkey`

```
issuer did:key       did:key:zDnaewsuEa8kCg2G6rBzK2BNz7Z7sHtWu7JuEsKBC6ZnhFrE5
offline verify       true (ES256)

repo did:plc         did:plc:zhwenrx5y5dgfpu4cdaedbh7
record uri           at://did:plc:zhwenrx5y5dgfpu4cdaedbh7/dev.rollercoaster.badge.spike/3mum74a5xhj2l
record cid           bafyreigtnur63qvykfvkxrkdnnwmexnextrqpqz6zdqgb2v7mzon2cd4gq
read-back cid match  true  (server round-trip + local recomputation)
read-back verify     true  (key resolved offline from the JWT's own iss)
issuer ≠ repo        true  (did:key:zDna… vs did:plc:zhwe…)

ANSWER: yes. did:key stayed the issuer; atproto only hosted the record.
COST:   the did:key has no rotation and no recovery — lose the private key, lose attribution.
        (This run's private key was never persisted; that is the point and the cost.)
```

### `bun run observe`

```
subscribing wss://jetstream2.us-east.bsky.network/subscribe?wantedDids=did:plc:zhwenrx5y5dgfpu4cdaedbh7&wantedCollections=dev.rollercoaster.badge.spike
jetstream open — writing a record now

createRecord  at://did:plc:zhwenrx5y5dgfpu4cdaedbh7/dev.rollercoaster.badge.spike/3mum75om3xz2t
              bafyreid7wacl2gaxh6i6b2yy3pvncxjzugniysxgjuyczrz7bhy3izyecm

(a) FIREHOSE: commit event received for exactly this record
    did        did:plc:zhwenrx5y5dgfpu4cdaedbh7
    operation  create  collection dev.rollercoaster.badge.spike  rkey 3mum75om3xz2t
    cid        bafyreid7wacl2gaxh6i6b2yy3pvncxjzugniysxgjuyczrz7bhy3izyecm
    time_us    1788429873528927

control post  at://did:plc:zhwenrx5y5dgfpu4cdaedbh7/app.bsky.feed.post/3mum75pbbrd2m

(b) BLUESKY APPVIEW for did:plc:zhwenrx5y5dgfpu4cdaedbh7, 1 feed item(s), 0 search hit(s):
    control post in author feed   true
    spike record in author feed   false
    control post in searchPosts   false
    spike record in searchPosts   false
    (control post deleted)

firehose propagation: true   appview control visible: true   spike record invisible: true
```

(A first attempt 403'd on `searchPosts`: `public.api.bsky.app` does not serve that method
anonymously. The script now calls it through the logged-in session, which the PDS proxies to
the AppView. The orphaned control post from that attempt was deleted by hand.)

### `bun run resolve` — as a reader, no account

```
DID document         https://plc.directory/did:plc:zhwenrx5y5dgfpu4cdaedbh7
  alsoKnownAs        at://rollercoaster-dev.bsky.social
  verificationMethod 1 key(s) — the PLC-managed repo signing key(s)
  PDS                https://rooter.us-west.host.bsky.network

getRecord
  uri   at://did:plc:zhwenrx5y5dgfpu4cdaedbh7/dev.rollercoaster.badge.spike/3mum74a5xhj2l
  cid   bafyreigtnur63qvykfvkxrkdnnwmexnextrqpqz6zdqgb2v7mzon2cd4gq
  local bafyreigtnur63qvykfvkxrkdnnwmexnextrqpqz6zdqgb2v7mzon2cd4gq  (matches)
  value {
  "note": "didKeyIssuer.ts — iss is a did:key, repo is a did:plc (#614)",
  "$type": "dev.rollercoaster.badge.spike",
  "issuer": "did:key:zDnaewsuEa8kCg2G6rBzK2BNz7Z7sHtWu7JuEsKBC6ZnhFrE5",
  "createdAt": "2026-09-03T10:03:43.778Z",
  "credential": "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImRpZDprZXk6ekRuYWV3c3VFYThrQ2cyRzZyQnpLMkJOejdaN3NIdFd1N0p1RXNLQkM2Wm5oRnJFNSN6RG5hZXdzdUVhOGtDZzJHNnJCeksyQk56N1o3c0h0V3U3SnVFc0tCQzZabmhGckU1In0.eyJpc3MiOiJkaWQ6a2V5OnpEbmFld3N1RWE4a0NnMkc2ckJ6SzJCTno3WjdzSHRXdTdKdUVzS0JDNlpuaEZyRTUiLCJpYXQiOjE3ODg0Mjk4MjMsInZjIjp7IkBjb250ZXh0IjpbImh0dHBzOi8vd3d3LnczLm9yZy9ucy9jcmVkZW50aWFscy92MiIsImh0dHBzOi8vcHVybC5pbXNnbG9iYWwub3JnL3NwZWMvb2IvdjNwMC9jb250ZXh0LTMuMC4zLmpzb24iXSwidHlwZSI6WyJWZXJpZmlhYmxlQ3JlZGVudGlhbCIsIk9wZW5CYWRnZUNyZWRlbnRpYWwiXSwiaXNzdWVyIjp7ImlkIjoiZGlkOmtleTp6RG5hZXdzdUVhOGtDZzJHNnJCeksyQk56N1o3c0h0V3U3SnVFc0tCQzZabmhGckU1IiwidHlwZSI6WyJQcm9maWxlIl0sIm5hbWUiOiJhdHByb3RvIHNwaWtlIGlzc3VlciAoZml4dHVyZSkifSwidmFsaWRGcm9tIjoiMjAyNi0wOS0wM1QxMDowMzo0My4zMjVaIiwiY3JlZGVudGlhbFN1YmplY3QiOnsidHlwZSI6WyJBY2hpZXZlbWVudFN1YmplY3QiXSwiYWNoaWV2ZW1lbnQiOnsidHlwZSI6WyJBY2hpZXZlbWVudCJdLCJuYW1lIjoiRml4dHVyZSBhY2hpZXZlbWVudCDigJQgIzYxNCBzcGlrZSIsImRlc2NyaXB0aW9uIjoiU3ludGhldGljLiBQcm92ZXMgaG9zdGluZy9pc3N1ZXIgZGVjb3VwbGluZywgbm90IGEgcmVhbCBiYWRnZS4iLCJjcml0ZXJpYSI6eyJuYXJyYXRpdmUiOiJSYW4gZGlkS2V5SXNzdWVyLnRzLiJ9fX19fQ.xUGSLhWN58zgnPW3XHFKe2VZX-GSBkkVPe8aNlFMLOP95akF3KVTYDS2RI-cLcxuNhXxU7pGcFL5XYZ2rNRo6w"
}
```
