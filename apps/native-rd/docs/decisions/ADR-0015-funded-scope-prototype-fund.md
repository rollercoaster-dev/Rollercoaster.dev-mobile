# ADR-0015: Funded scope — pull verification and sharing forward, skip Iteration C

**Date:** 2026-08-23
**Status:** Proposed — pending sign-off
**Amended:** 2026-08-24 (line reopened), 2026-08-26 (skill tree outward-facing; 80/20 remix)
**Owner:** Joe
**Relates to:** [ADR-0001](./ADR-0001-iteration-strategy.md), [ADR-0003](./ADR-0003-sync-layer-decision.md), [ADR-0013](./ADR-0013-phase-b-consolidated-position.md)
**External context:** [Prototype Fund eligibility](../../../../docs/research/2026-08-23-prototype-fund-eligibility.md),
[jury fit](../../../../docs/research/2026-08-24-jury-fit-analysis.md),
[applicant background](../../../../docs/research/2026-08-24-applicant-background.md)

---

## Context

We plan to apply to the Prototype Fund (Jahrgang 03). The funding line is not settled —
this ADR was drafted for the Resilienz line and reopened that choice on 2026-08-24; see
[Amendment 2026-08-24](#amendment-2026-08-24--the-line-is-reopened). Applications
close 30 November 2026. The funded period is 1 June to 30 November 2027, six months,
950 hours for one person. Roughly half those hours go to user testing and community
work, not code.

That budget buys one coherent slice, not a wishlist. Three facts decide which slice.

Badges do not verify outside the app. [`ob3-compliance-status.md`](../architecture/ob3-compliance-status.md) lists six validator
errors plus a `did:key` that does not resolve. Export is also broken:
[`badge-export.md`](../research/badge-export.md) shows the export button re-rasterises the badge and never
bakes the credential. Sharing anything on top of that ships a picture, not a credential.

The sharing transport is already researched. [`atproto-evaluation.md`](../research/atproto-evaluation.md) recommends
the user's own atproto repo for public badges only — an address the user owns, no
hosting on our side. [`pear-p2p-evaluation.md`](../research/pear-p2p-evaluation.md) parks peer-to-peer until after
Iteration D. Evolu stays the sync layer (ADR-0003).

Consuming external badges is already scoped as Import Badge Opportunity in
[`openbadges-external-earning-research.md`](../research/openbadges-external-earning-research.md): import the unearned definition,
the user writes their own steps, we issue our own badge with attribution.

Sharing earned goals as templates has no prior doc. It is new work.

## Decision

The funded slice is **interoperability**: make the credential real, then let it travel.

Six milestones:

1. **OB3 external verification.** Close gaps 1–7 in [`ob3-compliance-status.md`](../architecture/ob3-compliance-status.md). Two PRs:
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

> **Superseded in part** by [Amendment 2026-08-26](#amendment-2026-08-26--the-skill-tree-is-outward-facing-and-the-remix-to-8020).
> "C is inward-facing" was false — the tree is shareable by design, and the shareable
> half is now milestone 7. The authoring canvas remains deferred.

**Out of scope, deliberately:**

- Private revocable share links. They need infrastructure we would have to pay for after
  November 2027.
- Peer-to-peer transport, peer verification, mentor chains.
- Our own AppView or hosted template directory.
- Any change to Evolu.
- The skill tree's free-form authoring canvas — dragged coordinates, hand-drawn
  connectors, user styling. (The _shareable profile_ half was moved into scope by
  [Amendment 2026-08-26](#amendment-2026-08-26--the-skill-tree-is-outward-facing-and-the-remix-to-8020);
  this line originally read "The skill tree.")

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

## Amendment 2026-08-26 — the skill tree is outward-facing, and the remix to 80/20

Two changes, and they are connected: the first supplies the scope the second needs.

### 1. The skill tree was rejected on a false premise

[Alternatives Considered](#alternatives-considered) rejects it as "it deepens a
single-player app. Nothing about it travels between people."

That is wrong about the product. The tree is how a user organises, displays and **shares**
their earned goals and planned learning paths — a verifiable alternative to the skills
section of a CV. It travels between people by design.

The premise was false because nothing in the repository said otherwise.
[`product-vision.md`](../vision/product-vision.md) and
[`user-stories.md`](../vision/user-stories.md) both described Iteration C as a private
visual layer, so the rejection followed correctly from the documents and incorrectly from
the product. Both are now corrected, and a sharing user story exists. Recording the cause,
not just the fix: a scope decision was made against docs that had fallen behind intent,
and the Vorhabenbeschreibung derives from these files.

**What is now in scope:** the shareable profile — the published format, publish and
resolve, per-cluster disclosure control, and a read-only rendering.

**What stays out:** the free-form authoring canvas. Dragged coordinates, hand-drawn
connectors, and the full self-styling vision are app UI, are expensive, and are not a
Softwarebaustein. The profile is shareable and useful without anyone dragging a node.

**A constraint the styling intent puts on the format now.** The long-term goal is maximal
self-styling — the user's own personal video game skill tree, ornate or plain as they
like. That is post-grant, but the published record must carry a presentation slot from the
start. Publishing a bare credential graph and adding styling later would break every tree
already published, and per Risk 1 in
[`atproto-evaluation.md`](../research/atproto-evaluation.md) published records cannot be
recalled. Design the format for styling; ship one default rendering.

**Templates are not subgraphs of the tree.** They point in opposite directions. A goal
template is an _input_ — adopt someone's definition and it becomes an ordinary
user-created goal. The tree is an _output_ over your own earned and planned work. An
adopted goal may become a node; a template is not a path through a tree. They stay
separate milestones.

### 2. The milestones remixed to ~80/20

Precondition 1 of [Amendment 2026-08-24](#amendment-2026-08-24--the-line-is-reopened).
Innovation wants ~80 % dev against the ~50/50 in the original decision, with milestone 6
cut to about 190 h.

Two facts set the shape. Milestones 1 and 2 ship unfunded regardless, so they leave the
funded budget. And 80/20 of 950 h is 760 h of code — which the remaining original
milestones do not honestly fill. Import, atproto and templates come to roughly 440 h.
Inflating them to cover the gap would read as padding, correctly.

So the deliverable is reframed the way the line asks for: **`openbadges-core` becomes the
product and native-rd becomes the reference consumer.** This is the
["Innovation line with `openbadges-core` as a library"](#alternatives-considered)
alternative, whose rejection rested on the same ~50/50 assumption Innovation removes.

| #   | Milestone                                                                  | h   | Kind     |
| --- | -------------------------------------------------------------------------- | --- | -------- |
| 1   | OB3 external verification — gaps 1–7, verifybadge.org passes               | —   | unfunded |
| 2   | Export carries the credential                                              | —   | unfunded |
| 3   | `openbadges-core` extracted, documented, published as a standalone library | 200 | dev      |
| 4   | Import Badge Opportunity — adopt a badge definition                        | 110 | dev      |
| 5   | Public badges to the user's own atproto repo + stateless resolver          | 150 | dev      |
| 6   | Goal templates — adopt a goal definition                                   | 110 | dev      |
| 7   | Shareable skill profile — organise earned + planned, publish, resolve      | 190 | dev      |
| 8   | ND user testing, community ties, documentation                             | 190 | non-dev  |

760 dev / 190 non-dev = 950. The hours are a sketch of shape, not an estimate from
decomposed tickets, and should be re-derived before they reach the Vorhabenbeschreibung.

Milestones 4, 6 and 7 give the scope a symmetry worth stating in the application: two ways
to bring external structure **in**, one way to publish your verified picture **out**.

**Why 3 and 7 are not filler.** `openbadges-core` is `private: true` today, its README
points at two archived repos, and its install instruction resolves to a stale package
(#611). Making it something another developer can depend on — API surface, docs, platform
adapters, a release process — is the deliverable an infrastructure line is judged on.
Milestone 7 is what makes that library worth depending on, because it is the first thing
built on top of it that a non-developer can see.

**What the atproto spike already de-risked** (#614, PR #620): no PLC operation, no email
token and no custodial rotation key are needed on the credential's authority path, which
takes them off milestone 5's critical path. Separately, jetstream's `wantedCollections`
filters commit events only — a constraint on anything that indexes, discovered by running
it rather than by reading the docs.

### Still open

Precondition 2 has widened. The Learner Credential Wallet paragraph is no longer enough,
because milestone 7 has its own prior art: Badgr / Canvas Credentials backpack pages,
Credly profiles, LinkedIn skills. The delta to argue is three things stacked — the
credentials are self-issued from work the user tracked themselves, the profile lives in
the user's own repository rather than a vendor's, and planned direction is shown alongside
earned evidence. The third is the unusual one; almost every credential profile shows only
what you finished. Needs verifying against those products' current feature sets, not
asserted.

**A privacy question milestone 7 raises and milestone 5 does not.** One public badge says
"I did this." A whole tree says what someone struggled with, in what order, over how long,
and where the gaps are. For an ND-first app that approaches inferable health data, and the
correlation warning in
[`personal-data-verification.md`](../architecture/personal-data-verification.md) was
written about a stable identifier across badges — a tree is that plus a shape. Per-cluster
disclosure control is in scope for milestone 7 for this reason and is not optional polish.
Risk 1 applies with more force: unpublish is not recall.

## Alternatives Considered

**Innovation line with `openbadges-core` as a library.** Fits the Software-Infrastruktur
focus better. Rejected: the VC plumbing already exists in the digitalcredentials and
digitalbazaar libraries, and the line demands ~80% code, which strands our weakest area —
users.

> **Adopted** by [Amendment 2026-08-26](#amendment-2026-08-26--the-skill-tree-is-outward-facing-and-the-remix-to-8020)
> as milestone 3. The "strands our weakest area" half was already withdrawn by
> [Amendment 2026-08-24](#amendment-2026-08-24--the-line-is-reopened). The "~80% code"
> half was an objection to the split, and the remix resolves it. The overlap with
> digitalcredentials/digitalbazaar still needs answering in the competitor paragraph.

**Skill tree first, as ADR-0001 orders it.** Rejected: it deepens a single-player app.
Nothing about it travels between people.

> **Reversed in part** by [Amendment 2026-08-26](#amendment-2026-08-26--the-skill-tree-is-outward-facing-and-the-remix-to-8020).
> The rejection rested on a false premise: the tree is shared publicly by design. It was
> false because the vision docs described Iteration C as a private visual layer; they have
> been corrected. The ordering still stands — the tree does not come _first_ — but its
> shareable half is funded as milestone 7.

**Own relay for sharing.** Rejected: hosting costs outlive the grant.

## Related Documents

- [OB3 Compliance Status](../architecture/ob3-compliance-status.md)
- [Badge Export research](../research/badge-export.md)
- [atproto evaluation](../research/atproto-evaluation.md)
- [Pear P2P evaluation](../research/pear-p2p-evaluation.md)
- [Open Badges opportunity import research](../research/openbadges-external-earning-research.md)
- [Sync and backend architecture](../research/sync-and-backend-architecture.md)
