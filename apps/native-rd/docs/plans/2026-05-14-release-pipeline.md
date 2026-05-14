# Release Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up an automated iOS + Android release pipeline that builds and submits internal builds on every push to `main` and production builds on every `v*.*.*` tag, with versioning + changelog handled by release-please.

**Architecture:** GitHub Actions orchestrates EAS Build and EAS Submit. EAS owns signing, native build, and store upload (already configured in `eas.json`). GitHub Actions owns triggers, version bumping (release-please), Sentry release finalization, and notifications. Three workflows: `_validate.yml` (reusable), `build-internal.yml` (push to `main`), `build-production.yml` (tag `v*.*.*`). The existing `ci.yml` becomes a thin caller of `_validate.yml`.

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
- Create: `.github/workflows/_validate.yml` — reusable validate workflow (Task 4).
- Modify: `.github/workflows/ci.yml` — call `_validate.yml` (Task 4).
- Create: `.github/workflows/build-internal.yml` — preview build + submit on push to `main` (Task 5).
- Create: `.github/workflows/build-production.yml` — production build + submit on tag (Task 6).
- Create: `apps/native-rd/docs/release.md` — release operations runbook (Task 7).
- Modify: `apps/native-rd/CLAUDE.md` — link to the runbook (Task 7).

Each file has one responsibility. The two workflows that build (internal, production) deliberately do not share more than the reusable validate workflow — they have different secrets, different inputs, and different failure modes; consolidating them via matrix would obscure that.

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

  | Secret name                              | Value                                        |
  | ---------------------------------------- | -------------------------------------------- |
  | `EXPO_TOKEN`                             | From Step 3                                  |
  | `SENTRY_AUTH_TOKEN`                      | From Sentry org → User Auth Tokens (scopes: `project:releases`, `org:read`) |
  | `APPLE_ASC_KEY_ID`                       | Key ID from Step 1                           |
  | `APPLE_ASC_ISSUER_ID`                    | Issuer ID from Step 1                        |
  | `APPLE_ASC_KEY_P8`                       | Full contents of the `.p8` file from Step 1, including the `-----BEGIN PRIVATE KEY-----` lines |
  | `ANDROID_PLAY_SERVICE_ACCOUNT_JSON`      | Full JSON contents from Step 2               |

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

## Task 4: Extract reusable validate workflow

The existing `ci.yml` does install + typecheck + lint + test. Tasks 5 and 6 need the same validation before triggering a build. Extract it.

**Files:**
- Create: `.github/workflows/_validate.yml`
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `.github/workflows/_validate.yml`**

  ```yaml
  name: _validate

  on:
    workflow_call:

  jobs:
    validate:
      name: Build, Typecheck, Lint & Test
      runs-on: ubuntu-latest
      steps:
        - name: Checkout
          uses: actions/checkout@v6

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

        - name: Typecheck
          run: bun run type-check

        - name: Lint
          run: bun run lint

        - name: Test
          run: bun run test
  ```

  Leading underscore convention signals "internal / not directly triggered."

- [ ] **Step 2: Replace `.github/workflows/ci.yml` body with a caller**

  Open `.github/workflows/ci.yml` and replace its contents with:

  ```yaml
  # Validation contract: docs/architecture/ci-contract.md
  name: CI

  on:
    pull_request:
      paths-ignore:
        - "**/*.md"
        - "docs/**"
        - "apps/*/docs/**"
        - "apps/*/research/**"
        - "apps/*/prototypes/**"
        - ".github/PULL_REQUEST_TEMPLATE.md"
    push:
      branches: [main]

  concurrency:
    group: ${{ github.workflow }}-${{ github.ref }}
    cancel-in-progress: true

  jobs:
    validate:
      uses: ./.github/workflows/_validate.yml
  ```

- [ ] **Step 3: Lint both workflows**

  `actionlint .github/workflows/ci.yml .github/workflows/_validate.yml`. Expected: no output.

- [ ] **Step 4: Verify ci-contract.md still describes reality**

  Read `docs/architecture/ci-contract.md` (referenced from `ci.yml` line 1). If it documents specific job step names or shapes, update it to point at `_validate.yml` for the validation contract. If it doesn't exist or is generic enough to remain accurate, leave it alone.

- [ ] **Step 5: Commit**

  ```bash
  git add .github/workflows/_validate.yml .github/workflows/ci.yml
  # Add docs/architecture/ci-contract.md too if you updated it in Step 4
  git commit -s -m "ci: extract reusable _validate workflow; ci.yml becomes a caller"
  ```

