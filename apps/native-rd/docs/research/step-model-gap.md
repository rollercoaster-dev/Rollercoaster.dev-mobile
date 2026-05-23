# The Step Model Gap

**Date:** 2026-05-22
**Status:** In progress
**Owner:** Joe

**Scope reference:** [ADR-0001 §Iteration B](../decisions/ADR-0001-iteration-strategy.md) (amended by [ADR-0006](../decisions/ADR-0006-iteration-b-scope-amendment.md))

---

## Provenance

This section was prompted by user-testing feedback from a friend using the app on real work: _"the goal steps are nice but insufficient for real work."_ The complaint targets the Step itself, not the meta-features around goals. Iteration A shipped a flat `step.title` + `pending | completed` status (`schema.ts:107-115`); the existing canonical B story (Eva's Big Map) addresses scope at scale and shame-free abandonment but does not anchor the Step-richness gap. The friend's voice is cited here as the prompt; the scenarios below stay in the voice of existing personas from [user-stories.md](../vision/user-stories.md).

## The three-register thesis

The Step model is being asked to do three jobs at once. Most are invisible until a Step has to do more than mark a checkbox.

| Register                          | What it is                                                                                  | What the Step has to carry                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Cognitive prosthesis**          | Compensating for executive function, working memory, and retrieval gaps                     | Substructure, sequence-as-syllabus, per-step context, mid-work capture, lesson-as-artifact |
| **Anti-pathologizing instrument** | Interrupting internalized shame narratives (stuck = failing, missed = broken, mistake = me) | A vocabulary for waiting / missed / abandoned that names state without scoring it          |
| **Time foothold**                 | Compensating for atemporal time perception                                                  | Soft "this is for Tuesday" placement that creates a Tuesday in the app                     |

This is not a productivity product with neurodivergent skinning. It is a cognitive prosthesis and anti-pathologizing instrument that happens to look like a goal tracker. The Step model that ships at the end of Iteration B has to be load-bearing for all three registers, or the product is something else.

This frame is downstream of [product-vision.md §Core Principles](../vision/product-vision.md#core-principles) — _neurodivergent-first, not neurodivergent-friendly_ and _the journey is the product_ — sharpened by what the friend's testing exposed.

## The A–G taxonomy

Seven candidate enrichments. Each is sized by both its pedagogical frame and its ND-specific hit.

| Letter        | What                                               | Pedagogical frame                                              | ND-specific hit                                                                                                                                                        |
| ------------- | -------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A**         | Granularity / nesting                              | Decomposition reveals your map of the work                     | Working-memory prosthesis. NT users hold "the project" as gestalt; ND users lose the holding. Substructure is offloaded cognition. ND bursts also need landing places. |
| **B-soft**    | Soft scheduling ("for Tuesday", not "due Tuesday") | Practice non-commitment commitments                            | Atemporal time perception. Soft placement creates a Tuesday that wouldn't otherwise exist — a foothold in time itself.                                                 |
| **C-order**   | Dependency graph as ordering                       | Sequence is the syllabus; the graph is the user-built textbook | EF gap means ND users cannot generate the order on demand. The graph stores it outside the brain. Autistic pattern-fluency meeting EF retrieval gap.                   |
| **C-waiting** | Naming external blockers                           | Separates _stuck_ from _failing_                               | RSD interrupt. CBT-in-productivity-tool form. Mental-health intervention disguised as status.                                                                          |
| **D**         | Per-step context (one-line note)                   | Where tacit knowledge becomes explicit                         | Encyclopedic context + retrieval gap = the note is an external retrieval system. Crystallizes associative thinking before it dissipates.                               |
| **E**         | State vocabulary beyond `pending`/`completed`      | Names make experience namable and normal                       | ND users were pathologized — their _stuck_ was called laziness. Vocabulary that names states without pathologizing inverts their educational experience.               |
| **F**         | Mid-work capture                                   | Frictionless capture teaches users their thoughts matter       | Lost-thought prosthesis. Meta-pedagogical: the capture surface is a referendum on whether the user's thoughts deserve to exist.                                        |
| **G**         | Lessons from failure (opt-in per goal)             | Mistakes as data, not as verdict                               | Inverts the punishment-for-mistakes pattern many ND users grew up in. Strong anti-pathologizing and strong prosthesis (against repeating the same mistake for years).  |

Three-register tagging:

- **Cognitive prosthesis:** A, C-order, D, F, G
- **Anti-pathologizing:** C-waiting, E, F, G
- **Time foothold:** B-soft

(C-waiting, F, and G appear in two registers — that's not double-counting; it's why they're load-bearing.)

## What does _not_ earn its way in

- **B-deadlines** (calendar-style due dates). Accumulates as a missed-deadline ledger; the friend's testing didn't surface a single moment that needed one; the product vision rules out time-based shame ([product-vision.md §Core Principles](../vision/product-vision.md#core-principles), points 2 and 3). Out.
- **Dependency-as-constraint-engine** (the version of C where the app refuses an action because a prerequisite isn't met). Punitive, infantilizing. C earns its way in only via two specific shapes: C-order (graph as user-built syllabus) and C-waiting-on-external (naming an external blocker).
- **B-estimates** (per-step time estimates). Potentially useful as a self-knowledge instrument — but only if the framing is non-accusatory in every state the UI can land in. Time-blindness is core to ADHD; the wound is sensitive; the failure modes are easy and the success modes hard. Drafting deferred until that framing exists.

## G is opt-in per goal

G is the only enrichment in this set whose deployment is conditional on goal type.

The same machinery that helps Tomás turn an 8-gauge wrong-turn into journeyman muscle memory becomes a shame-surveillance instrument when applied to a recovery goal. Sam's missed Tuesdays are not lessons-from-task-failure to mine; they are weeks of being a human being. Applying lesson-as-artifact machinery there inverts the anti-pathologizing register and weaponises it.

**Recommended embodiment:** craft and skill goals (Tomás's wiring, Malik's modelling, Lina's archiving) opt in to G by default; recovery and assessment goals (Sam, Ava) do not. The user can change this freely per goal. The opt-in is not a setting toggle — it _is_ the design.

## Failure scenarios

Four scenarios, each in five fields. Together they cover all seven letters. Personas are existing; persona behavior beyond what's in [user-stories.md](../vision/user-stories.md) is flagged as invented-but-plausible where relevant.

### Tomás and the practice panel

**Letters:** A, C-order, D, G.

**Narrative.** Tomás spent a week on each circuit of his practice panel — 15-amp lighting, then the 20-amp small-appliance run, then the 240V dryer circuit. Each weekend was research, sketch, and a small wiring exercise, each with its own evidence (a photo of the conductor sizing chart, a voice memo working through NEC 220.14, a clip of a multimeter reading on the test bench). Six months later, on test day, he sizes a 50-foot 240V run by reflex — because of one wrong turn earlier when he ran 8-gauge on a circuit that needed 6.

**Current behavior.** `step.title` is a single `NonEmptyString1000`; `step.status` is `'pending' | 'completed'` (`schema.ts:107-115`). `createStep()` takes `goalId, title, ordinal?, plannedEvidenceTypes?` — no parent, no notes field, no lesson attachment (`queries.ts:354`). Evidence attaches to a step via `evidence.stepId` (`schema.ts:127`), but the step has no place for the reflection that turned the 8-gauge wrong turn into muscle memory. `reorderSteps(goalId, stepIds)` shuffles ordinals within one goal only (`queries.ts:527`).

**The gap.** What he wanted: each circuit as a sub-step under "Build practice panel," each carrying evidence-during-practice (notes-for-future-self, not completion proof), with the 8-gauge mistake preserved as a lesson that surfaces forward when he hits the journeyman exam's circuit-sizing section. What he got: one flat step titled "Build practice panel" that he eventually marked complete, with photos clustered under it and no way to encode either the sequence-as-syllabus or the wrong turn that taught him most. He keeps the 8-gauge story in his Notes app _(invented but plausible — not observed)_; the app loses the data entirely.

**A–G tags:**

- **A** — practice-panel work has natural substructure (per-circuit). Flat steps force the choice between one umbrella step that loses the circuits or three siblings that lose the umbrella.
- **C-order** — the circuits had to be done in order; the 15-amp lighting was the entry to the 20-amp run was the entry to the 240V. Sequence was the lesson, not bookkeeping.
- **D** — every circuit produced a one-line takeaway ("derating drops 12-gauge from 20A at 4+ in conduit"); nowhere to put it.
- **G** — the 8-gauge moment is the canonical lesson-from-failure: hypothesis (8 is plenty), contradiction (voltage drop on the long run), updated model (size by NEC Annex D, not by gut), forward reference (the journeyman exam).

**ND lens.** For an ADHD + dyslexic learner, the sequence-as-syllabus and the lesson-as-artifact are not bonuses — they are the only things that make a six-month gap between practice and test survivable. NT learners can re-derive the order from a textbook on demand; Tomás cannot, and shouldn't have to.

**Research finding (load-bearing for downstream design).** _Evidence-during-practice ≠ evidence-at-completion._ The `evidence.stepId` model fits the latter — proof a step is done. Tomás's practice-panel work is the former — notes-for-future-self attached to in-progress sub-steps whose umbrella completes at an external event (the test). This pattern generalizes to anyone whose work has a discrete completion event preceded by distributed practice: defenses, performances, demos, code reviews, exams.

### Ava and the four-month wait

**Letters:** C-waiting-on-external, D (date-as-metadata, folds in soft-B), E (waiting ≠ pending).

**Narrative.** Ava called the PIA in February and got an appointment four months out. The first intake is in June; the diagnostic sessions span July; the report is due back in October. Three of her five steps are not waiting on Ava — they are waiting on the PIA's calendar, the session window itself, and the clinic's report turnaround.

**Current behavior.** `step.status` is `'pending' | 'completed'` (`schema.ts:112`). There is no waiting state, no expected-date metadata, no distinction between "I haven't done this yet" and "this cannot be done until someone else does something on a date I don't control." `goal.description` is editable post-creation, but step-level notes do not exist.

**The gap.** What she wanted: the three externally-blocked steps to read _waiting on PIA, expected June 12_ — not _pending_. What she got: five pending steps, indistinguishable from the two that are actually on her. She maintains the dates in her phone's calendar app _(invented but plausible — not observed)_; the goal screen erases the most load-bearing fact about three of five steps. The re-orientation tax every time she returns to the app is enormous, and the binary status invites the question _why haven't I done this yet?_ — to which the honest answer is _because the system has not_, but the app cannot show that.

**A–G tags:**

- **C-waiting** — externally blocked, not user-blocked. Naming the blocker separates _stuck_ from _failing_.
- **D** — the expected date (June 12, late July, October) is the most important piece of metadata about each waiting step.
- **E** — _waiting_ is a state. Erasing it under _pending_ is the failure.

**ND lens.** For a suspected-autistic + ADHD user navigating bureaucracy, the difference between _I am late_ and _they are not ready yet_ is the difference between months of internalized shame and months of legitimate waiting. The binary state collapses the distinction and shifts the moral weight onto the user.

### Malik discovers UV unwrapping

**Letters:** A (nesting), F (mid-work capture).

**Narrative.** Malik's goal is "Complete first fully-textured 3D scene." He has steps for modelling, UV unwrapping, texturing, lighting, render. Halfway through UV unwrapping he realizes UV unwrapping is itself five things — seams, projection, packing, checker-test, retopo-fix — and he keeps re-learning them each session because he doesn't write them down.

**Current behavior.** `step.goalId` is a non-null foreign key (`schema.ts:109`); there is no `parentStepId`. `createStep(goalId, title, ordinal?, ...)` takes a goal, not a parent step (`queries.ts:354`). `reorderSteps(goalId, stepIds)` reshuffles within a single goal only (`queries.ts:527`). Capture flow exists for evidence types only — no inline "this is a sub-thing I'm learning right now" surface.

**The gap.** What he wanted: to add the five sub-steps under UV unwrapping, mid-session, in under five seconds, without leaving the texture he is working in his head. What he got: a choice between (a) keep the sub-tree mentally and lose it on the next context switch; (b) edit "UV unwrapping" into "UV: seams" and add four siblings, losing the parent concept and breaking the goal's coherence; (c) abandon the app for this and dump it in Notion _(invented but plausible — not observed)_. He picks (c) and the app loses the data.

**A–G tags:**

- **A** — substructure is _discoverable mid-work_, not knowable up front. A schema with no `parentStepId` forecloses the discovery.
- **F** — capture-flow friction is the killing constraint. If modelling the sub-tree costs a session, he won't do it; he'll do 3D work and write orgs in Notion.

**ND lens.** ADHD bursts of insight ("oh, UV is _five things_") need a landing place closer to the burst than three taps and a goal-edit screen. If the landing place isn't here, it's somewhere else — and somewhere else is where the app's whole model of his learning evaporates.

### Sam's Tuesdays — an arc, not a moment

**Letters:** B-soft-scheduling, E (missed-but-okay), D (one-line per week).

**Narrative.** Sam has a recurring step pattern around his Tuesday meeting. Some weeks he goes; some weeks he doesn't. He wants the not-going weeks to be honourable — not erased, not flagged, not summed against him. He wants to write one line afterward ("Hard week. Didn't go. Called Marcus instead.") and the next Tuesday to still be there.

**Current behavior.** Steps are `pending` or `completed` (`schema.ts:112`). There is no missed state, no soft-date semantics, no per-week note slot. The only way a "didn't go this week" is captured in the current model is by not completing the step — which is indistinguishable from not having opened the app.

**The gap.** What he wanted: each Tuesday as a soft commitment (_for Tuesday_, not _due Tuesday_); each missed Tuesday as a _missed-but-okay_ state with one optional line attached; the arc visible as "you went 7 of the last 10 Tuesdays" without that being scored. What he got: a single repeating step where silence and failure look identical. After two missed Tuesdays in a row the easiest move is to close the app for a week, which makes the third missed Tuesday a foregone conclusion _(invented but plausible — closing the app makes re-entry harder)_.

**A–G tags:**

- **B-soft** — the soft "for Tuesday" framing creates a Tuesday in the app that wouldn't otherwise exist. Time foothold, not deadline accountability.
- **E** — _missed-but-okay_ is a state the current vocabulary cannot name.
- **D** — the one-line-per-week note is where the arc gets its texture; without it the arc is just a count.

**ND lens.** For an ADHD + anxiety user in early recovery, the gap between _I didn't go_ and _I failed_ is the gap between a hard week and a relapse story. The product vision's no-time-based-shame principle dies if the schema cannot tell those two states apart.

**G drafting guardrail.** Sam's scenario deliberately includes no G slot. His missed Tuesdays are not lessons-from-task-failure to mine; they are weeks of being a human being. The same G machinery that helps Tomás turn an 8-gauge wrong turn into journeyman muscle memory becomes a shame-surveillance instrument applied to a recovery goal. This is the canonical case for G-opt-in-per-goal, and Sam is the persona whose presence in the doc most directly load-bears that constraint.

## Where this leaves the schema

The Step today is:

```ts
step: {
  id, goalId, title, ordinal,
  status: 'pending' | 'completed',
  completedAt,
  plannedEvidenceTypes,
}
```

The gaps surfaced above are not uniform in severity:

- **A** wants a nullable `parentStepId` self-reference. Reorder logic extends to within a sub-tree.
- **B-soft + E** want a richer `step.status` vocabulary plus an optional soft-date field. The shape of the vocabulary is itself a research question — what states exist beyond `pending`, `completed`, `missed`, `waiting`, `in-progress`, `abandoned`, and which of them are user-namable.
- **C-order** as a user-built dependency graph is non-trivial — a separate join table — and its UX is probably the riskiest part of any prototype in this set.
- **C-waiting** rides on the same state vocabulary as E (`status: 'waiting-external'`), plus a free-text "waiting on…" slot, with the expected-date supplied by D.
- **D** is a `step.note` (or `step.context`) free-text field. Cheap.
- **F** is a UI / capture-surface concern, not a schema concern — until it isn't (a triage state for unsorted captures may need its own column).
- **G** is the deepest schema change. A lesson is not media — `evidence` is media-typed and pointed at a step. A lesson has structure (hypothesis, contradiction, updated model, forward reference), attaches to past steps, and surfaces _forward_ when similar steps are started. There is no forward-reference mechanism today.

Solution-shape design is deliberately not in this section. Per the iteration strategy, prototyping is the next move for A, C, E, and G; B-soft and D could ship without a prototype if the framing is right.

## Open questions

- **G's forward-reference mechanism.** Does a lesson live as its own table (`lesson.fromStepId`, `lesson.targetTag` or `lesson.targetStepId`), or as a structured field on a completed step that gets surfaced by tag-matching against a new step's title at creation? The two answers point at very different UIs.
- **Opt-in granularity for G.** Per goal (recommended), per goal-template, or per-user-setting? Per-goal makes sense only if goal type is explicit; the current schema has no goal-type field, so this is its own question.
- **State vocabulary scope.** _pending, completed, missed, waiting-external, in-progress, abandoned_ is six. Five or six feels right; the friend's testing did not surface a seventh.
- **Substructure depth.** One level of nesting, or arbitrary? One level handles every scenario above; arbitrary opens the door to outline-tool drift away from the task view's "one next thing" promise.
- **Where the success scenarios live.** A parallel section — the same four personas, written as what success looks like once the model holds — is queued but not yet shaped. May land in this doc; may land alongside.
- **What this implies for the task view.** [The task view](../vision/product-vision.md#the-task-view--next-best-step) shows one next step per active goal. With substructure (A) and a richer state vocabulary (E), "next step" becomes ambiguous — the next leaf, the next umbrella, the next non-waiting step. Resolving this is part of any prototype.
