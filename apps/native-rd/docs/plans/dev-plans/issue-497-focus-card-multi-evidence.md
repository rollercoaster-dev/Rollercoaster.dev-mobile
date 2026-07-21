# Development Plan: Issue #497

## Issue Summary

**Title**: [Storybook] Focus card — preserve multi-evidence completion contract
**Type**: enhancement (contract change, Storybook-only)
**Complexity**: MEDIUM
**Estimated Lines**: ~380 lines (issue's own estimate: 180–320; runs a bit higher for a full
test-file rewrite for the widened contract, not new subsystems. Well under the ~500 LOC PR cap)

`FocusCurrentTaskCard` (`src/components/FocusCurrentTaskCard/`) currently accepts a single
`plannedEvidenceType?: string | null` and reveals "Mark complete" as soon as
`capturedEvidence.length > 0` — "any evidence, any type." The rest of the app (`StepCard`,
`FocusModeScreen`'s multi-evidence UI) plans **N** evidence types per step and only unblocks
completion once **every** planned type has at least one captured piece. This issue widens the
card's contract back to the N-type shape before #466 wires it into the real screen, without
regressing the card to disabled-checkbox / "missing" framing.

**Pure presentational, prop-driven, Storybook-only** — confirmed zero screen imports (grep
below); safe to change the contract shape freely.

## Intent Verification

- [ ] A story with `plannedEvidenceTypes: ["photo", "text"]` and only a photo captured does
      **not** render "✓ Mark complete".
- [ ] The same story with both a photo and a note captured **does** render "✓ Mark complete".
- [ ] "Change evidence plan" and "Add {type}" are two distinct `Pressable`s with distinct
      `accessibilityLabel`s and `testID`s — a test asserts pressing one never fires the other's
      handler.
- [ ] Every status variant of `FocusCurrentTaskCardProps` requires its rendered CTAs'
      handlers (no `?:` on a handler for a control that status renders) — verified by
      `bun run type-check` rejecting a story that omits one, not just by a test.
- [ ] `AllThemesMatrix` / `StatesAllThemes` stories still render the multi-evidence in-progress
      state across all 7 product themes with no missing/needed copy in the rendered tree.
- [ ] Existing 44pt-touch-target / label a11y contract test (`__tests__/FocusCurrentTaskCard.test.tsx`)
      passes unchanged in shape for the new per-type Add buttons.

## Dependencies

| Issue | Title                                                           | Status                  | Type                                                                      |
| ----- | --------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------- |
| #384  | Epic: Full Ride redesign                                        | 🟢 Open (tracking only) | Parent epic, not a blocker                                                |
| #408  | [Storybook] Focus Mode — Current Task Card view                 | ✅ Closed (merged)      | Predecessor — this is the component #408 shipped                          |
| #466  | [Integrate] Focus Mode rebuild 1/2 — mount FocusCurrentTaskCard | 🟢 Open, downstream     | Consumer — #497 is explicitly its Storybook prerequisite, not the reverse |

No "Blocked by" / "Depends on" / "After" marker in the issue body. Labels confirm
`dep:independent`, `order:1`. The only two issue references are the parent epic (#384,
tracking-only, does not gate a child) and #466, which is _downstream_ of #497 ("Storybook
prerequisite for #466" — #466 waits on #497, not the other way around).

**Status**: ✅ All dependencies met — no blockers.

## Objective

Replace `FocusCurrentTaskCardProps`' single `plannedEvidenceType` with a non-empty
`plannedEvidenceTypes` list (in-progress only), gate "Mark complete" on the existing
app-wide "every planned type captured" predicate, give "Change evidence plan" (opens the
multi-select authoring picker) a control genuinely distinct from "Add {type}" (per-unsatisfied-type
capture invite), and strengthen the prop shape so a rendered CTA can never have an
undefined `onPress`. Add stories for a partially- and a fully-satisfied multi-type plan.

## Decisions

| ID  | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Alternatives Considered                                                                                                                                                            | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Reuse `getMissingQuickEvidenceOptions(plannedTypes, capturedTypes)` (exported, `src/components/StepCard/StepCardEvidenceCapture.tsx`) as the "which planned types still need a first piece" filter; completion = that list being empty.                                                                                                                                                                                                                                                              | (a) Extract a brand-new shared predicate module; (b) inline a fresh "every planned type satisfied" check in the card, duplicating `StepCard.tsx`'s `isBlocked` logic a third time. | Zero risk to `StepCard.tsx` (untouched), reuses the _actual_ existing "never frames as missing" multi-type logic verbatim (its own doc comment: "planned types not yet captured... never frames anything as missing"), and `FocusCurrentTaskCard` already cross-imports from a StepCard-adjacent module (`stepStateColorMap` from `../TimelineNode/`), so this follows an established cross-folder-import precedent rather than inventing one.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| D2  | `FocusCurrentTaskCardProps` becomes a **discriminated union on `status`** (one variant per `FocusCardStatus`), each variant listing only the handlers/props its own view renders, all required.                                                                                                                                                                                                                                                                                                      | Keep the current flat interface with all-optional props (today's shape, whose own doc comment admits "a prop set on the wrong status is silently ignored").                        | Directly satisfies the issue's "rendered actions are required and dead CTAs cannot compile" bullet — a `Pressable`'s `onPress` can never be `undefined` for anything the matched status renders. Mirrors the exact pattern already used one folder over: `EvidenceTypePickerProps` (`AuthoringEvidenceTypePickerProps \| CaptureEvidenceTypePickerProps`), called out there as its own decision (D7 in that file).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| D3  | `plannedEvidenceTypes: readonly string[]` on the `in-progress` variant.                                                                                                                                                                                                                                                                                                                                                                                                                              | A non-empty tuple `readonly [string, ...string[]]` (compile-time empty guard).                                                                                                     | **Joe's call: plain array, don't overcomplicate.** The "every step requires evidence" invariant is enforced by the completion gate (D1) and callers, not by a clever type. A plain array is idiomatic and keeps stories/tests friction-free.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| D4  | "Change evidence plan" stays **one Pressable wrapping the whole planned-types box** (icon+label per type + trailing "Change evidence plan" text), generalizing today's single-type box; its `accessibilityLabel` joins all planned-type labels via `Intl.ListFormat(i18n.language, { type: "conjunction" })` (already runtime-probed as supported in `src/dev/intlProbe.ts`). "Add {type}" moves to a **separate row below**, one button per type in `getMissingQuickEvidenceOptions`'s output (D1). | Split the planned box into N separately-tappable per-type "change" targets.                                                                                                        | Keeps "one tap target changes the whole plan" (today's shape, doesn't multiply touch targets awkwardly for a 2–3 item list) while making the box's _purpose_ (see the plan / change it) structurally distinct from the footer's _purpose_ (capture a still-needed piece) — directly answers the issue's "make 'Change evidence plan' distinct from 'Add evidence'" bullet without inventing new UI regions.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| D5  | Once every planned type is satisfied, the footer becomes `[✓ Mark complete]` (primary) + one generic secondary **"Add more evidence"** (opens the capture-type picker with no type pre-implied), replacing today's single-type `addButton(false)` ("Add Photo") that stays pinned post-satisfaction.                                                                                                                                                                                                 | Keep a still-type-specific secondary Add button per planned type even after each is individually satisfied.                                                                        | Today's single-type card conflates "the one planned type" with "the only type worth re-offering," which doesn't generalize: once a 2-type plan is fully satisfied there's no single "still needed" type left to name. A generic secondary preserves the existing "you can still capture more after completion" capability (regression risk noted, test updated) without any per-type CTA implying a _specific_ type is still outstanding.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| D6  | **Don't touch `canCompleteStep` in this PR — defer the "every planned type" tightening to #466.**                                                                                                                                                                                                                                                                                                                                                                                                    | Fix `canCompleteStep` here.                                                                                                                                                        | **Joe's call (after reviewing the code): defer.** The confirmed "block until every planned type captured" behavior is _already_ enforced by the shipped UI (`StepCard.tsx:117-123`, explicit comment). `canCompleteStep`'s looser `.some()` is a _specified_ behavior — its docstring says "at least one" and `queries.step.test.ts:134` deliberately asserts partial-match → completable — not a stray typo. It's also not a one-word change: line 329 iterates over evidence (`validEvidence.some(e => plannedTypes.includes(e.type))`); the correct predicate iterates over planned types (`plannedTypes.every(pt => validEvidence.some(e => e.type === pt))`) and must flip the existing test + docstring. Because StepCard's UI already blocks partial completion, the DB looseness is unreachable today; it only becomes load-bearing when **#466** wires this card's `onMarkComplete` straight to the handler. So the spec change belongs to #466, reviewed against the real wiring — #497 stays presentational/Storybook-only. |

