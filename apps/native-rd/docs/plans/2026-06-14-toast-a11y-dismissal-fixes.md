# Toast: accessibility & dismissal defects

**Issue:** [#264](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/264) — `priority:high`, `type:bug`, `accessibility`, `app:native-rd`
**PR:** [#299](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/pull/299)
**Scope:** `src/components/Toast/` (`Toast.tsx`, `ToastContext.tsx`), `__tests__/Toast.test.tsx`, `src/__tests__/mocks/reanimated.ts`
**Created:** 2026-06-14 · **Trimmed:** 2026-06-14

## Summary

#264 listed eight Toast defects, all verified against the code. The original plan
bundled the 4 must-fix + 3 worth-fix items into one PR (PR A). **On 2026-06-14 the
PR was trimmed** to the two changes that are genuine, live wins on the surface the
app is actually keeping. The rest hardened the **actionable Undo toast**, which
[#301](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/301)
removes (the Undo is broken — Evolu can't clear the `isDeleted` system column — and
the app is moving to confirm-before-delete, deleting the only actionable-toast call
site). Hardening a button that's being removed is wasted work, so those commits were
dropped rather than merged.

### Kept — the live wins

- **Announce on iOS (#264 must-fix #4).** `accessibilityLiveRegion="assertive"` is
  Android-only; on iOS VoiceOver got **silence** when a toast appeared, including the
  FocusMode error toasts (`couldNotUpdateStep`, `couldNotOpenCapture`). Now calls
  `AccessibilityInfo.announceForAccessibility` on show, guarded to iOS so TalkBack
  doesn't double-speak. This is the unambiguous, #301-proof a11y fix — it serves the
  4 message-only toasts that survive.
- **Keep mounted through the exit animation (#264 must-fix #3).** `if (!visible) return null`
  unmounted on the same render that flipped `visible→false`, so the slide-out animated a
  gone view and the toast just vanished. A lagging `mounted` state driven off the
  `withTiming` completion callback (`finished === true`) keeps the view in the tree until
  the exit finishes. Cosmetic, but affects every surviving toast.

### Dropped — actionable-toast machinery (superseded by #301)

| #               | Item                                                                              | Why dropped                                                                                       |
| --------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| must-fix #1     | Unhide the action button from screen readers (remove `accessible` from container) | Only matters when an action button is rendered; #301 removes the only actionable toast.           |
| must-fix #2     | Actionable toasts must not auto-dismiss (WCAG 2.2.1)                              | Same — the WCAG 2.2.1 timing case only exists for the Undo toast #301 deletes.                    |
| worth-fix #2/#3 | Action-label contrast token + 44×44 min target                                    | Styles only the action button. Reverted; `Toast.styles.ts` and `contrast.test.ts` stay at `main`. |
| worth-fix #4    | Replay slide-in + re-arm timer on re-show while visible                           | Polish for a re-show collision that doesn't occur (one consumer, one toast at a time).            |
| worth-fix #1    | Toast queue (was "PR B")                                                          | Already dropped earlier — no path shows two toasts at once. Tracked-out to #301.                  |

**Tests removed with the dropped fixes:** the a11y/regression tests added for must-fix
#1 (`exposes the action button as its own accessibility node`), must-fix #2
(`does not auto-dismiss when an action is present`, `dismisses after the action runs`),
and worth-fix #4 (`re-arms the timer on re-show`) were **removed together with the code
they covered** — the fixes were un-shipped, not silently left untested. Per
`apps/native-rd/CLAUDE.md`, a11y contract tests aren't deleted while the behavior they
guard ships; here the behavior is being removed by #301, so the test goes with it. The
surviving suite covers both kept changes plus the original baseline tests.

## Current usage (verified 2026-06-14)

`ToastProvider` is mounted at the app root (`App.tsx`). The only consumer is
`FocusModeScreen`:

- **4 message-only toasts** (`duration: 3000`, no action): `evidenceRequired`,
  `couldNotUpdateStep`, `couldNotOpenCapture` (×2). These are exactly what the two kept
  fixes serve.
- **1 actionable toast**: `evidenceDeleted` + **Undo** (default `5000`). This is the
  surface #301 removes; the dropped commits existed to protect it.

## Verification

- `bun run type-check` — green (husky pre-commit).
- `npx jest --no-coverage --testPathPatterns Toast` — 13 passed.
  (`bun test` segfaults on the RN preset; use jest.)
- Manual (before merge): VoiceOver (iOS) — error toast announces on show; exit slides
  out instead of vanishing.

## Follow-ups

- #301 — confirm-before-delete; removes the evidence-delete Undo (the dropped commits' target).
- If an actionable toast is ever reintroduced, the must-fix #1/#2 work (SR-reachable
  action + WCAG 2.2.1 no-auto-dismiss) must come back with it. Recorded here so it isn't lost.
