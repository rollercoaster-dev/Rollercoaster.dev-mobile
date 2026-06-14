# Release Runbook

**Last verified:** 2026-06-07

## Pipeline at a glance

| Track                 | Trigger                                                                  | Workflow                  | EAS build profile | EAS submit profile | Destination                  |
| --------------------- | ------------------------------------------------------------------------ | ------------------------- | ----------------- | ------------------ | ---------------------------- |
| Direct install        | Manual: Actions → `build-internal` → "Run workflow"                      | `build-internal.yml`      | `preview`         | None               | EAS internal distribution    |
| Play internal testing | Manual: Actions → `build-play-internal` → "Run workflow"                 | `build-play-internal.yml` | `production`      | `play-internal`    | Google Play internal testing |
| Tagged tester release | GitHub Release published (release-please PR merge, or manual UI publish) | `build-production.yml`    | `production`      | `production`       | TestFlight + Play internal   |
| Tagged tester release | Manual: Actions → `build-production` → "Run workflow" with `ref` input   | `build-production.yml`    | `production`      | `production`       | TestFlight + Play internal   |

No release workflow auto-builds on a push to `main`. `build-internal` and
`build-play-internal` are manual. `build-production` is human-gated either by
publishing a draft GitHub Release or by manual dispatch. release-please runs on
every push to `main` to keep the release PR up to date, but it never builds
anything itself.

## Cutting a direct-install build

1. Go to **Actions → build-internal → "Run workflow"**.
2. Pick the ref you want to build. Defaults to the branch selected in GitHub's
   "Use workflow from" dropdown; can also be `main`, a feature branch, or a
   specific commit.
3. Pick `platform`: `all`, `ios`, or `android`. Use a single platform when
   smoke-testing one credential path.
4. Click **Run workflow**.
5. Watch release validation followed by the selected per-platform EAS build
   jobs.

This workflow never submits to App Store Connect or Google Play. Its iOS
artifact is ad-hoc provisioned and its Android artifact is an APK, both for
direct installation only.

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

## Cutting a tagged tester release

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
4. `build-production` fires on the published Release. It builds store-shaped
   production artifacts, then runs `eas submit` for iOS and Android. The iOS
   submit also uses the static metadata in
   `apps/native-rd/store.config.base.json` (title and privacy policy URL —
   nothing version-specific). Watch the workflow in Actions.
5. After EAS finishes:
   - iOS: the build appears in App Store Connect → TestFlight. Tester
     distribution depends on the TestFlight groups configured in App Store
     Connect. A public App Store release still requires a separate manual
     review and release decision.
   - Android: the build appears in Play Console → Testing → Internal testing.

`production` is the EAS **build profile** name and produces store-shaped
artifacts: an App Store-signed iOS build and an Android AAB. It does not
currently mean that Android is released to the Play production track.

Store-facing release notes (Play "What's new", App Store "What's New",
TestFlight "What to Test") are entered **by hand** in each console.
There is no automated pipeline that pushes them — `eas submit` only pushes
the static metadata from `store.config.base.json`.

If you need to re-run a tagged tester build against an existing tag (e.g.,
because EAS failed transiently), use **Actions → build-production → "Run
workflow"** and supply the tag (e.g., `v0.1.4`) as the `ref` input. You can
also choose `platform` = `ios` or `android` for a platform-specific re-run.

## Enabling public store release later

The automated pipeline does not currently release Android to Play production
or submit an iOS version for App Store review. When production access is
intentionally enabled:

1. Open a dedicated issue and review current store-account readiness.
2. Change `submit.production.android.track` only in that reviewed change.
3. Add an explicit rollout policy and rollback procedure before enabling it.
4. Update this runbook and capture a successful production-track run.

## Rolling back

- **Android internal testing:** stop distributing the affected release to
  testers in Play Console and upload a fixed build with a higher versionCode.
- **iOS TestFlight:** expire the affected build in App Store Connect and upload
  a fixed build. If the version was also released publicly, removing it from
  sale only blocks new downloads; existing installs are unaffected.

## Required secrets

The store and EAS workflows use these GitHub repository secrets:

- `EXPO_TOKEN`
- `SENTRY_AUTH_TOKEN`
- `APPLE_ASC_KEY_ID`
- `APPLE_ASC_ISSUER_ID`
- `APPLE_ASC_KEY_P8`
- `ANDROID_PLAY_SERVICE_ACCOUNT_JSON`

## First-run evidence

| Date       | Workflow           | Ref/tag   | Platform | Evidence                                                                                                                                                                                                                                                                                  | Result  | Notes                                            |
| ---------- | ------------------ | --------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------ |
| 2026-06-07 | `build-production` | `v0.1.14` | iOS      | [EAS build `01618bff-49be-4fe8-a748-7c9fc28e0163`](https://expo.dev/accounts/rollercoasterdev/projects/rollercoasterdev/builds/01618bff-49be-4fe8-a748-7c9fc28e0163); [Actions run `27096223782`](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/actions/runs/27096223782) | Success | Submitted to App Store Connect/TestFlight        |
| 2026-06-07 | `build-production` | `v0.1.14` | Android  | [EAS build `22930d94-95b4-4039-9fd4-ceec910a81a5`](https://expo.dev/accounts/rollercoasterdev/projects/rollercoasterdev/builds/22930d94-95b4-4039-9fd4-ceec910a81a5); [Actions run `27096223782`](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/actions/runs/27096223782) | Success | Submitted to Play `internal`, status `COMPLETED` |

Issue #90 remains open until a current `build-play-internal` run is recorded
here.

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
- **Sentry finalize fails:** the build still reached its tester destination;
  finalize is metadata-only. Run
  `npx @sentry/cli releases finalize <release-name>` manually.
