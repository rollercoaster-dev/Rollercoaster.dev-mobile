# Development Plan: Issue #593

## Issue Summary

**Title**: Epic: onboarding templates — a tutorial goal and a small library of badge-worthy starters
**Type**: epic (`type:epic`, `needs:design`) — not implementable as a single PR
**Complexity**: MEDIUM (for the slice that is actually buildable now)
**Estimated Lines**: ~420 lines (mostly the decomposition doc; a small additive schema change)

#593 proposes ten children (A–J) across three waves. This plan does **not** implement the
epic. It (a) turns A–J into concrete, correctly-scoped child issues grounded in the current
code and issue graph, and (b) scopes the one PR's worth of work that is genuinely unblocked
today: writing the epic's own record doc (child A) and the additive provenance column
(child C). D and E are human decisions, not code. B is blocked on a scoping question this
plan resolves. F–J all require B's format to exist first.

## Intent Verification

- [ ] `apps/native-rd/docs/plans/onboarding-templates.md` exists and states, per template,
      the span/teaches/instances table from the epic body, corrected against current code
      (§ "Corrections" below), plus the wave/dependency graph with real issue numbers once filed.
- [ ] Ten GitHub issues (or nine, if B and #615 are formally cross-linked instead of duplicated)
      exist, each titled and scoped per the "Children, re-scoped" table below, each carrying
      `afk`/`hitl` and `dep:blocked` labels matching this plan's dependency graph.
- [ ] `goal.templateId` is a nullable column on `step`'s neighbor table `goal`, additive
      (`nullOr(NonEmptyString1000)`), and `createGoal` accepts an optional `templateId` that
      round-trips through a query — verified by a test in `queries.goal.test.ts` mirroring the
      existing `createGoal` suite's shape.
- [ ] No UI reads or displays `templateId` yet (wave-1 C is write/query plumbing only; display
      is deferred to wave 3 per Not in Scope below) — verified by `templateId` having zero
      non-test, non-query-layer references after this PR.

## Dependencies

| Issue | Title                                                                                 | Status                                                            | Type                                      |
| ----- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------- |
| #570  | Epic: Set B & C authoring                                                             | ✅ CLOSED                                                         | Soft — epic itself is closed              |
| #584  | [Storybook] StepWaitEditor — record an external `waiting on` in Focus                 | 🔴 OPEN (`dep:blocked`, Storybook only, not yet wired into Focus) | Blocker for 2 of 4 v1 templates           |
| #615  | [Spike] Goal-template format — make ADR-0015 milestone 5 something other than a guess | 🔴 OPEN                                                           | Related, not blocking (see § Corrections) |

**Status**: ⚠️ Has an unmet dependency, but narrower than the epic states — see below.

**Correction to the epic's own "#570 coupling" section.** The epic (written before its
children closed) says templates that write `dueAt` / `afterStepId` / `waitingOnLabel` /
`waitingOnExpectedAt` must wait for "#570's editors." As of this research, #570 and 6 of
its 7 children (#571–#577) are **closed** — PR #590 wired the in-row `StepTimingEditor` to
`updateStep`, so `dueAt` and `afterStepId` are authorable today via Edit Goal. Only **#584**
(`StepWaitEditor`, the external "waiting on" editor in Focus) remains open, and it is
Storybook-only — no screen wiring yet. So the real blocker is narrower than "#570": it is
`waitingOnLabel`/`waitingOnExpectedAt` specifically, i.e. **#584**.

Effect on the epic's own template table:

- **"Make one substantial thing"** — needs cure/material waits (`waitingOnLabel`). Still
  blocked, but on #584, not #570.
- **"Put it on for other people"** — needs one `dueAt` (already authorable) **and**
  people-waits (`waitingOnLabel`, blocked on #584). Partially unblocked today.
- **"Portfolio"** and **"Find your footing"** — use neither field per the epic's own table;
  unaffected either way.

## Objective

Ship the epic's own decomposition record (child A) and the one piece of wave-1 work that is
pure, additive, and needs no design sign-off (child C: the `templateId` provenance column).
File the remaining children (B, D, E, F–J) as scoped, cross-linked GitHub issues so the epic
can proceed one ≤500-LOC PR at a time, per its own stated constraint.

## Decisions

| ID  | Decision                                                                                                                                                                                                                                                                                                                                                                                                                       | Alternatives Considered                                                                    | Rationale                                                                                                                                                                                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | `goal.templateId: nullOr(NonEmptyString1000)`, additive column on `goal`                                                                                                                                                                                                                                                                                                                                                       | Branded `TemplateId` id-type like `StepId`/`GoalId`; a separate `goal_template` join table | No template table exists to key against — templates are static, code-defined (child B), not DB rows. Free-text id matches the `parentStepId`/B-C-column precedent: additive, `nullOr`, Evolu reads existing rows as `null`, no migration (`src/db/schema.ts:117-131` comment on the B/C columns states this pattern explicitly)                |
| D2  | Template seeder (child F) resolves local template keys to real ULIDs by inserting sequentially and reading `.value.id` off each insert's `Result`, exactly as `NewGoalScreen.handleStartWorking` already does (`src/screens/NewGoalScreen/NewGoalScreen.tsx:127-152`: `goalResult.value.id as GoalId` used immediately as the FK for the next `createStep` call, and `stepResult.value.id as StepId` used for `createSubStep`) | A batch/transaction API; pre-generating ULIDs client-side before any insert                | `evolu.insert` already returns synchronously-readable ids and the codebase already composes multi-row creates this way with an accepted no-rollback-on-partial-failure caveat (documented in the same function's comment, `:120-125`). F should reuse this, not invent transactional semantics Evolu doesn't offer                             |
| D3  | Template source files live under `src/templates/` (format types + resolver, pure — no React, no I/O)                                                                                                                                                                                                                                                                                                                           | `src/data/templates/`; colocated under `src/screens/NewGoalWizard/`                        | Mirrors `src/badges/credentialBuilder.ts`, the codebase's existing precedent for a pure, framework-free domain module living at `src/<domain>/`. Matches the epic's own proposed path                                                                                                                                                          |
| D4  | Template copy (child E) and the picker screen (child G) get new i18n namespaces (e.g. `templates.json`, `templatePicker.json`) following the 5-step process documented at `src/i18n/index.ts:70-83`: en+de+pseudo JSON, import + `NAMESPACES` entry, `i18next.d.ts` type alias, `resources/_register/<name>.yml` voice register                                                                                                | Folding template copy into the existing `newGoal.json` namespace                           | Namespace-per-screen/feature is the established convention (19 existing namespaces, one per screen/flow: `welcome.json`, `newGoal.json`, `focusMode.json`, etc. — `src/i18n/resources/en/`)                                                                                                                                                    |
| D5  | The templates picker screen (child G) registers in `GoalsStack` (`src/navigation/GoalsStack.tsx`), reached from `GoalsCockpit`'s existing `onNewGoal` prop and (per the epic's "no fourth tab" rule) a new `onGetStarted`-adjacent path off `WelcomeScreen`                                                                                                                                                                    | A new top-level stack; a modal presented outside the tab navigator                         | `GoalsStack.tsx:1-20` is the exact precedent for adding a screen (`Stack.Screen` + `ParamList` entry in `navigation/types.ts`); `GoalsCockpit`'s empty state already renders a `Button` wired to `onNewGoal` (`src/screens/GoalsScreen/GoalsCockpit.tsx:133-148`) that child I repoints at the picker instead of straight into `NewGoalWizard` |
| D6  | Theme/a11y variant coverage (child J) follows the established `test.each` pattern over a representative `themeNames` subset crossed with the 7 `Variant`s (`"default" \| "highContrast" \| "largeText" \| "dyslexia" \| "lowVision" \| "autismFriendly" \| "lowInfo"`, `src/themes/variants.ts:29-36`), precedented at `src/components/IconButton/__tests__/IconButton.test.tsx:87-122`                                        | A full 14-theme × 7-variant cross product per component                                    | Existing convention explicitly samples "representative themes covering both color modes plus the a11y variants" rather than the full cross product — matches CI runtime constraints already accepted elsewhere in this codebase                                                                                                                |
| D7  | Child B (in-app template format) and #615 (ADR-0015 milestone-5 spike) are **not the same work** and B is not covered by #615                                                                                                                                                                                                                                                                                                  | Merge B into #615; block B on #615 landing first                                           | See § Corrections — opposite directions. #615's own body says so explicitly: "Not the same work as #593." Recommend cross-linking the two issues in child B's body so whoever writes B's format is aware of the terminology collision, but B should not wait on #615                                                                           |
| D8  | Wave-1 child C ships schema + query plumbing only; no screen reads or displays `templateId` in this PR                                                                                                                                                                                                                                                                                                                         | Add a "started from template X" badge to `GoalDetail`/`TimelineJourneyScreen` now          | Nothing consumes it until child H (tutorial goal) or child I (first-run wiring) exist — matches the epic's own "skeleton, not the full tree" principle and avoids dead UI code sitting unused for two waves                                                                                                                                    |