## Discovery: a real predicate mismatch already in the app (not introduced by this PR)

- `StepCard.tsx:121-124` (`isBlocked`) — blocks the checkbox unless **every** planned type is
  captured. This is the UI-visible, "current app" behavior the issue describes.
- `db/queries.ts:316-330` (`canCompleteStep`) — the function actually wired into
  `FocusModeScreen.tsx:407`'s toggle-complete handler — permits completion once **at least
  one** planned type is captured (`.some()`, explicit "at least one" in its own docstring).
- Today, `StepCard`'s stricter UI gate means `canCompleteStep`'s looser check is never the
  deciding factor in practice (the checkbox is hidden before the handler is ever reachable).
  But `FocusCurrentTaskCard` has no such stand-in today, and **#466 is exactly the issue that
  wires this card's `onMarkComplete` to that same handler** — at that point the "every type"
  UI and the "some type" DB gate (`canCompleteStep`) would actively disagree.
  **Deferred to #466 (Joe's call, D6):** the DB-gate tightening is a specified-behavior change
  (docstring + `queries.step.test.ts:134` both encode "at least one" today) and is only reachable
  once #466 does the wiring, so it lands there, not in this Storybook PR.

## Affected Areas

- `src/components/FocusCurrentTaskCard/FocusCurrentTaskCard.types.ts`: rewrite as a
  discriminated union on `status`; `plannedEvidenceType` → `plannedEvidenceTypes` (non-empty
  tuple); `onChangeEvidenceType` → `onChangeEvidencePlan`; `onAddEvidence` gains a `type`
  parameter; all in-progress/paused/completed/all-complete handlers become required for their
  own variant.
