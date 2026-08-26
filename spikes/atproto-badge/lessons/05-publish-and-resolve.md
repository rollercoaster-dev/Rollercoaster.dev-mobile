# 05 — Publish and resolve

**You write code in this one**, and for the first time you need a real account.
`src/publish.ts` and `src/resolve.ts`.

No unit tests here. The network is the test: you write a record, then read it back as a
stranger and check the bytes survived.

## Getting an account

This part is manual — account creation needs email verification and a CAPTCHA.

Make a **throwaway account**, not your personal Bluesky one. Two reasons, and both are
things this project has written down as risks rather than hypotheticals:

- Everything you publish is public and, in practice, permanent. Records can be deleted
  from your PDS, but the firehose already carried them and you cannot recall other
  people's copies (Risk 1 in
  [`atproto-evaluation.md`](../../../apps/native-rd/docs/research/atproto-evaluation.md)).
- Publishing badges from an account tied to your name links them to your identity
  forever. That is the correlation risk from lesson 04, applied to yourself. Doing this
  on a burner is the mitigation, practised rather than cited.

Steps:

1. Create an account at [bsky.app](https://bsky.app) with a handle you do not mind being
   permanent.
2. **Settings → Privacy and Security → App Passwords → Add App Password.** Copy it.
3. `cp .env.example .env` and fill in `ATP_HANDLE` and `ATP_APP_PASSWORD`.

`.env` is gitignored. Bun loads it automatically.

### Why an app password and not OAuth

An app password is a scoped credential you can revoke without touching your account
password. It is the normal pattern for scripts and bots.

A real end-user app would use [OAuth](https://atproto.com/blog/oauth-atproto) — nobody
should be pasting passwords into a badge app, and
[ADR-0015](../../../apps/native-rd/docs/decisions/ADR-0015-funded-scope-prototype-fund.md)
milestone 4 specifies OAuth for exactly that reason. Implementing the React Native OAuth
client is real app work and is not this. App passwords answer every question the spike
asks, at a fraction of the cost. Knowing when a shortcut is safe is part of the skill.

### Watch what actually happens

While you are in here, notice what the process demanded: an email address, a verified
email token, a CAPTCHA. And notice what you were not given: the rotation key for your
`did:plc`. Bluesky holds it.

That is not a footnote. It means the operator of your PDS can rewrite your DID document —
including which keys are yours. Lesson 07 is about what to do with that.

## Publishing

`putRecord` needs four things
([docs](https://docs.bsky.app/docs/api/com-atproto-repo-put-record)):

| Field        | What                                                     |
| ------------ | -------------------------------------------------------- |
| `repo`       | Whose repository. Your own DID.                          |
| `collection` | The NSID from lesson 03.                                 |
| `rkey`       | The record key — lesson 03's `tid` strategy in practice. |
| `record`     | Your object, with `$type` set to the collection.         |

`$type` inside the record is not redundant with `collection`. Once a record is loose in
the world — pulled off the firehose, sitting in an indexer's database — it needs to say
what it is without its address attached.

**Predict before running:** the PDS has never heard of your collection. Does the write
succeed? Commit to an answer. Lesson 03 told you; this is where you find out whether you
believed it.

The response gives you a `uri` and a `cid`. Keep both.

## The two identities in play

This is the conceptual knot of the lesson, and it is worth slowing down for.

There are **two DIDs** and they are unrelated:

| DID                     | What it is                | Where it came from                         |
| ----------------------- | ------------------------- | ------------------------------------------ |
| `did:plc:...` (account) | Who hosts the record      | Bluesky, when you signed up                |
| `did:key:z6Mk...`       | Who issued the credential | Your own code in lesson 02, from a keypair |

The account DID owns the _shelf_. The key DID signed the _document_.

Most systems fuse these — the platform that hosts your content is the platform that
vouches for it, and "I got it from their server" is the entire basis for belief. Here
they come apart. Your credential's authority comes from a key you generated on your
laptop. Bluesky is a filing cabinet.

Your `publish.ts` prints both DIDs side by side to make the split visible. Lesson 07
proves it holds.

## Resolving

`resolve.ts` reads the record back
([docs](https://docs.bsky.app/docs/api/com-atproto-repo-get-record)).

Three parts:

1. **Parse the AT-URI.** `at://<authority>/<collection>/<rkey>`,
   [grammar](https://atproto.com/specs/at-uri-scheme). Splitting on `/` is fine.
2. **Fetch without logging in.** Construct a bare agent and call straight through. Do not
   reuse the session. If reading requires auth then the record is not publicly
   resolvable and the entire premise fails — this is a real check.
3. **Verify from the DID.** Parse the credential string, strip `proof`, recover the key
   from `issuerDid` with your `decodeDidKey`, and verify.

On step 3: do not use any key the PDS handed you. If you verify with key material the
server supplied, you have proved the server is self-consistent, not that the credential
is genuine. Take the key from the DID string, which you can derive independently.

### Check the CID

Compare the `cid` from `getRecord` against the one `putRecord` returned. They should be
identical — same content, same hash, as in lesson 01.

If they differ, the bytes changed in storage, and everything downstream is suspect.

## Running it

```bash
bun run publish-record
bun run resolve-record at://did:plc:.../dev.rollercoaster.badge.credential/...
```

Both write captures into `evidence/`. Those files are how someone else confirms you did
this, so let them contain your real handle, DID and AT-URI. A redacted AT-URI cannot be
resolved by a reader, which makes it not evidence. This is also why the account is a
burner — permanence you chose costs nothing.

## Check yourself

1. Your PDS goes offline permanently. Which of these still works: reading the record,
   verifying a copy you already saved, proving who issued it?
2. Why does the record carry `$type` when the AT-URI already names the collection?
3. You verify using the public key from `getRecord`'s response instead of from the DID.
   What have you actually proved?
4. Someone edits the credential text in your repository. What happens to the CID, and
   what happens to the signature?

---

Previous: [04 — Signing a credential](04-signing-a-credential.md) ·
Next: [06 — The firehose](06-the-firehose.md)
