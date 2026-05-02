# iOS TestFlight Readiness

**Last verified:** 2026-05-02
**App name:** Rollercoaster.dev
**Status:** Preparing for first iOS TestFlight build; not ready for tester invites

## Latest Readiness Review

Reviewed 2026-05-02. Other than build/distribution prep, the app is broadly close enough for closed-beta preparation: `bun run type-check`, `bun run test:ci`, `bun run lint` (warnings only), and `bun run test:a11y:json` passed locally.

Remaining blockers before inviting testers:

- Complete EAS/TestFlight setup and submit a standalone build.
- Validate the standalone build on a physical iPhone, including camera, photo library, voice memo, persistence, badge creation/export, icon, and splash.
- Finish privacy/contact metadata and host the privacy policy publicly.
- Fix [#982](https://github.com/rollercoaster-dev/monorepo/issues/982): badge creation should surface signing key setup failures instead of remaining in loading state.
- Re-run required Maestro flows against a production-like install. The 2026-05-02 E2E attempt failed because the installed simulator app was a dev build without an embedded JS bundle (`No script URL provided`), so it does not prove an app-flow regression.

## Current Decisions

- App display name: `Rollercoaster.dev`
- iOS bundle identifier: `com.joe.rd.native-rd`
- Apple Developer Program: enrolled, confirmed 2026-05-02
- Distribution path: Expo EAS Build → App Store Connect → TestFlight
- First testing target: internal TestFlight testers, then external testers after beta review

## Progress Checklist

### App Identity

- [x] Create native app logo source at `assets/logo.svg`
- [x] Generate app icon assets from the RD logo
- [x] Set Expo app display name to `Rollercoaster.dev`
- [ ] Decide whether to keep iOS bundle ID as `com.joe.rd.native-rd`
- [x] Decide whether to keep Expo slug as `native-rd` — changed to `rollercoasterdev` during `eas init` on 2026-05-02
- [ ] Decide final App Store display name spelling and capitalization

### Apple Account

- [x] Apple Developer Program approval received
- [ ] App Store Connect access confirmed
- [ ] App Store Connect app record created
- [ ] Bundle ID registered or confirmed through EAS credentials setup
- [ ] Internal tester Apple IDs identified

### EAS Build Setup

- [ ] Install or confirm EAS CLI access
- [ ] Log in with `eas login`
- [ ] Run `eas init` for this Expo project
- [ ] Add `eas.json` with development and production profiles
- [ ] Let EAS manage iOS signing credentials
- [ ] Confirm build number/version strategy

### TestFlight Metadata

- [ ] Beta app description drafted
- [ ] What-to-test instructions drafted
- [ ] Feedback email selected
- [ ] Test contact information completed
- [ ] Export compliance questionnaire answered in App Store Connect
- [ ] Internal testing group created
- [ ] External testing group planned, if needed

### Privacy And Review Readiness

- [ ] Contact email added to `docs/launch/privacy-policy.md`
- [ ] Privacy policy hosted publicly
- [ ] App privacy details prepared for App Store Connect
- [ ] Permission copy reviewed for camera, photos, and microphone
- [ ] Encryption/export compliance reviewed for local crypto, secure storage, and badge signing

### Device Validation

- [ ] Production-like iOS build created
- [ ] Installed on a physical iPhone
- [ ] Camera evidence flow tested
- [ ] Photo library evidence flow tested
- [ ] Voice memo evidence flow tested
- [ ] Local database persistence tested across app restart
- [ ] Badge creation/export flow tested
- [ ] App icon and splash verified on device

## Commands

```bash
cd apps/native-rd
eas login
eas init
eas build:configure
eas build --platform ios --profile production
eas submit --platform ios --latest
```

## Notes

- Internal TestFlight testing is the quickest first target because external testing requires beta review.
- External TestFlight can support more testers, but the first external build for a version may require Apple review before distribution.
- TestFlight builds expire after 90 days.
- App Store review is separate from TestFlight beta review.

## References

- Expo: https://docs.expo.dev/tutorial/eas/ios-production-build/
- EAS Submit: https://docs.expo.dev/submit/introduction/
- Apple TestFlight overview: https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/
- Apple export compliance: https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance/
