# 01 — What atproto actually is

**Read this one. Nothing to write.** It is the vocabulary the rest of the tutorial uses.

## The problem it solves

Ordinary web accounts put your identity and your data in the same place: the company's
database. Your handle is a row there, your posts are rows there, and if the company
disappears or throws you out, so do both. Migrating means starting over.

The [AT Protocol](https://atproto.com/) splits that apart. Your identity is a thing you
hold, your data lives in a container that can move between hosts, and the network layer
that makes it discoverable is separate from both. The pitch is "your account is not
hostage to the server".

Whether it delivers on that is a live question — the last section of this lesson, and
lesson 07, are about exactly where it does not. Start sceptical.

## The seven primitives

Read the [protocol overview](https://atproto.com/guides/overview) alongside this table.

| Thing              | What it is                                                                        | Spec                                                         |
| ------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **DID**            | Your permanent account identifier. Ugly, stable, never changes.                   | [specs/did](https://atproto.com/specs/did)                   |
| **Handle**         | A domain name pointing at your DID. Human-readable, changeable.                   | [specs/handle](https://atproto.com/specs/handle)             |
| **PDS**            | Personal Data Server. The host that stores your repository and answers for it.    | —                                                            |
| **Repository**     | Your data: a signed, content-addressed tree of records. One per account.          | [specs/repository](https://atproto.com/specs/repository)     |
| **Record**         | One JSON document in your repository, at a known address.                         | [specs/record-key](https://atproto.com/specs/record-key)     |
| **Lexicon**        | The schema language. Defines what a record type's fields are.                     | [specs/lexicon](https://atproto.com/specs/lexicon)           |
| **Relay/firehose** | A public stream of every repository change on the network. Anyone can consume it. | [specs/event-stream](https://atproto.com/specs/event-stream) |

### DID vs handle — the split that makes migration possible

A DID looks like `did:plc:njiaahshjocf7u4kzyhgikp4`. Nobody types that. So handles exist:
`alice.example.com` resolves to a DID, verified either by a DNS TXT record or a file
served at `/.well-known/atproto-did` on that domain.

The direction of the arrow is the point. The handle points at the DID, not the reverse.
Change your handle and every reference to you by DID still works — your posts, your
followers, your records. The handle is a label; the DID is the identity. Most systems
get this backwards and that is why changing your username usually breaks things.

atproto mainly uses [`did:plc`](https://web.plc.directory/spec/v0.1/did-plc), where a
directory maps the DID to a document listing your keys and your PDS. Lesson 02 covers a
different DID method that needs no directory at all, and lesson 07 is about why that
difference matters more than it sounds.

### Repository — signed, content-addressed, and why you should care

Your repository is a [Merkle search tree](https://atproto.com/specs/repository): every
record is hashed, hashes are combined into parent nodes, and the root is signed with
your account key.

The practical consequence is that a repository is _verifiable independently of who hands
it to you_. Someone can mirror your data and you can still prove what you did and did
not write. Contrast an ordinary API, where "the server said so" is the entire basis for
believing a response.

Every record gets a **CID** — a content identifier, a hash of the bytes. Same content,
same CID, always. Different content, different CID, no exceptions. When you publish in
lesson 05 the PDS hands back a CID, and when you read the record in the same lesson you
can confirm it matches. That is not ceremony; it is the check that the bytes you get are
the bytes that were signed.

The data model is [IPLD-based](https://atproto.com/specs/data-model), with records stored
as DAG-CBOR and rendered to JSON at the edges.

### Addressing — the AT-URI

Records are addressed like this:

```
at://did:plc:njiaahshjocf7u4kzyhgikp4/app.bsky.feed.post/3k2akqtnrjk2p
     └─────────── authority ────────┘ └── collection ──┘ └─ rkey ─┘
```

Grammar: [specs/at-uri-scheme](https://atproto.com/specs/at-uri-scheme).

Three parts: _whose_ repository, _what kind_ of record, and _which one_. The collection
is an NSID — a reverse-domain schema name, lesson 03. You will parse one of these by
hand in lesson 05, which is a better way to learn the grammar than reading it.

### Lexicon — schemas as public contracts

[Lexicon](https://atproto.com/specs/lexicon) is how record types are defined: field
names, types, constraints, in JSON. `app.bsky.feed.post` is a Lexicon. So is the one you
will write in lesson 03.

The naming rule matters: an NSID's authority half is a domain in reverse
(`dev.rollercoaster.badge.credential` → `rollercoaster.dev`), and you are only supposed
to define names under a domain you control. There is no registry enforcing this and no
permission to request. It is a convention held up by the fact that squatting someone
else's namespace makes your data useless to everyone else.

### The firehose — public by construction

Every repository commit on the network is broadcast on a public event stream. No API
key, no application, no rate-limited partnership. Anyone can build an index.

That is the discovery story, and it is genuinely unusual. It is also the thing to be
most careful about, which brings us to:

## What atproto is not

Four things it is worth being blunt about, because they constrain everything this
tutorial does.

**It is not private.** A repository is public by default. There is no per-record access
control and no encryption at rest. The
[Private Data Working Group](https://atproto.wiki/en/working-groups/private-data) is
designing something, and it is unshipped. In this project that single fact confines
atproto to publicly-shared badges only — goals, journal entries, evidence and anything
mood-adjacent never go near it. See
[`atproto-evaluation.md`](../../../apps/native-rd/docs/research/atproto-evaluation.md).

**It is not a sync layer.** This project uses [Evolu](https://www.evolu.dev/) for that,
decided in [ADR-0003](../../../apps/native-rd/docs/decisions/ADR-0003-sync-layer-decision.md).
atproto is a publication target: something you deliberately push a copy to, never the
source of truth.

**Deletion is not erasure.** Delete a record and it goes from your PDS and a delete event
goes out on the firehose. Whether every indexer that already copied it honours that is
not something the protocol can enforce. For a _credential_ — a thing whose point is
permanence — this is the sharpest values conflict in the whole design, and it is Risk 1
in the evaluation doc.

**A hosted account is custodial.** If someone else runs your PDS, they hold a rotation
key for your `did:plc`, which means they can rewrite your DID document. Not the marketing
version of self-sovereignty. Lesson 07 is entirely about this and about what you can do
that routes around it.

## Check yourself

No test for this one. Answer these from memory before moving on:

1. You change your handle from `alice.example.com` to `alice.dev`. Which of your existing
   records break?
2. Two people publish byte-identical records. Same CID or different?
3. You define `com.google.mail.message` as your NSID. Nothing stops you. What breaks?
4. Someone hands you a copy of my repository. What can you verify without contacting my
   PDS at all?

Answers are in the sections above; if any of them is a guess, reread that part. Question
4 in particular is the one lesson 07 turns on.

---

Next: [02 — Identity that belongs to nobody](02-did-key.md)
