---
name: review
description: Coordinates review agents and manages auto-fix loop. Spawns code-reviewer, test-analyzer, silent-failure-hunter in parallel, classifies findings, and attempts fixes for critical issues.
allowed-tools: Bash, Read, Glob, Grep, Skill, Agent
---

# Review Skill

Coordinate review + auto-fix cycle.

## Contract

### Input

| Field         | Type     | Required | Description                               |
| ------------- | -------- | -------- | ----------------------------------------- |
| `workflow_id` | string   | Yes      | Workflow ID (`issue-<N>`) — for log lines |
| `skip_agents` | string[] | No       | Agents to skip (default: none)            |
| `max_retry`   | number   | No       | Max fix attempts per finding (default: 3) |
| `parallel`    | boolean  | No       | Run agents in parallel (default: true)    |

### Output

| Field                 | Type    | Description                     |
| --------------------- | ------- | ------------------------------- |
| `findings`            | array   | All findings from review agents |
| `findings[].agent`    | string  | Which agent found this          |
| `findings[].severity` | string  | CRITICAL, HIGH, MEDIUM, LOW     |
| `findings[].file`     | string  | File path                       |
| `findings[].line`     | number  | Line number                     |
| `findings[].message`  | string  | Finding description             |
| `findings[].fixed`    | boolean | Whether auto-fix succeeded      |
| `summary.total`       | number  | Total findings                  |
| `summary.critical`    | number  | Critical findings               |
| `summary.fixed`       | number  | Successfully fixed              |
| `summary.unresolved`  | number  | Critical findings not fixed     |

### Side Effects

1. Spawn review agents as standalone background agents (parallel or sequential, never team members)
2. Spawn auto-fixer as standalone background agent for critical findings
3. Create fix commits

## Review Agents

| Agent                                     | Purpose                | Critical Threshold                   |
| ----------------------------------------- | ---------------------- | ------------------------------------ |
| `pr-review-toolkit:code-reviewer`         | Code quality, patterns | Confidence >= 91 OR label="Critical" |
| `pr-review-toolkit:pr-test-analyzer`      | Test coverage gaps     | Gap rating >= 8                      |
| `pr-review-toolkit:silent-failure-hunter` | Error handling         | Severity = "CRITICAL"                |

## Workflow

### Step 1: Detect Scope

**Changed files:**

```bash
git diff main --name-only
```

**Read dev plan if exists:**

```bash
ls apps/native-rd/docs/plans/dev-plans/issue-*.md 2>/dev/null
```

Multiple matches → use filename containing current issue number. If plan exists for current issue:

1. Read **Intent Verification** — success criteria
2. Read **Not in Scope** — items that should NOT be implemented
3. Store both for output summary

### Step 1.5: Run /simplify (Code Quality Pass)

Run built-in `/simplify` for code quality, reuse, efficiency. Complements review agents (bugs, test gaps, silent failures).

1. Run: `/simplify`
2. If `/simplify` made changes:
   a. Validate (each command separately):
   ```bash
   bun run type-check
   ```
   ```bash
   bun run lint
   ```
   ```bash
   bun test
   ```
   b. Valid: `git commit -m "refactor: apply simplify suggestions"` (husky adds DCO)
   c. Invalid: revert via `git reset --hard HEAD && git clean -fd` (resets tracked, removes untracked `/simplify` artifacts)
3. Continue to Step 2 regardless.

### Step 2: Spawn Review Agents

**CRITICAL: Team isolation.** All review agents are internal sub-agents — MUST be standalone background agents, never team members. Do NOT pass `team_name`.

**Parallel mode (default):**

Spawn all agents simultaneously via Agent tool with `run_in_background: true` (no `team_name`):

```text
Agent(pr-review-toolkit:code-reviewer, run_in_background: true): "Review code changes for issue workflow <workflow_id>"
Agent(pr-review-toolkit:pr-test-analyzer, run_in_background: true): "Analyze test coverage for changes"
Agent(pr-review-toolkit:silent-failure-hunter, run_in_background: true): "Check for silent failures in changes"
```

