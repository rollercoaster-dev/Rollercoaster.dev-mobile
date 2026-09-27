# Development Plan: Issue #685 — protect unfinished work

## Workspace and scope

- Issue: https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/685
- Branch: `codex/issue-685`; base includes iOS scene-lifecycle fix `a7628ddff68851863355133d726e51bba3031d8a`; current `origin/main` is `64d09ab4d18593d56e712bf698a77166989ad513` (2026-09-26, PM documentation only since the branch base).
- Scope: new-goal wizard, text-note and link capture, and existing voice-memo exit paths. Keep data in memory; no draft persistence.

## Intent Verification

- [x] Header close/back and Link Cancel ask Keep editing or Discard for dirty drafts; Keep editing preserves entered data, Discard leaves on the named iOS simulator.
- [x] Android Back and native-stack gestures cannot remove a dirty route without the same choice. Exact app source `cf7a888` passed Android wizard/Quick Add/text/link Back and iOS wizard/modal, text, and link swipes.
- [x] Clean drafts exit immediately; successful saves/replacement leave without a discard prompt in tests and named iOS flows.
- [x] Voice recording, paused, playback, and captioned drafts use the same navigation protection. Android emulator native flows reached each state and proved Back/Keep/Discard; Jest covers reset and navigation removal. iOS virtual microphone was not usable.
- [x] English, German, and pseudo-locale copy is present and test-checked; the choice is a theme-neutral system alert. Native sessions covered Full Ride and Still Water; an exhaustive seven-theme native matrix was not run.
- [x] Native verification records exact tested app source `cf7a888`, devices, flows, states, and limits. The before/after report now passes the issue acceptance paths on iOS and Android.

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
5. [x] Add localized copy and run focused Jest, root type-check, lint, and tests (10,485 native tests) with one local task at a time against app commit `cf7a888`.
6. [x] Run `verify-native` against app source `cf7a888` on disposable iPhone 17e/iOS 27 and Pixel 8/Android 36 simulators. Baseline `a7628dd` loss reproduced; candidate passed Quick Add retain/save, clean exit, wizard and capture gestures, Android Back, text/link save bypass, and native voice paused/recorded/playing/captioned states. Detailed report: `tmp/native-verify/issue-685/index.md`.
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
- [2026-09-24] Review of the voice capture path found that its in-screen Discard reset the recording but retained a hidden caption. Clear the caption with that explicit discard so a fresh idle recorder is clean.
- [2026-09-26] Resumed oldest PM reservation after #684 reached review. Current main differs from the branch base only by PM serial-execution documentation (#707). Focused and root checks pass on the current worktree; native verification and independent review remain.
- [2026-09-26] Xcode 27's explicit Clang module path failed repeatedly compiling Sentry 9.29.0 (`_DarwinFoundation1` missing). A build-only `CLANG_ENABLE_EXPLICIT_MODULES=NO` override with `-jobs 2` built both baseline and candidate; neither repo source nor generated Podfile was changed. Metro must listen on IPv4 for the simulator's `127.0.0.1:8081` bundle URL; `--localhost` bound only `::1` on this host.
- [2026-09-26] Native iPhone 17e/iOS 27 before/after confirmed a typed wizard goal vanished on baseline but required a Keep editing/Discard choice on candidate. Candidate also passed clean close, wizard modal swipe, text-note header and left-edge swipe, Link header/Cancel, and successful text/link save exits. The first iOS `back` command while the multiline keyboard was open dismissed the keyboard rather than attempting navigation; after keyboard dismissal the left-edge swipe triggered the guard. Voice recording did not reach `Recording` in this simulator session; no native voice verdict is claimed.
- [2026-09-26] Exact app commit `cf7a888` built with the same Xcode workaround. Dedicated iPhone 17e native flows passed for Quick Add's previously unsubmitted step on Close/Keep/Discard and on Start Working (ready count and saved Focus title), wizard clean close and dirty modal swipe, and text/link header choices. Serial install/patch, type-check, lint, and 222 Jest suites / 10,485 native tests passed. Metro was stopped and the simulator shut down. Android Back and voice capture remain required blockers, so no PR was created.
- [2026-09-26] Located the Android SDK at `/Volumes/SpinDrive/runner-ci/android-sdk`; dedicated API 36/ARM64 AVD booted with `-no-audio` after CoreAudio output initialization hung. The package launcher shortened `JAVA_HOME`, so the repository's Android script was called directly. A private CMake/Ninja copy capped native compilation to two jobs. Exact-source Android APK built and installed; Maestro JUnit passes for wizard/Quick Add Back, text/link Back and link save, and voice recording/paused/playing/captioned Back/Keep/Discard. Exact-source iOS rerun passed text/link native left-edge swipes and both save exits. The native fixtures and all Metro/Gradle processes were stopped afterward.

## Review findings and follow-ups

- Code-quality review found a P1: Quick Add's new-step input lived only inside `EditGoalStepList`; with an otherwise blank wizard it could be lost on close without a prompt. A red regression test reproduced this. Hoist that draft through an optional controlled prop so it counts as dirty and survives wizard back; rerun native proof on the new HEAD.
- Code-quality review found a P2: a caption-only voice draft after Re-record received recording-specific warning text. A red test reproduced it. Use generic unsaved-work copy when no recording exists.
- Test-coverage review found that four tests invoked Keep editing and then Discard from the same mock alert. Each now reopens the prompt; focused tests passed. It also flagged required Android and native voice proof.
- Failure-path review found a P1: text, link, and voice capture treated an Evolu `{ ok: false }` insert as a successful save and left, losing the draft. Red tests reproduced all three. Check the mutation Result before exiting, report the failure, and retain the form.
- Failure-path review found a P2: a voice permission request could complete after reset or route unmount and start recording. Red hook and screen tests reproduced the risk. Treat pending permission as dirty, cancel stale starts after each await, and invalidate them on reset/unmount.
- Re-review found a P1 continuation: an add-row step survived Back but was omitted when “I'm ready” advanced to persistence. A red screen test reproduced the loss. Commit the trimmed row before advancing so the ready count and saved goal include it.
- Re-review also noted a P2 resource risk in `useAudioRecorder.ts`: reset/unmount during asynchronous audio-mode setup or recorder preparation may leave a prepared native recorder or audio mode enabled, although the generation guard prevents `record()` after exit. This was not reproduced natively. Next action: exercise cancellation at both await boundaries on a microphone-capable device and add lifecycle cleanup if the native session remains active; this does not establish a reproduced draft-loss path.
- Three sequential independent perspectives re-reviewed `cf7a888`: no remaining confirmed data-loss path. CodeRabbit CLI returned 403 `Invalid organization` and did not review. Native Android, voice, and exact-source iOS gesture/save proof are now recorded. The asynchronous recorder-resource risk remains a non-reproduced P2 follow-up; it is not evidence of a remaining draft-loss path.
