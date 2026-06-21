# Development Plan: Issue #360

## Issue Summary

**Title**: A-reading: focus-mode step-card frame — stable envelope + evidence rail + parent-tie pattern
**Type**: enhancement
**Complexity**: MEDIUM
**Estimated Lines**: ~300–420 lines (implementation + styles) + ~80–120 lines (tests)

## Decision Gate — SATISFIED ✅ (2026-06-21)

**Candidate C — Parent overview — selected by Joe (ND user, primary audience)**
after reviewing the prototype (`apps/native-rd/prototypes/a-focus-card-substructure.html`,
`?cand=C`). This is the same ND-user gate process that graduated the layout
grammar in #288 / 2026-06-11.

**Remaining open questions resolved at the same time** (both confirmed to match
the reviewed prototype — no deviation):

- **Q2 — blocked-step foot**: keep the italic prompt text (not a disabled checkbox).
- **Q3 — evidence rail position**: in the scrollable body zone (not pinned above the foot).
- **Q5 — spine active-cell token**: use the existing design-system in-progress token
  (`accentYellow`); verify it holds in `highContrast` / `autismFriendly` themes.
- **Q4** (A/B part-numbering) — **dropped**, A/B-specific.

**Implementation path: Phase 0 → Phase 1 → Phase 2 → Phase 3C → Phase 4.**
Phases 3A and 3B are skipped (candidates not chosen).

**Phase 0 deliverable — DONE** (commit `ede0cd9`): the candidate selection +
session observations are recorded in the prototype record at
`apps/native-rd/docs/plans/phase-b-prototype-records/A-substructure.md`
("ND-user gate session (2026-06-21)", lines 266–290).

---

## Intent Verification

Observable criteria derived from the issue. Candidate-independent criteria that
apply regardless of which A / B / C is chosen:

- [ ] When swiping between focus-mode step cards of different content lengths,
      the card envelope height does not change between cards — no visible jitter
      or frame resize.
- [ ] Each step card that can accept evidence shows a persistent "Add evidence"
      rail (always visible, not in a drawer) with chips for captured pieces and
      a "needed" marker when a planned type is missing — the marker uses an icon
      or label in addition to any colour cue.
- [ ] A flat step (no parent) renders the same stable frame and the same
      evidence rail, with no parent-context element shown.
- [ ] The carousel navigation arrows carry `accessibilityRole`, a descriptive
      `accessibilityLabel` (back / forward), and are no smaller than 44 × 44 pt;
      disabled state is communicated via `accessibilityState={{ disabled: true }}`
      and a non-colour-only visual change (opacity, label change, or icon change).
- [ ] Flat steps remain first-class: they use the same card scaffold, the same
      evidence rail, the same foot action — no parent-tie element appears.
- [ ] Type-check, lint, and focus-mode test suite pass.

Candidate-specific observable criteria (fill in when candidate is chosen):

**If A — Anchored leaf:**

- [ ] Each child step card shows a persistent parent-context band pinned above
      the card body (not the page header), carrying the parent title and part
      number; the band is announced as context by a screen reader, not as the
      actionable leaf.

**If B — Sub-deck:**

- [ ] A parent's child step cards are grouped in a visible deck (shared
      left-rail accent + pinned parent strip showing part progress); peeking
      sibling card edges are visible behind the active card.
- [ ] Swiping within a parent's deck moves through the parent's parts; swipe
      past the last part exits the deck to the next top-level item.
- [ ] The parent strip announces group membership and part progress to a screen
      reader without repeating the leaf's actionable title.

**If C — Parent overview:**

- [ ] Navigating to a parent step shows an overview card listing all its parts
      as a timeline-spine list (node-on-connector, ✓ for done, active node
      ringed), an evidence rollup count, and a "mark parent complete" invite
      only when all parts are done.
- [ ] The overview card is announced as an overview (context), not as a leaf
      action; each part's individual card is reachable by continuing to swipe.