## Affected Areas (this PR only — wave-1 A + C)

- `apps/native-rd/docs/plans/onboarding-templates.md` (new): the epic's own child-A record — library rationale, corrected dependency graph, filed child-issue numbers
- `apps/native-rd/src/db/schema.ts`: add `templateId: nullOr(NonEmptyString1000)` to the `goal` table, with a comment following the existing B/C-column precedent
- `apps/native-rd/src/db/queries.ts`: `createGoal` gains an optional `templateId` parameter (undefined-safe, same convention as `updateStep`'s optional fields at `:843-857`)
- `apps/native-rd/src/db/__tests__/queries.goal.test.ts`: round-trip test for `templateId`

## Implementation Plan

### Step 1: Record the decomposition (child A)

**Files**: `apps/native-rd/docs/plans/onboarding-templates.md`
**Commit**: `docs(native-rd): record onboarding-templates epic decomposition (#593 child A)`
**Changes**:

- [ ] Write the library + rationale doc: the tutorial goal's 9 steps, the 4-template v1
      library table, the deferred templates, and the "Must not do" list — carried over from
      the epic body, since that is its only current record
- [ ] Correct the #570 coupling section per § Corrections above (blocker is #584, not #570)
- [ ] State the B / #615 relationship per D7 — cross-link, do not merge or block
- [ ] Record the re-scoped children table (below) with the real issue numbers once filed via `gh issue create`
- [ ] File GitHub issues for B (scoped per D7), D, E, F, G, H, I, J with correct `afk`/`hitl`
      and `dep:blocked` labels and bodies cross-linking this plan and #593

### Step 2: Additive `goal.templateId` column (child C, schema half)

**Files**: `apps/native-rd/src/db/schema.ts`
**Commit**: `feat(native-rd): add additive goal.templateId provenance column (#593 child C)`
**Changes**:

- [ ] Add `templateId: nullOr(NonEmptyString1000)` to the `goal` table definition, with a
      comment matching the `afterStepId`/B-C-column precedent (`:117-131`): additive, no
      migration, existing rows read as `null`

### Step 3: Thread `templateId` through `createGoal` (child C, query half)

**Files**: `apps/native-rd/src/db/queries.ts`
**Commit**: `feat(native-rd): accept optional templateId in createGoal (#593 child C)`
**Changes**:

- [ ] Add an optional `templateId?: string | null` parameter to `createGoal`, passed through
      to `evolu.insert("goal", { ... })` only when defined (mirrors the `undefined` = "don't
      touch" convention already used throughout `updateStep`)
- [ ] No caller changes required — existing call sites (`NewGoalScreen.tsx:130`) keep working
      unchanged since the parameter is optional

### Step 4: Tests

**Files**: `apps/native-rd/src/db/__tests__/queries.goal.test.ts`
**Commit**: `test(native-rd): cover templateId round-trip on createGoal (#593 child C)`
**Changes**:

- [ ] `createGoal(title, { templateId })` persists and reads back the value
- [ ] `createGoal(title)` (no `templateId`) still stores `null`, matching every pre-existing
      goal row

## Testing Strategy

- [ ] Unit tests for `createGoal`'s new parameter (Jest 30, mirrors existing `queries.goal.test.ts` shape)
- [ ] Test file path mirrors precedent: `src/db/__tests__/queries.goal.test.ts` (existing file, extended)
- [ ] No component/screen tests in this PR — wave-1 C ships no UI surface (D8)
- [ ] Manual testing: none required (pure DB layer change, no UI to exercise)

## Not in Scope

| Item                                                                      | Reason                                                                                                                                                                  | Follow-up                                                         |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Child B — template data format + resolver                                 | Needs the B/#615 cross-link recorded in child A first, and is itself a ≤500-LOC PR of its own (`src/templates/`, relative-date resolution, local-key → ULID resolution) | File as its own issue per this plan's Step 1                      |
| Child D — decide the tutorial badge treatment                             | Explicit `hitl`/`needs:design` human decision, not code (self-issued+marked / real issuer DID / no badge)                                                               | File as its own issue; blocks child H                             |
| Child E — copy pass, English-only decision                                | Human/product call the epic itself flags as "a decision to take in wave 1, not discover in wave 3"                                                                      | File as its own issue                                             |
| Children F–J                                                              | All depend on B (format) existing; F additionally needs C (this PR) and D; G needs B+E; H needs D+F; I needs G+H; J needs I                                             | Sequenced per epic's wave 2/3 graph, filed now, implemented later |
| Displaying `templateId` in any screen                                     | Nothing consumes it until H/I land (D8)                                                                                                                                 | Wave 3, child I                                                   |
| Populating `waitingOnLabel`/`waitingOnExpectedAt` in any shipped template | Blocked on #584, not this epic                                                                                                                                          | Track against #584, not a new issue                               |

_Everything except A and C's schema/query half is deferred — see table above for exactly where each deferred item picks back up._

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->

---

## Corrections to the epic's own claims

Verified against the current codebase; each citation re-checked line-by-line.

| Epic claim                                                                   | Verified                                                                                                                                             | Note                                                                                                                                                                                                                                                    |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createGoal(title)` at `src/db/queries.ts:108`                               | ✅ exact                                                                                                                                             |                                                                                                                                                                                                                                                         |
| `updateStep()` writes the four B/C columns, `src/db/queries.ts:843`          | ✅ exact (function starts line 843; fields at `:857-864`)                                                                                            |                                                                                                                                                                                                                                                         |
| `afterStepId` etc. at `src/db/schema.ts:128`                                 | ✅ exact (`afterStepId` is schema.ts:128, `waitingOnLabel`/`waitingOnExpectedAt`/`dueAt` follow at 129-131)                                          |                                                                                                                                                                                                                                                         |
| `src/badges/credentialBuilder.ts:33-49`, `buildDid`                          | ⚠️ off by ~15 lines                                                                                                                                  | Lines 33–49 are the `CredentialInput` interface (doc comment pushed `buildDid` down); `buildDid` itself is `:51-65` (declared at line 60). The substantive claim — self-issued, `issuerDid` derived from the user's own key, no app issuer — is correct |
| `grep -ri template src` returns badge-design hits only                       | ✅ confirmed                                                                                                                                         | `grep -ril template apps/native-rd/src` returns only `no-raw-colors` lint-rule tests, i18n namespace-convention tests, and `BadgeDesigner*`/`BadgeDetail*` files — no template infrastructure exists                                                    |
| "#570 coupling" — templates needing dates/waits must wait for #570's editors | ⚠️ stale                                                                                                                                             | #570 and 6/7 children are closed; only #584 (external wait editor) remains open. See § Dependencies above                                                                                                                                               |
| B is "the barrier," nothing else blocks A/C/D/E in wave 1                    | ✅ still true for C; B itself now additionally has the #615 naming-collision question to resolve (D7), which the epic didn't know about when written |                                                                                                                                                                                                                                                         |

## Open questions for the epic author (not resolved by this plan)

Both already named as `hitl`/`needs:design` by the epic itself — restated here as the only
genuine judgment calls this research surfaced (see final response for the canonical list).
