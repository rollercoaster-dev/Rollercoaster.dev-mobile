# Development Plan: Issue #459

## Issue Summary

**Title**: [Storybook] Edit Goal — reorder smaller steps within a parent
**Type**: feature (Storybook-only, follow-up to #445)
**Complexity**: SMALL
**Estimated Lines**: ~330 lines total (~180 source, ~120 tests, ~30 stories) — matches the issue's own `size:s` / ~150-250 LOC estimate for source

## Intent Verification

- [x] Long-pressing and dragging a sub-step row (`≡` handle) reorders it among its own parent's sub-steps only; siblings under a different parent, and the parent step itself, never move. _(Per-parent `useEditGoalDrag` instance; scoping guarded by the two-parent unit test + Storybook eyeball for the drag gesture itself, which is mocked in Node.)_
- [x] `EditGoalView` fires `onReorderSubSteps(parentStepId, orderedSubStepIds)` with the new sibling order on drop — never `onReorderSteps` (the top-level callback). _(Unit-tested.)_
- [x] With a screen reader on or "reduced motion" set, each sub-step row shows ↑/↓ buttons that reorder it within its parent and announce the move (`AccessibilityInfo.announceForAccessibility`), exactly like the parent rows' existing fallback. _(Unit-tested.)_
- [x] A parent with exactly one sub-step shows no ↑/↓ buttons (both `isFirst`/`isLast`) and no functional drag (mirrors the top-level `canDrag = steps.length > 1` rule). _(Unit-tested.)_
- [x] Long-pressing inside a parent card's sub-step block never also triggers the parent row's own drag (no double-fire from the nested `GestureDetector`s). _(Step 1 structural fix — gesture scoped to the row body; verify in Storybook, not unit-testable with gestures mocked.)_
- [x] The `↳` glyph is gone from sub-step rows; `≡` renders in its place and is hidden from screen readers (`accessibilityElementsHidden`), matching the parent row's handle. _(Unit-tested.)_
- [x] `reorderStepIds` (from `useEditGoalDrag`) is exercised against a sub-step id array by the new code path — no new pure-reorder function is introduced. _(Same hook reused per-parent.)_

## Dependencies

| Issue | Title                                                                             | Status                    | Type                               |
| ----- | --------------------------------------------------------------------------------- | ------------------------- | ---------------------------------- |
| #445  | [Storybook] Edit Goal — redesigned step editor (drag rows, evidence chip, ⋯ menu) | ✅ Met (CLOSED)           | Blocker (explicit follow-up split) |
| #384  | Epic: Full Ride redesign — screens on a real-token foundation                     | Open (epic, non-blocking) | Soft                               |

**Status**: ✅ All dependencies met.

## Objective

Give each sub-step row in `EditGoalView` (the "smaller steps" tier under a parent step, #445) a working `≡` drag handle that reorders it among its **own parent's** sub-steps, reusing the exact gesture + auto-scroll math the top-level step list already uses (`useEditGoalDrag`, `dragAutoScroll.ts`) rather than the substep-aware `DraggableStepItem`/`classifyDrop` pair (which carries reparent + nest-picker logic this issue explicitly excludes). Swap the decorative `↳` marker for the functional `≡` handle and give sub-step rows the same accessible ↑/↓ fallback the parent rows already have. New callback: `onReorderSubSteps(parentStepId, orderedSubStepIds)`.

Note on terminology: the issue title says "smaller steps"; the codebase (schema, props, components) calls the same concept "sub-steps" since #445 — this plan uses the codebase's existing name throughout, no renaming in scope.

## Decisions

| ID  | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Alternatives Considered                                                                                                                                                                                              | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Narrow `EditGoalStepRow`'s `GestureDetector` to wrap only the row body (title/evidence/date-chip area), leaving the `children` slot (the sub-step block) **outside** its captured view.                                                                                                                                                                                                                                                                        | (1) `.blocksExternalGesture(parentRef)` / `.requireExternalGestureToFail()` cross-detector relations; (2) `Gesture.Exclusive` (rejected — only composes within one detector, doesn't arbitrate a parent/child tree). | RNGH dispatches a touch to every `GestureDetector` whose view contains it, with no implicit priority between independent detectors. Today the parent's detector wraps the whole card (`body` + `children`), so a nested per-sub-step `LongPress`+`Pan` would double-fire the parent's drag. **Best-practice call (confirmed via research):** prefer structural separation over relation-config when views can be cleanly separated — the relation APIs exist for genuinely-overlapping views that _can't_ be split (e.g. a pan inside a scroll). Here they split trivially, so narrowing the wrapped view is idiomatic, needs no gesture refs threaded through props, and is the least bug-prone. |
| D2  | Reuse `useEditGoalDrag` **unchanged**, called once per parent step from a new `EditGoalSubStepList` wrapper component (one hook instance per parent, each with its own row-layout/drag-index refs).                                                                                                                                                                                                                                                            | A new `useEditGoalSubStepDrag` hook; generalizing/renaming `useEditGoalDrag`'s field names (`steps`, `onReorderSteps`).                                                                                              | The hook's existing shape (`steps: {id,title}[]`, `onReorderSteps`) is already generic — it has no top-level-only assumptions baked in. Calling it again per sub-step list is exactly the "reuse the main list's gesture + auto-scroll math" the issue asks for, with zero changes to `useEditGoalDrag.ts` or `dragAutoScroll.ts` beyond a doc-comment update.                                                                                                                                                                                                                                                                                                                                    |
| D3  | **Reuse the parent row's existing drag feedback** — the shared gesture block already drives scale (1.02), lift (`translateY`), and `zIndex`, and `useEditGoalDrag` already renders the `styles.dropLine` insertion indicator (`accentPrimary`). Add only a minimal `subStepRowDragging` accent (a `theme.colors.accentPrimary` border) so the lifted row also reads as accented like the parent, since `subStepRow` is a bare flex row with no border to swap. | A brand-new visual language for sub-step dragging; or no accent at all (lift+scale+drop-line only).                                                                                                                  | Confirmed against the app: drag feedback is **not** a new design decision — the primitives (scale/lift/zIndex + drop-line) already exist and are reused verbatim. The only gap is that a bare `subStepRow` has no border for the `accentPrimary` accent the parent gets via `rowCardDragging`, so we add that one border, tokens only, mirroring the parent exactly. No new hex, no novel treatment.                                                                                                                                                                                                                                                                                              |
| D4  | Thread `EditGoalView`'s existing `dragScrollController` prop into every `EditGoalSubStepList` instance so sub-step drags near the viewport edge also auto-scroll.                                                                                                                                                                                                                                                                                              | Omit auto-scroll for sub-step drags (Storybook lists are short so it wouldn't be exercised there).                                                                                                                   | The controller is already optional and the [Integrate] follow-up will supply a real one from the owning screen's `ScrollView` — wiring it now avoids a second follow-up once dates/deps/persistence land, and costs nothing when the prop is omitted (Storybook).                                                                                                                                                                                                                                                                                                                                                                                                                                 |

