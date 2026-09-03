# Android device E2E: make the Maestro suite run on a physical phone

Status: implemented 2026-09-03 (same day, see "What shipped" at the bottom).
Written after a first manual run on Joe's Samsung SM-A165F (Android 16, German
locale, Play Store app installed).

## Result of the manual run

`--include-tags required`, 7 flows: **4 pass, 3 fail**. All 3 failures are
iOS-only assumptions in the flows, not app regressions (screenshots checked).

| Flow                            | Result | Why                                                                                                                                                                 |
| ------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| settings-theme-switch           | pass   |                                                                                                                                                                     |
| settings-theme-persists-restart | pass   |                                                                                                                                                                     |
| keyboard-cta-reachable          | pass   |                                                                                                                                                                     |
| badge-view                      | pass   |                                                                                                                                                                     |
| full-ride                       | FAIL   | `edit-goal-steps-header` scrolled off-screen at tap time                                                                                                            |
| step-timing-editor              | FAIL   | same as full-ride                                                                                                                                                   |
| evidence-gate                   | FAIL   | swipe-down to dismiss badge sheet is iOS-only; Android stays on "Make your badge", `timeline-back-button` never appears (`finish-design-back` is on screen instead) |

Artifacts: `~/.local/state/maestro/tests/2026-09-03_154246/` (screenshots +
hierarchies per flow). Patched flow copies used for the run live in the session
scratchpad only (not in the repo).

## Every obstacle hit, and the fix used

1. **Phantom `emulator-5554 offline`** breaks Expo's device enumeration.
   Cause: OrbStack listens on TCP 5555, adb probes it as an emulator.
   Fix: `adb kill-server; ADB_LOCAL_TRANSPORT_MAX_PORT=5554 adb start-server`.
