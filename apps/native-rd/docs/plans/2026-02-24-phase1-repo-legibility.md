# Phase 1: Repository Legibility — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the repo self-documenting for agents. An agent should navigate from a high-level task to the exact code, docs, and context it needs without human guidance.

**Architecture:** Three-tier progressive disclosure: `AGENTS.md` (map) → `docs/` index files (directories) → individual docs and source code (details). `CLAUDE.md` in-repo for project-specific agent instructions. All docs cross-linked and freshness-tracked.

**Tech Stack:** Markdown, existing docs structure, no new dependencies.

---

### Task 1: Create root AGENTS.md

**Files:**

- Create: `AGENTS.md`

**Step 1: Write AGENTS.md**

This is the ~100-line table of contents. Not an encyclopedia — a map. It tells agents what the project is, how it's structured, and where to look for more detail.

```markdown
# AGENTS.md

## What This Project Is

rollercoaster.dev (native) — a personal learning and goal tracking app for neurodivergent users. React Native + Expo, local-first, Open Badges 3.0.

See `docs/vision/product-vision.md` for full context.

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

## Tech Stack

| Layer         | Choice                                             | Docs                                                        |
| ------------- | -------------------------------------------------- | ----------------------------------------------------------- |
| Runtime       | Expo / React Native                                | `app.json`, `metro.config.js`                               |
| UI styling    | react-native-unistyles v3                          | `docs/decisions/ADR-0002-ui-styling-library.md`             |
| Local storage | Evolu (SQLite + CRDT)                              | `docs/decisions/ADR-0003-sync-layer-decision.md`, `src/db/` |
| Navigation    | React Navigation                                   | `src/navigation/`                                           |
| Testing       | Jest 30 + @testing-library/react-native v13        | `jest.config.js`, `src/__tests__/`                          |
| Design tokens | Unistyles themes (14 = 2 color modes × 7 variants) | `src/themes/`                                               |

## Project Structure
```

src/
├── **tests**/ # Test suites (mirrors src/ structure)
├── components/ # Shared UI components (Button, Card, Input, etc.)
├── db/ # Evolu database schema and queries
├── hooks/ # Custom React hooks
├── navigation/ # React Navigation stacks and tabs
├── screens/ # Screen components (GoalsScreen, SettingsScreen, etc.)
├── stories/ # Storybook stories
├── styles/ # Shared style utilities
├── themes/ # Unistyles theme definitions, tokens, palette
└── utils/ # Utility functions

```

## Development Commands

| Command | Purpose |
|---|---|
| `bun run typecheck` | TypeScript type checking |
| `bun run lint` | ESLint |
| `bun test` | Run Jest test suite |
| `bun run test:ci` | CI test run |
| `npx expo run:ios` | Build and run on iOS (NEVER use `expo start`) |

## Architectural Rules

1. **Components don't import from screens.** Shared components are in `src/components/`, screens consume them.
2. **Theme tokens, not raw colors.** Use `theme.colors.*` from unistyles, never hardcoded hex values.
3. **Every component has:** `index.ts` (barrel export), `*.styles.ts` (unistyles stylesheet), test file, optional `.stories.tsx`.
4. **Local-first always.** No feature requires network connectivity. Sync is optional.
5. **Neurodivergent-first.** Design decisions are driven by ND needs. See `docs/vision/design-principles.md`.

## Documentation

Each `docs/` subdirectory has an `index.md` with a summary and links:

- `docs/vision/index.md` — Product vision, principles, user stories
- `docs/architecture/index.md` — Data model, sync, badges, design tokens
- `docs/design/index.md` — Design language, themes, user flows
- `docs/decisions/index.md` — Architecture Decision Records
- `docs/research/index.md` — Completed research (UI libraries, sync layers, Evolu prototype)
- `docs/plans/index.md` — Active and completed implementation plans

## Agent Workflow

- **Planning**: graph-flow planning stack (`mcp__graph-flow__p-*`)
- **Issue tracking**: GitHub Issues + GitHub Project board
- **Code review**: CodeRabbit + Claude review on every PR
- **Skills**: See `skills/` directory and `.agents/skills/`
- **Dev plans**: `.claude/dev-plans/` for issue-specific implementation plans
```

**Step 2: Verify the file reads well**

Run: `wc -l AGENTS.md`
Expected: ~90-100 lines

**Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "docs: create root AGENTS.md as agent navigation map

