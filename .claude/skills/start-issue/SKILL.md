---
name: start-issue
description: Human-in-the-loop entry point for issue work. Runs setup (branch + issue fetch), then dispatches the issue-researcher agent to produce a research/dev plan and surface open questions. Stops after research so the user can answer questions and grill the plan before any code is written. Use when the user says "start issue N", "/start-issue N", or wants to begin an issue with a research-first pause.
allowed-tools: Bash, Read, Skill, Task, AskUserQuestion
---

# Start-Issue Skill

Human-gated counterpart to `auto-issue`. Setup → research → STOP. No implementation, no PR. The deliverable is a dev plan on disk plus a clear list of questions the user needs to answer before implementation can proceed.

## Contract

### Input

| Field          | Type    | Required | Description                               |
| -------------- | ------- | -------- | ----------------------------------------- |
| `issue_number` | number  | Yes      | GitHub issue number                       |
| `branch_name`  | string  | No       | Custom branch name (forwarded to `setup`) |
| `skip_notify`  | boolean | No       | Skip Telegram notification (forwarded)    |

### Output

| Field            | Type     | Description                                        |
| ---------------- | -------- | -------------------------------------------------- |
| `issue_number`   | number   | Issue processed                                    |
| `branch`         | string   | Branch created by `setup`                          |
| `plan_path`      | string   | Path to dev plan written by `issue-researcher`     |
| `complexity`     | string   | TRIVIAL, SMALL, MEDIUM, LARGE                      |
| `has_blockers`   | boolean  | Whether issue has unmet dependencies               |
| `open_questions` | string[] | Questions the researcher surfaced for the user     |
| `status`         | string   | `awaiting_answers`, `ready_to_implement`, `failed` |

### Side Effects

1. `setup` skill creates the branch, moves the issue's board card (#14 `Rollercoaster.dev-mobile`) to **In Progress**, and sends a Telegram notification.
2. `issue-researcher` writes dev plan to `apps/native-rd/docs/plans/dev-plans/issue-<N>-<desc>.md`.
3. Asks user the surfaced questions via `AskUserQuestion` (if any).

This skill does **NOT**: commit code, implement, review, push, or open a PR.

## Workflow

### Phase 1: Setup

```text
Skill(setup, args: { issue_number: <N>, branch_name: <if provided>, skip_notify: <if provided> })
```

Capture `branch`, `issue.title`, `issue.body`, `issue.labels`.

If setup fails → return `failed`.

### Phase 2: Research

Run `issue-researcher` via the Agent tool, **foreground** (not background — we need the questions before continuing).

Pass the issue body through so the agent doesn't re-fetch:

```text
Agent({
  description: "Research issue #<N>",
  subagent_type: "issue-researcher",
  prompt: "Research issue #<N> and create the dev plan at the hardcoded path under apps/native-rd/docs/plans/dev-plans/. The issue body is already fetched (paste it here). FIRST resolve every code-answerable question against precedent — existing columns/enums, sibling code, established conventions, CI, tokens — and record each as a Decision in the plan citing the file:line that answers it. Only surface a question when the codebase genuinely does not determine the answer: a product or UX judgment call the user must make. Do NOT dress up your own implementation choices as open questions when a precedent already dictates them. After producing the plan, list any genuine judgment-call questions under a clearly-labeled '## Open Questions' section in your final reply; if there are none, say so explicitly."
})
```

Capture from the agent's return: `plan_path`, `complexity`, `estimated_lines`, `commit_count`, `affected_files`, `has_blockers`, and the **open questions list**.

If the agent reports issue-not-found or scope-too-large with no path forward → return `failed` with the agent's reasoning.

### Phase 3: Surface Questions

**Gate first — vet every question before it reaches the user.** For each question the researcher returned, ask: _is this answerable from precedent?_ — an existing column/enum, sibling code, an established convention, CI config, or design tokens. If yes, it is NOT an open question: resolve it, apply the precedent-consistent answer, and move it into the plan's Decisions table citing the `file:line` that answers it. Only what genuinely survives this gate — a product/UX judgment call the codebase does not determine — may be surfaced to the user.

A question fails the gate (do NOT ask it) when it is really the researcher's own implementation choice and a precedent already dictates the answer. Examples that must be resolved silently, not asked:

- "What shape should this new column be?" when every sibling field on the table uses the same shape.
- "Should the query return raw or formatted data?" when existing queries already establish one or the other.
- "Should we validate/guard X?" when an analogous field is documented as leaving that to the caller.

Only genuine judgment calls remain. Then apply the cases below to whatever survived.

**Case A — nothing survived the gate (no genuine questions):**

Report the plan path, the complexity, the blocker status. Status = `ready_to_implement`. Suggest next step: `/implement <N>` or run `auto-issue` from here.

**Case B — agent returned 1–4 discrete decision questions:**

Use `AskUserQuestion` with up to 4 questions. Each question should be a real choice the user can answer, with 2–4 distinct options derived from the agent's framing. Capture the answers in the return value.

**Case C — agent returned >4 questions or open-ended/research-shaped questions:**

Do **not** force them into `AskUserQuestion`. Print the questions verbatim as a numbered list, point to the dev plan path, and ask the user to answer in chat or edit the plan directly. Status = `awaiting_answers`.

### Phase 4: Return

```json
{
  "issue_number": <N>,
  "branch": "<branch>",
  "plan_path": "<path>",
  "complexity": "<TRIVIAL|SMALL|MEDIUM|LARGE>",
  "has_blockers": <bool>,
  "open_questions": ["...", "..."],
  "status": "<awaiting_answers|ready_to_implement|failed>"
}
```

## Output Format

```text
START-ISSUE COMPLETE

Issue: #<N> — <title>
Branch: <branch>
Plan:   <plan_path>
Complexity: <…>  Blockers: <yes|no>

Open questions: <count>
<numbered list, or "none — ready to implement">

Next: <answer questions | /implement <N> | /auto-issue <N>>
```

## Error Handling

| Condition                          | Behavior                                       |
| ---------------------------------- | ---------------------------------------------- |
| Setup fails                        | Stop, return `failed` with setup error         |
| `issue-researcher` reports blocker | Continue, surface blocker in questions output  |
| `issue-researcher` errors out      | Stop, return `failed` with agent's error       |
| User declines to answer questions  | Leave status `awaiting_answers`, no auto-retry |

## Compatibility Notes

- Complements `auto-issue` — same Phase 1 and Phase 2, but stops where `auto-issue` would continue to implement.
- The dev plan path is owned by the `issue-researcher` agent (`apps/native-rd/docs/plans/dev-plans/issue-<N>-<desc>.md`). Do not pre-compute or override it here.
- DCO and branch-naming rules are inherited from `setup`. No commits happen in this skill, so DCO is not directly relevant — but the branch will be correctly named before `/implement` is called later.
