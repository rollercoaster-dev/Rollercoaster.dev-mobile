# Development Plan: Issue #452

## Issue Summary

**Title**: `[Storybook]` FinishLine keepsake redesign
**Type**: feature (redesign of an existing, already-wired Storybook component)
**Complexity**: SMALL (single cohesive change; file count is wider than the
issue's own "1-2 files" gut estimate only because `FinishLine`'s one shared
dependency, `TimelineNode`, needs a small additive prop — see Decisions D1)
**Estimated Lines**: ~330–380 lines across ~12 files (component + styles +
stories + tests for `FinishLine`, a small additive change to `TimelineNode`

- its own stories/tests, a minimal prop-contract shim in
  `TimelineJourneyScreen.tsx`, and `en`/`pseudo`/`_register` i18n updates).
  Well above the issue's own "~150–250 LOC" gut estimate, driven mostly by
  Storybook/test boilerplate (see per-file breakdown in Affected Areas) — this
  matches the actual outturn on the sibling #451 plan (~230–290 lines for a
  _new_ component alone).

---

## Intent Verification

- [ ] `FinishLine` renders "Finish & design badge" as its primary heading —
      the old "Goal Evidence" heading is gone (`FinishLine.tsx`,
      `en/timelineJourney.json:finishLine.ctaTitle`).
- [ ] When `badgeDesign` is `null`, the badge preview shows a neutral tile
      with the **first letter of `goalTitle`**, uppercased (mirrors
      `BadgeWallCell`'s undesigned-badge fallback exactly —
      `BadgeWallCell.tsx:43-51`). When `badgeDesign` is non-null, the real
      `BadgeRenderer` renders instead.
- [ ] The goal star (`TimelineNode isGoalNode`) is **white/neutral** when
      `allStepsComplete` is `false` and **celebration yellow**
      (`theme.chrome.celebrationBg`/`celebrationFg`) when `true` — verified
      by two Storybook stories and a `TimelineNode` unit test, not by reading
      the unconditional `palette.yellow300` that ships today.
      `TimelineNode.styles.ts` has **zero** remaining references to
      `palette.yellow300` after this PR.
- [ ] When `goalEvidence` is empty, **no text renders** for the evidence
      section — no "No goal evidence yet" or any other absent-thing copy.
      Verified by a regression test asserting
      `JSON.stringify(screen.toJSON())` does not match
      `/\b(missing|needed|no .* evidence)\b/i` (mirrors the existing
      contract test in `FocusCurrentTaskCard.test.tsx:182-194`).
- [ ] Tapping the "Finish & design badge" row calls `onBadgePress` exactly
      once (Storybook + unit test); it does not also trigger
      `onEvidencePress` for any evidence row (no nested-Pressable bleed).
- [ ] `bun run test --testPathPatterns i18n` (locale-parity + pseudo-locale
      gates) stays green after the `en/timelineJourney.json` key changes.
- [ ] `bun run type-check` is clean, including `TimelineJourneyScreen.tsx`'s
      updated (breaking) call to `<FinishLine />`.

---

## Dependencies

| Issue | Title                                               | Status                                            | Type                                            |
| ----- | --------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------- |
| #384  | Epic — Full Ride redesign                           | Open (tracking epic)                              | Parent, not a blocker                           |
| #378  | `[Integrate]` Timeline assembly                     | Open — **this issue unblocks it**                 | Downstream, not a dependency                    |
| #420  | Decide TimelineNode goal-node color/token alignment | Open — explicitly "non-blocking" per its own body | Soft coordination, not a hard blocker           |
| #406  | TimelineNode — one state-color language             | ✅ Closed/merged                                  | Infra this plan reuses (`stepStateColorMap.ts`) |
| #407  | Timeline metadata band + substeps                   | ✅ Closed/merged                                  | Unrelated to this component                     |
| #417  | `paused` step status                                | ✅ Closed/merged                                  | Unrelated to this component                     |

