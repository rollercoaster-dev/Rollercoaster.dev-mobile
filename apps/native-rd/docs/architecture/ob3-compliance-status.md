# OB3 Compliance Status

**Status:** **Compliant** — the 1EdTech OB30Inspector returns `VALID`, 14/14 probes, 0 errors.
**Last verified:** 2026-09-03 against the official 1EdTech validator at [vc.1ed.tech](https://vc.1ed.tech) (OB30Inspector), on a badge earned end-to-end in the app (goal → evidence → sign → bake → export) — see [provenance](#provenance-of-the-snapshot) below.

---

## TL;DR

A badge signed by native-rd since #598 is an ES256 VC-JWT over a spec-shaped OB 3.0 credential, and it verifies on the official OB 3.0 validator — as a `.jwt` file and as a baked PNG. The seven gaps recorded on 2026-05-01 are closed (#597, #598, #599, #625). ADR-0001's deferral of "OB3 signing" to Iteration D is discharged.

Two things to know before you test:

- **Use vc.1ed.tech, not verifybadge.org.** The validator's README states verifybadge.org "is not owned or maintained by 1EdTech". It runs a build older than 2025-04-08 that rejects every non-`RS256` JWT (`alg must be present and must be 'RS256'`), so an ES256 badge fails there at the header. The official deployment at [vc.1ed.tech](https://vc.1ed.tech) runs current code and accepts ES256.
- **File extension picks the parser.** OB30Inspector routes `.jwt` to its JWT parser, `.png`/`.svg` to the bake extractors, and `.json` to a JSON parser. A compact JWS saved as `.json` is a fatal parse error; as `.jws` it is "could not detect credential payload type". The app's credential export therefore ships JWS credentials as `.jwt` (`application/jwt`).

Badges earned **before** #598 keep their Iteration-A shape (Ed25519, non-standard cryptosuite, `issuanceDate`) and still fail external verification. They are never re-signed — the old signature covers the old bytes.

---

## Validator outcome (2026-09-03)

```text
Outcome:   VALID
Errors:    0
Warnings:  0
Probes:    14 run, 0 skipped
Input:     Baked PNG (iTXt openbadgecredential → compact ES256 JWS, inline jwk)
Spec:      Open Badges 3.0 (ob30.pid)
Generator: OB30Inspector @ vc.1ed.tech
```

Full report: [`ob3-compliance-status.validator-report.json`](./ob3-compliance-status.validator-report.json). The same badge exported as a `.jwt` also returns `VALID`, 14/14.

For comparison, the 2026-05-01 snapshot was `ERROR`, 6 errors, 13 probes.

---

## Gaps — all closed

| Gap | Was (2026-05-01)                                                        | Now                                                                                                                      | Closed by |
| --- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------- |
| 1   | `achievement.creator` is a string                                       | Profile object mirroring `issuer`                                                                                        | #597      |
| 2   | `proof` is an object, array expected                                    | No embedded `proof` at all — the proof is external (the JWS itself)                                                      | #598      |
| 3   | No top-level `name`                                                     | `name` mirrors the achievement title                                                                                     | #597      |
| 4   | No top-level `issuanceDate`                                             | `validFrom` only. `issuanceDate` is a VC 1.1 term, undefined in the VC 2.0 + OB 3.0.3 contexts; the validator rejects it | #597→#625 |
| 5   | Cryptosuite `eddsa-raw-json-iteration-a` over raw `JSON.stringify`      | ES256 VC-JWT external proof, `{alg: "ES256", typ: "JWT", jwk}`; no canonicalization step exists to get wrong             | #598      |
| 6   | Umbrella `oneOf` failure                                                | Resolves with 1–5                                                                                                        | —         |
| 7   | `did:key` was raw base64url; achievement IDs appended a path to the DID | `did:key:z…` multibase/multicodec `p256-pub`; achievement IDs are `urn:ulid:<goalId>`                                    | #598      |

### Gap 4 in detail — why `issuanceDate` went, not stayed

#597 emitted both `validFrom` and `issuanceDate` because the 2026-05-01 report demanded `issuanceDate`. That demand came from the old OB 3.0.0 / VC 1.1 `anyachievementcredential` schema. The current OB30Inspector applies the OB 3.0.3 schema (no `issuanceDate` requirement) **and** runs a JSON-LD probe, which fails the whole credential on an undefined term:

```text
Error while validation JSON LD object: JSON-LD problem. (Undefined JSON-LD term: issuanceDate)
```

With `issuanceDate` present: 14 run, 1 error. Without: 14 run, 0 errors. The serializer now emits `validFrom` only, and `verify-badge.ts` gap 4 asserts `validFrom` present **and** `issuanceDate` absent. #625 records the decision.

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

| Gap                     | Planned (ADR-0001)   | Actual                                                             |
| ----------------------- | -------------------- | ------------------------------------------------------------------ |
| 1–4 (schema shape)      | Iteration D, "cheap" | Shipped 2026-08 in #597 (+ #625 for the `issuanceDate` correction) |
| 5 + 7 (proof + did:key) | Iteration D          | Shipped 2026-09 in #598 — as VC-JWT, not `eddsa-rdfc-2022`         |
| 6                       | Iteration D          | Auto-resolved with 1–5                                             |

The planned two-PR split (schema, then crypto) is what happened. The proof format changed on the way — see [the proof-format spike](../research/ob3-proof-format-spike.md) for why VC-JWT replaced RDFC-1.0 canonicalization.

---

## Provenance of the snapshot

Earned end-to-end in the app on 2026-09-03: a goal was completed in the running app on the iOS simulator, the badge was signed and baked by the device code path (`useCreateBadge` → `signCredentialAsVcJwt` → PNG bake), exported through the share sheet, and submitted to OB30Inspector at vc.1ed.tech — both the baked PNG (this report) and the `.jwt` returned `VALID`, 14/14. One earlier export attempt against a badge minted before the signing-key rotation still failed exactly as documented in gap 4, which is expected: old badges are never re-signed.

---

## How to re-test

### Fast local check

```sh
bun run verify:badge <badge.png | credential.jwt>
```

Runs the 7 gap checks above without leaving the repo. Source at
`apps/native-rd/scripts/verify-badge.ts`. Treat divergence between this
tool's output and the external validator as a doc bug; both should track together.

### Full external re-test (replaces the snapshot)

1. Earn or open a badge in the app.
2. Export it — **Export verifiable badge** for the baked PNG, or **Export credential** for the `.jwt`. Use a byte-preserving channel (AirDrop, Save to Files, Android SAF). Messenger "photo" attachments re-encode PNGs and strip the credential chunk.
3. Validate, either in the browser at <https://vc.1ed.tech/upload?validatorId=OB30Inspector> or from a shell:

   ```sh
   curl -s -X POST "https://vc.1ed.tech/api/validate?validatorId=OB30Inspector" \
     -F "file=@badge.png" > report.json   # or file=@badge.jwt
   ```

   The API returns the same JSON the UI's download button does. Keep the file extension honest — `.png` or `.jwt` — or the validator picks the wrong parser.

4. Replace [`ob3-compliance-status.validator-report.json`](./ob3-compliance-status.validator-report.json) with `report.json` and update the date at the top of this file.

---

## Related

- [ADR-0001: Iteration Strategy](../decisions/ADR-0001-iteration-strategy.md) — the deferral this discharges
- [ADR-0015: funded scope](../decisions/ADR-0015-funded-scope-prototype-fund.md) — milestone 1
- [OB3 proof-format spike](../research/ob3-proof-format-spike.md) — why VC-JWT + P-256
- [openbadges-core architecture](./openbadges-core.md) — where credential building lives
- [`credentialBuilder.ts`](../../src/badges/credentialBuilder.ts) — credential construction
- [`vcJwt.ts`](../../src/badges/vcJwt.ts) — ES256 VC-JWT proof
- [`useCreateBadge.ts`](../../src/hooks/useCreateBadge.ts) — signing + baking
- [`useBadgeExport.ts`](../../src/hooks/useBadgeExport.ts) — `.png` / `.jwt` export
