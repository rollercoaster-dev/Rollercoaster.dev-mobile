---
name: implement
description: Use when implementing an agreed issue plan in an isolated Rollercoaster.dev-mobile worktree.
---

# Implement the issue plan

Input: issue number, exact plan path, isolated worktree, and optional resume step. Return commits, tested HEAD, acceptance results, validation commands/results, and any blockers.

1. Read the plan and applicable `AGENTS.md` files. Inspect the branch and working tree, preserving existing work. For manager dispatch, verify the supplied reservation with `python3 ~/.local/share/rollercoaster-pm/current/scripts/project_manager/pm.py --state-dir ~/.local/state/rollercoaster-pm check-pr ISSUE` before implementation. A denied check stops work; only the manager owns claims and priority approval.
2. Make the smallest change that satisfies the acceptance criteria, following existing patterns. Add meaningful behavior tests for feature/bug changes, including relevant failure cases. Do not add arbitrary abstractions, unrelated cleanup, or brittle tests that merely duplicate implementation.
3. Validate each logical change with the relevant tests and checks. From the repository root, use the package scripts:

   ```bash
   bun run type-check
   bun run lint
   bun run test
   ```

   Run commands separately and inspect every result. For targeted app tests, run `bun run test --testPathPatterns PATTERN --runInBand` with `apps/native-rd` as the working directory. This invokes the app's `scripts/jest-node.sh` wrapper. Do not replace root `bun run test` with Bun's built-in test runner.

4. Format only changed files. Stage specific owned paths, inspect the staged diff, then create self-contained conventional commits. Use `git commit -s` and verify every commit has a `Signed-off-by` trailer. Keep hooks enabled; never pass `--no-verify`. Commit relevant tests with the behavior they verify. Prefer new corrective commits over rewriting published history.
5. Maintain the plan: check completed steps, record discoveries and rationale, and track every deferred review finding in Follow-ups with a GitHub issue when appropriate. Deviations within scope can be resolved autonomously; material scope changes and missing prerequisites are blockers.
6. Validate the final implementation with root type-check, lint, tests, and the relevant acceptance checks. Inspect current package build scripts before running `bun run build`; native-rd currently has a no-op build, while shared packages have actual builds. Native compilation requires the repository's native build instructions. Report skipped/inapplicable checks precisely instead of calling them passed.
7. Compare the branch with the recorded base and fresh `origin/main`, review the complete diff, and verify every required Intent Verification criterion. Unmet criteria or unexplained failures block review/finalization; autonomous mode does not waive acceptance checks.

For test failures, diagnose the cause and fix the implementation or incorrect expectation with evidence; never weaken tests to make a failure disappear. For conflicts, inspect and resolve only understood issue-owned changes; escalate ambiguity without overwriting user work. Never use destructive cleanup or discard unrelated changes.

Return evidence for the exact HEAD reviewed next. If any code changes afterward, rerun affected checks and invalidate stale review evidence. Send blockers through the caller's Telegram route. Never merge or change an unmerged issue to Done.