- [ ] The overview card's evidence rollup count matches the sum of captured
      evidence across all child parts.

---

## Dependencies

| Issue | Title                                                             | Status              | Type       |
| ----- | ----------------------------------------------------------------- | ------------------- | ---------- |
| #288  | A-substeps: indentation grammar + full surface pass               | Shipped             | Prior work |
| #292  | A-reading: goal-card next-step + FocusMode/MiniTimeline sub-spine | Shipped             | Prior work |
| #293  | Timeline substructure rendering — sub-step sub-spine              | Shipped             | Prior work |
| #355  | docs(native-rd): focus-card substructure prototype                | Shipped (PR merged) | Prior work |
| #356  | A-reading: badge-led goal card (sibling)                          | Parallel            | Sibling    |
| #357  | A-reading: resume shortcut (sibling)                              | Parallel            | Sibling    |
| #289  | A-reading: indentation close-out                                  | Check status        | Related    |

**Status**: No hard blockers. #356 and #357 cover the _goal/destination_ card;
this issue is scoped to _step cards_ only. The prototype record mentions
#289's indentation close-out — verify before writing candidate selection to the
record.

---

## Objective

Replace the current shrink-wrap step cards (which resize as content changes
between cards, causing carousel jitter) with a fixed-height scaffold that
holds the same envelope for every step regardless of content length. Add an
always-visible evidence-add rail (vs. the current drawer-only path). Resolve
the parent ↔ substep tie in the focus carousel using whichever of the three
prototype candidates Joe selects.

---

## Decisions

| ID  | Decision                                                                          | Alternatives Considered                              | Rationale                                                                                                                                                                                                       |
| --- | --------------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Candidate selection: **C — Parent overview** (chosen 2026-06-21)                  | A (anchored leaf), B (sub-deck), C (parent overview) | ND-user gate passed; Joe selected C from the prototype. Answers parent rollup (Q10) + gives the Q9 manual-complete invite a clear home. Cost accepted: two card archetypes + one extra read to a leaf's action. |
| D2  | Stable envelope via `flex: 1` fill of the `AnimatedCard` track slot               | Fixed pixel height, min/max height                   | `AnimatedCard` already uses `top: 0 / bottom: 0` with `justifyContent: center`; the card just needs to fill its container rather than shrink-wrap. No new dimension logic needed.                               |
| D3  | Evidence rail is always-visible on the card body, not in the existing drawer only | Drawer-only (current), FAB-only, toggle              | Issue requirement; drawer remains for view/delete; the rail is the add affordance                                                                                                                               |
| D4  | i18n: new keys go in `focusMode` namespace                                        | `common` namespace                                   | Step-card-specific strings (evidence rail, parent band, overview labels) belong with the focus-mode surface, not the shared namespace                                                                           |
| D5  | Blocked-step foot keeps the italic prompt text                                    | Disabled checkbox with `accessibilityState`          | Joe confirmed 2026-06-21 — match the reviewed prototype; no behavioural deviation                                                                                                                               |
| D6  | Evidence rail lives in the scrollable body zone                                   | Pinned above the foot (always visible)               | Joe confirmed 2026-06-21 — match the reviewed prototype; on long steps the body scroll handles overflow                                                                                                         |
| D7  | Overview spine active-cell uses the existing `accentYellow` in-progress token     | One-off yellow literal                               | Use the design-system token, not a hardcoded value; verify parity across `highContrast` / `autismFriendly` themes before build (default adopted, not separately gated)                                          |

---

## Affected Areas

### Candidate-independent (all three paths)

