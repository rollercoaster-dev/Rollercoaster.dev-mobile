# Project manager operations

The manager audits the next eligible issue in the board's Next column and dispatches
an agent to implement it. It continues the wider relevance audit in the background.
An explicitly agreed queue may override board order. It never merges. Dependency
and release PRs have separate review queues.

## Runtime

- Canonical instructions: `.agents/skills/project-manager/SKILL.md`.
- Installed runtime: `~/.local/share/rollercoaster-pm/current/`.
- State: `~/.local/state/rollercoaster-pm/` (private, outside Git worktrees).
- Guard: `scripts/project_manager/pm.ts` (Bun + TypeScript, `bun:sqlite`, authenticated `gh`).
- Telegram: `scripts/project_manager/telegram_bridge.ts` (Bun, no npm dependencies).
- Credentials: `~/.config/telegram/env`; never copied into a worktree or Git.
- Linux (current host): systemd user units installed by `install.ts --start`:
  `rollercoaster-pm-telegram.service` (receiver, always on) and three weekday timers
  (Europe/Berlin) driving `rollercoaster-pm@<mode>.service` → `heartbeat.sh <mode>`:
  `plan` 09:00 (catches up after sleep), `tick` every 30 min 09:30–17:30, `recap` 18:00.
  Nothing runs at weekends. Each wakeup is a headless `claude -p --permission-mode auto`;
  a lock makes overlapping wakeups no-ops. Free-text Telegram messages start `listen.sh`
  (read-only `claude -p`, `LISTEN.md`) for an instant reply.
  Logs: `~/.local/state/rollercoaster-pm/{heartbeat,listen,telegram.*}.log`.
- macOS (legacy): `install.ts` writes a user LaunchAgent for the receiver; the heartbeat
  was a Codex automation. Run the manager on one machine only: a Telegram bot allows one reader.
- Manual run: `$project-manager` in Codex, `/project-manager` in Claude, or `rollercoaster-pm` in a terminal. The terminal command starts an interactive Codex session so any necessary filesystem or network approval can be handled there.

The machine must be awake, the repository mounted, and Codex running for the
manager heartbeat to work. The receiver can answer cached status and pause/resume
while Codex is unavailable. Natural-language answers wait for a manager wakeup.
Status includes snapshot time so stale data is visible.

## Guard commands

Run with the installed interpreter/script; optional `--state-dir PATH` precedes
commands. Defaults use the shared state directory above.

```sh
bun scripts/project_manager/pm.ts sync
bun scripts/project_manager/pm.ts status
bun scripts/project_manager/pm.ts snapshot
bun scripts/project_manager/pm.ts pause
bun scripts/project_manager/pm.ts resume
bun scripts/project_manager/pm.ts clear-queue
bun scripts/project_manager/pm.ts audit 123 needed --head MAIN_SHA --evidence 'Inspected paths/commits and unmet acceptance criteria'
bun scripts/project_manager/pm.ts queue 123 124
bun scripts/project_manager/pm.ts approve-queue --approval-ref 'Joe explicitly agreed to 123 then 124 in message ...'
bun scripts/project_manager/pm.ts claim 123
bun scripts/project_manager/pm.ts check-pr 123
bun scripts/project_manager/pm.ts bind 123 700
```

`sync` reads every open issue and PR plus every previously tracked PR, failing
closed if API pagination is incomplete. `status.next_auto_issue` identifies the
first unclaimed, ungated Next item by board Priority, Execution order if set, and
board order. Audit this issue against current main, then `claim` refreshes GitHub
inside a SQLite write transaction and reserves capacity before worker dispatch.
Claims persist through restarts and duplicates are rejected. The five-slot limit
bounds outstanding issue work and PRs, while this machine has one local execution
lane: one PM worker or validation job at a time. Existing reservations can wait
in their worktrees, but the manager does not dispatch or resume another worker
until the current one finishes or is parked without a running local process.
Reviews and local checks run sequentially, with one simulator and Metro server
only when native verification needs them.

Five occupied slots prohibit new issue work. Open issue PRs (including drafts),
reservations and closed-unmerged PRs consume slots. A verified merge by Joe's GitHub account (`joeczar`, type User) releases the
PR's slot. A merge by another actor remains held for Joe's decision. Existing third-party issue PRs count too. Only the real Dependabot
account and release-please branches from the GitHub Actions account are excluded.
Labels or titles cannot exempt a PR. Unknown PR types count conservatively.
There is no automatic timeout/release command: inspect stuck reservations and
closed PRs with Joe rather than silently freeing capacity.

This guard coordinates cooperating manager runs; it cannot prevent a human or
unrelated bot from creating an additional GitHub PR. A final pre-publication check
holds the worker if external changes already put the queue over capacity.

