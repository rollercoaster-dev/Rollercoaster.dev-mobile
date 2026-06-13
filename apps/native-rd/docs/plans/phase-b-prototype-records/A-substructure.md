# Prototype Record — A: Substeps (formerly Granularity / Substructure)

Feature shape: [phase-b-feature-shapes.md §A](../phase-b-feature-shapes.md#a-substeps-formerly-granularity--substructure)
Conventions: [phase-b-stage-0-deliverables.md](../phase-b-stage-0-deliverables.md)

## Prototype: A — substep layout pass (2026-06-11)

### Hypothesis

There is one layout for "a step inside a step" that survives all five step
surfaces (create, edit, goal card, focus mode + MiniTimeline, journey
timeline) — or, if not, authoring and reading surfaces need different
expressions of the same language (feature shape Q1).

### What Was Built

`apps/native-rd/prototypes/a-substructure-layouts.html` — a self-contained HTML page at
phone-viewport size rendering the same goal, broken into substeps, on all five surfaces,
in the app's light-default token language (mirrored from
`packages/design-tokens`).

- **Three candidate layouts**, structurally different, switchable via
  `?layout=` / arrow keys:
  - **Option 1 — Indentation:** children are indented rows under a left rail;
    reading surfaces lead with the leaf, parent as quiet context.
  - **Option 2 — Containment:** a parent is a container card that physically
    holds its parts; reading surfaces lead with the parent.
  - **Option 3 — Breadcrumb:** lists stay flat; hierarchy lives in a parent chip on
    each child; reading surfaces lead with leaf + chip.
- **Three datasets** (`?data=`): Tomás mid-work (primary scenario), Tomás
  circuits-done (the Q9 parent-invite moment), Sam step work (the Q6 depth
  stressor — observed, not resolved).
- **Two views:** all five surfaces under one layout, or one surface across
  all three layouts side by side (the "fails one surface, fails" comparison).

**Medium:** HTML layout pass — the lowest rung that can show 3
layouts × 5 surfaces side by side in the app's token language; chosen per
the Stage 1 medium table. Device ergonomics, tap-count friction, and the
cold-return test still need the dev-flag app rung for whichever layout
survives.

Run: `open apps/native-rd/prototypes/a-substructure-layouts.html`

### Scenario Tested

Primary: Tomás and the practice panel — "Build practice panel" broken
into the three circuits (15-amp lighting, 20-amp small-appliance, 240V
dryer), each with its own evidence. Secondary stressor: Sam's step work
slice, run once to observe where one level pinches (Step 4's inventory
already wants its own sub-parts).

### Observations

_Pending — fill in after a review session with the prototype._

- Q1 (one layout vs authoring/reading split):
- Q2 (goal card: parent vs leaf on cold return):
- Q3 (focus snap + MiniTimeline with children):
- Q4 (journey rendering of children):
- Q5 (add-substep presence-pressure at create):
- Q6 (where one level pinched — verbatim, for the depth register row):
- Q7 (add-substep placement + tap count in edit):
- Q8 (legibility with 3–5 children vs outline-feel):
- Q9 (parent invite after last child completes):
- Q10 (parent's view of substep evidence):

**Evidence weight:** self-testing only so far — caps the outcome at
revise / split / more prototyping; graduation requires a real ND-user
session.

### Guardrail Check

_To be answered against the session, not the artifact's intent._

- [ ] **No auto-state:** time passing never changed a Step's state anywhere in
      this prototype (applies to marker, deadline, and recurrence alike).
- [ ] **Absence is uninterpreted:** no surface scored, counted, aggregated,
      prompted about, or drew a conclusion from an absence (unfilled slot,
      passed date, blank note).
- [ ] **Dependencies inform, never enforce:** nothing was blocked, hidden, or
      dimmed because a dependency wasn’t satisfied or a prerequisite was
      incomplete.
- [ ] **Waiting is not failure:** n/a — not exercised.
- [ ] **G opt-in is structural:** no review prompt, completion trigger, nudge,
      score, or per-goal-type default appeared.
- [ ] **The calendar holds repetition:** n/a — not exercised.
- [ ] **No app-icon badge counts:** n/a — not exercised.
- [ ] **Task-view promise holds:** "one next step per active goal" survived —
      goal card and focus mode still resolve to one next thing.
- [ ] **H preserves, never replaces:** n/a — not exercised.
- [ ] **No composed verdicts:** no combination of surfaces accidentally
      implied a score, streak, or judgment.

### Decision

_Pending._ (Continue, revise, split, defer, remove from Phase B, or escalate
to ADR. Self-testing alone caps at revise / split / more prototyping.)

### New Questions

_Pending._ Candidates already visible in the artifact, to confirm or strike
during review:

- Progress counting: does the goal card's `N/M` count every unit (parents +
  children), leaves only, or top-level only? The prototype counts every unit
  and annotates it as open.
- G3's reorder problem: in a flat list with chips, reordering can silently
  move a child away from its parent — is that disqualifying for edit?
- Step numbering is layout-dependent (2a/2b vs part 2 of 3 vs continuous
  1–6) — does any of these mislead on cold return?

### Recommended Follow-Up

_Pending._ Expected next rung per the feature shape: whatever layout
survives moves to a throwaway dev-flag screen for ergonomics and the
cold-return test. Update the depth question's register row with Q6 evidence
and leave it open.
