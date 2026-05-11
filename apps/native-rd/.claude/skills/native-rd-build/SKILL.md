---
name: native-rd-build
description: Build native-rd for any target — local iOS simulator/device, local Release builds, EAS development/preview/production, Android (when generated). Use when the user hits a build failure, asks how to produce a build of any kind, needs to diagnose runtime errors that look build-related ("No script URL provided", missing assets, signing issues), or wants to understand what `eas.json` / `app.json` / `Podfile.properties.json` settings actually do. Also use as a pre-flight checklist before starting a fresh build.
metadata:
  author: rollercoaster.dev
  version: "2.4.0"
---

# native-rd Build Playbook

Comprehensive build reference for `apps/native-rd`. Stack: **Expo SDK 54 + RN 0.81.5 + Hermes + new architecture (`newArchEnabled: true`)**, building with **Xcode 26.x** and EAS CLI ≥ 13.

> **This skill is a living document. Update it every time you use it.** Sections are tagged with their evidence status; promote `[UNTESTED]` → `[VERIFIED <date>]` after the first successful real run, demote to `[BROKEN]` if it fails for a non-trivial reason, and add new Gotcha sections when you hit something new. Untested guidance left untouched is exactly how playbooks rot. See "Maintaining this skill" at the bottom.

## Evidence tags

- **`[VERIFIED YYYY-MM-DD]`** — observed working or failing in this repo on the date shown. Trust the contents until something contradicts it.
- **`[UNTESTED]`** — derived from Expo / EAS / RN docs; happy-path guidance, not battle-tested in this repo. Prove it before relying on it.
- **`[BROKEN]`** — known-broken in current repo state; documented so we don't burn time rediscovering.

---

## Build matrix

| Target                         | Local command                                                       | EAS profile                                              | Status                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| iOS Simulator (dev client)     | `bun run ios` (with `IOS_DEVICE_ID` empty)                          | `eas build -p ios --profile development`                 | `[VERIFIED 2026-05-11]` local sim + EAS development profile (cloud build). `scripts/run-ios.sh` pins `REACT_NATIVE_PACKAGER_HOSTNAME=localhost` on the sim branch to avoid Gotcha 11                                                                                                                                                   |
| iOS Device (dev client)        | `bun run ios` (or `IOS_DEVICE_ID=… bun run ios:device`)             | `eas build -p ios --profile development` (then sideload) | `[VERIFIED 2026-05-02]` local device                                                                                                                                                                                                                                                                                                   |
| iOS Release (local sim)        | `npx expo run:ios --configuration Release`                          | n/a                                                      | `[VERIFIED 2026-05-02]` per `docs/plans/2026-05-02-expo-doctor-build-validation.md`                                                                                                                                                                                                                                                    |
| iOS Release (local device)     | `npx expo run:ios --configuration Release --device <udid>`          | n/a                                                      | `[UNTESTED]`                                                                                                                                                                                                                                                                                                                           |
| iOS preview build (signed IPA) | n/a                                                                 | `eas build -p ios --profile preview`                     | `[UNTESTED]`                                                                                                                                                                                                                                                                                                                           |
| iOS production build           | n/a                                                                 | `eas build -p ios --profile production`                  | `[UNTESTED]`                                                                                                                                                                                                                                                                                                                           |
| iOS App Store submit           | n/a                                                                 | `eas submit -p ios --profile production`                 | `[BROKEN]` `ascAppId` placeholder in `eas.json`                                                                                                                                                                                                                                                                                        |
| Android Emulator (dev client)  | `bun run android`                                                   | `eas build -p android --profile development`             | `[VERIFIED 2026-05-07]` local emulator (Pixel 6a / API 35 / Google APIs / arm64-v8a). Now routes through `scripts/run-android.sh` which handles `adb reverse` + localhost pinning (Gotcha 11). Required: write `android/local.properties`, install NDK `27.1.12297006`, bump `react-native-nitro-modules` to `^0.35.6` (Gotchas 7/8/9) |
| Android Device (dev client)    | `bun run android:device` (or `ANDROID_DEVICE_ID=… bun run android`) | same                                                     | `[UNTESTED]` should work once an Android device is paired and `adb devices` lists it; same Gotchas 7/8/9/11 apply                                                                                                                                                                                                                      |
| Android preview APK            | n/a                                                                 | `eas build -p android --profile preview`                 | `[VERIFIED 2026-05-07]` ~33min cloud build, signed APK artifact downloadable from EAS dashboard. First attempt errored in POST_INSTALL_HOOK (Gotcha 10) — fix in commit 2d2e46b4 unblocked it                                                                                                                                          |
| Android production AAB         | n/a                                                                 | `eas build -p android --profile production`              | `[UNTESTED]`                                                                                                                                                                                                                                                                                                                           |
| Android Play Store submit      | n/a                                                                 | `eas submit -p android --profile production`             | `[BROKEN]` `play-service-account.json` not committed (rightfully so — needs developer-local copy)                                                                                                                                                                                                                                      |

