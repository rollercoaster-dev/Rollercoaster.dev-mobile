# Milestone 3 — native-rd i18n

Single source of truth for the i18n milestone. The GitHub dependency graph is authoritative for _which issues are open_; this doc is authoritative for _operational order and rationale_. When they disagree, the graph wins for structure and this doc is updated to match.

## Goal

Ship the German first-test path so native-rd is usable for German testers, without committing to a full app translation before beta. #76 is the closeout gate for the path, not a standalone implementation ticket.

## Current strategy (2026-05-18 pivot, in force)

Ship German via the shortest path. The earlier "careful 7-wave" ordering (testIDs → Hermes spike → lint → shared labels → screens → permission → native files → pseudo snapshots → closeout) is **explicitly superseded**: testIDs (#64), Hermes spike (#66), and raw-string lint (#63) are post-ship cleanup, not prereqs.

Concretely: every `resources/en/<ns>.json` is `{}` today. Foundation is plumbing-only (`src/i18n/`, namespace split via PR #108). Real string extraction starts at #65 (`common`).

## Operational order

### Now — sequential

1. **#65 — `common` shared labels.** Populates `resources/en/common.json` with action verbs, evidence-type labels, theme option labels. Migrates `src/types/evidence.ts` and `src/hooks/useTheme.ts` so they no longer carry display strings. Bounded consumer list; one agent only. Detailed plan: `docs/plans/issue-65-i18n-common-namespace.md`.

### Next — parallel screen migrations

After #65 lands, the following can run in parallel — each agent owns one namespace JSON, so PRs touch disjoint files and don't conflict on merge.

First-test-path cut (recommended default):

| Issue | Screens                                    | Namespace                                      |
| ----- | ------------------------------------------ | ---------------------------------------------- |
| #67   | Welcome, NewGoal, Settings                 | `welcome`, `newGoal`, `settings`               |
| #68   | Goals                                      | `goals`                                        |
| #69   | Focus Mode                                 | `focusMode`                                    |
| #70   | Evidence capture: photo, video, voice memo | `capturePhoto`, `captureVideo`, `captureVoice` |
| #72   | Permission-denied UI (cross-cutting)       | `permissions`                                  |

Deferred to post-first-ship (still in milestone but not on the German tester gate):

| Issue | Screens                                 |
| ----- | --------------------------------------- |
| #71   | Evidence capture: text note, file, link |
| #73   | Badge list + detail                     |
| #74   | Badge designer                          |

### Then — sequential again

3. **#61 — Native German locale files.** Expo `locales/de.json`, native permission strings, app display name. Touches `app.json` and native config; don't parallelize with anything else.
4. **First German translation batch.** Generated translations are acceptable for the first pass; populate `resources/de/<ns>.json` for every migrated namespace. Translation is not its own issue — it's part of the work each migration agent does for their namespace, or a single follow-up commit before #76.
5. **#76 — Closeout.** Native-speaker review of all German resources and native locale strings (tone, ND-first wording, permission-dialog clarity, consistency of app terms: _goal_, _evidence_, _focus mode_, _badge_). Manual iOS + Android verification of locale switching and fallback behaviour.

### Post-ship cleanup (after #76 closes)

| Issue                                                | Why deferred                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| #64 — stable testIDs                                 | Wave plan wanted this first to keep `git blame` clean across migrations. Shipping plan accepts the cost of test churn to move faster. Plan doc retained at `docs/plans/issue-64-i18n-testids.md` for when it reactivates. Explicit `blocked-by` edges to #70/#71/#72 wired 2026-05-23 — captures are the minimum bar so the cleanup pass works against final markup; doc-level reactivation still gated on #76 closeout. |
| #66 — Hermes Intl spike                              | Only matters when German plurals land. i18next's `dummyRule` matches English shape; English-only release is unaffected. Required before any namespace introduces `_zero`/`_one`/`_other` keys.                                                                                                                                                                                                                           |
| #63 — raw-string ESLint rule                         | A defence against regression after migration is largely done. Landing it earlier means hundreds of `eslint-disable-next-line` baselines that smear migration PRs.                                                                                                                                                                                                                                                        |
| #62 — `formatDate` / `formatEvidenceLabel` utilities | German uses Gregorian dates with translated month names; `Intl.DateTimeFormat` under Hermes handles this. Not on first-test path.                                                                                                                                                                                                                                                                                        |
| #75 — pseudo-locale snapshot tests                   | Needs migrated screens with strings to snapshot. Scoped to #76 screens only; badge surfaces are an explicit follow-up.                                                                                                                                                                                                                                                                                                   |

## Test-migration policy without #64

The acceptance criterion on several migration tickets says "updated assertions use testID or `t()`." With #64 deferred:

1. **Prefer accessibility-role queries.** `getByRole("button", { name: t("actions.save") })` beats `getByText`.
2. **`getByText` is acceptable** for the few assertions that genuinely prove visible copy renders. The pseudo locale catches missed `t()` calls; tests don't need to be that gate too.
3. **Don't add `testID` proactively.** Only use existing ones (`new-goal-title`, `create-goal`, etc.). Adding new testIDs is #64's scope when it reactivates.
4. **No plurals until #66.** Don't introduce `_zero`/`_one`/`_other` keys before the Hermes Intl spike confirms the polyfill shortlist.

## Translation workflow

The first German batch can be generated to keep implementation moving, but #76 does not close until a native speaker has reviewed the German resources and native locale strings. Review covers tone, ND-first wording, permission-dialog clarity, and consistency of app terms (_goal_, _evidence_, _focus mode_, _badge_).

Brand-flavoured theme names (_The Full Ride_, _Night Ride_) may stay English by the translator's preference. That's a translation decision recorded under #76, not an engineering one.

## Pseudo locale

`EXPO_PUBLIC_I18N_PSEUDO=true` + Metro restart. Production builds cannot resolve to pseudo regardless of env (`selectSupportedLanguage()` requires `__DEV__`).

After every edit to `resources/en/<ns>.json`: `bun run gen:pseudo`. Commit the en + pseudo JSON together so reviewers see the source and the generator output in one diff.

## Live-status query — broken, don't trust

`docs/plans/completed/2026-05-18-i18n-shipping-plan.md` and the original version of this doc both included a GraphQL query that flagged "ready" issues by checking `blockedBy: trackedInIssues` on each issue node. **That field returns parent epics, not blocked-by edges.** Issue Dependencies (the GH feature that stores `blocks` / `blocked-by`) is not exposed via the `Issue` GraphQL type. Every issue currently reports `ready: true`, which is vacuous.

Rely on this doc for sequencing. If you need a refreshed view of dependencies, walk Issue Dependencies in the GitHub UI directly.

## Things to NOT do

- **Don't reopen / re-migrate `rollercoaster-dev/monorepo#988`.** It's the closed foundation. Historical record only.
- **Don't re-do the namespace refactor.** It landed in PR #108. If `src/i18n/index.ts` already imports `enCommon` / `enWelcome` / etc., the refactor is done.
- **Don't skip the husky hook.** DCO sign-off is mandatory on every commit (`.github/workflows/dco.yml`).
- **Don't try to make agents share `en.json` writes.** Either namespace-first (current strategy) or sequential-only. With per-namespace JSONs there's no shared write.
- **Don't introduce plurals before #66.** German `_zero` keys will silently degrade under Hermes without the FormatJS PluralRules polyfill.
- **Don't trust the live-status `ready` flag.** See above.

## History

Compressed audit trail. None of this is operational; preserved so future readers can reconstruct _when_ and _why_ the milestone re-shaped itself.

- **2026-05-13 — milestone audit.** #76 made parent of #65 + #67–#72; 36 blocked-by edges wired (via Issue Dependencies UI; not visible via GraphQL); #994 removed (Android live locale-change strategy — punt vs. bridge decision); #61 removed (gated on "which second language?"); #66 body updated with "blocks #62" note; #75 scoped to #76 screens only.
- **2026-05-16 — review.** #76 clarified as closeout gate; #61 re-added (German selected); native-speaker review gate added; Wave 1 ordering clarified (#64 + #66 before migrations, #63 either early or after first migration).
- **2026-05-18 — strategy pivot.** Wave plan superseded by shipping plan: defer #64/#66/#63, go `common` → parallel screens → native files → closeout. Detailed in `docs/plans/completed/2026-05-18-i18n-shipping-plan.md`.
- **2026-05-19 — issue transfer + namespace refactor.** All 16 open i18n issues transferred from `rollercoaster-dev/monorepo` (milestone #30) to this repo (milestone #3). Namespace refactor landed (PR #108): 15 per-screen JSON files (all `{}`), drift-guard test, pseudo generator updated.
- **2026-05-23 — #64 dep edges wired.** Explicit `blocked-by` edges from #64 → #70/#71/#72 added; `dep:blocked` label restored. Doc-level policy unchanged (post-ship cleanup), but the GH dependency graph now reflects the real minimum bar so #64 surfaces in triage once captures merge.

## Re-entry instructions

If you `/clear` and come back:

1. `git log main..HEAD --oneline` — what's landed since.
2. `ls -la src/i18n/resources/en/` and a few `cat`s — which namespaces have content. If `common.json` is `{}`, start at #65 (`docs/plans/issue-65-i18n-common-namespace.md`). If `common.json` is populated but most screen namespaces are `{}`, you're at the parallel-screens phase.
3. If something in the graph contradicts this doc, **the graph wins** and this doc gets updated to match.

## Move to completed

This plan moves to `docs/plans/completed/` when #76 closes. Post-epic tickets (#73, #74, #75) and post-ship cleanup tickets (#64, #66, #63, #62) carry on under their own per-issue plans if needed.

When archiving this plan, also delete `apps/native-rd/.claude/skills/i18n-screen-migration/` — it exists to compress the recurring per-screen migration workflow (#67/#68/#69/#70/#71/#72) and has no payoff once the migrations are done. Its decision tree lives permanently in `docs/i18n.md`; the skill is just the trigger surface.
