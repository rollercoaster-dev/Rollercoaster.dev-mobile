# Development Plan: Issue #609

## Issue Summary

**Title**: Make CI honest: delete the dead workflow, fix or remove Codecov, reconcile ci-contract.md
**Type**: tech-debt / CI
**Complexity**: MEDIUM
**Estimated Lines**: ~350 lines changed (mostly deletions + doc table edits)

Absorbs **#256** (dedupe redundant `format:check` across `ci-docs` / `ci-native-rd` / `ci-packages`). Part of milestone **#601** (PTF submission readiness), due 2026-09-30.

## Intent Verification

- [ ] `gh workflow list --all` shows no `disabled_manually` entries — `.github/workflows/codeql.yml` is `active` and a `workflow_dispatch` run on the PR branch is green
- [ ] The `ci-native-rd` job never reports success while a step inside it logged a failure (no more `continue-on-error: true` masking a broken Codecov upload)
- [ ] A PR's `ci-native-rd` run shows a coverage table in the GitHub Actions job summary and a downloadable `coverage-native-rd` artifact, with zero calls to codecov.io
- [ ] A PR touching only a `.ts`/`.md`/`.json` file anywhere in the repo runs `format:check` exactly once (not 2-3×)
- [ ] `docs/architecture/ci-contract.md` lists every file under `.github/workflows/` (or explicitly notes its deletion) with the actual `uses:` version pinned in the tree
- [ ] `build-play-internal.yml` is gone and `docs/architecture/ci-contract.md` no longer references it

## Dependencies

| Issue | Title                                  | Status                                               | Type     |
| ----- | -------------------------------------- | ---------------------------------------------------- | -------- |
| #256  | ci: consolidate redundant format:check | ✅ Open, absorbed by #609 (no separate merge needed) | Absorbed |
| #601  | PTF submission readiness epic          | ✅ Open (parent epic, not a blocker)                 | Soft     |

