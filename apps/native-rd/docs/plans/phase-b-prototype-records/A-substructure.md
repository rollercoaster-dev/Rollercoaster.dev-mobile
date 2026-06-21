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

Session: an analytical walkthrough on 2026-06-13 — every layout × surface ×
dataset state read from rendered screenshots of `a-substructure-layouts.html`.
This is the **weakest** evidence tier, and weaker still than Joe's own
self-testing: a cold structural read in one sitting, not lived use. The
cold-return test (Q2), tap-count-under-load (Q5/Q7), and the ND-user gate are
all still ahead. Read the calls below as "what the layouts show," not "what a
day with them proved."

The headline: **no single layout survives all five surfaces — but the fault
line is not authoring-vs-reading. It is the goal card vs everything else.**
Containment wins the working/authoring surfaces; indentation wins the goal
card; breadcrumb is the most uniform but buys uniformity by flattening
structure away where it matters and carries a correctness hazard.

- **Q1 (one layout vs split):** Not one layout, and not a clean
  authoring/reading split. Containment (enclosure = "these parts belong to
  this step") is strongest on create, edit, focus, and journey. Indentation
  (leaf-led) is strongest on the goal card. Breadcrumb is the most uniform but
  loses structure on the MiniTimeline strip and is hazardous in edit. Most
  promising direction: **containment as the base language, with the goal card
  rendered leaf-led** — a narrow, principled split, not a free-for-all.
- **Q2 (goal card: parent vs leaf):** Sharpest result. Leaf-led
  (indentation: leaf as hero + "↳ in Wire the circuits"; breadcrumb: leaf hero
  - parent chip) reads as a do-able next action. Parent-led (containment:
    "Wire the circuits" as hero, next leaf in a boxed inset) reads as the
    _project area_ and costs one extra read to reach the action — on the card
    whose entire contract is "one next step," surfacing a container is the wrong
    default. Lean: card shows the next pending **leaf** as hero, parent as quiet
    context. Held evidence-light until the after-a-day-away test on the dev-flag
    rung — a cold structural read is a weak proxy for cold return.
- **Q3 (focus snap + MiniTimeline):** Containment is the strongest focus
  surface — the parent card lists all parts with the active one highlighted
  (15-amp ✓, 20-amp active, 240V pending), directly serving the "hold the
  project gestalt" need from the gap doc; the strip encloses children in a
  pill so structure stays visible. Indentation's leaf card carries less local
  context but is fine. Breadcrumb's strip goes flat — structure disappears
  exactly where the working surface most needs it.
- **Q4 (journey rendering):** Containment's parents-only spine (parts behind a
  tap) and indentation's at-a-glance indented sub-spine both work for a
  reflective surface. Breadcrumb's continuous 1–6 numbering inflates "4 steps"
  into "6 nodes" and repeats the chip — riskiest. Low-stakes surface; again
  disfavors breadcrumb.
- **Q5 (presence-pressure at create):** Containment's "split into parts on
  demand" (the container appears only after you split) is the best answer —
  structure is available without every row nagging toward it, honoring the
  "must not feel required" guardrail. Indentation's per-row "+ sub" chip is
  the worst offender (a standing suggestion on every step). Breadcrumb's
  ⋯-overflow is lowest-pressure but least discoverable.
- **Q6 (where one level pinched — verbatim for the depth register):** One
  level holds Sam's Steps 1/2/3 cleanly, but **"Step 4 — inventory" is itself
  a multi-part thing that wants its own sub-structure** — that is where one
  level pinches. Matches the gap doc's prediction. Observed, not resolved;
  depth stays open for post-Stage-6.
- **Q7 (add-substep in edit):** 1 tap in both indentation (ghost "+ substep"
  row) and containment ("+ part" inside the container) — below the friction
  threshold. Breadcrumb hides it in ⋯ (2 taps). True tap-count-under-load
  still needs the dev-flag rung.
- **Q8 (legibility at 3–5 children):** At Sam's 4 children, containment
  resists outline-feel best — enclosure reads as "a card with parts," not a
  tree. Indentation tips toward a nested outline at 4–5. Breadcrumb stays flat
  but the repeated "STEP WORK" chips and the inflated "7 steps" count read as
  noise.
- **Q9 (parent invite after last child):** Verified clean (containment focus,
  circuits-done dataset): all three parts checked, a plain "Mark 'Wire the
  circuits' complete" checkbox, and the line "completing the parts changed
  nothing by itself — this stays your call." Manual, discoverable, never
  demanded — exactly the no-auto-complete guardrail.