- `src/components/FocusCurrentTaskCard/FocusCurrentTaskCard.tsx`: `InProgressView` rewritten —
  derive `unsatisfiedTypes` via `getMissingQuickEvidenceOptions` (D1), gate Mark-complete on
  `unsatisfiedTypes.length === 0`, render the generalized planned-types box + per-type Add row
  - post-completion generic "Add more evidence" (D4/D5).
- `src/components/FocusCurrentTaskCard/FocusCurrentTaskCard.parts.tsx`: add a
  `PlannedEvidenceBox` part (planned-types box + "Change evidence plan" trigger), joined-label
  a11y via `Intl.ListFormat` (D4).
- `src/components/FocusCurrentTaskCard/FocusCurrentTaskCard.styles.ts`: add styles for the
  per-type row inside the planned box and the per-unsatisfied-type Add-button row (reusing the
  existing `ctaBase`/chip token patterns already in this file — no new tokens).
- `src/components/FocusCurrentTaskCard/FocusCurrentTaskCard.stories.tsx`: rename
  `plannedEvidenceType` → `plannedEvidenceTypes` everywhere; add
  `InProgressMultiEvidencePartial` and `InProgressMultiEvidenceSatisfied` stories.
- `src/components/FocusCurrentTaskCard/__tests__/FocusCurrentTaskCard.test.tsx`: rename
  props/labels throughout; add multi-type completion-gate coverage (Photo-alone withholds Mark
  complete; Photo+Note reveals it); add a "Change evidence plan" vs "Add {type}" distinct-target
  test.
- `src/i18n/resources/en/focusMode.json`: rename `currentTask.inProgress.changeEvidenceType(A11y)`
  → `changeEvidencePlan(A11y)`; add `currentTask.inProgress.addMoreEvidenceCta/A11y` (D5). English
  only — `de`/`pseudo` are bot-generated from `en` + the register yml (do not hand-edit).
- `src/components/StepCard/StepCardEvidenceCapture.tsx`: **read-only reuse**, no edit — confirms
  `getMissingQuickEvidenceOptions` is already exported and pure (no styling/component coupling),
  safe to import cross-folder.
- `src/db/queries.ts` (`canCompleteStep`): **not touched** — the DB-gate tightening to "every
  planned type" is deferred to #466 (D6). Listed only so implementers don't "helpfully" fix it here.

## Implementation Plan

### Step 1: Widen the prop contract to a discriminated union

