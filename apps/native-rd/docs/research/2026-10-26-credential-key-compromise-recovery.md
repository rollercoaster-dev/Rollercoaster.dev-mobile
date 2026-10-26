# Credential Key Compromise and Recovery — Spaces, Reviewers, Learners

**Date:** 2026-10-26
**Status:** Research, not a decision. Nothing here is scoped or agreed.
**Owner:** Joe

**Scope reference:** [Bike-mechanic OB3 pilot](./2026-10-26-bike-mechanic-ob3-pilot.md) · [Minimal peer validation](./2026-09-20-minimal-peer-validation.md) · [OB3 compliance status](../architecture/ob3-compliance-status.md) · [ADR-0012 no-auto-judgment](../decisions/ADR-0012-no-auto-judgment.md) · [Community Learning and Peer Validation](../vision/community-learning-and-peer-validation.md)

**Baseline:** `main` at `aad2e486`. **Question:** when a space admin's or a reviewer's phone is lost or stolen, how do legitimate past endorsements stay valid, the thief's stop counting, and no learner ever has to act? All web sources fetched 2026-10-26. The 1EdTech validator was read at commit `6bf38234` (2026-09-23).

**Glossary:** acronyms and evidence labels are defined in [glossary-community-credentialing.md](./glossary-community-credentialing.md). In short: [verified] read in the primary source, [verified in code] read in this repo or the validator source, [secondary] vendor or community write-ups, [unverified] not confirmed, [inference] my reasoning. "X" throughout means the time from which a key is treated as compromised.

---

## TL;DR

- **"Signed before the theft" only works with trusted time.** W3C's Controlled Identifiers spec: without a reliable clock, a thief can backdate signatures, so revocation has to be total. Code signing and Blockcerts solve this with timestamps from a third party.
- **Today's device keys can be copied silently** via iOS backup ([#765](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/765)). A silent copy has no theft date, so "compromised from X" cannot work until reviewer and admin keys are hardware-backed and non-extractable.
- **The 1EdTech validator checks none of this.** It verifies against the key inlined in the JWT header and never reads key status or history. A thief's endorsement and a genuine one pass identically.
- **Recommendation: do three cheap things before any pilot, defer the rest.** Non-extractable keys, never delete a key from `did.json`, and re-vouch with `validUntil = X` on theft. Timestamps, logs and verifiable key history (§7) wait until a verifier exists that would read them.

**Scope note [inference]:** the full design in §7 is production infrastructure, not pilot scope. The [pilot doc](./2026-10-26-bike-mechanic-ob3-pilot.md) assumes a static catalog with nothing hosted on day one; §8 below is written to be compatible with that.

**Not worth doing beyond §8 step 1 if:** no verifier other than our own page will ever check the endorsement chain (open question 5). Then a stolen key costs one re-vouching and nothing else.

---

## 1. Why "signed before compromise" is hard (spec text)

