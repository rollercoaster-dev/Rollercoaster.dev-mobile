# Development Plan: Issue #598

## Issue Summary

**Title**: [Crypto] eddsa-rdfc-2022 proof + resolvable did:key — close gaps 5 and 7
**Type**: enhancement / crypto migration
**Complexity**: LARGE
**Estimated Lines**: ~950-1000 lines (impl + tests + docs)

**Scope has changed since the issue was filed.** The issue body still describes
`eddsa-rdfc-2022` + RDFC-1.0 canonicalization. That framing is stale. Per the
epic's 2026-08-30 amendment (below), the actual scope is **ES256 VC-JWT
external proof + a P-256 signing-key migration**. The `did:key` half of the
issue is unchanged. See D1.

## Intent Verification

- [ ] A badge signed after this change is a compact JWS (three dot-separated
      base64url segments: `header.payload.signature`), decodable without
      error, with protected header `alg: "ES256"` and an inline `jwk`.
- [ ] The signing key's `did:key` identifier is multicodec (`0x1200`,
      P-256-pub) + base58btc `z`-prefixed — decoding it back to a public key
      and re-encoding round-trips to the same string.
- [ ] Achievement IRIs no longer append a path segment to the issuer DID (no
      more `did:key:z.../achievements/<id>`); they use a plain `urn:ulid:`
      IRI instead, matching the existing evidence-IRI convention.
- [ ] `bun run verify:badge` on a freshly earned badge reports `gap5` (proof
      format) and `gap7` (did:key multibase) as PASS, and the local
      "system round-trip" check cryptographically verifies the ES256
      signature against the inline JWK (not skipped).
- [ ] A device with an existing Ed25519 signing key (pre-upgrade install)
      gets a fresh P-256 key generated automatically on next launch, with no
      user-visible prompt (matches `useUserKey`'s existing silent,
      self-healing behavior).
- [ ] `BadgeDetailScreen`'s evidence section still renders for a badge signed
      under the new JWS format (it currently `JSON.parse`s the stored
      credential directly and would silently show nothing otherwise).
- [ ] A badge that already exists in the DB from before this change still
      opens, displays, and exports byte-for-byte unchanged — no migration, no
      re-serialization, no re-signing on read.

## Dependencies

| Issue | Title                                           | Status                                                  | Type                               |
| ----- | ----------------------------------------------- | ------------------------------------------------------- | ---------------------------------- |
| #595  | Epic: OB3 external verification                 | Open (epic, tracking only)                              | —                                  |
| #596  | [Spike] RDFC-1.0 canonicalization under Hermes  | ✅ Closed — reshaped/answered by the proof-format spike | Was a blocker, now moot            |
| #597  | [Foundation] OB3 schema shape — gaps 1-4        | ✅ Closed, merged as PR #628 (2026-08-30)               | Blocker (stated in epic amendment) |
| #599  | [Bug] Export never bakes the credential         | Open, independent                                       | Sibling, not a blocker             |
| #600  | [Verify] Re-run the validator, refresh snapshot | Open, blocked by the rest                               | Downstream of this issue           |

