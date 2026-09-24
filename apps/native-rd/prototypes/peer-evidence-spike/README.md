# Peer evidence transfer: test on another machine

**Requirements update — 2026-09-23:** The [requirements workshop](../../vision/community-learning-and-peer-validation.md) governs product behavior. This experiment does not select a transport, authorize permanent peer copies of evidence, or establish access duration. A fully offline encounter is a strong preference to investigate. The product now includes scoped review, both voices, confirmed attribution, and recognition of partial progress; this harness does not implement that experience.

**Status:** Throwaway feasibility spike. As of 2026-09-21 the app builds, installs and runs the Bare runtime on a real Android phone and a real iPhone (see [Device run](#device-run--2026-09-21)). No phone-to-phone transfer has completed yet: the test Wi-Fi blocks client-to-client traffic. Pear is still a candidate, not a selected architecture.

**Purpose:** Find out whether two people together can transfer a selected credential, image and audio into the reviewer's own app, then return recognition over the same connection. This supports the [in-person learning vision](../../vision/community-learning-and-peer-validation.md) and continues the [Pear evaluation](../pear-p2p-evaluation.md).

## What is included

- A standalone Expo 56 / React Native 0.85.3 app with Bare Kit 0.15.5 and HyperDHT 6.34.0, plus a bun lockfile.
- Synthetic PNG/WAV evidence and pre-signed credential/endorsement fixtures. No personal evidence, private keys or production app data.
- A receiver that displays the transferred image and offers audio playback. Its return button sends the **pre-signed endorsement fixture**; it does not sign as the person using the phone.
- A desktop probe that runs the same backend in two Node processes.

This is a transport test. The mobile receiver compares against known fixture bytes; it is **not** a general OB3 verifier. Real on-device endorsement issuance and independent OB3 conformance testing remain separate work. The UI, pairing mechanism and local DHT arrangement are experimental.

## Evidence already collected

| Check                                                                      | Result on first Mac                                                                    |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| ES256 credential and endorsement signatures, issuer/key binding, target ID | Passed in the separate desktop harness, reusing the app's signer and DID encoding code |
| PNG + WAV transfer and evidence hashes                                     | Passed                                                                                 |
| Additional 10 MiB synthetic payload                                        | Passed on loopback; not a phone benchmark                                              |
| Altered evidence, altered signature, incomplete transfer                   | Rejected by the desktop harness                                                        |
| Same mobile backend in two Node processes using LAN addresses              | Passed; image/audio received and endorsement fixture returned                          |
| Android native build/install/run (Bare runtime, local DHT, invite)         | Passed on a Samsung Galaxy A16, Android 16                                             |
| iOS native build/install/run (Bare runtime)                                | Passed on an iPhone 17 Pro, iOS 27, after the UIScene fix below                        |
| Phone joins a phone or Mac over Wi-Fi                                      | **Blocked**: the test router isolates Wi-Fi clients; `PEER_NOT_FOUND` / timeout        |
| Image rendering and audio playback on receiving phone                      | **Not tested**                                                                         |
| Two phones with WAN unavailable                                            | **Not tested**                                                                         |
| Official OB3 validation of these endorsement fixtures                      | **Not tested**                                                                         |

[Desktop results](./desktop-results.json) describe the five-node loopback experiment. The initial simpler two-node attempt returned `PEER_NOT_FOUND`. The mobile candidate instead runs three local persistent DHT nodes and a serving endpoint on the hosting device; its counterpart joins that local network. It needs no external bootstrap in this configuration, but **this has not been proved on phones**.

### Independent re-check — 2026-09-21

Reproduced on a second Mac from a clean checkout using `bun install`, `bun run pack` and `bun run probe`: `bare-pack` produced the ios/android bundle and the probe finished `"ok":true`, transferring `fixture.png` and `tone.wav` and returning the endorsement fixture. Both fixture JWTs were also verified out-of-band with Node's own `crypto`: `ES256` signatures valid, credential typed `OpenBadgeCredential`, endorsement typed `EndorsementCredential`, and the endorsement subject matches the credential `jti`. Still desktop only; **no phone has run this**.

### Device run — 2026-09-21

Same Mac as the re-check, Xcode 27 / iOS 27 SDK, JDK 17, one Samsung Galaxy A16 (Android 16) and one iPhone 17 Pro (iOS 27), all on one Fritz!Box Wi-Fi.

- **Android:** `assembleRelease` (arm64-v8a, two workers) built in under three minutes; `adb install` and launch worked. Logcat showed `Bare transport ready`, then after **Host**: three local DHT nodes, the server, `PEER_SPIKE_INVITE` and “Ready for a peer on the same Wi-Fi”. Bare, HyperDHT and the worklet run on a real Android phone.
- **iOS:** `expo run:ios` failed with no provisioning profile (error 65); the direct `xcodebuild … -allowProvisioningUpdates` path in the iOS section worked and registered the App ID. The first build launched to a white screen and died after ~1 s with `SIGTRAP`. The crash report (pulled with `xcrun devicectl device copy from --domain-type systemCrashLogs`) put the main thread in UIKit's `___UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`: the iOS 27 SDK traps apps that have no `UIApplicationSceneManifest`, and the Expo 56 template still creates its window in `AppDelegate`. `plugins/with-ios-scene-lifecycle.js` now adds the manifest and a `SceneDelegate` during prebuild; with it the app launches and stays up. Attaching `lldb` hid the trap, so read the crash report rather than debugging live.
- **Pairing token on iOS:** pasting into the invitation field did not update the field's value in this run (pressing Connect then reported `Unexpected end of JSON input`). The `--payload-url` deep link below did deliver the token and started the join. `xcrun devicectl device pasteboard copy --type public.utf8-plain-text --file invite.txt` can still place text on the iPhone clipboard.
- **Network:** every join failed: Mac→Android and iPhone→Android `PEER_NOT_FOUND`, Android→Mac “connection timed out”. Diagnosis: with the Mac on Wi-Fi only, neither phone nor Mac could ping the other, and the Mac could not ping any other Wi-Fi client; the phone could ping the Mac only while the Mac was also on Ethernet. The router blocks Wi-Fi client ↔ Wi-Fi client traffic (on a Fritz!Box: WLAN → Sicherheit → “Die angezeigten aktiven WLAN-Geräte dürfen untereinander kommunizieren”). Verify with a plain `ping` between the two phones' addresses before blaming the transport.

Not yet shown: any phone receiving evidence, image/audio rendering, the endorsement round-trip, role reversal, or the WAN-off run.

## Prepare the other machine

Use a Mac for the iOS half, with Xcode, CocoaPods, Node, bun, JDK 17, and an Android SDK/NDK suitable for the repository's Expo 56 build. Follow the [native build playbook](../../../.claude/skills/native-rd-build/SKILL.md) for machine/device setup. Leave ample free startup-disk space for swap even if build output is external. Build one platform at a time; use two workers/jobs initially.

Connect an authorized Android phone and a trusted iPhone with Developer Mode enabled. Both phones must be on the same Wi-Fi, with client isolation disabled: before testing, `ping` one phone from the other (or from a laptop on the same Wi-Fi, not on Ethernet) and expect replies. USB is for installing/debugging; it must not carry the peer-transfer traffic. No Metro server is needed for the Release builds below.

Fetch the draft PR and copy the harness **outside the monorepo**, to keep its dependencies isolated:

```sh
gh pr checkout 674
mkdir -p ../peer-evidence-spike
cp -R apps/native-rd/prototypes/peer-evidence-spike/. ../peer-evidence-spike/
cd ../peer-evidence-spike
bun install
bun run pack
bun run probe
```

The probe should finish with `"ok":true` and `evidence received and endorsement fixture returned`. That checks the Node adaptation, not the Bare runtime. The copied app is separate from Rollercoaster: bundle/package ID `dev.rollercoaster.peerspike`.

Set your Apple development team before generating native projects (or select it in Xcode later):

```sh
export PEER_SPIKE_APPLE_TEAM_ID=YOUR_TEAM_ID
bun run prebuild
```

The script pins the native template to `expo-template-bare-minimum@56.0.36` (the first attempt accidentally picked the SDK 57 template) and pins the direct `expo-asset` dependency to SDK 56. `app.config.js` also applies `plugins/with-ios-scene-lifecycle.js`, which the iOS 27 SDK requires (see the device run above). Both were rebuilt and run on devices on 2026-09-21.

## Android: build and install first

Set `JAVA_HOME` to your JDK 17 installation and `ANDROID_HOME` to your SDK. Put `$ANDROID_HOME/platform-tools` on `PATH`. Use the SDK's existing licenses and install any missing platform/NDK versions reported by Gradle.

```sh
adb devices -l
cd android
./gradlew app:assembleRelease --max-workers=2 --no-parallel -PreactNativeArchitectures=arm64-v8a
cd ..
adb install -r android/app/build/outputs/apk/release/app-release.apk
adb shell am start -n dev.rollercoaster.peerspike/.MainActivity
```

The architecture flag is for ARM64 phones, including the connected Galaxy A16. Adapt it for another target. This is a local test build, not a Play Store release.

## iOS: build and install next

```sh
cd ios
pod install
cd ..
xcodebuild -workspace ios/PeerEvidenceSpike.xcworkspace \
  -scheme PeerEvidenceSpike -configuration Release \
  -destination 'generic/platform=iOS' \
  -derivedDataPath ./ios-derived -jobs 2 \
  -allowProvisioningUpdates build
xcrun devicectl list devices
xcrun devicectl device install app --device YOUR_IPHONE_UDID \
  ./ios-derived/Build/Products/Release-iphoneos/PeerEvidenceSpike.app
xcrun devicectl device process launch --device YOUR_IPHONE_UDID \
  dev.rollercoaster.peerspike
```

Xcode needs a signed-in development account with permission to provision the test app; `-allowProvisioningUpdates` lets `xcodebuild` register the App ID and create the profile, which `bun run ios` (`expo run:ios`) does not do on a fresh account. Allow the app's local-network prompt. If the app shows a white screen and exits within a second, pull the crash report with `xcrun devicectl device info files --device UDID --domain-type systemCrashLogs` and `… device copy from …`; an `EXC_BREAKPOINT` in `___UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption` means the scene-lifecycle plugin did not run. If installation/launch fails, capture the actual error; no mobile compatibility claim has been made yet.

## Run the encounter

1. On Android, tap **Host evidence on this device**. Wait for “Ready for a peer on the same Wi-Fi.”
2. Copy the invitation shown in the text field into the iPhone's invitation field; tap **Connect to invitation**. If pasting does not take on iOS, use the `--payload-url` launch below instead. Moving this small pairing token through the test computer is acceptable for this spike; do not transfer the evidence that way.
3. On the iPhone, verify that `fixture.png` appears as an image and **Play received test audio** plays the short tone. The receiver should say “Evidence received and matched the signed fixture.” Turn up playback volume if needed.
4. Tap **Return signed endorsement fixture**. Android should say “Returned endorsement fixture received intact.” This is fixture transport, not the reviewer's personal validation.
5. Force-close and reopen the test app on both phones, reverse the roles, and repeat. Restart between sessions; reconnect/session switching is not implemented.
6. Repeat on a LAN with **WAN/internet access disabled but Wi-Fi connectivity retained**, and disable cellular fallback on both phones. Do not infer offline success from an internet-connected run. Record the network setup; a guest network may block peers even when both have internet.
7. Interrupt a transfer or background an app. Record the result. No success should be shown for missing evidence; seamless resume is not implemented. Restart and retry if needed.

For pairing-token extraction while Android is hosting:

```sh
adb logcat -d -s ReactNativeJS:I '*:S'
```

Look for `PEER_SPIKE_INVITE` (Release logs do include it). Android can be driven without touching it: `adb shell uiautomator dump` lists the buttons by `content-desc` with bounds, and `adb shell input tap X Y` / `input text` press and type. Host and Connect can each be pressed once per process; force-stop and relaunch to retry. The iOS test app also supports launching with a URL-encoded token:

```sh
xcrun devicectl device process launch --device YOUR_IPHONE_UDID \
  --payload-url 'dev.rollercoaster.peerspike://join?invite=URL_ENCODED_INVITATION' \
  dev.rollercoaster.peerspike
```

The invitation contains a temporary endpoint/key, not evidence. The app logs `PEER_SPIKE_EVENT` for debugging. Logs contain synthetic fixture data; do not substitute personal evidence into this harness.

## Capture the result

Record the commit, package versions, phone models/OS versions, Wi-Fi/WAN conditions, roles, whether the image rendered and audio played, return-message result, and any native or permission errors. A screenshot and relevant logs are useful. Do not treat USB deployment, a Node pass, or a signature check alone as a successful in-person mobile review.

Next, if the transport works: test larger real media fixtures and interruption recovery; replace fixture comparisons with actual credential/issuer/evidence verification; create endorsements with the reviewer's device key; independently validate the OB3 output. Keep those separate from transport selection.

## Source and attribution

Derived from [Holepunch's bare-expo](https://github.com/holepunchto/bare-expo/tree/e025a901ed1d582aec4a9e0a9452f5b93e6c1620), with its Apache-2.0 license and notice retained. See also [Bare Kit](https://github.com/holepunchto/react-native-bare-kit) and [HyperDHT's isolated-network example](https://github.com/holepunchto/hyperdht/blob/main/examples/isolated-dht.mjs). Default public-DHT discovery requires reachable bootstrap infrastructure; “serverless” does not itself mean offline.
