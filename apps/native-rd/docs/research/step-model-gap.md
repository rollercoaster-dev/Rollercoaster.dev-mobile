# The Step Model Gap

**Date:** 2026-05-22
**Status:** In progress
**Owner:** Joe

**Scope reference:** [ADR-0001 §Iteration B](../decisions/ADR-0001-iteration-strategy.md) (amended by [ADR-0006](../decisions/ADR-0006-iteration-b-scope-amendment.md); Step-model scope superseded by [ADR-0010](../decisions/ADR-0010-phase-b-step-model-crosswalk.md))

**Domain vocabulary:** [`CONTEXT.md`](../../CONTEXT.md)

---

## Provenance

This section was prompted by user-testing feedback from a friend using the app on real work: _"the goal steps are nice but insufficient for real work."_ The complaint targets the Step itself, not the meta-features around goals. Iteration A shipped a flat step: a title and a `pending`/`completed` toggle, with no nesting, no notes, and no substates beyond done-or-not. The existing canonical B story (Eva's Big Map) addresses scope at scale and shame-free abandonment but does not anchor the Step-richness gap. The friend's voice is cited here as the prompt; the scenarios below stay in the voice of existing personas from [user-stories.md](../vision/user-stories.md).

## The three-register thesis

The Step model is being asked to do three jobs at once. Most are invisible until a Step has to do more than mark a checkbox.

| Register                          | What it is                                                                                  | What the Step has to carry                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Cognitive prosthesis**          | Compensating for executive function, working memory, and retrieval gaps                     | Substructure, sequence-as-syllabus, per-step context, mid-work capture, persisted reviews and learnings |
| **Anti-pathologizing instrument** | Interrupting internalized shame narratives (stuck = failing, missed = broken, mistake = me) | A vocabulary for waiting / missed / abandoned that names state without scoring it                       |
| **Time foothold**                 | Compensating for atemporal time perception                                                  | Soft "this is for Tuesday" placement that creates a Tuesday in the app                                  |

This is not a productivity product with neurodivergent skinning. It is a cognitive prosthesis and anti-pathologizing instrument that happens to look like a goal tracker. The Step model that ships at the end of Iteration B has to be load-bearing for all three registers, or the product is something else.

This frame is downstream of [product-vision.md §Core Principles](../vision/product-vision.md#core-principles) — _neurodivergent-first, not neurodivergent-friendly_ and _the journey is the product_ — sharpened by what the friend's testing exposed.

## The A–H taxonomy

> **Naming note (2026-06-12,
> [ADR-0011](../decisions/ADR-0011-step-model-names.md)):** the ten rows
> below were consolidated into seven things and renamed in the living docs —
> A → **A: Substeps**; B-soft + B-deadlines (+ the recurrence/Slot
> hypothesis) → **B: Planning**; C-order + C-waiting → **C: Dependencies**;
> D + F → **the Scratchpad**; E → **E: Step states**; G → **G: Review**;
> H → **H: Learnings**. This research doc keeps its original framing as the
> historical record; current names and definitions live in
> [`CONTEXT.md`](../../CONTEXT.md), and question status lives in the
> prototype plan's Open Questions Register.

Eight letters representing ten candidate enrichments: B has separate
soft-placement and deadline forms, and C has separate ordering and
external-waiting forms. Each is sized by both its pedagogical frame and its
ND-specific hit.

| Letter          | What                                                                           | Pedagogical frame                                                                                                                     | ND-specific hit                                                                                                                                                                                                                                                                        |
| --------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A**           | Granularity / nesting                                                          | Decomposition reveals your map of the work                                                                                            | Working-memory prosthesis. NT users hold "the project" as gestalt; ND users lose the holding. Substructure is offloaded cognition. ND bursts also need landing places.                                                                                                                 |
| **B-soft**      | Soft scheduling ("for Tuesday", not "due Tuesday")                             | Practice non-commitment commitments                                                                                                   | Atemporal time perception. Soft placement creates a Tuesday that wouldn't otherwise exist — a foothold in time itself.                                                                                                                                                                 |
| **B-deadlines** | Hard scheduling ("due Tuesday", a real external constraint)                    | Real external constraints exist; naming one is not the same as manufacturing accountability                                           | Deadlines harmed ND users through the overdue-ledger, not through existing. A deadline that informs without auto-promoting to _missed_ keeps the constraint usable without the shame. Whether it survives Phase B is open.                                                             |
| **C-order**     | Dependency graph as ordering                                                   | Sequence is the syllabus; the graph is the user-built textbook                                                                        | EF gap means ND users cannot generate the order on demand. The graph stores it outside the brain. Autistic pattern-fluency meeting EF retrieval gap.                                                                                                                                   |
| **C-waiting**   | Naming external blockers                                                       | Separates _stuck_ from _failing_                                                                                                      | RSD interrupt. CBT-in-productivity-tool form. Mental-health intervention disguised as status.                                                                                                                                                                                          |
| **D**           | Per-step context (one-line note)                                               | Where tacit knowledge becomes explicit                                                                                                | Encyclopedic context + retrieval gap = the note is an external retrieval system. Crystallizes associative thinking before it dissipates.                                                                                                                                               |
| **E**           | State vocabulary beyond `pending`/`completed`                                  | Names make experience namable and normal                                                                                              | ND users were pathologized — their _stuck_ was called laziness. Vocabulary that names states without pathologizing inverts their educational experience.                                                                                                                               |
| **F**           | Mid-work capture                                                               | Frictionless capture teaches users their thoughts matter                                                                              | Lost-thought prosthesis. Meta-pedagogical: the capture surface is a referendum on whether the user's thoughts deserve to exist.                                                                                                                                                        |
| **G**           | Per-goal review — existence is the opt-in                                      | Retrospective as data (wins and misfires both), not as verdict                                                                        | Inverts the punishment-for-mistakes pattern many ND users grew up in. Strong anti-pathologizing and strong prosthesis (against repeating the same mistakes for years; against losing the shape of what worked).                                                                        |
| **H**           | Step-level hypothesis falsification — the misfired step persists as a learning | Every step is a small experiment; misfires are iteration, not failure. The step's record _is_ the artifact, not a note attached to it | RSD interrupt at step granularity. The structural distinction between _step's premise was wrong_ and _I failed_ inverts the lifetime ND pattern. Step-misfires happen ~10× more often than goal-level failure, so this is the highest-frequency anti-pathologizing surface in the set. |

Three-register tagging:

- **Cognitive prosthesis:** A, C-order, D, F, G, H
- **Anti-pathologizing:** C-waiting, E, F, G, H
- **Time foothold:** B-soft, B-deadlines

(C-waiting, F, G, and H appear in two registers — that's not double-counting; it's why they're load-bearing.)

**G vs H — the distinction that matters.** H is specifically the falsification pivot: a misfired step's record _is_ the artifact, with the corrected replacement following from it. Forward-reference target is _the immediately replacing step within the same goal_ (Tomás's 8-gauge step persists as a learning while the corrected 6-gauge step follows from it during the practice panel work). G is broader — a free-form retrospective the user attaches to a goal whenever they want one, covering wins and misfires both. It is not tied to goal completion. Forward-reference target is _future similar steps across goals_ (Tomás's review of his exam-prep journey surfaces the 8-gauge learning at the journeyman exam six months later). H is mid-stream scaffolding; G is user-initiated reflection. The 8-gauge moment is canonically both — H during the work, G when Tomás chooses to reflect on the goal.

## What does _not_ earn its way in

- **B-deadlines as a missed-deadline ledger.** Out. A deadline remains a candidate temporal function for prototyping, but passing it must never change state, score the user, or accumulate an overdue ledger. Prototyping must establish whether it provides useful meaning without creating pressure that violates the no-time-shame principle ([product-vision.md §Core Principles](../vision/product-vision.md#core-principles), points 2 and 3).
- **Dependency-as-constraint-engine** (the version of C where the app refuses an action because a prerequisite isn't met). Punitive, infantilizing. C earns its way in only via two specific shapes: C-order (graph as user-built syllabus) and C-waiting (naming an external blocker).
- **B-estimates** (per-step time estimates). Potentially useful as a self-knowledge instrument — but only if the framing is non-accusatory in every state the UI can land in. Time-blindness is core to ADHD; the wound is sensitive; the failure modes are easy and the success modes hard. Drafting deferred until that framing exists.

## G's opt-in is the existence of a review

G is not a setting toggled per goal type, and not a default the app applies on the user's behalf. The user attaches a review to a goal when they want one — including never. The review's existence is the opt-in.

That framing matters because the same machinery that helps Tomás turn an 8-gauge wrong-turn into journeyman muscle memory becomes a shame-surveillance instrument the moment the app prompts for it. Sam's recovery practice is not material for a goal review to mine; his unfilled Tuesdays are weeks of being a human being. The protection is structural: the app does not ask _do you want to write a review now?_ at goal completion, recurrence, or any other moment. No prompt, no scoring, no nudge — just a surface the user reaches for when they have something to write.

In practice this means craft and skill goals (Tomás's wiring, Malik's modelling, Lina's archiving) tend to accumulate reviews because the user finds them useful; recovery and assessment goals (Sam, Ava) tend not to, because the user doesn't reach for one. That difference shows up in usage, not in configuration. The opt-in is not a per-goal-type default — it _is_ the absence of the prompt.

## Failure scenarios

Four scenarios, each in five fields. Together they cover all eight letters and
all ten candidate enrichments. Personas are existing; persona behavior beyond
what's in [user-stories.md](../vision/user-stories.md) is flagged as
invented-but-plausible where relevant.

### Tomás and the practice panel

**Letters:** A, C-order, D, G, H.

**Narrative.** Tomás spent a week on each circuit of his practice panel — 15-amp lighting, then the 20-amp small-appliance run, then the 240V dryer circuit. Each weekend was research, sketch, and a small wiring exercise, each with its own evidence (a photo of the conductor sizing chart, a voice memo working through NEC 220.14, a clip of a multimeter reading on the test bench). Six months later, on test day, he sizes a 50-foot 240V run by reflex — because of one wrong turn earlier when he ran 8-gauge on a circuit that needed 6.

**Current behavior.** Today, a step is a title and a `pending`/`completed` toggle — nothing more. Tomás cannot put a step inside a step, so the per-circuit work has nowhere to live below the umbrella. He can attach photos and recordings to a step as evidence, but there is no slot for the written reflection — the one-line takeaway that turned the 8-gauge wrong turn into muscle memory. Steps can be reordered within a single goal, but ordering is the only sequence information the model carries.

**The gap.** What he wanted: each circuit as a sub-step under "Build practice panel," each carrying evidence-during-practice (notes-for-future-self, not completion proof), with the 8-gauge mistake preserved as a learning that he can surface forward when he hits the journeyman exam's circuit-sizing section. What he got: one flat step titled "Build practice panel" that he eventually marked complete, with photos clustered under it and no way to encode either the sequence-as-syllabus or the wrong turn that taught him most. He keeps the 8-gauge story in his Notes app _(invented but plausible — not observed)_; the app loses the data entirely.

**A–H tags:**

- **A** — practice-panel work has natural substructure (per-circuit). Flat steps force the choice between one umbrella step that loses the circuits or three siblings that lose the umbrella.
- **C-order** — the circuits had to be done in order: the 15-amp lighting led to the 20-amp run, which led to the 240V circuit. Sequence was the syllabus, not bookkeeping.
- **D** — every circuit produced a one-line takeaway ("derating drops 12-gauge from 20A at 4+ in conduit"); nowhere to put it.
- **H** — the 8-gauge moment is _first_ an H moment, during the practice panel itself: hypothesis (8 is plenty for the 240V run), contradiction (voltage drop on the long run), updated model (size by NEC Annex D, not by gut), replacement step (re-run in 6-gauge). The 8-gauge step persists as a learning; the 6-gauge step follows from it. The learning's structured fields are populated _then_, not at goal completion.
- **G** — the same learning fires forward six months later at the journeyman exam's circuit-sizing section. Forward-reference target: future similar steps across goals, not the immediate replacement. H and G are temporally distinct moments of the same chain.

**ND lens.** For an ADHD + dyslexic learner, the sequence-as-syllabus and the learning-that-survives-six-months are not bonuses — they are the only things that make a six-month gap between practice and test survivable. NT learners can re-derive the order from a textbook on demand; Tomás cannot, and shouldn't have to.

**Research finding (load-bearing for downstream design).** _Evidence-during-practice ≠ evidence-at-completion._ The way evidence attaches to a step today fits the latter — proof a step is done. Tomás's practice-panel work is the former — notes-for-future-self attached to in-progress sub-steps whose umbrella completes at an external event (the test). This pattern generalizes to anyone whose work has a discrete completion event preceded by distributed practice: defenses, performances, demos, code reviews, exams.

### Ava and the four-month wait

**Letters:** C-waiting, D (date-as-metadata, folds in soft-B), E (waiting ≠ pending).

**Narrative.** Ava called the PIA in February and got an appointment four months out. The first intake is in June; the diagnostic sessions span July; the report is due back in October. Three of her five steps are not waiting on Ava — they are waiting on the PIA's calendar, the session window itself, and the clinic's report turnaround.

**Current behavior.** Today, every step is either pending or completed in the app. There is no waiting state; there is no expected-date metadata; there is no way to distinguish _I haven't done this yet_ from _this cannot be done until someone else does something on a date I don't control_. Ava can edit the goal's description after creating it, but a step has no notes slot of its own.

**The gap.** What she wanted: the three externally-blocked steps to read _waiting on PIA, expected June 12_ — not _pending_. What she got: five pending steps, indistinguishable from the two that are actually on her. She maintains the dates in her phone's calendar app _(invented but plausible — not observed)_; the goal screen erases the most load-bearing fact about three of five steps. The re-orientation tax every time she returns to the app is enormous, and the binary status invites the question _why haven't I done this yet?_ — to which the honest answer is _because the system has not_, but the app cannot show that.

**A–H tags:**

- **C-waiting** — externally blocked, not user-blocked. Naming the blocker separates _stuck_ from _failing_.
- **D** — the expected date (June 12, late July, October) is the most important piece of metadata about each waiting step.
- **E** — _waiting_ is a state. Erasing it under _pending_ is the failure.

**ND lens.** For a suspected-autistic + ADHD user navigating bureaucracy, the difference between _I am late_ and _they are not ready yet_ is the difference between months of internalized shame and months of legitimate waiting. The binary state collapses the distinction and shifts the moral weight onto the user.

### Malik discovers UV unwrapping

**Letters:** A (nesting), F (mid-work capture).

**Narrative.** Malik's goal is "Complete first fully-textured 3D scene." He has steps for modelling, UV unwrapping, texturing, lighting, render. Halfway through UV unwrapping he realizes UV unwrapping is itself five things — seams, projection, packing, checker-test, retopo-fix — and he keeps re-learning them each session because he doesn't write them down.

**Current behavior.** Today, a step always belongs to a goal — there is no way to put a step inside another step. When Malik adds a step, he picks a goal, not a parent. Reordering shuffles steps within one goal. The mid-work capture flow accepts evidence (photos, recordings, links), but there is no inline surface for _this is a sub-thing I'm learning right now_.

**The gap.** What he wanted: to add the five sub-steps under UV unwrapping, mid-session, in under five seconds, without leaving the texture he is working in his head. What he got: a choice between (a) keep the sub-tree mentally and lose it on the next context switch; (b) edit "UV unwrapping" into "UV: seams" and add four siblings, losing the parent concept and breaking the goal's coherence; (c) abandon the app for this and dump it in Notion _(invented but plausible — not observed)_. He picks (c) and the app loses the data.

**A–H tags:**

- **A** — substructure is _discoverable mid-work_, not knowable up front. A step model that can't hold a sub-step forecloses the discovery.
- **F** — capture-flow friction is the killing constraint. If modelling the sub-tree costs a session, he won't do it; he'll do 3D work and write orgs in Notion.

**ND lens.** ADHD bursts of insight ("oh, UV is _five things_") need a landing place closer to the burst than three taps and a goal-edit screen. If the landing place isn't here, it's somewhere else — and somewhere else is where the app's whole model of his learning evaporates.

### Sam settles into a recovery practice

**Letters:** A (nesting via step work), B-soft, D, E.

**Narrative.** Sam's goal is "Build a recovery practice." A few months in, four sub-steps under it: a Tuesday home group, a sponsor-call cadence with Marcus, the program's step work, and the daily scaffolding (sleep, food, morning anchor) he keeps re-noticing he needs. The step work is itself nested — Steps 1, 2, 3 are known up front from the program's literature, not discovered mid-work the way Malik's UV sub-tree is.

Each Tuesday has its own slot in the app — a place that appears each week with the home group's name on it, where Sam can mark it checked, leave it blank, or add a one-line note.

The Tuesday home group is the soft anchor; some weeks he goes and some weeks he doesn't. Two weeks in late March he doesn't go — once because a double shift left him on the couch by 6pm with nothing in him for the room, once because a migraine hit at 4pm and the room has fluorescent lights. The Tuesday after, the meeting is still where it always is. He goes. Afterward he taps Tuesday's slot and writes one line: "Back. Missed two. Just keep showing up."

He does not see a count of unfilled Tuesdays; the app does not surface one; there is no notification about returning; the prior Tuesdays' slots sit there, with the home group's name on them and the note line empty.

**Current behavior.** Today, a step is pending or completed in the app. There is no per-Tuesday slot — only the recurring step's checkbox. There are no soft-date semantics, no per-step note slot, no parent-step relation. The Tuesday meeting becomes a single repeating step whose checkbox toggles each week; attending and not attending produce the same surface from outside the app, and from inside as well unless Sam audits the step list himself. Step work that has its own internal sequence (1 → 2 → 3) cannot be modeled as sub-steps; it has to be either one flat step ("Do step work") that loses the sequence, or three siblings under the goal that lose the umbrella.

**The gap.** What he wanted: each Tuesday preserved as its own soft commitment — a place that can be checked, left blank, or given a note. The two late-March Tuesdays remain visible as Tuesdays in the practice, but the app does not label them as failures, count them, explain them, or treat them as evidence about Sam's recovery. The step work nested under the goal so Step 1, 2, 3 are visible as a sequence without polluting the goal's top-level view.

What he got: a single repeating step where attending and not attending produce the same surface, and the two late-March Tuesdays have nowhere to be — no slot to sit in named-and-unfilled, no place to receive a one-line note later if he wants to write one, no way for the practice to be _the Tuesdays_ rather than _the attendance_.

The principle the structure has to honor: an unfilled Tuesday is only an unfilled Tuesday. Whether that absence matters is something Sam works out with Marcus, his group, and himself — not something the app interprets, counts, or surfaces.

**A–H tags:**

- **A** — the goal has natural sub-structure known up front (the program's step work decomposes predictably into Steps 1, 2, 3) rather than discovered mid-work as in Malik's UV unwrapping. Both shapes need nesting; they arrive at it differently. Sam is also the first scenario whose nesting goes two levels deep: the goal's top-level sub-steps include "Step work," and Step work's sub-steps are 1, 2, 3.
- **B-soft** — the soft "for Tuesday" framing creates a Tuesday in the app that wouldn't otherwise exist. Time foothold, not deadline accountability. Load-bearing for the Tuesday home-group sub-step in particular.
- **D** — the one-line slot attached to each Tuesday is where the practice gets its texture without the app having to score it. The slot is _optional_, _filled by Sam alone_, and never aggregated into a summary view.
- **E** — the current pending/completed vocabulary erases the Tuesday slot itself. What Sam needs is a state vocabulary that can hold _the slot exists, it is blank_ as a real category distinct from _waiting to do_ — without naming the blank as a missed-attempt or aggregating blanks into a count. For Sam, the state vocabulary's job is to make presence-of-slot a real category that doesn't carry the productivity-software charge of "missed."

**ND lens.** For an ADHD + anxiety user in early recovery, the gap between _I didn't go this Tuesday_ and _I failed at recovery_ is the gap between a hard week and a relapse story. The recovery tradition has its own answer to that gap — the white chip is given for starting and also for restarting; streaks are not the unit; chips are not revoked. An app that wipes to zero on an unfilled slot, or even surfaces a count of unfilled slots, is doing what the chip tradition explicitly refuses to do. The app's job here is _practical scaffolding_: a named Tuesday that stays named, an optional note slot, a sub-step structure that holds the program's shape. The recovery itself happens with Sam's sponsor, his home group, and the program. The app does not track sobriety, simulate sponsorship, verify clean time, or score attendance.

**Framing status.** Articulated 2026-05-24: the structural fix is _slots, not missed-states_. The app holds Tuesday instances that can be checked, blank, or annotated; the absence of a check is not interpreted by the app as missed-attendance, scored against Sam, or surfaced as evidence about his recovery. Meaning lives outside the app — with Marcus, the group, and Sam himself. The non-recovery sketch (Cal building a drawing practice) used the same structural fix to verify the framing holds independent of recovery weight; if it's right for Cal it is right for Sam, and the higher stakes in Sam's case make the structural fix more load-bearing, not less.

The current working hypothesis for prototyping is that a Step can carry a temporal function — marker, deadline, or recurrence — and that a recurring Step produces dated slots such as Sam's Tuesdays. The exact model and interaction behavior are not settled. The universal constraint is: time passing never changes state or causes the app to interpret, score, or aggregate an absence.

**G and H drafting guardrail.** Sam's scenario deliberately includes no G review and no H pivot — and not because a recovery flag opts him out. G's opt-in is the existence of a review (the user attaches one when they want one, universally — Sam doesn't write one for his recovery practice, so there is none). H requires a falsifiable hypothesis to apply (the slot did not misfire; the slot was simply not filled that week — there is no contradicted premise to record). The hypothesis _I should go to my Tuesday meeting_ is not contradicted by an unfilled Tuesday. Both protections come from the structures themselves, not from a per-goal toggle; Sam is the canonical case that load-bears the constraint.

## Open questions

> Status, hypotheses, and ownership for these questions are tracked
> canonically in the prototype plan's
> [Open Questions Register](../plans/phase-b-step-model-prototypes.md#open-questions-register).
> This section records the research framing behind them.

- **State vocabulary scope.** With H added, the candidate set of named states the user might encounter is _pending, completed, missed, waiting-external, in-progress, abandoned, learning_ — seven. Whether all seven are user-namable, or whether some are system-derived (e.g. _learning_ only reachable via the H pivot flow, never chosen directly), is a UX question.
- **Temporal functions and Slots.** Prototype a Step date as marker, deadline, or recurrence, with recurrence producing dated Slots as the current hypothesis. Resolve what remains visible after time passes, how recurring Slots persist, whether changing temporal function preserves history, and how each function appears in the task view. No option may introduce an automatic state change or evaluation when time passes.
- **H's UI treatment.** A learning step has two things worth surfacing: the original framing (the hypothesis the user committed to) and the learned outcome (what the falsification revealed). Does the UI show both side-by-side, fold the original under the learning, or surface only the learned outcome with the original available on tap?
- **Substructure depth.** One level of nesting, or arbitrary? Sam's scenario lands at two levels (goal → step work → Steps 1/2/3); Malik, Tomás, and Ava each land at one. Two levels handle every scenario above; arbitrary opens the door to outline-tool drift away from the task view's "one next thing" promise. Sam's nesting is known up front (program literature); Malik's is discovered mid-work — the same structure, arrived at differently, and probably with different capture flows.
- **What this implies for the task view.** [The task view](../vision/product-vision.md#the-task-view--next-best-step) shows one next step per active goal. With substructure (A) and a richer state vocabulary (E), "next step" becomes ambiguous — the next leaf, the next umbrella, the next non-waiting step. Resolving this is part of forming the success scenarios.
