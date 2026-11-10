# Development Plan: Issue #803

## Issue Summary

**Title**: Edit Goal: add, edit and clear a step's description
**Type**: feature
**Complexity**: MEDIUM
**Base**: `origin/main` 394aabc (#593 merged as PR #804: `step.description` column, `updateStep(id, { description })`, Focus card rendering)

## Scope

Edit Goal step rows and sub-step rows gain a description slot:

- No description → a quiet `＋ description` prompt (same register as `＋ when?`).
- A description → the text itself, tappable to edit.
- Editing → a multi-line input with Save / Cancel, plus Clear while it holds text. Inline, in the row,
  not a sheet: `AnimatedSheet` has no keyboard handling, and the Edit Goal ScrollView already sits in
  `KeyboardAvoidingFrame`.

## Implementation steps

1. [x] `EditGoalRowDescription` (new, `src/components/EditGoalView/`): collapsed prompt / text / editor,
       one component shared by both row shapes, with `bindRowDescription` (mirrors `bindRowTiming`).
2. [x] `EditGoalStepList`: one `descriptionEdit { id, draft }` state (ids unique across steps and
       sub-steps). Save trims, refuses over the max (editor stays open, draft kept, message shown and
       announced), maps empty to `null`, skips unchanged writes, and keeps the editor open when the host
       reports a failed write. The open editor also counts as "editing" for the drag coordinator so a
       long-press in the text field can never lift the card.
3. [x] `EditGoalStepRow` / `EditGoalSubStepRow` / `EditGoalSubStepList` / `EditGoalView`: thread the
       bound props and copy through; slot sits under the title, above the timing line.
4. [x] `EditModeScreen`: `onStepDescriptionChange(id, value)` → `updateStepFields(id, { description })`,
       `stepDescriptionMaxLength={STRING_1000_MAX_LENGTH}`; `editGoalSteps.ts` maps `description`.
5. [x] Copy: `editGoal:editor.stepDescription.*` in en + de, pseudo regenerated.
6. [x] Tests: view-level add / edit / clear / over-length / cancel / failed write / sub-step; screen-level
       writes through `updateStep` incl. `null` on clear and multi-line text preserved.

## Intent Verification

- [x] Step row and sub-step row each offer add (none) and edit (has one).
- [x] Save writes `updateStep(id, { description })`; clearing stores `null` (Focus card already hides the
      block for a falsy description — `FocusCurrentTaskCard.tsx`).
- [x] Over 1000 characters (after trim, matching `parseStepDescription`) is refused with a visible,
      announced message; the typed text stays in the field. No `maxLength` on the input — that would
      silently truncate a paste, i.e. drop what was typed.
- [x] Multi-line: input is `multiline`; inner newlines are sent untouched (only outer whitespace trimmed,
      as the DB layer does anyway). Focus card renders a plain `<Text>`, which keeps `\n`.
- [x] a11y: every control is a `button` with a label; prompt/text targets are 44pt min, Save/Cancel/Clear
      use `Button` (48pt). Text wraps, no fixed heights, so large text grows the row. Colors are theme
      tokens only (7 themes).
- [x] Copy in `editGoal` namespace en + de; neutral wording (ADR-0012), no red/error tone on the limit
      message.
- [x] Tests cover add, edit, clear, over-length.

## Validation

`bun run type-check`, `bun run lint`, `bun run test` from repo root (sequential, single worker);
targeted: `bun run test --testPathPatterns EditGoalView|EditModeScreen --runInBand` in `apps/native-rd`.
No simulator run in this lane — an iOS device/sim check is needed before merge.

## Decisions

- **D1 Explicit Save, no commit-on-blur.** Title rename commits on blur, but a multi-line field has no
  "done" return key, and a blur-commit would race Cancel. Save / Cancel are explicit and 48pt.
- **D2 Editing state lives in the list**, like the title rename, so swapping a row between its draggable
  and static shells (drag is off while editing) cannot drop the draft.
- **D3 Read-only fallback.** Without `onStepDescriptionChange` (New Goal wizard, Storybook) an existing
  description renders as plain text and no prompt shows — wizard authoring is out of scope.
- **D4 Limit message tone.** Neutral body text, not `error` colour: it states the limit and the count.

## Discovery Log

- `stepsByGoalQuery` is `selectAll`, so `description` already reaches `buildEditGoalSteps`.
- `updateStep` trims and maps blank to `null` itself; the list still maps blank → `null` so the
  intent is explicit at the call site and tests can pin it.

## Follow-ups

- Native verification on iOS (large text + 7 themes) — not possible in this automated lane; flagged in
  the PR for Joe.
