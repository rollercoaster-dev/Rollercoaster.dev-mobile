# Claude Code Instructions — native-rd

## Hard Rules

- **NEVER run interactive CLI commands** (auth flows, prompts, `git rebase -i`, etc.) — they hang.
- **Always use native builds** — run `npx expo run:ios` (not `npx expo start`). This is a dev client app, not Expo Go.
  - **Exception:** if the user names a GUI tool (e.g. "set this up in Xcode", "open in Android Studio"), give them the GUI flow — `npx expo prebuild --platform ios` → `cd ios && pod install` → `open ios/Rollercoasterdev.xcworkspace` → walk them through team signing + ▶ in Xcode.app. The CLI rule above governs autonomous agent work; it is **not** what to give a user who explicitly asked for the GUI.
- **Always check PR review comments before merging** — even when CI is green. Run the full review cycle every time.

## Project Context

This is the native rollercoaster.dev app — a personal learning/goal tracker for neurodivergent users. See `AGENTS.md` for the full map.

## Commands

| Task      | Command                                                                          |
| --------- | -------------------------------------------------------------------------------- |
| Typecheck | `bun run type-check`                                                             |
| Lint      | `bun run lint`                                                                   |
| Test      | `bun run test` (scope with `--testPathPatterns <pattern>`) — never `bun test`    |
| CI test   | `bun run test:ci`                                                                |
| Build iOS | `npx expo run:ios` (sim) or `bun run ios` (uses `.env.local` for device default) |

**Releasing?** See `docs/release.md` for the pipeline + runbook.

**Any build target?** Load the `native-rd-build` skill — covers local iOS sim/device, Release builds, EAS profiles, and Android (when set up). Each section is tagged `[VERIFIED <date>]` / `[UNTESTED]` / `[BROKEN]` so you know what's battle-tested. **Update the skill as you use it** — promote tags, add gotchas, bump version.

## Tests

- Jest 30, `@testing-library/react-native` v13
- **Run with `bun run test`** — it goes through `scripts/jest-node.sh`, which runs Jest under real Node. Plain `jest`/`npx jest` and `bun test` (Bun's own runner) both reintroduce Bun/Jest runtime failures. See `README.md`.
- Use `--testPathPatterns` (plural, not `--testPathPattern`)
- Test files live in `src/__tests__/` mirroring `src/` structure
- Use `test.each` instead of duplicating tests that follow the same pattern
- Don't write tests that assert nothing beyond "it renders"
- **Never commit an assertion that cannot fail** — see [`.claude/rules/no-unfalsifiable-assertions.md`](../../.claude/rules/no-unfalsifiable-assertions.md). Sweep every negative assertion before committing: if no plausible regression makes it fail, delete it.
- Before deleting a test, grep the codebase to confirm something else covers that behavior
- Never delete a11y contract tests or regression tests tied to bug fixes

## Design System

Neo-brutalist visual language with hard shadows, bold borders, and confident typography. **Theme inventory:** `docs/design/nd-themes.md`. **Component contract** (typography, elevation, action states, inputs): `docs/design/design-language.md`.

- **Tokens from:** `@rollercoaster-dev/design-tokens` (workspace package at `packages/design-tokens/`)
- **Adapter layer:** `src/themes/adapter.ts` — the single import boundary from the package
- **Theme composition:** `src/themes/compose.ts` — 7 product themes (`productThemeEntries`); dark (`dark-default`, Night Ride) is one of the seven, not an axis
- **Shadows:** `src/styles/shadows.ts` — `shadowStyle(theme, role)` with semantic roles `cardElevation` / `cardElevationSmall` / `modalElevation`; Bold Ink, Still Water and Loud & Clear render none
- **Fonts:** Anybody (headlines), Instrument Sans (body), DM Mono (code); Warm Studio uses Lexend and Loud & Clear uses Atkinson Hyperlegible for body and headlines
- **Storybook:** `bun run storybook:web` — `src/stories/design-system/` token stories, `src/stories/composed/` screens in the app shell

Theme ids follow `{colorMode}-{variant}` (e.g. `light-default`, `light-dyslexia`). Other pairs (`largeText`, `dark-<variant>`) compose for tests only and are not product themes.

### Styling

- **react-native-unistyles v3** with Babel plugin (ADR-0002)
- `StyleSheet.create((theme) => ...)` IS reactive to theme changes via `setTheme()`
- Use theme tokens, never hardcoded colors

## ND Accessibility

Targets WCAG 2.1 AA. Five accessibility themes ship beside The Full Ride and Night Ride as day-one requirements, not afterthoughts:

- **Bold Ink** (`light-highContrast`) — WCAG AAA (7:1), no shadows, strong borders
- **Warm Studio** (`light-dyslexia`) — Lexend font, cream bg, relaxed line height
- **Still Water** (`light-autismFriendly`) — muted/desaturated colors, no shadows
- **Loud & Clear** (`light-lowVision`) — max contrast, Atkinson Hyperlegible, 1.25× text, no shadows
- **Clean Signal** (`light-lowInfo`) — reduced visual complexity

Key files: `src/utils/accessibility.ts` (contrast checker), `docs/accessibility-guidelines.md`, `src/__tests__/accessibility.test.tsx` (a11y contract tests), `src/themes/__tests__/contrast.test.ts`.

All interactive elements require: `accessibilityRole`, `accessibilityLabel`, 44x44pt minimum touch targets.

## OpenBadges Core

Badge logic lives in `@rollercoaster-dev/openbadges-core` (workspace package at `packages/openbadges-core/`).

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
- **Review-skipped findings**: track as GH issue or in plan "Follow-ups" — never chat-only. See `AGENTS.md` → Handling Review-Skipped Findings.

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

| Changed           | Run                                         |
| ----------------- | ------------------------------------------- |
| React Native code | `npx expo run:ios` (native build)           |
| Test files        | `bun run test --testPathPatterns <pattern>` |
| Theme/style files | Build + visually verify on device           |
