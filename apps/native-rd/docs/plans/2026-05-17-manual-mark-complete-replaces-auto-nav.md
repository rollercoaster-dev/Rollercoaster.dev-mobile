# 2026-05-17 — Manual "Mark Complete" replaces step auto-nav

## Goal

Replace the auto-navigation that fires when all steps complete with an
explicit "Mark Complete" check on the goal card. The same check gives
stepless goals their first-ever completion path. `CompletionFlow`'s
existing `evidence-prompt` phase continues to enforce the evidence
requirement — no DB or schema changes.

## Why

- Stepless goals are creatable today (`createGoal` takes only a title;
  `NewGoalModal` has zero step references) but have no completion path:
  `allStepsComplete = stepRows.length > 0 && stepRows.every(...)` in
  `FocusModeScreen.tsx:231` short-circuits when there are no steps.
- The auto-nav at `FocusModeScreen.tsx:254–273` already needs the
  `sawIncomplete` / `completionFired` lifecycle flags to suppress
  spurious fires (Reopen Goal, fresh-mount-on-complete). Those flags
  are a bandaid that proves the auto-nav is fragile.
- An explicit user-initiated "Mark Complete" tap collapses both cases
  into one rule: _a goal is a thing the user marks complete; steps are
  optional prerequisites the UI uses to gate that mark._

## Acceptance criteria

- Stepless goal (`stepRows.length === 0`): "Mark Complete" check is
  enabled from mount; tap navigates to `CompletionFlow`.
- Stepped goal: "Mark Complete" check is disabled until
  `allStepsComplete`; transition to enabled triggers a snap-to-goal-card
  - a11y announce; tap navigates to `CompletionFlow`.
- No auto-navigation from `FocusMode` to `CompletionFlow` under any
  circumstance.
- Reopen Goal lands the user back on `FocusMode` with the check
  re-tappable. No replace-vs-navigate gymnastics needed.
- All existing tests pass after their auto-nav assertions are rewritten
  as check-state assertions.

## Out of scope

- Editing the asymmetry between step-level vs goal-level evidence in
  `CompletionFlow.evidence-prompt` (pre-existing; a stepped user may
  breeze past evidence-prompt because step-level evidence already
  exists, while a stepless user must add goal-level evidence).
- Any change to `canCompleteGoal` or `completeGoal` semantics.
- Any change to `EditMode` or `NewGoalModal`.

## Atomic commits

Order is bottom-up so every commit leaves the tree green.

### Commit 1 — `GoalEvidenceCard` gains the check

Leaf-first; callers still ignore the new props in this commit.

**Files**

- `apps/native-rd/src/components/GoalEvidenceCard/GoalEvidenceCard.tsx`
- `apps/native-rd/src/components/GoalEvidenceCard/GoalEvidenceCard.styles.ts`
- `apps/native-rd/src/components/GoalEvidenceCard/GoalEvidenceCard.stories.tsx`
- `apps/native-rd/src/components/GoalEvidenceCard/__tests__/GoalEvidenceCard.test.tsx`

**Changes**

- Add props: `canMarkComplete: boolean`, `onMarkComplete: () => void`,
  `pendingStepCount?: number` (for the locked-state hint).
- Add a `Checkbox` (same component `StepCard` uses) + a `StatusBadge`
  showing `"ready"` (enabled) or `"locked"` (disabled). When locked and
  `pendingStepCount > 0`, show a small hint:
  `"Complete {n} remaining step{s}"`.
- Defaults — `canMarkComplete = false`, `onMarkComplete = () => {}` —
  keep this commit non-breaking. `FocusModeScreen` doesn't pass the
  props yet.
- Stories: add `Locked` and `Ready` variants.
- Tests: enabled tap fires callback; disabled tap does not; correct a11y
  labels in both states.

**Green check:** `bun run type-check && bun run lint && bun test --testPathPatterns GoalEvidenceCard`.

### Commit 2 — `FocusModeScreen` wires the check + deletes auto-nav

**Files**

- `apps/native-rd/src/screens/FocusModeScreen/FocusModeScreen.tsx`
- `apps/native-rd/src/screens/FocusModeScreen/__tests__/FocusModeScreen.test.tsx`

**Changes**

