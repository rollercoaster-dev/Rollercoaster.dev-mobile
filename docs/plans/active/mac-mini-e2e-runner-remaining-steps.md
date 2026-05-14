# Mac Mini E2E Runner Remaining Steps Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish issue #895 from the current blocked state by starting the registered `mac-mini-e2e` runner from the correct macOS session, validating Simulator/Maestro under that environment, documenting evidence, and leaving the issue ready for PR/merge closeout.

**Architecture:** The GitHub Actions runner is already registered and installed under `/Users/runner/actions-runner`. The remaining blocker is launchd session state: GitHub's generated `svc.sh` installs a per-user LaunchAgent and must be started from a real `runner` GUI login session, not from `sudo -iu runner`. After the runner is online, validate native-rd's E2E path and capture evidence before commenting on the GitHub issue.

**Tech Stack:** macOS 26.5, Xcode 26.3, iOS Simulator 26.2, GitHub Actions runner v2.334.0, Bun 1.3.7, Expo/React Native, Maestro 2.5.1, GitHub CLI.

---

## Permission Legend

- **Admin GUI user:** the normal admin-capable macOS user, currently `hailmary`.
- **Runner GUI user:** the dedicated non-admin macOS user `runner`, UID 502.
- **No sudo:** command should run without `sudo`.
- **Admin password:** command or GUI action prompts for an admin account password.
- **Runner password:** GUI login or Terminal session requires the `runner` account password.
- **GitHub auth:** command requires `gh` to be authenticated to `rollercoaster-dev/monorepo`.
- **Network:** command contacts GitHub, package registries, Expo services, or Homebrew.
- **Writes:** command mutates local files, Simulator state, GitHub state, or the repo.

## Source Evidence

- Local `svc.sh`: refuses root, installs to `~/Library/LaunchAgents`, starts with `launchctl load -w`.
- Local generated plist: runs `/Users/runner/actions-runner/runsvc.sh` with `ProcessType` set to `Interactive`.
- GitHub self-hosted runner service docs: macOS runner services use `svc.sh`; custom service mechanisms must invoke `runsvc.sh`.
- Apple `launchctl` docs: `gui/<uid>` targets the user's GUI login domain; `sudo -iu runner` does not create that domain.
- Apple support docs: use GUI login, fast user switching, automatic login, or documented password reset flows instead of CLI password guesses.

## Current Verified State

- `runner` account exists, UID 502, non-admin.
- `/Users/runner/actions-runner` exists.
- Runner `mac-mini-e2e` is registered in GitHub with labels `self-hosted`, `macOS`, `ARM64`, `e2e`, `native-rd`.
- GitHub currently reports the runner as `offline`.
- `launchctl print gui/502` currently reports `Could not find domain for user gui: 502`.
- `./svc.sh start` from `sudo -iu runner` failed with `Load failed: 5: Input/output error`.
- Do not retry `sudo launchctl bootstrap gui/502 ...` while `gui/502` is missing.

## Task 1: Reconfirm The Blocker Before Changing Anything

**Files:**

- No file changes.

- [ ] **Step 1: Verify the current shell and launchd manager**

Run from the admin user's Terminal:

```bash
whoami
id -u
launchctl managername
launchctl manageruid
```

Permissions:

- Run as: `hailmary`
- Needs sudo/admin: no
- Network: no
- Writes: none

Expected:

```text
hailmary
501
Aqua
501
```

Stop if: the user or UID is not the admin GUI account. Re-orient before continuing.

- [ ] **Step 2: Verify `runner` account identity**

Run:

```bash
id runner
```

Permissions:

- Run as: `hailmary`
- Needs sudo/admin: no
- Network: no
- Writes: none

Expected: output includes `uid=502(runner)` and does not include `admin`.

Stop if: `runner` is missing or appears in the `admin` group.

- [ ] **Step 3: Verify the GUI domain is still absent**

Run:

```bash
launchctl print gui/502
```

Permissions:

- Run as: `hailmary`
- Needs sudo/admin: no
- Network: no
- Writes: none

Expected while blocked:

```text
Bad request.
Could not find domain for user gui: 502
```

If this command succeeds instead: skip Task 2 and go directly to Task 3.

- [ ] **Step 4: Verify GitHub still sees the registered runner**

Run:

