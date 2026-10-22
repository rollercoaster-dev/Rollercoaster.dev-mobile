# AGENTS.md

## What This Project Is

rollercoaster.dev (native) — a personal learning and goal tracking app for neurodivergent users. React Native + Expo, local-first, Open Badges 3.0.

See `docs/vision/product-vision.md` for full context.

## Hard Rules

- **NEVER run interactive CLI commands** (auth flows, prompts, `git rebase -i`, etc.) — they hang.
- **Always use native builds** — run `npx expo run:ios` (not `npx expo start`). This is a dev client app, not Expo Go.
  - **Exception:** if the user names a GUI tool (e.g. "set this up in Xcode", "open in Android Studio"), give them the GUI flow — `npx expo prebuild --platform ios` → `cd ios && pod install` → `open ios/Rollercoasterdev.xcworkspace` → walk them through team signing + ▶ in Xcode.app. The CLI rule above governs autonomous agent work; it is **not** what to give a user who explicitly asked for the GUI.
- **Always check PR review comments before merging** — even when CI is green. Run the full review cycle every time.

## Quick Reference

| Question                | Where to look                                                          |
| ----------------------- | ---------------------------------------------------------------------- |
| What is this app?       | `docs/vision/product-vision.md`                                        |
| Design principles?      | `docs/vision/design-principles.md`                                     |
| User stories?           | `docs/vision/user-stories.md`                                          |
| Architecture decisions? | `docs/decisions/ADR-*.md`                                              |
| Data model?             | `docs/architecture/data-model.md`                                      |
| Design language?        | `docs/design/design-language.md`                                       |
| Theme system?           | `docs/design/nd-themes.md`, `docs/architecture/design-token-system.md` |
| Accessibility?          | `docs/accessibility-guidelines.md`                                     |
| Internationalization?   | `docs/i18n.md`                                                         |

## Tech Stack

| Layer         | Choice                                             | Docs                                                        |
| ------------- | -------------------------------------------------- | ----------------------------------------------------------- |
| Runtime       | Expo / React Native                                | `app.json`, `metro.config.js`                               |
| UI styling    | react-native-unistyles v3                          | `docs/decisions/ADR-0002-ui-styling-library.md`             |
| Local storage | Evolu (SQLite + CRDT)                              | `docs/decisions/ADR-0003-sync-layer-decision.md`, `src/db/` |
| Navigation    | React Navigation                                   | `src/navigation/`                                           |
| Testing       | Jest 30 + @testing-library/react-native v13        | `jest.config.js`, `src/__tests__/`                          |
| Design tokens | Unistyles themes (14 = 2 color modes x 7 variants) | `src/themes/`                                               |

## Project Structure

```
src/
├── __tests__/       # Test suites (mirrors src/ structure)
├── components/      # Shared UI components (Button, Card, Input, etc.)
├── db/              # Evolu database schema and queries
├── hooks/           # Custom React hooks
├── navigation/      # React Navigation stacks and tabs
├── screens/         # Screen components (GoalsScreen, SettingsScreen, etc.)
├── stories/         # Storybook stories
├── styles/          # Shared style utilities
├── themes/          # Unistyles theme definitions, tokens, palette
└── utils/           # Utility functions
```

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

## App Legibility Commands

| Command                                                  | Purpose                                |
| -------------------------------------------------------- | -------------------------------------- |
| `bun run test:e2e`                                       | Run all Maestro E2E flows              |
| `bun run test:e2e:single e2e/flows/<flow>.yaml`          | Run single Maestro flow                |
| `bash .claude/skills/simulator-screenshot/screenshot.sh` | Capture simulator screenshot           |
| `bun run logs:agent`                                     | Tail RN/Metro logs as JSON lines       |
| `bun run start:worktree`                                 | Boot Metro on worktree-unique port     |
| `bun run test:a11y:json`                                 | Run a11y suite, structured JSON output |

## Architectural Rules

1. **Components don't import from screens.** Shared components are in `src/components/`, screens consume them.
2. **Theme tokens, not raw colors.** Use `theme.colors.*` from unistyles, never hardcoded hex values.
3. **Every component has:** `index.ts` (barrel export), `*.styles.ts` (unistyles stylesheet), test file, optional `.stories.tsx`.
4. **Local-first always.** No feature requires network connectivity. Sync is optional.
5. **Neurodivergent-first.** Design decisions are driven by ND needs. See `docs/vision/design-principles.md`.

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

Neo-brutalist visual language with hard shadows, bold borders, and confident typography.

- **Tokens from:** `@rollercoaster-dev/design-tokens` (workspace package at `packages/design-tokens/`)
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

Badge logic lives in `@rollercoaster-dev/openbadges-core` (workspace package at `packages/openbadges-core/`).

