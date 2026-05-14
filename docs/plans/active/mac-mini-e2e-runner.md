# Mac Mini E2E Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete issue #895 by provisioning the Mac Mini as a GitHub Actions self-hosted runner for `native-rd` Maestro E2E tests.

**Architecture:** The runner is a dedicated non-admin macOS account named `runner`, registered to `rollercoaster-dev/monorepo` with labels `self-hosted`, `macOS`, and `e2e`. Native E2E tests remain package-owned under `apps/native-rd`; this issue focuses on host setup, runner registration, simulator reliability, and reproducible documentation.

**Tech Stack:** macOS 26.5, Xcode 26.3, iOS Simulator 26.2, GitHub Actions runner v2.334.0 for `osx-arm64`, Bun 1.3.7, Expo/React Native, Maestro.

---

## Current State From Review

- Permissioned remaining-steps plan: `docs/plans/active/2026-05-10-mac-mini-e2e-runner-remaining-steps.md`. Use that plan for all remaining commands; it supersedes the older Task 3-7 command sequencing where the two conflict.
- GitHub issue: #895, open, parent epic #889.
- Current host: `Hail-Mary.fritz.box`.
- Current user: `hailmary`.
- Dedicated runner user exists: `runner`, UID 502, home `/Users/runner`.
- `runner` is not an admin user: groups are `staff`, `everyone`, `localaccounts`, `_lpoperator`, and local sharepoint groups.
- Xcode is selected: `/Applications/Xcode.app/Contents/Developer`.
- Xcode version is installed: `Xcode 26.3`, build `17C529`.
- iOS Simulator devices are available for iOS 26.2, including `iPhone 17`.
- Maestro mobile-dev CLI is installed at `/opt/homebrew/bin/maestro`.
- Maestro version verified with `MAESTRO_CLI_NO_ANALYTICS=true MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true maestro --version`: `2.5.1`.
- Important correction: `brew install maestro` installs the wrong Maestro app cask. Use `brew tap mobile-dev-inc/tap` and `brew install mobile-dev-inc/tap/maestro`.
- GitHub runner `mac-mini-e2e` is registered for `rollercoaster-dev/monorepo`.
- Runner labels are correct: `self-hosted`, `macOS`, `ARM64`, `e2e`, `native-rd`.
- Runner is currently `offline`, not complete.
- `/Users/runner/actions-runner` exists and contains `.runner`, `.credentials`, `config.sh`, `run.sh`, generated `svc.sh`, generated `runsvc.sh`, and `_diag/`.
- The runner LaunchAgent exists at `/Users/runner/Library/LaunchAgents/actions.runner.rollercoaster-dev-monorepo.mac-mini-e2e.plist`.
- `./svc.sh status` as `runner` reports `Stopped`.
- `./svc.sh start` as `runner` failed with `Load failed: 5: Input/output error`.
- Local inspection showed `launchctl print gui/502` failed with `Could not find domain for user gui: 502`; this means no GUI launchd session was loaded for `runner` at that time.
- Do not suggest ownership changes or changing the execution user without primary-source evidence and explicit approval.
- Password reset for `runner` is blocked from CLI by Secure Token policy on this machine. Do not keep guessing reset commands. Use Apple-supported GUI reset or primary docs only.
- `docs/infrastructure/` does not exist yet.
- Existing native E2E commands are documented in `apps/native-rd/e2e/README.md`.
- Existing E2E script `apps/native-rd/scripts/run-e2e.sh` exits successfully when Maestro is missing, so CI can silently skip native E2E unless this is tightened later.
- Existing root `.github/workflows/ci.yml` has an `e2e-test` job on `ubuntu-latest`; that job is not the Mac Mini Maestro/iOS Simulator path.
- Existing `.github/workflows/ci-native-rd.yml` runs lint, typecheck, and Jest on Ubuntu only.

## Handoff Notes For Fresh Context

- The human is frustrated because previous assistant steps guessed at macOS account/password/runner-service commands. Do not repeat that.
- Follow `AGENTS.md` `System/Admin Commands`: research or inspect first, state evidence, prefer diagnostics before mutation.
- Primary docs already checked:
  - GitHub service docs: `https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/configure-the-application`
  - GitHub troubleshooting docs: `https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/monitor-and-troubleshoot?platform=mac`
  - GitHub add-runner docs: `https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/add-runners`
  - Known GitHub runner issue for `Load failed: 5`: `https://github.com/actions/runner/issues/1959`