---

## Local iOS — dev client

`[VERIFIED 2026-05-02]`

The fast feedback path. Builds Debug, installs on simulator or paired device, launches Metro for hot reload.

### Commands

```bash
cd apps/native-rd
bun run ios          # picks up .env.local — uses IOS_DEVICE_ID if set, otherwise simulator
bun run ios:device   # explicit device, requires IOS_DEVICE_ID exported in shell
npx expo run:ios     # raw — no .env.local sourcing, no IOS_DEVICE_ID validation
```

`bun run ios` calls `scripts/run-ios.sh`, which sources `.env.local` (gitignored, per-developer) and dispatches to either `npx expo run:ios --device <udid>` or `npx expo run:ios` depending on whether `IOS_DEVICE_ID` is set. On the simulator branch it also pins `REACT_NATIVE_PACKAGER_HOSTNAME=localhost` so the dev client doesn't try to fetch the bundle from the host's LAN IP (Gotcha 11).

### Per-developer config — `.env.local`

```env
# apps/native-rd/.env.local
IOS_DEVICE_ID=00008150-00194C6E1480401C   # Narcissus, xctrace UDID format (see Gotcha 2)
```

Get the legacy UDID with: `xcrun xctrace list devices`

### Verifying success

End of build log should contain:

```
› Build Succeeded
› Installing /Users/.../DerivedData/nativerd-…/Build/Products/Debug-iphoneos/Rollercoasterdev.app
✔ Complete 100%
Starting Metro Bundler
iOS Bundled NNNNms apps/native-rd/index.ts (5000+ modules)
```

See gotchas: 1, 2, 3, 4, 11 below.

---

## Local iOS — Release

`[VERIFIED 2026-05-02]` for simulator, `[UNTESTED]` for device

Release config produces a stripped, optimized binary with the JS bundle embedded — no Metro required at runtime.

```bash
cd apps/native-rd

# Simulator (no signing required)
npx expo run:ios --configuration Release

# Device (requires valid signing)
npx expo run:ios --configuration Release --device 00008150-00194C6E1480401C
```

After a successful Release simulator build you should find `main.jsbundle` in the app bundle (this is what `2026-05-02-expo-doctor-build-validation.md` validates).

For device Release, signing comes from your Apple Team (currently `86VL756N99` per `eas.json`). If you don't have a provisioning profile locally, the build will fail at the codesign step — use `eas build --profile preview` instead.

---

## Local Android — dev client

`[VERIFIED 2026-05-07]` Pixel 6a emulator (API 35, Google APIs, arm64-v8a). New architecture + Hermes work; bundles 6107 modules in ~17s.

### One-time toolchain prerequisites

Set up by Android Studio Standard wizard, with three additions:

1. **Android Studio** — `brew install --cask android-studio`. Run "Standard" setup wizard to install SDK to `~/Library/Android/sdk`.
2. **SDK packages** beyond Standard wizard (via Settings → Languages & Frameworks → Android SDK):
   - SDK Tools tab: tick **Android SDK Command-line Tools (latest)** (provides `sdkmanager`, `avdmanager`)
   - SDK Platforms tab: enable **Show Package Details**, expand **Android 15.0 / API 35**, tick **Android SDK Platform 35** + **Google APIs ARM 64 v8a System Image** (Apple Silicon needs ARM64; the x86_64 image is unusably slow under Rosetta)
3. **NDK 27.1.12297006** — required by Expo SDK 54 build config; **NOT installed by Standard wizard**. See Gotcha 8.
4. **Env vars** in `~/.zshenv` (sourced for non-interactive shells too):

   ```sh
   export ANDROID_HOME="$HOME/Library/Android/sdk"
   export ANDROID_SDK_ROOT="$ANDROID_HOME"
   export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
   ```

### Per-project bootstrap

`bun run android` routes through `scripts/run-android.sh`, which writes `android/local.properties` if missing, runs `adb reverse tcp:8081 tcp:8081`, and exports `REACT_NATIVE_PACKAGER_HOSTNAME=localhost` so the dev client reliably reaches Metro from emulator or USB device. You only need to do the prebuild + nitro-modules check by hand:

1. **Run `npx expo prebuild --platform android`** once (or after toolchain bumps).
2. **Verify `react-native-nitro-modules`** in `package.json` is `^0.35.6` or newer. Older 0.33.x lacks the `CxxPart` class that `react-native-unistyles@3.2.4`'s autogenerated Kotlin bindings require (Gotcha 9).

Manual `local.properties` bootstrap is still documented for cases where you bypass the launcher script (Gotcha 7 explains why Gradle needs the file even with `ANDROID_HOME` exported):

```bash
echo "sdk.dir=$HOME/Library/Android/sdk" > apps/native-rd/android/local.properties
```

`android/` is gitignored (per-developer file).

### Build & run

```bash
cd apps/native-rd

# Boot an emulator first (Studio → Device Manager → ▶ on your AVD)
adb devices                               # should list emulator-5554

bun run android                           # Debug build → install → start Metro
# explicit device targeting:
ANDROID_DEVICE_ID=emulator-5554 bun run android:device
```

