# CodeRabbit + CI Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix everything surfaced in the CodeRabbit research pass: (1) replace the stale, pre-extraction `.coderabbit.yaml` with a config that matches the post-2026-05-14 layout and exploits the free open-source plan; (2) consolidate the redundant `ci.yml` / `ci-native-rd.yml` workflow pair into a single workflow; (3) sync `docs/architecture/ci-contract.md` to the new reality.

**Architecture:** Two areas, one branch, one PR. Six focused commits so review history shows intent:

1. Remove stale `.coderabbit.yaml` path_instructions
2. Add `.coderabbit.yaml` path_instructions for the real layout
3. Tune `.coderabbit.yaml` options (profile, filters, tool toggles)
4. Replace `ci.yml` with a single canonical workspace workflow
5. Delete `ci-native-rd.yml` and update `docs/architecture/ci-contract.md`
6. Move this plan to `completed/`

No application-code changes. Workflow change is verified by the PR's own CI run.

**Tech Stack:** YAML (CodeRabbit `schema.v2.json`), GitHub Actions workflows, Turborepo task graph (`turbo.json`), Bun workspaces.

---

## Context for engineers without prior context

- **Repo:** Public monorepo `rollercoaster-dev/Rollercoaster.dev-mobile`. Bun 1.3.7 + Turborepo. Qualifies for CodeRabbit's free **Open Source plan** (full Pro features on public repos, no seat cap, no monthly limit).
- **Layout (current truth — read `AGENTS.md` to confirm):**
  - `apps/native-rd` — Expo React Native app, Storybook, Jest (`scripts/jest-node.sh`), Detox e2e, custom ESLint rules.
  - `packages/design-tokens` — Style Dictionary build, generates CSS + Unistyles output.
  - `packages/openbadges-core` — Open Badges 2.0/3.0 spec types and helpers; tests via `bun test`.
- **Removed/external (do NOT reference these in path_instructions or workflows):** `apps/openbadges-modular-server`, `apps/openbadges-system`, `packages/openbadges-ui`, `packages/shared-config`. `@rollercoaster-dev/openbadges-types` and `@rollercoaster-dev/rd-logger` are now **registry deps**, not workspace packages.
- **`turbo.json` task graph (confirmed):** `build` depends on `^build`; `type-check` depends on `^build`; `test`, `lint` have no deps. All cache: true.
- **CI today (both run on every PR, no path filters):**
  - `ci.yml` ("CI" / job `ci-native-rd`): builds native-rd deps via `turbo --filter=native-rd^...`, typechecks/lints `--filter=native-rd`, then `working-directory: apps/native-rd && bun run test:ci`. → Only validates native-rd. Strict subset of the other workflow.
  - `ci-native-rd.yml` ("Mobile CI" / job `validate`): builds `design-tokens` and `openbadges-core` explicitly, then runs `bun run type-check` / `lint` / `test` from root → validates the WHOLE workspace via turbo. Including native-rd.
- **Schema header for `.coderabbit.yaml`:** `https://coderabbit.ai/integrations/schema.v2.json` (keep).
- **Pre-existing required checks:** Unknown. **Task 5 reads branch protection** to find out which check name (workflow / job) is required, and Task 6 names the consolidated workflow accordingly so merges don't break.

## File Structure

- **Modify:** `.coderabbit.yaml` (Tasks 2 – 4)
- **Modify (rewrite):** `.github/workflows/ci.yml` (Task 6)
- **Delete:** `.github/workflows/ci-native-rd.yml` (Task 7)
- **Modify:** `docs/architecture/ci-contract.md` — rewrite the "CI Workflow Boundary" section only; preserve the rest (Task 8)
- **Move at end:** `docs/plans/active/coderabbit-config-cleanup.md` → `docs/plans/completed/<DATE>-coderabbit-cleanup.md` (Task 9)

## Out of scope (intentionally not touched)

