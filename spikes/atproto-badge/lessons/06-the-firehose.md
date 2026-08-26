# 06 — The firehose

**You write code in this one.** `src/check-propagation.ts`. Needs your account from
lesson 05.

Two claims this project has been repeating in design documents without anyone checking
them. You are going to check them.

> The record propagates to the firehose (expected: yes) and appears in no Bluesky feed
> (expected: yes — the AppView indexes `app.bsky.*` only).
>
> — [issue #614](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/614)

Note the instruction attached to them: _verify rather than cite_. A design that rests on
an untested assumption is a design resting on a rumour.

## What the firehose is

Every repository commit on the network — every post, like, profile edit, and every badge
record you write — is broadcast on a public stream. No API key, no application, no
partnership. [Spec](https://atproto.com/specs/event-stream).

This is the discovery mechanism, and it is genuinely unusual. Publish a record and
anybody building an index can see it, with no relationship to you or to Bluesky.

The raw firehose is DAG-CBOR and includes full repository diffs.
[Jetstream](https://github.com/bluesky-social/jetstream) is a JSON view of the same thing
with server-side filtering, which is what you want:

```
wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=<nsid>&wantedDids=<did>
```

## Claim 1 — does your record show up?

Subscribe filtered to your collection and your DID, then publish from another shell.

```bash
# terminal 1
bun run check-propagation did:plc:yourdid --wait
# terminal 2
bun run publish-record
```

### The trap, which is worth walking into

Before the interesting version, do the naive thing. Subscribe with
`wantedCollections` set to a collection **nobody has ever published** — yours, before you
publish anything — and just count messages.

You will get several within seconds.

Sit with that for a moment before reading on. A filter for something that does not exist
is returning traffic. Either the filter is broken, or it does not mean what you assumed.

<details>
<summary>What is actually happening</summary>

`wantedCollections` filters **`commit`** events only. Jetstream also emits `identity` and
`account` events — handle changes, account status changes — and those stream through
regardless of your collection filter, because they are not about a collection at all.

Verified on 2026-08-25: a subscription filtered to `dev.rollercoaster.badge.credential`,
which no one had ever published, delivered six events in twelve seconds. All
`identity`/`account` churn from unrelated accounts.

So filter on `kind === "commit"` as well as trusting the query string. An indexer that
treats message arrival as "my record propagated" is counting other people's account
churn — it would report success while consuming pure noise, which is the worst kind of
bug because it looks like it works.

</details>

This is the shape of the lesson: the assumption was roughly right, and the detail
underneath it was wrong in a way that would have produced a confidently broken indexer.
Reading the docs would not have caught it. Running it did.

## Claim 2 — does it pollute Bluesky?

Now the one that sounds implausible.

Your badge record is in your repository. Bluesky reads your repository. So — does a badge
appear in your Bluesky feed? Does publishing spam your followers?

**Predict before you check.** Write it down.

```ts
new AtpAgent({
  service: "https://public.api.bsky.app",
}).app.bsky.feed.getAuthorFeed({ actor: did, limit: 100 });
```

<details>
<summary>The answer, and the architecture behind it</summary>

Nothing. Your feed is empty of badges.

Bluesky-the-app is an **AppView**: a service that consumes the firehose and builds
indexes over the record types it cares about — `app.bsky.feed.post`,
`app.bsky.actor.profile`, and so on. It ignores everything else, because it has no idea
what your records mean and no reason to guess.

So the layers are genuinely separate:

- **PDS** — stores your repository. Takes any record type.
- **Firehose** — broadcasts every commit. Carries any record type.
- **AppView** — indexes the types it understands. Yours is not one of them.

This is the thing that makes atproto usable as general infrastructure rather than as
Bluesky's database. Your badges are publicly discoverable by anyone who chooses to index
them, and invisible to everyone who does not. Publishing a credential does not post to
social media.

If you want badges discoverable _as badges_, someone has to run an AppView for them —
consume the firehose, filter your NSID, build an index. That is real infrastructure and
[ADR-0015 defers it](../../../apps/native-rd/docs/decisions/ADR-0015-funded-scope-prototype-fund.md)
until after the grant. Worth knowing the cost is not zero.

</details>

## Your turn

`src/check-propagation.ts`. Both checks, then a capture in `evidence/`.

```bash
bun run check-propagation <your-did> --wait
```

Record what you actually observed, including anything that contradicts this lesson. If
the firehose shows nothing in sixty seconds, that is a finding — write it down as one
rather than retrying until it agrees with the document.

## Check yourself

1. Why can jetstream filter by collection but still send you `identity` events?
2. An indexer counts every message on a collection-filtered subscription. What does its
   count actually measure?
3. What would have to exist for a badge to be discoverable _as a badge_ by someone who
   has never heard of this project?
4. Nothing about "public" changed between lesson 05 and here. So why does publishing feel
   more consequential now?

---

Previous: [05 — Publish and resolve](05-publish-and-resolve.md) ·
Next: [07 — Who vouches for the key](07-who-vouches-for-the-key.md)
