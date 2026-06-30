---
name: setup
description: Prepares environment for issue work - creates branch and fetches issue details. Use at the start of any issue workflow in Rollercoaster.dev-mobile.
allowed-tools: Bash, Read, Skill
---

# Setup Skill

Prep before implementation.

## Contract

### Input

| Field          | Type    | Required | Description                                |
| -------------- | ------- | -------- | ------------------------------------------ |
| `issue_number` | number  | Yes      | GitHub issue number                        |
| `branch_name`  | string  | No       | Custom branch name (auto-generated if not) |
| `skip_notify`  | boolean | No       | Skip Telegram notification (default false) |

### Output

| Field          | Type     | Description     |
| -------------- | -------- | --------------- |
| `branch`       | string   | Git branch name |
| `issue.number` | number   | Issue number    |
| `issue.title`  | string   | Issue title     |
| `issue.body`   | string   | Full issue body |
| `issue.labels` | string[] | Issue labels    |

### Side Effects

1. Create git branch (or check out existing)
2. Move the issue's card on project board #14 (`Rollercoaster.dev-mobile`) to **In Progress**
3. Send Telegram notification (unless skip_notify)

## Workflow

### Step 1: Fetch Issue

```bash
gh issue view <issue_number> --json number,title,body,labels,milestone,assignees
```

If not found: STOP, return error.

Store `issue.number`, `issue.title`, `issue.body`, `issue.labels`.

### Step 2: Generate Branch Name

If `branch_name` absent:

- Short description from title (lowercase, hyphenated, max 30 chars)
- Format: `feat/issue-<number>-<short-description>`

Example: "Add user authentication" → `feat/issue-123-add-user-auth`

### Step 3: Create Branch

```bash
git branch --show-current
```

Not on target → `git checkout -b <branch_name>`. Exists → `git checkout <branch_name>`.

### Step 4: Move Board Card to In Progress

The issue is now actively being worked, so reflect that on project board #14
(`Rollercoaster.dev-mobile`). `item-add` is idempotent — it returns the existing
card if the issue is already on the board, so this both adds and selects it.

```bash
# Add (or look up) the card, capture its item id
item_id=$(gh project item-add 14 --owner rollercoaster-dev \
  --url https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/<issue_number> \
  --format json --jq '.id')

# Status → In Progress
gh project item-edit --id "$item_id" \
  --project-id PVT_kwDOB1lz3c4BZZGs \
  --field-id PVTSSF_lADOB1lz3c4BZZGszhUYDGg \
  --single-select-option-id 0f2b1465
```

`Status` field options (project #14):

| Option      | Option ID  |
| ----------- | ---------- |
| Backlog     | `fbc23296` |
| Next        | `ab3bf6f3` |
| In Progress | `0f2b1465` |
| Blocked     | `afd72de3` |
| Done        | `4290dd77` |

Board update fails → warn, continue (non-critical).

### Step 5: Notify (unless skip_notify)

Via `telegram` skill:

```text
Started: Issue #<number>
Title: <title>
Branch: <branch>
```

Notification fail → warn, continue (non-critical).

### Step 6: Return

```json
{
  "branch": "<branch_name>",
  "issue": {
    "number": <number>,
    "title": "<title>",
    "body": "<body>",
    "labels": ["<label1>", "<label2>"]
  }
}
```

## Error Handling

| Condition             | Behavior                      |
| --------------------- | ----------------------------- |
| Issue not found       | Return error, no side effects |
| Branch checkout fails | Return error with git status  |
| Board update fails    | Warn, continue                |
| Notification fails    | Warn, continue                |

## Example

**Input:** `{ "issue_number": 487 }`

**Output:**

```json
{
  "branch": "feat/issue-487-agent-architecture",
  "issue": {
    "number": 487,
    "title": "refactor(claude-tools): implement robust agent architecture",
    "body": "## Problem\n\nThe current Claude tools architecture...",
    "labels": ["enhancement", "priority:high"]
  }
}
```

## Output Format

```text
SETUP COMPLETE

Issue: #<number> - <title>
Branch: <branch>

Ready for next phase.
```