- `.github/workflows/claude-code-review.yml`, `claude.yml` — Claude reviewer / Claude Code action; legitimately separate.
- `.github/workflows/codeql.yml` — security scan; separate concern.
- `.github/workflows/dco.yml` — DCO sign-off; separate concern.
- Adding remote turbo cache. Worth doing eventually but unrelated to this cleanup.
- Repackaging native-rd Jest vs. bun-test split. Documented intentional separation; leave the test commands as they are.

---

## Task 1: Read current state and confirm assumptions

**Files (read-only):**

- `.coderabbit.yaml`
- `AGENTS.md`, `apps/native-rd/AGENTS.md`
- `.github/workflows/ci.yml`, `.github/workflows/ci-native-rd.yml`
- `docs/architecture/ci-contract.md`
- `turbo.json`
- root `package.json`, `apps/native-rd/package.json`, `packages/openbadges-core/package.json`, `packages/design-tokens/package.json`

- [ ] **Step 1: Confirm the post-extraction layout**

Run: `ls apps/ packages/`
Expected:

```
apps:
native-rd

packages:
design-tokens
openbadges-core
```

If anything else appears, STOP and reconcile.

- [ ] **Step 2: Confirm the workflow redundancy**

Run: `wc -l .github/workflows/ci.yml .github/workflows/ci-native-rd.yml`
Expected: both files exist, both around 50–55 lines.

Run: `grep -E "^(name|run|filter)" .github/workflows/ci.yml .github/workflows/ci-native-rd.yml`
Expected to confirm: `ci.yml` uses `--filter=native-rd`; `ci-native-rd.yml` uses root `bun run type-check`/`lint`/`test`. Both trigger `on: pull_request` and `push: branches: [main]` with no `paths:` filter.

- [ ] **Step 3: Confirm the contract doc is stale**

Run: `grep -n "Jest tests" docs/architecture/ci-contract.md`
Expected: a table row saying Root CI does "Not run" Jest. (This is wrong — `ci.yml` currently runs `bun run test:ci` in `apps/native-rd`. Task 8 will fix this.)

- [ ] **Step 4: Read-only task; no commit.**

---

## Task 2: Remove stale path_instructions from `.coderabbit.yaml`

**Files:**

- Modify: `.coderabbit.yaml`

The current file has six `path_instructions` blocks pointing at packages that no longer exist in this repo: `packages/openbadges-ui/**/*.vue`, `apps/openbadges-modular-server/src/api/**/*.ts`, `apps/openbadges-modular-server/src/auth/**/*.ts`, `apps/openbadges-modular-server/src/infrastructure/database/**/*.ts`, `packages/rd-logger/**/*.ts`, `packages/openbadges-types/**/*.ts`. Delete all six. Keep `**/utils/security/**/*.ts` and `**/*.test.ts`.

- [ ] **Step 1: Delete each obsolete block**

Open `.coderabbit.yaml`. For each of the six paths above, remove the `- path: "..."` line and its full `instructions: |` body (everything up to the next `- path:` line or the next top-level key, whichever comes first).

- [ ] **Step 2: Verify YAML still parses**

Run:

```bash
python3 -c "import yaml; yaml.safe_load(open('.coderabbit.yaml')); print('ok')"
```

Expected: `ok`

- [ ] **Step 3: Verify exactly two path blocks remain**

Run: `grep -cE '^\s+- path:' .coderabbit.yaml`
Expected: `2`

Run: `grep -E '^\s+- path:' .coderabbit.yaml`
Expected (in order):

```
    - path: "**/utils/security/**/*.ts"
    - path: "**/*.test.ts"
```

- [ ] **Step 4: Commit**

```bash
git add .coderabbit.yaml
git commit -s -m "chore(coderabbit): remove stale path_instructions for extracted packages

Six path_instructions blocks referenced packages that are no longer in
this repo after the 2026-05-14 mobile extraction (openbadges-ui,
openbadges-modular-server, rd-logger, openbadges-types). Removing them
prevents CodeRabbit from silently no-op'ing on rules that look active."
```