- Corrected service-debugging constraint:
  - `gui/502` is a GUI login domain, not something created by `sudo -iu runner`.
  - `launchctl print gui/502` currently fails with `Could not find domain for user gui: 502`.
  - Do not retry `sudo launchctl bootstrap gui/502 ...` while that domain is absent; it cannot load into a missing GUI domain.
  - A real GUI login session for `runner` is required before the generated LaunchAgent path can start through `gui/502`.
  - The generated `svc.sh` is a non-root LaunchAgent wrapper and calls `launchctl load -w`.
  - GitHub documents `runsvc.sh` as the required entry point for customized macOS service mechanisms.
  - Apple documents `gui/<uid>` as another form of the GUI login domain, created by GUI login.
- Do not recommend `sudo chown -R "$USER":staff /Users/runner/actions-runner`; that was an unsupported suggestion and should be ignored.
- If the immediate goal is only password reset, do not provide more CLI guesses. Use verified Apple documentation or the macOS GUI reset path.

## File Structure

- Create `docs/infrastructure/native-rd-mac-mini-e2e-runner.md`: reproducible Mac Mini setup runbook and recovery guide.
- Modify `docs/index.md`: add the new infrastructure runbook to the documentation catalog.
- Optional follow-up after #895: create a separate issue for workflow enforcement if the project wants required Maestro CI gates rather than a provisioned target.

## Task 1: Confirm Host Baseline

**Files:**

- No file changes.

- [ ] **Step 1: Confirm OS and Xcode**

Run:

```bash
sw_vers
xcode-select -p
xcodebuild -version
```

Expected:

```text
ProductName: macOS
ProductVersion: 26.5
/Applications/Xcode.app/Contents/Developer
Xcode 26.3
```

- [ ] **Step 2: Confirm iOS Simulator runtime**

Run:

```bash
xcrun simctl list devices available
```

Expected: output contains an iOS 26.2 runtime and at least one iPhone simulator, for example:

```text
-- iOS 26.2 --
    iPhone 17 (...) (Shutdown)
```

- [ ] **Step 3: Confirm the runner account is non-admin**

Run:

```bash
id runner
```

Expected: output includes `uid=502(runner)` and does not include `admin`.

## Task 2: Install Maestro

**Files:**

- No file changes.

- [ ] **Step 1: Install Maestro through Homebrew**

Run as an admin-capable local user:

```bash
brew tap mobile-dev-inc/tap
brew install mobile-dev-inc/tap/maestro
```

Expected: Homebrew installs Maestro without errors.

- [ ] **Step 2: Verify Maestro is available**

Run:

```bash
command -v maestro
maestro --version
```

Expected: `command -v maestro` prints a Homebrew path such as `/opt/homebrew/bin/maestro`, and `maestro --version` prints a version string.

- [ ] **Step 3: Confirm the `runner` user can use Maestro**

Run:

```bash
sudo -iu runner zsh -lc 'command -v maestro && maestro --version'
```

Expected: the `runner` shell finds Maestro and prints the same version.

## Task 3: Install And Register The GitHub Actions Runner

**Files:**

- Create: `scripts/setup-mac-mini-e2e-runner.sh`

- [ ] **Step 1: Run the setup script**

Run from the monorepo root:

```bash
./scripts/setup-mac-mini-e2e-runner.sh
```

Expected: the script creates `/Users/runner/actions-runner`, downloads and extracts the GitHub Actions runner, registers it as `mac-mini-e2e`, installs the launchd service, and prints the runner's GitHub registration record. If no `runner` GUI login domain exists, the script stops with instructions to log into macOS graphically as `runner` and start the LaunchAgent from Terminal in that session.

- [ ] **Step 2: If the script fails, use the explicit error message**

The script stops immediately when a prerequisite or command fails. Re-run the same command after fixing the reported issue:

```bash
./scripts/setup-mac-mini-e2e-runner.sh
```

Expected: the rerun skips already completed download work when the archive is present and non-empty.

- [ ] **Step 3: Verify GitHub sees the runner**

Run:

```bash
gh api repos/rollercoaster-dev/monorepo/actions/runners --jq '.runners[] | select(.name == "mac-mini-e2e") | {name,status,busy,labels:[.labels[].name]}'
```

Expected:

