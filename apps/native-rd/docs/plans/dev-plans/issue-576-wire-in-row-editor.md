# Development Plan: Issue #576

## Issue Summary

**Title**: [Integrate] Wire the in-row editor + wait editor to `updateStep`, retire the `datesInfo` banner
**Type**: feature (integration)
**Complexity**: MEDIUM
**Estimated Lines**: ~350-450 lines (implementation + tests + i18n)

**Rescope banner note (verified against disk, 2026-08-20):** the issue's own text is stale in one
material way it already flags — it still describes "B1's and B2's sheets." On disk today there are no
sheets: `StepTimingEditor` (#573, merged in #585) is an **in-row** expand/collapse component with its
own internal pressable timing line, and `EditGoalTimingLine` (#575, merged in #587) is the read-only
line every row shows today, wired to a no-op `onEditTiming`. This plan wires the real thing.

**Scope cut, verified against disk:** `StepWaitEditor` (#584) does **not exist** — no component
directory, no Storybook stories, nothing. `gh issue view 584` shows it OPEN, scoped "Storybook only —
no screen wiring (that is C1)." This plan therefore **does not** touch Focus Mode or mount any wait
editor there; "Mount `StepWaitEditor` (#584) in Focus" from the issue's Scope section is descoped to a
follow-up (tracked below in Not in Scope). Everything else in the issue — `StepTimingEditor` mounting,
`updateStep` wiring, the candidate list, the banner removal — is buildable today and is this plan's
actual content.

## Intent Verification

- [x] From Edit Goal, tapping a step's (or sub-step's) unset `＋ when?` line expands `StepTimingEditor`
      in place; picking a date and/or a "depends on" candidate and pressing Done writes through
      `updateStep` and the row's chip updates immediately from the live Evolu query (no optimistic
      local state).
- [x] Pressing Clear inside the expanded editor writes `afterStepId: null`, `dueAt: null`, and
      `waitingOnLabel`/`waitingOnExpectedAt: null`, and the row returns to its unset `＋ when?` state.
- [x] The candidate list offered in "depends on" excludes the step itself and excludes any sibling
      whose own `afterStepId` already points at this step (two-step-cycle omission) — with no disabled
      row and no refusal copy, just a quiet absence.
- [x] A failed `updateStep` call (thrown or `{ ok: false }`) shows an alert and leaves the editor open
      with the user's draft intact, exactly like `updateStepFields` (`EditModeScreen.tsx:221-240`)
      already does for title/evidence writes.
- [x] A step whose only dependency data is a `waitingOnLabel` (set by some future Focus write) still
      renders its "⏳ waiting on …" chip on the collapsed row — the expanded editor never authors or
      displays `waiting on` (`StepTimingEditor.tsx` doc: "waiting on is deliberately absent").
- [x] The `editGoal:editor.datesInfo` banner and its "full planner" copy are gone from the screen and
      from all three locale files (en/de/pseudo); `apps/native-rd/src/i18n/__tests__/locale-parity.test.ts`
      still passes with the key removed everywhere.
- [x] A step with a `waitingOnLabel` set still shows a live, enabled complete action in Focus Mode, and
      completing it writes no dependency field (regression test, since this is "the single guardrail
      most likely to be broken by a later 'helpful' change" per the issue's Acceptance section).

## Dependencies

| Issue | Title                                                    | Status                          | Type                                |
| ----- | -------------------------------------------------------- | ------------------------------- | ----------------------------------- |
| #573  | `StepTimingEditor` — in-row date + `depends on`          | ✅ Merged (PR #585)             | Blocker                             |
| #574  | `StepDayGrid` — themed month grid                        | ✅ Merged (PR #585)             | Blocker                             |
| #575  | Edit Goal step rows — one pressable timing line          | ✅ Merged (PR #587)             | Blocker                             |
| #571  | Neutral past-tense expected date (`was expected`)        | ✅ Merged (PR #579)             | Soft                                |
| #572  | Decide: wizard vs Edit-Goal-only authoring               | ✅ Closed, decision recorded    | Soft                                |
| #584  | `StepWaitEditor` — record a wait in Focus                | 🔴 Open — component not on disk | Named in issue scope, descoped here |
| #577  | Set B/C close-out — 7-theme walkthrough + ADR-0012 sweep | Open, blocked by this issue     | Blocked-by-this                     |

**Status**: ⚠️ Has one unmet dependency (#584), but it only blocks the Focus/wait-editor half of the
original issue text, which this plan explicitly descopes (see banner above and Not in Scope). The
Edit-Goal/`StepTimingEditor` half has zero unmet blockers and is fully buildable.

## Objective

Mount `StepTimingEditor` inside each Edit Goal step and sub-step row, wire its committed drafts through
`updateStep` (converting `StepDayGrid`'s plain `YYYY-MM-DD` to a local-midnight `DateIso`), build the
"depends on" candidate list with two-step-cycle omission, wire real `isCompleted` / `dateDepChips` data
for sub-steps (currently unpopulated — left for this issue by #575's own doc), and delete the
`datesInfo` banner and its i18n key across all three locales.

## Decisions

| ID  | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Alternatives Considered                                                                                                                                                                                                                       | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Mount `StepTimingEditor` **in place of** `EditGoalTimingLine` for exactly the row whose id equals a new `expandedTimingStepId` state (owned by `EditModeScreen`); every other row keeps rendering `EditGoalTimingLine` as today.                                                                                                                                                                                                                                                                                                                                                   | (a) Always render both, showing/hiding the editor block below the line. (b) Extend `EditGoalTimingLine` itself to embed the editor.                                                                                                           | `StepTimingEditor` already renders its own header pressable line (`StepTimingEditor.tsx:215-246`) — mounting it alongside `EditGoalTimingLine` would duplicate the tap target. `EditGoalTimingLine`'s own doc is explicit that `TruthLines` (and by extension the editor) is not reused for it because it has **no `waiting` case** (`EditGoalTimingLine.tsx:11-14`) — the read-only row must keep showing a `waiting` chip that the editor cannot represent, so the two components must stay swappable, not merged.                                                                                                                                                                                                                                                                     |
| D2  | `EditGoalStepRow.tsx` / `EditGoalSubStepRow.tsx` gain the actual embedding (`{isTimingExpanded ? <StepTimingEditor .../> : <EditGoalTimingLine .../>}`), not `EditGoalStepList`.                                                                                                                                                                                                                                                                                                                                                                                                   | Mount the editor as a sibling element in the list's `.map()` loop, leaving the rows untouched.                                                                                                                                                | #575's own row doc says "no editor opens here" but attributes that specifically to **#575's** scope, and #575's Must-not-do table (`issue-575-pressable-timing-line.md:249`) lists "Embedding `StepTimingEditor` in the row" as explicitly **owned by #576**. The issue text itself says "Mount `StepTimingEditor` … inside the row."                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| D3  | `StepTimingEditor` is rendered **controlled** (`expanded={true}` always, since it is only mounted for the active id) with `onExpandedChange` gated by a `justFailedCommitRef` boolean: the ref is set `true` right before a failed `updateStep` call's `onFailure` returns, and `onExpandedChange(false)` checks-and-clears it, skipping the collapse exactly once when set.                                                                                                                                                                                                       | Treat `onExpandedChange` as authoritative and always collapse on `false`.                                                                                                                                                                     | `StepTimingEditor.handleDone` (`StepTimingEditor.tsx:178-181`) unconditionally calls `onCommit(draft)` then `closeEditor()` in the same synchronous call, with no way for the caller to veto the collapse from inside `onCommit`. Since our `updateStep` call inside `onCommit` is synchronous (`runEvoluMutation`), the ref is set before `closeEditor()` runs and consumed by the `onExpandedChange(false)` it triggers — without this, a failed write's alert would fire but the editor would still visually close, violating the issue's own acceptance line ("Failed writes surface an alert and leave the sheet open"). The same ref covers `handleClear`.                                                                                                                         |
| D4  | Extend `EditGoalStep`/`EditGoalSubStep` (`EditGoalView.tsx:88-131`) with the editor's raw props (`timingValue: {dueDate, afterStepId}`, `timingCandidates`, `afterStepTitle`, `afterStepIsCompleted`, `dueDateLabel`, `timingMarks`) rather than a side-channel/render-prop.                                                                                                                                                                                                                                                                                                       | A `renderTimingEditor(id)` callback prop threaded once through the list layers, closing over one computed bundle in `EditModeScreen`.                                                                                                         | Matches the codebase's own established precedent for exactly this kind of addition: `dateDepChips`/`isCompleted` already "ride the step object" rather than a sibling prop, and issue #575's own D3 explicitly rejected a side-channel in favor of extending the shared step shape "and needs no extra binding at the list layer" (`issue-575-pressable-timing-line.md:73`).                                                                                                                                                                                                                                                                                                                                                                                                             |
| D5  | Move `apps/native-rd/src/components/StepDayGrid/monthGrid.ts` → `apps/native-rd/src/utils/localDay.ts`, keeping every exported function (`dayKey`, `toDayKey`, `localDate`, `leadingBlanks`, `daysInMonth`, `shiftMonth`, `isPastDay`, `groupMarksByDay`) and adding two new ones this issue needs: `localDayKeyToDateIso(key): Result<DateIso, DateIsoError>` and `dateIsoToLocalDayKey(iso): string`. Update `StepDayGrid.tsx`'s import.                                                                                                                                         | Write a second, independent day-math module for #576, or reach into `StepDayGrid/monthGrid.ts` with a relative import from a screen.                                                                                                          | This exact move is a named follow-up from #573/#574's own review pass: "F-4 … `toDayKey`/`dayKey` are exactly what #576 needs … and a screen should not import date maths from a component directory … a file move belongs with the issue that consumes it (#576)" (`issue-574-573-step-timing-editor.md:602`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| D6  | `updateStep`'s DateIso conversion follows the same `Result`-unwrap-and-alert pattern already used for `completeGoal`/`completeStep` (`queries.ts:224-231`, `:961-968`): `dateToDateIso(localDate(y, m, d))`, check `.ok`, log + throw a descriptive error on failure (extremely unlikely — only fails on an out-of-range `Date`).                                                                                                                                                                                                                                                  | Assume the conversion always succeeds and skip the `.ok` check.                                                                                                                                                                               | Every other caller of `dateToDateIso` in this codebase checks `.ok` before using `.value`; skipping it here would be the one inconsistent call site, and `updateStep`'s own doc for `waitingOnExpectedAt`/`dueAt` explicitly frames this as "the same write-side convention as `completedAt`" (`queries.ts:851`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| D7  | On `StepTimingEditor.onCommit(draft)`: always write `dueAt` (converted or `null`) and `afterStepId` (`draft.afterStepId` or `null`); additionally write `waitingOnLabel: null, waitingOnExpectedAt: null` **only when `draft.afterStepId !== null`**. On `onClear`: write all four fields to `null` in one call.                                                                                                                                                                                                                                                                   | (a) Never touch the waiting columns from this editor at all. (b) Always null the waiting columns on every commit, regardless of `afterStepId`.                                                                                                | Matches the issue's own Scope/Writes table literally: "Set `after`: … and clear `waitingOnLabel`/`waitingOnExpectedAt`" and "Clear dep: `afterStepId: null`, `waitingOnLabel: null`, `waitingOnExpectedAt: null`" (issue body). Option (b) is the real risk the issue's Open Question #4 names — but that risk is specifically about a **future Focus write** silently clobbering an Edit-Goal-set `after`, not about this direction. Nulling the waiting columns only when the user is actively setting a dependency (not on every incidental date-only commit where `afterStepId` stays `null`) avoids Edit Goal ever wiping a wait that some other surface set, while still implementing the one unconditional part of the table (`Set after` clears `waiting`) exactly as specified. |
| D8  | Candidate list = every other step **and sub-step** in the same goal (flat, not scoped to siblings-under-one-parent), each labelled "1", "2", … for root steps (matching the row's own `stepNumber = index + 1`, `EditGoalStepRow.tsx` prop) and "a", "b", … for sub-steps via the existing `toLetterOrdinal` (`utils/format.ts:47`, already used for the Timeline sub-spine). A candidate whose own `afterStepId === thisStep.id` is omitted (not disabled). Deleted/soft-deleted targets need no cleanup write — `resolveStepDependencyBand` already degrades them to unresolved. | Scope candidates to same-parent siblings only.                                                                                                                                                                                                | The issue's own "after candidate list" section is explicit: "Candidates offered = siblings in the same goal, excluding the step itself" and "Prefer omitting the step that already points at this one … over showing it disabled" — both directly specified, not a judgment call. `StepTimingEditor.stories.tsx` (`:33-74`) already demonstrates exactly this flat 1/2/3/a/b/c labelling scheme for its candidate fixtures.                                                                                                                                                                                                                                                                                                                                                              |
| D9  | `marks` fed to the embedded `StepDayGrid` = the same candidate population, filtered to those with a non-null `dueDate`, mapped to `{date, label}` — built in the same pass as the candidate list, not a second traversal.                                                                                                                                                                                                                                                                                                                                                          | Query marks independently per StepDayGrid.                                                                                                                                                                                                    | `StepTimingCandidate` already carries `dueDate`/`label` (`StepTimingEditor/types.ts:8-18`); a second computation would duplicate the same goal-steps scan for no benefit.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| D10 | `dueDateLabel`/`afterStepTitle`/`afterStepIsCompleted`/`timingValue` are computed once per row in `buildEditGoalSteps` (`editGoalSteps.ts`), reusing `resolveStepDependencyBand` (already called there for `dateDepChips`) rather than a second resolver call.                                                                                                                                                                                                                                                                                                                     | Compute the editor's raw values in `EditModeScreen.tsx` directly from `stepRows`, bypassing `editGoalSteps.ts`.                                                                                                                               | `buildDateDepChips` already resolves the band once per step (`editGoalSteps.ts:75-116`); reusing that result for the editor's raw fields avoids calling `resolveStepDependencyBand` twice per row per render.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| D11 | `dateDepChips` and `isCompleted` are now computed for **sub-steps** too in `buildEditGoalSteps` (currently the `subSteps:` mapper leaves both unset — `editGoalSteps.ts:52-58` — with an explicit "populating them from the DB is #576's job" comment).                                                                                                                                                                                                                                                                                                                            | Leave sub-step chips/isCompleted unset, since the issue text doesn't mention them by name.                                                                                                                                                    | The comment is a direct, dated instruction from the prior issue's own author pointing at #576; leaving it undone would mean a sub-step's `waiting`/`after`/`due` never renders and a completed sub-step still shows a stray `＋ when?` prompt — a regression the issue's own Acceptance line ("on a parent **and** on a sub-step") explicitly tests for.                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| D12 | Row-parks-at-top-on-expand (`StepTimingEditor`'s `onExpand(rowRef)` callback) is wired to a **no-op** in this PR — the prop is passed as `undefined`.                                                                                                                                                                                                                                                                                                                                                                                                                              | Thread a `measureLayout` → `dragScrollController.scrollTo` implementation up through `EditGoalStepRow` → `…List` → `EditGoalView` → `EditModeScreen` (which does own a `dragScrollController` with a `scrollTo`, `EditModeScreen.tsx:85-93`). | Not named in the issue's Acceptance criteria (only in `StepTimingEditor`'s own component doc as a UX nicety already flagged as its own follow-up, F-3, in the #573/#574 plan: "worth extracting when #575 actually consumes it" — that consumption is this issue). Wiring it correctly needs a new ref threaded through four component layers just for a non-required scroll nicety; deferring keeps this PR's diff inside the issue's own ~300-400 LOC estimate. Recorded below as a Not-in-Scope follow-up rather than silently dropped.                                                                                                                                                                                                                                               |
| D13 | New i18n keys live under `editGoal:editor.timing.*`. Where `StepTimingEditor`'s copy is **byte-identical** to an existing key (`afterLineLabel` ↔ `editGoal:stepList.dateDepChips.after`, `dueLineLabel` ↔ `editGoal:stepList.dateDepChips.due`, `doneLabel` ↔ `editGoal:actions.done`), the existing key is reused rather than duplicated.                                                                                                                                                                                                                                        | Give `StepTimingEditor` its own full copy of every key, isolated from `EditGoalTimingLine`'s.                                                                                                                                                 | `readOutParity.test.tsx` (`StepTimingEditor/__tests__/`) already exists to guard that the editor's lines match Timeline/Focus wording; reusing the literal same `t()` key is the only way that parity is structural rather than coincidental. The #573/#574 plan's own F-1 follow-up flags "four copy sources with duplicate keys" as debt already present — this decision avoids adding a fifth.                                                                                                                                                                                                                                                                                                                                                                                        |
| D14 | The `datesInfoText` prop, its default, and its render (`EditGoalView.tsx:223`, `:312`, `:574-583`), the two dead styles (`EditGoalView.styles.ts:487-503`), the `editGoal:editor.datesInfo` key (en/de/pseudo), and the `datesInfoText` entries in `editGoalCopy.ts` (`:23`, `:60`) are all deleted in the same commit as the banner removal — not left as unused dead code.                                                                                                                                                                                                       | Delete only the visible banner and leave the prop/key for a later cleanup pass.                                                                                                                                                               | The issue's own "Must not do" section and the banner text itself ("open a step in the full planner") point at a surface that will never exist; `locale-parity.test.ts` would otherwise still pass with a now-meaningless key sitting in three files.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

## Affected Areas

- `apps/native-rd/src/components/StepDayGrid/monthGrid.ts`: deleted, moved to `src/utils/localDay.ts` with two new DateIso-conversion helpers (D5).
- `apps/native-rd/src/components/StepDayGrid/StepDayGrid.tsx` / `.parts.tsx`: import path updated.
- `apps/native-rd/src/components/StepDayGrid/__tests__/monthGrid.test.ts`: moved to `src/utils/__tests__/localDay.test.ts`, plus new cases for the two added helpers.
- `apps/native-rd/src/screens/EditModeScreen/editGoalSteps.ts`: wire `isCompleted`/`dateDepChips` for sub-steps; add `timingValue`/`timingCandidates`/`afterStepTitle`/`afterStepIsCompleted`/`dueDateLabel`/`timingMarks` to both step shapes (D4, D8-D11).
- `apps/native-rd/src/screens/EditModeScreen/EditModeScreen.tsx`: `expandedTimingStepId` state, `handleCommitTiming`/`handleClearTiming` (DateIso conversion, register-exclusivity write, `runEvoluMutation`/`reportError`/`Alert`, `justFailedCommitRef`), wire `onEditTiming`, drop `datesInfoText` from the copy spread.
- `apps/native-rd/src/screens/EditModeScreen/editGoalCopy.ts`: remove `datesInfoText`; add the new `StepTimingEditor`/`EditGoalTimingLine` copy props sourced from `t()`.
- `apps/native-rd/src/components/EditGoalView/EditGoalView.tsx`: extend `EditGoalStep`/`EditGoalSubStep` types (D4); remove `datesInfoText` prop + banner render; add `expandedTimingStepId`, `onCommitTiming`, `onClearTiming`, and the new copy props; forward all to `EditGoalStepList`.
- `apps/native-rd/src/components/EditGoalView/EditGoalView.styles.ts`: remove `infoBanner`/`infoBannerIcon`/`infoBannerText`; update the stale `:237` comment.
- `apps/native-rd/src/components/EditGoalView/EditGoalStepList.tsx` / `EditGoalSubStepList.tsx`: thread the new props to rows.
- `apps/native-rd/src/components/EditGoalView/EditGoalStepRow.tsx` / `EditGoalSubStepRow.tsx`: swap `EditGoalTimingLine` for `StepTimingEditor` when `isTimingExpanded` (D1-D3).
- `apps/native-rd/src/i18n/resources/{en,de,pseudo}/editGoal.json`: remove `editor.datesInfo`; add `editor.timing.*` (D13).
- `apps/native-rd/src/screens/EditModeScreen/__tests__/EditModeScreen.test.tsx`: candidate-list tests (cycle omission, self-exclusion), commit/clear handler tests (success, failure-keeps-open, register exclusivity), sub-step chip/isCompleted tests, banner-absence test.
- `apps/native-rd/src/screens/FocusModeScreen/__tests__/FocusModeScreen.test.tsx`: regression test — a step with `waitingOnLabel` set still completes and the write touches no dependency field.
- `apps/native-rd/src/components/EditGoalView/__tests__/EditGoalView.test.tsx`: type-level coverage for the extended step shapes if needed.

## Implementation Plan

### Step 1: Move day-math to a shared util and add the DateIso bridge

**Files**: `apps/native-rd/src/utils/localDay.ts` (new), `apps/native-rd/src/components/StepDayGrid/monthGrid.ts` (deleted), `StepDayGrid.tsx`, `StepDayGrid.parts.tsx`, `apps/native-rd/src/utils/__tests__/localDay.test.ts` (new, moved from `monthGrid.test.ts`)
**Commit**: `refactor(native-rd): move StepDayGrid's day math to src/utils/localDay.ts`
**Changes**:

- [x] `git mv` `monthGrid.ts` → `src/utils/localDay.ts`; update its header comment (drop "behind `StepDayGrid`", note it's now shared).
- [x] Update `StepDayGrid.tsx` / `.parts.tsx` imports to the new path.
- [x] Add `localDayKeyToDateIso(key: string): Result<DateIso, DateIsoError>` — parses `YYYY-MM-DD` into `{year, month, day}`, calls `localDate(...)`, then `dateToDateIso`.
- [x] Add `dateIsoToLocalDayKey(iso: string): string` — `toDayKey(new Date(iso))` (safe here: `iso` is a full timestamp, not a date-only string, so no UTC-midnight trap).
- [x] `git mv` the test file; add `describe` blocks for the two new functions (valid key, malformed key, round-trip).

### Step 2: Wire sub-step `dateDepChips`/`isCompleted` and the editor's raw fields

**Files**: `apps/native-rd/src/screens/EditModeScreen/editGoalSteps.ts`, `apps/native-rd/src/components/EditGoalView/EditGoalView.tsx` (type additions only)
**Commit**: `feat(native-rd): populate sub-step timing data and raw editor fields (#576)`
**Changes**:

- [x] Add `timingValue`, `timingCandidates`, `afterStepTitle`, `afterStepIsCompleted`, `dueDateLabel`, `timingMarks` to `EditGoalStep`/`EditGoalSubStep` (D4).
- [x] In `buildEditGoalSteps`, call `buildDateDepChips` and set `isCompleted: root.status === StepStatus.completed` for **both** root steps and sub-steps (D11).
- [x] Add `buildTimingCandidates(stepRows, t, language, now)` — one flat pass over every step+sub-step, producing the `1/2/3/a/b/c`-labelled candidate list per step, with cycle omission (D8) and `marks` derived from it (D9). Reuses the already-computed `resolveStepDependencyBand` result per step (D10) rather than re-resolving.
- [x] Populate `dueDate`/`afterStepId` (`timingValue`) via `dateIsoToLocalDayKey`/raw `afterStepId` from the row.

### Step 3: Add the copy surface and remove the banner

**Files**: `apps/native-rd/src/i18n/resources/{en,de,pseudo}/editGoal.json`, `apps/native-rd/src/screens/EditModeScreen/editGoalCopy.ts`, `apps/native-rd/src/components/EditGoalView/EditGoalView.tsx`, `EditGoalView.styles.ts`
**Commit**: `feat(native-rd): add StepTimingEditor copy, retire datesInfo banner (#576)`
**Changes**:

- [x] Add `editor.timing.{whenPrompt, question, intentSub, dependsOn, nothing, noCandidates, clear, doneSuffix, orderingNote, unsetA11yLabel, setA11yLabel, unsetLabel, doneSuffixA11y, previousMonth, nextMonth, legend, marksA11ySuffix_one, marksA11ySuffix_other}` to en/de/pseudo `editGoal.json` (D13).
- [x] Remove `editor.datesInfo` from all three locale files.
- [x] Remove `datesInfoText` from `EditGoalCopyProps`/`buildEditGoalCopy`; add the new copy props, reusing `editGoal:stepList.dateDepChips.after`/`.due` and `editGoal:actions.done` where identical (D13).
- [x] Delete `datesInfoText` prop + default + render block from `EditGoalView.tsx` (D14); delete `infoBanner*` styles from `EditGoalView.styles.ts`; fix the stale `:237` comment.

### Step 4: Mount `StepTimingEditor` in the rows

**Files**: `EditGoalStepRow.tsx`, `EditGoalSubStepRow.tsx`, `EditGoalStepList.tsx`, `EditGoalSubStepList.tsx`, `EditGoalView.tsx`
**Commit**: `feat(native-rd): mount StepTimingEditor in Edit Goal rows (#576)`
**Changes**:

- [x] Add `onCommitTiming`/`onClearTiming` (id-bound, mirroring the existing `onEditTiming` binding pattern) and the new copy props to `EditGoalStepRow`/`EditGoalSubStepRow` and both list components; forward through `EditGoalView`.
- [x] In each row, render `<StepTimingEditor expanded onExpandedChange={...} .../>` instead of `<EditGoalTimingLine>` when `isTimingExpanded` (D1-D3); keep `EditGoalTimingLine` for the collapsed case.
- [x] `onExpand` left `undefined` (D12).

### Step 5: Wire `EditModeScreen` to `updateStep`

**Files**: `EditModeScreen.tsx`
**Commit**: `feat(native-rd): wire StepTimingEditor commits to updateStep (#576)`
**Changes**:

- [x] `expandedTimingStepId` state + `justFailedCommitRef`.
- [x] `handleCommitTiming(stepId, draft)`: convert `draft.dueDate` via `localDayKeyToDateIso` (alert + keep open on conversion failure, matching D6); `runEvoluMutation(() => updateStep(...), onFailure)` per D7; collapse only on success.
- [x] `handleClearTiming(stepId)`: same pattern, all four fields nulled.
- [x] Wire `onEditTiming={(id) => setExpandedTimingStepId(id)}`.
- [x] Pass `expandedTimingStepId`, the handlers, and the new copy (from Step 3) into `<EditGoalView>`.

### Step 6: Tests

**Files**: `EditModeScreen.test.tsx`, `FocusModeScreen.test.tsx`, `localDay.test.ts`
**Commit**: `test(native-rd): cover StepTimingEditor wiring, candidates, and the waiting-completes guardrail (#576)`
**Changes**:

- [x] Candidate list: `test.each` for self-exclusion, cycle omission, sub-step inclusion, empty-goal case.
- [x] Commit/clear handlers: success collapses + writes correct fields; `{ ok: false }` and thrown-error paths both alert and keep the editor open (assert via `expandedTimingStepId`/re-query, not internal state); register-exclusivity (setting `after` nulls waiting columns; date-only commit does not).
- [x] Sub-step `dateDepChips`/`isCompleted` now render (extend the existing "date/dependency chips" describe block to sub-steps).
- [x] Banner absence: assert `datesInfo`'s English string is not on screen.
- [x] `FocusModeScreen.test.tsx`: a step with `waitingOnLabel` set shows a live complete action; completing it calls `completeStep` with no dependency-field argument.

## Testing Strategy

- [x] Unit tests for `localDay.ts`'s two new functions (Jest 30, `test.each` for boundary cases).
- [x] Integration tests in `EditModeScreen.test.tsx` mirroring the existing "date/dependency chips" `describe` block's style (mock `../../../db`, assert on rendered text/queries, not internals).
- [x] Regression test in `FocusModeScreen.test.tsx` per the issue's own Acceptance line.
- [x] Run `bun run test --testPathPatterns "EditModeScreen|FocusModeScreen|localDay|locale-parity"`.
- [x] Manual: `npx expo run:ios`, set/edit/clear `after` + due date on a root step and a sub-step, confirm the chip updates and Timeline/Focus read the same wording.
- [x] Manual: force a write failure (e.g. temporarily throw in a local `updateStep` stub) and confirm the alert appears and the editor stays open.

## Not in Scope

| Item                                                                                                                                 | Reason                                                                                                                                                                  | Follow-up                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Mounting `StepWaitEditor` in Focus Mode                                                                                              | Component does not exist on disk; #584 is still open and Storybook-only                                                                                                 | New issue once #584 lands, or #584 rescoped to include its own screen wiring                      |
| Deciding register exclusivity across surfaces (issue's Open Question #4: does a future Focus wait-write clear an Edit-Goal `after`?) | Genuinely unsettled product call, named explicitly by the issue as blocking-for-that-write-direction; does not block this PR since Edit Goal never authors `waiting on` | The Focus/wait-editor wiring issue, once #584 lands                                               |
| `listRecentWaitingOnLabels()` / waiting-on suggestion chips                                                                          | Belongs to the wait editor, not this editor                                                                                                                             | Whichever issue wires Focus (#584's own scope already names this)                                 |
| Row-parks-at-top-on-expand scroll behavior                                                                                           | Not in the issue's Acceptance list; needs a new ref threaded through 4 component layers (D12)                                                                           | Follow-up polish issue, or revisit alongside F-3's `useParkRowAtTop` hook from the #573/#574 plan |
| Expand/collapse animation                                                                                                            | `StepTimingEditor` ships un-animated by design (`animationPref` not threaded); out of scope per that component's own doc (F-8, #573/#574 plan)                          | Follow-up issue if/when `useAnimationPref` needs threading here                                   |
| Cycle detection beyond the two-step case; same-goal validation on `afterStepId`                                                      | ADR-0010/0012: guards inform, never refuse; explicitly out of scope per the issue                                                                                       | none — permanent decision                                                                         |
| `MetadataBand` unification across Timeline/Focus/this editor (F-1 from the #573/#574 plan)                                           | Pre-existing debt this PR extends but doesn't create; touching Timeline/Focus is out of scope for this screen-only PR                                                   | Tracked as F-1 already                                                                            |

## Discovery Log

- **[2026-08-20] D5's malformed-key branch cannot route through `dateToDateIso`.**
  The plan had `localDayKeyToDateIso` return whatever `dateToDateIso` gives for a
  bad input, but `dateToDateIso` is `(v) => DateIso.fromParent(v.toISOString())`
  — and `toISOString()` on an invalid `Date` **throws** a `RangeError` instead of
  returning an `Err`. The branch now builds the `Err` directly with Evolu's own
  `err()`, keeping the error shape (`{ type: "DateIso", value }`) so a caller's
  `.ok` check and `formatDateIsoError` both still work.
  Side effect: `src/db/__tests__/mocks/evolu-common.ts` gained `ok`/`err`.

- **[2026-08-20] D4/D13: the editor's inputs and copy each ride one grouped
  field, not six and eighteen loose props.** `EditGoalTiming` (data) and
  `EditGoalTimingCopy` (copy) still ride the step object / the view's prop
  surface exactly as D4 wanted — the rejected alternative was a side-channel or
  render prop, which these are not. Grouping is the same call `StepTimingEditor`
  itself already makes for `gridCopy`, and it keeps ~24 props from being threaded
  through four layers by hand. `whenPromptLabel` stays loose: the unset prompt is
  shared with the read-only line, and one prompt means one prop.

- **[2026-08-20] The swap lives in a shared `EditGoalRowTiming`, not duplicated
  in both rows (D1/D2).** Both row shapes render the same two-state slot, so the
  swap, its mount preconditions and the collapse plumbing exist once, one level
  below the rows. D1's decision (swap in place, never both) and D2's (the
  embedding belongs at the row layer, not the list) are unchanged.

- **[2026-08-20] D10 reached a better way: the editor's raw fields are derived
  from the candidate list, so `resolveStepDependencyBand` is not called a second
  time at all.** `afterStepTitle`, `afterStepIsCompleted` and the draft's
  `afterStepId` all come from the selected candidate. Which also settles a case
  the plan did not name: a dependency that resolves to **no offered candidate**
  (deleted target, or the far side of a mutual two-step cycle) seeds the draft as
  `null`. The picker and what `Done` commits can then never disagree — the
  alternative was committing an id the user was never shown.

- **[2026-08-20] Sub-step candidate letters run goal-wide, not per parent
  (refines D8).** Per-parent lettering gives two different rows the badge "a",
  and those same badges are the marks on the shared month grid, where a
  duplicate is unreadable. Sub-rows display no ordinal of their own in Edit Goal,
  so there is nothing for per-parent lettering to line up with anyway.

- **[2026-08-20] `now` comes back out of the steps memo.** `StepDayGrid` is
  memoised and its own doc forbids an inline `now={new Date()}`; passing the same
  instant the rows were built from keeps the memo and means the open editor and
  the list around it judge "today" identically. One clock per screen, not two.

- **[2026-08-20] The `· done ✓` suffix now renders — in the editor only.**
  `afterStepIsCompleted` is threaded (D10 listed it) and `editor.timing.doneSuffix`
  translates it. `StepTimingEditor`'s doc notes that making the suffix _canonical_
  is a change to Focus, Timeline and the resolver together; this is the opt-in
  the component was built for, not that change. `readOutParity.test.tsx` still
  pins the default (suffix-free) render, so the cross-surface contract is intact.

- **[2026-08-20] i18n key names differ from the plan's sketch:**
  `rowUnsetA11yLabel` / `rowSetA11yLabel` (the collapsed line, which names the
  step) and `editorUnsetA11yLabel` (the editor's own line, which does not), plus
  `doneSuffixA11y`. The plan's `unsetA11yLabel` / `setA11yLabel` / `unsetLabel`
  did not distinguish the two surfaces.

- **[2026-08-20] `jest.clearAllMocks()` does not reset mock _implementations_.**
  A sticky `mockImplementation(() => { throw })` in one failure test leaked into
  every later test in `EditModeScreen.test.tsx` and broke the
  collapse-after-failure assertion. All failure mocks in the new block use the
  `...Once` variants. Worth knowing before the next failure test is written here.

### Review pass (2026-08-20)

Two-axis review (`/code-review since 6470448`). Everything actionable was fixed
in-branch; nothing was deferred silently.

- **Spec, real bug — a date-only commit deleted an unshown dependency.** Seeding
  the draft through the candidate list (see the D10 entry above) meant a
  dependency the editor cannot offer seeded as `nothing`; committing the draft
  wholesale then wrote `afterStepId: null` over a live dependency the row's chip
  was still showing. `Done` now commits a **diff against the seed** —
  `undefined` is `updateStep`'s "don't touch" — so an untouched draft is a close
  rather than a write, dating a step never touches its dependency, and the
  deleted-target case does the cleanup write the issue says it doesn't need:
  none. Picking `nothing` still clears, because that was asked for.
- **Standards, a11y regression — the swap dropped accessibility focus.** Both
  directions unmount the element the user just activated, and pre-#576 the line
  never unmounted, so this was ours. Fixed with an opt-in `focusOnMount` on
  `StepTimingEditor` and `EditGoalTimingLine`, armed by `EditGoalRowTiming` only
  after the row has actually toggled. Two tests pin it (both fail without it).
- **Standards, data clumps + duplicated code.** The seven timing props became
  one `EditGoalTimingHost`; `bindRowTiming` replaced the identical
  three-ternary id-binding in both list layers; `writeTiming` folded back into
  `updateStepFields`; `buildTiming` stopped re-deriving the day and label its own
  `TimingEntry` already held.
- **Standards, missing test file.** `EditGoalRowTiming` now has one (AGENTS.md §
  Architectural Rules #3) plus its barrel export.
- **Noted, not changed:** `dateIsoToLocalDayKey` returns `string | null`, not
  D5's `string` — a corrupt row degrades to "no day set" rather than to
  `"NaN-NaN-NaN"`.
- **Noted, spec-sanctioned, worth a second look:** `Clear` nulls
  `waitingOnLabel` / `waitingOnExpectedAt` on a row whose wait the expanded
  editor deliberately hides (the issue's own Writes table: "Clear dep:
  `afterStepId: null`, `waitingOnLabel: null`, `waitingOnExpectedAt: null`").
  It is an explicit destructive action on the row's whole timing, so it was left
  as specified — but it is the one remaining path that can remove something the
  editor never displayed.

## Follow-ups

| Item                                                       | Where it goes                                             |
| ---------------------------------------------------------- | --------------------------------------------------------- |
| Mount a wait editor in Focus Mode                          | Blocked on #584 (component still not on disk)             |
| Row-parks-at-top-on-expand (`onExpand`, D12)               | New polish issue, or revisit with F-3's `useParkRowAtTop` |
| Expand/collapse animation (`animationPref` threading, F-8) | New issue if/when it is wanted                            |
| Register exclusivity across surfaces (issue's OQ #4)       | The Focus wait-editor issue                               |