(Note: `-s` adds `Signed-off-by:` automatically from the committer identity — required by `.github/workflows/dco.yml`.)

---

## Task 3: Add path_instructions matching the actual repo

**Files:**

- Modify: `.coderabbit.yaml`

Insert six new `path_instructions` entries **before** the surviving `**/utils/security/**/*.ts` block, in the order below. Each block is a YAML list item; preserve the existing 4-space indent under `path_instructions:`.

- [ ] **Step 1: Native-RD components block**

```yaml
- path: "apps/native-rd/src/components/**/*.{ts,tsx}"
  instructions: |
    Review React Native components against the ND-accessibility contract
    documented in apps/native-rd/CLAUDE.md.

    Accessibility:
    - All interactive elements have accessibilityRole and accessibilityLabel
    - Touch targets are at least 44pt × 44pt
    - Focus states are visible
    - Animations respect AccessibilityInfo.isReduceMotionEnabled() — never
      animate motion when reduce-motion is on
    - Color contrast meets WCAG AA against both light and dark themes

    Design system discipline:
    - No raw color values; consume design tokens via Unistyles or
      @rollercoaster-dev/design-tokens. The local ESLint rule
      `local/no-raw-colors` enforces this — flag dynamic style construction
      the rule may miss
    - Components live in src/components/, not in src/screens/
    - Each component directory exposes a barrel index.ts
      (enforced by `local/require-barrel-export`)

    File size:
    - Components over ~250 lines should be split
      (the `local/file-size-limit` rule warns at the configured threshold)
```

- [ ] **Step 2: Native-RD screens block**

```yaml
- path: "apps/native-rd/src/screens/**/*.{ts,tsx}"
  instructions: |
    Screens compose components; they don't define primitives.

    - No imports from another screen's directory (the
      `local/no-component-imports-screens` rule enforces this; flag
      architectural violations the rule cannot statically see, e.g.
      duplicated layout code)
    - Navigation params should be typed against the navigator's param list
    - Data fetching belongs in hooks/services, not inline in the screen
    - Loading and error states must be ND-friendly: calm copy, no jargon,
      no walls of red text
```

- [ ] **Step 3: Native-RD e2e (Detox) block**

```yaml
- path: "apps/native-rd/e2e/**/*.{ts,tsx}"
  instructions: |
    Detox flake-prevention:
    - Use testID over text-based selectors where possible (text is
      localized and changes between i18n updates)
    - Wait on element state (waitFor(...).toBeVisible()), never on
      fixed sleep timers
    - Reset app state per test (device.launchApp({newInstance: true}))
    - Tests must run on both iOS sim and Android emulator targets
```

- [ ] **Step 4: Open Badges core block**

```yaml
- path: "packages/openbadges-core/src/**/*.ts"
  instructions: |
    This package must comply with the Open Badges 2.0 and 3.0 specs
    and the W3C Verifiable Credentials Data Model.

    - JSON-LD @context handling must preserve order and include the
      required OB contexts
    - Type guards return boolean and never throw
    - Verifiable Credential proof and issuer fields are required where
      the spec mandates them; do not default-construct invalid VCs
    - When changing exported types, check downstream impact in
      apps/native-rd/src (this package is consumed as workspace:*)
```

- [ ] **Step 5: Design tokens block**

```yaml
- path: "packages/design-tokens/src/**/*.{ts,js,json}"
  instructions: |
    Tokens are generated into multiple targets (CSS variables, Unistyles
    themes) by Style Dictionary.

    - Light and dark themes must define the same token keys
      (no missing-in-one-theme drift)
    - ND-friendly tokens (motion, density, contrast) keep their semantic
      names — renaming is a breaking change for consumers
    - Don't hand-edit generated output in packages/design-tokens/css/
      or the Unistyles dist (those are build artifacts)
    - Adding a new token requires updating the source AND any consumer
      mapping in apps/native-rd
```

