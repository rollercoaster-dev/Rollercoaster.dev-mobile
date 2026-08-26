# 03 — Lexicons and records

**You write JSON in this one.** `lexicons/dev.rollercoaster.badge.credential.json`,
checked by `bun test tests/03-lexicon.test.ts`.

## Why a schema language at all

Your repository holds records. A record is JSON. So far nothing needs a schema.

But other people's software reads your records. An indexer building a badge directory, a
verifier checking a credential, a future version of this app — none of them wrote your
code and none of them can ask you what a field means. A
[Lexicon](https://atproto.com/specs/lexicon) is the contract they read instead.

This is a different job from validation. Validation is for you; a Lexicon is for
strangers.

## NSIDs — names in reverse

Record types are named by NSID: reverse domain, then a path.

```
dev.rollercoaster.badge.credential
└──── authority ────┘ └── name ──┘
        ↑
   rollercoaster.dev, reversed
```

The authority half must be a domain you control. `app.bsky.feed.post` belongs to Bluesky
because they hold `bsky.app`.

Nothing enforces this. No registry, no application, no permission. You could define
`com.google.mail.message` this afternoon and your PDS would accept records under it.

What stops you is that the convention is the only thing making the namespace useful.
Squat someone's domain and your records are worthless to every consumer who resolves the
name properly — and if the real owner ever publishes there, you have a collision you
cannot win. The rule holds because breaking it mostly hurts you.

Optionally you can [publish your Lexicon](https://atproto.com/guides/publishing-lexicons)
via DNS so others can resolve the schema from the name. Not required to _write_ records;
worth it if you want anyone else to implement against you.

## Will a PDS accept a type it has never seen?

This is the question that decides whether any of this is possible, so it is worth being
precise.

Yes. A PDS validates records against Lexicons it knows and accepts unknown collections
as-is. Custom record types have been writable to hosted PDSs
[since early 2024](https://github.com/bluesky-social/atproto/discussions/3116). The limits
you hit are rate and size limits, not type restrictions.

So you do not need a partnership, an API key, or anyone's blessing to publish
`dev.rollercoaster.badge.credential` records to a Bluesky-run server. You will confirm
this yourself in lesson 05 rather than taking my word for it.

## Record keys

The `key` field in your Lexicon says how records of this type are named. Options are in
the [record key spec](https://atproto.com/specs/record-key); two matter here.

**`tid`** — a timestamp identifier. Every record gets a distinct key, so a repository can
hold many. This is what you want for badges: a person earns more than one.

**`literal:self`** — the key is always the string `self`, so the repository holds exactly
one. This is how profiles work: `app.bsky.actor.profile` is `literal:self` because you
have one profile.

Picking `literal:self` for badges would mean each new badge silently overwrote the last.
The choice looks like a formality and is actually a data model decision.

## The shape you are writing

```json
{
  "lexicon": 1,
  "id": "<the NSID>",
  "defs": {
    "main": {
      "type": "record",
      "key": "<key strategy>",
      "record": {
        "type": "object",
        "required": ["..."],
        "properties": { "...": {} }
      }
    }
  }
}
```

`defs.main` is the primary definition — the one addressed by the bare NSID.

### The fields, and one decision worth arguing about

You need `credential`, `issuerDid`, `createdAt`, and optionally an `image` blob.

`credential` holds the signed Verifiable Credential. The tests require it to be a
**string** — the whole VC serialized as JSON — rather than a nested object. Two reasons,
and the second is the real one.

The surface reason: a VC's top-level key is `@context`, and Lexicon object schemas cannot
express a property called `@context`.

The reason that actually matters: **a signature covers exact bytes.** If the VC were a
nested object, the PDS would parse it into DAG-CBOR and re-serialize it on the way out.
Key order could shift, whitespace vanishes, number encodings normalize. Every one of
those changes the bytes, and changed bytes mean the signature no longer verifies over
what you get back. Storing an opaque string means the exact bytes that were signed are
the exact bytes a verifier receives.

This is a general lesson about signed data on someone else's infrastructure, not an
atproto quirk. Anywhere a document gets parsed and re-emitted between signing and
verifying, the signature is at risk.

`issuerDid` duplicates a value already inside the credential string. Deliberate: an
indexer can filter on it without parsing every credential. Denormalizing for query
performance, the same trade-off as anywhere else — you accept that two copies could
disagree, in exchange for not parsing a 100KB string to answer "whose is this".

`createdAt` uses `"format": "datetime"`. Note it means _when the record was published_,
not when the badge was earned; the credential's own dates own that. Two timestamps that
sound alike and mean different things are a good way to produce a confusing bug later, so
say which is which in the description.

Bound your strings with `maxLength`. An unbounded string in a public schema is an
invitation.

## Your turn

Create `lexicons/dev.rollercoaster.badge.credential.json`.

```bash
bun test tests/03-lexicon.test.ts
```

Eleven checks. They are strict about structure and indifferent to your prose. Write real
descriptions anyway — a Lexicon is documentation for people who cannot ask you questions,
and the descriptions are the only place that documentation lives.

## Check yourself

1. Your Lexicon says `maxLength: 100000` on `credential`. What enforces it — your code,
   the PDS, or nothing?
2. Why does `issuerDid` exist when the same DID is inside the credential string?
3. You switch `credential` from a string to a nested object and signatures start failing
   intermittently. Why intermittently rather than always?

---

Previous: [02 — Identity that belongs to nobody](02-did-key.md) ·
Next: [04 — Signing a credential](04-signing-a-credential.md)
