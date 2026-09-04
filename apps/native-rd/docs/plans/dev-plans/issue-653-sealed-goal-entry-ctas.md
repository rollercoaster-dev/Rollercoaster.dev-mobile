# Development Plan: Issue #653

## Issue Summary

**Title**: Sealed goal: entry CTAs still say "Finish & design badge" and FinishLine previews goal.design
**Type**: bug
**Complexity**: SMALL
**Estimated Lines**: ~180 lines (incl. tests + i18n)

## Intent Verification

- [ ] On `TimelineJourneyScreen`, a goal with `status === completed` and a badge row renders FinishLine's CTA title as the sealed "View badge" copy, not "Finish & design badge".
- [ ] On `FocusModeScreen`'s all-complete card, the same sealed condition renders "View badge" instead of "Design your badge".
- [ ] FinishLine's badge preview on `TimelineJourneyScreen` renders `badge.design` when a badge row exists, falling back to `goal.design`, falling back to the synthesized default — never a monogram when a real badge design exists.
- [ ] `src/i18n/__tests__/locale-parity.test.ts` passes with the new keys present in en, de, and pseudo.

## Dependencies

| Issue | Title                                        | Status    | Type      |
| ----- | -------------------------------------------- | --------- | --------- |
| #652  | Route sealed goal to read-only reveal (#563) | ✅ Merged | Prior art |

**Status**: ✅ All dependencies met.

## Objective

Close out the two follow-up items #652 deliberately deferred: sealed-goal entry CTAs still read "Finish & design badge" instead of "View badge", and `TimelineJourneyScreen` seeds FinishLine's preview from `goal.design` instead of `badge.design` first.

## Research Findings

- **TimelineJourneyScreen** (`src/screens/TimelineJourneyScreen/TimelineJourneyScreen.tsx`): queries `goalsQuery` for `goal` but does **not** currently query `badgeByGoalQuery` at all. It passes `parseBadgeDesign(goal.design)` straight into `FinishLine`'s `badgeDesign` prop (line ~291) — the exact bug in item 2. `FinishLine` itself (`src/components/FinishLine/FinishLine.tsx`) is pure/presentational: it renders whatever `badgeDesign` it's given and has no DB access, so the seed-order fix belongs in the screen, not the component.
- **FocusModeScreen** (`src/screens/FocusModeScreen/FocusModeScreen.tsx`): also queries only `goalsQuery`, `stepsByGoalQuery`, `stepEvidenceByGoalQuery` — no badge query. The all-complete CTA lives inside `FocusCurrentTaskCard`'s `AllCompleteView` (`src/components/FocusCurrentTaskCard/FocusCurrentTaskCard.tsx` ~372-406), a pure discriminated-union component; `FocusModeScreen`'s `NoActionableBody` (~107-141) is the call site that renders it with `status="all-complete"`.
- **`badgeByGoalQuery`** is defined in `src/db/queries.ts:1423` (`limit(1)` on non-deleted rows by `goalId`) and re-exported from `src/db/index.ts`. `CompletionFlowScreen` is the existing consumer: `const badgeRows = useQuery(badgeByGoalQuery(goalId as GoalId)); const badgeRow = badgeRows[0] ?? null;`.
- **"Sealed" definition** (`CompletionFlowScreen.tsx` ~112-115): `sealedOnEntry = goal?.status === GoalStatus.completed && badgeRow !== null`, latched via `useState(() => ...)` so it's evaluated once on entry. For this issue, no latching is needed (`TimelineJourneyScreen`/`FocusModeScreen` don't have a multi-stage flow to protect from), so the same predicate is computed inline as a plain `const`.
- **Preview seed order** (`CompletionFlowScreen.tsx` ~127-140): `parseBadgeDesign(badgeDesignJson) ?? parseBadgeDesign(goalDesignJson) ?? createDefaultBadgeDesign(goalTitle, goalColor)`. `createDefaultBadgeDesign` and `parseBadgeDesign` both live in `src/badges/types.ts` and are already imported in `TimelineJourneyScreen.tsx` (only `parseBadgeDesign` currently); `goal.color` is read the same way elsewhere in the codebase.
- **Test mocking pattern**: both `TimelineJourneyScreen.test.tsx` and `FocusModeScreen.test.tsx` `jest.mock("../../../db", ...)` with string-tagged query factories (e.g. `stepsByGoalQuery: jest.fn((id) => \`stepsByGoalQuery-${id}\`)`) and a shared `mockUseQuery.mockImplementation`in a local`setupQueries()`helper that branches on the query string prefix.`badgeByGoalQuery`and`GoalStatus`are **not yet mocked in either file** — both need adding to the`db`mock and to`setupQueries`'s branch list (default `[]`for no badge row).`FinishLine.test.tsx`renders the component directly with props (no DB mocking) since`FinishLine`takes`badgeDesign` as a prop, not a query.
- **Existing "View badge" precedent**: `completion:finish.reveal.viewBadgeLabel` = "View badge" already exists (`src/i18n/resources/en/completion.json:36`, used by `FinishRevealStage`/`finishStageCopy.ts`). New keys here go in `timelineJourney` and `focusMode` namespaces (matching where the existing CTA copy already lives) rather than reusing the `completion` namespace across screens.