- [ ] **Step 6: Workflows block**

```yaml
- path: ".github/workflows/**/*.{yml,yaml}"
  instructions: |
    Per the root CLAUDE.md, do NOT restore CI references to packages
    extracted in the 2026-05-14 split:
    - apps/openbadges-system
    - apps/openbadges-modular-server
    - packages/openbadges-ui
    - packages/shared-config
    - packages/rd-logger (as a workspace path; the registry dep is fine)

    Workflow hygiene:
    - Pin actions by major version (actions/checkout@v6 etc.), not by
      floating tags like @main
    - Concurrency groups should cancel-in-progress on PR refs
    - Add `paths:` filters where a workflow does not need to run on
      unrelated changes (docs-only, plan-only, etc.)
```

- [ ] **Step 7: Verify**

Run: `python3 -c "import yaml; d=yaml.safe_load(open('.coderabbit.yaml')); print(len(d['reviews']['path_instructions']))"`
Expected: `8` (6 new + 2 surviving).

- [ ] **Step 8: Commit**

```bash
git add .coderabbit.yaml
git commit -s -m "chore(coderabbit): add path_instructions for actual repo layout

Adds review rules for native-rd components/screens/e2e, openbadges-core
spec compliance, design-tokens generation discipline, and workflow
hygiene. Mirrors the project conventions in apps/native-rd/CLAUDE.md and
AGENTS.md."
```

---

## Task 4: Tune `.coderabbit.yaml` (tools, filters, profile, language)

**Files:**

- Modify: `.coderabbit.yaml`

- [ ] **Step 1: Add top-level keys**

After the `# yaml-language-server: ...` header line, **before** `reviews:`, insert:

```yaml
language: en-US
early_access: false
```

- [ ] **Step 2: Extend `reviews.tools`**

Replace the current `tools:` block with:

```yaml
tools:
  eslint:
    enabled: false # CI runs `bun run lint` including the custom local rules
  biome:
    enabled: false # Not used in this project
  oxlint:
    enabled: false # Not used; would duplicate ESLint findings on TS files
  # actionlint, shellcheck, markdownlint, yamllint, languagetool,
  # gitleaks, trufflehog, semgrep, checkov are left on their defaults —
  # they fill gaps CI does not cover.
```

- [ ] **Step 3: Extend `reviews.path_filters`**

Replace the current `path_filters:` block with:

```yaml
path_filters:
  - "!**/node_modules/**"
  - "!**/dist/**"
  - "!**/*.lock"
  - "!**/coverage/**"
  - "!**/.bun-cache/**"
  - "!**/.turbo/**"
  - "!**/.expo/**"
  - "!**/__snapshots__/**"
  - "!**/.storybook-static/**"
  - "!apps/native-rd/ios/**" # expo prebuild output
  - "!apps/native-rd/android/**" # expo prebuild output
  - "!packages/design-tokens/css/**" # style-dictionary generated
  - "!**/CHANGELOG.md"
```

- [ ] **Step 4: Add review tuning under `reviews:`**

Insert these keys at the top of the `reviews:` block (immediately under the `reviews:` line, above `auto_review:`):

```yaml
profile: chill
request_changes_workflow: false
commit_status: true
high_level_summary: true
poem: false
in_progress_fortune: false
collapse_walkthrough: true
changed_files_summary: true
sequence_diagrams: true
```

- [ ] **Step 5: Fix `auto_incremental_review`**

In `reviews.auto_review`, replace:

```yaml
auto_incremental_review: false # Don't auto-review on subsequent commits (saves API limits)
```

with:

```yaml
auto_incremental_review: true
auto_pause_after_reviewed_commits: 5
```

The previous "saves API limits" comment was incorrect: the free open-source plan has no monthly API cap.

- [ ] **Step 6: Verify**