## Reuse Inventory

The feature is almost entirely assembled from existing, already-tested parts — new code is mostly wiring.

| Asset                  | Location                                                              | How reused                                                                                                                                                                                                | Change?                     |
| ---------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `useEditGoalDrag` hook | `EditGoalView/useEditGoalDrag.ts`                                     | Instantiated once per parent (`steps: subSteps`, `onReorderSteps: onReorder`). Provides hover math, drop-slot, auto-scroll, haptics, the a11y announce, and `moveStep` (↑/↓ fallback).                    | **None** (doc comment only) |
| `reorderStepIds`       | same file                                                             | Pure reorder for the sub-step id array; already covered by `describe("reorderStepIds (D6)")`.                                                                                                             | **None**                    |
| `dragAutoScroll.ts`    | `StepList/dragAutoScroll.ts`                                          | Reused transitively through the hook.                                                                                                                                                                     | **None**                    |
| Gesture block          | `EditGoalStepRow.tsx` L141-172                                        | `LongPress(400)` + manual-activation `Pan` + `Gesture.Simultaneous` + `animatedStyle` (translateY/scale/zIndex) — copied into `EditGoalSubStepRow` (already a nesting-free clone of `DraggableStepItem`). | Copied (not shared)         |
| Drag feedback          | `EditGoalView.styles.ts` (`rowCardDragging`, `dropLine`) + scale 1.02 | Same `accentPrimary` accent + drop-line; only a new `subStepRowDragging` border added because a bare `subStepRow` has none to swap (D3).                                                                  | Reuse + 1 minimal style     |
| ↑/↓ fallback           | `EditGoalStepRow.tsx` L231-252                                        | `IconButton` + `ArrowUp`/`ArrowDown` + `styles.reorderButtons`, gated on `showAccessibleControls`.                                                                                                        | Pattern copied              |