```bash
gh api repos/rollercoaster-dev/monorepo/actions/runners --jq '.runners[] | select(.name == "mac-mini-e2e") | {name,status,busy,labels:[.labels[].name]}'
```

Permissions:

- Run as: `hailmary`
- Needs sudo/admin: no
- GitHub auth: read access to `rollercoaster-dev/monorepo`
- Network: yes, GitHub API
- Writes: none

Expected while blocked:

```json
{
  "name": "mac-mini-e2e",
  "status": "offline",
  "busy": false,
  "labels": ["self-hosted", "macOS", "ARM64", "e2e", "native-rd"]
}
```

Stop if: the runner is missing, labels are wrong, or GitHub CLI is not authenticated.

## Task 2: Create A Real `runner` GUI Login Session

**Files:**

- No file changes.

- [ ] **Step 1: Log into macOS as `runner` through the GUI**

Use one Apple-supported GUI path:

```text
Apple menu -> Lock Screen, then choose Other User / runner
```

or:

```text
Control Center -> user menu / fast user switching -> Login Window -> runner
```

Permissions:

- Run as: physical/local operator at the Mac
- Needs sudo/admin: no command-line sudo
- Requires: `runner` account password
- Network: no
- Writes: macOS creates the `runner` GUI/login session state

Expected: the desktop or first-login setup for `runner` appears.

Stop if: the `runner` password is unknown. Do not guess CLI password reset commands. Use Apple's documented login password reset path from the login window or macOS Recovery.

- [ ] **Step 2: Open Terminal inside the `runner` GUI session**

Run in Terminal opened from the `runner` desktop:

```bash
whoami
id -u
launchctl managername
launchctl manageruid
```

Permissions:

- Run as: `runner`
- Needs sudo/admin: no
- Network: no
- Writes: none

Expected:

```text
runner
502
Aqua
502
```

Stop if: `whoami` is not `runner` or `launchctl manageruid` is not `502`. This means the Terminal is not running inside the correct GUI session.

- [ ] **Step 3: Verify the `runner` GUI domain exists**

Run in the same `runner` Terminal:

```bash
launchctl print gui/502 >/tmp/runner-gui-502.txt && head -40 /tmp/runner-gui-502.txt
```

Permissions:

- Run as: `runner`
- Needs sudo/admin: no
- Network: no
- Writes: `/tmp/runner-gui-502.txt`

Expected: the command succeeds and prints launchd domain details instead of `Could not find domain`.

Stop if: the command still says the domain cannot be found. Log out and log back in through the GUI; do not use `sudo launchctl bootstrap gui/502`.

## Task 3: Start The GitHub Runner LaunchAgent

**Files:**

- No file changes.

- [ ] **Step 1: Confirm the service files are present**

Run in Terminal inside the `runner` GUI session:

```bash
cd /Users/runner/actions-runner
test -x ./svc.sh
test -x ./runsvc.sh
test -f ./.service
cat ./.service
```

Permissions:

- Run as: `runner`
- Needs sudo/admin: no
- Network: no
- Writes: none

Expected:

```text
/Users/runner/Library/LaunchAgents/actions.runner.rollercoaster-dev-monorepo.mac-mini-e2e.plist
```

Stop if: any `test` command fails or `.service` points somewhere else.

- [ ] **Step 2: Start the service**

Run in Terminal inside the `runner` GUI session:

```bash
cd /Users/runner/actions-runner
./svc.sh start
```

Permissions:

- Run as: `runner`
- Needs sudo/admin: no
- Network: yes, the runner process contacts GitHub after launch
- Writes: launchd user service state, runner logs under `/Users/runner/actions-runner/_diag/` and `/Users/runner/Library/Logs/actions.runner.rollercoaster-dev-monorepo.mac-mini-e2e/`

Expected:

```text
starting actions.runner.rollercoaster-dev-monorepo.mac-mini-e2e
status actions.runner.rollercoaster-dev-monorepo.mac-mini-e2e:

/Users/runner/Library/LaunchAgents/actions.runner.rollercoaster-dev-monorepo.mac-mini-e2e.plist

Started:
```

Stop if: it returns `Load failed: 5` again. Capture logs in Task 3 Step 4 before changing anything.

- [ ] **Step 3: Verify local service status**

Run in Terminal inside the `runner` GUI session:

```bash
cd /Users/runner/actions-runner
./svc.sh status
```