`run-android.sh` will refuse to launch if no device/emulator is connected (clearer failure than letting Gradle build first and then crashing on install).

First Gradle compile is slow (~6 min — RN core C++ + Hermes + native modules for arm64-v8a). Incremental rebuilds are seconds.

### What's still untested

- **Physical Android device** — same flow should work once a device is paired (`adb devices` lists it). Likely needs USB debugging enabled on the device.
- **Release configuration locally** — equivalent of `npx expo run:ios --configuration Release`. Try `npx expo run:android --variant release`.
- **New architecture edge cases** — TurboModules, Fabric components specific to the app may behave differently from iOS. Ran without smoke-test; one warning observed: `setLayoutAnimationEnabledExperimental is currently a no-op in the New Architecture` (benign).

---

## EAS — overview

`[UNTESTED]` (config exists, no successful build observed in this session)

`apps/native-rd/eas.json`:

```json
{
  "cli": {
    "version": ">= 13.0.0",
    "appVersionSource": "remote",
    "requireCommit": true
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true }
    },
    "preview": {
      "extends": "development",
      "distribution": "internal",
      "ios": { "simulator": false }
    },
    "production": {
      "autoIncrement": true,
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

Key behaviors:

- **`requireCommit: true`** — EAS refuses to build with uncommitted changes. Commit first or stash.
- **`appVersionSource: "remote"`** — version numbers (`buildNumber` for iOS, `versionCode` for Android) live on EAS servers, not in `app.json`. `production.autoIncrement: true` bumps them per build.
- **`development` profile** — produces a dev client (talks to Metro). iOS variant is **simulator-only**.
- **`preview` profile** — extends development but **iOS is device-targeted** (signed IPA you can sideload via TestFlight or direct install). `distribution: internal` = no public store.
- **`production` profile** — App Store IPA + Play Store AAB.

### Running EAS builds

`[VERIFIED 2026-05-02]` for `--profile development` (iOS); `[UNTESTED]` for the rest.

```bash
cd apps/native-rd

# Auth (one-time per machine)
eas login

# Build (full cloud build — slow first time)
eas build --platform ios --profile development      # cloud build, simulator
eas build --platform ios --profile preview          # cloud build, device IPA
eas build --platform ios --profile production       # cloud build, App Store
eas build --platform android --profile preview      # cloud build, APK
eas build --platform android --profile production   # cloud build, AAB

# Local cloud-equivalent (faster iteration, requires local toolchain)
eas build --platform ios --profile preview --local
```

Build artifacts are downloadable from the EAS dashboard or via `eas build:list`.

### Faster dev iteration: `eas build:dev`

`[UNTESTED]` — surfaced as a tip by EAS CLI on 2026-05-02 after first dev build.

For day-to-day dev-client work, prefer `eas build:dev` over `eas build --profile development`. It:

1. Computes a **fingerprint** of your native config (`Podfile`, native deps, plugins) and checks for a matching cached dev build on EAS.
2. If a compatible build exists → downloads + installs it directly (~30 sec, no rebuild).
3. If not → runs a fresh `eas build` then auto-installs when done.

```bash
eas build:dev                 # picks platform from current selection or prompts
eas build:dev -p ios          # explicit
```

Why this matters: JS-only changes don't invalidate the native fingerprint, so the **same dev build can be reused indefinitely** while you iterate on JS. Only a change to native deps/plugins/Podfile triggers a rebuild. This is the workflow EAS expects you to use during development — `eas build --profile development` is the lower-level command underneath.

Promote to `[VERIFIED]` after first successful invocation.

### Submitting — `[BROKEN]`

```bash
eas submit --platform ios --profile production       # BLOCKED: ascAppId placeholder
eas submit --platform android --profile production   # BLOCKED: play-service-account.json missing
```

Before either submit can run:

- **iOS:** create the App Store Connect record (Apple Dev portal → "App Store Connect" → "My Apps" → "+"), then replace `submit.production.ios.ascAppId` in `eas.json` with the real numeric ID.
- **Android:** download a Google Play service-account JSON (Play Console → API access), save as `apps/native-rd/play-service-account.json`. Confirm it's covered by `apps/native-rd/.gitignore` (the explicit `play-service-account.json` line) before doing anything else: `git check-ignore -v apps/native-rd/play-service-account.json`. The `serviceAccountKeyPath` in `eas.json` is a relative path from the app dir.

---

## Gotcha 1 — `Sealable` undefined symbol on iOS device, simulator works

`[VERIFIED 2026-05-02]`

**Symptom (only when building for a physical iOS device):**

```
ld: Undefined symbols for architecture arm64
  facebook::react::Sealable::Sealable() referenced from
    expo::ExpoViewProps::ExpoViewProps() in libExpoModulesCore.a[…](ExpoFabricViewObjC.o)
