---
name: self-review
description: Pre-PR self-review gate. Runs local validation, CodeRabbit CLI, and Claude review agents. Blocks PR creation if critical findings remain unresolved after auto-fix loop. Call between /implement and /finalize.
---

# Self-Review — Pre-PR Quality Gate

The "Ralph Wiggum Loop": agents iterate with agent reviewers until all are satisfied, before a PR is ever created.

## Contract

### Input

| Field             | Type    | Required | Description                                        |
| ----------------- | ------- | -------- | -------------------------------------------------- |
| `issue_number`    | number  | Yes      | GitHub issue number                                |
| `max_retry`       | number  | No       | Max fix attempts per critical finding (default: 3) |
| `skip_coderabbit` | boolean | No       | Skip CodeRabbit CLI review (default: false)        |

### Output

| Field                | Type    | Description                           |
| -------------------- | ------- | ------------------------------------- |
| `ready`              | boolean | Whether PR creation should proceed    |
| `summary.total`      | number  | Total findings across all reviewers   |
| `summary.critical`   | number  | Critical findings count               |
| `summary.fixed`      | number  | Successfully auto-fixed count         |
| `summary.unresolved` | number  | Critical findings not fixed           |
| `blockers`           | array   | Unresolved critical findings (if any) |

### Side Effects

- Auto-fix commits on current branch
- Console output with finding details

## When to Use

Call between `/implement` and `/finalize`:

```
/implement  -->  /self-review  -->  /finalize
```

Invoke as: `/self-review` or `Run /self-review before creating PR for issue #<N>`

## Workflow

### Step 1: Local Validation

Run the standard validation suite. If any step fails, report and attempt fix before proceeding.

```bash
bun run typecheck
bun run lint
npx jest --no-coverage
```

If validation fails:

1. Attempt to fix the issue
2. Re-run the failing command
3. If still failing after 2 attempts, add to blockers and continue to review

### Step 2: CodeRabbit CLI Review

Skip if `skip_coderabbit` is true.

```bash
~/.local/bin/coderabbit review --plain --base main
```

Parse the output for findings. CodeRabbit categories:

- **"Potential issue"** or **"Bug"** --> CRITICAL
- **"Improvement"** or **"Suggestion"** --> MEDIUM
- **"Nitpick"** --> LOW

### Step 3: Agent Review (Parallel)

Spawn review agents in parallel using the Agent tool. Append the **No-hypotheticals
rule** (below) verbatim to every agent prompt — it bars speculative findings at the
source, before they're ever generated.

```text
Agent(pr-review-toolkit:code-reviewer):
  "Review the diff on branch <branch> against main for issue #<N>.
   Focus on code quality, patterns, and correctness.
   Report findings with confidence scores.
   <NO-HYPOTHETICALS RULE>"

Agent(pr-review-toolkit:pr-test-analyzer):
  "Analyze test coverage for changes on branch <branch> against main.
   Report coverage gaps with gap ratings.
   <NO-HYPOTHETICALS RULE>"

Agent(pr-review-toolkit:silent-failure-hunter):
  "Check for silent failures, inadequate error handling, and inappropriate
   fallback behavior in changes on branch <branch> against main.
   <NO-HYPOTHETICALS RULE>"
```

**No-hypotheticals rule** (substitute for `<NO-HYPOTHETICALS RULE>` in each prompt):

> Report ONLY defects triggerable on the code as it stands in this diff. For every
> finding, name the concrete input or call path — reachable today, from code that
> exists in this PR or on main — that triggers it. If stating the bug requires "a
> future caller", "if someone later refactors X", "if the button were hoisted", "if
> a not-yet-existing failure mode", or any change to code not present in this PR, DO
> NOT report it. Do not defend against callers, states, or refactors that do not
> exist. A documented invariant that current code already upholds is not a finding.
> Prefer reporting nothing over reporting a hypothetical.

### Step 4: Normalize Findings