Permissions:

- Run as: `runner`
- Needs sudo/admin: no
- Network: no
- Writes: none

Expected: output contains `Started:` and the service label `actions.runner.rollercoaster-dev-monorepo.mac-mini-e2e`.

Stop if: status is `Stopped`.

- [ ] **Step 4: If service start fails, collect only diagnostics**

Run in Terminal inside the `runner` GUI session:

```bash
cd /Users/runner/actions-runner
tail -200 _diag/*.log
ls -la /Users/runner/Library/Logs/actions.runner.rollercoaster-dev-monorepo.mac-mini-e2e
tail -200 /Users/runner/Library/Logs/actions.runner.rollercoaster-dev-monorepo.mac-mini-e2e/stdout.log
tail -200 /Users/runner/Library/Logs/actions.runner.rollercoaster-dev-monorepo.mac-mini-e2e/stderr.log
```

Permissions:

- Run as: `runner`
- Needs sudo/admin: no
- Network: no
- Writes: none

Expected: diagnostic output that identifies the failing layer.

Stop after collecting diagnostics. Do not change ownership, plist keys, account groups, or service domain without a new evidence-based plan.

## Task 4: Verify GitHub Sees The Runner Online

**Files:**

- No file changes.

- [ ] **Step 1: Query GitHub runner status**

Run from either the admin Terminal or the `runner` Terminal, whichever has authenticated `gh`:

```bash
gh api repos/rollercoaster-dev/monorepo/actions/runners --jq '.runners[] | select(.name == "mac-mini-e2e") | {name,status,busy,labels:[.labels[].name]}'
```

Permissions:

- Run as: `hailmary` or `runner`
- Needs sudo/admin: no
- GitHub auth: read access to `rollercoaster-dev/monorepo`
- Network: yes, GitHub API
- Writes: none

Expected:

```json
{
  "name": "mac-mini-e2e",
  "status": "online",
  "busy": false,
  "labels": ["self-hosted", "macOS", "ARM64", "e2e", "native-rd"]
}
```

Stop if: status is not `online`. Do not continue to E2E validation as runner-complete evidence.

- [ ] **Step 2: Save the evidence locally**

Run from the monorepo root:

```bash
mkdir -p /tmp/native-rd-e2e-runner-evidence
gh api repos/rollercoaster-dev/monorepo/actions/runners --jq '.runners[] | select(.name == "mac-mini-e2e") | {name,status,busy,labels:[.labels[].name]}' > /tmp/native-rd-e2e-runner-evidence/runner-status.json
cat /tmp/native-rd-e2e-runner-evidence/runner-status.json
```

Permissions:

- Run as: `hailmary` or `runner`
- Needs sudo/admin: no
- GitHub auth: read access to `rollercoaster-dev/monorepo`
- Network: yes, GitHub API
- Writes: `/tmp/native-rd-e2e-runner-evidence/runner-status.json`

Expected: JSON file contains `status: "online"`.

## Task 5: Validate Simulator And Toolchain In The Same GUI Session

**Files:**

- No file changes.

- [ ] **Step 1: Verify Xcode and Simulator**

Run in Terminal inside the `runner` GUI session if possible. If the repo is only accessible from `hailmary`, run from `hailmary` but record that this validates the host, not the runner account.

```bash
xcode-select -p
xcodebuild -version
xcrun simctl list devices available
```

Permissions:

- Run as: preferred `runner`; acceptable `hailmary` for host-only validation
- Needs sudo/admin: no
- Network: no
- Writes: Simulator service may write user-local logs/cache

Expected:

```text
/Applications/Xcode.app/Contents/Developer
Xcode 26.3
-- iOS 26.2 --
    iPhone 17 ...
```

Stop if: Simulator cannot list devices from the `runner` GUI session. This is the exact environment the service needs.

- [ ] **Step 2: Verify Maestro from the same account**

Run:

```bash
command -v maestro
MAESTRO_CLI_NO_ANALYTICS=true MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true maestro --version
```

Permissions:

- Run as: same account used for Step 1
- Needs sudo/admin: no
- Network: no
- Writes: Maestro may initialize user-local cache under `~/.maestro`

Expected:

```text
/opt/homebrew/bin/maestro
2.5.1
```

Stop if: Maestro is missing or cannot initialize under the account that will run E2E.