```bash
python3 - <<'PY'
import yaml
d = yaml.safe_load(open('.coderabbit.yaml'))
assert d['language'] == 'en-US'
assert d['early_access'] is False
assert d['reviews']['profile'] == 'chill'
assert d['reviews']['poem'] is False
assert d['reviews']['auto_review']['auto_incremental_review'] is True
assert d['reviews']['auto_review']['auto_pause_after_reviewed_commits'] == 5
tools = d['reviews']['tools']
assert tools['eslint']['enabled'] is False
assert tools['biome']['enabled'] is False
assert tools['oxlint']['enabled'] is False
print('ok')
PY
```

Expected: `ok`

- [ ] **Step 7: Commit**

```bash
git add .coderabbit.yaml
git commit -s -m "chore(coderabbit): tune for free OS plan — disable CI-duplicate linters, extend filters, chill profile

- Disable eslint/biome/oxlint (eslint runs in CI; biome/oxlint unused)
- Extend path_filters to skip .turbo/.expo/__snapshots__/storybook-static
  and expo prebuild output
- Set profile: chill (fits ND-friendly project tone)
- Re-enable auto_incremental_review with a 5-commit pause cap. The free
  open-source plan has no monthly API cap, so the prior 'saves API
  limits' rationale was wrong
- Drop the rabbit poem / in-progress fortune to reduce review-comment
  noise; keep sequence diagrams and high-level summary"
```

---

## Task 5: Check branch protection to pick safe workflow naming

**Files (read-only):**

- GitHub API: `repos/rollercoaster-dev/Rollercoaster.dev-mobile/branches/main/protection`

The next task rewrites `ci.yml`. If branch protection requires a specific check name (`<workflow-name> / <job-name>`), Task 6 must preserve it or merges will block.

- [ ] **Step 1: Query branch protection**

Run:

```bash
gh api repos/rollercoaster-dev/Rollercoaster.dev-mobile/branches/main/protection/required_status_checks 2>&1
```

Expected: either JSON listing required check contexts, or an HTTP 404 (no protection / no required checks).

- [ ] **Step 2: Record which checks are required**

In your scratch notes, capture each required check name verbatim. Examples you might see:

- `CI / ci-native-rd` → must keep workflow name "CI" and job name "ci-native-rd"
- `Mobile CI / validate` → must rename the consolidated workflow accordingly
- `CodeQL / Analyze (javascript)` → unrelated, leave alone
- `DCO` → unrelated, leave alone

- [ ] **Step 3: Decide naming for Task 6**

| Required check found   | Task 6 workflow name | Task 6 job name |
| ---------------------- | -------------------- | --------------- |
| `CI / ci-native-rd`    | `CI`                 | `ci-native-rd`  |
| `Mobile CI / validate` | `Mobile CI`          | `validate`      |
| Neither found / 404    | `CI`                 | `validate`      |
| Both found (very rare) | STOP — ask the user  | —               |

Write the chosen `<workflow>/<job>` pair into the scratch notes for Task 6.

- [ ] **Step 4: Read-only task; no commit.**

---

## Task 6: Replace `ci.yml` with the consolidated workspace workflow

**Files:**

- Modify (full rewrite): `.github/workflows/ci.yml`

This new `ci.yml` is what `ci-native-rd.yml` does today (broader: whole workspace), with two improvements: a `paths-ignore:` filter for docs-only PRs, and a clearer step layout. Naming comes from Task 5.

- [ ] **Step 1: Overwrite `.github/workflows/ci.yml` with this content**

(Substitute `<WORKFLOW_NAME>` and `<JOB_NAME>` per the Task 5 decision table. If Task 5 returned 404, use `CI` and `validate`.)

```yaml
# Validation contract: docs/architecture/ci-contract.md
name: <WORKFLOW_NAME>

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
  <JOB_NAME>:
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

      - name: Build workspace packages
        run: |
          bun --filter @rollercoaster-dev/design-tokens build
          bun --filter @rollercoaster-dev/openbadges-core build

      - name: Typecheck
        run: bun run type-check

      - name: Lint
        run: bun run lint

      - name: Test
        run: bun run test
```

