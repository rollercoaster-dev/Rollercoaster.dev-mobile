# Development Plan: Issue #571

## Issue Summary

**Title**: [Foundation] Neutral past-tense expected date (`was expected`)
**Type**: feature (foundation, no UI)
**Complexity**: SMALL
**Estimated Lines**: ~70–90 lines

> **Scope reduced from the issue as written.** The issue's first half — a `dueIsSoft`
> column to store a soft "sometime" intent — is **dropped**. See [Rescope](#rescope-soft-sometime-is-dropped)
> below for the reasoning. What remains is the issue's second half: the neutral
> past-tense reading of a passed `waitingOnExpectedAt`.

## Rescope: "soft sometime" is dropped

The issue asks for a way to store "soft intent with no day attached", citing **B-soft**
from `docs/plans/phase-b-feature-shapes.md` §B: Planning. Three problems with that
justification, in increasing order of severity:

1. **The cited section did not exist.** At the time the issue was written,
   `phase-b-feature-shapes.md` contained only `## A: Substeps`, `## E: Step states`,
   and `## C: Dependencies`; §B: Planning was marked `Stage 3 | Not started`. It now
   exists — written in this branch to record the decision below — so the citation
   resolves, but to the opposite conclusion.

2. **"Sometime" is not what B-soft means.** The research defines B-soft as soft
   scheduling — _"for Tuesday", not "due Tuesday"_ — and its entire ND payoff depends
   on a day being present: _"soft placement creates a Tuesday that wouldn't otherwise
   exist — a foothold in time itself"_ (`docs/research/step-model-gap.md:52`, restated
   at `:173`). A "sometime" with no day creates no foothold. It is the exact case
   B-soft is contrasted against.

3. **The state is already representable.** A step either has a due date or it does
   not. "Sometime" is the second of those, which `dueAt: null` already expresses.
   Adding `dueIsSoft` would encode one three-state field across two columns with a
   legal-but-invalid combination (both set), requiring a resolver precedence rule and
   a write-path invariant deferred to a future issue — all to distinguish two states
   that are the same state.

**Consequence for Epic #570**: the prototype's date sheet has a `Sometime` /
`On a date` segmented control (`Set BC B Prototype.dc.html:166-167`) with a `Clear`
button beside it (`:183`). Under this decision the toggle collapses — the sheet is a
day picker plus `Clear`, and `Clear` _is_ "sometime". The B1/B2/B3 authoring issues
need updating to match; that is not this PR's work.

## Intent Verification