## Task 6: Validate Native App Build And Maestro E2E

**Files:**

- No file changes unless dependency install unexpectedly changes lockfiles.

- [ ] **Step 1: Install monorepo dependencies**

Run from the monorepo root:

```bash
bun install --frozen-lockfile
```

Permissions:

- Run as: account with write access to the monorepo checkout
- Needs sudo/admin: no
- Network: yes if dependencies are missing from cache
- Writes: dependency store/cache, `node_modules`; must not modify `bun.lock`

Expected: install succeeds and does not modify the lockfile.

Stop if: `bun.lock` changes or dependency resolution fails.

- [ ] **Step 2: Build workspace dependencies**

Run from the monorepo root:

```bash
bun run turbo build --filter=native-rd^...
```

Permissions:

- Run as: account with write access to repo build outputs
- Needs sudo/admin: no
- Network: no expected
- Writes: package build outputs and Turborepo cache

Expected: build exits 0.

Stop if: build fails; fix the build before E2E.

- [ ] **Step 3: Boot an iPhone simulator if none is booted**

First inspect:

```bash
xcrun simctl list devices booted
```

If no iOS simulator is booted, run:

```bash
xcrun simctl boot "iPhone 17"
```

Permissions:

- Run as: account running E2E, preferably `runner`
- Needs sudo/admin: no
- Network: no
- Writes: Simulator runtime state in that user's Library

Expected: `xcrun simctl list devices booted` shows `iPhone 17` or another iOS 26.2 iPhone device.

Stop if: boot fails. Capture the exact `simctl` error before changing Simulator state.

- [ ] **Step 4: Build and install the E2E app**

Run from the monorepo root:

```bash
bun run native:ios:e2e
```

Permissions:

- Run as: account running E2E, preferably `runner`
- Needs sudo/admin: no
- Network: yes if Expo/React Native needs uncached packages or metadata
- Writes: native build outputs, iOS Simulator app install state

Expected: Expo/React Native builds and installs app ID `dev.rollercoaster.app` onto the booted simulator.

Stop if: install fails or prompts for a permission not listed here.

- [ ] **Step 5: Verify app container exists**

Run:

```bash
xcrun simctl get_app_container booted dev.rollercoaster.app
```

Permissions:

- Run as: same account that installed the app
- Needs sudo/admin: no
- Network: no
- Writes: none

Expected: prints a Simulator app container path.

Stop if: app container is missing.

- [ ] **Step 6: Run one required Maestro flow**

Run from `apps/native-rd`:

```bash
cd apps/native-rd
MAESTRO_CLI_NO_ANALYTICS=true MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true bun run test:e2e:single e2e/flows/goal-create.yaml
```

Permissions:

- Run as: same account that installed the app
- Needs sudo/admin: no
- Network: no expected
- Writes: Maestro result logs/screenshots under user-local Maestro directories

Expected: Maestro reports the flow passed.

Stop if: the flow fails. Capture Maestro output and do not claim runner completion.

- [ ] **Step 7: Run the full native-rd E2E suite**

Run from `apps/native-rd`:

```bash
cd apps/native-rd
MAESTRO_CLI_NO_ANALYTICS=true MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true bun run test:e2e
```

Permissions:

- Run as: same account that installed the app
- Needs sudo/admin: no
- Network: no expected
- Writes: Maestro result logs/screenshots under user-local Maestro directories

Expected: Maestro runs `e2e/flows/` and reports passing results.

Stop if: the suite fails.

## Task 7: Document Evidence And Prepare PR

**Files:**

- Modify: `docs/infrastructure/native-rd-mac-mini-e2e-runner.md`
- Modify: `docs/index.md`
- Optional evidence files: `/tmp/native-rd-e2e-runner-evidence/*` only; do not commit `/tmp`.

- [ ] **Step 1: Update runbook status and evidence**

Edit `docs/infrastructure/native-rd-mac-mini-e2e-runner.md`:

```markdown
Status: active
Last verified: 2026-05-10
```

Add a short verification section with:

```markdown
## Verification Evidence

- GitHub runner status: `online`
- Runner labels: `self-hosted`, `macOS`, `ARM64`, `e2e`, `native-rd`
- Xcode: 26.3
- iOS Simulator runtime: iOS 26.2
- Maestro: 2.5.1
- App ID installed: `dev.rollercoaster.app`
- Required flow validated: `e2e/flows/goal-create.yaml`
- Full E2E suite validated: `bun run test:e2e`
```

