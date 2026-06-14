# Prototype Record — E: Step states (formerly Richer state vocabulary)

Feature shape: [phase-b-feature-shapes.md §E](../phase-b-feature-shapes.md#e-step-states-formerly-richer-state-vocabulary)
Conventions: [phase-b-stage-0-deliverables.md](../phase-b-stage-0-deliverables.md)

## Prototype: E — state palette + behavior pass (2026-06-14)

### Hypothesis

A short set of colored, renameable step states — `pending`, `in-progress`,
`paused`, `completed` — reads as the user's own vocabulary
(not database-speak), stays legible across the ND palettes, and routes the "one
next step" readout correctly, all **without the app ever authoring a judgment**:
the only automation is the bookkeeping `in-progress` pointer; `paused` and
`completed` are user-set, and time changes nothing (feature shape
§E, the no-auto-judgment line of [ADR-0012](../decisions/ADR-0012-no-auto-judgment.md)).
(A fifth candidate, `missed`, was prototyped behind a toggle and has since been
**cut** — see Q1 below: there are no temporal states, so nothing can be "missed.")

### What Was Built

`apps/native-rd/prototypes/E-step-states.html` — a self-contained HTML page,
two views in one file (mirroring A's gallery + flow split), with the state pill
mirrored from `StatusBadge.styles.ts` and the palette tokens mirrored from
`packages/design-tokens`.

- **Palette & naming view** (`?view=palette`) — a **static parallel gallery**:
  the state set rendered as pills across **light-default /
  highContrast / autismFriendly** side by side, with a shared inline rename row.
  Built to answer Q1 (which states earn a
  place), Q2 (do the base names read right), Q3 (color + word legibility across
  palettes), Q4 (does renaming make a state feel like the user's).
- **Behavior view** (`?view=behavior`) — an **interactive clickable phone**
  driving Tomás's practice panel (4 flat steps). Tapping a step's pill reveals
  the state options; setting a state drives the app-maintained `in-progress`
  pointer (auto-advance on pause/complete), the "one next step" readout, and the
  all-paused edge. A session-script panel auto-checks six milestones as you
  exercise them. Built to answer Q5 (paused routing + the all-paused tail) and
  Q6 (auto-advance reads as helpful vs deciding-for-you). **Deliberately no time
  element** — dates/deadlines are Stage 3 / B, and nothing advances with the
  clock.

**Medium:** HTML — the rung where states can be both _named_ (the gallery's
rename + palette comparison) and _seen behaving in a list_ (the clickable
flow), per the Stage 1 medium table ("Paper or HTML; move up only when naming
stabilizes"). The felt reads — does a rename make a state feel like _theirs_,
does auto-advance feel helpful or presumptuous — still need the dev-flag app
rung and a real ND-user session.

Run: `open apps/native-rd/prototypes/E-step-states.html`

### Scenario Tested

Tomás's practice panel — "Build practice panel" as four steps (plan & buy,
wire lighting circuit, wire appliance circuit, inspection & labels). The
behavior view exercises pausing the in-progress step, watching the next become
in-progress, routing the readout past a paused step, and pausing/skipping every
remaining step to hit the parked edge. The
[CONTEXT.md missed-weekends dialogue](../../CONTEXT.md) — the case that tempted
a `missed` state — is **named but not lived**: the prototype has no time
element, so that pressure is only ever applied by a hand-tap, never felt. (That
absence is exactly why `missed` was cut — see Q1.)

### Observations

Session: an analytical walkthrough on 2026-06-14 — both views read from the
rendered prototype, and the palette token claim cross-checked against
`packages/design-tokens/build/unistyles/variants.ts`. This is the **weakest**
evidence tier (Claude self-testing, no lived use and not even Joe's own), so the
calls below are "what the prototype shows," not "what a day with these states
proved." The felt questions — Q4 (rename feels like mine) and Q6 (auto-advance
feels helpful) — cannot be answered at this tier at all; they are recorded as
non-answers with what blocks them.

The headline: **the four-state spine (`pending`, `in-progress`, `paused`,
`completed`) holds, the no-auto-judgment line holds cleanly, and the one
genuinely sharp finding is about color, not words** — the state accent colors
(`accentYellow`, `accentMint`, `accentPurpleLight`) are _not_ in the
highContrast or autismFriendly override sets, so a state pill renders the
identical color in all three palettes. Whether that constancy is the feature or
the bug is the question E now has to answer.

- **Q1 (which states earn a place) — RESOLVED, `missed` cut:** The
  four-state spine is clearly load-bearing — `pending`, `in-progress`,
  `paused`, `completed` each carry a distinct, nameable meaning in the flow.
  `missed` was prototyped behind an include-in-set toggle (default off), set
  only by hand. It is now **cut**: E has no temporal states — nothing advances
  with the clock — so the app can never author "missed," and a hand-set
  "missed" is indistinguishable in meaning from the user-set `paused` that
  already says "set this aside." With no time element there is nothing to miss,
  so the state earns no place. The four-state spine is the set; `missed` is not
  in it (and not in the schema).
- **Q2 (do the base names read right; is "pending" database-speak):**
  "in progress," "paused," and "completed" read as plain user words. **"pending"
  still reads like database-speak** — it's the one base name that sounds like a
  status column, not something a person says about their own step. This is the
  open **E word pools** question made concrete: whether `pending`/`completed`
  keep their current UI names is unresolved, and "pending" is the first
  candidate for a warmer word from the pool.
- **Q3 (color + word legibility across palettes — the sharp result, VERIFIED):**
  In `build/unistyles/variants.ts`, the `highContrast` and `autismFriendly`
  overrides change text / border / background and `accentPrimary` /
  `accentPurple` — but **not** `accentYellow`, `accentMint`, or
  `accentPurpleLight`. So `in-progress` (yellow), `completed` (mint), and
  `paused` (lavender) render the **identical** color in all three palette
  columns. The stress case is the autismFriendly column: the neon yellow
  survives a palette whose entire job is muted, low-stimulation color. Legible,
  yes — the word always rides beside the color, so nothing is lost — but the
  color-as-identity choice is currently _palette-invariant by accident of which
  tokens got overridden_, not by decision. This is the finding most ready to
  graduate (see Decision / New Questions).
- **Q4 (does renaming make a state feel like the user's):** Mechanically sound —
  a rename rides _beside_ the color and never replaces it (color = identity,
  word alongside), live across both views, honoring the "color is never the sole
  carrier" guardrail. **Whether it makes a state feel like theirs vs. just adds a
  configuration step is a felt question this tier cannot answer** — recorded as a
  non-answer pending real use.
- **Q5 (paused routing + the all-paused tail):** Works as the task-view contract
  requires. The "one next step" readout shows the `in-progress` step if one
  exists, else the first `pending` step, **routing past `paused` and
  `completed`**. When every remaining step is paused it resolves to a
  _parked_ readout — "No step is in progress. N paused — all still
  here, none hidden" with "absence is left uninterpreted — no score, no nudge, no
  count on anything." A paused step stays visible in the list; nothing is hidden.
  This is the cleanest pass in the prototype.
- **Q6 (auto-advance: helpful vs deciding-for-you):** The mechanic is correct
  and reversible — pausing/completing the `in-progress` step hands the pointer to
  the next `pending` step; setting `in-progress` on any step by hand clears it
  from the one that had it (the override). It asserts nothing about the user — it
  tracks where they are. **Whether the auto-advance _feels_ helpful or
  presumptuous is the felt question, unanswerable here.** A real gap: the 4-step
  _linear_ panel always advances to the next step in order, so the "advances to a
  step the user didn't want next" hazard from the feature shape is **never
  exercised** — it needs a non-linear scenario (or A's substeps) to stress, and
  only then does "is a hand-override enough, or must auto-advance be opt-in?"
  become testable.

**Evidence weight:** analytical self-testing only (Claude, 2026-06-14) — caps
the outcome at revise / more prototyping. The Q3 token finding is verified
against source and is the one strand close to a design/token decision, but even
it wants on-device confirmation that palette-invariant state color is a real
problem in highContrast/autismFriendly, and the felt questions (Q4, Q6) are
gated on a real ND-user session.

### Guardrail Check

Answered against the session. Source checklist:
[phase-b-stage-0-deliverables.md §Guardrail checklist](../phase-b-stage-0-deliverables.md#guardrail-checklist).

- [x] **No auto-judgment:** PASS — time changes no state (the prototype has no
      time element at all), and the app authors no verdict. The only automation
      is the `in-progress` pointer advancing on pause/complete — bookkeeping the
      user would otherwise do by hand, exempt per ADR-0012. `paused` and
      `completed` are set only by a user tap.
- [x] **Absence is uninterpreted:** PASS — the all-paused parked readout
      explicitly leaves absence uninterpreted: "all still here, none hidden …
      no score, no nudge, no count on anything." Nothing scored or aggregated a
      not-done step.
- [x] **Dependencies inform, never enforce:** N/A — not exercised (dependency
      display is C, Stage 2); nothing was blocked, hidden, or dimmed.
- [x] **Waiting is not failure:** N/A — no external dependency present. Noted:
      `paused` is framed as "can be skipped," user-set, never an implication of
      fault — adjacent to this guardrail and consistent with it.
- [x] **G opt-in is structural:** N/A — not exercised; no review prompt,
      completion trigger, nudge, score, or per-goal-type default appeared.
- [x] **The calendar holds repetition:** PASS — the prototype deliberately bakes
      in **no** time/repetition/Slot model; nothing advances with the clock.
- [x] **No app-icon badge counts:** N/A — no app icon in the prototype; and it
      explicitly counts nothing (the parked readout names the paused total as
      a sentence, not a ledger badge).
- [x] **Task-view promise holds:** PASS — "one next step" always resolves to one
      thing (the in-progress step, else the first pending step, else a parked
      "none — still here"), routing past paused/completed (Q5).
- [x] **H preserves, never replaces:** N/A — not exercised (H is Stage 4); no
      step was deleted or overwritten.
- [x] **No composed verdicts:** PASS — no surface combines states into a score,
      streak, or judgment; states are not counted or aggregated anywhere.

### Decision

**Continue + more prototyping** (self-testing caps the outcome here; the
felt-experience questions cannot graduate without the ND-user
gate). Concretely:

1. **Carry the four-state spine forward** — `pending`, `in-progress`, `paused`,
   `completed` each earn their place; the pill mechanic (color = identity, word
   rides beside, user can set any state by hand) and the bookkeeping pointer all
   hold against the guardrails.
2. **`missed` is cut** (Q1) — there are no temporal states, so nothing can be
   "missed," and a hand-set "missed" is indistinguishable from the user-set
   `paused` that already says "set this aside." Not in the state set, not in the
   schema.
3. **The Q3 color finding is the one strand ready to escalate** — state accent
   colors are palette-invariant today _by accident of the override sets_, not by
   decision. Decide deliberately: variant-aware state-color tokens, or
   color-as-identity intentionally held constant across palettes. This is a real
   token/design question, not a display nit — but confirm on-device before it
   graduates to an ADR.
4. **"pending" naming + word pools stay open** (Q2) — feeds the existing
   **E word pools** row of the Open Questions Register.

### New Questions

- **Variant-aware state-color tokens vs. constant color-as-identity (new,
  concrete from Q3):** should `accentYellow` / `accentMint` / `accentPurpleLight`
  gain highContrast / autismFriendly overrides so state colors adapt, or is a
  state's color meant to be the _same_ color everywhere (identity), with the
  palettes adapting only their chrome around it? The neon-yellow-in-autismFriendly
  case is the stress test. Most graduation-ready output of this prototype.
- **"pending" / "completed" UI names (confirms E word pools register row):**
  "pending" reads as database-speak; whether these two keep their UI names or
  draw a warmer word from the pool is unresolved.
- **Auto-advance to an unwanted step (new, Q6 tail):** a linear panel never
  advances to a "wrong" next step, so the hazard — and the "hand-override enough
  vs. opt-in auto-advance" follow-up — is untested. Needs a non-linear scenario
  or A's substeps to stress.
- **Rename scope + editable pools (new, Q4 tail):** is a rename per-state-global
  or per-step, and are the word pools themselves user-editable? Not exercised.
- **Color-only carriers — dots & mini-timeline nodes (new, from focus view):** a
  ProgressDot / MiniTimeline node has no room for a word, so `paused`
  rides on color alone — the first real stress on "color is never the sole
  carrier." Does a color-only paused dot read correctly at a glance? Felt /
  on-device; recorded as a non-answer. (The timeline color decision below means
  it's at least the _same_ color as the pill — but a dot still has no word.)
- **Progress ratio vs. verdict (new, from timeline view):** `completed / total`
  keeps every step in the denominator, but a `paused` step under a completion
  ratio is where "no composed verdicts / absence uninterpreted" gets tested.
  Does "X of Y complete" _feel_ like a judgment over the paused step? Felt read.
- **RESOLVED — timeline node color language:** the `blue600`-vs-pill split is
  reconciled onto the state color language (a state is one color everywhere). No
  longer open; carried into the build and the Q3 color-as-identity answer.

### Focus & Timeline views — built (2026-06-14)

The behavior view tested the states in a generic flat panel. The two real
surfaces that show step state don't match that shape and only know three states,
so two more views were added to `E-step-states.html` — `?view=focus` and
`?view=timeline` — reusing the existing pill, rename strip, shared `steps`
engine, and 3-palette infra. Progress tracking stays in — keeping track of
what's done and how far along the user is is the point, not a guardrail problem.
Evidence tier is unchanged: analytical self-testing only (Claude), so the calls
below are "what the views show," and the felt reads stay gated on a real
ND-user session.

**Focus view** (mirrors `FocusModeScreen.tsx`) — MiniTimeline strip + swipeable
CardCarousel (one step per card) + ProgressDots, snap-to-first-pending on entry
(`findFirstPendingIndex`). `in-progress` is _not stored_; it's the centred card
(`index === cardIndex`). Two findings the flat panel structurally could not show:

- **Color becomes the sole carrier.** The pill always rode a word _beside_ the
  color; a ProgressDot and a MiniTimeline node have no room for a word, so
  `paused` is carried by **color alone**. This is the first real
  stress on the "color is never the sole carrier" guardrail. Whether a
  color-only paused dot reads correctly at a glance is a felt/on-device
  question — recorded as a non-answer.
- **"Current card" vs. a paused pill collide.** Because current is the centred
  card and not stored, you can park _on_ a paused card: the pill says
  paused, the ring/dot says current. The flat view never had two independent
  currency signals to disagree.

**Timeline view** (mirrors `TimelineJourneyScreen.tsx`) — a progress bar +
`completedCount / total` over a vertical run of big nodes (✓ / number / ⏸
glyphs, ★ goal node). Two things it surfaces:

- **The two color languages were reconciled (decision).** The real `TimelineNode`
  is hard-wired to `palette.blue600` — a _different_ color language than the
  StatusBadge pill the prototype mirrors, so timeline and card surfaces don't
  even agree on `completed` today. **Decision (Joe, 2026-06-14): carry the state
  color language (the pill's) into the timeline nodes** — a state is one color
  everywhere it appears (pill, dot, mini node, big node). The `blue600` split was
  an accident of two components evolving separately, not a decision worth
  keeping. This now reinforces the color-as-identity answer to Q3.
- **Progress bar vs. verdict.** `completed / total` keeps every step in the
  denominator (nothing dropped or hidden), but a `paused` step sitting under a
  completion ratio is exactly where "no composed verdicts / absence
  uninterpreted" gets tested. Whether "X of Y complete" _feels_ like a judgment
  over the paused step is the felt read.

**Every status-rendering surface is still hardwired to 3 states in-app** (would
all need `paused` when this graduates): `TimelineNode.styles.ts`
(`palette.blue600`), `MiniTimeline`, `ProgressDots`, `StepCard`
(`statusToVariant`), `TimelineStep` (`statusToVariant` + `statusToLabelKey`
i18n), `StatusBadge` (active/completed/locked/earned), `GoalCard`/`GoalsScreen`
(`stepsCompleted/stepsTotal`, `nextStepTitle = find(isPendingStep)`), and
`db/queries.ts` (`isPendingStep`, `findFirstPendingIndex`). UI type:
`src/types/steps.ts`; DB enum (only `pending`/`completed`): `src/db/schema.ts:43`.

### Recommended Follow-Up

- Build a **dev-flag screen** and run a **real ND-user session** with the
  missed-weekends scenario to answer the felt questions this tier can't: does a
  rename feel like _theirs_ (Q4), does the auto-advance feel helpful or
  presumptuous (Q6). Use a non-linear / substep composition so the
  Q6 "unwanted next step" hazard is actually exercised.
- Take the **Q3 color finding** to a decision after on-device confirmation:
  variant-aware state-color tokens vs. constant color-as-identity. This is the
  most ADR-ready output — likely a small token / design decision — but verify
  the palette-invariance is a real legibility/stimulation problem in
  highContrast and autismFriendly first.
- Update the **E word pools** row of the Open Questions Register: color =
  identity and rename-rides-beside-color are confirmed sound; "pending"/
  "completed" UI names and pool authoring/editability stay open.
- Graduation to a schema ADR, design decision, or implementation issue is gated
  on a **real ND-user session** per the plan's Evidence Sources — analytical
  self-testing caps below that gate.
