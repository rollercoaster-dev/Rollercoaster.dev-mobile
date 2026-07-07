# Development Plan: Issue #460

## Issue Summary

**Title**: [Storybook] Edit Goal — per-step delete (×) on main step rows
**Type**: feature (Storybook-only, follow-up to #445)
**Complexity**: SMALL–MEDIUM
**Estimated Lines**: ~140–190 lines (3 component/style files + stories + tests; no new files, reuses the existing `ConfirmDeleteModal`; no new dependencies)

> **Revision (user directive, 2026-07-06):** "all deletions need to be confirmed with the existing modal." This overrides the original D1 (immediate delete). Every row-level deletion in `EditGoalView` — the new main-step `×` **and** the sub-step `×` shipped in #445 — now routes through the existing `ConfirmDeleteModal` (`src/screens/ConfirmDeleteModal/`). Goal-level delete (⋯ overflow) is not a delete surface in this component and stays with `[Integrate]` (see D5).

## Intent Verification

- [ ] `EditGoalStepRow` (main row, not the smaller-step row) renders a `×` delete affordance after the reorder controls — visible whenever the row is not in inline-edit mode — with `accessibilityRole="button"`, a 44×44 touch target, and label `Delete step: <title>` (matches the smaller-step delete's label shape exactly, e.g. `Delete sub-step: <title>`).
- [ ] Pressing the main-row `×` opens `ConfirmDeleteModal`; `onDeleteStep(stepId)` fires **only on Confirm**; Cancel dismisses without deleting (D1, revised).
- [ ] The sub-step `×` (shipped in #445) is retrofitted to route through the **same** `ConfirmDeleteModal`; `onDeleteSubStep(subStepId)` now fires only on Confirm, not immediately on press (D1, revised). The `×` glyph, testID, a11y label, and touch target are otherwise unchanged.
- [ ] A single `ConfirmDeleteModal` instance lives in `EditGoalView`, driven by a `pendingDelete` state (kind + id + title) — mirroring how the evidence-picker `Modal` is already hosted there. The rows keep their `onDelete: () => void` intent contract and do not own confirm state.
- [ ] The interactive stories still remove the step/sub-step from local state — but now only after Confirm, since the deletion callback fires post-confirm.
- [ ] `EditGoalView.test.tsx`: main-row `×` exists + opens the modal; Confirm calls `onDeleteStep("s1")`; Cancel does not. The **existing** sub-step delete test (currently asserting immediate `onDeleteSubStep`) is updated to press `×` → Confirm. a11y role/label on the main-row `×`.

## Dependencies

| Issue | Title                                                                             | Status                                      | Type               |
| ----- | --------------------------------------------------------------------------------- | ------------------------------------------- | ------------------ |
| #445  | [Storybook] Edit Goal — redesigned step editor (drag rows, evidence chip, ⋯ menu) | ✅ Closed — merged via PR #461 (2026-07-02) | Direct predecessor |
| #384  | Epic: Full Ride redesign                                                          | 🟢 Open (epic, not a blocker)               | Parent epic        |

**Status**: ✅ All dependencies met — #445 (the row this issue adds an affordance to) is merged; no "Blocked by" / "Depends on" / "After #" marker in the issue body beyond the already-resolved #445.

**has_blockers**: false

## Objective

Add a `×` delete affordance to `EditGoalStepRow`'s main (top-level) row — the one thing #445 shipped without, since #445 already delivered the sub-step row's `×`. Add `onDeleteStep(stepId)` to `EditGoalView`, wire it through the row, and gate it (plus the existing sub-step delete) behind the existing `ConfirmDeleteModal`. Cover it with stories + tests. Storybook/component scope only — no screen wiring, no persistence.

## Decisions

| ID  | Decision                                                                                                                                                                                                                                                                                                                                                                                         | Alternatives Considered                                                                                                                       | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | **All row-level deletions confirm through the existing `ConfirmDeleteModal`.** The main-row `×` and the sub-step `×` both open the modal; the outward `onDeleteStep`/`onDeleteSubStep` fire **only on Confirm**. _(Revised per user directive 2026-07-06; the original "delete immediately, defer confirm to [Integrate]" is superseded.)_                                                       | (a) Delete immediately, defer all confirm to `[Integrate]` (original plan). (b) Inline tap-again-to-confirm. (c) A bespoke new confirm modal. | User directive: "all deletions need to be confirmed with the existing modal." `ConfirmDeleteModal` (`src/screens/ConfirmDeleteModal/ConfirmDeleteModal.tsx`) already exists, is themed, i18n-aware, and has a `destructive`-variant confirm + `secondary` cancel — it is exactly the "existing modal." A step can carry evidence + sub-steps, so surfacing destructive intent before deleting also satisfies the issue's "Must not do" ("don't silently delete a step with captured evidence without … surfacing the destructive intent"). |
| D1b | **Retrofit the #445 sub-step `×` to the same modal.** It currently fires `onDeleteSubStep` immediately (`EditGoalView.tsx:369`); it will instead open `ConfirmDeleteModal`.                                                                                                                                                                                                                      | Leave sub-step delete immediate; confirm only the new main-step delete.                                                                       | "All deletions" is explicit and consistency dictates: confirming step-delete but not sub-step-delete inside the same view would be incoherent. This is a deliberate behavior change to shipped #445 code — the one existing test asserting immediate sub-step deletion is updated accordingly (Step 3).                                                                                                                                                                                                                                    |
| D2  | **The confirm state + modal live in `EditGoalView`; rows keep a plain `onDelete: () => void` intent contract.** `EditGoalView` holds `pendingDelete: {kind:"step"\|"subStep"; id; title} \| null`, renders one `ConfirmDeleteModal`, and maps Confirm → the right callback.                                                                                                                      | Give each row its own modal / confirm state.                                                                                                  | Mirrors how `EditGoalView` already hosts the shared evidence-picker `Modal` and owns `editingId`/`editingEvidenceId` while rows stay pure and prop-driven. One modal instance, one source of truth, no confirm state duplicated per row. The rows' `onDelete` becomes "signal intent," not "delete now."                                                                                                                                                                                                                                   |
| D3  | New style tokens `stepDelete` / `stepDeleteGlyph` in `EditGoalView.styles.ts`, structurally identical to the existing `subStepDelete` / `subStepDeleteGlyph` (44×44 min touch target, `theme.colors.textMuted` glyph) rather than reusing the sub-step style objects directly.                                                                                                                   | Reuse `styles.subStepDelete/subStepDeleteGlyph` verbatim for the main row too.                                                                | Matches the existing convention in this file: the main row and sub-step row already have separate, visually-identical style blocks (e.g. `rowTitlePress`/`subStepTitlePress`). Keeping a distinct `stepDelete` name for the main row preserves that convention and avoids a "sub-step-named" style leaking onto the parent row.                                                                                                                                                                                                            |
| D4  | Placement: the main-row `×` renders as the **last** element in the row's main line, after the reorder ↑/↓ buttons (`showAccessibleControls` block).                                                                                                                                                                                                                                              | Place it directly after the evidence chip (before reorder buttons), matching the prototype's raw markup order.                                | The prototype has no reorder-button concept (this app's ND fallback, added in #445, absent from the static mock). Placing `×` last keeps destructive actions at the trailing edge — consistent with the sub-step row (marker → title → chip → `×`, nothing after it) — and avoids the delete target shifting position between screen-reader-on/off states.                                                                                                                                                                                 |
| D5  | **Copy stays prop-driven (D9); `ConfirmDeleteModal`'s own button labels come from its internal i18n.** `EditGoalView` gains `deleteStepConfirmTitle`/`deleteStepConfirmMessage(title)` + `deleteSubStepConfirmTitle`/`deleteSubStepConfirmMessage(title)` props (English defaults). The modal's Delete/Cancel button labels are left to `ConfirmDeleteModal`'s `t("common:actions.*")` defaults. | Thread confirm/cancel label props through too.                                                                                                | Keeps `EditGoalView`'s _own_ strings prop-driven per D9 (title + message) without re-plumbing labels the shipped modal already localizes. Importing a `screens/` modal into a component is a minor layering quirk, but `ConfirmDeleteModal` is a reusable presentational modal and `[Integrate]` already intended this wiring.                                                                                                                                                                                                             |
| D6  | **Goal-level (⋯ overflow) delete is out of scope.** `EditGoalView` only fires `onOverflowPress()`; the overflow menu and its delete row live in the parent, so no goal-delete action exists in this component to confirm.                                                                                                                                                                        | Wire goal-delete confirm here too.                                                                                                            | "All deletions" applies to deletions _this component performs_ — the two row `×`es. Goal-delete confirm remains `[Integrate]`'s job (see Open Questions — flagged for user confirmation).                                                                                                                                                                                                                                                                                                                                                  |

## Affected Areas

- `src/components/EditGoalView/EditGoalStepRow.tsx`: add `onDelete: () => void` and optional `deleteStepLabel?: (stepTitle: string) => string` (default `` `Delete step: ${stepTitle}` ``) props; render the `×` `Pressable` (testID `edit-goal-step-delete-${step.id}`) in the non-editing render branch, after the reorder buttons (D4). `onDelete` = "signal intent," not "delete now."
- `src/components/EditGoalView/EditGoalView.tsx`: **(a)** add `onDeleteStep: (stepId: string) => void` to `EditGoalViewProps`; **(b)** add local `pendingDelete` state (`{kind:"step"|"subStep"; id; title} | null`); **(c)** main-row `onDelete={() => setPendingDelete({kind:"step", id: step.id, title: step.title})}`; **(d)** change the existing sub-step wiring at line 369 from `onDelete={() => onDeleteSubStep(sub.id)}` to `onDelete={() => setPendingDelete({kind:"subStep", id: sub.id, title: sub.title})}` (D1b); **(e)** import and render one `ConfirmDeleteModal` (`../../screens/ConfirmDeleteModal`) whose `visible={pendingDelete !== null}`, `onCancel` clears `pendingDelete`, `onConfirm` fires `onDeleteStep`/`onDeleteSubStep` by kind then clears; **(f)** add the four confirm-copy props (D5) with English defaults.
- `src/components/EditGoalView/EditGoalView.styles.ts`: add `stepDelete` / `stepDeleteGlyph` style entries (mirrors `subStepDelete` / `subStepDeleteGlyph`, D3).
- `src/components/EditGoalView/EditGoalView.stories.tsx`: add a `deleteStep` handler to `InteractiveEditGoal` (filters the step out of local state, mirrors `deleteSubStep`) and wire `onDeleteStep` into every `EditGoalView` instantiation (`InteractiveEditGoal`, `MatrixEditGoal` no-op at line ~300); wire a no-op `onDelete` into `AnatomyRow`'s direct `EditGoalStepRow` instantiation so `RowAnatomy` keeps rendering. The existing `deleteSubStep` handler is unchanged — it now runs on Confirm rather than on press, transparently. No new top-level `Story` export required (`RowAnatomy`/`Populated`/`SubSteps` already exercise the row); the confirm modal is visible in the interactive stories on `×` press.
- `src/components/EditGoalView/__tests__/EditGoalView.test.tsx`: extend `makeProps()` with `onDeleteStep: jest.fn()`; **update** the existing "deletes a sub-step via its × button" test (lines ~307–314) to press `×` → assert modal → press Confirm → `onDeleteSubStep("sub1")`, plus a Cancel-does-not-delete case; **add** the main-step delete tests (existence, opens modal, Confirm fires `onDeleteStep("s1")`, Cancel does not, a11y role/label). Target the modal's Confirm/Cancel buttons by their labels ("Delete"/"Cancel" — the only such buttons in this render tree; the overflow "Delete goal" row is not rendered inside `EditGoalView`).

## Implementation Plan

### Step 1: Add the `×` affordance to `EditGoalStepRow` + styles

**Files**: `src/components/EditGoalView/EditGoalStepRow.tsx`, `src/components/EditGoalView/EditGoalView.styles.ts`
**Commit**: `feat(edit-goal-view): add per-step delete affordance to main step rows`
**Changes**:

- [ ] Add `onDelete: () => void` and `deleteStepLabel?: (stepTitle: string) => string` (default `` `Delete step: ${stepTitle}` ``) to `EditGoalStepRowProps`.
- [ ] Render a `Pressable` with `accessibilityRole="button"`, `accessibilityLabel={deleteStepLabel(step.title)}`, `hitSlop={8}`, `testID={`edit-goal-step-delete-${step.id}`}`, containing a `×` `RNText`, positioned last in `styles.rowMain` (after the `showAccessibleControls` reorder-buttons block, D4) — only in the non-editing render branch (mirrors how the row already hides controls while `isEditing`).
- [ ] Add `stepDelete` / `stepDeleteGlyph` styles to `EditGoalView.styles.ts` (44×44 min touch target via `minWidth`/`minHeight: 44`, glyph `color: theme.colors.textMuted`, `fontSize: theme.size.lg`) — structurally identical to `subStepDelete`/`subStepDeleteGlyph` (D3), zero hardcoded hex.

### Step 2: Confirm-delete modal + `onDeleteStep` wiring + sub-step retrofit

**Files**: `src/components/EditGoalView/EditGoalView.tsx`
**Commit**: `feat(edit-goal-view): confirm all step/sub-step deletions via ConfirmDeleteModal`
**Changes**:

- [ ] Add `onDeleteStep: (stepId: string) => void` to `EditGoalViewProps` (required — mirrors `onDeleteSubStep`).
- [ ] Add the four confirm-copy props (D5) with English defaults: `deleteStepConfirmTitle` (default `"Delete step?"`), `deleteStepConfirmMessage` (default `` (title) => `Delete "${title}"? Its evidence and any sub-steps will be removed too.` ``), `deleteSubStepConfirmTitle` (default `"Delete sub-step?"`), `deleteSubStepConfirmMessage` (default `` (title) => `Delete "${title}"? Its evidence will be removed too.` ``).
- [ ] Add `const [pendingDelete, setPendingDelete] = useState<{kind:"step"|"subStep"; id:string; title:string} | null>(null)`.
- [ ] Main-row wiring: `onDelete={() => setPendingDelete({kind:"step", id: step.id, title: step.title})}`.
- [ ] Sub-step retrofit (D1b): change line 369 from `onDelete={() => onDeleteSubStep(sub.id)}` to `onDelete={() => setPendingDelete({kind:"subStep", id: sub.id, title: sub.title})}`.
- [ ] Import `ConfirmDeleteModal` from `../../screens/ConfirmDeleteModal` and render one instance (alongside the existing evidence-picker `Modal`): `visible={pendingDelete !== null}`, `onCancel={() => setPendingDelete(null)}`, `onConfirm` fires `onDeleteStep(pendingDelete.id)` or `onDeleteSubStep(pendingDelete.id)` by `kind` then `setPendingDelete(null)`, `title`/`message` selected by `kind` from the copy props.
- [ ] Update the file-header doc comment (it currently says "Delete goal demoted into a ⋯ overflow menu" and "wires the callbacks to Evolu" in [Integrate]) to note the in-view confirm-delete for step/sub-step rows.

### Step 3: Stories + tests

**Files**: `src/components/EditGoalView/EditGoalView.stories.tsx`, `src/components/EditGoalView/__tests__/EditGoalView.test.tsx`
**Commit**: `test(edit-goal-view): cover confirmed step/sub-step deletion in stories and tests`
**Changes**:

- [ ] `EditGoalView.stories.tsx`: add `deleteStep(stepId)` to `InteractiveEditGoal` (`setSteps((prev) => prev.filter((s) => s.id !== stepId))`), wire `onDeleteStep={deleteStep}`; wire `onDeleteStep={noop}` into `MatrixEditGoal` (~line 300); wire `onDelete={() => {}}` into `AnatomyRow`'s direct `EditGoalStepRow` (`RowAnatomy` story). `deleteSubStep` is unchanged (now runs on Confirm).
- [ ] `EditGoalView.test.tsx`: add `onDeleteStep: jest.fn()` to `makeProps()`.
- [ ] **Update** the existing "deletes a sub-step via its × button" test (~307): press `edit-goal-substep-delete-sub1` → assert the confirm modal is on screen → press its Confirm button ("Delete") → assert `onDeleteSubStep("sub1")`. Add a sibling test: press `×` → press Cancel → `onDeleteSubStep` not called.
- [ ] **Add** a `describe("step delete (#460)")` block: (1) `×` exists on a main row (`edit-goal-step-delete-s1`); (2) pressing it shows the confirm modal (title text); (3) Confirm calls `onDeleteStep("s1")`; (4) Cancel does not call it; (5) `accessibilityRole="button"` + `accessibilityLabel="Delete step: First step"`; (6) the `×` does not render while that row is in inline-edit mode.
- [ ] Run `bun run test --testPathPatterns EditGoalView` and confirm new + updated tests pass.

## Testing Strategy

- [ ] Unit tests exercised via `EditGoalView.test.tsx` (Jest 30, `@testing-library/react-native` v13) — no separate `EditGoalStepRow.test.tsx` exists (rows are tested through the parent), so new coverage follows that convention.
- [ ] Cover the full confirm loop for both delete kinds: open modal, Cancel (no callback), Confirm (callback fires with the right id). The Cancel path is the regression guard for "don't silently delete."
- [ ] Manual/Storybook verification: open `Iteration B/Goals/EditGoalView` → `Populated`, press a main row's `×` → the confirm modal appears; Cancel keeps the step; Confirm removes it and updates the step count; repeat for a sub-step `×`.

## Not in Scope

| Item                                                    | Reason                                                                                                                                                                                                                                    | Follow-up           |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Goal-level (⋯ overflow) delete confirmation             | `EditGoalView` only fires `onOverflowPress()`; the overflow menu + its delete row live in the parent, so there is no goal-delete action in this component to gate. Deferred per D6 — **flagged in Open Questions** for user confirmation. | `[Integrate]` issue |
| Screen/persistence wiring (`EditModeScreen.tsx`, Evolu) | This is a `[Storybook]`-labeled issue; #445 established the pattern of shipping the component in isolation first.                                                                                                                         | `[Integrate]` issue |
| Reorder-within-parent for sub-steps                     | Pre-existing, unrelated deferral from #445/#459 — untouched by this issue.                                                                                                                                                                | #459                |

## Discovery Log

- **[2026-07-07] Steps 1–3 implemented.** All code + stories + tests written:
  - `EditGoalStepRow.tsx`: `onDelete` (required) + `deleteStepLabel?` props added; `×` `Pressable` (testID `edit-goal-step-delete-<id>`, `accessibilityRole="button"`, label `Delete step: <title>`, `hitSlop={8}`) renders last in `rowMain`, non-editing branch only (D4).
  - `EditGoalView.styles.ts`: `stepDelete` / `stepDeleteGlyph` added, mirroring `subStepDelete`/`subStepDeleteGlyph` (D3), zero hex.
  - `EditGoalView.tsx`: `onDeleteStep` prop + 4 confirm-copy props (D5) + `pendingDelete` state (D2); main-row and sub-step (D1b) `×` both route to `setPendingDelete`; one `ConfirmDeleteModal` instance fires the right callback on Confirm, clears on Cancel; header doc comment updated.
  - Stories: `deleteStep` handler + `onDeleteStep` wired into `InteractiveEditGoal`, `MatrixEditGoal` (noop), and `AnatomyRow` (noop).
  - Tests: `makeProps` gains `onDeleteStep`; existing sub-step delete test retrofitted to confirm-then-Confirm + a Cancel sibling; new `describe("step delete (#460)")` block (exists, opens modal, Confirm fires, Cancel no-op, a11y role/label, hidden in edit mode).
  - **Gates:** `type-check` ✅ clean. `bun run test --testPathPatterns EditGoalView` ✅ **46/46 pass** (pre-existing `act()` warnings from the async `AccessibilityInfo` screen-reader probe — not introduced here).
- **[2026-07-07] ⚠️ BLOCKER — D5 layering assumption is wrong.** `bun run lint` fails with **1 error** (the only error; all 214 other lint problems are pre-existing boundary _warnings_ in unrelated files):
  > `EditGoalView.tsx:44 error Import '../../screens/ConfirmDeleteModal' crosses an architectural boundary. Files in src/components/ and src/utils/ must not import from src/screens/` — rule `local/no-component-imports-screens` (see AGENTS.md "Architectural Rules").
  > D5 dismissed the `screens/`→`components/` import as "a minor layering quirk" — it is in fact an **enforced ESLint boundary**, so the current code does not pass lint. **Resolution required before the PR.** Options:
  1. **(Recommended) Move `ConfirmDeleteModal` from `src/screens/ConfirmDeleteModal/` to `src/components/ConfirmDeleteModal/`.** It is a pure presentational, prop-driven modal (no screen logic) — architecturally it belongs in `components/`. Mechanical + fully verifiable via type-check/tests. Blast radius: the dir move + import-path updates in its 4 current screen consumers (`BadgeDetailScreen`, `EditModeScreen`, `FocusModeScreen`, `GoalsScreen`), the modal's own internal `../../components/{Text,Card,Button}` → `../{Text,Card,Button}`, plus its tests/stories and this component's import (`../../screens/ConfirmDeleteModal` → `../ConfirmDeleteModal`). Widens the PR beyond "component-only" but is the correct fix and touches 4 shipped screens' _imports only_ (no behavior change).
  2. Inline `eslint-disable-next-line local/no-component-imports-screens` with justification — **rejected**: workaround theater; masks the real boundary the repo enforces on purpose.
  3. Extract a shared presentational confirm modal into `components/` and have `screens/ConfirmDeleteModal` re-export — strictly worse than option 1 (indirection for no benefit).
     **Recommended: option 1.**
- **[2026-07-07] ✅ BLOCKER RESOLVED — user chose option 1 (move to `components/`).** Confirmed there is no confirm modal already in `src/components/` (only media viewers: Audio/Photo/Video/TextNote), and `ConfirmDeleteModal` _is_ the existing shared modal (no duplication — the move relocates the same one). Executed:
  - `git mv src/screens/ConfirmDeleteModal src/components/ConfirmDeleteModal`.
  - Modal's internal imports `../../components/{Text,Card,Button}` → `../{Text,Card,Button}`; stories' `../../components/Button` → `../Button`. Its `__tests__` `../../../{i18n,__tests__/test-utils}` paths were unchanged (still resolve to `src/`).
  - Updated the 4 screen consumers' imports `../ConfirmDeleteModal` → `../../components/ConfirmDeleteModal` (BadgeDetailScreen, EditModeScreen, FocusModeScreen, GoalsScreen), `EditGoalView.tsx` → `../ConfirmDeleteModal`, and `src/__tests__/accessibility.test.tsx` → `../components/ConfirmDeleteModal/ConfirmDeleteModal`.
  - **Gates after move:** type-check ✅ clean; `bun run lint` ✅ **0 errors** (was 1; 214 pre-existing warnings remain); tests ✅ `ConfirmDeleteModal|EditGoalView|accessibility` 76/76, and the 4 consumer screens 200/200.

**D5 is now superseded:** the shared confirm modal lives at `src/components/ConfirmDeleteModal/`; the `screens/`→`components/` import quirk no longer exists.

## Next Actions (post-context-clear)

1. **Commit** the working tree — nothing is committed yet. Suggested split:
   - The `ConfirmDeleteModal` move + all import-path updates (`refactor(confirm-delete-modal): relocate to components/ so components can consume it`).
   - Step 1 (row `×` + styles), Step 2 (view wiring), Step 3 (stories + tests) as originally planned — or fold pragmatically since files overlap.
   - **DCO:** husky adds `Signed-off-by`; verify it lands on each commit.
2. Storybook visual verification (Iteration B/Goals/EditGoalView → `Populated`): main-row `×` → confirm modal → Cancel keeps step, Confirm removes it + updates count; repeat for a sub-step `×`.
3. `/self-review` → `/finalize`.

**Full working-tree state (uncommitted):**

- `src/components/EditGoalView/EditGoalStepRow.tsx` — `×` affordance + props.
- `src/components/EditGoalView/EditGoalView.tsx` — `onDeleteStep` + confirm-copy props + `pendingDelete` + modal + sub-step retrofit + doc comment + import.
- `src/components/EditGoalView/EditGoalView.styles.ts` — `stepDelete`/`stepDeleteGlyph`.
- `src/components/EditGoalView/EditGoalView.stories.tsx` — `deleteStep` + `onDeleteStep` wiring.
- `src/components/EditGoalView/__tests__/EditGoalView.test.tsx` — `onDeleteStep` in makeProps, retrofitted sub-step delete test + Cancel sibling, new `step delete (#460)` block.
- `src/components/ConfirmDeleteModal/**` — moved from `src/screens/` (git rename) + internal import fixes.
- `src/screens/{BadgeDetail,EditMode,FocusMode,Goals}Screen/*.tsx` — import-path updates only.
- `src/__tests__/accessibility.test.tsx` — import-path update only.
