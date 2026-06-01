# Slice 8 — Build pipeline & tooling

**Status:** not-started
**Drafted:** —
**Reviewed:** —

## Scope

Everything outside the running app: native build orchestration, EAS profiles, native project config, and the `scripts/` directory of release/validation/i18n tooling. Lives near the end of the tour because it doesn't gate runtime code — reviewer benefits from full app context when reading how the app gets built and shipped.

**In scope:**

- **Local build orchestration**
  - `scripts/run-ios.sh` — iOS simulator/device launch
  - `scripts/run-android.sh` — Android emulator/device launch
  - `scripts/testflight-ios.sh` — TestFlight upload helper
  - `scripts/worktree-boot.sh` — git worktree init helper for parallel agents
- **EAS + Expo config**
  - `eas.json` — Build/Submit profiles (dev, preview, production)
  - `app.json` / `app.config.*` — Expo runtime config (name, splash, plugins, permissions)
  - `babel.config.js` — Babel transpiler (Unistyles plugin, Reanimated)
  - `metro.config.js` — Metro bundler config
- **Native projects**
  - `ios/Podfile` — CocoaPods dependency manifest
  - `ios/Podfile.properties.json` — iOS native property overrides
- **Release tooling**
  - `scripts/release-notes-generate.ts`, `release-notes-changelog.ts`, `release-notes-split.ts`, `release-notes-lint.ts`, `release-notes-store.ts`, `release-notes-shared.ts`
- **Validation tooling**
  - `scripts/jest-node.sh` — Jest runner for Node-side tests
  - `scripts/run-e2e.sh` — E2E orchestration
  - `scripts/a11y-audit.sh` — accessibility contract test runner
  - `scripts/agent-logs.sh` — Sentry log exporter for agents
  - `scripts/verify-badge.ts` — OpenBadges credential verification CLI
- **i18n tooling** (the LLM-driven sync pipeline, separate from runtime i18n in slice 5)
  - `scripts/i18n/**` — sync.cli, lintSource.cli, glossary/intent loaders, llmGateway, translator, promptfoo integration, tests
  - `scripts/generate-pseudo-locale.ts` — pseudo-locale generator

**Deferred:**

- Runtime i18n surface (`src/i18n/**`, locale JSONs) — slice 5
- Sentry runtime services (`src/services/sentry*.ts`) — slice 1
- CI workflow files (`.github/workflows/**`) — out of scope for this tour pass (separate review)

## File map

_(filled in during prep)_

## Mental model

_(filled in after walkthrough — expect: Metro bundler boundaries, EAS Build vs local build differences, Sentry sourcemap upload via debug-IDs, release-please integration, the LLM translation loop and its guard rails)_

## RN concepts encountered

_(filled in during walkthrough — expect: Metro resolver, Hermes vs JSC, EAS Build profiles, `expo prebuild` vs managed flow, Sentry debug-ID sourcemap flow)_

## Lens scan

### type-safety

### RN/Expo idiom

### perf hot paths

### a11y / ND-a11y

### test coverage gaps

## Findings

- _(none yet)_

## Open questions

- _(none yet)_
