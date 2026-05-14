# Issue #1059 — iOS USB Device E2E Pivot

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## ACTIVE GOAL (handoff for next session — 2026-05-12)

**Get the currently-failing Maestro E2E flows green on the iOS simulator.** This supersedes the iOS USB pivot (which is now blocked, see Task 3 below — Maestro 2.5.1 has no local physical-iOS support).

### Fix applied 2026-05-12 (BadgeDesigner "Use This Design" tap)

Root cause: BadgeDesigner's DesignEditor uses a tall scrolling form whose footer holds "Use This Design". The screen is rendered inside a Tab navigator whose `AppTabBar` floats over the bottom of the scrollable area. Maestro's `scrollUntilVisible` default visibility check is bounding-box only (not occlusion-aware), so it stopped scrolling as soon as the button's bounds entered the screen — leaving the button sitting _behind_ the floating tab bar. The subsequent `tapOn` then hit the tab bar instead of the button, navigation never fired, and `assertVisible: "Edit Goal"` failed.

Fix: added `centerElement: true` to `scrollUntilVisible` on the BadgeDesigner save step in:

- `apps/native-rd/e2e/flows/goal-lifecycle-complete.yaml` (use-this-design)
- `apps/native-rd/e2e/flows/goal-create-complete.yaml` (Use This Design)
- `apps/native-rd/e2e/flows/badge-redesign.yaml` (Save Design — same DesignEditor footer)

Verification: both `goal-lifecycle-complete.yaml` (exit 0, ends at `badge-earned-image`) and `goal-create-complete.yaml` (exit 0, ends at `Save Note`) now pass end-to-end on iPhone 16e (UDID `EB3047C9-B8C2-4DCB-82EB-D1EDFD42DEC2`, iOS 26.2). The "Edit Goal" assertion succeeds immediately after the centered tap.

### Second fix applied 2026-05-12 (settings-theme-switch)

Two problems compounded:

1. `tapOn: "S"` matched nothing — the gear is an icon, not text. Replaced with `tapOn: { id: tab-SettingsTab }`.
2. `tapOn: "Night Ride"` failed because `ThemeSwitcher` wrapped its options in `<View accessible accessibilityRole="radiogroup" accessibilityLabel="Theme selection">`. iOS collapses every Pressable child into that single a11y node, hiding the options from Maestro element lookup (the "accessible-wrapper trap" from the maestro-e2e skill).

   Applied the same `EXPO_PUBLIC_E2E_MODE` gating that already lives in `ThemeChipGrid` — the radiogroup wrapper is dropped in E2E builds while the inner Pressables retain `accessible+role=radio+label` for production screen-reader users. Source: `apps/native-rd/src/components/ThemeSwitcher/ThemeSwitcher.tsx`. Flow updated to tap the composed label `"Night Ride. Dark mode"`.

   Added Jest regression test (`apps/native-rd/src/components/ThemeSwitcher/__tests__/ThemeSwitcher.test.tsx` — "E2E mode gating" describe block) so a future refactor can't silently re-introduce the wrapper. Mirrors the existing test in `ThemeChipGrid`.

### Suite status (2026-05-12, iPhone 16e iOS 26.2)

| flow                      | result                                                         |
| ------------------------- | -------------------------------------------------------------- |
| `goal-create`             | ✅                                                             |
| `goal-create-complete`    | ✅ (fixed via `centerElement: true`)                           |
| `goal-lifecycle-complete` | ✅ (fixed via `centerElement: true`)                           |
| `badge-view`              | ✅                                                             |
| `badge-redesign`          | ✅ (also benefits from `centerElement: true` on `Save Design`) |
| `evidence-viewer`         | ✅                                                             |
| `settings-theme-switch`   | ✅ (fixed selectors + E2E a11y gate)                           |

### Background: original goal (now blocked / superseded)

