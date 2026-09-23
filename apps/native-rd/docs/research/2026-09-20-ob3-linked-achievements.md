# OB3, Linked Achievements, and Badge Trees

**Date:** 2026-09-20

**Status:** Standards research; architecture recommendations are not decisions

**Product context:** [Community Learning and Peer Validation](../vision/community-learning-and-peer-validation.md)

This applies the existing [sub-badge and hierarchy research](./openbadges-sub-badges.md) to the community-learning direction. It does not replace that research or select a new architecture.

## Findings

OB3 core does not define a complete badge-tree or prerequisite engine. Its `Achievement.related` expresses substantially equivalent achievements, including translations and earlier versions; it should not be repurposed as a parent/child edge. `alignment` connects an achievement to an external framework item. Extensions are possible but cannot be required by the base standard. [OB3 specification, Achievement and section C](https://www.imsglobal.org/spec/ob/v3p0/).

The companion **Comprehensive Learner Record (CLR) 2.0** bundles awarded credentials and supports associations between achievement IDs. Its vocabulary includes `isPartOf`, `isChildOf`, `isParentOf`, `precedes`, and `replacedBy`. `ClrSubject` can also include expected achievement definitions. These relationships describe meaning, not badge-canvas coordinates or an automatic award policy. [CLR 2.0, B.1.2–B.1.4](https://www.imsglobal.org/spec/clr/v2p0/).

**CASE** describes competency frameworks and relationships between their items. OB3's implementation guide explains aligning achievements with CASE items. This is relevant to a shared learning pathway, distinct from recording what an individual has earned. [OB3 implementation guide, alignment with CASE](https://www.imsglobal.org/spec/ob/v3p0/impl/), [CASE 1.1 implementation guide](https://www.imsglobal.org/node/218298).

## Implications for this product

These are recommendations inferred from the standards and the agreed product direction:

| Product need                                 | Candidate representation                          | Limit                                                                        |
| -------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------- |
| A recognized step or whole badge             | Its own OB3 credential                            | Does not describe the whole learning journey.                                |
| A peer's validation of one version           | OB3 endorsement targeting that credential         | Does not validate its parent achievement automatically.                      |
| “Knot tying contributes to shelter building” | App relationship that could map to CLR `isPartOf` | Containment does not establish sufficient evidence to earn the parent.       |
| A tree exported with earned achievements     | Investigate CLR as an export envelope             | Supporting a standard does not guarantee every wallet renders the same tree. |
| A group's reusable pathway                   | Investigate CASE-aligned achievement definitions  | Does not replace each learner's credentials or choices.                      |
| “I want peer validation before completion”   | Learner policy in the app                         | A revisable learner commitment, not a fixed external gate.                   |
| Layout, drafts, review rounds, and coaching  | App learning-history model                        | No claim that a generic OB3 wallet understands these.                        |

For example, bowline and site-selection achievements could both contribute to a shelter achievement. The learner could use the same bowline achievement toward a sailing goal. That suggests a graph with reusable nodes rather than a strictly single-parent tree. This is a design possibility, not a new requirement.

“Make this step a badge” need not change any of these edges. The product requirement is to preserve recognition of the unchanged achievement; the credential and presentation mapping remains a design question. Recognition of the whole shelter remains a separate claim.

## Keep three kinds of links distinct

1. **Learning structure:** one achievement contributes to another, or comes earlier in a pathway.
2. **Review provenance:** a specific peer validated a specific learner's credential version.
3. **Revision history:** a new submission or claim follows an earlier one.

Do not use a general “related badge” field for all three. In particular, achievement-definition IDs, awarded credential IDs, and local step IDs are different identities. The eventual mapping must preserve that distinction.

Likewise, “comes before” is weaker than “is required before.” Required validation, alternatives, optional steps, and completion rules need explicit policy semantics. They should not be inferred from tree position or a sequence edge.

## Recommendation to discuss

Keep individual achievements and endorsements independently OB3-valid. Keep the editable learning graph separate from immutable signed claims. Investigate CLR for portable collections and meaningful links; consider CASE only when shared pathway definitions become a concrete need.

This allows a learner to rearrange their personal map without rewriting credentials. If a relationship becomes part of a signed award's criteria, changing that relationship would instead change the claim and require the appropriate new version.

No CLR or CASE implementation is implied by this research. Before selecting either, test a small export with an independent consumer, confirm identifiers and version semantics, and establish which relationships the receiving tool actually preserves.

## Existing repository direction

The [draft data model](../architecture/data-model.md) already separates `GoalLink` (a badge contributing toward a goal) from `SkillTreeNode` and `SkillTreeEdge` (the visual map). That is compatible with separating learning relationships from credential signatures, but the current proposal lacks precise relationship types and version bindings. These remain design work.

Sources were checked on 2026-09-20. This is document research, not a tested interoperability result.
