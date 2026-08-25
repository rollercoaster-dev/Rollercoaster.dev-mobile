# atproto badge spike

> **Status: in progress.** Scaffold only — findings are filled in as each step lands.
> Tracking issue: [#614](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/614).

Throwaway research code. Publishes one signed Open Badges 3.0 credential as a record in a
user-owned [atproto](https://atproto.com/) repository, reads it back, and checks what the
network does with it. It exists to answer a small number of concrete questions before
[ADR-0015](../../apps/native-rd/docs/decisions/ADR-0015-funded-scope-prototype-fund.md)
milestone 4 is designed, and to be a reproducible artefact a reader can re-run.

This is **not** the shipped feature. No app integration, no UI, no key-management hardening.

## Questions this spike answers

1. What does creating an atproto identity on a hosted PDS actually require — email token,
   rotation-key custody, anything else the docs gloss over?
2. Does a hosted PDS accept a third-party record type (`dev.rollercoaster.badge.credential`),
   and does that record resolve by AT-URI and CID?
3. Does the record reach the firehose, and does it stay out of Bluesky feeds?
4. **Can a correctly encoded `did:key` remain the credential issuer while atproto only hosts
   the record** — no PLC operation, no email, no custodial rotation key? At what cost?

## Running it

<!-- filled in at Step 3 -->

## Identity

<!-- filled in at Step 5: which PDS, what the PLC operation asked for, rotation key custody -->

## Findings

### What works

<!-- filled in at Step 5 -->

### What is stubbed

<!-- filled in at Step 5 -->

### What milestone 4 still has to build

<!-- filled in at Step 5 -->

## The `did:key`-only question

<!-- filled in at Step 5: yes/no + the rotation/recovery cost -->

## Isolation from the rest of the repo

This directory is deliberately **not** a workspace member — root `package.json` globs only
`packages/*` and `apps/*`. It has its own `package.json` and lockfile and is installed
separately (`cd spikes/atproto-badge && bun install`). Nothing here is built, linted, tested,
or type-checked by CI; `bun install` at the repo root does not touch it. The one repo-wide
gate it does pass through is Prettier formatting.

## License

Apache-2.0, matching [`packages/openbadges-core`](../../packages/openbadges-core) — the
standards-implementation category in [`LICENSING.md`](../../LICENSING.md). Note this differs
from the AGPL-licensed app under `apps/native-rd`.
