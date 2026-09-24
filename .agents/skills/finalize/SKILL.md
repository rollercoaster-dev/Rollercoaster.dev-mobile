---
name: finalize
description: Use when publishing a validated and reviewed issue branch as a PR and updating its board and notification state.
---

# Publish the reviewed PR

Input: issue, exact plan path, review report, isolated worktree, tested/reviewed HEAD, and manager reservation context when automated. Return PR number/URL, head SHA, validation/CI state, board state, notification result, and outstanding blockers.

1. Verify repository `rollercoaster-dev/Rollercoaster.dev-mobile`, issue branch, clean issue-owned state, plan acceptance checks, and review coverage. Preserve unrelated work. Inspect the complete diff and commits relative to `origin/main`; all commits need DCO trailers. Never publish from main or use `force` to bypass a failed gate.
2. Run final applicable validation on the exact candidate HEAD: root `bun run type-check`, `bun run lint`, and `bun run test`, plus plan acceptance checks. Existing results may be reused only when they demonstrably cover the identical HEAD and environment. Inspect build scripts and run applicable package builds; do not assume native compilation is a no-op. A missing reviewer, failing check, or unmet acceptance criterion blocks finalization.
3. For manager-dispatched work, run immediately before push/PR publication:

   ```bash
   python3 ~/.local/share/rollercoaster-pm/current/scripts/project_manager/pm.py --state-dir ~/.local/state/rollercoaster-pm check-pr ISSUE
   ```

   Require success. Workers must not claim a slot themselves, relabel automated work manual, override priority approval, or bypass a denied audit/slot/pause gate. Direct manual issue work does not require a manager reservation.

4. Write a real temporary Markdown file for the PR body. Lead with the problem and resulting behavior; include acceptance/Intent Verification with truthful checkboxes, relevant Decisions and Discovery Log, actual validation commands and HEAD, and tracked follow-up links. Use `Closes #ISSUE` only when the PR satisfies the complete issue acceptance criteria, so Joe’s merge closes the implemented issue. Partial work uses `Refs #ISSUE`. This does not authorize closing stale or superseded issues. Derive the conventional title from the actual change, not the `codex/` branch prefix.
5. Push the issue branch with `git push -u origin HEAD`. Check for an existing PR on that exact branch with explicit `--repo` before creating another; update/reuse it on resume. Create a new PR using the body file:

   ```bash
   gh pr create --repo rollercoaster-dev/Rollercoaster.dev-mobile --base main --head codex/issue-ISSUE --title 'TYPE(SCOPE): DESCRIPTION' --body-file /absolute/path/pr-body.md
   ```

   Substitute the actual verified branch/title/path. Never interpolate the body into shell code. Capture the URL and number. In Codex call the available `mcp__codex_app__attach_artifact` tool with artifact type `pull_request` and the URL. For automated work, return the PR identity to the manager for immediate `bind` and reconciliation; retain the reservation if binding fails, notify, and never create a duplicate PR.

6. Observe the remote PR head and CI/checks using `gh pr view` and `gh pr checks` with explicit `--repo`. Tests and review evidence must match that head. Pending checks mean awaiting CI; failures mean blocked, not complete. If HEAD changes, validate/review again. Do not report full verification until required current-head CI and local checks pass.
7. Find the issue item and current Status field/options on GitHub project 14 (owner `rollercoaster-dev`) and set it to **In Review**. Read field/option IDs rather than guessing. Do not mark it Done or close it; only an observed human merge can justify Done. A board update failure is reported for retry and does not justify creating another PR.
8. Send the final Telegram notification with issue, PR link, HEAD, validation/CI state, board state, and next action when that external send is allowed. Automation uses the manager's durable route; manual runs use the telegram skill unless explicitly suppressed. Report delivery errors truthfully. If automatic approval review rejects the send, do not retry; report the rejection and PR status in the Codex task. Surface publishing, binding, CI, or board blockers through the available approved route.

The result is **awaiting human review**, not merged or closed. Never approve your own PR, run a merge, enable auto-merge, or enqueue a merge. Pending CI remains explicit in the return status and handoff.
