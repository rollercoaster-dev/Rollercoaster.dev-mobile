# App Store Launch Plan

## Overview

Launch rollercoaster.dev (native-rd) on Apple App Store and Google Play Store as an individual developer. Migrate to UG (haftungsbeschränkt) if/when traction and monetization justify it.

## Decision Log

- **Business structure:** Einzelunternehmen (sole proprietor) for launch
- **Publisher name:** Joe Czarnecki (individual) — transfer to UG later if needed
- **Nonprofit (gUG):** Not now. Preserves monetization flexibility. Can add dual structure (gUG alongside UG) later for donations/grants.
- **Revenue model:** Free app at launch. Monetization TBD based on user data. Options kept open: freemium sync, institutional licensing, consulting.

## Phase 1: Pre-Launch (Now)

### Registration (~€160 total)

- [ ] **Gewerbeanmeldung** at local Gewerbeamt (~€20-60)
  - Register as app developer / software development
  - Triggers Finanzamt notification → receive Fragebogen zur steuerlichen Erfassung
  - Consider Kleinunternehmerregelung if revenue < €25,000/yr (no VAT)
- [ ] **Apple Developer Program** — Individual account (~€99/yr)
  - https://developer.apple.com/programs/enroll/
  - Two-factor authentication required
  - Apps listed under personal name
- [ ] **Google Play Console** — Personal account (~€25 one-time)
  - https://play.google.com/console/signup
  - Government ID verification required

### Google Play 14-Day Testing Requirement

New personal accounts must complete closed testing before production access:

- [ ] Create closed testing track in Play Console
- [ ] Recruit **12 testers** (must opt-in via Google Groups or email list)
- [ ] Testers must stay opted-in for **14 consecutive days**
- [ ] After 14 days, apply for production access in Play Console dashboard

**Start this immediately** — it's the longest lead-time item.

### Legal Documents

- [ ] **Privacy Policy** — See `docs/launch/privacy-policy.md`
  - Host at https://rollercoaster.dev/privacy (or similar)
  - Required by both Apple and Google before submission
- [ ] **Terms of Service** (optional but recommended)
  - Can be added post-launch

### App Store Assets

- [ ] **App icon** — 1024x1024 (Apple), 512x512 (Google)
- [ ] **Screenshots** — Apple requires per device class (iPhone 6.7", 6.5", 5.5"; iPad)
- [ ] **Google Play** — Min 2 screenshots, recommended 8, plus feature graphic (1024x500)
- [ ] **App description** — Short (80 char) and full description
- [ ] **Keywords/category** — Productivity or Education
- [ ] **Age rating** — Complete questionnaire on both platforms
- [ ] **App preview video** (optional, recommended)

## Phase 2: Technical Preparation

### Build Configuration

- [ ] Verify `bundleIdentifier` (iOS): `com.joe.rd.native-rd`
- [ ] Verify `package` (Android): `com.joe.rd.nativerd`
- [ ] Set version to `1.0.0` in `app.json`
- [ ] Configure EAS Build (`eas.json`) for production profiles
- [ ] Test production build on physical devices

### Platform Requirements

- [ ] **Android:** Confirm `targetSdkVersion >= 35`
- [ ] **iOS:** Add Privacy Manifest (`PrivacyInfo.xcprivacy`) if using required-reason APIs
- [ ] **Apple:** Complete App Privacy nutrition labels in App Store Connect
- [ ] **Google:** Complete Data Safety form in Play Console

### Permissions Audit

Current permissions (from `app.json`):

- Microphone — voice memo evidence
- Photo library — photo evidence
- Camera — photo capture evidence

All permissions have clear, user-facing justification. No background location, no contacts, no tracking.

## Phase 3: Submission

- [ ] Build with `eas build --platform all --profile production`
- [ ] Submit with `eas submit --platform ios` and `eas submit --platform android`
- [ ] Monitor review status (Apple: 1-3 days, Google: ~24 hours)

## Phase 4: Post-Launch

- [ ] Monitor crash reports and user feedback
- [ ] Iterate based on real usage data
- [ ] Evaluate monetization options based on traction

## Future: UG Migration (When Justified)

Triggers to consider forming UG (haftungsbeschränkt):

- Revenue exceeds hobby level
- Want "rollercoaster.dev" as publisher name
- Need liability protection for commercial activity
- Want to accept investment or hire

**Migration steps:**

1. Form UG via Musterprotokoll (~€400-700)
2. Transfer iOS app via App Store Connect (preserves ratings/reviews)
3. Transfer Android app via Play Console (preserves everything)
4. Google org account skips 12-tester requirement
5. Optionally add gUG alongside for donations/grant eligibility

## Cost Summary

### Launch (Year 1)

| Item                       | Cost          |
| -------------------------- | ------------- |
| Gewerbeanmeldung           | ~€40          |
| Apple Developer (annual)   | €99           |
| Google Play (one-time)     | €25           |
| EAS Build (free tier)      | €0            |
| Domain (rollercoaster.dev) | Already owned |
| **Total**                  | **~€165**     |

### If/When UG (additional)

| Item                             | Cost          |
| -------------------------------- | ------------- |
| UG formation (notary + register) | ~€400-700     |
| Steuerberater (annual)           | ~€1,000-2,500 |
| IHK membership (annual)          | ~€50-150      |
| Business bank account (annual)   | ~€120-360     |