- **What native-rd uses:** credential building, Ed25519 signing, key pair generation, PNG baking
- **Key abstraction:** `KeyProvider` interface — server uses `FileSystemKeyProvider`, native app will use `SecureStoreKeyProvider` (Expo SecureStore)
- **RN concerns:** `jose` works as-is; Node `crypto` -> `expo-crypto`; Node `zlib` -> `pako`
- **Architecture doc:** `docs/architecture/openbadges-core.md`
- **Data model:** `src/db/schema.ts` (Evolu tables for goals, evidence, badges)

## Documentation

Each `docs/` subdirectory has an `index.md` with a summary and links:

- `docs/vision/index.md` — Product vision, principles, user stories
- `docs/architecture/index.md` — Data model, sync, badges, design tokens
- `docs/design/index.md` — Design language, themes, user flows
- `docs/decisions/index.md` — Architecture Decision Records
- `docs/research/index.md` — Completed research (UI libraries, sync layers, Evolu prototype)
- `docs/plans/index.md` — Active and completed implementation plans

### ADR rules (binding for agents)

1. **Read `docs/decisions/index.md` § Current positions first.** It states the
   net-current decision per topic. Open individual ADRs only for rationale or
   history. Never reconstruct current scope by diffing a supersession chain —
   that is how the ADR-0012 drift incident happened.
2. **Never edit the body of an accepted ADR.** Bodies are immutable. To change
   a decision, write a new ADR that supersedes it.
3. **Headers are the mutable surface.** When a new ADR supersedes or restates
   an old one, update the old ADR's Status line with a pointer — nothing else.
4. **Same-PR projection update.** Any PR that adds, accepts, or supersedes an
   ADR must update `docs/decisions/index.md` (Current positions + Ledger) in
   the same PR.
5. **Quote guardrails, don't paraphrase.** When restating a guardrail in a
   living doc, quote the governing ADR's wording and cite it; paraphrase is
   where drift starts.

## Agent Workflow

- **Planning**: repository docs and issue acceptance criteria. Automated prioritization uses `.agents/skills/project-manager/`.
- **Issue tracking**: GitHub Issues + GitHub Project board
- **Code review**: independent code, test, and failure-handling review through `.agents/skills/review/`.
- **Expert review**: `.agents/skills/expert-review/` — a report-only panel of `review-*` subagents (`.claude/agents/`) grounded in this repo's docs and ADRs, with every finding verified against the code. `/self-review` runs it before a PR; run it alone for a report without fixes.
- **Skills**: See `.claude/skills/` (project skills) and `.agents/skills/` (shared agent skills)
- **Dev plans**: `.claude/dev-plans/` for issue-specific implementation plans

### Issue Workflow

| Command                 | What it does                                                                      |
| ----------------------- | --------------------------------------------------------------------------------- |
| `/start-issue <#>`      | Fetches the issue, researches the codebase, writes the plan; stops for your input |
| `/implement`            | Implements code from a dev plan with atomic commits                               |
| `/self-review`          | Pre-PR gate: local validation + `expert-review`, auto-fixes confirmed blockers    |
| `/expert-review`        | Report-only domain panel; every finding verified against the code                 |
| `/review`               | Portable review-and-fix loop with acceptance checks (Codex and automation)        |
| `/acceptance-validator` | Validates the branch diff against issue acceptance criteria                       |
| `/finalize`             | Pushes branch, creates PR, updates board                                          |
| `/review-to-task <pr>`  | Converts unresolved PR comments to tracked issues                                 |
| `/quality-scorer`       | Grades codebase domains, updates docs/quality/grades.md                           |
| `/auto-issue`           | Runs an issue end to end (automation)                                             |

### Recommended Pre-PR Cycle

```
/implement  -->  /self-review  -->  /acceptance-validator  -->  /finalize
```

1. `/implement` — execute the dev plan with atomic commits
2. `/self-review` — pre-PR gate: local validation and the `/expert-review` panel, auto-fixing confirmed blockers. Codex uses the portable `.agents/skills/review/` workflow. Blocks on unresolved confirmed blockers.
3. `/acceptance-validator` — validate diff against issue acceptance criteria. Flags gaps.
4. `/finalize` — push branch, create PR, update board

After merge: `/review-to-task <pr-number>` to convert unresolved review comments into tracked issues.

### Handling Review-Skipped Findings

Every review finding (`/simplify`, `/review`, `/self-review`, `/expert-review`, GitHub PR reviews) you choose not to fix in scope must be tracked as a **GH issue** (preferred) and/or a **"Follow-ups" section in the active plan** under `apps/native-rd/docs/plans/`. Never chat-only.

## After Making Changes

| Changed           | Run                                         |
| ----------------- | ------------------------------------------- |
| React Native code | `npx expo run:ios` (native build)           |
| Test files        | `bun run test --testPathPatterns <pattern>` |
| Theme/style files | Build + visually verify on device           |