**Sequential mode:**

Spawn one at a time via Agent tool (no `team_name`), collect results.

### Step 3: Collect and Normalize Findings

Each agent returns different formats. Normalize to:

```json
{
  "agent": "<agent-name>",
  "severity": "CRITICAL|HIGH|MEDIUM|LOW",
  "file": "<file-path>",
  "line": <line-number>,
  "message": "<description>",
  "fixed": false
}
```

**Classification rules:**

| Agent                 | CRITICAL if                          | HIGH if          | MEDIUM/LOW otherwise    |
| --------------------- | ------------------------------------ | ---------------- | ----------------------- |
| code-reviewer         | Confidence >= 91 OR label="Critical" | Confidence >= 75 | Confidence < 75         |
| silent-failure-hunter | Severity="CRITICAL"                  | Severity="HIGH"  | Severity="MEDIUM"/"LOW" |
| pr-test-analyzer      | Gap rating >= 8                      | Gap rating >= 5  | Gap rating < 5          |

### Step 4: Auto-Fix Loop

**For each CRITICAL finding:**

```text
attempt = 0
while not fixed AND attempt < max_retry:
    attempt++

    Spawn auto-fixer (standalone — no team_name):
    Agent(auto-fixer, run_in_background: true): "Fix: <finding.message> in <finding.file>:<finding.line>"

    If fix successful:
        finding.fixed = true
    Else:
        Continue to next attempt
```

### Step 5: Re-Review After Fixes

Any fixes made → validate:

1. Validation (each command separately):

   ```bash
   bun run type-check
   ```

   ```bash
   bun run lint
   ```

2. Validation fails → revert last fix:

   ```bash
   git checkout -- <file>
   ```

   Mark as not fixed.

3. Optionally re-run review agents to verify fixes.

### Step 6: Calculate Summary

```json
{
  "total": <all-findings>,
  "critical": <critical-count>,
  "fixed": <successfully-fixed>,
  "unresolved": <critical-not-fixed>
}
```

### Step 7: Return Output

```json
{
  "findings": [...],
  "summary": {
    "total": <n>,
    "critical": <n>,
    "fixed": <n>,
    "unresolved": <n>
  }
}
```

## Error Handling

| Condition            | Behavior                            |
| -------------------- | ----------------------------------- |
| Agent fails to spawn | Log error, continue with others     |
| All agents fail      | Return error (critical)             |
| Fix validation fails | Revert fix, try next approach       |
| Max retry exceeded   | Mark as unresolved, continue        |
| Timeout              | Return partial results with warning |

## Output Format

```text
REVIEW COMPLETE

Agents Run: code-reviewer, test-analyzer, silent-failure-hunter
Findings: <total> total (<critical> critical)
Fixed: <fixed>/<critical> critical issues

UNRESOLVED (require manual attention):
1. [code-reviewer] src/foo.ts:42 - Missing null check
2. [silent-failure-hunter] src/bar.ts:89 - Silent catch block

NON-CRITICAL (for PR reviewer):
- [code-reviewer] src/baz.ts:15 - Consider extracting helper (confidence: 72)
- [test-analyzer] Missing edge case test for empty input (gap: 4)

PLAN COMPLIANCE: (omit entire section if no plan exists)
- Intent Verification: <N>/<M> criteria met
- Scope: clean | scope creep detected (<details if any>)

Summary: <unresolved> unresolved critical findings
```

## Escalation Trigger

`summary.unresolved > 0` → calling workflow escalates with:

- List of unresolved findings
- Options: continue (manual fix), force-pr, abort

## Success Criteria

- All review agents run (or gracefully skip on failure)
- Findings correctly classified by severity
- Auto-fix attempted for all CRITICAL findings
- Clear summary to orchestrator
- Escalation triggered when appropriate
