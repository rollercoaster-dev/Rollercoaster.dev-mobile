# PR #28 Release Pipeline Setup and Review Plan

Status: active · Owner: Joe · Created: 2026-05-16 · PR: https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/pull/28

## Context

PR #28 adds a click-only iOS and Android release pipeline for `apps/native-rd`:

- `release-please` maintains the release PR and publishes GitHub Releases.
- `build-internal` manually builds/submits the `preview` EAS profile.
- `build-production` builds/submits the `production` EAS profile from a published Release or manual ref.
- `_release-validate.yml` gives release workflows a shared format/typecheck/lint/test gate.
- `eas.json` moves submit credentials to runtime-written files under repo-root `secrets/`.

This plan is the operator walkthrough for getting the PR reviewed, fixed, merged, and smoke-tested without relying on chat memory.

## Current Review Read

Reviewed against PR head `58b54b9d631f4c59be011a13299270b527a7bbf8` on 2026-05-16.

Already fixed on the current PR head:

- Ref mismatch comments: `_release-validate.yml` accepts `inputs.ref`, and both build workflows pass the same resolved ref that they later check out.
- Multiline secret interpolation comments: credential file writing now passes multiline secrets via `env:` and references shell variables.
- Missing trailing newline comments: credential files are written with `printf '%s\n'`.
- Android rollout runbook comment: runbook now points to Play Console or fastlane `supply`, not a nonexistent `eas submit:rollout` command.
- `build-internal` default-ref comment: the `ref` input is blank and falls back to `github.ref`.

Improvements applied after review:

- **Fixed EAS build/submit race.** The workflows no longer queue `eas build --no-wait` followed by `eas submit --latest`. They build per platform, wait for completion, parse the EAS build ID from JSON output, and submit that exact ID.
- **Clarified release validation.** `_validate.yml` was renamed to `_release-validate.yml` so it is clearly a release preflight workflow, not the full repo CI contract.
- **Added format check.** Release validation now runs `bun run format:check` before typecheck/lint/test.
- **Added platform selection.** Manual internal and production workflows accept `platform=all|ios|android`.
- **Split build and submit.** Build and submit now run as separate per-platform jobs, which keeps the upload step explicit and tied to a known build artifact.
- **Resolved stale CI wording.** The implementation plan and CI contract now state that existing standalone CI remains in `ci-native-rd.yml`, `ci-packages.yml`, and `ci-docs.yml`.
- **Added first-run evidence.** The release runbook now has a table for recording first successful workflow runs and gotchas.

References:

- Expo EAS CLI reference: https://docs.expo.dev/eas/cli/
- Expo EAS Submit intro: https://docs.expo.dev/submit/introduction/
- Expo first build setup: https://docs.expo.dev/build/setup/

## Local Setup

- [ ] Fetch the PR branch:

  ```bash
  git fetch origin trapezoidal-lamprey
  ```

- [ ] Create a local review branch without disturbing unrelated work:

  ```bash
  git switch -c codex/pr-28-release-pipeline origin/trapezoidal-lamprey
  ```

- [ ] Confirm the expected head:

  ```bash
  git rev-parse HEAD
  # expected: 58b54b9d631f4c59be011a13299270b527a7bbf8
  ```

- [ ] Install with the repo-standard toolchain from the root:

  ```bash
  bun install --frozen-lockfile
  ```

- [ ] Validate JSON touched by the PR:

  ```bash
  jq empty apps/native-rd/eas.json .github/release-please-config.json .github/.release-please-manifest.json
  ```

- [ ] Confirm versions agree:

  ```bash
  jq -r .version apps/native-rd/package.json
  jq -r .expo.version apps/native-rd/app.json
  ```

  Expected for both: `0.1.3`.

## Code Fix Checklist

- [x] Replace `--no-wait`/`--latest` with per-platform build ID capture and explicit `eas submit --id`.
- [x] Rename `_validate.yml` to `_release-validate.yml`.
- [x] Add `bun run format:check` to release validation.
- [x] Add `platform` dispatch inputs to the manual build workflows.
- [x] Split build and submit into separate per-platform jobs.
- [x] Update `apps/native-rd/docs/release.md` with platform inputs and first-run evidence.
- [x] Update `apps/native-rd/docs/plans/2026-05-14-release-pipeline.md` to match the final click-only trigger choices and the current standalone CI workflow names.
- [ ] Update the PR body after pushing so it does not claim `ci.yml` was refactored.

