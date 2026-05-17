# Release Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a click-only iOS + Android release pipeline: manual internal builds, production builds on published GitHub Releases, and versioning + changelog handled by release-please.

**Architecture:** GitHub Actions orchestrates EAS Build and EAS Submit. EAS owns signing, native build, and store upload (already configured in `eas.json`). GitHub Actions owns triggers, version bumping (release-please), Sentry release finalization, and notifications. Three release workflows: `_release-validate.yml` (reusable release preflight), `build-internal.yml` (manual preview build/submit), and `build-production.yml` (published Release or manual production build/submit). Existing CI remains in the standalone repo workflows: `ci-native-rd.yml`, `ci-packages.yml`, and `ci-docs.yml`.

**Tech Stack:** GitHub Actions, EAS CLI (Expo), release-please, Sentry CLI, App Store Connect API, Google Play Developer API.

**Source of truth:** [`docs/research/release-pipeline.md`](../research/release-pipeline.md) (the spec this plan implements).

---

## Pre-flight (READ FIRST)

This plan assumes the engineer has read the research doc and understands the three-track model (development / internal / production). It also assumes the items in `docs/plans/2026-04-28-ios-testflight-readiness.md` are complete enough that a first internal build can succeed manually (i.e., `eas build --profile preview --platform ios` works locally today). If that's not true, fix it before starting Task 5.

Memory reminders for the implementer:

- **Atomic commits.** One logical change per commit. Never bulk-commit at the end.
- **Never post PR comments / review replies** without explicit per-action authorization.
- **Pull before any rebase/reset.** Verify base and divergence first.

## File Structure

Files this plan creates or modifies:

- Modify: `apps/native-rd/app.json` — sync `expo.version` with `package.json` (Task 1).
- Modify: `apps/native-rd/eas.json` — switch iOS submit to ASC API key, drop committed Play key path (Task 2).
- Create: `.github/release-please-config.json` — release-please component config.
- Create: `.github/.release-please-manifest.json` — release-please version state.
- Create: `.github/workflows/release-please.yml` — opens/updates the release PR (Task 3).
- Create: `.github/workflows/_release-validate.yml` — reusable release preflight workflow (Task 4).
- Create: `.github/workflows/build-internal.yml` — manual preview build + explicit-ID submit (Task 5).
- Create: `.github/workflows/build-production.yml` — Release-published/manual production build + explicit-ID submit (Task 6).
- Create: `apps/native-rd/docs/release.md` — release operations runbook (Task 7).
- Modify: `apps/native-rd/CLAUDE.md` — link to the runbook (Task 7).

Each file has one responsibility. The two workflows that build (internal, production) share only the reusable release preflight workflow; build and submit are split into per-platform jobs so a submission targets the exact EAS build ID produced by the corresponding build job.

---

## Task 0: Manual prerequisites (one-time, no commit)

These cannot be automated — they involve external accounts. Complete all of them before Task 5.

**Files:** None.

- [ ] **Step 1: Create App Store Connect API key**
  1. Go to https://appstoreconnect.apple.com → Users and Access → Integrations → App Store Connect API → Team Keys.
  2. Click "Generate API Key" (or "+"). Name: `rollercoasterdev-ci`. Access: **App Manager**.
  3. Download the `.p8` file (only available once). Note the **Key ID** and the **Issuer ID** shown on that page.
  4. Save the `.p8` contents — you'll paste it as a GitHub secret in Step 4.

- [ ] **Step 2: Verify Play Console service account JSON**
  1. The `eas.json` already references `./play-service-account.json` but this file should not be committed. Confirm with `git ls-files apps/native-rd/play-service-account.json` — expected output: empty (the file is gitignored or not present).
  2. If you don't already have one: Google Cloud Console → IAM & Admin → Service Accounts → Create. Grant the role **Service Account User**. Then in Play Console → Setup → API access → grant **Release manager** to that service account.
  3. Save the JSON key — you'll paste it as a GitHub secret in Step 4.

- [ ] **Step 3: Create an Expo personal access token**
  1. Go to https://expo.dev → Account settings → Access tokens.
  2. Click "Create token". Name: `github-actions-ci`. Save the token.

