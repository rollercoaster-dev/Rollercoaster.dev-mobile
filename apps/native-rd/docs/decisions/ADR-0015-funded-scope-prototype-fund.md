# ADR-0015: Funded scope — pull verification and sharing forward, skip Iteration C

**Date:** 2026-08-23
**Status:** Proposed — pending sign-off
**Owner:** Joe
**Relates to:** [ADR-0001](./ADR-0001-iteration-strategy.md), [ADR-0003](./ADR-0003-sync-layer-decision.md), [ADR-0013](./ADR-0013-phase-b-consolidated-position.md)
**External context:** [Prototype Fund eligibility](../../../../docs/research/2026-08-23-prototype-fund-eligibility.md),
[jury fit](../../../../docs/research/2026-08-24-jury-fit-analysis.md),
[applicant background](../../../../docs/research/2026-08-24-applicant-background.md)

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

## Amendment 2026-08-24 — the line is reopened

Status stays Proposed, and the funded slice above stands. What is no longer settled is
**which line it is submitted to**. Recording the state so the reversal is not silent.

**Why Resilienz is in trouble.** The line makes anchoring in a community a hard bar, and we
are at zero. The window closes 30 November 2026, so there are roughly fourteen weeks to
build real community ties — and a community cannot be listed as a milestone by a line that
assumes you already have one. Resilienz also carries a mandatory Second Stage commitment.

**Why Innovation is now the leading option**, despite being rejected below:

- no community gate
- ~80 % code matches the demonstrated skillset better than the ~50/50 split in this ADR
- Second Stage optional rather than mandatory
- up to 30 slots against 10

**The rejection reason below no longer holds as written.** It says Innovation "strands our
weakest area — users". Per [applicant background](../../../../docs/research/2026-08-24-applicant-background.md),
users is the evidenced half of the record — a delivered media-literacy programme for 170
children and their caregivers, with evaluation loops and a handover. The exposed half is
technical: milestones 1, 4 and 5. Innovation asks for more of what is weak and less of what
is documented, which is uncomfortable but is the honest reading.

**What Innovation costs, and it is not small.** Resilienz says a project need not be
innovative; Innovation says it must. That puts the **Learner Credential Wallet** overlap
squarely in play — an MIT-licensed React Native wallet for W3C VCs including OB 3.0,
identified in the eligibility research as the closest twin to this app — against a
no-Doppelförderung rule that also asks that a similar open-source product not already
exist. Resilienz was forgiving that; Innovation will not.

**Preconditions before this becomes a decision.** Until both exist, Innovation is a plan
and not a choice:

1. The six milestones remixed from ~50/50 to roughly 80/20 dev share, with milestone 6 cut
   to about 190 h. The Vorhabenbeschreibung derives from this ADR, so the numbers here have
   to be the real ones.
2. One paragraph stating the delta against Learner Credential Wallet. The unoccupied ground
   the survey found is the tracker-plus-self-issued-credential fusion, not the wallet.

**Unchanged either way.** Milestones 1 and 2 ship unfunded regardless, and the jury-fit doc
calls verifybadge.org passing the strongest available Realisierbarkeit exhibit — under
Innovation it also becomes the infrastructure substance the line is judged on. Line choice
and sketch framing stay separate levers: sketches are routed by juror expertise, so an
Innovation submission can still lead with digital participation.

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
