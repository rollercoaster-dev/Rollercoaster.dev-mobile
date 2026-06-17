# Prototype Record — C: Dependencies (merges C-order + C-waiting)

Feature shape: [phase-b-feature-shapes.md §C](../phase-b-feature-shapes.md#c-dependencies-merges-c-order--c-waiting)
Conventions: [phase-b-stage-0-deliverables.md](../phase-b-stage-0-deliverables.md)

## Prototype: C — dependency-marker treatments × task-view fork (2026-06-16)

### Hypothesis

There is one dependency-marker language that holds across all five step
surfaces and across both targets — internal (step→step) and external
(step→person/org/event) — that **informs without ever enforcing**; and the
open task-view fork (does "one next step" name a waiting step and stay put, or
route around to the next actionable step?) can be resolved by seeing both
behaviors side by side, including the extreme where every pending step is
waiting (Ava). Marker wording is "after / depends on" (internal) and "waiting
on … expected ⟨date⟩" (external) — never "blocked by" (feature shape Q1–Q3).

### What Was Built

`apps/native-rd/prototypes/C-dependencies.html` — a self-contained HTML page at
phone-viewport size, light-default token language mirrored from
`packages/design-tokens` (CSS shared with `a-substructure-layouts.html` so the
comparison measures the treatment, not HTML aesthetics).

- **Three candidate marker treatments**, switchable via `?treatment=` / arrow
  keys:
  - **Inline** — the relation as a quiet sub-line under the step title (lowest
    ink; whispers).
  - **Chip** — a tappable pill carrying the relation (internal = purple,
    external/waiting = amber + expected date).
  - **Connector** — an explicit arrow-led callout, plus an actual tie line on
    the journey between prerequisite and dependent (most graph-like; the only
    treatment that draws the relation as a relation).
- **Task-view fork as a toggle** (`?taskview=`): **name-and-stay** vs
  **route-around**. Affects the Goals card and Focus snap only. In both, every
  waiting step stays fully visible — nothing is blocked, hidden, dimmed, or
  disabled (guardrail). Route-around names the soonest waiting step in a quiet
  note — never a count (guardrail); when nothing is actionable (Ava), it shows
  the honest "everything here is waiting on other people — that's the system,
  not you" panel.
- **Three scenarios** (`?data=`): **Tomás** (internal ordering, with one
  already-satisfied dependency to see whether a met dependency reads as quiet
  history), **Ava** (external — every pending step waiting, the route-around
  extreme), **Combined** (one step stacking an internal + external marker, the
  Q7 legibility stressor).
- **Two views** (`?view=`): all five surfaces under one treatment, or one
  surface across all three treatments side by side.

**Medium:** HTML clickable comparison — the lowest rung that can show 3
treatments × 5 surfaces × 3 scenarios × 2 task-view behaviors side by side in
the app's token language; chosen per the prototype plan's medium menu (C's
first questions are marker-display and task-view-routing questions, which are
exactly the "compare the presentations" case HTML serves cheaply). Tap-count
friction for setting/clearing a dependency, cold-return reading of the Ava
goal, and the ND-user gate still need the dev-flag app rung afterward.

Run: `open apps/native-rd/prototypes/C-dependencies.html`

### Scenario Tested

See above — Tomás (internal), Ava's four-month wait (external), and a combined
Tomás-panel goal. Grounded in
[step-model-gap.md](../research/step-model-gap.md) (§ C-order, § Ava and the
four-month wait).

### Observations

Session: an analytical walkthrough on 2026-06-17 — every treatment × surface ×
scenario × task-view state read from rendered screenshots of
`C-dependencies.html` (served over HTTP at phone-viewport). This is the
**weakest** evidence tier, weaker still than Joe's own lived self-testing: a
cold structural read in one sitting, not lived use. The Ava cold-return test,
tap-count-under-load for set/clear, and the ND-user gate are all still ahead.
Read the calls below as "what the treatments show," not "what a day with them
proved."

The headline: **the wording holds everywhere; the open work is treatment and
task-view, and neither is resolvable by reading.** "after / depends on"
(internal) and "waiting on … expected ⟨date⟩" (external) read as informative in
all three treatments — nothing produced "blocked by" or a "you're late"
register. No treatment wins outright: inline is the calmest and the only one
with no defect; chip clips external markers on the narrow card; connector is
the only one that draws the relation but is also the one that reads as a
constraint graph. Both task-view variants render honestly and both keep exactly
one featured thing per goal — the choice between them is a lived/ND question,
not a structural one.

- **Q1 (what the marker says):** Across all three treatments, internal "after
  ⟨step⟩" reads as ordering, not constraint; a _satisfied_ internal dep flips
  to green "after Plan layout & buy materials ✓" and reads as quiet history
  rather than a live blocker. External "⏳ waiting on the PIA's calendar ·
  expected Jun 12" names the world's actor and timing. No "blocked by," no
  lateness register, anywhere. Wording is settled; treatment is not.
- **Q2 (what an unsatisfied dep shows per surface):** Recorded per surface —
  create/edit show the marker under the step title with an opt-in add
  affordance (Q5); the goal card shows it only when the _featured_ step is
  itself waiting; focus shows it under the title plus a dashed-amber strip node
  (Q8); journey carries it on every card. No surface dropped the marker or
  rendered it as a blocker. The one surface-specific failure is chip overflow on
  the phone card (Q7).
- **Q3 (task-view fork):** Both behaviors resolve to exactly one featured thing
  per active goal. **Route-around** features the next _actionable_ step and
  names the bypassed wait in a quiet amber note — Combined → "Wire the circuits"
  as hero + "⏳ Also waiting: Book city inspector (expected next week)"; when
  _nothing_ is actionable (Ava) it shows the honest panel: "Everything here is
  waiting on other people right now — that's the system, not you. Soonest:
  Intake appointment — expected Jun 12." **Name-and-stay** features the
  chronological next even when waiting — Ava → "Intake appointment · waiting on
  the PIA's calendar · expected Jun 12." Both read as legitimate waiting,
  neither as a verdict. The fork is **not** decided by the read: whether
  name-and-stay's repeatedly-featured powerless step re-creates a self-blame
  loop, or route-around's reorder feels like the app hiding the real next, is a
  lived/ND-gate question. Both carried live (Joe's call, 2026-06-17).
- **Q4 (one language or two):** One _structure_, two _registers_. Internal and
  external share the marker shape (sub-line / chip / callout) and differ by verb
  ("after" vs "waiting on") and palette (internal purple/muted, green when met;
  external amber + mono date). They cohere where both stack on one step (Q7) —
  not two separate languages, not a single flattened one.
- **Q5 (where setting a dep lives):** The "+ depends on…" affordance is a small
  dashed control that appears **only** on a step with no dependency yet; a step
  that already carries one shows its marker + an × remove, never the add-nag.
  The standing ghost row — "A step with no dependency stays first-class —
  nothing here invites adding one" — reinforces that a plain step is complete.
  Lowest presence-pressure; honors "must not feel required." Tap-count to
  actually set/clear is still a dev-flag-rung question — the affordance is
  shown, not exercised.
- **Q6 (journey rendering):** Inline carries the relation as text down the spine
  — calm, but the relation is implied, not drawn. Chip names it per card but
  clips external markers. Connector is the only treatment that draws the
  relation _as a relation_ — a tie-line from a dependent card up toward its
  prerequisite node — and that tie-line is exactly where the "constraint graph"
  risk shows: the purple rail reads graph-like, the line the guardrail warns
  about. The trade is "shows the relation" vs "reads as a story"; no treatment
  wins the journey outright.
- **Q7 (two stacked markers):** The Combined "Inspection & labels" (internal
  "after Wire the circuits" + external "waiting on the city inspector · expected
  after booking") stays legible **inline** (two calm sub-lines) and as
  **connector** (two callouts, but heavy — real vertical room). **Chip fails
  here:** the external chip overflows the 360px card and clips its date —
  observed on Journey _and_ Edit. Stacking two markers did not make the step
  read as "blocked" in any treatment — it read as "comes after one thing, waits
  on another."
- **Q8 (MiniTimeline waiting node):** Yes — a waiting node renders dashed-amber,
  visibly distinct from a plain pending node, with the legend "⏳ dashed amber =
  waiting on a dependency (still selectable)." The strip shows _that_ a node
  waits, not _what_ it waits on — a per-node state mark, not a relation. On Ava
  every pending node is dashed-amber, so the post-done track is a wall of amber;
  it frames the reality honestly and the legend keeps it from reading as alarm.
  No verdict implied.
- **Q9 (route-around de-emphasis → hiding?):** No. The bypassed waiting step is
  named in a visible amber note directly under the featured step on the goal
  card, and stays fully present (undimmed, selectable) on focus, journey, and
  edit. De-emphasis means "not the hero," never "hidden or dimmed." Defensible
  on the read; whether it _feels_ like hiding in lived use is an ND-gate
  question.
- **Q10 (expected date — C or B):** Observed, not resolved. The expected date
  lives inside the external marker and names the world's timing ("expected Jun
  12," "expected next week," "late Jul") — C's sense (the world's state),
  distinct from B's date (the user's intended deadline). Where a waiting step
  also carries a B deadline the two dates would co-exist and mean different
  things; recorded for B + C integration, not decided here.

**Evidence weight:** analytical self-testing only (Claude, 2026-06-17) — caps
the outcome at revise / more prototyping. Graduation to a schema/relationship
ADR or design decision requires a real ND-user session; even Joe's own lived
self-testing on the dev-flag rung is still pending.

### Guardrail Check

Answered against the session.

- [x] **No auto-state:** PASS — and the test is now real, not hypothetical:
      Ava's "expected Jun 12" sits in the past relative to the walkthrough date
      (2026-06-17), and the step still reads "waiting · expected Jun 12," not
      "overdue" and not auto-met. A passed expected date changed nothing.
- [x] **Absence is uninterpreted:** PASS — no surface scored, counted, or
      prompted on an unmet dependency.
- [x] **Dependencies inform, never enforce:** PASS — the load-bearing line.
      Nothing was blocked, hidden, dimmed, disabled, or refused in any
      treatment or task-view variant; the "Mark … complete" action stayed live
      on every waiting step, with "Still your call — if it happened, mark it
      done. Nothing here is locked." For an external wait, completing it _is_
      "the event happened."
- [x] **Waiting is not failure:** PASS — external markers and the Ava panel
      name the world's timing ("that's the system, not you"); no "overdue,"
      "behind," or "why haven't you" appeared.
- [x] **No auto-judgment:** PASS — see No-auto-state; the passed Jun 12 date did
      not flip the dependency or the step ([ADR-0012](../decisions/ADR-0012-no-auto-judgment.md)).
- [x] **G opt-in is structural:** N/A — not exercised.
- [x] **The calendar holds repetition:** N/A — not exercised.
- [x] **No app-icon badge counts:** PASS — no app icon in the prototype; the
      route-around note names a _specific step_ ("Also waiting: Book city
      inspector"), never a count, and no surface aggregated waits into a number.
- [x] **Task-view promise holds (under BOTH variants):** PASS — both name-and-stay
      and route-around resolve to exactly one featured thing per active goal,
      including Ava's all-waiting case (the honest panel _is_ the one featured
      thing).
- [x] **H preserves, never replaces:** N/A — not exercised.
- [x] **No composed verdicts:** PASS — no surface combined waits into a score,
      streak, or judgment; waiting pills/markers never read as a ledger.

### Decision

**Revise / more prototyping** (self-testing caps the outcome here; cannot
graduate to a schema/relationship ADR or design decision without the ND-user
gate). Per Joe's call (2026-06-17), **eliminate nothing** — both task-view
variants and all three treatments stay live into the next rung. Concretely:

1. **Both task-view variants stay live → the ND gate decides.** The read can't
   distinguish them; the distinguishing question (self-blame loop vs
   hiding-the-real-next) is lived/ND territory. No leading candidate named.
2. **All three treatments stay open**, but the two observed defects must be
   fixed before/at the next rung so the comparison stays clean: (a) the **chip**
   external-marker overflow on the 360px card, and (b) the **connector**
   external glyph (⤧ reads as opaque; inline/chip use the clear ⏳) and the
   journey tie-line's graph-feel.
3. **Q10 (expected date C vs B) stays open** for B + C integration; observed,
   not resolved.

### New Questions

Confirmed from the artifact and sharpened, plus new:

- **The fork, sharpened (ND gate):** does name-and-stay's repeatedly-featured
  _powerless_ step re-create a self-blame loop for an ND user, or does
  route-around's reorder read as the app hiding the real next step? The two
  variants are structurally equal on the read; only lived use separates them.
- **Chip overflow — fixable or fatal (new):** is the external chip salvageable
  on a 360px card (wrap, truncate-with-affordance, drop the date to a second
  line), or does the overflow disqualify chips for external markers?
- **Connector graph-feel — inherent or fixable (Q6 tail):** can the relation be
  _drawn_ (the tie-line) without reading as a constraint graph, or is "draws the
  relation" inherently in tension with "reads as a story"?
- **External glyph (new):** ⤧ is semantically opaque; ⏳ is clear. Should the
  connector adopt ⏳ for external to match inline/chip, or does the callout need
  its own glyph?
- **Passed-date wording (new, surfaced by the date now sitting in the past):**
  Jun 12 shows as plain "expected Jun 12" with no staleness cue — correct per
  no-auto-judgment. Open: is a _neutral_ past-tense ("was expected Jun 12")
  warranted once the date passes, or does any past-tense framing risk leaning
  toward "you're late"?

### Recommended Follow-Up

- Carry **both** task-view variants and **all three** treatments (with the chip
  overflow and connector glyph/tie-line defects fixed) to a throwaway dev-flag
  screen for: tap-count to set/clear a dependency, the Ava cold-return read
  ("they're not ready yet" after a day away), and the fork's lived feel.
- Update the **Dependency display** and **C + task view** rows of the
  [Open Questions Register](../phase-b-step-model-prototypes.md#open-questions-register)
  with this evidence — both left **open** (treatment undecided; fork undecided).
- Graduation to a schema/relationship ADR or design decision is gated on a real
  ND-user session per the plan's Evidence Sources — analytical and lived
  self-testing both cap below that gate.
