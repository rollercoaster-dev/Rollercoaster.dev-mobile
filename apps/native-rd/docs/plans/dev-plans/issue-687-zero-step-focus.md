# Development Plan: Issue #687 — zero-step Focus Mode

## Workspace and scope

- Issue: https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/687
- Worker worktree: `/Users/hailmary/.codex/worktrees/issue-687/Rollercoaster.dev-mobile`
- Reserved branch: `codex/issue-687` (PM guard claim exists)
- Initial base: `b70382290001bf31f14690ccfe48be2b352be3aa` (`origin/main`, 2026-09-24)
- Scope: FocusModeScreen, its tests, and focusMode locale resources. Reuse existing EditMode step entry and Done return.

## Intent Verification

- [x] A newly created goal with zero steps shows a concise explanation and an obvious primary action in Focus Mode.
- [x] The primary action opens EditMode for the same goal, where the existing add-step input is available.
- [ ] After the first step is added and EditMode's Done action returns, Focus Mode shows that step as current work rather than the zero-step state. Focus's live-query transition is unit-tested; the native journey remains pending.
- [x] Parked, all-complete, and existing-step states retain their behavior; English, German, and pseudo locale keys remain aligned.
- [ ] Native evidence uses the implementation SHA, or the exact startup/build blocker is reported without claiming proof.

## Decisions

| ID  | Decision                                                                                                       | Rationale                                                                                              |
| --- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| D1  | Keep the zero-step branch in `NoActionableBody`; render an in-screen heading, body, and shared primary Button. | The branch already distinguishes zero steps from parked and complete.                                  |
| D2  | Navigate the CTA to existing `EditMode` with the current goal ID.                                              | EditMode owns step creation, and its Done action already returns to Focus Mode.                        |
| D3  | Add no new navigation parameter or editor mode.                                                                | The existing add-step input is already visible in the editor; this issue needs a useful route into it. |

## Implementation Plan

1. [x] Replace the old chrome-only test with a failing empty-state/navigation test; add a transition assertion when a first step appears.
2. [x] Add localized copy and the minimal zero-step view/styles to FocusModeScreen.
3. [ ] Run focused tests, type-check, lint, full Jest suite, and package build; inspect the diff and obtain independent review.
4. [ ] Run `verify-native` in bug mode against the exact branch SHA when iOS startup permits. Capture zero-step, editor, and first-step Focus states; if #705 remains a blocker, record Not checked.
5. [ ] Rebase on fresh main, rerun affected checks, pass PM `check-pr 687`, then publish and bind one PR without merge.

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

Pending review.
