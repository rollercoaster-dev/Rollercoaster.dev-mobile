---
name: cleanup-agent
description: Recurring cleanup agents — stale docs, dead code, pattern drift, unused exports, test coverage gaps
---

# Cleanup Agent

Runs five targeted scans to detect entropy in the codebase. Produces a structured report and optionally opens GitHub issues for findings above threshold.

## Contract

### Input

| Field       | Type     | Required | Description                                                |
| ----------- | -------- | -------- | ---------------------------------------------------------- |
| `scans`     | string[] | No       | Specific scans to run (default: all five)                  |
| `auto-file` | boolean  | No       | Auto-open GitHub issues for HIGH findings (default: false) |

### Output

| Field           | Type   | Description                         |
| --------------- | ------ | ----------------------------------- |
| `findings`      | array  | All findings with severity          |
| `summary`       | object | Count per severity level            |
| `issuesCreated` | number | GitHub issues opened (if auto-file) |

## When to Use

- After a milestone completes — catch accumulated drift
- Before starting a new feature cycle — clean slate
- On demand: `/cleanup` or `Run cleanup agent`
- After large refactors — verify nothing was left behind

## Scans

### 1. Dead Code

Detect exports with zero non-test importers.

**How:**

1. List all `export` declarations across `src/` (excluding test files, stories, and type-only exports)
2. For each export, grep for its name across `src/` (excluding the defining file and test files)
3. If zero import sites found, flag as dead code

**Severity:** MEDIUM (unused export) / HIGH (unused file with no importers at all)

### 2. Unused Exports

Cross-reference barrel exports against actual import sites.

**How:**

1. Read all `src/components/*/index.ts` barrel files
2. For each re-exported symbol, grep for imports of that symbol across `src/`
3. Flag symbols that are only imported by the barrel itself (re-exported but never consumed)

**Severity:** LOW

### 3. Stale Docs

Check documentation freshness by verifying file path references and date claims.

**How:**

1. Read all `docs/**/*.md` files
2. Extract file path references (backtick-quoted paths like `src/foo/bar.ts`)
3. Check each referenced path exists with Glob
4. Flag missing paths as stale references

**Severity:** MEDIUM (stale path reference) / LOW (outdated count/stat)

### 4. Pattern Drift

Detect code that violates established patterns.

**How:**

1. **Raw colors outside style files**: Grep for hex color literals (`#[0-9a-fA-F]{3,8}`) in `.tsx` files under `src/components/` and `src/screens/` (excluding `.styles.ts` files and test files)
2. **Non-unistyles StyleSheet**: Grep for `StyleSheet.create` imports from `react-native` (should use `react-native-unistyles`)
3. **require() calls**: Grep for `require(` in `.ts`/`.tsx` files under `src/` (prefer ES imports). Exclude `.js` files (ESLint rules are CJS)

**Severity:** MEDIUM (pattern drift) / LOW (style preference)

### 5. Coverage Gaps

Identify components without behavioral tests.

**How:**

1. Read `src/__tests__/structure/component-structure.test.ts` (⚠️ hardcoded path — update if this file moves)
2. Extract the `KNOWN_UNTESTED` set
3. List all component directories under `src/components/`
4. Cross-reference to find untested components
5. Check for components that have test files but only assert "it renders" (no behavioral assertions)

**Severity:** MEDIUM (in KNOWN_UNTESTED) / LOW (render-only test)

## Workflow

### Step 1: Run Selected Scans

Run each scan independently. Collect findings into a flat array:

```
{ scan: string, file: string, line?: number, message: string, severity: 'HIGH' | 'MEDIUM' | 'LOW' }
```

### Step 2: Aggregate

Count findings by severity:

```
{ HIGH: N, MEDIUM: N, LOW: N, total: N }
```

### Step 3: Auto-File (if enabled)

If `auto-file` is true and HIGH findings exist:

```bash
gh issue create \
  --title "tech-debt: <scan> — <summary>" \
  --body "<details>" \
  --label "type: tech-debt"
```

Group related findings into a single issue (e.g., all dead code findings → one issue).

### Step 4: Update Tech Debt Tracker

If `docs/quality/tech-debt.md` exists, append new findings that aren't already tracked.

## Output Format

```text
CLEANUP REPORT

Scan: Dead Code
  [MEDIUM] src/utils/oldHelper.ts:15 — export 'formatLegacy' has 0 importers
  [HIGH]   src/utils/deprecated.ts — entire file has 0 importers

Scan: Pattern Drift
  [MEDIUM] src/screens/Home.tsx:42 — raw hex color #FF0000 (use theme token)

Summary: 2 HIGH, 3 MEDIUM, 1 LOW (6 total)
Issues created: 1
```

## Error Handling

| Condition            | Behavior                               |
| -------------------- | -------------------------------------- |
| Grep/glob fails      | Skip scan, report as "SCAN_ERROR"      |
| Issue creation fails | Report finding, note "issue not filed" |
| tech-debt.md missing | Skip tracker update, warn              |