- `apps/native-rd/src/components/StepCard/StepCard.tsx` — stable-frame scaffold (fill container, body scrolls, foot pinned), always-visible evidence rail with chips + needed marker
- `apps/native-rd/src/components/StepCard/StepCard.styles.ts` — new layout styles for the zoned scaffold and evidence rail
- `apps/native-rd/src/components/CardCarousel/CardCarousel.tsx` — `AnimatedCard` fill geometry (remove `justifyContent: center`, ensure card children fill the track slot)
- `apps/native-rd/src/components/CardCarousel/CardCarousel.styles.ts` — track slot layout to support fill
- `apps/native-rd/src/i18n/resources/en/focusMode.json` — new keys: evidence rail labels, needed-marker label
- `apps/native-rd/src/i18n/resources/de/focusMode.json` — German translations for same
- `apps/native-rd/src/i18n/resources/pseudo/focusMode.json` — pseudo-locale
- `apps/native-rd/src/components/StepCard/__tests__/StepCard.test.tsx` — stable-frame + evidence rail tests
- `apps/native-rd/src/components/CardCarousel/__tests__/CardCarousel.test.tsx` — fill geometry regression

### Candidate A only (anchored leaf)

- `apps/native-rd/src/components/StepCard/StepCard.tsx` — top-band for parent context (purple-light bg, parent title + part N of M)
- `apps/native-rd/src/components/StepCard/StepCard.styles.ts` — `topBand`, `topBandChild` styles

### Candidate B only (sub-deck)

