# Development Plan: Issue #330

## Issue Summary

**Title**: A-authoring: drag-to-reparent gesture (vertical-only + dwell-to-demote)
**Type**: feature
**Complexity**: MEDIUM
**Estimated Lines**: ~350 lines

## Intent Verification

Observable criteria derived from the issue. Verifiable by running the app or reading tests.

- [x] Drag-reordering within a sibling group (roots among roots, children among children) works for goals that have sub-steps — the D13 guard (`!hasSubSteps`) is removed. _(StepList commit `b5d6ab6`)_
- [x] Dragging a leaf child above its parent group promotes it to a root step; dragging it to the first slot within its substep group remains a sibling reorder. _(classifyDrop dispatch + EditModeScreen ordinal normalization)_
- [x] Hovering over any root step for ~200-250 ms while dragging a leaf step causes that target to visually arm with a sustained dashed success outline. Roots remain eligible after receiving children, so repeated drops onto the same parent work. _(`DWELL_ARM_MS = 220`; `armedTargetItem`)_
- [x] Releasing over an armed target nests the dragged step under it (reparent write via `updateStep`). _(handleDragEnd → classifyDrop → onReparentStep → updateStep)_
- [x] Leaving an armed root's central dwell zone disarms it immediately; movement within that zone keeps it armed, while the row's outer bands remain positional before/after insertion targets. _(disarm keyed on hovered row + dwell-zone refs)_
- [x] A step that already has children cannot be demoted (drag or dwell) — it snaps back with no write. _(classifyDrop `draggedHasChildren` guard + arm-candidate condition)_
- [x] Dragging over a non-root step as a dwell target is refused (snap back). _(arm condition requires `parentStepId == null`)_
- [x] The "+sub-step" ghost rows are hidden while a drag is in progress, restoring them on drop. _(`isDragging` gates `showSubStepAffordance`)_
- [x] Screen-reader users see a "Nest under…" control (opens an accessible picker of eligible target roots) and, for child steps, an "Un-nest" control — beside the existing ↑/↓ buttons. The ↑/↓ buttons stay **sibling-reorder only** and never change nesting level (Q2 decision; WCAG 3.2 predictability). _(DraggableStepItem picker Modal + `moveWithinSiblingGroup`)_
- [x] Row-label i18n keys (`nestUnder`/`nestUnderA11y`/`unNest`/`unNestA11y`) are present in en/de/pseudo `editGoal.json` (landed in `901477b`).
- [x] Picker-chrome i18n keys (trigger label + a11y + picker title) are added in en/de/pseudo `editGoal.json`. _(commit `d68d322`)_
- [x] `StepList` accepts `onReorderSubSteps` and `onReparentStep` props; `EditModeScreen` wires `handleReorderSubSteps` (calling `reorderSubSteps`) and `handleReparentStep` (calling `updateStep`). _(commits `b5d6ab6`, `fa0684d`)_
- [ ] With a long edit form, holding a dragged row within 72 px of the visible scroll container's top or bottom edge continuously scrolls toward off-screen destinations; hover feedback remains aligned and scrolling stops on drop or at content boundaries.
- [~] All tests in `classifyDrop.test.ts`, `StepList.test.tsx`, and `EditModeScreen.test.tsx` pass after the guard is removed and new paths are wired. _(classifyDrop ✅ + StepList guard-removal test ✅; **new auto-scroll / dispatch / SR-control / ghost-hide / EditModeScreen-wiring test blocks still TODO — plans Steps 5-6**)_

## Dependencies

| Issue | Title                                                     | Status    | Type    |
| ----- | --------------------------------------------------------- | --------- | ------- |
| #290  | A-data: additive parentStepId + sibling-ordinal semantics | ✅ Merged | Blocker |
| #291  | A-authoring: sub-step affordance (combined PR with #290)  | ✅ Merged | Blocker |
| #288  | Epic: sub-steps / A-substructure                          | Open      | Context |

**Status**: ✅ All hard dependencies met. `classifyDrop`, `reorderSubSteps`, and `updateStep` with `parentStepId` are all live. The D13 guard is the only thing preventing drag for goals with sub-steps.

## Objective

Wire the `classifyDrop` decision layer into the existing `DraggableStepItem` gesture, add the dwell-arm mechanic, wire `onReorderSubSteps`/`onReparentStep` props all the way through `StepList` → `EditModeScreen`, remove the D13 guard, add screen-reader nest/un-nest controls, and auto-scroll the edit form while a dragged row is held near the visible container edges. After this PR, flat and hierarchical goals have full drag-reorder plus explicit reparent affordances even when the destination begins off-screen.

## Decisions

