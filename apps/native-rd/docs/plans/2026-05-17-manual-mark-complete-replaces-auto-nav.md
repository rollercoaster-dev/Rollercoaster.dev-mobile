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

---

# Extension — Goal card surfaces goal info + badge designer link

Follows on from the mark-complete work above. The card in FocusMode that
sits at the tail of the carousel (`GoalEvidenceCard`) currently shows
only generic placeholder copy ("★ Goal" / "Goal Evidence" / "Evidence
for the overall goal, not tied to a specific step"). It contains no
information about the goal itself and no entry point to the badge
designer, both of which are missed opportunities — especially for
stepless goals where this card is effectively the whole screen.

## Goal

Replace the placeholder copy on `GoalEvidenceCard` with:

1. A live **badge preview** rendered from `goal.design` (with
   `createDefaultBadgeDesign` fallback). Tappable; navigates to
   `BadgeDesigner` so users can iterate on their badge any time
   **while earning** (pre-bake only — post-bake is out of scope).
2. The **goal title** (duplicated from the screen header so the card
   stands alone in the stepless single-card layout).
3. The **goal description** when non-null (`numberOfLines={3}`),
   mirroring `TimelineJourneyScreen.tsx:120–124`.

The existing Ready badge, evidence pill, and conditional Mark Complete
checkbox stay — they move below the new content.

## Why

- `goal.description`, `goal.icon`, `goal.color`, and `goal.design` are
  all on the schema (`apps/native-rd/src/db/schema.ts:89–99`) but
  **none of them are surfaced in FocusMode today**. The carousel's
  tail card is the obvious home for them.
- Badge design is editable pre-bake via the existing
  `BadgeDesigner` route with `{ mode: "new-goal", goalId, returnVia: "back" }`
  (see `apps/native-rd/src/navigation/types.ts:33–44`). The route
  already writes back to `goal.design` and is used by
  `CompletionFlow`'s "Redesign First" path
  (`CompletionFlowScreen.tsx:497–511`). Reusing it means no new nav
  contract and no second write path.
- The badge-preview infrastructure is solved:
  `parseBadgeDesign(goal.design) ?? createDefaultBadgeDesign(goal.title, goal.color)`
  is the precedence CompletionFlow already uses
  (`CompletionFlowScreen.tsx:150–157`). `BadgeRenderer` renders the
  result.
- For stepless goals — where the recent change in commit `04d9e16`
  hides nav chrome and this card _is_ the screen — a card with no
  goal-specific content reads as broken.

## Wireframe

```
┌──────────────────────────────────────────────────┐
│              ┌──────────────────┐                │
│              │   [ BADGE SVG ]  │ ← Pressable    │
│              └──────────────────┘   → BadgeDesigner
│                                                  │
│   Run my first 5k                                │ ← goal.title
│                                                  │
│   Build up from couch-to-5k over 8 weeks         │ ← goal.description
│   without aggravating my knee.                   │   (omit when null)
│                                                  │
│   [Ready]   ┌──────────────────┐                 │
│             │  3 evidence ▸    │                 │
│             └──────────────────┘                 │
│                                                  │
│   ☐ Mark goal complete       ← only when         │
│                                canMarkComplete   │
└──────────────────────────────────────────────────┘
```

## Acceptance criteria

- `GoalEvidenceCard` no longer renders the strings `"★ Goal"`,
  `"Goal Evidence"`, or `"Evidence for the overall goal, not tied to
a specific step"`.
- Card renders a `BadgeRenderer` preview at a size that fits the
  carousel card (~`120pt`). Design source =
  `parseBadgeDesign(goal.design) ?? createDefaultBadgeDesign(goal.title, goal.color)`.
- Badge is wrapped in a `Pressable` with `accessibilityRole="button"`,
  `accessibilityLabel="Badge preview for {goal.title}, tap to edit design"`,
  and a 44pt+ touch target (use `hitSlop` if the visual is smaller).
- Tapping the badge calls
  `navigation.navigate("BadgeDesigner", { mode: "new-goal", goalId, returnVia: "back" })`.
- Goal title renders below the badge as the card's `accessibilityRole="header"`.
- Goal description renders below the title when `goal.description` is
  non-null, with `numberOfLines={3}`. Omitted entirely (no empty
  `<Text />`) when null.
- The existing Ready `StatusBadge`, evidence pill, and conditional
  `Mark goal complete` checkbox remain functional and unchanged in
  behavior — only their position on the card moves.

## Out of scope

- Post-bake redesign UX. Once `badgeRow` exists for a goal, the
  credential is signed and frozen; this rework does not touch
  post-bake editing.
- Re-styling the badge for the carousel context (no new
  `BadgeRenderer` variants — use existing props).
- Showing step progress / evidence summary on the goal card.
- Any change to `goal.icon` rendering. Schema field stays unused for
  now.
- Any change to `GoalCard` (the Goals-list card — different component,
  different surface).

## Atomic commits

### Commit A — `GoalEvidenceCard` shows badge + goal info

**Files**

- `apps/native-rd/src/components/GoalEvidenceCard/GoalEvidenceCard.tsx`
- `apps/native-rd/src/components/GoalEvidenceCard/GoalEvidenceCard.styles.ts`
- `apps/native-rd/src/components/GoalEvidenceCard/GoalEvidenceCard.stories.tsx`
- `apps/native-rd/src/components/GoalEvidenceCard/__tests__/GoalEvidenceCard.test.tsx`

**Changes**

- Add props: `goalTitle: string`, `goalDescription: string | null`,
  `goalColor: string | null`, `goalDesignJson: string | null`,
  `onBadgePress: () => void`.
- Compute `effectiveDesign` inside the component via
  `parseBadgeDesign(goalDesignJson) ?? createDefaultBadgeDesign(goalTitle, goalColor)`.
- Render order:
  1. `Pressable` (badge) → `BadgeRenderer` (centered, ~120pt).
  2. Title (`accessibilityRole="header"`).
  3. Description when non-null.
  4. Existing status row (Ready badge + evidence pill).
  5. Existing checkbox row.
- Drop the `goalLabel` ("★ Goal") `<Text>` and the static title /
  description strings. Drop `goalLabel` from
  `GoalEvidenceCard.styles.ts`.
- Add `badgeWrapper` style (centering, vertical rhythm). Reuse
  existing `title` / `description` styles, repurposed for goal copy.
- Stories: update existing `WithEvidence` / `Empty` / `NotReady` /
  `Ready` / `AllStates` / `Interactive` to pass the new props with
  example goal data. Add a `NoDescription` variant.
- Tests: mock `BadgeRenderer` (mirror `BadgeCard.test.tsx:11–18`).
  Delete assertions for `"★ Goal"`, `"Goal Evidence"`, and the
  hardcoded description. Add:
  - title renders with header role
  - description renders when non-null
  - description absent when null
  - badge `Pressable` has button role + correct a11y label
  - badge press calls `onBadgePress`

**Green check:**
`bun run type-check && bun run lint && bun test --testPathPatterns GoalEvidenceCard`.

### Commit B — `FocusModeScreen` wires goal fields + badge nav

**Files**

- `apps/native-rd/src/screens/FocusModeScreen/FocusModeScreen.tsx`
- `apps/native-rd/src/screens/FocusModeScreen/__tests__/FocusModeScreen.test.tsx`

**Changes**

- Add `handleBadgePress = () => navigation.navigate("BadgeDesigner", { mode: "new-goal", goalId, returnVia: "back" })`.
- Pass to `GoalEvidenceCard` at the carousel render site
  (`FocusModeScreen.tsx:591–597`):
  - `goalTitle={goal.title as string}`
  - `goalDescription={(goal.description as string | null) ?? null}`
  - `goalColor={(goal.color as string | null) ?? null}`
  - `goalDesignJson={(goal.design as string | null) ?? null}`
  - `onBadgePress={handleBadgePress}`
- No change to existing `evidenceCount` / `onEvidenceTap` /
  `canMarkComplete` / `onMarkComplete` props.
- Test setup: mock `BadgeRenderer` via the same forwardRef pattern
  used in `CompletionFlowScreen.test.tsx:63–84` (FocusMode now
  indirectly renders SVG, which dies in jsdom otherwise).
- Add tests:
  - badge press navigates to `BadgeDesigner` with the correct params
  - goal description renders on the goal card when present
  - goal description absent when `goal.description` is null

**Green check:** `bun run test:ci` once + manual iOS sim:

- Open a stepless goal → tap badge → BadgeDesigner opens in
  `new-goal` mode → save / Use Default → back to FocusMode, preview
  reflects new design.
- Open a stepped, in-progress goal → swipe to goal card → tap badge
  → same flow.
- Goal with no description → card layout doesn't collapse weirdly.

## Risks

- **`GoalEvidenceCard` was tested as a static-copy card.** All three
  removed strings have explicit test assertions
  (`GoalEvidenceCard.test.tsx:22–39`). Replacement tests in Commit A
  must cover the new content one-for-one so the a11y contract doesn't
  silently weaken.
- **SVG render in jsdom.** `BadgeRenderer` imports
  `react-native-svg`, which has no global jest mock
  (`jest.config.js:40` only stubs `.svg` file imports, not the
  package). `FocusModeScreen` tests will need the same per-file
  `jest.mock("../../badges/BadgeRenderer", …)` block as
  `CompletionFlowScreen.test.tsx:63–84` and `BadgeCard.test.tsx:11–18`.
- **Two affordances on one card** (badge tap + Mark Complete check)
  with different gating rules. Visual hierarchy needs to separate them
  clearly — the badge tap is _always_ available pre-bake; the check
  is gated by `canMarkComplete`. Verify the autismFriendly and lowInfo
  theme variants still feel quiet.

## Validation

1. Per-commit: `bun run type-check`, `bun run lint`,
   `bun test --testPathPatterns <relevant>`.
2. After Commit B: full `bun run test:ci`.
3. Manual on iOS sim (per `apps/native-rd/CLAUDE.md` — RN changes
   require a native build):
   - Stepless goal end-to-end: open → swipe to goal card → tap badge
     → designer opens with current `goal.design` (or default) →
     redesign → save → back to FocusMode → preview reflects change →
     proceed with Mark Complete.
   - Stepped goal mid-progress: same badge-tap loop works regardless
     of `canMarkComplete` state.
   - Goal with `description = null`: card still renders cleanly.
   - Theme spot-check: light-default, dark-default, light-autismFriendly,
     light-highContrast — verify the badge preview and goal copy don't
     fight the card's existing yellow top-border accent.
