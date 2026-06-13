# ADR-0011: Step-model names and letter consolidation

**Date:** 2026-06-12
**Status:** Proposed — becomes Accepted with Joe's sign-off
**Owner:** Joe
**Supersedes:** [ADR-0010](./ADR-0010-phase-b-step-model-crosswalk.md) — letter structure and naming only

---

## Context

ADR-0010 committed Phase B to ten Step-model capabilities across eight
letters, in research-derived language. A letter-by-letter session on
2026-06-12 replaced that language with the words Joe actually uses describing
the app, and consolidated the ten rows into seven features. This ADR records
the re-map. Every commitment, non-commitment, and guardrail in ADR-0010
carries forward under the new names — nothing here weakens any of them.

## The naming rule

> **Plain language, no insider knowledge.** If a word would need explaining to
> someone new to the project, choose a simpler one or define it where it's used.

Retired words: "enrichment," "crosswalk," "umbrella," "decompose," "soft
temporal placement," "misfire," "falsified Step," "temporal function," "time
foothold," "vocabulary" (for states), "granularity." Also retired: the hyphen
in "sub-step" — it's **substep**.

## Decision

| Was (ADR-0010)                                   | Now                 | What changed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------ | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A: Granularity / substructure                    | **A: Substeps**     | Name only. A step with substeps is just a step — no special word for the parent. You break a step into substeps, or add substeps. Commitment and guardrails unchanged.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| B-soft + B-deadlines + the recurrence/Slot spike | **B: Planning**     | One letter, three time shapes: a **date** (one-off, "for Tuesday"), a **deadline**, and **repeating** — simplest path for each, using the phone's built-in tools wherever possible: one-way calendar push (pre-fill a system calendar event from a step; never read the calendar back, never sync state) and user-set reminders (fire once at the time the user set; no re-ping, no follow-up). New guardrail: **no app-icon badge counts, ever** — a red "3" on the icon is a missed-things ledger. A passed deadline stays factual: no red, no "overdue," no alarm state. The Slot hypothesis is demoted to **probably unnecessary** — the calendar holds the repetition; the step just _is_ the repeating thing. The Stage 3 spike shrinks to verifying calendar delegation covers the scenarios. No-auto-state carries forward untouched. |
| C-order + C-waiting                              | **C: Dependencies** | One design language, two targets: a step can depend on another step (**internal**) or on a person, org, reply, or event (**external**). ADR-0010's open edge — is waiting a state, relation, or metadata? — is answered: **a relation.** List order itself already ships (`ordinal`, drag-to-reorder, substeps included); C's only new capability is the explicit dependency marker. It informs — never blocks, hides, or dims. Marker wording ("depends on," never "blocked by") is a prototype question.                                                                                                                                                                                                                                                                                                                                    |
| D: Per-step context + F: Mid-work capture        | **Scratchpad**      | One surface absorbs both letters: a freeform pad (Apple Freeform / a mini Miro board) holding finger-written ink, images, text, fragments — anything. Everything on it is draggable: arranged within the pad, or dragged out to _become_ something — a substep, evidence, a step note. F's open edge — where does captured structure land? — is answered: **nowhere automatically; you drag it.** D's and F's non-commitments (not evidence's register, not a review, no required flow) carry forward.                                                                                                                                                                                                                                                                                                                                        |
| E: Richer state vocabulary                       | **E: Step states**  | Color is the state's identity — stable and clear. The label is a word from a small pool per state — playful to serious — picked randomly once when the state is set, then fixed: surprise at creation, predictability after. Pools are authored during prototyping; user-editable pools stay open, as ADR-0010 left them. Color is never the sole carrier — the word is always adjacent (verify pools in highContrast and the muted autismFriendly palette).                                                                                                                                                                                                                                                                                                                                                                                  |
| G: User-created goal review                      | **G: Review**       | Name survives. The review is a final edit pass over the goal's scratchpad — the mess becomes the keepsake, gathering the steps as they actually went, H learnings, evidence, and the badge. The existing completion-flow text field becomes the **doorway** to this, not the whole feature. The review is reachable **anytime** from the goal, not completion-only — abandoned goals are where learnings live. Skipping the doorway leaves no trace anywhere. Opt-in stays structural.                                                                                                                                                                                                                                                                                                                                                        |
| H: Misfire as learning                           | **H: Learnings**    | Plain definition: what didn't go to plan. **The app never assigns the label — the user does**, with their own word from the state pool ("plot twist," "well, that happened" — tone self-calibrated). H is a combination, not a new feature: an E state + a C-style link + journey display. Setting the state opens two questions — **"What happened?"** (the learning's body) and **"What does it change?"** (seeds a pre-filled corrected step; the follows-from link comes free). Learnings display **with pride** in the goal journey, per-item, **never counted or aggregated** — no "3 learnings this month," no streaks. A quiet **"not now"** sets the state anyway and leaves the questions on the step, answerable later. Preserve-never-replace carries forward.                                                                    |

## Consequences

- Living docs (CONTEXT.md, the prototype plan, feature shapes, stage records)
  adopt the new names with a one-line "formerly called X" so the trail stays
  readable. Research docs keep their original framing as the historical
  record, with a crosswalk note.
- The guardrail checklist gains the no-app-icon-badge-counts line.
- The prototype plan regroups its stages around the seven features.
- ADR-0010 stays the unedited record of what Phase B committed to and
  refused; this ADR only renames and regroups.

## Supersession

This ADR supersedes ADR-0010 for letter structure and naming only. Changes to
the commitments themselves still require a new ADR superseding ADR-0010. Do
not amend this ADR in place.
