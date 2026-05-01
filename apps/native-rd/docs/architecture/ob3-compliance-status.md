# OB3 Compliance Status

**Status:** Iteration A — **NOT compliant** with the Open Badges 3.0 spec.
**Target:** Iteration D — full external verifier compatibility.
**Last verified:** 2026-05-01 against IMS Global's OB30Inspector (the engine behind [verifybadge.org](https://verifybadge.org)).

---

## TL;DR

Badges exported from native-rd today **will fail external verification.** This is a known, intentional Iteration A trade-off, scoped for fix in Iteration D ([ADR-0001](../decisions/ADR-0001-iteration-strategy.md#iteration-d--community)).

The credentials are real OB3-shaped Verifiable Credentials and verify locally inside the app — but they don't satisfy the IMS Global spec strictly enough for third-party verifiers.

---

## Validator outcome (2026-05-01)

```text
Outcome:   ERROR
Errors:    6
Warnings:  0
Probes:    13 run, 0 skipped
Spec:      Open Badges 3.0 (ob30.pid)
Generator: OB30Inspector
```

Full report: [`ob3-compliance-status.validator-report.json`](./ob3-compliance-status.validator-report.json)

---

## Compliance gaps

Each gap below is a real validator error, mapped to the line of code that produces it.

### 1. `creator` is a string, not an object

|           |                                                                                                                 |
| --------- | --------------------------------------------------------------------------------------------------------------- |
| Validator | `$.credentialSubject.achievement.creator: string found, object expected`                                        |
| Source    | [`credentialBuilder.ts:87`](../../src/badges/credentialBuilder.ts) — `badgeClass.issuer = iri(input.issuerDid)` |
| Cause     | `serializeOB3` projects the bare DID string into `achievement.creator`. OB3 requires a Profile object.          |
| Fix scope | Schema-shape only. No crypto changes.                                                                           |

### 2. `proof` is an object, not an array

|           |                                                                              |
| --------- | ---------------------------------------------------------------------------- |
| Validator | `$.proof: object found, array expected`                                      |
| Source    | [`useCreateBadge.ts:193-216`](../../src/hooks/useCreateBadge.ts)             |
| Cause     | A single proof object is attached. The OB3 schema requires `proof: [{...}]`. |
| Fix scope | Schema-shape only.                                                           |

### 3. Missing top-level `name`

|           |                                                                                                                                  |
| --------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Validator | `$: required property 'name' not found`                                                                                          |
| Cause     | `serializeOB3` does not surface a top-level `name` on the credential envelope. Only `credentialSubject.achievement.name` is set. |
| Fix scope | Schema-shape only.                                                                                                               |

### 4. Missing top-level `issuanceDate`

|           |                                                                                   |
| --------- | --------------------------------------------------------------------------------- |
| Validator | `$: required property 'issuanceDate' not found`                                   |
| Cause     | `assertion.issuedOn` is set but not surfaced as the VC envelope's `issuanceDate`. |
| Fix scope | Schema-shape only.                                                                |

### 5. Non-standard cryptosuite

|           |                                                                                                                                                                                                |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Validator | `No proof with type any of ("Ed25519Signature2020", "DataIntegrityProof" with cryptosuite attr of "eddsa-rdfc-2022" or "eddsa-2022") or proof purpose "assertionMethod" found`                 |
| Source    | [`useCreateBadge.ts:200-205`](../../src/hooks/useCreateBadge.ts)                                                                                                                               |
| Cause     | Cryptosuite is `eddsa-raw-json-iteration-a`. Signature is over raw `JSON.stringify(credential)`, not RDFC-1.0 canonicalized form. `proofValue` is bare base64url, not multibase `u…`-prefixed. |
| Fix scope | Crypto. Requires RDFC-1.0 canonicalization (W3C Data Integrity), multibase encoding, cryptosuite rename.                                                                                       |

### 6. Umbrella `oneOf` failure

|           |                                                                |
| --------- | -------------------------------------------------------------- |
| Validator | `$: must be valid to one and only one schema, but 0 are valid` |
| Cause     | Consequence of 1–5. Resolves automatically once they're fixed. |

### 7. Non-resolvable `did:key` (related, not flagged by this validator)

|           |                                                                                                                                                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source    | [`credentialBuilder.ts:51-56`](../../src/badges/credentialBuilder.ts)                                                                                                                                                           |
| Cause     | `did:key:${publicKeyJwk.x}` uses raw base64url, not the spec-required multibase (`z…`) + multicodec (`0xed01`) Ed25519 encoding. The DID will not resolve, so signature verification fails even after the cryptosuite is fixed. |
| Also      | Achievement IDs append a path segment to the DID (`credentialBuilder.ts:76-78`); `did:key` DIDs do not support paths. Use HTTPS URIs instead.                                                                                   |
| Fix scope | Crypto / identifier. Bundled with #5.                                                                                                                                                                                           |

---

## Iteration mapping

| Gap                           | Iteration    | Why deferred                                                                  |
| ----------------------------- | ------------ | ----------------------------------------------------------------------------- |
| 1–4 (schema shape)            | D, but cheap | Could ship earlier as a "shape-compliant but signature-invalid" intermediate. |
| 5 + 7 (cryptosuite + did:key) | D            | Requires RDFC-1.0 canonicalization + multibase + DID resolution. Real work.   |
| 6                             | D            | Auto-resolves with 1–5.                                                       |

A reasonable two-PR split:

1. **PR A — Schema shape:** errors 1–4. Pure JSON shape, no crypto. Closes most validator probes; only `EmbeddedProofProbe` stays red.
2. **PR B — Cryptosuite + did:key:** errors 5 + 7. Closes the loop.

---

## What does verify today

Local verification inside the app works because native-rd both signs and verifies with the same non-standard scheme. This is suitable for the Iteration A scope (self-signed, on-device, no external verifier in the loop) but **not** for sharing badges with anyone who uses a spec-compliant verifier.

---

## How to re-test

1. Earn or open a badge in the app.
2. Use **Export → JSON** to share the credential off-device.
3. Upload the `.json` to [verifybadge.org](https://verifybadge.org/validate) and select OB 3.0.
4. Save the JSON report.
5. Replace [`ob3-compliance-status.validator-report.json`](./ob3-compliance-status.validator-report.json) and update the date at the top of this file.

---

## Related

- [ADR-0001: Iteration Strategy](../decisions/ADR-0001-iteration-strategy.md) — Iteration D scope
- [openbadges-core architecture](./openbadges-core.md) — where credential building lives
- [`credentialBuilder.ts`](../../src/badges/credentialBuilder.ts) — credential construction
- [`useCreateBadge.ts`](../../src/hooks/useCreateBadge.ts) — signing
