# Issue #686 — sheet accessibility contract, native verification

Issue: https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/686 (UI-03, epic #683)

Mode: feature. Base: `0b20541ed0d407194532f40a2a4bab26008092cd`.

Tested app source: `cae4617e` (branch `codex/issue-686`). The later commit that gates the flow's negative checks to iOS and adds the Android reopen step changes only `e2e/flows/sheet-isolation.yaml`; both platforms were re-run with that final flow.

## Environment

- **iOS:** disposable `rd-verify-686` iPhone 17 simulator, iOS 26.5, `ACA2BEF9-18E8-4BA4-95FF-B9D84CF0BB45`, app `dev.rollercoaster.app`. Built with `IOS_DEVICE_ID= CI=1 bun run ios:e2e --device <udid>`: Xcode **Build Succeeded**.
- **Android:** `Pixel_8_API_36` emulator, app `dev.rollercoaster.app.dev`, built with `CI=1 bun run android:e2e --no-bundler`: Gradle **BUILD SUCCESSFUL**. The emulator's existing `dev.rollercoaster.app` install was left untouched.
- **Metro:** `EXPO_PUBLIC_E2E_MODE=true npx expo start --port 8098`. The process's cwd was confirmed to be this worktree. Port 8081 belonged to another project's Metro, which was not touched. The iOS simulator was pointed at 8098 with `defaults write dev.rollercoaster.app RCT_jsLocation localhost:8098`; on Android, `adb reverse tcp:8081 tcp:8098`. Scratch copies of the flow and prologue had their `METRO_PORT` default set to 8098. A flow-level default beats `maestro -e`, and the subflow's own default beats the value passed in.
- **Common settings:** English, Still Water theme (the prologue default), default OS text size.

## How isolation is observed

- **iOS:** Maestro reads the XCUITest accessibility tree. `assertNotVisible` on a control that is still painted on screen passes only when the control is hidden from VoiceOver.
- **Android:** Maestro's UiAutomator tree also includes views that are not important for accessibility. It marks them `important-for-accessibility=false`, which is the flag TalkBack honors. `assertNotVisible` therefore cannot detect TalkBack hiding. Android evidence is that attribute, read from `maestro hierarchy` at each state ([probes](android-importance-probes.txt)).

## Results

| Criterion and state                              | Expected                                                          | Observed                                                                                                        | Verdict     | Evidence                                                |
| ------------------------------------------------ | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------- |
| Focus › evidence-plan sheet open                 | Body, header back, and tab bar leave the a11y tree; sheet × stays | iOS: `tab-GoalsTab`, `focus-current-task-add-text`, "Go back" not in tree. Android: those = false, close = true | Verified    | [iOS JUnit](ios-junit.xml), probe A1                    |
| Focus › plan sheet closed (×)                    | Everything back                                                   | iOS: visible again. Android: all true                                                                           | Verified    | iOS JUnit, probe A2                                     |
| Focus › capture sheet open ("Add more evidence") | Same isolation                                                    | iOS: tab bar, Mark complete, "Go back" not in tree. Android: false; `capture-sheet-close` true                  | Verified    | iOS JUnit, probe B1                                     |
| Focus › capture sheet closed (×)                 | Everything back                                                   | iOS + Android restored                                                                                          | Verified    | iOS JUnit, probe B2                                     |
| Badge detail › share sheet from CTA              | Hero ⋯, Share CTA, tab bar hidden; share rows reachable           | iOS: hidden while still painted ([screenshot](ios-share-sheet-open.png) + hierarchy). Android: false; rows true | Verified    | iOS JUnit, probe C1                                     |
| Badge detail › share sheet closed                | Everything back                                                   | iOS + Android restored                                                                                          | Verified    | iOS JUnit, probe C2                                     |
| Badge detail › ⋯ › Share badge                   | Same isolation                                                    | iOS: flow step 4. Android: probe C3 ([screenshot](android-share-sheet-overflow-open.png))                       | Verified    | iOS JUnit, probe C3                                     |
| Tab switch with share sheet left open            | Goals tab's own tab bar and cockpit reachable                     | iOS: flow step 5. Android: `tab-BadgesTab`/`tab-GoalsTab`/cockpit = true                                        | Verified    | iOS JUnit, [Android JUnit](android-junit.xml), probe D1 |
| Focus returns to the opening control on close    | VoiceOver/TalkBack focus lands on trigger                         | Not observable through Maestro; covered by Jest only                                                            | Not checked | Needs a device with VoiceOver and TalkBack              |
| Screen reader cannot swipe into background       | Actual VoiceOver/TalkBack traversal                               | Tree evidence above; no screen reader was run                                                                   | Not checked | Needs a device with VoiceOver and TalkBack              |
| Other themes, large OS text, physical devices    | —                                                                 | Not exercised                                                                                                   | Not checked | —                                                       |

## Verdict

The accessibility-tree isolation is **verified on the named iOS simulator and Android emulator**, for every sheet and opener listed above. Focus restoration and real VoiceOver/TalkBack traversal are **not checked**. They need a physical pass with assistive technology (plan follow-up F3).

## Notes for the next native run

- If another project's Metro holds 8081, the dev client attaches to it at launch, even with the deep link. The result is a red "React Native version mismatch" (JS 0.86.3 vs native 0.85.3). Use the `RCT_jsLocation` default (iOS) or `adb reverse` (Android) above.
- `bun run start:worktree` fails: `npx expo start` no longer accepts `--no-dev-tools`.
- Set `EXDevMenuShowsAtLaunch` / `EXDevMenuShowFloatingActionButton` to NO on iOS when running a flow without `scripts/run-e2e.sh`. On Android, the dev client's floating gear returns after every `pm clear` and covers the badge hero's ⋯ button.
