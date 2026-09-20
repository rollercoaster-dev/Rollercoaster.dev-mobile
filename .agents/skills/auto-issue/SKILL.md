---
name: auto-issue
description: Use when executing one Rollercoaster.dev-mobile issue from research through a reviewed PR, manually or as a reserved manager worker.
---

# Execute one issue

Canonical workflow for Codex and Claude. Read and follow the named skills as instructions using tools available in the current host; no vendor-specific skill or agent invocation API is required.

Input: issue number, optional `dry_run`, and manager dispatch/reservation context when automated. Return issue, worktree, branch, plan path, current commit, validation, review findings, PR URL if created, and status (`dry_run`, `blocked`, or `awaiting_review`).

1. **Setup:** follow the setup skill. Automated work requires an existing manager claim and a successful `python3 ~/.local/share/rollercoaster-pm/current/scripts/project_manager/pm.py --state-dir ~/.local/state/rollercoaster-pm check-pr ISSUE` before starting. Workers never bypass the five-slot cap, agreed priorities, or audit gate. Ordinary direct manual issue work remains supported.
2. **Research:** read the issue, relevant code, repository guidance, previous plans, and existing PRs. Verify the issue is still actionable. Write a plan under `apps/native-rd/docs/plans/dev-plans/issue-ISSUE-description.md` for app work or `docs/plans/` for cross-cutting work. Include scope, implementation steps, acceptance/Intent Verification criteria, validation commands, Decisions, Discovery Log, and Follow-ups. A real research blocker stops execution. `dry_run` ends here with the plan and no implementation or PR.
3. **Implement:** follow the implement skill in the isolated worktree. Keep commits focused and DCO signed. Resolve failures before proceeding; unmet required acceptance criteria are blockers.
4. **Review:** follow the review skill, including code quality, test coverage, error handling, and acceptance checks. Track deferred findings in the plan or GitHub issues. Automated runs never accept `skip_review`, `force_pr`, or equivalent bypasses. This canonical workflow requires review and passing gates for manual runs too; an explicitly requested alternate manual workflow must be described as such, never as a successful run of this skill.
5. **Finalize:** follow the finalize skill with the exact plan, review findings, tested HEAD, and reservation context. Recheck the reservation immediately before publishing automated work. Return a PR awaiting human review; implementation completion is not issue closure or merge.

Continue between phases without routine approval prompts. If requirements are ambiguous enough to prevent safe implementation, review is unavailable, validation fails, or a gate denies progress, record the exact blocker and next action and notify through Telegram. Preserve work and reservation for resumption. Start, blocker, and final notifications use the project-manager durable route for automation or the telegram skill for manual work; surface delivery failures.

Never merge, enable auto-merge, enqueue a merge, approve your own PR, mark an unmerged issue Done, or close issues automatically. PRs remain on the board as In Review until human merge is observed.