clang: error: linker command failed with exit code 1
```

Often accompanied by warnings about missing `CoreAudioTypes` / `UIUtilities` frameworks and `SwiftUICore.tbd` "not an allowed client". Those are noise — the link error is the blocker.

**Cause:** RN 0.81 ships **prebuilt React-Native Core binaries** (`React-Core-prebuilt`, `ReactNativeDependencies`) downloaded as a tarball during `pod install`. With `newArchEnabled: true`, the Podfile defaults `RCT_USE_PREBUILT_RNCORE=1`. The prebuilt's device slice has missing/incompatible C++ symbols for Fabric (`Sealable`). The simulator slice is built differently and is fine.

**Fix:** opt out of the prebuilt by adding to `ios/Podfile.properties.json`:

```json
{
  "expo.jsEngine": "hermes",
  "EX_DEV_CLIENT_NETWORK_INSPECTOR": "true",
  "newArchEnabled": "true",
  "ios.buildReactNativeFromSource": "true"
}
```

Then re-run `pod install` (after `rm -rf Pods Podfile.lock build && rm -rf ~/Library/Developer/Xcode/DerivedData/nativerd-*`). Pod count goes 100 → 105 (source pods replace the prebuilt aggregate). First compile is 5–10min slower; subsequent ones cache.

**Survives `expo prebuild`?** Yes for non-`--clean`; **NO** for `--clean`. With `--clean`, re-add the flag manually before `pod install`. Long-term fix: migrate to `app.json` via `expo-build-properties` plugin.

**Does this affect EAS?** `[UNTESTED]` — likely yes, since EAS uses the same Podfile. EAS cloud builds may have different cache state but the config is read identically. If EAS device builds hit the same `Sealable` error, the same flag should fix it.

---

## Gotcha 2 — iOS device UDID mismatch on Xcode 26

`[VERIFIED 2026-05-02]`

**Symptom:**

```
Unexpected devicectl JSON version output from devicectl. Connecting to physical Apple devices may not work as expected.
CommandError: No device UDID or name matching "F499DF16-FE6F-5C7E-9AED-708CD7715124"
```

**Cause:** Xcode 26's `devicectl` returns a JSON envelope that Expo CLI's parser doesn't recognize, so its device list comes back empty. Expo also can't match the **CoreDevice UUID format** (`F499DF16-…`) that `xcrun devicectl list devices` reports.

**Fix:** use the **legacy `xctrace` UDID** (different identifier for the same physical device):

```bash
xcrun xctrace list devices
# Narcissus (26.5) (00008150-00194C6E1480401C)   ← use this format
```

Expo CLI works with the `00008XXX-...` form. `apps/native-rd/.env.local` should hold this format.

When fixed upstream in Expo CLI, either form will work.

---

## Gotcha 3 — Old splash / app icons after asset updates

`[VERIFIED 2026-05-02]`

**Symptom:** App on device shows previous icons/splash even after a clean rebuild. New PNGs in `apps/native-rd/assets/` are not reflected.

**Cause:** Expo populates `ios/nativerd/Images.xcassets/` (and the equivalent Android asset paths) from `app.json` only during `expo prebuild`. Without re-running it, every `xcodebuild` packages the existing asset catalog. Verify:

```bash
ls -la apps/native-rd/assets/icon.png                                                    # source of truth
ls -la apps/native-rd/ios/nativerd/Images.xcassets/AppIcon.appiconset/                   # generated
ls -la apps/native-rd/ios/nativerd/Images.xcassets/SplashScreenLegacy.imageset/          # generated
```

If `Images.xcassets/` files are tiny placeholders (~70 bytes) or older than `assets/`, prebuild has not run.

**Fix:**

```bash
cd apps/native-rd
npx expo prebuild --platform ios       # use --platform android once Android is set up
cd ios && pod install                  # only iOS — refreshes pods in case prebuild updated config
```

**Avoid `--clean`** unless necessary. It nukes `ios/` (and `android/` if you pass `--platform android`) and regenerates from scratch — loses direct edits to `Podfile.properties.json` (e.g. our `buildReactNativeFromSource` flag).

---

## Gotcha 4 — `No script URL provided` at app launch

`[VERIFIED 2026-05-02]`

**Symptom (runtime, not build):** App launches on device, shows red or black screen:

```
No script URL provided. Make sure the packager is running or you have embedded a JS bundle in your application bundle.
unsanitizedScriptURLString = (null)
```

**Causes (rank order):**

1. **Metro isn't running.** `expo run:ios` keeps Metro alive after install. If you killed the terminal or Metro crashed, the app has nowhere to fetch JS.
2. **iOS Local Network permission denied** for the app. iOS 14+ requires consent before `http://<mac-ip>:8081` is reachable. Settings → Rollercoasterdev → Local Network → enable.
3. **Mac and iPhone are on different networks** (e.g. iPhone on cellular, Mac on WiFi). USB-C bypasses this — Expo tunnels.
4. **Stale embedded dev-server settings.** Reinstall typically refreshes; if not, delete the app from the device and rebuild.

