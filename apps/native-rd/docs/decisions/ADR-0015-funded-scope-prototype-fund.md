# ADR-0015: Funded scope — pull verification and sharing forward, skip Iteration C

**Date:** 2026-08-23
**Status:** Proposed — pending sign-off
**Owner:** Joe
**Relates to:** [ADR-0001](./ADR-0001-iteration-strategy.md), [ADR-0003](./ADR-0003-sync-layer-decision.md), [ADR-0013](./ADR-0013-phase-b-consolidated-position.md)
**External context:** [Prototype Fund eligibility](../../../../docs/research/2026-08-23-prototype-fund-eligibility.md)

---

## Context

We plan to apply to the Prototype Fund (Jahrgang 03, Resilienz line). Applications
close 30 November 2026. The funded period is 1 June to 30 November 2027, six months,
950 hours for one person. Roughly half those hours go to user testing and community
work, not code.

That budget buys one coherent slice, not a wishlist. Three facts decide which slice.

Badges do not verify outside the app. `ob3-compliance-status.md` lists six validator
errors plus a `did:key` that does not resolve. Export is also broken:
`research/badge-export.md` shows the export button re-rasterises the badge and never
bakes the credential. Sharing anything on top of that ships a picture, not a credential.

The sharing transport is already researched. `research/atproto-evaluation.md` recommends
the user's own atproto repo for public badges only — an address the user owns, no
hosting on our side. `research/pear-p2p-evaluation.md` parks peer-to-peer until after
Iteration D. Evolu stays the sync layer (ADR-0003).

Consuming external badges is already scoped as Import Badge Opportunity in
`research/openbadges-external-earning-research.md`: import the unearned definition,
the user writes their own steps, we issue our own badge with attribution.

Sharing earned goals as templates has no prior doc. It is new work.

## Decision

The funded slice is **interoperability**: make the credential real, then let it travel.

Six milestones:

1. **OB3 external verification.** Close gaps 1–7 in `ob3-compliance-status.md`. Two PRs:
   schema shape, then cryptosuite plus resolvable DID. Done when verifybadge.org passes.
2. **Export carries the credential.** Signed VC JSON-LD leads. Baked PNG stays as the
   convenience wrapper, not the canonical artefact.
3. **Import Badge Opportunity.** Ship the shape the research doc already drew.
4. **Public badges to the user's own atproto repo.** Opt-in, Public visibility state only.
5. **Goal templates.** An earned goal becomes a portable signed record others can follow.
   Provenance is the badge that proves the path worked.
6. **Half the hours are not code.** ND user testing on the import and share flows,
   community ties, documentation.

### Discovery

Publishing gives an address, not an audience. The firehose is a stream of commits, not a
search index, and Bluesky's AppView indexes `app.bsky.*` only — our records propagate and
appear in no feed. So discovery is a separate choice, and inside the funded period it is
the cheap one: a normal Bluesky post linking the resolver page, plus a periodic job that
walks the firehose and commits a static index. Stale by hours. No always-on service.

Running our own AppView — jetstream subscription, filter our NSIDs, index into SQLite,
serve browse and search — is the real answer for templates and is parked until after the
grant. It carries a hosting bill, and it decides moderation: host no index and we curate
nothing, run one and we choose what appears. Worth stating plainly given who the users are.
The index itself stays disposable and rebuildable from the firehose, so it is never the
source of truth.

### Identity and email

The public path needs an atproto identity, and a hosted PDS gates the PLC operation behind
a verified email. That is acceptable, with two limits. It is opt-in, reached only when a
user wants a badge in public, and it never touches earning, keeping, or syncing a badge.
Store copy currently reads "No accounts. No signup. No email needed."
(`launch/store-listing-copy.md:109`). That line needs a scope, not a retraction: no account
to use the app.

Open design question, not settled here: the PLC verificationMethod may be optional. A
correctly encoded `did:key` resolves without any network, so atproto could host the
credential while `did:key` stays the issuer — no PLC operation, no email token, no
custodial rotation key. The cost is no rotation and no recovery: lose the key, lose
attribution. Decide before milestone 4.

Consequences for the roadmap: Iteration D's verification and sharing move ahead of
Iteration C. The skill tree is deferred. C is inward-facing; the work above is what makes
the app interoperable, and interoperability is what the Resilienz line funds.

**Out of scope, deliberately:**

- Private revocable share links. They need infrastructure we would have to pay for after
  November 2027.
- Peer-to-peer transport, peer verification, mentor chains.
- Our own AppView or hosted template directory.
- Any change to Evolu.
- The skill tree.

## Consequences

**Positive**

- The blocking defect gets fixed first. Every later milestone depends on it.
- No server to fund after the grant ends. Public badges live in the user's own repo.
- Two milestones are already researched, so the plan is not speculative.
- Templates answer the reach criterion: paths written by people who finished them.

**Risks**

- Goal templates are undesigned. Format, provenance and abuse questions are all open.
- atproto needs an account, and a hosted PDS needs an email. Accepted as opt-in, but the
  store copy has to be rescoped before the public path ships.
- Public atproto records cannot be recalled. Users have to understand that before posting.
- The plan depends on funding. Without the grant, this is more than a part-time year.

**Mitigations**

- Template format gets a spike before the application, so milestone 5 is not a guess.
- Answer the atproto account and irrevocability questions in the application itself.
- Milestones 1 and 2 are worth shipping unfunded. They stay on the roadmap either way.

## Alternatives Considered

**Innovation line with `openbadges-core` as a library.** Fits the Software-Infrastruktur
focus better. Rejected: the VC plumbing already exists in the digitalcredentials and
digitalbazaar libraries, and the line demands ~80% code, which strands our weakest area —
users.

**Skill tree first, as ADR-0001 orders it.** Rejected: it deepens a single-player app.
Nothing about it travels between people.

**Own relay for sharing.** Rejected: hosting costs outlive the grant.

## Related Documents

- [OB3 Compliance Status](../architecture/ob3-compliance-status.md)
- [Badge Export research](../research/badge-export.md)
- [atproto evaluation](../research/atproto-evaluation.md)
- [Pear P2P evaluation](../research/pear-p2p-evaluation.md)
- [Open Badges opportunity import research](../research/openbadges-external-earning-research.md)
- [Sync and backend architecture](../research/sync-and-backend-architecture.md)
