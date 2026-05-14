# native-rd: CI and Validation Contract

Follow-up to PR #882 (monorepo import) and PR #890 (Jest stabilization).
Resolves issue #888.

## Validation Environments

native-rd has a different toolchain from the rest of the monorepo:

- Test runner: Jest 30 + babel-jest (not bun test)
- Lint: eslint-config-expo + six local rules (not shared-config Vue/TS rules)
- Types: TypeScript strict, RN-aware tsconfig

For this reason it has its own ESLint config (`apps/native-rd/eslint.config.js`).
Its lint, typecheck, and test tasks run alongside the workspace packages in the
single `ci.yml` workflow described below.

## CI Workflow

There is a single CI workflow: `.github/workflows/ci.yml`. It runs on every PR
(except docs-only changes filtered by `paths-ignore`) and on every push to
`main`.

| Step           | Command                                                 | Notes                                                               |
| -------------- | ------------------------------------------------------- | ------------------------------------------------------------------- |
| Install        | `bun install --frozen-lockfile`                         | Locked install from `bun.lock`                                      |
| Build packages | `bun --filter @rollercoaster-dev/design-tokens build`   | Style Dictionary output needed before consumers type-check          |
|                | `bun --filter @rollercoaster-dev/openbadges-core build` | `dist/` needed for native-rd's TypeScript resolution                |
| Typecheck      | `bun run type-check`                                    | `turbo type-check` across workspace                                 |
| Lint           | `bun run lint`                                          | `turbo lint` across workspace; native-rd uses its own ESLint config |
| Test           | `bun run test`                                          | `turbo test` runs Jest in native-rd, `bun test` in openbadges-core  |

Earlier revisions of this doc described a two-workflow split (a root CI plus a
separate native-rd workflow). That split has been removed: the broader
workflow's coverage was promoted into a single `ci.yml` and the duplicate
deleted.

Docs-only changes (`**/*.md`, `docs/**`, `apps/*/docs/**`, `apps/*/research/**`,
`apps/*/prototypes/**`) skip CI via `paths-ignore`.

## Pre-commit Behavior

Root `lint-staged` configuration:

- `apps/native-rd/**/*.{ts,tsx,js,jsx}`: Prettier only (no root ESLint)
- All other TS/TSX/JS/JSX/Vue: root ESLint + Prettier
- JSON, YAML, MD, CSS: Prettier only

Root ESLint does NOT run on native-rd source files because:

- Root config uses Vue/TS rules incompatible with Expo/React-Native globals
- Root config does not load eslint-config-expo or the six local plugin rules
- Running root ESLint on native files can block commits for false positives

To lint native-rd files locally before committing, run:

```bash
cd apps/native-rd && bun run lint
```

## Test Contract

- Test runner: Jest 30 with `babel-jest` transform (not bun test)
- Test command for CI: `bun run test:ci` from `apps/native-rd/`
- Test discovery: `src/**/__tests__/**/*.test.{ts,tsx}`
- The smoke command (`bun run test:ci:smoke`) is retained as a
  debugging tool but is not used in CI.
- All tests run in Node via the React Native Jest environment
  (`react-native/jest/react-native-env.js`)
- The Jest package scripts intentionally call `scripts/jest-node.sh`, not `jest`
  directly. The monorepo `bunfig.toml` sets `[run] bun = true`, which prepends a
  Bun-provided `node` shim to `PATH` for package CLIs. Running Jest through that
  shim crashes in `jest-runtime` before tests load with:
  `TypeError: Attempted to assign to readonly property` in
  `_getMockedNativeModule`.
- `scripts/jest-node.sh` strips Bun's temporary `bun-node-*` shim from `PATH`,
  unsets Bun's `NODE`/`npm_node_execpath` values, prefers a `mise` Node when
  available, and then executes `node node_modules/.bin/jest`. This keeps
  native-rd on Jest while leaving the rest of the monorepo free to use Bun's
  runtime and `bun test`.
- Expo packages that ship ESM through Bun's isolated `.bun/.../node_modules/`
  layout must be listed in `transformIgnorePatterns`. In particular,
  `expo/virtual/env.js` requires the `expo` package allowlist entry in
  `apps/native-rd/jest.config.js`.

## Local Launch Contract

- Treat `npx expo run:ios` / `bun run ios` as the canonical local iOS start path.
- Treat `npx expo run:android` / `bun run android` as the canonical local Android start path.
- Do not treat `expo start` as the primary launch command for this app. `native-rd`
  depends on native modules and is intended to run as a native build/dev client app.
- The root monorepo wrapper `bun run native:ios` is expected to delegate to
  `cd apps/native-rd && bash scripts/run-ios.sh`.

## Monorepo Verification Notes

Verified on April 7, 2026:

- Bun workspace wiring is correct: `native-rd` is discoverable as a workspace package.
- Turbo task wiring is correct: `bun run turbo build --filter=native-rd` and
  `bun run turbo type-check --filter=native-rd` both succeed.
- The package-level `build` script is intentionally a no-op because this Expo app does
  not emit a standard monorepo build artifact.
- The generated native `ios/` directory is expected to remain untracked; it is ignored
  in `apps/native-rd/.gitignore`.
- The stabilized iOS launch path is `scripts/run-ios.sh`, used by both
  `bun run ios` in `apps/native-rd` and `bun run native:ios` from the monorepo root.
- The shared `ios:device` script is expected to receive its target device via
  `IOS_DEVICE_ID`, rather than hardcoding a contributor-specific UDID.

Launcher implementation note:

- Expo-managed CocoaPods installation proved flaky in this monorepo because Bun could
  launch the command with a temporary Node shim and npm-compat environment variables
  that broke `expo-modules-autolinking`.
- `scripts/run-ios.sh` avoids that path by selecting a real Node binary, clearing
  Bun-injected `npm_*` variables, running `pod install --repo-update --ansi`
  directly, and then delegating to `expo run:ios --no-install`.

## What Does NOT Apply to native-rd

The following root-level checks do not run for native-rd (by design):

- `bun test` / vitest — native-rd uses Jest, not bun's test runner
- Root ESLint (`eslint.config.mjs`) — native-rd uses `eslint.config.js` inside the app
- Root unit/integration/e2e turbo tasks — native-rd tests run via Jest in the native workflow