**Original goal:** Move native-rd Maestro E2E off the simulator/emulator runner pipeline and onto a USB-tethered physical iPhone (Phase 6 of issue #1059), validated locally from the `hailmary` session before any CI change rides on it.

**Related:**

- Issue #1059 — Move native-rd E2E to USB-connected physical devices (this issue, tracks Phases 5–8)
- PR #1048 — Mac Mini mobile E2E workflow (currently sim/emulator; will be retargeted in Phase 5)
- Sibling plan: `docs/plans/active/2026-05-11-mac-mini-android-usb-device.md` (Android USB pivot, deferred per Phase 8)
- Predecessor plans: `2026-05-10-mac-mini-e2e-runner.md`, `2026-05-10-mac-mini-e2e-runner-remaining-steps.md`

## Verified Local State (2026-05-12)

- Host: `Hail-Mary.fritz.box`, user session `hailmary`.
- LAN IPs: `192.168.178.107` (en0), `192.168.178.129` (en1). Metro will need one of these advertised, not `localhost`.
- Two physical iOS devices visible to `xcrun xctrace list devices`:
  - `Narcissus (26.5) (00008150-00194C6E1480401C)` — iOS 26.5, too new to be iPhone X. Probably the user's primary phone; do **NOT** run destructive flows on this.
  - `Garry's iPhone (16.3) (38e1be684fd368505fd3ca69695c98d1421331f2)` — iOS 16.3. Matches issue #1059's open question "iOS 16.3 device worked locally for native-rd device builds." Treat as the iPhone X / dedicated dev device.
- `apps/native-rd/.env.local` does **not** exist; no `IOS_DEVICE_ID` is currently set.
- Maestro 2.5.1 is installed (`/opt/homebrew/bin/maestro`).

## Review Notes Against the Issue Body

Captured during the #1059 review before starting Phase 6.

### Concrete blockers Phase 5 needs to address

1. **`run-ios.sh:82` device-path gate.** The script intentionally bypasses the `IOS_DEVICE_ID` branch when `EXPO_PUBLIC_E2E_MODE=true`, comment says: "E2E flows (clearState + clearKeychain) are destructive — must run on an ephemeral simulator, never a developer's physical device." Phase 5/6 requires the device-on-E2E-mode combination the script currently forbids. Decision needed: drop the guard, or split into an explicit "E2E on device" branch with an opt-in env (e.g. `ALLOW_E2E_ON_DEVICE=true`) so the destructive default still protects accidental runs on a personal phone.

2. **Destructive flow steps.** Every flow under `apps/native-rd/e2e/flows/` starts with `launchApp: { clearState: true, clearKeychain: true }`. On a physical iPhone these only wipe the **app's** sandbox + keychain entries (not device-wide), but if the user has real personal data in the dev build, it is gone. Mitigation: pick a dedicated device (Garry's iPhone, not Narcissus), reinstall a fresh build each session.

3. **Metro hostname is hardcoded `localhost:8081` in flow `openLink`s.** On a physical device, `localhost` is the phone, not the Mac. Three options, pick one in Phase 5:
   - Replace the hostname with a Maestro `env:` variable (e.g. `${METRO_HOST}`) and inject the host LAN IP at run time. **Recommended** — keeps the flows portable.
   - Run `iproxy 8081 8081` (or equivalent) to expose Metro over USB so `localhost` resolves on-device. Adds runtime moving part, brittle on disconnect.
   - Hardcode the host LAN IP. Fast, but breaks the moment the runner host's IP changes.

### Gaps to fill in the issue itself