- `apps/native-rd/src/components/StepCard/StepCard.tsx` — parent-strip integration within deck wrapper
- `apps/native-rd/src/components/StepCard/StepCard.styles.ts` — deck + left-rail accent + peek-stack styles
- `apps/native-rd/src/components/CardCarousel/CardCarousel.tsx` — deck-within-carousel mechanic (grouped swipe within a parent's children); this is the largest new build surface for B
- `apps/native-rd/src/components/CardCarousel/CardCarousel.styles.ts` — deck layout
- `apps/native-rd/src/components/CardCarousel/__tests__/CardCarousel.test.tsx` — deck navigation tests

### Candidate C only (parent overview)

- `apps/native-rd/src/components/StepCard/StepCard.tsx` — `kind='overview'` variant (spine-list parts, evidence rollup, mark-parent-complete invite)
- `apps/native-rd/src/components/StepCard/StepCard.styles.ts` — overview + spine-list styles + peek-stack fan
- `apps/native-rd/src/screens/FocusModeScreen/FocusModeScreen.tsx` — render a `StepCard` in overview mode for parent rows, leaf mode for child rows (two card archetypes, one component)
- `apps/native-rd/src/screens/FocusModeScreen/__tests__/FocusModeScreen.test.tsx` — overview card renders with correct parts list + evidence rollup

### Prototype record (all paths)

- `apps/native-rd/docs/plans/phase-b-prototype-records/A-substructure.md` — candidate selection + session observations added before Phase 1 starts (Phase 0 output)

---

## Implementation Plan

### Phase 0: Decision Gate (precondition — no code change)

**Who**: Joe (ND user, primary audience)
**Action**: Review the prototype at `apps/native-rd/prototypes/a-focus-card-substructure.html`.
Toggle candidates with `?cand=A`, `?cand=B`, `?cand=C` (or ← → arrow keys).
Use both datasets (`?data=mid` and `?data=done`).
**Deliverable**: Selected candidate + observations written into the prototype record at
`apps/native-rd/docs/plans/phase-b-prototype-records/A-substructure.md`
(append a new "focus-card gate session" section mirroring the pattern from the
2026-06-11 ND-user gate entry).
**Unblocks**: All phases below.

---

### Phase 1: Stable card frame (candidate-independent)

**Files**:

- `apps/native-rd/src/components/CardCarousel/CardCarousel.tsx`
- `apps/native-rd/src/components/CardCarousel/CardCarousel.styles.ts`
- `apps/native-rd/src/components/StepCard/StepCard.tsx`
- `apps/native-rd/src/components/StepCard/StepCard.styles.ts`
- `apps/native-rd/src/components/CardCarousel/__tests__/CardCarousel.test.tsx`

**Commit**: `feat(focus): stable step-card envelope — fill frame, body scrolls, foot pinned`

**Changes**:

- [x] In `CardCarousel.tsx` `AnimatedCard`, change the animated style so the
      card fills its track slot: remove `justifyContent: "center"`, set children
      to `flex: 1` so they expand to the track height rather than shrink-wrapping.
      (Current: `top: 0, bottom: 0, justifyContent: center` → card is vertically
      centred and shrinks to content. Target: card fills the slot.)
- [x] In `StepCard.tsx`, restructure the layout to the zoned scaffold from the
      prototype: - outer `View` fills the container (`flex: 1`) - `.body` zone: `flex: 1`, `ScrollView` for overflow (title, parent context,
      evidence zones) - `.foot` zone: `flex: 0`, pinned at bottom — the checkbox / blocked-state
      action (already at the bottom of `ScrollView`; move outside so it stays
      visible regardless of body height)
- [x] In `StepCard.styles.ts`, add `cardOuter`, `cardBody`, `cardFoot` styles
      to support the above; ensure `minHeight: 44` on the foot row.
- [x] Add a `CardCarousel` test asserting cards fill the track (no shrink-wrap
      by verifying the style passed to `AnimatedCard` does not include
      `justifyContent: center`).

---

### Phase 2: Evidence rail (candidate-independent)

**Files**:

- `apps/native-rd/src/components/StepCard/StepCard.tsx`
- `apps/native-rd/src/components/StepCard/StepCard.styles.ts`
- `apps/native-rd/src/i18n/resources/en/focusMode.json`
- `apps/native-rd/src/i18n/resources/de/focusMode.json`
- `apps/native-rd/src/i18n/resources/pseudo/focusMode.json`
- `apps/native-rd/src/i18n/resources/_register/focusMode.yml`
- `apps/native-rd/src/components/StepCard/__tests__/StepCard.test.tsx`

**Commit**: `feat(focus): always-visible evidence rail — add affordance, chips, needed marker`

**Changes**:

- [ ] In the `StepCard` body zone (above the foot), add an `EvidenceRail`
      section (inline, not a separate component unless reuse is obvious): - Captured-evidence chips: one pill per captured type, icon + label,
      `backgroundColor: accentPurpleLight`. Icon selection reuses the existing
      `EVIDENCE_OPTIONS` map already in scope. - "Add evidence" button: always visible (dashed border, "＋ Add evidence"
      label), calls `onEvidenceTap` (existing handler that opens the drawer —
      no new navigation needed). - "Needed" marker: when a planned type is not yet captured, show a chip
      with icon + label `"[type] • needed"` using `error` colour combined with
      an icon (not colour alone).
- [ ] Ensure the rail section has `accessibilityRole="none"` wrapping with a
      descriptive `accessibilityLabel` for the group; individual chips get
      `accessibilityRole="text"` (read-only status) and the add button gets
      `accessibilityRole="button"`.
- [ ] Add i18n keys: `focusMode:evidenceRail.addButton`, `focusMode:evidenceRail.needed`,
      `focusMode:evidenceRail.capturedChip` (with `{{type}}` interpolation).
- [ ] Tests: render a `StepCard` with `capturedEvidenceTypes: ['photo']` and
      `plannedEvidenceTypes: ['photo', 'note']` — assert the "＋ Add evidence"
      button is present, a "photo" chip is present, a "note • needed" marker is
      present. Render with no planned types — assert only the add button appears,
      no needed marker.

---

### Phase 3A: Parent tie — Candidate A (anchored leaf)

_Skip this phase if B or C is chosen._

**Files**:

- `apps/native-rd/src/components/StepCard/StepCard.tsx`
- `apps/native-rd/src/components/StepCard/StepCard.styles.ts`
- `apps/native-rd/src/i18n/resources/en/focusMode.json`
- `apps/native-rd/src/i18n/resources/de/focusMode.json`
- `apps/native-rd/src/i18n/resources/pseudo/focusMode.json`
- `apps/native-rd/src/components/StepCard/__tests__/StepCard.test.tsx`

**Commit**: `feat(focus): candidate A — anchored parent band above child step cards`

**Changes**:

- [ ] Add a `topBand` element inside `StepCard` (above the body zone), rendered
      only when `step.parentTitle` is set: - Background: `accentPurpleLight` (matches prototype `.topband.child`). - Content: `↳ [parentTitle] · part N of M` — requires exposing `partIndex`
      and `partTotal` props to `StepCard` (the screen already has this info via
      the flattened `stepRows` and `stepRootIds`). - `accessibilityElementsHidden={false}`, announced as supplementary context
      (add `accessibilityLabel` like "Part 2 of 3 of [parentTitle]"). The band
      is NOT the primary action element — a screen reader should reach it
      without treating it as the step to act on.
- [ ] Update `StepCardStep` interface: add `partIndex?: number`, `partTotal?: number`.
- [ ] Update `FocusModeScreen.tsx` to pass `partIndex` / `partTotal` for child
      steps (derive from the parent's `children` count using `stepRootIds` +
      sibling ordering).
- [ ] In `StepCard.styles.ts`, add `topBand`, `topBandChild`, `topBandContext`
      styles (`paddingHorizontal: space[3]`, `paddingVertical: space[2]`,
      `borderBottomWidth`, background token).
- [ ] Test: child step renders `topBand` with correct parent + part label;
      flat step renders no band.
- [ ] Note: the parent still has its own bare card in this model (no change to
      the flat-sibling sequence). The band alone does not remove the parent card.

---

### Phase 3B: Parent tie — Candidate B (sub-deck)

_Skip this phase if A or C is chosen._

**Files**:

- `apps/native-rd/src/components/CardCarousel/CardCarousel.tsx`
- `apps/native-rd/src/components/CardCarousel/CardCarousel.styles.ts`
- `apps/native-rd/src/components/StepCard/StepCard.tsx`
- `apps/native-rd/src/components/StepCard/StepCard.styles.ts`
- `apps/native-rd/src/screens/FocusModeScreen/FocusModeScreen.tsx`
- `apps/native-rd/src/i18n/resources/en/focusMode.json` + de + pseudo
- `apps/native-rd/src/components/CardCarousel/__tests__/CardCarousel.test.tsx`
- `apps/native-rd/src/screens/FocusModeScreen/__tests__/FocusModeScreen.test.tsx`

**Commit**: `feat(focus): candidate B — sub-deck grouped carousel with parent strip`

**Changes (largest surface area of the three candidates)**:

- [ ] **New deck layout in `CardCarousel`**: when the current card is within a
      "group" (parent + its children), render the card inside a `DeckWrapper`
      that shows: - Two peeking sibling-card silhouettes behind the active card (positioned
      absolutely, narrowing and darkening as they recede, matching prototype
      `.peek` / `.peek.p2`). - A `ParentStrip` pinned above the active card: parent title + `part N of M` + a row of completion pip segments + status badge. The strip replaces the
      individual card's top band for grouped cards. - Left-rail accent (5px `accentPurple` border on the active card's left edge). - This requires `CardCarousel` to accept a `groups` prop or for
      `FocusModeScreen` to pass a `groupMap` (Map<parentId, childIds>) so the
      carousel knows which cards form a deck.
