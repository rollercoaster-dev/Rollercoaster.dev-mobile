# Community Learning and Peer Validation

**Date:** 2026-09-20

**Requirements workshop:** 2026-09-23

**Status:** Agreed product requirements; interaction details and technical design remain open

## Purpose and first participants

Encourage people to meet in person, learn from one another, and recognize each other's progress. Learning to communicate what you have done is itself part of learning. Conversations should start as early as an idea or question, before criteria, evidence, or work are complete.

The first experience is one learner and one invited peer, each using their own app. Initial groups organize themselves and bring their existing relationships; there are no users yet and the flow cannot depend on an established network. Help learners explain what help they want and choose a suitable person they already know or meet. In-app validator discovery, group membership, and group-wide requests are future possibilities, not initial requirements.

## What counts as validation

Witnessing an attempt, assessing it against criteria, and recognizing progress all count. Learners will have varying evidence and criteria; peers will have varying experience and knowledge. The app should help both sides improve the quality and clarity of recognition without imposing a universal authority hierarchy or score.

A validation is the peer's confirmed statement of what they recognize. It identifies the reviewed step or goal, the attempt, and relevant selected evidence or live observations. Optional prompts such as “What did you observe?” and “What helped you reach that judgment?” help explain its basis. Experience can provide context without becoming an eligibility threshold.

The learner owns their completion claim; the peer owns their statement. A peer can recognize partial progress, describe uncertainty, or explain what they would need to see next without overruling the learner. Technical credential verification and a peer's judgment are distinct.

## A learner-prepared review view

The learner prepares a scoped view for a particular conversation:

- A selected step or entire goal, showing what they want help with or validated.
- The relevant steps and criteria.
- A brief summary of where they are, their question or review focus, and sources they are drawing from.
- An evidence viewer containing only the evidence they select.
- Space for general notes and comments attached to particular pieces or parts of evidence, with replies from both people, like a code review.

Preparation must remain lightweight. An unfinished idea or question is enough to start coaching; polished evidence and finalized criteria are not prerequisites. Learner and peer can clarify criteria and identify useful evidence together.

**A whole-goal review shows the complete goal definition, all its steps, and all its criteria.** Supporting evidence remains learner-selected. Privacy can narrow the claim being reviewed, but must not hide part of that claim: someone who wants to disclose only a step requests recognition of that step. A peer judges whether the selected evidence is sufficient and makes any limits explicit.

A whole-goal review can produce recognition of individual steps, the whole goal, or both. Each statement has an explicit scope; step recognition never silently becomes whole-goal approval.

## Conversation, coaching, and both voices

In-person conversation is central. The app captures useful moments without requiring people to transcribe a meeting. Peers should ask questions, explain observations, and help the learner discover what to try, rather than simply provide answers.

Both participants can comment and reply on evidence, explain their reasoning, and return to a question with another attempt. General notes capture points about the work as a whole. A useful conversation need not end in validation.

Either person can record their own account. A summary entered on someone else's behalf becomes that person's attributed statement only after they confirm it. This applies to comments, summaries, and validation; an unconfirmed account must not appear as the other person's words or approval.

## Keepsakes and private reflection

Notes, realizations, questions, encouragement, and next steps can become important keepsakes along the learning path, even before anything is complete. Preserve their context: what was being explored and who contributed. A next step can remain an invitation rather than automatically becoming a task with a deadline.

Either person can offer a keepsake; the recipient chooses whether to keep it on their path. Learner reflections are private first. Offering a thank-you or recognition to a peer is a separate choice from permitting that peer to share it further, and does not grant access to the underlying goal or evidence.

Recognition is freely given, never owed. The app may gently offer an optional private reflection after an encounter. Skipping is easy, causes no reminders, and is not visible to the peer. Peers cannot request feedback through the app or see whether a learner wrote a private reflection. Lack of recognition must not imply someone was unhelpful.

## Learner control and access

The learner controls their data: what they disclose, to whom, and whether to add more context. Opening a review does not automatically authorize the peer to retain or reuse its evidence. A peer can recognize what they observed without needing a permanent copy of the underlying material.

