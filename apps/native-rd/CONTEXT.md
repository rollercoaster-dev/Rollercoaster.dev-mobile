# native-rd

A personal learning and goal tracker for neurodivergent users. The app is a cognitive prosthesis and anti-pathologizing instrument that happens to look like a goal tracker; the Step model and the vocabulary around it are the load-bearing surfaces for that intent.

## Language

### Core model

**Goal**:
A user-named arc of work the app holds: "Build practice panel," "Build a recovery practice," "Complete first fully-textured 3D scene." Each Goal owns one or more Steps.
_Avoid_: project, task list, objective.

**Step**:
The unit being elaborated in Iteration B — currently a title, a user-reorderable ordinal, a `pending`/`completed` toggle, optional planned evidence types, and evidence attachable at any time; in the gap doc, the surface that has to carry substructure, state, notes, evidence, and (for some kinds) learning. Full inventory with file refs: the [Stage 0 baseline record](docs/plans/phase-b-stage-0-baseline.md).
_Avoid_: task, todo, item, action.

**Substep**:
A Step nested under a parent Step (not directly under a Goal). Spelled _substep_, no hyphen (formerly "sub-step"). A step with substeps is just a step — there is no special word for the parent. The substeps may be known up front (Sam's Steps 1/2/3 from program literature) or discovered mid-work (Malik realizing UV unwrapping is five things). You _break a step into substeps_ or _add substeps_.
_Avoid_: child task, subtask, umbrella (for the parent).

**Substructure**:
The fact that Steps can contain Steps. Depth limit is currently open (one level handles Tomás/Malik/Ava; Sam lands at two; arbitrary is on the table).
_Avoid_: nesting (when used to describe depth as a feature), hierarchy.

**The task view**:
The view that surfaces _one next step per active goal_. Canonical name from product-vision.md §The Task View — Next Best Step.
_Avoid_: today view, dashboard, home.

### The three registers

The Step model is asked to do three jobs at once. Each of the seven features is sized against these.

**Cognitive prosthesis**:
Compensating for executive function, working memory, and retrieval gaps. The app holds what the user cannot hold in their head.
_Avoid_: productivity scaffolding, organisation aid.

**Anti-pathologizing instrument**:
Interrupting internalised shame narratives — _stuck = failing_, _missed = broken_, _mistake = me_. The vocabulary names state without scoring it.
_Avoid_: motivation, gentle nudge, positive reinforcement.

**Time anchor** (formerly "Time foothold"):
Compensating for atemporal time perception. The app creates a Tuesday that wouldn't otherwise exist.
_Avoid_: scheduling, due date, reminder.

### The seven features (formerly the A–H taxonomy)

Seven candidate capabilities for the Step. They started as eight letters
holding ten rows; [ADR-0011](docs/decisions/ADR-0011-step-model-names.md)
consolidated and renamed them on 2026-06-12. Letters are still load-bearing —
agents and docs refer to them by letter — and each entry below names what it
was formerly called so the trail to the research docs stays readable.

**A: Substeps** (formerly "Granularity / nesting"): Steps can contain Steps. Substeps as offloaded cognition; landing places for ND bursts. A step with substeps is just a step.

**B: Planning** (formerly "B-soft" + "B-deadlines" + the recurrence/Slot hypothesis): three time shapes — a **date** (one-off, _"for Tuesday"_, not _"due Tuesday"_), a **deadline**, and **repeating**. Simplest path for each, using the phone's built-in tools wherever possible: one-way calendar push (pre-fill a system calendar event from a step; never read the calendar back, never sync state) and user-set reminders (fire once at the time the user set; no re-ping, no follow-up). Time passing never changes a step's state or evaluates the user. A passed deadline stays factual — no red, no "overdue," no alarm state. **No app-icon badge counts, ever.** The calendar holds repetition; the step just _is_ the repeating thing.

**C: Dependencies** (formerly "C-order" + "C-waiting"): one design language, two targets — a step can depend on another step (**internal**) or on a person, org, reply, or event (**external**). A dependency is a _relation_, not a state. It informs — never blocks, hides, or dims. Naming an external dependency separates _stuck_ from _failing_. List order itself already ships (`ordinal`, drag-to-reorder); the dependency marker is C's only new capability.

**C-as-constraint**: Out. Dependency-as-constraint-engine (app refuses an action because a prerequisite isn't met). Punitive.

**Scratchpad** (formerly "D: Per-step context" + "F: Mid-work capture"): a freeform pad — Apple Freeform / a mini Miro board — holding finger-written ink, images, text, fragments; anything goes. Everything on it is draggable: arranged within the pad, or dragged out to _become_ something — a substep, evidence, a step note. Nothing lands anywhere automatically; you drag it. Not evidence's register, not a review, no required flow.

**E: Step states** (formerly "Richer state vocabulary"): states beyond `pending`/`completed`, named without pathologizing. Color is the state's identity — stable and clear. The label is a word from a small pool per state, picked randomly once when the state is set, then fixed. The word is always adjacent to the color, never replaced by it.

**G: Review**: the user attaches a review to a goal whenever they want one — including never; the review's existence is the opt-in rather than a toggle. The review is a final edit pass over the goal's scratchpad — the mess becomes the keepsake, gathering the steps as they actually went, H learnings, evidence, and the badge. The existing completion-flow text field is the doorway, not the whole feature; the review is reachable anytime from the goal, and skipping the doorway leaves no trace. Forward-reference target is _future similar steps across goals_.

**H: Learnings** (formerly "Misfire as learning"): what didn't go to plan, kept. The step persists as a learning — the user assigns the label, with their own word from the state pool; the app never does. A combination, not a new feature: an E state + a C-style link + journey display. Forward-reference target is _the immediately replacing step within the same goal_.

**G vs H**:
H is a single step that didn't go to plan, kept — the step's record _is_ the artifact. G is broader: a free-form review the user writes whenever they want. When a learning is involved, both can apply; the forward-reference target separates them. The 8-gauge moment is canonically _both_ — H during the practice panel work, G at the journeyman exam six months later.

### Step states

The current state set is `pending` / `completed`. The candidate set under E is open and possibly larger.

**pending**:
The current default state. Today erases most distinctions: _haven't done it yet_, _blocked externally_, _slot exists and is blank_, and _abandoned_ all surface as `pending`.

**completed**:
The current terminal state. Set by the checkbox.

**missed**:
Candidate state, if it exists at all — never applied by the app. Time passing does not promote `pending` → `missed`, for any goal type. If a step the user intended for Tuesday doesn't get done, the step stays `pending` (or its Tuesday slot stays blank); the app does not interpret the absence. An earlier draft singled out recovery goals as the place to ban `missed`; the constraint is universal — there is no time-based auto-state for any goal.
_Avoid_: failed, skipped, overdue, auto-missed.

**waiting-external**:
Formerly a candidate state; answered 2026-06-12 ([ADR-0011](docs/decisions/ADR-0011-step-model-names.md)) — waiting on something the user does not control (the PIA's calendar, the clinic's report turnaround) is an external **dependency relation** (C), not a state. The relation informs without scoring the user; what a step with an unsatisfied dependency shows is a prototype question.
_Avoid_: blocked (ambiguous — could mean user-blocked), pending-external, blocked by ("depends on" is the working wording).

**learning**:
Candidate state from H — a step that didn't go to plan persists labelled this way, with the corrected replacement step _following from_ it. **The user sets it directly**, with their own word from the state pool; the app never assigns the label (answered 2026-06-12 — an earlier draft had it system-derived and probably not user-choosable).
_Avoid_: failed, wrong, redo.

**Slot**:
A dated occurrence produced by a repeating Step — _this Tuesday_, _next Tuesday_. **Demoted to probably unnecessary, 2026-06-12:** the phone's calendar holds the repetition; the step just _is_ the repeating thing. Stage 3 verifies that calendar delegation covers the scenarios before any in-app Slot model is considered. What stays settled regardless of model: the absence of a check is never interpreted, aggregated, counted, or surfaced as evidence about the user.
_Avoid_: occurrence, missed Tuesday, attendance record, instance.

**Universal no-auto-state rule**:
Time passing never changes a Step's state or causes the app to interpret, score, or aggregate an absence. This applies to all three planning shapes — date, deadline, and repeating.

**Flagged ambiguity — state words**:
Color is the state's identity; the label is a word from a small pool per state, picked once when the state is set (decided 2026-06-12). Pools are authored during prototyping; whether the user can edit or extend the pools stays open. Whether `pending`/`completed` keep their names in the UI is also open — "pending reads like database-speak" was raised and not contested.

### Learnings (H) (formerly "Misfire and learning")

**Learning**:
What didn't go to plan, kept. A step whose premise turned out to be wrong (Tomás's 8-gauge run on a circuit that needed 6) — distinct from _a step the user failed to do_. The structural distinction _the step's premise was wrong_ vs _I failed_ is H's whole point. The step's record _is_ the learning, not a note attached to it; the original framing stays visible, with the replacement step linked. Learnings display with pride in the goal journey — per-item, showable, **never counted or aggregated**.
_Avoid_: misfire, falsification (both retired 2026-06-12), failed step, error, review (G uses _review_; H uses _learning_).

**"What happened?" / "What does it change?"**:
The two questions a learning invites when the state is set. The first becomes the learning's body; the second seeds a pre-filled corrected step, and the follows-from link comes free. A quiet **"not now"** sets the state anyway and leaves the questions on the step, answerable later — strong invitation, no gate.

**Follows-from**:
The relation between a learning and its replacement. Tomás's 6-gauge re-run _follows from_ the 8-gauge learning; the chain is preserved.
_Avoid_: replaces, supersedes (those imply the original disappears; under H it persists as a learning).

### Recovery vocabulary (used in Sam's scenario)

These are borrowed from the recovery tradition, not coined here. They appear in research docs to name what the app must respect or refuse to enact.

**Abstinence-violation effect (AVE)**:
The cognition where a single lapse generates "I've ruined it, so I might as well." The H frame's _step's premise was wrong_ vs _I failed_ distinction is the structural inverse. The app must not enact AVE-shaped messaging — counts of unfilled slots, streak resets, "you missed two" surfaces.
_Avoid_: relapse spiral (different clinical meaning), all-or-nothing thinking (broader than AVE).

**Lapse**:
The recovery-tradition term for an unfilled Tuesday or a return after time away. Distinct from _relapse_. The app does not name or label lapses.
_Avoid_: setback, slip, missed.

**White chip**:
The recovery-tradition token given for starting and also for restarting. Streaks are not the unit; chips are not revoked. Anchors why the app's job is _holding the slot_, not _counting attendance_.

**Name without score**:
The principle: states can be named (waiting, slot-blank) without scoring the user against them. The vocabulary is descriptive, not evaluative.
_Avoid_: gentle framing, soft phrasing.

**Recovery practice**:
Sam's goal type. Distinct from craft / skill goals in the kinds of structures that fit, not in goal-type-conditional defaults: G reviews are never prompted (universal — but the absence of the prompt is most load-bearing here, since a recovery review on Sam's behalf would be shame-surveillance); H does not apply because a repeating commitment carries no premise that can turn out wrong; the `missed` state never arises (universal — no time-based auto-state).
_Avoid_: sobriety tracking, recovery program (the app does not track sobriety or simulate the program).

