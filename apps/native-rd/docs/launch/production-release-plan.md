# Production Release Plan

**Status:** Active planning  
**Last updated:** 2026-05-17  
**Scope:** `native-rd` iOS + Android public launch  
**Related:** GitHub issue #90, `docs/release.md`, `docs/launch/app-store-launch-plan.md`

## Current State

The app is in beta, not production.

| Platform | Current channel           | Current goal                         |
| -------- | ------------------------- | ------------------------------------ |
| iOS      | TestFlight                | Continue beta testing and fix issues |
| Android  | Google Play internal test | Continue beta testing and fix issues |

The repository currently has release automation that is ahead of the store
state: `build-production.yml` can submit Android to Play production, but the
real launch path is still beta testing first. Issue #90 tracks correcting that
pipeline so TestFlight and Play testing tracks are first-class targets and
production cannot fire accidentally.

## Release Principles

- Treat TestFlight and Android Play testing as the release-candidate proving
  ground.
- Do not automate production submission until both stores are ready and the
  pipeline has a production gate.
- Keep Play Console and App Store Connect as the source of truth for final
  review and launch actions.
- Prefer manual production release for the first public launch; automate only
  after the first release proves the process.
- Do not add features after a build is marked as a release candidate.

## Phase 1: Stabilize Beta

Goal: get one build on each platform that can become the release candidate.

For each beta build, record:

- app version and native build number
- Git commit or tag
- platform and store channel
- tester count
- change summary
- known issues
- Sentry top crash signatures
- whether the build is a release candidate

Minimum beta gate:

- [ ] iOS TestFlight build installs and updates cleanly.
- [ ] Android internal testing build installs and updates cleanly.
- [ ] Onboarding works.
- [ ] Goal creation, editing, and completion work.
- [ ] Evidence capture works for text, photo, file, audio, and video where
      currently supported.
- [ ] Badge creation/export works.
- [ ] Settings and accessibility theme switching work.
- [ ] No known P0/P1 issues remain.
- [ ] Sentry receives iOS events from TestFlight.
- [ ] Android crash/error delivery is verified from a production-like Play
      testing build.

## Phase 2: Correct the Pipeline

Goal: make the automation match the current store reality.

Tracked by issue #90.

Required changes:

- [ ] Add or repurpose store-testing EAS profiles for TestFlight and Play
      testing.
- [ ] Android store-testing builds use AAB, not APK.
- [ ] Android internal testing submit targets the Play `internal` track.
- [ ] If/when moving from internal testing to formal closed testing, Android
      submit targets the real Play closed track (`alpha` or `beta`, matching
      Play Console).
- [ ] `build-internal.yml` no longer submits EAS internal-distribution artifacts
      to stores.
- [ ] `build-production.yml` cannot submit Android to production until public
      launch is intentionally enabled.
- [ ] `docs/release.md` describes the current beta and production workflows.

Current Android internal-testing submit profile:

```json
"play-internal": {
  "extends": "preview"
}
```

The profile extends `preview` because `preview.submit.android` already contains
the Google Play `internal` track config. The separate name keeps the workflow
readable without duplicating submit settings.

Do not submit to `alpha` or `beta` until the app is intentionally moved to a
formal closed testing track in Play Console.

## Phase 3: Store Readiness

### iOS

- [ ] App Store metadata is complete.
- [ ] Screenshots are current and match the app.
- [ ] Privacy nutrition labels match shipped behavior, including Sentry crash
      reporting.
- [x] Privacy policy URL is live — https://rollercoaster.dev/privacy.
- [ ] Support URL is live.
- [ ] Age rating is complete.
- [ ] Export compliance is set.
- [ ] External TestFlight group is configured.
- [ ] Final TestFlight build has completed external beta review if required.
- [ ] Final build is selected on the App Store version page.

### Android

- [ ] Store listing is complete.
- [ ] Screenshots are current and match the app.
- [ ] Data safety form matches shipped behavior, including Sentry crash
      reporting.
- [x] Privacy policy URL is live — https://rollercoaster.dev/privacy.
- [ ] Content rating is complete.
- [ ] Target audience / families declarations are complete.
- [ ] Internal testing track has the intended tester list.
- [ ] Internal testing opt-in link has been shared with testers.
- [ ] If moving to formal closed testing before production, the closed testing
      track has the intended tester list or Google Group.
- [ ] If the Play account requires it, at least 12 testers have been opted in
      for 14 continuous days before applying for production access.
- [ ] Production access has been granted if Play Console requires it.

## Phase 4: Release Candidate

Goal: select one iOS build and one Android build as the public-launch candidate.

RC rules:

- No feature work after RC.
- Only release-blocking fixes may enter a new RC.
- Each new RC resets the smoke test checklist.

RC checklist:

- [ ] iOS RC build identified.
- [ ] Android RC build identified.
- [ ] Both builds use the same app version.
- [ ] Android version code is higher than every previous Android upload.
- [ ] iOS build number is higher than every previous iOS upload for that app
      version.
- [ ] Sentry release/build data is visible for both platforms.
- [ ] Top crash signatures from the prior beta build are triaged.
- [ ] Privacy verification has been run if Sentry config or telemetry behavior
      changed.
- [ ] Known issues list is empty or explicitly accepted for launch.

## Phase 5: Public Launch

### iOS Launch

1. In App Store Connect, select the final build for the app version.
2. Add the app version to a draft submission.
3. Submit for App Review.
4. Use manual release or phased release for the first launch.
5. After approval, release manually when ready.

### Android Launch

1. Confirm Play testing requirements are satisfied.
2. Apply for production access if Play Console requires it.
3. After production access is granted, create the first production release
   manually in Play Console.
4. Prefer staged rollout if available.
5. Keep GitHub Actions production auto-submit disabled until this manual launch
   succeeds.

## Launch Monitoring

For the first 48 hours after public launch:

- Check Sentry at least daily.
- Track every P0/P1 crash as a GitHub issue.
- Do not merge feature work into a hotfix branch.
- Prefer fix-forward releases; store rollback options are limited.

Launch is considered complete when:

- [ ] iOS is live on the App Store.
- [ ] Android is live on Google Play production.
- [ ] No unresolved P0/P1 launch issues remain after 48 hours.
- [ ] `docs/release.md` has been updated with first-run evidence.
- [ ] Issue #90 is closed or replaced with post-launch automation follow-ups.
