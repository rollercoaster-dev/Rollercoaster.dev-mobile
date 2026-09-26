# Development Plan: Issue #687 — zero-step Focus Mode

## Workspace and scope

- Issue: https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/687
- Worker worktree: `/Users/hailmary/.codex/worktrees/issue-687/Rollercoaster.dev-mobile`
- Reserved branch: `codex/issue-687` (PM guard claim exists)
- Initial base: `b70382290001bf31f14690ccfe48be2b352be3aa` (`origin/main`, 2026-09-24); rebased base: `64d09ab4d18593d56e712bf698a77166989ad513` (2026-09-26)
- Scope: FocusModeScreen, its tests, and focusMode locale resources. Reuse existing EditMode step entry and Done return.

## Intent Verification

- [x] A newly created goal with zero steps shows a concise explanation and an obvious primary action in Focus Mode.
- [x] The primary action opens EditMode for the same goal, where the existing add-step input is available.
- [x] After the first step is added and EditMode's Done action returns, Focus Mode shows that step as current work rather than the zero-step state. Verified in focused Jest tests and on the iOS simulator.
- [x] Parked, all-complete, and existing-step states retain their behavior; English, German, and pseudo locale keys remain aligned.
- [x] Native evidence uses implementation SHA `3b4d703479c016e7636fb3d600dd5c53569fb140`; the English and German Maestro runs passed on iOS 27.0.

## Decisions

| ID  | Decision                                                                                                       | Rationale                                                                                              |
| --- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| D1  | Keep the zero-step branch in `NoActionableBody`; render an in-screen heading, body, and shared primary Button. | The branch already distinguishes zero steps from parked and complete.                                  |
| D2  | Navigate the CTA to existing `EditMode` with the current goal ID.                                              | EditMode owns step creation, and its Done action already returns to Focus Mode.                        |
| D3  | Add no new navigation parameter or editor mode.                                                                | The existing add-step input is already visible in the editor; this issue needs a useful route into it. |

## Implementation Plan

1. [x] Replace the old chrome-only test with a failing empty-state/navigation test; add a transition assertion when a first step appears.
2. [x] Add localized copy and the minimal zero-step view/styles to FocusModeScreen.
3. [x] Run focused tests, type-check, lint, full Jest suite, and package build; inspect the diff and obtain independent review. The final suite passed 221/221 suites and 10,459/10,459 tests.
4. [x] Run `verify-native` in feature mode against the exact branch app SHA. Capture zero-step, editor, and first-step Focus states in English, and the zero-step state in German. See `e2e/reports/issue-687/index.md`.
5. [x] Rebase on fresh main, rerun affected checks, pass PM `check-pr 687`, then publish and bind [PR #710](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/pull/710) without merge; the board is In Review.

## Native state matrix

| Route/state              | Fixture                       | Locale/theme/type       | Expected proof                             |
| ------------------------ | ----------------------------- | ----------------------- | ------------------------------------------ |
| Focus after quick-add    | Goal with zero steps          | English/default/default | Empty explanation and CTA visible          |
| Edit Mode after CTA      | Same goal                     | English/default/default | Add-step input available; goal ID retained |
| Focus after first step   | Same goal with one saved step | English/default/default | First step card appears; empty state gone  |
| Adjacent localized state | Same zero-step goal           | German/default/default  | Translated copy and reachable CTA          |

## Not in Scope

| Item                       | Reason / follow-up                                                               |
| -------------------------- | -------------------------------------------------------------------------------- |
| NewGoal wizard changes     | Separate #685 worker owns that screen.                                           |
| Editor auto-focus behavior | The existing step input is visible; keyboard auto-focus is not required by #687. |

## Discovery Log

- [2026-09-24] Isolated worktree created from fresh `origin/main`; the user's dirty checkout is untouched. EditMode already exposes step entry and Done navigates to FocusMode.
- [2026-09-24] Focus test reproduced the original blank body (one failing assertion) before implementation, then passed 69/69 after the change. PR #705 merged during implementation; this branch will rebase before native verification.

## Review findings and follow-ups

- Independent code-quality and error-handling reviews at `3116bc0` found no concrete user-facing failure path.
- Independent test review found the initial Focus test simulated query data rather than creating a step. Resolved at `3b4d703`: a zero-step editor test asserts first-step creation at ordinal 0 and Done navigation; the Focus test asserts the visible CTA label; `e2e/flows/zero-step-focus.yaml` exercises the persisted native journey.
- A follow-up read-only review checked the new tests, Maestro flow, JUnit results, and screenshots; both coverage findings were resolved with no remaining finding in that scope.
- CodeRabbit CLI was unavailable (`403 Invalid organization` on the preceding issue workflow); no CLI verdict is claimed. GitHub review can run after PR publication.