## Decisions

| ID  | Decision                                                                                                  | Alternatives Considered                                              | Rationale                                                                                                                                                   |
| --- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Compute `sealed`/`hasBadge` inline per-render in both screens (no `useState` latch)                       | Mirror `CompletionFlowScreen`'s `sealedOnEntry` latch                | Both screens re-render on every relevant query change with no multi-stage flow to protect; a plain derived `const` is simpler and always current.           |
| D2  | Add a required `hasBadge: boolean` prop to `FocusAllCompleteCardProps` rather than a new `status` variant | New `"sealed-complete"` status                                       | Keeps the discriminated union's four states intact; only the CTA copy differs, not the card shape — a boolean prop is proportionate.                        |
| D3  | Add a required `sealed: boolean` prop to `FinishLineProps`                                                | Compute sealed-ness inside `FinishLine` from a `badgeExists` boolean | `FinishLine` is intentionally DB-agnostic; the caller already has `goal.status` and the badge row, so it passes the derived boolean rather than raw fields. |

## Affected Areas

- `src/screens/TimelineJourneyScreen/TimelineJourneyScreen.tsx`: query `badgeByGoalQuery`, derive `sealed`, fix preview seed order (badge.design → goal.design → default), pass `sealed` + corrected `badgeDesign` to `FinishLine`.
- `src/components/FinishLine/FinishLine.tsx`: add `sealed` prop; swap `ctaTitle`/`ctaA11yLabel` for sealed-state copy when true.
- `src/components/FinishLine/__tests__/FinishLine.test.tsx`: add sealed-state cases.
- `src/screens/FocusModeScreen/FocusModeScreen.tsx`: query `badgeByGoalQuery`, derive `hasBadge`, thread through `NoActionableBody` into `FocusCurrentTaskCard`.
- `src/components/FocusCurrentTaskCard/FocusCurrentTaskCard.types.ts`: add `hasBadge: boolean` to `FocusAllCompleteCardProps`.
- `src/components/FocusCurrentTaskCard/FocusCurrentTaskCard.tsx`: `AllCompleteView` swaps CTA copy when `hasBadge`.
- `src/components/FocusCurrentTaskCard/FocusCurrentTaskCard.stories.tsx`, `src/components/FocusCurrentTaskCard/__tests__/FocusCurrentTaskCard.test.tsx`: update call sites for the new required prop.
- `src/screens/TimelineJourneyScreen/__tests__/TimelineJourneyScreen.test.tsx`, `src/screens/FocusModeScreen/__tests__/FocusModeScreen.test.tsx`: mock `badgeByGoalQuery`/`GoalStatus`; add sealed-goal cases.
- `src/i18n/resources/{en,de,pseudo}/timelineJourney.json`: add `finishLine.sealedCtaTitle`, `finishLine.sealedCtaA11yLabel`.
- `src/i18n/resources/{en,de,pseudo}/focusMode.json`: add `currentTask.allComplete.viewBadgeCta`, `currentTask.allComplete.viewBadgeA11y`.

## Implementation Plan

### Step 1: FinishLine sealed-state copy + preview seed fix

**Files**: `src/components/FinishLine/FinishLine.tsx`, `src/screens/TimelineJourneyScreen/TimelineJourneyScreen.tsx`, `src/i18n/resources/{en,de,pseudo}/timelineJourney.json`
**Commit**: `fix(native-rd): seal TimelineJourney's finish CTA copy and badge preview`
**Changes**:

- [ ] `TimelineJourneyScreen.tsx`: import `badgeByGoalQuery`, `GoalStatus`, `createDefaultBadgeDesign`; query the badge row; compute `sealed = goal.status === GoalStatus.completed && badgeRow !== null`; compute `seededDesign` in badge → goal → default order; pass `sealed` and the corrected design to `FinishLine`.
- [ ] `FinishLine.tsx`: add `sealed: boolean` prop; when true, render `finishLine.sealedCtaTitle`/`sealedCtaA11yLabel` instead of `ctaTitle`/`ctaA11yLabel`.
- [ ] Add `sealedCtaTitle: "View badge"` and `sealedCtaA11yLabel: "View your badge"` (or equivalent) to en/de/pseudo `timelineJourney.json` under `finishLine`.

### Step 2: FocusModeScreen sealed-state copy

