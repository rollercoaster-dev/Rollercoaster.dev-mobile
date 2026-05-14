# Rebuild CI for Rollercoaster.dev-mobile (standalone)

Status: active · Owner: Joe · Created: 2026-05-14

## Context

`native-rd` was extracted from `~/Code/rollercoaster.dev/monorepo` into the standalone `Rollercoaster.dev-mobile` repo. The current `.github/workflows/ci.yml` runs `bun install` → `type-check` → `lint` → `test` via turbo, but has gaps vs. the monorepo's setup:

- **No Prettier check** (`format:check` script exists but is never invoked in CI).
- **No coverage upload** — monorepo had Codecov; this repo has neither the job nor a `CODECOV_TOKEN`.
- **No a11y audit gate** — `apps/native-rd/scripts/a11y-audit.sh` exists but is never run.
- **No Storybook build verification** — Storybook config exists but isn't compiled in CI.
- **`docs/architecture/ci-contract.md` still describes a monorepo** (references native-rd alongside other monorepo apps, single-workflow rationale tied to monorepo turbo wiring).
- **`lint-staged` references `packages/openbadges-core/**`** — that path is still present here, so the rule is correct, but the contract should be re-validated for the standalone repo.

The goal is to re-establish a strong CI gate that matches what the monorepo had for `native-rd`, adapted to standalone reality, with split workflows so PRs only run what's relevant.

## Decisions

1. **Scope:** typecheck, lint, test, format:check, coverage upload (Codecov), a11y audit, Storybook web build.
2. **Workflow split:** two path-filtered workflows — `ci-native-rd.yml` and `ci-packages.yml`.
3. **CI docs:** rewrite `docs/architecture/ci-contract.md` for standalone reality.

## Pre-flight verification (done 2026-05-14)

- `apps/native-rd/scripts/a11y-audit.sh` runs `npx jest --testPathPatterns accessibility --json` — pure Jest, no simulator. Headless-safe on ubuntu-latest. `python3` is the only extra dep and ships with the runner.
- `apps/native-rd/scripts/jest-node.sh` ends in `exec "$node_bin" node_modules/.bin/jest "$@"` — args pass through cleanly, so `bun run test:ci -- --coverage` works.
- `apps/native-rd/.storybook-web/{main.ts,preview.tsx}` are present — `storybook build` should work with the existing config.

## Approach

Keep turbo as the orchestration layer (already wired up, used by EAS post-install). Replace the single `ci.yml` with two focused workflows. Retain `codeql.yml`, `dco.yml`, `claude*.yml` unchanged.

### Workflow 1 — `.github/workflows/ci-native-rd.yml`

Triggers:

```yaml
on:
  pull_request:
    paths:
      - "apps/native-rd/**"
      - "packages/design-tokens/**"        # native-rd dep
      - "packages/openbadges-core/**"      # native-rd dep
      - "bun.lock"
      - "turbo.json"
      - "package.json"
      - ".github/workflows/ci-native-rd.yml"
    paths-ignore:
      - "apps/native-rd/docs/**"
      - "apps/native-rd/research/**"
      - "apps/native-rd/prototypes/**"
      - "**/*.md"
  push:
    branches: [main]
concurrency:
  group: ci-native-rd-${{ github.ref }}
  cancel-in-progress: true
```

Steps (one runner, sequential for fail-fast + cache reuse):

1. `actions/checkout@v6`
2. `oven-sh/setup-bun@v2` (`bun-version-file: package.json`)
3. `actions/setup-node@v6` (`node-version-file: apps/native-rd/.nvmrc`)
4. `actions/cache@v5` for `~/.bun/install/cache` keyed on `bun.lock`, plus separate cache for `.turbo` keyed on `bun.lock` + workflow file
5. `bun install --frozen-lockfile`
6. **Format check** — `bun run format:check`
7. **Typecheck** — `bun run turbo type-check --filter=native-rd` (turbo auto-builds deps via `dependsOn: ["^build"]`)
8. **Lint** — `bun run turbo lint --filter=native-rd`
9. **Test (with coverage)** — `cd apps/native-rd && bun run test:ci -- --coverage --coverageReporters=lcov`
10. **Coverage upload** — `codecov/codecov-action@v5` with `files: apps/native-rd/coverage/lcov.info`, `flags: native-rd`. `continue-on-error: true` until `CODECOV_TOKEN` is added.
11. **a11y audit** — `cd apps/native-rd && bun run test:a11y:json > a11y.json`; upload as artifact via `actions/upload-artifact@v4`.
12. **Storybook web build** — `cd apps/native-rd && bun run storybook:web:build`. Build only, no deploy.

