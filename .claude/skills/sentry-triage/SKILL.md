---
name: sentry-triage
description: Weekly Sentry issue triage for native-rd. Pulls unresolved Sentry issues, classifies each via a deterministic decision tree, archives noise in Sentry, files actionable bugs as GitHub issues (deduping by Sentry shortId), and sends a one-shot Telegram summary. Designed to be invoked manually as `/sentry-triage` or weekly via `/loop 1w /sentry-triage`.
---

# Sentry Triage — native-rd

This skill walks the unresolved Sentry issues in `rollercoasterdev/native-rd`, classifies each one with explicit rules, and turns them into either a GitHub issue or a Sentry archive — then notifies via Telegram.

## Hard constants

| Constant            | Value                                        |
| ------------------- | -------------------------------------------- |
| Sentry org slug     | `rollercoasterdev`                           |
| Sentry project slug | `native-rd`                                  |
| Sentry region URL   | `https://de.sentry.io`                       |
| GitHub repo         | `rollercoaster-dev/Rollercoaster.dev-mobile` |
| Telegram delivery   | `tg-send` (from telegram skill)              |

Pass `regionUrl: "https://de.sentry.io"` on every Sentry MCP call — this org is on the EU instance.

## Preconditions — verify before doing anything

Run these in parallel; abort with a Telegram error message if any fail:

1. Sentry MCP reachable: call `mcp__sentry__whoami` (should return Joe's identity).
2. `gh` authenticated: `gh auth status` exit 0.
3. `tg-send` available: `command -v tg-send` exit 0.

If any precondition fails, do NOT proceed with triage. Send a single `tg-send` with what failed, then stop.

## Step 1 — Fetch unresolved issues

```
mcp__sentry__search_issues({
  organizationSlug: "rollercoasterdev",
  projectSlugOrId: "native-rd",
  regionUrl: "https://de.sentry.io",
  query: "is:unresolved",
  sort: "freq",
  limit: 100
})
```

Capture for each issue: `shortId`, `title`, `events`, `users`, `firstSeen`, `lastSeen`, `culprit`, `seerActionability`, `permalink`.

If 0 unresolved issues: send `tg-send` "Sentry triage: 0 unresolved issues. Nothing to do." and exit.

## Step 2 — Classify each issue (deterministic, in order)

For each issue, walk these rules top-to-bottom. The FIRST match wins. The rules use only Sentry-returned fields — do NOT let the LLM "judge" the category. The LLM only writes the body of any GH issues it files.

```
Rule 1 — TEST / verification noise
  IF title matches /TEST|sentry-cli|verification|smoke/i
  THEN: archive in Sentry. action = "archived:test"

Rule 2 — Stale single occurrence
  IF events == 1 AND users <= 1 AND firstSeen older than 7 days
  THEN: archive in Sentry. action = "archived:stale-single"

Rule 3 — Known native-lib upstream noise
  IF (culprit OR title) matches any of:
     /margelo::nitro/, /folly::dynamic/,
     /_axDictionaryKeyReplacement/, /google::logging_fail/,
     /__pthread_kill/
  AND events <= 3
  THEN: file GH issue. labels = ["bug", "app:native-rd", "priority:low"]
        action = "filed:upstream"
  NOTE: title is matched because Sentry sometimes places the upstream
        frame in title only (e.g. NATIVE-RD-8 ax-dict 2026-05-16/27,
        NATIVE-RD-4 margelo::nitro 2026-06-07) with culprit pointing at
        the Swift `main` thunk. See memory `sentry-triage-rule3-drift`.

Rule 4 — High signal
  IF seerActionability == "high" OR events >= 10 OR users >= 3
  THEN: file GH issue. labels = ["bug", "app:native-rd", "priority:high"]
        Also run mcp__sentry__analyze_issue_with_seer and paste suggestion in body.
        action = "filed:high-signal"

Rule 5 — Default
  ELSE: file GH issue. labels = ["bug", "app:native-rd", "question"]
        action = "filed:triage"
```

### Archive action

```
mcp__sentry__update_issue({
  organizationSlug: "rollercoasterdev",
  issueId: shortId,
  regionUrl: "https://de.sentry.io",
  status: "ignored",
  ignoreMode: "untilEscalating"
})
```

`status: "ignored"` + `ignoreMode: "untilEscalating"` is what Sentry's UI calls "archive". The issue auto-reopens if it escalates (e.g., volume spike), which is what we want — we're saying "not worth my time _now_", not "this is fixed".

### File action — with dedup

Before creating: search GH for the shortId in body.

```
gh issue list \
  --repo rollercoaster-dev/Rollercoaster.dev-mobile \
  --state all \
  --search "in:body $shortId" \
  --json number,title,state,closedAt,url
```

If any match: check the dup's state.

**Closed-but-stale (auto-resolve):**
  IF dup.state == CLOSED AND Sentry lastSeen < dup.closedAt
  THEN: the Sentry issue is just a stale `unresolved` row — the GH fix
        already landed and Sentry has been silent since before the close.
        Resolve it in Sentry.

```
mcp__sentry__update_issue({
  organizationSlug: "rollercoasterdev",
  issueId: shortId,
  regionUrl: "https://de.sentry.io",
  status: "resolved",
  reason: "Resolved via GH #<N> closed <closedAt>; lastSeen <lastSeen> (before close). Sentry status was stale."
})
```

  Record action as `resolved:closed-dup:<N>`. If Sentry ever sees this
  signature again, the resolved issue auto-reopens — so no information
  is lost if the GH close was premature.

**Plain dup:**
  ELSE: skip create. Record action as `skipped:dup:<N>` and capture the
        existing issue URL for the summary.

If no match: create the issue.

```
gh issue create \
  --repo rollercoaster-dev/Rollercoaster.dev-mobile \
  --title "[Sentry $shortId] $title" \
  --label "<comma-separated labels>" \
  --body "<see template below>"
```

#### GitHub issue body template

```markdown
**Source:** Sentry issue [`$shortId`]($permalink) — classified `$action`

| Field              | Value              |
| ------------------ | ------------------ |
| Events             | $events            |
| Users affected     | $users             |
| First seen         | $firstSeen         |
| Last seen          | $lastSeen          |
| Culprit            | `$culprit`         |
| Seer actionability | $seerActionability |

## Why this was filed

<one paragraph: which classification rule matched and what it means in plain English>

## Seer analysis

<only for Rule 4: paste the `analyze_issue_with_seer` summary; for other rules omit this section>

## Reproduction notes

<one paragraph: what we know about reproducing; if it's an iOS native crash with no JS context, say so>

## Acceptance

- [ ] Root cause identified
- [ ] Fix landed or upstream issue filed
- [ ] Sentry issue resolved (`gh` -> Sentry `update_issue` with `status: resolved`)

---

_Filed by `/sentry-triage`. Dedup key: `$shortId` in body._
```

## Step 3 — Telegram summary

Build a single message. Use markdown (`tg-send` supports it).

```
*Sentry triage — native-rd*
Week of <ISO date>

✅ Archived: <count>
✅ Resolved: <count> ([list as Sentry shortId → GH #num — closed-but-stale])
🆕 Filed: <count> ([list as Sentry shortId → GH #num links])
♻️ Dedup-skipped: <count>
⚠️ Errors: <count if any>

Total processed: <N>
```

For each filed issue include one line: `${shortId} → #${ghNumber} (${classification})`.

Send with:

```
tg-send "$(cat <<'EOF'
<message body>
EOF
)"
```

If any step errored partway, send a second `tg-send` with `❌ Errors:` and a bullet list.

## Step 4 — Update memory if classification rules drifted

Do NOT update memory automatically. If during a run you encounter a recurring novel culprit that didn't match any existing Rule 3 pattern AND it appears in ≥ 2 issues, flag it in the Telegram summary under a `🔍 New pattern detected:` line — do not silently add it to Rule 3.

## Failure modes to handle

- **Sentry MCP times out** → abort, Telegram error.
- **`gh issue create` fails** (e.g., label doesn't exist) → log it, continue with the next issue, include in the final error block.
- **Dedup search returns 100+ results** → safety guard; cap at first 10 and proceed.
- **More than 20 issues to file in one run** → cap at 20, archive nothing, send Telegram alert "abnormal volume — manual triage recommended".

## What this skill is NOT

- Not a replacement for Sentry alerts on production crashes. This is _weekly_ triage.
- Not a Seer wrapper — Seer runs only for Rule 4 matches.
- Not a release-gate. Doesn't block anything; only categorizes.

## Manual override

If invoked with an argument like `/sentry-triage dry-run`, do everything except `mcp__sentry__update_issue` and `gh issue create` — just print what would happen and send the summary with a `(dry-run)` marker.
