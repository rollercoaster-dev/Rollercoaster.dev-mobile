# Peer evidence transfer: test on another machine

**Status:** Throwaway feasibility spike. Native builds were stopped at the user's request because the first Mac was running out of memory and startup-disk space. Neither phone ran this app. Pear is still a candidate, not a selected architecture.

**Purpose:** Find out whether two people together can transfer a selected credential, image and audio into the reviewer's own app, then return recognition over the same connection. This supports the [in-person learning vision](../../vision/community-learning-and-peer-validation.md) and continues the [Pear evaluation](../pear-p2p-evaluation.md).

## What is included

- A standalone Expo 56 / React Native 0.85.3 app with Bare Kit 0.15.5 and HyperDHT 6.34.0, plus an npm lockfile.
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
| Android and iOS native build/install/run                                   | **Not completed**                                                                      |
| Image rendering and audio playback on receiving phone                      | **Not tested**                                                                         |
| Two phones with WAN unavailable                                            | **Not tested**                                                                         |
| Official OB3 validation of these endorsement fixtures                      | **Not tested**                                                                         |

[Desktop results](./desktop-results.json) describe the five-node loopback experiment. The initial simpler two-node attempt returned `PEER_NOT_FOUND`. The mobile candidate instead runs three local persistent DHT nodes and a serving endpoint on the hosting device; its counterpart joins that local network. It needs no external bootstrap in this configuration, but **this has not been proved on phones**.

## Prepare the other machine

Use a Mac for the iOS half, with Xcode, CocoaPods, Node/npm, JDK 17, and an Android SDK/NDK suitable for the repository's Expo 56 build. Follow the [native build playbook](../../../.claude/skills/native-rd-build/SKILL.md) for machine/device setup. Leave ample free startup-disk space for swap even if build output is external. Build one platform at a time; use two workers/jobs initially.

Connect an authorized Android phone and a trusted iPhone with Developer Mode enabled. Both phones must be on the same Wi-Fi, with client isolation disabled. USB is for installing/debugging; it must not carry the peer-transfer traffic. No Metro server is needed for the Release builds below.

Fetch the draft PR and copy the harness **outside the monorepo**, to keep its dependencies isolated:

```sh
gh pr checkout 674
mkdir -p ../peer-evidence-spike
cp -R apps/native-rd/docs/research/peer-evidence-spike/. ../peer-evidence-spike/
cd ../peer-evidence-spike
npm ci
npm run pack
npm run probe
```

The probe should finish with `"ok":true` and `evidence received and endorsement fixture returned`. That checks the Node adaptation, not the Bare runtime. The copied app is separate from Rollercoaster: bundle/package ID `dev.rollercoaster.peerspike`.

Set your Apple development team before generating native projects (or select it in Xcode later):

```sh
export PEER_SPIKE_APPLE_TEAM_ID=YOUR_TEAM_ID
npm run prebuild
```

The script pins the native template to `expo-template-bare-minimum@56.0.36`. The first attempt accidentally picked the then-current SDK 57 template; the handoff corrects that and pins the direct `expo-asset` dependency to SDK 56. **Those setup corrections have not been rebuilt on this Mac.**

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

Xcode needs a signed-in development account with permission to provision the test app. Allow the app's local-network prompt. If installation/launch fails, capture the actual error; no mobile compatibility claim has been made yet.

## Run the encounter

1. On Android, tap **Host evidence on this device**. Wait for “Ready for a peer on the same Wi-Fi.”
2. Copy the invitation shown in the text field into the iPhone's invitation field; tap **Connect to invitation**. Moving this small pairing token through the test computer is acceptable for this spike; do not transfer the evidence that way.
3. On the iPhone, verify that `fixture.png` appears as an image and **Play received test audio** plays the short tone. The receiver should say “Evidence received and matched the signed fixture.” Turn up playback volume if needed.
4. Tap **Return signed endorsement fixture**. Android should say “Returned endorsement fixture received intact.” This is fixture transport, not the reviewer's personal validation.
5. Force-close and reopen the test app on both phones, reverse the roles, and repeat. Restart between sessions; reconnect/session switching is not implemented.
6. Repeat on a LAN with **WAN/internet access disabled but Wi-Fi connectivity retained**, and disable cellular fallback on both phones. Do not infer offline success from an internet-connected run. Record the network setup; a guest network may block peers even when both have internet.
7. Interrupt a transfer or background an app. Record the result. No success should be shown for missing evidence; seamless resume is not implemented. Restart and retry if needed.

For pairing-token extraction while Android is hosting:

```sh
adb logcat -d -s ReactNativeJS:I '*:S'
```

Look for `PEER_SPIKE_INVITE`. If Release logs omit it, use the displayed invitation field. The iOS test app also supports launching with a URL-encoded token:

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
