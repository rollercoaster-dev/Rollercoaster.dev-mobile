# Development Plan: Issue #39

## Issue Summary

**Title**: native-rd: add retry affordance for terminal bake-error state in useCreateBadge
**Type**: enhancement
**Complexity**: SMALL
**Estimated Lines**: ~160 lines

## Intent Verification

Observable criteria derived from the issue:

- [x] When `useCreateBadge` reaches `status: "error"`, the celebration phase renders a "Retry" button (label from `common:actions.retry`) beneath the error message that was not there before.
- [x] Tapping "Retry" while in error state clears the error, resets status to `"idle"`, and re-runs the bake pipeline from the beginning without the user needing to leave the screen.
- [x] While baking is in progress after a retry tap, the retry button is not visible (replaced by the existing "Creating your badge..." indicator) — the button is gated on `badgeStatus === "error"`.
- [x] If the second bake attempt also fails, the error message and retry button reappear, allowing another attempt (the error branch re-renders whenever status is `"error"`).
- [x] The `useCreateBadge` hook's doc-comment describes the terminal error state and the reset mechanism.
- [x] No new i18n keys are added — the button reuses the existing `common:actions.retry` ("Retry" / "Erneut versuchen") per D4, so both locales are covered without touching `completion.json`. _(Revised: the original criterion assumed a new completion.json key; D4 superseded it.)_

_A reviewer can verify this by: mocking `useCreateBadge` to return `{ status: "error", error: "crypto unavailable", retryBake }` in the screen test and asserting the `completion-retry-bake-button` is rendered and calls `retryBake` on press; and by mocking `bakePNG` to throw once in the hook test, then asserting the hook returns to `"idle"` after `retryBake()` and re-runs to `"done"` on the next render._

## Dependencies

No issues listed as blockers or dependencies in the issue body.

**Status**: All dependencies met.

## Objective

Make the bake-error state recoverable without a screen reload. The fix has two parts: (1) expose a `retryBake` callback from `useCreateBadge` that resets `hasTriggered`, `status`, and `error`; (2) wire a "Retry" button (reusing `common:actions.retry`) into the celebration phase of `CompletionFlowScreen` when `badgeStatus === "error"`. Update the hook's doc-comment to describe the recovery contract.

## Decisions

| ID  | Decision                                                                                                                                                                                   | Alternatives Considered                                                                                        | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Reset via an explicit `retryBake()` callback exposed from the hook (not a prop or external signal)                                                                                         | (a) Accept an `onRetry` prop; (b) Reset via a new `retryToken` prop analogous to VideoContent                  | The hook already owns all state; a callback keeps the reset co-located with the guard that causes the lock. Props would require the caller to manage a counter or boolean toggle — extra state the caller should not need.                                                                                                                                                                                                                                                                 |
| D2  | `retryBake` resets `hasTriggered`, `status`, and `error` but does NOT change `enabled` — the caller's `userConfirmedBake` remains `true` so the effect re-fires immediately on next render | Reset `userConfirmedBake` to `false` in the screen (re-showing the Bake It / Redesign First gate)              | Resetting to the pre-bake choice gate on error is disruptive UX: the user already committed to baking. An in-place retry is the least-surprise path. The existing Redesign First button remains available if the user wants a design change instead.                                                                                                                                                                                                                                       |
| D3  | Place the retry button below the error message in the existing `badgeStatus` container, using a secondary `Button`                                                                         | New modal or separate error card                                                                               | Minimal blast radius; reuses the existing `badgeStatus` view and the design system's `Button` component. Consistent with where the error message already lives.                                                                                                                                                                                                                                                                                                                            |
| D4  | Reuse `common:actions.retry` for the button label ("Retry" / "Erneut versuchen") rather than a new key                                                                                     | New `completion:badge.retryBake` key                                                                           | `common:actions.retry` already exists in both locales and has exactly the right meaning. A screen-specific key would be duplication without semantic gain.                                                                                                                                                                                                                                                                                                                                 |
| D5  | Declare `common` on the hook — `useTranslation(["completion", "common"])` — while keeping the call site fully prefixed as `t("common:actions.retry")`                                      | (rejected at implementation) leave the array as `["completion"]` and call `t("common:actions.retry")` directly | Original D5 (leave the array untouched) was rejected during implementation: react-i18next's TypeScript types bind the `t` key union to the namespaces passed to `useTranslation`, so `common:`-prefixed keys fail `tsc` even though they resolve at runtime (common is globally loaded) and satisfy the `namespace-convention` lint rule. Adding `common` to the array is the minimal type-safe change and preserves the explicit-prefix intent. (Revised 2026-06-12 — see Discovery Log.) |

## Affected Areas

- `apps/native-rd/src/hooks/useCreateBadge.ts`: add `retryBake` to `UseCreateBadgeResult`; implement reset inside the hook; update doc-comment.
- `apps/native-rd/src/screens/CompletionFlowScreen/CompletionFlowScreen.tsx`: destructure `retryBake` from `useCreateBadge`; render retry `Button` in the `badgeStatus === "error"` branch.
- `apps/native-rd/src/hooks/__tests__/useCreateBadge.test.ts`: add tests for the retryBake reset path and re-entry after reset.
- `apps/native-rd/src/screens/CompletionFlowScreen/__tests__/CompletionFlowScreen.test.tsx`: add tests that the retry button appears on error and triggers re-bake.

_No i18n file changes needed — `common:actions.retry` ("Retry" / "Erneut versuchen") covers both locales._

