# Milestone 30 — native-rd i18n

Captures the audit decisions and wave ordering that aren't readable from issue bodies or the GitHub dependency graph alone. The graph is the source of truth for **structure**; this doc is the source of truth for **rationale**.

## Goal

Ship the German first-test path (#1029) so native-rd is usable for German testers, without committing to a full app translation before beta.

## Live status

Re-runs every time; do not maintain by hand:

```sh
gh api graphql -f query='
{
  repository(owner:"rollercoaster-dev", name:"monorepo") {
    milestone(number:30) {
      issues(first:50, states:OPEN) {
        nodes {
          number title
          blockedBy(first:10){ nodes { number state } }
          parent { number }
        }
      }
    }
  }
}' --jq '
  .data.repository.milestone.issues.nodes
  | map({
      n: .number,
      parent: (.parent.number // null),
      ready: ([.blockedBy.nodes[] | select(.state == "OPEN")] | length == 0),
      title: .title
    })
  | sort_by(.n)
  | .[] | "\(if .ready then "READY " else "blocked" end)  #\(.n)\(if .parent then "  (sub of #\(.parent))" else "" end)  \(.title)"'
```

**Next actionable issue:** whatever the query above flags `READY` at the top. As of milestone audit, that is **#988** (the foundation) — everything else is blocked on it transitively.

## Wave ordering and rationale

```
Wave 0:  #988                          foundation (deps + src/i18n/ + language selection)
Wave 1:  #993 → then #989, #990, #991  cross-cutting prereqs (see Hermes ordering below)
Wave 2:  #992                          shared labels keyspace
Wave 3:  #995, #996, #997, #998, #999  screen migrations (parallel)
Wave 4:  #1000                         permission-denied centralization
Wave 5:  #1029                         epic closeout — German tester path shippable
Post-epic: #1001, #1002, #1003         badge surfaces + regression gate
```

Rationale points the GH graph can't carry:

- **#993 before #989.** The Hermes Intl spike (#993) decides whether `formatDate` needs a FormatJS polyfill. If we run #989 first we'll either re-discover the polyfill question or ship an unverified assumption. The blocked-by edge enforces this; the rationale lives here.
- **#991 (testIDs) before screen migrations.** Migrating strings before adding testIDs would create two unrelated diffs in every screen-test PR (i18n + testID). Doing testIDs first decouples `git blame`.
- **#992 (shared labels) before screen migrations.** Many screens reference `evidenceTypes.*`, `common.actions.*`, etc. Migrating shared labels first reduces churn in subsequent screen PRs.
- **#1000 (permission-denied) is its own ticket, not folded into #998/#999.** Cross-cutting copy benefits from being centralized in one diff rather than smeared across two capture-cluster PRs.
- **#1003 scoped to #1029 screens only.** "Full pseudo-locale snapshot coverage" was explicitly out of scope for #1029 per its body. Adding badge-screen coverage when #1001/#1002 land is a one-line follow-up.

## Audit decisions (2026-05-13)

What changed on this milestone in today's audit, and why:

| Change                                | Reason                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------ |
| #1029 made parent of #992, #995–#1000 | #1029's scope list is a strict subset of those tickets — it's an epic, not a peer.   |
| 36 blocked-by edges wired             | Prose deps in bodies were correct but invisible to GH's dependency view.             |
| #994 removed from milestone           | Decision-gated (punt vs bridge). Body itself recommends punting. Belongs in backlog. |
| #1004 removed from milestone          | Gated on "which second language?" — a product decision, not engineering work.        |
| #993 body updated                     | Added explicit "blocks #989" line so readers see the polyfill-decision ordering.     |
| #1003 body updated                    | Scoped to #1029 screens; badge surfaces flagged as follow-up.                        |

No issues were merged or deleted. No scope was changed inside any ticket beyond #993 and #1003.

## Deferred items and their gates

These are tracked but not in the milestone:

- **#994 (Android live locale-change strategy).** Gate: confirm punt or bridge. Cheap doc-only resolution once a second language is on the roadmap.
- **#1004 (native locale files).** Gate: product decides which second language ships. Re-add to a future milestone when that decision lands.

## Re-entry instructions

If you `/clear` and come back:

1. Run the **Live status** query above. Whatever shows `READY` is fair game.
2. If you need to know _why_ the structure is what it is, read this doc.
3. If you need to know _what_ an issue does, read the issue body — they are kept current per the audit.
4. If something in the graph contradicts this doc, **the graph wins** (and update this doc).

## Move to completed

This plan moves to `docs/plans/completed/` when #1029 closes. The post-epic tickets (#1001, #1002, #1003) can carry on under their own per-issue plans if needed.