Rationale notes (for the commit message):

- `bun run type-check` / `lint` / `test` at root → turbo runs each task across all packages. This covers what `ci-native-rd.yml` covers today and is a superset of what `ci.yml` covers.
- `paths-ignore` skips docs-only PRs. Plan files and architecture docs don't change build output; running CI on them wastes minutes.
- `actions/cache@v5` + `setup-bun@v2` + `setup-node@v6` mirror the existing versions; do not silently upgrade.

- [ ] **Step 2: Validate the workflow with actionlint**

Run:

```bash
bunx --bun actionlint .github/workflows/ci.yml 2>/dev/null \
  || docker run --rm -v "$(pwd):/repo" rhysd/actionlint:latest -color /repo/.github/workflows/ci.yml \
  || echo "WARN: actionlint not available; relying on the PR's own CI run for validation"
```

Expected: no findings. If actionlint isn't available locally, fall back to the PR check.

- [ ] **Step 3: Verify YAML parses**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml')); print('ok')"`
Expected: `ok`

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -s -m "ci: consolidate workflows — single ci.yml validates the whole workspace

Replaces the native-rd-only ci.yml with a single workflow that runs
typecheck, lint, and test for every package via turbo. This is what
ci-native-rd.yml does today; the next commit deletes that file.

- bun run type-check / lint / test at root => turbo runs each task
  across all packages (native-rd Jest + openbadges-core bun test +
  design-tokens, whatever exists)
- paths-ignore filter skips docs-only PRs (plans, architecture, READMEs)
- Workflow + job names preserved to match required branch-protection
  checks (see plan Task 5)"
```

---

## Task 7: Delete `ci-native-rd.yml`

**Files:**

- Delete: `.github/workflows/ci-native-rd.yml`

- [ ] **Step 1: Confirm the file is now redundant**

Run: `diff <(grep -v '^#' .github/workflows/ci.yml) <(grep -v '^#' .github/workflows/ci-native-rd.yml) | head -40`
Expected: differences are limited to workflow `name:`, job key, `paths-ignore` block, and step ordering — no functional coverage difference.

- [ ] **Step 2: Remove**

Run: `git rm .github/workflows/ci-native-rd.yml`

- [ ] **Step 3: Commit**

```bash
git commit -s -m "ci: remove ci-native-rd.yml (now redundant with consolidated ci.yml)

Deleting this leaves the new ci.yml as the single canonical workflow.
If branch protection still required 'Mobile CI / validate', the
workflow name in ci.yml was set to match (see plan Task 5)."
```

---

## Task 8: Sync `docs/architecture/ci-contract.md` to the new reality

**Files:**

- Modify: `docs/architecture/ci-contract.md`

The doc's "CI Workflow Boundary" section describes a two-workflow split that no longer exists. Rewrite just that section. Preserve the rest (Validation Environments, Pre-commit Behavior, Test Contract, Local Launch Contract — they're still accurate).

- [ ] **Step 1: Replace the "CI Workflow Boundary" section**

Find the heading `## CI Workflow Boundary` in `docs/architecture/ci-contract.md`. Replace everything from that heading up to (but not including) the next `##` heading with:

```markdown
## CI Workflow

There is a single CI workflow: `.github/workflows/ci.yml`. It runs on
every PR (except docs-only changes filtered by `paths-ignore`) and on
every push to `main`.

| Step           | Command                                                 | Notes                                                               |
| -------------- | ------------------------------------------------------- | ------------------------------------------------------------------- |
| Install        | `bun install --frozen-lockfile`                         | Locked install from `bun.lock`                                      |
| Build packages | `bun --filter @rollercoaster-dev/design-tokens build`   | Style Dictionary output needed before consumers type-check          |
|                | `bun --filter @rollercoaster-dev/openbadges-core build` | `dist/` needed for native-rd's TypeScript resolution                |
| Typecheck      | `bun run type-check`                                    | `turbo type-check` across workspace                                 |
| Lint           | `bun run lint`                                          | `turbo lint` across workspace; native-rd uses its own ESLint config |
| Test           | `bun run test`                                          | `turbo test` runs Jest in native-rd, `bun test` in openbadges-core  |

Earlier revisions of this doc described a `ci.yml` / `ci-native-rd.yml`
split. That split has been removed — the previous `ci.yml` was a strict
subset of `ci-native-rd.yml`, so `ci-native-rd.yml` was kept (renamed to
`ci.yml`) and the duplicate deleted.

Docs-only changes (`**/*.md`, `docs/**`, `apps/*/docs/**`,
`apps/*/research/**`, `apps/*/prototypes/**`) skip CI via `paths-ignore`.
```

- [ ] **Step 2: Verify the doc reads cleanly**

Run: `bunx --bun markdownlint-cli docs/architecture/ci-contract.md 2>/dev/null || true`
Expected: no errors, or markdownlint not available (don't block on it).

Read the doc end-to-end (or `grep -n "^## " docs/architecture/ci-contract.md`) to confirm section ordering is sane and no orphan references to `ci-native-rd.yml` remain.

Run: `grep -n "ci-native-rd.yml" docs/architecture/ci-contract.md`
Expected: 0 matches.

- [ ] **Step 3: Commit (combined with Task 7's delete is fine, but separate is cleaner)**

```bash
git add docs/architecture/ci-contract.md
git commit -s -m "docs(ci-contract): sync to single-workflow reality

The 'CI Workflow Boundary' section described a ci.yml / ci-native-rd.yml
split that no longer exists. Rewritten to document the single
consolidated ci.yml. Other sections (Validation Environments,
Pre-commit Behavior, Test Contract, Local Launch Contract) preserved
verbatim."
```

---

## Task 9: Validate, move plan, push, open PR

- [ ] **Step 1: Confirm commit count and order**

Run: `git log --oneline origin/main..HEAD`
Expected: six commits in this order (titles shortened):

1. `chore(coderabbit): remove stale path_instructions ...`
2. `chore(coderabbit): add path_instructions for actual repo layout`
3. `chore(coderabbit): tune for free OS plan ...`
4. `ci: consolidate workflows ...`
5. `ci: remove ci-native-rd.yml ...`
6. `docs(ci-contract): sync to single-workflow reality`

- [ ] **Step 2: Confirm DCO sign-off on every commit**

Run: `git log origin/main..HEAD --format='%s%n%(trailers:key=Signed-off-by,valueonly)%n---'`
Expected: every commit shows a `Signed-off-by:` line. If any is missing, `git rebase --signoff origin/main` and force-push later in Step 6.

- [ ] **Step 3: File state assertions**

```bash
test -f .github/workflows/ci.yml && echo "ci.yml: ok"
test ! -f .github/workflows/ci-native-rd.yml && echo "ci-native-rd.yml: removed"
test -f .coderabbit.yaml && echo ".coderabbit.yaml: ok"
grep -q "ci-native-rd.yml" docs/architecture/ci-contract.md && echo "FAIL: stale ref" || echo "ci-contract.md: clean"
python3 -c "import yaml; yaml.safe_load(open('.coderabbit.yaml')); yaml.safe_load(open('.github/workflows/ci.yml')); print('yaml ok')"
```

Expected: all four lines print "ok" / "removed" / "clean" / "yaml ok"; no FAIL.

- [ ] **Step 4: Path-glob sanity for all CodeRabbit path_instructions**

```bash
for p in \
  "apps/native-rd/src/components" \
  "apps/native-rd/src/screens" \
  "apps/native-rd/e2e" \
  "packages/openbadges-core/src" \
  "packages/design-tokens/src" \
  ".github/workflows" \
  "**/utils/security"; do
  count=$(find . -type d -path "*/${p#**/}" 2>/dev/null | head -1 | wc -l)
  echo "$p → dir exists: $count"
