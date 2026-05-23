---
name: auto-issue
description: Fully autonomous issue-to-PR workflow for Rollercoaster.dev-mobile. Use when a worker should execute one issue end-to-end without human gates.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Skill, Task
---

# Auto-Issue Skill

Runs a single issue from setup to PR creation.

## Contract

### Input

| Field          | Type    | Required | Description                                   |
| -------------- | ------- | -------- | --------------------------------------------- |
| `issue_number` | number  | Yes      | GitHub issue number                           |
| `dry_run`      | boolean | No       | Stop after research and output the plan       |
| `skip_review`  | boolean | No       | Skip review phase and continue to finalize    |
| `force_pr`     | boolean | No       | Allow PR creation even with unresolved issues |

### Output

| Field          | Type   | Description                      |
| -------------- | ------ | -------------------------------- |
| `issue_number` | number | Processed issue                  |
| `branch`       | string | Branch used for implementation   |
| `plan_path`    | string | Development plan path            |
| `pr_number`    | number | PR number (if created)           |
| `pr_url`       | string | PR URL (if created)              |
| `status`       | string | `dry_run`, `completed`, `failed` |

## Workflow

### Phase 1: Setup

Run:

```text
Skill(setup, args: { issue_number: <N> })
```

Capture `branch` and issue metadata from output.

### Phase 2: Research

Run issue analysis with the `issue-researcher` agent using the `Agent` tool — standalone (no `team_name`) with `run_in_background: true`. The researcher writes the dev plan to `apps/native-rd/docs/plans/dev-plans/issue-<N>-<short-desc>.md`.

Capture `plan_path` from the researcher output and pass that exact value through the rest of the workflow.

If `dry_run=true`, return the plan path and stop.

### Phase 3: Implement

Run:

```text
Skill(implement, args: { issue_number: <N>, plan_path: "<path>" })
```

Implementation must be incremental and committed in logical chunks.

### Phase 4: Review

If `skip_review=true`, skip this phase.

Otherwise run:

```text
Skill(review, args: { workflow_id: "issue-<N>" })
```

The review skill includes a `/simplify` pass (Step 1.5) before spawning review agents, improving code quality before the detailed review.

If unresolved critical findings remain and `force_pr` is false, stop with `failed` status.

### Phase 5: Finalize

Run:

```text
Skill(finalize, args: { issue_number: <N>, plan_path: "<path>", force: <force_pr> })
```

Return PR details and `completed` status.

## Error Handling

| Condition                                    | Behavior                            |
| -------------------------------------------- | ----------------------------------- |
| Setup fails                                  | Stop immediately and return failure |
| Research fails                               | Stop and report blocker             |
| Implement fails                              | Stop and report failing step        |
| Review unresolved criticals + force_pr=false | Stop and escalate                   |
| Finalize fails                               | Stop and report push/PR failure     |

## Compatibility Notes

- This skill exists to support worker prompts that call `Skill(auto-issue, args: "<issue>")`.
- The canonical workflow definition is the `/auto-issue` slash command at `.claude/commands/auto-issue.md`.
- DCO is mandatory in this repo — every commit needs a `Signed-off-by` trailer. The husky `prepare-commit-msg` hook adds it automatically. Skills must NEVER pass `--no-verify` to git commit.