Table of contents for the repo: tech stack, project structure,
development commands, architectural rules, and pointers to deeper
docs. ~100 lines of progressive disclosure, not an encyclopedia."
```

---

### Task 2: Create in-repo CLAUDE.md

**Files:**

- Create: `CLAUDE.md`

**Step 1: Write CLAUDE.md**

Project-specific instructions for Claude Code. Under 200 lines. Pulls relevant bits from the global `~/CLAUDE.md` and the auto-memory, but scoped to this repo.

```markdown
# Claude Code Instructions — native-rd

## Hard Rules

- **NEVER run interactive CLI commands** (auth flows, prompts, `git rebase -i`, etc.) — they hang.
- **Always use native builds** — run `npx expo run:ios` (not `npx expo start`). This is a dev client app, not Expo Go.
- **Always check PR review comments before merging** — even when CI is green. Run the full review cycle every time.

## Project Context

This is the native rollercoaster.dev app — a personal learning/goal tracker for neurodivergent users. See `AGENTS.md` for the full map.

## Development

| Task      | Command                                               |
| --------- | ----------------------------------------------------- |
| Typecheck | `bun run typecheck`                                   |
| Lint      | `bun run lint`                                        |
| Test      | `bun test` or `bun test --testPathPatterns <pattern>` |
| CI test   | `bun run test:ci`                                     |
| Build iOS | `npx expo run:ios`                                    |

### Test Infrastructure

- Jest 30, `@testing-library/react-native` v13, ~253 tests
- Use `--testPathPatterns` (plural, not `--testPathPattern`)
- Test files live in `src/__tests__/` mirroring `src/` structure

### Styling

- **react-native-unistyles v3** with Babel plugin (ADR-0002)
- `StyleSheet.create((theme) => ...)` IS reactive to theme changes via `setTheme()`
- 14 themes = 2 color modes × 7 variants
- Use theme tokens, never hardcoded colors

## Workflow

- **Query graph-flow knowledge before acting** — run `k-query` for relevant area/topic at session start
- **Planning stack**: use `p-stack`, `p-goal`, `p-plan` etc. for tracking work
- **Issue workflow**: graph-flow skills (`setup`, `implement`, `finalize`)
- **Code review**: CodeRabbit CLI at `~/.local/bin/coderabbit` — use `coderabbit review --plain`

## After Making Changes

| Changed           | Run                                     |
| ----------------- | --------------------------------------- |
| React Native code | `npx expo run:ios` (native build)       |
| Test files        | `bun test --testPathPatterns <pattern>` |
| Theme/style files | Build + visually verify on device       |
```

**Step 2: Verify length**

Run: `wc -l CLAUDE.md`
Expected: ~55-65 lines (well under 200)

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: create in-repo CLAUDE.md with project-specific instructions

Hard rules, dev commands, test infra details, styling notes,
and workflow instructions. Replaces reliance on global config
and auto-memory for project-specific context."
```

---

### Task 3: Create docs/vision/index.md

**Files:**

- Create: `docs/vision/index.md`

**Step 1: Write the index**

```markdown
# Vision

Documents defining what the app is, who it's for, and how it should feel.

| Document                                       | Summary                                                   | Last Verified |
| ---------------------------------------------- | --------------------------------------------------------- | ------------- |
| [product-vision.md](./product-vision.md)       | What the app is, iterations A-D, relationship to monorepo | 2026-02-24    |
| [design-principles.md](./design-principles.md) | ND-first design rules, visual identity, 7 themes          | 2026-02-24    |
| [user-stories.md](./user-stories.md)           | Lina, Sam, Ava, Eva — real scenarios driving design       | 2026-02-24    |
```

**Step 2: Commit**

```bash
git add docs/vision/index.md
git commit -m "docs: add vision directory index"
```

---

### Task 4: Create docs/architecture/index.md

**Files:**

- Create: `docs/architecture/index.md`

**Step 1: Write the index**

```markdown
# Architecture

Technical architecture documents for the native app.

| Document                                           | Summary                                                     | Last Verified |
| -------------------------------------------------- | ----------------------------------------------------------- | ------------- |
| [data-model.md](./data-model.md)                   | Goals, Steps, Badges, Evidence entities and relationships   | 2026-02-24    |
| [openbadges-core.md](./openbadges-core.md)         | Plan for extracting badge logic from monorepo server        | 2026-02-24    |
| [local-first-sync.md](./local-first-sync.md)       | Evolu sync architecture, encryption, self-hosted relay      | 2026-02-24    |
| [design-token-system.md](./design-token-system.md) | Unistyles theme tokens, composition, color modes × variants | 2026-02-24    |
```