**Status**: ✅ All dependencies met (no hard blockers; #256 is closed by this PR's scope, not by waiting on it).

## Objective

Make every file in `.github/workflows/` either genuinely running or deleted, remove the dead Codecov integration in favor of an honest in-CI coverage summary, dedupe the triplicated `format:check` step, and bring `docs/architecture/ci-contract.md` back in sync with the tree — versions, workflow list, and the coverage story all verified against live GitHub state as of 2026-09-03.

## Decisions

| ID  | Decision                                                                                                                                                                                                                         | Alternatives Considered                                                                          | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **Revised during implementation:** re-enable `.github/workflows/codeql.yml` (`gh workflow enable`) and add `workflow_dispatch` so the re-enable can be verified on demand; do not delete it                                      | Delete the workflow and rely on default setup (the issue's suggestion)                           | The issue's premise is false: `code-scanning/default-setup` reports `not-configured` and the analyses API shows the last scan of any kind on 2026-06-03. Deleting the file would leave zero scanning. Re-enabling is the only option that satisfies "exactly one must be live" without an admin Settings toggle                                                                                                                                                                                                        |
| D2  | Delete the Codecov step + its ci-contract.md section; publish coverage via `$GITHUB_STEP_SUMMARY` + artifact upload                                                                                                              | Provision `CODECOV_TOKEN`                                                                        | No token exists (`gh secret list` confirms), provisioning requires a human to create a codecov.io account/link the repo — out of scope for an autonomous CI-honesty pass. A job summary is zero-dependency and already-honest                                                                                                                                                                                                                                                                                          |
| D3  | Rename `ci-docs.yml` → `ci-format.yml`, broaden its trigger to the full `**/*.{ts,tsx,js,jsx,json,md}` glob (matching `format:check`'s own target), remove the `Format check` step from `ci-native-rd.yml` and `ci-packages.yml` | New separate `ci-format.yml` alongside keeping `ci-docs.yml`; dedupe into `ci-native-rd` instead | `ci-docs.yml` is already the single-purpose, fast, no-toolchain format job — renaming in place (not adding a new file) keeps the workflow count flat. Confirmed via `gh api .../branches/main/protection` → 404 "Branch not protected", so no required-status-check name is broken by the rename                                                                                                                                                                                                                       |
| D4  | Delete `build-play-internal.yml`; do not run it                                                                                                                                                                                  | Keep it as a distinct manual "Play-only" path; run it once to verify before deleting             | `build-production.yml`'s `submit-android` step already builds with the `production` EAS profile and submits to Google Play internal testing (`eas.json` `submit.production.android.track: "internal"` — identical track to `submit.play-internal`). `gh workflow run build-production.yml -f ref=<tag> -f platform=android` reproduces build-play-internal's entire behavior. Deletion is justified by file contents alone per the task brief; verification is left as a human step (EAS credits, not agent-triggered) |
| D5  | Do not touch branch protection settings or toggle CodeQL default setup via API                                                                                                                                                   | Fix branch protection / re-verify default setup live in this PR                                  | Both are live repo-admin actions with real lockout/scanning-gap risk if done wrong autonomously; flagged as a manual step for the human instead (see "Not in Scope")                                                                                                                                                                                                                                                                                                                                                   |

## Affected Areas

> **Superseded:** the step-by-step plan below was written before implementation. Where it disagrees with the Discovery Log at the bottom (CodeQL re-enabled rather than deleted; `json-summary` + `jq` rather than `text-summary | tee`; no `if: always()` / `warn` on the coverage upload; separate extension globs rather than brace expansion; `play-internal` submit profile removed), the Discovery Log and the tree are authoritative.

- `.github/workflows/codeql.yml`: ~~deleted~~ re-enabled + `workflow_dispatch` added (see D1 / Discovery Log)
- `.github/workflows/ci-native-rd.yml`: remove `Format check` step (dup of new `ci-format`); replace Codecov upload step with coverage-summary + artifact-upload steps
- `.github/workflows/ci-packages.yml`: remove `Format check` step
- `.github/workflows/ci-docs.yml` → `.github/workflows/ci-format.yml`: renamed, trigger broadened to match the full `format:check` glob
- `.github/workflows/build-play-internal.yml`: deleted (superseded by `build-production.yml`)
- `docs/architecture/ci-contract.md`: workflow table, validation-step tables, action-version list, Codecov section, `ci-docs`→`ci-format` section, branch-protection section — all reconciled against verified tree/GitHub state

## Verified Findings (issue claims checked against tree + `gh` state on 2026-09-03)

| Claim in #609                                                                               | Verified                                            | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CodeQL workflow is `disabled_manually`, last committed-workflow run 2026-06-03              | ✅ True                                             | `gh workflow list --all` shows `CodeQL Security Scanning disabled_manually`; `code-scanning/analyses` API confirms last `codeql.yml:analyze` run `2026-06-03T19:01:13Z`                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| "Green CodeQL runs come from `dynamic/github-code-scanning/codeql` (default setup)"         | ⚠️ Partially — needs a manual re-check before merge | `dynamic/github-code-scanning/codeql` (workflow id 276752287) ran 1,211 times through **2026-08-26**, confirming default setup _did_ cover the gap after the committed workflow died. But `gh api repos/.../code-scanning/default-setup` returns `"state":"not-configured"` **right now** (2026-09-03), with no runs of that dynamic workflow after 2026-08-26. A separate, unrelated `dynamic/github-code-quality/codeql` workflow (a different GitHub product, "Code Quality," created 2026-08-28) is running today but does not do security scanning. **This PR does not resolve the ambiguity** — see manual step below |
| Codecov step reports success while logging a token failure; no `CODECOV_TOKEN` secret       | ✅ True                                             | `ci-native-rd.yml:84-91` has `continue-on-error: true` + `fail_ci_if_error: false`; `gh secret list` has no `CODECOV_TOKEN`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `build-internal.yml`: 4 runs, all failure, 2026-05-17                                       | ✅ True                                             | `gh run list --workflow=build-internal.yml` confirms exactly 4 runs, all `failure`, all `2026-05-17`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `build-play-internal.yml`: 2 runs, one failure one cancelled                                | ✅ True                                             | `gh run list --workflow=build-play-internal.yml`: 1 `cancelled` (2026-06-14), 1 `failure` (2026-05-17)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `build-production.yml` healthy, v0.1.14→v0.1.18                                             | ✅ True (now further, v0.1.19 exists too)           | 5 most recent runs all `success`: v0.1.19, v0.1.18, v0.1.17, v0.1.16, v0.1.15                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `ci-contract.md:28,30` say `actions/checkout@v6`/`actions/setup-node@v6`; actual is v7      | ✅ True                                             | Repo-wide grep: `actions/checkout@v7` × 22, `actions/setup-node@v7` × 14, zero `@v6` of either                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `ci-contract.md:43` says `codecov/codecov-action@v5`; actual v7                             | ✅ True                                             | `ci-native-rd.yml:85` uses `codecov/codecov-action@v7`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `ci-contract.md:44` says `actions/upload-artifact@v4`; actual v7                            | ✅ True                                             | `ci-native-rd.yml:100` uses `actions/upload-artifact@v7`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `actions/cache@v6` used 9× and undocumented                                                 | ✅ True                                             | 9 occurrences across `_release-validate.yml`, `ci-docs.yml`, `ci-native-rd.yml`(×2), `ci-packages.yml`(×2), `i18n-sync.yml`(×2), `storybook-pages.yml`                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `i18n-sync.yml`, `storybook-pages.yml`, `release-please-next-pr.yml` missing from table     | ✅ True                                             | Confirmed all three exist and are `active` in `gh workflow list --all`, none appear in `ci-contract.md`'s workflow table                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| (New, not in issue) Branch protection on `main` matches `ci-contract.md`'s "should be" list | ❌ False                                            | `gh api repos/.../branches/main/protection` → `404 Branch not protected`. `ci-contract.md`'s "Branch Protection" section is aspirational, not enforced. Out of scope for this PR (see Not in Scope)                                                                                                                                                                                                                                                                                                                                                                                                                         |

## Implementation Plan

### Step 1: ~~Delete the dead CodeQL workflow~~ Re-enable it (superseded — see D1)

**Files**: `.github/workflows/codeql.yml` (delete)
**Commit**: `fix(ci): delete disabled CodeQL workflow, defer to default setup`
**Changes**:

- [ ] `git rm .github/workflows/codeql.yml`
- [ ] Do not call `gh workflow enable` or touch default setup config (D1, D5)

**Verify**: `gh workflow list --all | grep -i codeql` shows only the two `dynamic/...` default-setup entries, no file-backed `CodeQL Security Scanning`.

### Step 2: Replace Codecov with an honest coverage summary

**Files**: `.github/workflows/ci-native-rd.yml`
**Commit**: `fix(ci): replace dead Codecov upload with job-summary coverage report`
**Changes**:

- [ ] Remove the `Upload coverage to Codecov` step (current lines 84-91: `codecov/codecov-action@v7`, `continue-on-error: true`, `token: secrets.CODECOV_TOKEN`, `fail_ci_if_error: false`)
- [ ] Change the `Test (with coverage)` step to also emit `text-summary`:
      `run: bun run test:ci -- --coverage --coverageReporters=lcov --coverageReporters=text-summary | tee coverage-console.txt`
- [ ] Add a step right after that writes the summary block to `$GITHUB_STEP_SUMMARY`:
  ````yaml
  - name: Publish coverage summary
    working-directory: apps/native-rd
    run: |
      { echo "### Coverage summary"; echo; echo '```'; cat coverage-console.txt; echo '```'; } >> "$GITHUB_STEP_SUMMARY"
  ````
- [ ] Add an artifact-upload step for the coverage directory:
  ```yaml
  - name: Upload coverage artifact
    if: always()
    uses: actions/upload-artifact@v7
    with:
      name: coverage-native-rd
      path: apps/native-rd/coverage/
      if-no-files-found: warn
  ```

**Verify**: no `codecov` string remains in `ci-native-rd.yml` (`grep -n codecov .github/workflows/ci-native-rd.yml` → empty); locally run `cd apps/native-rd && bun run test:ci -- --coverage --coverageReporters=lcov --coverageReporters=text-summary` and confirm a `Coverage summary` text block prints to stdout in addition to `coverage/lcov.info` being written.

### Step 3: Dedupe `format:check` (closes #256)

**Files**: `.github/workflows/ci-docs.yml` → `.github/workflows/ci-format.yml`, `.github/workflows/ci-native-rd.yml`, `.github/workflows/ci-packages.yml`
**Commit**: `fix(ci): consolidate format:check into a single ci-format workflow (closes #256)`
**Changes**:

- [ ] `git mv .github/workflows/ci-docs.yml .github/workflows/ci-format.yml`
- [ ] In the renamed file: `name: ci-format`; broaden `pull_request.paths` from `**/*.md` only to the full glob `format:check` actually runs against:
  ```yaml
  on:
    pull_request:
      paths:
        - "**/*.{ts,tsx,js,jsx,json,md}"
        - ".prettierignore"
        - ".github/workflows/ci-format.yml"
    push:
      branches: [main]
  ```
- [ ] Rename job/step display names from "Docs Format Check" → "Format Check" (job stays the source-of-truth name `format`)
- [ ] Remove the `Format check` step from `ci-native-rd.yml` (current lines 71-72)
- [ ] Remove the `Format check` step from `ci-packages.yml` (current lines 70-71)
- [ ] Leave `_release-validate.yml`'s own `Format check` step untouched — it's a release-preflight reusable workflow, not one of the three PR-trigger workflows #256 names, and it needs to stay self-contained since `build-*.yml` call it standalone

**Verify**: `grep -rn "format:check" .github/workflows/` shows exactly two hits: `ci-format.yml` and `_release-validate.yml`. Open a test PR touching only a `.ts` file and one touching only a `.md` file; confirm `ci-format` runs on both and `ci-native-rd`/`ci-packages` no longer run a format step.

### Step 4: Delete `build-play-internal.yml`

**Files**: `.github/workflows/build-play-internal.yml` (delete)
**Commit**: `fix(ci): delete build-play-internal, superseded by build-production`
**Changes**:

- [ ] `git rm .github/workflows/build-play-internal.yml`

**Verify (agent, safe)**: `gh workflow list --all | grep build-play-internal` → no output.
**Verify (human, manual, NOT run by the agent — costs EAS credits)**:

```bash
gh workflow run build-production.yml -f ref=<latest-tag> -f platform=android
gh run watch  # confirm submit-android succeeds and lands in Play internal testing
```

### Step 5: Reconcile `docs/architecture/ci-contract.md`

**Files**: `docs/architecture/ci-contract.md`
**Commit**: `docs(ci): reconcile ci-contract.md with the actual workflow tree`
**Changes**:

- [ ] Workflows table (lines 10-21): replace `ci-docs` row with `ci-format` (new trigger description); replace `codeql` row with "GitHub code scanning — default setup (no committed workflow file; managed in repo Settings → Code security)"; delete the `build-play-internal` row; add three new rows: `i18n-sync` (PR-triggered en→de sync on `apps/native-rd/src/i18n/resources/en/**`, uses `OPENROUTER_API_KEY`), `storybook-pages` (push:main + workflow_dispatch, deploys Storybook to GitHub Pages), `release-please-next-pr` (release:published + workflow_dispatch companion to `release-please`)
- [ ] Line 23-24 ("All three release workflows call `_release-validate.yml`"): update to "Both release workflows" (build-internal, build-production)
- [ ] Lines 28-30: `actions/checkout@v6` → `actions/checkout@v7`; `actions/setup-node@v6` → `actions/setup-node@v7`; add a line naming `actions/cache@v6` for the dependency/turbo cache steps
- [ ] `ci-native-rd` validation-steps table (lines 37-46): remove the `Format check` row (now owned by `ci-format`); replace the `Coverage upload` row (line 43, `codecov/codecov-action@v5`) with a `Coverage summary` row describing the `$GITHUB_STEP_SUMMARY` + `coverage-native-rd` artifact approach; bump `actions/upload-artifact@v4` → `@v7` in the a11y row (line 44)
- [ ] `ci-packages` validation-steps table (lines 50-56): remove the `Format check` row
- [ ] Rename the `## ci-docs validation steps` section (lines 58-70) to `## ci-format validation steps`; update prose to reflect the broadened glob-based trigger (no longer "any `**/*.md` change" — now the full formatted-file surface) and that it now also replaces the format step previously duplicated in `ci-native-rd`/`ci-packages`
- [ ] Delete the `## Codecov contract` section (lines 150-157) entirely; the coverage-summary approach is documented inline in the `ci-native-rd` validation-steps table instead
- [ ] `## Why no blanket **/*.md exclusion` section (lines 89-111): update the last bullet ("Pure-docs PRs... are still caught by `ci-docs`") to reference `ci-format` and note it now covers all formatted extensions, not just markdown
- [ ] `## Branch Protection` section (lines 221-233): update `ci-docs / Docs Format Check` → `ci-format / Format Check`; change `(optional) CodeQL` to `(optional) GitHub code scanning (default setup)`; add a one-line callout that this list is **not currently enforced** — `gh api repos/.../branches/main/protection` returns 404 as of 2026-09-03 — and that enabling it is tracked separately (see Not in Scope)

**Verify**: `grep -n "codecov\|@v6\|ci-docs\|build-play-internal" docs/architecture/ci-contract.md` returns nothing (all reconciled); manually diff the workflow table against `ls .github/workflows/` to confirm every remaining file has a row.

## Testing Strategy

- [ ] No unit tests apply — this is CI/YAML + docs only
- [ ] `actionlint` (if available) or `gh workflow view <name> --yaml` sanity-check on each edited workflow file for syntax validity before pushing
- [ ] Manual: open this PR itself and observe `ci-format`, `ci-native-rd`, `ci-packages`, `dco` all go green, with `ci-native-rd`'s job summary showing a coverage table and a `coverage-native-rd` artifact attached
- [ ] Manual (human, post-merge, not agent-run): `gh workflow run build-production.yml -f ref=<tag> -f platform=android` to confirm Play internal submission still works without `build-play-internal.yml`
- [ ] Manual (human): visit repo Settings → Code security → Code scanning and confirm "Default setup" shows **Enabled**. If it shows disabled/not-configured, re-enable it before or immediately after merging this PR — the research above found the API reporting `not-configured` on 2026-09-03 despite 1,211 successful runs through 2026-08-26, so this needs a live human check, not just this PR's doc edit

## Not in Scope

| Item                                                                                                    | Reason                                                                                                                                                                                                                                          | Follow-up                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Enforcing branch protection / required status checks on `main` to match `ci-contract.md`'s prescription | `gh api .../branches/main/protection` confirms none exists today; enabling it is a repo-admin settings change with lockout risk if the required-check names drift again later, and is a distinct piece of work from reconciling the doc's prose | File a new issue if desired; not blocking #609's own acceptance criteria (those are about workflow files matching the doc, not about enforcement) |
| Re-verifying/toggling GitHub code scanning default setup live                                           | Explicitly excluded by the task brief (D5); requires a human with Settings access                                                                                                                                                               | Manual step in Testing Strategy above                                                                                                             |
| Provisioning `CODECOV_TOKEN` and keeping Codecov                                                        | No token exists; creating a codecov.io account/link is a human action outside CI-file scope                                                                                                                                                     | None — Codecov is being removed, not fixed, per D2                                                                                                |
| Triggering `build-internal.yml` / `build-play-internal.yml` workflow_dispatch runs                      | Costs EAS credits, needs a human, and `build-play-internal.yml` is being deleted in this PR anyway                                                                                                                                              | Manual commands provided in Step 4 and Testing Strategy for the human to run post-merge                                                           |

## Discovery Log

- [2026-09-03] D1 reversed. Re-checked `gh api .../code-scanning/default-setup` → `not-configured`; `code-scanning/analyses` (main, 100 most recent) are all `codeql.yml:analyze`, newest 2026-06-03. No default-setup scan has ever been recorded via the analyses API, so the issue's "green CodeQL runs come from default setup" premise does not hold today. Re-enabled `codeql.yml` and added `workflow_dispatch` (Step 1 now = enable + verify, not delete).
- [2026-09-03] The `Test (with coverage)` step uses `json-summary` + `jq` rather than `text-summary` + `tee`: a pipe would swallow Jest's exit code without `pipefail`, and `json-summary` is a stable file format.
- [2026-09-03] Actions path filters do not support brace expansion, so `ci-format.yml` lists the six extensions as separate globs.
- [2026-09-03] Also removed the now-unused `play-internal` submit profile from `apps/native-rd/eas.json` and rewrote the Play-internal section of `apps/native-rd/docs/release.md` to point at `build-production` with `platform: android`.
- [2026-09-03] Skipped the human-only `workflow_dispatch` of `build-internal` (EAS credits). Listed in the PR body as a post-merge manual check.