```json
{
  "name": "mac-mini-e2e",
  "status": "online",
  "busy": false,
  "labels": ["self-hosted", "macOS", "ARM64", "e2e", "native-rd"]
}
```

Current result as of 2026-05-10:

```json
{
  "name": "mac-mini-e2e",
  "status": "offline",
  "busy": false,
  "labels": ["self-hosted", "macOS", "ARM64", "e2e", "native-rd"]
}
```

Do not proceed to Task 4 until the runner is online or the user explicitly chooses to validate E2E outside GitHub Actions.

- [ ] **Step 4: If the runner is offline because `gui/502` is absent, create the GUI login session**

Do not use `sudo -iu runner` for this step; it does not create the GUI login domain. Use a real macOS GUI login for `runner` through the login window or fast user switching. If the `runner` password is unknown, use Apple's documented login-password reset flow from the login window or macOS Recovery.

After logging in graphically as `runner`, open Terminal in that session and run:

```bash
cd /Users/runner/actions-runner
./svc.sh start
```

Expected:

```text
Started:
```

Then verify from either account:

```bash
launchctl print gui/502
gh api repos/rollercoaster-dev/monorepo/actions/runners --jq '.runners[] | select(.name == "mac-mini-e2e") | {name,status,busy,labels:[.labels[].name]}'
```

Expected: `launchctl print gui/502` finds the domain and GitHub reports `status: "online"`.

## Task 4: Validate Native App Build Under E2E Mode

**Files:**

- No file changes.

- [ ] **Step 1: Install monorepo dependencies**

Run from the monorepo root:

```bash
bun install --frozen-lockfile
```

Expected: dependencies install without lockfile changes.

- [ ] **Step 2: Build workspace dependencies**

Run:

```bash
bun run turbo build --filter=native-rd^...
```

Expected: workspace dependencies build successfully.

- [ ] **Step 3: Build and install the iOS E2E app**

Run:

```bash
bun run native:ios:e2e
```

Expected: Expo builds and installs `dev.rollercoaster.app` on a booted iOS simulator.

- [ ] **Step 4: Confirm the installed app exists**

Run:

```bash
xcrun simctl get_app_container booted dev.rollercoaster.app
```

Expected: command prints an app container path.

## Task 5: Validate Maestro Against The Simulator

**Files:**

- No file changes.

- [ ] **Step 1: Run a required single flow**

Run:

```bash
cd apps/native-rd
bun run test:e2e:single e2e/flows/goal-create.yaml
```

Expected: Maestro reports the flow passed.

- [ ] **Step 2: Run the full native-rd E2E suite**

Run:

```bash
cd apps/native-rd
bun run test:e2e
```

Expected: Maestro runs the flow directory and reports passing results.

- [ ] **Step 3: Capture the simulator state for reproducibility**

Run:

```bash
xcrun simctl list devices available
```

Expected: the selected simulator remains available after the E2E run.

## Task 6: Document The Setup

**Files:**

- Create: `docs/infrastructure/native-rd-mac-mini-e2e-runner.md`
- Modify: `docs/index.md`

- [ ] **Step 1: Create the infrastructure runbook**

Create `docs/infrastructure/native-rd-mac-mini-e2e-runner.md` with this content:

````markdown
# native-rd Mac Mini E2E Runner

Status: blocked until `runner` has a GUI login session
Owner: rollercoaster.dev
Issue: #895

## Purpose

The Mac Mini runs `native-rd` Maestro E2E tests against an iOS Simulator through a GitHub Actions self-hosted runner.

## Host Baseline

- macOS: 26.5
- Xcode: 26.3
- Simulator runtime: iOS 26.2
- Runner account: `runner`
- Runner name: `mac-mini-e2e`
- Runner labels: `self-hosted`, `macOS`, `ARM64`, `e2e`, `native-rd`

## Installed Tools

```bash
brew tap mobile-dev-inc/tap
brew install mobile-dev-inc/tap/maestro
```
````

Validate:

```bash
command -v maestro
maestro --version
xcode-select -p
xcodebuild -version
xcrun simctl list devices available
```

## Runner Registration

The runner is installed in:

```text
/Users/runner/actions-runner
```

Run the setup script from the monorepo root. The script installs and registers the runner, but it does not start the LaunchAgent unless a real `runner` GUI login domain already exists.

```bash
./scripts/setup-mac-mini-e2e-runner.sh
```

Verify:

