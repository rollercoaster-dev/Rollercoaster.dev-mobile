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

### 5. Non-standard cryptosuite — **addressed (#598), pending re-validation**

|              |                                                                                                                                                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Validator    | `No proof with type any of ("Ed25519Signature2020", "DataIntegrityProof" with cryptosuite attr of "eddsa-rdfc-2022" or "eddsa-2022") or proof purpose "assertionMethod" found`                                           |
| Was          | Cryptosuite `eddsa-raw-json-iteration-a`. Signature over raw `JSON.stringify(credential)`, not RDFC-1.0 canonicalized form. `proofValue` bare base64url, not multibase `u…`-prefixed.                                    |
| Now          | The credential **is** a compact ES256 JWS (VC-JWT external proof) — no embedded `proof` member at all. Header is `{alg: "ES256", typ: "JWT", jwk}`; the unsigned VC rides under the `vc` claim.                          |
| Why not RDFC | The embedded-proof route needs RDFC-1.0 canonicalization, which has no working implementation available to this app. The external route needs none. See [the proof-format spike](../research/ob3-proof-format-spike.md). |
| Source       | [`vcJwt.ts`](../../src/badges/vcJwt.ts), wired in [`useCreateBadge.ts`](../../src/hooks/useCreateBadge.ts)                                                                                                               |
| Still open   | Confirming against the live validator is #600's job — the report snapshot linked above predates this change.                                                                                                             |

### 6. Umbrella `oneOf` failure

|           |                                                                |
| --------- | -------------------------------------------------------------- |
| Validator | `$: must be valid to one and only one schema, but 0 are valid` |
| Cause     | Consequence of 1–5. Resolves automatically once they're fixed. |

### 7. Non-resolvable `did:key` — **addressed (#598), pending re-validation**

|            |                                                                                                                                                                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Was        | `did:key:${publicKeyJwk.x}` — raw base64url, not multibase + multicodec. The DID would not resolve, so signature verification failed even with a valid cryptosuite.                                                                                    |
| Now        | Multibase base58btc (`z`) over multicodec `p256-pub` (`0x1200`) plus a SEC1-compressed point, so a verifier recovers the public key from the DID alone. Encoding: [`did-key.ts`](../../../../packages/openbadges-core/src/crypto/did-key.ts).          |
| Also (was) | Achievement IDs appended a path segment to the DID; `did:key` DIDs have no path component.                                                                                                                                                             |
| Also (now) | Achievement IDs are `urn:ulid:<goalId>` — not an HTTPS URI as the earlier note suggested. The app hosts nothing, so a fabricated `https://` achievement URL would never resolve; `urn:ulid:` matches the evidence IRIs already emitted alongside them. |
| Source     | [`credentialBuilder.ts`](../../src/badges/credentialBuilder.ts)                                                                                                                                                                                        |

---

## Signing-key migration (#598)

The proof format above needs an **ES256** signature: the validator's
external-proof path accepts only `RS256`/`ES256` and rejects `EdDSA`
outright. The device signing key therefore moved from Ed25519 to ECDSA P-256.

Two consequences worth knowing before reading the code:

- **Existing badges are never touched.** `badge.credential` is immutable and
  the old signature covers the exact old byte serialization, so re-shaping a
  stored credential would invalidate it without re-signing. Old badges keep
  their Iteration-A JSON form and their Ed25519 signature — `verify-badge.ts`
  and `BadgeDetailScreen` both still read that shape, and will need to
  indefinitely.
- **An existing key is force-rotated, silently.** On the first launch after
  upgrading, `useUserKey` treats a non-P-256 stored key exactly like an
  orphaned one: cleared, and a fresh P-256 key generated. No prompt — that
  matches the hook's existing no-UI design, and an unrotated user could never
  produce a badge the validator accepts. Rotation only affects the _next_
  badge signed.

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

### Fast local check

```sh
bun run verify:badge <path-to-badge.png-or-.json>
```

Runs the 7 gap checks documented above without leaving the repo. Source
at `apps/native-rd/scripts/verify-badge.ts`. Treat divergence between
this tool's output and the table above as a doc bug; both should track
together.

### Full external re-test (replaces the snapshot)

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