**Step 2: Commit**

```bash
git add docs/architecture/index.md
git commit -m "docs: add architecture directory index"
```

---

### Task 5: Create docs/design/index.md

**Files:**

- Create: `docs/design/index.md`

**Step 1: Write the index**

```markdown
# Design

Visual design, user experience, and theme documentation.

| Document                                   | Summary                                                    | Last Verified |
| ------------------------------------------ | ---------------------------------------------------------- | ------------- |
| [design-language.md](./design-language.md) | Neo-brutalist design language adapted for mobile           | 2026-02-24    |
| [nd-themes.md](./nd-themes.md)             | 7 neurodiversity themes × 2 color modes = 14 theme configs | 2026-02-24    |
| [user-flows.md](./user-flows.md)           | Screen-by-screen flows for Iteration A                     | 2026-02-24    |
```

**Step 2: Commit**

```bash
git add docs/design/index.md
git commit -m "docs: add design directory index"
```

---

### Task 6: Create docs/decisions/index.md

**Files:**

- Create: `docs/decisions/index.md`

**Step 1: Write the index**

```markdown
# Architecture Decision Records

Decisions are immutable once accepted. To change a decision, write a new ADR that supersedes it.

| ADR                                           | Decision                                  | Status   | Last Verified |
| --------------------------------------------- | ----------------------------------------- | -------- | ------------- |
| [ADR-0001](./ADR-0001-iteration-strategy.md)  | Iteration A → B → C → D shipping strategy | Accepted | 2026-02-24    |
| [ADR-0002](./ADR-0002-ui-styling-library.md)  | react-native-unistyles v3 for styling     | Accepted | 2026-02-24    |
| [ADR-0003](./ADR-0003-sync-layer-decision.md) | Evolu for local-first sync                | Accepted | 2026-02-24    |
| [ADR-0004](./ADR-0004-data-model-storage.md)  | Evolu-native data model with SQLite       | Accepted | 2026-02-24    |
```

**Step 2: Commit**

```bash
git add docs/decisions/index.md
git commit -m "docs: add decisions directory index"
```

---

### Task 7: Create docs/research/index.md

**Files:**

- Create: `docs/research/index.md`

**Step 1: Write the index**

```markdown
# Research

Completed research documents. These informed ADRs but are not the decisions themselves.

| Document                                                           | Summary                                       | Last Verified |
| ------------------------------------------------------------------ | --------------------------------------------- | ------------- |
| [ui-library-comparison.md](./ui-library-comparison.md)             | Tamagui vs NativeWind vs Unistyles evaluation | 2026-02-24    |
| [local-first-sync-comparison.md](./local-first-sync-comparison.md) | PowerSync vs Evolu vs RxDB evaluation         | 2026-02-24    |
| [evolu-prototype-findings.md](./evolu-prototype-findings.md)       | Findings from Evolu prototype implementation  | 2026-02-24    |
```

**Step 2: Commit**

```bash
git add docs/research/index.md
git commit -m "docs: add research directory index"
```

---

### Task 8: Create docs/plans/index.md

**Files:**

- Create: `docs/plans/index.md`

**Step 1: Write the index**

```markdown
# Plans

Implementation plans and vision documents. Active plans are in progress; completed plans are historical record.

## Active

| Document                                                                       | Summary                                                       | Last Verified |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------- | ------------- |
| [2026-02-24-agent-first-vision.md](./2026-02-24-agent-first-vision.md)         | Vision for agent-first development across 5 capability layers | 2026-02-24    |
| [2026-02-24-phase1-repo-legibility.md](./2026-02-24-phase1-repo-legibility.md) | Implementation plan for Phase 1: Repository Legibility        | 2026-02-24    |

## Reference

| Document                                                                   | Summary                                   |
| -------------------------------------------------------------------------- | ----------------------------------------- |
| [../roadmap/documentation-roadmap.md](../roadmap/documentation-roadmap.md) | Documentation phase tracking (Phases 1-4) |
```

**Step 2: Commit**

```bash
git add docs/plans/index.md
git commit -m "docs: add plans directory index"
```

---

### Task 9: Fix stale references in product-vision.md

**Files:**

- Modify: `docs/vision/product-vision.md:128-136`

