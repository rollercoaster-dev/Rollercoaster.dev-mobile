# CI and Validation Contract

This is a standalone repo housing one app (`apps/native-rd`) and two
workspace packages (`packages/design-tokens`, `packages/openbadges-core`).
CI is split across two path-filtered workflows so PRs only run the
checks that matter for the changed code.

## Workflows

| Workflow                        | File                                 | Triggers on                                                                                                                                                                                                                                                              |
| ------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ci-native-rd`                  | `.github/workflows/ci-native-rd.yml` | Changes under `apps/native-rd/**`, `packages/design-tokens/**`, `packages/openbadges-core/**`, or root inputs that affect the gate (`bun.lock`, `bunfig.toml`, `turbo.json`, `package.json`, `.prettierignore`) / the workflow file. Docs-only changes are filtered out. |
| `ci-packages`                   | `.github/workflows/ci-packages.yml`  | Changes under `packages/**`, or root inputs that affect the gate (`bun.lock`, `bunfig.toml`, `turbo.json`, `package.json`, `tsconfig.json`, `eslint.config.mjs`, `.prettierignore`) / the workflow file. Package docs are filtered out.                                  |
| `codeql`                        | `.github/workflows/codeql.yml`       | Security scanning (JS/TS), weekly + on push/PR.                                                                                                                                                                                                                          |
| `dco`                           | `.github/workflows/dco.yml`          | Verifies `Signed-off-by:` on commits touching app/package paths.                                                                                                                                                                                                         |
| `claude` / `claude-code-review` | `.github/workflows/claude*.yml`      | Claude Code Review integration. Manual / comment-triggered.                                                                                                                                                                                                              |

Both validation workflows use the same install + cache layout:

1. `actions/checkout@v6`
2. `oven-sh/setup-bun@v2` with `bun-version-file: package.json` (locks to `bun@1.3.7`)
3. `actions/setup-node@v6` (Node 22; native-rd uses `apps/native-rd/.nvmrc`)
4. Cache `~/.bun/install/cache` keyed on `bun.lock`
5. Cache `.turbo` keyed on `bun.lock` + the workflow file
6. `bun install --frozen-lockfile`

## ci-native-rd validation steps

| Step                 | Command                                                                       | Notes                                                                                                                                                               |
| -------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Format check         | `bun run format:check`                                                        | Root Prettier glob (`**/*.{ts,tsx,js,jsx,json,md}`) honoring `.prettierignore`.                                                                                     |
| Typecheck            | `bun run turbo type-check --filter=native-rd`                                 | `turbo.json` declares `type-check.dependsOn: ["^build"]`, so design-tokens and openbadges-core builds run automatically as prerequisites.                           |
| Lint                 | `bun run turbo lint --filter=native-rd`                                       | Delegates to `expo lint` + the six native-rd local rules. Root ESLint is not invoked here (see "What does NOT apply").                                              |
| Test (with coverage) | `cd apps/native-rd && bun run test:ci -- --coverage --coverageReporters=lcov` | Jest 30 via `scripts/jest-node.sh`. Writes `apps/native-rd/coverage/lcov.info`.                                                                                     |
| Coverage upload      | `codecov/codecov-action@v5`                                                   | `flags: native-rd`, `files: apps/native-rd/coverage/lcov.info`. `continue-on-error: true` until `CODECOV_TOKEN` is provisioned in repo secrets.                     |
| a11y audit           | `cd apps/native-rd && bun run test:a11y:json > a11y.json`                     | Pure-Jest audit (no simulator). Output uploaded as the `a11y-audit` artifact via `actions/upload-artifact@v4` and runs even on prior-step failure (`if: always()`). |
| Storybook web build  | `cd apps/native-rd && bun run storybook:web:build`                            | Static build to `apps/native-rd/.storybook-web-static/` (gitignored). Verifies stories compile; not deployed.                                                       |

## ci-packages validation steps

| Step         | Command                                            |
| ------------ | -------------------------------------------------- |
| Format check | `bun run format:check`                             |
| Typecheck    | `bun run turbo type-check --filter='./packages/*'` |
| Lint         | `bun run turbo lint --filter='./packages/*'`       |
| Test         | `bun run turbo test --filter='./packages/*'`       |
| Build        | `bun run turbo build --filter='./packages/*'`      |

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
- Backed by: `npx jest --testPathPatterns accessibility --json`.
- Runner dependencies: `python3` (preinstalled on `ubuntu-latest`) for
  the JSON summary formatter.
- Asserts: every test matching the `accessibility` pattern — including
  `src/__tests__/accessibility.test.tsx` and
  `src/themes/__tests__/contrast.test.ts` — passes.
- CI artifact: `a11y-audit` containing `apps/native-rd/a11y.json`. Uploaded
  even when the step fails so failures are inspectable.

## Codecov contract

- Token: `CODECOV_TOKEN` repo secret.
- Flag: `native-rd`.
- Coverage file: `apps/native-rd/coverage/lcov.info`.
- The upload step is initially `continue-on-error: true`. Once the
  token is provisioned and verified, flip it off so missing uploads
  fail the run.

## Pre-commit Behavior

Root `lint-staged` configuration (in `package.json`):

- `apps/native-rd/**/*.{ts,tsx,js,jsx}` — Prettier only (no root ESLint)
- `packages/openbadges-core/**/*.ts` — ESLint `--fix --cache` + Prettier
- JSON / YAML / MD / CSS / SCSS — Prettier only

Root ESLint does NOT run on native-rd source files because:

- The root config (if any is added) would conflict with Expo/React Native
  globals.
- The Expo-native config (`apps/native-rd/eslint.config.js`) plus the
  six local plugin rules are the source of truth for native-rd.
- Running root ESLint on native files can block commits for false
  positives.

To lint native-rd files locally before committing:

```bash
cd apps/native-rd && bun run lint
```

`.husky/pre-commit` runs:

```bash
bun run check:install      # Fail fast if install is stale after pulling new deps
bunx lint-staged           # Prettier on native-rd, ESLint+Prettier on packages/openbadges-core
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
- `dco-check / Verify Signed-off-by`
- (optional) `CodeQL`

The legacy `validate / Build, Typecheck, Lint & Test` check from the
removed monolithic `ci.yml` must be dropped at the same time the
workflow file is deleted, or merges to `main` will block.
