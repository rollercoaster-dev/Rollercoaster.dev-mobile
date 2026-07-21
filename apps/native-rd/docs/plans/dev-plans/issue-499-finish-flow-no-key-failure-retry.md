# Development Plan: Issue #499

## Issue Summary

**Title**: [Storybook] Finish flow — no-key, failure, and retry states
**Type**: feature (Storybook state-modeling — no app wiring)
**Complexity**: MEDIUM (sits right at the SMALL/MEDIUM boundary)
**Estimated Lines**: ~380–450 lines across 4 files (2 modified, 2 already-existing files extended), no new files/folders

## Intent Verification

- [ ] `FinishBakingStage` rendered with `status="no-key"` shows the no-key message via `accessibilityRole="alert"` **and** a visible, enabled "Continue without a badge"-style action — never a spinner-only dead end (old `CompletionFlowScreen` no-key branch had no action at all).
- [ ] `FinishBakingStage` rendered with `status="error"` shows the caller-supplied `errorMessage` via `accessibilityRole="alert"` and a `Retry` `Button` whose `onPress` invokes `onRetry` — verified to fire exactly once even under two rapid presses before the caller's `status` prop changes (internal `retryPending` guard).
- [ ] The Retry button's `accessibilityState.busy`/`disabled` flip `true` synchronously on press (via `Button`'s existing `loading` prop), before any parent re-render.
- [ ] `status="success"` renders the badge at full opacity (no dim, no spinner) with a distinct success label — a real, observable sub-state, not an instant cut to `FinishRevealStage`.
- [ ] `FinishFlow.stories.tsx`'s `AllThemesMatrix` gains baking-stage cells (success/no-key/error) across all 7 `ScopedTheme` columns.
- [ ] The interactive flow story (`InteractiveFinishFlow`) demonstrates `baking → error → tap Retry → busy → success → reveal`, and while any busy phase is showing, no actionable control is rendered anywhere in the harness that could re-fire a bake (no Retry/exit button mounted during busy phases).

## Dependencies

| Issue | Title                                                                     | Status                                                 | Type                                                                   |
| ----- | ------------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------- |
| #470  | [Storybook] Finishing flow 1/3 — celebrate + baking + reveal stages       | ✅ Closed & merged (PR #481)                           | Hard prerequisite — ships `FinishBakingStage`                          |
| #472  | [Storybook] Finishing flow 3/3 — interactive flow story + AllThemesMatrix | ✅ Closed & merged (PR #487)                           | Hard prerequisite — ships `FinishFlow.stories.tsx` + `AllThemesMatrix` |
| #384  | Epic: Full Ride redesign                                                  | 🟢 Open (epic, not a blocker)                          | Parent epic                                                            |
| #449  | [Integrate] Finishing flow — retire the old completion path               | 🟢 Open, blocked by #472 (met) — not a blocker of #499 | Downstream consumer of this issue's contract                           |

No "Blocked by"/"Depends on"/checkbox dependency markers in the issue body. `#449`'s own body lists it as "Blocked by #472" (already merged) — #499 is a forward prerequisite for #449, not the reverse. Both files this issue extends (`FinishBakingStage`, `FinishFlow.stories.tsx`) already exist in the tree, confirmed by direct read.

**Status**: ✅ All dependencies met.

**has_blockers**: false

## Objective

Model `FinishBakingStage`'s baking interstitial as a real state union — in-progress phases, no-key, error, retry, and a distinct success hand-off — instead of the single hardcoded spinner it renders today. Preserve the _semantics_ of the old `CompletionFlowScreen`'s bake-status handling (no-key permanent-failure messaging, terminal-error copy + retry, alert/live-region a11y) inside the new component's contract, add a non-dead-ending escape for no-key (a real gap in the old flow), extend the interactive flow story to click through failure → retry → success, and add the new states to `AllThemesMatrix`. Storybook/state-surface only — real `useCreateBadge`/`useUserKey` wiring and navigation stay #449's job.

## Decisions