| ID  | Decision                                                                                                                                                                                                          | Alternatives Considered                         | Rationale                                                                                                                                                                     |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D8  | Vertical-only drag + dwell-to-demote (settled in #290 plan)                                                                                                                                                       | x-axis indent; explicit buttons only            | Shipped vertical DnD before; dwelling directly on a root provides one consistent target for both first and subsequent children                                                |
| D12 | `animationPref === "none"` → static bold border; screen-reader → explicit nest/un-nest buttons (settled in #290 plan)                                                                                             | Motion for everyone; drag-only                  | This app targets ND users day-one; both variants must be first-class                                                                                                          |
| D14 | Dwell timer lives in `StepList` JS state, not on the worklet                                                                                                                                                      | Worklet-side timer via `runAfterAnimFrame`      | `setTimeout` on the JS side is simpler, testable, and the 200-250 ms latency is not perceptible vs. frame-level timing; matches the DEBOUNCE pattern already used in EditMode |
| D15 | `armedTargetId` is rendered from React state and mirrored in a ref for gesture callbacks; passed to `DraggableStepItem` as a prop                                                                                 | State only; shared value only                   | State drives the highlight, while the ref prevents active gesture callbacks from reading a stale armed target and supports immediate disarming after leaving the target row   |
| D16 | Grow+pulse animation on the armed target is implemented as `withSequence(withTiming(1.04, …), withTiming(1.0, …))` on a `scaleArmed` shared value in `DraggableStepItem`                                          | Full keyframe pulse loop                        | A single grow-then-settle is sufficient feedback and avoids a looping animation that reduced-motion users would need a separate code path to suppress                         |
| D17 | `handleDragEnd` in `StepList` is replaced by a new handler that (1) calls `classifyDrop` and (2) dispatches `reorder`, `reparent`, or snap-back; existing `handleMoveUp`/`handleMoveDown` gain sub-step awareness | Leave the old handler, add a parallel path      | One handler, one dispatch point — avoids the current handler's silent reorder-all-flat-list bug for mixed lists                                                               |
| D18 | `handleMoveUp`/`handleMoveDown` use `classifyDrop` with a virtual `dropIndex` (current index ± 1) so sibling-scoped reorder and promote/demote fall out of the same classifier                                    | Separate promote/demote logic for keyboard path | Single source of truth for reparent semantics; fewer code paths to test                                                                                                       |
| D19 | `EditModeScreen` retains ownership of its existing `KeyboardAwareScrollView`; it passes a ref-backed drag-scroll controller into `StepList`                                                                       | Replace the form with `FlatList`; nest a list   | The screen already owns scrolling and keyboard avoidance. An imperative controller adds edge scrolling without introducing nested virtualized lists or moving form ownership  |
| D20 | Auto-scroll runs in a cancellable JS `requestAnimationFrame` loop with progressive edge speed; hover geometry includes the accumulated scroll delta                                                               | Scroll only on pan events; constant-speed timer | The loop continues while the finger is stationary, progressive speed is controllable, and scroll-adjusted hit testing keeps the drop preview aligned with content             |

## Affected Areas

- `apps/native-rd/src/components/StepList/StepList.tsx`: add `onReorderSubSteps` / `onReparentStep` props; replace `handleDragEnd` with a `classifyDrop`-dispatching version; add dwell timer (`armedTargetId` state); hide ghost rows mid-drag (`isDragging` state); update `canDrag` to remove the `!hasSubSteps` guard; make `handleMoveUp`/`handleMoveDown` sub-step-aware; pass `armedTargetId` and new SR-control props down to `DraggableStepItem`.
- `apps/native-rd/src/components/StepList/DraggableStepItem.tsx`: accept `isArmedTarget`, `onNestUnder`, and `onUnNest` props; render nest/un-nest controls when appropriate; forward the pan event's `absoluteY` with `translationY` so `StepList` can detect the top/bottom viewport edge.
- `apps/native-rd/src/components/StepList/StepList.styles.ts`: add `armedTargetItem` style (bold border for reduced-motion armed state).
- `apps/native-rd/src/screens/EditModeScreen/EditModeScreen.tsx`: add `handleReorderSubSteps` (calls `reorderSubSteps`); add `handleReparentStep` (calls `updateStep({ parentStepId })`); pass both to `StepList`; own the `KeyboardAwareScrollViewRef` and ref-backed viewport/content/offset metrics used by drag auto-scroll; remove the now-redundant `hasSubSteps`/`canDrag` guard comment.
- `apps/native-rd/src/components/StepList/dragAutoScroll.ts`: pure edge-velocity calculation and clamping helpers for deterministic unit tests.
- `apps/native-rd/src/i18n/resources/en/editGoal.json`: **already done** — `nestUnder`, `nestUnderA11y`, `unNest`, `unNestA11y` landed under `stepList.a11y` in commit `901477b`. No change needed; consume the keys.
- `apps/native-rd/src/i18n/resources/de/editGoal.json`: **already done** (`901477b`). No change needed.
- `apps/native-rd/src/i18n/resources/pseudo/editGoal.json`: **already done** (`901477b`). No change needed.
- `apps/native-rd/src/components/StepList/__tests__/StepList.test.tsx`: extend with drag-guard removal, dwell-arm, SR nest/un-nest, and dispatch correctness tests.
- `apps/native-rd/src/screens/EditModeScreen/__tests__/EditModeScreen.test.tsx`: extend with promote/demote wiring tests (mock `updateStep` called with correct `parentStepId`; mock `reorderSubSteps` called for sub-step sibling reorder).

## Implementation Plan

### Step 1: i18n — nest/un-nest keys (row labels landed; add picker chrome)

**Row-label keys already exist** under `stepList.a11y` in all three resources, committed ahead of this session in `901477b` (`feat(i18n): add nest-under and un-nest screen reader strings`):

```json
"nestUnder": "Nest under \"{{title}}\"",      // reused for picker ROW labels
"nestUnderA11y": "Nest this step under {{title}}",
"unNest": "Un-nest",
"unNestA11y": "Promote this step to top level"
```

German + pseudo mirrors are present too. Verify with `grep -r nestUnder apps/native-rd/src/i18n/resources`.

**Remaining i18n work — picker chrome (Q1 decision = accessible picker, not single target).** Add three keys under `stepList.a11y` in `en/editGoal.json`, then mirror in de + pseudo:

```json
"nestUnderTrigger": "Nest under…",
"nestUnderTriggerA11y": "Nest this step under another step",
"nestUnderPickerTitle": "Choose a step to nest under"
```

German:

```json
"nestUnderTrigger": "Verschachteln unter…",
"nestUnderTriggerA11y": "Diesen Schritt unter einen anderen Schritt verschachteln",
"nestUnderPickerTitle": "Schritt zum Verschachteln auswählen"
```

Then run `bun run gen:pseudo` and commit the generated pseudo keys.

**Commit**: `feat(i18n): add nest-under picker chrome strings to editGoal`

_Note: i18n-first ordering — typed resources mean tsc fails if keys are referenced before they exist. Add these keys before Step 3 consumes them._

**Estimated LOC**: ~9 lines across 3 files.

---

### Step 2: StepList — props, dwell timer, ghost hiding, classifyDrop dispatch

**Files**:

- `src/components/StepList/StepList.tsx`

**Commit**: `feat(ui): StepList dwell-arm + classifyDrop dispatch for reparent gesture`

**Changes**:

- [ ] Add to `StepListProps`:
  ```ts
  onReorderSubSteps?: (parentStepId: string, childStepIds: string[]) => void;
  onReparentStep?: (stepId: string, newParentStepId: string | null) => void;
  ```
- [ ] Add React state: `const [armedTargetId, setArmedTargetId] = useState<string | null>(null)` and `const [isDragging, setIsDragging] = useState(false)` and `const dwellTimer = useRef<ReturnType<typeof setTimeout> | null>(null)`.
- [ ] Update `handleDragStart(index)`: set `setIsDragging(true)`; clear any existing dwell timer.
- [ ] Update `handleDragMove(translationY)` to also accept a `hoverStepId: string | null` parameter (the id of the step currently under the drag position, passed from `DraggableStepItem`). When `hoverStepId` changes:
  - Clear the current dwell timer.
  - Disarm (`setArmedTargetId(null)`).
  - If the hovered step is a valid arm candidate (root, not the dragged step, dragged step has no children): start a `setTimeout` of `DWELL_ARM_MS` that calls `setArmedTargetId(hoverStepId)`. Declare `const DWELL_ARM_MS = 220;` as a named module constant at the top of `StepList.tsx` (Q3 decision — easy on-device tuning; not a theme token).
- [ ] Update `handleDragEnd()`:
  - Clear dwell timer. Set `setIsDragging(false)`.
  - Call `classifyDrop(steps, draggedIndex, hoverIndex, armedTargetId)`.
  - Dispatch based on result kind:
    - `"reorder"` with `parentStepId === null`: call `onReorderSteps?.(orderedIds)`.
    - `"reorder"` with `parentStepId !== null`: call `onReorderSubSteps?.(parentStepId, orderedIds)`.
    - `"reparent"`: call `onReparentStep?.(stepId, newParentStepId)`.
    - `"none"`: no-op (snap-back handled by `DraggableStepItem`'s `resetDragState`).
  - Call haptic `triggerDragDrop()` for non-`"none"` results; announce via `AccessibilityInfo.announceForAccessibility` using the existing `movedFromTo` key.
  - Reset `setDraggedIndex(null)`, `setHoverIndex(null)`, `setArmedTargetId(null)`.
- [ ] Remove `!hasSubSteps` from the `canDrag` guard. New guard: `const canDrag = onReorderSteps && steps.length > 1 && editingId === null`.
- [ ] Update `handleMoveUp(index)` / `handleMoveDown(index)` to be **sibling-scoped only** (Q2 decision — ↑/↓ never reparent). Reorder the step _within its own sibling group_: a root step swaps with the adjacent root, a child step swaps with the adjacent child under the same parent. Dispatch `onReorderSteps` (root) or `onReorderSubSteps(parentStepId, …)` (child). At a group boundary (a child already at the top/bottom of its group, or a root adjacent to another group), the move is a no-op — do **not** route through `classifyDrop` and do **not** promote/demote. Reparenting is reached only via the explicit nest/un-nest controls (Step 3).
- [ ] Pass to `DraggableStepItem`:
  - `isArmedTarget={armedTargetId === step.id}`
  - `isDraggingAny={isDragging}` (used to hide ghost rows)
  - `onHoverStep={(id) => handleDragMove(translationY, id)}` — refactor `onDragMove` signature to include `hoverStepId`
  - `onNestUnder` / `onUnNest` callbacks (wired from `onReparentStep` for SR controls)
- [ ] Conditionally hide the `+sub-step` ghost row when `isDragging` is true (wrap the `showSubStepAffordance` check with `&& !isDragging`).

_Implementation note_: `DraggableStepItem` currently calls `onDragMove(e.translationY)`. To also pass the hovered step id, either (a) compute the hovered step index in `handleDragMove` (which already does the `translationY / ITEM_HEIGHT` math) and look up `steps[hoverIndex].id`, or (b) pass the computed `hoverIndex` back up. Option (a) is simpler: the id is already computable in `StepList` from `hoverIndex`. The `onDragMove` signature need not change — hovered step id can be derived from `hoverIndex` inside `handleDragMove` without touching `DraggableStepItem`.

**Estimated LOC**: ~80 lines net change (StepList.tsx).

---

### Step 3: DraggableStepItem — arm highlight + SR nest/un-nest controls

**Files**:

- `src/components/StepList/DraggableStepItem.tsx`
- `src/components/StepList/StepList.styles.ts`

**Commit**: `feat(ui): DraggableStepItem arm highlight + SR nest/un-nest controls`

**Changes**:

**DraggableStepItem.tsx**:

- [ ] Add props:
  ```ts
  isArmedTarget: boolean;
  canNestUnder?: boolean;   // true if this step is a leaf root that has ≥1 eligible target root (can be demoted)
  canUnNest?: boolean;      // true if this step is a child (has parentStepId)
  onNestUnder?: (targetId: string) => void;  // targetId chosen from the picker
  onUnNest?: () => void;
  ```
- [ ] Add `scaleArmed = useSharedValue(1)` shared value.
- [ ] `useEffect` on `isArmedTarget`:
  - When `isArmedTarget` becomes true and `animationPref !== "none"`: `scaleArmed.value = withSequence(withTiming(1.04, getTimingConfig(animationPref, "quick")), withTiming(1.0, getTimingConfig(animationPref, "normal")))`.
  - When `isArmedTarget` becomes false: `scaleArmed.value = noAnimation ? 1 : withTiming(1, timingQuick)`.
- [ ] Update `animatedStyle` to include `scaleArmed.value` in the transform (compose with existing `scale`).
- [ ] Apply `styles.armedTargetItem` border style when `isArmedTarget && noAnimation` (static bold border for reduced-motion arm feedback).
- [ ] When `showAccessibleControls` (Q1 decision = accessible picker, not a fixed single target):
  - **Nest under** — if `canNestUnder` and `onNestUnder`: render one `<IconButton>` using `nestUnderTrigger` / `nestUnderTriggerA11y`. Pressing it opens an accessible picker (see below) listing the eligible target roots; selecting a row calls `onNestUnder(targetId)`. This makes _any_ eligible root reachable (no "must reorder adjacent first" trap) with a single control per step (no O(n²) button clutter).
  - **Un-nest** — if `canUnNest` and `onUnNest`: render `<IconButton onPress={onUnNest} accessibilityLabel={t("editGoal:stepList.a11y.unNestA11y")} />`. Un-nest has no target choice (promote to root), so no picker.
- [ ] Picker implementation: prefer the app's existing menu/action-sheet pattern if one exists — **confirm during `/implement`** (grep for `ActionSheet`/`Menu`/`Modal` usage in `src/components`). If none, a minimal `Modal` with a titled (`nestUnderPickerTitle`) `FlatList` of eligible roots, each row labelled via `nestUnder`/`nestUnderA11y` with `{{title}}`, `accessibilityRole="button"`, 44pt min target. Eligible targets = all roots, excluding self (mirror `classifyDrop`'s demote-target rule so SR and drag agree).

**StepList.styles.ts**:

- [ ] Add `armedTargetItem` style: `borderWidth: theme.borderWidth.thick + 1, borderColor: theme.colors.accentPrimary` (a notably bolder border — distinct from `draggingItem` which changes background too).

**Estimated LOC**: ~60 lines net change across these two files.

---

### Step 4: EditModeScreen — wire deferred handlers

**Files**:

- `src/screens/EditModeScreen/EditModeScreen.tsx`

**Commit**: `feat(edit): wire handleReorderSubSteps + handleReparentStep, remove D13 guard comment`

**Changes**:

- [ ] Import `reorderSubSteps` from `../../db` (it is already exported from `src/db/index.ts`).
- [ ] Add `handleReorderSubSteps(parentStepId: string, childStepIds: string[])`: calls `reorderSubSteps(goalId as GoalId, parentStepId as StepId, childStepIds as StepId[])`. Same error-handling pattern as `handleReorderSteps`.
- [ ] Add `handleReparentStep(stepId: string, newParentStepId: string | null)`:
  - Calls `updateStep(stepId as StepId, { parentStepId: newParentStepId as StepId | null })`.
  - If `newParentStepId !== null` (demote): compute the next child ordinal for that parent group and immediately call `reorderSubSteps` to append at the end (append-to-end semantics on demote).
  - Same error-handling pattern.
- [ ] Pass `onReorderSubSteps={handleReorderSubSteps}` and `onReparentStep={handleReparentStep}` to `<StepList>`.
- [ ] Remove the now-stale `!hasSubSteps` from `canDrag` (it lives in StepList now, already removed in Step 2) and clean up the D13 guard comment.

**Estimated LOC**: ~45 lines net change.

---

### Step 5: Drag auto-scroll for off-screen destinations

**Files**:

- `src/screens/EditModeScreen/EditModeScreen.tsx`
- `src/components/StepList/StepList.tsx`
- `src/components/StepList/DraggableStepItem.tsx`
- `src/components/StepList/dragAutoScroll.ts`
- `src/components/StepList/__tests__/dragAutoScroll.test.ts`

**Commit**: `feat(steplist): auto-scroll edit form during drag`

**Changes**:

- [x] In `EditModeScreen`, attach a `KeyboardAwareScrollViewRef` to the existing `KeyboardAwareScrollView`. Track the following in refs so scroll events do not rerender the full edit form at 60 fps:
  - current `contentOffset.y` (`onScroll`, `scrollEventThrottle={16}`),
  - viewport height and absolute screen `pageY` (`onLayout` + `measureInWindow`),
  - content height (`onContentSizeChange`).
- [x] Pass a stable optional `dragScrollController` into `StepList`:
  ```ts
  interface DragScrollController {
    getMetrics(): {
      offsetY: number;
      viewportTop: number;
      viewportHeight: number;
      contentHeight: number;
    };
    scrollTo(y: number): void;
  }
  ```
  `scrollTo` calls `scrollRef.current?.scrollTo({ y, animated: false })`.
- [x] Update `DraggableStepItem.onDragMove` to receive both `translationY` and `absoluteY`; forward `event.absoluteY` from the Gesture Handler pan update.
- [x] Add pure `getAutoScrollVelocity(pointerY, metrics)` in `dragAutoScroll.ts`:
  - named constants `AUTO_SCROLL_EDGE_PX = 72`, `AUTO_SCROLL_MIN_PX_PER_FRAME = 3`, `AUTO_SCROLL_MAX_PX_PER_FRAME = 14`,
  - zero velocity outside the edge zones or when already at the relevant scroll boundary,
  - progressive (quadratic) speed based on penetration into the edge zone,
  - negative velocity at the top and positive velocity at the bottom.
- [x] In `StepList`, store the latest `translationY`/`absoluteY`, scroll offset at drag start, and animation-frame id in refs. Start or maintain a `requestAnimationFrame` loop while velocity is non-zero; each frame:
  1. re-read controller metrics,
  2. calculate and clamp the next offset to `0...contentHeight - viewportHeight`,
  3. call `scrollTo(nextOffset)`,
  4. recompute hover/drop feedback using `effectiveTranslationY = gestureTranslationY + nextOffset - scrollOffsetAtDragStart`,
  5. schedule the next frame while the pointer remains in an edge zone.
- [x] Continue the loop while the finger is stationary. Do not depend on receiving another pan update to advance scrolling.
- [x] Stop and clear the frame when the pointer leaves both edge zones, a scroll boundary is reached, the drag ends/finalizes, or `StepList` unmounts.
- [x] While a step drag is active, set the outer scroll view's `scrollEnabled={false}` through an `onDragStateChange` callback so native scrolling cannot compete with the manual pan; programmatic `scrollTo` remains the only scroll source until drop.
- [x] Keep auto-scroll independent of `animationPref`: this is functional navigation, not decorative motion. Do not use animated `scrollTo`, and do not emit per-frame haptics or accessibility announcements.
- [x] Unit-test velocity direction, progressive speed, dead zone, both boundaries, offset clamping, and effective-translation calculation.

**Estimated LOC**: ~140 lines across controller wiring, gesture integration, helper, and tests.

---

### Step 6: Tests — StepList gesture paths + EditModeScreen wiring

**Files**:

- `src/components/StepList/__tests__/StepList.test.tsx`
- `src/screens/EditModeScreen/__tests__/EditModeScreen.test.tsx`

**Commit**: `test(ui): StepList drag-reparent paths + EditModeScreen promote/demote wiring`

**Changes**:

**StepList.test.tsx** (extend existing file):

- [ ] `drag-disable guard` describe block: update the test "disables reordering when any sub-step is present" — this test should now FAIL the guard-off premise. Replace it: now that the guard is removed, a flat list with sub-steps **does** show the ↑/↓ controls. Update the test to confirm that keyboard controls appear for goals with sub-steps (verifying D13 removal).
- [ ] New describe block `classifyDrop dispatch via handleDragEnd`:
  - Test that `onReorderSteps` is called when a root-only list reorders (proxy: the mock is called after programmatic `draggedIndex`/`hoverIndex` setup — since gestures are mocked, simulate by calling `handleDragEnd` through the component's internal state via a test spy or by testing the `classifyDrop` output directly via the existing pure test).
  - Test that `onReorderSubSteps` is called when children are reordered (simulate via mock).
  - Test that `onReparentStep` is called with `newParentStepId: null` when a child is promoted.
- [ ] New describe block `SR nest/un-nest controls`:
  - With accessible controls shown, a leaf root step that has ≥1 eligible target root renders a "Nest under…" trigger button (`nestUnderTrigger`).
  - Pressing the trigger opens the picker; the picker lists exactly the eligible target roots (all roots, excluding self), each row labelled with its title.
  - Selecting a picker row calls `onReparentStep(stepId, targetId)` with the chosen target id.
  - A leaf root with no eligible targets does **not** render the trigger.
  - A child step renders an "Un-nest" button; pressing it calls `onReparentStep(stepId, null)`.
  - ↑/↓ on a child at its group boundary is a no-op (does not promote) — guards the Q2 sibling-only decision.
- [ ] New describe `ghost rows hidden during drag`:
  - While `isDragging` is true (trigger `handleDragStart`), the `+sub-step` ghost row `testID` is absent from the tree.

**EditModeScreen.test.tsx** (extend existing file):

- [ ] Test that `reorderSubSteps` is called when `onReorderSubSteps` is triggered (mock the db call, use the `STEPS_TREE` fixture already in the test file).
- [ ] Test that `updateStep` is called with `parentStepId: null` when `onReparentStep` is triggered with `null` (promote).
- [ ] Test that `updateStep` is called with `parentStepId: <id>` when `onReparentStep` is triggered with a parent id (demote).

**Estimated LOC**: ~150 lines across both test files.

---

## Testing Strategy

- [x] Unit tests for `classifyDrop` — complete (13 cases, `classifyDrop.test.ts`).
- [x] Unit tests for `dragAutoScroll`: dead zone, top/bottom direction, progressive speed, boundary stops, clamping, and scroll-adjusted translation.
- [ ] Component tests: StepList dispatch paths, SR controls, ghost-hiding (Jest 30, `@testing-library/react-native` v13).
- [ ] Component tests: EditModeScreen promote/demote wiring (extend existing test).
- [ ] Test file paths: adjacent `__tests__/` in component dirs (matches existing pattern).
- [ ] Use `test.each` for the dispatch-kind matrix if repetitive.
- [ ] Manual QA (device required — see issue "Manual device QA" scope item):
  - Drag-reorder among siblings (roots + children independently).
  - Promote: drag child step above its parent's group.
  - Dwell-demote: hover a leaf over a root (with or without existing children) ~220 ms → arm feedback → release.
  - Refused snap-back: attempt to demote a parent-with-children.
  - Reduced-motion (`animationPref = "none"`): bold border on arm, no scale animation.
  - Screen-reader (VoiceOver/TalkBack): nest/un-nest buttons appear and dispatch correctly.
  - Long list: hold a dragged row inside the top/bottom 72 px edge zone; scrolling continues while the finger remains stationary.
  - Auto-scroll boundaries: scrolling stops cleanly at content start/end without jitter or repeated work.
  - Auto-scroll targeting: dashed outline/insertion indicator advances with scrolled content and the released row lands at the previewed destination.
  - Drag cancellation/unmount: no continued scrolling after finalization or navigation away.

## Not in Scope

| Item                                                                             | Reason                                                                                                     | Follow-up                                    |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| GoalCard / FocusMode / Timeline sub-step reading surfaces                        | Deferred from #290/#291                                                                                    | #292/#293                                    |
| Exhaustive a11y contract pass                                                    | Deferred from #290/#291                                                                                    | #294                                         |
| Drag-reparent in the create flow (NewGoalModal)                                  | Settled: create happens in EditMode                                                                        | —                                            |
| Progress counting rule (leaf-only vs every-unit)                                 | Post-Stage-6 decision                                                                                      | —                                            |
| Position-implied insert on demote (land at the drag drop slot, not end of group) | Q5 decision: ship append-to-end first; revisit drop-position insert once the gesture feels right on device | Post #330 (Joe leans toward this eventually) |

_Note: the multiple-nest-target SR picker, previously deferred here, is now **in scope** (Q1 decision — see Step 1/Step 3)._

_No items deferred from the Must-Not-Do list._

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->

- [2026-06-20 11:00] Plan review found that `classifyDrop` accepts an armed root that already has children, despite issue #330 restricting dwell-demote targets to childless roots. Add the missing classifier guard and regression test before gesture wiring.
- [2026-06-20 11:00] D18 would make the existing ↑/↓ reorder controls implicitly promote/demote at sibling boundaries. That conflicts with D12's separate explicit nest/un-nest controls and makes a reorder action change hierarchy. Recommended revision: keep ↑/↓ sibling-scoped and reserve reparenting for nest/un-nest.
- [2026-06-20 11:00] Step 4 normalizes destination ordinals only for demotion. Promotion preserves the former child ordinal, which can collide with root ordinals. The earlier #290 plan requires recomputing destination sibling ordinals after either reparent direction; Step 4 needs the same rule.
- [2026-06-20 12:00] **Open-question resolutions (Joe).** Q1 SR nest target → accessible **"Nest under…" picker** of eligible target roots (most accessible; avoids the single-target trap and per-target button clutter). Pulls the previously-deferred picker into scope; +~3 i18n chrome keys + small picker component. Q2 keyboard ↑/↓ → **sibling-reorder only**, never reparent (WCAG 3.2 predictability); reparent reached only via nest/un-nest controls. Q3 dwell → named constant `DWELL_ARM_MS = 220`, tuned on device. Q4 arm animation → **single grow-and-settle** (confirmed). Q5 demote position → **append-to-end now**, leave drop-position insert as a Post-#330 follow-up (Joe leans toward it eventually).

---

## Implementation Progress (2026-06-20, `/implement`)

**Commits landed on `feat/issue-330-drag-reparent-gesture` (Steps 1-4 plus review/device fixes):**

| #   | SHA       | Commit                                                                      | Maps to               |
| --- | --------- | --------------------------------------------------------------------------- | --------------------- |
| 1   | `2a5dec2` | `fix(steplist): restrict dwell-demote to childless root targets`            | Discovery-log pre-fix |
| 2   | `d68d322` | `feat(i18n): add nest-under picker chrome strings to editGoal`              | Step 1                |
| 3   | `48f582e` | `feat(ui): DraggableStepItem arm highlight + SR nest/un-nest controls`      | Step 3                |
| 4   | `b5d6ab6` | `feat(ui): StepList dwell-arm + classifyDrop dispatch for reparent gesture` | Step 2                |
| 5   | `fa0684d` | `feat(edit): wire handleReorderSubSteps + handleReparentStep`               | Step 4                |
| 6   | `d0aa17e` | `fix(steplist): clarify drag targets and preserve nesting`                  | Device/review fixes   |
| 7   | `f361349` | `docs(plan): add drag auto-scroll implementation step`                      | Step 5 plan           |
| 8   | `cf8073f` | `feat(steplist): auto-scroll edit form during drag`                         | Step 5                |

**Validation after each commit:** `bun run type-check` ✅, `bun run lint` ✅ (husky also re-runs type-check pre-commit). `classifyDrop.test.ts` 13/13 ✅ (via `bun test`). `StepList.test.tsx` 13/13 ✅ (via `bash scripts/jest-node.sh` — see tooling note).

**REMAINING — plan Step 6 plus device QA:**

- Step 6: `StepList.test.tsx` new describe blocks — `classifyDrop dispatch via handleDragEnd`, `SR nest/un-nest controls` (trigger renders, picker lists eligible targets, selecting dispatches, no-trigger when no targets, un-nest dispatches, ↑/↓ group-boundary no-op), `ghost rows hidden during drag`.
- `EditModeScreen.test.tsx`: `reorderSubSteps` called on `onReorderSubSteps`; `updateStep` called with `parentStepId: null` (promote) and `parentStepId: <id>` (demote), using `STEPS_TREE`. NOTE: the mock `db` in this test file does **not** yet export `reorderSubSteps` — add it to the `jest.mock("../../db", …)` block.
- Then run full `bun run type-check` / `lint` / `test` / `build`, complete the implement skill's Phase 4 intent re-check, and proceed to `/self-review` → `/finalize`.

**Deviations / decisions logged during implementation:**

- [2026-06-20] **Extra commit ahead of the 5-step plan.** The Discovery-log classifier guard (childless dwell targets) shipped as its own `fix(...)` commit + regression test before any gesture wiring, as that entry mandated.
- [2026-06-20] **New `DraggableStepItem` props are optional** (`isArmedTarget` defaults `false`, etc.), not the plan's required `isArmedTarget: boolean`. This lets the DraggableStepItem commit type-check before the StepList commit wires the props (atomic-commit buildability). No behavioural difference once both commits are present.
- [2026-06-20] **`handleReparentStep` normalizes the destination ordinal in BOTH directions in a single `updateStep({ parentStepId, ordinal })` call**, instead of the plan's "updateStep then a separate `reorderSubSteps` append on demote only". This directly resolves the promote-side ordinal-collision the Discovery Log flagged (a promoted child's old scoped ordinal would collide with root ordinals) and avoids a second mutation. Append-to-end semantics preserved; position-implied insert remains the Post-#330 follow-up.
- [2026-06-20] **Dwell disarm is keyed on a hovered-row-id ref (`hoverStepIdRef`)**, not on the `hoverIndex` React state, so change-detection survives async `setState` and the dwell timer isn't reset every pan frame (which would prevent it ever firing). Implementation detail under D14/D15.
- [2026-06-20] **Tooling: `bun test` segfaults on the RN component test suites** (`react-test-renderer` under Bun). Pure TS tests (`classifyDrop`) run fine under `bun test`; component/screen tests must run via `bash apps/native-rd/scripts/jest-node.sh <pattern> --no-coverage`. Use jest for Step 5.
- [2026-06-20] **`StepList.tsx` is now ~689 lines**, over the 300-line soft lint limit (`local/file-size-limit`, **warning** not error — pre-existing overage, the file was already >300). Not split here (out of scope for #330); candidate follow-up: extract the gesture/dwell logic into a hook.
- [2026-06-20 PM] **Drag legibility revision (Joe, on-device feedback).** Two problems surfaced testing the gesture: (a) the armed-target grow was imperceptible, and (b) plain reorder gave _unpredictable_ landings. Root cause of (b): `handleDragMove` mapped finger travel to a target row via `Math.round(translationY / ITEM_HEIGHT)` with a hardcoded 48px, but real rows vary (evidence icons, wrapped titles, inter-row gap, child indent), so the computed slot drifted from the finger. Fixes:
  - **D16 superseded** — the `scaleArmed` grow-and-settle pulse is removed. The armed dwell target now gets a **sustained dashed `success` border** (`styles.armedTargetItem`) for _all_ motion settings (it's static, so no separate reduced-motion path). Reads as a distinct "drop here to nest" cue vs. the dragged row's solid `accentPrimary` border. Q4's "single grow-and-settle" is withdrawn.
  - **Measured geometry** — each row reports `onLayout` y+height into `rowLayoutsRef`; the landing slot is computed from the dragged row's real pixel centre, not a fixed height. `ITEM_HEIGHT` kept only as a pre-layout fallback.
  - **Reorder insertion line** (`styles.dropLine`) — a solid accent bar drawn at the real landing boundary, indented (`dropLineNested`) when the drop would land at a nested level. Previews via `classifyDrop` so it never shows a slot the classifier would refuse; suppressed while a nest target is armed. This also delivers the visible "where will it land" the Q5 follow-up gestured at, for the reorder case (positional demote-insert is still future work).
- [2026-06-20 PM] **Review corrections after device testing.** The childless-target restriction made a parent a one-use dwell target: after the first successful nest it could never arm again. Dwell and accessible-picker targets now include every root; demotes still require the dragged step to be a leaf and append using `handleReparentStep`. Transient drag indices and armed identity are mirrored in refs so active gesture callbacks do not read pre-drag React state, leaving the hovered row disarms immediately, and drag-end reads the visible target. Pan completion now dispatches only from `onFinalize`, guarded by whether a drag actually started, preventing the former `onEnd` + `onFinalize` duplicate write.
- [2026-06-20 PM] **Armed-target persistence correction.** Disarming on every post-arm pan update made the dashed outline effectively invisible because normal finger jitter generates continuous updates. The target now remains armed while the drag stays within its row and disarms only after crossing into another row.
- [2026-06-20 PM] **First-substep reorder correction.** The positional classifier previously derived nesting only from the row above a drop slot. For the first child slot that row is the root parent, so moving a later child to the front incorrectly promoted it. Slots now inherit the sibling group from the row at the insertion point, falling back to the row above only at the end of the list; promotion still occurs when the child is moved above its parent group.
- [2026-06-20 PM] **Nested destination legibility.** The indented blue insertion line was too subtle during substep reorder. Nested destinations now receive a full dashed success outline at the measured target-row bounds, rendered above the translated drag card. Root reorders retain the compact accent insertion line, and armed root targets retain their dashed nest-under outline.
- [2026-06-20 PM] **Auto-scroll drag compensation.** Scroll-adjusted hit testing alone is insufficient because programmatic scrolling moves the dragged row's original layout away from the stationary finger. `StepList` now applies the accumulated scroll delta through a Reanimated shared value to the active `DraggableStepItem`, keeping both the card and drop preview aligned while the outer form scrolls. During an active drag, the controller's requested offset is authoritative so lagging native `onScroll` events cannot pull the frame loop backward.
- [2026-06-20 PM] **Top-root insertion vs. dwell correction.** A root dragged above the first row could dwell-arm that row while passing over it, causing the armed demote result to override the positional reorder. Only the middle 60% of a root row now arms nesting; entering either outer 20% cancels the dwell timer/armed state and preserves before/after insertion, including the slot above the first root.
