# Tech Debt Tracker

Versioned record of known technical debt. Agents add entries when they discover debt; entries are updated when debt is resolved.

Last updated: 2026-02-28

## Active Debt

| ID | Area | Description | Severity | Status | Added | Updated |
|----|------|-------------|----------|--------|-------|---------|
| TD-001 | Components | BadgeCard missing behavioral tests (onPress, conditional render, a11y role) | HIGH | OPEN | 2026-02-28 | 2026-02-28 |
| TD-002 | Components | CollapsibleSection missing behavioral tests (toggle, a11y state) | HIGH | OPEN | 2026-02-28 | 2026-02-28 |
| TD-003 | Components | Divider missing behavioral tests | LOW | OPEN | 2026-02-28 | 2026-02-28 |
| TD-004 | Components | EmptyState missing behavioral tests (conditional icon/action) | MEDIUM | OPEN | 2026-02-28 | 2026-02-28 |
| TD-005 | Components | GoalCard missing behavioral tests (progress calc, a11y label) | HIGH | OPEN | 2026-02-28 | 2026-02-28 |
| TD-006 | Components | ProgressBar missing behavioral tests (clamping, a11y value) | MEDIUM | OPEN | 2026-02-28 | 2026-02-28 |
| TD-007 | Components | SettingsRow missing behavioral tests (3 render modes, callbacks) | HIGH | OPEN | 2026-02-28 | 2026-02-28 |
| TD-008 | Components | SettingsSection missing behavioral tests (separator logic) | LOW | OPEN | 2026-02-28 | 2026-02-28 |
| TD-009 | Components | ThemeSwitcher missing behavioral tests (radio selection, a11y) | HIGH | OPEN | 2026-02-28 | 2026-02-28 |
| TD-010 | Screens | E2E coverage at 12% (3/25 Maestro flows); unit at 48% (12/25) | MEDIUM | OPEN | 2026-02-28 | 2026-02-28 |
| TD-011 | Components | Overall structural completeness 75% (9 components missing tests) | MEDIUM | OPEN | 2026-02-28 | 2026-02-28 |
| TD-012 | Architecture | `utils/evidenceViewers.tsx` imports 4 screen modules — inverts dependency direction | MEDIUM | RESOLVED | 2026-02-28 | 2026-02-28 |
| TD-013 | Architecture | `src/db/queries.ts` at 1010 lines / 32 exports — candidate for domain split | LOW | OPEN | 2026-02-28 | 2026-02-28 |

## Resolved Debt

| ID | Area | Description | Severity | Resolved | Resolution |
|----|------|-------------|----------|----------|------------|
| TD-012 | Architecture | `utils/evidenceViewers.tsx` imports 4 screen modules — inverts dependency direction | MEDIUM | 2026-02-28 | Moved 4 modal components from `src/screens/` to `src/components/`; extended ESLint rule to cover `src/utils/` |

## How This File Is Updated

- **Agents add entries** when they discover debt (cleanup-agent, doc-gardener, quality-scorer)
- **Entries move to Resolved** when the debt is fixed (status → RESOLVED, add resolved date and resolution note)
- **The quality-scorer skill** references this file before opening regression issues to avoid duplicates
- **ID format**: `TD-NNN` — monotonically increasing, never reused

## Severity Levels

| Level | Meaning |
|-------|---------|
| CRITICAL | Blocks development or causes runtime failures |
| HIGH | Significant gap in quality, testing, or documentation |
| MEDIUM | Known shortcoming with workaround or low impact |
| LOW | Minor improvement opportunity |
