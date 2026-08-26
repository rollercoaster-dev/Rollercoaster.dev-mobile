# 02 — Identity that belongs to nobody

**You write code in this one.** `src/did-key.ts`, checked by `bun test tests/02-did-key.test.ts`.

## Where we are

Lesson 01 described `did:plc`: your DID resolves through a directory that says which keys
are yours and where your PDS is. Useful, and it supports key rotation and recovery.

It also means a lookup. Someone verifying your credential has to ask the PLC directory
who you are, and trust the answer. Whoever runs that directory, and whoever runs your
PDS, sit in the middle of every verification forever.

There is another kind of DID with no middle.

## did:key — the whole identity is the key

A [`did:key`](https://w3c-ccg.github.io/did-key-spec/) is a public key wearing a DID
costume. Nothing is registered anywhere. There is no directory, no server, nothing to
look up. Given the string, you can extract the public key by pure computation — offline,
on a plane, in ten years, after every company involved has folded.

```
did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK
```

For a credential this is a strong property. "Who signed this?" gets answered by
arithmetic instead of by asking somebody.

## What the string is made of

Three layers, and each one is doing a job.

### The raw key

An Ed25519 public key is 32 bytes. In a JWK it arrives base64url-encoded in the `x`
field. That is where you start.

### Multicodec — two bytes that say what this is

Prepend `0xed 0x01`, the varint code for `ed25519-pub` in the
[multicodec table](https://github.com/multiformats/multicodec).

Why bother? Because 32 raw bytes are just 32 raw bytes. An Ed25519 key and a 32-byte
hash and half a secp256k1 key are indistinguishable. The prefix is self-description: a
reader learns _what kind of key this is_ from the key itself rather than from context it
may not have.

This matters concretely. A secp256k1 `did:key` is perfectly valid and starts `zQ3sh`
instead of `z6Mk`. Without the prefix you would feed secp256k1 bytes to an Ed25519
verifier and get a signature that never validates, with nothing to tell you why. Your
`decodeDidKey` will reject that case, and a test checks it against a real secp256k1 key
taken from a live account's DID document.

### Multibase — one character that says how it is written

base58btc-encode the prefixed bytes, then prepend `z`, the
[multibase](https://github.com/multiformats/multibase) code for base58btc.

Same reasoning one level up. `z` tells a reader the alphabet before they try to decode.
base58 specifically drops the characters that make transcription error-prone — no `0`
versus `O`, no `l` versus `I` — because these strings get read aloud, printed, and
retyped.

So:

```
did:key:z + base58btc( 0xed 0x01 || <32 key bytes> )
         ↑              ↑                ↑
    multibase      multicodec       the actual key
```

Both prefixes exist so the string can be understood without external context. That is the
same instinct as the DID itself: no lookups, no assumptions, everything needed is present.

## A real bug, in this repository

Open [`apps/native-rd/src/badges/credentialBuilder.ts:52-64`](../../../apps/native-rd/src/badges/credentialBuilder.ts).

```ts
export function buildDid(publicKeyJwk: JsonWebKey): string {
  return `did:key:${publicKeyJwk.x}`;
}
```

Raw base64url. No multibase, no multicodec.

It looks fine. It has the right prefix and a plausible-looking blob after it. Every badge
the app has ever issued carries one.

It cannot be resolved. There is no way to know it is Ed25519, the alphabet is wrong for a
`did:key`, and a spec-compliant verifier rejects it outright. The signatures underneath
are real and correct — they just cannot be checked, because nobody can recover the key to
check them with.

This is gap #7 in
[`ob3-compliance-status.md`](../../../apps/native-rd/docs/architecture/ob3-compliance-status.md),
and it belongs to issue #598, not to you today. But it is why one of your tests asserts
that `decodeDidKey` _rejects_ the app's current output. Encoding is not decoration; get
it wrong and everything above it is quietly worthless.

## Your turn

Open `src/did-key.ts`. The base58btc codec is given — it is big-integer arithmetic and it
is not the lesson. You write `encodeDidKey` and `decodeDidKey`. Step lists are in the
file.

```bash
bun test tests/02-did-key.test.ts
```

Ten tests, all failing. The first one you should aim at:

```
encodeDidKey > produces the exact DID the spec says it should
```

It checks against the [did:key spec's](https://w3c-ccg.github.io/did-key-spec/) own
worked example. If you match that string byte for byte, your encoder is right — not
plausible, right.

`decodeDidKey` is the half that matters more. It is what makes a credential checkable by
someone who has never heard of you, and lesson 07's argument rests on it entirely.

### If you get stuck

- **Off-by-a-bit output that looks nearly right.** Check you prepended the multicodec
  before base58-encoding, not after.
- **Round-trip works, spec vector does not.** You are probably self-consistently wrong —
  encoding and decoding the same mistake. The spec vector is the only external check.
- **`Buffer.from(x, "base64url")`** handles JWK padding for you; do not hand-roll it.
- Genuinely stuck: `solutions/did-key.ts`. Read the comments, not just the code.

## Check yourself

1. Why can `decodeDidKey` be certain a `z6Mk…` string is Ed25519 without being told?
2. What breaks if you drop the multibase `z` but keep the multicodec bytes?
3. `did:key` needs no directory. Name the thing you give up for that. (Lesson 07 is this
   question in full.)

---

Previous: [01 — What atproto actually is](01-what-atproto-is.md) ·
Next: [03 — Lexicons and records](03-lexicons-and-records.md)