**Step 1: Update the Technical Foundation table**

The table still says "Tamagui or Gluestack + NativeWind" and "PowerSync or Evolu" — these decisions have been made.

Replace the Technical Foundation table with:

```markdown
## Technical Foundation

| Layer             | Choice                                    | Status                          |
| ----------------- | ----------------------------------------- | ------------------------------- |
| **Runtime**       | Expo / React Native                       | Decided                         |
| **UI styling**    | react-native-unistyles v3                 | Decided (ADR-0002)              |
| **Local storage** | Evolu (SQLite + CRDT)                     | Decided (ADR-0003, ADR-0004)    |
| **Sync layer**    | Evolu built-in sync                       | Decided (ADR-0003)              |
| **Badge logic**   | `openbadges-core` (extracted from server) | Decided, extraction in progress |
| **Types**         | `openbadges-types` (shared with monorepo) | Existing, published on npm      |
| **Design tokens** | Unistyles theme system (14 themes)        | Implemented                     |
```

**Step 2: Update the Related Documents section**

Remove references to "Tamagui vs Gluestack research" and "PowerSync vs Evolu research" as decision-making links. Point to ADRs instead.

**Step 3: Commit**

```bash
git add docs/vision/product-vision.md
git commit -m "docs: update product-vision.md with current tech decisions

Replace outdated 'Tamagui or Gluestack' and 'PowerSync or Evolu'
references with actual decisions: Unistyles (ADR-0002) and
Evolu (ADR-0003/0004)."
```

---

### Task 10: Update documentation-roadmap.md

**Files:**

- Modify: `docs/roadmap/documentation-roadmap.md:60-70`

**Step 1: Update Phase 4 decisions status**

ADR-0003 and ADR-0004 exist. Mark them as done. ADR-0002 covers UI. Update the Phase 4 section:

```markdown
## Phase 4 — Decisions (completed)

- [x] `decisions/ADR-0002-ui-styling-library.md` — Chose react-native-unistyles v3
- [x] `decisions/ADR-0003-sync-layer-decision.md` — Chose Evolu for local-first sync
- [x] `decisions/ADR-0004-data-model-storage.md` — Chose Evolu-native data model with SQLite
```

Update the summary table at the bottom accordingly.

**Step 2: Commit**

```bash
git add docs/roadmap/documentation-roadmap.md
git commit -m "docs: mark Phase 4 decisions as completed in roadmap

ADR-0002 (Unistyles), ADR-0003 (Evolu sync), and ADR-0004
(Evolu data model) all exist and are accepted."
```

---

### Task 11: Final verification

**Step 1: Verify all links resolve**

Run: `for f in docs/*/index.md; do echo "=== $f ==="; grep -oP '\(\.\/[^)]+\)' "$f" | tr -d '()' | while read link; do dir=$(dirname "$f"); test -f "$dir/$link" && echo "  OK: $link" || echo "  MISSING: $link"; done; done`

Expected: All links resolve to existing files.

**Step 2: Verify AGENTS.md references resolve**

Spot-check that files referenced in AGENTS.md exist: `docs/vision/product-vision.md`, `docs/decisions/ADR-0002-ui-styling-library.md`, `src/db/`, `src/themes/`, etc.

**Step 3: Run existing tests to ensure nothing broke**

Run: `bun test`
Expected: All ~253 tests pass (no code was changed, only docs).

**Step 4: Commit any fixes if needed**

---

## Summary

| Task | What                         | Files                                   |
| ---- | ---------------------------- | --------------------------------------- |
| 1    | Root AGENTS.md               | `AGENTS.md`                             |
| 2    | In-repo CLAUDE.md            | `CLAUDE.md`                             |
| 3    | Vision index                 | `docs/vision/index.md`                  |
| 4    | Architecture index           | `docs/architecture/index.md`            |
| 5    | Design index                 | `docs/design/index.md`                  |
| 6    | Decisions index              | `docs/decisions/index.md`               |
| 7    | Research index               | `docs/research/index.md`                |
| 8    | Plans index                  | `docs/plans/index.md`                   |
| 9    | Fix stale product-vision.md  | `docs/vision/product-vision.md`         |
| 10   | Update documentation roadmap | `docs/roadmap/documentation-roadmap.md` |
| 11   | Final verification           | (no new files)                          |

11 tasks, ~11 commits. All docs, no code changes. Estimated: 30-45 minutes of agent execution time.