- [ ] **Step 4: Add GitHub repo secrets**

  In the GitHub repo → Settings → Secrets and variables → Actions → New repository secret. Add each of:

  | Secret name                         | Value                                                                                          |
  | ----------------------------------- | ---------------------------------------------------------------------------------------------- |
  | `EXPO_TOKEN`                        | From Step 3                                                                                    |
  | `SENTRY_AUTH_TOKEN`                 | From Sentry org → User Auth Tokens (scopes: `project:releases`, `org:read`)                    |
  | `APPLE_ASC_KEY_ID`                  | Key ID from Step 1                                                                             |
  | `APPLE_ASC_ISSUER_ID`               | Issuer ID from Step 1                                                                          |
  | `APPLE_ASC_KEY_P8`                  | Full contents of the `.p8` file from Step 1, including the `-----BEGIN PRIVATE KEY-----` lines |
  | `ANDROID_PLAY_SERVICE_ACCOUNT_JSON` | Full JSON contents from Step 2                                                                 |

- [ ] **Step 5: Verify access works**

  Locally (one-time, not committed): run `EXPO_TOKEN=<paste> npx eas-cli@latest whoami` from `apps/native-rd/`. Expected: prints the expo account username. If it fails, the token is wrong — regenerate.

---

## Task 1: Sync `app.json` version with `package.json`

`apps/native-rd/package.json` is at `0.1.3` but `apps/native-rd/app.json` is still at `0.1.0`. release-please will own both going forward, but the starting state must be consistent.

**Files:**

- Modify: `apps/native-rd/app.json:4` (the `expo.version` field)

- [ ] **Step 1: Update version in `app.json`**

  Change line 4 of `apps/native-rd/app.json` from `"version": "0.1.0",` to `"version": "0.1.3",`.

- [ ] **Step 2: Verify the two files agree**

  Run from repo root:

  ```bash
  jq -r .version apps/native-rd/package.json && jq -r .expo.version apps/native-rd/app.json
  ```

  Expected output:

  ```
  0.1.3
  0.1.3
  ```

- [ ] **Step 3: Run validate to make sure nothing broke**

  Run from repo root: `bun run type-check && bun run lint && bun run test`. Expected: all pass.

- [ ] **Step 4: Commit**

  ```bash
  git add apps/native-rd/app.json
  git commit -s -m "chore(native-rd): sync app.json expo.version with package.json"
  ```

---

## Task 2: Migrate `eas.json` Apple submit to ASC API key + env-based Play creds

The current `eas.json` references `play-service-account.json` (a path) and uses Apple ID + team ID for iOS submit. Both need to be reworked so CI can supply credentials via environment variables/files written at runtime.

**Files:**

- Modify: `apps/native-rd/eas.json` (the `submit.production` block)

- [ ] **Step 1: Replace `submit.production` block in `eas.json`**

  Open `apps/native-rd/eas.json`. Replace the entire `"submit": { ... }` block with:

  ```json
    "submit": {
      "production": {
        "ios": {
          "ascAppId": "6766029904",
          "appleTeamId": "86VL756N99",
          "ascApiKeyPath": "../../secrets/asc-api-key.p8",
          "ascApiKeyId": "$APPLE_ASC_KEY_ID",
          "ascApiIssuerId": "$APPLE_ASC_ISSUER_ID"
        },
        "android": {
          "serviceAccountKeyPath": "../../secrets/play-service-account.json",
          "track": "production",
          "releaseStatus": "inProgress",
          "rollout": 0.1
        }
      },
      "preview": {
        "ios": {
          "ascAppId": "6766029904",
          "appleTeamId": "86VL756N99",
          "ascApiKeyPath": "../../secrets/asc-api-key.p8",
          "ascApiKeyId": "$APPLE_ASC_KEY_ID",
          "ascApiIssuerId": "$APPLE_ASC_ISSUER_ID"
        },
        "android": {
          "serviceAccountKeyPath": "../../secrets/play-service-account.json",
          "track": "internal"
        }
      }
    }
  ```

  Notes:
  - `$APPLE_ASC_KEY_ID` and `$APPLE_ASC_ISSUER_ID` are environment-variable references — EAS substitutes them at submit time. The CI workflow sets these from secrets.
  - The `secrets/` directory will be created by the CI workflow and is **never committed** (Step 3 adds it to `.gitignore`).
  - Path is relative to `apps/native-rd/` (where `eas.json` lives), so `../../secrets/` resolves to repo-root `secrets/`.

- [ ] **Step 2: Verify `eas.json` parses**

  Run: `jq . apps/native-rd/eas.json > /dev/null`. Expected: no output, exit 0. If it errors, fix the JSON.