**Files**: `src/screens/FocusModeScreen/FocusModeScreen.tsx`, `src/components/FocusCurrentTaskCard/FocusCurrentTaskCard.types.ts`, `src/components/FocusCurrentTaskCard/FocusCurrentTaskCard.tsx`, `src/components/FocusCurrentTaskCard/FocusCurrentTaskCard.stories.tsx`, `src/i18n/resources/{en,de,pseudo}/focusMode.json`
**Commit**: `fix(native-rd): seal Focus Mode's all-complete CTA copy for a badged goal`
**Changes**:

- [ ] `FocusAllCompleteCardProps` gains required `hasBadge: boolean`.
- [ ] `AllCompleteView` renders `currentTask.allComplete.viewBadgeCta`/`viewBadgeA11y` when `hasBadge`, else the existing `designBadgeCta`/`designBadgeA11y`.
- [ ] `FocusModeScreen.tsx`: import `badgeByGoalQuery`; query it; thread `hasBadge = goal.status === GoalStatus.completed && badgeRow !== null` through `NoActionableBody` into the `FocusCurrentTaskCard` all-complete render.
- [ ] Update `FocusCurrentTaskCard.stories.tsx`'s all-complete story and its own test's `renderCard` default to pass `hasBadge` (both `true` and `false` variants where useful).
- [ ] Add `viewBadgeCta`/`viewBadgeA11y` to en/de/pseudo `focusMode.json` under `currentTask.allComplete`.

### Step 3: Tests for both entry CTAs on a completed, badged goal

**Files**: `src/screens/TimelineJourneyScreen/__tests__/TimelineJourneyScreen.test.tsx`, `src/screens/FocusModeScreen/__tests__/FocusModeScreen.test.tsx`, `src/components/FinishLine/__tests__/FinishLine.test.tsx`, `src/components/FocusCurrentTaskCard/__tests__/FocusCurrentTaskCard.test.tsx`
**Commit**: `test(native-rd): cover sealed-goal entry CTAs and FinishLine's badge-first preview`
**Changes**:

- [ ] `TimelineJourneyScreen.test.tsx`: mock `badgeByGoalQuery`/`GoalStatus` in the `db` mock, extend `setupQueries` with a `badgeRow` param; add a case with `GOAL.status = "completed"` + a badge row asserting the sealed CTA text renders and the badge preview uses `badge.design` over `goal.design`.
- [ ] `FocusModeScreen.test.tsx`: same mock additions; add a case with all steps complete + a badge row asserting `focus-current-task-design-badge`'s label is the sealed copy.
- [ ] `FinishLine.test.tsx`: add `sealed={true}`/`sealed={false}` cases asserting the rendered CTA title/a11y label.
- [ ] `FocusCurrentTaskCard.test.tsx`: add `hasBadge={true}` case asserting sealed CTA copy alongside the existing `hasBadge={false}` (default) case.
- [ ] Every new assertion pins observable copy/testID output that would fail if the sealed branch regressed (no assertions on absence of strings that appear nowhere else).

## Testing Strategy

- [ ] Unit tests only (Jest 30, `@testing-library/react-native` v13) — no new integration surface.
- [ ] `bun run test -- --testPathPattern "TimelineJourneyScreen|FocusModeScreen|FinishLine|FocusCurrentTaskCard"` locally.
- [ ] `bun run test -- src/i18n/__tests__/locale-parity.test.ts` after adding keys.
- [ ] Manual: complete a goal with a badge already baked, open Timeline and Focus Mode, confirm both CTAs read "View badge" and the Timeline preview shows the real badge, not a monogram.

## Not in Scope

| Item                                                                             | Reason                                                           | Follow-up |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------- |
| Changing FinishLine's subtitle copy (`ctaSubtitleDesigned`) for the sealed state | Issue's decided scope is CTA title copy only                     | none      |
| Gating/hiding the CTA instead of relabeling it                                   | Explicitly decided against (issue #653 body + task instructions) | none      |
| `BadgeDetail`'s own design-seed order                                            | Already correct per #652; not touched by this issue              | none      |

## Discovery Log

- [2026-09-04] Prop named `sealed` on both `FinishLine` and `FocusAllCompleteCardProps` (not `hasBadge`): it encodes the full predicate (completed goal AND badge row), matching `CompletionFlowScreen`'s `sealedOnEntry`.
- [2026-09-04] Sealed state also swaps the FinishLine subtitle and the all-complete card body: "Tap to view or update your badge design" / "Now design the badge that marks it" both promise an edit the read-only reveal cannot deliver. Keys: `finishLine.sealedCtaSubtitle`, `allComplete.sealedBody`.
- [2026-09-04] FinishLine keeps its monogram tile as the last-resort default (no `createDefaultBadgeDesign`): that tile is the component's own undesigned state and its subtitle explains it.
- [2026-09-04] The badge monogram is SVG text, so the seed-order tests read `JSON.stringify(screen.toJSON())` with distinctive monograms (ZQ / XW), the way `BadgeRenderer.test` does.
