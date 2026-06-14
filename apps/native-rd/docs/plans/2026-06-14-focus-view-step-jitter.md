# 2026-06-14 — Focus view step-navigation jitter

## Goal

Remove the visible stutter that occurs when moving between cards in Focus
mode (arrow tap, swipe, dot/timeline tap, and auto-advance after a step
completes). The carousel slide is already a UI-thread Reanimated animation
and should be able to run smoothly, but navigation also triggers substantial
JS rendering and query work in the same commit that starts the slide. Reduce
that work first, then profile to confirm whether it accounts for the dropped
frames before changing carousel behavior.

No behaviour, schema, or visual changes — same cards, same animation, same
evidence gating. This is a performance-only change.

## Why

A single `handleIndexChange` (`FocusModeScreen.tsx:293`) sets
`currentCardIndex`, which fans out into a synchronous burst on the JS thread
right as the slide starts:

1. **Every card re-renders on every navigation.** `uiSteps` depends on
   `currentCardIndex` (`FocusModeScreen.tsx:140-154`), so `stepsWithEvidence`
   recomputes and the children array (`:576-606`) is rebuilt with fresh prop
   objects for _all_ cards. `StepCard` (`StepCard.tsx:72`), `GoalEvidenceCard`,
   and the `AnimatedCard` wrapper are plain function components — none are
   `React.memo`. So N steps + the goal card all re-render per move, each
   re-running `useTranslation`, the `useFlashOnIncrease` Reanimated hook
   (`StepCard.tsx:83`), the evidence-option builders, and a full `ScrollView`
   subtree. Memo alone won't help because the per-card handlers
   (`onToggleComplete`, `onQuickEvidence`, `onEvidenceTap`) are re-created
   inline every render (`:590-592`) and the handler functions themselves
   aren't `useCallback`'d.

2. **A fresh DB query fires on every step change — even with the drawer
   closed.** `currentStepId` changes each navigation, so
   `useQuery(evidenceByStepQuery(currentStepId))` (`FocusModeScreen.tsx:206-211`)
   re-subscribes and runs new SQL on every move. But navigation _closes_ the
   drawer (`:295`), so this result usually isn't even shown — it's an Evolu
   re-subscription mid-slide for data nothing is displaying. (Card evidence
   badges already read the goal-wide `allStepEvidenceRows`, which also contains
   the complete rows needed by the drawer.)

3. **The carousel keeps all cards mounted.** This increases the retained native
   view tree, but it is not yet established as transition-time work:
   `AnimatedCard`'s effect depends on `position`, so cards that remain hidden do
   not dispatch new `withTiming` calls on every navigation
   (`CardCarousel.tsx:58-85`). Profile before changing carousel mounting; windowing
   has correctness risks for non-adjacent dot/timeline and auto-advance jumps.

4. **Step completion adds mutation work.** `handleToggleStep` does a DB write
   (`completeStep`) and requests navigation in the same handler; the write then
   causes reactive query emissions and further renders. The current branches do
   not issue two index updates for one completion: an intermediate completion
   advances to another pending step, while final completion has no pending
   `nextIndex` and lets the all-steps-complete effect move to the goal card.
   Treat any further completion-path optimization as profiling-led follow-up.

## Acceptance criteria

- Moving between cards (arrow / swipe / dot / timeline / auto-advance) is
  visibly smooth on a goal with ≥5 steps on a mid-tier device.
- Re-render scope per navigation is bounded to the cards whose state actually
  changed (the outgoing in-progress card → pending and the incoming →
  in-progress), not every card.
- Step navigation does not create or subscribe to a new per-step evidence
  query. Drawer rows are selected from the already-loaded goal-wide step
  evidence result.
- No change to evidence gating, completion flow, snap-to-pending / snap-to-goal
  behaviour, a11y announcements, or the look of the cards/animation.
- `bun run type-check`, `bun run lint`, and the Focus-mode test suite pass.

## Out of scope

- Replacing `CardCarousel` with FlashList/Reanimated-Carousel or any new dep.
- Windowing/unmounting carousel cards without profiling evidence that retained
  hidden cards are still a material source of transition-time work.
- Reworking `EvidenceDrawer` open/close animation.
- Changing the auto-advance / snap lifecycle semantics.
- Evolu query shape or schema changes.

## Atomic commits

Bottom-up; each commit leaves the tree green (type-check + lint + tests).

- [x] Commit 1 — Stable callbacks + memoized cards
- [x] Commit 2 — Remove the redundant per-step evidence query

### Commit 1 — Stable callbacks + memoized cards (highest leverage)

Stops unchanged/off-screen cards re-rendering on every navigation.

**Files**

- `apps/native-rd/src/components/StepCard/StepCard.tsx`
- `apps/native-rd/src/components/GoalEvidenceCard/GoalEvidenceCard.tsx`
- `apps/native-rd/src/screens/FocusModeScreen/FocusModeScreen.tsx`

