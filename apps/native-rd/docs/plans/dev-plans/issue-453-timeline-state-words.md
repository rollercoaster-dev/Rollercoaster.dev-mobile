# Development Plan: Issue #453

## Issue Summary

**Title**: fix(timeline): adopt prototype state words — Done / Set aside / Working / Up next
**Type**: fix (i18n copy + label routing; no new UI, no data changes)
**Complexity**: LOW–MEDIUM (the code change is small; the scope question in Q1 is the real work)
**Estimated Lines**: ~90–140 lines including tests/stories — above the issue's own "~50–80 LOC" estimate, because `badgeI18nKey` turns out to have **four** consumers rather than the one the issue assumed (see Discovery Log).

## Status

Branch `feat/issue-453-timeline-state-words` cut from `main` @ `3214556f`, pushed. Plan written and **all questions resolved (2026-07-25)** — see Resolved Questions. **No implementation yet.**

**Resuming from a fresh context?** Start at Step 0 of the Commit Plan. Everything needed is in this file; nothing is waiting on the user. Read `apps/native-rd/CLAUDE.md` first for the hard rules (`bun run test` never `bun test`, `--testPathPatterns` plural, DCO sign-off on every commit, no hardcoded hex, no interactive CLI commands).

## Why now

#453's own body says "Land before or with #378 so the assembled Timeline ships the right words." That did not happen — #378 merged as PR #517 (`3214556f`, 2026-07-25). The assembled Timeline screen therefore ships **two vocabularies on one screen** today:

| Surface                                    | Renders                                       | Words shown                                      |
| ------------------------------------------ | --------------------------------------------- | ------------------------------------------------ |
| `TimelineBreakdownBar` legend chips (#451) | `common:timelineBreakdown.legend.*`           | "3 done · 1 in motion · 4 to come · 1 set aside" |
| `TimelineStep` state pill (`StateWord`)    | `common:stepCard.status.*` via `badgeI18nKey` | "Completed / In Progress / Pending / Paused"     |
| `TimelineNode` `StateBadge`                | `common:stepCard.status.*` via `badgeI18nKey` | "Completed / In Progress / Pending / Paused"     |

Neither pill vocabulary matches the prototype words this issue mandates. Closing #453 makes the screen speak one language.

## Objective

Route the Timeline's **step state words** to new `timelineJourney`-namespaced keys reading **Done / Set aside / Working / Up next**, without disturbing the `common:stepCard.status.*` words that `StepCard`, `FocusCurrentTaskCard`, and `FocusParkedState` still depend on. Colors keep travelling through #406's `stepStateColorMap` unchanged.

## Discovery Log

Verified against `main` @ `3214556f`:

1. **`badgeI18nKey` has four consumers, not one.** The issue scopes itself to "`TimelineStep`'s `StateWord` pill", but `grep -rn badgeI18nKey src` returns:
   - `src/components/TimelineNode/TimelineNode.tsx:136` — `StateBadge`, a **visible** text badge (not a11y-only)
   - `src/components/TimelineStep/TimelineStep.tsx:73` — parent-row pill
   - `src/components/TimelineStep/TimelineStep.tsx:177` — child-row pill
   - `src/components/FocusCurrentTaskCard/FocusCurrentTaskCard.parts.tsx:33` — Focus surface, **must not change** (see Q1)
2. **The map is typed to the `common` namespace.** `stepStateColorMap.ts:31` declares `export type StepStateBadgeKey = \`common:stepCard.status.${StepStateMapKey}\``, and each of the four entries (lines 63/69/75/88) sets `badgeI18nKey` to that shape. Any new key set needs its own template-literal type or the compile-time guarantee is lost.
3. **`StepStateMapKey` is exactly four states** — `completed`, `in-progress`, `pending`, `paused` — so the new key group is a 1:1 replacement with no gaps.
4. **The prototypes disagree on the `pending` word** (Q2). `Timeline A Prototype.dc.html` and `Timeline Directions.dc.html` say **"To do"**; the issue title and body say **"Up next"**, which appears in `Add Evidence Nav.dc.html`. The issue cites `App Shell.dc.html` ~line 250 as the source of all four words, but grepping App Shell finds "Done", "Set aside", "Working" — and no "Up next".
5. **The legend's separate vocabulary is deliberate, not drift.** `Timeline Directions.dc.html` contains "in motion" and "to come" _alongside_ "Working" and "To do" — the prototype intends counts ("4 to come") to read differently from pills ("Up next"). This reverses the concern I raised when recommending the issue: **do not** fold the `timelineBreakdown.legend.*` words into this change.
6. **`FocusParkedState` deliberately renders `common:stepCard.status.paused`** — recorded as decision D4 in `issue-450-focus-progress-strip-parked.md`, with the user resolving it to Title-Case "Paused" for app-wide consistency. Repointing `badgeI18nKey` globally would silently overturn that decision.

## Decisions

| ID  | Decision                                                                                                                                                                                                   | Alternatives Considered                                                                                                                     | Rationale                                                                                                                                                                                                                                                                                               |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Add a **second** typed key field to `stepStateColorMap` — `stateWordI18nKey: \`timelineJourney:step.stateWord.${StepStateMapKey}\``— and leave`badgeI18nKey` untouched.                                    | (a) Repoint `badgeI18nKey` at the new keys; (b) a `TimelineStep`-local resolver function mirroring `TimelineBreakdownBar`'s `legendI18nKey` | (a) leaks the Timeline words into `StepCard` + both Focus surfaces and overturns #450 D4. (b) works for `TimelineStep` but `TimelineNode` needs the same words (Q1), and a resolver duplicated across two files is exactly the drift `stepStateColorMap` exists to prevent. One map, two labelled uses. |
| D2  | New keys live under `timelineJourney:step.stateWord.*`, siblings of the existing `step.status.*` group.                                                                                                    | Reuse/rename the existing `timelineJourney:step.status.*` group (already "Done / Active / Pending")                                         | `step.status.*` is consumed by the screen's own a11y strings; repurposing it mid-flight would couple two unrelated edits. A new group makes the diff reviewable and the old group's fate a separate cleanup (see Follow-ups).                                                                           |
| D3  | English + `_register/timelineJourney.yml` only. Regenerate `pseudo/` in this PR via `bun run gen:pseudo` (the `locale-parity` test gates on en↔pseudo). Never hand-edit `de/` — the i18n-sync bot owns it. | Hand-translate `de/`                                                                                                                        | Repo hard rule, restated in the issue. A `de/` commit appearing on the PR from the bot is expected.                                                                                                                                                                                                     |
| D4  | `StepCard`'s own keys stay untouched.                                                                                                                                                                      | Migrate StepCard too                                                                                                                        | Issue is explicit: StepCard is old language being replaced by #377/#466, "not worth churning."                                                                                                                                                                                                          |
| D5  | Register note goes in `_register/timelineJourney.yml`, and it must state that the pill words are intentionally **not** the legend words.                                                                   | Leave the register silent                                                                                                                   | Two similar-but-different vocabularies in one namespace is precisely what a translator will "helpfully" unify. The `common.yml` legend note added in #517 already guards the other side.                                                                                                                |

## Resolved Questions (user, 2026-07-25)

**Q1 — Does `TimelineNode`'s `StateBadge` adopt the new words too? → YES.**
`TimelineNode.tsx:136` renders a visible badge from `badgeI18nKey`, sitting on the Timeline screen next to `TimelineStep`'s pill, so leaving it behind would trade the current inconsistency for a subtler one ("Done" pill above a "Completed" badge). Switch it.

The Step 0 audit still runs, but it no longer decides _whether_ — only what to do if it finds a leak. `grep -rl TimelineNode src` hits `FocusProgressStrip`, `FocusCurrentTaskCard.parts.tsx`, `FinishLine`, and `TimelineBreakdownBar`; the expectation is that all of those import `stepStateColorMap`/`stepStateNodeBg` from the `TimelineNode/` **directory** rather than rendering the component. Decision rule, so this cannot reopen mid-implementation:

- **No non-Timeline renderer of `<TimelineNode>`** (expected case) → switch `StateBadge` to `stateWordI18nKey` outright.
- **A Focus surface does render `<TimelineNode>`** → do **not** switch `StateBadge`. Leave it on `badgeI18nKey`, ship the `TimelineStep` half only, and file a follow-up issue for a per-call-site label choice (a `stateWordSource`-style prop, or lifting the badge out of the shared node). Note it in the PR body. Do not invent the prop in this PR — it is scope creep on a copy fix.

**Q2 — "Up next" or "To do" for `pending`? → "Up next".**
The issue title is the recorded 2026-07-02 readiness-review decision, and "To do" collides with generic task-app phrasing. The two Timeline prototypes say "To do", so flag the divergence in the PR body — reverting is one JSON value if a reviewer disagrees.

**Q3 — Casing → Title-Case**, exactly as the issue title writes them: "Done / Set aside / Working / Up next". Resolved by precedent rather than fresh decision: #450 D4 settled the analogous lowercase-mockup question in favour of app-wide Title-Case.

**Final word list** (`timelineJourney:step.stateWord.*`):

| `StepStateMapKey` | Word      |
| ----------------- | --------- |
| `completed`       | Done      |
| `paused`          | Set aside |
| `in-progress`     | Working   |
| `pending`         | Up next   |

## Affected Areas

- `src/components/TimelineNode/stepStateColorMap.ts` — new `StepStateWordKey` template-literal type + `stateWordI18nKey` on all four entries.
- `src/components/TimelineStep/TimelineStep.tsx` — lines 73 and 177 switch to `stateWordI18nKey`. The `useTranslation` call already loads `["common", "timelineJourney"]`, so no namespace change needed.
- `src/components/TimelineNode/TimelineNode.tsx` — `StateBadge` switches (Q1 = yes); its `useTranslation(["common"])` at line 131 gains `"timelineJourney"`.
- `src/i18n/resources/en/timelineJourney.json` — new `step.stateWord` group.
- `src/i18n/resources/_register/timelineJourney.yml` — voice note per D5.
- `src/i18n/resources/pseudo/timelineJourney.json` — regenerated.
- Tests/stories asserting the old strings: `src/components/TimelineStep/__tests__/TimelineStep.test.tsx`, `src/screens/TimelineJourneyScreen/__tests__/TimelineJourneyScreen.test.tsx`, plus `TimelineNode`'s own tests/stories if Q1 lands. `TimelineJourneyScreen.tsx` also matched the grep for old label strings — check whether that's a literal or a comment before editing.

## Commit Plan

| #   | Commit                                                                     | Contents                                                                                                                     |
| --- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 0   | _(no commit)_                                                              | Audit every `TimelineNode` importer — renders `<TimelineNode>` or only imports the map? Apply the Q1 decision rule.          |
| 1   | `feat(i18n): add timelineJourney step state words (#453)`                  | `en/timelineJourney.json` group (word list above) + `_register` note (D5) + regenerated `pseudo/`. No consumers yet — inert. |
| 2   | `feat(timeline): route step state pills to prototype state words (#453)`   | `stateWordI18nKey` on `stepStateColorMap`; `TimelineStep:73/177` switched; `TimelineNode.StateBadge` switched per Q1.        |
| 3   | `test(timeline): assert prototype state words on timeline surfaces (#453)` | Update the assertions above; add one case per state so a future silent repoint fails loudly.                                 |

Keep them separate: commit 1 is reviewable as pure copy, commit 2 as pure routing.

## Testing Strategy

- `bun run test --testPathPatterns "TimelineStep|TimelineNode|TimelineJourneyScreen"` — never `bun test`, and the flag is `--testPathPatterns` (plural).
- Assert the **rendered word**, not the key, for all four states on both surfaces — a test that only checks `t()` was called would pass through a wrong-namespace regression.
- Confirm `StepCard` / `FocusCurrentTaskCard` / `FocusParkedState` tests still pass **unchanged**. If any of them start failing, D1 has been violated — something repointed `badgeI18nKey`.
- `locale-parity` must stay green (that's what forces the `pseudo/` regeneration in commit 1).
- Full gates before each commit: `bun run type-check` && `bun run lint`.
- Visual: the Timeline screen across the 7 ND variants — the pills are `stepStateColorMap`-coloured and the new words are longer than the old ones in places ("Set aside" vs "Paused"), so watch for wrapping/clipping at `largeText` and `lowVision`.

## Non-Goals

- **Not** touching `common:timelineBreakdown.legend.*` — Discovery Log #5 shows the different legend words are intentional.
- **Not** migrating `StepCard` (D4), and **not** touching Focus Mode's own copy — #466 owns that surface and is being worked in parallel in another worktree.
- **Not** renaming the existing `timelineJourney:step.status.*` group (D2).

## Follow-ups (file as issues, not chat)

1. Once #466/#467 retire the old Focus chrome, `common:stepCard.status.*` may have no Timeline-adjacent consumers left — revisit whether `badgeI18nKey` and `stateWordI18nKey` should collapse back into one field.
2. Decide the fate of the now-overlapping `timelineJourney:step.status.*` group (D2) — likely dead once the a11y strings are audited.
3. `TimelineJourneyScreen.tsx` matched a grep for old state-label strings; if that's a hardcoded literal rather than a comment, it's a separate a11y-literal bug (candidate for the #455 cleanup sweep).

## Coordination

Another agent is working **#466** (Focus Mode rebuild 1/2) in a separate worktree. Files that issue was told not to touch are exactly this issue's surface area (`TimelineStep/**`, `stepStateColorMap.ts`, `en/common.json`, `en/timelineJourney.json`, `_register/common.yml`, `_register/timelineJourney.yml`). If #466 needs a state word, it adds one to `focusMode.json` — so a conflict here means one of us broke the boundary.