- [ ] **Step 3: Add `secrets/` and a stale credential file to `.gitignore`**

  Append to `.gitignore` at repo root:

  ```
  # CI-only secret material written at workflow runtime; never committed.
  /secrets/
  apps/native-rd/play-service-account.json
  ```

  The second line guards against the historical path in case the file still exists locally on a dev machine.

- [ ] **Step 4: Verify gitignore works**

  Run: `mkdir -p secrets && touch secrets/test.txt && git status secrets/`. Expected: secrets directory is ignored (no output from `git status`). Then `rm -rf secrets/`.

- [ ] **Step 5: Commit**

  ```bash
  git add apps/native-rd/eas.json .gitignore
  git commit -s -m "chore(native-rd): switch submit creds to env-based (ASC API key, Play SA via runtime path)"
  ```

---

## Task 3: Add release-please for versioning + changelog

release-please reads conventional commits on `main`, opens/maintains a "Release vX.Y.Z" PR with version bumps + changelog. Merging that PR creates the `v*.*.*` tag and a GitHub Release — which is the production trigger in Task 6.

**Files:**

- Create: `.github/release-please-config.json`
- Create: `.github/.release-please-manifest.json`
- Create: `.github/workflows/release-please.yml`

- [ ] **Step 1: Create `.github/release-please-config.json`**

  ```json
  {
    "$schema": "https://raw.githubusercontent.com/googleapis/release-please/main/schemas/config.json",
    "release-type": "node",
    "include-component-in-tag": false,
    "include-v-in-tag": true,
    "bump-minor-pre-major": true,
    "bump-patch-for-minor-pre-major": true,
    "packages": {
      "apps/native-rd": {
        "package-name": "native-rd",
        "changelog-path": "CHANGELOG.md",
        "extra-files": [
          {
            "type": "json",
            "path": "app.json",
            "jsonpath": "$.expo.version"
          }
        ]
      }
    }
  }
  ```

  Notes:
  - `include-component-in-tag: false` + `include-v-in-tag: true` → tags look like `v0.1.4`, not `native-rd-v0.1.4`. Task 6's workflow trigger depends on this format.
  - `extra-files` keeps `app.json` `expo.version` in lockstep with `package.json` automatically.
  - The existing orphaned `apps/native-rd/CHANGELOG.md` will be overwritten by release-please on its first run. That's intentional — the prior entries were from a since-removed Changesets setup.

- [ ] **Step 2: Create `.github/.release-please-manifest.json`**

  ```json
  {
    "apps/native-rd": "0.1.3"
  }
  ```

  This pins the starting version. release-please reads this to know where to bump from.

- [ ] **Step 3: Create `.github/workflows/release-please.yml`**

  ```yaml
  name: release-please

  on:
    push:
      branches: [main]

  permissions:
    contents: write
    pull-requests: write

  jobs:
    release-please:
      runs-on: ubuntu-latest
      steps:
        - uses: googleapis/release-please-action@v4
          with:
            config-file: .github/release-please-config.json
            manifest-file: .github/.release-please-manifest.json
  ```

- [ ] **Step 4: Lint the workflow**

  If `actionlint` is installed locally: `actionlint .github/workflows/release-please.yml`. Expected: no output.

  If it isn't installed: `brew install actionlint` then re-run. Skip if you can't install and rely on GitHub Actions to surface syntax errors on first push.

- [ ] **Step 5: Commit**

  ```bash
  git add .github/release-please-config.json .github/.release-please-manifest.json .github/workflows/release-please.yml
  git commit -s -m "ci(release): add release-please for semver + changelog automation"
  ```

- [ ] **Step 6: Verify after merge to `main`**

  After this commit lands on `main` (via PR), check the Actions tab. The `release-please` workflow should run and either (a) open a "chore(main): release native-rd 0.1.4" PR if there are any qualifying commits, or (b) succeed with no PR if there are none. Either is fine.

---

## Task 4: Add reusable release preflight workflow

The standalone repo already has full CI in `ci-native-rd.yml`, `ci-packages.yml`, and `ci-docs.yml`. Release builds need a focused preflight gate that checks the exact ref being built before EAS starts. This workflow is intentionally named `_release-validate.yml` so it is not mistaken for the full PR/main CI contract.

**Files:**

- Create: `.github/workflows/_release-validate.yml`
- Modify: `docs/architecture/ci-contract.md`