For a black screen with no dev menu response: shake the phone, tap "Reload". If shake doesn't work, force-quit the app and re-launch.

This error does **not** apply to Release builds — those embed `main.jsbundle` and don't talk to Metro.

---

## Gotcha 5 — `expo-doctor` peer warnings (mostly noise)

`[VERIFIED 2026-05-02]` per `docs/plans/2026-05-02-expo-doctor-build-validation.md`

`bunx expo-doctor` and `npx expo install --check` consistently report:

- Missing peers for `expo-asset`, `@react-native-community/datetimepicker`, `@react-native-community/slider` — known monorepo hoisting artifacts
- Expo-native version mismatches for `react-native-gesture-handler`, `react-native-keyboard-controller`, `react-native-svg`, `react-native-worklets` — chase these only if a real bug points at one
- Duplicate native module warnings — Bun workspace layout artifact, not a code regression
- Metro symlink override warning — keep as-is unless a build proves otherwise
- SDK mismatches for **Jest** and **TypeScript** — **documented exceptions, do NOT downgrade** to satisfy the doctor

Don't take expo-doctor warnings at face value. Cross-reference against the validation plan.

---

## Gotcha 6 — Metro resolver cache poisoned after `bun add` / `bunx expo install`

`[VERIFIED 2026-05-02]`

**Symptom (red error screen on the dev client, not a build error):**

```
UnableToResolveError Unable to resolve module react-native-quick-crypto from
  /Users/.../apps/native-rd/index.ts:
react-native-quick-crypto could not be found within the project or in these directories:
  node_modules
  ../../node_modules
```

The module **is** installed (`apps/native-rd/node_modules/<pkg>/package.json` exists, `node -e 'require.resolve("<pkg>")'` succeeds) but Metro insists it can't be found.

**Cause:** When `bun add` or `bunx expo install` runs while Metro is alive (e.g. you installed a new package without first killing the dev server), Metro's resolver caches a "module not found" result for any package whose `node_modules` symlink wasn't yet present at the moment of first resolution. Subsequent reloads keep returning the cached negative result even after the package is installed. Bun's `.bun/<pkg>@<hash>/node_modules/...` symlink farm seems to make this worse than a regular `npm install`.

**Fix:**

```bash
pkill -f metro 2>/dev/null
pkill -f "expo start" 2>/dev/null
rm -rf apps/native-rd/.expo                    # clears Expo's local Metro state
cd apps/native-rd && npx expo start --dev-client --clear
```

Then **shake the device** → Reload. Metro re-bundles from scratch (slow first reload — "Bundler cache is empty, rebuilding"). After that, resolutions are correct.

Best practice: always kill Metro **before** running `bun add` / `bunx expo install`, then restart with `--clear`. Saves a debugging round trip.

---

## Gotcha 7 — Android: `SDK location not found` despite `ANDROID_HOME` set

`[VERIFIED 2026-05-07]`

**Symptom (Gradle configuration phase, not compile):**

```
> Failed to apply plugin 'com.facebook.react.rootproject'.
   > A problem occurred configuring project ':app'.
      > SDK location not found. Define a valid SDK location with an ANDROID_HOME
        environment variable or by setting the sdk.dir path in your project's
        local properties file at '.../android/local.properties'.
```

`echo $ANDROID_HOME` shows the right path, `adb` is on `PATH`, but Gradle still can't find the SDK.

**Cause:** env-var inheritance is fragile across the `bun → npm-script → expo-cli → @expo/spawn-async → gradlew` chain. Each layer can fail to forward env. Bun in particular spawns child processes via Node's `child_process` without re-sourcing shell init files. Even with `ANDROID_HOME` exported in `~/.zshenv`, the `gradlew` invocation may run in a stripped environment.

**Fix:** write `android/local.properties` — Gradle's Android plugin reads `sdk.dir` here before checking env vars, and this file is machine-local (gitignored).

```bash
echo "sdk.dir=$HOME/Library/Android/sdk" > apps/native-rd/android/local.properties
```

**Survives `expo prebuild`?** Yes for non-`--clean`; **NO** for `--clean` (regenerates the whole `android/` directory, wiping `local.properties`). Re-write after `--clean`.

**Does this affect EAS?** No — EAS cloud build hosts have `ANDROID_HOME` set system-wide and the build uses a fresh checkout that doesn't include `local.properties`. This is purely a local-build concern.

---

## Gotcha 8 — Android: `[CXX1101] NDK ... did not have a source.properties file`

`[VERIFIED 2026-05-07]`

**Symptom (Gradle configuration phase):**

```
> Failed to apply plugin 'com.facebook.react.rootproject'.
   > A problem occurred configuring project ':app'.
      > [CXX1101] NDK at /Users/.../Library/Android/sdk/ndk/27.1.12297006
        did not have a source.properties file
```

The NDK directory exists at the expected version path but is empty or missing `source.properties`.