**First, drop hypotheticals.** Before classifying, discard any finding that fails the
trigger test: _"What concrete input, on the current diff as it stands, makes this
happen?"_ If the answer names code that doesn't exist in this PR or on main — a future
caller, a hypothetical refactor, a not-yet-existing failure mode, or a state the
current code already prevents — drop it. Do not surface dropped findings, not even
under "for reviewer awareness". A finding survives only if you can state its trigger in
one sentence referencing code that exists right now. When in doubt, drop it. Count how
many were dropped and report the count (not the contents) in the output so the filter's
action is visible.

Then normalize the survivors to a common schema:

```json
{
  "source": "<coderabbit|code-reviewer|test-analyzer|silent-failure-hunter>",
  "severity": "CRITICAL|HIGH|MEDIUM|LOW",
  "file": "<file-path>",
  "line": "<line-number>",
  "message": "<description>",
  "fixed": false
}
```

Classification thresholds (same as the `review` skill):

| Source                | CRITICAL                             | HIGH             | MEDIUM/LOW      |
| --------------------- | ------------------------------------ | ---------------- | --------------- |
| CodeRabbit            | "Potential issue" / "Bug"            | "Improvement"    | "Nitpick"       |
| code-reviewer         | Confidence >= 91 OR label="Critical" | Confidence >= 75 | Confidence < 75 |
| silent-failure-hunter | Severity="CRITICAL"                  | Severity="HIGH"  | MEDIUM/LOW      |
| pr-test-analyzer      | Gap rating >= 8                      | Gap rating >= 5  | Gap rating < 5  |

### Step 5: Auto-Fix Loop

For each CRITICAL finding:

```
attempt = 0
while not fixed AND attempt < max_retry:
    attempt++
    Attempt to fix the issue (edit the file, apply the correction)
    Run validation: bun run typecheck && bun run lint
    If validation passes:
        Stage and commit: git add <file> && git commit -m "fix: <description>"
        Mark finding as fixed
    Else:
        Revert: git restore <file>
        Try next approach
```

### Step 6: Re-validate After Fixes

If any fixes were made, re-run:

```bash
bun run typecheck
bun run lint
npx jest --no-coverage
```

### Step 7: Decision

Calculate summary:

```json
{
  "total": "<all-findings>",
  "critical": "<critical-count>",
  "fixed": "<successfully-fixed>",
  "unresolved": "<critical-not-fixed>"
}
```

**If `unresolved == 0`:**

- Return `{ ready: true, summary }`
- Print: "Self-review PASSED. Ready for /finalize."

**If `unresolved > 0`:**

- Return `{ ready: false, summary, blockers }`
- Print the unresolved findings
- BLOCK: Do not proceed to /finalize

## Output Format

```text
SELF-REVIEW COMPLETE

Local Validation: PASS
CodeRabbit: <N> findings (<N> critical)
Code Reviewer: <N> findings (<N> critical)
Test Analyzer: <N> findings (<N> critical)
Silent Failure Hunter: <N> findings (<N> critical)

Hypotheticals dropped (Step 4 filter): <N>

Auto-Fixed: <N>/<N> critical issues

UNRESOLVED (blocking PR creation):
1. [source] file:line - message
2. [source] file:line - message

NON-CRITICAL (for reviewer awareness):
- [source] file:line - message

Result: READY / BLOCKED
```

## Error Handling

| Condition              | Behavior                                                                                                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CodeRabbit CLI missing | Warn, skip CodeRabbit. Output must show "CodeRabbit: SKIPPED". Result reads "READY (degraded — CodeRabbit skipped)".                                        |
| Agent fails to spawn   | Log error with agent name and error type. Continue with other agents. Output must show "<Agent>: SKIPPED (spawn error)". Include `degraded` flag in result. |
| All agents fail        | Report error with per-agent failure details. Mark as BLOCKED.                                                                                               |
| Fix breaks validation  | Revert fix, mark as unresolved                                                                                                                              |
| Max retry exceeded     | Mark as unresolved, continue                                                                                                                                |