## Manual Secret Setup

Add these in GitHub repo settings: **Settings -> Secrets and variables -> Actions -> New repository secret**.

- [ ] `EXPO_TOKEN`: Expo personal access token.
- [ ] `SENTRY_AUTH_TOKEN`: Sentry token with `project:releases` and `org:read`.
- [ ] `APPLE_ASC_KEY_ID`: App Store Connect API key ID.
- [ ] `APPLE_ASC_ISSUER_ID`: App Store Connect issuer ID.
- [ ] `APPLE_ASC_KEY_P8`: full `.p8` contents, including `BEGIN` and `END` lines.
- [ ] `ANDROID_PLAY_SERVICE_ACCOUNT_JSON`: full Play Console service account JSON.

Local sanity checks before trusting Actions:

- [ ] Expo token works:

  ```bash
  cd apps/native-rd
  EXPO_TOKEN=<paste-token> npx eas-cli@latest whoami
  ```

- [ ] The Play service account file is not tracked:

  ```bash
  git ls-files apps/native-rd/play-service-account.json
  ```

  Expected: no output.

- [ ] Runtime secret output paths are ignored:

  ```bash
  mkdir -p secrets
  touch secrets/asc-api-key.p8 secrets/play-service-account.json
  git status --short secrets apps/native-rd/play-service-account.json
  rm -rf secrets
  ```

  Expected: no tracked changes.

## Local Verification Before Push

Run from repo root:

- [ ] Fast release gate:

  ```bash
  bun run type-check
  bun run lint
  bun run test
  ```

- [ ] Native CI parity check, recommended because PR #28 touches release-critical infra:

  ```bash
  bun run format:check
  bun run turbo type-check --filter=native-rd
  bun run turbo lint --filter=native-rd
  cd apps/native-rd && bun run test:ci -- --coverage --coverageReporters=lcov
  cd apps/native-rd && bun run test:a11y:json > a11y.json
  cd apps/native-rd && bun run storybook:web:build
  ```

- [ ] Workflow syntax smoke check, if `actionlint` is available:

  ```bash
  actionlint .github/workflows/*.yml
  ```

## GitHub Smoke Test After Merge

Do not run build workflows until the six required secrets are present.

- [ ] Confirm `release-please` runs on the first push to `main` after merge.
- [ ] Confirm it opens or updates `chore(main): release native-rd ...`; if no PR appears, verify there were qualifying conventional commits.
- [ ] Run **Actions -> build-internal -> Run workflow** with `ref=main`.
- [ ] Confirm validate checks out `main`.
- [ ] Confirm EAS build waits for the current build to finish and writes a build ID before submit starts.
- [ ] Confirm submit targets TestFlight internal and Play internal.
- [ ] Run **Actions -> build-production -> Run workflow** against a safe test ref/tag only after internal succeeds.
- [ ] Confirm Android production submit uses `rollout: 0.1`.
- [ ] Confirm Sentry release finalize/deploy succeeds; if it fails, treat as metadata-only and run the Sentry command manually.

## Merge Readiness

Merge PR #28 only when:

- [x] The `--no-wait`/`--latest` race is fixed or replaced with explicit build IDs.
- [ ] PR body, runbook, and implementation plan all match the actual workflow names and triggers.
- [ ] All required secrets are created or there is an explicit note that post-merge workflow smoke tests are blocked on secrets.
- [ ] Local validation and required GitHub checks are green.
- [ ] Branch protection does not expect a removed or renamed CI check.

## Follow-ups

- [ ] Decide whether release workflows should require the full `ci-native-rd` validation contract before EAS builds, beyond the current format/typecheck/lint/test preflight.
- [ ] After the first successful production run, update `apps/native-rd/docs/release.md` "Last verified" with the exact date and any gotchas.
- [ ] Consider adding a tiny workflow note to `docs/architecture/ci-contract.md` explaining that release workflows intentionally validate a release-focused subset, if that remains the final design.
