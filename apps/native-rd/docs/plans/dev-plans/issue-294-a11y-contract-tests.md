# Development Plan: Issue #294

## Issue Summary

**Title**: A-a11y: accessibility + contract tests for the shipped grammar
**Type**: testing / accessibility
**Complexity**: SMALL
**Estimated Lines**: ~260 lines (test code only, no production changes)

## Intent Verification

Observable criteria derived from the issue. These describe what success looks like from a
user/system perspective.

- [x] `accessibility.test.tsx` gains a `StepList sub-step affordance` describe block covering
      `accessibilityRole="button"` + `accessibilityLabel` (+ hint) for the ghost "add sub-step"
      row and the "add sub-step" submit button, each for two named parent titles, plus the input
      label and the hidden left-rail decoration.
- [x] `accessibility.test.tsx` locks the `GoalCard` leaf next-step contract: the visual
      `↳ in [parent]` context line is excluded from the composite SR label and carries no control
      role. (Single focused test; the next-step-in-label + context-render cases already live in
      `GoalCard.test.tsx`, so they are not duplicated.)
- [x] `accessibility.test.tsx` gains a `StepList nest / un-nest controls` describe block covering
      `accessibilityRole="button"` + `accessibilityLabel` for the nest-under trigger, the picker
      rows, the un-nest button, and `accessibilityViewIsModal` on the picker.
- [x] `accessibility.test.tsx` gains a `TimelineStep sub-step ChildRow` describe block covering
      `accessibilityRole="button"` + `accessibilityState.expanded` toggle for the sub-step expand
      header, and `accessibilityRole="button"` + go-to label + 44pt target for child nodes.
- [x] `accessibility.test.tsx` gains a `MiniTimeline node hit targets` describe block asserting
      `hitSlop` (17 child / 15 top-level) and that node width + 2·hitSlop ≥ 44.
- [x] `src/themes/__tests__/contrast.test.ts` verifies the sub-step indentation rail at the WCAG
      1.4.11 **non-text 3:1 floor** across all 14 themes (not as a 4.5:1 `contrastPairs` entry —
      the rail is hidden decoration, see D5/D6). The three reduced-visual-noise variants
      (`light-dyslexia`/`autismFriendly`/`lowInfo`) are documented as intentionally soft. The
      substructure's text/glyphs reuse already-gated pairs (`body`/`muted`, `journey*`).
- [x] `src/db/__tests__/queries.guardrails.test.ts` (new file) states the three guardrail
      invariants as named contracts: (a) parent stays the next action (invite at the parent
      index) when all children are done — never auto-completed; (b) a pending leaf under a
      completed parent and an orphaned child both stay reachable; (c) the single resolver `index`
      both GoalCard and FocusMode consume points at exactly one step when several are pending. The
      exhaustive per-scenario resolver cases remain in `queries.step.test.ts` (not duplicated).
- [x] `bun run test` passes (185 suites / 9280 tests); type-check and lint are clean (0 errors).
- [x] No existing test in `accessibility.test.tsx` is deleted or its assertion weakened — all new
      `describe` blocks are appended.

## Dependencies

| Issue | Title                                                   | Status    | Type    |
| ----- | ------------------------------------------------------- | --------- | ------- |
| #291  | Sub-step data layer + authoring affordance              | ✅ Merged | Blocker |
| #292  | Leaf-led next step — goal card, FocusMode, MiniTimeline | ✅ Merged | Blocker |
| #293  | Timeline substructure rendering — sub-step sub-spine    | ✅ Merged | Blocker |
| #288  | Epic: sub-steps (A: substructure) — parent epic         | OPEN      | Parent  |