## Implementation Plan

### Step 1: Expose `retryBake` from `useCreateBadge`

**Files**: `apps/native-rd/src/hooks/useCreateBadge.ts`
**Commit**: `feat(useCreateBadge): expose retryBake callback to reset terminal error state`
**Changes**:

- [x] Extend `UseCreateBadgeResult` with `retryBake: () => void`.
- [x] Implement `retryBake` as a `useCallback` that resets `hasTriggered.current = false`, calls `setStatus("idle")`, and calls `setError(null)`.
- [x] Include `retryBake` in the returned object.
- [x] Update the hook's top-level doc-comment to describe the terminal error state (`hasTriggered` stays `true` on error) and the recovery contract (`retryBake` resets the guard and re-enables the pipeline).

### Step 2: Wire the retry button into `CompletionFlowScreen`

**Files**: `apps/native-rd/src/screens/CompletionFlowScreen/CompletionFlowScreen.tsx`
**Commit**: `feat(CompletionFlowScreen): show retry button when bake pipeline reaches error state`
**Changes**:

- [x] Destructure `retryBake` from the `useCreateBadge` call result (alongside existing `status` and `error`).
- [x] In the `badgeStatus === "error"` branch (lines 703–718 in the current file), add a `Button` with `label={tCompletion("common:actions.retry")}` calling `retryBake`. Use `variant="secondary"` to keep the error message visually dominant. Add `accessibilityRole="button"` and `testID="completion-retry-bake-button"`.
- [x] Declare `common` on `CompletionContent`'s hook — `useTranslation(["completion", "common"])` — keeping the call site fully prefixed (`t("common:actions.retry")`). Required for `tsc`: react-i18next types restrict the key union to the declared namespaces. (Revised per D5 — see Discovery Log.)

### Step 3: Hook unit tests for retryBake

**Files**: `apps/native-rd/src/hooks/__tests__/useCreateBadge.test.ts`
**Commit**: `test(useCreateBadge): cover retryBake reset and pipeline re-entry`
**Changes**:

- [x] Add a test: after `bakePNG` throws and status reaches `"error"`, calling `retryBake()` resets status to `"idle"` and clears error.
- [x] Add a test: after `retryBake()` is called and the next render fires, the bake pipeline re-runs (createBadge is called a second time with a successful mock).
- [x] Add a test: `useCreateBadge` returns a `retryBake` function (type contract satisfied).

### Step 4: Screen integration tests for retry button

**Files**: `apps/native-rd/src/screens/CompletionFlowScreen/__tests__/CompletionFlowScreen.test.tsx`
**Commit**: `test(CompletionFlowScreen): verify retry button renders on bake error and invokes retryBake`
**Changes**:

- [x] Update `mockUseCreateBadge` mock type to include `retryBake: jest.fn()` in its return shape.
- [x] Add a test: when `mockUseCreateBadge` returns `{ status: "error", error: "crypto unavailable", retryBake: mockRetryBake }`, a button with `testID="completion-retry-bake-button"` (or accessible label "Retry") is on the screen.
- [x] Add a test: pressing the retry button calls `mockRetryBake`.
- [x] Add a test: when status is NOT `"error"`, the retry button is NOT on the screen.

## Testing Strategy

- [x] Unit tests for `useCreateBadge` reset path (Jest 30, no renderer needed — hook-only via `renderHook`)
- [x] Integration tests for `CompletionFlowScreen` retry button via `renderWithProviders` + `fireEvent.press`
- [x] Test file paths: `src/hooks/__tests__/useCreateBadge.test.ts`, `src/screens/CompletionFlowScreen/__tests__/CompletionFlowScreen.test.tsx`
- [x] Use `test.each` is not needed here — the retry scenario is a single distinct state path
- [x] Manual testing checklist (deferred to verify phase):
  - Force an error by temporarily making `keyProvider.getPublicKey` reject, tap "Bake It", observe error message + "Retry" button
  - Tap "Retry", observe error clears, bake re-runs, badge created successfully
  - Force two consecutive errors, confirm button re-appears after the second failure

## Not in Scope

| Item                                                                            | Reason                                                                                                                | Follow-up                            |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Resetting `userConfirmedBake` to re-show Bake It / Redesign First gate on error | Disruptive UX; user already committed to baking                                                                       | None — D2 decision is settled        |
| Automatic retry with backoff                                                    | Over-engineering for a user-confirmed action; no data suggesting it's needed                                          | None                                 |
| Per-stage error granularity (which of build/sign/bake/store failed)             | Deferred in the original hook comment pending Sentry triage data                                                      | Separate issue if triage warrants it |
| Adding a retry affordance to the `no-key` state                                 | `no-key` is a permanent failure (key generation failed); a retry would loop forever without the key being regenerated | Separate issue                       |

## Discovery Log

- [2026-06-12] **D5 revised during implementation.** The plan's original D5 (leave `useTranslation(["completion"])` untouched, call `t("common:actions.retry")` directly) failed `tsc` with TS2345: react-i18next's types bind the `t` key union to the namespaces passed to `useTranslation`, so a `common:`-prefixed key is rejected by the type checker even though it resolves at runtime (all namespaces are globally bundled) and passes the `namespace-convention` lint rule. Fix: declare the namespace — `useTranslation(["completion", "common"])` — keeping the call site fully prefixed. This is the researcher's original Q4 default; the "pure explicit key, no array change" path is not reachable under the type system.
