# Slice 1 — Goals domain

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
- `src/navigation/GoalsStack`
- Goal-related queries in `src/db/queries.ts` and the relevant `src/db/schema.ts` tables

**Deferred:**

- `CompletionFlowScreen` — overlaps badge issuance (slice 3)
- `EditModeScreen`, `FocusModeScreen` — separate UX modes, revisited after slice 1
- `GoalEvidenceCard` — overlaps evidence rendering (slice 2)
- `TimelineJourneyScreen` — primarily evidence-timeline, slice 2

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