**Files**: `FocusCurrentTaskCard.types.ts`
**Commit**: `feat(focus-card): widen FocusCurrentTaskCard to a multi-evidence, per-status contract`
**Changes**:

- [ ] Split `FocusCurrentTaskCardProps` into `FocusInProgressCardProps \| FocusPausedCardProps \|
FocusCompletedCardProps \| FocusAllCompleteCardProps`, discriminated on `status` (mirrors
      `EvidenceTypePickerProps`, D2).
- [ ] `FocusInProgressCardProps.plannedEvidenceTypes: readonly string[]` (D3),
      replacing `plannedEvidenceType?: string | null`.
- [ ] Rename `onChangeEvidenceType` → `onChangeEvidencePlan` (both required, no `?:`).
- [ ] `onAddEvidence(type: string): void` (was 0-arg) — required.
- [ ] `onPause`, `onMarkComplete` required (were optional).
- [ ] `onPickUp` (paused), `onReopen` (completed), `onDesignBadge` (all-complete) required.
- [ ] Update the file-top doc comment — the old "props grouped so a wrong-status prop is
      silently ignored" note is no longer true and should say why (discriminated union instead).

### Step 2: Multi-type planned box + per-type Add row + completion gate

**Files**: `FocusCurrentTaskCard.tsx`, `FocusCurrentTaskCard.parts.tsx`, `FocusCurrentTaskCard.styles.ts`
**Commit**: `feat(focus-card): gate Mark complete on every planned type, split plan-change from add-evidence`
**Changes**:

- [ ] `InProgressView`: `capturedTypes = capturedEvidence.map(e => e.type)`;
      `unsatisfiedTypes = getMissingQuickEvidenceOptions(plannedEvidenceTypes, capturedTypes)`
      (D1); `completionReady = unsatisfiedTypes.length === 0`.
- [ ] Add `PlannedEvidenceBox` to `parts.tsx`: one icon+label per planned type inside the
      existing bordered/shadowed box, trailing "Change evidence plan" text; box `onPress` fires
      `onChangeEvidencePlan`; `accessibilityLabel` built from all planned-type short labels via
      `Intl.ListFormat` (D4).
