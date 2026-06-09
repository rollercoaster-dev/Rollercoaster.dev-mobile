# Phase B Stage 0 Baseline Record

**Date:** 2026-06-09
**Status:** Seeded from the [docs-anchoring review session](./2026-06-09-step-docs-anchoring-review-handoff.md); covers the Stage 0 "baseline record" deliverable. The other Stage 0 deliverables (evidence format, guardrail checklist, medium choices for Stage 1) are not in this document.
**Source of truth:** read directly from code on 2026-06-09. Every claim has a file ref; if a ref drifts, re-verify before relying on it.

This is the record of what the current Step can and cannot hold, against which
every Phase B prototype is compared
([prototype plan, Stage 0](./phase-b-step-model-prototypes.md#stage-0-baseline)).

## The Step today

`src/db/schema.ts:107-115`:

| Field                  | Type                         | Notes                                                          |
| ---------------------- | ---------------------------- | -------------------------------------------------------------- |
| `id`                   | `StepId` (ULID)              |                                                                |
| `goalId`               | `GoalId`                     | Steps belong directly to a Goal. No parent-step reference.     |
| `title`                | `NonEmptyString1000`         |                                                                |
| `ordinal`              | `nullOr(Int)`                | Flat ordering within the goal; user-reorderable (see C-order). |
| `status`               | `'pending' \| 'completed'`   | `StepStatus` enum, `schema.ts:43-46`.                          |
| `completedAt`          | `nullOr(DateIso)`            | The only date on a Step.                                       |
| `plannedEvidenceTypes` | `nullOr(NonEmptyString1000)` | JSON `string[]` of `EvidenceType`; null = no requirement.      |

Goal (`schema.ts:89-99`) carries `status` (`active`/`completed`), `completedAt`,
`description`, icon/color/sortOrder, and badge design. No date, deadline, or
recurrence fields exist anywhere on Step or Goal.

## Evidence today

- Evidence attaches to **Goal XOR Step** (`schema.ts:124-132`; exactly one of
  `goalId`/`stepId`, app-enforced).
- Six types: `photo, text, voice_memo, video, link, file` (`schema.ts:56-63`).
- Inline text evidence stores its content in the `uri` field behind
  `TEXT_EVIDENCE_PREFIX = "content:text;"` (`schema.ts:66`), plus a
  `description` caption.
- **Evidence is not completion-gated.** From focus mode, the FAB menu attaches
  any evidence type to the currently focused step at any time
  (`src/screens/FocusModeScreen/FocusModeScreen.tsx:396-432`). The completion
  flow is a second entry point (`CompletionFlowScreen.tsx:86`), not the only
  one. CONTEXT.md's "evidence-at-completion — the current evidence shape"
  describes the channel's typical semantic register (proof-a-step-is-done),
  not a mechanical constraint.
- Capture screens: `CaptureTextNote` (free-form note ≤1000 chars + caption,
  takes `{ goalId, stepId }`), `CapturePhoto`, `VoiceMemoScreen`,
  `CaptureVideoScreen`, `CaptureLinkScreen`, `CaptureFile` — all registered in
  `src/navigation/GoalsStack.tsx:36-41`.

## Task-view contract today

The "one next step per active goal" promise has two living implementations:

- **Goals screen:** every goal card surfaces the title of its first pending
  step (`src/screens/GoalsScreen/GoalsScreen.tsx:44`, rendered by
  `src/components/GoalCard/GoalCard.tsx`).
- **Focus mode:** snaps to the first pending step on initial load
  (`src/screens/FocusModeScreen/FocusModeScreen.tsx:235-241`).

There is no dedicated cross-goal task view screen; the Goals screen list is
the closest surface.

## Per-letter baseline (ADR-0010 crosswalk)

| Letter          | Exists today?            | Evidence                                                                                                                                                                                                                                                                                                     |
| --------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **A**           | No                       | `step` has only `goalId`; no parent-step field, no sub-step concept anywhere in `src/`.                                                                                                                                                                                                                      |
| **B-soft**      | No                       | No marker/placement fields; the only Step date is `completedAt`.                                                                                                                                                                                                                                             |
| **B-deadlines** | No                       | No deadline, due-date, or recurrence identifiers anywhere in `src/`.                                                                                                                                                                                                                                         |
| **C-order**     | Partially — flat form    | User-authored ordering ships today: `ordinal` (`schema.ts:111`), queries order by it (`src/db/queries.ts:75,343`), drag-reorder in edit mode via `reorderSteps` (`src/screens/EditModeScreen/EditModeScreen.tsx:207-216`). Absent: dependency information, sequence-as-syllabus framing.                     |
| **C-waiting**   | No                       | `StepStatus` is exactly `pending \| completed` (`schema.ts:43-46`); waiting collapses into `pending`.                                                                                                                                                                                                        |
| **D**           | Only as evidence         | Free-form per-step text exists via `CaptureTextNote` → evidence row, attachable any time. It has evidence semantics: lives in the evidence table, rendered where evidence renders, no re-entry prominence. See the [D-vs-evidence register row](./phase-b-step-model-prototypes.md#open-questions-register). |
| **E**           | No (persisted); UI hints | DB has two states. The UI layer already derives a third: `in-progress` from current selection (`src/types/steps.ts`), and `TimelineStep` renders `pending` with a `"locked"` badge variant (`src/components/TimelineStep/TimelineStep.tsx:27-36`) — presentation vocabulary to revisit under E.              |
| **F**           | Only as evidence capture | The six-modality suite is reachable mid-work from focus mode without leaving the goal. Everything captured lands as an evidence record; captured _structure_ (a new sub-step) has nowhere to land. Friction under real mid-work load is unmeasured.                                                          |
| **G**           | No                       | No review concept; `goal` has no review field, no review surface in `src/screens/`.                                                                                                                                                                                                                          |
| **H**           | No                       | No misfire/learning/falsification concept; steps soft-delete only (Evolu `isDeleted`).                                                                                                                                                                                                                       |

## Vocabulary boundary in today's terms

`CONTEXT.md` distinguishes D (context), F (capture), and evidence. In today's
app all three collapse into one channel: the evidence record. The distinctions
survive only as _semantic and retrieval_ distinctions, not storage ones:

- **Evidence** — record of what happened; retrieved when reviewing a
  goal/step's history.
- **D context** — note that shapes what happens next; would need retrieval at
  re-entry (prominence when resuming a step), which the evidence channel does
  not provide.
- **F capture** — landing place for discovered _structure_; would need the
  captured thing to become a Step/sub-step, which the evidence channel cannot
  do.

So the honest baseline framing is: per-step context exists today **only as
evidence, with evidence semantics**. D and F prototypes start from this
channel, not from zero.