2. **`expo run:android --device <serial>` fails** ("Could not find device with
   name"). Expo wants the model name, not the adb serial. With one device, drop
   `ANDROID_DEVICE_ID` entirely.
3. **INSTALL_FAILED_VERSION_DOWNGRADE** for `dev.rollercoaster.app`. The Play
   Store build (versionCode 24) owns that package on the phone. Do NOT uninstall
   it (user data). Build the `.dev` variant instead (`APP_VARIANT=development`,
   the run script default).
4. **`android/` was prebuilt with the base package.** `applicationId` and the
   cached `android/build/generated/autolinking/autolinking.json` both said
   `dev.rollercoaster.app`, so the .dev build failed on
   `dev.rollercoaster.app.BuildConfig`. Fix: `rm -rf android/build android/app/build
android/.gradle`, then `APP_VARIANT=development npx expo prebuild --platform
android --no-install`, then `scripts/run-android.sh`.
5. **Flows hardcode `appId: dev.rollercoaster.app`.** For the run, a copy of
   `e2e/` was sed'ed to `.dev`.
6. **`openLink: exp+rollercoasterdev://…` raises an Android app chooser** because
   both installed apps register the scheme. Maestro then hangs on the launcher.
   Workaround used: `launchApp`, `tapOn: "exp://"`, `inputText: http://${METRO_HOST}:${METRO_PORT}`,
   `hideKeyboard`, `tapOn: "Connect"` (dev launcher URL field). Appears twice:
   the prologue subflow and inline in `settings-theme-persists-restart.yaml`.
7. **Device locale is de-DE**, flows assert English labels. iOS script pins
   `AppleLanguages`; Android equivalent is
   `adb shell cmd locale set-app-locales dev.rollercoaster.app.dev --locales en-US`.
   BUT `pm clear` (Maestro `clearState`) wipes it every flow.
8. **Expo dev-menu onboarding sheet ("Continue")** covers the app on first
   launch after each `clearState`. iOS script seeds
   `EXDevMenuIsOnboardingFinished`; Android stores it in
   `shared_prefs/expo.modules.devmenu.sharedpreferences.xml`
   (`isOnboardingFinished`, `showsAtLaunch`), writable via `adb shell run-as`
   on a debug build, but also wiped by `pm clear` and racy against the app's
   own write. A host loop (`seed-loop.sh`, 0.3s) re-applying 7+8 lost the race
   once. Reliable fix was in-flow: after Connect,
   `extendedWaitUntil visible "Continue" timeout 25000 optional`, `tapOn Continue optional`,
   `tapOn Close optional`.
9. **First bundle build (~14s + transfer) exceeds the 60s welcome barrier** on a
   cold Metro. Second run passes. Warm Metro before the suite.

## Proposed repo changes (one PR, in this order)

1. **Variant-specific URL scheme.** In `app.config.js`, when
   `APP_VARIANT === "development"`, add `scheme: "rollercoasterdev-dev"` (keep
   the base scheme for everything else). Parameterise the deep link in
   `e2e/subflows/launch-and-onboard.yaml` and
   `e2e/flows/settings-theme-persists-restart.yaml` via a Maestro env
   `DEV_CLIENT_SCHEME` defaulting to `exp+rollercoasterdev`. Kills obstacle 6
   without the URL-typing hack.
2. **Parameterise `appId`.** Maestro `appId` cannot take `${}`; options are
   (a) a `scripts/run-e2e.sh --android-dev` flag that seds a temp copy of `e2e/`
   into `e2e/.android/` (gitignored) before running, or (b) accept `.dev` in
   both flows via a generated copy. Prefer (a), it also lets the script own the
   scheme/env values.
3. **Android pre-seed in `scripts/run-e2e.sh`.** When an adb device is present:
   set per-app locale en-US and write the dev-menu prefs via `run-as`, AND add
   the optional Continue/Close dismissal steps to the prologue (guarded so they
   are no-ops on iOS: `optional: true` already does that). Document why both
   are needed (pm clear wipes the seed).
4. **Fix the 3 flows for Android:**
   - full-ride, step-timing-editor: `scrollUntilVisible` (direction UP) on
     `edit-goal-steps-header` before the tap, or tap a different inert element
     that is guaranteed on screen.
   - evidence-gate: replace the swipe-down with `tapOn: id: finish-design-back`
     (works on both platforms), then assert `timeline-back-button`.
5. **ADB phantom emulator guard** in `scripts/run-android.sh`: if
   `adb devices` lists an `offline` emulator and no emulator process runs,
   restart adb with `ADB_LOCAL_TRANSPORT_MAX_PORT=5554`. Or document it in
   the native-rd-build skill gotchas.
6. **Docs:** `e2e/README.md` Android section: build the `.dev` variant, never
   uninstall the store app, warm Metro first, where the artifacts land.

## Commands that worked (for re-running by hand)

```bash
cd apps/native-rd
adb kill-server; ADB_LOCAL_TRANSPORT_MAX_PORT=5554 adb start-server
rm -rf android/build android/app/build android/.gradle
APP_VARIANT=development npx expo prebuild --platform android --no-install
EXPO_PUBLIC_E2E_MODE=true CI=1 bash scripts/run-android.sh   # leaves Metro up
# then, with patched e2e copy (appId .dev, no openLink, optional Continue/Close):
maestro test --include-tags required --format junit --output reports/junit.xml e2e/flows/
```

## Open questions

- Should the suite officially support a physical Android device, or only an
  emulator (where the store app is absent and the base package works)? An
  emulator avoids obstacles 3, 5, 6 entirely; the locale/dev-menu seeding and
  the 3 flow fixes are needed either way.
- `clearKeychain` is iOS-only; the Android flows currently rely on `pm clear`
  wiping the signing key store. Confirm the bake flow is really repeatable on
  Android (badge-view passed, so likely yes).

## What shipped, and where it deviates from the proposal above

- **1. Scheme** — as proposed. `app.config.js` adds `scheme: "rollercoasterdev-dev"`
  when `APP_VARIANT === "development"`; all flows carry `DEV_CLIENT_SCHEME`
  (default `exp+rollercoasterdev`) and pass it into the prologue.
  One surprise: a flow-level `env:` default beats `maestro test -e`, so the
  Android lane rewrites the default in its flow copy instead of passing `-e`.
- **2. appId** — option (a). The flag is `--android`, not `--android-dev`: the
  `.dev` package is the only thing `scripts/run-android.sh` ever installs
  locally, so the flag names the lane and `APP_VARIANT` picks the package.
  Copy lands in `e2e/.android/` (gitignored). `bun run test:e2e:android` wraps it.
- **3. Pre-seed** — locale: a 0.5s background loop, because a one-shot is wiped
  by the first `pm clear` before flow one starts. Dev-menu prefs: **not seeded
  at all**. The seed was racy and, when it did land, made the in-flow
  "Continue" wait a 25–60s timeout on every flow. Not seeding makes the sheet
  appear deterministically, so the prologue waits for it (non-optional), taps
  Continue, and taps an optional Close — inside `runFlow: when: platform:
Android`, so iOS is untouched.
- **4. Flow fixes** — header: `scrollUntilVisible` UP before the tap in both
  flows. evidence-gate: **not** `finish-design-back` — that only steps back to
  the celebrate stage (`CompletionFlowScreen.tsx`, `onBack={() =>
setStage("celebrate")}`) and never leaves the modal. The modal has no header,
  so the exit is platform gesture: iOS keeps the swipe, Android sends hardware
  `back`, each behind a `when: platform:` block.
- **4b. Two more Android-only failures surfaced once the above passed**, both
  in `full-ride` (one also in `step-timing-editor`):
  - `index:` on per-row controls. Index is hierarchy order, and Android's
    hierarchy (UiAutomator) holds only on-screen nodes, so `nest-under` index 2
    had no third match once Alpha scrolled off the top; iOS reports off-screen
    nodes and never noticed. Fixed by dropping the index: the timing line is
    matched by its own title-bearing a11y label, the up/nest-under buttons by
    `below:` the row's title Pressable (label = bare title). Rule written into
    `e2e/README.md` → "Addressing rows".
  - `inputText` into a `selectTextOnFocus` input: iOS appends at the caret,
    Android replaces the selection, so `" renamed"` produced a step called
    "renamed". Step 13 now erases and retypes the full title.
  - Same on-screen-only tree, one more time: `badge-detail-view-timeline`
    sits below the fold on a phone, so the final wait is now preceded by a
    barrier on `badge-renderer` and an explicit mid-screen `swipe`.
    `scrollUntilVisible` did not work there: Maestro's scroll gesture starts
    near the bottom of the screen, on the pinned Share footer, which eats it.
- **5. adb guard** — in `run-android.sh`, plus Gotcha 17 in the build skill.
- **6. Docs** — `e2e/README.md` → Android section.
- **Extra: stale `packages/*/dist`.** While this was being implemented the bake
  failed on the phone with `TypeError: undefined is not a function` at
  `buildDid`: `packages/openbadges-core/dist` was from 2026-08-11 and predated
  `encodeP256DidKey` (added 2026-09-01). Metro resolves the package through
  `exports` → `dist/index.js`, and neither run script built the packages. Both
  now run `turbo run build --filter='./packages/*'` before launching (cached).
  Metro does not pick up a rebuilt dist while running; restart it.

## Open questions — answered

- Physical device is now a supported lane, and it covers the emulator too: both
  install the `.dev` package through `run-android.sh`, so the lane is the same.
- `clearKeychain` is iOS-only. On Android the signing keys live in SecureStore,
  i.e. in the app's own data, which `pm clear` wipes with everything else.
