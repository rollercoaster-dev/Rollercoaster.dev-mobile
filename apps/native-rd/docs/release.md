# Release Runbook

**Last verified:** 2026-06-04

## Pipeline at a glance

| Track                 | Trigger                                                                  | Workflow                  | EAS build profile | EAS submit profile | Destination                    |
| --------------------- | ------------------------------------------------------------------------ | ------------------------- | ----------------- | ------------------ | ------------------------------ |
| Direct install        | Manual: Actions → `build-internal` → "Run workflow"                      | `build-internal.yml`      | `preview`         | `preview`          | EAS internal distribution      |
| Play internal testing | Manual: Actions → `build-play-internal` → "Run workflow"                 | `build-play-internal.yml` | `production`      | `play-internal`    | Google Play internal test      |
| Production            | GitHub Release published (release-please PR merge, or manual UI publish) | `build-production.yml`    | `production`      | `production`       | TestFlight ext + Play prod 10% |
| Production            | Manual: Actions → `build-production` → "Run workflow" with `ref` input   | `build-production.yml`    | `production`      | `production`       | TestFlight ext + Play prod 10% |

Both build workflows are deliberately click-only — no auto-build on push to
`main`. release-please runs on every push to `main` to keep the release PR up
to date, but it never builds anything itself; it just opens/updates a PR and,
when merged, publishes a GitHub Release.

## Cutting a direct-install build

1. Go to **Actions → build-internal → "Run workflow"**.
2. Pick the ref you want to build. Defaults to the branch selected in GitHub's
   "Use workflow from" dropdown; can also be `main`, a feature branch, or a
   specific commit.
3. Pick `platform`: `all`, `ios`, or `android`. Use a single platform when
   smoke-testing one credential path.
4. Click **Run workflow**.
5. Watch release validate → per-platform EAS build → per-platform submit.

Use this workflow for EAS internal distribution / direct-install testing. Do not
use the Android preview artifact for Play Store testing: `preview` builds Android
as an APK and uses EAS internal distribution.

## Cutting an Android Play internal test build

Use this for the current Android tester channel in Play Console:
**Interner Test** / Google Play internal testing.

1. Merge the workflow/config changes to the branch you want to build.
2. Go to **Actions → build-play-internal → "Run workflow"**.
3. Pick the ref you want to build. Leave blank to use the selected branch, or
   enter `main`, a release branch, a tag, or a commit SHA.
4. Click **Run workflow**.
5. The workflow runs release validation, builds a fresh Android store AAB with
   EAS `production`, then submits that exact build with submit profile
   `play-internal`.
6. On success, the build appears in Play Console → Testing → Internal testing.

Why this workflow exists:

- Google Play version codes are single-use once uploaded anywhere in Play
  Console.
- Re-submitting the same EAS build can fail with
  `Version code has already been used`.
- This workflow always creates a fresh Android store build first, so EAS remote
  auto-increment assigns the next version code before submit.
- It targets Play `internal`, matching the current tester channel. Do not use
  `alpha` / `beta` until the app is intentionally moved to a formal closed
  testing track.

## Cutting a production release

1. Wait for release-please to open or update the "chore(main): release
   native-rd X.Y.Z" PR.
   - It's based on conventional-commit prefixes since the last tag:
     `feat:` → minor, `fix:` → patch, `BREAKING CHANGE:` → major.
   - If the PR isn't there, no qualifying commits have landed.
2. Review the PR. The diff bumps `apps/native-rd/package.json`,
   `apps/native-rd/app.json` (`expo.version`), and `apps/native-rd/CHANGELOG.md`.
3. Merge the PR. release-please pushes the `vX.Y.Z` tag **and publishes a
   GitHub Release** (as a draft — `"draft": true` in the release-please config;
   publishing is the manual "ship" click in the Releases UI).