### Research-language

**Evidence-during-practice**:
Notes-for-future-self attached to in-progress substeps whose parent step completes at an external event (test, defense, demo). From the Tomás practice-panel finding.
_Avoid_: progress notes, journal entries.

**Evidence-at-completion**:
Proof-a-step-is-done. The current evidence channel's typical semantic register — but not a mechanical constraint: today's evidence attaches to a step at any time, not only at completion. Distinct from evidence-during-practice in register, not in mechanism.

**The journey is the product**:
Core principle from product-vision.md. The artifact preserved is the process, not just the outcome.

**Neurodivergent-first**:
Core principle from product-vision.md. The app is designed _from_ ND constraints, not retrofitted _to_ them.
_Avoid_: neurodivergent-friendly, ND-accessible.

**Big Map**:
Eva's canonical persona artifact — the long-running over-scoped goal that shipped shame-free abandonment as a B-iteration concern.

**Failure scenario**:
The structural unit of `step-model-gap.md`. One persona, one goal, five fields (narrative, current behavior, the gap, A–H tags, ND lens). Distinct from _user story_ in `user-stories.md`.

## Example dialogue

> **Joe:** Sam's two missed Tuesdays — should the task view show them?
>
> **Agent:** Sam's Tuesdays aren't `missed` Tuesdays to the app. The Tuesday meeting is a repeating thing — the calendar holds the repetition — and a Tuesday that didn't happen is just a Tuesday the app doesn't interpret. That's universal, not a recovery-specific carve-out: the app doesn't auto-promote a step to `missed` for any goal. So for Sam's recovery practice, the task view shouldn't surface the two Tuesdays as anything at all.
>
> **Joe:** And if it were Tomás missing two practice-panel weekends?
>
> **Agent:** That's a step-states question (E), not an H question. Tomás's 8-gauge run didn't go to plan — the step's premise was wrong, and the corrected step _follows from_ it. That's H, and Tomás is the one who'd label it. Missing a weekend is different: a question about whether `missed` belongs in the state set at all, and if so, whether the user marks it themselves. The app never auto-promotes by time, for any goal type.
>
> **Joe:** What about a sponsor-call cadence Sam didn't make for three weeks?
>
> **Agent:** Same shape as the Tuesdays. The cadence repeats; the app keeps no record of made-versus-unmade calls to count or surface. The sponsor relationship — including whether the gap matters — is between Sam and Marcus, not between Sam and the app.

## Flagged ambiguities

- **E word pools.** Color = state identity and word-from-a-pool are decided; pool contents are authored during prototyping. Whether the user can edit or extend the pools is open, and so is whether `pending`/`completed` keep their names in the UI.
- **Substep depth.** One level vs two vs arbitrary. Sam lands at two; the case for capping there is the task view's "one next thing" promise. The case against is that learning structures don't have a natural depth limit.
- **Calendar delegation (B).** The working direction is that the phone's calendar and user-set reminders cover all three planning shapes, making an in-app Slot model unnecessary. Stage 3 verifies this against the scenarios. The universal constraint is settled regardless: time passing never changes state or evaluates the user.
- **Scratchpad scope.** Per-goal vs global pad (lean: probably per-goal), which drag-out targets exist (substep, evidence, step note), and whether the original stays in the pad after dragging out.
- **Dependency display (C).** Marker wording ("depends on" — never "blocked by") and what a step with a not-yet-satisfied dependency shows.
