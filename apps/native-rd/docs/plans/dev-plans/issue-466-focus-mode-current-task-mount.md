# Development Plan: Issue #466

## Issue Summary

**Title**: [Integrate] Focus Mode rebuild 1/2 — strip old chrome + mount Current Task Card
**Type**: feature (screen rewrite / integration slice)
**Complexity**: MEDIUM (upper end, close to the ~500-line PR target)
**Estimated Lines**: ~550–650 lines (screen rewrite + styles cleanup + near-total test rewrite), consistent with the issue's own ~450–700 LOC estimate

## Intent Verification

- [x] Opening Focus Mode for a goal with a pending step renders exactly one `FocusCurrentTaskCard` (in-progress) for the step `resolveNextActionableStep` resolves — no `CardCarousel`, `MiniTimeline`, `ProgressDots`, or swipeable second card on screen.
- [x] The header shows only the goal title + edit pencil; the eye/timeline-toggle icon and `ModeIndicator` "Focus" pill are gone.
- [x] A `FocusProgressStrip` ("{done} / {total} done · See all steps ›") replaces the removed dual indicators, and tapping it navigates to `TimelineJourney` with `{ goalId }` — the exact call `handleTimelineTap` already makes today.
- [x] Tapping "Set this step aside" on an in-progress card calls `pauseStep(stepId)` and the card re-renders as the `paused` variant ("Pick this back up" CTA) for that same step — no navigation away.
- [x] Tapping "Pick this back up" on a paused card calls `resumeStep(stepId)` and the card re-renders as `in-progress` for that same step.
- [x] Tapping "Reopen this step" on a completed card calls `uncompleteStep(stepId)` and the card re-renders as `in-progress`.
- [x] The planned-evidence box's "change" affordance opens an `EvidenceTypePicker` (authoring/multi-select) sheet; toggling a type calls `updateStep(stepId, { plannedEvidenceTypes })`, mirroring `NewGoalWizard`'s build-list sheet, including the "can't deselect the last remaining type" guard.
- [x] Tapping an "Add {type}" invite (or the post-completion "Add more evidence") with no type opens the `EvidenceTypePicker` capture-mode sheet; selecting a type navigates to the mapped `Capture*` screen with `{ goalId, stepId }` — same `EVIDENCE_ROUTE_MAP` used today. Tapping a specific "Add {type}" invite navigates directly, skipping the sheet.
- [x] "✓ Mark complete" is revealed only once every planned type has a captured piece (`canCompleteStep`), matching the existing evidence-gated-completion contract (#497/#514) — never shown disabled, never framed as "missing."
- [x] A step whose `plannedEvidenceTypes` is `null` invites one text evidence item and reveals "✓ Mark complete" only once one is captured — the DB gate and the card's gate agree (D4).
- [x] The #292/#337 next-actionable-step resolution (leaf-under-parent, invite, orphan-promotion) still determines which step is "current" on mount; the surviving subset of `FocusModeScreen.test.tsx`'s sub-step regression tests pass against the new single-card render.

## Dependencies

| Issue     | Title                                                                | Status                      | Type                                                   |
| --------- | -------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------ |
| #378      | Timeline assembly — reconciled nodes + metadata + FinishLine         | ✅ Met                      | Blocker                                                |
| #408      | [Storybook] Focus Mode — Current Task Card view                      | ✅ Met                      | Blocker                                                |
| #409      | [Storybook] Evidence-type picker sheet                               | ✅ Met                      | Blocker                                                |
| #417      | [Foundation] Add `paused` step status + Set aside / Pick back up     | ✅ Met                      | Blocker                                                |
| #497/#514 | preserve multi-evidence completion contract                          | ✅ Met (merged, `91ed7852`) | Soft                                                   |
| #467      | [Integrate] Focus Mode rebuild 2/2 — Timeline handoff + auto-advance | Open, not blocked           | Sibling (owns the seam this plan explicitly defers to) |

**Status**: ✅ All dependencies met. The `dep:blocked` label on #466 is stale — every named dependency is closed and merged on this branch; #467 is a sibling slice, not a blocker (confirmed by its own body: "Blocked by slice 1/2" — i.e. it depends on #466, not the reverse).

## Objective

Replace `FocusModeScreen`'s three overlapping navigators (`MiniTimeline` + `ProgressDots` + `CardCarousel`-of-`StepCard`s) and the `EvidenceDrawer`/FAB fan-out with the single already-built `FocusCurrentTaskCard` (#408) driven by real Evolu data, plus the `FocusProgressStrip` (#450) as the lone progress/navigation affordance. Wire pause/resume/reopen (#417) and the evidence-plan/capture pickers (#409) for the first time — no screen currently calls `pauseStep`/`resumeStep`, and `FocusCurrentTaskCard`/`EvidenceTypePicker` are not yet imported by any screen.

## Decisions

| ID  | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                | Alternatives Considered                                                                                                                                                                                                                       | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | "Current step" is resolved **once** via the existing `resolveNextActionableStep` (thin-wrapped as today's `findFirstPendingLeafIndex`) and held in local state (`currentStepId`) for the screen's lifetime. Completing/pausing that step does **not** auto-select a new one — the card simply re-renders in its new (paused/completed) status for the same id.                                                                                          | (a) Re-derive "current" fresh from the resolver on every render (would auto-advance for free); (b) keep today's swipeable `currentCardIndex` carousel model                                                                                   | #467's own issue body explicitly owns "keep auto-advance-on-complete as the happy path" as its scope — implementing it here would duplicate/conflict with #467's deliverable. Anchoring to a fixed id also matches "no second resume control" (#381) and requires no new navigation surface, since MiniTimeline/ProgressDots/CardCarousel (the only ways to reach a _different_ step) are being removed in this slice.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| D2  | The "See all steps ›" chip (`FocusProgressStrip.onPress`) reuses today's exact `handleTimelineTap` — `navigation.navigate("TimelineJourney", { goalId })` — unchanged.                                                                                                                                                                                                                                                                                  | Passing a `stepId` param so Timeline-node-taps could return to a specific step                                                                                                                                                                | `TimelineJourneyScreen.handleNodePress` (`src/screens/TimelineJourneyScreen/TimelineJourneyScreen.tsx:196-198`) still does `navigation.navigate("FocusMode", { goalId })` with no step param, and `FocusModeScreenProps`/`GoalsStackParamList["FocusMode"]` (`src/navigation/types.ts:27`) is `{ goalId: string }` only. Wiring node-tap → specific-step is explicitly #467's scope ("tapping a Timeline node returns to Focus on that step"). #466 must not add a `stepId` param it can't yet honor.                                                                                                                                                                                                                                                                                                                                                                                                              |
| D3  | `GoalEvidenceCard` (today's "goal card" reached by swiping past all steps) is **removed** from `FocusModeScreen` entirely, not retained as an interim "all-complete" surface.                                                                                                                                                                                                                                                                           | Keep mounting `GoalEvidenceCard` whenever `areAllStepsComplete` is true, as a stand-in until #467 lands the redesigned all-done state                                                                                                         | #467's body explicitly owns "Add the **all-done** state with the redesigned 'Design your badge →' handoff." `GoalEvidenceCard` was only reachable via the `CardCarousel` seam being removed here; re-mounting it under new conditions would be new integration work for a state #467 already claims, and risks two competing "mark complete" surfaces existing across the two PRs. Net effect for this slice: reaching goal-completion / badge design from Focus Mode is temporarily unavailable between #466 and #467 landing (both target the same milestone). Recorded under Not in Scope.                                                                                                                                                                                                                                                                                                                      |
| D4  | A `null` `plannedEvidenceTypes` defaults to `["text"]` for **both** the card's display and the `canCompleteStep`/`completeStep` gate. Implement by changing `canCompleteStep`'s `plannedTypes === null` branch (`src/db/queries.ts:325`) from `return true` to treating the plan as `["text"]`, and by applying the same default where the screen builds the card's view model — so the two contracts agree. **Answered by Joe 2026-07-26 (option a).** | (b) default display only, leaving the DB gate permissive — rejected: the card would ask for evidence that isn't actually enforced; (c) defer to a separate data-completeness issue — rejected as unnecessary given the contained blast radius | `canCompleteStep(null, [])` returned `true` unconditionally while `FocusCurrentTaskCard`'s gate (`normalizedPlannedTypes.length > 0 && unsatisfiedTypes.length === 0`, `FocusCurrentTaskCard.tsx:120`) can never reveal "Mark complete" for a `null`-plan step — a real mismatch on a reachable state (`EditGoalView`'s default add-step flow never sets a plan). Option (a) matches the app's "evidence is required, never optional" invariant (#360). Blast radius is contained: `canCompleteStep` and `completeStep` are each called from exactly one non-test site, both in `FocusModeScreen.tsx` (`:407`, `:415`), plus `completeStep`'s internal guard (`queries.ts:842`). **This is a write-path behavior change on existing user data** — steps with no plan become non-completable until a text evidence item exists — so it gets its own commit for reviewability and must be called out in the PR body. |
| D9  | Goal-level evidence (captured on the goal, not any step) loses its only entry point in this slice, as #466 mandates removing the `CardCarousel`/`EvidenceDrawer` seam that reached it. No replacement surface is added here; follow-up issue **#523** is filed so the capability is tracked rather than silently dropped. Existing goal-level evidence rows and their queries/mutations are **not** deleted. **Answered by Joe 2026-07-26.**            | Retain `GoalEvidenceCard` under some new condition as an interim surface                                                                                                                                                                      | #466's "Must not do" bars un-storied UI, and no replacement is specified in #466/#467/#408/#409. Removing the entry point while preserving the data and filing the follow-up keeps the option open without inventing a surface this slice isn't scoped to design.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| D5  | Evidence deletion (long-press → confirm → `deleteEvidence`) is **dropped** from Focus Mode; no replacement affordance is added.                                                                                                                                                                                                                                                                                                                         | Keep a delete path via some other UI                                                                                                                                                                                                          | `FocusCurrentTaskCard.parts.tsx`'s `CapturedEvidenceRail` is deliberately read-only ("chips are `accessibilityRole=\"text\"`, never buttons" — `FocusCurrentTaskCard.parts.tsx:220-227`), and #408's own issue body ships all 4 states with no delete control. This was decided upstream when #408 was built, not something #466 can add without extending an already-shipped, storied component (violates "no un-storied UI").                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| D6  | The evidence-plan "change" sheet reuses the **authoring** (multi-select, default) mode of `EvidenceTypePicker` inside `AnimatedSheet`, mirroring `NewGoalWizard`'s build-step sheet verbatim, including its "can't deselect the last remaining type" guard.                                                                                                                                                                                             | Build a bespoke sheet for Focus Mode                                                                                                                                                                                                          | `NewGoalWizard.tsx:734-758` (`AnimatedSheet` + `EvidenceTypePicker` default mode + `handleToggleEvidence` guard at `NewGoalWizard.tsx:425-441`) is the only existing integration of the authoring picker as a sheet; `updateStep(id, { plannedEvidenceTypes })` (`src/db/queries.ts:733-781`) is the existing mutation for changing an already-created step's plan.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| D7  | The evidence-**capture** sheet (`onAddEvidence()` with no type) reuses `EvidenceTypePicker`'s `mode="capture"` single-select sheet; selecting a type calls the exact `navigation.navigate(EVIDENCE_ROUTE_MAP[type], { goalId, stepId })` FocusModeScreen already does today for `handleSelectEvidenceType`/`handleQuickEvidence`. `onAddEvidence(type)` (a specific type) skips the sheet and navigates directly.                                       | Route every "Add evidence" tap straight to a type-specific capture screen with no picker                                                                                                                                                      | Matches the card's own contract doc: "Pass a `type` to capture that specific planned type... call with no argument to open the capture chooser with no type pre-implied" (`FocusCurrentTaskCard.types.ts:50-54`). `NewGoalWizard`'s step-2 usage (`NewGoalWizard.tsx:716-732`) is the only existing `mode="capture"` integration to mirror for `visible`/`onSelectType`/`onClose`/`restoreFocusRef` plumbing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| D8  | `src/hooks/useFocusModePrefs.ts` (the `timelineHidden` preference) is deleted — its only caller (`FocusModeScreen`'s eye-toggle) is removed in this slice and it has no other consumer.                                                                                                                                                                                                                                                                 | Leave the hook in place as unused                                                                                                                                                                                                             | Grep confirms `FocusModeScreen.tsx` is its only importer; leaving dead, untested preference-storage code around fails the "don't leave dead code" bar with no offsetting risk.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

## Affected Areas

- `apps/native-rd/src/screens/FocusModeScreen/FocusModeScreen.tsx`: near-total rewrite — drop `CardCarousel`/`MiniTimeline`/`ProgressDots`/`StepCard`/`EvidenceDrawer`/`ModeIndicator`/eye-toggle imports and JSX; resolve a single `currentStepId` (D1); mount `FocusProgressStrip` + `FocusCurrentTaskCard`; wire `pauseStep`/`resumeStep`/`uncompleteStep`; wire the two `EvidenceTypePicker` sheets (D6/D7); drop `EvidenceDrawer`/FAB/`ConfirmDeleteModal`/evidence-viewer wiring that has no replacement affordance (D5) except where still load-bearing (see Testing Strategy note on `useEvidenceViewer`).
- `apps/native-rd/src/screens/FocusModeScreen/FocusModeScreen.styles.ts`: strip styles that only served removed components (carousel section spacing tied to `EvidenceDrawer`'s `DRAWER_CLOSED_HEIGHT`, etc.); add minimal layout styles for the progress-strip + current-task-card stack.
- `apps/native-rd/src/screens/FocusModeScreen/__tests__/FocusModeScreen.test.tsx`: near-total rewrite per the issue's own call-out ("needs a near-total rewrite"). Keep the #292/#337 next-actionable-step regression _cases_ (leaf-under-parent, invite, orphan promotion, completed-parent/pending-child) translated to assert against the single rendered card rather than carousel index/position text. Drop tests solely about `CardCarousel`/`MiniTimeline`/`ProgressDots`/`EvidenceDrawer`/FAB/eye-toggle/carousel-navigation/evidence-delete/auto-advance/goal-card-via-carousel (all either removed or explicitly #467's scope).
- `apps/native-rd/src/hooks/useFocusModePrefs.ts`: delete (D8).
- `apps/native-rd/src/db/queries.ts`: `canCompleteStep`'s `plannedTypes === null` branch (`:325`) now defaults to `["text"]` instead of `return true`, so the DB gate agrees with the card's gate (D4). Update the function's doc comment (`:309-311`, currently "If null, no step evidence is required") to match. `src/db/__tests__/` coverage for the null case must be updated in the same commit.
- No changes expected to `src/components/FocusCurrentTaskCard/*`, `src/components/EvidenceTypePicker/*`, `src/components/FocusProgressStrip/*`, or `src/navigation/types.ts` — all consumed as-shipped.

## Implementation Plan

### Step 1: Resolve a single current step and mount the card shell

**Files**: `FocusModeScreen.tsx`
**Commit**: `refactor(focus-mode): mount FocusCurrentTaskCard as the single body, drop CardCarousel/MiniTimeline/ProgressDots`
**Changes**:

- [x] Replace `currentCardIndex` state with `currentStepId: string | null`, initialized on mount via `resolveNextActionableStep(stepRows)` (reuse the existing `findFirstPendingLeafIndex` adapter, resolved to an id instead of an index) — preserves #292/#337 behavior (D1).
- [x] Derive the current step's full view model (title, status, `plannedEvidenceTypes`, `capturedEvidence`, `afterStep`/`waitingOn`/`dueDate` via `resolveStepDependencyBand`, formatted the same way `TimelineJourneyScreen.tsx:106-129` does) from `stepRows`/`allStepEvidenceRows`.
- [x] Render `FocusCurrentTaskCard` with `status: "in-progress" | "paused" | "completed"` mapped from `StepStatus` (never `"all-complete"` — D3).
- [x] Remove `CardCarousel`, `MiniTimeline`, `ProgressDots`, `StepCard`, `GoalEvidenceCard` imports/usages and the `stepRootIds`/`uiSteps`/`stepsWithEvidence`/`partsByParentId`/`partInfoByChildId`/`timelineSteps`/`dotSteps` derivations that only fed them.
- [x] Remove the `handleIndexChange`/`handleOpenPart`/`isGoalCard`/snap-to-goal-card effect; keep the mount-time snap effect, retargeted to set `currentStepId`.

### Step 2: Progress chip + header cleanup

**Files**: `FocusModeScreen.tsx`, `FocusModeScreen.styles.ts`
**Commit**: `refactor(focus-mode): replace dual indicators with FocusProgressStrip, drop eye-toggle and ModeIndicator`
**Changes**:

- [x] Mount `FocusProgressStrip` with `doneCount`/`totalCount` from `stepRows`, `onPress={handleTimelineTap}` (unchanged body — D2).
- [x] Remove the header eye/timeline-toggle `IconButton`, `useFocusModePrefs` import/usage, and `ModeIndicator`.
- [x] Keep the edit-pencil `IconButton` (`handleEditPress`, unchanged) and `ScreenSubHeader` title.
- [x] Strip corresponding dead styles (`carouselSection`'s `DRAWER_CLOSED_HEIGHT` padding, etc.) from `FocusModeScreen.styles.ts`; add whatever minimal layout the strip + card stack need.

### Step 3: Wire pause / resume / reopen

**Files**: `FocusModeScreen.tsx`
**Commit**: `feat(focus-mode): wire Set aside / Pick back up / Reopen via pauseStep/resumeStep/uncompleteStep`
**Changes**:

- [x] `onPause` → `pauseStep(currentStepId)`.
- [x] `onPickUp` → `resumeStep(currentStepId)`.
- [x] `onReopen` → `uncompleteStep(currentStepId)` (existing helper, already used for the completed→pending toggle today).
- [x] Wrap each in the same try/catch + `reportError`/toast pattern the existing `handleToggleStep` uses, so a write failure surfaces the same way completion failures do today.

### Step 4: Wire the evidence-plan and evidence-capture sheets

**Files**: `FocusModeScreen.tsx`
**Commit**: `feat(focus-mode): wire EvidenceTypePicker plan-editor and capture-type sheets`
**Changes**:

- [x] `onChangeEvidencePlan` opens an `AnimatedSheet` + `EvidenceTypePicker` (authoring mode) sheet seeded with the current step's `plannedEvidenceTypes`; `onToggleType` calls `updateStep(currentStepId, { plannedEvidenceTypes: next })`, including the "can't deselect the last remaining type" guard (mirror `NewGoalWizard.tsx:425-441`) (D6).
- [x] `onAddEvidence(type?)`: with a `type`, navigate directly via `EVIDENCE_ROUTE_MAP` (reuse today's `handleQuickEvidence` body). With no `type`, open the `EvidenceTypePicker` `mode="capture"` sheet; `onSelectType` closes the sheet and navigates via `EVIDENCE_ROUTE_MAP` (reuse today's `handleSelectEvidenceType` body) (D7).
- [x] Remove `EvidenceDrawer`, the add-evidence FAB fan-out (`isFABMenuOpen`, `handleToggleFABMenu`), `ConfirmDeleteModal`, `handleRequestDeleteEvidence`/`handleConfirmDeleteEvidence`/`handleViewEvidence`, and the `useEvidenceViewer` wiring that only served the drawer (D5). Confirm no other code path in this screen still needs `viewEvidence`/`viewerModals` before deleting.

### Step 5: Test rewrite

**Files**: `FocusModeScreen/__tests__/FocusModeScreen.test.tsx`
**Commit**: `test(focus-mode): rewrite FocusModeScreen suite for the single-current-task model`
**Changes**:

- [x] Rewrite render assertions around the single `FocusCurrentTaskCard` (title, status pill, planned box, captured rail, footer CTAs) instead of carousel position text / `StepCard` checkbox roles.
- [x] Port the #292/#337 sub-step resolution suite (`LEAF_STEPS`, `INVITE_STEPS`, `INTERLEAVED_STEPS`, `PARTIAL_LEAF_STEPS`, `ORPHAN_STEPS`, `COMPLETED_PARENT_PENDING_CHILD_STEPS`) to assert the resolved current step's _id/title_, not `MiniTimeline` node widths or carousel `stepIndex`/`totalSteps` text.
- [x] Add coverage for: pause → paused card, no navigation; resume → in-progress card; reopen → in-progress card; evidence-plan sheet toggling calling `updateStep`; capture-sheet type selection navigating with `{ goalId, stepId }`; direct `Add {type}` navigating with no sheet; `canCompleteStep`/`completeStep` gating unchanged.
- [x] Drop tests for: `CardCarousel` swipe navigation, `MiniTimeline`/`ProgressDots` rendering, the eye-toggle, `EvidenceDrawer`/FAB open/close, evidence delete/confirm/cancel/toast, `GoalEvidenceCard`/goal-card-via-carousel, auto-navigate-to-CompletionFlow guards (all either removed or #467-owned). Before deleting each, confirm no other suite (e.g. `FocusCurrentTaskCard.test.tsx`, `EvidenceTypePicker.test.tsx`, `TimelineJourneyScreen.test.tsx`) already covers the underlying behavior at the component level — per `AGENTS.md`'s "grep before deleting a test" rule.
- [x] Update the `jest.mock("../../../db", ...)` block: it already includes `StepStatus: { pending, completed }` without `paused` — add `paused: "paused"` and the mocked `pauseStep`/`resumeStep`/`updateStep`.

### Step 6: Align the null-evidence-plan contract (D4)

**Files**: `src/db/queries.ts`, `src/db/__tests__/` (whichever suite covers `canCompleteStep`), `FocusModeScreen.tsx`
**Commit**: `fix(evidence): treat an unset evidence plan as ["text"] so the DB gate matches the card`
**Changes**:

- [x] In `canCompleteStep` (`src/db/queries.ts:317-331`), replace `if (plannedTypes === null) return true;` with a `["text"]` default so a null plan requires one text evidence item, matching `FocusCurrentTaskCard`'s gate.
- [x] Update the doc comment at `:309-311` ("If null, no step evidence is required") — it now states the opposite.
- [x] Apply the same `["text"]` default where the screen builds the card's `plannedEvidenceTypes` prop, so display and gate never diverge.
- [x] Update existing `canCompleteStep` null-case tests; add a regression test that a null-plan step is **not** completable with zero evidence and **is** completable once a text item exists.
- [x] Keep this as its own commit — it changes completion behavior for existing steps created via `EditGoalView`'s default add-step flow, and must be callable out in the PR body.

## Testing Strategy

- [x] Unit tests for `FocusModeScreen` (Jest 30, `@testing-library/react-native` v13) per Step 5 above.
- [x] Test file path stays `src/screens/FocusModeScreen/__tests__/FocusModeScreen.test.tsx` (mirrors existing convention).
- [x] Use `test.each` for the repeated pause/resume/reopen-call-shape assertions.
- [x] Manual testing: `npx expo run:ios` — open a goal with (a) a plain pending step, (b) a step with sub-steps (invite state), (c) a paused step reached by pausing it live, (d) a completed step reached by completing it live, (e) a step created via `EditGoalView`'s default add-step flow so `plannedEvidenceTypes` is `null` — per D4 it should now invite one text item and reveal "Mark complete" only after one is captured.

## Not in Scope

| Item                                                                                            | Reason                                                                                                                                                                                                     | Follow-up              |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Timeline-node-tap → return to that specific step                                                | Explicitly #467's scope ("tapping a Timeline node returns to Focus on that step")                                                                                                                          | #467                   |
| Auto-advance to the next actionable step after complete/pause                                   | Explicitly #467's scope ("Keep auto-advance-on-complete as the happy path")                                                                                                                                | #467                   |
| All-paused screen state ("Nothing in progress" / `FocusParkedState`)                            | Explicitly #467's scope; also unreachable in #466 since there's no cross-step navigation left to land a user on a _different_ paused step                                                                  | #467                   |
| All-done / trophy state (`FocusCurrentTaskCard` `all-complete`) + "Design your badge →" handoff | Explicitly #467's scope; `GoalEvidenceCard` removed instead of retained as a stand-in (D3)                                                                                                                 | #467                   |
| Goal-level evidence viewing/capture (the old "goal card" reached by swiping past all steps)     | Its only entry point (`CardCarousel`'s goal card) is removed; no replacement surface specified anywhere in #466/#467/#408/#409. Rows, queries, and mutations are left intact — only the UI route goes (D9) | #523                   |
| Evidence deletion from Focus Mode                                                               | `FocusCurrentTaskCard`'s captured rail is deliberately read-only, decided upstream in #408 (D5)                                                                                                            | none — settled by #408 |
| Completing the last sub-step returning focus to its parent                                      | Needs no new resolver logic — `resolveNextActionableStep` already returns the parent as `{ kind: "invite" }` — but it can never fire while D1 holds `currentStepId` fixed. Rides on #467's re-resolve      | #467                   |

## Handoff to #467 — confirmed on device, 2026-07-26

Slice 1/2 was run on the simulator against a real 3-step goal. Two behaviors are
working as designed here and are slice 2/2's to change; **#467's issue body has
been updated with all of this**, so that issue is the single place to pick the
work up from.

1. **No progression on completion.** Completing step 2 of 3 leaves you on step
   2's `completed` card with "Reopen this step" — exactly D1. #467 replaces the
   resolve-once-and-hold with a re-resolve after each state change.
2. **Sub-step → parent.** Finishing every sub-step of a parent should land you
   back on the parent to close it out. The resolver already does this (the
   `focuses the parent itself once all its children are done` case in
   `FocusModeScreen.test.tsx` passes today); it is dormant only because of D1.
   #467 owes the re-resolve, an explicit "completing the _last_ sub-step lands
   on the parent" test, and a call on whether that child→parent jump warrants
   its own a11y announcement — it is a bigger context shift than moving between
   siblings.

Also fixed during device testing, outside the original plan: `FocusProgressStrip`
shipped (#450) with no padding of its own, so at its first real mount the
done-count clipped left, "See all steps ›" clipped right, and the bar ran edge to
edge. The canonical `App Shell.dc.html` puts `padding:13px 18px 0` on the strip's
own wrapper (the bar is not full-bleed), so the fix went into the component
rather than the caller — a caller cannot inset the track from outside.

## Discovery Log

- [2026-07-26] **Commit granularity deviated from the plan's 6 steps to 3.** Steps 1–5
  could not each land green: `FocusCurrentTaskCardProps` is a discriminated union
  whose in-progress variant requires `onPause`, `onChangeEvidencePlan`,
  `onAddEvidence` and `onMarkComplete` all at once, so mounting the card (step 1)
  forces steps 3–4's wiring in the same commit; and the old 1,746-line test suite
  is built entirely on the removed chrome, so the screen rewrite and the test
  rewrite are red apart. Shipped as: the D4 contract fix (independent, standalone),
  then the screen + styles + hook deletion + test rewrite as one coherent
  "replace the Focus Mode body" commit. Each commit type-checks, lints, and passes
  the full suite on its own.
- [2026-07-26] **D10 added** — the plan did not say what to render when
  `resolveNextActionableStep` returns `none` (every step completed or paused).
  Falling through to an empty body would have been a blank screen. Resolved by
  falling back to the first paused step, then the last step, so the shipped
  `paused` / `completed` card variants carry those states until #467 lands the
  dedicated all-paused and all-done screens. No new UI invented.
- [2026-07-26] **`ReportContext`'s `focus.mode` kinds changed.** `"evidence-delete"`
  became unreachable (the delete path is gone, D5) and the new plan-editor needed a
  facet, so the union is now `"enter" | "exit" | "step-toggle" | "evidence-plan"`.
  All four step state-flips report as `step-toggle`, matching the single `"toggle"`
  breadcrumb the DB mutations already emit.
- [2026-07-26] **Two extra dead references removed with `useFocusModePrefs`**: its
  `SCOPE_TO_AREA` entry in `services/sentry-report.ts` (plus that entry's test) and
  a stale mention in `useUserSettingsRow.ts`'s comment.
- [2026-07-26] **Two i18n keys added** (`focusMode:evidencePlanSheet.title` /
  `.typesLabel`) for the plan-editor sheet chrome — en + de written by hand, pseudo
  regenerated via `bun run gen:pseudo`. Unrelated pseudo padding drift in
  `badgeDetail` / `completion` / `editGoal` that the generator also rewrote was
  reverted to keep the diff on-topic.