**Deliberately not reused** (per issue scope): `DraggableStepItem` / `classifyDrop` — they carry reparent, nest-picker modal, and dwell-arm logic that is out of scope for sibling-only reorder.

## Affected Areas

- `apps/native-rd/src/components/EditGoalView/EditGoalStepRow.tsx`: narrow the `GestureDetector`'s wrapped view to the row body only (D1); no prop/behavior changes otherwise.
- `apps/native-rd/src/components/EditGoalView/EditGoalSubStepRow.tsx`: add drag props (`index`, `isBeingDragged`, `onDragStart/Move/End`, `dragScrollCompensation`, `onMoveUp`/`onMoveDown`, `showAccessibleControls`, `animationPref`, `isFirst`, `isLast`, `canDrag`); swap the `↳` marker for `≡`; add the `GestureDetector`+`Animated.View` drag wrapper (mirrors `EditGoalStepRow`) gated on `canDrag`; add the ↑/↓ `IconButton` fallback row (mirrors `EditGoalStepRow`'s `reorderButtons`).
- `apps/native-rd/src/components/EditGoalView/EditGoalSubStepList.tsx` (new): owns one `useEditGoalDrag` instance for a single parent's sub-steps; renders the draggable rows + the scoped drop-line indicator; exposes `onReorder(orderedSubStepIds)` up to the caller.
- `apps/native-rd/src/components/EditGoalView/EditGoalView.tsx`: add `onReorderSubSteps: (parentStepId: string, orderedSubStepIds: string[]) => void` to `EditGoalViewProps`; replace the inline `.map()` over `subs` in `renderSubStepBlock`'s non-empty branch with `<EditGoalSubStepList />`, binding `onReorder` to `(ids) => onReorderSubSteps(step.id, ids)`.
- `apps/native-rd/src/components/EditGoalView/EditGoalView.styles.ts`: `subStepBlock` gets `position: "relative"` (anchors the scoped drop-line); `subStepMarker` font size bumped to `theme.size.md` to visually match the parent's `dragHandle` now that it's functional; new `subStepRowDragging` style (D3).
- `apps/native-rd/src/components/EditGoalView/useEditGoalDrag.ts`: doc-comment update only — note it is now also instantiated per-parent for sub-step siblings (issue #459), still a single flat sibling list per instance, no functional change.
- `apps/native-rd/src/components/EditGoalView/__tests__/EditGoalView.test.tsx`: new test cases for sub-step reorder (see Testing Strategy).
- `apps/native-rd/src/components/EditGoalView/EditGoalView.stories.tsx`: wire `onReorderSubSteps` into `InteractiveEditGoal`; update the `SubSteps` story's note (it currently says "no drag handle on sub-steps yet" — no longer true).

## Implementation Plan

### Step 1: Isolate the parent row's gesture from the sub-step block

**Files**: `EditGoalView/EditGoalStepRow.tsx`
**Commit**: `refactor(edit-goal): scope step row's drag gesture to the row body only`
**Changes**:

- [x] Restructure the `canDrag` return branch so `GestureDetector` wraps a single inner `View` containing `body` only; `children` (the sub-step block) stays inside the outer `Animated.View` but outside the `GestureDetector`, so the transform (`animatedStyle`) still moves the whole card together while dragging, but touches inside `children` never reach the card's `LongPress`/`Pan`.
- [x] No prop or behavior changes — existing `EditGoalStepRow` tests and stories must pass unmodified.

### Step 2: Give sub-step rows a working `≡` handle + ↑/↓ fallback

**Files**: `EditGoalView/EditGoalSubStepRow.tsx`, `EditGoalView/EditGoalView.styles.ts`
**Commit**: `feat(edit-goal): add drag handle and ↑/↓ fallback to sub-step rows`
**Changes**:

- [x] Add props: `index: number`, `isBeingDragged: boolean`, `onDragStart(index)`, `onDragMove(translationY, absoluteY)`, `onDragEnd()`, `dragScrollCompensation?: SharedValue<number>`, `onMoveUp?()`, `onMoveDown?()`, `showAccessibleControls: boolean`, `animationPref: AnimationPref`, `isFirst: boolean`, `isLast: boolean`, `canDrag: boolean`.
- [x] Replace the `↳` marker text with `≡`; keep it `accessibilityElementsHidden`/`importantForAccessibility="no"`.
- [x] When `canDrag`, wrap the row in the same `LongPress().minDuration(400)` + manual-activation `Pan` + `Gesture.Simultaneous` combo as `EditGoalStepRow`, driving `translateY`/`scale`/`isDragging` shared values and applying `subStepRowDragging` while `isBeingDragged`. When `!canDrag` (≤1 sibling, or a title is being edited), render the static (non-gesture) row as today.
- [x] Add the ↑/↓ `IconButton` pair (`ArrowUp`/`ArrowDown`, `size="sm"`) rendered when `showAccessibleControls`, gated by `!isFirst` / `!isLast` — same pattern as `EditGoalStepRow`'s `reorderButtons`. New a11y label defaults: `moveSubStepUpLabel = (title) => \`Move "${title}" up\``/`moveSubStepDownLabel`(mirrors the parent's inline defaults; not threaded through`EditGoalViewProps`, matching how the parent row's equivalents aren't threaded today).
- [x] New testIDs: `edit-goal-substep-up-${id}`, `edit-goal-substep-down-${id}`.
- [x] Styles: `subStepMarker.fontSize` → `theme.size.md`; add `subStepRowDragging` (a single `theme.colors.accentPrimary` border, tokens only — no hex). The primary feedback (scale/lift/zIndex + `styles.dropLine`) is reused from the existing gesture block and hook, not re-invented (D3).

### Step 3: Per-parent reorder wiring

**Files**: `EditGoalView/EditGoalSubStepList.tsx` (new), `EditGoalView/EditGoalView.tsx`, `EditGoalView/EditGoalView.styles.ts`, `EditGoalView/useEditGoalDrag.ts`
**Commit**: `feat(edit-goal): wire per-parent sub-step reorder via useEditGoalDrag`
**Changes**:

- [x] `EditGoalSubStepList` props: `subSteps: EditGoalSubStep[]`, `onReorder: (orderedSubStepIds: string[]) => void`, `editingId: string | null`, `editText: string`, `onEditTextChange`, `onStartEditing(id, title)`, `onCommitEditing()`, `onEvidenceChipPress(id)`, `onDelete(id)`, `showAccessibleControls: boolean`, `animationPref: AnimationPref`, `dragScrollController?: DragScrollController`, `announceReorder?: (title, position) => string`.
- [x] Internally: `const drag = useEditGoalDrag({ steps: subSteps, onReorderSteps: onReorder, dragScrollController, announceReorder })`; `canDrag = subSteps.length > 1 && editingId === null`.
- [x] Render each `EditGoalSubStepRow` inside a `View` with `onLayout` calling `drag.registerRowLayout(index, {...})` (mirrors the top-level `steps.map` wrapper in `EditGoalView.tsx`); render the scoped drop-line (`styles.dropLine`) when `drag.isDragging && drag.dropSlot`. **Note:** the list returns a **fragment** (rows + drop-line), not its own wrapping `View` — the caller's `subStepBlock` stays the `position: relative` container so the drop-line shares the rows' coordinate system, and the "add a sub-step" affordance stays in `renderSubStepBlock` (parent-scoped, testID `edit-goal-add-substep-<parentId>`). This is why the list has no `onAddSubStep`/`addSubStepLabel` props.
- [x] `EditGoalView.tsx`: add `onReorderSubSteps` to `EditGoalViewProps`; in `renderSubStepBlock`'s non-empty branch, replace the `subs.map(...)` block with `<EditGoalSubStepList subSteps={subs} onReorder={(ids) => onReorderSubSteps(step.id, ids)} editingId={editingId} editText={editText} onEditTextChange={setEditText} onStartEditing={(id, title) => beginEdit(id, title)} onCommitEditing={commitEditing} onEvidenceChipPress={(id) => setEditingEvidenceId(id)} onDelete={onDeleteSubStep} showAccessibleControls={showAccessibleControls} animationPref={animationPref} dragScrollController={dragScrollController} announceReorder={announceReorder} />`.
- [x] `EditGoalView.styles.ts`: `subStepBlock` gets `position: "relative"`.
- [x] `useEditGoalDrag.ts`: update the top-of-file doc comment to note the per-parent sub-step reuse (issue #459); no code change.

### Step 4: Tests

**Files**: `EditGoalView/__tests__/EditGoalView.test.tsx`
**Commit**: `test(edit-goal): cover sub-step reorder, ↑/↓ fallback, and parent scoping`
**Changes**:

- [x] Extend the `withSub` fixture (or add a second fixture) with a parent carrying ≥2 sub-steps to exercise reorder, plus keep a 1-sub-step parent to assert the fallback is absent there. _(Added `withMultiSub`: Parent A 3 sub-steps, Parent B 2; `withSub` covers the lone-sub-step fallback-absent case.)_
- [x] `≡` renders (not `↳`) on sub-step rows and is `accessibilityElementsHidden`.
- [x] With `mockAnimationPref = "none"`: ↑/↓ buttons appear on a parent's 2+ sub-steps, absent on a parent's lone sub-step (both `isFirst`/`isLast`).
- [x] Pressing a sub-step's ↓ fallback calls `onReorderSubSteps(parentStepId, orderedIds)` with the new sibling order — and does **not** call `onReorderSteps`.
- [x] Announces the reorder via `AccessibilityInfo.announceForAccessibility` with the sub-step's title (default English builder), mirroring the existing parent-row assertions.
- [x] Two parents each with 2 sub-steps: reordering one parent's sub-steps only calls `onReorderSubSteps` with that parent's id and that parent's ids — the other parent's list is untouched (scoping regression guard).

### Step 5: Storybook

**Files**: `EditGoalView/EditGoalView.stories.tsx`
**Commit**: `docs(edit-goal): wire sub-step reorder into the Storybook interactive story`
**Changes**:

- [x] `InteractiveEditGoal`: add a `reorderSubSteps(parentStepId, orderedIds)` handler (mirrors `reorder` but scoped to `s.id === parentStepId`'s `subSteps`) and pass it as `onReorderSubSteps`. _(Landed in the feat commit; verified present.)_
- [x] Update the `SubSteps` story's note — remove "no drag handle on sub-steps yet"; mention long-press-and-drag now works within a parent, plus the ↑/↓ fallback.
- [x] Give `initialSteps`'s `s1` a third sub-step (currently 2) so the reorder interaction has a non-trivial middle position to verify. _(Added `s1c` "Note gaps to research".)_

## Testing Strategy

- [ ] Component tests in `EditGoalView.test.tsx` (Jest 30, `@testing-library/react-native` v13) — see Step 4. Use `test.each` if the ↑/↓-fallback-presence assertions end up parameterized over "1 sub-step" vs "2+ sub-steps".
- [ ] No new pure-function tests needed: `reorderStepIds` is exercised unchanged by the new code path and is already covered by the existing `describe("reorderStepIds (D6)")` block.
- [ ] Test file path: `apps/native-rd/src/components/EditGoalView/__tests__/EditGoalView.test.tsx` (existing file, extended — mirrors `src/` structure per project convention).
- [ ] Manual/Storybook verification: `SubSteps` and `ReorderInteraction` stories in `Iteration B/Goals/EditGoalView` — long-press-drag a sub-step within a parent that has 3 sub-steps; confirm the parent card itself does not also start dragging; toggle the OS "reduce motion" setting (or the in-repo animation-pref control, if exposed in Storybook) to confirm the ↑/↓ fallback appears and works; verify across the theme toolbar (no hardcoded hex — `AllThemesMatrix` story).
- [ ] Run `bun run test --testPathPatterns EditGoalView` (never `bun test` / `npx jest`).

## Not in Scope

| Item                                                                                          | Reason                                                                                                                                                       | Follow-up                                                             |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Reparenting a sub-step to a different parent, or promoting/demoting between step and sub-step | `schema.ts` caps `parentStepId` at one level; issue explicitly excludes this (`DraggableStepItem`/`classifyDrop` own that logic for the top-level flat list) | none — by design                                                      |
| A second nesting level (sub-steps of sub-steps)                                               | Same one-level cap                                                                                                                                           | none — by design                                                      |
| Wiring `onReorderSubSteps` to Evolu persistence                                               | `EditGoalView` is still pure/prop-driven Storybook-only (per #445); persistence is the future `[Integrate]` issue                                            | tracked under the `[Integrate]` follow-up referenced across #445/#459 |
| i18n copy for the new ↑/↓ labels                                                              | `EditGoalView` is i18n-free by design (D9 from #445) — English defaults only, `[Integrate]` threads `t()`                                                    | same `[Integrate]` follow-up                                          |

## Discovery Log

- [2026-07-07] **Steps 2 & 3 merged into one commit.** `EditGoalSubStepRow`'s new drag props are required (mirrors the parent `EditGoalStepRow` API), and the row's only consumer is `renderSubStepBlock` via the new `EditGoalSubStepList`. A row-only commit therefore leaves the tree non-compiling — the two steps are one atomic, buildable unit. Landed as `feat(edit-goal): add per-parent sub-step reorder (drag handle + ↑/↓ fallback)` (SHA 2c694373). The mechanical caller updates needed to keep the whole tree type-checking (story `reorderSubSteps` handler + `onReorderSubSteps` wiring, `MatrixEditGoal` no-op, test `makeProps` prop) are included in that commit; the substantive new test cases (Step 4) and the Storybook enrichment — note rewrite + third sub-step (Step 5) — remain their own commits.
- [2026-07-07] **`EditGoalSubStepList` returns a fragment, not a wrapping `View`.** The scoped drop-line is absolutely positioned and must share the rows' coordinate box; that box is the caller's `subStepBlock` (now `position: relative`). Wrapping the rows in the list's own `View` would break the drop-line `top` math and orphan the "add a sub-step" affordance from the mint rail. So the list emits `<>{rows}{dropLine}</>` and owns no add affordance / add-copy props.

## Progress & Resume (for a fresh context)

**Branch:** `feat/issue-459-reorder-smaller-steps` — all 5 steps landed, DCO-signed. Full suite green: `type-check` ✅, `lint` ✅ (only pre-existing warnings in untouched files), `test` ✅ (204 suites / 9777 tests). Ready for `/finalize` (push + PR).

- ✅ **Step 1** — `refactor(edit-goal): scope step row's drag gesture to the row body only` (SHA 668832ea). `GestureDetector` now wraps only the row body; `children` (sub-step block) stays inside the transformed `Animated.View` but outside the detector (D1).
- ✅ **Steps 2 + 3** — `feat(edit-goal): add per-parent sub-step reorder …` (SHA 2c694373). Row drag handle + ↑/↓ fallback, `EditGoalSubStepList`, `onReorderSubSteps` prop, styles, hook doc. See Discovery Log for why they merged.
- ✅ **Step 4 — Tests** — `test(edit-goal): cover sub-step reorder, ↑/↓ fallback, and parent scoping` (SHA 3b319d1b). Added `withMultiSub` fixture (Parent A 3 sub-steps / Parent B 2) + a `sub-step reorder (#459)` describe block: `≡`-not-`↳` + hidden handle, ↑/↓ presence on 2+ and absence on the lone sub-step, `onReorderSubSteps` fired (not `onReorderSteps`), announce, and the two-parent scoping guard. 6 new cases (39 → 45 in the file).
- ✅ **Step 5 — Storybook** — `docs(edit-goal): wire sub-step reorder into the Storybook interactive story` (SHA 37af6d64). Rewrote the `SubSteps` note (drag + ↑/↓ fallback) and added a third sub-step `s1c` so reorder-to-middle is demonstrable. `reorderSubSteps` handler was already present from the feat commit.
- ⬜ **Final validation & PR** — local gates all green (above). Remaining: `/finalize` (push + PR). Manual Storybook eyeball still worth doing for the two gesture-only intent items (drag stays within parent; parent card doesn't co-drag) and the `subStepRowDragging` border note below — gestures are mocked in Node so those aren't unit-covered.

**Open verification note for reviewers:** `subStepRowDragging` adds a `borderWidth.thick` accentPrimary border only while a row is lifted (the bare `subStepRow` has none to swap, unlike the parent's always-bordered `rowCard`). This nudges row content inward by the border width for the duration of the drag — acceptable since the row is simultaneously lifted/scaled/`zIndex`-raised, but worth an eyeball in Storybook (`SubSteps` / `AllThemesMatrix`) before PR.
