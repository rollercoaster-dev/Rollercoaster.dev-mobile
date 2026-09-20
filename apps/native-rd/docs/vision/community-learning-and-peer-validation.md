# Community Learning and Peer Validation

**Date:** 2026-09-20

**Status:** Agreed product direction; technical design remains open

## Purpose

Create reasons for people to come together locally, learn from one another, and recognize each other's progress. The motivating analogy is modern scouting: learners create their own achievements and validate them through live, in-person social interaction.

Regularly meeting groups support an ongoing process. People can bring an idea, work in progress, an individual step, or a completed self-issued badge. Review can contribute to earning an achievement or add recognition afterward. The app supports that relationship and preserves its history.

## Learner choice

- Learners choose whether peer validation is required for a step or the final badge.
- Learners choose the review focus: their own question, the achievement's criteria, or both.
- Validation can be based on reviewing evidence or personally witnessing the achievement. The basis must remain clear in the recognition.
- Any peer can validate initially. Later, a validator's own badges and relevant information may provide context and weight. No scoring system or authority hierarchy has been selected.

The policy for validation should be explicit, without imposing one policy on every learner. Editing that policy does not rewrite historical reviews.

## Coaching and iteration

Feedback should guide learners toward discovering a solution, rather than prescribe specific changes. Reviewers can ask questions, identify a gap, and explain what they need to see to validate an achievement. The learner decides how to respond.

The code-review analogy applies to revisions and approval: a review concerns a particular version. Feedback may lead to another attempt and another review. Earlier feedback and validation remain attached to the version reviewed; changes do not silently inherit approval.

Self-completion, feedback, and peer validation are distinct. A useful meeting need not produce an endorsement. The treatment of formally requesting changes, review outcomes, and feedback recording still needs design.

## Steps can become standalone badges

Validating a step and making it a standalone badge are separate learner-controlled actions. “Make this a badge” recognizes that step as its own achievement; it does not mean expanding it into a new goal.

A learner might receive validation for tying and testing a bowline while building a shelter. They can choose to make the bowline achievement a standalone badge, even if the shelter is never completed.

The agreed technical direction is to separate the underlying OB3 credential from its presentation:

| Moment                    | Intended behavior                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Working on a step         | Preserve attempts, coaching, and revisions in learning history.                                                                 |
| Recording the achievement | Represent that version's learner, achievement, criteria, and evidence in an OB3 credential. Exact issuance timing remains open. |
| Peer validation           | Use an OB3 EndorsementCredential targeting that specific achievement credential.                                                |
| Make it a badge           | Reuse the unchanged credential and endorsement, presenting it as a standalone badge.                                            |
| Change the reviewed claim | Preserve the earlier credential and review; the new version needs fresh validation.                                             |

A presentation-only change can preserve signed content. Changing a signed title, criteria, or evidence is a credential change, even if the user sees it as cosmetic. Do not transfer a signature to a different claim or append content that invalidates an existing proof.

Distinct credential IDs for distinct reviewed versions are the agreed direction to investigate, with app-level links preserving their history. This avoids relying on another wallet to retain every revision under a reused credential ID.

## OB3 is a requirement

The credentials and endorsements must follow OB3 and be independently verifiable. A proprietary signed statement is not a substitute. Technical validation and a peer's judgment are separate: the former checks the credential; the latter recognizes the achievement.

OB3 provides achievement and endorsement models; the app must model coaching, review rounds, learner policies, and how those records connect. A valid credential alone does not prove the truth of an observation or a person's legal identity. See the [OB3 specification](https://www.imsglobal.org/spec/ob/v3p0/).

## Still open

- Issuance timing when peer validation is required, including the distinction between a completion claim and an approved achievement.
- Exact version identifiers, evidence binding, and portable review-history representation.
- How two people connect their apps and exchange data during a meeting. File export/import, QR, nearby transfer, and hosted links have **not** been selected.
- What group support belongs in the app, as distinct from the real-world group meeting regularly.
- Feedback capture, retention, disclosure, and the review-state model.
- How optional badge presentation is separated from the signed credential in storage and export.
- How linked achievements and badge trees should be represented. See [OB3 linked-achievement research](../research/2026-09-20-ob3-linked-achievements.md); it does not select an architecture.
- How legacy non-standard credentials are handled, and how independent endorsement/exchange interoperability will be demonstrated. New-badge OB3 compliance has already shipped; see [current compliance status](../architecture/ob3-compliance-status.md).
- How learner-selected validation requirements interact with the current Phase B completion rules. This vision does not silently amend accepted ADRs.

## Relationship to existing documents

This develops the community direction in [product vision](./product-vision.md) and follows [design principles](./design-principles.md). It expands the earlier final-badge-only framing to include steps and repeated review.

The [implementation-gap brief](../research/2026-09-20-minimal-peer-validation.md) consolidates the research against current main. This vision is the source of truth for the product choices agreed in this discussion; transport, media limits, and implementation sequencing remain open.

The [current ADR positions](../decisions/index.md#current-positions) still govern implementation. In particular, this vision neither changes funded milestones nor treats existing Phase B personal reflection as peer review. Any necessary policy changes require their own explicit decision.