**Cause:** Android Studio's "Standard" setup wizard creates an empty NDK directory (a placeholder for "side-by-side NDK" entries the IDE has registered) without actually populating it. Gradle's CXX detection in `com.android.ndk.cxx` walks `ndk/` looking for valid installs and bails the moment it hits a partial install. Expo SDK 54's Android template pins `ndk: 27.1.12297006` (visible in the `[ExpoRootProject] Using the following versions:` block at build start) — that exact directory must be a complete install.

**Fix:** wipe the placeholder and reinstall via `sdkmanager` (which lands metadata files correctly):

```bash
rm -rf "$HOME/Library/Android/sdk/ndk/27.1.12297006"
yes | sdkmanager "ndk;27.1.12297006"
ls "$HOME/Library/Android/sdk/ndk/27.1.12297006/source.properties"   # verify
```

`sdkmanager` is on PATH after installing **Android SDK Command-line Tools (latest)** in SDK Manager → SDK Tools.

**Survives `expo prebuild`?** Yes — NDK is global, not per-project.

**Does this affect EAS?** No — EAS build hosts have NDKs preinstalled for all supported versions.

---

## Gotcha 9 — Android: `Unresolved reference 'CxxPart'` in unistyles autogen

`[VERIFIED 2026-05-07]`

**Symptom (Kotlin compile of `:react-native-unistyles:compileDebugKotlin`):**

```
e: .../react-native-unistyles/nitrogen/generated/android/kotlin/.../HybridNativePlatformSpec.kt:121:82
   Unresolved reference 'CxxPart'.
e: .../HybridNativePlatformSpec.kt:123:14 'initHybrid' overrides nothing.
e: .../HybridNativePlatformSpec.kt:125:3 'createCxxPart' overrides nothing.
```

iOS does NOT show this error even though the equivalent Swift autogen also references `CxxPart`.

**Cause:** `react-native-unistyles@3.2.4` was generated by `nitrogen` against `react-native-nitro-modules@0.35.5`. Our `package.json` had `"react-native-nitro-modules": "^0.33.5"`, which resolved to `0.33.9` — too old to provide the `CxxPart` class that the autogenerated bindings reference. iOS hides the mismatch via Swift's lenient cross-module name resolution; Android Kotlin fails fast.

**Fix:** bump in `apps/native-rd/package.json`:

```diff
- "react-native-nitro-modules": "^0.33.5",
+ "react-native-nitro-modules": "^0.35.6",
```

Then `bun install`. Other consumers (`@evolu/react-native` peer `>=0.31`, `react-native-quick-crypto` peer `>=0.29.1`) are satisfied by 0.35.6.

