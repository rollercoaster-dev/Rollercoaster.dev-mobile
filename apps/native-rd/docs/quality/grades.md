# Quality Grade Dashboard

Last updated: 2026-02-28
Updated by: foundations-review-phase1

| Domain        | Grade | Details                                        | Trend |
| ------------- | ----- | ---------------------------------------------- | ----- |
| Components    | C     | 75% structural (27/36); barrel+styles at 100%  | --    |
| Tests         | B-    | 88 suites, 1244 tests; 27/36 components tested | up    |
| Lint          | A     | 0 errors, 313 warnings                         | --    |
| Type Safety   | A     | 0 typecheck errors                             | --    |
| Accessibility | A     | 15/15 a11y contracts pass (all 14 themes)      | --    |
| Screens       | C     | 48% unit-tested (12/25); 12% E2E (3/25)        | up    |

## How This File Is Updated

This file is maintained by the `quality-scorer` skill. After each PR cycle, the skill re-evaluates all domains and overwrites the table above.

When a grade drops, the skill opens a GitHub issue labeled `type: tech-debt` to flag the regression.

See `.claude/skills/quality-scorer/SKILL.md` for grading criteria.
