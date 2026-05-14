# Badge Rebake on Reopen + Re-Completion

**Status:** Implementation plan — ready for fresh branch
**Tracking issue:** [#15](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/15)
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

| Question                  | Decision                                                                                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What counts as "updated"? | Diff vs credential snapshot: `evidence[]` count, `goal.title`, `goal.description`. Catches the common "added evidence" case.                                                          |
| Cancel UX                 | Back to FocusMode, goal stays `active`.                                                                                                                                               |
| Rebake design source      | Default: `existingBadge.design` if set, else `createDefaultBadgeDesign(goal.title, goal.color)`. User can override via **Redesign first** (saves new design through existing redesign mode, then offscreen capture picks it up). |
| Confirmation UI           | Native `Alert.alert`, three buttons.                                                                                                                                                  |
| Microcopy                 | See spec [Microcopy](./2026-05-14-badge-completion-flow.md#microcopy) section; aligned with `~/Code/rollercoaster.dev/landing/docs/BRAND_LANGUAGE.md`.                                 |
| New status name           | `"rebake-required"`                                                                                                                                                                   |
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
- Offscreen fallback host (`CompletionFlowScreen.tsx:312-329`): currently fires only when `pendingDesignStore` is empty *and* no existing badge. Extend the gating so it also fires for the rebake path keyed on `existingBadge.design` (or `createDefaultBadgeDesign(…)` when `design` is null). The capture feeds the same `capturedPngForBake` slot that's already wired into `useCreateBadge`.
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
