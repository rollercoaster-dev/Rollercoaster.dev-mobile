# Release Pipeline Internal Testing Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconcile the release pipeline with the current distribution policy: direct-install preview builds stay outside the stores, tagged iOS releases go to TestFlight, and Android store builds go to Google Play internal testing until production access is intentionally enabled.

**Architecture:** Keep the three existing operator paths, but give each one a single responsibility. `build-internal.yml` builds installable preview artifacts without store submission; `build-play-internal.yml` builds a fresh production AAB and submits it to Play internal; `build-production.yml` builds tagged production artifacts, submits iOS to App Store Connect/TestFlight, and temporarily submits Android to Play internal. EAS submit profiles encode those destinations explicitly, while the runbook and CI contract describe the same behavior.

**Tech Stack:** GitHub Actions, Expo EAS Build and Submit, `eas.json`, release-please, App Store Connect/TestFlight, Google Play internal testing, Sentry CLI.

**Issue:** [#90](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/90)

---

## Current Evidence

- The original issue assumed Android should use a formal Play closed-testing
  track (`alpha` or `beta`). That is no longer the project decision.
- `apps/native-rd/eas.json` currently routes Android submissions to Play
  `internal`. Commit `8d919a8` records that this is temporary while production
  access is pending.
- `build-production` run
  [27096223782](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/actions/runs/27096223782)
  succeeded on 2026-06-07 for tag `v0.1.14`:
  - iOS production build `01618bff-49be-4fe8-a748-7c9fc28e0163` was submitted
    to App Store Connect/TestFlight.
  - Android production build `22930d94-95b4-4039-9fd4-ceec910a81a5` was
    submitted to Play track `internal` with release status `COMPLETED`.
- The only `build-play-internal` run,
  [26003881842](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/actions/runs/26003881842),
  failed before commit `27c03fe` added dependency installation to its submit
  job. The corrected dedicated workflow has not had a recorded rerun.
- `build-internal.yml` still contains submit jobs even though its `preview`
  profile creates EAS internal-distribution artifacts: an ad-hoc iOS build and
  an Android APK.

## File Structure

- Modify: `.github/workflows/build-internal.yml` - make the workflow build-only
  for direct installation.
- Modify: `.github/workflows/build-production.yml` - make the Android submit
  label and comments accurately name Play internal testing.
- Modify: `apps/native-rd/eas.json` - remove the misleading preview submit
  profile and define the Play internal submit profile directly.
- Modify: `apps/native-rd/docs/release.md` - document actual destinations,
  remove inactive production-rollout instructions, and record run evidence.
- Modify: `docs/architecture/ci-contract.md` - enumerate all three release
  workflows and their real triggers/responsibilities.
- Modify: `apps/native-rd/docs/research/release-pipeline.md` - mark the 2026-05-14
  recommendation as historical and point readers to the current runbook.
- Modify: `apps/native-rd/docs/plans/index.md` - register this active plan.
- Update: GitHub issue `#90` - use the current TestFlight and Play internal
  acceptance criteria.

No application source code, database schema, or user-facing runtime behavior
changes in this work.

## Task 1: Make direct-install builds build-only

**Files:**

- Modify: `.github/workflows/build-internal.yml`
- Modify: `apps/native-rd/eas.json`

- [ ] **Step 1: Add a failing structural check for the current mismatch**

  Run from the repository root:

  ```bash
  if rg -n 'submit-(ios|android)|eas-cli@.* submit ' \
    .github/workflows/build-internal.yml; then
    echo "FAIL: build-internal still contains store submission jobs"
    exit 1
  fi
  ```

  Expected before editing: the command prints the `submit-ios` and
  `submit-android` sections and exits `1`.

- [ ] **Step 2: Remove both submit jobs from `build-internal.yml`**

  Delete the complete `submit-ios` and `submit-android` jobs. Keep
  `validate`, `build-ios`, and `build-android`.

  Change the workflow input description from:

  ```yaml
  description: "Platform to build and submit."
  ```

  to:

  ```yaml
  description: "Platform to build for direct installation."
  ```

  Update the header comment to state that the workflow creates EAS
  internal-distribution artifacts and does not upload them to either store.

- [ ] **Step 3: Remove the unused preview submit profile**

  In `apps/native-rd/eas.json`, replace:

  ```json
  "preview": {
    "ios": {
      "ascAppId": "6766029904",
      "appleTeamId": "86VL756N99",
      "ascApiKeyPath": "../../secrets/asc-api-key.p8",
      "ascApiKeyId": "$APPLE_ASC_KEY_ID",
      "ascApiKeyIssuerId": "$APPLE_ASC_ISSUER_ID"
    },
    "android": {
      "serviceAccountKeyPath": "../../secrets/play-service-account.json",
      "track": "internal"
    }
  },
  "play-internal": {
    "extends": "preview"
  }
  ```

  with:

  ```json
  "play-internal": {
    "android": {
      "serviceAccountKeyPath": "../../secrets/play-service-account.json",
      "track": "internal"
    }
  }
  ```

  This removes the configuration path that implied preview artifacts were
  valid store submissions. It leaves `build-play-internal.yml` with a
  self-contained Android submit profile.

- [ ] **Step 4: Run the structural and JSON checks**

  ```bash
  if rg -n 'submit-(ios|android)|eas-cli@.* submit ' \
    .github/workflows/build-internal.yml; then
    echo "FAIL: build-internal still contains store submission jobs"
    exit 1
  fi

  jq -e '
    (.submit | has("preview") | not) and
    (.submit["play-internal"].android.track == "internal") and
    (.build.preview.distribution == "internal") and
    (.build.preview.android.buildType == "apk")
  ' apps/native-rd/eas.json
  ```

  Expected: no `rg` matches; `jq` prints `true`; both commands exit `0`.

- [ ] **Step 5: Validate workflow YAML**

  ```bash
  ruby -e 'require "yaml"; YAML.load_file(".github/workflows/build-internal.yml"); puts "OK"'
  ```

  Expected: `OK`.

- [ ] **Step 6: Commit**

  ```bash
  git add .github/workflows/build-internal.yml apps/native-rd/eas.json
  git commit -s -m "fix(release): keep direct-install builds out of app stores"
  ```

## Task 2: Make the tagged release workflow describe its real destination

**Files:**

- Modify: `.github/workflows/build-production.yml`

- [ ] **Step 1: Add a failing check for stale rollout language**

  ```bash
  if rg -n '10% rollout|Play production|Production at 10%' \
    .github/workflows/build-production.yml; then
    echo "FAIL: workflow still claims Android production rollout"
    exit 1
  fi
  ```

  Expected before editing: the Android submit step matches and the command
  exits `1`.

- [ ] **Step 2: Correct the Android submit step label**

  Replace:

  ```yaml
  - name: Submit (EAS, production profile, Android, 10% rollout)
  ```

  with:

  ```yaml
  - name: Submit (EAS production build to Google Play internal testing)
  ```

  Add this comment immediately above the submit command:

  ```yaml
  # The EAS build profile is production because Play requires an AAB.
  # The submit profile currently routes Android to Play internal testing;
  # change eas.json only when production access is intentionally enabled.
  ```

- [ ] **Step 3: Run the stale-language and destination checks**

  ```bash
  ! rg -n '10% rollout|Play production|Production at 10%' \
    .github/workflows/build-production.yml

  jq -e '.submit.production.android == {
    "serviceAccountKeyPath": "../../secrets/play-service-account.json",
    "track": "internal"
  }' apps/native-rd/eas.json
  ```

  Expected: the first command has no matches and the second prints `true`.

- [ ] **Step 4: Validate workflow YAML**

  ```bash
  ruby -e 'require "yaml"; YAML.load_file(".github/workflows/build-production.yml"); puts "OK"'
  ```

  Expected: `OK`.

- [ ] **Step 5: Commit**

  ```bash
  git add .github/workflows/build-production.yml
  git commit -s -m "docs(ci): label Android release submission as Play internal"
  ```

## Task 3: Rewrite the release runbook around current behavior

**Files:**

- Modify: `apps/native-rd/docs/release.md`
- Modify: `docs/architecture/ci-contract.md`
- Modify: `apps/native-rd/docs/research/release-pipeline.md`

- [ ] **Step 1: Update the release matrix**

  In `apps/native-rd/docs/release.md`, make the matrix describe:

  | Track                 | Workflow                  | Build profile | Submit profile  | Destination                       |
  | --------------------- | ------------------------- | ------------- | --------------- | --------------------------------- |
  | Direct install        | `build-internal.yml`      | `preview`     | None            | EAS internal distribution         |
  | Play internal testing | `build-play-internal.yml` | `production`  | `play-internal` | Google Play internal              |
  | Tagged tester release | `build-production.yml`    | `production`  | `production`    | TestFlight + Google Play internal |

  Keep both `release: published` and manual dispatch as triggers for the
  tagged tester release.

- [ ] **Step 2: Correct the direct-install instructions**

  Replace the instruction to watch build and submit jobs with an instruction
  to watch release validation followed by the selected EAS build jobs.

  State explicitly:

  ```markdown
  This workflow never submits to App Store Connect or Google Play. Its iOS
  artifact is ad-hoc provisioned and its Android artifact is an APK, both for
  direct installation only.
  ```

- [ ] **Step 3: Replace the production-rollout section**

  Rename `Cutting a production release` to `Cutting a tagged tester release`.
  Explain that:
  - iOS uploads to App Store Connect and becomes available through TestFlight.
  - Android uploads to Play internal testing.
  - `production` is the EAS build profile name and guarantees store-shaped
    artifacts; it does not currently mean Play production rollout.
  - App Store release and Play production rollout remain manual future work.

  Delete the complete `Advancing the Android rollout` section and replace it
  with:

  ```markdown
  ## Enabling public store release later

  The automated pipeline does not currently release Android to Play
  production or submit an iOS version for App Store review. When production
  access is intentionally enabled:

  1. Open a dedicated issue and review current store-account readiness.
  2. Change `submit.production.android.track` only in that reviewed change.
  3. Add an explicit rollout policy and rollback procedure before enabling it.
  4. Update this runbook and capture a successful production-track run.
  ```

- [ ] **Step 4: Correct rollback and failure language**

  Replace Android production rollback instructions with Play internal tester
  recovery:

  ```markdown
  - **Android internal testing:** stop distributing the affected release to
    testers in Play Console and upload a fixed build with a higher versionCode.
  ```

  Keep the existing iOS guidance, but distinguish removing a TestFlight build
  from withdrawing a public App Store release.

- [ ] **Step 5: Record existing successful evidence**

  Replace the empty evidence table with these known rows:

  | Date       | Workflow           | Ref/tag   | Platform | Evidence                                                                    | Result  | Notes                                            |
  | ---------- | ------------------ | --------- | -------- | --------------------------------------------------------------------------- | ------- | ------------------------------------------------ |
  | 2026-06-07 | `build-production` | `v0.1.14` | iOS      | EAS build `01618bff-49be-4fe8-a748-7c9fc28e0163`; Actions run `27096223782` | Success | Submitted to App Store Connect/TestFlight        |
  | 2026-06-07 | `build-production` | `v0.1.14` | Android  | EAS build `22930d94-95b4-4039-9fd4-ceec910a81a5`; Actions run `27096223782` | Success | Submitted to Play `internal`, status `COMPLETED` |

  Add a sentence below the table that issue #90 remains open until a current
  `build-play-internal` run is recorded.

- [ ] **Step 6: Correct the CI contract**

  In `docs/architecture/ci-contract.md`, replace the combined release-workflow
  row with three explicit rows:
  - `build-internal`: manual, direct-install preview builds, no submit.
  - `build-play-internal`: manual, production AAB to Play internal.
  - `build-production`: published Release or manual dispatch, TestFlight and
    Play internal while public production access remains disabled.

  Keep the shared `_release-validate.yml` explanation.

- [ ] **Step 7: Mark the research document as historical**

  Add this note below the metadata in
  `apps/native-rd/docs/research/release-pipeline.md`:

  ```markdown
  > Historical design record. The implemented pipeline has changed since this
  > recommendation, especially Android's temporary Play internal destination.
  > Use `apps/native-rd/docs/release.md` as the operational source of truth.
  ```

  Do not rewrite the historical recommendation.

- [ ] **Step 8: Check for stale operational claims**

  ```bash
  ! rg -n 'Play prod|Production at 10%|track production|--track production|--rollout' \
    apps/native-rd/docs/release.md \
    .github/workflows/build-production.yml

  rg -n 'Play internal|TestFlight|direct install|does not currently release' \
    apps/native-rd/docs/release.md
  ```

  Expected: the first command has no matches. The second prints the updated
  operational language.

- [ ] **Step 9: Run formatting**

  ```bash
  bunx prettier --write \
    apps/native-rd/docs/release.md \
    docs/architecture/ci-contract.md \
    apps/native-rd/docs/research/release-pipeline.md

  bunx prettier --check \
    apps/native-rd/docs/release.md \
    docs/architecture/ci-contract.md \
    apps/native-rd/docs/research/release-pipeline.md
  ```

  Expected: the check reports all three files formatted.

- [ ] **Step 10: Commit**

  ```bash
  git add \
    apps/native-rd/docs/release.md \
    docs/architecture/ci-contract.md \
    apps/native-rd/docs/research/release-pipeline.md
  git commit -s -m "docs(release): document TestFlight and Play internal pipeline"
  ```

## Task 4: Run local release configuration verification

**Files:** None.

- [ ] **Step 1: Parse every release workflow**

  ```bash
  ruby -e '
    require "yaml"
    %w[
      .github/workflows/_release-validate.yml
      .github/workflows/build-internal.yml
      .github/workflows/build-play-internal.yml
      .github/workflows/build-production.yml
    ].each { |file| YAML.load_file(file); puts "OK #{file}" }
  '
  ```

  Expected: four `OK` lines.

- [ ] **Step 2: Assert the EAS distribution contract**

  ```bash
  jq -e '
    (.build.preview.distribution == "internal") and
    (.build.preview.android.buildType == "apk") and
    (.build.production.android.buildType == "app-bundle") and
    (.build.production.autoIncrement == true) and
    (.submit | has("preview") | not) and
    (.submit["play-internal"].android.track == "internal") and
    (.submit.production.android.track == "internal")
  ' apps/native-rd/eas.json
  ```

  Expected: `true`.

- [ ] **Step 3: Run the release preflight locally**

  ```bash
  bun run format:check
  bun run type-check
  bun run lint
  bun run test
  ```

  Expected: all commands exit `0`.

- [ ] **Step 4: Inspect the complete diff**

  ```bash
  git diff --check
  git status --short
  git log --oneline -3
  ```

  Expected: no whitespace errors; only intended files are changed; the three
  implementation commits are present.

## Task 5: Prove the dedicated Play internal workflow

**Files:**

- Modify after the run: `apps/native-rd/docs/release.md`

- [ ] **Step 1: Push the implementation branch**

  ```bash
  git push --set-upstream origin "$(git branch --show-current)"
  ```

  Expected: the branch is available on origin.

- [ ] **Step 2: Dispatch `build-play-internal` against the branch**

  `workflow_dispatch` uses the workflow definition on `main`; its `ref` input
  tells every job which implementation commit to validate and build.

  ```bash
  BRANCH="$(git branch --show-current)"
  gh workflow run build-play-internal.yml \
    --repo rollercoaster-dev/Rollercoaster.dev-mobile \
    --ref main \
    -f ref="$BRANCH"
  ```

  Expected: GitHub accepts the dispatch.

- [ ] **Step 3: Capture and watch the run**

  ```bash
  sleep 5
  RUN_ID="$(
    gh run list \
      --repo rollercoaster-dev/Rollercoaster.dev-mobile \
      --workflow build-play-internal.yml \
      --event workflow_dispatch \
      --limit 1 \
      --json databaseId \
      --jq '.[0].databaseId'
  )"
  test -n "$RUN_ID"
  gh run watch "$RUN_ID" \
    --repo rollercoaster-dev/Rollercoaster.dev-mobile \
    --exit-status
  ```

  Expected: validation, Android build, and Android submit all succeed.

- [ ] **Step 4: Verify the actual store destination from logs**

  ```bash
  gh run view "$RUN_ID" \
    --repo rollercoaster-dev/Rollercoaster.dev-mobile \
    --log |
    rg 'Release track:|Release status:|Build ID|Submitted your app to Google Play Store'
  ```

  Expected output includes:

  ```text
  Release track:                  internal
  Release status:                 COMPLETED
  Submitted your app to Google Play Store!
  ```

- [ ] **Step 5: Record the run evidence**

  Get the Actions URL:

  ```bash
  ACTIONS_URL="$(
    gh run view "$RUN_ID" \
      --repo rollercoaster-dev/Rollercoaster.dev-mobile \
      --json url \
      --jq .url
  )"
  printf '%s\n' "$ACTIONS_URL"
  ```

  Extract the EAS build URL and build ID:

  ```bash
  gh run view "$RUN_ID" \
    --repo rollercoaster-dev/Rollercoaster.dev-mobile \
    --log |
    rg 'See logs: https://expo.dev/.*/builds/|Build ID'
  ```

  Append one row to the evidence table in
  `apps/native-rd/docs/release.md` with:
  - the UTC run date from `gh run view "$RUN_ID" --json createdAt`;
  - workflow `build-play-internal`;
  - the tested branch or commit SHA;
  - platform `Android`;
  - the exact Actions URL and EAS build ID;
  - result `Success`;
  - note `Submitted fresh production AAB to Play internal`.

  Remove the sentence saying this verification is still pending and update
  `Last verified` to the run date.

- [ ] **Step 6: Format and commit the evidence**

  ```bash
  bunx prettier --write apps/native-rd/docs/release.md
  bunx prettier --check apps/native-rd/docs/release.md
  git add apps/native-rd/docs/release.md
  git commit -s -m "docs(release): record Play internal workflow evidence"
  git push
  ```

  Expected: formatting passes and the evidence commit is pushed.

## Task 6: Close the issue with verifiable acceptance evidence

**Files:** None.

- [ ] **Step 1: Confirm the issue acceptance criteria against the branch**

  ```bash
  ! rg -n 'submit-(ios|android)|eas-cli@.* submit ' \
    .github/workflows/build-internal.yml

  jq -e '
    (.build.production.android.buildType == "app-bundle") and
    (.build.production.autoIncrement == true) and
    (.submit["play-internal"].android.track == "internal") and
    (.submit.production.android.track == "internal")
  ' apps/native-rd/eas.json

  ! rg -n 'Play prod|Production at 10%|--track production|--rollout' \
    apps/native-rd/docs/release.md \
    .github/workflows/build-production.yml
  ```

  Expected: all commands exit `0`.

- [ ] **Step 2: Add the implementation PR and run links to issue #90**

  Post a concise issue comment containing:
  - the merged PR URL;
  - the successful `build-play-internal` Actions URL;
  - the EAS Android build ID;
  - confirmation that `build-internal` is build-only;
  - confirmation that tagged releases currently target TestFlight and Play
    internal.

- [ ] **Step 3: Close issue #90**

  Close the issue only after the implementation PR is merged and the dedicated
  Play internal run is green.

## Final Verification

- [ ] `build-internal.yml` has no credentials or submit jobs.
- [ ] `submit.preview` no longer exists.
- [ ] `play-internal` directly targets Play `internal`.
- [ ] Android store builds use production AABs with remote auto-increment.
- [ ] `build-production` accurately labels Android's Play internal destination.
- [ ] The runbook contains no active Play production rollout instructions.
- [ ] The CI contract lists all release workflows accurately.
- [ ] Existing successful TestFlight and Play internal evidence is recorded.
- [ ] A new successful `build-play-internal` run is recorded.
- [ ] Issue #90 links the implementation and verification evidence before
      closure.