**Status**: ✅ All dependencies met. `gh api .../452` reports no
`blocked_by` edges; `dep:independent` label confirmed; the issue body has no
`Blocked by` / `Depends on` / `After` marker — only "Unblocks #378" (this
issue is upstream, not downstream) and "coordinate with #420" (explicitly
soft — #420's own body says "non-blocking...design-token alignment
follow-up"). Start immediately.

**On #420 specifically**: #420 asks a broader question — should _every_
`TimelineNode isGoalNode` render use brand yellow, `journeyGoalBg/Fg`
(amber), or a new token, full stop? Grepping the codebase shows `isGoalNode`
has exactly **one** production caller today: `FinishLine.tsx`
(`grep -rn isGoalNode src` → only `TimelineNode.tsx` itself,
`TimelineNode.stories.tsx`, `TimelineNode.test.tsx`, and `FinishLine.tsx`).
So #420's "static color" question and this issue's "add a white↔celebration
_state_ toggle" question are orthogonal, not conflicting: this plan adds a
new `celebrate` axis to the goal-node styling; #420 can still later decide
what the _non-celebrating_ neutral state's exact token should be (this plan
uses the existing base `node` neutral background, not a new hardcoded
value, so #420's resolution is a drop-in replacement, not a rework).

---

## Objective

Redesign `FinishLine` (`src/components/FinishLine/`) from the pre-i18n-era
"Goal Evidence" card into the prototype's keepsake terminal: a "★ Finish &
design badge" tappable row with a monogram-or-real badge preview, a star
that turns celebration-yellow only once every step is done, and evidence
rendering that shows only what's present. Ships Storybook-first per
`AGENTS.md` — no navigation wiring (that's #378), only a callback prop.

---

## Decisions

| ID  | Decision                                                                                                                                                                                                                                                                                                                                                                                                                        | Alternatives Considered                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Rationale                                                                                                                                                                                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Extend `TimelineNode` with a new optional `celebrate?: boolean` prop (default `false`), consulted only when `isGoalNode` is true. Neutral state falls through to the base `node` style's existing `backgroundColor: theme.colors.background` (already "white" in light themes) instead of a new hardcoded value; celebrating state gets a new `goalNodeCelebrate` style keyed off `theme.chrome.celebrationBg`/`celebrationFg`. | (a) Reuse the existing `status` prop (pass `status="completed"` when done) — rejected: `status: StepStatus` is documented/typed as step status semantics, and is _already_ fully ignored for goal nodes today (both the glyph and, after this change, the style array branch off `isGoalNode`/`celebrate`, not `status`); overloading it for a second, unrelated boolean would be a silent semantic collision. (b) Duplicate the goal-node circle rendering locally inside `FinishLine.tsx` instead of touching the shared component — rejected: `isGoalNode` has exactly one production caller (`FinishLine.tsx`, confirmed by grep), so extending `TimelineNode` costs nothing in blast radius while keeping "one state-color language" (#406's own charter) in the one file that already owns goal-node styling.                                                       | Minimal, single-caller-safe change; keeps `TimelineNode` as the sole source of truth for node visuals per #406.                                                                                                                                                                                                                           |
| D2  | Celebration color source is `theme.chrome.celebrationBg` / `theme.chrome.celebrationFg` (existing tokens, already used by `CelebrationHeroHeader.tsx` for the Badge Detail hero band) — **not** `theme.journey.journeyGoalBg/Fg` and **not** a new `journey-completion-*` token.                                                                                                                                                | (a) `journey.journeyGoalBg/Fg` — rejected per #420's own text: it's an _amber warning_ semantic (`journey.json`: `"journey-goal-bg": "{color.warning}"`, resolves to `#d97706` in light-default), diverging from "celebration yellow" in most themes; also not what #420 asks this issue to pre-empt. (b) `journey.journeyCompletionBg/Fg/Accent` (exists in `journey.json`) — rejected: `journeyCompletionBg/Fg` resolve to **green** success tokens, not yellow; `journeyCompletionAccent` is a lone yellow value with **no** paired foreground and **zero** production consumers (`grep -rn journeyCompletionAccent src` → no hits) and is **not** in the contrast-audit pairs list (`contrastPairs.ts`). `chrome.celebrationBg/Fg` is both an audited pair (`contrastPairs.ts:89-95`) and already visually established for "you finished, here's the payoff" moments. | Reuses an existing, audited, already-battle-tested semantic pair instead of introducing a fourth yellow-ish token or misusing an amber/warning one.                                                                                                                                                                                       |
| D3  | Badge preview: `badgeDesign ? <BadgeRenderer design={badgeDesign} size={40} /> : <fallback tile>`, mirroring `BadgeWallCell.tsx`'s exact undesigned-fallback pattern (rounded square, `theme.colors.accentPurple` bg, `palette.white` monogram text, `theme.borderWidth.medium` border).                                                                                                                                        | `GoalEvidenceCard.tsx`'s pattern — always renders a full `BadgeRenderer` via `createDefaultBadgeDesign(title, color)`, so there is **no** visually distinct "undesigned" state, ever. Rejected because the issue explicitly asks for a first-letter placeholder "until a design exists" — a real, distinguishable third visual state, not a permanently-monogrammed badge shape.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `BadgeWallCell`/`BadgesWall.SpotlightArt` already establish exactly this "real shape vs. honest square placeholder" contract elsewhere in the app; reusing it keeps the "no design yet" moment visually consistent app-wide.                                                                                                              |
| D4  | Badge preview size is 40px (matches `GOAL_NODE_SIZE`), a judgment call — no prototype gives an exact px value for this specific inline preview.                                                                                                                                                                                                                                                                                 | Matching `BadgeWallCell.CELL_SIZE` (60px)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | 40px keeps visual rhythm with the star it sits beside inside the same compact row; 60px felt oversized next to 18px heading text at this card's padding. Flagged as an assumption, not a verified spec — see Open Questions.                                                                                                              |
| D5  | New goal-node color resolvers `goalNodeBg(theme, celebrate)` / `goalNodeFg(theme, celebrate)` live in `stepStateColorMap.ts` (co-located with `stepStateNodeBg/Fg`), not in `TimelineNode.styles.ts`.                                                                                                                                                                                                                           | Keep them as inline conditionals directly in `TimelineNode.styles.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `stepStateColorMap.ts`'s own header charter is "the single source of truth for which token backs each timeline step state" for this component family; centralizing the goal-node resolvers there (with a comment cross-referencing #420) gives #420's eventual resolution one obvious file to edit, instead of a second scattered helper. |
| D6  | The whole `FinishLine` card stays a single non-Pressable `View`; only the CTA row (badge preview + title + subtitle) is its own `Pressable` (`onBadgePress`), and each evidence item keeps its own independent `Pressable` (`onEvidencePress`) below it — no nested nor nesting nested Pressables.                                                                                                                              | Wrap the entire card in one big `Pressable`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Mirrors `GoalEvidenceCard.tsx`'s established pattern (outer `View`, several independently-pressable children) and avoids the RN/VoiceOver ambiguity of Pressable-inside-Pressable.                                                                                                                                                        |
| D7  | `onBadgePress` fires unconditionally (regardless of `allStepsComplete`) — the row is always tappable.                                                                                                                                                                                                                                                                                                                           | Disable/hide the CTA until all steps are done                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Neither prototype file shows a disabled state for this row, and gating navigation behavior is #378's/the finishing-flow screen's concern, not this Storybook-only component's. Documented as an assumption.                                                                                                                               |
| D8  | `en/timelineJourney.json`'s `finishLine.title` and `finishLine.noEvidence` keys are deleted outright (not deprecated/kept-unused).                                                                                                                                                                                                                                                                                              | Leave them in place, just stop reading them                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Dead i18n keys silently drift from their code usage; `locale-parity.test.ts` only checks en/pseudo key-set parity, not usage, so an unused key would linger undetected. Deleting them now is the honest state of the file.                                                                                                                |

### Resolved Questions (user-answered, 2026-07-04)

All four open questions from the research pass were put to Joe via `/start-issue`; every answer confirms the plan's existing assumption — no plan rework needed.

| #   | Question                                                                                 | Answer                                                            |
| --- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Q1  | `finishLine.ctaSubtitleDesigned` copy (no prototype shows the designed state's subtitle) | Use the proposed copy: "Tap to view or update your badge design." |
| Q2  | Badge preview size                                                                       | 40px (D4 confirmed) — verify visually in Storybook before merge   |
| Q3  | CTA tappable before all steps complete?                                                  | Always tappable (D7 confirmed)                                    |
| Q4  | `TimelineJourneyScreen` interim tap handling (nav is #378)                               | No-op `onBadgePress` with TODO comment, merge as-is               |

---

## Research Findings (code-answered, not left open)

**`isGoalNode` has exactly one production caller.**
`grep -rn isGoalNode apps/native-rd/src` → `TimelineNode.tsx` (definition),
`TimelineNode.stories.tsx`, `TimelineNode/__tests__/TimelineNode.test.tsx`,
and `FinishLine.tsx:21`. No other screen or component passes it. This is
what makes D1 (extending the shared component) safe — the only real
"caller" whose behavior visibly changes is `FinishLine` itself.

**The "unconditional `palette.yellow300`" bug, confirmed exactly as the
issue describes.** `TimelineNode.styles.ts:25-31` (current):
`goalNode: { ..., backgroundColor: palette.yellow300, borderColor:
theme.colors.text }` — applied unconditionally whenever `isGoalNode` is
true, regardless of `status`. `palette.yellow300` (`adapter.ts:77`) is
`pkgPalette.accentYellow` = `'#ffe50c'`, a raw, theme-invariant constant.

**`theme.chrome.celebrationBg` is visually identical to `palette.yellow300`
in light-default, but properly varies for ND themes** (confirmed in
`packages/design-tokens/build/unistyles/semanticColors.ts`):
light-default/dark `#ffe50c` (matches `palette.yellow300` exactly),
high-contrast `#ffe50c`, low-vision `#ffe50c`, dyslexia `#f0c43a`,
**autism-friendly `#d5c88a`** (muted, per that theme's "no loud color"
intent), low-info `#fdf6cc` (near-white). Switching the celebrating star to
this token is a **no-visual-change swap in the default theme** and a
**strict improvement** everywhere else — it's the first time this node ever
adapts per theme.

**`journey.journeyGoalBg/Fg` — confirmed to diverge from "celebration
yellow" exactly as #420 warns.** `journey.json`: `"journey-goal-bg":
{"$value": "{color.warning}"}`. Resolved value in
`semanticColors.ts:442-444`: `journeyGoalBg: '#d97706'` (amber/orange, not
yellow) in light-default; `'#fbbf24'` in dark. Confirms D2's rejection.

**`journey.journeyCompletionAccent` — confirmed dead and unaudited.**
`grep -rn journeyCompletionAccent apps/native-rd/src` → zero hits outside
the generated token file itself. `contrastPairs.ts` (grepped in full) has
audited pairs named `celebration` (`chrome.celebrationBg/Fg`,
`contrastPairs.ts:89-95`) and `journeyGoal` (`journey.journeyGoalBg/Fg`,
`contrastPairs.ts:194-198`) — no `journeyCompletion*` pair exists. Confirms
D2's rejection of that token as a viable, safety-net-covered choice.

**Goal-level evidence is a real, distinct DB concept, not step evidence.**
`schema.ts:129-136`: the `evidence` table attaches to _exactly one_ of
`goalId` or `stepId`. `TimelineJourneyScreen.tsx:69,114-120` already queries
`evidenceByGoalQuery(goalId)` separately from per-step evidence
(`useStepEvidence`, same file) and feeds it to `FinishLine.goalEvidence`.
This can legitimately be `[]` for a fully-evidenced, fully-completed goal
(all evidence living at the step level) — confirming the empty state is a
real, common case, not a corner case, and that "render nothing, not an
absence message" is the correct fix (not "this array is never empty in
practice").

**`FinishLine`'s one production call site, and exactly what it has on hand
already.** `TimelineJourneyScreen.tsx:228-231`:
`<FinishLine goalEvidence={goalEvidence} onEvidencePress={handleEvidencePress} />`.
The same file already computes, in scope, everything the new props need
with **zero new queries**: `goal.title` (line 185), `goal.design` (schema
column `design: nullOr(NonEmptyString)`, included via `goalsQuery`'s
`.selectAll()`, `queries.ts:40-46`, parseable via the existing
`parseBadgeDesign(raw: string | null | undefined): BadgeDesign | null`
helper, `badges/types.ts:289-291`), and `stepRows` (already queried, line 68) feeding the **already-exported** `areAllStepsComplete(rows): boolean`
helper (`db/queries.ts:360-363`, `rows.length > 0 &&
rows.every(status === completed)`) — no need to hand-roll this tally.

**Storybook/title/test conventions — confirmed via `TimelineNode` and
`TimelineBreakdownBar`.** `FinishLine.stories.tsx`'s current `title:
"FinishLine"` (bare, ungrouped) is stale relative to sibling Iteration B
Timeline components (`"Iteration B/Timeline/TimelineNode"`,
`"Iteration B/Timeline/TimelineStep"`, `"Iteration B/Timeline/TimelineBreakdownBar"`)
— this PR renames it to `"Iteration B/Timeline/FinishLine"` to match. The
`AllThemesMatrix` pattern (static `themes[name]`/`themeNames` read from
`compose.ts`, `MOOD_NAMES` table, no live-render-per-theme) is fully
specified at `TimelineNode.stories.tsx:162-254` and
`TimelineBreakdownBar.stories.tsx:115-166`; this plan reuses it for the
star's two states rather than `BadgeWallCell.stories.tsx`'s
`ScopedTheme`-live-remount alternative, since only two flat color swatches
need to render, not a full interactive component per theme.

**i18n mechanics — confirmed.** `en/timelineJourney.json` is a typed-`t()`
source (`i18n/i18next.d.ts`); no separate `.d.ts` edit needed. `de/` is
bot-synced by `.github/workflows/i18n-sync.yml` on any PR touching
`src/i18n/resources/en/**` — **do not hand-edit
`de/timelineJourney.json`**. `pseudo/` is **not** bot-synced and **is**
enforced locally/in CI by `locale-parity.test.ts` — `bun run gen:pseudo`
must run locally and only the new `finishLine.*` diff lines get staged (per
#406/#451's documented precedent of reverting unrelated pre-existing pseudo
drift the regenerator surfaces).

**Dead code confirmed for removal.** `FinishLine.styles.ts`'s
`evidenceCard`/`evidenceIcon`/`evidenceLabel` keys are not referenced
anywhere in `FinishLine.tsx` today (`grep -n "evidenceCard\|evidenceIcon\|evidenceLabel" FinishLine.tsx` → no hits; evidence rendering actually goes
through `TimelineEvidenceCard`'s own styles). Safe, in-scope cleanup.
Removing them (and the `borderLeftColor: palette.yellow300` accent) leaves
`palette` unused in that file — the import must be dropped too, in both
`FinishLine.styles.ts` and `TimelineNode.styles.ts` (same reason there:
`palette.yellow300` was its only remaining use).

---

## Affected Areas

- `apps/native-rd/src/components/TimelineNode/stepStateColorMap.ts` — add
  `goalNodeBg(theme, celebrate)` / `goalNodeFg(theme, celebrate)` resolvers
  (D5). ~+18 lines.
- `apps/native-rd/src/components/TimelineNode/TimelineNode.tsx` — add
  `celebrate?: boolean` prop, thread into node/text style arrays. ~+12 lines.
- `apps/native-rd/src/components/TimelineNode/TimelineNode.styles.ts` —
  remove `palette` import + hardcoded `goalNode` yellow; add
  `goalNodeCelebrate` style keyed off the new resolvers. ~+15/-4 lines.
- `apps/native-rd/src/components/TimelineNode/TimelineNode.stories.tsx` —
  add a `GoalNodeCelebrate` story alongside the existing `GoalNode` story.
  ~+15 lines.
- `apps/native-rd/src/components/TimelineNode/__tests__/TimelineNode.test.tsx`
  — add `celebrate` prop coverage. ~+15 lines.
- `apps/native-rd/src/components/FinishLine/FinishLine.tsx` — new props
  (`goalTitle`, `badgeDesign`, `allStepsComplete`, `onBadgePress`), CTA row +
  badge preview, evidence-list-only-when-present. ~+70/-15 lines.
- `apps/native-rd/src/components/FinishLine/FinishLine.styles.ts` — drop
  dead evidence styles + yellow left-border; add CTA/badge-preview styles.
  ~+50/-15 lines.
- `apps/native-rd/src/components/FinishLine/FinishLine.stories.tsx` —
  rename title, new stories (`UndesignedBadge`, `DesignedBadge`,
  `AllStepsDoneCelebration`, `WithEvidence`, `AllThemesMatrix`). ~+120/-53 lines (near-total rewrite).
- `apps/native-rd/src/components/FinishLine/__tests__/FinishLine.test.tsx`
  — update/add assertions for the new contract. ~+70/-20 lines.
- `apps/native-rd/src/screens/TimelineJourneyScreen/TimelineJourneyScreen.tsx`
  — minimal shim: pass `goalTitle`, `badgeDesign` (via `parseBadgeDesign`),
  `allStepsComplete` (via `areAllStepsComplete`), and a placeholder
  `onBadgePress` explicitly commented as pending #378's real navigation.
  ~+12 lines.
- `apps/native-rd/src/i18n/resources/en/timelineJourney.json` — remove
  `finishLine.title`/`finishLine.noEvidence`; add `finishLine.ctaTitle`,
  `finishLine.ctaSubtitleUndesigned`, `finishLine.ctaSubtitleDesigned`,
  `finishLine.ctaA11yLabel`. ~+4/-2 lines.
- `apps/native-rd/src/i18n/resources/pseudo/timelineJourney.json` —
  regenerated via `bun run gen:pseudo`, new keys only. ~+4/-2 lines.
- `apps/native-rd/src/i18n/resources/_register/timelineJourney.yml` — update
  the stale "Finish-line copy" note (currently references the deleted "Ziel-
  Belege" heading) to describe the new CTA framing's tone. ~+3/-2 lines.

Explicitly **not** touched: `de/timelineJourney.json` (bot-synced),
`packages/design-tokens/**` (no new tokens needed — D2/D5), `CompletionFlowScreen.tsx`
(the actual finishing-flow destination screen already exists; wiring
navigation to it is #378's job), `stepStateColorMap.ts`'s existing
`StepStateMapKey`/`stepStateColorMap` Record (only new standalone functions
are added, the map itself is untouched).

---

## Implementation Plan

### Step 1: `TimelineNode` — add the goal-node celebrate variant

**Files**: `stepStateColorMap.ts`, `TimelineNode.tsx`, `TimelineNode.styles.ts`, `TimelineNode.stories.tsx`, `__tests__/TimelineNode.test.tsx`
**Commit**: `feat(TimelineNode): add celebrate variant for the goal-node star (#452)`
**Changes**:

- [ ] `stepStateColorMap.ts`: add `goalNodeBg(theme: ComposedTheme, celebrate: boolean): string` returning `celebrate ? theme.chrome.celebrationBg : theme.colors.background`, and `goalNodeFg(...)` returning `celebrate ? theme.chrome.celebrationFg : theme.colors.text`. Comment cross-referencing #420 as the place a future non-celebrating-state token decision would land (D5).
- [ ] `TimelineNode.tsx`: add `celebrate?: boolean` (default `false`) to `TimelineNodeProps`, documented as "only meaningful when `isGoalNode`". Node style array: replace unconditional `isGoalNode && styles.goalNode` with `isGoalNode && !celebrate && styles.goalNode` / `isGoalNode && celebrate && styles.goalNodeCelebrate`; same pattern for `goalText`/`goalTextCelebrate`. Glyph logic (`content`) is unchanged — always `"★"` for goal nodes regardless of `celebrate`.
- [ ] `TimelineNode.styles.ts`: drop the `palette` import and `goalNode`'s `backgroundColor: palette.yellow300` line; `goalNode` keeps only size/shape (`width/height/borderRadius`) plus `backgroundColor: theme.colors.background, borderColor: theme.colors.border` (neutral, matches D1). Add `goalNodeCelebrate: { backgroundColor: goalNodeBg(theme, true), borderColor: goalNodeBg(theme, true) }` (solid look, matching `completedNode`/`inProgressNode`'s border==bg convention) and `goalTextCelebrate: { color: goalNodeFg(theme, true) }`.
- [ ] `TimelineNode.stories.tsx`: add a `GoalNodeCelebrate` story next to the existing `GoalNode` story, rendering `<TimelineNode status="completed" isGoalNode celebrate accessibilityLabel="Goal finish line, celebrating" />` labeled "Goal Node (star, celebration yellow)".
- [ ] `__tests__/TimelineNode.test.tsx`: add a test asserting the celebrate prop doesn't change the glyph (`"★"` renders either way) — style-level assertions are out of scope for RTL text-query tests; a light `toHaveStyle`/snapshot-free check is acceptable if trivial, otherwise the story is the visual proof.
- [ ] Run `bun run type-check` and `bun run lint` clean.

### Step 2: `FinishLine` component + styles + i18n

**Files**: `FinishLine.tsx`, `FinishLine.styles.ts`, `en/timelineJourney.json`, `pseudo/timelineJourney.json`, `_register/timelineJourney.yml`
**Commit**: `feat(FinishLine): redesign as keepsake card — badge preview, CTA, celebration star (#452)`
**Changes**:

- [ ] `en/timelineJourney.json`: delete `finishLine.title` and `finishLine.noEvidence`; add `finishLine.ctaTitle` ("Finish & design badge"), `finishLine.ctaSubtitleUndesigned` ("The keepsake comes at the end — badge starts as \"{{letter}}\" until you design it.", matching `Timeline A Prototype.dc.html:88`'s exact phrasing), `finishLine.ctaSubtitleDesigned` (new copy — see Open Questions), `finishLine.ctaA11yLabel` ("Finish and design your badge"). Keep `finishLine.a11yNode` unchanged.
- [ ] Run `bun run gen:pseudo`; stage only the `finishLine.*` diff in `pseudo/timelineJourney.json`, revert unrelated drift (per #406/#451 precedent).
- [ ] Update `_register/timelineJourney.yml`'s "Finish-line copy is matter-of-fact..." note to describe the new CTA copy instead of the deleted "Ziel-Belege" heading example.
- [ ] `FinishLine.tsx`: new props `goalTitle: string`, `badgeDesign: BadgeDesign | null`, `allStepsComplete: boolean`, `onBadgePress: () => void` (alongside existing `goalEvidence`/`onEvidencePress`). Render: star (`<TimelineNode status="completed" isGoalNode celebrate={allStepsComplete} accessibilityLabel={t("timelineJourney:finishLine.a11yNode")} />`, `status` prop is a harmless pre-existing placeholder, unused when `isGoalNode` — see Step 1), a `Pressable` CTA row (badge preview + `ctaTitle` + `ctaSubtitleUndesigned`/`ctaSubtitleDesigned` depending on `badgeDesign`, with the letter interpolated from `goalTitle.trim().charAt(0).toUpperCase()`), `accessibilityRole="button"` + `accessibilityLabel={t("...ctaA11yLabel")}`, `onPress={onBadgePress}`. Evidence: `goalEvidence.length > 0 ? goalEvidence.map(...) : null` — no fallback text (D8/Intent Verification).
- [ ] Badge preview: `badgeDesign ? <BadgeRenderer design={badgeDesign} size={40} testID="finish-line-badge-preview" /> : <View style={styles.badgeFallback}><Text style={styles.badgeFallbackText}>{firstLetter}</Text></View>` (D3/D4).
- [ ] `FinishLine.styles.ts`: remove `palette` import, `evidenceCard`/`evidenceIcon`/`evidenceLabel` (dead), `borderLeftWidth`/`borderLeftColor` off `contentCard` (the old-language yellow accent stripe). Add `ctaRow`, `ctaTextColumn`, `ctaTitle`, `ctaSubtitle`, `badgeFallback` (mirrors `BadgeWallCell.styles.ts`'s `fallback`: `theme.colors.accentPurple` bg, `theme.borderWidth.medium` border, `theme.radius.sm`), `badgeFallbackText` (`palette` re-import scoped to this one new usage is fine — but prefer `theme.colors.background` contrast helper if simpler; default to `palette.white` matching `BadgeWallCell` exactly for parity).
- [ ] Run `bun run type-check` and `bun run lint` clean (typed `t()` keys require the `en/timelineJourney.json` edits to land in this same commit).

### Step 3: Storybook stories

**Files**: `FinishLine.stories.tsx`
**Commit**: `test(FinishLine): update Storybook stories for keepsake redesign (#452)`
**Changes**:

- [ ] `title: "Iteration B/Timeline/FinishLine"` (was bare `"FinishLine"`).
- [ ] `UndesignedBadge`: `badgeDesign={null}`, `allStepsComplete={false}`, with a couple of evidence items — shows the letter-fallback tile + white star + a populated evidence list.
- [ ] `DesignedBadge`: a `makeDesign()`-style `BadgeDesign` fixture (mirroring `BadgeWallCell.stories.tsx`'s helper), `allStepsComplete={false}`, `goalEvidence={[]}` — shows the real `BadgeRenderer` + white star + **no** evidence text at all (visual proof of D8/"render what's present").
- [ ] `AllStepsDoneCelebration`: `badgeDesign={null}`, `allStepsComplete={true}` — the realistic "just finished, haven't designed yet" moment; shows the celebration-yellow star.
- [ ] `AllThemesMatrix`: static `themes[name]`/`themeNames` read (mirrors `TimelineNode.stories.tsx:162-254`), one row per theme rendering two small circles side by side via the new `goalNodeBg/Fg(theme, celebrate)` resolvers — pre-done vs. post-done, proving neither state goes invisible/illegible in any of the 7 product themes (esp. `light-autismFriendly`'s muted celebration yellow and `light-lowInfo`'s near-white one).

### Step 4: Unit tests

**Files**: `__tests__/FinishLine.test.tsx`
**Commit**: `test(FinishLine): update unit tests for keepsake redesign (#452)`
**Changes**:

- [ ] Replace the `"Goal Evidence"`/`"No goal evidence yet"` assertions with: renders `"Finish & design badge"`; renders the first-letter fallback (`screen.getByText("R")` for `goalTitle="Read 12 books"`, `badgeDesign={null}`); renders `BadgeRenderer` (via `screen.getByTestId("finish-line-badge-preview")`) when `badgeDesign` is set.
- [ ] Regression test: with `goalEvidence={[]}`, `expect(JSON.stringify(screen.toJSON())).not.toMatch(/\b(missing|needed)\b/i)` and explicitly `expect(screen.queryByText(/no .* evidence/i)).toBeNull()` (mirrors `FocusCurrentTaskCard.test.tsx:182-194`'s established contract-test pattern).
- [ ] `fireEvent.press` on the CTA row calls `onBadgePress` exactly once; pressing an evidence card still calls `onEvidencePress` and does **not** also call `onBadgePress` (no nested-Pressable bleed — D6).
- [ ] Keep the existing "shows evidence items" / accessible-evidence-label tests (still valid, unrelated to this redesign).
- [ ] Run `bun run test --testPathPatterns FinishLine` and `bun run test --testPathPatterns TimelineNode` green.

### Step 5: `TimelineJourneyScreen` — satisfy the updated prop contract

**Files**: `TimelineJourneyScreen.tsx`
**Commit**: `chore(TimelineJourneyScreen): satisfy FinishLine's updated prop contract (#452)`
**Changes**:

- [ ] Import `parseBadgeDesign` and `areAllStepsComplete`.
- [ ] Update the `<FinishLine />` call: `goalTitle={goal.title}`, `badgeDesign={parseBadgeDesign(goal.design)}`, `allStepsComplete={areAllStepsComplete(stepRows)}`, `onBadgePress={() => {}}` with an inline `// TODO(#378): wire real finishing-flow navigation` comment — this screen is mid-transition to #378's reconciled rendering and does not yet own a real destination route; a labeled no-op keeps this PR honest rather than inventing a fake navigation target.
- [ ] Run `bun run test --testPathPatterns TimelineJourneyScreen` and `bun run type-check` green.

---

## Testing Strategy

- [ ] Unit tests for `FinishLine` and `TimelineNode` (Jest 30,
      `@testing-library/react-native` v13), files mirror `src/` under
      `src/components/*/​__tests__/`.
- [ ] `test.each` not needed here (few, non-repetitive states) — matches
      existing file style, not force-fit.
- [ ] `bun run test --testPathPatterns i18n` must stay green after the
      `en`/`pseudo` edits (locale-parity gate).
- [ ] `bun run test --testPathPatterns TimelineJourneyScreen` must stay
      green after the Step 5 shim.
- [ ] Manual: open `Iteration B/Timeline/FinishLine` in Storybook; visually
      diff `UndesignedBadge`/`DesignedBadge`/`AllStepsDoneCelebration`
      against `Timeline A Prototype.dc.html:86-89` and
      `App Shell.dc.html:258-261`; check `AllThemesMatrix` for any theme
      where the celebration star reads as illegible or the neutral star
      disappears into its own card background.

**What this PR will _not_ visibly change**: the live `TimelineJourneyScreen`
UI, because that screen still renders the pre-#406/#407 `TimelineStep` tree
(it hasn't been refit to the reconciled components yet — that's #378's job)
and its `onBadgePress` is a Step 5 no-op placeholder. The only way to see
the redesigned `FinishLine` before #378 lands is via Storybook.

---

## Not in Scope

| Item                                                                                   | Reason                                                                                                                                                                      | Follow-up                                     |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Real finishing-flow navigation from `TimelineJourneyScreen`                            | Explicitly deferred in the issue ("nav is #378's wiring"); this PR only exposes `onBadgePress`                                                                              | #378                                          |
| Resolving #420's broader "what should the non-celebrating goal-node token be" question | #420 is open and non-blocking; this PR keeps the existing neutral `theme.colors.background` fallback, which #420 can swap later without touching this PR's `celebrate` axis | #420                                          |
| Adding `#452` to `#378`'s blocked-by list                                              | Board/issue-graph housekeeping, not a code change                                                                                                                           | Do during `/finalize` or manually after merge |
| A first-class `journey-step-paused-*` or new celebration design token                  | Not needed — D2 confirms `chrome.celebrationBg/Fg` already exists and is audited                                                                                            | none                                          |
| Hand-editing `de/timelineJourney.json`                                                 | `.github/workflows/i18n-sync.yml` auto-syncs `de/` from `en/` on PR open/update                                                                                             | Bot handles it post-push                      |
| Refitting `TimelineJourneyScreen` to the #406/#407 reconciled components               | That refit is #378's entire scope; this PR's Step 5 is a minimal type-safety shim only                                                                                      | #378                                          |

_No product-behavior items are being silently dropped — the two "reasons"
above that reference other issues are pre-existing sequencing, not scope cut
from #452._

---

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->
