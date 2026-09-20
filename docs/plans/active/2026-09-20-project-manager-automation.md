# Project manager automation implementation plan

**Goal:** Audit every open issue, agree priorities with Joe on project 14, execute in order with at most five issue-work slots, and support Telegram check-ins. Never merge.

**Architecture:** A Codex heartbeat reads a repository skill. A Python/SQLite guard owns reservations and observes GitHub PR state. A single local Telegram receiver owns updates and durable messages. Runtime state is outside worktrees. The manager begins in audit mode; issue implementation requires the agreed board queue.

**Constraints:** Dependency/release PRs excluded from the five-slot cap. Drafts count. Reservations count before any implementation begins. At capacity, wait for a human merge; closed-unmerged PRs hold capacity. Never merge, enable auto-merge, or enqueue a merge. Review approvals allowed on third-party PRs only after current-head verification. No automatic issue closures until a closure policy is agreed. Existing user edits remain untouched.

## Task 1: Persistent dispatch guard and GitHub reconciliation

Files: `scripts/project_manager/pm.py`, `scripts/project_manager/test_pm.py`.

- [x] Write behavioral tests for five-slot boundary, draft and external PR inclusion, dependency/release exclusion, restart/duplicate reservation, closed-unmerged hold, merge release, stale audit, unapproved queue, and concurrent claims.
- [x] Implement SQLite transactions and `status`, `sync`, `pause`, `resume`, `audit`, `queue`, `approve-queue`, `claim`, `bind`, and `check-pr` CLI operations. GitHub reads use paginated `gh api` and fail closed. State uses `~/.local/state/rollercoaster-pm` across worktrees.
- [x] Run `python3 -m unittest discover -s scripts/project_manager -p 'test_pm.py'` and a live read-only sync. No production issue claims in this task.

## Task 2: Telegram receiver and durable messaging

Files: `scripts/project_manager/telegram_bridge.py`, `scripts/project_manager/test_telegram_bridge.py`.

- [x] Test authentication, duplicate updates, restart offsets, retained failed delivery, and command routing with isolated SQLite databases.
- [x] Implement one receiver, authenticated commands, inbox/outbox, plain-text notifications, bounded network operations, and safe credential parsing. `/resume` never approves priorities.
- [x] Validate with unit tests and live outbound health check; install a user LaunchAgent with explicit interpreter, paths, and private state directory.

## Task 3: Codex workflow and dependency review

Files: `.agents/skills/project-manager/SKILL.md`, `.agents/skills/dependabot-review/SKILL.md`, existing issue skill files and Claude compatibility entrypoints, `docs/architecture/project-manager.md`.

- [x] Document exhaustive initial audit, evidence/commit-based relevance decisions, board queue agreement, PR maintenance, Telegram routing, and resumable audit batches.
- [x] Replace Claude-only workflow calls with portable instructions; fix test commands, worktree setup, acceptance gates, board updates, and destructive rollback guidance.
- [x] Add current-head Dependabot review procedure with migration escalation and no merges.
- [x] Validate skill metadata and behavior with independent review; test all Python scripts.

## Task 4: Activate and hand off

- [ ] Review the integrated change, run relevant checks, commit and create a reviewable PR; never merge.
- [x] Install tested runtime in a stable local directory, initialize read-only GitHub snapshot, and start Telegram receiver.
- [x] Create one heartbeat for audit, check-ins, and queue maintenance. Implementation stays disabled until priorities are agreed.
- [ ] Verify running service, notification delivery, heartbeat configuration, unchanged user files, and report operational limits.

## Decisions and progress

- Initial audit covers all open issues, including issues absent from the board. Unknown relevance blocks dispatch.
- User did not choose automatic closure authority: propose evidence-backed closures; do not close automatically.
- Keep one active implementation reservation initially; five includes all existing non-dependency/non-release open PRs.
- Telegram service answers simple status/pause/resume immediately; natural-language requests are answered on the next manager heartbeat.

## Validation and deployment record

- 32 Python tests passed, including concurrent admission, fork/history collision recovery, Telegram command ordering and installer state preservation.
- Independent integration review found four actionable issues; all were fixed and the scoped re-review found no blocking findings.
- CodeRabbit CLI 0.3.5 lacks the current skill interface; no CodeRabbit review is claimed. Portable workflows retain required independent review coverage when the local CLI is unavailable.
- Refreshed the isolated branch to GitHub main `0eb7d3c` before publication; preserved upstream board and CI guidance.
- Installed Telegram LaunchAgent `dev.rollercoaster.project-manager-telegram`; observed running and successful inbound/outbound transport, no queued failed messages.
- Heartbeat `rollercoaster-project-manager` is active every five minutes in the current task. Execution remains in audit mode with no approved queue.
- Added board Execution order and In Review without replacing existing options. No priorities were assigned.
