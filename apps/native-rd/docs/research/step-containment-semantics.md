# Parent ↔ sub-step containment semantics — research for #533

**Date:** 2026-07-30
**Status:** Draft — research, not a decision
**Owner:** Joe

**Scope reference:** [ADR-0010 §Phase B step-model crosswalk](../decisions/ADR-0010-phase-b-step-model-crosswalk.md), [ADR-0012 No-auto-judgment](../decisions/ADR-0012-no-auto-judgment.md), [ADR-0013 Consolidated Phase B position](../decisions/ADR-0013-phase-b-consolidated-position.md), [A-substructure prototype record](../plans/phase-b-prototype-records/A-substructure.md), dev plans [#292](../plans/dev-plans/issue-292-goal-card-focus-mini-timeline.md) / [#293](../plans/dev-plans/issue-293-timeline-substructure-rendering.md) / [#360](../plans/dev-plans/issue-360-focus-step-card-frame.md) / [#417](../plans/dev-plans/issue-417-paused-step-status.md)

All `file:line` references were re-verified against `docs/issue-533-step-containment-semantics` at `73e08cb` on 2026-07-30. Paths are relative to `apps/native-rd/`.

---

## TL;DR

**The unified rule this app already half-implements, stated once:** _evidence decides what may be completed; structure only decides what is offered._ Containment is informative in both directions — up and down — and the app **offers, never asserts, never refuses**.

Four things follow, and they reframe the issue:

1. **The gate question dissolves on mechanics, before ADR-0010 is consulted.** A "parent blocked until children are done" gate is not implementable as an invariant in this app for three independent reasons that have nothing to do with the ADRs (§Why a gate is out). ADR-0010 corroborates the answer; it is not the thing that decides it. **F1: keep, with the rationale now written down.**
2. **The dead end that prompted this issue is a discarded return value, not absent semantics.** `resolveNextActionableStep` already computes and returns `kind`, `childCount`, and `parentIndex`. `FocusModeScreen`'s `resolveFocusStepId` throws all three away and keeps only an id (`queries.ts:588-636`; `FocusModeScreen.tsx:92-98`). The parent-overview card, the "↳ part N of M" leaf line, and the Q9 "mark parent complete" checkbox are **all built, all translated in en/de/pseudo, and mounted by nothing but Storybook**. F3 is _wire existing UI_, not _design from zero_.
3. **The substantive question is the one the issue never asks.** A parent completed while its children are still pending is **silently unaccounted for**: the children keep surfacing as the next action forever, under a parent the app shows as done, and no surface says so. That is **F6** — the same class of confusion as the original dead end, pointing the other way.
4. **Resolution for F6: the app asks.** After a parent completion is applied, offer the user what to do with the still-pending parts — three options, _Keep them · Set the parts aside · Edit the parts…_ — fired **after** completion, never as a pre-condition of it.

And one line that should not be re-derived later: **a `completed` parent means "I'm done with my part of this," not "this subtree is closed."**

---

## Answering the issue's nine questions

Every question is answered below; this table is the index.

| #   | Question                                                                                                             | Where                                      | Short answer                                                                                                                                                     |
| --- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | Is A-containment categorically different from a C-order prerequisite? Is a gate barred without superseding ADR-0010? | §Why a gate is out · §Constraint landscape | Moot in the direction that matters. A gate is out on mechanics regardless. ADR-0010 need not be superseded, and should not be touched.                           |
| Q2  | Blocked / warned / offered / auto-applied / independent — both directions?                                           | §The offer · §ND-safety analysis           | **Offered**, both ways. Up: the Q9 invite (built, unwired). Down: F6's parts offer (new). Never auto-applied, never blocked.                                     |
| Q3  | Is F2 a bug, and what should all-paused children resolve to?                                                         | §F2 · §The `parked` collision              | A bug **and** an on-record deferral (#417). Resolves to a distinct third kind — the parent-level analogue of the existing `parked` concept — not `invite`.       |
| Q4  | Does the answer generalise past one nesting level?                                                                   | §Reach of the model                        | No decision forced. Depth is already one level, enforced in code by orphan promotion (`queries.ts:591-608`).                                                     |
| Q5  | What happens to F5's counting under each option?                                                                     | §Reach of the model                        | Nothing. Every-unit counting is #292 R1, a named decision; none of the recommended work reopens it.                                                              |
| Q6  | Which surfaces must agree?                                                                                           | §Reach of the model                        | Three: `GoalsScreen`, `TimelineJourneyScreen`, `FocusModeScreen`, all via `resolveNextActionableStep`. Only the resolver change (F2) is genuinely three-surface. |
| Q7  | Is F4 (Timeline as an acting surface) still needed once F2 + F3 land?                                                | §F4                                        | No — not as this dead end's fix. #417's split stands. It survives as a separate product wish.                                                                    |
| Q8  | New `FocusCurrentTaskCard` variant, or a distinct archetype?                                                         | §The offer → archetype                     | Distinct archetype. Port the existing `StepOverviewCard`, per #360 D1.                                                                                           |
| Q9  | ND-safety per option: absence-as-failure? counts or scores? reversible and hand-editable?                            | §ND-safety analysis                        | Full matrix over six options. The gate is the one that fails, and the offer is the one that passes in both directions.                                           |

---

## What the code actually does

### One coherent rule is already implemented — at both container levels

The issue expects to find inconsistency. The verified position is the opposite: the app applies **the same rule** at the step level and at the goal level, and that rule is _evidence gates completion; structure does not_.

| Level    | The gate                                                                                                                                                                                            | Does structure gate anything?                         |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **Step** | `completeStep` throws unless `canCompleteStep(plannedEvidenceTypesJson, stepEvidence)` passes — at least one captured evidence type matching the plan (`queries.ts:334-349`, thrown at `:860-867`). | No. No completion path reads `parentStepId`.          |
| **Goal** | `useCreateBadge` throws unless `canCompleteGoal(goalEvidence)` passes — at least one goal-level evidence item (`queries.ts:357-361`; enforced `useCreateBadge.ts:341-345`).                         | **No.** Goal completion never inspects step statuses. |

That second cell is the load-bearing one. If a "container is gated on its contents" rule existed anywhere in this app, the goal ↔ step relationship is where it would live — it is the older, better-trodden containment. It is not there. The parent ↔ sub-step level is not an oversight relative to a stricter sibling; it is **consistent with the only container rule the app has**.

So the symmetry argument runs: adding a child gate at the step level would make the _step_ level the anomaly.

### Correction: `areAllStepsComplete` gates nothing, and its docstring is stale

`areAllStepsComplete` is the natural candidate for "the goal-level structural gate," and its own docstring invites that reading:

> "Whether every step in a goal is complete — the data-layer rule behind FocusModeScreen's 'Mark complete' gate (`allStepsComplete`) … a single paused step blocks completion (#417 D6)." — `queries.ts:372-378`

**This is no longer true.** `FocusModeScreen` does not import it, does not compute `allStepsComplete`, and holds no goal-completion affordance at all — the #466 Focus Mode rebuild removed that path. Its sole live consumer is:

`TimelineJourneyScreen.tsx:276` → `<FinishLine allStepsComplete={…} />` → `FinishLine.tsx:16,48` → `<TimelineNode celebrate={allStepsComplete} />`

— **a star colour.** Nothing is gated. The claim was accurate when #417 wrote it (`issue-417-paused-step-status.md:44`, D6) and died in the #466 rebuild without the docstring following.

Two consequences: (a) no argument in this doc may lean on `areAllStepsComplete` as a structural gate, and (b) the stale docstring is a trivial follow-up fix (§Follow-ups).

---

## Current-state map (F1–F6)

### F1 — No child gate anywhere · verdict: **keep, with the rationale written down**

**Issue's claim:** `completeStep` gates only on evidence; no completion path reads `parentStepId`; a parent completes with every sub-step pending. The resolver's docstring says this is intentional but records no rationale.

**Re-verified:** accurate. `completeStep(id, plannedEvidenceTypesJson, stepEvidence)` (`queries.ts:854-858`) — the signature has no goal id, no row array, no tree. The docstring line is at `queries.ts:575-578`: _"a manually completed parent that still has pending sub-steps doesn't hide them — step completion is per-step, not cascaded."_

**Verdict: keep.** Not because the ADRs forbid a gate, but because a gate is not implementable as an invariant here (§Why a gate is out). What was missing is the _reason_, which this doc supplies and ADR-0014 will record.

### F2 — A paused child reads as satisfied · verdict: **fix**

**Issue's claim:** the "is any child still pending?" test excludes `completed` **and** `paused`, so pausing every child makes the subtree read as finished and the resolver returns `{ kind: "invite" }` on the parent. Direct cause of the dead end.

**Re-verified:** accurate, at `queries.ts:612-615`:

```ts
const pendingChild = children.find(
  (c) => c.status !== StepStatus.completed && c.status !== StepStatus.paused,
);
```

**But it is not an unnoticed bug — it is an on-record deferral.** #417's own Not-in-Scope table names this exact case:

> "`invite` state when a pending parent's only non-completed child is `paused` … Whether 'all substeps done' should read as invite when one is merely set-aside is a UI-semantics call. The UI that can create a paused sub-step doesn't exist until #377/#378 … Left unchanged here." — `issue-417-paused-step-status.md:159`

The deferral's precondition has now expired: #466 shipped the Focus Mode set-aside button, so paused sub-steps are user-creatable. The UI-semantics call is due.

**The actual defect is that one predicate answers two different questions.** `pendingChild` is used for both:

- _"What do I put in front of you next?"_ — here skipping `paused` is **correct**. That is the entire point of set-aside (#417): a step you deliberately parked must not be re-offered as the next action.
- _"Is this subtree finished?"_ — here `paused` must **not** count as done. Set aside ≠ done.

**Fix:** `invite` means _every child `completed`_. A pending parent whose non-completed children are all `paused` resolves to a **distinct third kind**, not `invite`.

**Do not** make `paused` count as pending. That resurfaces deliberately set-aside steps as the next action and breaks #417's core promise.

The fix also makes the Q9 copy honest. The prototype's invite line is _"completing the parts changed nothing by itself — this stays your call"_ (`A-substructure.md:116-121`). Today that sentence can appear over parts that were **set aside, not completed** — the copy would be asserting something false.

#### The `parked` collision

The natural name for the new kind is `parked` — the issue guesses at it in Q3. Note that the name is **already in use one level up**: `focusMode:parked.*` (`en/focusMode.json:69-74`) is the goal-level all-set-aside state — _"Nothing in progress. {{count}} set aside — all still here, none hidden, nothing counted."_ — rendered by `FocusParkedState.tsx:39-77`, which is itself built and currently unmounted by any screen.

This is a feature, not a clash: the parent-level case is the same concept scoped to a subtree, and the copy register is already established and ND-checked. The F2 issue should say plainly whether it reuses the `parked` name for the resolver kind (recommended) and how the i18n keys are namespaced so the two do not collide.

### F3 — The invite card never says it is a parent · verdict: **needs correction — it is smaller and differently shaped than stated**

**Issue's claim:** the card discards `kind`; a parent renders byte-identical to a flat step; **no `FocusCurrentTaskCard` prop and no `focusMode:` i18n key exist for it.**

**Re-verified: the last clause is false on both counts.** What actually exists:

| Piece                                                                | State                                         | Location                                                                                                                                                 |
| -------------------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resolver returns `kind` / `childCount` / `parentIndex`               | **Exists**                                    | `queries.ts:557-561` (the union), returned at `:617-619`, `:630-632`                                                                                     |
| `FocusModeScreen` keeps only the id                                  | Confirmed — the discard                       | `FocusModeScreen.tsx:92-98`, specifically `:94`                                                                                                          |
| Parent overview card with parts spine, evidence rollup, per-part tap | **Built**, Storybook-covered                  | `components/StepCard/StepOverviewCard.tsx`                                                                                                               |
| The exact Q9 checkbox copy                                           | **Built + translated**                        | `focusMode:overview.markComplete` = `Mark "{{parent}}" complete` (`en/focusMode.json:18`), used at `StepOverviewCard.tsx:71`                             |
| Quiet pre-completion prompt                                          | **Built + translated**                        | `focusMode:overview.partsPendingPrompt` = `Complete the parts to finish` (`en/focusMode.json:17`)                                                        |
| Leaf child-context line                                              | **Built + translated in all three locales**   | `focusMode:band.childContext` = `↳ {{parent}} · part {{index}} of {{total}}` (`en:10`, `de:10`, `pseudo:10`), rendered by `StepCardTopBand.tsx:60`       |
| Screen that mounts any of it                                         | **None**                                      | `StepOverviewCard` / `StepCardTopBand` are reached only via `StepCard.tsx:185,316`, and `StepCard` itself is imported by `CardCarousel.stories.tsx` only |
| `FocusCurrentTaskCard` parent variant                                | Genuinely absent — 4 variants, no parent case | `FocusCurrentTaskCard.types.ts:109-113`                                                                                                                  |

So F3 is: **stop discarding a return value the data layer already computes, and mount UI that is already built and already translated.** The only genuinely new work is the wiring and the decision about which card archetype receives it (§The offer → archetype).

This matters beyond accuracy — it is what makes F6's "keep them" option tenable (§The offer).

### F4 — Timeline carries no step actions · verdict: **keep**

**Re-verified:** accurate. `TimelineJourneyScreen` calls no `resumeStep` / `pauseStep` / `completeStep` / `uncompleteStep` — read-only plus navigation.

**Verdict: keep**, and the issue's own conditional (Q7) is what settles it. F4's justification _as this dead end's fix_ was "the only surface that shows every step cannot act on any of them, so resuming anything requires a hop through Focus Mode." Once F2 and F3 land, Focus Mode itself shows the parts and gives a route to them, and that justification evaporates.

#417's split is explicit and stands: the Set aside / Pick back up **button** lives in the Focus rebuild (`issue-417-paused-step-status.md:154`), the Timeline set-aside **count** lands in #378 (`:155`). Reversing it needs its own decision, and would widen #526 (missing set-aside screen-reader announcements) to a second surface. F4 survives as a separate product wish, not as a finding of this research. **No issue filed.**

### F5 — Progress counts parent + children as peers · verdict: **keep, with rationale**

**Re-verified:** accurate, and already on record twice.

```ts
// Every-unit progress (#292 R1): parents and children are all rows in
// `steps`, so counting every row is the every-unit rule with no filtering.
```

— `GoalsScreen.tsx:61-62`

The decision is #292 R1 (`issue-292-goal-card-focus-mini-timeline.md:57`, D8 at `:112`): _"Every-unit — count all step rows (parents + children) … the only rule where the parent's manual completion (the invite action) advances the bar."_ Decided by Joe, 2026-06-20. The Q9 prototype record flagged the same 5/6 readout as a guardrail observation (`A-substructure.md:139-140`, `:183-184`).

**Verdict: keep.** This is a named, cited tradeoff, not an oversight. Any change must explicitly reopen #292 R1, and nothing recommended here does. **No issue filed.**

### F6 — A parent completed with live children is silently unaccounted for · **new finding, and the substantive one**

Not in the issue. Surfaced by tracing the _other_ asymmetry — the issue traces "parent resumed, children paused"; this is "parent completed, children pending."

**The mechanic:** the pending-child branch wins **before** the parent's own status is checked.

```ts
if (pendingChild) {
  return { kind: "leaf", index: pendingChild.index, parentIndex: step.index };
}
// No pending child: skip once the step itself is complete … or paused.
if (step.status === StepStatus.completed || step.status === StepStatus.paused)
  continue;
```

— `queries.ts:617-627`

So a completed parent with pending children keeps yielding those children as the next action — **forever**, until each is individually completed or set aside. That behaviour is deliberate and correct in isolation (the docstring at `:575-578` says so: don't hide live work under a completed parent). What is missing is that **nothing tells the user this state exists.**

**Per-surface readout of "parent 1 completed; children a, b pending":**

| Surface                      | What the user sees                                                                     | Is the contradiction visible? |
| ---------------------------- | -------------------------------------------------------------------------------------- | ----------------------------- |
| Focus Mode card              | `a` — rendered byte-identical to a top-level step. No "↳ part 1 of 2", no parent name. | **No** (that is F3)           |
| Cockpit hero (`GoalsScreen`) | Next step: `a`. Parent context omitted **by design** — `GoalsScreen.tsx:69-72`         | **No**, deliberately          |
| Cockpit progress             | `1/3` — parent counted as done, children not (#292 R1)                                 | Only as a number              |
| Timeline                     | Parent node shows completed, children below show pending                               | **Yes** — and only here       |
| Timeline finish-line star    | Not celebrating (`areAllStepsComplete` false)                                          | Only as a colour              |
| Goal completion              | Unaffected — gated on goal evidence only                                               | No                            |

The one surface that shows the contradiction is the one that cannot act on it (F4). So the user sees a parent marked done, keeps being handed its parts as though they were unrelated top-level work, and gets no account of the relationship anywhere they can do something about it.

**Verdict: fix — by asking.** Design in §The offer.

---

## Why a gate is out

Three mechanical reasons, each sufficient on its own. None of them is an ADR.

**1. The signature has no view of the tree.**

```ts
export function completeStep(
  id: StepId,
  plannedEvidenceTypesJson: string | null,
  stepEvidence: { type: string | null }[],
);
```

— `queries.ts:854-858`

A step id, a plan string, and that step's evidence rows. There is no goal id and no row array. Gating on children means threading the subtree — or a live query — through every call site of a function whose entire design records completion as a **per-step fact**. The signature is itself the historical evidence that this was intended.

**2. Evolu is a CRDT — the gate cannot be an invariant, only advisory.**

Two devices, offline: device A completes parent `1`; device B adds child `c` under `1`. Both writes are valid, both merge, and the result is a completed parent with a pending child. No gate on the write path can prevent it, because neither write was individually illegal. A "parent cannot be complete while a child is pending" rule is therefore **not enforceable as a data invariant** in this architecture — at best it is a UI-time check that the sync layer can violate behind your back.

That in turn means the app must handle the parent-completed-with-live-children state _anyway_ (F6). Given that it must handle it, refusing to let the user create it deliberately buys nothing and costs agency.

**3. Three other status paths bypass it.**

Exactly four functions write `step.status` (`queries.ts:882, 901, 924, 943`):

| Function                  | Writes      | Gate?         |
| ------------------------- | ----------- | ------------- |
| `completeStep` (`:854`)   | `completed` | Evidence only |
| `uncompleteStep` (`:896`) | `pending`   | **None**      |
| `pauseStep` (`:917`)      | `paused`    | **None**      |
| `resumeStep` (`:938`)     | `pending`   | **None**      |

(`updateStep` at `:751` handles title, ordinal, parent, evidence plan, dependency and date fields — it does **not** write `status`. The `#533` plan's draft claimed it did; corrected here.)

A child gate on `completeStep` alone leaves the state reachable through three unguarded siblings, and guarding all four turns three trivial state-flips into tree-aware operations. The cost is the whole status surface; the benefit is a rule the CRDT can undo anyway.

### And the ADRs agree — as corroboration, not as the deciding authority

ADR-0010: _"C-as-constraint is out. Ordering may inform the user, but the app does not refuse an action because a prerequisite is incomplete"_ (`ADR-0010:48-49`), with the crosswalk row spelling out _"does not build a constraint engine that blocks, hides, or refuses actions because a prerequisite is incomplete. The relationship is informative, not punitive"_ (`:60`).

Strictly, that row is about **C-order** prerequisites, not **A-containment** — so the issue's Q1 is a fair question and not obviously answered by the text. It does not need answering. The mechanics reach the same destination without adjudicating the ADR's scope, which is the cheaper and more durable route: **ADR-0010 stays untouched, and nothing in the recommendation refuses an action.**

### Naming the gate's own risk (Q9's ND test)

The issue asks explicitly that a gate not be treated as the conventionally "safe" default. It is not the safe option here. A gate:

- **interprets an absence as failure** — "you have not done the parts" becomes the app's reason for refusing you;
- **arrives at the moment of a win**, which is the worst possible moment to be told no;
- **is unfalsifiable from the user's side** — the person who genuinely finished the container work in a different order than they planned it has no way to say so except by faking the sub-steps;
- **converts a planning artefact into an obligation**. Sub-steps in this app are often _discovered mid-work_ (ADR-0013 `:55`). Making them binding punishes the user for having written down more detail — exactly backwards.

The last point is the sharpest. If completing a parent requires completing its parts, then **adding a sub-step makes your goal harder to finish**, and the rational response is to stop writing them down.

---

## Walking the two dead ends

Both traced through `resolveNextActionableStep` (`queries.ts:588-636`) with the actual branch lines. Setup in both: goal has top-level step `1` with children `a`, `b`.

### Dead end 1 — parent resumed, all children paused (the issue's)

States: `1` = `pending`, `a` = `paused`, `b` = `paused`.

1. `:591-593` — `rootIds = {1}`.
2. `:599-608` — `a`, `b` attach to `childrenByParent["1"]`; `1` goes to `topLevel`.
3. `:612-615` — `pendingChild` filters out both `completed` **and** `paused` → `undefined`. **This is F2.**
4. `:623-627` — `1` is `pending`, so no skip.
5. `:630-632` — `children.length > 0` → returns `{ kind: "invite", index: 0, childCount: 2 }`.

The resolver is telling the truth about what it was asked and a falsehood about what matters: `childCount: 2` here means _two children, both set aside_, but `invite` means _all parts are done, want to close the container?_

6. `FocusModeScreen.tsx:94` — `rows[actionable.index]?.id`. `kind` and `childCount` **discarded**.
7. The screen renders `FocusCurrentTaskCard status="in-progress"` (`FocusModeScreen.tsx:456-469`) — the flat-step view.

Result: the parent presented as an ordinary next action, ready to finish, with no mention that `a` and `b` exist and no route to them. **Two independent failures compounding**: F2 produced a wrong classification, and F3 discarded even that.

### Dead end 2 — parent completed, children pending (F6)

States: `1` = `completed`, `a` = `pending`, `b` = `pending`.

1. `:612-615` — `pendingChild` = `a`.
2. `:617-619` — returns `{ kind: "leaf", index: 1, parentIndex: 0 }` **before** `1`'s own status is ever read (`:623` never runs for this step).
3. `FocusModeScreen.tsx:94` — `parentIndex` **discarded**.
4. `a` renders as a flat in-progress card.

Result: `a` and `b` keep surfacing as next actions, indefinitely, under a parent the rest of the app shows as done, and only the read-only Timeline reveals it (§F6 table).

**What the two have in common:** in both, the data layer computed the right structural fact and the screen threw it away. Neither is a missing-semantics problem. One is a wrong predicate (F2); both are a discarded return value (F3).

---

## The offer

F6's design. Everything here is _recommendation for a follow-up issue_, not built.

### After, never before (the shape of it)

The offer fires **after** the parent completion is applied and committed. It never intercepts "mark complete."

A modal that appears _before_ completion — "you still have 2 parts pending, are you sure?" — is a gate wearing a costume. It makes completing a parent feel like it requires justification, and it lands on the user at the moment of finishing something. The only thing separating it from a refusal is that one of its buttons proceeds. That is not enough separation.

Apply, then offer. Dismissal is a **safe no-op** landing exactly on the current behaviour — the parts stay pending and keep surfacing, which after F3 is explained rather than mysterious.

It lives in `FocusModeScreen`, which already holds `stepRows` and already wraps `completeStep` in its mutation handler (`FocusModeScreen.tsx:291-296`). **The data layer is untouched** — which is what keeps §Why a gate is out true rather than quietly reintroducing containment logic underneath the argument against it.

### Trigger and scope

Fire when: the just-completed step is a **parent** (has children) **and** ≥1 child is `pending`.

- Children already `paused` are **left untouched and not mentioned**. They were set aside by choice; re-asking is nagging.
- **All** children already `paused` → **no offer at all.** That is the `parked` case (F2), and it is handled by the resolver, not by a modal.
- Leaf completion → no offer. Nothing to ask about.

### The option set, and what constrains it

Legality was checked against the mutation layer, not assumed:

| Option                    | Mechanism                                                     | Always legal?                                                        |
| ------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Keep them**             | no-op                                                         | Yes — this is also the dismiss/default path                          |
| **Set the parts aside**   | `pauseStep(childId)` per pending child (`queries.ts:917-930`) | Yes — no evidence gate; reversible via `resumeStep` (`:938-949`)     |
| _Mark the parts done too_ | `completeStep` per child                                      | **No** — throws for any child failing `canCompleteStep` (`:860-867`) |
| **Edit the parts…**       | navigate to Edit mode                                         | Yes — no mutation of its own                                         |

**Why "mark the parts done too" is not in the first cut.** Two reasons, and the second is the real one.

Mechanically, offering it unconditionally would half-apply and then throw partway through the children — the worst possible failure at a completion moment. It could be conditionally revealed only when _every_ pending child already holds matching evidence, which is house style rather than invention (`FocusCurrentTaskCard`'s `completionReady`, #497 D1; the same conditional-reveal logic the data layer documents at `queries.ts:323-328`).

But that condition is doubly rare — a child holding matching evidence is usually already completed — and shipping it would make a fourth button on a modal that appears unbidden. **Deferred**, and listed as an open question.

Substantively: asserting evidence-backed completion on evidence-free work is precisely the **auto-judgment** ADR-0012 forbids — the app deciding what the user's work amounted to. Set-aside carries no such claim. It is a _scheduling statement_, not a verdict, which is why it can be applied in bulk and the completion cannot.

### Why delete is a route, not a button

The user's "I decided I don't need these parts" case is real, and set-aside cannot express it. **Set aside means _later_. Delete means _never_.** Both are legitimate things to say at this moment, and only the first is expressible today.

But delete does not belong in this modal:

1. **`deleteStep` is irreversible in practice.** It is a soft delete — `evolu.update("step", { id, isDeleted: sqliteTrue })` (`queries.ts:956-964`) — but there is **no `undeleteStep` / `restoreStep` anywhere in `queries.ts`**, and every other `isDeleted` reference is a `where … is null` filter. The row survives in the CRDT and is unreachable by the user. Verified: grep over `queries.ts` returns filters and three soft-delete writers (goal `:274`, step `:959`, evidence `:1295`) and no restore path of any kind.
2. **It would seat an irreversible action one tap from a reversible one**, in an unbidden modal, right after a win, mid-flow, with no undo.
3. **It escapes ADR-0012's override.** _"Every state is hand-editable. The user can set any state by hand, overriding …"_ (`ADR-0012:57`) is what legitimises automating anything here. Delete is not a state change — it is removal from every surface, and the override cannot reach it.
4. **Precedent already draws this line.** Structural editing is Edit mode behind a confirm; Focus Mode is for doing the work.
5. **To be safe it would need its own confirm** — i.e. a confirm nested inside an offer immediately after a completion.

So the third slot is **"Edit the parts…"**, navigating to Edit mode, where sub-step delete already exists behind `ConfirmDeleteModal` (`EditGoalView/EditGoalStepList.tsx:80,82,531-539`; wired through `EditModeScreen.tsx:247`; the prop also threads through `NewGoalWizard.tsx:130,282,643`). This expresses "never" without putting a trapdoor beside "later", and reuses a built, confirm-gated path rather than duplicating a destructive action into a flow-state surface.

### First cut: three options

> **Keep them** · **Set the parts aside** · **Edit the parts…**

Three is also the practical ceiling for a modal that appears unbidden at a completion moment.

### Bulk, not per-part — and where per-part lives

The modal is **bulk**: it acts on all pending children at once. Per-child selection inside it would make it a second editor.

The fine-grained route already exists: `StepOverviewCard` lists each part individually and each is tappable, with `focusMode:overview.partOpenHint` = _"Opens this part"_ (`en/focusMode.json:20`, wired at `StepOverviewCard.tsx:124-129`). Once F3 ports that card, per-part action has a home and the modal does not need to grow one.

### Archetype (Q8): port `StepOverviewCard`

Distinct archetype, per **#360 D1** (`issue-360-focus-step-card-frame.md:133`): _"Candidate selection: C — Parent overview … Answers parent rollup (Q10) + gives the Q9 manual-complete invite a clear home. Cost accepted: two card archetypes."_ The card is built, Storybook-covered, translated, and unmounted. Note #360 D10 (`:142`) also settled its footer: the overview foot **is** the mark-complete invite once all parts are done, otherwise the quiet `partsPendingPrompt` — no bespoke "open next part" button.

The parts-offer modal itself follows `ConfirmDeleteModal` (`components/ConfirmDeleteModal/ConfirmDeleteModal.tsx:35-70`): RN `Modal` `transparent` + `animationType="fade"`, `accessibilityViewIsModal`, `SafeAreaView edges={["bottom"]}`, `Card size="normal"`, `Text variant="headline"` with `accessibilityRole="header"`, content block `accessible` + `accessibilityLiveRegion="polite"`.

### Reopening a parent needs no rule of its own

`uncompleteStep` (`queries.ts:896-908`) sets the parent back to `pending` and touches nothing else. Its paused children stay paused, remain individually resumable, and are listed by the ported overview card. A parent reopened with all children paused simply **is** the `parked` case from F2.

Symmetric with the offer: the app offers in both directions and automates in neither. No new mechanism.

### Copy constraints

New keys under `focusMode:partsOffer.*`, in **en / de / pseudo** (the three-locale parity the repo enforces).

The copy must be **factual**, and must not:

- frame the pending parts as a failure — never _"you left 2 parts unfinished"_;
- count or score — no _"only 1 of 3 done"_ framing;
- imply the completion was premature or provisional;
- imply that dismissing is the wrong answer.

It states what is true — the parent is done, these parts are still open — and asks what the user wants. The existing register to match is `focusMode:parked.body`: _"{{count}} set aside — all still here, none hidden, nothing counted."_

---

## Constraint landscape

| Source                                                       | What it actually says                                                                                                                                                                                                                                                                                | Bearing here                                                                                                                             |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **ADR-0010** `:48-49`, `:60`                                 | C-as-constraint is out; the app does not refuse an action because a prerequisite is incomplete; _"the relationship is informative, not punitive."_ Scoped to **C-order**, not explicitly to A-containment.                                                                                           | Corroborates §Why a gate is out. **Left untouched** — nothing recommended here refuses an action, so its scope never needs adjudicating. |
| **ADR-0012** `:36-46`                                        | Splits auto-**judgment** (forbidden: the app decides the user failed) from auto-**bookkeeping** (allowed, _"the reason to build software"_), and names _"marks a parent done when every child is checked"_ as a permitted bookkeeping example (`:41`).                                               | Cascade-up is **permitted**, not required. The recommendation declines the permission in favour of an offer — see below.                 |
| **ADR-0012** `:57`                                           | _"Every state is hand-editable."_ The override is what keeps automation legitimate.                                                                                                                                                                                                                  | The reason delete gets a route, not a button (§The offer): delete is the one action the override cannot reach.                           |
| **ADR-0012** `:77-80`                                        | **Explicitly reopens A-prototype Q9**: parent completion was manual-only on no-auto-state grounds; under no-auto-judgment _"all parts checked → parent done"_ is reversible arithmetic, not a verdict, so auto-complete is now permissible — _a prototype question, not a settled manual-only rule._ | The live question. **Settled here in the offer direction** — see the note below.                                                         |
| **ADR-0013** `:55`                                           | A-substeps: _"No depth decision yet (one level, two, arbitrary). Task view does not become an outline browser."_                                                                                                                                                                                     | Not forced by a containment rule (§Reach of the model). Depth stays open.                                                                |
| **A-substructure Q9 record** `:116-121`                      | Verified clean: all parts checked, a plain _"Mark 'Wire the circuits' complete"_ checkbox, plus _"completing the parts changed nothing by itself — this stays your call."_ Manual, discoverable, never demanded.                                                                                     | **Adopted.** The copy exists in the codebase already (`focusMode:overview.markComplete`) and F3 mounts it.                               |
| **A-substructure guardrail audit** `:139-140`, `:183-184`    | Flags the every-unit `N/M` count reading 5/6 with all children done and the parent open.                                                                                                                                                                                                             | That is F5. On record, kept (#292 R1).                                                                                                   |
| **#360 D1** `:133`, **D10** `:142`                           | Candidate C — Parent overview — chosen at the 2026-06-21 ND-user gate, partly _because_ it gives the Q9 invite a home. Two card archetypes was the accepted cost. Foot stays consistent with leaf cards.                                                                                             | **Adopted** as F3's archetype (Q8).                                                                                                      |
| **#292 R1 / D8** `:57`, `:112`                               | Every-unit progress: count all step rows. _"The only rule where the parent's manual completion advances the bar."_                                                                                                                                                                                   | **Adopted as-is.** F5 keeps.                                                                                                             |
| **#292 / #293 deferrals** `issue-292…:315`, `issue-293…:182` | Both deferred the rich Q9 affordance (childlist + "Mark complete" + "this stays your call") to post-Stage-6; #293 renders the invite state with **no completion action**.                                                                                                                            | The gap is **unbuilt, not unknown** — and since #360/#361 it is _built but unmounted_. F3 closes it.                                     |
| **#417** `:154-155`, `:159`                                  | Focus owns the set-aside button, Timeline owns the count (#378). And: the `paused`-child invite case was **explicitly left open** pending the UI that can create paused sub-steps.                                                                                                                   | F4 keeps the split. F2's deferral precondition has expired — the call is due.                                                            |
| **#417 D6** `:44`                                            | Recorded that `areAllStepsComplete` backs FocusModeScreen's Mark-complete gate, paused blocks it.                                                                                                                                                                                                    | **True then, dead now.** The #466 rebuild removed that gate; only the docstring survives (§Correction).                                  |
| **#497 D1** `issue-497…:66`                                  | Conditional-reveal-on-evidence (`completionReady`) is established house style.                                                                                                                                                                                                                       | Precedent for the deferred "mark the parts done too" option.                                                                             |

### On ADR-0012's reopened Q9

ADR-0012 makes cascade-up **permissible** — "all parts checked → parent done" is reversible arithmetic. This research declines that permission, and it is worth being clear that this is a choice, not a reading of a prohibition.

The reason is that arithmetic is only reversible-and-harmless when the premise is certain, and here it is not. _"Every child is completed"_ does not entail _"the parent's own work is done."_ A parent step routinely carries work of its own that no child represents — the assembly, the review, the thing you only see once the parts are in front of you. The prototype's own copy anticipates exactly this: **"completing the parts changed nothing by itself — this stays your call"** (`A-substructure.md:116-121`). Auto-completing the parent would make that sentence a lie, and would silently claim the user finished something they may not have.

The offer keeps the arithmetic (the app notices, and says so) and declines the verdict (the app does not decide). **ADR-0014 should record this as Q9's settlement in the _offer, never automatic_ direction, in both directions of the tree.**

---

## Reach of the model

### Depth (Q4) — no decision forced

Already decided in code. `resolveNextActionableStep` builds `rootIds` from `parentStepId == null` (`queries.ts:591-593`) and **orphan-promotes** anything deeper: a row whose `parentStepId` is not a present top-level step surfaces as top-level (`:599-608`, docstring `:570-573`). `GroupedStep`'s own contract says the same — _"Depth is capped at one level — child nodes always carry an empty `children` array (#290)"_ (`queries.ts:406-409`).

So a two-level containment rule cannot be written by accident: grandchildren are structurally invisible as grandchildren. ADR-0013's open depth question (`:55`) is not forced by anything recommended here, and Q4 is **withdrawn from the open-questions list** — it is answered by precedent, and if depth is ever opened, the containment rule generalises unchanged because it is stated per-container, not per-tree.

### Counting (Q5) — unchanged under every recommended option

Every-unit counting (#292 R1) is orthogonal to containment semantics: it counts rows, and none of F2/F3/F6 adds, removes, or reclassifies rows. Under the offer, "set the parts aside" changes children from `pending` to `paused` — neither counts as completed, so `N/M` is unmoved. Only an option that _completed_ children would move the bar, and that option is deferred.

Worth stating for the record so a later reader does not assume otherwise: **a parent remains a counted unit.**

### Three surfaces (Q6)

`resolveNextActionableStep` is consumed by exactly three screens — `GoalsScreen.tsx:73`, `TimelineJourneyScreen.tsx:60`, `FocusModeScreen.tsx:93` (re-exported at `db/index.ts:28`).

Only **F2** is genuinely three-surface: adding a `parked` kind changes the union (`queries.ts:557-561`), so every consumer's handling must be checked. In practice the blast radius is small — `GoalsScreen` only reads `next.index` for a title (`:73-75`), `TimelineJourneyScreen` adapts it at `:60`, and `FocusModeScreen` discards everything but the index (`:94`). The exhaustiveness discipline is the point, not the volume of edits.

**F3** and **F6** are `FocusModeScreen`-only. Neither touches the data layer.

---

## ND-safety analysis

Q9's three tests applied to each candidate. **A** = interprets an absence as failure. **C** = counts or scores the user, or imposes a verdict. **R** = stays reversible and hand-editable per ADR-0012.

| Option                                                                                        | A — absence as failure?                                                                                 | C — verdict on the user?                                                                                                                                                                           | R — reversible?                                                    | Assessment                                                                                                                                                                                                                                           |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Gate** — parent blocked until children done                                                 | **Yes.** Unfinished parts become the app's stated reason for refusing you, at the moment of a win.      | **Yes.** "You have not earned this." And it makes writing down more detail actively harder — sub-steps become obligations.                                                                         | N/A — refuses rather than records                                  | **Rejected.** Fails A and C outright, and is not implementable as an invariant anyway (§Why a gate is out).                                                                                                                                          |
| **Warn** — allow, but flag it as a problem                                                    | **Yes**, softened. A warning still names the state as wrong.                                            | Mild but real — it editorialises.                                                                                                                                                                  | Yes                                                                | **Rejected.** Same failure, quieter. The state is not an error; it is a legitimate thing to do.                                                                                                                                                      |
| **Offer-up** — the Q9 invite (all parts done → _"Mark 'X' complete"_)                         | **No.** Fires on a _completion_, not an absence.                                                        | **No.** _"Completing the parts changed nothing by itself — this stays your call."_                                                                                                                 | Yes — a checkbox, undone by `uncompleteStep`                       | **Adopted (F3).** Already prototype-validated (`A-substructure.md:116-121`) and already built.                                                                                                                                                       |
| **Offer-down** — F6's parts offer                                                             | **No.** Reports a fact about the parts, does not evaluate them. Fires _after_ the completion is banked. | **No.** All options are scheduling statements; dismissal is a first-class, no-penalty answer.                                                                                                      | Yes — `pauseStep` ⇄ `resumeStep`; the modal cannot delete anything | **Adopted (F6).** Conditional on the copy constraint (§The offer → copy) holding.                                                                                                                                                                    |
| **Auto-apply** — cascade-up (parent auto-completes) or cascade-down (children auto-set-aside) | No                                                                                                      | **Yes**, in the direction that matters. Cascade-up asserts the parent's own work is done, which "all children checked" does not entail. Cascade-down decides the user's remaining work is shelved. | Technically yes                                                    | **Rejected** despite being permitted by ADR-0012 `:41`. See §On ADR-0012's reopened Q9.                                                                                                                                                              |
| **Fully independent** — today's behaviour, unchanged                                          | No                                                                                                      | No                                                                                                                                                                                                 | Yes                                                                | **Rejected on its own**, but note it passes all three tests. It fails on a different axis: it is _unexplained_, and unexplained states are the mechanism of both dead ends. F3 is what makes leaving something alone legible rather than mysterious. |

Two observations worth keeping:

- **The conventionally "safe" option is the only one that fails.** A gate is the standard software answer to "container with unfinished contents," and it is the single candidate here that interprets an absence as failure _and_ imposes a verdict.
- **"Passes the ND tests" is not the same as "is good."** Fully-independent passes all three and still produced the bug that opened this issue. Legibility is a fourth requirement the three tests do not capture.

---

## Recommendation

**The unified rule — one sentence:**

> **Evidence gates completion; structure only decides what is offered. Containment is informative in both directions: the app offers, never asserts, never refuses.**

It covers all four directions:

| Direction                   | Case                                   | Behaviour                                                                      |
| --------------------------- | -------------------------------------- | ------------------------------------------------------------------------------ |
| **Cascade-up**              | All children completed, parent pending | **Offer** — the Q9 invite on the parent overview card. Never automatic.        |
| **Cascade-down**            | Parent completed, children pending     | **Offer** — F6's parts offer, after the fact. Never automatic.                 |
| **All set aside**           | Parent pending, all children paused    | **Neither** — resolves to `parked`. Not an invite; not a next action.          |
| **Child context on a leaf** | Working a child under any parent       | **Inform** — `↳ {{parent}} · part {{index}} of {{total}}`. Never a constraint. |

**And the line that must not be re-derived:** a `completed` parent means **_"I'm done with my part of this," not "this subtree is closed."_** Its children remain live, reachable, and individually actionable. Nothing in the app should ever infer subtree closure from a parent's status.

**Verdicts:**

| Finding                                        | Verdict                                          | Action                                             |
| ---------------------------------------------- | ------------------------------------------------ | -------------------------------------------------- |
| **F1** — no child gate                         | **Keep, with the rationale written down**        | ADR-0014                                           |
| **F2** — paused child reads as satisfied       | **Fix**                                          | Issue: resolver predicate split                    |
| **F3** — invite card never says it is a parent | **Fix** (smaller than stated — wire existing UI) | Issue: stop discarding the resolver's return value |
| **F4** — Timeline carries no step actions      | **Keep**                                         | None — #417's split stands                         |
| **F5** — every-unit progress counting          | **Keep, with rationale**                         | None — #292 R1 on record                           |
| **F6** — parent completed with live children   | **Fix — by asking**                              | Issue: parts offer                                 |

**ADR-0014 is warranted** and is the next free slot (`docs/decisions/` ends at ADR-0013). It records the unified rule, settles ADR-0012's reopened Q9 in the _offer, never automatic_ direction for **both** directions of the tree, and leaves **ADR-0010 untouched** — nothing here refuses an action, so its C-order scope never needs adjudicating.

### Follow-ups (sequenced)

1. **#535 — ADR-0014: "Containment is informative in both directions: the app offers, never asserts, never refuses."** Records the unified rule and settles Q9. **First** — it is what the other three implement.
2. **#536 — F2, resolver predicate split.** `invite` requires every child `completed`; a new `parked` kind for the all-set-aside parent. Data layer + exhaustiveness check across the three consuming surfaces. Small. Fold in the trivial `areAllStepsComplete` docstring fix (§Correction) or file it separately.
3. **#537 — F3, stop discarding the resolver's structural return value.** Keep `kind` / `parentIndex` / `childCount` in `resolveFocusStepId`; render leaf child-context via the existing `focusMode:band.childContext`; port `StepOverviewCard` for the `invite` (and `parked`) states. Sized as _wire existing, already-translated UI_.
4. **#538 — F6, parent-completion parts offer.** New bulk modal in `FocusModeScreen`, fired after completion, three options (_Keep them · Set the parts aside · Edit the parts…_), trigger and scope per §The offer, new `focusMode:partsOffer.*` keys in en/de/pseudo. "Edit the parts…" navigates to Edit mode — **no new delete path is built**. Sequenced **after #537**: its "keep them" outcome only reads well once child context exists.

Not filed: **F4** and **F5** — verdicts recorded here.

---

## Open questions

Only what survives. Q4 (depth) is withdrawn — answered by precedent (§Reach of the model).

1. **Does "mark the parts done too" ever ship?** Deferred from F6's first cut as conditional-and-rare (§The offer). Open: whether the case is common enough to justify a fourth option once the three-option modal has been used, or whether it stays dropped permanently.
2. **Does the absence of any user-reachable restore for soft-deleted rows deserve its own issue?** There is no `undeleteStep` / `restoreStep` / `undeleteGoal` / `undeleteEvidence` in `queries.ts` — three soft-delete writers (`:274`, `:959`, `:1295`) and no way back. This weakens ADR-0012's _"every state is hand-editable"_ override (`ADR-0012:57`) well beyond this feature, since deletion is the one transition the override cannot reach. Flagged, not scoped here.
3. **Does F6's modal need its own screen-reader announcement, or does it ride #526?** #526 already covers the missing set-aside / pick-back-up announcements in Focus Mode. F6's "set the parts aside" is a **third** site and a bulk one — _n_ steps changing state at once, which is a different announcement problem from a single toggle. Decide when F6 is scoped; do not widen #526 speculatively.
4. **Does `parked` reuse the existing name, and how are the keys namespaced?** `focusMode:parked.*` already exists for the goal-level all-set-aside state (`en/focusMode.json:69-74`, `FocusParkedState.tsx`). Reusing the concept at parent scope is right; whether it reuses the literal resolver-kind name and how the copy is scoped is F2's call.
5. **Should `FocusParkedState` be mounted?** Out of scope here, but noted: it is a third built-and-unmounted artefact in the same family as `StepOverviewCard` and `StepCardTopBand`. Belongs to #467's dedicated all-paused / all-done screens (D10), not to this research — but the pattern of building ND-validated UI and not wiring it is itself worth a look.

---

## Related documents

**Decisions**

- [ADR-0010 — Phase B step-model crosswalk](../decisions/ADR-0010-phase-b-step-model-crosswalk.md) — C-as-constraint is out (`:48-49`, `:60`)
- [ADR-0012 — No-auto-judgment](../decisions/ADR-0012-no-auto-judgment.md) — judgment/bookkeeping split (`:36-46`), hand-editable override (`:57`), reopens Q9 (`:77-80`)
- [ADR-0013 — Consolidated Phase B position](../decisions/ADR-0013-phase-b-consolidated-position.md) — A-substeps, depth open (`:55`)
- ADR-0014 (to be written) — containment is informative in both directions

**Prototype records**

- [A-substructure](../plans/phase-b-prototype-records/A-substructure.md) — Q6 depth pinch (`:102-106`), Q8 legibility (`:111-115`), Q9 parent invite (`:116-121`), Q10 evidence rollup (`:122-127`), guardrail audit on counting (`:139-140`, `:183-184`)

**Research**

- [step-model-gap.md](./step-model-gap.md) — the A-H taxonomy this sits inside
- [evolu-step-model-feasibility-spike.md](./evolu-step-model-feasibility-spike.md) — recursive steps and sibling order in Evolu

**Dev plans**

- [#292 — goal-card next-step resolution](../plans/dev-plans/issue-292-goal-card-focus-mini-timeline.md) — every-unit progress R1 (`:57`), D8 (`:112`), Q9 deferral (`:315`)
- [#293 — timeline substructure rendering](../plans/dev-plans/issue-293-timeline-substructure-rendering.md) — invite rendered without a completion action (`:182`)
- [#360 — focus-mode step-card frame](../plans/dev-plans/issue-360-focus-step-card-frame.md) — D1 parent overview (`:133`), D10 overview foot (`:142`)
- [#417 — paused step status](../plans/dev-plans/issue-417-paused-step-status.md) — D6 (`:44`), Focus/Timeline split (`:154-155`), the paused-child invite deferral (`:159`)
- [#466 — Focus Mode current-task mount](../plans/dev-plans/issue-466-focus-mode-current-task-mount.md) — the rebuild that unwired `areAllStepsComplete`'s claimed consumer
- [#497 — focus card multi-evidence](../plans/dev-plans/issue-497-focus-card-multi-evidence.md) — D1 conditional-reveal-on-evidence (`:66`)

**Issues**

#533 (this research) · #535 · #536 · #537 · #538 (follow-ups filed) · #467 (surfaced it) · #435 · #449 · #526 · #378