| ID  | Decision                                                                                                                                                                                                                                                             | Alternatives Considered                                                                               | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Extend `FinishBakingStage` in place with a `status` prop union mirroring `useCreateBadge`'s `BadgeCreationStatus` (minus the pre-render `idle`/`loading`/`done`) rather than a new sibling component                                                                 | New `FinishBakingResultStage` component alongside the existing one                                    | One interstitial owns "what's happening while baking," matching #470's D1 (one component per stage); keeps #449's wiring a near-verbatim pass-through of the real hook's `status`/`error`/`retryBake`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| D2  | Stay i18n-free — new copy (`errorMessage` caller-supplied, `noKeyLabel`, `retryLabel`, `successLabel`, `noKeyActionLabel`) are props with English defaults, no internal `useTranslation`                                                                             | Call `useTranslation(["completion", "common"])` internally, matching old `CompletionFlowScreen`       | Matches #470's D2 for every other Finish\*Stage component — keeps the component Storybook-renderable with zero i18n provider setup. #449 threads real `t()` output through these props, same plan as #470 D2 documents for the other three stages. Existing `en/completion.json` `badge.*` keys and `common:actions.retry` stay available for #449 to reuse verbatim if it chooses — this issue does not add or change any i18n resource files.                                                                                                                                                                                                                                                                                               |
| D3  | Error copy/icon color uses the existing `theme.colors.error` token, same as `BadgeOverflowMenu`/`EditGoalOverflowMenu`/`VideoRecorder`/`VoiceMemoScreen`                                                                                                             | Introduce a new token, or a per-theme override                                                        | `theme.colors.error` is the established destructive/error color across the codebase already. Note (pre-existing, not introduced by this issue): `src/themes/adapter.ts` hardcodes `error: pkgPalette.error` for every color mode and no `variantOverrides` entry touches it (`grep -n "error" src/themes/variants.ts` → no matches), so it is flat across all 7 product themes even though `packages/design-tokens/src/themes/*.json` carries distinct per-theme `error` values that the adapter doesn't consume. This is an existing token-wiring gap, unrelated to and out of scope for this issue (see Not in Scope).                                                                                                                      |
| D4  | No-key gets a new, explicit escape affordance: optional `onExitWithoutBadge` callback + `exitLabel` copy prop (default "Continue without a badge"), rendered as a `Button variant="secondary"` beside the no-key message                                             | Leave no-key as message-only (old behavior); or reuse `onRetry` for no-key too                        | Old `CompletionFlowScreen`'s no-key branch rendered a static, actionless message — a genuine dead end once the signing key is confirmed absent. `useCreateBadge.retryBake()` is explicitly gated to `status === "error"` only (never fires from `"no-key"` — see the hook's doc comment and early-return), so reusing `onRetry` here would misrepresent what the callback actually does. A distinct exit callback satisfies "explicit and non-dead-ending" without inventing a fake retry. Exact destination (e.g., back to the goal, evidence preserved) is a navigation decision for #449; this issue only exposes the seam. **Flagged in Open Questions** — this is the one place this plan makes a product call that old code never made. |
| D5  | Duplicate-tap guard on Retry is internal component state (`retryPending`, set `true` synchronously inside the `onPress` handler before calling `onRetry`, reset whenever the `status` prop leaves `"error"`), driving `Button`'s existing `loading`/`disabled` props | Rely solely on the parent unmounting the Retry button once `status` changes away from `"error"`       | The parent-unmount path already prevents duplicate dispatch _between_ renders, but a double-press registered within the same tick (before the parent's state update commits) could still call `onRetry` twice. The internal guard is synchronous and needs no caller coordination — satisfies "prevent duplicate bake actions while work is active" at the component boundary, matching how `Button`'s own `loading` prop already works for every other in-flight action in the codebase.                                                                                                                                                                                                                                                     |
| D6  | `success` is a real, distinct visual sub-state — full-opacity badge (no dim, no spinner) + `successLabel` — not an instant jump straight to `FinishRevealStage`                                                                                                      | Skip a success visual; auto-advance `baking → reveal` exactly as today                                | The acceptance criteria explicitly require `AllThemesMatrix` coverage of a `success` state and phrase the contract as "Retry returns to a busy state and can transition to reveal only after success" — both require an observable, matrix-able moment between the busy phases and the reveal stage.                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| D7  | `AllThemesMatrix` in `FinishFlow.stories.tsx` gains three additional per-theme `FinishBakingStage` cells (`success`/`no-key`/`error`)                                                                                                                                | Leave `FinishBakingStage` out of the matrix, per #472's original note that it "adds no matrix signal" | #472's D3 note applied to the plain busy spinner, styled off flat `theme.colors.background`. The new no-key/error content pairs `theme.colors.error` against theme-varying background/text/border colors — exactly the kind of signal `AllThemesMatrix` exists to catch, especially for Bold Ink (`highContrast`, AAA 7:1) and Still Water (`autismFriendly`, muted, no shadows). Superseding, not contradicting, #472's original note (that note was correct for the surface that existed at the time).                                                                                                                                                                                                                                      |
| D8  | Busy sub-phases (`building`/`signing`/`storing`/`baking`) all render identically — one generic `label` (default "Baking your badge…"), no per-phase copy                                                                                                             | Show distinct text per phase ("Signing…", "Saving…", etc.)                                            | Matches the _old_ `CompletionFlowScreen` precedent exactly: `isBadgeCreating` already collapsed all four hook sub-statuses into one generic "Creating your badge…" message. No product signal was ever surfaced per sub-phase; inventing four new copy strings here would be scope creep beyond "retain full functionality."                                                                                                                                                                                                                                                                                                                                                                                                                  |

