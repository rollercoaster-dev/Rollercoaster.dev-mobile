# Badge Export Fix — Tier 1 + Tier 2 Implementation Plan

**Date:** 2026-05-18
**Branch:** `sentry-investigation-badges-not-baking`
**Research doc:** [`../research/badge-export.md`](../research/badge-export.md)
**Status:** Approved, implementing

---

## Context

Production bug: exported badges contain no OpenBadges credential — users get a flat picture, not a verifiable badge. Empirical proof in the research doc: the user-supplied `badge-export-1779100463829.png` has chunk inventory `IHDR, sRGB, eXIf, pHYs, iDOT, IDAT, IDAT, IEND` — no `iTXt`, no credential, no signed VC.

Root cause: `BadgeDetailScreen.tsx:241-245` branches on `design ?` and calls `exportDesignImage` (which re-rasterizes via `react-native-svg`'s `toDataURL` — `bakePNG` is never invoked). The actually-baked PNG at `badge.imageUri` is ignored. Every badge with a designer-saved `design` field hits this branch; in practice that's most badges.

Why tests didn't catch it: the existing `BadgeDetailScreen` test fixture omits `design`, so the broken branch is never exercised; the existing `useBadgeExport.test.ts` tests cover `exportDesignImage` thoroughly but `exportDesignImage` is dead code outside the bug site.

This PR ships **Tier 1** (one-line fix to stop the bleeding) + **Tier 2** (honest export UX with Android SAF) per the research doc, plus an explanation doc, plus a roadmap entry capturing **Tier 3** (hosted verification URL) as deferred work on Iteration B.

---

## Approach

Single PR, multiple commits, separable for cherry-pick if needed.

### Commit 1 — Tier 1: stop the bleeding (1 line + regression test)

**Files modified:**

- `apps/native-rd/src/screens/BadgeDetailScreen/BadgeDetailScreen.tsx:241-247`
  - Replace ternary `onPress={() => design ? exportDesignImage(...) : exportImage(imageUri)}` with `onPress={() => exportImage(imageUri)}`.
  - Update `disabled={!design && !hasRealImage}` → `disabled={!hasRealImage}`.
  - Remove `exportDesignImage` from the `useBadgeExport()` destructure (line 123).
  - `badgeRendererRef` is still used by the floating preview — keep that.
- `apps/native-rd/src/screens/BadgeDetailScreen/__tests__/BadgeDetailScreen.test.tsx`
  - Add a regression test: `makeRow({ design: '<some serialized BadgeDesign>', imageUri: 'file:///badges/badge.png' })` → press "Save Image" → assert `mockExportImage` called with `'file:///badges/badge.png'` (not with the ref+design).
  - This is the missing fixture that hid the bug.

### Commit 2 — Tier 2: honest export UX + Android SAF

**Files modified:**

- `apps/native-rd/src/hooks/useBadgeExport.ts`
  - Delete `exportDesignImage` entirely (no remaining callers after Commit 1).
  - Add `exportVerifiableBadge(imageUri: string | null)`:
    - **iOS:** `Sharing.shareAsync(imageUri, { UTI: "public.png", mimeType: "image/png", dialogTitle: "Export Verifiable Badge" })` — identical bytes to `exportImage` today, just labelled honestly.
    - **Android:** `FileSystem.StorageAccessFramework.createFileAsync(...)`. Prompt user for a destination folder via `requestDirectoryPermissionsAsync`, write the baked PNG bytes (read via `readAsStringAsync(uri, { encoding: Base64 })` then `writeAsStringAsync` into the SAF URI). Bypasses the share sheet → bypasses the messenger photo trap.
  - Keep `exportImage` (for the "Save as Image" lossy/picture path) and `exportJSON` (unchanged).
- `apps/native-rd/src/hooks/__tests__/useBadgeExport.test.ts`
  - Delete the six `exportDesignImage` tests (`:227-340`).
  - Add tests for `exportVerifiableBadge`:
    - iOS: calls `Sharing.shareAsync` with `public.png` UTI.
    - Android: calls `StorageAccessFramework.requestDirectoryPermissionsAsync` + `createFileAsync` + `writeAsStringAsync` with the baked PNG base64.
    - Both: bails with alert when `imageUri` is null or placeholder.
  - Mock `Platform.OS` and `FileSystem.StorageAccessFramework` in tests.
- `apps/native-rd/src/screens/BadgeDetailScreen/BadgeDetailScreen.tsx` (export Card, lines 235-259)
  - Replace single "Save Image" button with three buttons:
    1. **"Export Verifiable Badge"** → `exportVerifiableBadge(imageUri)`. Loading: `isExportingImage`. Disabled: `!hasRealImage`. `accessibilityLabel` + `accessibilityRole`.
    2. **"Export Credential (JSON)"** (already exists, keep) → `exportJSON(credential, goalTitle)`. Promote in visual order.
    3. **"Save as Image"** → `exportImage(imageUri)`. Disabled: `!hasRealImage`. `accessibilityHint`: "Shares this badge as a picture. The credential may be lost when sent through messengers."
  - Add a short `<Text variant="caption">` below the buttons: "Export Verifiable Badge keeps the OpenBadge credential. Save as Image is just a picture — some apps strip the proof when sharing."
  - Verify 44×44pt touch targets via existing `Button` component.
- `apps/native-rd/src/screens/BadgeDetailScreen/__tests__/BadgeDetailScreen.test.tsx`
  - Add tests for all three new buttons: renders, disabled state, calls the right hook with the right args.

### Commit 3 — Docs: explanation of bake/export

**New file:** `apps/native-rd/docs/badges/export-and-bake.md`

Sections (concise, no fluff):

- What "baking" means in OpenBadges 3.0 (§5.3 PNG iTXt with `openbadgecredential` keyword).
- Where baking happens in this codebase: `useCreateBadge.ts:266` (`bakePNG(pngBuffer, credentialJsonOut)` → `saveBadgePNG`).
- Why iTXt matters and how messengers break it (photo vs file mode; JPEG transcode).
- The three export paths and what each guarantees (verifiable / json / lossy image).
- Android SAF vs share sheet trade-off.
- How to verify a PNG is baked: `pngcheck -t badge.png` or look for `iTXt` chunk with keyword `openbadgecredential`.
- Failure modes no UX can solve (screenshots; recipient re-shares as photo).
- Link to research doc (`docs/research/badge-export.md`) and OB 3.0 spec.

### Commit 4 — Roadmap: Tier 3 added to Iteration B

**File modified:** `apps/native-rd/docs/decisions/ADR-0001-iteration-strategy.md`

In the `## Iteration B — Learning Journey` section (line 91):

- Append a bullet to **Scope (adds to A):** (around line 106):
  `- Hosted verifiable badge link — share a verification URL (badges.rollercoaster.dev/v/<id>) instead of a PNG; survives every messenger transport. Promote as primary export action, demote PNG/JSON to secondary download. Industry-standard delivery for OB 3.0 (Credly, Open Badge Factory, Accredible, Canvas Credentials). See apps/native-rd/docs/research/badge-export.md §5 Tier 3.`
- Append a row to **What already exists toward B** table:
  `| Hosted verifiable badge link | No — no verifier endpoint, no public badge IDs | No — Tiers 1+2 ship PNG/JSON export only | Requires backend: stateless verifier route, signed-VC fetch, verification UI. Offline verification lost; pair with QR fallback. |`

Rationale for placing it here: Iteration B already commits to multi-device sync (server presence), and the hosted verifier rides the same backend surface. Thematically also fits "Learning Journey" since sharing verifiable progress with mentors/employers is part of the learner's external journey.

### Commit 5 — Promote research doc + plan

- Move `apps/native-rd/docs/research/badge-export.md` from untracked → tracked.
- Add this plan to `apps/native-rd/docs/plans/index.md` under Active.
- If `docs/research/` has an index, add the research doc there too.

---

## Functions to reuse

- `Sharing.shareAsync` (`expo-sharing`) — already used; `useBadgeExport.ts:38, 99, 163`.
- `FileSystem.StorageAccessFramework` (`expo-file-system/legacy` v55) — new usage; full API at <https://docs.expo.dev/versions/latest/sdk/filesystem-legacy/>.
- `bakePNG`, `saveBadgePNG`, `readBadgePNG` (`@rollercoaster-dev/openbadges-core`) — already wired; no changes.
- `Button` component — already used; 44×44pt touch targets baked in.

## Functions to delete

- `exportDesignImage` in `useBadgeExport.ts:57-125` (sole caller is the bug site).
- Six `exportDesignImage` describe-block tests in `useBadgeExport.test.ts:227-340`.

---

## Verification

Local:

1. `bun run type-check` — green.
2. `bun run lint` — green.
3. `bun test --testPathPatterns useBadgeExport` — green, new tests pass.
4. `bun test --testPathPatterns BadgeDetailScreen` — green, regression test passes.

iOS device/sim (`bun run native:ios`):

5. Create a badge via the designer flow (ensures `design` is populated → exercises the previously-broken path).
6. Open BadgeDetail → tap "Export Verifiable Badge" → AirDrop to Mac → run `pngcheck -t <file>` → assert `iTXt` chunk present with keyword `openbadgecredential`.
7. Tap "Export Credential (JSON)" → save to Files → open the file → assert it parses as VC JSON-LD.
8. Tap "Save as Image" → save to Photos → assert image opens (no claim on metadata).

Android (when build available):

9. Tap "Export Verifiable Badge" → folder picker appears (not share sheet) → pick Downloads → assert PNG written and `pngcheck -t` shows `iTXt`.
10. Tap "Save as Image" → share sheet appears with photo targets.

---

## Out of scope (explicit)

- Tier 3 (hosted verification URL + backend) — captured in Commit 4 roadmap entry on Iteration B.
- Re-baking existing on-disk badges that were saved without `iTXt` due to the bug — separate concern; tracked in `2026-05-14-badge-rebake-on-reopen.md` already.
- Apple Wallet / Google Wallet integration — neither accepts OB 3.0 VCs yet (research doc §2).
- JPEG-transcode mitigation on the receiver side — unsolvable from issuer-side code.

---

## Risk / open questions accepted in defaults

- **Android SAF folder picker only** (no share-sheet fallback). Cleanest UX, matches research doc; trade-off is unfamiliarity vs. messenger-photo trap. Revisit if users complain.
- **`exportDesignImage` deletion is irreversible from this PR's diff alone** — but it's bisectable from git history. The function has no callers outside the bug, so deletion is correct.