- **Definition of done.** No per-phase acceptance criteria. Phase 6: which flows must be green and how many consecutive runs counts as "validated"? Phase 7: "one CI run end-to-end" is too brittle as a gate; recommend at least one green run + one re-run-after-disconnect drill.
- **Awake state is design-level, not implementation-level.** The open question lists it almost as an afterthought, but device screen-lock under USB power is the single most common failure mode for tethered-device CI. Settle the wake/unlock preamble (`xcrun devicectl device manage activate`, Maestro tap preamble, or a Shortcuts automation) before Phase 6 starts, not during.
- **Rollback plan.** If Phase 7's first green CI turns out flaky in production, what reverts? Workflow revert on the merged PR vs. a feature-flag step is unspecified.
- **Runner job interaction.** "Physical device is single-tenant" is correct for the device job, but the runner still services other native-rd CI jobs concurrently. Confirm the existing job-level concurrency group's scope, or two PRs landing at once will race on Metro / derived-data.
- **Doc location.** `docs/infrastructure/mac-mini-e2e-runner.md` referenced in the issue does not yet exist on `main`; it lands with PR #1048 on `codex/native-rd-mac-runner-builds-e2e`. Worth saying so explicitly in the issue.
- **PR-side merge gate.** "Do not merge PR #1048 until Phase 7 passes" lives only inside #1059's body. Drop a one-line comment on PR #1048 pointing at #1059 so the gate is visible from the PR.
- **Phase 8 (Android USB) has no time/condition bound.** Recommend: "revisit after Phase 7 has been green for N merges" or "after one calendar week of green iOS-only" — otherwise it will silently drift.

## Phase 6 — Local Validation (this plan)

The first thing to prove is "we can build and launch native-rd on Garry's iPhone over USB end-to-end from `hailmary`." Maestro flows come next, only after the non-destructive build path is green.

### Task 1: Non-destructive build + launch on iPhone X — ✅ DONE 2026-05-12

Confirmed the device-build half works before touching the E2E mode gate.

- [x] **Step 1: Pair / trust check** — `Garry's iPhone (16.3) (38e1be684fd368505fd3ca69695c98d1421331f2)` listed online under `xcrun xctrace list devices`.
- [x] **Step 2: Set `IOS_DEVICE_ID`** shell-scoped:
  ```bash
  export IOS_DEVICE_ID=38e1be684fd368505fd3ca69695c98d1421331f2
  ```
- [x] **Step 3: `bun run ios`** from `apps/native-rd`. Built, signed, installed, launched. Pod install + xcodebuild + install + launch all green.
- [x] **Step 4: Dev-client connects to Metro.** After two host/device fixes (below) the bundle loaded over LAN.

#### What it took: two non-obvious host/device fixes

Both required real intervention; future device runs (and any future runner) must pre-handle these.

**1. macOS Application Firewall blocked the Node binary Metro runs under.**

- `run-ios.sh:29-43` `resolve_node_bin` picks the first non-bun-temp `node` found via `which -a node`. On `hailmary`'s box that's `/opt/homebrew/Cellar/node/25.4.0/bin/node`.
- `socketfilterfw --getappblocked` reported that exact path as **blocked**, while the mise-installed node (`~/.local/share/mise/installs/node/22.22.0/bin/node`) and bun were permitted.
- Combined with stealth mode on (default), incoming connections to Metro were silently dropped at the host. `curl localhost:8081` worked (loopback bypasses firewall); `curl 192.168.178.107:8081` from the device hit a black hole.
- Fix run (one-shot, user-executed, sudo): `sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /opt/homebrew/Cellar/node/25.4.0/bin/node`. Reversible.
- After the fix: `curl http://192.168.178.107:8081/` from the host returned 200 in 8ms.

Phase 7 implication: the GitHub Actions runner host must have the Node binary that resolves under its session pre-allow-listed, or the workflow must run under a path where it already is. Putting this in the Phase 7 runbook is non-optional.

**2. iOS Local Network permission was denied / never prompted on the iPhone X.**

