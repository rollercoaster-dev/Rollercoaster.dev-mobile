# Learn atproto by building on it

A hands-on tutorial. You write the code; the tests tell you when it is right.

By the end you will have published an [Open Badges 3.0](https://www.imsglobal.org/spec/ob/v3p0/)
credential as a record in an [AT Protocol](https://atproto.com/) repository you own,
resolved it back as a stranger would, watched it cross the firehose, and answered a
question this project actually needs answered before it can design
[ADR-0015](../../apps/native-rd/docs/decisions/ADR-0015-funded-scope-prototype-fund.md)
milestone 4.

That last part is not decoration. The tutorial is built around a real open question, so
the code you write is the code that settles it, and the surprises you hit are real
surprises rather than staged ones.

## Who this is for

Someone who can write TypeScript and has never touched atproto. It assumes no
familiarity with DIDs, verifiable credentials, content addressing, or the Bluesky stack.
It does assume you would rather understand why something works than copy a snippet.

## How it is arranged

```
lessons/     read these — concepts, with links to the real specs
src/         write your code here (stubs with TODOs)
tests/       run these to check your work
solutions/   reference implementations — for when you are stuck, not before
lexicons/    you will create a schema file here in lesson 03
evidence/    output captures from your live runs land here
```

Each lesson tells you what to read, what to write, and what to run. Several ask you to
predict an outcome before you run the code. Do that bit — a prediction you got wrong is
worth more than a paragraph you agreed with.

## Setup

```bash
cd spikes/atproto-badge
bun install
```

That is it for lessons 01–04. Lessons 05–07 talk to a live server and need an account;
lesson 05 walks you through getting one.

Run all checks at once with `bun test`, or one lesson's with
`bun test tests/02-did-key.test.ts`. Everything fails right now. That is the starting
line, not a problem.

## The lessons

| #                                           | What you learn                                                | Needs an account |
| ------------------------------------------- | ------------------------------------------------------------- | ---------------- |
| [01](lessons/01-what-atproto-is.md)         | The seven primitives, and which problem each one solves       | no               |
| [02](lessons/02-did-key.md)                 | Identity that belongs to nobody — and a real bug in this repo | no               |
| [03](lessons/03-lexicons-and-records.md)    | Schemas as public contracts; writing one by hand              | no               |
| [04](lessons/04-signing-a-credential.md)    | Signing something a stranger can check without asking you     | no               |
| [05](lessons/05-publish-and-resolve.md)     | Getting an identity; writing and reading a record             | **yes**          |
| [06](lessons/06-the-firehose.md)            | What the network does with your data once it exists           | **yes**          |
| [07](lessons/07-who-vouches-for-the-key.md) | The payoff: who has authority over your credential            | **yes**          |

## A word on the solutions

`solutions/` holds working implementations of everything. They pass the tests; that is
verified, not assumed.

They are there for when you are properly stuck — but the tests are a better first
resort, because a failing assertion usually tells you which idea you are missing rather
than just handing you the shape of the answer. Lesson 02's suite in particular is built
to fail in different ways depending on what you got wrong.

## Scope

This is a spike, not the shipped feature. No app integration, no UI, no key-management
hardening. Where the tutorial has an opinion about the real product, it says so and
links to the document that owns the decision.

## License

Apache-2.0, matching [`packages/openbadges-core`](../../packages/openbadges-core) — the
standards-implementation category in [`LICENSING.md`](../../LICENSING.md). Note that
this differs from the AGPL app under `apps/native-rd`.