**Status:** ✅ All stated dependencies met. The issue body says "Blocked by the
canonicalization spike and by the schema-shape issue" — both are resolved:
the spike (#596) produced a research doc that answers its own question, and
the epic's amendment explicitly states "#598 is reshaped and no longer waits
on a canonicalization verdict... Blocked by #597 only," and #597 merged
2026-08-30 (PR #628, same day as this research). `has_blockers = false`.

## Objective

Close validator gaps 5 and 7 from `ob3-compliance-status.md`:

- **Gap 5 (proof format):** replace the `eddsa-raw-json-iteration-a`
  DataIntegrityProof (raw `JSON.stringify` signed, bare base64url
  `proofValue`) with a spec-compliant **ES256 VC-JWT external proof** —
  the credential becomes a signed compact JWS, not a JSON object with an
  embedded `proof` array.
- **Gap 7 (did:key resolution):** replace `did:key:${jwk.x}` (raw base64url)
  with a proper multicodec + base58btc-encoded `did:key`, and stop appending
  path segments to it for achievement IDs.

This requires migrating the badge signing key from Ed25519 to P-256, because
the validator's external-proof path only accepts `RS256`/`ES256` (EdDSA is
rejected), per the proof-format spike.

## Decisions

| ID  | Decision                                                                                                                                                                                                                                      | Alternatives Considered                                                                                             | Rationale                                                                                                                                                                                                                                                                                                                                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Implement per the epic's 2026-08-30 amendment (ES256 VC-JWT + P-256 key), not the issue body's `eddsa-rdfc-2022` text                                                                                                                         | Embedded `eddsa-rdfc-2022` DataIntegrityProof with real URDNA2015 canonicalization (Option A in the spike)          | `docs/research/ob3-proof-format-spike.md` reads the validator's own source: `eddsa-jcs-2022` (the cheap fallback) doesn't exist in the allowlist, there is no working RDFC implementation anywhere in this org's prior art to port, and VC-JWT removes the epic's only open unknown. Epic #595 explicitly reshaped #598's checklist item to "ES256 VC-JWT proof + P-256 key migration" the same day.               |
| D2  | Leave already-earned badges untouched — no migration, no re-serialization, no re-signing on read                                                                                                                                              | Rebake all existing badges under the new key/format; add a dual-format reader                                       | Extends #597's own D5, established in the merged PR #628: `badge.credential` is an immutable JSON string and the old signature covers the exact old byte serialization; reshaping it post-hoc invalidates the signature without re-signing, which is explicitly out of scope. Same logic applies one level further to the proof format and key.                                                                    |
| D3  | Force-rotate an existing Ed25519 signing key to a fresh P-256 key automatically, the first time `useUserKey` runs post-upgrade (reusing its existing orphan-clear self-healing path), rather than keeping dual-algorithm support indefinitely | (a) Detect key type at sign time and produce an EdDSA VC-JWT for old keys; (b) prompt the user to opt into rotation | (a) fails the validator outright — Finding 2 of the spike shows `alg: EdDSA` is rejected by `ExternalProofProbe`, so an unrotated user could never produce a passing badge, which breaks the issue's own "Done when" promise for that user. (b) contradicts `useUserKey`'s documented "Silent — no UI" design. Rotation only affects the _next_ badge signed (D2 already covers old ones), so it's a safe default. |
| D4  | Hand-roll compact-JWS construction in `native-rd` (header/payload build → `keyProvider.sign(keyId, bytes)` → base64url assemble), not `openbadges-core`'s existing `generateJWTProof`                                                         | Call `generateJWTProof` directly                                                                                    | `generateJWTProof` needs the raw private-key JWK (`importJWK`/`SignJWT`), which conflicts with `KeyProvider`'s existing boundary — the private key never leaves `SecureStoreKeyProvider`. The current Iteration-A code already hand-rolls its own signing bytes via `keyProvider.sign()` + a local `toBase64Url` helper (`useCreateBadge.ts:92-98, 249-252`); this is the same shape, extended to JWS.             |
| D5  | Inline the public key as `jwk` in the JWS protected header, not a dereferenceable `kid` URL                                                                                                                                                   | `kid` pointing at a hosted key document                                                                             | Spike Finding 2: "Inline `jwk` is the right choice for us — no network at verification time," matching a local-first app whose badges must verify offline.                                                                                                                                                                                                                                                         |
| D6  | New `did-key.ts` module (base58btc + multicodec P-256 encode/decode) lives in `packages/openbadges-core/src/crypto/`, not app-local                                                                                                           | Put it directly in `apps/native-rd/src/badges/credentialBuilder.ts`                                                 | Matches existing precedent — `signature.ts`, `jwt-proof.ts`, `key-provider.ts` already live in that directory as shared, platform-agnostic crypto primitives. `credentialBuilder.ts`'s own docstring says it stays "pure" / non-crypto (signing is delegated elsewhere already).                                                                                                                                   |
| D7  | Implement base58btc + multicodec varint encode/decode dependency-free (hand-rolled)                                                                                                                                                           | Add a library (`multiformats`, `bs58`, etc.)                                                                        | Spike Finding 5: no multibase/multicodec/base58 package exists anywhere in this monorepo's lockfile today, and the only prior art (the archived `openbadges-modular-server`) also did this dependency-free. Adding an RN-untested transitive dependency for ~2 small, well-specified encodings (both independently unit-testable against known vectors) is not worth the risk.                                     |
| D8  | Achievement IRIs become `urn:ulid:${goal.id}` instead of `${issuerDid}/achievements/${goal.id}`                                                                                                                                               | Mint a fake `https://` URL (app has no hosted endpoint)                                                             | Matches the existing evidence-IRI convention three lines below in the same file: `id: iri(\`urn:ulid:${ev.id}\`)` (`credentialBuilder.ts:117`). `did:key`DIDs don't support path segments (issue body, confirmed by spike Finding 4), and inventing a non-resolving fake HTTPS URL would be worse than an honest`urn:` IRI.                                                                                        |
| D9  | `BadgeDetailScreen`'s `extractEvidenceItems` becomes format-aware (JSON object vs. 3-segment JWS string)                                                                                                                                      | Leave it as-is, let the evidence section silently disappear for new badges                                          | #598 is what changes the shape actually written to `badge.credential` for new badges; #599 (export-baking bug) doesn't touch this read path. Deferring this would ship a silent regression the same day this issue merges.                                                                                                                                                                                         |

## Affected Areas

- `packages/openbadges-core/src/crypto/did-key.ts` (**new**): base58btc
  encode/decode + P-256 multicodec (`0x1200`) `did:key` encode/decode,
  including EC point compression/decompression (P-256 prime is `≡ 3 mod 4`,
  so decompression is a single modular exponentiation — no bignum library
  needed beyond native `BigInt`).
- `packages/openbadges-core/src/crypto/index.ts`: export the new module.
- `apps/native-rd/src/crypto/SecureStoreKeyProvider.ts`: `generateKeyPair()`
  switches from `{name: "Ed25519"}` to `{name: "ECDSA", namedCurve:
"P-256"}`; `sign()` switches from `"Ed25519"` to `{name: "ECDSA", hash:
"SHA-256"}`. WebCrypto's ECDSA `sign()` already returns the raw
  IEEE-P1363 `r‖s` format JWS needs — no extra encoding step.
- `apps/native-rd/src/hooks/useUserKey.ts`: the orphan-clear self-healing
  effect gains a second trigger — an existing key whose stored public JWK
  isn't P-256 is treated the same as an orphan (cleared, regenerated).
- `apps/native-rd/src/badges/credentialBuilder.ts`: `buildDid()` calls the
  new did-key module instead of `did:key:${jwk.x}`; achievement IRI drops
  the path segment (D8).
- `apps/native-rd/src/hooks/useCreateBadge.ts`: replaces the
  `DataIntegrityProof` construction (lines ~254-273) with compact-JWS
  construction (header/payload/signature via `keyProvider.sign`); the final
  "signed credential" written to `badge.credential` and baked into the PNG
  becomes the JWS string itself, not a JSON envelope.
- `apps/native-rd/src/screens/BadgeDetailScreen/BadgeDetailScreen.tsx`:
  `extractEvidenceItems` becomes format-aware (D9).
- `apps/native-rd/scripts/verify-badge.ts`: `gap5`/`gap7` checks and the
  local "system round-trip" signature check are rewritten for the new
  scheme (JWS parsing, ES256 verification, multicodec-aware DID check).
- `apps/native-rd/docs/architecture/ob3-compliance-status.md`: gap 5/7
  rows updated to reflect the shipped scheme + the key-migration note.
- Test files mirroring every module above.

**Not touched:** `packages/openbadges-core/src/credentials/serializer.ts` —
native-rd already builds its signed proof outside `serializeOB3` (per #597's
D2), so the serializer's own embedded-proof branch is unaffected; the
`vc` claim wraps the same unsigned VC JSON `serializeOB3` already produces.
Baking (`png-baking.ts`, both copies) already supports JWS strings end to end
(`getBakingKeyword`/`unbakePNG` both branch on 3-segment-dot-string vs. JSON
today) — no change needed there.

## Implementation Plan

### Step 1: did:key encoding — base58btc + P-256 multicodec

**Files**: `packages/openbadges-core/src/crypto/did-key.ts` (new),
`packages/openbadges-core/src/crypto/index.ts`,
`packages/openbadges-core/tests/crypto/did-key.test.ts` (new)
**Commit**: `feat(openbadges-core): add dependency-free P-256 did:key encoding`
**Changes**:

- [ ] `base58btcEncode`/`base58btcDecode` (standard Bitcoin alphabet, no
      leading-zero edge case skipped).
- [ ] `compressP256PublicKey(jwk)`: SEC1 point compression from JWK `x`/`y`
      → 33-byte `0x02`/`0x03`-prefixed point (parity from `y`'s last byte).
- [ ] `decompressP256PublicKey(bytes)`: reverse via `y² = x³ - 3x + b mod p`,
      `sqrt = a^((p+1)/4) mod p` (valid since P-256's prime is `≡ 3 mod 4`) —
      needed by the local verifier in Step 6.
- [ ] `encodeP256DidKey(jwk): string` — multicodec varint `0x1200` (bytes
      `[0x80, 0x24]`) + compressed point, base58btc, `z`-prefixed.
- [ ] `decodeP256DidKey(did: string): JsonWebKey` — inverse.
- [ ] Unit tests round-trip against a handful of `crypto.subtle`-generated
      keypairs (Node has real WebCrypto ECDSA support) plus at least one
      known-answer vector from the W3C did:key spec's P-256 example, so the
      test doesn't only check "encode then decode gets the same thing back."

**Risk to de-risk first:** confirm `react-native-quick-crypto` 1.1.6
actually supports `crypto.subtle.generateKey/sign` with `{name: "ECDSA",
namedCurve: "P-256"}` under Hermes on-device — the proof-format spike
asserts this but took no on-device measurement. Recommend a throwaway
on-device smoke test before committing to Steps 2-3 if this hasn't been
verified since the spike was written.

### Step 2: P-256 signing key migration

**Files**: `apps/native-rd/src/crypto/SecureStoreKeyProvider.ts`,
`apps/native-rd/src/crypto/__tests__/SecureStoreKeyProvider.test.ts`,
`apps/native-rd/src/hooks/useUserKey.ts`,
`apps/native-rd/src/hooks/__tests__/useUserKey.test.ts`
**Commit**: `feat(native-rd): migrate badge signing key from Ed25519 to P-256`
**Changes**:

- [ ] `SecureStoreKeyProvider.generateKeyPair()`: `crypto.subtle.generateKey`
      params → `{name: "ECDSA", namedCurve: "P-256"}`.
- [ ] `SecureStoreKeyProvider.sign()`: import params → `{name: "ECDSA",
  namedCurve: "P-256"}`; sign params → `{name: "ECDSA", hash:
  "SHA-256"}`.
- [ ] `useUserKey`'s verification effect: alongside the existing "orphan"
      branch (key not found in SecureStore → clear), add "wrong algorithm"
      (stored public JWK's `kty`/`crv` isn't P-256 → clear) so a pre-upgrade
      Ed25519 key gets replaced the same silent way (D3).
- [ ] Update `SecureStoreKeyProvider.test.ts` mocks (JWK fixtures, `crypto.subtle` call assertions) from Ed25519 to P-256/ECDSA.
- [ ] Add a `useUserKey.test.ts` case: existing settings row has a stored
      keyId whose public JWK is `{kty: "OKP", crv: "Ed25519"}` → keyId is
      cleared and regenerated.

### Step 3: did:key + achievement IRI wiring

**Files**: `apps/native-rd/src/badges/credentialBuilder.ts`,
`apps/native-rd/src/badges/__tests__/credentialBuilder.test.ts`
**Commit**: `fix(native-rd): resolvable did:key + drop path segments from achievement IRIs`
**Changes**:

- [ ] `buildDid()` calls `encodeP256DidKey` from `@rollercoaster-dev/openbadges-core` instead of `did:key:${jwk.x}`.
- [ ] Achievement IRI: `urn:ulid:${input.goal.id}` instead of
      `${input.issuerDid}/achievements/${encodeURIComponent(input.goal.id)}`
      (D8).
- [ ] Update/replace the Iteration-A-specific `buildDid` unit tests (they
      currently assert the raw-`x` shape) with P-256 multibase assertions.

### Step 4: ES256 VC-JWT proof construction

**Files**: `apps/native-rd/src/hooks/useCreateBadge.ts`,
`apps/native-rd/src/hooks/__tests__/useCreateBadge.test.ts`
**Commit**: `feat(native-rd): sign badges as ES256 VC-JWT instead of raw DataIntegrityProof`
**Changes**:

- [ ] Build JOSE header: `{ alg: "ES256", typ: "JWT", jwk: publicKeyJwk }`
      (D5).
- [ ] Build JWT payload: `{ iss: issuerDid, iat, vc: unsignedCredential }`
      (`unsignedCredential` is the same object `buildUnsignedCredential`
      already returns — no `proof` field, since native-rd never sets
      `assertion.verification`).
- [ ] `signingInput = base64url(header) + "." + base64url(payload)`; sign
      via `keyProvider.sign(keyId, utf8Bytes(signingInput))`; final JWS =
      `signingInput + "." + base64url(signatureBytes)`.
- [ ] Replace the `signedCredential` object + `JSON.stringify(signedCredential)`
      (lines ~260-273, ~331) with the JWS string directly — this is what
      gets passed to `bakePNG` and stored via `createBadge`/`updateBadge`
      (both already accept an arbitrary non-empty string).
- [ ] Update the Iteration-A comment block (lines 254-259) — it's
      superseded.
- [ ] Update `useCreateBadge.test.ts`'s mocked `keyProvider.sign` /
      assertions for the new signing-input bytes and JWS output shape.

**Open technical risk, not a blocker:** the exact JWT claim shape
`ExternalProofProbe.java` expects beyond `alg`/`jwk` (e.g. whether `sub`,
`nbf`, `exp` need to mirror VC fields) isn't pinned down by the spike — it
only confirmed the header-level `alg` allowlist and the `jwk`/`kid` key
dereference paths. Confirm against the validator source or empirically
against verifybadge.org while implementing; final end-to-end confirmation
is #600's job either way.

### Step 5: BadgeDetailScreen JWS-aware evidence extraction

**Files**: `apps/native-rd/src/screens/BadgeDetailScreen/BadgeDetailScreen.tsx`,
`apps/native-rd/src/screens/BadgeDetailScreen/__tests__/BadgeDetailScreen.test.tsx`
**Commit**: `fix(native-rd): decode JWS credential payload for evidence display`
**Changes**:

- [ ] `extractEvidenceItems`: detect the 3-segment-dot, non-`{`-prefixed
      shape (same heuristic `png-baking.ts` already uses); for a JWS, split
      on `.`, base64url-decode the payload segment, read
      `payload.vc.evidence` instead of top-level `.evidence`.
- [ ] For a legacy JSON credential (badges baked before this change), keep
      the existing top-level `.evidence` read — no behavior change for old
      badges (D2).
- [ ] Add a test case: a JWS-shaped `badge.credential` still populates the
      evidence section.

### Step 6: verify-badge.ts — local conformance script update

**Files**: `apps/native-rd/scripts/verify-badge.ts`
**Commit**: `chore(native-rd): update verify-badge.ts for VC-JWT + P-256 did:key`
**Changes**:

- [ ] `loadCredential()`: the loaded value can now be a raw JWS string (from
      either a `.json` file or an unbaked PNG) — thread that through instead
      of assuming `Record<string, unknown>`.
- [ ] New/replaced "system round-trip" check: decode the JWS header + payload,
      decode the `jwk` (or resolve the `did:key` issuer via
      `decodeP256DidKey`), verify the ES256 signature with Node's
      `crypto.verify("sha256", ..., {dsaEncoding: "ieee-p1363"}, ...)` (JWS
      ECDSA signatures are raw `r‖s`, not DER — Node defaults to DER and
      needs this flag).
- [ ] `gap5.cryptosuite` check → rename/replace with a check for "external
      proof, `alg: ES256`, `jwk` present" instead of the DataIntegrityProof
      cryptosuite allowlist.
- [ ] `gap7.didKeyMultibase` check → decode the multibase/multicodec prefix
      properly (`z` + `0x1200`) instead of the current
      `startsWith("did:key:z")` string-prefix heuristic, which would also
      accept a malformed multibase string.
- [ ] Keep the existing Iteration-A signature check as a fallback path for
      old badges (`cryptosuite === "eddsa-raw-json-iteration-a"` still
      routes there) so `bun run verify:badge` keeps working on
      already-earned badges (D2).

### Step 7: Docs

**Files**: `apps/native-rd/docs/architecture/ob3-compliance-status.md`
**Commit**: `docs(native-rd): update gap 5/7 status for VC-JWT + P-256 migration`
**Changes**:

- [ ] Update gap 5 row: cryptosuite → proof-format description (ES256
      VC-JWT, not DataIntegrityProof).
- [ ] Update gap 7 row: describe the shipped multicodec + base58btc
      encoding.
- [ ] Add a short "Key migration" note recording D2/D3 (old badges
      untouched, signing key force-rotated) so a future reader doesn't
      have to reconstruct the reasoning from PR history.
- [ ] Leave the "NOT compliant" TL;DR and the iteration-mapping table
      alone — retiring those is explicitly #600's job.

## Testing Strategy

- [ ] Unit tests for `did-key.ts` (round-trip + at least one known-answer
      vector), Jest 30 / Bun test runner (package convention:
      `packages/openbadges-core/tests/`, not `src/__tests__/`)
- [ ] Unit tests for `SecureStoreKeyProvider` (P-256 generate/sign), mirrored
      at `apps/native-rd/src/crypto/__tests__/`
- [ ] Unit tests for `useUserKey`'s new force-rotation branch
- [ ] Unit tests for `credentialBuilder`'s `buildDid` + achievement IRI
- [ ] Unit tests for `useCreateBadge`'s JWS construction (header/payload/sig
      shape, not full cryptographic verification — that's `verify-badge.ts`'s
      job)
- [ ] Unit test for `BadgeDetailScreen`'s JWS-aware evidence extraction
- [ ] Use `test.each` for the did-key round-trip cases across a few
      generated keypairs
- [ ] Manual: `bun run verify:badge <freshly-baked-badge.png>` — gap5/gap7
      PASS, system round-trip PASS (not skipped)
- [ ] Manual: on a P-256-only device build, complete a goal, confirm the
      badge bakes, displays, and exports without crashing
- [ ] Manual (existing-user path): seed a test build with a stored Ed25519
      `keyId`, relaunch, confirm a new P-256 key is generated silently and
      old badges still open/display/export unchanged

## Not in Scope

| Item                                                                                                                             | Reason                                                                                                                                                      | Follow-up                                                     |
| -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Uploading a badge to verifybadge.org and replacing `ob3-compliance-status.validator-report.json`                                 | Explicitly #600's job per the epic's sub-issue breakdown                                                                                                    | #600                                                          |
| Fixing "export never bakes the credential"                                                                                       | Separate bug, independent per epic amendment                                                                                                                | #599                                                          |
| Renaming `exportJSON`'s `.json` extension / `application/ld+json` mimetype to reflect that new exports are a JWS, not JSON-LD    | Cosmetic; validators sniff content not extension, so it doesn't block "Done when." Current behavior is preserved by doing nothing.                          | none filed — worth a follow-up issue if it bothers a reviewer |
| Dual-algorithm signing (support both Ed25519 and P-256 keys indefinitely)                                                        | D3 — force-rotation is simpler and the validator rejects EdDSA anyway                                                                                       | none                                                          |
| Rebake-on-reopen interaction                                                                                                     | Feature (#15) isn't implemented yet anywhere in the codebase                                                                                                | none — revisit when #15 lands                                 |
| Hardware-backed (Secure Enclave) key generation                                                                                  | P-256 _enables_ this per the spike, but actually using it needs a different key-generation API than `crypto.subtle`; this issue only migrates the algorithm | none filed — worth a follow-up issue                          |
| `openbadges-core`'s `KeyAlgorithm`/`InMemoryKeyProvider` (currently `"Ed25519" \| "RSA"`, used only by that package's own tests) | Not consumed by native-rd's own `KeyProvider`; no caller needs a P-256 variant there today                                                                  | none                                                          |

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->

## Sizing note for whoever picks this up

This plan is deliberately **not split into two PRs** despite exceeding the
~500-line single-PR guideline (issue is already labeled `size:l`, 1-3 days).
The did:key encoding and the P-256 key migration only have a payoff once the
JWT proof construction lands — splitting at that boundary would leave
`verify-badge.ts`'s local signature check _regressed_ (Ed25519 assumptions
break against a P-256 key/did:key) for however long the two PRs are apart.
If a split is still wanted, land all 7 commits back-to-back in the same
session as two PRs (Steps 1-3, then Steps 4-7) rather than as separately
reviewed, independently-mergeable units.