- [ ] **Step 6: Verify after merge**

  Open a no-op PR (or rely on this PR) and confirm the CI run still shows install + typecheck + lint + test as expected.

---

## Task 5: Internal build + submit workflow (push to `main`)

On every push to `main`, build the `preview` EAS profile and submit to TestFlight internal + Play internal track.

**Files:**
- Create: `.github/workflows/build-internal.yml`

- [ ] **Step 1: Create `.github/workflows/build-internal.yml`**

  ```yaml
  name: build-internal

  on:
    push:
      branches: [main]
      paths:
        - "apps/native-rd/**"
        - "packages/**"
        - ".github/workflows/build-internal.yml"
        - ".github/workflows/_validate.yml"
        - "bun.lock"
    workflow_dispatch:

  concurrency:
    group: build-internal
    cancel-in-progress: false

  jobs:
    validate:
      uses: ./.github/workflows/_validate.yml

    build-and-submit:
      needs: validate
      runs-on: ubuntu-latest
      defaults:
        run:
          working-directory: apps/native-rd
      steps:
        - name: Checkout
          uses: actions/checkout@v6

        - name: Setup Bun
          uses: oven-sh/setup-bun@v2
          with:
            bun-version-file: "package.json"

        - name: Setup Node
          uses: actions/setup-node@v6
          with:
            node-version: 22

        - name: Install dependencies
          run: bun install --frozen-lockfile
          working-directory: .

        - name: Write credential files
          run: |
            mkdir -p ../../secrets
            printf '%s' "${{ secrets.APPLE_ASC_KEY_P8 }}" > ../../secrets/asc-api-key.p8
            printf '%s' "${{ secrets.ANDROID_PLAY_SERVICE_ACCOUNT_JSON }}" > ../../secrets/play-service-account.json
            chmod 600 ../../secrets/asc-api-key.p8 ../../secrets/play-service-account.json

        - name: Build (EAS, preview profile, both platforms)
          env:
            EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
            SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          run: npx eas-cli@latest build --profile preview --platform all --non-interactive --no-wait

        - name: Submit (EAS, preview profile, both platforms — latest finished build)
          env:
            EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
            APPLE_ASC_KEY_ID: ${{ secrets.APPLE_ASC_KEY_ID }}
            APPLE_ASC_ISSUER_ID: ${{ secrets.APPLE_ASC_ISSUER_ID }}
          run: npx eas-cli@latest submit --profile preview --platform all --latest --non-interactive --wait
  ```

  Notes:
  - `--no-wait` on build lets the GH job finish fast; EAS continues the build in the cloud.
  - `--wait` on submit means we wait for the build to finish + submit to complete; this is the slow step but it's what gives us pass/fail on submission.
  - `concurrency: cancel-in-progress: false` because cancelling a half-finished store submission can leave a dangling upload.
  - The path filter skips builds when only docs change.

- [ ] **Step 2: Lint**

  `actionlint .github/workflows/build-internal.yml`. Expected: no output.

- [ ] **Step 3: Dry-run via `workflow_dispatch`**

  After the PR with this file merges to `main`, go to Actions → build-internal → "Run workflow" → run on `main`. Expected: validate passes; build kicks off in EAS; you see the EAS dashboard link in the logs; submit eventually succeeds, with the build appearing in TestFlight internal and Play internal.

  If submit fails on iOS with "no API key": secret `APPLE_ASC_KEY_P8` is wrong format (missing `-----BEGIN`/`-----END` lines or stray whitespace).

  If submit fails on Android with "no service account": secret `ANDROID_PLAY_SERVICE_ACCOUNT_JSON` is wrong format (not valid JSON, or missing newlines that `printf '%s'` would otherwise preserve).

- [ ] **Step 4: Commit**

  ```bash
  git add .github/workflows/build-internal.yml
  git commit -s -m "ci(release): add internal build+submit workflow (preview profile, on push to main)"
  ```

---

## Task 6: Production build + submit workflow (tag `v*.*.*`)

