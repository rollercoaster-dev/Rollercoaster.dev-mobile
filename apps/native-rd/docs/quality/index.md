# Quality Documentation

Agent-maintained quality tracking for the native-rd codebase.

## Files

| File | Purpose | Updated By |
|------|---------|-----------|
| `grades.md` | Current quality grades per domain | quality-scorer skill |
| `tech-debt.md` | Versioned tech debt tracker with severity and status | cleanup-agent, doc-gardener, quality-scorer |

## How Grades Work

Grades are updated by the `quality-scorer` skill after each PR cycle. When a grade drops, the skill opens a GitHub issue to flag the regression.

See `.claude/skills/quality-scorer/SKILL.md` for grading criteria.

## Domains

- **Components** — structural completeness (index.ts + styles + test)
- **Tests** — behavioral test coverage
- **Lint** — ESLint error/warning count
- **Type Safety** — TypeScript error count
- **Accessibility** — a11y contract test pass rate
- **Screens** — E2E Maestro flow coverage
