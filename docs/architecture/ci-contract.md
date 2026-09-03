# CI and Validation Contract

This is a standalone repo housing one app (`apps/native-rd`) and two
workspace packages (`packages/design-tokens`, `packages/openbadges-core`).
CI is split across path-filtered workflows so PRs only run the checks
that matter for the changed code. This document is reconciled against
the tree and live GitHub Actions state; every workflow file listed below
is enabled and running, and every action version matches the `uses:`
pins in `.github/workflows/`.

## Workflows

| Workflow                        | File                                           | Triggers on                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ci-native-rd`                  | `.github/workflows/ci-native-rd.yml`           | Changes under `apps/native-rd/**` (excluding `docs/`, `research/`, `prototypes/` subdirs), `packages/design-tokens/**`, `packages/openbadges-core/**`, or root inputs that affect the gate (`bun.lock`, `bunfig.toml`, `turbo.json`, `package.json`, `.prettierignore`) / the workflow file. A blanket `**/*.md` exclusion is deliberately NOT applied — see "Why no blanket `**/*.md` exclusion" below. |
| `ci-packages`                   | `.github/workflows/ci-packages.yml`            | Changes under `packages/**` (excluding `**/*.md` and `**/docs/**`), or root inputs that affect the gate (`bun.lock`, `bunfig.toml`, `turbo.json`, `package.json`, `tsconfig.json`, `eslint.config.mjs`, `.prettierignore`) / the workflow file.                                                                                                                                                          |
| `ci-format`                     | `.github/workflows/ci-format.yml`              | Any `**/*.{ts,tsx,js,jsx,json,md}` change (listed as separate globs — Actions path filters have no brace expansion), plus `.prettierignore` / the workflow file. Sole owner of `format:check` for PRs; see "ci-format validation steps".                                                                                                                                                                 |
| `codeql`                        | `.github/workflows/codeql.yml`                 | CodeQL security scanning (JS/TS), weekly + on push/PR + manual dispatch. Ignores `apps/native-rd/prototypes/**`. This committed workflow is the only scanning path: GitHub code-scanning default setup is **not** configured for this repo, so disabling the workflow means zero scanning.                                                                                                               |
| `dco`                           | `.github/workflows/dco.yml`                    | Verifies `Signed-off-by:` on commits touching app/package paths.                                                                                                                                                                                                                                                                                                                                         |
| `claude` / `claude-code-review` | `.github/workflows/claude*.yml`                | Claude Code Review integration. Manual / comment-triggered.                                                                                                                                                                                                                                                                                                                                              |
| `release-please`                | `.github/workflows/release-please.yml`         | Maintains the native-rd release PR from conventional commits on `main`.                                                                                                                                                                                                                                                                                                                                  |
| `build-internal`                | `.github/workflows/build-internal.yml`         | Manual direct-install preview builds. Produces EAS internal-distribution artifacts and does not submit to stores.                                                                                                                                                                                                                                                                                        |
| `build-production`              | `.github/workflows/build-production.yml`       | Runs when a GitHub Release is published or by manual dispatch (`ref` + `platform`). Submits iOS production builds to App Store Connect/TestFlight and currently submits Android production AABs to Play internal testing while public production access remains disabled. `platform: android` is the Play-internal-only path (the former `build-play-internal` workflow was removed in #609).            |
| `release-please-next-pr`        | `.github/workflows/release-please-next-pr.yml` | On `release: published` (or manual dispatch): re-runs release-please so the next release PR opens immediately instead of waiting for the next push to `main`.                                                                                                                                                                                                                                            |
| `i18n-sync`                     | `.github/workflows/i18n-sync.yml`              | PRs touching `apps/native-rd/src/i18n/resources/en/**` (or manual dispatch): syncs en → de translation resources via OpenRouter, using the `OPENROUTER_API_KEY` secret, and pushes the result to the PR branch.                                                                                                                                                                                          |
| `storybook-pages`               | `.github/workflows/storybook-pages.yml`        | Push to `main` touching native-rd source / design-tokens / openbadges-core (or manual dispatch): builds the web Storybook and deploys it to GitHub Pages.                                                                                                                                                                                                                                                |

Both release workflows (`build-internal`, `build-production`) call
`.github/workflows/_release-validate.yml`, which is a release preflight
gate, not a replacement for `ci-native-rd`.

Both validation workflows use the same install + cache layout:

1. `actions/checkout@v7`
2. `oven-sh/setup-bun@v2` with `bun-version-file: package.json` (locks to `bun@1.3.7`)
3. `actions/setup-node@v7` (Node 22; native-rd uses `apps/native-rd/.nvmrc`)
4. `actions/cache@v6` for `~/.bun/install/cache` keyed on `bun.lock`
5. `actions/cache@v6` for `.turbo` keyed on `bun.lock` + the workflow file
6. `bun install --frozen-lockfile`

Other pinned actions in the tree: `github/codeql-action/{init,analyze}@v4`,
`actions/upload-artifact@v7`, `googleapis/release-please-action@v5`,
`anthropics/claude-code-action@v1`, and for Storybook Pages
`actions/configure-pages@v6` / `actions/upload-pages-artifact@v5` /
`actions/deploy-pages@v5`. Dependabot bumps these; when it does, update
this list in the same PR.

## ci-native-rd validation steps

| Step                 | Command                                                                                                        | Notes                                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typecheck            | `bun run turbo type-check --filter=native-rd`                                                                  | `turbo.json` declares `type-check.dependsOn: ["^build"]`, so design-tokens and openbadges-core builds run automatically as prerequisites.                                                                                                                                                                                                                                                           |
| Lint                 | `bun run turbo lint --filter=native-rd`                                                                        | Delegates to `expo lint` + the six native-rd local rules. Root ESLint is not invoked here (see "What does NOT apply").                                                                                                                                                                                                                                                                              |
| Test (with coverage) | `cd apps/native-rd && bun run test:ci -- --coverage --coverageReporters=lcov --coverageReporters=json-summary` | Jest 30 via `scripts/jest-node.sh`. Writes `apps/native-rd/coverage/lcov.info` and `coverage/coverage-summary.json`.                                                                                                                                                                                                                                                                                |
| Coverage summary     | `jq` over `coverage/coverage-summary.json` → `$GITHUB_STEP_SUMMARY`                                            | Renders a lines/statements/functions/branches table in the job summary and uploads `apps/native-rd/coverage/` as the `coverage-native-rd` artifact (`if-no-files-found: error`). No third-party service, no token, no `continue-on-error`: a missing summary file fails the job. (Codecov was removed in #609 — it never had a token and had uploaded nothing.)                                     |
| a11y audit           | `cd apps/native-rd && bun run test:a11y:json > a11y.json`                                                      | Pure-Jest audit (no simulator). Output uploaded as the `a11y-audit` artifact via `actions/upload-artifact@v7` and runs even on prior-step failure (`if: always()`).                                                                                                                                                                                                                                 |
| Storybook web build  | `cd apps/native-rd && bun run storybook:web:build`                                                             | Static build to `apps/native-rd/.storybook-web-static/` (gitignored). Verifies stories compile; not deployed.                                                                                                                                                                                                                                                                                       |
| E2E (manual gate)    | `cd apps/native-rd && bun run test:e2e:required`                                                               | **NOT run in CI.** Maestro needs a booted iOS simulator and a dev-client build (`bun run ios:e2e`), neither of which the hosted runners have. Run locally before merging anything touching the goal/evidence/badge lifecycle and attach the `e2e/reports/junit.xml` summary to the PR. Procedure and required environment block: `apps/native-rd/e2e/README.md`. CI enforcement is tracked in #560. |

## ci-packages validation steps

| Step      | Command                                            |
| --------- | -------------------------------------------------- |
| Typecheck | `bun run turbo type-check --filter='./packages/*'` |
| Lint      | `bun run turbo lint --filter='./packages/*'`       |
| Test      | `bun run turbo test --filter='./packages/*'`       |
| Build     | `bun run turbo build --filter='./packages/*'`      |

## ci-format validation steps

| Step         | Command                |
| ------------ | ---------------------- |
| Format check | `bun run format:check` |

`ci-format` is a thin workflow that triggers on any change to a file the
root Prettier glob covers (`**/*.{ts,tsx,js,jsx,json,md}`, plus
`.prettierignore` and the workflow file itself). It is the **only** PR
workflow that runs `format:check`. `ci-native-rd` and `ci-packages` used
to run it too, so a typical PR paid for the same workspace-wide Prettier
pass three times (#256); those steps were removed in #609. `ci-format`
needs no node toolchain, so the job is fast. `_release-validate.yml`
keeps its own format step because it is a standalone release preflight,
not a PR-trigger workflow.

## Release validation steps

`_release-validate.yml` is intentionally scoped to release preflight. It runs
before `build-internal` and `build-production`, checks out the exact ref being
built, installs dependencies, then runs:

| Step         | Command                |
| ------------ | ---------------------- |
| Format check | `bun run format:check` |
| Typecheck    | `bun run type-check`   |
| Lint         | `bun run lint`         |
| Test         | `bun run test`         |

This catches broad workspace breakage before an EAS build starts. It does not
replace `ci-native-rd`, which remains the fuller PR/main validation gate with
coverage summary + artifact, a11y artifacts, and Storybook build verification.

## Why no blanket `**/*.md` exclusion on ci-native-rd

The `ci-native-rd` workflow filter does NOT carry a top-level
`!**/*.md` (or equivalent) exclusion. An earlier revision did, and it
caused the workflow to never register on PRs that mixed code changes
with any markdown file (PR template edits, plan docs, architecture
docs touched in the same PR). PR #26 was the canary that surfaced
this — see commit `cedbc3c` for the removal rationale.

What this means in practice:

- A PR that touches only `apps/native-rd/CLAUDE.md` (or any top-level
  markdown under `apps/native-rd/`) WILL still trigger `ci-native-rd`.
  The cost is a few minutes of CI per pure-docs PR.
- The only excluded native-rd subdirs are `docs/`, `research/`,
  `prototypes/` (curated dirs whose contents never affect build/test).
- For `ci-packages`, `**/*.md` and `**/docs/**` ARE excluded under
  `packages/**`, because no package code-path consumes those.
- Pure-docs PRs that miss every other workflow are still caught by
  `ci-format`, which runs `format:check` on any change to a
  Prettier-covered extension (markdown included).

The tradeoff is intentional: correctness on mixed PRs over efficiency
on pure-docs PRs.

## Why Jest (not `bun test`) for native-rd

`apps/native-rd/scripts/jest-node.sh` is the entry point for every Jest
invocation in CI. It exists because:

- The root `bunfig.toml` sets `[run] bun = true`, which prepends a
  Bun-provided `node` shim to `PATH` for package CLIs.
- Running Jest through that shim crashes in `jest-runtime` before tests
  load with: `TypeError: Attempted to assign to readonly property` in
  `_getMockedNativeModule`.
- `jest-node.sh` strips Bun's `bun-node-*` shim from `PATH`, unsets
  Bun's `NODE` / `npm_node_execpath` values, prefers a `mise` Node when
  available, then executes `node node_modules/.bin/jest "$@"`.

This keeps native-rd on Jest while leaving the rest of the workspace
free to use Bun's runtime and `bun test` if needed.

Expo packages that ship ESM through Bun's isolated
`node_modules/.bun/.../node_modules/` layout must be listed in
`transformIgnorePatterns`. In particular, `expo/virtual/env.js`
requires the `expo` package allowlist entry in
`apps/native-rd/jest.config.js`.

## a11y audit contract

- Script: `apps/native-rd/scripts/a11y-audit.sh` (also runnable as
  `bun run test:a11y` for human output or `bun run test:a11y:json` for
  machine-readable output).
- Backed by: `bash scripts/jest-node.sh --testPathPatterns accessibility --json` — Jest is invoked through the same `jest-node.sh` wrapper as the main test step so Bun's injected `node` shim is bypassed (see "Why Jest (not `bun test`) for native-rd" above).
- Runner dependencies: `python3` (preinstalled on `ubuntu-latest`) for
  the JSON summary formatter.
- Asserts: every test matching the `accessibility` pattern — including
  `src/__tests__/accessibility.test.tsx` and
  `src/themes/__tests__/contrast.test.ts` — passes.
- CI artifact: `a11y-audit` containing `apps/native-rd/a11y.json`. Uploaded
  even when the step fails so failures are inspectable.

## Coverage contract

- Produced by the `Test (with coverage)` step in `ci-native-rd` (Jest
  `lcov` + `json-summary` reporters).
- Published two ways, both in-repo: a table in the run's job summary and
  the `coverage-native-rd` artifact containing `apps/native-rd/coverage/`.
- No external coverage service. If one is ever added, it must fail the
  run on upload error — a step that reports success while logging a
  failure is worse than no step at all.

## Honesty rule for CI steps

No step may carry `continue-on-error: true` or an equivalent soft-fail
flag unless the step is explicitly informational and the contract row
says so. A green check must mean the step did what its name says.

## Pre-commit Behavior

Root `lint-staged` configuration (in `package.json`):

- `apps/native-rd/**/*.{ts,tsx,js,jsx}` — ESLint `--fix --cache` via `apps/native-rd/eslint.config.js` + Prettier
- `packages/openbadges-core/**/*.ts` — ESLint `--fix --cache` + Prettier
- JSON / YAML / MD / CSS / SCSS — Prettier only

Root ESLint does NOT run on native-rd source files because:

- The root flat config (`eslint.config.mjs`) exists and is used by
  `lint-staged` for `packages/openbadges-core`, but it explicitly
  ignores `apps/native-rd/**` — the Expo/React Native globals it would
  need would conflict with the root rule set.
- The Expo-native config (`apps/native-rd/eslint.config.js`) plus the
  six local plugin rules are the source of truth for native-rd.
- Running root ESLint on native files can block commits for false
  positives.

The pre-commit hook does lint staged native-rd JS/TS files, but it points ESLint at the native app config explicitly:

```bash
eslint --fix --cache --config apps/native-rd/eslint.config.js <staged native files>
```

To lint all native-rd files locally before committing:

```bash
cd apps/native-rd && bun run lint
```

`.husky/pre-commit` runs:

```bash
bun run check:install      # Fail fast if install is stale after pulling new deps
bunx lint-staged           # ESLint+Prettier on staged native-rd and packages/openbadges-core files
bun run type-check         # Full workspace typecheck
```

## Local Launch Contract

- Treat `npx expo run:ios` / `bun run ios` as the canonical iOS start
  path. The root wrapper `bun run native:ios` delegates to
  `cd apps/native-rd && bash scripts/run-ios.sh`.
- Treat `npx expo run:android` / `bun run android` as the canonical
  Android start path.
- Do NOT treat `expo start` as the primary launch command. `native-rd`
  is a native dev-client app, not Expo Go.
- The shared `ios:device` script receives its target device via
  `IOS_DEVICE_ID` (no hardcoded contributor UDIDs).

## What Does NOT Apply to native-rd

By design, the following do not run for native-rd:

- `bun test` / vitest — native-rd uses Jest, not Bun's test runner.
- Root ESLint — native-rd uses its local `eslint.config.js`.
- E2E (Maestro) — runs locally only via
  `apps/native-rd/scripts/run-e2e.sh`. CI has no simulator / device.
- EAS build verification — handled by `eas-build-post-install` during
  EAS cloud builds, not GitHub Actions.

## Branch Protection

The required status checks on `main` should be:

- `ci-native-rd / Native-RD Validate`
- `ci-packages / Packages Validate`
- `ci-format / Format Check`
- `dco-check / Verify Signed-off-by`
- (optional) `CodeQL Security Scanning / Analyze JavaScript/TypeScript`

As of 2026-09-03 this list is **not enforced**: `main` has no branch
protection rule (`gh api repos/<owner>/<repo>/branches/main/protection`
→ 404). Enabling it is a repo-settings change tracked separately from
this document. When it is enabled, use the job names above (the
`ci-docs / Docs Format Check` name no longer exists).
