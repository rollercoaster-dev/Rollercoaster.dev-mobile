# Development Plan: Issue #577

## Issue Summary

**Title**: [Verify] Set B and C close-out — 7-theme walkthrough + ADR-0012 compliance sweep
**Type**: test / verification (close-out for Epic #570)
**Complexity**: MEDIUM
**Estimated Lines**: ~350-450 lines (test-only; no production code changes)

**Rescope note, verified against disk (2026-08-23):** the issue's own text is stale in the
same way #576's was — it still says "Both sheets." There are no sheets on disk today:
`StepTimingEditor` (#573, merged #585) is an **in-row** expand/collapse editor with no
`Modal`/scrim, and the two "chip tiers" are `EditGoalTimingLine`'s set (chips) and unset
(`＋ when?` ghost) states (#575, merged #587; see file doc,
`EditGoalTimingLine.tsx:1-19`). This plan reads "sheets" as "the two authoring surfaces"
(`StepTimingEditor`'s in-row editor + `StepDayGrid`'s grid) and proceeds; the issue's own
wording is not itself something a PR fixes.

**This is a `hitl`, `size:s` verify issue.** Most of its acceptance surface (render
correctness per-theme, VoiceOver behavior, side-by-side screenshots) is only checkable by
a human on-device/in-Storybook and is **not attempted by this plan** — it is handed back as
the Manual Verification Checklist at the end. What follows is the code-answerable subset:
closing real gaps found in the existing automated guardrails, plus the issue's own named
code deliverable ("Update the e2e tests to include the new features").

## Intent Verification

- [ ] `bun run test --testPathPatterns "forbiddenCopy|readOutParity|contrast"` is green,
      and the forbidden-copy sweep now scans `EditGoalView` and `TimingMarkIcon` (it
      scanned only `StepTimingEditor`/`StepDayGrid` before this PR).
- [ ] The six named timing shapes (`after`, `waiting`+future, `waiting`+past, `due`,
      none/cleared, `waiting`+`due` together) each render **identical wording** on
      Timeline, Focus, and the Edit Goal row chip, driven from one
      `resolveStepDependencyBand` call per shape — not compared against a hand-copied
      string on each surface.
- [ ] `success` (after) and `warning` (waiting) resolve to visibly different colors in
      every one of the 14 themes (2 modes × 7 variants), not just AA-against-background —
      a regression that desaturates them to the same gray in `autismFriendly` now fails a
      test instead of only showing up in a screenshot.
- [ ] `bun run test:e2e:required` exercises the in-row `StepTimingEditor`'s `depends on`
      authoring path at least once (today it exercises zero B/C surface).
- [ ] A reviewer reading this plan's Manual Verification Checklist can execute it
      without re-deriving which parts are already covered by unit tests and which are not.

## Dependencies

| Issue | Title                                                | Status                        | Type    |
| ----- | ---------------------------------------------------- | ----------------------------- | ------- |
| #576  | Wire the in-row editor + wait editor to `updateStep` | ✅ Closed/merged (#590)       | Blocker |
| #571  | Neutral past-tense expected date (`was expected`)    | ✅ Closed/merged (#579, #585) | Blocker |

**Status:** ✅ All dependencies met. The issue body's own "BOTH ARE NOW CLOSED/MERGED. Not
blocked." is confirmed independently (`gh issue view 576/571` → both `CLOSED`).

## Objective

Close a real gap in the ADR-0012/read-parity automated guardrails that #573-#576 built,
add the e2e coverage the epic never got for its own newest surface, and hand back a
tight, unambiguous manual checklist for the parts that can only be judged on-device.

## Decisions

| ID  | Decision                                                                                                                                                                                                                                                                                                                                                                                                | Alternatives Considered                                                                                                                                                                        | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | "Confirm no literal hex" is **already fully enforced** by the `local/no-raw-colors` ESLint rule, which as of the hardening documented at `src/__tests__/eslint-rules/no-raw-colors.test.ts:10-11` covers **every** `.styles.ts`/`.styles.tsx` file, components and screens alike (`src/eslint-rules/no-raw-colors.js:26-33`). `bun run lint` on the diff is the whole check; no new tooling is written. | Write a bespoke grep script per the #383/#412/#463 dev-plan precedent (those predate the rule's hardening).                                                                                    | The rule supersedes the grep idiom; `bun run lint` on the repo today is 0 errors (verified), so the new B/C files already pass. Re-grepping would duplicate a live gate.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| D2  | The ADR-0012 forbidden-copy guard (`StepTimingEditor/__tests__/forbiddenCopy.test.ts`) is extended to scan **`EditGoalView` and `TimingMarkIcon`**, not left at its current `StepTimingEditor`/`StepDayGrid` scope (`forbiddenCopy.test.ts:35`).                                                                                                                                                        | Leave the guard as-is; rely on `TimelineStep.test.tsx`'s own inline "never blocked by/overdue" assertions (lines 173-262) for the read surfaces.                                               | The row-level chip (`EditGoalTimingLine`/`EditGoalRowTiming`) and the shared `TimingMarkIcon` carry planning copy too and are **not** covered by any forbidden-word guard today (verified: `TimelineStep` has its own inline checks; `EditGoalView`/`TimingMarkIcon` have none). A source scan of these dirs today is clean (spot-checked with `rg -niE "\b(blocked\|overdue\|missing\|needed\|deadline\|late)\b"`, all hits are comments, which the existing stripper already discards) — this closes the gap without changing behavior.                                                                                                                                                                                                                                                                                                                    |
| D3  | Add a **`waiting`-tone example** to `EditGoalStepRow.stories.tsx`'s `AllThemesMatrix` (currently `after`+`due` only, line 345).                                                                                                                                                                                                                                                                         | Leave it; rely on `FocusCurrentTaskCard.stories.tsx`'s `StatesAllThemes` story, which already renders `waitingOn` across all 7 themes (line 221).                                              | The issue's own render-correctness bullet names "the ghost tier's hardest case" and "the `waiting` amber and `after` green must stay distinguishable" for **both sheets and both chip tiers** — Focus's matrix covers the amber/green pair, but the Edit Goal row's matrix (the newer, #575/#576 surface) does not. A reviewer walking Storybook today cannot see the row's `waiting` tone next to its `after` tone side-by-side in any theme. This is the one render-correctness gap a human walkthrough would actually hit.                                                                                                                                                                                                                                                                                                                                |
| D4  | Add an **automated distinguishability regression** on the axis that actually separates these two tokens: **hue**, not luminance. For every theme in `themeNames` (`src/themes/compose.ts`): `colors.success !== colors.warning`, HSL hue separation **≥ 60°**, and both saturations **≥ 0.15**.                                                                                                         | Assert a luminance contrast floor between the two, e.g. `getContrastRatio(success, warning) >= 1.3`.                                                                                           | **Measured, all 7 themes**: success-vs-warning luminance ratios are `light-default` 1.72, `dark-default` **1.15**, `light-highContrast` **1.18**, `light-dyslexia` 1.96, `light-autismFriendly` 1.49, `light-lowVision` 1.29, `light-lowInfo` 1.29 — so a 1.3:1 floor **fails 3 of 7 themes today** and any floor that passes (≤1.15) is too slack to catch anything. Green and amber are separated by hue, not lightness, by design. Hue separation measured: 131/115/138/102/113/87/87 degrees (min 87°) with saturations 0.21–1.00 (min 0.21, `light-autismFriendly`) — a 60°/0.15 floor passes every theme with real margin and is exactly what a desaturation-toward-the-same-gray regression would break. `src/utils/accessibility.ts` exports no HSL helper (only `getContrastRatio`/`meetsWCAG`, lines 49-125), so the test defines a local `hsl()`. |
| D5  | Extend `readOutParity.test.tsx` to add **`FocusCurrentTaskCard`** as a third rendered surface (today: Timeline vs. editor only) and the **four missing shapes** — `waiting`+future, `waiting`+past, `due`+`waiting` together, and none/cleared — driven from one shared `resolveStepDependencyBand(step, rows, now)` call per shape, feeding all three surfaces' own formatting.                        | Duplicate the six shapes as three separate per-screen `test.each` blocks (already true in `FocusModeScreen.test.tsx`/`TimelineJourneyScreen.test.tsx`/`EditModeScreen.test.tsx` individually). | Per-screen tests already exist for 5 of these 6 combinations (verified: Focus and Timeline both have future/past `waitingOnExpectedAt` cases; `queries.step.test.ts` covers the resolver's `waitingOnExpectedIsPast` boundary) — but **nothing compares the three surfaces to each other** the way the issue's "any mismatch is an input bug, not a read bug" framing asks for. `readOutParity.test.tsx` is the one file built for exactly this comparison; it just stopped after `after`+`due`. Extending it (rather than adding parallel per-screen tests) is what actually tests parity instead of three copies of the same fixture agreeing with themselves.                                                                                                                                                                                             |
| D6  | The new Maestro flow scopes to **`depends on` authoring only** — no due-date (`StepDayGrid`) tap.                                                                                                                                                                                                                                                                                                       | Author both a dependency and a due date in the same flow, matching the issue's six-shape list.                                                                                                 | `StepDayGrid` addresses day cells by literal `${testID}-day-${YYYY-MM-DD}` computed from the **live** `now` (`StepDayGrid.tsx:55,240`) — there is no "today" alias testID and no precedent in this suite for Maestro deriving a live calendar date (no `runScript`/date-injection idiom exists in `e2e/`). Candidates in the `DependencyPicker`, by contrast, are addressed the same way `full-ride.yaml` already addresses the nest-under picker: `id` regex + `index`, or by the row's own stable `accessibilityLabel` text (the candidate's title, authored by the flow itself) — fully deterministic today. Forcing the date path in would mean inventing a new testing seam under `hitl`/`size:s` budget; tracked as a follow-up instead (Not in Scope).                                                                                                |
| D7  | **No production `testID` is added to `StepDayGrid` for e2e's benefit.** The date-authoring e2e path stays deferred as D6 already has it.                                                                                                                                                                                                                                                                | Add a `-day-today` alias testID so a Maestro flow can tap today deterministically.                                                                                                             | Nothing in this suite adds a production seam purely for e2e: `full-ride.yaml` addresses every picker it drives through testIDs and `accessibilityLabel`s that exist for a11y reasons first. Adding a synthetic alias would be net-new production surface under a `hitl`/`size:s` verify issue whose own Deliverable is findings, not seams. If e2e date-authoring is wanted later it gets its own issue, which is where the seam's shape should be argued.                                                                                                                                                                                                                                                                                                                                                                                                   |

## Affected Areas

- `apps/native-rd/src/components/StepTimingEditor/__tests__/forbiddenCopy.test.ts`: widen `COMPONENT_DIRS` to include `EditGoalView`, `TimingMarkIcon`.
- `apps/native-rd/src/components/EditGoalView/EditGoalStepRow.stories.tsx`: add a `waiting`-tone row to `AllThemesMatrix`.
- `apps/native-rd/src/themes/__tests__/contrast.test.ts`: add a `success`/`warning` cross-theme distinguishability `test.each`.
- `apps/native-rd/src/components/StepTimingEditor/__tests__/readOutParity.test.tsx`: add `FocusCurrentTaskCard` as a rendered surface and the four missing timing shapes.
- `apps/native-rd/e2e/flows/step-timing-editor.yaml` (new): `depends on` authoring, in-row, read back on Timeline.
- `apps/native-rd/e2e/README.md`: add the new flow to the Current Flows table.

## Implementation Plan

### Step 1: Widen the ADR-0012 forbidden-copy guard

**Files**: `src/components/StepTimingEditor/__tests__/forbiddenCopy.test.ts`
**Commit**: `test(native-rd): extend forbidden-copy guard to EditGoalView and TimingMarkIcon (#577)`
**Changes**:

- [ ] Add `"EditGoalView"` and `"TimingMarkIcon"` to `COMPONENT_DIRS` (line 35).
- [ ] Run the suite; confirm it stays green (source scan today is clean — verified by hand).
- [ ] Update the file's doc comment: it currently frames the guard as scoped to
      "these components" (`StepTimingEditor`/`StepDayGrid`); note the widened scope and why
      (D2).

### Step 2: Add the missing `waiting`-tone matrix example

**Files**: `src/components/EditGoalView/EditGoalStepRow.stories.tsx`
**Commit**: `test(native-rd): add a waiting-tone row to EditGoalStepRow's AllThemesMatrix (#577)`
**Changes**:

- [ ] In `AllThemesMatrix` (line 326), add a third `EditGoalStepRow` per theme cell with
      `dateDepChips: [{ tone: "waiting", text: "waiting on city inspector · expected Jun 24" }]`,
      alongside the existing set/unset pair — matching `FocusCurrentTaskCard.stories.tsx`'s
      `waitingOn` fixture text for consistency.
- [ ] Update the story's doc comment to say the matrix now shows all three tones the row
      can carry.

### Step 3: Automated success/warning distinguishability check

**Files**: `src/themes/__tests__/contrast.test.ts`
**Commit**: `test(native-rd): pin success/warning distinguishability across all theme variants (#577)`
**Changes**:

- [ ] `themeNames`/`themes` are already imported at `contrast.test.ts:8`.
- [ ] Add a test-local `hsl(hex)` helper (no HSL export exists in `src/utils/accessibility.ts`).
- [ ] Add `test.each(themeNames)("%s: success and warning stay distinguishable", (name) => { ... })`:
      assert `success !== warning`, hue separation `>= 60` degrees, and both saturations `>= 0.15`.
- [ ] Doc-comment **why hue and not contrast**: measured luminance ratios run 1.15-1.96 across
      the 7 themes (see D4), so no useful luminance floor exists; hue separation runs 87-138 degrees.
      Cite this issue.

### Step 4: Cross-surface read/write parity — Focus + the four missing shapes

**Files**: `src/components/StepTimingEditor/__tests__/readOutParity.test.tsx`
**Commit**: `test(native-rd): extend read-out parity to Focus and all six B/C timing shapes (#577)`
**Changes**:

- [ ] Add a `renderFocusBand()` helper mirroring `renderTimelineBand()`, rendering
      `FocusCurrentTaskCard` and reading its `after`/`waitingOn`/`due` text nodes back
      (Focus splits `waitingOn` into a lead + a separate `Meta` suffix — join them for
      comparison, matching how `FocusModeScreen.test.tsx` already asserts the pair).
- [ ] Add four fixtures alongside the existing `after`+`due` one, each built from a single
      `resolveStepDependencyBand` call: `waiting`+future, `waiting`+past, `waiting`+`due`
      together, and none (band with everything null → all three surfaces render nothing).
- [ ] For each of the six shapes, assert Timeline, Focus, and the Edit Goal chip
      (`EditGoalTimingLine`, driven by `buildDateDepChips`) all read identically.
- [ ] Keep the existing "copy defaults match the i18n resources" describe block, extended
      with the `waitingOn`/`wasExpected`/`waitingOnExpected` keys for all three namespaces
      (`editGoal`, `timelineJourney`, `focusMode` — exact key names verified against
      `src/i18n/resources/en/{editGoal,timelineJourney,focusMode}.json`).

### Step 5: New Maestro flow — in-row `depends on` authoring

**Files**: `e2e/flows/step-timing-editor.yaml` (new), `e2e/README.md`
**Commit**: `test(e2e): add step-timing-editor flow covering depends-on authoring (#577)`
**Changes**:

- [ ] New `required`-tagged flow: prologue → create a 3-step goal via the wizard (reuse
      `full-ride.yaml`'s naming/creation pattern) → Edit Goal → tap the third step's
      `edit-goal-step-timing-.*` line (regex + index, per the README's addressing
      convention) → assert `-editor` and `-depends-on-toggle` render → tap the toggle →
      tap the first step's candidate row by its `accessibilityLabel` (the step's own
      title, deterministic since the flow authored it) → tap `-done` → assert the
      collapsed line now shows the `after <title>` chip → back to Timeline → assert the
      same step's node renders the identical `after <title>` text (cross-surface parity,
      in-app, not just in Jest).
- [ ] Add the flow to `e2e/README.md`'s Current Flows table with a one-line "Covers" cell.
- [ ] Run `rg` per the README's "Guarding against regressions to removed UI" section
      against the new file to confirm it introduces no retired selector.

## Testing Strategy

- [ ] `bun run test --testPathPatterns "forbiddenCopy|readOutParity|contrast"` — the four
      touched/added test files, green.
- [ ] `bun run test` (full suite) — no regressions elsewhere.
- [ ] `bun run type-check` / `bun run lint` — clean (lint is also the hex-audit gate, D1).
- [ ] Manual: `bun run ios:e2e` build, then `bun run test:e2e:single e2e/flows/step-timing-editor.yaml` locally before folding it into the required gate run.
- [ ] Storybook: open `EditGoalStepRow`'s `AllThemesMatrix` and confirm the new `waiting`
      row is legible and distinguishable from `after` in `light-highContrast` and
      `light-autismFriendly` specifically (the two themes the issue names as hardest).

## Manual Verification Checklist

_Handed back to the user — none of this is automatable. Grouped by the issue's own scope
bullets, with what automated coverage already backs each one so the walkthrough can focus
on what nothing else checks._

**1. Render correctness — 7 themes, both sheets, both chip tiers.**
Already backed by Storybook `AllThemesMatrix` stories on `StepDayGrid`, `StepTimingEditor`,
and `EditGoalStepRow` (the last gains the `waiting` row in this PR). Walk each in
Storybook (`light-default`, `dark-default`, `light-highContrast`, `light-dyslexia`,
`light-autismFriendly`, `light-lowVision`, `light-lowInfo`) and confirm: no shadow in
`highContrast`/`autismFriendly`/`lowInfo`, strong borders in `highContrast`, the `waiting`
amber and `after` green stay visually distinguishable in `autismFriendly` and legible in
`lowVision`.

**2. Read/write parity — six timing shapes, live device.**
Already backed (post-Step-4) by an automated cross-surface comparison in Jest. The
walkthrough's job is the one thing Jest can't do: author each shape **through the real
UI** (`npx expo run:ios`) — including the actual date-grid tap, which the new e2e flow
deliberately does not cover (D6) — and eyeball Timeline + Focus against the chip.

**3. ADR-0012 compliance sweep.**

- "Waiting-on completes from Focus, no dependency state changes" — already pinned,
  `FocusModeScreen.test.tsx` (~line 1241, `test.each` over "an external wait" / "an open
  dependency" / "both at once").
- "Passed expected/due date renders neutrally" — already pinned on both Focus and
  Timeline (`wasExpectedMeta` cases, `TimelineStep.test.tsx` lines 200-262).
- "Nowhere counted/scored/sorted" and "'blocked' appears nowhere" — the forbidden-word
  guard now covers all four B/C component dirs (Step 1) plus the three planning i18n
  namespaces; nothing left for this bullet needs a human unless the walkthrough spots UI
  text this plan's file list doesn't reach (e.g. a screen not covered by this epic).

**4. ND/a11y pass — VoiceOver, focus management, target sizes, segmented-control reach.**
Not automatable at all (VoiceOver doesn't run in the Simulator per the e2e README's own
note). Run it on-device.

**5. Pressure check — undated goal vs. dated goal, side by side, `lowInfo`.**
Screenshot task; no code produces or consumes this comparison today.

Anything cosmetic found during 1, 4, or 5 becomes a follow-up issue per `AGENTS.md` →
Handling Review-Skipped Findings, not a chat note. Anything that violates ADR-0012 (found
in 3) blocks the epic per the issue's own text.

## Not in Scope

| Item                                                                             | Reason                                                                                                                 | Follow-up                                                                                |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Due-date (`StepDayGrid`) authoring in the new e2e flow                           | No deterministic "today" testID or date-injection idiom exists in this suite yet (D6)                                  | New issue if/when e2e date-authoring is wanted; needs a testID or `runScript` seam first |
| VoiceOver pass, 7-theme device screenshots, `lowInfo` pressure-check screenshots | Genuinely manual — see Manual Verification Checklist                                                                   | None; user executes directly                                                             |
| New audit doc under `docs/quality/` (unlike #383's precedent)                    | The issue's own Deliverable says findings are recorded **in this issue**, not a new doc; #383 predates that convention | None                                                                                     |
| Any fix for a finding surfaced _during_ the manual walkthrough                   | Can't be scoped before the walkthrough happens                                                                         | Filed as its own issue once found, per house rule                                        |
| Retiring the stale "sheets" language in #577's own issue body                    | Not a code change                                                                                                      | None — noted here per the #576 precedent, not corrected upstream                         |

## Discovery Log

- [2026-08-24] **Step 4 moved out of `readOutParity.test.tsx`.** The cross-surface
  block needs `buildEditGoalSteps` (so the chip's waiting-outranks-after precedence is
  compared rather than restated), and the `local/no-component-imports-screens` ESLint
  rule forbids any file under `src/components/` importing from `src/screens/` — tests
  included. The six-shape comparison therefore lives in
  `src/__tests__/timingBandReadOutParity.test.tsx`, which is also the honest home for a
  test that spans three surfaces plus a screen builder. `readOutParity.test.tsx` keeps
  its Timeline-vs-editor pair and gains a pointer.
- [2026-08-24] **Step 4's i18n sub-task dropped as redundant.** The plan asked to extend
  the "copy defaults match the i18n resources" describe with the `waitingOn` /
  `wasExpected` / `waitingOnExpected` keys across all three namespaces. The rendered
  six-shape comparison already drives every one of those keys through the real
  components (Timeline's `wasExpected`, Focus's `wasExpectedMeta`, editGoal's
  `stepList.dateDepChips.wasExpected`, and the future-dated variants), so literal-string
  assertions would restate what a rendered comparison proves — and the repo bans
  assertions that pin nothing new. That block's doc comment was refreshed instead: its
  "#576 will replace these defaults" premise had gone stale.
- [2026-08-24] **Band text is read as a render difference, not by testID.** Only one of
  the three surfaces marks its band lines up at all, so each surface is rendered twice —
  once with the band, once with nothing set — and the added strings are its read-out.
  This also makes the none/cleared shape self-checking: "renders no timing" is the empty
  difference, not an absence assertion aimed at copy someone has to name.
- [2026-08-24] **The new e2e flow is syntax-checked, not executed.** `maestro
check-syntax` passes and the retired-selector grep is clean, but running it needs a
  booted simulator with an `ios:e2e` build — it goes to the manual pre-merge gate below
  along with the rest of the checklist.
