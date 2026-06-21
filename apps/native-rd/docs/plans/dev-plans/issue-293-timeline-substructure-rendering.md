# Development Plan: Issue #293

## Issue Summary

**Title**: A-journey: timeline substructure rendering
**Type**: feature
**Complexity**: SMALL
**Estimated Lines**: ~220 lines (production + styles) + ~90 lines (tests)

> **Revision note (2026-06-20):** the first draft of this plan (from the
> issue-researcher) proposed _no number on children_, _no `in-progress` for
> children_, and _non-interactive child nodes_. All three contradict the
> **approved indentation layout** in prototype record #289 and its source
> (`apps/native-rd/prototypes/a-substructure-layouts.html`, `renderJourney`
> indent branch). This plan is corrected to match what the ND-user gate
> actually approved. Source of truth = the prototype, not the draft defaults.

## Intent Verification

Observable criteria derived from the issue **and the approved prototype**.

- [ ] When a goal has parent steps with children, `TimelineJourneyScreen` renders each parent's children as an indented left-rail sub-spine under the parent's node — visually subordinate, reading as a journey not a tree (record #289, Q4 / ND-user gate).
- [ ] Parents are numbered among parents (1, 2, 3…); each child renders below its parent on the indented sub-spine in a **smaller** node carrying a **letter ordinal** (a, b, c…), so the pair reads as "2a / 2b / 2c" — the approved indentation numbering (record blurb: "1, 2 → 2a/2b/2c, 3"; prototype `renderJourney` indent branch, `jnode(c, String.fromCharCode(97+j), true)`).
- [ ] The **next pending leaf** is highlighted as the current step, exactly as the prototype's `curId`/`nextInfo`: the first non-completed top-level step's first pending child (a child can be current); if that step's children are all done but the parent is open, the parent is current (the "invite" state); a childless pending parent is current itself. Exactly one node carries the `in-progress` accent. This **reuses the existing accent**, generalized from a flat first-pending index to the grouped leaf order.
- [ ] With 3–5 children under one parent, the sub-spine stays legible (record Q8 caveat: indentation can tip toward outline-feel at 4–5). Mitigation is **visual weight only** — smaller child node, muted left rail, slim card — matching the approved prototype. **No collapse/threshold mechanism is introduced**: Q8 outline-feel is an on-device evaluation item per the record's Recommended Follow-Up, not a build-time decision for this issue.
- [ ] Nothing is blocked, hidden, or refused because a parent or sibling step is incomplete. All steps render regardless of sibling status.
- [ ] No composed verdict: no score, streak, count-aggregation, or judgment implied by the substructure display. A parent's own rendering does **not** change visual state based on child completion (no auto-derived parent state — consistent with #292's "invite, never auto-complete").
- [ ] Type-check, lint, and existing tests pass clean.

## Dependencies

| Issue | Title                                                   | Status       | Type                        |
| ----- | ------------------------------------------------------- | ------------ | --------------------------- |
| #290  | A-data: additive parentStepId + sibling-ordinal         | Met (merged) | Hard blocker                |
| #289  | Prototype record: approved indentation layout           | Met (merged) | Reference (source of truth) |
| #292  | A-reading: goal-card next-step + FocusMode/MiniTimeline | Met (merged) | Sibling                     |
| #288  | Epic: sub-steps (A: substructure)                       | Open         | Epic context                |

**Status**: All dependencies met. `parentStepId` is on the schema, `groupStepsByParent` and `flattenGroupedSteps` are in `queries.ts`, and the indentation layout was selected by the ND-user gate session (2026-06-11). #292 shipped the MiniTimeline sub-spine (interactive child nodes, current-child highlight) — this issue is its `TimelineJourneyScreen` + `TimelineStep` counterpart and should match its conventions.

## Objective

Wire the existing data-layer hierarchy (`groupStepsByParent` / `parentStepId`) into the journey view: `TimelineJourneyScreen` groups the flat `stepsByGoalQuery` rows, computes the current leaf, and renders each parent with its children as the approved indented sub-spine via `TimelineStep`.

No new data model work. No completion-toggle changes. No authoring UI.

## Approved-prototype reference (what `renderJourney` indent actually does)

From `apps/native-rd/prototypes/a-substructure-layouts.html`:

- Parent row: full-size node (`.jnode`, ~34px) numbered `i+1` among parents; full card (status pill + title + `E n` evidence badge + chevron).
- Child block: `.jchildren-indent` — left margin + `padding-left` + a `2.5px` left-border **rail**.
- Child row: **small** node (`.jnode.sm`, ~24px) labeled with a **letter** (`a`/`b`/`c`), plus a **slim** card (`.jcard.slim`: status pill + title + evidence badge + chevron).
- Node state classes: `.done` (✓ + filled), `.cur` (thick border — the `curId` leaf), `.pend` (muted). `curId` comes from `nextInfo` and **can be a child**.

## Decisions

| ID  | Decision                                                                                                                                                                                                                                                                                           | Alternatives Considered                                                                    | Rationale                                                                                                                                                                                                                                                                                                                      |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | `TimelineJourneyScreen` calls `groupStepsByParent` on `stepRows`, computes `currentLeafId` (mirroring `nextInfo`), then renders one `TimelineStep` per root, passing children + statuses in.                                                                                                       | Render flat list and let TimelineStep self-discover children; new grouped query            | `groupStepsByParent` is already tested/exported from `queries.ts` and is the established pattern (FocusMode uses it). The screen owns hierarchy + the current-leaf calc; `TimelineStep` stays presentational.                                                                                                                  |
| D2  | `TimelineStep` gains `children?: TimelineStepChild[]` and renders them as the indented sub-spine inline in its own `View`.                                                                                                                                                                         | New `TimelineChildStep`; sibling-level rendering in the screen's map                       | Keeps the parent+children group co-located in the tree, matching the prototype's single indented block per parent.                                                                                                                                                                                                             |
| D3  | Child nodes extend `TimelineNode` with a **small-size** flag and a **`label?` override** carrying the letter ordinal (a/b/c). They keep standard status styling, **including the `in-progress` accent** when the child is the current leaf.                                                        | Plain unnumbered circle (draft default); dedicated child node component                    | The approved prototype renders child nodes small, lettered (a/b/c → "2a/2b/2c"), and highlights the current leaf. `TimelineNode` already styles `isGoalNode`/`in-progress` via flags; a `size`/`label` flag is the same pattern. The unnumbered/no-current treatments were **rejected** — they contradict the approved layout. |
| D4  | Evidence for child steps: children carry their own expandable evidence drawer (the `E n` badge + chevron), using `useStepEvidence` data looked up by step id.                                                                                                                                      | Children show no evidence; evidence rolled up under parent                                 | Prototype slim cards carry the evidence badge + chevron; `stepEvidenceByGoalQuery` already returns all step evidence. Parent's _own_ evidence-vs-rollup question (Q10) stays parked (Not in Scope).                                                                                                                            |
| D5  | The journey marks the **next pending leaf** as the current/`in-progress` step — generalizing the existing flat first-pending highlight to the grouped leaf order (per prototype `nextInfo`). A child can be current; a parent whose children are all done but is still open is current ("invite"). | Drop the current-step highlight on the journey (completed/pending only — draft default)    | The approved prototype highlights `curId` on the journey, **and** the current real screen already marks the first-pending step `in-progress`. Dropping it would both regress current behavior and diverge from the approved layout. "Low-stakes" governs _interaction pressure_, not whether the next action is visible.       |
| D6  | `TimelineStepChild` is a local minimal type in `TimelineStep.tsx`: `{ id; title; status: StepStatus; evidence: EvidenceItemData[] }` (`StepStatus` already includes `in-progress`). The screen maps `GroupedStep` → this at the boundary.                                                          | Import `GroupedStep` from `queries.ts` directly                                            | Keeps `TimelineStep` decoupled from the Evolu-typed DB vocabulary (nullable everything, branded ids).                                                                                                                                                                                                                          |
| D7  | Indent rail: the child block is a `View` with `borderLeftWidth` (the spine), indented to clear the parent node column — the vertical-timeline equivalent of the prototype's `.jchildren-indent` rail.                                                                                              | Bottom-border shelf (MiniTimeline's horizontal approach); pure `marginLeft` without a rail | The journey is vertical; a left rail is the natural read of the prototype's indent.                                                                                                                                                                                                                                            |

## Affected Areas

