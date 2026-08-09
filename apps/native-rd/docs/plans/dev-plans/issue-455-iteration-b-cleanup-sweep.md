# Development Plan: Issue #455

## Issue Summary

**Title**: chore: Iteration B cleanup sweep — stale copy, doc contradictions, a11y literals
**Type**: chore
**Complexity**: MEDIUM (net added/changed lines) — see note below on deletion volume
**Estimated Lines**: ~150 lines added/changed + ~3020 lines deleted (dead components, stories, tests)

Of the 10 items in the issue, **3 are already resolved** on `main` (items 2, 3, 4 partially, 7) by merged PRs since the 2026-07-02 readiness review that spawned this issue, **1 is dropped** (item 6 — conflicts with the recorded #408 decision, which holds), and **6 need real changes** (items 1, 5, 8, 9, and the item-10 deletion pass, plus finishing item 4's `ThemeSwatchRail` verification).

## Intent Verification

- [x] `FocusPillTabBar.stories.tsx`'s `AllStates`/`SettingsActive` stories no longer say "FAB visible"/"FAB hidden" anywhere.
- [x] `BadgesWall.tsx`'s doc comment on the `gallery` prop states the spotlight-excluded, one-cell-each contract that `BadgesScreen.tsx:55` (`rows.slice(1)`) actually implements.
- [x] The Focus current-task card's Completed pill visibly reads "✓ Completed"; its `accessibilityLabel` still resolves to exactly `"Completed"` (existing `getByLabelText("Completed")` assertion keeps passing unmodified).
- [x] An expanded `TimelineStep` (or sub-step `ChildRow`) with zero evidence renders no "No evidence yet" text node and no empty evidence-section box.
- [x] `BadgesWall.tsx` carries a comment, near the header, recording that the App Shell prototype's `☰` sort control was deliberately not built (#405 hardcodes `createdAt DESC`).
- [x] `CardCarousel/`, `MiniTimeline/`, `ProgressDots/`, `FABMenu/`, `EvidenceDrawer/`, `EvidenceItem/` (components, stories, tests) no longer exist in `src/components/`; `bun run type-check` and `bun run test` pass with them gone.
- [x] `EvidenceItemData` is importable from a location that survives `EvidenceDrawer`'s deletion, and `TimelineJourneyScreen.tsx`, `FinishLine.tsx`, `TimelineEvidenceCard.tsx`, `TimelineStep.tsx` all resolve it from the new location.
- [x] `components/GoalEvidenceCard/` is untouched (issue #523 is still open — no "retire" decision to act on).

_Item 6 (helper-line reassurance clause) is dropped — see Step 6. Item 7 (EvidenceTypePicker mode-aware header) is already resolved on `main` by the Focus Mode rebuild. Both excluded from this checklist._

## Dependencies

| Issue     | Title                                                               | Status                                                                | Type                                    |
| --------- | ------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------- |
| #384      | Epic: Full Ride redesign                                            | 🟢 Open (parent epic, not a blocker)                                  | Parent                                  |
| #379      | Bottom Nav: demote + new goal, resolve secondary tensions           | ✅ Closed (merged)                                                    | Precedes item 1                         |
| #405      | [Integrate] BadgesScreen thin container                             | ✅ Closed (merged) — `rows.slice(1)` shipped in `BadgesScreen.tsx:55` | Precedes item 2 (already done)          |
| #469      | (badge detail assembly 2/2 — merged as `a14a1d7`)                   | ✅ Merged — shipped the exact delete-confirm reframe item 3 asks for  | Resolves item 3                         |
| #466/#467 | Focus Mode rebuild 1/2, 2/2                                         | ✅ Merged (`33c8b97`, `bab31c2`)                                      | Resolves item 7; orphans item 10's dirs |
| #523      | Goal-level evidence has no entry point after the Focus Mode rebuild | 🔴 Open, no decision in comments                                      | Soft — gates `GoalEvidenceCard` only    |

**Status**: ✅ All dependencies met. No "Blocked by" markers in the issue body. #523 stays open, which per the issue's own instruction means **leave `GoalEvidenceCard` alone** — this is not a blocker for the rest of the sweep.

## Objective

Land the cleanup items from the 2026-07-02 Iteration B readiness review that are still real, skip the ones later PRs already fixed, delete the six components the Focus Mode rebuild fully orphaned, and get an explicit answer on the one item (helper-line copy) that contradicts a recorded product decision.

## Decisions

| ID  | Decision                                                                                                                                                                                     | Alternatives Considered                                                                        | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Item 2 (gallery doc contradiction) needs only a comment fix — the behavior already matches #405.                                                                                             | Re-verify #405's implementation itself                                                         | `BadgesScreen.tsx:55` already reads `const gallery = rows.slice(1).map(...)`; only the doc comment at `BadgesWall.tsx:53` (`/** Every earned badge, rendered one cell each — no cap (D9). */`) is stale.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| D2  | Item 3 (delete-confirm copy) is **already shipped** — no PR work.                                                                                                                            | Re-word again to "match the issue's phrasing"                                                  | `a14a1d7` (#469, merged this session) put exactly the prototype framing into `en/badgeDetail.json` `deleteConfirm`: message reads "Your goal and its evidence stay in the timeline — only the credential artifact is deleted." and cancel is `"Keep it"`. Diffing against the issue's ask shows byte-for-byte match.                                                                                                                                                                                                                                                                                                                                                                                        |
| D3  | Item 4's `ThemeSwatchRail` half is **already shipped** — no PR work. `ThemeChipGrid` no longer exists (folded into `ThemeSwatchRail` by #414).                                               | Rename remaining literal                                                                       | `ThemeSwatchRail.tsx:57` already reads `accessibilityLabel={t("common:theme.picker.groupLabel")}`; `swatch-utils.ts:4-6` documents that `ThemeChipGrid` "Lived under ThemeChipGrid while both pickers existed... ThemeSwatchRail... is the only consumer now." Grepped the whole `src/` tree — zero `ThemeChipGrid` hits outside historical dev-plan docs.                                                                                                                                                                                                                                                                                                                                                  |
| D4  | Item 7 (EvidenceTypePicker mode-aware header) is **already resolved**, but via a different mechanism than the issue proposes — no PR work.                                                   | Add a `headerTitle`/mode prop to the shared capture sheet as the issue literally suggests      | The Focus Mode rebuild (#466, merged `33c8b97`, 2026-07-27 — after this issue's 2026-07-02 review) replaced the "change" tap's reuse of the capture sheet with a dedicated `AnimatedSheet` + authoring multi-select grid, titled `focusMode:evidencePlanSheet.title` = "Planned evidence" (`FocusModeScreen.tsx:604-621`, `en/focusMode.json:60-63`). It never renders "Add evidence" or "Saving to your active step" copy at all. The shared capture sheet (`EvidenceTypePicker.tsx` `CaptureSheet`) already supports a `headerTitle` override (used by the New Goal wizard per #463 D3) for its _own_ distinct use case, but that's orthogonal — the planned-evidence "change" flow no longer touches it. |
| D5  | Item 8's dead i18n key `timelineJourney:step.noEvidence` is deleted from `en/`, `de/`, and `pseudo/` in this PR — not routed through `bun run i18n:sync`.                                    | Leave stale key in de/pseudo; run i18n:sync                                                    | Precedent: `a14a1d7`/#469 "chore(i18n): drop the now-dead evidenceList.a11yLabel keys" removed the same key by hand from `en/`, `de/`, and `pseudo/badgeDetail.json` in one commit — a pure deletion isn't a translation edit, so the "en + register only, bot owns de/" rule (which governs _wording_ changes) doesn't apply. No `_register/timelineJourney.yml` entry references `noEvidence`, so nothing to touch there.                                                                                                                                                                                                                                                                                 |
| D6  | Item 10: move `EvidenceItemData` to `src/types/evidence.ts` (not `components/EvidenceItem`).                                                                                                 | Issue's own alt suggestion — move it into `components/EvidenceItem`                            | `EvidenceItem` is itself being deleted in the same pass (issue confirms "dies with it"), so it isn't a shared location. `src/types/evidence.ts` already owns every other evidence-domain type (`EvidenceTypeValue`, `EvidenceOption`, `QuickEvidenceType`) and is imported by all four current consumers of `EvidenceItemData` already, so the import graph only shrinks.                                                                                                                                                                                                                                                                                                                                   |
| D7  | Item 10: `GoalEvidenceCard/` stays untouched this PR.                                                                                                                                        | Delete it since it also has zero real importers                                                | Issue's own hold condition: "Delete only if #523 resolves 'retire'; leave it alone otherwise." Checked `gh issue view 523` — still `OPEN`, zero comments, no decision recorded. Its only current reference (`CardCarousel.stories.tsx:7,205`) is a story file and dies with `CardCarousel` regardless — doesn't change the hold.                                                                                                                                                                                                                                                                                                                                                                            |
| D8  | The `StateWordPill`'s `accessibilityLabel` stays exactly the bare state word (no "✓" glyph baked in); only the _visible_ `Text` gets the "✓ " prefix, and only for `status === "completed"`. | Compose "✓" into the accessibility name too, matching `densityA11yLabel`'s composition pattern | `SettingsDensityRows.tsx:59-64` shows the established pattern for a visual "✓" that replaces other visible copy: the glyph is announced only via `accessibilityState.checked` / role semantics, never spelled into the label string (`densityA11yLabel` in `src/i18n/labels.ts:53-60` never mentions the checkmark). `StateWordPill` already carries `accessibilityRole="text"` with the state name as its full accessible name (`FocusCurrentTaskCard.parts.tsx:38-39`) — that's already sufficient; stapling "✓" onto it would just be a redundant glyph-name for screen readers. Keeps the existing `getByLabelText("Completed")` assertions green with no test changes.                                 |
| D10 | The dead `common:timeline` i18n block and its parity test are deleted rather than re-commented.                                                                                              | Reword the parity comment to name a surviving callsite                                         | There is no surviving callsite — see the Discovery Log. Supersedes D9's second half.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| D9  | Item 10 dead-code deletion also removes the now-dead `noEvidence`-adjacent style token and fixes one stale comment.                                                                          | Leave the comment                                                                              | `TimelineStep.styles.ts:113` (`noEvidence:`) becomes dead once the `Text` node is removed (item 8) — same commit, same file, cheap. `src/i18n/__tests__/option-key-parity.test.ts:118-120` has a comment literally naming "MiniTimeline and ProgressDots" as the callsites its forward-only key check backs — those two directories are deleted in this PR, so the comment goes stale; rewording it to name the real current callsite (`TimelineNode`'s consumers use the same `common:timeline.a11y.step` key path — verify at implementation time) is a one-line fix in the same commit as the deletion pass.                                                                                             |

## Affected Areas

- `src/navigation/FocusPillTabBar.stories.tsx`: rename stale "FAB visible"/"FAB hidden" stage labels (item 1).
- `src/screens/BadgesScreen/BadgesWall.tsx`: fix stale gallery doc comment (item 2, D1); add sort-control-drop comment near the header (item 9).
- `src/components/FocusCurrentTaskCard/FocusCurrentTaskCard.parts.tsx`: `StateWordPill` renders "✓ " prefix for `completed` (item 5, D8).
- `src/components/FocusCurrentTaskCard/__tests__/FocusCurrentTaskCard.test.tsx`: add assertion for the visible "✓ Completed" text alongside the unchanged a11y-label assertion.
- `src/components/TimelineStep/TimelineStep.tsx`: both the step-level and `ChildRow` empty-evidence branches render `null` instead of the "No evidence yet" `Text` (item 8).
- `src/components/TimelineStep/TimelineStep.styles.ts`: drop the now-dead `noEvidence` style token.
- `src/components/TimelineStep/__tests__/TimelineStep.test.tsx`: flip the two "shows No evidence yet" assertions to "renders nothing".
- `src/i18n/resources/{en,de,pseudo}/timelineJourney.json`: delete the dead `step.noEvidence` key (item 8, D5).
- `src/types/evidence.ts`: add the `EvidenceItemData` interface (moved from `EvidenceDrawer`, D6).
- `src/screens/TimelineJourneyScreen/TimelineJourneyScreen.tsx`, `src/components/FinishLine/FinishLine.tsx`, `src/components/TimelineEvidenceCard/TimelineEvidenceCard.tsx`, `src/components/TimelineStep/TimelineStep.tsx`: repoint the `EvidenceItemData` type import to `../../types/evidence` (or `../../../types/evidence`, path-dependent).
- `src/i18n/__tests__/option-key-parity.test.ts`: reword the stale comment naming `MiniTimeline`/`ProgressDots`.
- **Deleted wholesale** (components + `.stories.tsx` + `__tests__/`): `src/components/CardCarousel/`, `src/components/MiniTimeline/`, `src/components/ProgressDots/`, `src/components/FABMenu/`, `src/components/EvidenceDrawer/`, `src/components/EvidenceItem/`.
- **Untouched, verified already-correct** (no PR work — cited in Decisions D1–D4): `src/screens/BadgesScreen/BadgesWall.tsx:55` behavior (D1 is comment-only), `src/i18n/resources/en/badgeDetail.json` `deleteConfirm.*` (D2), `src/components/ThemeSwatchRail/ThemeSwatchRail.tsx:57` (D3), `src/screens/FocusModeScreen/FocusModeScreen.tsx` planned-evidence sheet (D4).
- **Untouched, explicit hold** (D7): `src/components/GoalEvidenceCard/`.
- **Not touched** (item 6 dropped — see Step 6): `src/i18n/resources/en/focusMode.json` `currentTask.inProgress.helperLine`.

## Implementation Plan

### Step 1: Dead-code deletion pass — six Focus-Mode-orphaned components

**Files**: `src/types/evidence.ts`; `src/screens/TimelineJourneyScreen/TimelineJourneyScreen.tsx`; `src/components/FinishLine/FinishLine.tsx`; `src/components/TimelineEvidenceCard/TimelineEvidenceCard.tsx`; `src/components/TimelineStep/TimelineStep.tsx`; delete `src/components/{CardCarousel,MiniTimeline,ProgressDots,FABMenu,EvidenceDrawer,EvidenceItem}/`; `src/i18n/__tests__/option-key-parity.test.ts`
**Commit**: `chore(native-rd): delete Focus-Mode-orphaned components (CardCarousel, MiniTimeline, ProgressDots, FABMenu, EvidenceDrawer, EvidenceItem)`
**Changes**:

- [x] Re-grep each of the six directories immediately before deleting (branch state may have moved again mid-implementation) — confirm zero non-story/non-test importers.
- [x] Move the `EvidenceItemData` interface from `EvidenceDrawer.tsx` into `src/types/evidence.ts`.
- [x] Update the 4 real importers (`TimelineJourneyScreen.tsx:36`, `FinishLine.tsx:8`, `TimelineEvidenceCard.tsx:3`, `TimelineStep.tsx:8`) to import `EvidenceItemData` from the new location.
- [x] Delete `FABMenu` only after confirming `EvidenceDrawer` (its sole consumer) is gone in the same commit.
- [x] Delete `EvidenceItem` only after confirming `EvidenceDrawer` (its sole consumer) is gone in the same commit.
- [x] Delete all six directories in full (component, `.styles.ts`, `.stories.tsx`, `__tests__/`).
- [x] Reword the stale `MiniTimeline`/`ProgressDots` comment at `option-key-parity.test.ts:118-120` to name the actual current callsite(s) of `common:timeline.a11y.step`.
- [x] Leave `src/components/GoalEvidenceCard/` and `src/components/FAB/` untouched (D7; FAB is out of the issue's list — see Not in Scope).
- [x] Run `bun run type-check` and `bun run test` to confirm nothing else referenced the deleted trees.

### Step 2: Stale FAB story labels

**Files**: `src/navigation/FocusPillTabBar.stories.tsx`
**Commit**: `fix(native-rd): rename stale FAB visible/hidden story labels in FocusPillTabBar`
**Changes**:

- [x] Lines 81/84/87: change `"Goals active — FAB visible"` / `"Badges active — FAB visible"` / `"Settings active — FAB hidden"` to plain `"Goals active"` / `"Badges active"` / `"Settings active"` — matching the individual `GoalsActive`/`BadgesActive`/`SettingsActive` stories' existing labels, since there's no more FAB show/hide distinction post-#379 (only which tab slot the pill sits on).
- [x] Line 112: drop `"(FAB hidden)"` from the `SettingsActive` story's own label for the same reason.

### Step 3: BadgesWall doc-comment fixes

**Files**: `src/screens/BadgesScreen/BadgesWall.tsx`
**Commit**: `docs(native-rd): fix stale gallery doc comment, record sort-control drop in BadgesWall`
**Changes**:

- [x] Line 53: rewrite the `gallery` prop doc comment to state the actual #405 contract — every earned badge _except the spotlight_ (`rows.slice(1)` in `BadgesScreen.tsx:55`), one cell each, no cap.
- [x] Near the `listHeader`/`styles.header` block (~line 205-208): add a one-line comment recording that the App Shell prototype's `☰` sort button was deliberately not built — #405 hardcodes `createdAt DESC` (see `queries.ts` `badgesWithGoalsQuery`, already ordered `.orderBy("badge.createdAt", "desc")`).

### Step 4: Completed pill gets its ✓

**Files**: `src/components/FocusCurrentTaskCard/FocusCurrentTaskCard.parts.tsx`; `src/components/FocusCurrentTaskCard/__tests__/FocusCurrentTaskCard.test.tsx`
**Commit**: `feat(native-rd): render ✓ in the Focus current-task Completed state pill`
**Changes**:

- [x] `StateWordPill`: when `status === "completed"`, prefix the rendered `Text` with `"✓ "`; leave `accessibilityLabel` as the bare `label` (D8).
- [x] Add a test asserting the completed pill's visible text is `"✓ Completed"` while `getByLabelText("Completed")` still resolves; assert the paused pill has no glyph (`getByText("Paused")`, no `"✓"`).

### Step 5: TimelineStep renders nothing when a step has no evidence

**Files**: `src/components/TimelineStep/TimelineStep.tsx`; `src/components/TimelineStep/TimelineStep.styles.ts`; `src/components/TimelineStep/__tests__/TimelineStep.test.tsx`; `src/i18n/resources/en/timelineJourney.json`; `src/i18n/resources/de/timelineJourney.json`; `src/i18n/resources/pseudo/timelineJourney.json`
**Commit**: `fix(native-rd): TimelineStep shows nothing (not "No evidence yet") when a step has no evidence`
**Changes**:

- [x] Lines 122-138 (parent step): when `evidence.length === 0`, render nothing — either skip the `evidenceSection` `View` entirely or keep it rendering only when `evidence.length > 0`.
- [x] Lines ~219-235 (`ChildRow`): same fix, mirrored.
- [x] Delete the now-dead `noEvidence` style token from `TimelineStep.styles.ts:113`.
- [x] Delete the `step.noEvidence` key from `en/`, `de/`, `pseudo/timelineJourney.json` (D5).
- [x] Flip `TimelineStep.test.tsx:75-79` and `:407-410` from "shows No evidence yet" to "renders nothing" (`queryByText` returns null; no empty box renders).

### Step 6 — DROPPED (resolved 2026-08-09)

Item 6 is **not implemented**. `helperLine` stays `"add evidence to complete"`.

The #408 decision (`issue-408-focus-current-task-card.md:435-436`) stands: it is a
recorded product call, and this issue is a cleanup sweep, not a vehicle for reopening
shipped decisions. Item 6 was written from the prototype without knowledge of that call.
No files change.

## Testing Strategy

- [x] Unit tests for `StateWordPill`'s new "✓" behavior (Jest 30, `@testing-library/react-native` v13) in `FocusCurrentTaskCard.test.tsx`.
- [x] Flip the two existing `TimelineStep.test.tsx` empty-evidence assertions from presence to absence.
- [x] `bun run type-check` after Step 1 — catches any remaining import of a deleted path.
- [x] `bun run test` full suite after Step 1 — catches any test file (not just source) that still imports a deleted component.
- [x] `bun run lint` — the i18n `t()`-key lint (`i18n:lint-source`) will catch a leftover `timelineJourney:step.noEvidence` reference if the deletion in Step 5 is incomplete.
- [ ] Manual (not run): Storybook `Iteration B/Navigation/FocusPillTabBar` renders the three stages with plain labels; `FocusCurrentTaskCard` stories still show the completed state correctly with the new glyph.

## Not in Scope

| Item                                                                                                                                                                                           | Reason                                                                                                                                                                                                                                                                                                                                                                                                                     | Follow-up                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `src/components/FAB/` deletion                                                                                                                                                                 | Not named in the issue's item-10 list, but re-grepping shows its only remaining real importer is `EvidenceDrawer` — once Step 1 deletes that, `FAB` becomes orphaned too. Expanding the issue's explicit deletion list is a scope call, not a code-answerable fact.                                                                                                                                                        | File a follow-up issue, or fold into a future cleanup sweep. |
| `screens/EditModeScreen/`, `components/StepList/`, `screens/CompletionFlowScreen/`, `screens/BadgeEarnedModal/`, `components/ModeIndicator/`, `screens/NewGoalModal/`, `components/BadgeCard/` | Issue explicitly marks these "Deferred deletions — do NOT do in this issue"; each dies with its own in-flight `[Integrate]` PR (#446, #449, #444, #405).                                                                                                                                                                                                                                                                   | Tracked by those issues already.                             |
| `components/GoalEvidenceCard/` deletion                                                                                                                                                        | Issue's explicit hold pending #523's "retire" decision; #523 is still open with zero comments.                                                                                                                                                                                                                                                                                                                             | Re-check when #523 resolves.                                 |
| Item 6 (helper-line copy)                                                                                                                                                                      | Dropped 2026-08-09 — the #408 decision holds; a cleanup sweep does not reopen shipped product calls.                                                                                                                                                                                                                                                                                                                       | None.                                                        |
| Running `bun run i18n:sync` for item 8's key deletion                                                                                                                                          | Deletion, not translation — precedent (#469/`a14a1d7`) hand-deletes dead keys from all three locales in one commit rather than routing through the LLM sync pipeline.                                                                                                                                                                                                                                                      | None — D5 covers this.                                       |
| `components/StepCard/` (`StepCard.tsx`, `StepOverviewCard.tsx`, `StepCardTopBand.tsx`, `index.ts`) deletion                                                                                    | **Newly orphaned by this sweep.** `CardCarousel.stories.tsx` was `StepCard`'s only importer outside its own directory; deleting it leaves these four reachable only from their own story/test/barrel. Same scope call as the `FAB/` row — expanding the issue's deletion list is a judgment call, and the directory cannot go wholesale because `StepCardEvidenceCapture.tsx` stays live via `FocusCurrentTaskCard.tsx:6`. | File a follow-up issue, or fold into the next cleanup sweep. |

## Discovery Log

- [2026-08-09 Step 1] **D9's premise was false.** `TimelineNode` does not use
  `common:timeline.a11y.step` — its consumers (`TimelineStep`, `FinishLine`) pass
  `timelineJourney:step.a11yGoTo` / `finishLine.a11yNode`. `MiniTimeline` and
  `ProgressDots` were the key's _only_ callsites, and they own the whole
  `common:timeline` block (`hint`, `a11y.label/hint/step/goalEvidence`). So instead
  of rewording the comment, the block was deleted from `en/`, `de/`, `pseudo/`
  and the now-vacuous `common:timeline.a11y.step resolves` parity test removed
  (same D5 hand-delete precedent — a dead key is a deletion, not a translation).
- [2026-08-09 Step 1] `src/__tests__/accessibility.test.tsx` imported `MiniTimeline`
  for a "#292 MiniTimeline node hit targets" describe block — the plan missed this
  importer. Deleted with the component. The a11y contract it guarded (small node +
  2·hitSlop ≥ 44pt) is still covered in the same file by the "#293 TimelineStep
  sub-step ChildRow" block, so no contract coverage was lost.
- [2026-08-09 Step 1] `EvidenceItemData` had 10 importers, not the 4 the plan
  listed — `FinishLine`, `TimelineEvidenceCard` and `TimelineStep` each import it
  from their `.stories.tsx` and `__tests__/` files too. All 10 repointed to
  `types/evidence`.
- [2026-08-09 Step 5] Added `testID="timeline-evidence-section"` to both evidence
  section `View`s so the intent criterion "no empty evidence-section box" is
  actually assertable (`queryByTestId(...) === null`) rather than only asserting
  the absent text.
- [2026-08-09 self-review] **Removing the empty state broke the disclosure
  contract.** The header kept `accessibilityState={{ expanded }}` and its chevron
  while the body was gated on `evidence.length > 0`, so a step with no evidence
  announced "expanded" against an empty tree — the removed `Text` had been the
  only thing making the expanded state perceivable. A header with nothing to
  disclose is now inert text (no button role, no `expanded`, no chevron), in both
  `TimelineStep` and `ChildRow`. The `accessibility.test.tsx` ChildRow fixture
  gained evidence on its first sub-step so the real disclosure path stays covered.
- [2026-08-09 self-review] The `common:evidenceDrawer.*` block survived the sweep
  in all three locales — `EvidenceDrawer`/`EvidenceItem` were deleted but their
  keys were not, and nothing catches it (locale-parity only compares keysets
  _across_ locales, and all three carried it identically). Deleted, same D5
  hand-delete precedent as `common:timeline.*`.
- [2026-08-09 self-review] Six comments named `EvidenceDrawer`, `FABMenu`, or
  `CardCarousel` in the present tense as live references
  (`EvidenceTypePicker/` ×5, `FocusPillTabBar.tsx:29`, `NewGoalWizard.tsx:540`),
  plus `docs/research/step-containment-semantics.md:136`, whose containment claim
  rested on `CardCarousel.stories.tsx` existing. Style notes now state the
  contract inline rather than by reference to a deleted file.
