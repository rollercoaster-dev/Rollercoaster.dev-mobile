# Development Plan: Issue #599

## Issue Summary

**Title**: [Bug] Badge export never bakes the credential — exported PNGs carry no iTXt chunk
**Type**: bug (regression-test gap; production bug already fixed)
**Complexity**: SMALL
**Estimated Lines**: ~120-160 lines (tests only)

## Key Finding — read before implementing

The bug as described (`BadgeDetailScreen.tsx:241-245` branching on `design ?` to call a
re-rasterizing `exportDesignImage`, skipping `bakePNG`) **no longer exists on `main`**.
It was fixed by `6d65787a` — "fix(native-rd): bake-aware badge export + local verifier (#96)"
— merged the same day (2026-05-18) as the linked research doc, three months before this
issue was filed (2026-08-23). Verified on this branch (`fix/issue-599-bake-credential-export`,
0 commits ahead of `main`):

- `exportDesignImage` does not exist anywhere in `apps/native-rd/src` (confirmed via grep).
- `BadgeDetailScreen.tsx` now calls `exportVerifiableBadge(imageUri, ...)` / `exportImage(imageUri)`
  unconditionally — both always forward `badge.imageUri` (the on-disk **baked** file), never the
  live `design`. `useBadgeExport.ts` never re-rasterizes.
- `png-chunk-utils.ts::createiTXtChunk` hardcodes the compression flag byte to `0` — already
  spec-uncompressed.
- `png-baking.ts` already uses `openbadgecredential` as `OB3_KEYWORD`.
- `useCreateBadge.ts:331` calls `bakePNG(pngBuffer, signedCredential)` and then persists
  `credential: signedCredential` on the same badge record (`useCreateBadge.ts:381/386`) — the
  exact same string is baked into the PNG and stored for JSON export. Guaranteed identical by
  construction, not just by accident.
- `BadgeDetailScreen.test.tsx` already has a named regression test (`it.each`, lines ~573-602)
  pinning that both `share-row-verifiable` and `share-row-image` forward the baked `imageUri`
  even when `design` is set — this is the wiring-level version of the exact bug this issue
  describes.

