# native-rd

A personal learning and goal tracker for neurodivergent users. The app is a cognitive prosthesis and anti-pathologizing instrument that happens to look like a goal tracker; the Step model and the vocabulary around it are the load-bearing surfaces for that intent.

## Language

### Core model

**Goal**:
A user-named arc of work the app holds: "Build practice panel," "Build a recovery practice," "Complete first fully-textured 3D scene." Each Goal owns one or more Steps.
_Avoid_: project, task list, objective.

**Step**:
The unit being elaborated in Iteration B — currently a title plus a `pending`/`completed` toggle; in the gap doc, the surface that has to carry substructure, state, notes, evidence, and (for some kinds) learning.
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

Eight candidate enrichments for the Step. Letters are load-bearing — agents and docs refer to them by letter.

**A**: Granularity / nesting. Substructure as offloaded cognition; landing places for ND bursts.

**B-soft**: Soft scheduling — _"for Tuesday"_, not _"due Tuesday"_. Creates the time foothold.

**B-deadlines**: Out. Calendar-style due dates. Rejected as a missed-deadline ledger that violates the no-time-shame principle.

**C-order**: Dependency graph as ordering — _sequence is the syllabus_.

**C-waiting**: Naming external blockers — separates _stuck_ from _failing_.

**C-as-constraint**: Out. Dependency-as-constraint-engine (app refuses an action because a prerequisite isn't met). Punitive.

**D**: Per-step context (one-line note). Tacit knowledge made explicit.

**E**: State vocabulary beyond `pending`/`completed`. Naming states without pathologizing them.

**F**: Mid-work capture. Frictionless landing place for in-progress insight.

**G**: Lessons from failure (opt-in per goal). Mistakes as data, not as verdict. Forward-reference target is _future similar steps across goals_.

**H**: Step-level hypothesis falsification — the misfired step persists as a learning. Forward-reference target is _the immediately replacing step within the same goal_.

**G vs H**:
Both involve learning from misfires; the forward-reference target separates them. The 8-gauge moment is canonically _both_ — H during the practice panel work, G at the journeyman exam six months later.

### Step states

The current state set is `pending` / `completed`. The candidate set under E is open and possibly larger.

**pending**:
The current default state. Today erases most distinctions: _haven't done it yet_, _blocked externally_, _slot exists and is blank_, and _abandoned_ all surface as `pending`.

**completed**:
The current terminal state. Set by the checkbox.

**missed**:
Candidate state for craft / skill goals. **Banned for recovery goals.** The word is productivity-software default — slightly off for craft, actively harmful for recovery (see _abstinence-violation effect_). Whether the state vocabulary itself becomes opt-in per goal type is a live open question.
_Avoid_: failed, skipped, overdue.

**waiting-external**:
Candidate state. The step is blocked by something the user does not control (the PIA's calendar, the clinic's report turnaround).
_Avoid_: blocked (ambiguous — could mean user-blocked), pending-external.

**learning**:
Candidate state, system-derived from the H pivot — a falsified step persists labelled this way, with the corrected replacement step _following from_ it. Probably not directly user-choosable.
_Avoid_: failed, wrong, redo.

**Slot**:
A named place that exists each occurrence — _this Tuesday_, _next Tuesday_ — and can be checked, left blank, or annotated. The absence of a check is not interpreted by the app. The slot is the unit; presence-or-absence is not aggregated, counted, or surfaced as evidence about the user.
_Avoid_: occurrence, missed Tuesday, attendance record, instance.

**Flagged ambiguity — `missed` and the slot principle**:
For craft goals (Tomás, Malik) a `missed` state may be coherent; for recovery goals (Sam) the principle is _no missed state at all; the slot exists, blank is blank, the app does not interpret_. Whether E becomes a single vocabulary used differently per goal, or a fully opt-in-per-goal vocabulary set, is unresolved. Joe is considering base labels (`pending`, `completed`, `missed`) the user can rename or extend per goal — that's a working direction, not a decision.

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
_Avoid_: failed step, lesson (G uses _lesson_; H uses _learning_).

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
Sam's goal type. Distinct from craft / skill goals — the principles around G (opt-out by default), H (opt-out), and `missed` (banned) differ.
_Avoid_: sobriety tracking, recovery program (the app does not track sobriety or simulate the program).

### Research-language

**Evidence-during-practice**:
Notes-for-future-self attached to in-progress sub-steps whose umbrella completes at an external event (test, defense, demo). From the Tomás practice-panel finding.
_Avoid_: progress notes, journal entries.

**Evidence-at-completion**:
Proof-a-step-is-done. The current evidence shape. Distinct from evidence-during-practice.

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
> **Agent:** Sam's Tuesdays aren't `missed` Tuesdays in the app's vocabulary; they're _unfilled slots_. The slot exists, it's blank, the app doesn't interpret. Under E, `missed` is a state that's probably appropriate for craft goals and banned for recovery goals — so for Sam's recovery practice, the task view shouldn't surface the unfilled slots as anything at all.
>
> **Joe:** And if it were Tomás missing two practice-panel weekends?
>
> **Agent:** That's a craft goal, so `missed` is on the table — but it's a state question, not an H question. Tomás's 8-gauge run was a misfire — the step's premise was wrong, and the corrected step _follows from_ it. That's H. Missing a weekend is closer to E: a state vocabulary question about whether `missed` belongs in the set, and whether it's a system-set state or a user choice.
>
> **Joe:** What about a sponsor-call cadence Sam didn't make for three weeks?
>
> **Agent:** Same shape as the Tuesdays. Each weekly cadence has a slot; blank slots stay blank; the app doesn't count or surface. The sponsor relationship — including whether the gap matters — is between Sam and Marcus, not between Sam and the app.

## Flagged ambiguities

- **State vocabulary scope (E).** Whether E is one shared vocabulary used differently per goal type, or a fully opt-in-per-goal vocabulary (base labels the user can rename or extend), is unresolved. UI exploration for each candidate state is the likely next move.
- **Substructure depth.** One level vs two vs arbitrary. Sam lands at two; the case for capping there is the task view's "one next thing" promise. The case against is that learning structures don't have a natural depth limit.
- **`slot` scope.** Today the term is anchored to Sam's recurring Tuesdays. Whether it generalizes to every soft-scheduled (B-soft) step, or stays specific to recurring soft commitments in recovery-shaped goals, is open.
- **`learning` as a user-choosable state.** H produces a learning step via the falsification pivot — but the doc hasn't resolved whether the user can directly mark a step as `learning` outside that flow.
