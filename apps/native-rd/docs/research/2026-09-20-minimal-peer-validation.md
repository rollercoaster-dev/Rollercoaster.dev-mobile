# Peer Validation — Implementation Gaps and Open Design Questions

**Date:** 2026-09-20

**Status:** Research supporting the agreed vision; not an implementation specification

**Baseline:** `origin/main` at `110b50b`, checked while preparing the documentation PR

## Product source of truth

[Community Learning and Peer Validation](../vision/community-learning-and-peer-validation.md) records the agreed direction: recurring local learning groups, coaching and iteration, validation of steps and whole badges, and optional standalone recognition for a step.

This brief consolidates the initial exploration. File export/import, fixed media limits, and a final-badge-only flow were tentative suggestions, not accepted requirements. Transport, review screens, and exact protocol choices remain open.

## Corrected implementation baseline

The original exploration inspected an older checkout at `cc85496`. It found non-standard Ed25519/raw-JSON proofs there. That is no longer the baseline for new badges on current main.

- The app now signs new badges using **ES256 VC-JWT** and P-256 device keys. See `src/badges/vcJwt.ts`, `src/crypto/SecureStoreKeyProvider.ts`, and `src/hooks/useCreateBadge.ts`.
- The [OB3 compliance record](../architecture/ob3-compliance-status.md) documents a physical-device badge accepted by the official validator on 2026-09-03, with 14/14 probes passing. This PR relies on that recorded evidence; it did not rerun an external validation.
- Existing legacy badges retain their original credentials. The [proof-format research](./ob3-proof-format-spike.md) explains why the project chose VC-JWT rather than the previously planned RDFC signing route.
- Badge building, evidence capture, secure key storage, PNG baking, and credential export are reusable foundations. Their existence does not establish a complete peer-validation flow.

## Remaining work to design

| Area                  | Gap or question                                                                                                                                                                                    |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| In-person interaction | How do two people connect their apps, select what is being reviewed, pause, and return recognition? No transport has been chosen.                                                                  |
| Step recognition      | Separate the underlying credential from its display under a step or in the badge collection. Determine issuance timing when a learner requires validation.                                         |
| Versions              | Snapshot the reviewed claim and evidence; retain earlier reviews; ensure a revised claim never silently inherits approval.                                                                         |
| Endorsements          | Issue and validate OB3 EndorsementCredentials for specific learner-credential versions. Reuse the current standards work without assuming badge issuance also proves endorsement interoperability. |
| Credential validation | Integrate the applicable OB3 checks into receiving/review flows, with explicit invalid, unsupported, and incomplete results. Distinguish technical verification from human recognition.            |
| Evidence              | Decide what is shown in person versus transferred, snapshot the selected material, and explain exactly what the peer reviewed. A live observation need not imply file transfer.                    |
| Reviewer identity     | Bind the signing identity to the person participating in the encounter without requiring an institutional account. Validator badges may add context later; no weighting algorithm is selected.     |
| Learning history      | Record coaching, learner responses, and review rounds without making every conversation a credential or imposing a prescribed solution.                                                            |
| Privacy and lifecycle | Decide disclosure, retention, duplicate handling, key loss, and unsupported/legacy credential behavior. Do not imply signatures encrypt data or make exported copies recallable.                   |

## Standards and policy boundaries

Use actual OB3 credentials and endorsements, not an application-specific signature format as a substitute. See [OB3 verification](https://www.imsglobal.org/spec/ob/v3p0/#verification). Independent acceptance must be demonstrated for endorsements and the eventual exchange, not inferred from two copies of our app agreeing.

Required peer validation is a learner-selected commitment in the new community vision. Its exact effect on completion and its relationship to the existing Phase B rules need an explicit design decision. The governing [ADR-0013](../decisions/ADR-0013-phase-b-consolidated-position.md) says: “No auto-judgment — forbidden, always.” This research does not amend an accepted ADR or turn a structural dependency into a completion gate.

The vision also does not change the funded scope recorded in [ADR-0015](../decisions/ADR-0015-funded-scope-prototype-fund.md). Local meetings describe the social setting; they do not select a P2P implementation or commit it to a funding milestone.

## Next investigations

1. Workshop the app-to-app encounter and review flow, then compare transfer options against that experience.
2. Design the step/credential/version model, including required-validation timing and reuse when a step becomes a standalone badge.
3. Define endorsement scope, reviewer recognition, and how evidence-reviewed versus personally-witnessed bases are recorded.
4. Test standards interoperability and device exchange with the chosen design; include revised claims, duplicate responses, interrupted reviews, and unavailable network checks.
5. Map learning relationships to the future tree, using [linked-achievement research](./2026-09-20-ob3-linked-achievements.md) and the existing [sub-badge research](./openbadges-sub-badges.md).

These are follow-up investigations, not an implementation plan or additional product commitments. No application code or device behavior was changed or tested in this documentation work.