### Workflow 2 — `.github/workflows/ci-packages.yml`

Triggers:

```yaml
on:
  pull_request:
    paths:
      - "packages/**"
      - "bun.lock"
      - "turbo.json"
      - "package.json"
      - ".github/workflows/ci-packages.yml"
    paths-ignore:
      - "packages/**/*.md"
      - "packages/**/docs/**"
  push:
    branches: [main]
concurrency:
  group: ci-packages-${{ github.ref }}
  cancel-in-progress: true
```

Steps: same install/cache pattern, then:

1. `bun run format:check`
2. `bun run turbo type-check --filter='./packages/*'`
3. `bun run turbo lint --filter='./packages/*'`
4. `bun run turbo test --filter='./packages/*'`
5. `bun run turbo build --filter='./packages/*'`

(Single job — these packages are small, no need to parallelize.)

### Step 2 — add missing scripts

In `apps/native-rd/package.json`:

```json
"storybook:web:build": "storybook build --config-dir .storybook-web --output-dir .storybook-web-static"
```

In root `.gitignore`, add `apps/native-rd/.storybook-web-static/`.

### Step 3 — delete the current `ci.yml`

Last commit. Sequence so branch protection isn't broken.

### Step 4 — rewrite `docs/architecture/ci-contract.md`

Replace monorepo language with standalone reality:

- Two workflows: `ci-native-rd.yml`, `ci-packages.yml`. Path filters listed.
- Validation steps per workflow (table format).
- Why Jest + `scripts/jest-node.sh` is still required (Bun's node shim breaks Jest's runtime).
- Pre-commit contract unchanged (lint-staged + check:install + type-check).
- What does NOT apply: `bun test` for native-rd, root ESLint on native-rd files, e2e in CI.
- Codecov contract: token name, flags (`native-rd`), coverage file path.
- a11y contract: pure-Jest audit, artifact path.

### Step 5 — update PR template

Add Prettier + a11y checkboxes to `.github/PULL_REQUEST_TEMPLATE.md`.

### Step 6 — repo settings (manual, not file changes)

- Add `CODECOV_TOKEN` repo secret.
- Update branch protection rules: require `ci-native-rd` and `ci-packages` checks (drop the old `validate` check from removed `ci.yml`).

## Files touched

| File | Action |
| ---- | ------ |
| `.github/workflows/ci.yml` | delete (last commit) |
| `.github/workflows/ci-native-rd.yml` | create |
| `.github/workflows/ci-packages.yml` | create |
| `apps/native-rd/package.json` | add `storybook:web:build` |
| `.gitignore` | add Storybook static output |
| `docs/architecture/ci-contract.md` | full rewrite |
| `.github/PULL_REQUEST_TEMPLATE.md` | add Prettier + a11y rows |

Untouched: `codeql.yml`, `dco.yml`, `claude.yml`, `claude-code-review.yml`, `dependabot.yml`, root `package.json`, root `lint-staged` config, `turbo.json`, `.husky/pre-commit`.

## Verification

After implementing, on a throwaway PR:

1. Touch only `apps/native-rd/CLAUDE.md` → both workflows skip (paths-ignore on `**/*.md`).
2. Touch `apps/native-rd/src/**` → `ci-native-rd` runs all eight gates; `ci-packages` does NOT run.
3. Touch `packages/design-tokens/src/index.ts` → both workflows run.
4. Introduce a deliberate Prettier violation → format step fails.
5. Break one assertion → test step fails, coverage upload skipped.
6. Confirm Codecov reports back on the PR (needs `CODECOV_TOKEN`).
7. a11y JSON artifact uploads and is downloadable.
8. Break a story import → Storybook step fails.

## Risks

- **Codecov token:** initial upload step uses `continue-on-error: true`; flip off once token is added.
- **Branch protection drift:** sequence the legacy `ci.yml` deletion AFTER branch protection has been updated to require the new check names — otherwise merges into main are blocked.

## Out of scope

- E2E (Maestro) in CI — stays local-only per native-rd CLAUDE.md.
- EAS build verification in CI — handled by `eas-build-post-install`.
- iOS / Android device matrix in CI — no signing infra yet.
- Bumping turbo / Bun / Node versions — separate concern.

## Execution commits (atomic, DCO-signed)

1. Add `storybook:web:build` script + `.gitignore` entry.
2. Create `.github/workflows/ci-native-rd.yml`.
3. Create `.github/workflows/ci-packages.yml`.
4. Rewrite `docs/architecture/ci-contract.md`.
5. Update `.github/PULL_REQUEST_TEMPLATE.md`.
6. Delete `.github/workflows/ci.yml` (last, after branch protection updated).
