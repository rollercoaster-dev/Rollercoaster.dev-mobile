---
name: finalize
description: Completes issue workflow - pushes branch, creates PR, sends notification. Use at the end of any issue workflow in Rollercoaster.dev-mobile.
allowed-tools: Bash, Read, Skill
---

# Finalize Skill

Push, create PR, notify.

## Contract

### Input

| Field              | Type    | Required | Description                                                                                                   |
| ------------------ | ------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| `issue_number`     | number  | Yes      | GitHub issue number                                                                                           |
| `plan_path`        | string  | No       | Exact dev plan path to read for Intent Verification, Decisions, and Discovery Log extraction into the PR body |
| `findings_summary` | object  | No       | Summary from review phase                                                                                     |
| `force`            | boolean | No       | Create PR even with unresolved issues (default false)                                                         |
| `skip_notify`      | boolean | No       | Skip Telegram notification (default false)                                                                    |

### Output

| Field             | Type   | Description                            |
| ----------------- | ------ | -------------------------------------- |
| `pr.number`       | number | PR number                              |
| `pr.url`          | string | PR URL                                 |
| `pr.title`        | string | PR title                               |
| `workflow_status` | string | "completed" or "completed_with_issues" |

### Side Effects

1. Push branch to remote
2. Create GitHub PR
3. Send Telegram notification with PR link

## Workflow

### Step 1: Gather Context

**Issue title for PR:**

```bash
gh issue view <issue_number> --json title -q .title
```

**Commit history:**

```bash
git log main..HEAD --oneline
```

**Diff stats:**

```bash
git diff main --stat
```

**Branch name:**

```bash
git branch --show-current
```

### Step 2: Run Final Validation

Each separately:

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

**Note:** `bun run build` safe — native-rd's `build` is `echo 'Expo app — no build step'`. If this changes, drop build step rather than running native compile.

**Validation fails + `force=false`:** Return error with details.

**Validation fails + `force=true`:** Note in PR body, continue.

### Step 3: Push Branch

```bash
git push -u origin HEAD
```

Push fail → return error (critical).

### Step 4: Read Dev Plan (if `plan_path` provided)

Extract structured sections for PR body. Read file, extract:

1. **Intent Verification** — every checkbox line (`- [ ]` or `- [x]`) between `## Intent Verification` heading and next `##`. Preserve check status verbatim.
2. **Key Decisions** — markdown table under `## Decisions` (or `## Key Decisions`). Skip header/separator rows; re-emit as two-column `| Decision | Rationale |` in PR body. Empty/absent → omit section.
3. **Discovery Log** — timestamped entries `- [YYYY-MM-DD HH:MM] <text>` under `## Discovery Log` (may be wrapped in `<!-- … -->`; strip delimiters before parsing). No entries → omit section.

No plan file → omit Intent Verification, Key Decisions, Discovery Log sections.

### Step 5: Create PR

PR type from branch/commits:

- `feat/` → "feat"
- `fix/` → "fix"
- `refactor/` → "refactor"
- etc.

Scope from primary package affected (`native-rd`, `openbadges-core`, `design-tokens`, `ci`).

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

**DCO:** All branch commits should carry `Signed-off-by` from husky `prepare-commit-msg`. DCO workflow on GitHub verifies each commit. Missing trailer → PR fails DCO check. Fix locally with new commits (do **not** force-push amended history that strips trailers).

### Step 6: Send Notification (unless skip_notify)

Via `telegram` skill:

```
PR Created: #<pr_number>
Issue: #<issue_number> - <title>
URL: <pr_url>
Commits: <count>
Status: Awaiting review
```

Notification fail → warn, continue.

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

```
FINALIZE COMPLETE

PR: #<pr_number>
URL: <pr_url>
Title: <pr_title>

Workflow: Marked as completed

Commits: <count>

Next: PR will be reviewed by CodeRabbit and team.
```
