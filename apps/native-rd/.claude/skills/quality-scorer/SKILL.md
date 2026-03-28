---
name: quality-scorer
description: Grades codebase domains (components, tests, lint, types, a11y, screens) and updates docs/quality/grades.md. Opens a GitHub issue when any grade drops.
---

# Quality Scorer

Analyzes codebase domains and assigns grades (A/B/C/D/F). Updates `docs/quality/grades.md` with current scores.

## Contract

### Input

| Field    | Type     | Required | Description                                    |
| -------- | -------- | -------- | ---------------------------------------------- |
| `domains`| string[] | No       | Specific domains to score (default: all)       |

### Output

| Field                    | Type   | Description                    |
| ------------------------ | ------ | ------------------------------ |
| `grades`                 | object | Domain-to-grade mapping        |
| `grades[domain].grade`   | string | A / B / C / D / F              |
| `grades[domain].detail`  | string | Human-readable detail          |
| `regressions`            | array  | Domains where grade dropped    |
| `issuesCreated`          | number | Regression issues filed        |

## When to Use

- After a PR cycle to track quality trends
- After `/finalize`, as post-PR quality tracking
- On demand: `/quality-score`

## Domains and Grading Criteria

| Domain       | Metric                                          | A     | B    | C    | D/F   |
| ------------ | ----------------------------------------------- | ----- | ---- | ---- | ----- |
| Components   | % with full structure (index.ts + styles + test)| 100%  | 90%+ | 75%+ | <75%  |
| Tests        | % of components with behavioral tests           | 100%  | 85%+ | 70%+ | <70%  |
| Lint         | Error and warning count                         | Both 0| 0 err| <5 err| 5+ err|
| Type Safety  | Typecheck error count                           | 0     | --   | --   | Any   |
| Accessibility| a11y contract tests pass rate                   | All   | 1-2 fail| 3-5 fail| 6+ fail|
| Screens      | % with E2E Maestro coverage                     | 100%  | 75%+ | 50%+ | <50%  |

## Workflow

### Step 1: Component Structure Check

List all components in `src/components/`:

```bash
ls -d src/components/*/
```

For each component directory, check for:
- `index.ts` or `index.tsx` (barrel export)
- `*.styles.ts` (stylesheet)
- Corresponding test file (co-located at `src/components/<Name>/__tests__/` or in `src/__tests__/components/`)

Calculate percentage with all three.

### Step 2: Test Coverage Check

Count components with behavioral tests (tests that assert behavior, not just "it renders"):

```bash
find src/components -path "*/__tests__/*.test.tsx" -o -path "*/__tests__/*.test.ts" | wc -l
```

Also check `src/__tests__/components/` for test files that mirror the components structure.

Compare against total component count.

### Step 3: Lint Check

```bash
bun run lint 2>&1
```

Count errors and warnings from output.

### Step 4: Typecheck

```bash
bun run typecheck 2>&1
```

Count errors from output.

### Step 5: Accessibility Tests

```bash
bun run test:a11y:json 2>&1
```

Parse pass/fail counts. If command not available, run:

```bash
npx jest --no-coverage --testPathPatterns accessibility
```

### Step 6: Screen E2E Coverage

List screens in `src/screens/` and check for matching Maestro flows in `e2e/flows/`.

### Step 7: Calculate Grades

Apply the grading criteria table to produce a grade per domain.

### Step 8: Compare to Previous Grades

Read `docs/quality/grades.md` and parse the previous grades table.

For any grade that dropped (e.g., A -> B, B -> C):
1. Create a GitHub issue:
   ```bash
   gh issue create \
     --title "quality: <domain> grade dropped from <old> to <new>" \
     --body "## Regression\n\n<domain> quality grade dropped.\n\nPrevious: <old>\nCurrent: <new>\n\nDetails: <detail>" \
     --label "type: tech-debt"
   ```

### Step 9: Update grades.md

Overwrite `docs/quality/grades.md` with current grades.

### Step 10: Report

Print the grades table and any regressions.

## Output Format

```text
QUALITY SCORE

| Domain       | Grade | Details                    | Trend |
|-------------|-------|----------------------------|-------|
| Components  | B     | 27/36 with full structure  | --    |
| Tests       | B     | ~80% behavioral coverage   | --    |
| Lint        | A     | 0 errors, 0 warnings       | --    |
| Type Safety | A     | 0 errors                   | --    |
| A11y        | A     | All contract tests pass    | --    |
| Screens     | C     | Partial E2E coverage       | --    |

Regressions: <N> (issues created: <N>)
```

## Error Handling

| Condition                | Behavior                              |
| ------------------------ | ------------------------------------- |
| Command fails            | Grade as F. Open regression issue: "quality: {domain} command failed — grade cannot be computed." |
| grades.md doesn't exist  | Create it (first run)                 |
| Issue creation fails     | Include in output: "Regression detected but issue not filed — create manually." Report `regressions` and `issuesCreated` counts separately so discrepancy is visible. |
| Partial data             | Grade available domains, skip others  |
