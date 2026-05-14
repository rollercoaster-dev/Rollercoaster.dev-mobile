# Mac Mini E2E: Switch Android Job to USB-Attached Device

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the Mac Mini from panicking under Android emulator load. Replace the Android emulator in CI with a USB-attached physical Android device. Get PR #1048 mergeable.

**Why this matters:** PR #1048 ran on 2026-05-10 and **kernel-panicked the Mac Mini** (host: `Hail-Mary.fritz.box`). Panic was at 21:04:27 CEST, ~9 minutes into the CI run. The panic report (`/Library/Logs/DiagnosticReports/panic-full-2026-05-10-210427.0002.panic`) shows:

```text
panic(cpu 1 …): watchdog timeout: no checkins from watchdogd in 94 seconds
Compressor Info: 30% of compressed pages limit (OK) and 100% of segments limit (BAD)
                 with 8 swapfiles and LOW swap space
```

This is a macOS VM-compressor exhaustion panic. The host has **16 GB RAM** (M4 Mac mini base, `hw.memsize: 17179869184`) and the boot SSD has **19 GB free**. macOS only swaps to the boot volume, so Spin Drive can't rescue it. Running Gradle + QEMU Android emulator + Metro + the user's session is too much for 16 GB. Investigated and decided against:

- More internal storage (Mac mini SSD is soldered, not user-replaceable; would only delay swap exhaustion, not solve RAM-side compressor segment limit)
- Linux runner on the SurfaceBook 2 (only 8 GB RAM, same risk profile)

Decision: keep iOS on the Mac Mini, replace the Android emulator with a real Android device on USB. Device runs its own Android OS on its own CPU/RAM; the Mac just orchestrates Gradle build + adb install + Maestro.

**Tech Stack:** macOS 26.5, Xcode 26.3, iOS Simulator 26.2, GitHub Actions runner v2.334.0, Bun 1.3.7, Expo/React Native, Maestro 2.5.1, ADB platform-tools 37.0.0, Samsung Android device.

---

## Current State

