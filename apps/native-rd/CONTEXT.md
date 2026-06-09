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

**Sub-step**:
A Step nested under a parent Step (not directly under a Goal). The substructure may be known up front (Sam's Steps 1/2/3 from program literature) or discovered mid-work (Malik realising UV unwrapping is five things).
_Avoid_: child task, subtask.

**Substructure**:
The fact that Steps can contain Steps. Depth limit is currently open (one level handles Tomás/Malik/Ava; Sam lands at two; arbitrary is on the table).
_Avoid_: nesting (when used to describe depth as a feature), hierarchy.

**The task view**:
The view that surfaces _one next step per active goal_. Canonical name from product-vision.md §The Task View — Next Best Step.
_Avoid_: today view, dashboard, home.

### The three registers

The Step model is asked to do three jobs at once. Every enrichment is sized against these.

**Cognitive prosthesis**:
Compensating for executive function, working memory, and retrieval gaps. The app holds what the user cannot hold in their head.
_Avoid_: productivity scaffolding, organisation aid.

**Anti-pathologizing instrument**:
Interrupting internalised shame narratives — _stuck = failing_, _missed = broken_, _mistake = me_. The vocabulary names state without scoring it.
_Avoid_: motivation, gentle nudge, positive reinforcement.

**Time foothold**:
Compensating for atemporal time perception. The app creates a Tuesday that wouldn't otherwise exist.
_Avoid_: scheduling, due date, reminder.

### The A–H taxonomy

Eight letters representing ten candidate enrichments for the Step: B has separate
soft-placement and deadline forms, and C has separate ordering and
external-waiting forms. Letters are load-bearing — agents and docs refer to them
by letter.

**A**: Granularity / nesting. Substructure as offloaded cognition; landing places for ND bursts.

**B-soft**: Soft scheduling — _"for Tuesday"_, not _"due Tuesday"_. Creates the time foothold. A working hypothesis for prototyping is that a Step can carry a temporal function — marker, deadline, or recurrence — while time passing never changes its state or evaluates the user.

**B-deadlines**: A deadline is one candidate temporal function to prototype, not permission for a missed-deadline ledger. Passing it never changes state or evaluates the user. Whether a deadline can provide useful meaning without creating pressure that violates the no-time-shame principle remains open.

**C-order**: Dependency graph as ordering — _sequence is the syllabus_.

**C-waiting**: Naming external blockers — separates _stuck_ from _failing_.

**C-as-constraint**: Out. Dependency-as-constraint-engine (app refuses an action because a prerequisite isn't met). Punitive.

**D**: Per-step context (one-line note). Tacit knowledge made explicit. Per-step free-form text already exists today — as text evidence, with evidence semantics; D's open question is whether context is a distinct thing (own retrieval surface, prominence at re-entry) or a presentation/retrieval layer over that channel.

**E**: State vocabulary beyond `pending`/`completed`. Naming states without pathologizing them.

**F**: Mid-work capture. Frictionless landing place for in-progress insight. A six-modality capture suite already ships and is reachable mid-work, but everything it captures lands as an evidence record; F's open questions are friction under real mid-work load and where captured _structure_ (a new sub-step, not evidence) lands.

**G**: Per-goal review. The user attaches a review to a goal whenever they want one — including never; it is not tied to goal completion, and the review's existence is the opt-in rather than a toggle. Free-form retrospective on the goal (wins and misfires both). Forward-reference target is _future similar steps across goals_.

**H**: Step-level hypothesis falsification — the misfired step persists as a learning. Forward-reference target is _the immediately replacing step within the same goal_.

**G vs H**:
H is specifically the falsification pivot — a misfired step's record _is_ the artifact. G is broader: a free-form retrospective the user writes whenever they want. When a misfire is involved, both can apply; the forward-reference target separates them. The 8-gauge moment is canonically _both_ — H during the practice panel work, G at the journeyman exam six months later.

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
Candidate state. The step is blocked by something the user does not control (the PIA's calendar, the clinic's report turnaround).
_Avoid_: blocked (ambiguous — could mean user-blocked), pending-external.

**learning**:
Candidate state, system-derived from the H pivot — a falsified step persists labelled this way, with the corrected replacement step _following from_ it. Probably not directly user-choosable.
_Avoid_: failed, wrong, redo.

**Slot**:
A dated occurrence produced by a recurring Step — _this Tuesday_, _next Tuesday_ — that can be checked, left blank, or annotated. The absence of a check is not interpreted by the app. The slot is the unit; presence-or-absence is not aggregated, counted, or surfaced as evidence about the user. This is a working hypothesis for prototyping, not yet a settled model.
_Avoid_: occurrence, missed Tuesday, attendance record, instance.

**Universal no-auto-state rule**:
Time passing never changes a Step's state or causes the app to interpret, score, or aggregate an absence. This applies whether a date functions as a marker, deadline, or recurrence. The precise behavior and presentation of those temporal functions — including whether recurrence produces a distinct Slot model — require prototyping.

**Flagged ambiguity — state vocabulary**:
Whether E becomes a single vocabulary used differently per goal, or a fully opt-in-per-goal vocabulary set, is unresolved. Joe is considering base labels (`pending`, `completed`) the user can rename or extend per goal — that's a working direction, not a decision.

### Misfire and learning (H)

**Misfire**:
A step whose premise turned out to be wrong (Tomás's 8-gauge run on a circuit that needed 6). Distinct from _a step the user failed to do_. The structural distinction _the step's premise was wrong_ vs _I failed_ is the H register's whole point.
_Avoid_: failed step, wrong turn (informal, not the canonical term), error.

**Falsification**:
The H frame — every step is a small experiment; misfires are iteration. The misfired step's record _is_ the learning, not a note attached to it.
_Avoid_: error correction, retry.

**Follows-from**:
The relation between a falsified step and its replacement. Tomás's 6-gauge re-run _follows from_ the 8-gauge misfire; the chain is preserved.
_Avoid_: replaces, supersedes (those imply the original disappears; under H it persists as a learning).

**Learning step**:
The persisted form of a misfired step under H — the original framing visible, the contradiction recorded, the replacement step linked.
_Avoid_: failed step, review (G uses _review_; H uses _learning_).

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
Sam's goal type. Distinct from craft / skill goals in the kinds of structures that fit, not in goal-type-conditional defaults: G reviews are never prompted (universal — but the absence of the prompt is most load-bearing here, since a recovery review on Sam's behalf would be shame-surveillance); H does not apply because slot-shaped commitments do not carry a falsifiable hypothesis; the `missed` state never arises (universal — no time-based auto-state).
_Avoid_: sobriety tracking, recovery program (the app does not track sobriety or simulate the program).

### Research-language

**Evidence-during-practice**:
Notes-for-future-self attached to in-progress sub-steps whose umbrella completes at an external event (test, defense, demo). From the Tomás practice-panel finding.
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
> **Agent:** Sam's Tuesdays aren't `missed` Tuesdays in the app's vocabulary; they're _unfilled slots_. The slot exists, it's blank, the app doesn't interpret — and that's universal, not a recovery-specific carve-out: the app doesn't auto-promote a step to `missed` for any goal. So for Sam's recovery practice, the task view shouldn't surface the unfilled slots as anything at all.
>
> **Joe:** And if it were Tomás missing two practice-panel weekends?
>
> **Agent:** That's a state-vocabulary question (E), not an H question. Tomás's 8-gauge run was a misfire — the step's premise was wrong, and the corrected step _follows from_ it. That's H. Missing a weekend is different: a question about whether `missed` belongs in the set at all, and if so, whether the user marks it themselves. The app never auto-promotes by time, for any goal type.
>
> **Joe:** What about a sponsor-call cadence Sam didn't make for three weeks?
>
> **Agent:** Same shape as the Tuesdays. Each weekly cadence has a slot; blank slots stay blank; the app doesn't count or surface. The sponsor relationship — including whether the gap matters — is between Sam and Marcus, not between Sam and the app.

## Flagged ambiguities

- **State vocabulary scope (E).** Whether E is one shared vocabulary used differently per goal type, or a fully opt-in-per-goal vocabulary (base labels the user can rename or extend), is unresolved. UI exploration for each candidate state is the likely next move.
- **Substructure depth.** One level vs two vs arbitrary. Sam lands at two; the case for capping there is the task view's "one next thing" promise. The case against is that learning structures don't have a natural depth limit.
- **Temporal functions and Slots.** A working hypothesis for prototyping is that a Step can carry a marker, deadline, or recurrence, and that recurrence produces dated Slots. The interaction model, persistence behavior, task-view treatment, and consequences of changing temporal function remain open. The universal constraint is settled: time passing never changes state or evaluates the user.
- **`learning` as a user-choosable state.** H produces a learning step via the falsification pivot — but the doc hasn't resolved whether the user can directly mark a step as `learning` outside that flow.