- **CID 1.0 (W3C Recommendation, 15 May 2025), §5.5.1 Revocation Semantics.** [verified] A revocation is not retroactive when a historical key state is "combined with a reliable way to determine the time or identifier version that existed when a cryptographically verifiable statement was made". It continues: "Without that guarantee, someone could discover a revoked key and use it to make cryptographically verifiable statements with a simulated date in the past." If the time cannot be reliably determined, "the only safe course is to disallow any consideration of state with respect to time, except the present moment."
- **CID 1.0 §2.2 defines `revoked` (and `expires`) on a verification method.** [verified] A `dateTimeStamp` "specifying when the verification method MUST NOT be used … systems depending on the value are expected to not verify any proofs associated with the verification method at or after the time of revocation." This is a standard field for "compromised from X" on a key that **stays listed**.
- **CID §5.4:** "Proofs or signatures that rely on verification methods that are not present in the latest version … verification software might require additional information … access to a verifiable data registry containing a historical record." [verified] Deleting a key from `did.json` strands its signatures.
- **VC Data Model 2.0 (W3C Rec, 15 May 2025):** `validFrom`/`validUntil` "represent the validity of the data that is being secured", and JWT `iat`/`exp` "represent the issuance and expiration time of the signature" ([VC-JOSE-COSE](https://www.w3.org/TR/vc-jose-cose/)). [verified] Both are values the signer sets, so a thief sets them too. In OB3, `nbf` MUST equal `validFrom` (OB3 §8.2.6.1). [verified]
- **`did:key` cannot rotate or be revoked.** The `did:key` v0.9 draft says there is "no mechanism to rotate cryptographic keys in response to potential compromise". It names only "a higher-level mechanism such as revoking an associated verifiable credential" as the way to distrust one. [verified] For us that mechanism is the space's vouching credential.
- **`did:web` defines no history and no authentication for writes.** The spec: "This DID method does not specify any authentication or authorization mechanism for writing to" the document. There is no `versionId`/`versionTime`; git is suggested for audit history. [verified]

## 2. DID methods with key history

For each method: what history it keeps, how it handles compromise, whether it can prove "signed before compromise", and what the 1EdTech validator does with it today.

### `did:web`

- History: none. [verified]
- Compromise: edit `did.json`; whoever controls hosting controls the DID. [verified]
- Signed-before-compromise: only with CID `revoked` dates plus external trusted time. [inference]
- Validator: native resolver, current document only, and only when the JWT uses `kid`. [verified in code]

### [`did:webvh` v1.0](https://identity.foundation/didwebvh/v1.0/)

- History: a hash-chained `did.jsonl` log. Resolvers collect "all the DIDDoc versions and public keys used by the DID currently, and in the past"; `?versionTime=` and `?versionId=` resolve old versions. [verified]
- Compromise: signed log entries (`updateKeys`). Optional pre-rotation (`nextKeyHashes`): "if the currently authorized keys are compromised … the attacker should not be able to take control". Optional witnesses (a threshold of `did:key` approvals) and watchers. [verified]
- Signed-before-compromise: gives key history, but `versionTime` is "as asserted by the DID Controller", so a signature still needs external time to pick the right version. [verified plus inference]
- Validator: not native. Falls through to the Universal Resolver at `dev.uniresolver.io`, a DIF instance "for testing purposes"; a `did-webvh` driver is listed. [verified]

### [KERI](https://trustoverip.org/wp-content/uploads/KERI-V1.1-2026-01-21.pdf) (ToIP v1.1, 2026-01-21)

- History: an append-only Key Event Log. [verified]
- Compromise: pre-rotation, where control "can be re-established by rotating to a one-time use set of unexposed but pre-committed rotation keypairs"; witnesses with thresholds; "first seen" watchers against dead attacks. [verified]
- Signed-before-compromise: **yes, natively.** Issued data is anchored as a digest "seal" in the log, which "binds that data to the key state at that event". [verified] This is the model that "timestamp each endorsement" approximates.
- Validator: only via the Universal Resolver (`did:keri`, `did:webs` drivers listed). [verified] Uses CESR/ACDC, not OB3 VC-JWT. [inference]

### [`did:plc`](https://web.plc.directory/spec/v0.1/did-plc)

- History: a full operation log, "permanently publicly accessible". [verified]
- Compromise: 1–5 priority-ordered `rotationKeys`. A higher-priority key can override an operation within "a 72hr window". "Some trust is required in the PLC server", which Bluesky PBC runs. [verified]
- Signed-before-compromise: covers DID operations only. Signatures made by signing keys still need their own time. [inference]
- Validator: only via the Universal Resolver; the driver is listed as "dev". [verified]

### What the 1EdTech validator actually does

[verified in code: `SimpleDidResolver.java`, `ExternalProofProbe.java`, `validators.json`]

- When a JWT header carries `jwk`, the validator verifies with that key. It does not check that the key belongs to the `issuer`. This matches OB3 §8.2.6 ("If the header includes a `jwk` property, convert the `jwk` value into the public key JWK"). native-rd puts `jwk` inline (`vcJwt.ts:149`). **A thief's endorsement and a genuine one pass the validator identically.** Removing a key from `did.json` also changes nothing there.
- With `kid`, it resolves `did:key`, `did:jwk` and `did:web` itself. It fetches only the current `did.json`, ignores CID `revoked`/`expires`, and never passes `versionTime`. Every other method goes to `dev.uniresolver.io`.
- Status checking (`RevocationListProbe`) reads `credentialStatus` only for `1EdTechRevocationList` and for `BitstringStatusListEntry` with `statusPurpose: "revocation"`. A failed fetch is a **warning**, not an error. It checks the credential's own status, never its signer's key.
- The hosted vc.1ed.tech may run a different build from the repo head. [unverified]

## 3. Trusted time

For each option: what it proves, how fast and how precise, who has to be trusted, and how it fits offline use.

### RFC 3161 timestamp authority (TSA)

- Proves "a datum existed at a particular point in time". RFC 3161 names the use case: proving "that a digital signature was applied to a message before the corresponding certificate was revoked". The TSA sees "only … a hash". [verified]
- Latency: one HTTP round trip; precise to seconds. [inference]
- Trust: the TSA is a "Trusted Third Party" and could backdate. Its key compromise invalidates its tokens (§4). Sigstore notes "Anyone can operate a TSA" and lists FreeTSA, DigiCert and `timestamp.sigstore.dev`. [verified]
- Offline: needs network at stamping time. The token (signed CMS) then verifies offline with the TSA's certificate chain. [inference]

### OpenTimestamps

- Proves "a timestamp proves that a message existed prior to some point in time". [verified]
- Latency: the calendar returns a _pending_ proof at once; it is upgraded after "a few hours" when Bitcoin confirms. Bitcoin block times are only loosely ordered: each must exceed the median of the last 11 blocks and nodes accept up to "two hours in the future". [verified]
- Trust: calendars "can deny service, not produce false proofs". Full verification needs Bitcoin block headers: a local node, or a block explorer ("not as secure") in the JS library. [verified]
- Offline: submit when online. Upgrading is silent background work. A pending proof is **not** time evidence until anchored. [inference]

### Transparency log (Sigstore Rekor, Certificate Transparency)

- Proves inclusion in an append-only public log.
- Latency: in CT, an SCT is "the log's promise" to include the entry within the Maximum Merge Delay. [verified, RFC 9162]
- Trust: Rekor v1's `integratedTime` "comes from Rekor's internal clock, which is not externally verifiable". Rekor v2 clients "get a signed timestamp from a timestamp authority separate from Rekor". The log adds enumeration, not better time. [verified]
- Offline: network needed. Public logs expose entry metadata (key, volume). [inference]

### Precedents

- **Code signing** ([CA/B Forum CSBR v3.11.0](https://github.com/cabforum/code-signing/blob/main/docs/CSBR.md)): on key compromise the CA "SHALL set a historic date as revocationDate if deemed appropriate", and "software should continue to treat objects containing a timestamp dated before the revocation date as valid". Relies on RFC 3161 TSAs. [verified]
- **Blockcerts** ([cert-verifier-js verification docs](https://cdn.jsdelivr.net/npm/@blockcerts/cert-verifier-js@6.35.2/docs/verification-process.md)): checks that "the key had not expired or been revoked when the transaction occurred", using the blockchain transaction's timestamp, not the certificate's. The issuer profile lists keys with `created`/`revoked` dates. [verified]

### What and who to timestamp

- **What.** Sigstore recommends "signing over a signature, a process called 'countersigning'" [verified]. For us that means hashing the **whole compact JWS**, signature included. Hashing only the payload would also "timestamp" a thief's later re-signing of the same payload. [inference]
- **Reviewer's app:** at signing time if online, otherwise queued. If online during the encounter, it hands the RFC 3161 token (and the pending OpenTimestamps proof) to the learner with the endorsement. A proof obtained later has no channel to the learner, and is lost with the phone if the phone is stolen. [inference]
- **Learner's app:** submits the same hash on receipt, or as soon as it is next online, then silently upgrades the OpenTimestamps proof. No prompt, no UI, nothing shown while pending (ADR-0012: bookkeeping, not verdict). [inference]
- **Both, always.** The earliest valid proof wins. The space's own device can add a third stamp when present.
- **The gap that remains:** if both phones stay offline from the encounter until after the theft, no proof predates X. The same happens if the theft comes within OpenTimestamps' hours-scale window and no RFC 3161 token exists. Section 6 handles this without involving the learner.

## 4. Revocation in OB3 / VC

- OB3 §9.1/§9.2 verification: "A Credential is revoked if the `credentialStatus` property is present, and the type … is `BitstringStatusListEntry`, and if the Credential has been revoked as shown in Bitstring Status List v1.0". Then: "If the current date and time is after the `validUntil`, the … Credential is expired." [verified] OB3 has no concept of key status, key history or signing time. Key management is "outside the scope of this specification" (§8.4). [verified]
- **Bitstring Status List v1.0** (W3C Rec, 15 May 2025) [verified]: purposes are `revocation` ("not reversible"), `suspension` ("reversible"), `refresh` and `message`. The list must be at least 16KB uncompressed, 131,072 entries, for group privacy. `statusListCredential` "MUST be a URL to a verifiable credential". Issuers "SHOULD" publish it so it can be cached without tracking. Holders may staple it.
- **Implications** [inference]:
  - A status list says _whether_ a credential is revoked **now**. It cannot say "valid until X". "Compromised from X" therefore has to live in `validUntil` on a re-issued vouching, or in a CID `revoked` date on a key, not in the status bit.
  - The list is a VC signed by the space key. **Revoking anything needs a working admin key.** A one-admin space whose phone is stolen cannot revoke until it recovers.
  - Hosting is static files; Rollercoaster.dev can serve them without holding keys.
  - The validator ignores `suspension` (§2), so do not rely on it.

## 5. Recovery without stealable secrets

- **Passkeys cannot sign a VC-JWT.** A WebAuthn assertion is "a valid signature over the binary concatenation of authData and hash" of `clientDataJSON` (WebAuthn L3, W3C Rec 25 Aug 2026, §7.2) [verified]. An ES256 JWS verifier checks a signature over `header.payload`, so a passkey signature will never verify as a standard VC-JWT, nor as a `did:webvh` Data Integrity proof. [inference] Passkeys are also scoped to "origins belonging to that Relying Party" [verified]. Their use here is **authenticating to Rollercoaster.dev**. A "multi-device credential" (backup-eligible) survives phone loss through the platform account [verified definition].
- **The WebAuthn PRF extension** can derive a 32-byte secret per passkey. The spec's own example is "PRF outputs could be used as symmetric keys to encrypt user data" [verified]. That allows a recovery key to be stored at Rollercoaster.dev **only as ciphertext**: the server cannot use it, and a new phone with the synced passkey can decrypt it. Platform PRF support on iOS/Android passkey providers is [unverified].
- **Bluesky / atproto:** "By default, your PDS holds the only rotation key for your identity". Users may add their own higher-priority rotation key ("such as on paper"). Recovery without one relies on the operator within the "72-hour recovery window" [verified]. The provider-held-key default is what we rule out. The **delay window** is the part worth copying.
- **EUDI wallet (ARF, Annex 2, Topic 34):** a Migration Object is stored off-device. On a new device, "for each PID and device-bound attestation … the Wallet Unit SHALL … request the respective PID Provider or Attestation Provider to issue a new PID or attestation" (Mig_04, Mig_07) [verified]. Device-bound keys are re-issued, never restored.
- **Apple Wallet IDs:** on loss, "Use the Find My app to erase your device" and "Contact your issuing authority" [verified]. Also re-issuance.
- **Multi-admin / social recovery:** thresholds exist in `did:webvh` witnesses, KERI multi-sig, and PLC's 1–5 rotation keys [verified]. For `did:web` they are policy enforced by the host, not cryptography [inference]. The host accepts a `did.json` change only when signed by M of N admin keys, or through the delayed account path.
- **Secure Enclave:** "Works only with NIST P-256 elliptic curve keys". It "Can't encode preexisting keys … Not having a mechanism to transfer plain-text key data into or out of the Secure Enclave is fundamental to its security" ([Apple developer docs](https://developer.apple.com/documentation/security/protecting-keys-with-the-secure-enclave)) [verified]. P-256 is what ES256 already uses.
- **Current code** [verified in code]: `SecureStoreKeyProvider.generateKeyPair` creates an **extractable** WebCrypto key and stores the private JWK in SecureStore with no `keychainAccessible` option. Expo's default is `WHEN_UNLOCKED`. Expo describes `WHEN_UNLOCKED_THIS_DEVICE_ONLY` as "not migrated to a new device when restoring from a backup" [verified], which means the default _is_ migrated. So today's keys travel in iOS encrypted backups, a silent-copy path with no datable compromise moment. [inference] Tracked as [#765](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/765).

## 6. Threat model

**Actors:**

- **Learner:** self-issues with own `did:key`, holds badge and endorsements, often offline, never acts on others' compromises.
- **Reviewer:** endorses with own `did:key`.
- **Space admin(s):** sign vouchings, catalog endorsements and status lists, and manage `did.json`.
- **Rollercoaster.dev:** hosts `did.json`, status lists and the space account. Holds no private keys.
- **Verifier:** an employer or school, using the 1EdTech validator or our verifier page.

**Attackers:** a phone thief; a colluding learner who wants a fake endorsement; malware or backup extraction; someone who takes over a space account (email plus phished passkey); a hosting breach; a malicious or coerced admin.

**Likelihood for a 5–15 learner hub pilot [inference]:** phone loss and silent backup copies are likely. A colluding learner, a coerced admin and a hosting breach are unlikely at pilot scale and are listed for completeness.

### Compromise cases

- **Reviewer phone stolen, unlocked or passcode known.** Enables: endorse any credential id with any `validFrom`; a colluding learner supplies the target. Detection: minutes to days. X is well defined, the last time the reviewer had the phone. Control: re-issue vouching with `validUntil = X`, revoke the old one. Endorsements without a proof dated before X are not covered. Per-signature user presence (Secure Enclave access control) makes an unlocked-phone theft insufficient.
- **Reviewer key silently copied** (backup, malware). Enables the same, but the owner keeps signing too. Detection: unbounded. X cannot be dated, so "from X" fails. Control: prevent it with a non-extractable hardware key and `THIS_DEVICE_ONLY`.
- **Admin phone stolen.** Enables: vouch for new "reviewers" (the thief's own keys), endorse catalog changes, sign status lists. If admin keys can also edit `did.json`, add own keys and remove the legitimate ones: takeover. Detection as above. Control: CID `revoked: X` on the key. Vouchings proven after X are not covered. Key changes need M-of-N admins or the delayed account path.
- **Space account takeover** (email, phished passkey). Enables: rebind keys (takeover), or **set X far in the past and nullify every learner's endorsement**. Detection: until an admin sees the notice. Control: a delay (e.g. 72 h, PLC-style), notice to every admin key and email, any current admin key can cancel, a public change log. Limit how far back X can go.
- **Malicious or coerced admin.** The same retroactive-X weapon. Control: the same limit on X. Beyond it, require a second admin.
- **Hosting breach at Rollercoaster.dev.** Enables: rewrite `did.json` or status lists. Under `did:web` this is undetectable [verified: no write auth or history]. Detection: until someone compares. Control: publish an OpenTimestamps-anchored, append-only change log of every `did.json` version (cheap). Later, `did:webvh` with witnesses makes it cryptographically detectable.
- **TSA misbehaves.** Enables a backdated token for a thief. Control: use two independent sources (two TSAs, or TSA plus OpenTimestamps); for a proof close to X, require both to predate X. [inference]
- **Learner phone lost.** Nothing for others. The learner's own badges still verify; the key is gone for new ones. Out of scope here; existing open item.

**Hard-rule check** [inference]:

- A learner endorsed before X carries a proof dated before X, gathered automatically by either app. Nothing about them changes.
- The colluding learner's endorsement stops counting.
- The only learners affected are those whose proofs all post-date X (the gap). They are not told anything. Their endorsement still shows as a fact, "Endorsed by Alex, 3 Oct". The space can restore the chain line with a confirmation list, without contacting them.

## 7. Candidate designs

### Design A: countersign and revoked-from

- **Space:** `did:web` hosted at `<space>.rollercoaster.dev`. `did.json` is append-only in practice: keys are never deleted, compromised ones get CID `revoked`, retired ones `expires`. Spaces sign with `kid`, so verifiers that fetch `did.json` can see key status (the 1EdTech validator still ignores it, §2). Admin signing keys are hardware-backed. Updates: M-of-N admin signatures take effect immediately; the passkey-plus-email account path takes effect after a delay, with notice and the right to cancel. Every `did.json` version is logged and anchored with OpenTimestamps.
- **Reviewer:** hardware-backed `did:key` with user presence. Vouching is a space `EndorsementCredential` on the reviewer's Profile, with `credentialStatus` in the space's status list.
- **Endorsement:** both apps countersign the JWS hash (RFC 3161 plus OpenTimestamps). Proofs ride in the bundle.
- **Compromise:** the space re-issues the vouching with `validUntil = X` and revokes the open-ended one (or sets `revoked` on its own key). X is at least now minus _N_ days unless two admins sign.
- **Gap:** the space signs a "confirmed endorsements" credential listing JWS hashes the reviewer recognises, from the reviewer's memory, attendance or session notes.
- **Verifier rule:** an endorsement is covered by the space if the proof time falls inside the vouching's validity window, and the vouching itself has a proof dated before any `revoked` date on the space key that signed it. Otherwise it is covered by a confirmation list, or shown without the space line.

Trade-offs: moderate complexity (endorsement building plus two timestamp clients, a bundle format, a verifier page, and a host-side `did.json` update API with signature checks and a delay queue). Good offline fit: signing never needs the network, stamping is opportunistic. Rollercoaster.dev dependency: hosting plus a trusted recovery path, stated openly; no keys. Verifier support: the 1EdTech validator checks signatures, schema and status only; chain and time rules live in our verifier page.

### Design B: A plus a hash-only space log

Either app appends the endorsement JWS hash, plus the signer's public key, to a per-space append-only log hosted by Rollercoaster.dev. This is a self-hosted transparency log, not public Rekor, because Rekor would publish reviewer keys and volumes. Log checkpoints are anchored hourly with OpenTimestamps.

- Adds: second-level ordering; **enumeration**, so after a theft the admin sees exactly what the key signed before and after X and confirmations are informed; a place to find proofs the reviewer obtained after the learner left.
- Costs: a running service that Rollercoaster.dev can censor or delay (though not backdate past an anchor); per-reviewer activity metadata; more server code. It does not remove the need for trusted time, since log time is the operator's clock (the Rekor v1 lesson, §3).

### Design C: verifiable-history identities (`did:webvh`, KERI-style)

- The space uses `did:webvh` with a parallel `did:web`, which the spec explicitly supports, though "A resolver settling for just the `did:web` version … does not get the verifiability". Pre-rotation commits to a recovery key, and witnesses could be partner spaces. Reviewers could get `did:webvh` identifiers under the space and keep one identity across phones.
- Adds: cryptographic key history and takeover resistance. A hosting breach becomes detectable.
- Costs: the 1EdTech validator resolves it only through a test resolver, and only the current version. Pre-rotation keys need somewhere to live: a deputy's phone, a PRF-wrapped blob, or a key held by Rollercoaster.dev, and the last is forbidden. Endorsements still need external time, because `versionTime` is controller-asserted. It is the heaviest option, and no verifier we need uses it today.

### Comparison

| Criterion                    | A                         | B                              | C                                          |
| ---------------------------- | ------------------------- | ------------------------------ | ------------------------------------------ |
| Build effort                 | Moderate                  | A plus a log service           | High                                       |
| Offline fit                  | Good                      | Good (log is opportunistic)    | Good for signing; key updates need network |
| Rollercoaster.dev dependency | Hosting plus recovery     | Plus log availability, honesty | Hosting; witnesses reduce trust            |
| Thief's output enumerable    | No                        | Yes, if submitted              | Only with KERI-style anchoring (same as B) |
| Gap handling                 | Confirmation list (blind) | Confirmation list (informed)   | Same as A or B                             |
| 1EdTech validator            | Signature and status only | Same                           | Same, via test resolver                    |
| Hosting breach detectable    | Via anchored change log   | Same                           | Yes, cryptographically                     |

## 8. Recommendation

Design A is the target, but staged. [inference throughout]

### Before any pilot

1. **Hardware-backed, non-extractable keys for reviewers and admins**, with per-signature user presence, and `THIS_DEVICE_ONLY` storage. Without this, "compromised from X" has no datable X. This needs a native module; nothing in the repo does it yet. Learner keys can follow later. Closes [#765](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/765).
2. **Never delete keys from `did.json`.** Use CID `revoked`/`expires`. Keep every version in git. This makes a later move to `did:webvh` (parallel `did:web`) a format change, not a migration. Works with a static-file catalog; no update API needed while one admin edits by hand.
3. **"Compromised from X" means a re-issued vouching with `validUntil = X`** plus a status-list revocation of the open-ended one. Space keys get CID `revoked: X`. A one-admin pilot space accepts that it cannot revoke while its only phone is missing.

### When a verifier exists that reads the chain

4. **Countersign every endorsement and vouching JWS** with RFC 3161 (one or two public TSAs) and OpenTimestamps, from the signer's app and the receiver's app. Store every proof in the bundle, upgrade silently, and never surface "pending".
5. **Anchor every `did.json` version with OpenTimestamps**, and add the authenticated update API with M-of-N admin signatures and a delay queue for the account path.
6. **Limit retroactive X.** X is at least report time minus _N_ days for one admin or the account path. Older X needs two admins or a partner space. Every change through the account path is delayed, announced and logged.
7. **Space account (passkey plus email) as recovery authority, stated openly.** Rollercoaster.dev holds no keys but can re-bind after the delay. Optionally store a PRF-wrapped recovery key as ciphertext, pending a check of platform support.
8. **Space confirmation list** for the gap. The learner is never involved.

### Measure in the pilot

9. How many endorsements would have reached a proof before X under realistic hub Wi-Fi. If the gap is common, add Design B's log. If no verifier ever checks the chain, stop at step 3.

## 9. What this implies for the credentialing design

- **Space identity and keys.** Retired keys stay listed with CID `revoked`/`expires` dates, and `did.json` history is kept (git now, anchored log later). Any update API checks M-of-N admin JWS signatures; the account path gets a delay queue, notices and cancel-by-any-admin. Decisions still open: N (how far back X may go), the delay length, and who is the second admin for a one-person space (deputy, partner space, or Rollercoaster.dev after the delay). The status list is signed by the space and hosted statically. Admin keys are hardware-backed. "Private key on the admin's phone" holds. "No server holds secrets" holds; "no server holds authority" does not, under `did:web`. That is a product-vision question and should be raised at ADR level, not settled here.
- **Reviewer vouching.** Vouching credentials carry `credentialStatus` and, later, are countersigned. Binding a key to a person in person stays the trust anchor.
- **Endorsement signing and transfer.** Signing uses a hardware key with user presence, then countersigns immediately if online. The transfer payload includes any proofs already obtained, and the learner app countersigns on receipt. Hash the whole compact JWS. Standalone endorsements fit better than re-signed embedded ones, because proofs attach to a specific JWS. [inference]
- **Verification and display.** The bundle format is badge plus endorsement(s) plus vouching plus catalog endorsement plus `.tsr`/`.ots` proofs plus an optional confirmation list. Our verifier page implements and publishes the chain-and-time rules. The 1EdTech validator stays a per-credential integrity check; it cannot show compromise. Displays show positive facts only, per ADR-0012. They never say "in doubt".
- **Loss and correction.** "Reviewer loses phone" becomes a theft-equivalent with X equal to last possession. No key backup is needed if keys are non-extractable. The new key gets fresh vouching, and the profile links old and new keys. "Bad endorsement" revocation would need an index in the space's list. Assigning index ranges per reviewer was considered and rejected for compromise, because a thief can reuse indices. It may still suit honest corrections. [inference]

## Open questions

1. **Value of N and of the delay.** These are product decisions. 7 days and 72 h are placeholders taken from PLC's window, not recommendations.
2. **Public TSA terms.** Do FreeTSA, DigiCert's or Sigstore's TSA terms and rate limits allow app-scale use? [unverified] Should Rollercoaster.dev run one? That would add a TSA key on our side, a new exception to "no private keys".
3. **Passkey PRF availability** on iOS/Android passkey providers, and in Expo/React Native. [unverified]
4. **Which native module** gives Secure Enclave / StrongBox P-256 signing in this Expo app, and what is the Android coverage? [unverified]
5. **Do verifiers look at all?** The pilot report's "If they can do the job, they get hired" still applies. The chain only matters if our verifier page gets used. This decides whether §8 steps 4–8 ever happen.
6. **Confirmation-list governance.** Who decides which gap endorsements are genuine when the reviewer is unsure?
7. **Privacy and GDPR** of public anchors. Anchors contain only Merkle roots of JWS hashes, which is low risk, but should be checked with the privacy review panel.
8. **One-person spaces:** is a partner space as second admin realistic, or does Rollercoaster.dev's delayed path become the norm?

## Sources

- W3C [Controlled Identifiers v1.0](https://www.w3.org/TR/cid-1.0/) §2.2, §5.4, §5.5, §5.5.1 · [VC Data Model 2.0](https://www.w3.org/TR/vc-data-model-2.0/) · [VC-JOSE-COSE](https://www.w3.org/TR/vc-jose-cose/) · [Bitstring Status List v1.0](https://www.w3.org/TR/vc-bitstring-status-list/) · [WebAuthn Level 3](https://www.w3.org/TR/webauthn-3/) §7.2, §10.1.4
- [did:web](https://w3c-ccg.github.io/did-method-web/) · [did:key v0.9](https://w3c-ccg.github.io/did-key-spec/) · [did:webvh v1.0](https://identity.foundation/didwebvh/v1.0/) · [did:plc v0.1](https://web.plc.directory/spec/v0.1/did-plc) · [ToIP KERI v1.1](https://trustoverip.org/wp-content/uploads/KERI-V1.1-2026-01-21.pdf) · [Universal Resolver README](https://github.com/decentralized-identity/universal-resolver)
- 1EdTech [Open Badges 3.0](https://www.imsglobal.org/spec/ob/v3p0/) (doc v1.4.5, 2026-06-29) §8.2.6, §8.4, §9.1, §9.2 · [digital-credentials-public-validator](https://github.com/1EdTech/digital-credentials-public-validator) at `6bf38234`
- [RFC 3161](https://www.rfc-editor.org/rfc/rfc3161) · [RFC 9162](https://www.rfc-editor.org/rfc/rfc9162) · [CA/B Forum CSBR v3.11.0](https://github.com/cabforum/code-signing/blob/main/docs/CSBR.md) §4.9.1, §4.9.6 · [Sigstore timestamps](https://docs.sigstore.dev/cosign/verifying/timestamps/) · [Sigstore "Trusted Time"](https://blog.sigstore.dev/trusted-time/)
- [OpenTimestamps announcement](https://petertodd.org/2016/opentimestamps-announcement) · [opentimestamps-client](https://github.com/opentimestamps/opentimestamps-client) · [javascript-opentimestamps](https://github.com/opentimestamps/javascript-opentimestamps) · [Bitcoin block header rules](https://developer.bitcoin.org/reference/block_chain.html)
- [Blockcerts verification process](https://cdn.jsdelivr.net/npm/@blockcerts/cert-verifier-js@6.35.2/docs/verification-process.md) (versioned verifier doc)
- [atproto account recovery](https://atproto.com/guides/account-recovery) · [EUDI ARF](https://github.com/eu-digital-identity-wallet/eudi-doc-architecture-and-reference-framework) Annex 2 Topic 34 (repo snapshot 2026-10-02) · [Apple: remove ID cards from Wallet](https://support.apple.com/118265) · [Apple: Secure Enclave](https://developer.apple.com/documentation/security/protecting-keys-with-the-secure-enclave) · [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)
- Repo: `apps/native-rd/src/crypto/SecureStoreKeyProvider.ts`, `apps/native-rd/src/badges/vcJwt.ts:140-172`
