---
name: finalize
description: Completes issue workflow - pushes branch, creates PR, sends notification. Use at the end of any issue workflow in Rollercoaster.dev-mobile.
allowed-tools: Bash, Read, Skill
---

# Finalize Skill

Completes the workflow by creating PR and notifying.

## Contract

### Input

| Field              | Type    | Required | Description                                                                                                   |
| ------------------ | ------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| `issue_number`     | number  | Yes      | GitHub issue number                                                                                           |
| `plan_path`        | string  | No       | Exact dev plan path to read for Intent Verification, Decisions, and Discovery Log extraction into the PR body |
| `findings_summary` | object  | No       | Summary from review phase                                                                                     |
| `force`            | boolean | No       | Create PR even with unresolved issues (default: false)                                                        |
| `skip_notify`      | boolean | No       | Skip Telegram notification (default: false)                                                                   |

### Output

| Field             | Type   | Description                            |
| ----------------- | ------ | -------------------------------------- |
| `pr.number`       | number | PR number                              |
| `pr.url`          | string | PR URL                                 |
| `pr.title`        | string | PR title                               |
| `workflow_status` | string | "completed" or "completed_with_issues" |

### Side Effects

1. Pushes branch to remote
2. Creates GitHub PR
3. Sends Telegram notification with PR link

## Workflow

### Step 1: Gather Context

**Get issue title for PR:**

```bash
gh issue view <issue_number> --json title -q .title
```

**Get commit history:**

```bash
git log main..HEAD --oneline
```

**Get diff stats:**

```bash
git diff main --stat
```

**Get branch name:**

```bash
git branch --show-current
```

### Step 2: Run Final Validation

Run validation commands (each separately):

```bash
bun run type-check
```

```bash
bun run lint
```

```bash
bun test
```

```bash
bun run build
```

**Note:** `bun run build` is safe in this repo — native-rd's `build` script is a no-op (`echo 'Expo app — no build step'`). If this changes in the future, drop the build step rather than running a native compile.

**If any validation fails and `force` is false:** Return error with failure details.

**If validation fails but `force` is true:** Note in PR body, continue.

### Step 3: Push Branch

```bash
git push -u origin HEAD
```

**If push fails:** Return error (critical).

### Step 4: Read Dev Plan (if `plan_path` provided)

Before creating the PR, extract structured sections from the dev plan to enrich the PR body.

If `plan_path` is provided, read the file. Extract:

1. **Intent Verification** — every checkbox line (`- [ ]` or `- [x]`) between the `## Intent Verification` heading and the next `##` heading. Preserve check status verbatim.
2. **Key Decisions** — the markdown table under `## Decisions` (or `## Key Decisions`). Skip the header and separator rows; re-emit as a two-column `| Decision | Rationale |` table in the PR body. If the table is empty or absent, omit the section.
3. **Discovery Log** — timestamped entries of the form `- [YYYY-MM-DD HH:MM] <text>` under the `## Discovery Log` heading (entries may be wrapped in `<!-- … -->`; strip the delimiters before parsing). If no entries exist, omit the section.

If no plan file exists, omit the Intent Verification, Key Decisions, and Discovery Log sections from the PR body.

### Step 5: Create PR

Determine PR type from branch name or commits:

- `feat/` → "feat"
- `fix/` → "fix"
- `refactor/` → "refactor"
- etc.

Determine scope from primary package affected (e.g., `native-rd`, `openbadges-core`, `design-tokens`, `ci`).

**Create PR:**

```bash
gh pr create --title "<type>(<scope>): <description> (#<issue_number>)" --body "$(cat <<'PRBODY'
## Summary

<1-3 bullet points from issue/commits>

## Changes

<bullet list of key changes>

## Intent Verification

<Copy from dev plan with check status. If no plan exists, omit this section.>

- [x] <met criterion>
- [x] <met criterion>
- [ ] <unmet criterion, if any — explain why>

## Key Decisions

<Summarize from Decisions table. If no plan or no decisions, omit this section.>

| Decision | Rationale |
|----------|-----------|
| <what> | <why> |

## Discovery Log

<Copy entries verbatim from dev plan. Omit section if no entries.>

- [YYYY-MM-DD HH:MM] <entry>

## Test Plan

- [ ] Type-check passes
- [ ] Lint passes
- [ ] Tests pass
- [ ] Build script (no-op for native-rd) returns successfully

<any unresolved findings if force=true>

---

Closes #<issue_number>

Generated with [Claude Code](https://claude.ai/code)
PRBODY
)"
```

Extract PR number and URL from output.

**DCO:** All commits on the branch should already carry `Signed-off-by` trailers from the husky `prepare-commit-msg` hook. The DCO workflow check on GitHub will verify each commit. If any commit is missing the trailer, the PR will fail the DCO check — fix locally with new commits (do **not** force-push amended history that strips trailers).

### Step 6: Send Notification (unless skip_notify)

Use the `telegram` skill (via Skill tool) to send a notification:

```
PR Created: #<pr_number>
Issue: #<issue_number> - <title>
URL: <pr_url>
Commits: <count>
Status: Awaiting review
```

**If notification fails:** Log warning, continue.

### Step 7: Return Output

```json
{
  "pr": {
    "number": <pr_number>,
    "url": "<pr_url>",
    "title": "<pr_title>"
  },
  "workflow_status": "completed"
}
```

## Error Handling

| Condition                      | Behavior                  |
| ------------------------------ | ------------------------- |
| Validation fails (force=false) | Return error with details |
| Push fails                     | Return error (critical)   |
| PR creation fails              | Return error (critical)   |
| Notification fails             | Warn, continue            |

## Example

**Input:**

```json
{
  "issue_number": 487,
  "plan_path": "apps/native-rd/docs/plans/dev-plans/issue-487-agent-architecture.md"
}
```

**Output:**

```json
{
  "pr": {
    "number": 488,
    "url": "https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/pull/488",
    "title": "refactor(native-rd): implement robust agent architecture (#487)"
  },
  "workflow_status": "completed"
}
```

## Output Format

After completing all steps, report:

```
FINALIZE COMPLETE

PR: #<pr_number>
URL: <pr_url>
Title: <pr_title>

Workflow: Marked as completed

Commits: <count>

Next: PR will be reviewed by CodeRabbit and team.
```