```bash
gh api repos/rollercoaster-dev/monorepo/actions/runners --jq '.runners[] | select(.name == "mac-mini-e2e") | {name,status,busy,labels:[.labels[].name]}'
```

## Local E2E Validation

From the monorepo root:

```bash
bun install --frozen-lockfile
bun run turbo build --filter=native-rd^...
bun run native:ios:e2e
cd apps/native-rd
bun run test:e2e:single e2e/flows/goal-create.yaml
bun run test:e2e
```

## Troubleshooting

If Maestro cannot find nested test IDs, rebuild with:

```bash
bun run native:ios:e2e
```

If the simulator is unavailable:

```bash
xcrun simctl list devices available
xcrun simctl boot "iPhone 17"
```

If the runner is offline:

```bash
cd /Users/runner/actions-runner
./svc.sh status
./svc.sh start
```

If `./svc.sh start` reports `Load failed: 5: Input/output error`, do not guess and do not retry `sudo launchctl bootstrap gui/502 ...` unless `launchctl print gui/502` first confirms the GUI domain exists. `sudo -iu runner` does not create a GUI login domain. Create a real GUI login session for `runner`, then verify from the admin account:

```bash
launchctl print gui/502
```

Only after that succeeds, start the service from Terminal inside the `runner` GUI session:

```bash
cd /Users/runner/actions-runner
./svc.sh start
```

````

- [ ] **Step 2: Add the runbook to `docs/index.md`**

Add an entry in the relevant documentation catalog section:

```markdown
- [native-rd Mac Mini E2E Runner](infrastructure/native-rd-mac-mini-e2e-runner.md) — setup and recovery runbook for the self-hosted Maestro/iOS Simulator runner.
````

- [ ] **Step 3: Commit the documentation**

Run:

```bash
git add docs/infrastructure/native-rd-mac-mini-e2e-runner.md docs/index.md
git commit -m "docs: document native-rd mac mini e2e runner"
```

Expected: commit succeeds on a feature branch, not `main`.

## Task 7: Close Out Issue #895

**Files:**

- No file changes.

- [ ] **Step 1: Verify all acceptance criteria**

Run:

```bash
command -v maestro
xcode-select -p
xcrun simctl list devices available
gh api repos/rollercoaster-dev/monorepo/actions/runners --jq '.runners[] | select(.name == "mac-mini-e2e") | {name,status,busy,labels:[.labels[].name]}'
test -f docs/infrastructure/native-rd-mac-mini-e2e-runner.md
```

Expected:

- Maestro command exists.
- Xcode path is `/Applications/Xcode.app/Contents/Developer`.
- iOS simulator devices are listed.
- GitHub runner is online.
- Runner labels include `self-hosted`, `macOS`, and `e2e`.
- Infrastructure doc exists.

- [ ] **Step 2: Add an issue comment with verification evidence**

Run:

```bash
gh issue comment 895 --repo rollercoaster-dev/monorepo --body "Mac Mini E2E runner setup verified:

- Runner user: runner, non-admin
- Runner name: mac-mini-e2e
- Labels: self-hosted, macOS, ARM64, e2e, native-rd
- Xcode: 26.3
- iOS Simulator: 26.2 runtime available
- Maestro: installed and available
- Validation: native-rd E2E flow passed locally
- Docs: docs/infrastructure/native-rd-mac-mini-e2e-runner.md"
```

Expected: comment posts to issue #895.

- [ ] **Step 3: Close the issue after the PR merges**

Run only after the documentation PR is merged:

```bash
gh issue close 895 --repo rollercoaster-dev/monorepo --comment "Completed by provisioning mac-mini-e2e and documenting the setup in docs/infrastructure/native-rd-mac-mini-e2e-runner.md."
```

Expected: issue #895 is closed.

## Scope Notes

- Do not commit directly to `main`.
- Do not make the existing Ubuntu `e2e-test` job fail as part of this issue; it currently skips when Maestro is unavailable and belongs to a separate CI enforcement decision.
- If a GitHub workflow should automatically run Maestro on the Mac Mini, create a follow-up issue under epic #889 after #895 is complete. The workflow should target:

```yaml
runs-on: [self-hosted, macOS, e2e]
```

## Self-Review

- Spec coverage: all #895 acceptance criteria are covered by Tasks 1-7.
- Placeholder scan: no `TBD`, `TODO`, or unspecified implementation steps remain.
- Type consistency: not applicable; this plan changes infrastructure and documentation only.
