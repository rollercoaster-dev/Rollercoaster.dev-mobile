# Maestro E2E Tests

End-to-end test flows for the native-rd app, designed for agent authoring and execution.

The suite is a **manual pre-merge gate**, not a CI job. See [The pre-merge gate](#the-pre-merge-gate).

## Prerequisites

- **Maestro CLI**: `brew tap mobile-dev-inc/tap && brew install mobile-dev-inc/tap/maestro` (not in devDependencies — requires separate install). Do not use `brew install maestro`; that installs the wrong Homebrew cask for this runner.
- **iOS Simulator**: booted with the app installed. Build it with **`bun run ios:e2e`**, not `bun run ios` — `EXPO_PUBLIC_*` is inlined by Metro at serve time, and `scripts/run-e2e.sh` neither sets nor verifies it. Only `evidence-viewer.yaml` strictly needs the flag today, but a single build for the whole suite beats a two-build matrix.
- **App ID**: `dev.rollercoaster.app` on iOS. Local Android builds are `dev.rollercoaster.app.dev`; the Android lane rewrites `appId:` for you (see [Android](#android-device-or-emulator)).
- **Simulator locale**: `scripts/run-e2e.sh` pins `AppleLanguages` to `en` on the booted simulator. Several flows assert interpolated English a11y labels, and `de` ships — a German simulator fails them in ways that read as product regressions. `test:e2e:single` bypasses the script, so pin it by hand for single-flow iteration (see below).

## Running Flows

```bash
# The gate: required flows only, writing the JUnit artifact
bun run test:e2e:required

# Everything under e2e/flows/, including `optional`
bun run test:e2e

# A single flow. NOTE: this bypasses scripts/run-e2e.sh entirely, so the
# UserDefaults pre-seeds below have to be done once per simulator by hand.
xcrun simctl spawn booted defaults write dev.rollercoaster.app EXDevMenuIsOnboardingFinished -bool YES
xcrun simctl spawn booted defaults write dev.rollercoaster.app AppleLanguages -array en
bun run test:e2e:single e2e/flows/full-ride.yaml
```

### Android (device or emulator)

```bash
# Terminal 1 — build + install the .dev variant on the connected device, leave Metro up
bun run android:e2e
# Terminal 2 — warm Metro once (the first bundle build can exceed the 60s boot barrier),
# then run the gate against the device
bun run test:e2e:android          # = scripts/run-e2e.sh --android --include-tags required
```

What `--android` changes, and why each piece exists (the trail is in
`docs/plans/dev-plans/2026-09-03-android-device-e2e.md`):

- **`appId:` rewrite.** Local Android installs `dev.rollercoaster.app.dev` (`APP_VARIANT=development`, the run-script default) so it coexists with the store build — **never uninstall the store app** to make room, that is user data. Maestro cannot interpolate `appId:`, so the script copies `flows/` + `subflows/` to `e2e/.android/` (gitignored) with the id rewritten and runs that copy. `APP_VARIANT=<anything else>` targets the base package with no rewrite.
- **`DEV_CLIENT_SCHEME` rewritten to `rollercoasterdev-dev`.** Both installed builds register `exp+rollercoasterdev`, so that deep link raises an app chooser and the suite hangs. The `.dev` build registers its own scheme (`app.config.js`); every flow reads `${DEV_CLIENT_SCHEME}` with `exp+rollercoasterdev` as its `env:` default. A flow-level default beats `maestro test -e`, so the lane rewrites the default in the same `e2e/.android/` copy rather than passing `-e`.
- **English pinned in a loop, not a one-shot.** Per-app locale is set with `cmd locale set-app-locales`, but Maestro's `clearState` is `pm clear`, which deletes it before every flow. The script re-applies it every 0.5s for the whole run (an unchanged value is a framework-level no-op, so the app is not disturbed mid-flow) and kills the loop on exit.
- **Dev-menu onboarding is dismissed in-flow.** There is no durable Android equivalent of the iOS UserDefaults seed (`pm clear` wipes shared_prefs; a `run-as` write races the app). The prologue has an Android-only block that waits for the sheet's "Continue", taps it, and taps an optional "Close". It is a `runFlow: when: platform: Android`, so iOS pays nothing.
- **Existing `android/` checkouts need one re-prebuild.** The `rollercoasterdev-dev` scheme lands in `AndroidManifest.xml` at `expo prebuild` time, and `run-android.sh` only prebuilds when `android/` is missing. An `android/` generated before the scheme existed installs fine but answers no `rollercoasterdev-dev://`, so every flow would die at the boot barrier. The script checks `dumpsys package` for the scheme and refuses to run; the fix is `rm -rf android && bun run android:e2e`.
- **Device selection.** One authorized device is picked up automatically; with several, set `ANDROID_DEVICE_ID` to the adb serial (Maestro's `--device` takes the serial).
- **Expo's own post-install launch still uses `exp+rollercoasterdev://`**, so `bun run android:e2e` ends with an Android app chooser on a phone that also has the store build. Both entries are named "Rollercoaster.dev"; the right one opens the Expo "Development servers" screen. Picking "Always" is fine, and the suite does not depend on it either way.

Platform-specific flow steps live behind `runFlow: when: platform:` blocks: `evidence-gate.yaml` leaves the CompletionFlow modal with a top-down swipe on iOS and hardware `back` on Android, and the two flows that dismiss the wizard keyboard by tapping `edit-goal-steps-header` scroll to it first because Android's `adjustResize` leaves it off-screen. `clearKeychain` is iOS-only; on Android the signing keys live in the app's SecureStore data and `pm clear` wipes them along with everything else.

Artifacts: Maestro writes per-flow screenshots and hierarchies under `~/.local/state/maestro/tests/<timestamp>/`; `e2e/reports/junit.xml` is written as on iOS.

**Never** invoke this via the repo root's `bun run test:e2e` alias in a way you'd trust — that is `turbo test:e2e`. The task is `cache: false` as of #502; before that it declared `outputs: ["coverage/**"]`, which Maestro never writes, so a FULL-TURBO hit could report green having launched nothing.

`scripts/run-e2e.sh` **fails hard** when the Maestro CLI is absent. Set `E2E_ALLOW_MISSING_MAESTRO=1` to opt out deliberately; it used to `exit 0` silently, which reported a green suite from a machine that ran zero flows.

## Flow layout

```
e2e/
  flows/      ← every yaml here is executed as a top-level flow
  subflows/   ← shared fragments, referenced via runFlow, never run standalone
  reports/    ← junit.xml (gitignored) + tracked run records
```

`scripts/run-e2e.sh` runs `maestro test e2e/flows/`, i.e. **everything in that directory**. That is why the shared prologue lives in `e2e/subflows/` — a prologue in `flows/` would execute standalone on every suite run, and it is also why no flow may `runFlow` another top-level flow (the callee would run twice).

### The shared prologue

Every flow opens with:

```yaml
- runFlow:
    file: ../subflows/launch-and-onboard.yaml
    env:
      METRO_HOST: ${METRO_HOST}
      METRO_PORT: ${METRO_PORT}
      DEV_CLIENT_SCHEME: ${DEV_CLIENT_SCHEME}
      THEME_SWATCH: light-autismFriendly
```

It performs isolation → dev-client boot → boot barrier → theme selection → onboarding exit, and asserts arrival on the cockpit.

- **Isolation is `launchApp: { clearState: true, clearKeychain: true }`, for every flow, no exceptions.** Onboarding, theme, density and `pinnedGoalId` all live in one Evolu SQLite file, so `clearState` resets them atomically — but Ed25519 signing keys live in Keychain and are **not** touched by it, so a repeatable bake needs `clearKeychain` too.
- **`METRO_HOST` / `METRO_PORT` are parameterized** (`localhost` / `8081` defaults). `scripts/worktree-boot.sh` puts a worktree's Metro on a path-hashed port in 8080–8179, so a hardcoded port cannot run against one.
- **`DEV_CLIENT_SCHEME` is parameterized** (`exp+rollercoasterdev` default). The Android lane rewrites it to `rollercoasterdev-dev`, the scheme only the local `.dev` build registers — see [Android](#android-device-or-emulator).
- **`THEME_SWATCH` picks the theme during onboarding.** `light-autismFriendly` ("Still Water") is the default because it is the determinism lever: `useAnimationPref` forces `animationPref = "none"` for that variant, which renders the discrete ↑/↓/nest hierarchy controls (the only non-drag reorder path), suppresses `finish-reveal-sparkles`, zeroes `AnimatedSheet` exit timing, and makes the tab knob snap instead of animate. The theme flows override it to `light-default` so their switch is a real change.

### Boot barrier

The barrier **must be a positive wait**: `extendedWaitUntil: { visible: { id: welcome-get-started }, timeout: 60000 }`. Between the `clearState` reinstall and the dev client finishing its bundle fetch there is no React root at all, so a negative assertion (`notVisible: app-loading`) passes instantly on an empty tree and every following step races the bundle download. `welcome-get-started` is the first element that exists only once the bundle has mounted **and** Evolu has resolved `isFirstLaunch` to `true`, so it clears both conditions at once.

The prologue then asserts `assertNotVisible: { id: app-loading }` as belt and braces — `app-loading` is the bare background `View` `App.tsx` renders while `isFirstLaunch === null` (no text, no affordances, indistinguishable from "Welcome failed to mount"). It cannot still be up once the CTA is visible; the assertion keeps the id meaningful and documents the state. Copy this shape verbatim for any new barrier — never the negative-only form.

## Writing Flows

Flows are YAML files in `e2e/flows/`. Each maps to a user story from `docs/vision/user-stories.md`.

### Element matching

1. **`id:`** — maps to `testID` (most stable). **Treated as a regex**, which is what makes the addressing scheme below work.
2. **Text content** — maps to `accessibilityLabel` or visible text (simpler but brittle).

Prefer `id:` for interactive elements. Text matching is fine for assertions, subject to the collapse rule below.

### Addressing rows whose id you cannot know

Every EditMode row testID interpolates an **Evolu-generated** id (`edit-goal-step-up-${step.id}`), which a pre-written flow can never construct. Address them by **`id:` regex + `index:`**:

```yaml
- tapOn:
    id: "edit-goal-step-up-.*"
    index: 1 # row 2 = Charlie; up buttons render on rows 2–3 only
```

`index:` is deterministic here because the flow authored the list order itself. Every such selector must carry an inline comment naming the expected row and the derivation — and the outcome should be asserted a step or two later (the Timeline's ordinal↔title matchers do this), so a mis-targeted tap fails loudly instead of passing quietly.

**`index:` is only safe when every candidate is on screen.** Index is hierarchy order, and on Android the hierarchy holds only what is currently visible (UiAutomator), so in a list longer than the viewport the index of a control shifts with every scroll — the first Android run failed on exactly this in `full-ride.yaml` and `step-timing-editor.yaml`. iOS reports off-screen nodes too, which is why the suite never noticed. Prefer, in order:

1. the control's own title-bearing a11y label (`id: "edit-goal-step-timing-.*"` + `text: 'Set when "Charlie step" is due'`);
2. a relative anchor on the row's title, whose label is the bare step title (`id: "edit-goal-step-up-.*"` + `below: { id: "edit-goal-step-title-.*", text: "Charlie step" }`);
3. `index:`, only for a set that fits on one screen (the in-picker targets, a single sub-step).

**In-wizard rows are the exception**: `useNewGoalSteps` mints `step-<n>` / `sub-<n>` from a monotonic ref counter and there is no `StrictMode`, so `edit-goal-step-evidence-step-1` is knowable and literal ids are strictly better there.

No index-alias testIDs are added to production components for the suite's benefit, and no screen-identity testIDs exist — screen arrival is asserted on an existing surface id (`goals-cockpit-new-goal`, `edit-goal-content`, `finish-celebrate-stage`, …). In particular, **never `assertVisible: "Goals"`**: `GoalsScreen` renders "Today" whenever a hero goal is pinned and "Goals" only when empty, so that assertion is silently conditional.

### The iOS `accessible`-collapse trap

On iOS, a view marked `accessible` becomes a single accessibility element and its `Text` children **do not reach the tree at all** — a testID on a child cannot rescue it. Any text matcher must therefore name **the a11y label that actually reaches the tree**, never the visible copy.

Two live examples:

- The progress strip's `Pressable` is `accessible` and carries `focusMode:progressStrip.a11yLabel` → assert **`"1 of 3 steps done. See all steps."`**, never the inner `"1 / 3 done"` Text.
- The nest-under picker row's `Pressable` carries `editGoal:stepList.a11y.nestUnderA11y` → assert **`"Nest this step under Charlie step"`**, never the visible `Nest under "Charlie step"` child.

This is verifiable, and should be verified, with `maestro hierarchy` — VoiceOver does not run in the Simulator, so the hierarchy dump is the only ground truth.

### Soft keyboard occlusion

Every screen with a text input above a pinned footer CTA now lifts that footer above the keyboard: `CaptureTextNote` via `useReanimatedKeyboardAnimation`, and `NewGoalWizard`, `EditGoalView`, `CaptureLinkScreen`, `VoiceMemoScreen`, `FinishCelebrateStage` and `FinishDesignStage` via the shared `KeyboardAvoidingFrame` (keyboard-controller's view plus a self-measured window offset). `keyboard-cta-reachable.yaml` pins this for the two screens whose add-step input keeps the keyboard up between adds (`blurOnSubmit={false}`): it taps the footer CTA with the keyboard still showing and asserts arrival. Do not add a dismissal step before those taps.

Older flows still dismiss before tapping `capture-link-save` (tap `capture-link-caption`, `pressKey: Enter`). That is now belt and braces, not load-bearing. If you do dismiss from Capture Link, do it from the caption: the URL input is labelled `returnKeyType="next"` but wires no `onSubmitEditing`/ref, so that key advances no focus.

### Flow structure

```yaml
appId: dev.rollercoaster.app
tags:
  - required
env:
  METRO_HOST: localhost
  METRO_PORT: "8081"
  DEV_CLIENT_SCHEME: exp+rollercoasterdev
---
- runFlow:
    file: ../subflows/launch-and-onboard.yaml
    env:
      METRO_HOST: ${METRO_HOST}
      METRO_PORT: ${METRO_PORT}
      DEV_CLIENT_SCHEME: ${DEV_CLIENT_SCHEME}
      THEME_SWATCH: light-autismFriendly
- tapOn:
    id: "goals-cockpit-new-goal"
- assertVisible:
    id: "new-goal-wizard-content"
```

## Required vs Optional Flows

**Maestro `tags:` is the single source of truth.** The old `# Status: required|optional` comment header is gone: nothing parsed it, and it had already drifted twice (one flow said `# Status: TDD-style`, another had no header at all). Tags are Maestro-native and selectable via `--include-tags required`.

A flow qualifies as `required` when it meets ALL three criteria:

1. **Outcome assertions** — it verifies outcomes, not just that actions were performed
2. **Stable feature** — it tests a stable, implemented feature, not an aspirational one
3. **Deterministic** — no race conditions, no flaky element matching

A flow is `optional` when it covers aspirational or partially-implemented features. Optional flows are tracked but excluded from the gate.

## Current Flows

| Flow                                   | Tag        | Covers                                                                                                                                                                                                                                                                                                                   |
| -------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `full-ride.yaml`                       | `required` | **The canonical lifecycle.** Wizard creation with a two-type evidence plan → rename/reorder/reparent → capture every planned type → complete with auto-advance past a set-aside step → Timeline↔Focus exact-step handoff (paused and completed) → step reopen → bake → Badge Detail with a real signed PNG → Badges wall |
| `evidence-gate.yaml`                   | `required` | The goal-level evidence gate (#635): a step with nothing captured blocks Bake with an inline reason → capturing the planned note opens it → bake reaches reveal. The step is never marked complete, so this also pins the gate as evidence-only (ADR-0014)                                                               |
| `badge-view.yaml`                      | `required` | Badges tab navigation and empty state                                                                                                                                                                                                                                                                                    |
| `settings-theme-switch.yaml`           | `required` | Settings → Night Ride, immediate selection                                                                                                                                                                                                                                                                               |
| `settings-theme-persists-restart.yaml` | `required` | Night Ride survives a full app restart (Evolu-backed persistence)                                                                                                                                                                                                                                                        |
| `step-timing-editor.yaml`              | `required` | In-row B/C authoring (#570): open StepTimingEditor on an Edit Goal row, name a `depends on`, read the chip back on the collapsed line and the same sentence on the Timeline. `depends on` only — no due-date tap (see below)                                                                                             |
| `keyboard-cta-reachable.yaml`          | `required` | Footer CTAs stay reachable with the soft keyboard up: four wizard steps added via Enter, then "I'm ready" tapped without dismissing; a fifth step in Edit Goal, then Done tapped the same way. Pins the `KeyboardAvoidingFrame` wrap on both screens                                                                     |
| `evidence-viewer.yaml`                 | `optional` | Mixed-type evidence (link + text) → Timeline card → EvidenceViewerScreen → thumbnail strip. **The only flow requiring `EXPO_PUBLIC_E2E_MODE=true`**                                                                                                                                                                      |

Plus `subflows/launch-and-onboard.yaml`, which is not a flow.

### What the suite deliberately does not cover

**Media evidence capture — `photo`, `video`, `voice_memo`, `file`.** Four of the six evidence types hand control to a different process the moment they are tapped (Apple's camera/photo picker, the Files app, the audio recorder), so they leave the app's accessibility tree entirely and Maestro cannot see them. Pre-granting permissions with `xcrun simctl privacy grant` would raise the ceiling to 4 of 6 at best — camera-`photo` and `voice_memo` are impossible on a simulator regardless — and permission alerts are stateful, firing once per install, which breaks the "isolated and repeatable" property the whole suite rests on.

Compensating coverage, all pure-Jest plus Storybook stories:

- `src/screens/CapturePhoto/__tests__/CapturePhoto.test.tsx`
- `src/screens/CaptureVideoScreen/__tests__/CaptureVideoScreen.test.tsx`
- `src/screens/CaptureFile/__tests__/CaptureFile.test.tsx`
- `src/screens/VoiceMemoScreen/__tests__/VoiceMemoScreen.test.tsx`

**Due-date authoring in the timing editor.** `step-timing-editor.yaml` names a `depends on` but never taps a day. `StepDayGrid` addresses its cells by `${testID}-day-${YYYY-MM-DD}` computed from the live clock, there is no "today" alias testID, and this suite has no date-injection idiom (`runScript` or otherwise). Adding a production seam purely so a flow can tap today is exactly what the addressing rules above refuse, so the date path stays covered by Jest (`StepDayGrid/__tests__`) until it gets its own issue.

**Badge redesign and goal-level reopen.** Nothing navigates to `BadgeDesignerScreen` in either stack, and `uncompleteGoal` has zero UI callers — no flow can reach either. "Reopen" in `full-ride.yaml` is **step** reopen.

**The bake-failure error alert and its retry.** `finish-baking-error-alert` / `finish-baking-retry-button` have no E2E coverage since #635. The only UI-reachable deterministic bake failure was the no-evidence gate, and that is now blocked upstream at the Bake CTA (`evidence-gate.yaml` asserts the block instead) — every remaining failure mode (`bakePNG` corruption, `saveBadgePNG`/`readBadgePNG` FS errors, `keyProvider.sign`) needs code-level fault injection Maestro cannot do. Covered at component level in `FinishBakingStage.test.tsx` and `CompletionFlowScreen.test.tsx`.

**The `no-key` bake branch.** Reachable since #566 — the hook lands on it whenever `useUserKey` reports an error (SecureStore unavailable, keypair generation threw, verification failed). No E2E coverage because every trigger is a native-keystore fault Maestro cannot inject; covered in `useCreateBadge.test.ts`, `FinishBakingStage.test.tsx` and `CompletionFlowScreen.test.tsx`.

## The pre-merge gate

E2E is **not** in CI. It is a manual gate run on a local simulator before merging anything that touches the redesign lifecycle.

**Procedure:**

1. Terminal 1 — `cd apps/native-rd && bun run ios:e2e` (Metro + a dev-client build carrying the E2E flags)
2. Terminal 2 — `bun run type-check && bun run lint && bun run test`
3. Terminal 2 — `bun run test:e2e:required`
4. Attach the resulting `e2e/reports/junit.xml` summary to the PR, and record a run file under `e2e/reports/` when the run is the artifact something else gates on.

**Every run record must carry the environment block**, because a green run only means anything against a named environment:

- Maestro version
- Simulator device + iOS runtime, or the Android device model + OS version
- **Locale** (the suite pins `en`; record what the run actually used)
- Git SHA
- `EXPO_PUBLIC_E2E_MODE`

CI enforcement is tracked separately in **#560**. (The `#889` pointer this file used to carry belonged to the **predecessor monorepo's** issue space and is unreachable from here.)

### Guarding against regressions to removed UI

The redesign retired a large set of selectors. This grep must return nothing:

```bash
rg -n 'tab-fab-new-goal|new-goal-title"|create-goal|"start-working"|completion-note-input|completion-save-note-button|badge-earned-image|use-this-design|step-list-|Customize|Add evidence|Toggle evidence drawer|Tap to expand timeline|New Goal|Design Badge|Use This Design|One last thing!|No badges yet|What do you want to learn\?|Create Goal' e2e/flows e2e/subflows
```

Note the quote anchors on `new-goal-title"` and `"start-working"`: the live `new-goal-title-input` and `new-goal-start-working-button` ids are supersets of retired ones, and an unanchored pattern flags them as false positives.