## Affected Areas

- `src/components/FinishBakingStage/FinishBakingStage.tsx`: add `status`, `errorMessage`, `retryLabel`, `onRetry`, `noKeyLabel`, `noKeyActionLabel`, `onExitWithoutBadge`, `successLabel` props; branch render on `status` (busy / no-key / error / success); internal `retryPending` guard.
- `src/components/FinishBakingStage/FinishBakingStage.styles.ts`: add style blocks for the no-key/error/success containers (reusing existing spacing/color tokens, mirroring `CompletionFlowScreen.styles.ts`'s `badgeStatus`/`badgeErrorContainer` shapes).
- `src/components/FinishBakingStage/FinishBakingStage.stories.tsx`: rename/keep `Default` (busy), add `Success`, `NoKey`, `ErrorState` (with a local-`useState` retry-to-success demo).
- `src/components/FinishBakingStage/__tests__/FinishBakingStage.test.tsx`: extend with coverage for every new status branch, a11y roles, and the duplicate-tap guard.
- `src/stories/finish/FinishFlow.stories.tsx`: add a `bakeOutcome` prop to `InteractiveFinishFlow` (`"success" | "no-key" | "error"`), two new exported stories (`NoKey`, `FailureThenRetry`) exercising the full click-through, and three new per-theme cells in `AllThemesMatrix`.

No changes to `CompletionFlowScreen.tsx`, `useCreateBadge.ts`, `useUserKey.ts`, navigation, or any i18n resource file — all out of scope per the issue's own "keep real `useCreateBadge`... in #449" instruction.

## Implementation Plan

### Step 1: Model the status union in `FinishBakingStage`

**Files**: `src/components/FinishBakingStage/FinishBakingStage.tsx`, `src/components/FinishBakingStage/FinishBakingStage.styles.ts`
**Commit**: `feat(finish-flow): model FinishBakingStage no-key/error/retry/success states`
**Changes**:

- [ ] Add `export type FinishBakingPhase = "building" | "signing" | "baking" | "storing"` and `export type FinishBakingStatus = FinishBakingPhase | "no-key" | "error" | "success"`.
- [ ] Add props: `status?: FinishBakingStatus` (default `"baking"`, preserves existing `Default` story behavior), `successLabel?: string` (default `"Badge created!"`), `noKeyLabel?: string` (default `"Badge signing key unavailable"` — matches old `completion:badge.noKeyMessage` copy), `noKeyActionLabel?: string` (default `"Continue without a badge"`), `onExitWithoutBadge?: () => void`, `errorMessage?: string | null`, `retryLabel?: string` (default `"Retry"` — matches `common:actions.retry`), `onRetry?: () => void`.
- [ ] Busy branch (status is a `FinishBakingPhase`): unchanged existing render (dimmed badge + `ActivityIndicator` + `label`, `accessibilityLiveRegion="polite"`).
- [ ] Success branch: full-opacity badge (no `badgeDim` wrapper), no spinner, `successLabel` text; `accessibilityLiveRegion="polite"` announcing `successLabel`.
- [ ] No-key branch: dimmed badge retained (bake never completed), `noKeyLabel` text in a wrapper with `accessibilityRole="alert"` + `accessibilityLabel={noKeyLabel}` (mirrors old `CompletionFlowScreen`'s `badgeStatus`/`accessibilityRole="alert"` treatment); render `Button variant="secondary" label={noKeyActionLabel} onPress={onExitWithoutBadge}` only when `onExitWithoutBadge` is provided.
- [ ] Error branch: dimmed badge retained, `errorMessage` text in an `accessibilityRole="alert"` wrapper (mirrors old `badgeErrorContainer`/`badgeStatus`), `Button variant="secondary" label={retryLabel} loading={retryPending} onPress={handleRetryPress}` rendered only when `onRetry` is provided.
- [ ] `retryPending` local state (`useState(false)`); `handleRetryPress` sets it `true` then calls `onRetry()`; a `useEffect` resets it to `false` whenever `status` changes away from `"error"` (covers both a successful re-arm and a repeat error from the same retry).
- [ ] Styles: add `successContainer`/`noKeyContainer`/`errorContainer` (column, `gap: theme.space[3]`, matching `CompletionFlowScreen.styles.ts`'s `badgeErrorContainer` shape) and reuse `theme.colors.error` for the error message's text color only (icon/badge stay as-is — no new red badge tinting).

### Step 2: Tests

**Files**: `src/components/FinishBakingStage/__tests__/FinishBakingStage.test.tsx`
**Commit**: `test(finish-flow): cover FinishBakingStage status branches`
**Changes**:

- [ ] Existing busy-state tests continue to pass unchanged (default `status` stays `"baking"`).
- [ ] `status="success"`: badge renders at full opacity (no `badgeDim` style applied — assert via style array/testID), no `ActivityIndicator`, `successLabel` text present.
- [ ] `status="no-key"`: `accessibilityRole="alert"` wrapper present with `noKeyLabel`; `onExitWithoutBadge` fires on the action button press; button is entirely absent when `onExitWithoutBadge` is omitted (no dead click target rendered).
- [ ] `status="error"`: `accessibilityRole="alert"` wrapper present with the caller's `errorMessage`; `onRetry` fires on Retry press; Retry button absent when `onRetry` is omitted.
- [ ] Duplicate-tap guard: fire two rapid presses on Retry before re-rendering with a new `status` — `onRetry` is called exactly once, and the button's `accessibilityState.busy`/`disabled` are both `true` after the first press (`fireEvent.press` twice, assert mock call count === 1).
- [ ] `retryPending` resets: re-render with `status="error"` again after the guard tripped — Retry is pressable again (regression guard against a stuck-disabled state).

### Step 3: Per-status Storybook stories

**Files**: `src/components/FinishBakingStage/FinishBakingStage.stories.tsx`
**Commit**: `feat(finish-flow): FinishBakingStage per-status stories`
**Changes**:

- [ ] Keep `Default` (busy, unchanged).
- [ ] Add `Success` (`status="success"`).
- [ ] Add `NoKey` (`status="no-key"`, `onExitWithoutBadge` stub).
- [ ] Add `ErrorState` — small local-`useState` wrapper so pressing Retry visibly flips `status` back to `"baking"` then, after a short timeout, to `"success"` (demonstrates the full recovery loop in isolation, mirroring `FinishCelebrateStage.stories.tsx`'s `ClosingNoteOpen` local-state pattern).

### Step 4: Extend the interactive flow story + AllThemesMatrix

**Files**: `src/stories/finish/FinishFlow.stories.tsx`
**Commit**: `feat(finish-flow): exercise failure→retry→success in the flow story + AllThemesMatrix`
**Changes**:

- [ ] Add `bakeOutcome?: "success" | "no-key" | "error"` prop to `InteractiveFinishFlowProps` (default `"success"`, preserving `Default`/`ReducedMotion`/`LongContent` behavior unchanged).
- [ ] Add internal `bakeStatus` state (`FinishBakingStatus`), seeded to `"building"` on entering the `"baking"` stage; on the existing `BAKE_DURATION_MS` timer: `"success"` outcome → `bakeStatus="success"`, then a short second timer flips `stage` to `"reveal"`; `"no-key"` outcome → `bakeStatus="no-key"` (terminal, no further timer); `"error"` outcome → `bakeStatus="error"` (terminal until Retry).
- [ ] Wire `onRetry` in the harness: sets `bakeStatus="building"`, then after `BAKE_DURATION_MS` resolves to `"success"` and advances to reveal — demonstrating the full `error → retry → success → reveal` loop end to end.
- [ ] Wire `onExitWithoutBadge` to a no-op (matches every other harness callback — `onViewBadge`/`onBackToGoals` are already no-ops; real navigation is #449's job).
- [ ] New exported stories: `NoKey` (`bakeOutcome="no-key"`) and `FailureThenRetry` (`bakeOutcome="error"`).
- [ ] `AllThemesMatrix`: add three more per-column `ScopedTheme` cells (`FinishBakingStage` with `status="success"`/`"no-key"`/`"error"`, all `pointerEvents="none"` like the existing Design/Reveal cells), updating the stale "Celebrate/baking... add no matrix signal" comment per D7.

## Testing Strategy

- [ ] Unit tests for `FinishBakingStage` (Jest 30, `@testing-library/react-native` v13), run via `bun run test --testPathPatterns "FinishBakingStage"` — never `bun test`/plain `npx jest`.
- [ ] Manual/visual: open Storybook under `Iteration B/Finish/FinishBakingStage` — confirm `Success`/`NoKey`/`ErrorState` render correctly; under `Iteration B/Finish/Flow` — click through `FailureThenRetry` end to end (baking → error copy + Retry visible → tap Retry → busy again → success → reveal) and confirm `NoKey` shows the escape action with no further transition.
- [ ] Manual/visual: `AllThemesMatrix` — confirm the error message stays legible against all 7 themes' backgrounds, in particular Bold Ink (`highContrast`) and Still Water (`autismFriendly`).
- [ ] What this issue's tests will **not** show: real `useCreateBadge`/`useUserKey` status transitions, real retry-of-key-generation, real navigation on "Continue without a badge" or post-reveal exits, and any i18n-translated copy (component stays English-literal props per D2) — all of that remains #449's job, by design.

## Not in Scope

| Item                                                                                                              | Reason                                                                                                                                                    | Follow-up                                                               |
| ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Real `useCreateBadge`/`useUserKey` wiring (passing the hook's live `status`/`error`/`retryBake` into these props) | Issue's own "keep real hooks in #449" instruction                                                                                                         | #449                                                                    |
| Real navigation for `onExitWithoutBadge` (e.g., back to the goal, badge modal dismissal)                          | Bare callback prop; navigation is a screen/container concern                                                                                              | #449                                                                    |
| i18n — real `t()` copy through these new props                                                                    | Matches #470 D2's established i18n-free convention for every Finish\*Stage component                                                                      | #449                                                                    |
| Per-sub-phase busy copy ("Signing…", "Saving…", etc.)                                                             | Old code never surfaced this distinction either (D8)                                                                                                      | none                                                                    |
| Fixing `theme.colors.error`'s flat (non-per-theme) value                                                          | Pre-existing token-wiring gap in `src/themes/adapter.ts`, unrelated to this issue                                                                         | none — worth a design-tokens follow-up if a theme audit (#383) flags it |
| A real "retry key generation" action for no-key                                                                   | `useCreateBadge.retryBake()` is explicitly gated to `"error"` only; no-key needs a different mechanism (or none) that #449/`useUserKey` would have to own | #449, or a new issue if key regeneration itself needs a retry path      |

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->

- [2026-07-21] D5 guard implemented as a `retryFiredRef` (synchronous) backing the `retryPending` state, not state alone. Two native taps in one frame (before React commits the disabled Button) would both slip past a stale-closure state check — the ref guarantees `onRetry` fires exactly once, while `retryPending` still drives `Button`'s `loading`/`busy`/`disabled`. Faithful to the plan's stated intent ("synchronous internal guard").
- [2026-07-21] Added `testID="finish-baking-badge-dim"` to the dim wrapper so the success-state test can assert full-opacity (wrapper absent) via testID per Step 2's "assert via style array/testID".
- [2026-07-21] The status-reset `useEffect` (component) and the baking-seed `useEffect` (flow story) each trip the `setState-synchronously-within-an-effect` lint **warning** (0 errors). Left as-is: the pattern appears in 28 other repo files (hooks/screens/stories), the cascades are bounded (deps don't re-trigger), and both resets are genuinely prop-transition-driven.

## Open Questions

_Both resolved by Joe on 2026-07-21 (start-issue Phase 3). No plan changes required — both confirmed the plan's stated defaults._

- **D4 (no-key escape)** — ✅ **RESOLVED: add the exit CTA prop.** Ship the new `onExitWithoutBadge` callback + "Continue without a badge" secondary `Button` beside the no-key alert (Step 1 / Step 4 as written). The component only exposes the seam; the real navigation destination stays #449's job.
- **Success/no-key/exit copy wording** — ✅ **RESOLVED: use the plan's invented defaults** as overridable prop defaults (`"Badge created!"`, `"Badge signing key unavailable"`, `"Continue without a badge"`, `"Retry"`, `"Baking your badge…"`). Wording is not locked — #449 refines it when real `t()` copy is threaded through these props.