- [ ] Within a deck, swiping or arrow-pressing moves between siblings (parts)
      without exiting the deck visually; a swipe past the last part exits the
      deck and advances to the next top-level step.
- [ ] The parent card itself (when it is the active card in a deck) shows the
      parent's own content with a `ctx-line` ("pick up where you left off" or
      "N of M parts done") rather than the leaf evidence rail. A11y: the deck
      wrapping announces the parent group name once; individual part cards
      announce their own content.
- [ ] Update `StepCard` props: add `isDeckCard?: boolean` to suppress the inner
      `topBand` (the deck's `ParentStrip` carries that context), add `deckRail?: boolean`
      to apply the purple left-rail accent.
- [ ] Tests: assert deck navigation (swipe right within a parent group advances
      to next sibling, not next top-level); assert peeking views render for the
      active card in a group; assert exiting a deck after the last sibling
      advances to the next top-level card.

---

### Phase 3C: Parent tie — Candidate C (parent overview)

_Skip this phase if A or B is chosen._

**Files**:

- `apps/native-rd/src/components/StepCard/StepCard.tsx`
- `apps/native-rd/src/components/StepCard/StepCard.styles.ts`
- `apps/native-rd/src/screens/FocusModeScreen/FocusModeScreen.tsx`
- `apps/native-rd/src/i18n/resources/en/focusMode.json` + de + pseudo
- `apps/native-rd/src/components/StepCard/__tests__/StepCard.test.tsx`
- `apps/native-rd/src/screens/FocusModeScreen/__tests__/FocusModeScreen.test.tsx`

**Commit**: `feat(focus): candidate C — parent overview card with spine list + evidence rollup`

**Changes**:

- [ ] Add an `overview` mode to `StepCard` (via a `kind: 'leaf' | 'overview'` prop).
      In overview mode, the card body renders: - Step title as hero (the parent name). - A vertical spine list of parts (node-on-connector, ✓ for done, ring for
      active) — mirrors the prototype's `spineList()`: each row is a bordered
      cell with the part title and an evidence count badge if evidence exists.
      The active part's cell has `accentYellow` background. - An "Evidence across parts" rollup row (summed evidence count across all
      children). - The foot action: `"Mark '[parent]' complete"` when all parts are done
      (the Q9 invite), `"Open next part →"` when parts are still pending.
