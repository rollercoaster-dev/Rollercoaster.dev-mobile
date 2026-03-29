---
name: acceptance-validator
description: Validates PR diff against issue acceptance criteria. Fetches the issue body, extracts task checklist items, and checks whether the branch diff provides evidence each was addressed. Call before /finalize.
---

# Acceptance Criteria Validator

Checks whether the current branch diff satisfies the original issue's requirements.

## Contract

### Input

| Field          | Type   | Required | Description         |
| -------------- | ------ | -------- | ------------------- |
| `issue_number` | number | Yes      | GitHub issue number |

### Output

| Field                   | Type    | Description                                           |
| ----------------------- | ------- | ----------------------------------------------------- |
| `allMet`                | boolean | Whether all criteria are HIGH or MEDIUM (no LOW gaps) |
| `criteria`              | array   | Per-criterion results                                 |
| `criteria[].text`       | string  | The criterion text from the issue                     |
| `criteria[].confidence` | string  | HIGH / MEDIUM / LOW                                   |
| `criteria[].evidence`   | string  | What in the diff supports this                        |
| `gaps`                  | array   | Criteria with LOW confidence (potential gaps)         |

## When to Use

Call after `/self-review` and before `/finalize`:

```
/implement  -->  /self-review  -->  /accept-check  -->  /finalize
```

Invoke as: `/accept-check` or `Run /accept-check for issue #<N>`

## Workflow

### Step 1: Fetch Issue Body

```bash
gh issue view <issue_number> --json body -q .body
```

### Step 2: Extract Criteria

Parse the issue body for:

1. **Task checklist items** — lines matching `- [ ]` or `- [x]`
2. **Acceptance criteria section** — content under `## Acceptance Criteria` heading (if present)
3. **Requirements in body text** — bullet points describing expected behavior

Produce a list of criteria strings.

### Step 3: Get Branch Diff

```bash
git diff origin/main --stat
git diff origin/main --name-only
git diff origin/main
```

Also get the commit messages:

```bash
git log origin/main..HEAD --oneline
```

### Step 4: Evaluate Each Criterion

For each criterion, assess whether the diff provides evidence it was addressed:

**HIGH confidence (80+):**

- A new file directly matching the criterion (e.g., criterion says "add X skill" and `skills/X/SKILL.md` exists in diff)
- A test covering the criterion behavior
- A commit message explicitly referencing the criterion

**MEDIUM confidence (50-79):**

- Related changes that partially address the criterion
- Changes in the right area but not explicitly matching

**LOW confidence (<50):**

- No clear evidence in the diff
- Criterion appears unaddressed

### Step 5: Report Results

For each criterion, output:

- The criterion text
- Confidence level
- Evidence (file paths, commit messages, or diff snippets that support it)

### Step 6: Decision

**If all criteria are HIGH or MEDIUM:**

- Return `{ allMet: true }`
- Print: "All acceptance criteria met. Ready for /finalize."

**If any criterion is LOW:**

- Return `{ allMet: false, gaps }`
- Print the gaps
- Ask: "These criteria may not be addressed. Continue anyway?"

## Output Format

```text
ACCEPTANCE CHECK — Issue #<N>

Criteria:
  [HIGH]   "Add self-review skill" — .claude/skills/self-review/SKILL.md added
  [HIGH]   "Multi-agent review pipeline" — self-review spawns 3 agents in parallel
  [MEDIUM] "Quality scoring per domain" — quality-scorer skill created, grades.md seeded
  [LOW]    "Review-to-task pipeline" — No evidence found in diff

Result: <N>/<N> criteria met (HIGH/MEDIUM)
Gaps: <N> criteria with LOW confidence

Status: READY / HAS GAPS
```

## Error Handling

| Condition         | Behavior                                                                                                        |
| ----------------- | --------------------------------------------------------------------------------------------------------------- |
| Issue not found   | Report error, return `{ allMet: false }`                                                                        |
| No criteria found | Report: "Could not extract criteria from issue body. Check issue format." Return `{ allMet: false }` and block. |
| Empty diff        | Hard error: "No changes on branch. Verify correct branch." Return `{ allMet: false }`.                          |
