# Development Plan: Issue #575

## Issue Summary

**Title**: [Storybook] Edit Goal step rows — one pressable timing line
**Type**: feature (Storybook-only; no screen wiring — that is #576)
**Complexity**: MEDIUM
**Estimated Lines**: ~350–450 lines (issue's own ~200–300 estimate does not fully
account for the story + test parity this epic's sibling issues have consistently
required — #574/#573 landed at ~2.5x their per-issue estimate for the same reason)

## Intent Verification

- [x] `EditGoalStepRow`/`EditGoalSubStepRow` render **one** pressable target for
      timing (not two ghost chips) in all three states: set (existing chip
      wording/glyphs, now stacked truth-lines), unset (`＋ when?`, ghost weight),
      completed-with-nothing-set (nothing rendered at all).
- [x] Tapping the timing line on a row with `onEditTiming` supplied fires
      `onEditTiming(stepId)` (or `(subStepId)`) exactly once; no editor opens
      in-row (that is #573/#576's job, not this row's).
- [x] A row constructed with `onEditTiming` omitted renders byte-identical output
      to the pre-#575 chip row (same testIDs, same text, no `accessibilityRole`
      added) — `EditGoalView.test.tsx`'s existing "row anatomy" tests pass
      unmodified.
- [ ] (needs a Storybook pass) `AllThemesMatrix` renders the ghost (`＋ when?`) row distinguishably from the
      set row in `highContrast` (no shadow tokens involved either way, since
      neither state uses one — verify the ink itself differs) and the ghost line
      is still legible (not sub-4.5:1 contrast) in `lowVision`.
- [x] The timing line's `accessibilityLabel` differs between the set and unset
      states and names the step title; VoiceOver/TalkBack narration for the unset
      case does not just read `"＋ when?"` back verbatim.
- [ ] (needs a Storybook pass — `minHeight: 44` on the shared timing band makes it true by construction) A side-by-side story of an all-set list and an all-unset list of the same
      length occupies visually equal vertical space per row (same `minHeight`,
      same line count budget) — the ghost tier never reads as "less".

## Dependencies

| Issue | Title                                                       | Status                         | Type            |
| ----- | ----------------------------------------------------------- | ------------------------------ | --------------- |
| #570  | Epic — Set B & C authoring                                  | 🔴 Open                        | Parent          |
| #573  | StepTimingEditor — in-row date + depends-on editor          | ✅ Merged (`be0c404`, PR #585) | Runs alongside  |
| #574  | StepDayGrid — themed month grid                             | ✅ Merged (`be0c404`, PR #585) | Runs alongside  |
| #571  | Neutral past-tense expected date ("was expected")           | ✅ Merged (`742f6bb`, PR #579) | File overlap    |
| #572  | B/C authoring scope (edit-time-only)                        | ✅ Merged (`10ef0e3`, PR #580) | Scope caveat    |
| #576  | (wires `onEditTiming` + `StepTimingEditor` into the screen) | not started                    | Blocked-by-this |

**Status**: ✅ All dependencies met. Issue body states "Blocked by: nothing — start
now." #573/#574 already merged (commit `be0c404`), which is a bonus: their
`StepTimingEditor`/`TruthLines`/`isCompleted` precedent settles several of this
issue's design questions below with real, shipped code rather than the prototype
alone. #572 (merged) confirms B/C authoring is edit-time-only for now, so the
"scope caveat" about wizard build-list rows does not apply yet — this issue's row
set (Edit Goal only) is final as scoped.

## Objective

Make the existing read-only date/dependency display on `EditGoalStepRow` and
`EditGoalSubStepRow` into a single pressable "timing line" per row, in all three
states (set / unset / completed-with-nothing), calling a new optional
`onEditTiming(stepId)` prop. No editor opens here — #573 already built
`StepTimingEditor`; #576 wires this row's callback to it. This issue only changes
the row's presentation (chip-pills → stacked truth-lines, matching
`StepTimingEditor`'s own read-out) and adds the tap target + the unset ghost
affordance + the completed-with-nothing suppression + sub-step parity (currently
sub-steps carry no date/dep data at all).

## Decisions

| ID  | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Alternatives Considered                                                                                                                           | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Change the row's date/dep container from a wrapped row of bordered pills (`chipRow`/`dateDepChip`, `EditGoalView.styles.ts:221-244`) to stacked, borderless truth-lines — one line per chip, `display`-block equivalent (`flexDirection: "column"`).                                                                                                                                                                                                                                                                                                                                                                  | Keep the pill styling, just wrap it in one `Pressable`.                                                                                           | The design of record (`prototypes/screen-redesign/Set BC D Prototype.html:524-533` `truthLines()`, and its CSS at `:175-183` — `.truth { font-size: 12px; ...; display: block }`, `.truth + .truth { margin-top: 2px }`) renders these as stacked lines, not pills — and the already-shipped `StepTimingEditor`'s `TruthLines` component (`StepTimingEditor.parts.tsx:37-79`) implements exactly this stacked layout for the same glyph/text/tone data. The issue's own wording — "the existing truth-lines" plus "at most two lines, stacked" — describes that shared format, which the row must now match for read-out parity, not preserve its own prior pill CSS. The "Must not do: do not change set-line visuals, glyphs, tones" bullet is read as protecting the _text/glyph/tone content and the one-dependency-line precedence_ (already enforced upstream in `buildDateDepChips`, `editGoalSteps.ts:72-121` — this issue touches none of that logic), not the pill container, which is presentation this issue is explicitly asked to unify. |
| D2  | Do not reuse `StepTimingEditor.parts.tsx`'s exported `TruthLines` component directly; keep a local stacked-line renderer in `EditGoalStepRow`/`EditGoalSubStepRow` built from `step.dateDepChips` + the existing `CHIP_GLYPH`/tone-color map.                                                                                                                                                                                                                                                                                                                                                                         | Import `TruthLines` for exact parity.                                                                                                             | `TruthLines` only renders an `after`-line and a `due`-line — it has no `waiting` case, because `StepTimingEditor` deliberately never authors "waiting on" (`StepTimingEditor.tsx:62-66`: "waiting on is deliberately absent... belongs in Focus"). The read-only row must still display a `waiting` chip (⏳, warning tone) when `resolveStepDependencyBand` resolves one, per the existing `CHIP_GLYPH` map (`EditGoalStepRow.tsx:51-55`). Forcing `TruthLines`' 2-slot shape onto 3 possible tones would either drop the `waiting` case or require changing `TruthLines`' public contract for a component #573 already shipped and is out of this issue's scope to touch.                                                                                                                                                                                                                                                                                                                                                                            |
| D3  | Add `isCompleted?: boolean` to `EditGoalStep` and `EditGoalSubStep` (`EditGoalView.tsx:86-104`), reversing the "no status field" decision from issue #446's D3 (`docs/plans/dev-plans/issue-446-integrate-edit-goal.md:46`).                                                                                                                                                                                                                                                                                                                                                                                          | Leave the types alone; gate the "no affordance on completed" rule some other way (e.g. a separate row-level prop not carried on the step object). | #446's D3 predates this epic's requirement that a _completed step with nothing set_ render literally nothing — a rule the issue states explicitly and prototypes at `Set BC D Prototype.html:657-662` (`showTiming = lines.length > 0 \|\| !step.done`). `StepTimingEditor` (`StepTimingEditor.tsx:84`, `isCompleted = false`) already added exactly this concept as a prop for the same purpose, one component over — extending the shared `EditGoalStep`/`EditGoalSubStep`step-shape (rather than adding a same-shaped sibling prop next to`step`) matches how `dateDepChips`itself already rides the step object, and needs no extra binding at the list layer. Real wiring from DB status →`isCompleted`is #576's job (Storybook-only scope here, same as`dateDepChips` was when #445 first shipped the row).                                                                                                                                                                                                                                      |
| D4  | Add `dateDepChips?: EditGoalDateDepChip[]` and `isCompleted?: boolean` to `EditGoalSubStep` (`EditGoalView.tsx:78-84`), reversing "#407 OQ-2" ("Sub-steps carry no C/B band" — `editGoalSteps.ts:52-53`).                                                                                                                                                                                                                                                                                                                                                                                                             | Leave `EditGoalSubStep` untouched; give sub-steps a parallel-but-separate timing type.                                                            | The issue's acceptance list requires a sub-step timing story ("the same set on a sub-step"), and `StepTimingEditor`'s own `StepTimingCandidate` type already carries full timing fields for sub-step candidates (`isSubStep: true` entries with `dueDate` in `StepTimingEditor.stories.tsx:52-72`) — #573/#574 already treat sub-steps as full timing participants. #407's older exclusion is superseded by the shipped sibling component; carrying the same two fields `EditGoalStep` just gained keeps the two step-shapes symmetric, which is what `EditGoalSubStepList`/`EditGoalStepList` already assume everywhere else (same evidence-type field, same title field, same id space).                                                                                                                                                                                                                                                                                                                                                             |
| D5  | Thread `onEditTiming?: (id: string) => void` through `EditGoalStepList` → `EditGoalStepRow` (as a bound zero-arg `onEditTiming?: () => void`) and `EditGoalSubStepList` → `EditGoalSubStepRow`, mirroring the existing `onDelete`/`onReparentStep`→`onNestUnder` binding pattern (`EditGoalStepList.tsx:461-465`, `:466-472`). Also add the same optional prop to `EditGoalView.tsx` and forward it to `EditGoalStepList` (`EditGoalView.tsx:486-522`), even though the issue text names only `EditGoalStepList`/`EditGoalSubStepList`/`flattenEditGoalSteps`.                                                        | Stop at the List layer, since the issue doesn't name `EditGoalView.tsx`.                                                                          | `EditGoalView` is documented as "a thin composition around" `EditGoalStepList` (`EditGoalView.tsx:31-33`) and mechanically forwards every other list-level callback (`onReparentStep`, `onDeleteStep`, etc. — `EditGoalView.tsx:490-497`) straight through. #576 will need to reach the row's callback through the composed `EditGoalView`, the same component every consuming screen imports — stopping short of it would strand the callback one layer short of usable.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| D6  | Do **not** thread `onEditTiming` through `flattenEditGoalSteps.ts`, despite the issue text listing it among files to change.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Add a no-op parameter to keep the file list in the issue literal.                                                                                 | `flattenEditGoalSteps` is a pure `EditGoalStep[] → ClassifyStep[]` adapter (`{id, parentStepId}` pairs only) consumed solely by the drag coordinator (`useEditGoalHierarchyDrag.ts:60`) for reorder/reparent math — it carries no callbacks today (`onDelete`, `onReparentStep`, `onEvidenceChipPress` are none of them threaded through it either) and has no rendering role. The issue's file list is read as an imprecise gloss over "the prop threads down the row hierarchy," not a literal file-by-file spec; adding a dead parameter here would fail `flattenEditGoalSteps.test.ts`'s exact-shape assertions for no benefit.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| D7  | Gate the unset ghost line (`＋ when?`) and the completed-with-nothing suppression **only** when `onEditTiming` is supplied. When `onEditTiming` is omitted, render exactly what the row renders today (chips if present, nothing if not — regardless of `isCompleted`).                                                                                                                                                                                                                                                                                                                                               | Apply the same set/unset/completed logic unconditionally, independent of whether a callback exists.                                               | Preserves "Existing `EditGoalView` tests still pass — the read-only path is unchanged" (acceptance) and the acceptance story "a row with `onEditTiming` omitted (inert, current behaviour)" verbatim. `EditGoalView.test.tsx`'s existing test ("omits the date/dependency chip row when a step has no chips", `EditGoalView.test.tsx:222-226`) calls `makeProps()` with no `onEditTiming`, expects nothing rendered, and must keep passing unmodified — which only holds if the ghost line is conditional on the new prop's presence, not on `isCompleted` alone.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| D8  | Ghost-line ink: reuse `theme.colors.textMuted` (already the "faint" ND-safe token, per `StepTimingEditor.styles.ts:51-54`'s `whenPrompt` style and per the design system's existing `textMuted: "#a89cc4"` — `src/themes/adapter.ts:175`).                                                                                                                                                                                                                                                                                                                                                                            | Introduce a new `textFaint` token, matching the issue's literal wording.                                                                          | No `textFaint` token exists anywhere in the codebase or the design-tokens package (`grep -rn "textFaint" src` → zero hits) — the issue's "`textFaint`-class ink" is descriptive, not a literal token name. `textMuted` is the token the sibling, already-reviewed `StepTimingEditor` uses for the identical "ghost, available-not-unfinished" requirement one component over; introducing a second token for the same visual role would fragment the "ghost tier" across two names for no design difference.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| D9  | Default ghost-prompt copy: `"＋ when?"`, verbatim from `StepTimingEditor.tsx:95`'s `whenPromptLabel` default. Default unset-state a11y label: `` `Set when "${title}" is due` `` (the issue's own example string, generalized with the step title as a template parameter). Default set-state a11y label: reads the truth-line texts back (mirroring `StepTimingEditor.tsx:29-39`'s `defaultTimingLineA11yLabel`) prefixed with an "edit" framing, e.g. `` `Edit timing for "${title}": ${lines.join(", ")}` ``.                                                                                                      | Invent unrelated copy; leave the set-state label unspecified.                                                                                     | i18n-free by convention (D9 in every prior `EditGoalView` plan — English defaults, `[Integrate]`/#576 passes real `t()` output later). The unset copy is literally quoted in the issue's acceptance section; the set copy has no literal quote to match, so it is built from the same "read the line back" principle #573 already established for the identical row-affordance problem, satisfying "a label saying what tapping does, not just the line text" without inventing new wording philosophy.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| D10 | Add an optional `isTimingExpanded?: boolean` prop (default `false`) to both rows, applied as `accessibilityState={{ expanded: isTimingExpanded }}` on the Pressable — mirroring this file's existing boolean-flag convention (`isBeingDragged`, `isEditing`, `isArmedTarget`, all host-driven state, `EditGoalStepRow.tsx:61-94`) and `StepTimingEditor.tsx:227`'s own `accessibilityState={{ expanded: isExpanded }}`. No expand actually happens inside this row (Must-not-do: don't embed the editor) — the prop exists so #576 can reflect the _external_ editor's open/closed state on this line once it exists. | Omit `accessibilityState` entirely until #576 needs it.                                                                                           | Acceptance explicitly requires "the line carries expanded/collapsed state" as part of _this_ issue's a11y bar, not a deferred one — and the row already has the exact prop-naming precedent for host-driven booleans, so adding an always-`false`-by-default one costs nothing and avoids a second a11y patch in #576.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| D11 | Touch target: `minHeight: 44` + `alignSelf: "stretch"` (full row width) on the new timing-line style, no `hitSlop`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `hitSlop={8}` on a small inline element, matching `evidenceChip`/`stepDelete`.                                                                    | `StepTimingEditor.styles.ts:16-23`'s `timingLine` already solves the identical 44×44pt requirement for the identical control (a line of text, not an icon) with `minHeight: TOUCH_TARGET_MIN` + block layout, not `hitSlop` — `hitSlop` in this file is reserved for the small icon buttons (`evidenceChip`, `stepDelete`, `editClear`) that are visually smaller than 44pt and need padding rather than a redraw.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| D12 | Placement: insert the timing-line block exactly where `dateDepChips` renders today — after the row's `rowMain` header block, still inside the same fragment/`GestureDetector` subtree (`EditGoalStepRow.tsx:327-352`); same relative position after `primaryRow` for the sub-step row.                                                                                                                                                                                                                                                                                                                                | Move it outside the `GestureDetector`'s subtree to avoid any risk of pan-gesture capture.                                                         | The row's other interactive children (`evidenceChip`, `stepDelete`, `rowTitlePress`, `editClear`) already sit inside the same `GestureDetector`-wrapped `body` and work correctly today — RNGH's manual-activation `Pan` (`.onTouchesMove` + `stateManager.activate()/fail()`) and 400ms `LongPress` don't fire on a quick tap, so a `Pressable.onPress` inside that subtree already coexists safely with the drag gesture; no new drag-interference risk is introduced by adding one more `Pressable` in the same place the (currently inert) chip row already occupies.                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| D13 | Both rows render the timing line through one shared `EditGoalTimingLine` component (`EditGoalTimingLine.tsx`), which owns the glyph map, the tone-colour map, the three-state gate and both a11y labels.                                                                                                                                                                                                                                                                                                                                                                                                              | Duplicate the ~50-line stacked-line renderer in each row, hoisting only `CHIP_GLYPH` (Step 3's literal wording).                                  | Step 3 already ruled against duplicating the glyph object across the two files; the same argument covers the tone map, the `showTimingLine` gate and the label defaults, which are identical in both rows and are the part a future change (#576) would have to keep in sync. One 135-line module beats two copies of the same logic, and it keeps both row files off a bigger file-size-limit warning. D2 still holds: this is a local renderer, not `StepTimingEditor`'s `TruthLines`, so the `waiting` tone survives.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| D14 | Truth-line text keeps `fontFamily.mono` (the pre-#575 chip text's family) at `theme.size.sm` rather than adopting `StepTimingEditor`'s non-mono `truthText`.                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Match `StepTimingEditor.styles.ts`'s `truthText` exactly.                                                                                         | "Do not change set-line visuals, glyphs, tones" (Must-not-do) protects the set line's rendered content; the pill _container_ is what D1 unifies. Dropping mono would restyle text this issue was told not to touch, so only the container, stacking and size change. Size moves from the pill-era `10` to `size.sm` because the text is no longer inside a pill and now has to carry a 44pt touch target.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

## Affected Areas

- `apps/native-rd/src/components/EditGoalView/EditGoalView.tsx`: add `isCompleted?`/`dateDepChips?` to `EditGoalSubStep`, `isCompleted?` to `EditGoalStep`; add `onEditTiming?` prop + forward to `EditGoalStepList`; thread new default-copy props.
- `apps/native-rd/src/components/EditGoalView/EditGoalTimingLine.tsx` (new, D13): the shared pressable timing line — glyph/tone maps, the set/unset/completed gate, both a11y labels.
- `apps/native-rd/src/components/EditGoalView/EditGoalStepRow.tsx`: replace the plain chip-row render with the shared timing line; new props (`onEditTiming?`, `isTimingExpanded?`, label passthrough).
- `apps/native-rd/src/components/EditGoalView/EditGoalSubStepRow.tsx`: add the same timing-line block (new — sub-steps had none).
- `apps/native-rd/src/components/EditGoalView/EditGoalStepList.tsx`: thread `onEditTiming?` + copy props to `EditGoalStepRow`.
- `apps/native-rd/src/components/EditGoalView/EditGoalSubStepList.tsx`: thread `onEditTiming?` + copy props to `EditGoalSubStepRow`.
- `apps/native-rd/src/components/EditGoalView/EditGoalView.styles.ts`: replace/extend `chipRow`/`dateDepChip*` styles with stacked timing-line styles (`timingLine`, `timingLinePressed`, `truthLine`, `truthGlyph`, `truthText`, `whenPrompt`), reusing existing tone colors.
- `apps/native-rd/src/components/EditGoalView/index.ts`: no export changes needed (types already re-exported; no new public component).
- `apps/native-rd/src/components/EditGoalView/__tests__/EditGoalView.test.tsx`: extend "row anatomy" describe block with new pressable-timing-line coverage; existing chip tests must pass unmodified.
- `apps/native-rd/src/components/EditGoalView/EditGoalStepRow.stories.tsx` (new): stories under `Set B & C/EditGoalStepRow` per acceptance list, including `AllThemesMatrix` and the pressure-comparison story.

## Implementation Plan

### Step 1: Extend the step types

**Files**: `EditGoalView.tsx`
**Commit**: `feat(native-rd): add isCompleted + sub-step timing fields to EditGoalStep types`
**Changes**:

- [x] Add `isCompleted?: boolean` to `EditGoalStep` with a doc comment citing this
      issue and reversing #446's D3 (link the plan file).
- [x] Add `isCompleted?: boolean` and `dateDepChips?: EditGoalDateDepChip[]` to
      `EditGoalSubStep`, with a doc comment reversing "#407 OQ-2".
- [x] Update the file's top-of-component doc comment (currently describes
      sub-steps as carrying "no date/dep chips") to reflect the new shape.
- [x] `bun run type-check` — confirm no downstream break (fields are optional and
      additive; `flattenEditGoalSteps.test.ts` fixtures, `NewGoalWizard`,
      `editGoalSteps.ts` all keep compiling untouched).

### Step 2: Pressable timing line on `EditGoalStepRow`

**Files**: `EditGoalStepRow.tsx`, `EditGoalView.styles.ts`
**Commit**: `feat(native-rd): pressable timing line on EditGoalStepRow`
**Changes**:

- [x] Add props: `onEditTiming?: () => void`, `isTimingExpanded?: boolean`
      (default `false`), `whenPromptLabel = "＋ when?"`,
      `editTimingUnsetA11yLabel = (title) => \`Set when "${title}" is due\``,
      `editTimingSetA11yLabel = (title, lines) => \`Edit timing for "${title}": ${lines.join(", ")}\``.
- [x] Replace the `{step.dateDepChips && ... <View style={styles.chipRow}>}`
      block with:
  - Compute `hasTiming = Boolean(step.dateDepChips?.length)`.
  - Compute `showTimingLine = onEditTiming ? hasTiming || !step.isCompleted : hasTiming`
    (D7).
  - When `showTimingLine`: render either a plain `View` (no `onEditTiming`) or a
    `Pressable` (`onEditTiming` present) with `accessibilityRole="button"`,
    `accessibilityState={{ expanded: isTimingExpanded }}`, the computed a11y
    label, `testID={\`edit-goal-step-timing-${step.id}\`}`, `onPress={onEditTiming}`.
  - Inside: if `hasTiming`, map `step.dateDepChips` to stacked lines (glyph +
    text, tone-colored, reusing `CHIP_GLYPH`/`chipColor`, one per line, no pill
    background/border); else render the ghost `whenPromptLabel` text in
    `textMuted`.
- [x] `EditGoalView.styles.ts`: add `timingLine` (`minHeight: 44`,
      `alignSelf: "stretch"`, `justifyContent: "center"`, vertical padding,
      `gap`), `timingLinePressed` (`backgroundColor: backgroundTertiary`, mirrors
      `StepTimingEditor.styles.ts:24-26`), `truthLine` (row: glyph + text),
      `truthGlyph`, `truthText`, `whenPrompt` (`color: textMuted`). Keep
      `chipRow`/`dateDepChip*` styles only if still referenced elsewhere (grep
      first — if unused after this step, remove them in this commit rather than
      leaving dead style keys).

### Step 3: Pressable timing line on `EditGoalSubStepRow`

**Files**: `EditGoalSubStepRow.tsx`
**Commit**: `feat(native-rd): pressable timing line on EditGoalSubStepRow`
**Changes**:

- [x] Mirror Step 2's props and render logic on `EditGoalSubStepRow`, reading
      `subStep.dateDepChips`/`subStep.isCompleted` (new fields from Step 1).
      `testID={\`edit-goal-substep-timing-${subStep.id}\`}`.
- [x] Insert the block after `primaryRow`, before `accessibleActions`, in both
      the `canDrag` and `!canDrag` return branches (D12).
- [x] Reuse the same `CHIP_GLYPH`/tone-color map — export it from
      `EditGoalStepRow.tsx` (or hoist to a small shared module, e.g.
      `dateDepChipPresentation.ts`) rather than duplicating the literal object
      in both files.

### Step 4: Thread `onEditTiming` through the list layer + `EditGoalView`

**Files**: `EditGoalStepList.tsx`, `EditGoalSubStepList.tsx`, `EditGoalView.tsx`
**Commit**: `feat(native-rd): thread onEditTiming through EditGoalStepList/SubStepList/EditGoalView`
**Changes**:

- [x] `EditGoalStepList`: add `onEditTiming?: (stepId: string) => void` prop +
      copy-label passthrough props (`whenPromptLabel`, the two a11y-label
      builders); bind per row: `onEditTiming={onEditTiming ? () => onEditTiming(step.id) : undefined}`.
- [x] `EditGoalSubStepList`: same, bound to `sub.id`, passed down from
      `EditGoalStepList`'s `renderSubStepBlock`.
- [x] `EditGoalView`: add `onEditTiming?: (stepId: string) => void` prop (+ copy
      passthrough), forward to `EditGoalStepList` alongside the other
      list-level callbacks (D5).

### Step 5: Tests

**Files**: `EditGoalView.test.tsx` (extend existing "row anatomy" describe block)
**Commit**: `test(native-rd): pressable timing line coverage — set/unset/completed/inert/a11y`
**Changes**:

- [x] Existing chip tests (`"omits the date/dependency chip row..."`,
      `"renders each date/dependency chip..."`) pass unmodified — run them first
      to confirm before adding new ones.
- [x] New: with `onEditTiming` supplied and a step with `dateDepChips` set,
      pressing the timing line (`testID="edit-goal-step-timing-<id>"`) calls
      `onEditTiming("<id>")` once.
- [x] New: with `onEditTiming` supplied and no chips, not completed → renders
      the `＋ when?` ghost line, pressable.
- [x] New: with `onEditTiming` supplied, no chips, `isCompleted: true` → renders
      no timing line at all (`queryByTestId` → null).
- [x] New: with `onEditTiming` supplied, chips present, `isCompleted: true` →
      still renders the timing line (timing survives completion; only the
      _unset_ placeholder is suppressed).
- [x] New: `onEditTiming` omitted → no `accessibilityRole="button"` on the
      rendered chip block; same text content as before.
- [x] New: a11y labels differ between set and unset states (assert both label
      strings via `getByLabelText` or the `accessibilityLabel` prop).
- [x] New: same four cases repeated for a sub-step row (`EditGoalSubStepRow`
      via `EditGoalView`, or a dedicated lightweight render if wiring through
      the full `EditGoalView` tree is awkward for sub-steps — check existing
      sub-step test coverage pattern in this file first).
- [x] `bun run test --testPathPatterns EditGoalView`.

### Step 6: Storybook

**Files**: `EditGoalStepRow.stories.tsx` (new)
**Commit**: `docs(native-rd): Set B & C/EditGoalStepRow stories — timing line states + pressure comparison`
**Changes**:

- [x] `title: "Set B & C/EditGoalStepRow"`, following `StepTimingEditor.stories.tsx`'s
      structure (`themeNames`/`themes` import, `MOOD_NAMES` map, `PhoneWidth`-style
      frame helper if one already exists — check `StepTimingEditor.stories.tsx`'s
      helpers before reinventing).
- [x] Stories per acceptance: `Unset`, `DateOnly`, `DependencyOnly`, `Both`,
      `CompletedNothingSet` (renders nothing — say so in a `Text` caption, same
      pattern as `StepTimingEditor.stories.tsx`'s `CompletedStep` story),
      `CompletedWithDate`, `SubStep` (same states, one sub-step row), `Inert`
      (`onEditTiming` omitted), `PressureComparison` (a set-heavy list next to
      an unset-heavy list of equal row count, same screenshot frame).
- [x] `AllThemesMatrix`: all 7 `themeNames`, each rendering one unset + one set
      row side by side (to visually confirm the ghost tier stays distinguishable
      in `highContrast` and legible in `lowVision`), following the exact
      `ScopedTheme`/`MOOD_NAMES` pattern at `StepTimingEditor.stories.tsx:345-376`.

## Testing Strategy

- [x] Unit/integration tests via `EditGoalView.test.tsx`'s existing render
      harness (Jest 30, `@testing-library/react-native` v13) — no new test file
      needed unless the sub-step cases prove awkward to reach through the full
      tree, in which case add `EditGoalStepRow.test.tsx` / `EditGoalSubStepRow.test.tsx`
      directly (check for a lighter-weight render helper already used elsewhere
      in this directory before composing one).
- [x] `test.each` for the four onEditTiming/chips/isCompleted combinations
      (present+chips / present+no-chips+not-completed / present+no-chips+completed
      / present+chips+completed) rather than four near-duplicate `it` blocks.
- [ ] Manual: run Storybook, visually diff `AllThemesMatrix` and
      `PressureComparison` across at least `light-default`, `highContrast`, and
      `lowVision`.

## Not in Scope

| Item                                                                                                                                                                                                                                 | Reason                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Follow-up                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Embedding `StepTimingEditor` in the row / opening any editor on tap                                                                                                                                                                  | Explicit Must-not-do — the callback is a prop, #573 owns the editor                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | #576                                                                                                                                                                    |
| Wiring `isCompleted` from real DB step status, or `dateDepChips` for sub-steps from `resolveStepDependencyBand`, into `buildEditGoalSteps` (`editGoalSteps.ts`)                                                                      | Storybook-only scope per the issue's own header; this issue only changes the presentational types/components                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | #576                                                                                                                                                                    |
| "Waiting on" authoring inside the timing line                                                                                                                                                                                        | `StepTimingEditor` already deliberately excludes it (`StepTimingEditor.tsx:62-66`) — out of scope for the whole epic, not just this issue                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | separate issue if ever needed                                                                                                                                           |
| Wizard build-list rows getting the same timing line                                                                                                                                                                                  | #572 (merged) confirmed edit-time-only scope for now; the "scope caveat" about wizard rows does not currently apply                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | reopen if #572's answer changes                                                                                                                                         |
| A `· done ✓` suffix on the row's `after`-tone chip when the dependency is completed                                                                                                                                                  | `resolveStepDependencyBand` supplies no done-state to back one today (same gap `StepTimingEditor.tsx:68-73` documents) — this issue must not change chip-building logic (Must-not-do)                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | separate issue, touches Focus/Timeline/resolver together                                                                                                                |
| `waiting`-tone truth-line text fails WCAG AA contrast (measured with the repo's own `getContrastRatio`: light-default **3.05:1**, light-dyslexia **2.71:1**, light-autismFriendly **3.91:1**, against 4.5:1 required at 14px normal) | Pre-existing token choice, not introduced here: `main` already rendered the same `colors.warning` ink on the same `rowCard` background, and `FocusCurrentTaskCard.styles.ts:106` — the truth-line precedent this line was built to match (D1) — uses the same token the same way. `docs/accessibility-guidelines.md:57-63` treats `warning` as a background token, and `contrastPairs.ts:162` only tests `warningForeground`-on-`warning`, so no existing gate catches ink usage. Fixing it here would either diverge this line from `FocusCurrentTaskCard`'s identical read-out or change a shared token for ≥4 components — both wider than this issue | separate a11y issue, covering `colors.warning`-as-ink across `EditGoalTimingLine`, `FocusCurrentTaskCard`, `VideoRecorder`, `BadgeShareSheet` + a `contrastPairs` entry |

## Discovery Log

- [2026-08-20 12:01] Step 2/3: extracted the timing line into one shared
  `EditGoalTimingLine` component instead of a per-row local renderer (D13). The
  glyph map, tone map, three-state gate and both label defaults are identical in
  both rows; Step 3 already required sharing the glyph map, and the rest travels
  with it.
- [2026-08-20 12:01] Step 2: `chipRow` / `dateDepChip` / `dateDepChipGlyph` /
  `dateDepChipText` were used only by `EditGoalStepRow`, so they were removed
  rather than left as dead style keys (as Step 2 instructed). Nothing else in
  `src/` referenced them.
- [2026-08-20 12:01] Step 2: kept `fontFamily.mono` on the truth-line text
  (D14) — matching `StepTimingEditor`'s non-mono `truthText` would have
  restyled the set line, which the issue's Must-not-do list protects.
- [2026-08-20 12:01] Step 5: sub-step cases reach cleanly through the full
  `EditGoalView` tree (`steps[].subSteps[]` already carries the new fields), so
  no separate `EditGoalSubStepRow.test.tsx` was needed. 15 tests added; the two
  pre-existing chip tests pass unmodified.
- [2026-08-20 12:01] Step 6: added a `WaitingOn` story beyond the acceptance
  list — the `waiting` tone is the one the row renders and the editor never
  authors (D2), so it is the state most likely to regress unseen.
- [2026-08-20 15:40] Self-review: `styles.timingLine`'s `minHeight: 44` was
  being applied to the inert read-only path too. Both of D11's reasons for the
  band are about the tap target, and that path has none — so in the one shipping
  consumer (`EditModeScreen`, which passes no `onEditTiming` until #576) every
  step with chips grew ~20pt for no affordance. Split out `timingLineInert`
  (`minHeight: 0`); the interactive path keeps the full 44pt.
- [2026-08-20 15:40] Self-review: `isTimingExpanded` reaches only the two row
  components — `EditGoalStepList`, `EditGoalSubStepList` and `EditGoalView` were
  never given it (D5 threaded `onEditTiming` and the three copy props only), so
  `accessibilityState.expanded` can only be `false` through the view every
  screen imports. Left as-is: reflecting it needs a per-row notion of _which_
  row is open (an `expandedTimingId`-shaped prop), which is #576's editor-wiring
  decision, not this issue's. #576 must thread it or D10 goes unrealised.
- [2026-08-20 15:40] Self-review: added `__tests__/EditGoalTimingLine.test.tsx`.
  Three things are unreachable from the `EditGoalView` seam the other tests
  use — `isTimingExpanded: true` (nothing above the rows passes it), the copy
  overrides (view-level tests all ride the English defaults, so a dropped
  passthrough still reads correctly) and the `waiting` tone (no view-level
  fixture produces one). Mutation-checked: each new test fails against a
  deliberately broken variant.
- [2026-08-20 12:01] Step 6: a live `ScopedTheme` matrix is safe for the bare
  row (unlike `EditGoalView`'s, which reverts on web): the row holds no state
  and runs no async accessibility probes, so it never re-renders after mount.
