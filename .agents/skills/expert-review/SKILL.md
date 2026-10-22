---
name: expert-review
description: Reviews the current branch (or the checked-out PR) of Rollercoaster.dev-mobile with a panel of domain-expert subagents — correctness, tests, UI/design system, ND accessibility, ND guardrails (ADR-0012 no-auto-judgment), Evolu data model, Open Badges/signing, privacy & security, i18n, build & release, production readiness, docs/ADRs — verifies every finding against the code and writes one ranked report. Report only — never edits code or posts to GitHub. Use when asked for an "expert review" / "panel review", or to review a branch or diff before opening or readying a PR.
---

# Expert Review

A panel of `review-*` subagents (`.claude/agents/`), each grounded in this
repo's own docs and ADRs, reviews a diff in parallel. A verifier re-checks
every finding against the code, and you hand the user one deduplicated,
ranked report.

**Report only.** Never edit code outside `$RUN`, commit, push, or comment on
GitHub from this skill. All subagents are read-only.

## Inputs

| Argument                 | Reviews                                                                                                                      |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| none                     | current branch vs. its merge base with `origin/main`, including uncommitted and untracked changes                            |
| PR number (`733`) or URL | the same diff, with the PR's title, body and linked issue as intent — only when that PR's branch is the one checked out here |

**The current worktree is the only source the skill reads.** Its
`node_modules` (Evolu, Expo, unistyles types) is what the code compiles
against; a bare checkout has none and experts end up guessing library APIs.
Never check another revision out for the review.

## Step 1 — Prepare the run

1. `ROOT=$(git rev-parse --show-toplevel)`.
2. `RUN="$ROOT/tmp/expert-review/<branch-or-pr>-<yyyymmdd-hhmm>"`;
   `mkdir -p "$RUN"` (`tmp/` is gitignored). Absolute, so the experts' paths
   don't depend on anyone's cwd.
3. **PR argument only:**
   `gh pr view <n> --json number,title,body,headRefName,headRefOid,closingIssuesReferences`.
   If `headRefName` is not `git branch --show-current`, **stop**: say the PR
   isn't checked out here and the review runs from that PR's own worktree.
   Don't switch branches. If `HEAD` differs from `headRefOid` or the tree is
   dirty, note in `$RUN/run.md` that local state is reviewed, not the pushed PR.
4. Build the diff — the same commands for both inputs. Compute the base
   **once** and derive patch and file list from the same comparison:
   ```bash
   cd "$ROOT"
   git fetch -q origin main
   BASE=$(git merge-base origin/main HEAD)
   git diff "$BASE" > "$RUN/diff.patch"                                # committed + staged + unstaged
   git diff --name-only "$BASE" > "$RUN/files.txt"                     # deletions included
   git diff --name-only --diff-filter=D "$BASE" > "$RUN/deleted.txt"
   git ls-files --others --exclude-standard | while read -r f; do
     git diff --no-index /dev/null "$f" >> "$RUN/diff.patch"
     echo "$f" >> "$RUN/files.txt"
   done
   grep '^+' "$RUN/diff.patch" | grep -v '^+++' > "$RUN/added.txt"     # for content triggers
   ```
   Untracked files are reviewed. Never `git add` on the user's behalf.
5. Intent → `$RUN/intent.md`: the commit messages
   (`git log --format='%s%n%b' "$BASE"..HEAD`) plus, first match wins: the
   PR's title, body and linked issue bodies; a plan under
   `apps/native-rd/docs/plans/` or `docs/plans/` the diff adds or changes; the
   issue the branch name references (`gh issue view <n>` for `issue-686`,
   `686-…`).
6. Record ROOT, HEAD, BASE and dirty status in `$RUN/run.md`. Before
   reporting, compare HEAD and the diff again; if they changed, say so
   instead of attributing old evidence to new code.

## Step 2 — Gate and route

Apply `references/routing.md` to `files.txt` and `added.txt`:

1. Drop generated and skipped files (with the bot-synced `de/` rule).
2. Gate: nothing left or only lockfiles → stop and say so. Docs and agent
   tooling only → `review-docs` alone (+ `review-nd-guardrails` for ADRs).
3. Match path globs, then content triggers. `review-correctness` and
   `review-tests` always run, except on the gates above.
4. Build each expert's file list; suffix deleted files with ` (deleted)`.

Tell the user in one line which experts run and which are skipped, then dispatch.

## Step 3 — Dispatch the experts

Send **one message** with one `Agent` call per routed expert
(`subagent_type: review-<domain>`), so they run in parallel. Brief each with:

```
Review for the expert-review panel. Follow your agent instructions and
.agents/skills/expert-review/references/finding-contract.md.

root: <ROOT>   (all file paths are relative to it; read code there)
diff: <RUN>/diff.patch
intent: <RUN>/intent.md
files: <the files routed to this expert>
```

Keep the brief to these fields — the agent file holds everything else.

If a `review-*` subagent type isn't available (agent files added after the
session started, or a host without Claude subagents), dispatch
`general-purpose` instead and prepend: "First read
`.claude/agents/review-<domain>.md` and act as that agent."

## Step 4 — Collect and dedupe

1. Parse the JSON block from each expert; save it as `$RUN/<expert>.json`.
   An expert that returned no valid JSON goes under "Experts with errors",
   never silently dropped.
2. Give every finding an id (`F1`, `F2`, …).
3. **Dedupe:** same file within ±3 lines describing the same problem → one
   finding with the clearest text, the highest severity, and every expert
   that raised it (agreement is a signal for the user).
4. Save everything to `$RUN/findings.raw.json`.

## Step 5 — Verify

Send **one message** with one `Agent` call per finding
(`subagent_type: review-verifier`, same fallback rule), each briefed with the
finding JSON, its id, `root`, `diff` and `intent`.

- More than 25 findings: verify `blocker` and `should-fix` first; for the
  rest, verify up to 25 in total and report the unverified count.
- Drop `rejected` findings from the report; keep them, with the reason, in
  `$RUN/findings.json`. Apply downgraded severities and corrected `file:line`.
- A verifier error or the cap leaves a finding **unverified**, not rejected —
  list it under verification gaps.
- `provisional` (security only): keep in its own section with the unresolved
  condition and `next_check`.

## Step 6 — Report

Write `$RUN/report.md`. Print only the tally, the blockers' and should-fixes'
one-line titles with `file:line`, and the report path — the full report is
for the file, not the chat.

```markdown
## Expert Review — <branch or PR #n>

<one-line tally: confirmed by severity, provisional, unverified;
"No issues found" only when all are zero and no expert failed>

### 🔴 Blockers

- **<title>** — `file:line` · <experts>
  <evidence, one or two sentences> → <fix>
  _Rule: <rule>_

### 🟡 Should fix

…

### ⚪ Nits

…

### Provisional security findings

<claim, unresolved condition, next check; omit when empty>

### Verification gaps

<findings not verified due to errors or the cap; omit when empty>

<details><summary>Run details</summary>

- Experts run: … · skipped: … (no matching files)
- Findings: <raw> raised → <after dedupe> → <confirmed> confirmed, <rejected> rejected by the verifier
- Experts with errors: …
- Files: `<RUN>/findings.json`, `<RUN>/report.md`
</details>
```

## Rules

- Never post to GitHub, never edit files outside `$RUN`.
- Don't add findings of your own — you orchestrate; experts and the verifier
  judge. Drop a finding only through dedupe or the verifier.
- Report subagent failures plainly instead of hiding them.
- Fixing confirmed findings is a separate step on the user's go-ahead. Any
  confirmed finding left unfixed must be tracked per `apps/native-rd/AGENTS.md`
  → "Handling Review-Skipped Findings" — never chat-only.