Automatic dispatch uses Joe's Next column without a separate queue approval.
The selected issue needs a fresh audit against current main, status Next, and no
human/design/dependency/epic blocker. Unrelated unaudited issues do not block it.
An explicitly ordered manual queue still requires Joe's approval of that exact
list, Next status, and Execution order for its entries. Changing that queue clears
approval. Resume only clears pause; it cannot approve a manual queue. Issues stay
open until Joe's agreed closure decision or merge.

## Dependabot approval

Joe authorizes the manager to approve dependency PRs after verifying compatibility,
applicable tests and CI, independent review, and safe manual-only merging. Use
`.agents/skills/dependabot-review/SKILL.md`. Submit a commit-pinned approval as soon
as those gates pass; do not wait for the issue queue or another permission message.
Failed checks, incompatibilities, conflicts, or unresolved review findings remain
blockers. Record the tested head, base, evidence, and approval or blocker in state.
Use current main/runtime instructions and the portable review workflow so an old
PR checkout cannot reintroduce obsolete provider-specific review requirements.
Only Joe merges.

## Telegram

```sh
bun scripts/project_manager/telegram_bridge.ts health
bun scripts/project_manager/telegram_bridge.ts inbox
bun scripts/project_manager/telegram_bridge.ts send 'Progress message' --key 'issue-123-pr-700'
bun scripts/project_manager/telegram_bridge.ts reply 123456 'Answer to this specific check-in'
bun scripts/project_manager/telegram_bridge.ts run
```

Plain words work immediately, no slash needed, case and punctuation ignored:
`go`/`skip` (today's plan; with none dated today, `go` picks up the last unskipped plan), `status`, `tasks`, `stop` (mute 30 min), `off`/`on`
(pause/resume work), `help`. Outbound rules are enforced in code: max 5 lines,
one open `--ask` at a time, and notifications refused 21:00–08:00, at weekends
and while muted (exit 3); replies to Joe are always allowed. Natural questions such as
“what is next?” or “why is #123 blocked?” get an instant listener reply; work requests
become tasks in `pm.ts tasks`. If the listener can't answer, the message stays in the inbox
for the next tick and Joe is told so.
Only the configured chat AND user are accepted; forwarded and bot messages are
rejected. For private chats the user defaults to the chat ID. Groups require an
explicit `TELEGRAM_USER_ID`. No message executes arbitrary shell text.

SQLite stores inbound updates before advancing the polling offset. Outbound
messages have stable deduplication keys and survive failed delivery. Telegram has
no idempotent send API: a lost response can produce a duplicate on retry. One
receiver lock prevents competing polls. Do not use `tg-read` or `tg-wait` with this
bot while the bridge is running, because they share Telegram update offsets.

The installer records absolute runtime/interpreter paths in the service definition.
Linux: `systemctl --user stop|start|status rollercoaster-pm-telegram.service`;
`systemctl --user list-timers 'rollercoaster-pm-*'` shows the next wakeups;
`systemctl --user start rollercoaster-pm@tick.service` runs one now (`plan`, `tick`, `recap`).
macOS: `~/Library/LaunchAgents/dev.rollercoaster.project-manager-telegram.plist`.
Stop with `launchctl bootout gui/$(id -u)/dev.rollercoaster.project-manager-telegram`.
Restart using `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/dev.rollercoaster.project-manager-telegram.plist`.
Stopping Telegram is separate from pausing issue dispatch.

## auto-dev port (`scripts/project_manager/ad/`)

A straight copy of auto-dev's tick / listen / status flow (bash, `tg-send` /
`tg-recv`), adapted to Linux, systemd and this repo. It replaces the
`telegram_bridge.ts` receiver and the plan/tick/recap timers; `pm.ts` stays the
slot, plan and audit guard.

- `bin/listen`: the only bot reader. Control words in bash (stop, off, on,
  tick, status, go, skip); anything else → ONE read-only Claude run that
  answers every waiting message in one reply (`LISTEN.md`). Watchdog restarts
  a dead tick. Updates the pinned status message.
- `bin/tick`: one tick (`TICK.md` → SKILL.md section by time of day).
- `bin/status`: is a tick running, from the process table. `bin/pin`: pinned
  status with open asks, open tasks and every open PR until it merges.
- `bin/say` (only sender, ≤5 lines, one reply per message), `bin/task`
  (promise ledger), `bin/now`, `bin/tg`, `bin/post-approved --check`.
- State: `~/.local/state/rollercoaster-pm/ad/` (`messages.jsonl`, `tasks.jsonl`,
  `control.json`, `logs/`). Credentials: `~/.config/telegram/env` (the PM bot).

Switch over after install: `ad/bin/install-units` (back: `--revert`). Once
switched, `install.ts` restarts only the new listener.

## Verification

```sh
bun test scripts/project_manager
```

Tests use temporary SQLite databases and fake external HTTP boundaries. They cover
capacity, concurrent claims, crashes/restarts, audit and priority gates, merge vs
close, authentication, durable inbox/outbox and command routing. Live smoke checks
must not claim production issues or synthesize inbound approvals.