- [ ] **Step 1: Create `.github/workflows/_release-validate.yml`**

  ```yaml
  name: _release-validate

  on:
    workflow_call:
      inputs:
        ref:
          description: "Git ref to check out and validate. Defaults to the caller workflow's commit."
          required: false
          type: string

  jobs:
    validate:
      name: Release Format, Typecheck, Lint & Test
      runs-on: ubuntu-latest
      steps:
        - name: Checkout
          uses: actions/checkout@v6
          with:
            ref: ${{ inputs.ref }}

        - name: Setup Bun
          uses: oven-sh/setup-bun@v2
          with:
            bun-version-file: "package.json"

        - name: Setup Node
          uses: actions/setup-node@v6
          with:
            node-version: 22

        - name: Cache Bun dependencies
          uses: actions/cache@v5
          with:
            path: ~/.bun/install/cache
            key: ${{ runner.os }}-bun-${{ hashFiles('**/bun.lock') }}
            restore-keys: |
              ${{ runner.os }}-bun-

        - name: Install dependencies
          run: bun install --frozen-lockfile

        - name: Format check
          run: bun run format:check

        - name: Typecheck
          run: bun run type-check

        - name: Lint
          run: bun run lint

        - name: Test
          run: bun run test
  ```

- [ ] **Step 2: Document the boundary**

  Update `docs/architecture/ci-contract.md` to state that `_release-validate.yml` is a release preflight gate and does not replace the fuller `ci-native-rd` PR/main validation contract.

- [ ] **Step 3: Lint the workflow**

  `actionlint .github/workflows/_release-validate.yml`. Expected: no output.

- [ ] **Step 4: Commit**

  ```bash
  git add .github/workflows/_release-validate.yml docs/architecture/ci-contract.md
  git commit -s -m "ci(release): add reusable release validation workflow"
  ```

---

## Task 5: Internal build + explicit-ID submit workflow

Internal builds are manual-only. The workflow validates the requested ref, builds the selected platform(s), captures each EAS build ID, then submits exactly those build IDs to TestFlight internal and/or Play internal.

**Files:**

- Create: `.github/workflows/build-internal.yml`

- [ ] **Step 1: Create the workflow**

  Key requirements:
  - Trigger: `workflow_dispatch` only.
  - Inputs: optional `ref`; `platform` choice of `all`, `ios`, or `android`.
  - Validation: call `./.github/workflows/_release-validate.yml` with the same ref the build jobs check out.
  - Build: use per-platform jobs and `eas build --json` without `--no-wait` so the command waits for the build to finish and returns the build ID.
  - Submit: use per-platform submit jobs with `eas submit --id <build-id>`, never `--latest`.

- [ ] **Step 2: Keep credential writing shell-safe**

  Pass multiline secrets via `env:`, then write them with shell variables:

  ```bash
  mkdir -p ../../secrets
  printf '%s\n' "$APPLE_ASC_KEY_P8" > ../../secrets/asc-api-key.p8
  printf '%s\n' "$ANDROID_PLAY_SA" > ../../secrets/play-service-account.json
  chmod 600 ../../secrets/asc-api-key.p8 ../../secrets/play-service-account.json
  ```

- [ ] **Step 3: Lint**

  `actionlint .github/workflows/build-internal.yml`. Expected: no output.

- [ ] **Step 4: First run after merge**

  After secrets are configured, go to Actions -> build-internal -> "Run workflow". Start with `platform=ios` or `platform=android` to smoke-test one credential path, then run `platform=all` once both paths are known-good.

- [ ] **Step 5: Commit**

  ```bash
  git add .github/workflows/build-internal.yml
  git commit -s -m "ci(release): add internal build and explicit-id submit workflow"
  ```

## Task 6: Production build + explicit-ID submit workflow

Production builds run when release-please publishes a GitHub Release, with a manual `workflow_dispatch` path for re-runs. The workflow validates the release ref, builds selected platform(s), submits the exact EAS build IDs, and finalizes the Sentry release after at least one selected platform submits successfully.

**Files:**

- Create: `.github/workflows/build-production.yml`

- [ ] **Step 1: Create the workflow**

  Key requirements:
  - Triggers: `release: types: [published]` and manual `workflow_dispatch` with required `ref`.
  - Manual input: `platform` choice of `all`, `ios`, or `android` for platform-specific re-runs.
  - Validation: call `./.github/workflows/_release-validate.yml` with `inputs.ref || github.event.release.tag_name || github.ref`.
  - Build: per-platform EAS build jobs with `--json` and no `--no-wait`.
  - Submit: per-platform submit jobs with `--id`, not `--latest`.
  - Android: use the `production` submit profile with `rollout: 0.1` from `eas.json`.
  - Sentry: finalize/deploy only after selected platform submit jobs complete successfully.

