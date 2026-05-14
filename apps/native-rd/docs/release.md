# Release Runbook

**Last verified:** 2026-05-14

## Pipeline at a glance

| Track      | Trigger                                                                  | Workflow               | EAS profile  | Destination                         |
| ---------- | ------------------------------------------------------------------------ | ---------------------- | ------------ | ----------------------------------- |
| Internal   | Manual: Actions → `build-internal` → "Run workflow"                      | `build-internal.yml`   | `preview`    | TestFlight internal + Play internal |
| Production | GitHub Release published (release-please PR merge, or manual UI publish) | `build-production.yml` | `production` | TestFlight ext + Play prod (10%)    |
| Production | Manual: Actions → `build-production` → "Run workflow" with `ref` input   | `build-production.yml` | `production` | TestFlight ext + Play prod (10%)    |

Both build workflows are deliberately click-only — no auto-build on push to
`main`. release-please runs on every push to `main` to keep the release PR up
to date, but it never builds anything itself; it just opens/updates a PR and,
when merged, publishes a GitHub Release.

## Cutting an internal build (for testing / dogfood)

1. Go to **Actions → build-internal → "Run workflow"**.
2. Pick the ref you want to build. Defaults to `main`; can also be a feature
   branch or a specific commit.
3. Click **Run workflow**.
4. Watch validate → EAS build → submit. The job streams an EAS dashboard
   link. On success the build appears in TestFlight internal and Play
   internal track.

## Cutting a production release

1. Wait for release-please to open or update the "chore(main): release
   native-rd X.Y.Z" PR.
   - It's based on conventional-commit prefixes since the last tag:
     `feat:` → minor, `fix:` → patch, `BREAKING CHANGE:` → major.
   - If the PR isn't there, no qualifying commits have landed.
2. Review the PR. The diff bumps `apps/native-rd/package.json`,
   `apps/native-rd/app.json` (`expo.version`), and `apps/native-rd/CHANGELOG.md`.
3. Merge the PR. release-please pushes the `vX.Y.Z` tag **and publishes a
   GitHub Release**.
4. `build-production` workflow fires automatically on the published Release.
   Watch it in Actions.
5. After EAS finishes:
   - iOS: build appears in App Store Connect → TestFlight. External testers
     get it automatically (if the build is in a beta group with
     auto-distribution). The App Store release still requires manual
     "Submit for Review" + phased release in ASC.
   - Android: build appears in Play Console → Production at 10% rollout.
     Watch Sentry for 24–48h, then advance via `npx eas-cli submit:rollout`
     or directly in Play Console.

If you need to re-run a production build against an existing tag (e.g.,
because EAS failed transiently), use **Actions → build-production → "Run
workflow"** and supply the tag (e.g., `v0.1.4`) as the `ref` input.

## Advancing the Android rollout

EAS CLI doesn't expose a rollout subcommand — rollout management happens
in Play Console (or via the Google Play Developer API). Two supported paths:

1. **Play Console (recommended for ad-hoc advancement):**
   Release management → Production → open the active release → "Edit release" →
   adjust the staged rollout percentage → review → start rollout.
2. **Fastlane `supply` (if you want it scripted):**
   ```bash
   bundle exec fastlane supply \
     --track production \
     --rollout 0.5 \
     --skip_upload_apk \
     --skip_upload_aab \
     --skip_upload_metadata \
     --skip_upload_changelogs \
     --skip_upload_images \
     --skip_upload_screenshots
   ```
   Requires a Play Console service account JSON locally (do **not** commit it).

## Rolling back

- **Android:** Play Console → Production → halt rollout (keeps current users
  on the halted version; new installs continue to get the previous version).
  Then ship a fixed `v*.*.*` ASAP — Play doesn't allow shipping a lower
  versionCode.
- **iOS:** App Store Connect → "Remove from sale" only blocks new downloads;
  existing installs are unaffected. Ship a fixed `v*.*.*` and request
  expedited review if critical.

## Required secrets

See `docs/research/release-pipeline.md` § Secrets. All are stored as GitHub
repo secrets:

- `EXPO_TOKEN`
- `SENTRY_AUTH_TOKEN`
- `APPLE_ASC_KEY_ID`
- `APPLE_ASC_ISSUER_ID`
- `APPLE_ASC_KEY_P8`
- `ANDROID_PLAY_SERVICE_ACCOUNT_JSON`

## Failure modes

- **EAS build fails:** check the EAS dashboard link in the workflow log.
  Most failures are JS/native compile errors that reproduce locally with
  `npx expo run:ios --configuration Release`.
- **iOS submit fails with "no API key":** `APPLE_ASC_KEY_P8` secret is
  malformed (missing `-----BEGIN`/`-----END` lines).
- **Android submit fails with "no service account":**
  `ANDROID_PLAY_SERVICE_ACCOUNT_JSON` secret is malformed (not valid JSON).
- **Sentry finalize fails:** the build still shipped; finalize is
  metadata-only. Run `npx @sentry/cli releases finalize <version>` manually.