**Survives `expo prebuild`?** Yes (it's a JS-package version, not native-dir state).

**Does this affect EAS?** Yes — EAS reads the same `package.json`. The fix lands automatically once committed.

**General lesson:** when a transitive package (here: `react-native-unistyles`) ships **autogenerated native code** targeting a specific version of a dependency it declares as `*` peer, the version that actually gets installed must match what the autogen was compiled against, or Kotlin will reject it. iOS Swift is more forgiving and may build a binary that silently mismatches at runtime. Android catching this first is a feature, not a bug.

---

## Gotcha 10 — EAS Android: `bunx: command not found` in post-install hook

`[VERIFIED 2026-05-07]`

**Symptom (EAS cloud build, fails ~10s into POST_INSTALL_HOOK phase):**

```
$ cd ../.. && bunx turbo build --filter=native-rd^...
/usr/bin/bash: line 1: bunx: command not found
error: script "eas-build-post-install" exited with code 127
```

EAS dashboard shows `Status: ERRORED` with `errorCode: UNKNOWN_ERROR` and message _"Unknown error. See logs of the Post-install hook build phase for more information."_

**Cause:** EAS's Linux Android build worker is pinned to Bun **1.2.20**, which doesn't ship `bunx` as a separate binary on `PATH`. The macOS iOS workers run a more recent Bun that does. Since the same `eas-build-post-install` hook runs on both platforms, iOS silently passes and Android silently fails.

**Fix:** in `apps/native-rd/package.json`, replace `bunx` (separate binary) with `bun x` (subcommand of `bun`, available on every modern Bun version):

```diff
- "eas-build-post-install": "cd ../.. && bunx turbo build --filter=native-rd^...",
+ "eas-build-post-install": "cd ../.. && bun x turbo build --filter=native-rd^...",
```

Functionally identical; portable across Bun versions.

**Survives `expo prebuild`?** Yes — `package.json` is project-root config, not generated.

**Does this affect local builds?** No. Local Bun (≥1.2.x) has `bunx` symlinked in `~/.bun/bin`. The hook also doesn't run on local `bun run android` — only on `eas build`.

---

## Gotcha 11 — Simulator dev client shows "Failed to load app from http://&lt;lan-ip&gt;:8081"

`[VERIFIED 2026-05-11]`

**Symptom (iOS Simulator, fresh install of dev client from `bun run native:ios` or `bun run ios`):** Build + install succeed, app launches, but the dev launcher renders an error screen:

```
There was a problem loading the project.
This development build encountered the following error:
Failed to load app from http://192.168.178.129:8081/...
```

The IP shown matches the host Mac's primary LAN interface (`ifconfig en0 | grep "inet "`). Same `bun run ios` invocation may have auto-loaded the bundle weeks earlier without intervention.

**Cause:** Expo CLI's Metro bundler advertises a single hostname for its served URL, and recent CLI versions default to the host's primary LAN interface for that hostname even when the target is a simulator. The dev launcher embeds that URL and tries to fetch the bundle from it on first launch. iOS Simulator shares the host's network stack, so `localhost` always works — but the LAN IP often doesn't, depending on firewall, VPN, or interface state. When the LAN IP route fails, the dev client surfaces the error rather than falling back to `localhost`.

Likely triggered by a recent Expo CLI release changing the default URL resolution; the simulator detection that historically pinned localhost regressed.

**Fix:** export `REACT_NATIVE_PACKAGER_HOSTNAME=localhost` before invoking `expo run:ios` on simulator targets. The launcher script `scripts/run-ios.sh` does this on the simulator branch (when `IOS_DEVICE_ID` is empty); device builds continue to use the LAN IP so a paired iPhone can still reach Metro.

```bash
# Simulator path inside scripts/run-ios.sh
export REACT_NATIVE_PACKAGER_HOSTNAME="${REACT_NATIVE_PACKAGER_HOSTNAME:-localhost}"
exec npx expo run:ios --no-install "$@"
```

Equivalent fix for Android lives in `scripts/run-android.sh`: combine `adb reverse tcp:8081 tcp:8081` with `REACT_NATIVE_PACKAGER_HOSTNAME=localhost` so emulators _and_ USB-connected devices reach Metro at `localhost` without depending on the host's LAN IP.

If the simulator continues to show the stale URL after the fix, the dev launcher cached the old "recent project" entry. Shake → Go Home → Reload, or delete the app from the simulator and rebuild.

**Survives `expo prebuild`?** Yes — the fix lives in `scripts/run-ios.sh` / `scripts/run-android.sh`, not in `ios/` or `android/`.

**Does this affect EAS?** No. EAS preview/production builds embed the JS bundle at build time and don't talk to Metro. EAS development builds talk to Metro, but the URL is set by whoever runs `expo start` against them, not by the build itself.

---

## Standard recovery sequences

### Local iOS device build, fresh from scratch

`[VERIFIED 2026-05-02]`

```bash
cd apps/native-rd

# 1. Stop hung processes
pkill -f "expo run:ios" 2>/dev/null
pkill -f metro 2>/dev/null

# 2. Wipe build artifacts (no source changes)
rm -rf ios/Pods ios/Podfile.lock ios/build
rm -rf ~/Library/Developer/Xcode/DerivedData/nativerd-*

# 3. Refresh native project from app.json (assets, plugins)
npx expo prebuild --platform ios

# 4. Verify build-from-source flag survived
grep buildReactNativeFromSource ios/Podfile.properties.json   # should match (re-add if missing)

# 5. Reinstall pods (slow first time — building RN from source)
cd ios && pod install && cd ..

# 6. Build to device
IOS_DEVICE_ID="$(xcrun xctrace list devices 2>&1 | /usr/bin/grep -i narcissus | /usr/bin/grep -oE '\(00008[0-9A-F-]+\)' | tr -d '()')" \
  npx expo run:ios --no-install --device "$IOS_DEVICE_ID" 2>&1 | tee /tmp/native-rd-device-build.log
```

### Switching to a fresh EAS build — `[UNTESTED]`

```bash
cd apps/native-rd

git status                                          # eas.json requireCommit: true — clean tree required
git add -A && git commit -m "chore: prep eas build" # if needed
eas whoami                                          # confirm logged in
eas build --platform ios --profile development      # or preview / production
```

### Going back to a prior build state

`apps/native-rd/.gitignore` (line 18) ignores **both `ios/` and `android/`** — these are generated locally by `expo prebuild` and never committed. `git restore ios/` is therefore not a recovery path; it does nothing because there's no tracked content.

To undo a bad prebuild:

```bash
cd apps/native-rd
rm -rf ios                          # or rm -rf android
npx expo prebuild --platform ios    # or --platform android — regenerates from app.json

# RE-APPLY per-project edits BEFORE running any build:
#   iOS    : ios/Podfile.properties.json        (e.g. ios.buildReactNativeFromSource: true)
#   Android: echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties

# Then build normally — pods/gradle deps resolve on first invocation:
#   iOS    : cd ios && pod install && cd ..    (Podfile changed → must run pod install)
#   Android: bun run android                    (Gradle wrapper auto-resolves; no separate install step)
```

The "source of truth" for native config is `app.json` + Expo plugins. Anything in `ios/` or `android/` that wasn't generated from those (e.g. `Podfile.properties.json` flag for `buildReactNativeFromSource`, `android/local.properties`) is a developer-local override that must be re-applied after regeneration.

**Why iOS needs an explicit `pod install` and Android does not:** `expo prebuild` rewrites `Podfile` but doesn't run CocoaPods, so the next `xcodebuild` will fail with "Pods has not been installed". On Android the Gradle wrapper does dep resolution as part of the first build invocation — `./gradlew` standalone is not a pre-flight step worth running manually.

---

## Things that look scary but are not

`[VERIFIED 2026-05-02]`

- `[!] hermes-engine has added 1 script phase. Please inspect…` — the swap-Hermes-for-config script is benign.
- `Run script build phase '[CP-User] [Hermes] Replace Hermes for the right configuration, if needed' will be run during every build because it does not specify any outputs.` — same warning, cosmetic.
- `[!] React-Core-prebuilt has added 1 script phase` — only appears when the prebuilt path is active. With `buildReactNativeFromSource: true` correctly applied, this disappears (pod count is 105, not 100).
- `Calling pod install directly is deprecated in React Native …` — informational; calling `pod install` directly is still supported and is what `scripts/run-ios.sh` does intentionally.
- Verbose `Pods` warnings about missing iOS SDKs (`CoreAudioTypes`, `UIUtilities`, `SwiftUICore`) — **only blocking when accompanied by `Sealable` link error**. Otherwise cosmetic on Xcode 26.

---

## Quick reference: what gets edited where

| File                                               | Purpose                                                                               | Survives `expo prebuild` non-`--clean`? | Survives `--clean`?        |
| -------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------- | -------------------------- |
| `apps/native-rd/app.json`                          | Source of truth for icons, splash, plugins, deployment target, bundle/package IDs     | Read from                               | Read from                  |
| `apps/native-rd/eas.json`                          | EAS build/submit profile config                                                       | Yes (not under `ios/` or `android/`)    | Yes                        |
| `apps/native-rd/.env.local`                        | Per-developer env (`IOS_DEVICE_ID`, etc.). Gitignored                                 | Yes                                     | Yes                        |
| `apps/native-rd/scripts/run-ios.sh`                | Bash launcher; sources `.env.local`, calls `expo run:ios`, pins localhost on sim      | Yes                                     | Yes                        |
| `apps/native-rd/scripts/run-android.sh`            | Bash launcher; SDK detection, writes `local.properties`, `adb reverse`, localhost pin | Yes                                     | Yes                        |
| `apps/native-rd/ios/Podfile.properties.json`       | RN/Expo build flags, incl. `buildReactNativeFromSource`                               | Yes                                     | **NO** — re-add manually   |
| `apps/native-rd/ios/nativerd/Images.xcassets/`     | Generated iOS assets                                                                  | Regenerated from `app.json`             | Regenerated                |
| `apps/native-rd/ios/Podfile`                       | Generated; do not edit                                                                | Regenerated                             | Regenerated                |
| `apps/native-rd/android/`                          | Generated Android project. Gitignored                                                 | Regenerated                             | Regenerated                |
| `apps/native-rd/android/local.properties`          | Per-developer SDK location pointer (`sdk.dir=...`). Required for local Gradle builds  | Yes                                     | **NO** — re-write manually |
| `~/Library/Developer/Xcode/DerivedData/nativerd-*` | Xcode build cache                                                                     | n/a (outside repo)                      | n/a                        |
| `~/Library/Android/sdk/`                           | Android SDK + NDK + system images. Managed by Studio's SDK Manager + `sdkmanager`     | n/a (outside repo)                      | n/a                        |
| `~/.zshenv`                                        | Shell env vars for `ANDROID_HOME` etc. Chezmoi-managed (`chezmoi edit ~/.zshenv`)     | Yes                                     | Yes                        |

---

## Maintaining this skill

**This document is a starting point, not a finished reference.** Each build target labelled `[UNTESTED]` is a hypothesis until someone runs it. When you (or an agent) actually use this skill:

1. **Promote tags as evidence accrues.** `[UNTESTED]` → `[VERIFIED <today>]` after a real successful run. Add a one-line evidence note (what command, any non-obvious step). `[VERIFIED]` → `[BROKEN]` if it stops working — keep the old fix as context, add the new symptom.
2. **Add new Gotcha sections when you hit something new.** Format: symptom (with literal error text), cause (one paragraph), fix (commands), survives-prebuild status, EAS-impact note.
3. **Update the build matrix** at the top whenever a row's status changes.
4. **Bump the skill version** in frontmatter:
   - patch (`2.0.0` → `2.0.1`) for clarifications, tag updates, evidence notes
   - minor (`2.0.0` → `2.1.0`) for new sections (a new Gotcha, a new build target)
   - major (`2.0.0` → `3.0.0`) for restructure
5. **Don't let stale `[UNTESTED]` tags rot.** If a section is six months old and still `[UNTESTED]`, it probably should be — note that explicitly so we don't forget.

The whole point is to never go in blind twice. If you go in blind once and learn something, capture it here before the next session forgets.
