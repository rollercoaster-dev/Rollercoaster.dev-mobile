# Push review-fix commits

When you commit a fix in response to PR review comments (CodeRabbit, Copilot, human reviewer, any source), `git push` is part of the same action. Do not stop after `git commit`.

## Rules

- After every commit on a branch with an open or merged PR, push immediately in the same tool sequence. Do not wait for the user to ask. Do not "offer" to push as a follow-up message.
- The next user-facing message after a commit on a PR branch must either show the push completed or explain why it can't.
- If the PR is already merged when the fix lands, the fix needs a new branch off `main` + a follow-up PR. Do not push the fix to the merged branch and leave the user to figure out the next step.

## Exceptions (confirm before pushing)

- Branch is `main` / `master` / any protected branch.
- The push would be a force-push (`--force`, `--force-with-lease`). Never force-push to `main`/`master`.
- The user explicitly said "don't push yet" in this session.

## Origin

PR #168 was squash-merged while a Copilot-review-fix commit sat unpushed locally, stranding the fix and requiring follow-up PR #169.
