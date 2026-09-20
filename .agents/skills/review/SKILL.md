---
name: review
description: Use when reviewing issue implementation before PR publication or after fixes, including acceptance checks and tracked follow-ups.
---

# Review and fix

Input: issue/workflow ID, exact plan, worktree, base, and current HEAD. Return reviewed SHA, reviewer coverage, findings, acceptance results, fix rounds, and verdict (`passed` or `blocked`).

1. Inspect the complete diff from the recorded base and fresh `origin/main`, working-tree changes, plan Intent Verification, and Not in Scope. Perform a focused quality pass for clarity, reuse, and unnecessary complexity. Use ordinary inspection tools; no `/simplify` command is required.
2. Obtain independent code-quality, test-coverage, and error-handling reviews. This skill authorizes bounded review subagents: on Codex use available collaboration tools, on other hosts use their equivalent. Reviewers get the same exact diff, issue criteria, and HEAD; they inspect and report without editing shared files. Run independent reviews in parallel when slots permit, otherwise sequentially. Use CodeRabbit when a compatible authenticated CLI is available; collect its output and verify its reviewed scope. If unavailable, record that limitation and require all three independent review perspectives above before publication; the GitHub CodeRabbit review can still run after the PR opens. Do not claim an unavailable review ran. Missing independent reviewer coverage or timeouts produce a visible blocker with partial results retained.
3. Normalize findings to reviewer, severity, confidence/evidence, path/line, impact, proposed fix, and disposition. Severity follows demonstrated impact, not a confidence score alone. Check findings against code before changing anything. Critical/high correctness or security findings and unmet acceptance criteria block publication.
4. Fix applicable findings in at most **three total fix rounds**. Keep a precise diff of each fix, stage only owned files, preserve DCO/hook requirements, and validate with the affected tests plus necessary root checks (`bun run type-check`, `bun run lint`, `bun run test`). Target app Jest through `bun run test --testPathPatterns PATTERN` from `apps/native-rd`.
5. After fixes, rerun the relevant reviewers and acceptance checks against the new HEAD. A finding is fixed only after verified evidence. If a fix fails, undo only that identified patch after inspecting intervening changes, or keep the work and report the blocker. Never use `git reset --hard`, `git clean`, or broad file checkout to roll back review work; never discard unrelated edits. Stop after three rounds with unresolved blockers documented.
6. Track every deferred or out-of-scope actionable finding in a GitHub issue and/or the active plan's Follow-ups section. Include rationale, affected path, next action, and issue link when created. Chat-only findings are insufficient. Required acceptance gaps cannot be downgraded to follow-ups to pass the gate.
7. Return every finding and its disposition, commands/results for the reviewed HEAD, remaining risks, and explicit acceptance coverage. Unavailable reviewers and unresolved blocking findings mean `blocked`; notify via the caller's Telegram route. No automation `skip_review` or `force_pr` escape hatch exists.

Never approve a PR created by this workflow, merge, enable auto-merge, or enqueue a merge. Human PR review remains required even after this local review passes.
