# 04 — Signing a credential

**You write code in this one.** `src/build-credential.ts`, checked by
`bun test tests/04-credential.test.ts`.

Still offline. No account needed. That is the point of the lesson.

## What a verifiable credential is for

A paper certificate proves nothing on its own — its value comes from a chain of
institutions willing to vouch for it. Take the issuer away and you have a nice piece of
card.

A [Verifiable Credential](https://www.w3.org/TR/vc-data-model-2.0/) moves the proof into
the document. It is signed, so anyone holding the issuer's public key can check that the
contents have not been altered and that the named issuer really signed them. No call
home, no API, no permission.

[Open Badges 3.0](https://www.imsglobal.org/spec/ob/v3p0/) is a VC profile for
achievements: a defined shape for "this person did this thing, and here is who says so".

The reason this matters here is that it inverts a dependency. If the credential is
self-contained, hosting becomes a convenience rather than a trust anchor. That is the
claim lesson 07 tests.

## Anatomy

```jsonc
{
  "@context": [...],                    // vocabulary — what the field names mean
  "id": "urn:uuid:...",                 // this credential
  "type": ["VerifiableCredential", "OpenBadgeCredential"],
  "issuer": { "id": "did:key:z6Mk..." },// who signed it
  "validFrom": "...",
  "credentialSubject": {                // what is claimed, and about whom
    "achievement": { ... }
  },
  "proof": { ... }                      // the signature
}
```

Three parts of this are exercises in judgment rather than transcription.

### The issuer is a did:key

`issuer.id` is the DID you built in lesson 02. So the credential says, in effect, "the
holder of this key issued this" — and the key is recoverable from the statement itself.

Compare an HTTPS issuer id, the common choice. `https://example.edu/issuer` requires that
domain to still exist, still serve that path, and still be controlled by the same people,
at every future moment someone wants to verify. For a badge meant to outlast a project,
that is a real dependency.

### Achievement ids are HTTPS, not DID paths

The app currently does this
([`credentialBuilder.ts:82-84`](../../../apps/native-rd/src/badges/credentialBuilder.ts)):

```ts
const achievementId = iri(`${input.issuerDid}/achievements/${goalId}`);
```

Gluing a path onto a DID. For `did:key` that is malformed — the method defines no path
component, so the resulting DID URL is not resolvable and not valid. It is the second
half of gap #7.

Use an HTTPS URI. A test enforces this, and it enforces it by checking your achievement
id does _not_ contain `did:key:`.

### There is no credentialSubject.id

The obvious move is to identify the recipient. Do not.

A stable identifier repeated across every public badge someone holds links them all
together permanently — and unlike a post, a credential is meant to be durable and shown
to strangers. That is the correlation risk in
[`personal-data-verification.md`](../../../apps/native-rd/docs/architecture/personal-data-verification.md),
and it is the standard privacy warning about long-lived identifiers in W3C's own VC
guidance.

An unbound subject is weaker as a claim: it says the achievement happened, not who holds
it. That is a genuine trade-off, and for a public badge in this project it is the right
side of it. When a product decision is baked into a data shape like this, it deserves a
comment saying so — otherwise someone helpfully "fixes" it later.

## Proofs, and telling the truth in a label

The signature goes in `proof`, per
[VC Data Integrity](https://www.w3.org/TR/vc-data-integrity/). The field that does the
work is `cryptosuite`, which names the exact algorithm a verifier should apply.

The OB3-blessed suite for Ed25519 is `eddsa-rdfc-2022`. That name promises something
specific: the signature was taken over the credential after **RDFC-1.0 canonicalization**
— the JSON is interpreted as RDF and rewritten into a single deterministic form first.

Canonicalization exists because `{"a":1,"b":2}` and `{"b":2,"a":1}` are the same document
and different bytes. Without it, re-serializing breaks the signature. With it, any
verifier reaches the same bytes independently.

We are signing `JSON.stringify` output. That is not RDFC. So the proof is labelled:

```
eddsa-raw-json-iteration-a
```

A made-up name, and that is the correct behaviour. Labelling it `eddsa-rdfc-2022` would
make a spec-compliant verifier canonicalize, hash different bytes, and report the
signature as invalid — sending whoever debugs it hunting for a broken key when the real
problem is a lie in a metadata field. A non-standard name fails honestly: "I do not know
this suite" instead of "this signature is bad".

The app makes the same call at
[`useCreateBadge.ts:264`](../../../apps/native-rd/src/hooks/useCreateBadge.ts). Real
RDFC-1.0 is gap #5, issue #598. A test here asserts your cryptosuite is _not_
`eddsa-rdfc-2022`.

## Sign the credential without its own signature in it

Sign `JSON.stringify(unsigned)` — the credential _before_ the proof is attached. Then
attach the proof.

If you sign the object that already contains the proof you have created a value that
would have to contain its own hash, which no verifier can reproduce. Obvious once said,
and an easy mistake to make when you build the object first and sign it later.

A verifier therefore has to strip `proof` before checking. Both your `resolve.ts` in
lesson 05 and the test here do exactly that.

## A fresh key every call

`buildSignedCredential` generates a new keypair each time, and a test enforces it by
calling twice and requiring different DIDs.

Two reasons. The spike must never touch the app's real signing key in SecureStore — key
management is out of scope and reaching for production key material from tutorial code is
how accidents happen. And a fresh key keeps each run independent, so a mistake costs you
nothing.

## Your turn

Open `src/build-credential.ts`. Steps are in the file.

```bash
bun test tests/04-credential.test.ts
```

The one to care about:

```
the whole point > verifies using only the key recovered from the issuer DID string
```

It builds a credential, throws away the public key that was returned, recovers a key from
the DID string alone, and verifies with that. No network, no directory, no PDS — none of
which exist yet, because you have no account.

That test passing is the argument of this entire tutorial. Everything after it is about
whether publishing to atproto damages the property, and the answer turns out to be no.

There is also a tampering test. Watch it fail if you sign the wrong bytes.

## Check yourself

1. Why must the signature be over the credential without `proof`?
2. Someone relabels your cryptosuite `eddsa-rdfc-2022`, changing nothing else. What does
   a compliant verifier report, and why is that worse than the honest label?
3. If your key is recoverable from the DID, what stops someone forging a credential that
   claims your DID as issuer?

---

Previous: [03 — Lexicons and records](03-lexicons-and-records.md) ·
Next: [05 — Publish and resolve](05-publish-and-resolve.md)