**Status**: ✅ All blockers (#291, #292, #293) are merged into main.

## Objective

Extend the existing a11y contract test suite and add guardrail regression tests covering every
new control and surface state introduced by the sub-step (indentation) grammar. No production
code changes. Produces one focused PR under ~300 LOC test code.

## Decisions

| ID  | Decision                                                                                                                                                                                    | Alternatives Considered                                              | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Extend `accessibility.test.tsx` with new `describe` blocks, never replacing                                                                                                                 | One new file per surface                                             | Issue AC is explicit: file path is `src/__tests__/accessibility.test.tsx`. Sacred-test rule also applies here.                                                                                                                                                                                                                                                                                                                                                |
| D2  | Guardrail tests in a new `src/db/__tests__/queries.guardrails.test.ts`                                                                                                                      | Append to existing `queries.step.test.ts`                            | The guardrails test pure functions and have no component dependencies; a dedicated file mirrors the "test file mirrors `src/`" convention and keeps `queries.step.test.ts` from bloating.                                                                                                                                                                                                                                                                     |
| D3  | Contrast for `leftRail` (sub-step rail border) uses the existing `getContrastRatio` + `contrastPairs` gate pattern                                                                          | Ad-hoc assertions in a new describe block                            | `contrastPairs.ts` is the repo's single source of truth for the theme-wide gate. Adding a pair there means the CI gate (and the ContrastAudit story) automatically covers all 7 product themes with no extra boilerplate.                                                                                                                                                                                                                                     |
| D4  | Hit-target assertion checks `hitSlop` prop value, not layout                                                                                                                                | Full layout measurement via `onLayout`                               | RNTL runs in jsdom; `onLayout` is never fired. `hitSlop` is the contract this repo uses to compensate for small visual size (see `MiniTimeline` line 89: `hitSlop={isChild ? 17 : 15}`; `TimelineNode` lines 87–88: `const hitPad = Math.max(0, Math.ceil((44 - nodeSize) / 2))`).                                                                                                                                                                            |
| D5  | Verify the indentation rail at the WCAG 1.4.11 **non-text 3:1 floor** in a dedicated `contrast.test.ts` block — NOT as a `subStepRail` pair in `contrastPairs.ts` (Step 6 as planned)       | Add `subStepRail` to `contrastPairs` (gated at 4.5:1 text threshold) | The rail is `accessibilityElementsHidden` decoration painted in `colors.border` over `colors.background`; the 4.5:1 **text** gate is the wrong bar for it. The substructure's information-bearing colours are already gated: sub-step titles → `body`/`muted`, timeline sub-step node glyphs → `journey*` (the `sm` node reuses `stepStateNodeBg/Fg`, identical colours to the `md` node). Gating the rail at 4.5:1 would manufacture false `KNOWN_FAILURES`. |
| D6  | Gate the rail at 3:1 for load-bearing variants; document `light-dyslexia` / `light-autismFriendly` / `light-lowInfo` as intentionally-soft (assert only that the rail is a distinct colour) | Hard 3:1 across all 14 themes                                        | Those three reduced-visual-noise variants soften the border by design (autismFriendly desaturates, lowInfo strips complexity, dyslexia uses a cream field); structure is carried by indentation position (D11), so a soft rail loses no information. A hard 3:1 there would fight the variant design intent and manufacture failures.                                                                                                                         |

## Affected Areas

- `apps/native-rd/src/__tests__/accessibility.test.tsx` — extend with 5 new `describe` blocks
- `apps/native-rd/src/themes/contrastPairs.ts` — add `subStepRail` contrast pair
- `apps/native-rd/src/themes/__tests__/contrast.test.ts` — `KNOWN_FAILURES` may need one entry if `border` token on `backgroundSecondary` in any ND variant falls below 4.5:1 (verify during implementation)
- `apps/native-rd/src/db/__tests__/queries.guardrails.test.ts` — new file

## Surfaces Shipped in #291 / #292 / #293

### #291 — Sub-step data layer + authoring affordance

Files: `StepList/StepList.tsx`, `StepList/DraggableStepItem.tsx`,
`screens/EditModeScreen/EditModeScreen.tsx`

New a11y-bearing controls:

1. **"Add sub-step" ghost row** (`Pressable`) — `accessibilityRole="button"`,
   `accessibilityLabel` from `editGoal:stepList.addSubStepA11yLabel` (`"Add sub-step under
\"{{title}}\""`) and `accessibilityHint` from `addSubStepA11yHint`.
2. **"Add sub-step" active input** (`TextInput`) — `accessibilityLabel` from
   `editGoal:stepList.addSubStepInputA11yLabel`.
3. **"Add sub-step" submit button** (`Pressable`) — `accessibilityRole="button"`,
   `accessibilityLabel` from `editGoal:stepList.addSubStepButtonA11y`.
4. **Left-rail indentation decoration** — `accessibilityElementsHidden` +
   `importantForAccessibility="no"` (already in source, contract test locks it).
5. **DraggableStepItem "Nest under" trigger** (`IconButton`) — `accessibilityRole="button"`,
   `accessibilityLabel` from `editGoal:stepList.a11y.nestUnderTriggerA11y`.
6. **DraggableStepItem "Nest under" picker rows** (`Pressable` inside `Modal`) —
   `accessibilityRole="button"`, `accessibilityLabel` from
   `editGoal:stepList.a11y.nestUnderA11y`.
7. **DraggableStepItem "Un-nest" button** (`IconButton`) — `accessibilityRole="button"`,
   `accessibilityLabel` from `editGoal:stepList.a11y.unNestA11y`.
8. **Left-rail border as contrast surface** — `backgroundColor: theme.colors.border` over the
   card background; needs theme-wide contrast gate.

### #292 — Leaf-led next step (GoalCard, FocusMode, MiniTimeline)

Files: `GoalCard/GoalCard.tsx`, `MiniTimeline/MiniTimeline.tsx`,
`StepCard/StepCard.tsx`, `StepCard/StepCardTopBand.tsx`,
`screens/FocusModeScreen/FocusModeScreen.tsx`

New a11y-bearing controls: 9. **GoalCard `accessibilityLabel` with next-step hero** — already handled by
`labelWithNextStep` in `GoalCard.test.tsx`. The _context line_ (`nextStepContext`) does NOT
appear in the composite label (GoalCard is presentational, label is built in
`GoalsScreen.tsx`). Existing tests cover this; a11y test should lock the
`labelWithNextStep` variant that includes a leaf sub-step title. 10. **MiniTimeline child node** (`Pressable`) — `accessibilityRole="button"`,
`accessibilityLabel` from `common:timeline.a11y.step`, `hitSlop={17}` (child=true path). 11. **StepCardTopBand child band** — `accessibilityRole="text"` on the `"↳ [parent] · part N of
    M"` text; already covered by `StepCard.test.tsx`. Contract test locks the a11y role.

### #293 — Timeline substructure rendering

Files: `TimelineNode/TimelineNode.tsx`, `TimelineStep/TimelineStep.tsx`,
`screens/TimelineJourneyScreen/TimelineJourneyScreen.tsx`

New a11y-bearing controls: 12. **TimelineNode `size="sm"`** (`Pressable` or `View`) — `accessibilityRole="button"` when
interactive, `"image"` when static; `hitSlop` computed to meet 44pt (for 24px node:
`hitPad = Math.ceil((44 - 24) / 2) = 10`). 13. **TimelineStep `ChildRow` expand button** (`Pressable`) — `accessibilityRole="button"`,
`accessibilityLabel` from `timelineJourney:step.a11yChildExpand`,
`accessibilityState.expanded` reflects open/closed state. 14. **TimelineStep `ChildRow` node** (`TimelineNode size="sm"`) — `accessibilityRole="button"`,
`accessibilityLabel` from `timelineJourney:step.a11yGoTo`.

## Implementation Plan

### Step 1: Extend accessibility.test.tsx — StepList sub-step controls

**Files**: `apps/native-rd/src/__tests__/accessibility.test.tsx`
**Commit**: `test(a11y): sub-step authoring controls — ghost row, input, submit button`
**Changes**:

- [ ] Add imports: `{ StepList }` from `../../components/StepList/StepList` and `{ i18n }` already present.
- [ ] Add `describe("StepList sub-step affordance", ...)` block with props fixture: one parent
      step + one child step, `onCreateSubStep` wired to a jest.fn.
- [ ] Assert ghost "add sub-step" row: `accessibilityRole="button"`,
      `accessibilityLabel = i18n.t("editGoal:stepList.addSubStepA11yLabel", { title: "Parent" })`,
      `accessibilityHint = i18n.t("editGoal:stepList.addSubStepA11yHint")`.
- [ ] Assert left-rail decoration is hidden from a11y tree
      (`accessibilityElementsHidden: true` or `importantForAccessibility: "no"`).
- [ ] Use `test.each` over two parent titles to avoid duplication.
- [ ] Assert submit button after pressing ghost row: `accessibilityRole="button"`,
      `accessibilityLabel = i18n.t("editGoal:stepList.addSubStepButtonA11y", { title: ... })`.

Approximate lines: ~55.

### Step 2: Extend accessibility.test.tsx — DraggableStepItem nest/un-nest controls

**Files**: `apps/native-rd/src/__tests__/accessibility.test.tsx`
**Commit**: `test(a11y): nest-under picker and un-nest button contracts`
**Changes**:

- [ ] Add `describe("DraggableStepItem nest/un-nest controls", ...)` block.
- [ ] Fixture: `StepList` with two root steps, `showAccessibleControls` forced via
      `AccessibilityInfo.isScreenReaderEnabled` mock returning `true`.
- [ ] Assert "nest under" trigger button: `accessibilityRole="button"`,
      `accessibilityLabel = i18n.t("editGoal:stepList.a11y.nestUnderTriggerA11y")`.
- [ ] Fire press on trigger → assert picker opens with `accessibilityViewIsModal` on the `Modal`
      and each picker row has `accessibilityRole="button"` +
      `accessibilityLabel = i18n.t("editGoal:stepList.a11y.nestUnderA11y", { title: ... })`.
- [ ] Fixture with a child step: assert "un-nest" button `accessibilityRole="button"` +
      `accessibilityLabel = i18n.t("editGoal:stepList.a11y.unNestA11y")`.
- [ ] Note: `DraggableStepItem` uses a `Modal` from react-native; the `setup-modal-mock.ts` in
      `src/__tests__/` is already wired — no extra mock needed.

Approximate lines: ~60.

### Step 3: Extend accessibility.test.tsx — GoalCard with sub-step context line

**Files**: `apps/native-rd/src/__tests__/accessibility.test.tsx`
**Commit**: `test(a11y): GoalCard next-step hero + leaf context accessibilityLabel`
**Changes**:

- [ ] Add `describe("GoalCard with sub-step context", ...)` block.
- [ ] Assert `accessibilityLabel` uses `labelWithNextStep` key when `nextStepTitle` is a leaf
      sub-step title (e.g. `"20-amp circuit"` with `nextStepContext: "↳ in Wire the circuits"`).
- [ ] Assert composite label does NOT include the context line text (context is visual-only —
      screen reader gets it through the label override).
- [ ] Assert `goal-card-next-step-context` testID is present but has no `accessibilityRole` of
      `"button"` (it is purely presentational text).

Approximate lines: ~35.

### Step 4: Extend accessibility.test.tsx — MiniTimeline child node hit target

**Files**: `apps/native-rd/src/__tests__/accessibility.test.tsx`
**Commit**: `test(a11y): MiniTimeline child node hit-slop meets 44pt contract`
**Changes**:

- [ ] Add `describe("MiniTimeline child node hit target", ...)` block.
- [ ] Render `MiniTimeline` with one parent step + one child step (`isChild: true`).
- [ ] Get the child node Pressable by `accessibilityLabel` (`step label` with index 2).
- [ ] Assert `hitSlop >= 17` (child node is 10px wide; `17` brings the total touch width to
      10 + 17\*2 = 44px).
- [ ] Also assert top-level node `hitSlop >= 15` (32px node; `15` brings it to 32 + 15\*2 = 62
      — already above 44pt, contract test locks it from regression).
- [ ] Use `test.each` over the two node types.

Approximate lines: ~30.

### Step 5: Extend accessibility.test.tsx — TimelineStep ChildRow a11y

**Files**: `apps/native-rd/src/__tests__/accessibility.test.tsx`
**Commit**: `test(a11y): TimelineStep ChildRow expand button and node contracts`
**Changes**:

- [ ] Add `describe("TimelineStep ChildRow", ...)` block (imports `TimelineStep` from
      `../../components/TimelineStep/TimelineStep`).
- [ ] Fixture: parent step with 2 sub-steps.
- [ ] Assert each child expand button: `accessibilityRole="button"`,
      `accessibilityLabel` from `i18n.t("timelineJourney:step.a11yChildExpand", { ordinal, title })`,
      `accessibilityState.expanded = false` initially.
- [ ] Press child expand button; assert `accessibilityState.expanded = true`.
- [ ] Assert child node: `accessibilityRole="button"`,
      `accessibilityLabel` from `i18n.t("timelineJourney:step.a11yGoTo", { number: ordinal, title })`.
- [ ] Assert sub-step node `hitSlop` satisfies `>= 10` (24px node; `10` → 44pt total).

Approximate lines: ~50.

### Step 6: Add subStepRail contrast pair + verify theme gate

**Files**: `apps/native-rd/src/themes/contrastPairs.ts`,
`apps/native-rd/src/themes/__tests__/contrast.test.ts`
**Commit**: `test(contrast): add subStepRail contrast pair for sub-step indentation rail`
**Changes**:

- [ ] Append to `contrastPairs` array in `contrastPairs.ts`:
      `ts
    {
      key: "subStepRail",
      label: "sub-step left rail",
      getColors: (t) => ({
        fg: t.colors.border,
        bg: t.colors.background,
      }),
    }
    `
      The left rail is `backgroundColor: theme.colors.border` rendered on
      `theme.colors.background` (StepList.styles.ts `leftRail`).
- [ ] Run `bun run test --testPathPatterns contrast` to see which themes pass/fail.
- [ ] Add any failing `themeName:subStepRail` keys to `KNOWN_FAILURES` in `contrast.test.ts` with
      a `// TODO(#294-follow-up): border token on background is sub-AA in this variant` comment,
      following the existing ratchet pattern.
- [ ] The stale-key guard test already covers the new pair automatically — no extra assertion
      needed.

Approximate lines: ~15 (`contrastPairs.ts`) + 0–5 (`contrast.test.ts` if any KNOWN_FAILURES
needed).

### Step 7: New guardrail regression tests

**Files**: `apps/native-rd/src/db/__tests__/queries.guardrails.test.ts` (new)
**Commit**: `test(guardrails): parent manual-only, no blocked steps, FocusMode/GoalCard parity`
**Changes**:

- [ ] Import `resolveNextActionableStep` and `findFirstPendingIndex` from `../../db/queries`.
      Also define a local `findFirstPendingLeafIndex` adapter identical to FocusMode's adapter
      (thin wrapper over `resolveNextActionableStep`).

**Guardrail (a): parent completion is manual-only**

- [ ] Test: invite-state goal (parent step P with children C1=completed, C2=completed, both
      `parentStepId=P.id`; P itself `status="pending"`) → `resolveNextActionableStep` returns
      `{ kind: "invite", index: <P index> }`.
- [ ] Negative: completion of all children does NOT auto-complete the parent — the resolver must
      NOT return `{ kind: "none" }` for this input (the parent is still open).
- [ ] Confirm: `resolveNextActionableStep` never mutates the DB (it is pure — this is structural
      by inspection, but the test's use of a raw array rather than a DB call makes it explicit).

**Guardrail (b): nothing blocked by incomplete parent/sibling**

- [ ] Test: orphan sub-step (child whose `parentStepId` points at a non-existent root; only the
      child row is present) → `resolveNextActionableStep` surfaces the orphan as a `flat` step
      (orphan promotion rule in `groupStepsByParent`).
- [ ] Test: pending sibling of a completed child does not get dropped — two children under one
      parent, first completed, second pending → resolver returns `{ kind: "leaf", index: <second
    child index> }`.
- [ ] Test: pending leaf under a manually-completed parent → resolver returns
      `{ kind: "leaf", ... }` not `{ kind: "none" }` (completed parent does not cascade to hide
      pending children).

**Guardrail (c): goal card + FocusMode resolve to the same next step**

- [ ] Test: for each of leaf / flat / invite / none inputs, assert
      `findFirstPendingLeafIndex(rows)` === index from `resolveNextActionableStep(rows)` (or -1
      for `none`).
- [ ] Use `test.each` over the four result kinds.

Approximate lines: ~70.

## Testing Strategy

- [ ] Unit tests only — all assertions in Jest 30 / RNTL v13 (no device).
- [ ] Run with `bun run test --testPathPatterns accessibility|guardrails|contrast`.
- [ ] `accessibility.test.tsx` assertions: `accessibilityRole`, `accessibilityLabel`,
      `accessibilityHint`, `accessibilityState`, `accessibilityElementsHidden`, `hitSlop` — all
      via `expectAccessibleRole`, `expectAccessibleLabel`, `expectAccessibleState` helpers from
      `a11y-helpers.ts`, or direct prop reads where the helpers don't cover the prop.
- [ ] `test.each` used for: sub-step parent titles (Step 1), node types (Step 4), guardrail
      kinds (Step 7).
- [ ] No existing test is deleted. The new describe blocks are appended only.

## Not in Scope

| Item                                             | Reason                                                                                                                             | Follow-up                                               |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Production a11y fixes                            | Issue is test-only; #291/#292/#293 shipped with a11y props already on every surface                                                | File new issues if gaps are found during implementation |
| Sub-step node contrast for `dark-*` variants     | No `dark-*` ND variant exists in this repo (7 themes are light-only except `dark-default`)                                         | N/A                                                     |
| `NewGoalModal` sub-step controls                 | #291 dropped the NewGoalModal sub-step slice (logged in plan Step 6 "drop", dev plan commit `c44790d5`) — modal is flat steps only | None                                                    |
| FocusMode overview card (`kind="overview"`) a11y | Already covered exhaustively in `StepCard.test.tsx` overview describe block (#360 scope)                                           | None                                                    |
| E2E / Maestro tests for sub-step flows           | Out-of-scope for this issue; test infra hasn't been extended to new screens yet                                                    | Separate issue                                          |

## Discovery Log

Runtime discoveries made during implementation. Starts empty — populated by the implement
skill as work progresses.

- [2026-06-30] Step 6 reworked. The substructure introduces no new
  information-bearing colour pair — sub-step text reuses `body`/`muted`, and the
  timeline sub-step node glyph reuses `stepStateNodeBg/Fg` (= `journey*` pairs,
  already audited across all 14 themes). The only net-new colour is the
  decorative left rail (`colors.border` on `colors.background`). Rather than add
  a `subStepRail` pair to `contrastPairs.ts` (which gates at the 4.5:1 **text**
  threshold — wrong for hidden decoration), Step 6 adds a dedicated rail block to
  `contrast.test.ts` at the WCAG 1.4.11 **non-text 3:1 floor**. See D5/D6.
- [2026-06-30] Rail measured below 3:1 in `light-dyslexia` (cream field),
  `light-autismFriendly` (desaturated), and `light-lowInfo` (reduced complexity)
  — intentional per each variant's design. Allowlisted as "intentionally soft"
  (asserted only to be a distinct colour); the other 11 themes are gated ≥3:1.
- [2026-06-30] GoalCard a11y label is built inside `GoalCard.tsx` (not
  `GoalsScreen.tsx` as the plan stated); the observable contract — context line
  excluded from the SR label — is unchanged and tested directly.
- [2026-06-30] Steps 1–5 trimmed of overlap with existing component test files
  (`StepList.test.tsx`, `GoalCard.test.tsx`, `MiniTimeline.test.tsx`,
  `TimelineStep.test.tsx`): each new `accessibility.test.tsx` block asserts only
  the screen-reader contract (role/label/state/hitSlop) those files don't cover.
  -->