- `apps/native-rd/src/screens/TimelineJourneyScreen/TimelineJourneyScreen.tsx`: `groupStepsByParent` on `stepRows`; compute `currentLeafId`; map grouped roots + children (+ statuses + evidence) into `TimelineStep` props.
- `apps/native-rd/src/components/TimelineStep/TimelineStep.tsx`: add `children?: TimelineStepChild[]` (+ `TimelineStepChild` type); render child sub-spine when present.
- `apps/native-rd/src/components/TimelineStep/TimelineStep.styles.ts`: child sub-spine styles (`childSpine`, `childRow`, `childContentCard`, etc.).
- `apps/native-rd/src/components/TimelineNode/TimelineNode.tsx` + `TimelineNode.styles.ts`: add a `size?: 'sm'` flag (small child node) and a `label?: string` override (letter ordinal instead of `String(stepNumber)`); preserve numeric parents and the 44pt hit target.
- `apps/native-rd/src/components/TimelineStep/__tests__/TimelineStep.test.tsx`: children present/absent, letter ordinals, current-leaf `in-progress`, child evidence expand.
- `apps/native-rd/src/components/TimelineNode/__tests__/TimelineNode.test.tsx`: `label` override + `size='sm'` render (if a test file exists; else co-locate small cases in TimelineStep tests).
- `apps/native-rd/src/screens/TimelineJourneyScreen/__tests__/TimelineJourneyScreen.test.tsx`: parent+children mock; assert child titles + ordinals render, exactly one `in-progress` node, every-unit progress.
- `apps/native-rd/src/i18n/resources/{en,de,pseudo}/timelineJourney.json`: child a11y label keys.

## Implementation Plan

### Step 1: Extend `TimelineNode` for small + lettered child nodes

**Files**:

- `apps/native-rd/src/components/TimelineNode/TimelineNode.tsx`
- `apps/native-rd/src/components/TimelineNode/TimelineNode.styles.ts`

**Commit**: `feat(timeline-node): small size + label override for child sub-step nodes (#293)`

**Changes**:

- [ ] Add `size?: 'md' | 'sm'` (default `'md'`) and `label?: string` to `TimelineNodeProps`.
- [ ] Content precedence: `isGoalNode` → ★; else `completed` → ✓; else `label ?? String(stepNumber)`. This lets children pass `label="a"` while parents keep numeric `stepNumber`.
- [ ] `size='sm'` applies a smaller node + text style (mirror `MiniTimeline.styles.ts nodeChild` sizing). Keep the existing `hitPad` math driving a ≥44pt touch target even at the small size (full sub-step a11y audit is #294).
- [ ] `in-progress` styling already exists (`inProgressNode`/`inProgressText`) and must apply at `size='sm'` too — that is the current-leaf accent for a child.

### Step 2: Extend `TimelineStep` to render the child sub-spine

**Files**:

- `apps/native-rd/src/components/TimelineStep/TimelineStep.tsx`
- `apps/native-rd/src/components/TimelineStep/TimelineStep.styles.ts`

**Commit**: `feat(timeline-step): indented child sub-spine for sub-steps (#293)`

**Changes**:

- [ ] Define and export `TimelineStepChild` (D6).
- [ ] Add `children?: TimelineStepChild[]` to `TimelineStepProps` (default `[]` — no breaking change for flat goals).
- [ ] After the existing `contentCard`, render a `styles.childSpine` block when `children.length > 0`: a left-rail `View` indented to clear the parent node column.
- [ ] Each child renders as a row: a `TimelineNode` with `size="sm"`, `label={ordinal}` (`String.fromCharCode(97 + index)`), `status={child.status}` (so the current leaf shows `in-progress`), and `onPress` → the same `onNodePress` path as the parent; plus a **slim** content card (`styles.childContentCard`) with the title and an expand/collapse evidence drawer matching the parent's pattern.
- [ ] Child interaction matches parents: tapping a child node calls `onNodePress` (the journey's only node target today is `navigation.navigate("FocusMode", { goalId })`, step index ignored — so children navigate to FocusMode just like parents). The card chevron is the evidence expand control. (A child-_specific_ FocusMode snap stays out of scope — parents don't snap either; see Not in Scope.)
- [ ] Per-child expand state: a `ChildRow` sub-component local to the file (clean hooks-in-loop). `accessibilityRole="button"` on the child card with `accessibilityLabel` from `t("timelineJourney:step.a11yChildExpand", { ordinal, title })`; the small node gets its own button label (`a11yGoTo`-style) since it navigates.

**Styles** (`TimelineStep.styles.ts`): `childSpine` (`marginLeft` to clear the parent node column, `borderLeftWidth: theme.borderWidth.thin`, `borderLeftColor: theme.colors.border`, `paddingLeft`), `childRow` (row, `alignItems:'center'`, `gap`, `marginBottom`), `childContentCard` (slim variant of `contentCard`), `childTitle` (`fontSize: theme.size.sm`, `fontWeight: semibold`), reuse parent `chevron`/`noEvidence`. Use theme tokens only (unistyles), never hardcoded colors.

### Step 3: Wire `TimelineJourneyScreen` — group, current-leaf, evidence-by-id

**Files**:

- `apps/native-rd/src/screens/TimelineJourneyScreen/TimelineJourneyScreen.tsx`

**Commit**: `feat(timeline-journey): group sub-steps + current-leaf into TimelineStep (#293)`

**Changes**:

- [ ] Import `groupStepsByParent` and `GroupedStep` from `../../db`.
- [ ] `const groupedSteps = useMemo(() => groupStepsByParent(stepRows), [stepRows])` (pure → `useMemo` fine).
- [ ] **Current-leaf** (`currentLeafId`), mirroring the prototype's `nextInfo`: walk `groupedSteps` in order; the first non-completed root decides — pending child present → that child's id; children all complete but root open → the root id (invite); no children → the root id. (Replaces `findFirstPendingIndex(stepRows)`.)
- [ ] Status mapping with `currentLeafId`: a step (root or child) is `in-progress` iff `id === currentLeafId`; else `completed` if DB status completed; else `pending`. Apply uniformly so exactly one node highlights.
- [ ] Refactor `useStepEvidence` to return `Map<string, EvidenceItemData[]>` keyed by step id (its internal `grouped` map already uses id — return it directly instead of mapping to a position array). Only this screen consumes the hook. Look up evidence for roots and children by id.
- [ ] Build `stepsWithChildren` from `groupedSteps`: each root → `{ id, title, status, evidenceCount, children: root.children.map(...) }` where children carry `{ id, title, status, evidence }`.
- [ ] Progress: **every-unit** — `stepRows.length` already counts parents + children (the journey is _already_ every-unit today; with children now in `stepRows` it stays so, matching #292's goal-card rule). No change to the progress calc. (The record's open "progress counting" question is settled by #292's shipped every-unit; not re-litigated here.)
- [ ] Render `stepsWithChildren.map((step, index) => <TimelineStep key={step.id} step={step} stepIndex={index} children={step.children} .../>)` — `stepIndex` is now the parent ordinal among parents.

### Step 4: i18n keys for child a11y

**Files**: `apps/native-rd/src/i18n/resources/{en,de,pseudo}/timelineJourney.json`

**Commit**: `feat(i18n): timelineJourney child step a11y keys (#293)`

- [ ] `en`: add under `step`: `"a11yChildExpand": "Sub-step {{ordinal}}: {{title}}"` (confirm `step.noEvidence` already exists and is reused for children).
- [ ] `de`: German equivalent.
- [ ] Regenerate pseudo: `bun run gen:pseudo` (or apply the pseudo transform to the new key).

### Step 5: Tests

**Files**:

- `apps/native-rd/src/components/TimelineStep/__tests__/TimelineStep.test.tsx`
- `apps/native-rd/src/screens/TimelineJourneyScreen/__tests__/TimelineJourneyScreen.test.tsx`

**Commit**: `test(timeline): sub-step rendering, ordinals, current-leaf (#293)`

**TimelineStep**:

- [ ] `children` absent/empty: existing tests unchanged — no sub-spine.
- [ ] `children` present (1, then 3): all child titles render; parent title renders.
- [ ] Letter ordinals: 3 children render nodes labeled `a`, `b`, `c` (assert via node text / `testID`).
- [ ] Current-leaf: a child passed `status: "in-progress"` gets the in-progress node style; assert it, and that a completed child gets ✓/completed style. Use `test.each` for the status→style matrix.
- [ ] Child evidence expands independently of the parent; child with no evidence shows `step.noEvidence`.

**TimelineJourneyScreen**:

- [ ] `STEPS_WITH_CHILDREN` mock: one parent (`parentStepId: null`) + two children (`parentStepId: 'parent-id'`). All three titles render.
- [ ] Exactly **one** node is `in-progress`, and it is the next pending leaf (assert it's the first pending child when the parent has pending children).
- [ ] Every-unit progress: 1 parent + 2 children, 0 completed → "0 of 3 …" (existing `progress` behavior unchanged).
- [ ] `groupStepsByParent` runs as real code (pure fn, not mocked); the `stepsByGoalQuery` mock returns rows flat.

## Testing Strategy

- [ ] Jest 30 + `@testing-library/react-native` v13; `test.each` for status→style cases.
- [ ] Run: `npx jest --no-coverage --testPathPatterns "TimelineStep|TimelineJourneyScreen|TimelineNode"`.
- [ ] `bun run type-check` + `bun run lint` clean.
- [ ] Manual (device): goal with 1 parent + 3 sub-steps → journey shows the indented sub-spine, children lettered a/b/c, exactly one current-leaf highlight; at 4–5 children, eyeball the Q8 outline-feel (record's on-device evaluation — note findings, do not add collapse logic here); confirm nothing is hidden when a sibling is incomplete.

## Not in Scope

| Item                                                                     | Reason                                                                                                                                                                   | Follow-up      |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| Sub-step a11y contract pass (full 44pt audit, richer labels)             | Separate issue #294                                                                                                                                                      | #294           |
| Parent "invite" affordance (rich Q9 parent-completion copy + toggle)     | Post-Stage-6; #293 only _renders_ the invite state, no completion action                                                                                                 | post-#292      |
| Evidence rollup from children onto the parent card (Q10)                 | Parked in the prototype record (Q10 tail)                                                                                                                                | post-Stage-6   |
| A parent's _own_ evidence drawer distinct from its children's (Q10 tail) | Parked                                                                                                                                                                   | post-Stage-6   |
| Depth beyond one level                                                   | Schema hard cap (`parentStepId` is one-level); graduates post-Stage-6 (Q6)                                                                                               | post-Stage-6   |
| Child-_specific_ FocusMode snap (tap child → snap to that step)          | Journey nodes (parent and child) navigate to FocusMode at goal level today; per-step snap is FocusMode/#292's domain and isn't wired from the journey for parents either | none           |
| Collapse / "show N sub-steps" threshold for crowded parents              | Not in the approved layout; Q8 outline-feel is an on-device evaluation item                                                                                              | post-ship eval |

No items from the ADR-0012 Must-Not-Do list are touched: no auto-state, no absence scoring, no parent-completion inference, no composed verdicts. The current-leaf highlight reflects the existing "next step" pointer; it derives no aggregate from substructure.

## Discovery Log

- [2026-06-20] **Current-leaf semantics: followed FocusMode #292, not the prototype's `nextInfo` literally.** `nextInfo` skips a completed root _before_ checking its children; FocusMode's shipped `findFirstPendingLeafIndex` checks pending children _first_, so a pending sub-step stays the current leaf even under a manually-completed parent (completion is per-step, not cascaded). Since journey nodes navigate to FocusMode, the journey's accent must agree with FocusMode's snap target — and "nothing hidden" (intent criterion) favours keeping the pending leaf reachable. `findCurrentLeafId` mirrors `findFirstPendingLeafIndex` over the grouped tree. The two agree in the common case (a completed parent normally has all children done); they differ only in the manual-completion edge case, where FocusMode's behaviour is the correct one to match.
- [2026-06-20] **Prop named `subSteps`, not `children`.** The plan (D2) proposed `children?: TimelineStepChild[]`, but `react/no-children-prop` is an _error_ in the expo flat config (verified empirically) — passing `children={...}` as a data prop in JSX fails lint. `subSteps` also avoids overloading React's reserved `children`. Type stays `TimelineStepChild`.
- [2026-06-20] **`TimelineJourneyScreen.tsx` is 313 lines** (was 279), tripping the non-blocking `local/file-size-limit` warn. Left inline to match the sibling `FocusModeScreen` (600+ lines, same inline current-leaf helper pattern) rather than introduce an outlier `.helpers.ts`. Candidate for a future focused split alongside FocusMode.
- [2026-06-20] **Pseudo regen drift contained.** `bun run gen:pseudo` rewrote padding dots in two unrelated files (`completion.json`, `editGoal.json`) from pre-existing drift; reverted both, keeping only the new `timelineJourney.json` key.
