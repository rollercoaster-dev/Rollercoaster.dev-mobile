---
name: review-to-task
description: Converts unresolved PR review comments into tracked GitHub issues. Filters for actionable items only — excludes nitpicks and intentionally skipped suggestions.
---

# Review-to-Task Pipeline

Prevents feedback from disappearing into closed PR threads. After a PR is merged, extracts unresolved actionable comments and creates tracked GitHub issues.

## Contract

### Input

| Field       | Type   | Required | Description             |
| ----------- | ------ | -------- | ----------------------- |
| `pr_number` | number | Yes      | Merged PR number        |

### Output

| Field           | Type   | Description                      |
| --------------- | ------ | -------------------------------- |
| `reviewed`      | number | Total comments analyzed          |
| `actionable`    | number | Comments classified as actionable|
| `issuesCreated` | array  | Issue numbers created            |

## When to Use

- After merging a PR: `/review-to-task <pr-number>`
- As part of post-merge cleanup

## Workflow

### Step 1: Fetch PR Review Comments

```bash
gh api repos/rollercoaster-dev/native-rd/pulls/<pr_number>/comments
gh api repos/rollercoaster-dev/native-rd/issues/<pr_number>/comments
gh api repos/rollercoaster-dev/native-rd/pulls/<pr_number>/reviews
```

### Step 2: Filter for Actionable Items

Include a comment if it matches ANY of:
- CodeRabbit comment containing "Potential issue" or "Bug" markers
- CodeRabbit comment with an actionable suggestion that has no resolution
- Claude review item marked "should fix" or "critical"
- Human reviewer comment requesting a change with no follow-up commit

Exclude a comment if it matches ANY of:
- Marked as "resolved" on GitHub
- Has a reply from the PR author acknowledging/dismissing it
- Contains only "nitpick", "nit:", "minor:", or "suggestion:" prefixes without "should fix"
- Is a bot status comment (CI results, merge checks)

### Step 3: Classify and Deduplicate

Group related comments (same file + similar message) to avoid duplicate issues.

For each actionable item, extract:
- **Title**: Short summary of the requested change
- **File**: Source file path
- **Line**: Line number (if available)
- **Body**: Original comment text
- **Source**: Who left the comment (CodeRabbit, Claude, human reviewer name)

### Step 4: Create GitHub Issues

For each actionable item:

```bash
gh issue create \
  --title "fix: <extracted-title>" \
  --body "<body-content>" \
  --label "type: tech-debt"
```

Issue body template:

```markdown
## Source

Unresolved from PR #<pr_number>

## Original Comment

> <comment-body>

## Location

`<file>:<line>`

## Reviewer

<source>
```

### Step 5: Report

List created issues with links.

## Output Format

```text
REVIEW-TO-TASK — PR #<N>

Reviewed: <N> comments
Actionable: <N>
Excluded: <N> (resolved, nitpicks, bot comments)

Issues Created:
  #<issue> — fix: <title>
  #<issue> — fix: <title>

Done. <N> issues created from <N> unresolved comments.
```

## Error Handling

| Condition              | Behavior                           |
| ---------------------- | ---------------------------------- |
| PR not found           | Report error, exit                 |
| PR not merged          | Report error: "PR #<N> is not yet merged. This skill operates on merged PRs only." Exit. |
| No actionable comments | Report "no issues to create", exit |
| Issue creation fails   | Warn, continue with remaining      |
