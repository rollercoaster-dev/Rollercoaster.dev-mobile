# Development Plan: Issue #477

## Issue Summary

**Title**: [native-rd] New Goal wizard — a11y + polish follow-ups (from #473 review)
**Type**: tech-debt / accessibility
**Complexity**: SMALL (borderline TRIVIAL — ~30 LOC total, but spans 3 files; one file is comment-only)
**Estimated Lines**: ~30 lines (implementation ~10, tests ~16, comment rewrite ~4) across 3 files

## Intent Verification

- [ ] When a screen-reader user is on any of the 4 New Goal wizard steps, VoiceOver/TalkBack announces "progress bar, N of 4" (or equivalent) via `accessibilityRole="progressbar"` + `accessibilityValue={{min:1, max:4, now:N}}` on `progressRow` — not just on the "name" step, which is the only place the visual "Step N of 4" eyebrow text renders.
- [ ] `defaultStepCountSummary(-2)` renders `"0 steps · evidence on each"` and `defaultStepCountSummary(1.5)` renders `"1 step · evidence on each"` — never a negative or fractional count reaches the screen.
- [ ] `EditGoalView.styles.ts`'s token-map comment reads unambiguously as a re-tone (not a literal hex→token match) for the `#3b1f6b` entry, matching the phrasing pattern already shipped in `NewGoalWizard.styles.ts` (#473).

_Tests pass / lint clean are assumed, not listed._

## Dependencies

| Issue | Title                                                   | Status                                                                                                   | Type                                        |
| ----- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| #473  | [Storybook] New Goal wizard 1/3 — shell + steps 1 & 4   | ✅ Merged (2026-07-06)                                                                                   | Origin (this issue is its review follow-up) |
| #444  | [Integrate] New Goal — replace NewGoalModal with wizard | 🔴 Open (not started; no code references `NewGoalWizard` outside its own component/story/test files yet) | Soft — see D1                               |

**Status**: ✅ All dependencies met. Labeled `dep:independent`; no "Blocked by" / "Depends on" marker in the issue body. #444 is mentioned only as context for whether Task 2 (stepCount clamp) is needed — see Decisions.

## Objective

Close three small a11y/polish gaps the multi-agent review of PR #473 deferred rather than blocking the wizard shell on:

1. Give the 4-segment progress bar a screen-reader-legible role/value so progress context isn't limited to the visually-rendered "Step 1 of 4" eyebrow (name step only).
2. Defend `defaultStepCountSummary` against out-of-domain input (negative/fractional `stepCount`).
3. Fix an ambiguous re-tone comment in `EditGoalView.styles.ts` to match the disambiguation already shipped in `NewGoalWizard.styles.ts`.

## Decisions

| ID  | Decision                                                                                                                                                                                                                                               | Alternatives Considered                                                                  | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Implement the `stepCount` clamp now, unconditionally.                                                                                                                                                                                                  | Skip it and wait to see if #444's caller guarantees a clean count.                       | #444 is unimplemented (`grep -rn "NewGoalWizard" src/screens` is empty), so "can the caller guarantee a clean count" is unanswerable from code today. The issue lists it as an unconditional checkbox task, the fix is 2 LOC, and defending a reusable component's own prop boundary is correct regardless of caller discipline. Flagged as an open question below in case the author intended it as skippable.                                                                   |
| D2  | Put `accessible` + `accessibilityRole="progressbar"` + `accessibilityValue` directly on the existing `progressRow` `<View>` — no new wrapper element.                                                                                                  | Wrap the segments in an additional `<View>` just for the a11y role.                      | Matches the issue's proposed diff exactly, and mirrors the established sibling pattern (`ProgressBar.tsx`, `ProgressRing.tsx`, `FocusProgressStrip.tsx`) which all put the three a11y props straight on the track/container view. No visual change; existing `progressSegment` child `testID`s are untouched (RNTL's `getByTestId` doesn't require the accessibility-tree collapse that `accessible` triggers, so the existing 4 progress-segment tests keep passing unmodified). |
| D3  | Test the new a11y contract with a direct `.props.accessibilityValue` assertion via `getByRole("progressbar")`, not the `a11y-helpers.ts` (`expectAccessibleValue`) wrapper.                                                                            | Use `expectAccessibleValue`/`expectAccessibleRole` from `src/__tests__/a11y-helpers.ts`. | The closest sibling components (`ProgressBar.test.tsx`, `ProgressRing.test.tsx`, `AudioPlayer.test.tsx`) all assert `screen.getByRole("progressbar").props.accessibilityValue` directly with `toEqual`; that helper file is used more by the dedicated `accessibility.test.tsx` contract suite. Matching the closest neighbor's convention beats introducing a second style in the same test file.                                                                                |
| D4  | Mirror `NewGoalWizard.styles.ts`'s exact disambiguation phrasing in `EditGoalView.styles.ts` ("is _re-toned_ (not a literal match) to accentPrimary — the blue #2563eb accent, reused as the ink"), adjusted for the `edit` route's own hex/token set. | Write new, differently-worded disambiguation text.                                       | Issue explicitly calls this "the twin fix" of #473's `NewGoalWizard.styles.ts` change; reusing the same phrasing pattern keeps the two comments recognizably parallel for a future reader (and for #463/#464, which the issue says this guards against).                                                                                                                                                                                                                          |

## Affected Areas

- `apps/native-rd/src/components/NewGoalWizard/NewGoalWizard.tsx`: add `accessible`, `accessibilityRole="progressbar"`, `accessibilityValue={{ min: 1, max: STEP_ORDER.length, now: currentStepIndex + 1 }}` to the `progressRow` `View` (both `STEP_ORDER` and `currentStepIndex` already exist in scope at the call site — confirmed, no new imports/derivations needed).
- `apps/native-rd/src/components/NewGoalWizard/NewGoalWizard.tsx`: clamp `defaultStepCountSummary`'s `count` param with `Math.max(0, Math.floor(count))` before interpolating/pluralizing.
- `apps/native-rd/src/components/NewGoalWizard/__tests__/NewGoalWizard.test.tsx`: add an `it.each` over `STEP_ORDER` asserting `accessibilityValue` per step; add 2 rows (negative, fractional) to the existing step-count-pluralization `it.each`.
- `apps/native-rd/src/components/EditGoalView/EditGoalView.styles.ts`: reword the `#3b1f6b → accentPrimary` comment fragment (lines 6-7) to read as an explicit re-tone, matching `NewGoalWizard.styles.ts`'s pattern.

## Implementation Plan

### Step 1: Progress-bar screen-reader semantics

**Files**: `apps/native-rd/src/components/NewGoalWizard/NewGoalWizard.tsx`, `apps/native-rd/src/components/NewGoalWizard/__tests__/NewGoalWizard.test.tsx`
**Commit**: `fix(native-rd): expose New Goal wizard progress bar to screen readers`
**Changes**:

- [ ] In `NewGoalWizard.tsx`, add to the `progressRow` `<View>` (currently plain, wraps the 4 `STEP_ORDER.map` segment `View`s):
  ```tsx
  <View
    style={styles.progressRow}
    accessible
    accessibilityRole="progressbar"
    accessibilityValue={{
      min: 1,
      max: STEP_ORDER.length,
      now: currentStepIndex + 1,
    }}
  >
  ```
- [ ] In `NewGoalWizard.test.tsx`, add an `it.each` (parallel to the existing "fills N progress segments" case at line ~199) asserting the announced value per step:

  ```tsx
  it.each<[NewGoalWizardStep, number]>([
    ["name", 1],
    ["step", 2],
    ["build", 3],
    ["ready", 4],
  ])(
    "exposes step %s as position %i of 4 via accessibilityValue",
    (currentStep, now) => {
      renderWizard({ currentStep });

      expect(screen.getByRole("progressbar").props.accessibilityValue).toEqual({
        min: 1,
        max: 4,
        now,
      });
    },
  );
  ```

- [ ] Verify the existing `queryAllByTestId("new-goal-progress-filled"/"unfilled")` tests (lines ~199-213) still pass unmodified — `accessible` on the parent does not remove child `testID`s from RNTL's `getByTestId`/`queryAllByTestId` query surface.

### Step 2: Clamp `stepCount` in `defaultStepCountSummary`

**Files**: `apps/native-rd/src/components/NewGoalWizard/NewGoalWizard.tsx`, `apps/native-rd/src/components/NewGoalWizard/__tests__/NewGoalWizard.test.tsx`
**Commit**: `fix(native-rd): clamp New Goal wizard step count to a non-negative integer`
**Changes**:

- [ ] Replace:
  ```tsx
  const defaultStepCountSummary = (count: number) =>
    `${count} step${count === 1 ? "" : "s"} · evidence on each`;
  ```
  with:
  ```tsx
  const defaultStepCountSummary = (count: number) => {
    const safeCount = Math.max(0, Math.floor(count));
    return `${safeCount} step${safeCount === 1 ? "" : "s"} · evidence on each`;
  };
  ```
- [ ] Add 2 rows to the existing pluralization `it.each` in the "ready step" describe block (currently `[1, ...]`, `[2, ...]`, `[4, ...]`):
  ```tsx
  [-2, "0 steps · evidence on each"],
  [1.5, "1 step · evidence on each"],
  ```

### Step 3: Disambiguate the `EditGoalView.styles.ts` token-map comment

**Files**: `apps/native-rd/src/components/EditGoalView/EditGoalView.styles.ts`
**Commit**: `docs(native-rd): disambiguate re-toned hex in EditGoalView token-map comment`
**Changes**:

- [ ] Reword lines 4-7 (currently: `... muted #737373 → textSecondary · banner #ede9fe/#3b1f6b → accentPurpleLight/ accentPrimary · add-button #2563eb → accentPrimary.`) so the `#3b1f6b` entry reads as a re-tone, e.g.:
  ```ts
  // Zero hardcoded hex (hard acceptance gate). Token map to the App Shell
  // `edit` route: card surface #fff → background · ink border #0a0a0a →
  // border · muted #737373 → textSecondary · banner surface #ede9fe →
  // accentPurpleLight · add-button #2563eb → accentPrimary. The banner ink
  // #3b1f6b is *re-toned* (not a literal match) to accentPrimary — the blue
  // #2563eb accent, reused as the ink.
  ```
- [ ] No code change — comment only, matches `NewGoalWizard.styles.ts:4-11`'s phrasing pattern (confirmed present and already shipped by #473).

## Testing Strategy

- [ ] Unit tests for both `NewGoalWizard.tsx` changes live in the existing `apps/native-rd/src/components/NewGoalWizard/__tests__/NewGoalWizard.test.tsx` (mirrors `src/` under `src/__tests__/` convention — this component's tests already live co-located under `__tests__/` next to the component, matching sibling components like `ProgressBar/__tests__/`).
- [ ] Use `it.each` for both new cases (already the file's convention throughout).
- [ ] Run `bun run test --testPathPatterns NewGoalWizard` (never `bun test`).
- [ ] No test needed for Step 3 — comment-only change.
- [ ] Manual/Storybook: open the `NewGoalWizard` story, step through all 4 positions, confirm no visual regression (progress bar segments render identically — only non-visual a11y props added).

## Not in Scope

| Item                                                                                 | Reason                                                                                                                | Follow-up |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | --------- |
| Grouping ~16 flat optional copy props into `copy?: Partial<NewGoalWizardCopy>`       | Issue body explicitly defers this to #463/#464 (next copy batch lands there)                                          | #463      |
| Any change to `EditGoalView.styles.ts` beyond the comment (e.g. actual token values) | Issue only flags the comment's clarity, not a token-correctness bug — `accentPrimary` is already the intended re-tone | none      |
| Wiring `NewGoalWizard` into a real screen / `GoalsCockpit`                           | Owned by #444 [Integrate], currently unstarted and out of this tech-debt bundle's scope                               | #444      |

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->
