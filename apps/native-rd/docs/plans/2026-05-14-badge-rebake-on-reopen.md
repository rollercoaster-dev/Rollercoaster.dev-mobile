# Badge Rebake on Reopen + Re-Completion

**Status:** Shipped on `lowly-agreement` + PR [#29](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/pull/29) — **blocked by a regression**: after a confirmed rebake, the `BadgeEarnedModal` opens but the badge image slot is completely empty (no image AND no 🏅 placeholder fallback). Two fix attempts have not resolved it; see [Open regression](#open-regression-post-rebake-modal-empty-2026-05-14) at the bottom.
**Tracking issue:** [#15](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/15)
**PR:** [#29](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/pull/29)
**Created:** 2026-05-14 · **Last updated:** 2026-05-14
**Related:**

- [2026-05-14-badge-completion-flow.md](./2026-05-14-badge-completion-flow.md) — flow spec + flowchart + microcopy; read first for the desired behaviour, then this doc for the implementation sketch.
- [2026-05-14-android-bug-triage.md](./2026-05-14-android-bug-triage.md) — same session; the reopen-loop fix landed there, this is the follow-up feature it surfaced.

## Branching

**Start fresh from `main`.** The stale `feat/15-badge-rebake-on-reopen` branch (`29114b3`, `e4c022a`, `a2ddbd3`, `0c3bc26`, `3c7b875`) is **not** the basis for this work. Its rebake path used `createBadge` + soft-delete rather than `updateBadge`, predates the three-button Alert and the Redesign-first path, and predates the modal hardening below. Cherry-pick from it only if a specific helper (e.g. `credentialDiff`) is genuinely reusable; otherwise leave it.

## Context

After the reopen-loop fix in `FocusModeScreen.tsx:247`, a user can now reopen a completed goal, add evidence / steps, and re-complete it without being force-navigated to the celebration screen. **However, on legitimate re-completion the badge is not re-baked.**

Current behaviour in `useCreateBadge.ts:124-128`:

```ts
if (existingBadge) {
  setStatus("done");
  return;
}
```

When a badge already exists, `useCreateBadge` short-circuits to `"done"` and `BadgeEarnedModal` pops with the original (now stale) badge image and credential — even though the user added new evidence after reopening. The credential's `evidence[]` is frozen at the time of the first bake.

A compounding bug: `BadgeEarnedModal.tsx:83-99` has no `onError` fallback. When the existing `imageUri` resolves but the file is unreadable (e.g. clean install with restored Evolu state, broken save on first bake), the image slot renders empty — see the screenshot attached to the original investigation.

We want:

1. When the user reopens, updates, and re-completes a goal, prompt them with three options: cancel, rebake with the existing design, or redesign first and then rebake.
2. The modal stops rendering empty when an image URI doesn't resolve.

## Desired behaviour

See [the flow spec](./2026-05-14-badge-completion-flow.md) for the full flowchart and journey walkthroughs. Summary:

1. **Detect "rebake needed":** existing badge + `goal.status === active` (reopen) + the credential's snapshot diverges from the current goal/evidence state.
2. **Confirmation prompt:** native `Alert.alert` with three buttons (copy in the spec's [Microcopy](./2026-05-14-badge-completion-flow.md#microcopy) section):
   - **Cancel** → `navigation.goBack()` to FocusMode. Goal stays `active`.
   - **Rebake** → rebake with `existingBadge.design`.
   - **Redesign first** → navigate to `BadgeDesigner` with `mode: "redesign"` and a return-action signal; on save, the offscreen capture in `CompletionFlowScreen` produces a new PNG from the updated design and the rebake proceeds.
3. **Rebake pipeline:** rebuild credential with current evidence, re-sign, re-bake PNG, persist via `updateBadge` (already exists at `db/queries.ts:976`), then `completeGoal`. The modal then shows the new image.
4. **Reopen + re-complete with NO changes** (accidental reopen): silent `completeGoal`, no prompt, modal shows the original badge unchanged.

## Open design decisions

Resolved in the spec — restated for quick reference:

| Question                  | Decision                                                                                                                                                                                                                               |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What counts as "updated"? | Diff vs credential snapshot: `evidence[]` count, `goal.title`, `goal.description`. Catches the common "added evidence" case.                                                                                                           |
| Cancel UX                 | Back to FocusMode, goal stays `active`.                                                                                                                                                                                                |
| Rebake design source      | Default: `existingBadge.design` if set, else `createDefaultBadgeDesign(goal.title, goal.color)`. User can override via **Redesign first** (saves new design through existing redesign mode, then offscreen capture picks it up).       |
| Confirmation UI           | Native `Alert.alert`, three buttons.                                                                                                                                                                                                   |
| Microcopy                 | See spec [Microcopy](./2026-05-14-badge-completion-flow.md#microcopy) section; aligned with `~/Code/rollercoaster.dev/landing/docs/BRAND_LANGUAGE.md`.                                                                                 |
| New status name           | `"rebake-required"`                                                                                                                                                                                                                    |
| Return-signal mechanism   | Route param `returnAction: "rebake"` on `navigate("BadgeDesigner", …)`. `BadgeDesignerScreen` reads it and on save navigates back with a matching param; `CompletionFlowScreen` reads that param on focus and flips `rebakeConfirmed`. |

## Implementation sketch

Ordered by suggested commit boundaries. Each commit should be self-contained and green.

### Commit 1 — `BadgeEarnedModal` onError fallback

Independent of #15; lands the modal-hardening fix so a broken `imageUri` no longer renders an empty slot.

- `apps/native-rd/src/screens/BadgeEarnedModal/BadgeEarnedModal.tsx`
  - Add `imageLoadFailed` local state, mirroring `BadgeDetailScreen.tsx:117`.
  - Wire `onError={() => setImageLoadFailed(true)}` on the `<Image>` (mirror of `BadgeDetailScreen.tsx:306`).
  - Update `hasImage` to also be `false` when `imageLoadFailed`.
  - Reset `imageLoadFailed` when `imageUri` changes (effect or memoised key).
- Test: render with a URI that triggers `onError`; assert the placeholder appears.

### Commit 2 — `hasChangesSinceBake` helper + status extension

Pure-logic addition with no UI changes.

- `apps/native-rd/src/badges/credentialDiff.ts` (new) — `hasChangesSinceBake(credentialJson, currentGoal, currentEvidence)`. Parse credential JSON, return `true` if `evidence[].length`, `goal.title`, or `goal.description` differ from snapshot.
- Tests: covers equal snapshot, evidence-added, title-changed, description-changed, malformed JSON (must not throw — return `true` to fall back to "rebake offered").

### Commit 3 — `useCreateBadge` rebake branch

- Extend `BadgeCreationStatus` with `"rebake-required"`.
- Add option `confirmRebake?: boolean`.
- Restructure the existing-badge branch:
  ```ts
  if (existingBadge) {
    if (goal.status === GoalStatus.completed) {
      setStatus("done");
      return;
    }
    if (!hasChangesSinceBake(existingBadge.credential, goal, gev)) {
      completeGoal(goalId, goalEvidenceForGating);
      setStatus("done");
      return;
    }
    if (!confirmRebake) {
      setStatus("rebake-required");
      return;
    }
    // confirmed — fall through to bake IIFE
  }
  ```
- In the bake IIFE, when `existingBadge` is set, replace `createBadge({ … })` with `updateBadge(existingBadge.id, { credential, imageUri })`. The `design` column stays untouched on this call (Redesign-first wrote it earlier in its own flow).
- Tests:
  - `existingBadge` + `active` + changes detected → returns `"rebake-required"`, no DB writes.
  - Same + `confirmRebake: true` → `updateBadge` (not `createBadge`), then `completeGoal`.
  - Same + no changes detected → silent `completeGoal`, status `"done"`.
  - `existingBadge` + `completed` → idempotent `"done"`, no DB writes.
  - Malformed `existingBadge.credential` → treated as "changes detected" (fail-open into the Alert).

### Commit 4 — `CompletionFlowScreen` Alert + state

- Local state `rebakeConfirmed: boolean`.
- Pass `confirmRebake: rebakeConfirmed` to `useCreateBadge`.
- Effect on `badgeStatus === "rebake-required"`: fire `Alert.alert(title, body, [Cancel, Rebake, Redesign first])` using the copy in the spec.
  - **Cancel** → `navigation.goBack()`.
  - **Rebake** → `setRebakeConfirmed(true)`.
  - **Redesign first** → `navigation.navigate("BadgeDesigner", { mode: "redesign", badgeId, returnAction: "rebake" })`.
- Offscreen fallback host (`CompletionFlowScreen.tsx:312-329`): currently fires only when `pendingDesignStore` is empty _and_ no existing badge. Extend the gating so it also fires for the rebake path keyed on `existingBadge.design` (or `createDefaultBadgeDesign(…)` when `design` is null). The capture feeds the same `capturedPngForBake` slot that's already wired into `useCreateBadge`.
- On focus, check route params for `returnAction === "rebake"`; if set, `setRebakeConfirmed(true)` and clear the param via `navigation.setParams(…)`.
- Modal microcopy variant: pass an `isRebake` boolean (or derive from a third condition) so `BadgeEarnedModal` can show `Badge updated.` with a matching `accessibilityLabel`.
- Tests:
  - Renders Alert with three buttons when status is `"rebake-required"`.
  - **Rebake** tap sets `confirmRebake` and the hook is called again.
  - **Cancel** tap calls `navigation.goBack()`.
  - **Redesign first** tap calls `navigation.navigate("BadgeDesigner", { mode: "redesign", badgeId, returnAction: "rebake" })`.
  - Route param `returnAction: "rebake"` on focus flips `rebakeConfirmed` and clears the param.

### Commit 5 — `BadgeDesignerScreen` return-action wiring

- `apps/native-rd/src/navigation/types.ts` — extend `BadgeDesigner` redesign params with optional `returnAction?: "rebake"`.
- `apps/native-rd/src/screens/BadgeDesignerScreen/BadgeDesignerScreen.tsx`:
  - In the existing `redesign` mode (`BadgeDesignerScreen.tsx:487-502`), after `updateBadge(badgeId, { design })` succeeds, branch on `route.params.returnAction`:
    - `"rebake"` → `navigation.navigate("CompletionFlow", { goalId, returnAction: "rebake" })` (preferring `goBack` if the stack already has `CompletionFlow` underneath — likely the case here since we navigated forward to the designer).
    - default → existing `navigation.goBack()`.
  - **Back / Cancel** never flips the return signal — user gets the Alert again on focus.
- Tests: redesign save with `returnAction: "rebake"` navigates back with the matching param; without it, falls back to `goBack`.

### Commit 6 — Microcopy + a11y label variant in `BadgeEarnedModal`

- `BadgeEarnedModal.tsx:56` — add the `Badge updated.` variant (third branch).
- `BadgeEarnedModal.tsx:62` — switch `accessibilityLabel` to `"Badge updated"` for the rebake variant.
- Tests: rebake variant renders `Badge updated.` with the matching a11y label.

## Critical files

- `apps/native-rd/src/hooks/useCreateBadge.ts` — status + branching + rebake path
- `apps/native-rd/src/badges/credentialDiff.ts` — new `hasChangesSinceBake` helper
- `apps/native-rd/src/screens/CompletionFlowScreen/CompletionFlowScreen.tsx` — Alert + state + offscreen-host gating + return-param handling + modal variant prop
- `apps/native-rd/src/screens/BadgeDesignerScreen/BadgeDesignerScreen.tsx` — return-action wiring in redesign-mode save
- `apps/native-rd/src/screens/BadgeEarnedModal/BadgeEarnedModal.tsx` — `onError` fallback + rebake variant
- `apps/native-rd/src/navigation/types.ts` — `returnAction` param
- `apps/native-rd/src/db/queries.ts:976` — `updateBadge` (already supports the fields we need; no change)

## Verification

1. `bun run type-check && bun run lint && npx jest --no-coverage --testPathPatterns "useCreateBadge|CompletionFlow|BadgeEarnedModal|BadgeDesigner|credentialDiff"`
2. Manual flow on iOS simulator and a connected Android device (load `native-rd-build` skill for build commands):
   - **Happy path:** create goal, design badge, add evidence, complete → badge appears with image.
   - **Modal hardening (commit 1):** force the existing badge's imageUri to a non-existent path (e.g. via dev tools or DB) and re-open the celebration → modal shows the placeholder, not an empty slot.
   - **Accidental reopen (no changes):** reopen the goal, immediately complete final step → no Alert, modal shows the original badge.
   - **Rebake with existing design:** reopen, add evidence, complete → Alert → tap **Cancel** → returns to FocusMode, goal stays `active`. Re-trigger completion → Alert → tap **Rebake** → modal shows a new image; credential evidence count reflects the additions.
   - **Redesign first:** reopen, add evidence, complete → Alert → tap **Redesign first** → BadgeDesigner opens seeded with current design → change something → save → returns to CompletionFlow → rebake fires automatically → modal shows the redesigned new image.
   - **Back from designer without saving:** same setup → tap **Redesign first** → back-gesture out of the designer → Alert reappears.
3. Regression: complete a fresh goal — no Alert, no extra prompt, normal flow.
4. Accessibility: VoiceOver / TalkBack reads the rebake-variant microcopy correctly and announces the modal as `"Badge updated"`.

## Landed work (PR #29, branch `lowly-agreement`)

Commits on top of `main` (most recent first):

| Commit    | Scope                                                                                                                                                                    |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `41407e8` | **fix(native-rd):** post-rebake modal image — verify save in `saveBadgePNG`, remount `<Image>` on URI change via `key={imageUri}`. **DID NOT FIX the regression below.** |
| `ea0ff23` | refactor(native-rd): extract `mergeEvidenceRows` + share `expectedAchievementDescription` (drive-by `/simplify` pass).                                                   |
| `17f4ea6` | chore(native-rd): credentialDiff prefers `readonly T[]` over `ReadonlyArray<T>` (lint nit).                                                                              |
| `3a0efb0` | feat(native-rd): BadgeDesignerScreen redesign-mode rebake return signal.                                                                                                 |
| `6ea0552` | feat(native-rd): CompletionFlowScreen rebake alert + offscreen-host re-seed + modal `isRebake` variant + return-param consumer.                                          |
| `839fd3a` | feat(native-rd): branch `useCreateBadge` on existing-badge state for re-completion (5 paths: completed / no-diff silent / rebake-required / confirmed / first-bake).     |
| `8d47a5c` | feat(native-rd): add `hasChangesSinceBake` credential-diff helper.                                                                                                       |
| `113c386` | fix(native-rd): `BadgeEarnedModal` falls back to placeholder on image load failure (`onError`).                                                                          |
| `d435a13` | docs(plans): add badge completion flow spec + refresh rebake plan.                                                                                                       |

Local jest: 146 tests pass across `useCreateBadge | CompletionFlow | BadgeEarnedModal | badgeStorage | credentialDiff | BadgeDesigner`. Type-check + lint clean on changed files. **Automated test coverage does not catch the open regression — it's a runtime-only failure on iOS.**

## Open regression: post-rebake modal empty (2026-05-14)

### Symptom (from on-device test)

After a confirmed **Rebake** path through the new Alert:

1. Alert fires, three buttons visible.
2. User taps **Rebake**.
3. Modal opens with View Badge / Customize / Keep going buttons + microcopy.
4. **The 120×120 badge image slot is completely empty.** Not the 🏅 placeholder — fully blank.

This is the _exact_ symptom from the original report (#15) that motivated the modal hardening commit (`113c386`). Despite that hardening + two follow-up defensive fixes, the slot is still empty on rebake.

The user has not confirmed whether the same regression hits the **Redesign first** path — only **Rebake** has been verified to break. The silent-complete path (no diff, accidental reopen) and the first-bake happy path have not been re-verified post-rebake-fix.

### What's been tried (and didn't fix it)

1. **`onError` fallback on `<Image>`** (`113c386`): if the URI resolves but the file can't load, render the 🏅 placeholder instead of an empty slot. — User still sees fully blank, so either `onError` isn't firing OR the placeholder render itself is failing.
2. **`<Image key={imageUri}>`** (`41407e8`): force a fresh native mount when the rebake swaps `badgeRow.imageUri` mid-display, in case iOS UIImageView held onto the previous fetch. — No effect.
3. **Post-write existence check in `saveBadgePNG`** (`41407e8`): throw if `writeAsStringAsync` resolved but the file isn't actually on disk (iOS sandbox / quota silent failure). — If this were the cause, the IIFE's catch would set `imageUri = PLACEHOLDER` and the 🏅 placeholder would render. User says empty, not placeholder, so this isn't it.

### What we know vs. what we don't

**Known good in this flow (because their respective tests / earlier behaviour pass):**

- `useCreateBadge` enters the bake IIFE on rebake (the modal opens at all, which requires `badgeStatus === "done"` AND `badgeRow` non-null).
- `bakePNG` produces a buffer of acceptable shape (the same code-path runs on first bake which works).
- `updateBadge` accepts a 1-1000 char `imageUri` (typical paths are ~150 chars).
- The Alert + return-param round-trip works (Alert is firing, Rebake button is reachable).

**Unknown / not yet diagnosed:**

- What is actually rendering in the image slot — `<Image>` with a broken `uri`, or the placeholder `<View>`, or neither?
- What `badgeRow.imageUri` value is in state at modal open time? (OLD stale value, NEW correct value, `PLACEHOLDER_IMAGE_URI`, empty string, undefined cast to string?)
- Does the iOS device's `Documents/badges/` directory actually contain the file referenced by the new `imageUri`?
- Does the modal ever re-render with an updated `imageUri` after the Evolu reactive query catches up, or does it stay on the first value it observed?
- Is `BadgeEarnedModal`'s `badgePlaceholder` style rendering with zero height? (If the parent `card` style or the placeholder style has changed and the View is rendered with height: 0, it would look empty.)

### Hypotheses to test next session (in priority order)

1. **The placeholder View itself has zero size / wrong style.** Cheapest to check first. Read `BadgeEarnedModal.styles.ts`, confirm `badgePlaceholder` has explicit width/height. If a `flex` change recently shrank it, the user would see "empty" even when `hasImage === false`.
2. **`badgeRow.imageUri` is still the _old_ baked URI** (Evolu reactive lag) and the **old file was unbaked / overwritten** between sessions. The `key={imageUri}` makes this worse on the second render swap, not better, because each remount restarts the load. Verify by logging `badgeRow.imageUri` at the moment `setShowBadgeModal(true)` fires AND on every render where the modal is open.
3. **`onError` is firing but `setImageLoadFailed(true)` is being immediately reset** by the `useEffect(() => setImageLoadFailed(false), [imageUri])` whenever a re-render happens. If `imageUri` is "changing" each render (e.g., a new String wrapper or re-derived value), the failure latch is wiped before React commits the placeholder branch. **Check that `imageUri` is referentially stable across re-renders when the underlying value hasn't changed.** Specifically `badgeRow.imageUri ?? PLACEHOLDER_IMAGE_URI` could yield a new string identity per render if `badgeRow` itself reactively updates without `imageUri` changing.
4. **The IIFE silently swallowed a bake/save error.** Check Sentry breadcrumbs for the rebake session — was `badge` → `store` emitted? Was a `badge.create` error reported? If `saveBadgePNG` is now throwing post-fix, the IIFE catch sets `imageUri = PLACEHOLDER` AND reports — but the modal still tries to render with PLACEHOLDER, which should show the 🏅 emoji. If the user is seeing EMPTY where 🏅 should be, that points back to hypothesis (1): the placeholder render itself is broken.
5. **The Modal's `<Image>` is rendering but with `width: 0, height: 0`.** Force a console.log inside the BadgeEarnedModal render to print the actual `imageUri` + `hasImage` + the resolved `styles.badgeImage`. On a device, add a temporary debug overlay that prints the URI value.

### Concrete next-step debugging recipe

1. Add temporary debug `Text` elements inside `BadgeEarnedModal.tsx` right next to the image slot:
   ```tsx
   <Text>uri={String(imageUri)}</Text>
   <Text>hasImage={String(hasImage)}</Text>
   <Text>failed={String(imageLoadFailed)}</Text>
   ```
2. Re-run the rebake flow on the iOS sim. Read the values.
3. If `hasImage=true` and `uri` looks valid → the file is missing or unreadable. Open Files.app → On My iPhone → `Rollercoasterdev` → `Documents/badges/` and check whether the URI's filename exists.
4. If `hasImage=false` → the placeholder branch is rendering. The "empty modal" perception means the placeholder View has no visible content. Inspect `badgePlaceholder` style.
5. If `uri` is `pending:baked-image` → the bake IIFE's `imageUri` ended up as `PLACEHOLDER_IMAGE_URI`, meaning `saveBadgePNG` threw. Check Sentry / logs.
6. If `uri` is an empty string or `undefined` cast to string → the DB row update path is dropping the URI somewhere; inspect `updateBadge` validation.

### File map for next session

- `apps/native-rd/src/screens/BadgeEarnedModal/BadgeEarnedModal.tsx` — modal render + `hasImage` gating + `imageLoadFailed` latch + `key={imageUri}`.
- `apps/native-rd/src/screens/BadgeEarnedModal/BadgeEarnedModal.styles.ts` — `badgeImage` / `badgePlaceholder` styles. **Read this first** for hypothesis (1).
- `apps/native-rd/src/screens/CompletionFlowScreen/CompletionFlowScreen.tsx` — modal trigger effect (line ~268), `badgeRow.imageUri ?? PLACEHOLDER_IMAGE_URI` prop derivation (~line 580 in current state).
- `apps/native-rd/src/hooks/useCreateBadge.ts` — bake IIFE with `if (existingBadge) { updateBadge(...) } else { createBadge(...) }`; the `let imageUri = PLACEHOLDER_IMAGE_URI; try { imageUri = await saveBadgePNG(...) } catch ...` pattern.
- `apps/native-rd/src/badges/badgeStorage.ts` — `saveBadgePNG` with post-write `getInfoAsync` verification.

### Out-of-scope follow-ups (already tracked / known)

- The bug is **only verified for the Rebake button**; Redesign-first hasn't been re-tested. Don't assume both paths fail or both succeed until each is exercised.
- The original empty-slot report from #15 (without a rebake — just a clean install with restored Evolu state) should also be re-verified once the rebake path is fixed.

## /simplify follow-ups (post-review on PR #29)

Findings from the three review agents that were intentionally deferred out of PR #29 — track here so they're not lost.

### Refactors (medium risk, separate PRs)

- **Flatten `useCreateBadge.ts:159-221` re-completion branching.** Extract `decideReCompletion(existingBadge, goal, evidence): 'idempotent-done' | 'silent-complete' | 'await-rebake' | 'rebake-now'` and replace the nested `if/else` with a flat switch. Same effect body, half the indentation, easier to unit-test the decision in isolation.
- **Extract `resolvePngSource()` from `useCreateBadge.ts:310-359`.** Three sequential `if (!pngBuffer)` blocks with subtly different fallthroughs and three `isPNG`-validation paths. Pull to a pure async helper `resolvePngSource({ fresh, existingBadge, fallback }): Promise<Buffer>` that the effect can `await` once.
- **Move `returnAction: "rebake"` off navigation params.** The designer→completion-flow round-trip currently rides on a navigation param that has to be consumed-and-cleared via `setParams({ returnAction: undefined })`. The `pendingDesignStore` (already touched by the designer save path) can carry a `rebakeRequested: true` flag instead — one carrier, no clear-on-consume dance, no risk of stack-grow if reached via a non-CompletionFlow entry.
- **`returnAction: "rebake"` is a single-valued string literal in 7 files.** Either a `type ReturnAction = "rebake"` alias in `navigation/types.ts` (and import it), or just `rebake?: boolean`. Currently each site re-declares the literal.
- **Collapse `ScreenParams` union in `BadgeDesignerScreen.tsx:718`.** Re-derives mode from raw params (`"mode" in params && params.mode === "new-goal"`) instead of using the existing discriminated union from `navigation/types.ts`. Switch on `params.mode` exhaustively.

### Shared abstractions (cross-cutting, low priority)

- **Extract `useImageWithFallback(uri)`** to dedupe the `imageLoadFailed + uri !== PLACEHOLDER + onError={...}` triad shared by `BadgeEarnedModal.tsx`, `BadgeDetailScreen.tsx:117,164,306`, and `EvidenceThumbnail.tsx:54`.
- **`parseCredential(json)` selector.** Both `credentialDiff.ts:55-75` (`hasChangesSinceBake`) and `BadgeDetailScreen.tsx:46-61` (`extractCriteriaNarrative`) walk `credential.credentialSubject.achievement.*` via cascading `as Record<string, unknown>` casts + `JSON.parse` try/catch. Lift to a typed accessor in `badges/`.
- **Pre-existing: `toBase64Url` (`useCreateBadge.ts:82`) and `toBase64` (`badgeStorage.ts:28`)** are two hand-rolled base64 encoders with the same `String.fromCharCode` loop. Untouched by #29; worth a follow-up consolidation.

### Suspected bugs worth verifying

- **`hasReadableExistingPng` only checks the URI string, not the file** (`CompletionFlowScreen.tsx:223-225` mirrored at `useCreateBadge.ts:321-345`). The screen marks the bake "enabled" because the URI looks valid and suppresses the fallback host; but the hook still does an async `readBadgePNG` that may fail, with `capturedPng` already nulled out. Either always render the fallback host, or let the hook fall back to a fresh capture instead of throwing.
- **Designer save without edits re-writes design JSON unconditionally** (BadgeDesigner `handleSave` → `updateBadge({ design })`). If the user opens the designer and presses Save without changes, the same JSON is rewritten — which then trips `lastCapturedDesignKeyRef` invalidation downstream. Compare new design JSON to existing and skip the write when equal.

### Style cleanup (when you next touch these files)

- **Trim change-narrating comments** in `useCreateBadge.ts` (file-header `Race-condition safe...` paragraph, `// Once triggered, never reset...` at :150, `// Changes detected — wait for caller to confirm...` at :213, the 12-line PNG-priority docblock at :298) and `CompletionFlowScreen.tsx` (`returnAction` prop docblock at :106-112, several `// ...` lines that narrate the PR rather than explain non-obvious WHY). Per CLAUDE.md: keep only non-obvious WHY (hidden constraints, subtle invariants, workarounds).