On every `v*.*.*` tag (created when release-please's PR merges), build the `production` EAS profile, submit to TestFlight external + Play production at 10% rollout, and finalize the Sentry release.

**Files:**
- Create: `.github/workflows/build-production.yml`

- [ ] **Step 1: Create `.github/workflows/build-production.yml`**

  ```yaml
  name: build-production

  on:
    push:
      tags: ["v*.*.*"]
    workflow_dispatch:
      inputs:
        ref:
          description: "Git ref to build (tag or commit SHA)"
          required: true

  concurrency:
    group: build-production
    cancel-in-progress: false

  jobs:
    validate:
      uses: ./.github/workflows/_validate.yml

    build-and-submit:
      needs: validate
      runs-on: ubuntu-latest
      defaults:
        run:
          working-directory: apps/native-rd
      steps:
        - name: Checkout
          uses: actions/checkout@v6
          with:
            ref: ${{ inputs.ref || github.ref }}

        - name: Setup Bun
          uses: oven-sh/setup-bun@v2
          with:
            bun-version-file: "package.json"

        - name: Setup Node
          uses: actions/setup-node@v6
          with:
            node-version: 22

        - name: Install dependencies
          run: bun install --frozen-lockfile
          working-directory: .

        - name: Read version
          id: version
          run: echo "value=$(jq -r .version package.json)" >> "$GITHUB_OUTPUT"

        - name: Write credential files
          run: |
            mkdir -p ../../secrets
            printf '%s' "${{ secrets.APPLE_ASC_KEY_P8 }}" > ../../secrets/asc-api-key.p8
            printf '%s' "${{ secrets.ANDROID_PLAY_SERVICE_ACCOUNT_JSON }}" > ../../secrets/play-service-account.json
            chmod 600 ../../secrets/asc-api-key.p8 ../../secrets/play-service-account.json

        - name: Build (EAS, production profile, both platforms)
          env:
            EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
            SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          run: npx eas-cli@latest build --profile production --platform all --non-interactive --no-wait

        - name: Submit (EAS, production profile, both platforms — 10% Android rollout)
          env:
            EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
            APPLE_ASC_KEY_ID: ${{ secrets.APPLE_ASC_KEY_ID }}
            APPLE_ASC_ISSUER_ID: ${{ secrets.APPLE_ASC_ISSUER_ID }}
          run: npx eas-cli@latest submit --profile production --platform all --latest --non-interactive --wait

        - name: Finalize Sentry release
          env:
            SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
            SENTRY_ORG: rollercoaster-dev
            SENTRY_PROJECT: native-rd
            RELEASE_VERSION: ${{ steps.version.outputs.value }}
          run: |
            npx --yes @sentry/cli@latest releases finalize "$RELEASE_VERSION"
            npx --yes @sentry/cli@latest releases deploys "$RELEASE_VERSION" new --env production
  ```

  Notes:
  - The `SENTRY_ORG` and `SENTRY_PROJECT` values match what's already in `app.json`'s `@sentry/react-native/expo` plugin block. Verify by running `jq '.expo.plugins[] | select(.[0] == "@sentry/react-native/expo")' apps/native-rd/app.json` before committing. If they differ, update the workflow.
  - The iOS App Store submission only uploads to App Store Connect; releasing the build to the App Store still requires manual "Submit for Review" + phased release in ASC. That's deliberate (research doc § Staged rollout).
  - Android starts at 10% (`rollout: 0.1` in `eas.json`). Advancing to higher percentages is a manual `eas submit:rollout` (or Play Console) action after 24–48h of Sentry monitoring.

- [ ] **Step 2: Lint**

  `actionlint .github/workflows/build-production.yml`. Expected: no output.

- [ ] **Step 3: Verify Sentry org/project before first production tag**

  Run from repo root:

  ```bash
  jq '.expo.plugins[] | select(type == "array" and .[0] == "@sentry/react-native/expo")' apps/native-rd/app.json
  ```

  Expected output contains `"organization": "rollercoaster-dev"` and `"project": "native-rd"` (or similar). If different values appear, update the `SENTRY_ORG` / `SENTRY_PROJECT` env in `build-production.yml` to match before committing.

- [ ] **Step 4: Commit**

  ```bash
  git add .github/workflows/build-production.yml
  git commit -s -m "ci(release): add production build+submit workflow (on v*.*.* tag, 10% Android rollout, Sentry release finalize)"
  ```

- [ ] **Step 5: Smoke-test via `workflow_dispatch` before relying on tags**

  After merge to `main`: Actions → build-production → "Run workflow" → input `ref` = `main` (or a specific SHA). Watch validate → EAS build → submit. **Do not** run this against a real version if you're not ready to ship — `eas submit --profile production` will actually upload to App Store Connect and Play. If you want to dry-run, change `--profile production` to `--profile preview` temporarily, or use a dedicated `--profile production-dryrun` profile (out of scope for this plan).

---

## Task 7: Document the pipeline

The pipeline isn't useful if the next person (you in three months) has to reverse-engineer it.

**Files:**
- Create: `apps/native-rd/docs/release.md`
- Modify: `apps/native-rd/CLAUDE.md` (add one link line)
- Modify: `apps/native-rd/docs/plans/index.md` (add this plan)

- [ ] **Step 1: Create `apps/native-rd/docs/release.md`**

  ```markdown
  # Release Runbook

  **Last verified:** 2026-05-14

  ## Pipeline at a glance

  | Track       | Trigger                              | Workflow                       | EAS profile   | Destination                         |
  | ----------- | ------------------------------------ | ------------------------------ | ------------- | ----------------------------------- |
  | Internal    | Push to `main`                       | `build-internal.yml`           | `preview`     | TestFlight internal + Play internal |
  | Production  | Tag `v*.*.*` (release-please merge)  | `build-production.yml`         | `production`  | TestFlight ext + Play prod (10%)    |
  | Dev (rare)  | `workflow_dispatch` on build-internal | `build-internal.yml`           | `preview`     | TestFlight internal                 |

  ## Cutting a production release

  1. Wait for release-please to open or update the "chore(main): release native-rd X.Y.Z" PR.
     - It's based on conventional-commit prefixes since the last tag: `feat:` → minor, `fix:` → patch, `BREAKING CHANGE:` → major.
     - If the PR isn't there, no qualifying commits have landed.
  2. Review the PR. The diff bumps `apps/native-rd/package.json`, `apps/native-rd/app.json` (`expo.version`), and `apps/native-rd/CHANGELOG.md`.
  3. Merge the PR. release-please pushes the `vX.Y.Z` tag and creates a GitHub Release.
  4. `build-production` workflow fires automatically on the tag. Watch it in Actions.
  5. After EAS finishes:
     - iOS: build appears in App Store Connect → TestFlight. External testers get it automatically (if the build is in a beta group with auto-distribution). The App Store release still requires manual "Submit for Review" + phased release in ASC.
     - Android: build appears in Play Console → Production at 10% rollout. Watch Sentry for 24–48h, then advance via `npx eas-cli submit:rollout --platform android` or directly in Play Console.

  ## Advancing the Android rollout

  ```bash
  cd apps/native-rd
  # Bumps the current production rollout to the given fraction
  npx eas-cli@latest submit:rollout --platform android --track production --rollout 0.5
  npx eas-cli@latest submit:rollout --platform android --track production --rollout 1.0
  ```

  Or use Play Console → Release management → Production → "Edit release".

  ## Rolling back

  - **Android:** Play Console → Production → halt rollout (keeps current users on the halted version; new installs continue to get the previous version). Then ship a fixed `v*.*.*` ASAP — Play doesn't allow shipping a lower versionCode.
  - **iOS:** App Store Connect → "Remove from sale" only blocks new downloads; existing installs are unaffected. Ship a fixed `v*.*.*` and request expedited review if critical.

  ## Manual build (any profile)

  Actions → `build-internal` (preview) or `build-production` (prod) → "Run workflow". `build-production` accepts a `ref` input (tag or SHA).

  ## Required secrets

  See `docs/research/release-pipeline.md` § Secrets. All six are stored as GitHub repo secrets.

  ## Failure modes

  - **EAS build fails:** check the EAS dashboard link in the workflow log. Most failures are JS/native compile errors that reproduce locally with `npx expo run:ios --configuration Release`.
  - **iOS submit fails with "no API key":** `APPLE_ASC_KEY_P8` secret is malformed (missing `-----BEGIN`/`-----END` lines).
  - **Android submit fails with "no service account":** `ANDROID_PLAY_SERVICE_ACCOUNT_JSON` secret is malformed (not valid JSON).
  - **Sentry finalize fails:** the build still shipped; finalize is metadata-only. Run `npx @sentry/cli releases finalize <version>` manually.
  ```

- [ ] **Step 2: Add a link line to `apps/native-rd/CLAUDE.md`**

  In the existing `Commands` section, after the table, add:

  ```markdown
  **Releasing?** See `docs/release.md` for the pipeline + runbook.
  ```

  Place it right above the existing `**Any build target?**` line.

- [ ] **Step 3: Add this plan to `docs/plans/index.md`**

  Append a row to the Active table (the table ends before the "## Reference" heading):

  ```markdown
  | [2026-05-14-release-pipeline.md](./2026-05-14-release-pipeline.md)                                                                                              | Build automated iOS+Android release pipeline (EAS + GH Actions + release-please) | 2026-05-14    |
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add apps/native-rd/docs/release.md apps/native-rd/CLAUDE.md apps/native-rd/docs/plans/index.md
  git commit -s -m "docs(native-rd): release runbook + plan index entry"
  ```

---

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
