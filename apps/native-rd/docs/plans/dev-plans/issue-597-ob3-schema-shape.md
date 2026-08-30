# Development Plan: Issue #597

## Issue Summary

**Title**: [Foundation] OB3 schema shape — close gaps 1-4 (creator, proof array, name, issuanceDate)
**Type**: bug / spec-compliance
**Complexity**: SMALL
**Estimated Lines**: ~90 lines (net, including test updates)

## Intent Verification

- [ ] `bun run verify:badge <freshly-baked-badge.json>` shows `gap1.creatorObject`, `gap2.proofArray`, `gap3.topLevelName`, and `gap4.issuanceDate` all PASS (per `apps/native-rd/scripts/verify-badge.ts`'s own checks) on a badge earned after this change.
- [ ] `achievement.creator` on a freshly baked credential is an object (`{ id, type: ["Profile"], name, url, ... }`), not a bare DID string.
- [ ] The freshly baked credential's top-level `proof` is an array (`proof: [{...}]`), and `useCreateBadge`'s signature verification (`verify:badge`'s `signature.iterationA` check, which strips `proof` before recomputing bytes) still passes — the shape change must not break the existing Iteration-A signature.
- [ ] The freshly baked credential has a top-level `name` (mirrors the achievement/badge title) and a top-level `issuanceDate` (equal to `assertion.issuedOn`), alongside the existing `validFrom`.
- [ ] A badge that already exists in the DB from before this change (old shape: bare-string creator, singular proof object, no top-level name/issuanceDate) still opens, displays, and exports unchanged — nothing re-serializes or re-signs it.

## Dependencies

| Issue | Title                           | Status                               | Type          |
| ----- | ------------------------------- | ------------------------------------ | ------------- |
| #595  | Epic: OB3 external verification | 🟢 Open (parent epic, not a blocker) | Informational |

No `Blocked by` / `Depends on` / `After` markers in the issue body. Labeled `dep:independent`, `order:1`; epic #595 explicitly calls out "#597 ... Unaffected by the amendment. **Start now.**"

**Status**: ✅ All dependencies met.

## Objective

Close OB3 validator gaps 1–4 — a bare-string `achievement.creator`, a singular (non-array) `proof`, a missing top-level `name`, and a missing top-level `issuanceDate` — as a pure JSON-shape change with no crypto/key changes, so `bun run verify:badge` on a freshly earned badge reports those four gaps closed and only the proof-format gaps (5/6, out of scope here) remain.

## Decisions

| ID  | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Alternatives Considered                                                                                                                                                                     | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Fix gap 1 (creator) in the **shared serializer**, not in native-rd's caller. `OpenBadges3Serializer.createVerifiableCredential` (`packages/openbadges-core/src/credentials/serializer.ts:236`) currently defaults `achievement.creator` to the bare `issuer.id` string; change the default to the already-built `issuerObj` Profile object (constructed two lines above, at `serializer.ts:217-226`). The existing override (`serializer.ts:242`: `if (badgeClass.creator) achievement.creator = badgeClass.creator;`) is untouched, so any future caller that wants a _different_ creator than the issuer still can.                      | (a) Have native-rd's `credentialBuilder.ts` pass `badgeClass.creator = issuerObj` explicitly at the call site.                                                                              | Issue is labeled `pkg:openbadges-core` — the gap is a shared-package default, not a native-rd-only omission. Native-rd's badges are self-sovereign (issuer === creator === the earner's device key; see `credentialBuilder.ts:109-111`), so defaulting to `issuerObj` matches every current and foreseeable caller without new per-caller plumbing, and fixes any other consumer of `serializeOB3`/`buildCredential` that would otherwise hit the same bare-string default.                                                                                                                                                                                                                                                                                                                                            |
| D2  | Fix gap 2 (proof array) in **two places**: (1) `useCreateBadge.ts:260-270`, which builds the actual signed proof entirely outside `serializeOB3` (native-rd's `AssertionData` never sets `verification`, so the shared serializer's own proof-building branch is dead code for this app) — wrap that literal `proof: {...}` in `[ ]`. (2) The shared serializer's own `result.proof = {...}` branch (`serializer.ts:262-273`), exercised by `credential-builder.test.ts:104-137` via `assertion.verification`, has the identical gap — wrap it in `[ ]` too, since `VerifiableCredentialData.proof` is one shared type used by both paths. | Fix only the native-rd call site and leave the shared serializer's own (currently-unused-by-native-rd) proof path as a singular object.                                                     | Leaving it would mean any _other_ consumer that does populate `assertion.verification` gets a non-compliant credential from the "compliant" package — same class of bug this issue is closing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| D3  | Fix gap 3 (top-level `name`) by adding `name: badgeClass.name` to the VC envelope in `createVerifiableCredential` (`serializer.ts`, alongside the existing `id`/`type`/`issuer`/`validFrom` construction at `serializer.ts:248-259`).                                                                                                                                                                                                                                                                                                                                                                                                      | Derive it from `assertion` instead of `badgeClass`.                                                                                                                                         | `credentialSubject.achievement.name` already carries `badgeClass.name` (`serializer.ts:232`) — the top-level `name` is the same conceptual value (the achievement/badge title), promoted to the envelope per the validator's `$: required property 'name' not found` error.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| D4  | Fix gap 4 (top-level `issuanceDate`) by adding `issuanceDate: assertion.issuedOn` **alongside** the existing `validFrom: assertion.issuedOn` (`serializer.ts:253`) — not replacing it.                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Rename `validFrom` to `issuanceDate` and drop `validFrom`.                                                                                                                                  | The `@context` already declares VC 2.0 first (`serializer.ts:246-249` comment: "VC 2.0 first, OB3 second"), and existing tests (`serializer.test.ts:121`, `credential-builder.test.ts:84,179`) assert `validFrom` is present — removing it would regress a property the codebase has already committed to. The validator wants `issuanceDate` specifically (gap 4's own error text); emitting both is additive, not a replacement.                                                                                                                                                                                                                                                                                                                                                                                     |
| D5  | **Already-earned badges are left as-is — no migration, no re-serialization on read.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | (a) Re-serialize the stored credential JSON through the new serializer when the badge is read/displayed. (b) Migrate stored rows in a one-time script, re-signing them under the new shape. | Both alternatives require re-signing: `badge.credential` is stored as an immutable JSON string (`BadgeDetailScreen.tsx:79,137,290`, `png-baking.ts:233` — read verbatim, never re-derived), and the Iteration-A proof (`useCreateBadge.ts:249-252`) signs the exact byte serialization of the _old_ shape. Changing that shape post-hoc — even just re-running it through the new serializer — invalidates the existing `proofValue` without also re-signing, which is crypto/key work this issue explicitly excludes ("Pure JSON shape, no crypto, no key handling"). Re-signing already-issued credentials is gap-5/6 territory (#598), not a schema-shape change. This is dictated by the issue's own scope boundary, not a preference call — recorded here per the issue's "do not leave it implicit" instruction. |

## Affected Areas

- `packages/openbadges-core/src/credentials/serializer.ts`: `OpenBadges3Serializer.createVerifiableCredential` — default `achievement.creator` to the Profile object, add top-level `name` and `issuanceDate`, wrap `result.proof` in an array.
- `packages/openbadges-core/src/credentials/types.ts`: `VerifiableCredentialData` — add `name`, add `issuanceDate`, change `proof` to an array type.
- `packages/openbadges-core/tests/credentials/serializer.test.ts`: update the "creator" assertion (currently asserts a bare string) to expect a Profile object; add coverage for top-level `name` and `issuanceDate`.
- `packages/openbadges-core/tests/credentials/credential-builder.test.ts`: update the two proof assertions (`result.proof!.type` / `result.proof!.proofValue`) to index into the array.
- `apps/native-rd/src/hooks/useCreateBadge.ts`: wrap the manually-constructed `proof: {...}` literal in `[ ]` (the only other proof-shaping call site in the app — confirmed no other `.proof` reference exists under `apps/native-rd/src`).
- `apps/native-rd/src/hooks/__tests__/useCreateBadge.test.ts`: update the "proof value encoding" test to read `proof[0]` instead of `proof`.

No changes needed to `apps/native-rd/src/badges/credentialBuilder.ts` (its test mocks `serializeOB3` wholesale, and the fix for gap 1 lives in the shared serializer's default per D1) or `apps/native-rd/scripts/verify-badge.ts` (its gap1–4 predicates already handle both old and new shapes: `Array.isArray(proof) ? proof[0] : proof`, `typeof creator === "object"`, etc. — confirmed by reading the script).

## Implementation Plan

### Step 1: Close gaps 1, 3, 4 and the shared half of gap 2 in openbadges-core

**Files**: `packages/openbadges-core/src/credentials/serializer.ts`, `packages/openbadges-core/src/credentials/types.ts`, `packages/openbadges-core/tests/credentials/serializer.test.ts`, `packages/openbadges-core/tests/credentials/credential-builder.test.ts`
**Commit**: `fix(openbadges-core): close OB3 schema gaps 1,3,4 and array-wrap proof`
**Changes**:

- [ ] In `serializer.ts`'s `createVerifiableCredential`, change the `achievement.creator` default from `issuer.id` to `issuerObj` (the Profile object already built above it).
- [ ] Add `name: badgeClass.name` to the top-level VC envelope `result`.
- [ ] Add `issuanceDate: assertion.issuedOn` to the top-level VC envelope `result`, alongside the existing `validFrom`.
- [ ] Wrap the existing `result.proof = {...}` assignment in `[ ]` so it becomes `result.proof = [{...}]`.
- [ ] In `types.ts`, update `VerifiableCredentialData`: add `name: string | Shared.MultiLanguageString;`, add `issuanceDate: string;`, change `proof?: {...}` to `proof?: Array<{ type: string; created?: string; verificationMethod: string; proofPurpose: string; proofValue: string; }>;`.
- [ ] Update `serializer.test.ts`'s `"should use 'creator' (not 'issuer') in achievement per OB3 spec"` test: assert `achievement.creator` is an object (e.g. `toMatchObject({ id: mockIssuer.id, type: ["Profile"] })`) instead of `toBe(mockIssuer.id)`.
- [ ] Add a test asserting the VC envelope has a top-level `name` equal to `mockBadgeClass.name`.
- [ ] Add a test asserting the VC envelope has a top-level `issuanceDate` equal to `mockAssertion.issuedOn`, alongside `validFrom`.
- [ ] Update `credential-builder.test.ts`'s `"should include proof only when required verification fields are present"` test: assert `result.proof![0].type` / `result.proof![0].proofValue` instead of indexing the bare object.
- [ ] Rebuild the package (`bun run build` scoped to `@rollercoaster-dev/openbadges-core`, e.g. via `turbo build --filter=@rollercoaster-dev/openbadges-core`) so native-rd's `workspace:*` dependency picks up the compiled `dist/` before Step 2's tests run.

### Step 2: Close gap 2's native-rd half — proof array in useCreateBadge

**Files**: `apps/native-rd/src/hooks/useCreateBadge.ts`, `apps/native-rd/src/hooks/__tests__/useCreateBadge.test.ts`
**Commit**: `fix(native-rd): emit signed badge proof as an array (OB3 gap 2)`
**Changes**:

- [ ] Wrap the `signedCredential.proof` literal (currently a single `{ type, cryptosuite, created, proofPurpose, verificationMethod, proofValue }` object) in `[ ]`.
- [ ] Update the "proof value encoding" test: read `credential["proof"]` as an array and assert against `proof[0].proofValue` instead of `proof.proofValue`.

## Testing Strategy

- [ ] `packages/openbadges-core`: `bun test` (its own Bun-native runner — this package is not run through `jest-node.sh`) covering the updated `serializer.test.ts` and `credential-builder.test.ts`.
- [ ] `apps/native-rd`: `bun run test --testPathPatterns useCreateBadge` (Jest 30, `@testing-library/react-native` v13, via `scripts/jest-node.sh` — never plain `jest`/`bun test` for this app).
- [ ] `bun run type-check` at the repo root, to catch any other `VerifiableCredentialData.proof`/`.name`/`.issuanceDate` consumers the grep above missed.
- [ ] Manual: earn a badge in the iOS simulator, export it (Export → JSON), then run `bun run verify:badge <exported.json>` and confirm gaps 1–4 read PASS in the "OB 3.0 conformance delta" section, with `signature.iterationA` still PASS (proof array doesn't break the existing sign/verify round-trip since the verify script's byte-reconstruction just omits the `proof` key regardless of its shape).

## Not in Scope

| Item                                                                                                                        | Reason                                                                                                      | Follow-up                              |
| --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Gap 5 (cryptosuite / proof format) and gap 7 (`did:key` resolution)                                                         | Crypto and key-material work; this issue is explicitly "Pure JSON shape, no crypto, no key handling"        | #598                                   |
| Re-running the external validator and refreshing `ob3-compliance-status.md` / `ob3-compliance-status.validator-report.json` | Epic #595 reserves the snapshot refresh and "NOT compliant" TL;DR retirement for the verification sub-issue | #600                                   |
| Migrating or re-signing already-earned badges to the new shape                                                              | Would require re-signing (crypto) — see Decision D5                                                         | none (permanent, unless #598 revisits) |
| Bumping `@rollercoaster-dev/openbadges-core`'s `package.json` version or `CHANGELOG.md`                                     | Package is `"private": true`, workspace-only (`workspace:*`), no `.changeset` tooling exists in this repo   | none                                   |

## Discovery Log

- [2026-08-30] The root `eslint.config.mjs` (used only by lint-staged) imported
  `@eslint/js` without declaring it and had no TypeScript parser, so the
  pre-commit hook crashed the moment a `packages/openbadges-core/**/*.ts` file
  was staged — latent since the mobile extraction, because no core-package
  source file had been committed since. Fixed in its own commit before Step 1.
- [2026-08-30] Verified end-to-end rather than only via unit tests: baked a
  credential through `buildUnsignedCredential` + a real Ed25519 sign, then ran
  `bun run verify:badge`. gaps 1–4 PASS, `signature.iterationA` PASS, gaps 5/6/7
  still FAIL as scoped.