- [ ] **Step 2: Verify Sentry org/project before first production run**

  Run from repo root:

  ```bash
  jq '.expo.plugins[] | select(type == "array" and .[0] == "@sentry/react-native/expo")' apps/native-rd/app.json
  ```

  Expected values should match the workflow env, currently `SENTRY_ORG=rollercoasterdev` and `SENTRY_PROJECT=native-rd`.

- [ ] **Step 3: Lint**

  `actionlint .github/workflows/build-production.yml`. Expected: no output.

- [ ] **Step 4: Manual smoke test after secrets land**

  Use Actions -> build-production -> "Run workflow" against a safe test ref/tag only when you are ready for a real production-profile upload. Prefer `platform=ios` or `platform=android` first if only one store credential path needs verification.

- [ ] **Step 5: Commit**

  ```bash
  git add .github/workflows/build-production.yml
  git commit -s -m "ci(release): add production build and explicit-id submit workflow"
  ```

## Task 7: Document the pipeline

Create the release runbook and link it from `apps/native-rd/CLAUDE.md`. The runbook should match the implemented click-only release path, not the original push/tag draft.

**Files:**

- Create: `apps/native-rd/docs/release.md`
- Modify: `apps/native-rd/CLAUDE.md`
- Modify: `apps/native-rd/docs/plans/index.md`

- [ ] **Step 1: Create the runbook**

  Required content:
  - Pipeline table for manual internal builds, published-Release production builds, and manual production re-runs.
  - Internal build steps with `platform=all|ios|android`.
  - Production release steps via release-please and GitHub Release publication.
  - Android rollout advancement via Play Console or fastlane `supply`, not EAS CLI `submit:rollout`.
  - First-run evidence table with date, workflow, ref/tag, platform, EAS build URL, result, and notes.
  - Required GitHub secrets and common failure modes.

- [ ] **Step 2: Link the runbook**

  Add a short `docs/release.md` pointer in `apps/native-rd/CLAUDE.md`.

- [ ] **Step 3: Index the plan**

  Add this release-pipeline plan to `apps/native-rd/docs/plans/index.md`.

- [ ] **Step 4: Commit**

  ```bash
  git add apps/native-rd/docs/release.md apps/native-rd/CLAUDE.md apps/native-rd/docs/plans/index.md
  git commit -s -m "docs(native-rd): add release pipeline runbook"
  ```

## Task 8 (optional, separate PR): Investigate dropping `buildReactNativeFromSource`

`app.json` sets `ios.buildReactNativeFromSource: true` under `expo-build-properties`. This roughly doubles iOS build time on EAS. It was added for a specific compatibility reason (check `git log --all -p apps/native-rd/app.json | grep -B2 buildReactNativeFromSource` for the commit). It may no longer be required on the current SDK.

This is a separate PR with its own risk surface; do not bundle with the pipeline rollout.

**Files:**

- Modify: `apps/native-rd/app.json` (the `expo-build-properties` plugin entry)

- [ ] **Step 1: Establish baseline iOS build time**

  Run an EAS preview build with the flag still on: `cd apps/native-rd && EXPO_TOKEN=<token> npx eas-cli build --profile preview --platform ios --non-interactive`. Note the total time from the EAS dashboard.

- [ ] **Step 2: Remove the flag**

  In `apps/native-rd/app.json`, edit the `expo-build-properties` plugin block. Change:

  ```json
  [
    "expo-build-properties",
    {
      "ios": {
        "buildReactNativeFromSource": true
      }
    }
  ],
  ```

  to:

  ```json
  ["expo-build-properties", {}],
  ```

  (Keep the bare plugin entry so removal is a single property delta, not a structural one.)

- [ ] **Step 3: Run a test EAS build**

  `cd apps/native-rd && EXPO_TOKEN=<token> npx eas-cli build --profile preview --platform ios --non-interactive`. Expected: build succeeds and is meaningfully faster than Step 1.

- [ ] **Step 4: Install on a device and smoke-test**

  Install the resulting `.ipa` on a physical iPhone via TestFlight. Verify: app launches, camera works, audio recording works, badge creation works, Sentry receives an event from `DevToolsScreen → Trigger test error`. If anything regresses, revert.

