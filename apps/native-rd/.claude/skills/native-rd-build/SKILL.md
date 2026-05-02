---
name: native-rd-build
description: Build native-rd for any target — local iOS simulator/device, local Release builds, EAS development/preview/production, Android (when generated). Use when the user hits a build failure, asks how to produce a build of any kind, needs to diagnose runtime errors that look build-related ("No script URL provided", missing assets, signing issues), or wants to understand what `eas.json` / `app.json` / `Podfile.properties.json` settings actually do. Also use as a pre-flight checklist before starting a fresh build.
metadata:
  author: rollercoaster.dev
  version: "2.2.0"
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

| Target                         | Local command                                              | EAS profile                                              | Status                                                                                            |
| ------------------------------ | ---------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| iOS Simulator (dev client)     | `bun run ios` (with `IOS_DEVICE_ID` empty)                 | `eas build -p ios --profile development`                 | `[VERIFIED 2026-05-02]` local sim + EAS development profile (cloud build)                         |
| iOS Device (dev client)        | `bun run ios` (or `IOS_DEVICE_ID=… bun run ios:device`)    | `eas build -p ios --profile development` (then sideload) | `[VERIFIED 2026-05-02]` local device                                                              |
| iOS Release (local sim)        | `npx expo run:ios --configuration Release`                 | n/a                                                      | `[VERIFIED 2026-05-02]` per `docs/plans/2026-05-02-expo-doctor-build-validation.md`               |
| iOS Release (local device)     | `npx expo run:ios --configuration Release --device <udid>` | n/a                                                      | `[UNTESTED]`                                                                                      |
| iOS preview build (signed IPA) | n/a                                                        | `eas build -p ios --profile preview`                     | `[UNTESTED]`                                                                                      |
| iOS production build           | n/a                                                        | `eas build -p ios --profile production`                  | `[UNTESTED]`                                                                                      |
| iOS App Store submit           | n/a                                                        | `eas submit -p ios --profile production`                 | `[BROKEN]` `ascAppId` placeholder in `eas.json`                                                   |
| Android Emulator (dev client)  | `bun run android`                                          | `eas build -p android --profile development`             | `[BROKEN]` no `android/` directory generated                                                      |
| Android Device (dev client)    | `bun run android --device`                                 | same                                                     | `[BROKEN]` same                                                                                   |
| Android preview APK            | n/a                                                        | `eas build -p android --profile preview`                 | `[UNTESTED]`                                                                                      |
| Android production AAB         | n/a                                                        | `eas build -p android --profile production`              | `[UNTESTED]`                                                                                      |
| Android Play Store submit      | n/a                                                        | `eas submit -p android --profile production`             | `[BROKEN]` `play-service-account.json` not committed (rightfully so — needs developer-local copy) |

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

`bun run ios` calls `scripts/run-ios.sh`, which sources `.env.local` (gitignored, per-developer) and dispatches to either `npx expo run:ios --device <udid>` or `npx expo run:ios` depending on whether `IOS_DEVICE_ID` is set.

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

See gotchas: 1, 2, 3, 4 below.

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

## Local Android — `[BROKEN]`

`[BROKEN]` as of 2026-05-02 — no `apps/native-rd/android/` directory exists. `bun run android` will fail with a missing-project error.

To generate the Android project:

```bash
cd apps/native-rd
npx expo prebuild --platform android      # generates android/ from app.json
bun run android                           # then this should work
```

`[UNTESTED]` after generation. We have not validated:

- whether `expo prebuild --platform android` produces a working project for our plugin set
- whether emulator / physical device flows work
- whether new architecture + Hermes works on Android (`newArchEnabled: true` in `app.json` applies to both platforms)

When you do generate the Android project, expect a similar pod-equivalent build sequence (Gradle + JVM), and look out for analogous prebuilt-RN issues to iOS Gotcha 1.

**If you regenerate Android, document what you find** — promote this section to `[VERIFIED]`.

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
- **Android:** download a Google Play service-account JSON (Play Console → API access), save as `apps/native-rd/play-service-account.json` (gitignored — verify before committing). The `serviceAccountKeyPath` in `eas.json` is a relative path from the app dir.

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

If `expo prebuild` produced bad output and you want to undo:

```bash
git status ios/                # see what changed
git restore ios/               # if everything in ios/ is regenerated and you want to revert
# rerun prebuild after fixing the underlying issue (app.json, plugin versions)
```

`ios/` is committed to the repo (this is intentional per `scripts/run-ios.sh` — see comments in that script). You can always restore from git.

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

| File                                               | Purpose                                                                           | Survives `expo prebuild` non-`--clean`? | Survives `--clean`?      |
| -------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------- | ------------------------ |
| `apps/native-rd/app.json`                          | Source of truth for icons, splash, plugins, deployment target, bundle/package IDs | Read from                               | Read from                |
| `apps/native-rd/eas.json`                          | EAS build/submit profile config                                                   | Yes (not under `ios/` or `android/`)    | Yes                      |
| `apps/native-rd/.env.local`                        | Per-developer env (`IOS_DEVICE_ID`, etc.). Gitignored                             | Yes                                     | Yes                      |
| `apps/native-rd/scripts/run-ios.sh`                | Bash launcher; sources `.env.local`, calls `expo run:ios`                         | Yes                                     | Yes                      |
| `apps/native-rd/ios/Podfile.properties.json`       | RN/Expo build flags, incl. `buildReactNativeFromSource`                           | Yes                                     | **NO** — re-add manually |
| `apps/native-rd/ios/nativerd/Images.xcassets/`     | Generated iOS assets                                                              | Regenerated from `app.json`             | Regenerated              |
| `apps/native-rd/ios/Podfile`                       | Generated; do not edit                                                            | Regenerated                             | Regenerated              |
| `apps/native-rd/android/`                          | Generated Android project (currently doesn't exist)                               | Regenerated                             | Regenerated              |
| `~/Library/Developer/Xcode/DerivedData/nativerd-*` | Xcode build cache                                                                 | n/a (outside repo)                      | n/a                      |

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