- SDK 55 ships expo-dev-launcher 55.0.33 with Bonjour-based dev-server discovery (PR expo/expo#42384, shipped in expo-dev-launcher@55.0.6 on 2026-02-08). The new code requests iOS Local Network permission before any LAN HTTP request. If permission is denied, iOS silently drops every LAN packet from the app — manual URLs in the picker fail identically to Bonjour discovery.
- Info.plist already has `NSBonjourServices: [_expo._tcp]` and `NSLocalNetworkUsageDescription` (confirmed via PlistBuddy). `expo-dev-launcher 55.0.33` is what's installed. Bonjour broadcast verified from host: `dns-sd -B _expo._tcp local.` shows `Rollercoaster_dev` advertised on multiple interfaces.
- Quirk: iOS caches the permission grant per binary install. Apps upgraded in place from a prior SDK 54 build (no Bonjour key) never re-prompt. The user said the iPhone 17 was working before the SDK 55 upgrade — that's because it was already permitted under SDK 54 with no Bonjour involvement; the iPhone X had never been granted because the app was freshly installed today under SDK 55.
- Fix that unblocked it: enable **Settings → Privacy & Security → Local Network → Rollercoaster.dev** (or delete + reinstall the app to get a fresh prompt on first launch).
- After the fix: dev-client loaded the bundle over LAN, app rendered normally.

Phase 7 implication: any CI device-flash step must trigger and accept the Local Network prompt. There is no documented Apple API to grant this non-interactively. Realistic options: pre-grant via MDM profile (heavy), or use a Maestro preamble that taps "Allow" on the system alert (works for first install per CI run). The runbook needs an answer.

#### Other observations from this run

- `apps/native-rd/bun.lock` still contains transitive pins for `expo@54.0.33` and `@expo/cli@54.0.23` alongside the active `55.x` resolution. JS-side resolves to 55 (`bunx expo --version` → `55.0.29`) and the iOS pods are 55, so this is benign in practice. Worth a clean `rm -rf node_modules && bun install` to flush, but not blocking.
- Host has two interfaces routable on 192.168.178.x: en0 wired Ethernet (`192.168.178.107`, the active route to the LAN) and en1 Wi-Fi (`192.168.178.129`). Metro listens on `*:8081` so either works once permissions are in place. The iPhone X is on Wi-Fi but reaches the host through the FRITZ!Box bridge.

### Task 2: Decide on the device-on-E2E-mode design

- [ ] **Step 1:** Pick one of the three Metro-hostname options above.
- [ ] **Step 2:** Decide the `EXPO_PUBLIC_E2E_MODE` + device combination policy. Two reasonable shapes:
  1. New env `ALLOW_E2E_ON_DEVICE=true` required alongside `IOS_DEVICE_ID` + `EXPO_PUBLIC_E2E_MODE`. Default-deny protects personal phones.
  2. Treat the presence of `IOS_DEVICE_ID` as opt-in by itself and drop the guard. Simpler, less safe.

  Recommendation: option 1, default-deny.

- [ ] **Step 3:** Update `run-ios.sh` to match the decision. Keep the comment on lines 80-82 accurate.

### Task 3: Run a single Maestro flow on the iPhone X — ❌ BLOCKED 2026-05-12

Attempted with `badge-view.yaml` parameterized via `env: METRO_HOST: localhost` (default preserves simulator behavior) + `${METRO_HOST}` substitution in the `openLink`. Run command:

```bash
METRO_HOST=192.168.178.107 \
  maestro --device 38e1be684fd368505fd3ca69695c98d1421331f2 \
  test apps/native-rd/e2e/flows/badge-view.yaml
```

Result: exit code 1, single-line error `Device 38e1be684fd368505fd3ca69695c98d1421331f2 was requested, but it is not connected.`

Investigation:

- `xcrun xctrace list devices` lists the iPhone X (legacy hex UDID, online).
- `xcrun devicectl list devices` lists it as `iPhone10,3` but state `unavailable` — Apple's CoreDevice framework can't drive it (iPhone X tops at iOS 16.7; CoreDevice expects iOS 17+).
- `maestro list-devices` (with and without `-p ios --udid <UDID>`) shows **only iOS simulators** under "Local Devices." No physical iOS device, of any UDID, ever appears.
- Maestro `test` command's own help text says: "Test a Flow or set of Flows on a local iOS Simulator or Android Emulator." Physical iOS is **not** in the local-driver scope.
- The historical Maestro iOS-physical path used Facebook's `idb`. Facebook archived `idb` in 2024; `brew install facebook/fb/idb-companion` returns `No available formula or cask` — the tap is gone. There is no current Maestro release that drives a physical iPhone locally without going through Maestro Cloud.

**Net: issue #1059 Phase 6's premise — "validate locally before CI rides" — cannot be executed with Maestro 2.5.1 on Hail-Mary, regardless of which iPhone is plugged in.** The non-Maestro half (build, sign, install, launch, dev-client + Metro on LAN) is green and reusable. The Maestro-driving-physical-device half is not.

#### Strategic options (need a decision before Task 4)

1. **Maestro Cloud.** Keep Maestro, run physical-device flows on Mobile.dev's hosted device farm. Costs money per device-minute. "Local validation" reframes as "validate via a cloud run from the dev branch." Simplest fit for the existing flow YAMLs.
2. **Switch tools to Detox.** Detox is RN-native, supports physical-iOS via USB out of the box, well-trodden by RN teams. Means rewriting all seven flows. Highest cost, highest leverage if E2E volume keeps growing.
3. **Switch tools to Appium / WebDriverAgent.** Industry-standard for physical-iOS automation. Slightly less RN-friendly than Detox but works against any app.
4. **Walk back the pivot for iOS.** Keep iOS E2E on simulator (the PR #1048 plan), and address the wedged-GUI runner issues differently — e.g. auto-restart the `runner` GUI session before each E2E job, or detect-and-recover the wedge in CI. iOS stays on sim; Android still moves to physical USB per the sibling android-usb plan.
5. **Mixed:** iOS simulator + Android physical USB. Effectively option 4 plus the existing Android USB work. Smallest disruption, but accepts the simulator-on-runner risk that drove this issue in the first place.

#### Recommendation

**Option 5 (mixed) for short-term, option 1 (Maestro Cloud) revisited once Phase 7 of the existing simulator path is green for a week.**

Reasoning: the simulator-on-runner failure modes that motivated #1059 are real but addressable with targeted runbook work (GUI-session restart preamble, derived-data cleanup) — the wedged-GUI we saw was downstream of the SpinDrive rename, not of simulators per se. Switching tools (options 2/3) is a multi-week project that would derail Phase 7's window. Maestro Cloud (option 1) preserves the flows but introduces a paid dependency and remote-flake debugging; worth piloting only after we've stabilized the simulator path enough to know what we're paying to escape.

#### Decision needed from issue owner

- Confirm option to pursue. If anything other than 4/5, this plan needs major rewriting.
- If option 5: close this plan as "premise invalidated," update #1059 to drop Phase 6's iOS-local-Maestro language, fold its iOS reasoning into a separate "runner stability" issue.

### Task 4: Run the full required-flow set — DEFERRED pending Task 3 decision

Only after Task 3 is green.

- [ ] `e2e/flows/goal-create.yaml`
- [ ] `e2e/flows/goal-create-complete.yaml`
- [ ] `e2e/flows/badge-view.yaml`
- [ ] `e2e/flows/settings-theme-switch.yaml`

Document each result inline; capture screen recordings on first green pass.

_(Blocked behind Task 3 strategic decision — see above.)_

### Task 5: Capture Phase 6 evidence for #1059

- [ ] Append the exact local command sequence to `apps/native-rd/scripts/run-ios.sh` header comment or a sibling doc — the issue body says "the local invocation is the source of truth; CI mirrors it."
- [ ] Open a comment on issue #1059 with the validated command, the chosen Metro-hostname and E2E-mode-gate decisions, and any device-side trust/awake steps that turned out to be required.
- [ ] Only then hand off to Phase 7 (CI re-enable on PR #1048).

## Out of Scope For This Plan

- Phase 5 workflow edits on PR #1048 (separate commits on `codex/native-rd-mac-runner-builds-e2e`).
- Phase 7 CI runbook updates.
- Phase 8 Android USB.
- Personal-phone (Narcissus) safety harness.