done
```

Expected: every path → `dir exists: 1` (or grep for files if the path uses globs). Any 0 means a `path_instructions` glob in `.coderabbit.yaml` is wrong; fix before merging.

- [ ] **Step 5: Move this plan to `completed/`**

```bash
TODAY=$(date +%Y-%m-%d)
git mv docs/plans/active/coderabbit-config-cleanup.md "docs/plans/completed/${TODAY}-coderabbit-cleanup.md"
git commit -s -m "docs(plans): mark coderabbit + ci cleanup completed"
```

- [ ] **Step 6: Push and open PR**

```bash
git push -u origin chore/coderabbit-config-cleanup
gh pr create --title "chore: refresh CodeRabbit config + consolidate CI workflows" --body "$(cat <<'EOF'
## Summary

Cleanup of two areas surfaced during the CodeRabbit research pass:

**CodeRabbit (`.coderabbit.yaml`)**
- Removes six stale `path_instructions` for packages extracted to other
  repos in the 2026-05-14 split (openbadges-ui, openbadges-modular-server,
  rd-logger, openbadges-types).
- Adds `path_instructions` matching the real layout: native-rd
  components / screens / e2e, openbadges-core spec compliance,
  design-tokens generation, and workflow hygiene.
- Disables `eslint`/`biome`/`oxlint` (CI already runs ESLint with the
  custom local rules; biome/oxlint unused).
- Extends `path_filters` to skip `.turbo`, `.expo`, snapshots,
  storybook-static, expo prebuild output, and changelogs.
- Switches to `profile: chill`, drops the rabbit poem and in-progress
  fortune, re-enables `auto_incremental_review` (the free OS plan has
  no monthly cap; the prior "saves API limits" rationale was wrong).

**CI workflows**
- Replaces `ci.yml` (native-rd-only, strict subset) and removes
  `ci-native-rd.yml` (whole-workspace superset). The result: a single
  `ci.yml` that validates the whole workspace, with a `paths-ignore`
  filter for docs-only PRs.
- Updates `docs/architecture/ci-contract.md` to match the new
  single-workflow reality. Other sections of the contract (validation
  environments, pre-commit, test contract, local launch) are unchanged.

Plan: `docs/plans/completed/<DATE>-coderabbit-cleanup.md`

## Test plan
- [ ] CI on this PR passes (the new `ci.yml` validates itself)
- [ ] No `ESLint` findings from CodeRabbit (CI owns lint now)
- [ ] CodeRabbit posts review using the new `path_instructions` on at
      least one native-rd component file touched in this branch (if any
      were touched — otherwise verify on the next PR that touches one)
- [ ] `docs/architecture/ci-contract.md` has no references to
      `ci-native-rd.yml`
EOF
)"
```

---

## Self-Review Notes

- **Spec coverage:** Every issue from the original research is covered. CodeRabbit issues → Tasks 2-4. CI duplication (previously deferred — mistake) → Tasks 5-8.
- **Branch protection risk:** Task 5 explicitly reads required-check names BEFORE Task 6 renames anything. Decision table avoids guesswork.
- **DCO compliance:** Every `git commit` in this plan uses `-s` (Signed-off-by). The repo has a `dco.yml` workflow that gates merges on this trailer.
- **Placeholders:** Two intentional ones in Task 6 — `<WORKFLOW_NAME>` and `<JOB_NAME>` — resolved by the Task 5 decision table. No "TBD" or "as appropriate."
- **Type/name consistency:** `bun run test` (not `test:ci`) used in the new `ci.yml` to match what `ci-native-rd.yml` does today and what works with the native-rd Jest setup (Jest reads `CI=true` env automatically).
- **Side effects on Codepaths I'm not changing:** The CodeQL, DCO, and Claude review workflows are listed in "Out of scope" and their files are not touched. Verify in Task 9 Step 3 that none of them reference `ci-native-rd.yml`.
