# OB 3.0 Proof Format — What the Official Validator Actually Accepts

**Date:** 2026-08-30
**Status:** Research — answers the prior half of [#596](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/596), does not close it
**Owner:** Joe

**Scope reference:** [#595 Epic: OB3 external verification](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/595) · [ADR-0015 milestone 1](../decisions/ADR-0015-funded-scope-prototype-fund.md) · [ob3-compliance-status.md](../architecture/ob3-compliance-status.md) · [badge-export.md](./badge-export.md)

---

## TL;DR

#596 asked "which cryptosuite can we sign with on device?" and pre-supposed three candidates: `eddsa-rdfc-2022`, the lighter `eddsa-jcs-2022`, or a fallback. Reading the validator's source settles the option space before any Hermes measurement is needed.

**Two of the three candidates do not exist as far as the validator is concerned.**

| Path                           | Accepted? | Key type it forces     | Canonicalization needed |
| ------------------------------ | --------- | ---------------------- | ----------------------- |
| Embedded `eddsa-rdfc-2022`     | Yes       | Ed25519 (what we have) | **URDNA2015, real**     |
| Embedded `eddsa-2022`          | Yes       | Ed25519                | URDNA2015, real         |
| Embedded `eddsa-jcs-2022`      | **No**    | —                      | —                       |
| External (VC-JWT) `alg: EdDSA` | **No**    | —                      | —                       |
| External (VC-JWT) `alg: ES256` | Yes       | **P-256 — a key swap** | **None**                |
| External (VC-JWT) `alg: RS256` | Yes       | RSA — a key swap       | None                    |

So it is a two-way choice, not a three-way one:

- **A** — embedded proof, keep Ed25519, and make real RDFC-1.0 run under Hermes.
- **B** — VC-JWT, no canonicalization at all, and migrate the badge key from Ed25519 to P-256.

**Recommendation: B.** Reasoning in [Recommendation](#recommendation).

---

## What was actually inspected

The engine named in our validator snapshot (`"generator": "OB30Inspector"`, [`ob3-compliance-status.validator-report.json`](../architecture/ob3-compliance-status.validator-report.json)) is the `inspector-vc` module of [1EdTech/digital-credentials-public-validator](https://github.com/1EdTech/digital-credentials-public-validator) — the code behind the official validator at [vc.1ed.tech](https://vc.1ed.tech). (verifybadge.org runs the same project but, per its README, is not maintained by 1EdTech; as of 2026-09-03 it is on a pre-ECDSA build that rejects ES256 — see [`ob3-compliance-status.md`](../architecture/ob3-compliance-status.md).)

Read at commit `e666bb9` (2026-08-24, `chore: bump version to 1.11.1 in all POM files`) — six days before this document. Line numbers below are from that commit.

This is source reading, not spec reading. Where the spec is more permissive than the implementation, the implementation is what fails our badge, so the implementation is what this document records.

---

## Finding 1 — the validator does support JWT proofs

`OB30Inspector.java:252` branches on proof type:

```java
if (ob.getProofType() == EXTERNAL) {
  // The credential originally contained in a JWT, validate the jwt and external proof.
  accumulator.add(new ExternalProofProbe(false).run(ob, ctx));
} else {
  accumulator.add(new EmbeddedProofProbe(type).run(ob, ctx));
}
```

`ProofType` is decided purely by input shape — `VerifiableCredential.java:54`:

```java
return jwt == null ? ProofType.EMBEDDED : ProofType.EXTERNAL;
```

So handing the validator a compact JWS routes to a completely different probe. VC-JWT is a first-class path, not a degraded one.

Our 2026-05-01 snapshot ran `EmbeddedProofProbe` only because we submitted plain JSON. That is a consequence of what we uploaded, not a statement about what the validator supports.

## Finding 2 — but the JWT path rejects EdDSA

`ExternalProofProbe.java:89-93`:

```java
//MUST be "RS256 or "ES256"
JsonNode alg = headerObj.get("alg");
Set<String> allowedAlgs = Set.of("RS256", "ES256");
if (alg == null || !allowedAlgs.contains(alg.textValue())) {
    throw new Exception("alg must be present and must be either 'RS256' or 'ES256'");
}
```

`EdDSA` appears nowhere in that file. Our entire signing stack is Ed25519 (`SecureStoreKeyProvider`, `useCreateBadge.ts`), so a VC-JWT we could produce today would be rejected at the header before the signature is even checked.

The `jose` library supports `alg: EdDSA` perfectly well. The validator does not. That distinction is the whole finding.

Key material must reach the verifier one of two ways (`ExternalProofProbe.java:100-118`): an inline `jwk` in the JOSE header, or a `kid` the validator dereferences over HTTP. **Inline `jwk` is the right choice for us** — no network at verification time, which matches a local-first app whose badges must verify offline and after the project ends.

## Finding 3 — `eddsa-jcs-2022` is not accepted either

`EmbeddedProofProbe.java:48` is the complete allowlist:

```java
List.of("eddsa-2022", "eddsa-rdfc-2022", "ecdsa-sd-2023");
```

plus a legacy branch for `Ed25519Signature2020` at line 261.

`eddsa-jcs-2022` is absent. #596's hoped-for lightweight fallback — JCS canonicalization instead of RDF canonicalization — does not exist in this validator. Verification runs through Danubetech's `Ed25519Signature2022LdVerifier` (line 277), which performs genuine URDNA2015.

**There is no cheap embedded option.** Either full RDF canonicalization, or leave the embedded path entirely.

## Finding 4 — `did:key` must resolve either way

`EmbeddedProofProbe.java:214-218` decodes the verification method's multibase/multicodec and requires an Ed25519, P-256 or P-384 public key. The external path dereferences key material too.

Gap 7 in [ob3-compliance-status.md](../architecture/ob3-compliance-status.md) — our `did:key:${jwk.x}` using raw base64url instead of multicodec + base58btc — **blocks both paths**. It is unconditional work and is not a reason to prefer A or B.

## Finding 5 — the extracted `openbadges-core` never had this either

The archived [`openbadges-modular-server`](https://github.com/rollercoaster-dev/monorepo/tree/main/apps/openbadges-modular-server) emits `cryptosuite: "eddsa-rdfc-2022"` but canonicalizes with sorted-key `JSON.stringify` (`services/verification/proof-verifier.ts:858-883`), under its own comment:

> `// Note: This is NOT full JSON-LD canonicalization (URDNA2015)`

Neither `rdf-canonize` nor `jsonld` appears anywhere in that monorepo; the only crypto dependency is `jose`. So the server carries the same defect as native-rd while claiming a compliant label — arguably worse, since native-rd's `eddsa-raw-json-iteration-a` is at least honest about being non-standard.

**Implication:** there is no working RDFC implementation anywhere in our prior art to port. Option A is new work in both codebases. That is worth filing against the server repo separately.

What the server _does_ have and is worth porting:

- multicodec + base58btc decoding, dependency-free (`proof-verifier.ts:34-60`), including `MULTICODEC_P256_PUB = 0x1200` — it already understands P-256 `did:key`
- VC-JWT generation and verification wired end to end (`core/verification.service.ts:64` → `generateJWTProof`)

---

## Recommendation

**Take option B: VC-JWT with ES256, and migrate the badge signing key to P-256.**

Beyond dodging canonicalization:

1. **iOS Secure Enclave is P-256 only.** Ed25519 cannot be held in it. Moving to P-256 is a hardware-security upgrade, not a workaround — it opens a door that Ed25519 keeps shut.
2. `react-native-quick-crypto` 1.1.6 is already a dependency and does ES256.
3. Our own server code already handles P-256 `did:key` (`0x1200`), sitting beside the Ed25519 constant we need to port anyway.
4. It removes the epic's only open unknown. Option A leaves us betting that URDNA2015 fits under Hermes with **no fallback if it doesn't** — Finding 3 removed the fallback.

### Costs, stated plainly

- **Key migration.** Badges already earned are Ed25519-signed. They need re-signing under the new key, or a dual-key read path. Rebake-on-reopen machinery exists ([`2026-05-14-badge-rebake-on-reopen.md`](../plans/2026-05-14-badge-rebake-on-reopen.md)), but the policy decision is the same one #597 and #598 already flagged and should be answered once.
- **Baked PNG carries a JWS string** rather than a JSON object in the `openbadgecredential` iTXt chunk. Permitted, but [#599](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/599)'s regression test should pin the JWS form specifically.
- **Ed25519 is the more fashionable curve** in the VC ecosystem generally. We would be choosing the one this validator accepts over the one the wider ecosystem prefers. Acceptable: external verification is the entire point of the milestone.

---

## What this does NOT answer

Stated explicitly, because #596's acceptance criteria ask for a measured number and **this document does not contain one.**

- **No on-device measurement was taken.** Nothing was run under Hermes. If option A is chosen anyway, the original spike stands in full and still needs a real device number.
- Under option B the measurement question largely dissolves — an ES256 signature over a JSON payload has no canonicalization step to measure — but "largely" is not "entirely", and signing latency in the completion flow should still be observed once wired.
- **The `issuanceDate` question is untouched.** Our snapshot validated against `ob_v3p0_anyachievementcredential_schema.json`, which requires `issuanceDate` (VC 1.1 shape) while our serializer emits `validFrom` (VC 2.0 shape). That is gap 4 and it is independent of proof format. See [#597](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/597).
- ~~**Not verified end to end.**~~ **Verified 2026-09-03:** an ES256 VC-JWT built by this repo's code path returns `VALID` 14/14 on vc.1ed.tech, as `.jwt` and as baked PNG, once `issuanceDate` is dropped (#625). Confirmed the same day on a badge earned end-to-end on a physical iPhone (#600) — see the [compliance status provenance](../architecture/ob3-compliance-status.md#provenance-of-the-snapshot). Record: [`ob3-compliance-status.md`](../architecture/ob3-compliance-status.md).

## Suggested change to the epic

- Rewrite [#596](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/596) from "which cryptosuite on device" to "confirm ES256 VC-JWT end to end" — its original question is answered, its acceptance criteria are not.
- [#597](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/597) (schema shape) and [#599](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/599) (export baking) are unaffected by this choice and can start now.
- [#598](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/598) changes shape: "eddsa-rdfc-2022 proof" becomes "ES256 VC-JWT proof + P-256 key migration". The `did:key` half is unchanged.

## Sources

- [1EdTech/digital-credentials-public-validator](https://github.com/1EdTech/digital-credentials-public-validator) — `inspector-vc`, read at `e666bb9` (2026-08-24)
- [Open Badges 3.0 Certification Guide](https://www.imsglobal.org/spec/ob/v3p0/cert)
- [W3C VC-JOSE-COSE](https://www.w3.org/TR/vc-jose-cose/) — `kid` semantics
- [W3C vc-di-eddsa](https://www.w3.org/TR/vc-di-eddsa/) / [vc-di-ecdsa](https://www.w3.org/TR/vc-di-ecdsa/) — Multikey encoding
- `rollercoaster-dev/monorepo` @ `apps/openbadges-modular-server` — prior art, read locally
