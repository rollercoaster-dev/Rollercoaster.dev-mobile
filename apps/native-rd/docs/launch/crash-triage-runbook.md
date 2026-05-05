# Crash Triage Runbook

**Purpose:** Daily process for turning Sentry crash reports into tracked, fixed issues. Runs continuously while the closed beta is live.

**Created:** 2026-05-04
**Owner:** Joe (or whoever's on triage rotation)

---

## Daily flow (5–10 min)

1. Open Sentry → `native-rd` project → Issues, sorted by **Last Seen** descending
2. Scan anything new since yesterday. For each:
   - **Same signature as an existing GitHub issue?** → Add a comment to the issue with the new occurrence (build number, OS, count). Move on.
   - **New signature?** → Add a label (see below), then file a GitHub issue (see template).
   - **Spam / your own forced-crash test / known-fixed?** → Resolve in Sentry with a one-line note ("forced test", "fixed in #1234").
3. Anything labelled `crash:launch` is highest priority — investigate before everything else; users can't open the app to send feedback if it crashes on launch.

That's it. No daily report, no dashboards. The Sentry UI _is_ the dashboard.

---

## What counts as "the same signature"?

Use Sentry's grouping as the default — it groups by error type + stack frame. Override your judgment if Sentry got it wrong:

- **Same root cause, different surface frame** → same issue (e.g. an Evolu null deref hit from two different screens). Comment on the existing issue.
- **Same surface frame, different root cause** → different issue (rare but possible — e.g. two unrelated bugs both end up calling the same logger that crashes).

When in doubt, file a separate issue. Cheaper to merge later than to lose a crash in someone else's thread.

---

## Issue template

Title: `crash(ios): <short symbol or top JS frame> · build <n>`

Body:

```markdown
## Sentry link

[issue/<id>](https://sentry.io/organizations/<org>/issues/<id>/)

## First seen

Build N, iOS X.Y.Z, <date>

## Stack (top frames)

<paste from Sentry — already symbolicated>

## Reproduction

<known steps if any, otherwise "unknown — happened in TestFlight">

## Suspected cause

<one-line guess>

## Labels

crash:js-hermes (or other — see below)
```

---

## Labels

Apply exactly one of these to every crash issue:

| Label              | When to use                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------- |
| `crash:launch`     | Crashes before the first screen renders. Highest priority.                                |
| `crash:native`     | Top frames are Objective-C / Swift, not JS. Often an Expo or RN library bug.              |
| `crash:js-hermes`  | Top frames are JS. Most of our own bugs land here.                                        |
| `crash:reanimated` | Reanimated-specific (UI thread, worklets). Often platform-version-sensitive.              |
| `crash:flaky`      | Hits sporadically, not reliably reproducible, low user count. Park until pattern emerges. |

You can layer additional labels (`priority:high`, `area:badges`, etc.) — these crash labels are just for the _kind_ of crash.

---

## Release gate

**Before promoting build N from internal → external testers, every crash signature in build N-1's top 3 (by user count) must have a tracked GitHub issue.**

You don't have to _fix_ them all — you have to know they exist and have decided what to do (fix now / fix next build / accept and document).

Why: external testers are people we asked to trust the app. Promoting a build with the same top-3 crashes the previous build had means we're shipping known problems we didn't even document.

---

## Fallback: when Sentry isn't enough

Sometimes Sentry won't have the crash. Two specific cases:

1. **Pre-init native crash** — the app crashed before `Sentry.init()` ran (e.g. AppDelegate code, native module load). Sentry SDK never got a chance to install handlers.
2. **SDK init failure** — `Sentry.init()` itself threw, or the network couldn't reach `ingest.sentry.io`.

In both cases, fall back to **Apple's pipeline:**

- App Store Connect → TestFlight → Crashes (if the tester's device has crash sharing on)
- Or ask the tester to: Settings → Privacy & Security → Analytics → Analytics Data → look for a `.ips` file dated to the crash → share via the share sheet

`.ips` files have native frames symbolicated by Apple but JS frames are bytecode offsets. If the JS frames matter, you'll need the Hermes sourcemap from the EAS build artifact for that build number — but at that point it's faster to ship a new build that makes the crash reach Sentry, rather than symbolicating manually.

---

## What we deliberately don't do

- **No daily standup, no triage rotation calendar** — the volume in closed beta doesn't justify it. Solo triage in 5–10 min/day works for ~12 testers.
- **No Slack alerts on every new crash** — the noise will burn out faster than the signal helps. Sentry email digests are fine for now.
- **No "open every crash automatically as a GitHub issue"** — most crashes aren't worth filing. Triage decides; automation doesn't.

---

## Related

- `docs/plans/2026-05-04-sentry-integration.md` — implementation plan (#971)
- `docs/launch/privacy-verification.md` — privacy test plan, run before each TestFlight push
- `docs/plans/2026-05-02-user-testing-prep.md` — overall closed-beta context