**What's actually missing**, matching the issue's literal "Done when" line ("Regression test
pins the chunk"): every existing test either (a) unit-tests `bakePNG`/`unbakePNG` symmetrically
— a bug that corrupted the keyword identically on both the write and read side would still pass
— or (b) mocks `bakePNG` entirely in `useCreateBadge.test.ts` (`expect.any(String)`, not the
exact persisted value). Nothing asserts, independently of the module's own round-trip, that the
literal byte sequence `"openbadgecredential"` is what ends up in the iTXt keyword field, and
nothing asserts that the string baked into the PNG is _identical_ to the string persisted as
`badge.credential` (the value `exportJSON` ships verbatim — already pinned in
`useBadgeExport.test.ts`).

This plan closes that gap. No production code changes are anticipated.

## Intent Verification

- [ ] A test parses a real `bakePNG(...)` output with `extractChunks` + `findiTXtChunk` and
      fails if the keyword byte sequence is anything other than the literal string
      `"openbadgecredential"` — independent of `unbakePNG`'s own keyword search.
- [ ] A test fails if the iTXt chunk's compression flag byte is non-zero (spec: "must not be
      used").
- [ ] A test fails if `useCreateBadge`'s `bakePNG(...)` second argument ever diverges from the
      `credential` field persisted via `createBadge`/`updateBadge`, for both the initial-bake and
      re-bake code paths.

## Dependencies

| Issue | Title                                                         | Status  | Type                                         |
| ----- | ------------------------------------------------------------- | ------- | -------------------------------------------- |
| #595  | Epic: OB3 external verification — make a badge verify outside | 🟡 Open | Soft (parent epic, "Part of", not a blocker) |

**Status**: ✅ All dependencies met — #595 is a tracking epic, not a hard blocker.

## Objective

Add regression coverage that pins the two remaining unverified claims in the issue's "Done
when": the literal OB3 `iTXt` `openbadgecredential` keyword (uncompressed), and byte-identical
credential content between the baked PNG and the JSON export. No behavior change — the
underlying export-path bug is already fixed on `main`.

## Decisions

| ID  | Decision                                                                                                                              | Alternatives Considered                                  | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Test-only PR; no production code changes                                                                                              | Re-verify/re-implement the fix from scratch              | Grep + read confirms `exportDesignImage` is gone and both export paths already forward `imageUri` unconditionally; a wiring regression test for this already exists in `BadgeDetailScreen.test.tsx`. Redoing already-shipped work would be pure churn.                                                                                                                                                                                                                                                                   |
| D2  | Assert the iTXt keyword via a fresh `extractChunks`/`findiTXtChunk` call rather than trusting `unbakePNG`'s round-trip                | Rely on existing `bakePNG`/`unbakePNG` roundtrip tests   | Bake and unbake both read `OB3_KEYWORD`/`BAKING_KEYWORDS` from the same module constants — a symmetric typo in that constant would still round-trip green. A test that hardcodes the literal string `"openbadgecredential"` catches that class of bug; the existing tests don't.                                                                                                                                                                                                                                         |
| D3  | Do not add a full RN-hook-level integration test wiring real `bakePNG` output through `useBadgeExport`'s `Sharing`/`FileSystem` mocks | Build an end-to-end integration test spanning both hooks | `useBadgeExport` never parses or touches PNG bytes — `exportImage`/`exportVerifiableBadge` treat `imageUri` as an opaque path and hand it to `Sharing.shareAsync` / `FileSystem` verbatim. An integration test there would only re-prove plumbing already covered by `BadgeDetailScreen.test.tsx`'s existing `it.each` regression test (forwards baked `imageUri` regardless of `design`) and `useBadgeExport.test.ts`'s exact-string `exportJSON` assertion. Lower value than the byte-level and identity checks below. |

## Affected Areas

- `apps/native-rd/src/badges/__tests__/pngBaking.test.ts`: new assertions pinning the literal
  `openbadgecredential` keyword and uncompressed flag on real `bakePNG` output.
- `apps/native-rd/src/hooks/__tests__/useCreateBadge.test.ts`: strengthen existing bake/re-bake
  tests to assert `bakePNG`'s credential argument is byte-identical to the persisted
  `credential` field, not just `expect.any(String)`.

## Implementation Plan

### Step 1: Pin the literal iTXt keyword and uncompressed flag on real baked bytes

**Files**: `apps/native-rd/src/badges/__tests__/pngBaking.test.ts`
**Commit**: `test(native-rd): pin OB3 iTXt openbadgecredential keyword + uncompressed flag`
**Changes**:

- [ ] Import `extractChunks`, `findiTXtChunk` from `../png-chunk-utils`.
- [ ] New test: bake `CREDENTIAL_STUB` into a generated PNG, call `extractChunks` +
      `findiTXtChunk(chunks, "openbadgecredential")` directly (not via `unbakePNG`), assert the
      chunk is found. Use the literal string, not the module's `OB3_KEYWORD` export (it isn't
      exported — that's intentional; re-importing the constant would make the test tautological).
- [ ] New test: from the same chunk, walk past the null-terminated keyword and assert the
      compression-flag byte is `0`.

### Step 2: Pin baked-bytes/persisted-credential identity in `useCreateBadge`

**Files**: `apps/native-rd/src/hooks/__tests__/useCreateBadge.test.ts`
**Commit**: `test(native-rd): assert baked PNG credential matches persisted badge.credential`
**Changes**:

- [ ] In the existing "creates badge" happy-path test (`WITH_PNG`), capture
      `mockBadges.bakePNG.mock.calls[0][1]` and `mockCreateBadge.mock.calls[0][0].credential`;
      assert strict equality (`toBe`), replacing/augmenting the current `expect.any(String)`
      shape.
- [ ] Do the same in the re-bake tests (`freshCapturedPng` path → `mockUpdateBadge`, and
      `readBadgePNG`-of-existing-imageUri path → `mockUpdateBadge`): `bakePNG`'s credential
      argument must equal the `credential` field passed to `updateBadge`.

## Testing Strategy

- [ ] `bun run test --testPathPatterns "pngBaking|useCreateBadge"` — scoped run for the touched
      suites (Jest 30, run via `scripts/jest-node.sh`, never plain `jest`/`bun test`).
- [ ] `bun run test` — full suite, confirm no regressions elsewhere.
- [ ] `bun run type-check` and `bun run lint`.
- [ ] No manual device testing needed — test-only change, no runtime code touched.

## Not in Scope

| Item                                                                       | Reason                                                                                                         | Follow-up |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------- |
| Re-fixing the `design ?` export branch                                     | Already fixed on `main` by #96; verified via grep, no `exportDesignImage` remains                              | none      |
| Messenger transcode handling (Telegram photo mode strips iTXt)             | Explicitly out of scope per issue; receiver-side, no in-app fix exists                                         | none      |
| Hosted verification link / Tier 3 (OB 3.0 §5.2 web resource)               | Separate architectural work, tracked under the parent epic                                                     | #595      |
| Full RN-hook integration test spanning `useCreateBadge` → `useBadgeExport` | `useBadgeExport` never touches PNG bytes; existing wiring + exact-string tests already cover the seam (see D3) | none      |

## Discovery Log

- [2026-09-03] Confirmed via `git log --oneline main..HEAD` (empty) and grep for
  `exportDesignImage` (zero results in `apps/native-rd/src`) that the production bug described
  in this issue was already fixed by PR #96 (`6d65787a`, merged 2026-05-18) before the issue was
  filed (2026-08-23). Scope narrowed from "fix the export path" to "close the regression-test gap
  the issue's own 'Done when' line calls out."