**Changes**

- Wrap `StepCard` and `GoalEvidenceCard` in `React.memo`. Because the per-step
  derived arrays (`plannedEvidenceTypes`, `capturedEvidenceTypes`) get new
  identity each render, give `StepCard` a small `areEqual` comparator that
  compares those arrays by content (or memoize per-step view-models so unchanged
  steps keep identity — pick whichever reads cleaner; comparator is simpler).
- Change `StepCard`'s callback contract so the parent can pass stable refs:
  `onToggleComplete(id)` and `onQuickEvidence(id, type)` (StepCard already has
  `step.id`). Update `StepCard.stories.tsx` / tests to the new signatures.
- In `FocusContent`, define every `useCallback` before the `if (!goal)` early
  return so hook order is identical while the goal query moves between loading,
  missing, and populated states.
- Stabilize `handleIndexChange` without reading `isDrawerOpen` or
  `isFABMenuOpen`: call `setCurrentCardIndex(index)`, `setIsDrawerOpen(false)`,
  and `setIsFABMenuOpen(false)` unconditionally. React ignores no-op state
  updates, and this keeps the callback independent of navigation-time UI state.
- `useCallback` `handleToggleStep`, `handleEvidenceTap`,
  `handleQuickEvidence`, `handleMarkComplete`, and `handleBadgePress`. Give
  `handleToggleStep` only the data dependencies required for completion and
  call the stable `handleIndexChange`; do not capture `currentCardIndex` merely
  to skip an idempotent index update.
- Pass stable callback refs directly instead of inline arrows.

### Commit 2 — Remove the redundant per-step evidence query

Removes the mid-navigation Evolu load/subscription from the hot path without
adding a drawer-open Suspense boundary.

**Files**

- `apps/native-rd/src/screens/FocusModeScreen/FocusModeScreen.tsx`

**Changes**

- Delete the `useQuery(evidenceByStepQuery(...))` call from `FocusContent`.
- Derive `currentStepEvidenceRows` with `useMemo` by filtering the already
  subscribed `allStepEvidenceRows` for `currentStepId`. This avoids new SQL,
  subscription churn, and a possible Suspense load when the drawer opens.
- Keep goal-card rows sourced from the existing `goalEvidenceRows` query.
- Confirm `drawerEvidence`, delete, and view handlers resolve the same complete
  evidence row, including `uri` and `metadata`, from the filtered rows.

## Conditional follow-ups

Do not change carousel mounting or completion semantics as part of the initial
fix. First capture a before/after profile after commits 1-2.

### Carousel mounting

- If hidden mounted cards remain material, write a separate follow-up plan that
  preserves outgoing and destination cards until transition completion.
  Rendering only the new left/center/right window and seeding directly at target
  positions is not acceptable because long jumps would pop rather than animate.
- A future implementation must also use stable child keys and cover adjacent
  navigation, long jumps, wrapped auto-advance, keyboard navigation, a11y
  visibility, and preview-peek visuals.

### Completion path

- If profiles still show completion-specific dropped frames, isolate whether
  the cost is the mutation, reactive query emission, accessibility announcement,
  or card render before proposing a change.
- Preserve the current mutually exclusive navigation behavior: advance to
  another pending step when one exists; otherwise let the pending-to-complete
  effect snap to the goal card and announce completion.

## Verification

- Manual baseline and comparison: use the same physical device, build mode,
  goal, and animation preference before and after the change. Record the device
  model and test a goal with ≥5 steps.
- Exercise adjacent arrow/swipe navigation, non-adjacent dot/timeline jumps,
  wrapped auto-advance across completed steps, final-step snap-to-goal, and
  navigation while the evidence drawer is open.
- Capture React DevTools render evidence for one navigation before and after.
  The after profile must show unchanged `StepCard` and `GoalEvidenceCard`
  instances skipping renders.
- Use the React Native performance monitor or profiler available in the local
  development build to compare JS/UI frame drops. Treat visual inspection as a
  supporting check, not the only performance evidence.
- Optionally add temporary render-count logging to `StepCard` to confirm only
  changed cards re-render per navigation (remove before commit).
- Tests: extend the Focus-mode suite to assert that `evidenceByStepQuery` is
  never invoked, including after navigation and drawer opening, and that drawer
  view/delete behavior still uses the correct current-step row.
- Add a focused memoization regression test using a render spy or instrumented
  child to assert an unrelated card does not re-render when only
  `currentCardIndex` changes. Do not infer this from card presence, since all
  cards intentionally remain mounted.

## Discovery log

- [2026-06-14] Used `useFlashOnIncrease` as the render probe in the Focus-mode
  regression test. It runs once per card render and avoids altering production
  component APIs solely for instrumentation.
- [2026-06-14] Confirmed `stepEvidenceByGoalQuery` selects every evidence
  column, so filtered drawer rows retain `uri` and `metadata` for view and
  delayed file deletion behavior.
