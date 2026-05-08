# Personal Data and Badge Verification

**Date:** 2026-05-01
**Status:** Draft — guides Iteration D design
**Owner:** Joe

---

## Summary

`native-rd` does not require personal information to create a badge. That is intentional and should remain the default.

Current badges identify the badge subject by a locally generated DID. They do not assert a real-world legal identity unless the user later chooses to add identity data. This keeps Iteration A private and local-first, while still allowing later verification to prove that a DID signed, held, and was endorsed for a specific achievement.

The product rule is:

> Verification can prove achievement claims without requiring identity disclosure. Identity disclosure is optional, scoped, and reviewed before it is written into a signed badge or shared package.

---

## Current Behavior

Iteration A creates self-signed OB3 credentials when a goal is completed:

- The app generates an Ed25519 keypair locally.
- The public key is represented as a DID.
- The private key stays in Expo SecureStore.
- The badge issuer is the app/user DID.
- The badge recipient is the same DID.
- Goal, achievement, evidence summaries, timestamps, and proof data are embedded in the credential.
- No name, email address, account profile, or demographic field is required.

This means a badge can be verified cryptographically without knowing the user's real-world identity.

---

## What Verification Means Without Personal Data

A DID-only badge can support these claims:

- This credential has not been modified since it was signed.
- This credential was signed by the private key corresponding to the subject DID.
- This credential describes a specific achievement and evidence summary.
- A peer or mentor DID later endorsed the badge.
- The same DID can present multiple badges as belonging to the same holder, if the user reuses that DID.

A DID-only badge cannot prove these claims by itself:

- The holder's legal name.
- The holder's email address.
- That two different DIDs belong to the same person.
- That an external institution has verified the holder's real-world identity.

That boundary should be explicit in UI copy and verification results. The app should not imply that a peer verification is identity verification unless identity data was actually reviewed and signed.

---

## Privacy Risk

Open Badges and Verifiable Credentials are designed to be portable. Once a badge is exported, baked into an image, or shared with another person, the app cannot guarantee that every copy will be deleted or redacted.

Personal data in a credential creates several risks:

- It can be read by anyone who receives the badge.
- It can be reshared outside the original context.
- Long-lived identifiers like email, name, and stable DIDs can correlate a user across badges and audiences.
- Even non-obvious combinations, such as dates, locations, evidence descriptions, or organization names, can identify someone.

W3C Verifiable Credentials guidance warns that `credentialSubject` data can expose personally identifying information and that long-lived identifiers increase correlation risk. The 1EdTech Open Badges implementation guide also warns that adding unhashed personal identifiers, such as name or email, reduces subject anonymity.

References:

- [W3C Verifiable Credentials Data Model v2.0 — Privacy Considerations](https://www.w3.org/TR/vc-data-model-2.0/#privacy-considerations)
- [1EdTech Open Badges 3.0 Implementation Guide — Including additional recipient profile information](https://www.imsglobal.org/spec/ob/v3p0/impl/#including-additional-recipient-profile-information)

---

## Recommended Data Model Direction

Keep personal identity data separate from badges until the user chooses to disclose it.

### Local Identity Profile

A future `IdentityProfile` should be local-first and optional.

| Field          | Purpose                                            |
| -------------- | -------------------------------------------------- |
| id             | Local ULID                                         |
| display_name   | User-chosen public label                           |
| full_name      | Optional real-world name                           |
| email          | Optional email address                             |
| website        | Optional personal/professional URL                 |
| avatar_uri     | Optional local image URI                           |
| default_policy | Default disclosure policy for new badges or shares |
| created_at     | Local timestamp                                    |
| updated_at     | Local timestamp                                    |

This profile is app data, not automatically badge data. Editing or deleting it should affect future badge creation and future shares, not silently rewrite existing signed credentials.

### Badge Disclosure Snapshot

When identity data is included in a badge or verification share, store a snapshot of exactly what was disclosed.

| Field              | Purpose                                        |
| ------------------ | ---------------------------------------------- |
| id                 | Local ULID                                     |
| badge_id           | Badge being shared, reissued, or verified      |
| profile_id         | Source profile, if any                         |
| disclosed_fields   | JSON list of identity fields included          |
| disclosure_context | `export`, `peer_verification`, `mentor_review` |
| created_at         | Local timestamp                                |

Snapshots make it possible to answer: "What personal data did I put in this badge or share with this verifier?"

---

## Safe Disclosure Modes

The app should offer identity disclosure as a scoped choice, not a global switch.

| Mode          | Badge contents                              | Use case                                             |
| ------------- | ------------------------------------------- | ---------------------------------------------------- |
| Private       | DID only                                    | Personal tracking, low-stakes sharing                |
| Display Name  | DID + user-chosen display name              | Community sharing where legal identity is not needed |
| Contactable   | DID + email or website                      | Portfolio sharing where follow-up matters            |
| Real-World ID | DID + full name and optional contact fields | Mentor, employer, school, or formal review           |
| Custom        | User-selected fields                        | Any context needing a precise disclosure set         |

The default should be `Private`.

---

## Required UX Controls

Before personal data is written into a signed credential or exported package, the user should see a review screen that lists:

- Identity fields included.
- Evidence fields included.
- Whether local evidence files are included or only evidence summaries.
- Verifier/recipient, if known.
- Whether the badge will be signed as a new credential.
- A clear warning that exported or shared copies cannot be recalled by the app.

Users should be able to:

- Save identity data locally without adding it to badges.
- Choose disclosure mode per badge and per share.
- Reissue a local badge with less personal data.
- Export a private copy and an identified copy separately.
- Delete local identity data.
- See which badges or share records contain identity snapshots.

The app should avoid dark patterns around identity. No badge creation flow should block on name, email, or profile completion.

---

## Verification UX Language

Verification results should distinguish achievement trust from identity trust.

Recommended labels:

- **Signature verified** — the credential has not changed since signing.
- **Self-signed** — the achievement was asserted by the holder's DID.
- **Peer verified** — another DID endorsed the achievement or evidence.
- **Mentor verified** — a verifier DID endorsed the achievement with mentor authority.
- **Identity included** — the credential contains personal identity fields.
- **Identity not verified** — the credential does not prove a legal identity.

Avoid labels like "verified user" or "verified person" unless a specific identity verification workflow exists and is represented in the signed data.

---

## Iteration D Implications

Peer verification should initially verify the badge and evidence, not the person.

Recommended Iteration D flow:

1. Holder chooses a badge.
2. Holder chooses evidence and identity disclosure level.
3. Holder sends a verification request device-to-device.
4. Verifier reviews the badge, evidence, and disclosed identity fields.
5. Verifier signs an endorsement that records what was reviewed.
6. The endorsement is embedded in the badge or stored as a portable companion credential.

This preserves the Iteration A privacy model while allowing stronger trust when users choose it.

Spec-compliant verification also requires replacing the current Iteration A `eddsa-raw-json-iteration-a` proof with the planned `eddsa-rdfc-2022` flow before external verifiers should be expected to accept native-rd credentials.
