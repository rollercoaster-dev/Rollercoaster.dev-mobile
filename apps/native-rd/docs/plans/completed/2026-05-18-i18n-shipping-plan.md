# 2026-05-18 — i18n shipping plan (German first-test path)

Pick this up after switching to Warp/tmux. Self-contained on purpose so a fresh agent context can resume without re-deriving anything.

> **Update (2026-05-19):** the namespace refactor described under "Parallelism question" is **done** (see Group C below). The shipping plan now picks up at "which screens get migrated first" — the refactor is no longer an open decision.

## Goal

Ship German translations for the first-test-path screens ASAP. Skip the audit's "careful" wave ordering — testIDs, Hermes Intl spike, raw-string lint — and treat those as cleanup after the German tester path is live.

## Status (as of 2026-05-19)

**Branch:** `i18n-milestone-research-and-next-steps` (worktree at `/Users/joeczarnecki/.superset/worktrees/Rollercoaster.dev-mobile/i18n-milestone-research-and-next-steps`).

**Committed (clean before today's session):** see `git log main..HEAD` — milestone docs, lint of staged native files, sentry-triage skill, etc.

**Uncommitted in working tree (across three logical groups):**

```
# Group A — issue-move doc updates
 M apps/native-rd/docs/plans/2026-05-02-user-testing-prep.md
RM apps/native-rd/docs/plans/issue-991-i18n-testids.md -> issue-64-i18n-testids.md
 M apps/native-rd/docs/plans/issue-988-i18n-foundation.md
RM apps/native-rd/docs/plans/milestone-30-i18n.md -> milestone-3-i18n.md

# Group B — this shipping plan
A  apps/native-rd/docs/plans/2026-05-18-i18n-shipping-plan.md

# Group C — namespace refactor
 M apps/native-rd/src/i18n/index.ts
 M apps/native-rd/src/i18n/i18next.d.ts
 M apps/native-rd/src/i18n/__tests__/i18n.test.ts
 M apps/native-rd/scripts/generate-pseudo-locale.ts
 M apps/native-rd/docs/i18n.md                                  (layout diagram + usage examples)
D  apps/native-rd/src/i18n/resources/en.json
D  apps/native-rd/src/i18n/resources/pseudo.json
A  apps/native-rd/src/i18n/resources/en/{15 files}.json          (all {})
A  apps/native-rd/src/i18n/resources/pseudo/{15 files}.json      (all {})
 M bun.lock                                                     (touched by `bun install` for this worktree)
```

Group A + B are doc-only. Group C is the namespace refactor — verified: 25/25 i18n tests pass, `bun run type-check` clean, `bun run lint` 0 errors, cold iOS build launched successfully on simulator with no visible UI changes (confirms refactor is invisible at runtime).

## What changed on GitHub today

All 16 open i18n issues were transferred from `rollercoaster-dev/monorepo` (milestone #30) to `rollercoaster-dev/Rollercoaster.dev-mobile` (milestone #3, "native-rd: i18n"). #988 (closed foundation) stays in monorepo as historical record.

| Old (monorepo) | New (this repo) | Title                                                               |
| -------------- | --------------- | ------------------------------------------------------------------- |
| 989            | **#62**         | locale-aware format utilities (`formatDate`, `formatEvidenceLabel`) |
| 990            | **#63**         | ESLint rule banning raw JSX strings                                 |
| 991            | **#64**         | stable testIDs on load-bearing UI                                   |
| 992            | **#65**         | shared labels (child of #76)                                        |
| 993            | **#66**         | Hermes Intl spike                                                   |
| 995            | **#67**         | migrate Welcome/NewGoal/Settings (child of #76)                     |
| 996            | **#68**         | migrate Goals (child of #76)                                        |
| 997            | **#69**         | migrate Focus Mode (child of #76)                                   |
| 998            | **#70**         | migrate evidence: photo/video/voice (child of #76)                  |
| 999            | **#71**         | migrate evidence: text/file/link (child of #76)                     |
| 1000           | **#72**         | migrate evidence: permission-denied (child of #76)                  |
| 1001           | **#73**         | migrate badge list + detail                                         |
| 1002           | **#74**         | migrate badge designer                                              |
| 1003           | **#75**         | pseudo-locale snapshot tests                                        |
| 1004           | **#61**         | native German locale files (Expo `locales/*.json`)                  |
| 1029           | **#76**         | German first-test path (epic, parent of #65 + #67–#72)              |

Parent/child tree (#76 → its children) was auto-rewired by GitHub once both ends landed in the same repo. **Blocked-by edges did NOT transfer** — the plan doc references "36 wired edges" via Issue Dependencies, none of which I could see via GraphQL. If you rely on the live-status query's `ready` flag, treat it as currently lying.

`monorepo` milestone #30 was closed on 2026-05-19 after the transfer settled.

## Reality check on the original wave plan

`apps/native-rd/docs/plans/milestone-3-i18n.md` describes a careful 7-wave migration. It's good engineering, but it's slow. Concretely, **every `resources/en/<ns>.json` is `{}` today** — zero strings have actually been extracted. Foundation is in (`src/i18n/index.ts`, `language.ts`, `pseudoTransform.ts`, types) plus the namespace split, but it's plumbing only.

If we follow the wave plan as written: ~10 PRs to ship German. If we cut to the bone: ~5–6 screen migration PRs + native locale files + German translations.

## Parallelism — decided + done

**The namespace refactor is landed in the working tree (Group C above).**

`src/i18n/index.ts` now declares a `NAMESPACES` list and ships one resource bundle per workflow area: `common`, `welcome`, `newGoal`, `settings`, `goals`, `focusMode`, `capturePhoto`, `captureVideo`, `captureVoice`, `captureText`, `captureFile`, `captureLink`, `permissions`, `badges`, `badgeDesigner`. Each has matching `resources/en/<ns>.json` and `resources/pseudo/<ns>.json` files (all currently `{}`).

This unlocks worktree-isolated parallel screen migrations: each agent owns one namespace JSON, so PRs touch disjoint files and don't conflict on merge. `i18n.test.ts` has a drift guard test (`every declared namespace is registered for en and pseudo`) that fails if the NAMESPACES list, the resource bundles, and the `CustomTypeOptions` types ever fall out of sync.

Why this matters for shipping: the `common` namespace (default) carries shared labels — `actions.save`, `actions.cancel`, `evidenceTypes.photo.label`, etc. — and should land **first** so screen agents can reference it without duplicating. After that, screen agents run in parallel.

## Open decision (this is the one to pick first when you resume)

Which screens to migrate, and in what order. Two viable cuts:

1. **First-test-path only.** Migrate `common`, then in parallel: `welcome`, `goals`, `focusMode`, `capturePhoto`, `captureVideo`, `captureVoice`, `permissions`. Skip `captureText/File/Link`, `badges`, `badgeDesigner`, `settings`, `newGoal`, `badge designer` for now. Ship German for the core flow, treat the rest as cleanup.
2. **All migratable screens.** Hit every namespace except `badges`/`badgeDesigner` (which the audit punted as post-epic). Higher coverage, longer review burden.

Recommendation: **option 1** — first-test-path only. The German tester flow is the goal; everything else is scope creep against "ASAP."

## First action when you resume

Commit the three logical groups (recommended order; each commit gets its DCO trailer via the husky hook):

```sh
# 1. Group A — doc retargeting
git add apps/native-rd/docs/i18n.md \
        apps/native-rd/docs/plans/2026-05-02-user-testing-prep.md \
        apps/native-rd/docs/plans/issue-64-i18n-testids.md \
        apps/native-rd/docs/plans/issue-988-i18n-foundation.md \
        apps/native-rd/docs/plans/milestone-3-i18n.md
git add -A apps/native-rd/docs/plans/
git commit -m "docs(i18n): retarget plan docs to milestone #3 issue numbers"

# 2. Group B — this shipping plan
git add apps/native-rd/docs/plans/2026-05-18-i18n-shipping-plan.md
git commit -m "docs(i18n): add 2026-05-18 shipping plan"

# 3. Group C — namespace refactor (includes i18n.md edits that overlap Group A)
git add apps/native-rd/src/i18n apps/native-rd/scripts/generate-pseudo-locale.ts apps/native-rd/docs/i18n.md bun.lock
git commit -m "refactor(native-rd): split i18n resources into per-screen namespaces"
```

> Note: `apps/native-rd/docs/i18n.md` has edits from both Group A (link rename) and Group C (layout diagram). Either fold its edits into Group A or Group C — don't try to split them mid-file.

After those land: pick which screen migration cut to run (above), then start with `common` (sequential, me-only) before spawning parallel screen agents.

## Things to NOT do

- **Don't run the live-status GraphQL query expecting `blockedBy` data.** The field doesn't exist on the Issue type as the plan doc assumes. Every issue currently reports `ready: true`, which is vacuous. Rebuild dep edges via Issue Dependencies UI if you actually need that signal — out of scope for shipping.
- **Don't reopen / re-migrate `rollercoaster-dev/monorepo#988`.** It's the closed foundation. Leave it alone.
- **Don't re-do the namespace refactor.** It's in the working tree already. If you find yourself looking at `src/i18n/index.ts` thinking "should this use namespaces?" — it already does.
- **Don't skip the husky hook.** DCO sign-off is mandatory on every commit to this repo (`.github/workflows/dco.yml`).
- **Don't try to make agents share `en.json` writes.** Either namespace-first or sequential-only.

## Stretch: native locale files (#61) + native-speaker review

After screens are migrated and `de.json` exists, the remaining work for "German testers can actually use the app" is:

- iOS `apps/native-rd/locales/de.json` (Expo `expo-localization` plugin)
- Android equivalent
- Native permission strings (camera, microphone, photo library) in German
- **Native-speaker review of all German strings.** This is the gate on #76, not an engineering task.

These are sequential — they touch `app.json` and native config. Don't parallelize them.
