---
name: setup
description: Use when starting manual or manager-dispatched issue work in Rollercoaster.dev-mobile.
---

# Set up issue work

Input: issue number, optional branch name, and dispatch context. Return issue metadata, worktree path, branch, base SHA, and reservation context when automated.

1. Read the repository and affected directory `AGENTS.md` files. Use explicit repository `rollercoaster-dev/Rollercoaster.dev-mobile` for GitHub operations:

   ```bash
   gh issue view ISSUE --repo rollercoaster-dev/Rollercoaster.dev-mobile --json number,title,body,labels,milestone,assignees,state
   ```

   Stop if missing, closed, or the requested work conflicts with current evidence.

2. For manager-dispatched work, require the manager's successful reservation before setup or implementation. The project-manager skill owns `claim`; workers must not create their own claim, approve a queue, or bypass audit, priority, pause, or slot gates. Verify the existing reservation:

   ```bash
   python3 ~/.local/share/rollercoaster-pm/current/scripts/project_manager/pm.py --state-dir ~/.local/state/rollercoaster-pm check-pr ISSUE
   ```

   A missing guard, failed command, or denied reservation is a blocker. Direct manual issue requests can use this workflow without a manager reservation; automation must never relabel itself manual to evade the guard.

3. Inspect `git status --short`, `git worktree list`, and the origin URL. Preserve the user's active checkout and all unrelated changes. Fetch a fresh base with `git fetch origin main`; record `git rev-parse origin/main`.
4. Create an isolated worktree with default branch `codex/issue-ISSUE` and a unique absolute path outside the active checkout:

   ```bash
   git worktree add -b codex/issue-ISSUE /absolute/worktree/path origin/main
   ```

   Use the host's worktree tool instead when it supports the same fresh base and branch. Never switch branches in the user's checkout. If the branch already exists, inspect its worktree and recorded reservation: resume only the same issue's verified work, otherwise report a collision. Do not reset, delete, or overwrite it. Run every subsequent command with the issue worktree as its explicit working directory.

5. Prepare dependencies using repository instructions and the lockfile; do not copy secrets or unrelated working files. Report installation failures before implementation.
6. Add or locate the issue item on project 14 and set Status to **In Progress** after the reservation and worktree are confirmed. Read current field/option IDs with `gh project field-list`; do not guess them. Record failed board updates for retry and notify the manager.
7. Send a Telegram start notification with issue, title, branch, and worktree only when that external send is allowed. Automated runs use the project-manager's durable Telegram routing; manual runs use the available telegram skill. If automatic approval review rejects the send, do not retry it or treat it as delivered. Report the rejection in the Codex task and continue the authorized issue work. A manual caller may explicitly suppress notifications.

On a blocker, preserve the worktree/reservation and send the blocker through the same notification route. Never merge, enable auto-merge, enqueue a merge, or approve a PR created by this workflow.