Access duration remains deliberately unresolved. Test brief meetings, interrupted encounters, and returning together later before choosing session expiry or continuing access. No automatic expiry, permanent peer copy, or ongoing-access default has been agreed. Technology evaluation must distinguish temporary viewing from retained copies and honestly explain limits such as screenshots; it must not promise that externally captured copies can be recalled.

## Completion commitments and later attempts

A learner can choose a commitment such as “I want someone to witness this before I consider it finished.” This is revisable by the learner, not a fixed external gate. Changing it does not rewrite historical peer statements or imply approval of the change.

Comments and recognition stay attached to the attempt actually reviewed. Ongoing edits stay private until the learner chooses to share a new attempt. Earlier recognition remains meaningful history, but a changed claim does not silently inherit it. This is the required behavior; exact snapshots, version identifiers, and credential issuance timing remain design questions.

## Steps can become standalone badges

Validating a step and making it a standalone badge are separate learner-controlled actions. A bowline recognized during a shelter-building goal can become its own badge even if the shelter is never completed. This does not expand the step into a new goal or imply validation of the shelter.

Presenting an unchanged achievement as a standalone badge should preserve its existing recognition. Changing the actual claim requires a new review if recognition of that changed claim is wanted. The credential and presentation model must support these behaviors; its storage structure has not been selected.

## Standards boundary and technology experiments

OB3 remains a requirement for portable credentials and endorsements, with independent verification. A proprietary signed statement is not a substitute. Ordinary coaching notes and keepsakes need not each become credentials.

Earlier research proposed an OB3 EndorsementCredential targeting a particular achievement credential and distinct credential IDs per reviewed version. These remain candidate mappings to investigate against the requirements above, not a settled issuance, versioning, or storage architecture. See the [implementation-gap brief](../research/2026-09-20-minimal-peer-validation.md) and [linked-achievement research](../research/2026-09-20-ob3-linked-achievements.md).

A fully offline encounter is a **strong preference to investigate**, covering evidence viewing, both participants' contributions, and saved recognition. Feasibility and any connectivity boundaries must be established on devices before promising this experience. Existing local-first requirements remain in force; this uncertainty neither authorizes a network-dependent implementation nor amends an ADR.

Pear, file exchange, QR, nearby transfer, and hosted links are not selected. The [evidence-transfer spike](../research/peer-evidence-spike/README.md) is an experiment, not the product flow or a decision to give peers copies. Its synthetic transfers and pre-signed fixtures do not demonstrate real peer validation, privacy behavior, or a completed offline encounter.

## Open questions to test and design

- Access duration, interruption recovery, and what returning to a review feels like.
- How to prepare and preview a review with low effort, and deliberately add context during it.
- How comments address different evidence media, and how attribution confirmation works in person.
- Recognition editing or withdrawal, duplicate exchanges, and retention of each person's contributions.
- Offline feasibility, device connection, and behavior when connectivity is unavailable.
- Credential issuance timing, version and evidence binding, review-history portability, and standalone badge presentation.
- Identity and key changes, legacy credentials, and independent endorsement interoperability. Existing new-badge compliance is documented in [current compliance status](../architecture/ob3-compliance-status.md).
- Explicit alignment of revisable commitments with existing completion policies before implementation.

These questions do not reopen the agreed scope, privacy, attribution, or recognition requirements.

## Separate future conversations

A mentor path could recognize learning through helping others. Private mentor reflections belong there. Learner-offered accounts of helpful coaching could later contribute to mentor or subject-specific learning paths, but points, weighting, rewards, and skill-tree rules are not agreed. They must not create an expectation of positive feedback or reward easy approvals; helpful work can go unrecorded. This needs its own workshop.

Validator discovery through the app, group features, and badge-tree architecture are also future work. Initial participants can organize real-world groups without those features.

## Relationship to existing documents

This develops [product vision](./product-vision.md) and [design principles](./design-principles.md), expanding final-badge-only review into conversations throughout learning. This document is the product source of truth for the workshop; research supplies candidate solutions and evidence, not additional requirements.

The [current ADR positions](../decisions/index.md#current-positions) still govern implementation. This workshop does not change funded milestones, turn Phase B personal reflection into peer review, or select an implementation sequence. Any necessary policy amendment requires an explicit decision.