Permissions:

- Run as: `hailmary`
- Needs sudo/admin: no
- Network: no
- Writes: repo docs

Expected: runbook reflects actual evidence only.

- [ ] **Step 2: Check docs and script diff**

Run:

```bash
git diff -- docs/infrastructure/native-rd-mac-mini-e2e-runner.md docs/index.md docs/plans/active/2026-05-10-mac-mini-e2e-runner-remaining-steps.md scripts/setup-mac-mini-e2e-runner.sh apps/native-rd/e2e/README.md
```

Permissions:

- Run as: `hailmary`
- Needs sudo/admin: no
- Network: no
- Writes: none

Expected: diff contains only runner setup/runbook/E2E doc changes.

- [ ] **Step 3: Commit on the feature branch**

Run:

```bash
git branch --show-current
git add docs/infrastructure/native-rd-mac-mini-e2e-runner.md docs/index.md docs/plans/active/2026-05-10-mac-mini-e2e-runner.md docs/plans/active/2026-05-10-mac-mini-e2e-runner-remaining-steps.md scripts/setup-mac-mini-e2e-runner.sh apps/native-rd/e2e/README.md
git commit -m "docs: document mac mini e2e runner setup"
```

Permissions:

- Run as: `hailmary`
- Needs sudo/admin: no
- Network: no
- Writes: git index and local commit

Expected: current branch is not `main`; commit succeeds.

Stop if: branch is `main`.

## Task 8: Comment On Issue #895

**Files:**

- No file changes.

- [ ] **Step 1: Post verification evidence**

Run only after Tasks 1-7 pass:

```bash
gh issue comment 895 --repo rollercoaster-dev/monorepo --body "Mac Mini E2E runner setup verified:

- Runner user: runner, non-admin
- Runner name: mac-mini-e2e
- Labels: self-hosted, macOS, ARM64, e2e, native-rd
- Runner status: online
- Xcode: 26.3
- iOS Simulator: 26.2 runtime available
- Maestro: 2.5.1
- App ID: dev.rollercoaster.app installed on booted simulator
- Validation: e2e/flows/goal-create.yaml passed
- Validation: full native-rd E2E suite passed
- Docs: docs/infrastructure/native-rd-mac-mini-e2e-runner.md"
```

Permissions:

- Run as: `hailmary`
- Needs sudo/admin: no
- GitHub auth: issue comment permission on `rollercoaster-dev/monorepo`
- Network: yes, GitHub API
- Writes: GitHub issue comment

Expected: comment posts to issue #895.

- [ ] **Step 2: Close issue after PR merge only**

Run only after the documentation PR is merged:

```bash
gh issue close 895 --repo rollercoaster-dev/monorepo --comment "Completed by provisioning mac-mini-e2e and documenting the setup in docs/infrastructure/native-rd-mac-mini-e2e-runner.md."
```

Permissions:

- Run as: `hailmary`
- Needs sudo/admin: no
- GitHub auth: issue close permission on `rollercoaster-dev/monorepo`
- Network: yes, GitHub API
- Writes: GitHub issue state

Expected: issue #895 is closed.

Stop if: PR is not merged.

## Explicit Non-Steps

- Do not run `sudo launchctl bootstrap gui/502 ...` while `launchctl print gui/502` says the domain does not exist.
- Do not run `svc.sh` with `sudo`; local `svc.sh` explicitly refuses root.
- Do not change ownership of `/Users/runner/actions-runner` unless diagnostics prove ownership is the root cause.
- Do not add `runner` to `admin`.
- Do not change the runner execution user.
- Do not make the Ubuntu CI E2E job fail when Maestro is missing as part of issue #895; that is a separate workflow enforcement decision.
- Do not close #895 before the runner is online, E2E validation passes, docs are committed, and the PR is merged.

## Self-Review

- Spec coverage: covers the remaining service-start blocker, GitHub online verification, Simulator/Maestro validation, documentation, commit, issue comment, and issue closeout.
- Permission coverage: every command lists run context, sudo/admin needs, network access, and write targets.
- Placeholder scan: no `TBD`, `TODO`, or unspecified commands remain.
- Safety check: all account/password/launchd steps use diagnostics first and avoid unsupported mutation.
