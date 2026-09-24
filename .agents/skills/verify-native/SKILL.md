---
name: verify-native
description: Verify Rollercoaster.dev-mobile UI behavior on a native iOS or Android build against an issue or PR. Use for feature proof, bug before/after proof, or visual review when tests and diff inspection cannot establish the user-visible result.
---

# Verify native behavior

The deliverable is a verdict for each observable requirement, backed by the app running from the code under review. Screenshots illustrate the verdict; they do not establish it alone. This skill complements the issue acceptance and code-review checks in `.agents/skills/review/`.

## Choose the verification mode

| Mode    | Target                                     | Evidence destination                                                        |
| ------- | ------------------------------------------ | --------------------------------------------------------------------------- |
| Feature | Your implementation or requested UI change | Local report and captures; the issue workflow may attach them to its own PR |
| Bug     | Your fix with a reproducible prior failure | Matched before/after captures and a local report                            |
| Review  | Someone else's PR                          | Local report and captures only; do not edit or upload to their PR           |

Read the issue's acceptance criteria and comments, the implementation plan's **Intent Verification** and **Not in Scope**, and the exact PR diff if a PR exists. Pass the explicit PR number to every `gh pr` command. Compare the claims in the issue, plan, and PR with the behavior the code actually changes; record material documentation drift. Without a PR, compare the branch with fresh `origin/main`, including uncommitted changes. Do not infer success from a filename, commit message, or a test that computes its expected value from the same resource being tested.

Before starting the app, write a compact state list in `tmp/native-verify/<issue-or-pr>/index.md`: the route or user journey, fixture and actual data count, locale, theme, text size, device, expected outcome, and proof method for each relevant state. Include adjacent behavior that a shared component change might affect. Choose states from the acceptance criteria and failure report, not from every changed file. For #699, for example, the populated badge wall needs literal assertions for **1 badge** and **2 badges**, with the underlying number of distinct badge cards or database rows confirmed independently of the heading. `full-ride.yaml` reaches one badge but only asserts that a count element exists. Each top-level Maestro flow clears app state, so earning a second badge requires continuing in the same session or a documented deterministic fixture.

## Prove the code and runtime under test

Use an isolated worktree; leave the user's checkout and data alone. Record `git rev-parse HEAD`, `git status --short`, the base SHA, and, for a PR, `gh pr view <number> --repo rollercoaster-dev/Rollercoaster.dev-mobile --json headRefOid,baseRefOid,url,isDraft`. The worktree HEAD must equal the PR head for a PR verdict. Uncommitted app or package changes make a commit-pinned verdict invalid; either commit and retest or label the run as work in progress.

Build and run from that worktree using `apps/native-rd/.claude/skills/native-rd-build/SKILL.md`. For the iOS E2E lane, create or select a **dedicated disposable simulator** and use `IOS_DEVICE_ID= bun run ios:e2e` in `apps/native-rd`; the launcher otherwise reads `.env.local` and can select a physical device, while Maestro clears app data and keychain. Do not substitute `expo start`. Confirm the selected simulator and app ID, and launch the dev client through the worktree's Metro host/port. Check that Metro's process belongs to this worktree before capturing (`lsof -nP -iTCP:<port> -sTCP:LISTEN`, then `lsof -a -p <pid> -d cwd`). A stale build or server from another checkout invalidates visual evidence. Record the build command, Metro port, `EXPO_PUBLIC_E2E_MODE`, device model/ID, OS, locale, and tested SHA. On Android use the documented `android:e2e` lane and its `.dev` app ID; never uninstall a user's store app.

If a native build, app launch, or source check fails, report that blocker. Do not substitute Storybook, a source inspection, or a prior screenshot for a native pass. Storybook and Jest can provide separate supporting evidence.

## Exercise and capture

- Run relevant existing Maestro flows through `apps/native-rd/e2e/README.md`; add a focused assertion or flow when it is needed to prove the issue's exact outcome. Check literal output, state transition, and data count rather than only the presence of an element. Preserve the JUnit result and note when a flow resets data between runs.
- Reach each listed state in the running app, observe the outcome, and capture a screenshot with `xcrun simctl io <recorded-UDID> screenshot <path>` or `apps/native-rd/.claude/skills/simulator-screenshot/screenshot.sh`. The helper picks the first booted simulator, so compare its returned UDID with the selected one before accepting a capture. Keep captures and a short result note in `tmp/native-verify/<issue-or-pr>/`. Record an accessibility hierarchy when it adds evidence, but remember that an accessible parent may hide child text from Maestro. Use the visible screen and literal assertion together when needed.
- Exercise the nearby state most likely to regress. For layout work, include a compact phone, long content, keyboard, and increased OS text where the issue requires them. For theme work, cover the affected theme and size choices. For localization work, check each supported language implicated by the change. `scripts/run-e2e.sh` pins English, so a German result needs a separate session with its locale confirmed and literal assertions/captures; otherwise mark German **Not checked**. Do not turn an untested matrix cell into a pass.
- Simulator hierarchy and screenshots do not prove VoiceOver or TalkBack focus, motion comfort, camera/audio/file capture, or physical-device behavior. Use a native device and assistive technology for those criteria; otherwise mark them **Not checked** with the exact missing setup. See `e2e/README.md` for the current Maestro and media-capture limits.

For a **bug**, first reproduce the issue on the base commit in a separate worktree and record the actual failure. Use the same device, fixture, locale, theme, viewport, and steps after switching to the fix. If the bug does not reproduce on the base, stop the before/after claim and report the missing reproduction. For a **review**, inspect the PR in its own clean worktree, capture locally, restore any checkout you changed, and leave the PR untouched. Any extra Maestro assertion needed for review belongs in a local scratch flow outside the PR checkout. A failing state needs one clear evidence capture and a failing verdict; do not curate it into a success preview.

## Report and handoff

Complete `tmp/native-verify/<issue-or-pr>/index.md` with the issue/PR URLs, base and tested SHAs, build and device details, commands and exit results, and this table:

| Criterion and state | Expected | Observed | Verdict | Evidence |
| ------------------- | -------- | -------- | ------- | -------- |

Use **Verified**, **Failed**, or **Not checked** per row. Link local captures by absolute path and distinguish observed native behavior from Jest, Storybook, or source evidence. Name every gap and the next action that would resolve it. The overall verdict is **failed** when a required behavior was observed wrong, **blocked** when a required behavior could not be checked, and **verified on the named environment** only when its required rows passed. Do not claim coverage for another platform, device size, theme, locale, or assistive technology from this run.

For your own issue PR, pass the report and capture paths to `.agents/skills/finalize/` so its PR description can state truthful evidence and limitations. Do not create or merge a PR here. For someone else's PR, report local findings to the requester without changing its body, comments, review state, or attachments.
