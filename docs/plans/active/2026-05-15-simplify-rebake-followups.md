# Simplify follow-ups from the rebake-on-reopen branch

Date: 2026-05-15
Origin: `simplify/rebake-on-reopen` /simplify pass (commits bfb1ebc..c8367cb)

The /simplify pass on `simplify/rebake-on-reopen` applied 6 low-risk wins (JSON.stringify dedup, Buffer-based base64, TOCTOU pre-check removed, memo dep tightened, narration comments deleted). The review agents surfaced 6 further findings that are real but each warrants its own scoped change. This plan tracks them as sub-issues under one epic.

Each item below is one sub-issue.

---

## 1. Collapse `freshCapturedPng` + `capturedPng` into one bake source

**Where:** `apps/native-rd/src/hooks/useCreateBadge.ts:79-97, 247-294`

Today `useCreateBadge` takes two PNG params with a priority chain (designer redesign wins over offscreen-host fallback). The hook also has a third internal source — existing on-disk PNG. The two caller-supplied params encode priority semantics the hook shouldn't know about.

**Proposed:** collapse to a single `bakeSource: Buffer | undefined` option. The caller (CompletionFlowScreen) decides which buffer to pass; the hook's internal `readBadgePNG` fallback is the only remaining priority decision inside the hook. Drops the `freshCapturedPngRef`/`capturedPngRef` ref pair.

**Risk:** API change with semantics — confirm callers don't rely on the hook prioritizing freshCapturedPng over capturedPng when both are present.

---

## 2. Extract `hasRealImage(uri)` predicate; move `PLACEHOLDER_IMAGE_URI` to `badgeStorage`

**Where:** `uri && uri !== PLACEHOLDER_IMAGE_URI` repeats across:

- `apps/native-rd/src/hooks/useCreateBadge.ts:259`
- `apps/native-rd/src/hooks/useBadgeExport.ts:17`
- `apps/native-rd/src/screens/CompletionFlowScreen/CompletionFlowScreen.tsx:221`
- `apps/native-rd/src/screens/BadgeDetailScreen/BadgeDetailScreen.tsx:164`
- `apps/native-rd/src/screens/BadgeEarnedModal/BadgeEarnedModal.tsx:53`

The constant currently lives in `useCreateBadge` — leaky abstraction (badge-image-availability is a storage concern, not a hook concern).

**Proposed:** move `PLACEHOLDER_IMAGE_URI` to `badgeStorage.ts` and add `hasRealImage(uri: string | null | undefined): boolean`. Update 5 call sites + 3 test mock files (`BadgeDetailScreen.test.tsx`, `CompletionFlowScreen.test.tsx`, `BadgeEarnedModal.test.tsx`, `useBadgeExport.test.ts`). The hook re-exports the constant for back-compat if needed.

---

## 3. `pendingDesignStore` Buffer-native API

**Where:** `apps/native-rd/src/stores/pendingDesignStore.ts` + 3 callers.

The store currently exchanges base64 strings, forcing every caller to do `Buffer.from(x.pngBase64, "base64")` or `pngBuffer.toString("base64")`:

- `BadgeDesignerScreen.tsx:524, 628` — encode
- `CompletionFlowScreen.tsx:363, 705, 713` — decode

**Proposed:** change `PendingDesignEntry.pngBase64: string` to `pngBytes: Buffer` and have `set`/`get`/`consume` deal in Buffers. Removes 5 conversion hops.

---

## 4. Collapse `pendingDesign` + `pendingCapturedPng` state pair

**Where:** `apps/native-rd/src/screens/CompletionFlowScreen/CompletionFlowScreen.tsx:699-715`

Two `useState` slots that always move together — one is the store entry, the other is its decoded Buffer. The Buffer is derived state.

**Proposed:** single `useState<{ designJson: string; pngBuffer: Buffer } | undefined>`. Decode once in the consume callback. (Naturally composes with #3 above — if `pendingDesignStore` returns a Buffer, this consolidation is trivial.)

---

## 5. Derive `phase` from props instead of `useState`+`useEffect`

**Where:** `apps/native-rd/src/screens/CompletionFlowScreen/CompletionFlowScreen.tsx:138-158`

The initial phase computation at L145-148 and the advance-effect at L150-158 repeat the same `isReCompletion ? hasFreshEvidence : hasGoalEvidence` logic. Phase is fully a function of `isReCompletion`, `hasFreshEvidence`, `hasGoalEvidence`.

**Proposed:** derive `phase` directly in render. Move `AccessibilityInfo.announceForAccessibility` into a `useEffect` watching phase transitions only, so the a11y announcement still fires once when the user enters celebration.

**Risk:** the announcement effect must keep firing exactly once on the evidence-prompt → celebration transition. Add a regression test before changing.

---

## 6. JSX flattening

**Where:**

- `CompletionFlowScreen.tsx:563-598` — nested ternary in `showBakeChoice ? (...) : (...)` returns two different `<View styles.actions>` blocks. Extract `<BakeChoiceActions />` and `<PostBakeActions />` components.
- `CompletionFlowScreen.tsx:436-448, 519-528` — `iconContainer` + `iconEmoji` duplicated across phases with only the emoji differing. Extract once.

Low ROI; cosmetic. Pair with any other CompletionFlow change above.

---

## Order & dependencies

- 3 → 4 (#4 trivially follows #3)
- All others independent

Pick up in any order. None block the rest of the branch from merging.
