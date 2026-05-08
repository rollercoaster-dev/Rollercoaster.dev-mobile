# Claude Code Instructions — native-rd

## Hard Rules

- **NEVER run interactive CLI commands** (auth flows, prompts, `git rebase -i`, etc.) — they hang.
- **Always use native builds** — run `npx expo run:ios` (not `npx expo start`). This is a dev client app, not Expo Go.
- **Always check PR review comments before merging** — even when CI is green. Run the full review cycle every time.

## Project Context

This is the native rollercoaster.dev app — a personal learning/goal tracker for neurodivergent users. See `AGENTS.md` for the full map.

## Commands

| Task      | Command                                                                          |
| --------- | -------------------------------------------------------------------------------- |
| Typecheck | `bun run type-check`                                                             |
| Lint      | `bun run lint`                                                                   |
| Test      | `npx jest --no-coverage` or `bun test --testPathPatterns <pattern>`              |
| CI test   | `bun run test:ci`                                                                |
| Build iOS | `npx expo run:ios` (sim) or `bun run ios` (uses `.env.local` for device default) |

**Any build target?** Load the `native-rd-build` skill — covers local iOS sim/device, Release builds, EAS profiles, and Android (when set up). Each section is tagged `[VERIFIED <date>]` / `[UNTESTED]` / `[BROKEN]` so you know what's battle-tested. **Update the skill as you use it** — promote tags, add gotchas, bump version.

## Tests

- Jest 30, `@testing-library/react-native` v13
- Use `--testPathPatterns` (plural, not `--testPathPattern`)
- Test files live in `src/__tests__/` mirroring `src/` structure
- Use `test.each` instead of duplicating tests that follow the same pattern
- Don't write tests that assert nothing beyond "it renders"
- Before deleting a test, grep the codebase to confirm something else covers that behavior
- Never delete a11y contract tests or regression tests tied to bug fixes

## Design System

Neo-brutalist visual language with hard shadows, bold borders, and confident typography.

- **Tokens from:** `@rollercoaster-dev/design-tokens` (npm package, lives in openbadges-monorepo)
- **Adapter layer:** `src/themes/adapter.ts` — the single import boundary from the package
- **Theme composition:** `src/themes/compose.ts` — 2 color modes x 7 variants = 14 themes
- **Shadows:** `src/styles/shadows.ts` — `shadowStyle(theme, key)` helper; hard shadows (`hardSm`/`hardMd`/`hardLg`) have radius: 0
- **Fonts:** Anybody (headlines), Instrument Sans (body), DM Mono (code), Lexend (dyslexia), Atkinson Hyperlegible (low vision)
- **Storybook:** `src/stories/design-system/` — Colors, Typography, Spacing reference stories

Theme names follow `{colorMode}-{variant}` pattern (e.g., `light-default`, `dark-highContrast`).

### Styling

- **react-native-unistyles v3** with Babel plugin (ADR-0002)
- `StyleSheet.create((theme) => ...)` IS reactive to theme changes via `setTheme()`
- Use theme tokens, never hardcoded colors

## ND Accessibility

Targets WCAG 2.1 AA. Six accessibility variants built as day-one requirements, not afterthoughts:

- **highContrast** — WCAG AAA (7:1), no shadows, strong borders
- **largeText** — 1.25x font scale
- **dyslexia** — Lexend font, cream bg, relaxed line height (1.7-1.9x)
- **lowVision** — max contrast + large text combined
- **autismFriendly** — muted/desaturated colors, no shadows, reduced visual noise
- **lowInfo** — reduced visual complexity

Key files: `src/utils/accessibility.ts` (contrast checker), `docs/accessibility-guidelines.md`, `src/__tests__/accessibility.test.tsx` (a11y contract tests), `src/themes/__tests__/contrast.test.ts`.

All interactive elements require: `accessibilityRole`, `accessibilityLabel`, 44x44pt minimum touch targets.

## OpenBadges Core

Badge logic comes from `openbadges-modular-server` in the [rollercoaster-dev monorepo](https://github.com/rollercoaster-dev/openbadges-monorepo). Being extracted into `@rollercoaster-dev/openbadges-core` as a shared package.

- **What native-rd uses:** credential building, Ed25519 signing, key pair generation, PNG baking
- **Key abstraction:** `KeyProvider` interface — server uses `FileSystemKeyProvider`, native app will use `SecureStoreKeyProvider` (Expo SecureStore)
- **RN concerns:** `jose` works as-is; Node `crypto` -> `expo-crypto`; Node `zlib` -> `pako`
- **Architecture doc:** `docs/architecture/openbadges-core.md`
- **Data model:** `src/db/schema.ts` (Evolu tables for goals, evidence, badges)

## Workflow

- **Query graph-flow knowledge before acting** — run `k-query` for relevant area/topic at session start
- **Planning stack**: use `p-stack`, `p-goal`, `p-plan` etc. for tracking work
- **Issue workflow**: graph-flow skills (`setup`, `implement`, `finalize`)
- **Code review**: CodeRabbit CLI at `~/.local/bin/coderabbit` — use `coderabbit review --plain`

## Graph Flow (Issue Workflow)

| Command                | What it does                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| `/work-on-issue <#>`   | Creates branch, sets up board, fetches issue                                                |
| `/implement`           | Implements code from a dev plan with atomic commits                                         |
| `/review`              | Runs code-reviewer, test-analyzer, silent-failure-hunter in parallel                        |
| `/self-review`         | Pre-PR gate: runs local validation + CodeRabbit + Claude agents, auto-fixes critical issues |
| `/accept-check`        | Validates PR diff against issue acceptance criteria                                         |
| `/quality-score`       | Grades codebase domains, updates docs/quality/grades.md                                     |
| `/review-to-task <pr>` | Converts unresolved PR comments to tracked issues                                           |
| `/finalize`            | Pushes branch, creates PR, updates board                                                    |
| `/auto-issue`          | Creates a new GitHub issue                                                                  |
| `/board-status`        | Shows project board state                                                                   |
| `/issue-fetcher`       | Fetches and analyzes issue details                                                          |
| `/milestone-status`    | Shows milestone progress and blockers                                                       |

## After Making Changes

| Changed           | Run                                     |
| ----------------- | --------------------------------------- |
| React Native code | `npx expo run:ios` (native build)       |
| Test files        | `bun test --testPathPatterns <pattern>` |
| Theme/style files | Build + visually verify on device       |