4. `build-production` workflow fires on the published Release. It runs
   `eas submit` for iOS and Android using the static metadata in
   `apps/native-rd/store.config.base.json` (title, privacy policy URL —
   nothing version-specific). Watch the workflow in Actions.
5. After EAS finishes:
   - iOS: build appears in App Store Connect → TestFlight. External testers
     get it automatically (if the build is in a beta group with
     auto-distribution). The App Store release still requires manual
     "Submit for Review" + phased release in ASC.
   - Android: build appears in Play Console → Production at 10% rollout.
     Watch Sentry for 24–48h, then advance directly in Play Console or via
     Google Play Developer API tooling such as fastlane `supply`.

Store-facing release notes (Play "What's new", App Store "What's New",
TestFlight "What to Test") are entered **by hand** in each console.
There is no automated pipeline that pushes them — `eas submit` only pushes
the static metadata from `store.config.base.json`.

If you need to re-run a production build against an existing tag (e.g.,
because EAS failed transiently), use **Actions → build-production → "Run
workflow"** and supply the tag (e.g., `v0.1.4`) as the `ref` input. You can
also choose `platform` = `ios` or `android` for a platform-specific re-run.

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

## First-run evidence

Fill this in after the first real runs so future release work has concrete
breadcrumbs instead of folklore.

| Date       | Workflow           | Ref/tag | Platform | EAS build URL | Result | Notes |
| ---------- | ------------------ | ------- | -------- | ------------- | ------ | ----- |
| YYYY-MM-DD | `build-internal`   |         |          |               |        |       |
| YYYY-MM-DD | `build-production` |         |          |               |        |       |

## Tag rewriting is blocked — ship as N+1 instead

**Do not** `git push --delete origin v<x.y.z>` followed by `git push origin v<x.y.z>`
on this repo. The recreate step will be rejected with `GH013: Cannot create ref
due to creations being restricted` — and that block is invisible to every UI
and API surface (no matching ruleset, no protected-tag rule, no org ruleset).
Personal tokens can't push v-pattern tags here; only `release-please-action`'s
`GITHUB_TOKEN` can.

This means: **once a v-tag is deleted, you cannot put it back yourself.**

If a tag was cut at the wrong SHA (e.g. before a needed fix landed), the
recovery path is to ship N+1, **not** to re-tag N:

1. Wait for release-please to pick up the next bumping commit (`feat:` /
   `fix:`) and open a `chore(main): release <next-version>` PR.
2. **Two manual edits on the bot's PR before merge:**
   - **CHANGELOG.md** — the bot will scaffold N+1 against the previous
     _existing_ tag (N-1, because the N tag is gone), which means every
     N-window entry is double-counted against N-1's section. Collapse N+1
     into a single section with the actual user-facing entries from the
     N-window, and point the compare URL at `v<N-1>...v<N+1>`. Delete the
     orphaned N section entirely — v-N doesn't exist on origin, so leaving
     it in the public CHANGELOG is a lie.
   - **PR body** — release-please re-uses the bloated CHANGELOG it computed,
     so the PR body inherits the same problem. Replace it by hand with the
     collapsed N+1 list and a one-line note that N+1 supersedes the unshipped
     N.
3. Merge it. Normal pipeline ships from N+1.

The asymmetry — bot can write v-tags, you can't — is the same shape as the
Copilot Autofix DCO situation (see `.github/workflows/`): GitHub Apps with
elevated repo scope bypass restrictions personal tokens are subject to.

**Side effect of an attempted re-tag:** even if you don't recreate the tag,
deleting it confuses release-please. The manifest at
`.github/.release-please-manifest.json` still records the version as released,
but the tag is gone, so the bot's next run computes commits since the
_previous_ tag (N-1) and may open a bloated PR. The split-workflow design in
`release-please.yml` + `release-please-next-pr.yml` (PR #239) protects against
this _only_ during a normal release flow — it does not save you from a manual
tag delete.

**Logged at:** 2026-06-04, during the v0.1.11 re-tag attempt that prompted
this section.

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
