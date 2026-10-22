---
name: self-review
description: Pre-PR self-review gate. Runs local validation and the expert-review panel, then auto-fixes confirmed blockers. Blocks PR creation if blockers remain unresolved after the fix loop. Call between /implement and /finalize.
---

# Self-Review — Pre-PR Quality Gate

Agents iterate against verified reviewer findings until no blocker remains,
before a PR is ever created.

## Contract

### Input

| Field          | Type   | Required | Description                               |
| -------------- | ------ | -------- | ----------------------------------------- |
| `issue_number` | number | Yes      | GitHub issue number                       |
| `max_retry`    | number | No       | Max fix attempts per blocker (default: 3) |

### Output

| Field                | Type    | Description                           |
| -------------------- | ------- | ------------------------------------- |
| `ready`              | boolean | Whether PR creation should proceed    |
| `summary.total`      | number  | Confirmed findings from the panel     |
| `summary.blockers`   | number  | Confirmed blockers                    |
| `summary.fixed`      | number  | Findings fixed by this run            |
| `summary.unresolved` | number  | Blockers not fixed                    |
| `blockers`           | array   | Unresolved blockers (if any)          |
| `report`             | string  | Path to the expert-review `report.md` |

### Side Effects

- Fix commits on the current branch
- An expert-review run directory under `tmp/expert-review/`

## When to Use

Call between `/implement` and `/finalize`:

```
/implement  -->  /self-review  -->  /acceptance-validator  -->  /finalize
```

Invoke as: `/self-review` or `Run /self-review before creating PR for issue #<N>`

## Workflow

### Step 1: Local Validation

From the repo root:

```bash
bun run type-check
bun run lint
bun run test
```

Never `npx jest` or `bun test` — see `apps/native-rd/AGENTS.md` → "Tests".

If validation fails:

1. Attempt to fix the issue
2. Re-run the failing command
3. If still failing after 2 attempts, add to blockers and continue to review

### Step 2: Expert Review

Run the `expert-review` skill (`.agents/skills/expert-review/SKILL.md`) with
the argument `issue <issue_number>` — not the bare number, which it would
read as a PR number. It routes the diff to the
`review-*` panel, verifies every finding against the code and drops
hypotheticals, and writes `tmp/expert-review/<run>/findings.json` and
`report.md`.

Use only its **confirmed** findings. Severity maps directly:

| expert-review | self-review action                                            |
| ------------- | ------------------------------------------------------------- |
| `blocker`     | Must fix (Step 3); blocks PR creation if unresolved           |
| `should-fix`  | Fix when in scope; otherwise track per AGENTS.md (see Step 5) |
| `nit`         | Optional; list for reviewer awareness                         |

Provisional security findings and verification gaps are listed, not fixed;
an expert that errored makes the result `degraded`.

### Step 3: Fix Loop

For each blocker (then each in-scope should-fix):

```
attempt = 0
while not fixed AND attempt < max_retry:
    attempt++
    Apply the finding's fix
    Run validation: bun run type-check && bun run lint
    If validation passes:
        Stage the touched files and commit: "fix: <description>"
        Mark finding as fixed
    Else:
        Revert only this attempt's edit and try the next approach
```

Commits go through the husky hooks (DCO sign-off) — never `--no-verify`.

### Step 4: Re-validate After Fixes

If any fixes were made, re-run Step 1. When a fix changed behaviour beyond
the finding, re-run `expert-review` once on the new HEAD.

### Step 5: Decision

- **No unresolved blockers** → `{ ready: true, summary, report }`; print
  "Self-review PASSED. Ready for /finalize."
- **Unresolved blockers** → `{ ready: false, summary, blockers, report }`;
  print them; do not proceed to `/finalize`.

Every confirmed should-fix not fixed in scope is tracked as a GH issue or in
the active plan's Follow-ups (`apps/native-rd/AGENTS.md` → "Handling
Review-Skipped Findings") before returning — never chat-only.

## Output Format

```text
SELF-REVIEW COMPLETE

Local Validation: PASS
Expert review: <experts run> · <N> confirmed (<N> blockers, <N> should-fix, <N> nits) · <N> rejected
Fixed: <N> · Tracked as follow-ups: <N>

UNRESOLVED (blocking PR creation):
1. file:line - title

Report: tmp/expert-review/<run>/report.md
Result: READY / BLOCKED
```

## Error Handling

| Condition             | Behavior                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------- |
| An expert errors      | Continue with the others; output shows it under "Experts with errors"; result is `degraded` |
| Every expert errors   | Mark as BLOCKED with the per-expert errors                                                  |
| Fix breaks validation | Revert that fix, mark as unresolved                                                         |
| Max retry exceeded    | Mark as unresolved, continue                                                                |
