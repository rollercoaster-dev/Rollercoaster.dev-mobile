# ADR-0014: Containment is informative in both directions — the app offers, never asserts, never refuses

**Date:** 2026-08-04
**Status:** Proposed — pending sign-off
**Owner:** Joe
**Supersedes:** [ADR-0013](./ADR-0013-phase-b-consolidated-position.md) — the
reopened A-prototype Q9 only (parent auto-completion, named in its Guardrails as
"parent-done arithmetic" and carried in its Consequences as still-open, restated
unchanged from [ADR-0012](./ADR-0012-no-auto-judgment.md) § Consequences).
Everything else ADR-0013 states remains current; both ADRs keep their bodies
unedited and carry a status-line pointer here.

**A note on citations.** This ADR cites files and symbols, never line numbers.
ADR bodies are immutable once accepted, so a line number here would be a claim
this document can never correct — and `src/db/queries.ts` moves constantly. The
code shapes quoted below are reproduced in full for exactly that reason: they
are checkable against the symbol, not against a line.

---

## Context

The app already implements one coherent containment rule, at both container
levels, and has never written it down: **evidence gates completion; structure
never does.** `completeStep` (`src/db/queries.ts`) refuses on one condition
only — `canCompleteStep` failing for missing planned evidence. No code path
anywhere gates a parent step on its children, and no code path gates a goal on
its steps.

Research for #533
([step-containment-semantics.md](../research/step-containment-semantics.md))
traced the full parent ↔ sub-step surface and found the rule sound but
unrecorded — which is how the two dead ends that opened #533 were reached. An
unwritten rule gets re-derived, and re-derivation is where a completion gate
keeps reappearing as the "obviously safe" default.

Two things therefore need a home. The rule itself, so it is cited rather than
rediscovered. And ADR-0012's **explicitly reopened A-prototype Q9** — parent
auto-completion, which ADR-0012 § Consequences moved from "settled manual-only"
to "permissible bookkeeping, a prototype question" and ADR-0013 § Consequences
carried forward as still open. That question is now answered.

## Decision

**The rule, one sentence:**

> **Evidence gates completion; structure only decides what is offered.
> Containment is informative in both directions: the app offers, never asserts,
> never refuses.**

It covers all four directions:

| Direction                   | Case                                   | Behaviour                                                                                    |
| --------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------- |
| **Cascade-up**              | All children completed, parent pending | **Offer** — an invite to complete the parent, on the parent's own card. Never automatic.     |
| **Cascade-down**            | Parent completed, children pending     | **Offer** — an invite to deal with the remaining parts, after the fact. Never automatic.     |
| **All set aside**           | Parent pending, all children paused    | **Neither** — resolves to a distinct non-actionable state. Not an invite; not a next action. |
| **Child context on a leaf** | Working a child under any parent       | **Inform** — name the parent and the child's position within it. Never a constraint.         |

The Behaviour column fixes _which of offer / assert / refuse / inform_ each
direction gets. It deliberately does **not** name resolver kinds, i18n keys, copy
or components: those belong to #536-#538, and the research left the naming
explicitly open (§Open questions, item 4 — not to be confused with the prototype's
Q4 on depth, which it withdraws). Read this table as the constraint those
issues implement, not as a description of what is currently on screen — as of
this ADR, only the cascade-up invite exists in code, and it is unmounted.

**And the line that must not be re-derived:** a `completed` parent means
**_"I'm done with my part of this," not "this subtree is closed."_** Its
children remain live, reachable, and individually actionable. Nothing in the app
should ever infer subtree closure from a parent's status.

### Why a completion gate is out — three mechanical reasons

These, not ADR exegesis, are the argument. Each is sufficient on its own; none
of them is an ADR.

**Which of them expire.** Reasons 1 and 3 describe the code as it stands and a
sufficiently determined refactor could change them. Reason 2 is architectural: it
holds for as long as the sync layer is a CRDT (ADR-0003), which is to say for as
long as the app is local-first. So a future reader finding 1 or 3 no longer true
of the code should not read this decision as thereby reopened — it was never
resting on any one of them.

**1. The signature has no view of the tree.**

```ts
export function completeStep(
  id: StepId,
  plannedEvidenceTypesJson: string | null,
  stepEvidence: { type: string | null }[],
) {
  // …
}
```

— `completeStep`, `src/db/queries.ts`

A step id, a plan string, and that step's own evidence rows. No goal id, no row
array. Gating on children means threading the subtree — or a live query —
through every call site of a function whose entire design records completion as
a **per-step fact**. The signature is itself the historical evidence that this
was intended.

**2. Evolu is a CRDT, so the gate cannot be an invariant — only advisory.**

Two devices, offline: device A completes parent `1`; device B adds child `c`
under `1`. Both writes are individually legal, both merge, and the result is a
completed parent with a pending child. No write-path gate prevents it, because
neither write was illegal on its own. "A parent cannot be complete while a child
is pending" is therefore **not enforceable as a data invariant** in this
architecture — at best a UI-time check the sync layer can violate behind your
back.

Which means the app must handle that state anyway. Given that it must, refusing
to let the user create it deliberately buys nothing and costs agency.

**3. Three sibling status paths bypass it.**

Exactly four functions in `src/db/queries.ts` transition an existing step's
`status`:

| Function         | Writes      | Gate?         |
| ---------------- | ----------- | ------------- |
| `completeStep`   | `completed` | Evidence only |
| `uncompleteStep` | `pending`   | **None**      |
| `pauseStep`      | `paused`    | **None**      |
| `resumeStep`     | `pending`   | **None**      |

`updateStep` handles title, ordinal, parent, evidence plan, dependency and date
fields — it does **not** write `status`. (`createStep` and `createSubStep` set
the initial `pending` value on insert; they are not transitions.) The list is
verifiable at any time with `grep -n 'status:' src/db/queries.ts`, which is why
it is given as names rather than lines.

A child gate on `completeStep` alone leaves the state reachable through three
unguarded siblings, and guarding all four turns three trivial state-flips into
tree-aware operations. The cost is the whole status surface; the benefit is a
rule the CRDT can undo anyway.

### ADR-0012's reopened Q9 is settled — offer, never automatic, in both directions

ADR-0012 makes cascade-up **permissible**: "marks a parent done when every child
is checked" is named as allowed bookkeeping in its § Decision, and ADR-0013
§ Guardrails restates it as "parent-done arithmetic". **This ADR declines that
permission**, and states plainly that declining is a **choice, not a reading of
a prohibition.** Nothing forbids the cascade; we are choosing not to build it.

The reason: arithmetic is only reversible-and-harmless when its premise is
certain, and here it is not. **"Every child is completed" does not entail "the
parent's own work is done."** A parent step routinely carries work no child
represents — the assembly, the review, the thing you only see once the parts are
in front of you.

The prototype's own validated copy anticipates exactly this — _"completing the
parts changed nothing by itself — this stays your call"_
([A-substructure.md](../plans/phase-b-prototype-records/A-substructure.md),
§ Observations, Q9). Auto-completing the parent would make that sentence a lie,
and would silently
claim the user finished something they may not have.

The offer keeps the arithmetic — the app notices, and says so — and declines the
verdict. Both directions of the tree take the same shape: cascade-up offers
(the Q9 invite), cascade-down offers (the parts offer, after the completion is
already banked). Neither is ever applied for the user.

The same holds for cascade-down as an automation: auto-setting a completed
parent's children aside decides that the user's remaining work is shelved. That
is a decision only the user can make, so it is offered too.

### ADR-0010 is left untouched

ADR-0010 § Structural Guardrails says C-as-constraint is out — _"Ordering may
inform the user, but the app does not refuse an action because a prerequisite is
incomplete"_ — with its § Decision crosswalk table spelling out, on the
**C-order** row, _"does not build a constraint engine that blocks, hides, or
refuses actions because a prerequisite is incomplete. The relationship is
informative, not punitive."_

Strictly, that is scoped to **C-order** prerequisites, not **A-containment**, so
whether it reaches this question is a fair thing to ask. **It does not need
answering.** The three mechanical reasons above reach the same destination
without adjudicating ADR-0010's scope, and nothing decided here refuses an
action — so ADR-0010 stays exactly as it is. Corroboration, not the deciding
authority.

### Two things this ADR does not force

- **Delete stays out of the parts offer.** ADR-0012's _"every state is
  hand-editable"_ override is what keeps this family of automation legitimate —
  and delete is the one transition the override cannot reach: every delete in
  `src/db/queries.ts` sets an `isDeleted` flag, and there is no restore path for
  any of them. The parts offer therefore routes to Edit mode rather than deleting
  anything itself.
- **Depth is not decided here.** ADR-0013's open depth question — "no depth
  decision yet (one level, two, arbitrary)", on the **A: Substeps** row of its
  § Decision feature table — stands. Depth is already one level in code:
  `resolveNextActionableStep` builds its root set from `parentStepId == null` and
  **orphan-promotes** anything deeper, and the `GroupedStep` contract says the
  same ("depth is capped at one level — child nodes always carry an empty
  `children` array"). The rule above is stated per-container, not per-tree, so it
  generalises unchanged if depth is ever opened.

## Consequences

- The three implementation follow-ups from #533 land **after** this ADR, and
  implement it: **#536** (resolver predicate split — the cascade-up invite
  requires every child `completed`, and the all-set-aside case gets a kind of its
  own), **#537** (Focus Mode stops discarding the resolver's structural return
  value), **#538** (the parent-completion parts offer).
- No schema, resolver-kind vocabulary, copy, or state-machine detail is decided
  here — that is #536-#538's job. This ADR governs which of their behaviours are
  permitted, not how they are built.
- The A-prototype Q9 entry leaves the
  [Open Questions Register](../plans/phase-b-step-model-prototypes.md#open-questions-register)
  as settled; substructure depth stays open.
- Any code that infers subtree closure from a parent's status is a bug against
  this ADR, not a design variant.

## Supersession

Supersedes ADR-0013 for the reopened A-prototype Q9 only — parent
auto-completion, now settled in the offer-only direction. Everything else
ADR-0013 restates remains the current Phase B position. ADR-0010's, ADR-0012's
and ADR-0013's bodies stay unedited; ADR-0012 and ADR-0013 carry a status-line
pointer here, per the mutability rule ([index.md](./index.md)). Changes to this containment
rule require a new ADR superseding ADR-0014; changes to the anti-pathologizing
commitments themselves still require one superseding ADR-0010. Do not amend this
ADR in place.

---

_Drafted 2026-08-04, pending sign-off. Structure offers; the user decides._