- **Q10 (parent's view of substep evidence):** Child evidence (E1/E2 badges)
  surfaces at the parent level — inline in containment's part list, per-node
  in the journey; containment gives the clearest rollup. Open: whether a
  parent carries its **own** evidence drawer distinct from its children's (the
  focus drawer "Evidence E N" looks step-local). Minor; parked.

**Evidence weight:** analytical self-testing only (Claude, 2026-06-13) —
caps the outcome at revise / split / more prototyping. Graduation to a schema
ADR or design decision requires a real ND-user session, and even Joe's own
lived self-testing on the dev-flag rung is still pending.

### Guardrail Check

Answered against the session.

- [x] **No auto-state:** PASS — nothing changed state by time passing; parent
      completion is explicitly manual (Q9).
- [x] **Absence is uninterpreted:** PASS, with a flag — no surface scored or
      prompted on an absence, but the goal card's `N/M` counts every unit
      (parent + children), so all-children-done-parent-open reads as 5/6. That
      is a counting rule, not absence-scoring, but it needs deciding (see New
      Questions).
- [x] **Dependencies inform, never enforce:** N/A — not exercised; nothing was
      blocked, hidden, or dimmed.
- [x] **Waiting is not failure:** N/A — not exercised.
- [x] **G opt-in is structural:** PASS — no review prompt, trigger, nudge,
      score, or per-goal-type default appeared.
- [x] **The calendar holds repetition:** N/A — not exercised.
- [x] **No app-icon badge counts:** N/A — no app icon in the prototype; the
      in-app `E N` evidence badges and `N/M` progress are not icon counts.
- [ ] **Task-view promise holds:** PASS for indentation and breadcrumb (one
      leaf hero); **WOBBLES for containment's goal card**, which resolves to a
      parent/container rather than one next action. This is the one place the
      promise strains — and the core reason the goal card should be leaf-led.
- [x] **H preserves, never replaces:** N/A — not exercised.
- [x] **No composed verdicts:** PASS — no combination of surfaces implied a
      score, streak, or judgment (the progress bar is benign).

### Decision

> **Superseded by the ND-user gate session (2026-06-11) below.** The ND-user
> tier graduated indentation to implementation; the "split + more prototyping"
> outcome here was the analytical-tier ceiling and no longer governs. The
> structural observations above remain valid evidence.

**Split + more prototyping** (self-testing caps the outcome here; cannot
graduate to a schema/design decision without the ND-user gate). Concretely:

1. **No single layout wins — carry a hybrid to the dev-flag rung:**
   containment as the base language for create / edit / focus / journey, with
   the **goal card rendered leaf-led** (indentation's treatment). This is the
   one split the evidence supports.
2. **Eliminate breadcrumb.** It loses the MiniTimeline strip (Q3), carries a
   silent-reorder hazard in edit, and inflates step numbering (Q4/Q8). It is
   the most uniform layout, but uniform in the wrong direction.
3. **Depth stays open** (Q6) — graduates only after Stage 6 per the Open
   Questions Register.

### New Questions

Confirmed from the artifact and sharpened, plus new:

- **Progress counting (confirmed, now concrete):** the card counts every unit,
  so all-children-done-parent-open = 5/6. Decide between leaf-only,
  parent-satisfied-when-children-done, or every-unit. This is a real decision,
  not a display nit — it shapes what "almost done" means on the card.
- **Breadcrumb silent-reorder (confirmed → folded into the eliminate
  decision):** in a flat chip list, reordering can move a child away from its
  parent with no signal. Near-disqualifying for edit on its own.
- **Step numbering (confirmed):** continuous 1–6 misrepresents "4 steps";
  2a/2b and "part 2 of 3" preserve it. Favors the hybrid, disfavors breadcrumb.
- **Parent's own evidence (new, Q10 tail):** does a parent step get an evidence
  drawer distinct from the rollup of its parts' evidence?
- **Hybrid consistency (new):** does mixing containment-everywhere with a
  leaf-led goal card read as inconsistent — the card shows the leaf, the focus
  screen shows the container holding it? Only the dev-flag rung answers this.

### Recommended Follow-Up

- Build the **hybrid** (containment base + leaf-led goal card) as a throwaway
  dev-flag screen on a real device for: the cold-return test (Q2),
  tap-count-under-load (Q5/Q7), and outline-feel at 4–5 children (Q8).
  Breadcrumb is dropped — do not carry it forward.
- Update the **Substep depth** row of the Open Questions Register with the Q6
  verbatim ("Step 4 — inventory wants its own sub-structure") and leave it
  open.
- Graduation to a schema ADR or design decision is gated on a **real ND-user
  session** per the plan's Evidence Sources — analytical and lived
  self-testing both cap below that gate.

### ND-user gate session (2026-06-11)

**Session:** Joe — the app's primary-audience ND user — reviewed the three
layouts (Indentation / Containment / Breadcrumb) in
`apps/native-rd/prototypes/a-substructure-layouts.html` and **selected
indentation**. Drill-in (`apps/native-rd/prototypes/a-substructure-flow.html`)
was not part of this evaluation.

**Decision: graduate to implementation.**

- **Approved layout: indentation** — children indented under a left rail;
  reading surfaces lead with the leaf, parent as quiet context. Containment and
  breadcrumb dropped.
- **Task-view promise:** PASS — indentation's leaf-led goal card resolves to one
  next action, settling the wobble the 2026-06-13 analytical pass flagged for
  containment.
- **Evidence weight: ND-user.** This is the decisive tier and overrides the
  2026-06-13 walkthrough's lean toward containment-as-base.
- **Depth (Q6) stays open** — graduates only after Stage 6 per the Open
  Questions Register. This graduates the layout, not depth.

## Prototype: A — focus-mode step-card frame (2026-06-21)

### Hypothesis

The shipped substep grammar (#292) left three focus-mode step-card ergonomics
undecided: cards re-flow as content changes (carousel jitter), the evidence-add
path is drawer-only rather than a first-class card affordance, and the
parent ↔ substep tie in the focus carousel was never chosen. One prototype can
answer all three before they are built.

### What Was Built

`apps/native-rd/prototypes/a-focus-card-substructure.html` (PR #355) — a
self-contained phone-viewport page studying the focus-mode step cards in the
app's token language. Toggles: candidate (`?cand=A/B/C`), dataset
(`?data=mid` / `?data=done` for the Q9 invite state), and state words.

- **Stable card frame** (shared by all candidates) — a fixed-height envelope;
  body is a zoned scaffold (title · context · evidence) with the action pinned
  to a `.foot`, so the frame holds shape across cards.
- **Evidence rail** (shared) — a persistent "＋ Add evidence" affordance with
  captured-evidence chips and a "needed" marker for missing planned evidence.
- **Three parent-tie candidates:**
  - **A — Anchored leaf:** shipped sibling-card model + a persistent parent band
    pinned above each child card. No carousel-mechanic change; parent stays a
    bare card.
  - **B — Sub-deck:** a parent's substeps read as one grouped deck (shared left
    rail + pinned parent strip with part-progress, siblings peeking behind).
    Strongest parent tie; largest build surface (new carousel mechanic).
  - **C — Parent overview:** the parent becomes its own overview card (parts
    spine, evidence rollup, the manual "mark parent complete" Q9 invite); leaves
    follow as their own cards. Answers parent rollup (Q10) + Q9 invite home;
    costs two card archetypes and one extra read to a leaf's action.

### ND-user gate session (2026-06-21)

**Session:** Joe — the app's primary-audience ND user — reviewed the candidates
in `a-focus-card-substructure.html` (`?cand=C`) and **selected candidate C —
Parent overview.**

**Decision: graduate to implementation (issue #360).**

- **Approved parent-tie: C — Parent overview.** A and B dropped. C is chosen for
  giving the Q9 manual-complete invite and the Q10 evidence rollup a clear home
  on a dedicated overview card; the accepted costs are two card archetypes and
  one extra read to reach a leaf's action.
- **Stable frame and evidence rail** graduate as the shared (candidate-independent)
  base, unchanged from the prototype.
- **Sub-question calls (both confirmed to match the prototype, no deviation):**
  - Blocked-step foot keeps the **italic prompt text** (not a disabled checkbox).
  - Evidence rail sits in the **scrollable body zone** (not pinned above the foot).
  - Overview spine active-cell uses the existing `accentYellow` in-progress token;
    theme parity (`highContrast` / `autismFriendly`) to be verified at build.
- **Evidence weight: ND-user.** Decisive tier, same as the 2026-06-11 layout gate.
- **Depth (Q6)** remains out of scope — one level only, per #288.

Implementation path and the resolved-decision table live in the dev plan:
`apps/native-rd/docs/plans/dev-plans/issue-360-focus-step-card-frame.md`
(Phase 0 → 1 → 2 → 3C → 4; candidates A/B not built).
