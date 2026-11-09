# Project manager: ADHD-first upgrade

Status: implemented 2026-11-09 (PR #800). Ideas adapted from Joe's auto-dev (work) agent; code written fresh.

## Why

The manager should take load off Joe, not add to it. Today it only answers
`/status` instantly, holds every other message until 09:00/21:00, auto-starts
work without asking, and sends long multi-paragraph messages.

## Design principles (ADHD + bipolar)

1. **Short, every time, enforced in code.** Max 3 lines per message, hard cap 5
   (`send` refuses more). Decision or answer first. Links, never file paths.
2. **One open question at a time.** No second ask until the first is answered.
   Later questions wait in the queue.
3. **Nothing starts without Joe's "go".** One morning plan, max 3 items.
   No reply means nothing happens. No reminders, nagging or guilt.
4. **No judgment language.** No "overdue", "missed", streaks, or "you haven't
   replied". Same rule as the app (ADR-0012). Silence is fine.
5. **Protect sleep and rest.** Quiet hours 21:00–08:00: no outbound messages
   except direct replies to Joe. `off` = rest day, no plan sent.
6. **Gentle scope guard.** The plan is capped at 3. Adding a 4th gets
   "Today's full. Parked #N for tomorrow. `add anyway` to override."
   This guards against overcommitting; Joe can always override.
7. **Promises can't vanish.** Every request becomes a task in a ledger. Ticks
   close open tasks first. The evening recap lists what got done.
8. **Honest acks.** Replies say "started", "queued" or "paused", never "on it"
   when nothing will run.
9. **Plain words, no slashes.** `go`, `skip`, `status`, `stop`, `off`, `on`,
   `help`. Case and punctuation ignored ("OFF!" = off).

## Daily shape

| Time (Berlin)                     | What                                                                                                                    |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Mon–Fri 09:00                     | Plan: ≤3 items + open PRs needing Joe. "Reply go / skip / edit."                                                        |
| Mon–Fri every 30 min, 09:30–18:00 | Work tick: open tasks first, then the approved list, one at a time. Silent unless something needs Joe or a PR is ready. |
| Mon–Fri 18:00                     | Recap, ≤3 lines: done, waiting on Joe, tomorrow's first item.                                                           |
| any time                          | Joe writes → instant reply (within ~1 min).                                                                             |

## Controls

`stop` mutes for 30 min (work continues; any message unmutes).
`off` pauses work and plans until `on`. `status` = one-screen picture.
`go` approves the plan; free text after the plan edits it.

## Instant answers (listener)

Word controls are handled in Python, no model call. Any other message: the
receiver starts a short read-only `claude -p` that reads state, the task
ledger and `gh`, and sends exactly one reply (≤3 lines). Work requests become
a task plus an honest ack. It never edits code or posts to GitHub.

## Build order

1. Bridge: word controls, length cap, quiet hours, mute, one-open-question.
2. Ledger + daily plan state in `pm.py`; `claim` requires today's approved plan.
3. Listener: per-message `claude -p` (async; polling continues).
4. Timers: 09:00 plan, 30-min work ticks, 18:00 recap. Replace 09:00/21:00.
5. Update `project-manager` SKILL.md and docs.

## Open defaults (change any time)

Weekdays only (Mon–Fri): no plan, ticks, recap or outbound messages on
weekends. If Joe writes on a weekend he still gets a reply, but nothing
starts. `off` is the extra rest switch for weekdays.
Quiet hours 21:00–08:00. Plan cap 3. Message cap 5 lines.