- [ ] Footer: while `!completionReady`, render one Add button per entry in `unsatisfiedTypes`
      (reusing this file's own `ctaBase`/`primaryCta` styling, not `StepCard.styles`), each
      firing `onAddEvidence(option.type)`; show the existing `helperLine` copy underneath
      (broadened to "not yet complete", not just "zero evidence").
- [ ] Footer: once `completionReady`, render `[✓ Mark complete]` primary + a new generic
      secondary "Add more evidence" (D5) firing `onAddEvidence` with no type bias (implementer's
      call on the exact param — e.g. the first `EVIDENCE_OPTIONS` type, or a sentinel — flagged
      in Open Questions).
- [ ] `CapturedEvidenceRail` usage unchanged (still shows what's present, unaffected by this
      change).

### Step 3: Stories for partial and fully-satisfied multi-type plans

**Files**: `FocusCurrentTaskCard.stories.tsx`
**Commit**: `test(focus-card): add multi-evidence story coverage, rename plannedEvidenceType(s) everywhere`
**Changes**:

- [ ] Rename `plannedEvidenceType` → `plannedEvidenceTypes` (array) in every existing story;
      update `handlers.onChangeEvidenceType` → `onChangeEvidencePlan`, `onAddEvidence` to accept
      a `type` arg (still a no-op).
- [ ] Add `InProgressMultiEvidencePartial`: `plannedEvidenceTypes: ["photo", "text"]`,
      `capturedEvidence` containing only a photo — asserts (via Storybook, not test) that Mark
      complete is absent and only the "Add Note" button shows.
- [ ] Add `InProgressMultiEvidenceSatisfied`: same plan, both photo and note captured — Mark
      complete + generic "Add more evidence" secondary.
- [ ] `AllThemesMatrix`: keep its existing single-type in-progress example (still valid,
      confirms no regression) — optionally add the multi-type satisfied case as a second row if
      it fits the 7-theme layout without ballooning the story file.

### Step 4: Test coverage for the new contract

**Files**: `__tests__/FocusCurrentTaskCard.test.tsx`
**Commit**: `test(focus-card): cover multi-evidence completion gate and plan-change/add-evidence distinction`
**Changes**:

- [ ] Rename every `plannedEvidenceType` → `plannedEvidenceTypes: ["photo"]` and
      `onChangeEvidenceType` → `onChangeEvidencePlan` in `renderCard`'s defaults and all
      overrides; update the two label-text assertions ("Change evidence type, currently Photo" →
      whatever D4's final copy resolves to).
- [ ] New: "Photo + Note plan, only Photo captured → Mark complete absent, Add Note button
      present, Add Photo button absent."
- [ ] New: "Photo + Note plan, both captured → Mark complete present, generic Add-more-evidence
      secondary present, no per-type Add button remains."
- [ ] New: "pressing 'Change evidence plan' never fires `onAddEvidence`; pressing an 'Add
      {type}' button never fires `onChangeEvidencePlan`" (the distinct-targets acceptance
      criterion, asserted directly rather than by inference).
- [ ] Extend the existing "never frames evidence as absent" sweep (`it.each(ALL_STATES)`) to a
      multi-type fixture too — same missing/needed/blocked regex, new prop shape.
- [ ] Extend the existing "every button has a label + 44pt target" sweep to the new per-type Add
      row and the generic post-completion Add button — no new exemptions.

### Step 5: i18n keys (en only)

**Files**: `src/i18n/resources/en/focusMode.json`
**Commit**: `i18n(focus-mode): rename change-evidence-type keys to change-evidence-plan, add add-more-evidence copy`
**Changes**:

- [ ] `currentTask.inProgress.changeEvidenceType` → `changeEvidencePlan` ("Change evidence
      plan"); `changeEvidenceTypeA11y` → `changeEvidencePlanA11y` (drop the `{{type}}`
      interpolation — the joined-list label is built in code per D4, not via one `{{type}}` slot).
- [ ] Add `currentTask.inProgress.addMoreEvidenceCta` / `...A11y` for the post-completion
      generic secondary (D5).
- [ ] Do **not** touch `de/focusMode.json` or `pseudo/focusMode.json` — the i18n-sync bot
      regenerates both from `en` + `_register/focusMode.yml` after merge (project memory).

## Testing Strategy

- [ ] Unit tests for `FocusCurrentTaskCard` (Jest 30, `@testing-library/react-native` v13) —
      extend `src/components/FocusCurrentTaskCard/__tests__/FocusCurrentTaskCard.test.tsx` in
      place (already mirrors `src/` correctly).
- [ ] Use `test.each` for the partial/satisfied pairing and the per-status button-label sweep
      (already the pattern in this file — keep it).
- [ ] Run with `bun run test --testPathPatterns FocusCurrentTaskCard` (never `bun test` /
      bare `jest`).
- [ ] `bun run type-check` must reject a story/test that constructs an `in-progress` card
      without every required in-progress handler — this is the actual proof of "dead CTAs
      cannot compile," not a runtime assertion.
- [ ] Manual: `bun run storybook` (or the web Storybook target this repo already uses) →
      visually confirm `InProgressMultiEvidencePartial` / `...Satisfied` and the theme-toolbar
      switch across all 7 themes.

## Not in Scope

| Item                                                                                                     | Reason                                                                                                                                                                                                                                | Follow-up                                                                       |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Wiring `FocusCurrentTaskCard` into `FocusModeScreen`                                                     | Explicitly #466's job; this issue is its Storybook prerequisite                                                                                                                                                                       | #466                                                                            |
| Tightening `canCompleteStep` (`db/queries.ts:316`) from `.some()` to "every planned type"                | Specified behavior (docstring + `queries.step.test.ts:134` encode "at least one"), unreachable today because StepCard's UI already blocks partial completion; only load-bearing once the card is wired. Not a Storybook concern. (D6) | **#466** — must land the DB-gate change alongside the wiring so UI and DB agree |
| `EvidenceTypePicker` authoring-mode sheet actually opening from "Change evidence plan"                   | That's real app wiring (state + navigation), not a presentational card concern                                                                                                                                                        | #466                                                                            |
| Rewriting `StepCard.tsx`'s inline `isBlocked` to also call `getMissingQuickEvidenceOptions` for symmetry | Not requested, touches shipped/tested code outside this issue's blast radius                                                                                                                                                          | none — flagged only as a "could unify further" observation                      |

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->