- [ ] **Step 5: Commit (only if Step 4 passed)**

  ```bash
  git add apps/native-rd/app.json
  git commit -s -m "chore(native-rd): drop buildReactNativeFromSource — current SDK no longer needs it"
  ```

- [ ] **Step 6: If Step 4 failed, revert and document why**

  Restore the flag. Update the comment near the plugin entry (or this plan's Step 1) with the failure mode you observed, so the next person doesn't try again without new information.

---

## Self-Review Notes

Coverage check against `docs/research/release-pipeline.md`:

- TL;DR → Tasks 3, 4, 5, 6 (release-please + reusable validate + internal + production).
- Three release tracks → Tasks 5 (internal), 6 (production). Development track is unchanged (manual / local), as the research doc said.
- Versioning + changelog → Task 3.
- Sentry → Task 6 Step 1 (finalize + deploys).
- Workflow files → Tasks 4, 5, 6.
- Secrets → Task 0 (manual GitHub setup) + Tasks 5, 6 (consumption).
- ASC API key migration → Task 2.
- Env-only Play creds → Task 2.
- Build optimization (`buildReactNativeFromSource`) → Task 8 (optional, separate PR).
- Failure handling → Task 7 (runbook); workflow-level notifications (Slack/Telegram) are intentionally omitted from this first pass — add later if churn is high.
- Staged rollout → Task 6 (Android 10%); iOS manual gate documented in Task 7.

Open decisions from research doc:

- (1) `develop`/`next` branch flow → **decided: no, `main` only.** Encoded in Task 5/6 triggers.
- (2) Path filter on internal builds → **decided: yes.** Encoded in Task 5 Step 1.
- (3) Drop `buildReactNativeFromSource` → **deferred to Task 8.**
- (4) Env-only Play creds → **decided: yes.** Encoded in Task 2.
- (5) ASC API key migration → **decided: yes, now.** Encoded in Tasks 0 and 2.

No placeholders, no "TODO" steps, no unspecified commands.

---

## Implementation deviations (recorded during execution on PR #28)

Captured here so anyone reading the plan after the fact knows where reality
parted ways from the original text.

- **Tasks 5 + 6 triggers — click-only.** Plan originally had Task 5 firing
  on `push: branches: [main]` and Task 6 firing on `push: tags: ["v*.*.*"]`.
  Per a user directive during execution, both became click-only: Task 5 is
  `workflow_dispatch` only; Task 6 is `release: types: [published]` +
  `workflow_dispatch`. release-please still publishes the Release on PR
  merge, so the production happy path is unchanged.
- **Task 4 — `ci.yml` thin-caller refactor abandoned.** PR #26 landed on
  `main` mid-execution and replaced the single monorepo-era `ci.yml` with
  three path-filtered workflows (`ci-native-rd.yml`, `ci-packages.yml`,
  `ci-docs.yml`). The original Task 4 step "make `ci.yml` a caller of
  `_validate.yml`" no longer applies — there is no `ci.yml`.
  `_release-validate.yml` services only the release workflows
  (`build-internal`, `build-production`); the PR-time CI gates own their own
  richer validation contract.
- **Release build/submit split.** Initial workflow drafts queued `eas build
--no-wait` and then submitted `--latest`, which could submit a previous
  finished build. Final workflows build per platform, wait for EAS to finish,
  parse the build ID from `--json`, and submit that exact ID.
- **Task 6 Sentry org/project.** Plan placeholder used `rollercoaster-dev`
  for `SENTRY_ORG`. Verified against `app.json`'s `@sentry/react-native/expo`
  plugin block — actual value is `rollercoasterdev` (no dash). Workflow uses
  the verified value.
- **`printf` newline + secret-via-env hardening.** Two iterations on the
  credential-writing step, both from Copilot review feedback on PR #28:
  first added a trailing newline (`printf '%s\n'`) so PEM keys are
  parser-friendly, then moved the secrets to `env:` so multi-line content
  can't be expanded into the script source by `${{ secrets.* }}`
  interpolation.
- **`inputs.ref` default on `build-internal`.** Initial draft hardcoded
  `default: "main"` on the workflow_dispatch input; that overrode the
  selection in the "Use workflow from" dropdown. Final version drops the
  default and falls through to `github.ref`, so the dropdown choice is the
  implicit ref.
- **Runbook Android-rollout command.** Plan / first runbook draft pointed
  at `npx eas-cli submit:rollout` — that subcommand does not exist.
  Replaced with Play Console UI flow + a `fastlane supply` example for
  scripted advancement.