- [ ] The peek-stack fan (sibling cards visible behind the overview card) is
      rendered with the number of parts fanning above the card top edge — using
      the same absolute-positioned peek approach as the prototype `cardStack()`.
      The card envelope itself does not change height; only the fan overlays above.
- [ ] In `FocusModeScreen`, detect parent rows from the flattened `stepRows`
      (rows where `parentStepId == null` and `stepRootIds` has matching children)
      and render them as `StepCard` with `kind="overview"`, passing the children
      data for the spine list.
- [ ] Child/leaf cards that follow the overview card still use `kind="leaf"` with
      the quiet `parentTitle` context line (existing `↳ in [parent]` rendering
      from #292). The overview is read-once; then each leaf is its own card.
- [ ] A11y: the overview card has `accessibilityRole="summary"` (or `"none"` with
      a descriptive `accessibilityLabel` identifying it as an overview). Each row
      in the spine list is announced with its title and status. The foot action
      button has a clear `accessibilityLabel` distinguishing "open next part" from
      "mark complete".
- [ ] Tests: render a parent step in overview mode — assert spine list renders
      all children with correct status icons, assert evidence rollup equals sum of
      children's evidence counts, assert foot action label changes between
      "pending children" and "all done" states.

---

### Phase 4: A11y hardening (candidate-independent, final pass)

**Files**:

- `apps/native-rd/src/components/CardCarousel/CardCarousel.tsx`
- `apps/native-rd/src/components/StepCard/StepCard.tsx`
- `apps/native-rd/src/components/StepCard/__tests__/StepCard.test.tsx`
- `apps/native-rd/src/components/CardCarousel/__tests__/CardCarousel.test.tsx`
- `apps/native-rd/src/i18n/resources/en/focusMode.json` (any missing keys)

**Commit**: `fix(a11y): focus step-card — nav arrows role+label+44pt, evidence chips non-colour`

**Changes**:

- [ ] Confirm carousel nav arrows: `accessibilityRole="button"`,
      `accessibilityLabel` with direction ("Previous step card" / "Next step card"),
      `accessibilityState={{ disabled: isFirst/isLast }}`, visual disabled state
      uses opacity AND a change beyond colour (e.g., text opacity change is already
      in `arrowDisabled` styles — verify this is sufficient for non-colour
      discrimination). Minimum touch target: `minHeight: 44, minWidth: 44` (already
      44 × 44 in existing `CardCarousel.styles.ts` — confirm no regression).
- [ ] Confirm evidence chips: each chip has an icon (not colour-only) + a text
      label. The "needed" marker carries `accessibilityLabel="[type] evidence
needed"`. The "Add evidence" button is `accessibilityRole="button"`.
- [ ] Confirm candidate-specific a11y (parent band / strip / overview) is
      announced as context, not as the actionable step — verify with
      `accessibilityElementsHidden` or `accessibilityLabel` patterns.
- [ ] Contract tests: assert nav arrows have `accessibilityRole="button"` and are
      not `accessibilityElementsHidden`; assert the disabled arrow has
      `accessibilityState.disabled === true`; assert evidence chips have a text
      label alongside any icon.

---

## Testing Strategy

- [ ] Unit tests for `StepCard` with the zoned scaffold: body scrolls, foot
      stays pinned (verify foot is outside the `ScrollView` in the render tree)
- [ ] Unit tests for the evidence rail: add button always present, chips for
      captured types, needed marker when planned type missing, no needed marker
      when all planned captured
- [ ] Unit tests for `CardCarousel`: frame-fill geometry (no `justifyContent:center`
      on the animated card track slot)
- [ ] Candidate-specific unit tests (see Phase 3A / 3B / 3C above)
- [ ] A11y contract tests: nav arrow roles, disabled state, evidence chip labels
- [ ] Test file paths mirror `src/` under `src/__tests__/` per project convention
- [ ] Use `test.each` for status-variant tests (pending / in-progress / completed)
      across flat vs. child step types
- [ ] Manual testing: run in iOS sim with a goal containing a flat step, a parent
      with 2–3 children, and at least one planned-evidence step; verify frame
      stability, evidence rail, and parent-tie rendering at each navigation step
- [ ] Manual testing: exercise all six a11y themes (highContrast, largeText,
      dyslexia, lowVision, autismFriendly, lowInfo) and confirm the evidence
      rail's needed marker and parent band remain readable

---

## Not in Scope

| Item                                                                 | Reason                                                        | Follow-up                                |
| -------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------- |
| Depth beyond one level                                               | Issue constraint from #288                                    | Post-Stage-6 per open questions register |
| Auto parent completion (completing last child changes parent status) | ADR-0012 no-auto-judgment; issue constraint                   | None — by design                         |
| Blocking / hiding steps because parent or sibling is incomplete      | Issue constraint from #288                                    | None — by design                         |
| Goal / destination card rework (badge-led, resume shortcut)          | Covered by siblings #356, #357                                | #356, #357                               |
| Progress counting rule changes                                       | Resolved as "every-unit" in #292                              | None                                     |
| Evidence drawer view/delete UI changes                               | Drawer is existing; this issue adds the in-card add-rail only | None                                     |
| ND-user session (the gate itself)                                    | Joe's call, not an implementation task                        | Issue #360 Phase 0                       |

---

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->

**Phase 1 — stable card frame (2026-06-21):**

- [2026-06-21] `StepCard` dropped its `<Card>` wrapper in favour of a dedicated
  `cardOuter` style (same neo-brutalist tokens: thick border, `radius.sm`,
  `cardElevation` shadow, `backgroundSecondary`). The zoned scaffold needs a
  full-bleed foot divider (`borderTop` edge-to-edge) and a body/foot split that
  `Card`'s uniform padding fights, so `cardOuter` carries the envelope and the
  body (`ScrollView`, `flex: 1`) + foot (`flex: 0`, pinned) carry their own
  padding. Matches the prototype `.scard` / `.body` / `.foot`.
- [2026-06-21] The fill mechanism for the carousel slot is a new opt-in `fill`
  prop on the shared `Card` (adds `flex: 1`), not a forced change to all cards.
  `GoalEvidenceCard` uses `<Card fill>` + `wrapper.flex: 1`; `StepCard`'s
  `cardOuter` sets `flex: 1` directly.
- [2026-06-21] **Scope touch (`GoalEvidenceCard`, not in the plan's Phase 1 file
  list):** the shared `AnimatedCard` change (drop `justifyContent: center`)
  would otherwise top-align the goal card while step cards fill, resizing the
  frame on swipe to the last card. Made `GoalEvidenceCard` fill too so the frame
  is stable across the whole carousel — the Phase 1 objective applied
  carousel-wide. No content rework (badge-led / resume shortcut stays for
  #356/#357).
- [2026-06-21] `AnimatedCard` insets changed `top: 0, bottom: 0` →
  `top: 4, bottom: 8` so the card's `hardMd` (3px) shadow is not clipped by the
  track's `overflow: hidden` once the card fills the slot (the previous centred
  shrink-wrap left shadow room; a flush fill did not).
- [2026-06-21] Reading-order regression test in `StepCard.test.tsx` updated:
  the completion prompt/checkbox moved out of the scroll body into the pinned
  foot, so it now follows the evidence badge in document order
  (was meta→title→quickActions→prompt→badge; now
  meta→title→quickActions→badge→foot-prompt). Kept as a layout regression test.

**Research findings (2026-06-21):**

- `AnimatedCard` in `CardCarousel.tsx` (line 87–99) sets `top: 0, bottom: 0` but
  also `justifyContent: "center"` and children are not forced to fill. The
  `StepCard` sits inside a `Card` inside a `ScrollView` with shrink-wrap layout —
  this is the root of the frame-jitter the prototype's stable-frame addresses.
  Phase 1 resolves this by having the card fill its container rather than
  self-sizing.

- The existing `EvidenceDrawer` is the current add-evidence path. The prototype's
  "＋ Add evidence" rail calls `onEvidenceTap` (which opens the drawer) — the same
  handler already exists on `StepCard`. No new navigation route needed for Phase 2;
  the rail is a visible entry point to the existing drawer flow.

- `StepCard.tsx` already receives `parentTitle` (from #292) and renders a quiet
  `↳ in [parent]` context line. For Candidate A, this line is replaced by the
  pinned top band; for Candidates B and C, the leaf cards still use it as the
  quiet context.

- Candidate B requires changes to `CardCarousel`'s indexing contract — the
  carousel currently treats every child as a peer item at a flat integer index.
  Grouped-deck navigation would require the carousel to understand that indices
  N through N+k belong to one parent group. This is a new mechanic with blast
  radius into `findFirstPendingLeafIndex`, `handleIndexChange`, `ProgressDots`,
  and `MiniTimeline` highlighting. It is the largest build surface of the three
  candidates.

- Candidate C introduces two card archetypes rendered from the same `StepCard`
  component — one `overview` and one `leaf`. The `FocusModeScreen` already maps
  `stepRows` flat; it knows which rows are parents (`parentStepId == null` with
  children present) and which are children. The overview card would be rendered
  for parent rows.

- The prototype record (`A-substructure.md`) already has the 2026-06-11 ND-user
  gate entry for the layout grammar. The new focus-card gate entry should be
  appended in the same format. The record explicitly references this prototype
  (`docs/plans/phase-b-prototype-records/A-substructure.md`) and is the correct
  landing spot for the candidate selection + session observations.

- Siblings #356 (badge-led goal card) and #357 (resume shortcut) are confirmed
  to target the _destination_ card (last card in focus mode). This issue is
  scoped to the _step cards_ — the cards swiped through before reaching the goal
  card. No file overlap with #356/#357 except potentially `FocusModeScreen.tsx`
  (the parent screen); coordinate to avoid merge conflicts if both are in flight.
