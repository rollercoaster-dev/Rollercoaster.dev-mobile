# Handoff: Anchor The Step-Model Docs In Today's App

**Date:** 2026-06-09
**Owner:** Joe
**Status:** Ready for review session
**Branch / PR:** `docs/issue-277-adr-0010-plan` / PR #278 (open, unmerged)

## Why this session exists

PR #278 added ADR-0010 (Phase B Step-model crosswalk) and the prototype plan,
then a review pass added cut line, medium menu, evidence sources, feature-shape
ownership, an Evolu spike, a canonical open-questions register, and
deliberately-dangling notes (commits `40104d3..41aa78b`).

Those documents were written from `CONTEXT.md` and `step-model-gap.md` — not
from the code. Before merging (or immediately after), walk the docs against the
app as it actually is, so the vocabulary and requirements anchor in today's
behavior rather than in an imagined baseline. This session doubles as most of
the prototype plan's **Stage 0 baseline**.

The trigger: Joe's instinct that **D ("one line of context") already exists in
our Steps**. That instinct is substantially right — see below.

## Verified current state (read directly from code, 2026-06-09)

### Step data model — `src/db/schema.ts:107-115`

```ts
step: {
  id: StepId,
  goalId: GoalId,            // Foreign key to goal
  title: NonEmptyString1000,
  ordinal: nullOr(Int),      // Ordering within goal
  status: NonEmptyString1000, // 'pending' | 'completed'
  completedAt: nullOr(DateIso),
  plannedEvidenceTypes: nullOr(NonEmptyString1000), // JSON string[] of EvidenceType, null = no requirement
},
```

- **No description, note, or context field on Step.**
- `StepStatus` is exactly `pending | completed` (`schema.ts:43-46`).
- Ordering is a nullable `ordinal` int within a goal.
- No date, deadline, or recurrence fields anywhere on Step or Goal
  (Goal has only `completedAt`).

### Evidence — `src/db/schema.ts:124-132`

- Attaches to **Goal XOR Step** (`goalId`/`stepId`, exactly one set,
  app-enforced).
- Types: `photo, text, voice_memo, video, link, file` (`schema.ts:56-63`).
- **Inline text evidence** stores content in the `uri` field behind
  `TEXT_EVIDENCE_PREFIX = "content:text;"` (`schema.ts:66`), plus a
  `description` caption field.

### Capture suite (already shipped)

`src/screens/CaptureTextNote/CaptureTextNote.tsx` takes `{ goalId, stepId }`
route params and saves a free-form note up to 1000 chars plus caption — as
evidence. Sibling screens: `CapturePhoto`, `VoiceMemoScreen`,
`CaptureVideoScreen`, `CaptureLinkScreen`, `CaptureFile`. Registered in
`src/navigation/GoalsStack.tsx`.

### Task view / next step

`src/screens/FocusModeScreen/FocusModeScreen.tsx:231` — focus mode snaps to
the **first pending step** on load. This is the closest living implementation
of the "one next step per active goal" promise the docs lean on.

## The central question for this review

**Is D a new surface, or a re-framing of what text-evidence-on-step already
does?**

The docs draw a hard line: ADR-0010's D row says "D is not
evidence-at-completion," and the prototype plan treats D as the smallest _new_
enrichment. But today:

- A user can attach a free-form text note to any step, at any time, via
  CaptureTextNote. Nothing restricts evidence to completion.
- That note lives in the evidence table, rendered wherever evidence renders.

So the honest framing is probably not "the app lacks per-step context" but
"per-step context exists today only as evidence, with evidence semantics" —
and D's question becomes whether context needs to be a _distinct_ thing
(different retrieval surface, different prominence at re-entry, not mixed into
the evidence record) or whether the existing channel already serves the need
and D is mostly a presentation/retrieval problem. The D feature shape and the
Stage 1 prototype should start from this, not from zero.

Same check applies to **F (mid-work capture)**: a six-modality capture suite
already exists. F's open question may be narrower than the docs imply — not
"build a landing place" but "is the existing capture flow low-friction enough
mid-work, and where does captured _structure_ (a new sub-step, not evidence)
land?"

## Review checklist for the session

1. **Walk each ADR-0010 row against the app.** For every letter: what exists
   today (field, screen, behavior, with file refs), what the row assumes
   exists, and any wording that misstates the baseline. The two known suspects
   are D and F; the others likely check out as genuinely absent (verify: no
   nesting, no dates, two states, ordinal-only ordering, no review surface, no
   misfire concept).
2. **Re-read Stage 0 in the prototype plan.** Its baseline list ("title,
   order, evidence, and pending/completed") omits `plannedEvidenceTypes`, the
   capture suite, and focus mode's first-pending-step behavior. Stage 0's
   baseline record should be written from this handoff's inventory, extended
   where needed.
3. **Decide the D wording.** If Joe confirms the text-evidence channel is the
   thing he means by "we already do that," amend the D row's open edges (and
   the D feature shape, when written) to name the existing channel and define
   D relative to it. PR #278 is unmerged, so the ADR can still be corrected
   in place.
4. **Check vocabulary collisions.** `CONTEXT.md` distinguishes D (context)
   from evidence and from F (capture). Confirm those distinctions survive
   contact with the fact that the app's only capture/notes mechanism today IS
   evidence. If the distinction is real, say where the boundary falls in
   today's terms.
5. **Spot-check the remaining doc claims** against `src/db/schema.ts`,
   `StepList`/`TimelineStep` components, and the goal lifecycle screens —
   anything the docs assert about "the current Step" should have a file ref
   or be corrected.

## Not in scope for the review session

- Resolving the five open questions (register owns them).
- Schema or UI changes — this is a docs-anchoring pass plus Stage 0 baseline.
- Starting Stage 1 prototypes.

## Outputs expected

- Corrections to ADR-0010 / prototype plan wording (on the PR branch if still
  unmerged; follow-up PR otherwise).
- The Stage 0 baseline record, seeded from the inventory above.
- A decision (or explicit open question) on D-vs-existing-text-evidence,
  recorded in the feature-shapes doc or the open-questions register.
