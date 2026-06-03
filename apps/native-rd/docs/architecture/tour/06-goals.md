# Slice 6 — Goals domain

**Status:** not-started
**Drafted:** —
**Reviewed:** —

## Scope

Tight scope: the core goal-tracking UI and its immediate data layer.

**In scope:**

- `src/screens/GoalsScreen`
- `src/screens/NewGoalModal`
- `src/screens/ConfirmDeleteModal`
- `src/components/GoalCard`
- `src/components/StepCard`, `src/components/StepList`
- `src/components/FAB`, `src/components/FABMenu`

**Deferred:**

- `CompletionFlowScreen` — overlaps badge issuance (slice 9, capstone)
- `EditModeScreen`, `FocusModeScreen` — separate UX modes, revisited after this slice
- `GoalEvidenceCard` — overlaps evidence rendering (slice 7)
- `TimelineJourneyScreen` — primarily evidence-timeline (slice 7)
- `src/navigation/GoalsStack` — reviewed alongside other stacks in slice 2 (navigation)
- Goal-related queries in `src/db/queries.ts` and the relevant `src/db/schema.ts` tables — reviewed alongside the rest of Evolu in slice 3 (data layer)

## File map

_(filled in during prep)_

## Mental model

_(filled in after walkthrough)_

## RN concepts encountered

_(filled in during walkthrough)_

## Lens scan

### type-safety

### RN/Expo idiom

### perf hot paths

### a11y / ND-a11y

### test coverage gaps

## Findings

- _(none yet)_

## Open questions

- _(none yet)_