- **PR #1048** open at branch `codex/native-rd-mac-runner-builds-e2e`. Adds workflow `.github/workflows/native-rd-mobile-e2e.yml` plus runbook `docs/infrastructure/mac-mini-e2e-runner.md`. CI history: Android E2E FAILED with "runner lost communication" (the panic), iOS E2E CANCELLED by user. CodeRabbit nitpicks mostly addressed in commits `b4b0cc5` and `4d26e78`.
- **Runner is offline.** GitHub reports `status: "offline"` for `mac-mini-e2e`. The `runner` user has no GUI login session (`launchctl print gui/502` returns "Could not find domain"), so the per-user LaunchAgent has nowhere to bootstrap. Earlier debugging plan at `docs/plans/active/2026-05-10-mac-mini-e2e-runner-remaining-steps.md` documents this.
- **Samsung Android device is plugged in.** `ioreg -p IOUSB` shows `SAMSUNG_Android@02120000` on USB2 Hub. `adb devices` returns empty — the device has NOT been configured for ADB yet.
- **In-flight edits not committed.** A git worktree exists at `/tmp/pr-1048-worktree/` on branch `codex/native-rd-mac-runner-builds-e2e` with partial workflow changes already applied (env block + first half of android job). See "Work in Progress" section below.
- **Unstaged debug work on local main** (do not lose):
  - `AGENTS.md` adds System/Admin Commands section (don't guess on macOS admin)
  - `apps/native-rd/e2e/README.md` corrects Maestro brew install (`brew tap mobile-dev-inc/tap`)
  - `docs/index.md` adds Infrastructure section
  - `docs/infrastructure/native-rd-mac-mini-e2e-runner.md` (different filename than PR's runbook — needs reconciliation)
  - `scripts/setup-mac-mini-e2e-runner.sh` (has `id -u` before user-existence check bug)

## Work In Progress

Partial workflow edits already applied to `/tmp/pr-1048-worktree/.github/workflows/native-rd-mobile-e2e.yml` (NOT committed):

- Top-level `env`: removed `ANDROID_AVD_HOME`, added `GRADLE_OPTS: "-Xmx2g -XX:MaxMetaspaceSize=512m"` and `ORG_GRADLE_PROJECT_org.gradle.workers.max: "2"`
- `android-build-e2e` job: timeout reduced from 90→45 min, removed `emulator` from PATH, removed `sdkmanager --list_installed` from toolchain check, removed `Verify Android emulator disk headroom` step
- Added two new steps after "Verify runner toolchain":
  - `Verify Android device connected` — sets `ANDROID_DEVICE_SERIAL` via `$GITHUB_ENV`
  - `Wake and unlock Android device` — sends keyevent 224 (wakeup) + 82 (menu)

**Still to do in workflow** (Phase 3 below):

- Remove `Ensure Android AVD exists` step
- Remove `Boot Android emulator` step
- Update `Build and install Android app` to set `ANDROID_SERIAL` env
- Update `Verify Android app install` to use `adb -s "${ANDROID_DEVICE_SERIAL}"`
- Update `Run required Maestro flows on Android` to add `--device "${ANDROID_DEVICE_SERIAL}"`
- Remove `Upload Android emulator log` step
- Remove `Shut down Android emulator` step

If continuing from cold context, either keep using that worktree (`cd /tmp/pr-1048-worktree && git diff`) or `git worktree remove /tmp/pr-1048-worktree --force` and restart from origin/codex.

---

## Phase 1: One-Time Android Device Setup

**Goal:** Configure the Samsung Android device so it stays on, unlocked, USB-debuggable, and persistently authorized for the Mac Mini. Done once — never again.

These are all settings on the device itself, not commands on the Mac.

- [ ] **Step 1: Enable Developer Mode on the device**

On a Samsung Android device:

```text
Settings → About phone → Software information → tap "Build number" 7 times
```

Enter your screen-lock PIN when prompted. A toast says "You are now a developer." Developer Options now appears under Settings.

- [ ] **Step 2: Enable USB debugging**

```text
Settings → Developer options → USB debugging → ON
```

- [ ] **Step 3: Disable the screen lock entirely**

```text
Settings → Lock screen → Screen lock type → None
```

(On some Samsung models this is `Settings → Security and privacy → Screen lock`.) Confirm "Remove lock screen?" If the device has Knox / Samsung Account requirements that won't allow `None`, fall back to `Swipe` — Maestro can dismiss a swipe, but not a PIN.

- [ ] **Step 4: Keep the screen on while charging**

```text
Settings → Developer options → Stay awake → ON
```

This keeps the screen on indefinitely while the device is plugged in via USB. Required so Maestro doesn't have to wake the device every run.

- [ ] **Step 5: Disable auto-rotation, animations (optional but recommended for stable Maestro)**

```text
Settings → Developer options →
  Window animation scale → 0.5x
  Transition animation scale → 0.5x
  Animator duration scale → 0.5x
```

Faster animations = fewer Maestro timing flakes. Not required but reduces flakiness.

- [ ] **Step 6: Authorize the Mac (one-time)**

Disconnect and reconnect the USB cable to the Mac Mini. On the device, a dialog appears:

```text
Allow USB debugging?
The computer's RSA key fingerprint is: <hex>
[ ] Always allow from this computer
                                    [Cancel] [Allow]
```

Tick **"Always allow from this computer"**, tap **Allow**. This is the critical step — without the checkbox, every reboot of the Mac re-prompts.

- [ ] **Step 7: Verify ADB sees the device as authorized**

On the Mac, run:

```bash
export PATH="/Volumes/Spin Drive/runner-ci/android-sdk/platform-tools:$PATH"
adb kill-server
adb start-server
adb devices -l
```

Expected: a line like

```text
R5CT12345AB     device usb:01200000 product:r0qxxx model:SM_S908B device:r0q transport_id:1
```

The state must be `device`, not `unauthorized` or `offline`. If `unauthorized`: Step 6 was missed, reconnect cable and authorize. If `offline`: try `adb kill-server && adb start-server` then `adb reconnect`.

- [ ] **Step 8: Confirm app interaction works**

```bash
adb shell input keyevent 82
adb shell dumpsys window | grep -E 'mCurrentFocus|mFocusedApp' | head -2
```

Expected: returns some focused window (usually `Launcher`). Confirms ADB can drive the device.

---

## Phase 2: Local Smoke Test (before any CI changes)

**Goal:** Prove that `npx expo run:android` + Maestro work on this physical device on this Mac, manually. If this fails, fix it locally before touching the workflow.

- [ ] **Step 1: Confirm Android SDK paths**

```bash
export ANDROID_HOME="/Volumes/Spin Drive/runner-ci/android-sdk"
export ANDROID_SDK_ROOT="${ANDROID_HOME}"
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export PATH="${JAVA_HOME}/bin:${ANDROID_HOME}/platform-tools:${ANDROID_HOME}/cmdline-tools/latest/bin:/opt/homebrew/bin:$PATH"
java -version
adb version
adb devices
```

Expected: java 17, adb 1.0.41, one device in `device` state.

- [ ] **Step 2: Set Gradle memory budget for the local test**

```bash
export GRADLE_OPTS="-Xmx2g -XX:MaxMetaspaceSize=512m"
export ORG_GRADLE_PROJECT_org_gradle_workers_max=2
```

This is the same budget the workflow will use. If the local test OOMs at these limits, the workflow will too.

- [ ] **Step 3: Build, install, and launch the app on the device**

From the monorepo root:

```bash
cd apps/native-rd
EXPO_PUBLIC_E2E_MODE=true npx expo run:android
```

Expected: Gradle builds the APK (~3-8 min first build, ~1-2 min incremental), installs onto the connected device, starts Metro, and launches the app. The app should open on the device without going to the dev-client server picker (because Metro is running and the dev-client URL is opened automatically).

If install fails with "INSTALL_FAILED_INSUFFICIENT_STORAGE": clear space on the device or `adb uninstall dev.rollercoaster.app && retry`.

If build fails with NDK errors: confirm `apps/native-rd/app.json` has `"android": { "ndkVersion": "27.0.12077973" }` (PR #1048 adds this).

- [ ] **Step 4: Verify the app is installed and reachable**

```bash
adb shell pm path dev.rollercoaster.app
```

Expected: prints a path like `package:/data/app/.../base.apk`.

- [ ] **Step 5: Run one Maestro flow against the device**

```bash
cd apps/native-rd
MAESTRO_CLI_NO_ANALYTICS=true MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true \
  bun run test:e2e:single e2e/flows/goal-create.yaml
```

Expected: Maestro reports the flow passed.

If Maestro can't find the device: try `maestro test --device "$(adb devices | awk 'NR>1 && $2 == "device" { print $1; exit }')" e2e/flows/goal-create.yaml` directly.

- [ ] **Step 6: Run the full E2E suite as a final check**

```bash
cd apps/native-rd
MAESTRO_CLI_NO_ANALYTICS=true MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true bun run test:e2e
```

Expected: all four required flows pass: `goal-create`, `goal-create-complete`, `badge-view`, `settings-theme-switch`.

**Stop if any of these fail.** Don't promote to CI until the local smoke test is fully green.

---

## Phase 3: Finish the Workflow Edits

**Goal:** Complete the partial edits in `/tmp/pr-1048-worktree/` so the Android job uses the USB device path end-to-end.

Work in the worktree:

```bash
cd /tmp/pr-1048-worktree
```

- [ ] **Step 1: Remove "Ensure Android AVD exists" step**

In `.github/workflows/native-rd-mobile-e2e.yml`, delete the entire `- name: Ensure Android AVD exists` block (and its `env:`/`run:` body). It's right after "Start Metro for Android dev client".

- [ ] **Step 2: Remove "Boot Android emulator" step**

Delete the entire `- name: Boot Android emulator` block, including the `nohup … emulator …` invocation and the boot-status polling loop. Right after the AVD step.

- [ ] **Step 3: Update "Build and install Android app" to target the device**

```diff
       - name: Build and install Android app
         working-directory: apps/native-rd
+        env:
+          ANDROID_SERIAL: ${{ env.ANDROID_DEVICE_SERIAL }}
         run: EXPO_PUBLIC_E2E_MODE=true npx expo run:android --no-bundler
```

- [ ] **Step 4: Update "Verify Android app install" to use device serial**

```diff
       - name: Verify Android app install
         run: |
           set -euo pipefail
-          adb shell pm path dev.rollercoaster.app
-          adb reverse tcp:8081 tcp:8081
-          adb shell am start \
+          adb -s "${ANDROID_DEVICE_SERIAL}" shell pm path dev.rollercoaster.app
+          adb -s "${ANDROID_DEVICE_SERIAL}" reverse tcp:8081 tcp:8081
+          adb -s "${ANDROID_DEVICE_SERIAL}" shell am start \
             -a android.intent.action.VIEW \
             -d "exp+rollercoasterdev://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081" \
             dev.rollercoaster.app
           sleep 10
```

- [ ] **Step 5: Update Maestro step to pin device**

```diff
       - name: Run required Maestro flows on Android
         if: ${{ github.event_name != 'workflow_dispatch' || inputs.e2e }}
         working-directory: apps/native-rd
         run: |
           set -euo pipefail
-          maestro test \
+          maestro test --device "${ANDROID_DEVICE_SERIAL}" \
             e2e/flows/goal-create.yaml \
             e2e/flows/goal-create-complete.yaml \
             e2e/flows/badge-view.yaml \
             e2e/flows/settings-theme-switch.yaml
```

- [ ] **Step 6: Remove "Upload Android emulator log" step**

Delete the `- name: Upload Android emulator log` block entirely. No emulator → no log.

- [ ] **Step 7: Remove "Shut down Android emulator" step**

Delete `- name: Shut down Android emulator` and its `adb emu kill || true` body. There is no emulator process to kill.

- [ ] **Step 8: Sanity-check the YAML**

```bash
cd /tmp/pr-1048-worktree
ruby -ryaml -e 'YAML.load_file(".github/workflows/native-rd-mobile-e2e.yml"); puts "OK"'
actionlint .github/workflows/native-rd-mobile-e2e.yml || true
git diff --stat
```

- [ ] **Step 9: Commit the workflow change**

```bash
cd /tmp/pr-1048-worktree
git add .github/workflows/native-rd-mobile-e2e.yml
git commit -m "ci(native-rd): use USB-attached Android device instead of emulator

Mac Mini host (16 GB RAM, M4 base) kernel-panicked under the
emulator+Gradle+Metro workload (panic 2026-05-10 21:04:27 CEST,
watchdog timeout, VM compressor at 100% of segments limit).

Replace the AVD/emulator boot path with a USB-attached physical
Android device. Build still runs on the Mac (Gradle, Expo CLI),
but the app runs on the device, eliminating QEMU and the
ANDROID_AVD_HOME storage requirement.

Also cap Gradle to 2g heap and 2 workers so the iOS job has
headroom on the same host. Reduce Android timeout to 45 min
since emulator boot is gone."
```

- [ ] **Step 10: Push**

```bash
cd /tmp/pr-1048-worktree
git push origin codex/native-rd-mac-runner-builds-e2e
```

Expected: push succeeds, CI re-runs the workflow on the PR.

---

## Phase 4: Bring the Runner Back Online

**Goal:** Get the `mac-mini-e2e` runner from `offline` to `online` so CI can actually schedule the new workflow run.

The runner was offline pre-panic because `runner` had no GUI login session. After the panic + reboot, the situation is the same. Apple documents `gui/502` as the GUI login domain — `sudo -iu runner` does NOT create it.

Follow the existing remaining-steps plan at `docs/plans/active/2026-05-10-mac-mini-e2e-runner-remaining-steps.md`, specifically Task 2 (Create A Real `runner` GUI Login Session) and Task 3 (Start The GitHub Runner LaunchAgent). Short version:

- [ ] **Step 1: Log into the Mac graphically as `runner`** (Apple menu → Lock Screen → Other User → runner; or fast user switching). Use macOS-supported login flows only. If the password is unknown, use Apple's documented login-password reset (not CLI guesses).

- [ ] **Step 2: From a Terminal inside the `runner` GUI session,** verify the launchd domain:

```bash
whoami            # expected: runner
id -u             # expected: 502
launchctl managername  # expected: Aqua
launchctl manageruid   # expected: 502
launchctl print gui/502 | head -5   # expected: succeeds (no "Could not find domain")
```

- [ ] **Step 3: Start the service from inside that session:**

```bash
cd /Users/runner/actions-runner
./svc.sh start
```

- [ ] **Step 4: From your admin account, verify GitHub sees it:**

```bash
gh api repos/rollercoaster-dev/monorepo/actions/runners --jq '.runners[] | select(.name == "mac-mini-e2e") | {name,status,busy,labels:[.labels[].name]}'
```

Expected: `"status": "online"`.

- [ ] **Step 5: Make sure the USB-connected Android device is reachable inside the `runner` user session** (USB devices are visible across users by default on macOS, but `adb`'s authorization is per-user — so authorize from the `runner` Terminal too):

```bash
sudo -iu runner zsh -lc 'export PATH="/Volumes/Spin Drive/runner-ci/android-sdk/platform-tools:$PATH"; adb start-server; adb devices'
```

If the device shows as `unauthorized`, the device dialog will appear when prompted — confirm "Always allow from this computer" again under the `runner` account.

---

## Phase 5: Reconcile Local Debug Work

**Goal:** Land the unstaged improvements from the May 10 debugging session without losing them and without conflicting with PR #1048.

The work is on local `main` (which is 7 commits behind origin/main). Reconcile it as a separate branch + PR, since it's not directly part of PR #1048.

- [ ] **Step 1: Pull origin/main**

```bash
cd "/Volumes/Spin Drive/Code/rollercoaster.dev/monorepo"
git stash push -m "wip: mac mini debug docs" --include-untracked
git pull --ff-only origin main
git stash pop
```

Expect a conflict in `docs/index.md` (the unstaged Infrastructure section vs. origin's edits) — resolve by keeping both rows, pointing to the right filename.

- [ ] **Step 2: Create a branch for the debug docs**

```bash
git checkout -b docs/mac-mini-runner-followup
```

- [ ] **Step 3: Decide which runbook filename wins**

PR #1048 uses `docs/infrastructure/mac-mini-e2e-runner.md`. Local untracked file is `docs/infrastructure/native-rd-mac-mini-e2e-runner.md`. They have overlapping but different content. **Keep the PR's filename** (`mac-mini-e2e-runner.md`); merge any unique-and-still-relevant content from the local file into the PR's version when PR #1048 lands. Delete the local `native-rd-mac-mini-e2e-runner.md`.

- [x] **Step 4: Move plan files to the canonical location** — Done in PR #1051. Plan files now live under `docs/plans/active/`; the `docs/superpowers/` tree has been removed.

- [ ] **Step 5: Fix the setup-script bug**

In `scripts/setup-mac-mini-e2e-runner.sh`, move the `RUNNER_UID="$(id -u "${RUNNER_USER}")"` line to AFTER the `dscl . -read "/Users/${RUNNER_USER}"` existence check. Also add `--work "/Volumes/Spin Drive/runner-ci/actions-work"` to the `./config.sh` invocation to match the runbook.

- [ ] **Step 6: Commit and PR**

```bash
git add AGENTS.md apps/native-rd/e2e/README.md docs/index.md docs/plans/active scripts/setup-mac-mini-e2e-runner.sh
git commit -m "docs: mac mini runner debug-session followups

- AGENTS.md: add System/Admin Commands rule (don't guess on
  macOS admin operations; verify with primary docs first)
- apps/native-rd/e2e/README.md: correct Maestro brew install
  (must use mobile-dev-inc/tap, not the bare cask)
- docs/plans/active/: check in May 10 mac mini setup plans
- scripts/setup-mac-mini-e2e-runner.sh: fix id-before-existence
  bug; add --work path for actions-work directory"
git push -u origin docs/mac-mini-runner-followup
gh pr create --title "docs: mac mini runner debug-session followups" --body "$(cat <<'EOF'
## Summary
- Lessons-learned from the 2026-05-10 mac mini setup session (issue #895)
- Adds AGENTS.md guidance for macOS admin operations
- Corrects the Maestro install instruction (mobile-dev-inc tap, not the bare brew cask)
- Checks in the planning docs used during debugging
- Adds the setup script used to register the runner

## Test plan
- [ ] Maestro install instructions verified by re-running on a clean shell
- [ ] Setup script dry-run only (does not register without confirmation)
EOF
)"
```

---

## Phase 6: Merge PR #1048

- [ ] **Step 1: Wait for the re-triggered CI to run on the runner**

After Phase 4 brings the runner online and Phase 3 pushes the new workflow, CI should pick up the PR and run the Android job against the USB device, plus the iOS job on the simulator. Watch from another machine if needed (CI status visible on github.com regardless of runner identity).

- [ ] **Step 2: If green, merge PR #1048 via the GitHub UI** (not `--admin`, not `--auto`). Standard merge.

- [ ] **Step 3: Close issue #895 with a verification comment** linking to the green CI run and the runbook commit.

---

## Explicit Non-Goals / Things NOT To Do

- Do not `brew install maestro`. Use `brew tap mobile-dev-inc/tap && brew install mobile-dev-inc/tap/maestro`. The bare formula is the wrong cask.
- Do not retry `sudo launchctl bootstrap gui/502 …` while `launchctl print gui/502` says the domain doesn't exist. That's not a runner-service problem; it's a missing GUI login session for `runner`.
- Do not enable the Android emulator on this Mac Mini at any memory budget. 16 GB + Gradle + QEMU + Metro panics the kernel. The emulator path is permanently off the table for this host.
- Do not run iOS and Android jobs in parallel on a single Mac Mini. Even with the USB device offloading Android work, Metro (port 8081) and the simulator/build still contend. Keep the `concurrency.group: native-rd-mobile-e2e-runner` on both jobs.
- Do not commit directly to `main`. PR #1048 is the change for the workflow. Phase 5 work goes in a separate PR.
- Do not delete `/tmp/pr-1048-worktree/` until Phase 3 commits are pushed (or its diff has been migrated elsewhere).

## Reference: Key File/Path Locations

- Repo (primary): `/Volumes/Spin Drive/Code/rollercoaster.dev/monorepo`
- Repo (alt path, same content): `/Users/hailmary/Code/rollercoaster.dev/monorepo`
- PR #1048 worktree (WIP): `/tmp/pr-1048-worktree`
- Android SDK: `/Volumes/Spin Drive/runner-ci/android-sdk`
- Panic report: `/Library/Logs/DiagnosticReports/panic-full-2026-05-10-210427.0002.panic`
- Earlier plans: `docs/plans/active/2026-05-10-mac-mini-e2e-runner.md`, `…-remaining-steps.md`
- Runner home (on the Mac): `/Users/runner/actions-runner`
- GitHub runner registration check: `gh api repos/rollercoaster-dev/monorepo/actions/runners`

## Self-Review

- Phase 1 covers every device setting needed; explicitly notes that lock-screen `None` may be blocked by Samsung Knox policy and provides `Swipe` fallback.
- Phase 2 mirrors the workflow's commands one-for-one so the local smoke test is faithful to CI.
- Phase 3 only edits one file (the workflow), already partially applied in the worktree; remaining diffs are quoted exactly.
- Phase 4 references the existing runner-bring-online plan rather than duplicating it.
- Phase 5 handles the conflict between local main and origin/main and reconciles the runbook filename collision.
- Phase 6 respects branch protection (no `--admin`, no `--auto`).
- Non-goals section captures all the failure modes learned from this session.