- Derive `canMarkComplete = stepRows.length === 0 || allStepsComplete`.
- Add `handleMarkComplete = () => navigation.navigate("CompletionFlow", { goalId })`.
- Pass `canMarkComplete`, `onMarkComplete`, `pendingStepCount` to
  `GoalEvidenceCard` at the carousel render site (`:583`).
- Add snap effect: mirrors `snappedToFirstPending` (`:239–248`) — on
  `allStepsComplete` false→true transition, set
  `currentCardIndex = stepRows.length` (the goal card slot). Track in
  `lifecycle.current.snappedToGoalCard` so it fires once per mount.
- Add a11y announce on the same transition:
  `"All steps complete. Mark Complete is now available on the goal card."`
- **Delete:** auto-nav `useEffect` (`:254–273`).
- **Delete:** `sawIncomplete` and `completionFired` from the `lifecycle`
  ref (`:117–125`). Update the comment that explained them.

**Test updates**

- **Delete:** the `setTimeout(400)` auto-nav assertion (~line 488) and
  any siblings.
- **Delete:** the "doesn't bounce on reopen" tests (failure mode no
  longer exists).
- **Add:**
  - checkbox disabled when steps pending
  - checkbox enabled when all steps complete
  - tap navigates to `CompletionFlow` with `goalId`
  - stepless goal: checkbox enabled from first mount
  - snap to goal card fires on the final-step transition

**Green check:** full suite plus a manual iOS sim run — this is the
load-bearing screen.

### Commit 3 — `CompletionFlowScreen.handleReopenGoal` cleanup

**Files**

- `apps/native-rd/src/screens/CompletionFlowScreen/CompletionFlowScreen.tsx`
- `apps/native-rd/src/screens/CompletionFlowScreen/__tests__/CompletionFlowScreen.test.tsx`

**Changes**

- `handleReopenGoal` (`:343–347`): swap `navigation.replace("FocusMode", { goalId })`
  for `navigation.goBack()` (or `navigate("FocusMode", { goalId })` if
  the back stack might not contain `FocusMode` — verify during
  implementation). The `replace` was specifically to dodge the
  `BadgeEarnedModal` re-show that came from the auto-nav loop; with no
  auto-nav, the loop is impossible.
- Update the comment on the same line that explained the `replace`
  choice.
- Test at `CompletionFlowScreen.test.tsx:372` ("calls uncompleteGoal and
  replaces with FocusMode on reopen") rewritten to assert the new
  navigation method.

**Green check:** suite + a sim-side reopen flow check.

## Validation

1. Per-commit: `bun run type-check`, `bun run lint`,
   `bun test --testPathPatterns <relevant>`.
2. After commit 3: full `bun run test:ci` once.
3. Manual on iOS sim (RN code changes require a native build per
   `apps/native-rd/CLAUDE.md`):
   - Stepless goal: create, swipe to goal card, tap Mark Complete →
     CompletionFlow → add evidence → bake → badge appears.
   - Stepped goal: complete all steps, observe snap to goal card + a11y
     announce, tap Mark Complete → CompletionFlow → bake → badge
     appears.
   - Reopen Goal: bake a goal, reopen from CompletionFlow, confirm we
     land on FocusMode with the check re-tappable and no celebration
     bounce.
   - Stepped goal with pending steps: confirm check is disabled with
     locked hint.

## Risks

- **Behavior change for existing users:** the auto-nav is gone. PR
  description must name this so reviewers don't treat it as a
  regression. Argument: replaces a hidden auto-action with a
  discoverable, user-initiated one; ND-friendlier (no surprise
  navigation); fixes the long-standing `sawIncomplete` bandaid that
  proves the auto-nav was always fragile.
- **Test deletions** look aggressive in diff. Mitigation: keep deletions
  and additions in the same commit so each removal is paired with the
  equivalent assertion in the new model.
- **Snap-to-goal-card edge:** if a user adds steps in `EditMode` _after_
  `allStepsComplete` flipped true, then returns to `FocusMode`, snap
  should not re-fire. The `snappedToGoalCard` flag handles this for the
  current mount; remount semantics inherit `snappedToFirstPending`'s
  existing behavior. Verify in manual pass.

## Follow-ups (not blocking)

- Normalize the `evidence-prompt` asymmetry: stepped users with only
  step-level evidence skip the prompt; stepless users must add
  goal-level evidence. Decide whether to require goal-level evidence
  uniformly. Separate issue.