- [ ] A step with `waitingOnExpectedAt` before the resolver's injected `now` renders "waiting on {{who}} · was expected {{date}}" in Timeline, the Focus meta suffix form, and "{{who}} · was {{date}}" in the Edit Goal chip.
- [ ] The same step with `waitingOnExpectedAt` after `now` renders unchanged ("waiting on {{who}} · expected {{date}}").
- [ ] `resolveStepDependencyBand`'s pure function signature takes `now: Date` as an explicit parameter — grep confirms no `Date.now()` / `new Date()` call inside the function body itself.
- [ ] A step with every date field null still renders no band/chip row anywhere (regression check on existing #454 behavior).
- [ ] No new schema column is added; `git diff src/db/schema.ts` is empty.

## Dependencies

| Issue | Title                                                                    | Status                               | Type                                                     |
| ----- | ------------------------------------------------------------------------ | ------------------------------------ | -------------------------------------------------------- |
| #454  | Schema: step dependency + due-date fields to back the C·B band           | ✅ Merged (closed)                   | Prior art — this issue extends its resolver/read-sites   |
| #570  | Epic: Set B & C authoring — set a step's date, `after`, and `waiting on` | 🟡 Open (parent epic, not a blocker) | Tracking only — needs the date-sheet rescope noted above |

**Status**: ✅ All dependencies met.

## Objective

Give the `waitingOnExpectedAt` read path a neutral past-tense wording ("was expected …")
when that date has passed. Resolver + read surfaces + i18n only — no schema change, no
authoring UI (that's B1/B2/B3/C1 per the issue's "must not do").

## Decisions

| ID  | Decision                                                                                                                                                                                                                                                        | Alternatives Considered                                                       | Rationale                                                                                                                                                                                                                                                                                                                                                                             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **No `dueIsSoft` column.** "Sometime" is `dueAt: null`.                                                                                                                                                                                                         | A `dueIsSoft: nullOr(Int)` flag; a `dueMode` enum (`"none"\|"soft"\|"date"`). | See [Rescope](#rescope-soft-sometime-is-dropped) — the cited justification (`phase-b-feature-shapes.md` §B: Planning) does not exist, and the research's actual B-soft (`step-model-gap.md:52`) requires a day to be present. Two columns for a three-state field with one invalid combination is strictly worse than one nullable date.                                              |
| D2  | Extend `StepDependencyBand` with one **derived boolean**, `waitingOnExpectedIsPast: boolean`. All other fields stay raw pass-through, unchanged.                                                                                                                | Have each call site compare the date itself.                                  | This is fact-computation, not formatting — exactly what the resolver's own doc comment already claims ownership of (`queries.ts:508-513`, "raw… callers format"). Three call sites repeating a date comparison is the duplication the resolver exists to prevent.                                                                                                                     |
| D3  | `resolveStepDependencyBand` gains a third required parameter, `now: Date`, used only to compute `waitingOnExpectedIsPast`. No default value — callers must supply it explicitly.                                                                                | Default `now: Date = new Date()` inside the resolver.                         | Rejected by the issue's own acceptance criterion ("do not read `Date.now()` in the pure resolver — pass 'now' in"). The three impure call sites already sit inside React render/memo scopes where `new Date()` is unremarkable.                                                                                                                                                       |
| D4  | `waitingOnExpectedIsPast` is `true` iff `new Date(waitingOnExpectedAt).getTime() < now.getTime()` (strict less-than); a `waitingOnExpectedAt` equal to `now` is **not** past.                                                                                   | `<=` (equal counts as past).                                                  | Strict `<` is the more conservative "hasn't happened yet" reading and gives a stable boundary for tests pinned to an exact fixed clock. No ADR governs this edge case; documented here because the issue asks for the boundary to be tested.                                                                                                                                          |
| D5  | New i18n keys added only to `en/*.json` (+ `_register/*.yml` notes) in this PR; `pseudo/*.json` regenerated via `bun run gen:pseudo`; `de/*.json` is **not** hand-edited.                                                                                       | Hand-translate `de/` now.                                                     | Repo-wide, restated in multiple prior plans (issue-396 D6, issue-453 D3): `.github/workflows/i18n-sync.yml` owns `de/` and overwrites hand-written non-`en` values; this issue's own body says the same.                                                                                                                                                                              |
| D6  | Focus Mode's past-tense meta suffix gets its own key, `wasExpectedMeta: "· was expected {{date}}"`, mirroring the existing `waitingOnExpectedMeta: "· expected {{date}}"` split-suffix pattern rather than reusing Timeline's whole-sentence `wasExpected` key. | Reuse one `wasExpected` key shape across Timeline and Focus.                  | Focus Mode's `MetadataBand` already splits the waiting-on line into a full-sentence `text` + a separate mono `meta` node by design (`FocusCurrentTaskCard.parts.tsx:74-82`, "typographic, not grammatical" split) — the present-tense pair already has two keys for exactly this reason, so the past-tense pair needs the same two-key shape to stay consistent within the namespace. |

## Affected Areas

- `src/db/queries.ts`: `StepDependencyBand` gains `waitingOnExpectedIsPast: boolean`; `resolveStepDependencyBand` gains the `now: Date` param and D4 logic.
- `src/components/TimelineStep/TimelineStep.tsx` + `TimelineStep.parts.tsx`: `TimelineStepData.waitingOn` gains `isPast?: boolean`; `MetadataBand`'s `cLine` picks the `wasExpected` key.
- `src/components/FocusCurrentTaskCard/FocusCurrentTaskCard.types.ts`, `.tsx`, `.parts.tsx`: same shape addition, using the meta-suffix key split (D6).
- `src/screens/TimelineJourneyScreen/TimelineJourneyScreen.tsx`, `src/screens/FocusModeScreen/FocusModeScreen.tsx`: pass `now` into the resolver, map `band.waitingOnExpectedIsPast` into the new prop.
- `src/screens/EditModeScreen/editGoalSteps.ts`: `buildDateDepChips` threads `now`, adds the `wasExpected` chip text branch (still the `"waiting"` tone — no new `EditGoalChipTone` value).
- `src/i18n/resources/en/{timelineJourney,focusMode,editGoal}.json` (+ matching `_register/*.yml` notes); `pseudo/*.json` regenerated.
- `src/db/__tests__/queries.step.test.ts`: extend the existing `resolveStepDependencyBand` `test.each` cases with the new field; add past/future/boundary cases.

**Not touched**: `src/db/schema.ts`, `updateStep` (no new field to carry).

## Implementation Plan

### Step 1: Resolver

**Files**: `src/db/queries.ts`
**Commit**: `feat(native-rd): flag a passed waitingOnExpectedAt in the C·B band (#571)`
**Changes**:

- [ ] `StepDependencyBand`: add `waitingOnExpectedIsPast: boolean`; update the interface doc comment.
- [ ] `resolveStepDependencyBand(step, goalSteps, now: Date)`: compute `waitingOnExpectedIsPast` (D4 strict `<`); `false` whenever `waitingOnExpectedAt` is null.

### Step 2: Timeline read surface

**Files**: `src/components/TimelineStep/TimelineStep.tsx`, `.parts.tsx`, `src/screens/TimelineJourneyScreen/TimelineJourneyScreen.tsx`
**Commit**: `feat(native-rd): Timeline reads a passed expected date as "was expected" (#571)`
**Changes**:

- [ ] `TimelineStepData.waitingOn` gains `isPast?: boolean`.
- [ ] `MetadataBand`'s `cLine`: when `waitingOn.expected` is set, branch on `waitingOn.isPast` to pick `step.metadata.wasExpected` vs the existing `waitingOnExpected`.
- [ ] `TimelineJourneyScreen.tsx`: pass a single `now = new Date()` (memoized per render pass, not per step) into `resolveStepDependencyBand`; map `band.waitingOnExpectedIsPast` into the new prop.

### Step 3: Focus Mode read surface

**Files**: `src/components/FocusCurrentTaskCard/*`, `src/screens/FocusModeScreen/FocusModeScreen.tsx`
**Commit**: `feat(native-rd): Focus Mode reads a passed expected date as "was expected" (#571)`
**Changes**:

- [ ] Same prop addition as Step 2, adapted to `FocusCurrentTaskCard.types.ts`'s existing `waitingOn` prop shape.
- [ ] `MetadataBand`'s waiting-on `meta`: branch on `isPast` to pick `wasExpectedMeta` vs `waitingOnExpectedMeta` (D6).
- [ ] `FocusModeScreen.tsx`: wire `now` and `waitingOn.isPast` through the existing `band` `useMemo`.

### Step 4: Edit Goal chips

**Files**: `src/screens/EditModeScreen/editGoalSteps.ts`
**Commit**: `feat(native-rd): Edit Goal chip reads a passed expected date as "was" (#571)`
**Changes**:

- [ ] `buildDateDepChips` takes/threads a `now: Date` param from its caller (`buildEditGoalSteps`).
- [ ] Waiting-on chip branch: when `band.waitingOnExpectedIsPast`, use `editGoal:stepList.dateDepChips.wasExpected` ("{{who}} · was {{date}}", per the issue's literal copy) instead of `waitingOnExpected`.

### Step 5: i18n keys

**Files**: `src/i18n/resources/en/{timelineJourney,focusMode,editGoal}.json`, matching `_register/*.yml`, regenerated `pseudo/*.json`
**Commit**: `i18n(native-rd): add wasExpected keys for a passed expected date (#571)`
**Changes**:

- [ ] `en/timelineJourney.json` → `step.metadata.wasExpected: "waiting on {{who}} · was expected {{date}}"`.
- [ ] `en/focusMode.json` → `currentTask.metadata.wasExpectedMeta: "· was expected {{date}}"`.
- [ ] `en/editGoal.json` → `stepList.dateDepChips.wasExpected: "{{who}} · was {{date}}"`.
- [ ] Append a short note to each `_register/*.yml` for the de translator: "was expected" states a fact, never "overdue" / urgency (ADR-0012).
- [ ] Run `bun run gen:pseudo` to regenerate all three `pseudo/*.json` files. Do not touch `de/*.json`.

### Step 6: Tests

**Files**: `src/db/__tests__/queries.step.test.ts`, plus render tests for `TimelineStep`, `FocusCurrentTaskCard`, `EditGoalStepRow`/`EditModeScreen`
**Commit**: `test(native-rd): cover past/future waitingOnExpectedAt boundary (#571)`
**Changes**:

- [ ] Update the existing `resolveStepDependencyBand` `test.each` expectations (`queries.step.test.ts:735-825`) to include `waitingOnExpectedIsPast: false`.
- [ ] Add cases: `waitingOnExpectedAt` before a fixed `now` → `true`; equal to `now` → `false` (D4 boundary); after `now` → `false`; null → `false`.
- [ ] One render-level test per surface (Timeline, Focus, Edit Goal) asserting the "was expected" / "· was expected" / "{{who}} · was {{date}}" text appears under a fixed clock, and that the future case is unchanged.

## Testing Strategy

- [ ] Unit tests for `resolveStepDependencyBand` in `src/db/__tests__/queries.step.test.ts` (Jest 30, existing `test.each` pattern).
- [ ] Render tests in each surface's existing test file using `@testing-library/react-native` v13 — assert on rendered text, not implementation detail.
- [ ] All date-comparison tests pass a fixed `now: Date` literal — no test reads the real system clock.
- [ ] Manual testing: not applicable — no authoring UI ships in this PR.

## Not in Scope

| Item                                                 | Reason                                                                                           | Follow-up                                                        |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| A `dueIsSoft` / "sometime" column                    | Dropped — see [Rescope](#rescope-soft-sometime-is-dropped). `dueAt: null` already is "sometime". | Epic #570's date sheet drops the `Sometime` / `On a date` toggle |
| Date-sheet authoring UI                              | Explicitly excluded by the issue ("No authoring UI — that is B1/B2/B3/C1")                       | Epic #570's B1/B2/B3/C1 sub-issues                               |
| Recurrence / repeat field                            | Explicitly excluded by the issue ("No recurrence field")                                         | Noted below for the future column's attachment point             |
| Hand-translating `de/*.json` for the new keys        | Owned by the `i18n-sync` CI bot per D5                                                           | None — automatic on next PR sync                                 |
| "Overdue" / red / urgency styling for a past `dueAt` | Out of scope; the `due` band carries no urgency per ADR-0012, unchanged here                     | None                                                             |

**Where recurrence would attach**: a future `step.recurrenceRule` (or similar) column
would sit alongside `dueAt` / `waitingOnExpectedAt` in the `step` table, following the
same additive nullable-column pattern as `#454` — no schema change is needed now, this
is purely a note for the future issue. Per ADR-0011 the repetition is expected to live
in the phone's calendar rather than in a column at all.

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->
