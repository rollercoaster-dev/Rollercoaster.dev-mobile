# Development Plan: Issue #685 — protect unfinished work

## Workspace and scope

- Issue: https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/685
- Branch: `codex/issue-685`; base `b70382290001bf31f14690ccfe48be2b352be3aa` (`origin/main`, 2026-09-24)
- Scope: new-goal wizard, text-note and link capture, and existing voice-memo exit paths. Keep data in memory; no draft persistence.

## Intent Verification

- [ ] Header close/back and Link Cancel ask Keep editing or Discard for dirty drafts; Keep editing preserves entered data, Discard leaves.
- [ ] Android back and native-stack gestures cannot remove a dirty route without the same choice.
- [ ] Clean drafts exit immediately; successful saves/replacement leave without a discard prompt.
- [ ] Voice recording, playback, and caption drafts use the same navigation protection, and Discard resets an unsaved recording.
- [ ] English, German, and pseudo-locale copy is complete; behavior remains usable in all seven themes.
- [ ] Native verification records exact tested SHA, device, flow, state, and observed results, including any unavailable states.

## Research findings

- The wizard holds title and step rows in React state; `handleClose` currently calls `navigation.goBack()` without checking either.
- Text-note and link capture hold content/caption in state and exit directly through header; link also has Cancel.
- Voice memo confirms only its custom header back when recording/paused/recorded/playing; a navigator removal bypasses that handler.
- Installed `@react-navigation/native-stack` 7.4.1 integrates `usePreventRemove` with native dismissal prevention; a plain `beforeRemove` listener is insufficient for native gestures. Its own source warns against the latter.
- All four routes are in `GoalsStack`; `NewGoal` is a native modal. Existing test navigation mocks need removal-hook support.

## Decisions

| ID  | Decision                                                                                                                | Rationale                                                                                           |
| --- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| D1  | Use one small unsaved-exit hook around `usePreventRemove`, plus an explicit request-exit function for visible controls. | It covers navigator removals and visible controls with the same decision.                           |
| D2  | Derive dirty from in-memory user input, including caption-only drafts and a changed wizard evidence choice.             | Unpersisted work can matter even when the primary field is empty.                                   |
| D3  | Turn off removal prevention before replaying a confirmed removal or successful-save navigation.                         | Dispatching while still prevented would loop; native-stack requires the guard to be released first. |
| D4  | Keep voice's recording-specific warning and reset step, but use the agreed Keep editing/Discard buttons.                | The warning remains precise while decisions are consistent.                                         |

## Implementation Plan

1. [x] Write failing navigation-guard tests for dirty/clean removal, Keep editing/Discard, and post-save bypass; implement the minimal shared hook.
2. [x] Write failing wizard tests for dirty title/steps, clean close, navigation removal, retained draft, and successful replacement; wire the guard.
3. [x] Write failing text/link tests for body-or-caption draft, header and Cancel, removal, and save bypass; wire the guard.
4. [x] Write failing voice tests for dirty recording/caption, all exit routes, cleanup, and clean exit; wire the guard without changing recording behavior.
5. [ ] Add localized copy, run focused tests, type-check, lint, full tests, and build script; review against acceptance and scope.
6. [ ] Run `verify-native` against the committed HEAD on a disposable simulator, compare before/after where possible, and record each exit-path state honestly. Coordinate with #705 scene-lifecycle fix before claiming iOS proof.
7. [ ] Rebase onto fresh main if needed, rerun exact-head checks, pass PM `check-pr 685`, publish and bind one PR without merge.

## Native state matrix

| Route/state         | Fixture                               | Exit                                  | Expected proof                                     |
| ------------------- | ------------------------------------- | ------------------------------------- | -------------------------------------------------- |
| New goal, clean     | Blank                                 | Close and modal gesture               | Immediate exit                                     |
| New goal, dirty     | Long title and step                   | Close, Android back, modal gesture    | Choice; Keep editing retains fields; Discard exits |
| Text note, dirty    | Body and caption; caption only        | Header, Android back, gesture         | Same choice and retention                          |
| Link, dirty         | Partial URL and caption               | Header, Cancel, Android back, gesture | Same choice and retention                          |
| Voice memo, dirty   | Recording/paused/recorded and caption | Header, Android back, gesture         | Same choice; Discard resets recording              |
| Capture clean/saved | Blank or successful save              | Header/back or Save                   | Immediate exit without discard prompt              |

## Not in Scope

| Item                                | Reason / follow-up                                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Persistent drafts                   | User chose confirmation policy B.                                                                       |
| Camera/video/file capture internals | They have distinct media lifecycles; audit separately if native review finds an uncovered discard path. |

## Discovery Log

- [2026-09-24] Started at fresh `origin/main` in an isolated worktree. The existing main checkout has unrelated dirty documentation and is untouched.

## Review findings and follow-ups

Pending review.
