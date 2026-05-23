---
name: auto-issue
description: Fully autonomous issue-to-PR workflow for Rollercoaster.dev-mobile. Use when a worker should execute one issue end-to-end without human gates.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Skill, Task
---

# Auto-Issue Skill

Run one issue from setup to PR.

## Contract

### Input

| Field          | Type    | Required | Description                       |
| -------------- | ------- | -------- | --------------------------------- |
| `issue_number` | number  | Yes      | GitHub issue number               |
| `dry_run`      | boolean | No       | Stop after research, output plan  |
| `skip_review`  | boolean | No       | Skip review, continue to finalize |
| `force_pr`     | boolean | No       | Allow PR with unresolved issues   |

### Output

| Field          | Type   | Description                      |
| -------------- | ------ | -------------------------------- |
| `issue_number` | number | Processed issue                  |
| `branch`       | string | Implementation branch            |
| `plan_path`    | string | Dev plan path                    |
| `pr_number`    | number | PR number (if created)           |
| `pr_url`       | string | PR URL (if created)              |
| `status`       | string | `dry_run`, `completed`, `failed` |

## Workflow

### Phase 1: Setup

```text
Skill(setup, args: { issue_number: <N> })
```

Capture `branch` and issue metadata.

### Phase 2: Research

Run `issue-researcher` via Agent tool — standalone (no `team_name`), `run_in_background: true`. Writes plan to `apps/native-rd/docs/plans/dev-plans/issue-<N>-<short-desc>.md`.

Capture `plan_path`, pass through rest of workflow.

If `dry_run=true`: return plan path, stop.

### Phase 3: Implement

```text
Skill(implement, args: { issue_number: <N>, plan_path: "<path>" })
```

Incremental, atomic commits.

### Phase 4: Review

`skip_review=true` → skip.

```text
Skill(review, args: { workflow_id: "issue-<N>" })
```

Includes `/simplify` pass (Step 1.5) before review agents.

Unresolved criticals + `force_pr=false` → stop, `failed` status.

### Phase 5: Finalize

```text
Skill(finalize, args: { issue_number: <N>, plan_path: "<path>", force: <force_pr> })
```

Return PR details, `completed` status.

## Error Handling

| Condition                                    | Behavior                     |
| -------------------------------------------- | ---------------------------- |
| Setup fails                                  | Stop, return failure         |
| Research fails                               | Stop, report blocker         |
| Implement fails                              | Stop, report failing step    |
| Review unresolved criticals + force_pr=false | Stop, escalate               |
| Finalize fails                               | Stop, report push/PR failure |

## Compatibility Notes

- Supports worker prompts calling `Skill(auto-issue, args: "<issue>")`.
- Canonical workflow lives at `.claude/commands/auto-issue.md`.
- DCO mandatory — husky `prepare-commit-msg` adds `Signed-off-by` trailer. Never pass `--no-verify` to git commit.
