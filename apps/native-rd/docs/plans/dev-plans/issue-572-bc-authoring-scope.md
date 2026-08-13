# Development Plan: Issue #572

## Issue Summary

**Title**: [Decide] Does B/C authoring appear in the New Goal wizard, or Edit-Goal-only?
**Type**: decision + docs (`hitl`, `needs:design`, `size:s`)
**Complexity**: TRIVIAL
**Estimated Lines**: ~30 lines of Markdown (plus this plan). No code.

The issue is one decision, no code. Its own recommendation is **Option 3 —
Edit-Goal-only now, revisit after use**, and it notes that #575 and #576 already
assume that answer. The orchestrator has taken Option 3. What is left is the
issue's own deliverable list minus the part a human owns:

| Deliverable                                         | Owner                                                        |
| --------------------------------------------------- | ------------------------------------------------------------ |
| Decision recorded **in the issue** with reasoning   | Human — agents never post GitHub comments. Out of scope.     |
| One line in `phase-b-feature-shapes.md` §B / §C     | **This PR.**                                                 |
| Confirm the wizard's copy promises no dates or deps | **This PR** — audited, result recorded below. No fix needed. |
| `[Storybook]` sibling for build-list chips          | Not applicable — only fires if the answer were "wizard too". |

## Intent Verification

- [x] A reader who opens `phase-b-feature-shapes.md` §C and sees `NewGoalModal`
      in the five-surface list learns, in that same section, that the wizard is a
      **reading** surface for dependencies and never an authoring one — without
      opening #572, #570, or the prototype.
- [x] The `§B: Planning` anchor cited by the milestone description and by epic
      #570 resolves to a real heading in `phase-b-feature-shapes.md` instead of
      404-ing inside the doc.
- [x] The New Goal wizard's shipped copy contains no string promising a date,
      deadline, schedule, dependency, or prerequisite — evidenced by a
      file:line audit in this plan, not an assertion.
- [x] `bun run format:check` passes (the only gate `ci-docs` runs on a
      Markdown-only PR).

## Dependencies

| Issue | Title                                        | Status                | Type                               |
| ----- | -------------------------------------------- | --------------------- | ---------------------------------- |
| #570  | Epic: Set B & C authoring                    | 🟢 Open — parent epic | Parent                             |
| #575  | [Storybook] Edit Goal step rows — chips      | 🟢 Open               | Sibling — already assumes Option 3 |
| #576  | [Integrate] Wire both sheets to `updateStep` | 🟢 Open               | Sibling — already assumes Option 3 |

**Status**: ✅ No blockers. The issue states it explicitly: _"Blocked by: nothing
— start now. Needs a person, not code."_ Settling it before #576 starts is the
only timing constraint, and #576 has not started.

## Objective

Record "B/C authoring is edit-time-only" in the repo so the next reader does not
re-derive it, and confirm on the record that the New Goal wizard's copy makes no
promise the decision would contradict.

## Decisions

| ID  | Decision                                                                                                                         | Alternatives Considered                                                 | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **No ADR.** Record the decision as doc lines in `phase-b-feature-shapes.md` only.                                                | A new `ADR-0015`; amending ADR-0013.                                    | ADR bodies are immutable and every ADR PR must also update Current positions **and** the Ledger (`docs/decisions/index.md:1-14`) — heavy machinery for a surface-scope call. This decision changes no architectural position: it is ADR-0010's "must not feel required" applied to one screen. The issue asked for a doc line; the repo convention does not demand more.                                                                                                                  |
| D2  | **Create a `## B: Planning` stub section** to hold the line, rather than skipping §B.                                            | Put both lines in §C only; add a footnote to the Status table.          | §B does not exist — the Status table (`:23`) lists B as Stage 3 / "Not started". But the **milestone description** and **epic #570** both cite `phase-b-feature-shapes.md §B: Planning` as where a decision is "recorded permanently". Following that pointer today finds nothing, which is precisely the "next reader re-derives it" failure #572 exists to prevent. Stub is a heading + a "shape not written yet" marker + the decision lines — it does not pre-empt the Stage 3 shape. |
| D3  | **Also record the retired `Sometime` / `On a date` toggle** (dateless = `dueAt: null`) in the §B stub while it is being created. | Leave it dangling; file a separate issue.                               | Epic #570 asserts _"Recorded permanently in `docs/plans/phase-b-feature-shapes.md` §B: Planning"_ and the milestone repeats the pointer. Neither is true today. One line, cited to #570, makes both true and costs nothing extra now that §B exists. Flagged so a reviewer can drop it if they want #572 hermetic.                                                                                                                                                                        |
| D4  | **No wizard code change.** The audit found no promise (see below), so the confirmation is a recorded audit, not a fix.           | Pre-emptively add copy stating dates live in Edit Goal.                 | The issue asks to _confirm_ no promise, not to add reassurance. Adding "you can set dates later" copy in the wizard would re-introduce the exact pressure Option 3 avoids, and would mint an i18n key across en/de/pseudo for no user need.                                                                                                                                                                                                                                               |
| D5  | **Do not touch the `editGoal:editor.datesInfo` banner.**                                                                         | Delete it here, since it promises a "full planner" that does not exist. | It is a real false promise, but it lives on **Edit Goal**, not the wizard, and #576 already owns deleting it by name (key + `EditGoalView.tsx:270,532` + `editGoalCopy.ts:23,60`). Removing it here would collide with #576's diff.                                                                                                                                                                                                                                                       |

## Wizard Copy Audit — result: **no promise found**

Scope: `apps/native-rd/src/screens/NewGoalScreen/` and every string it pulls
from (`newGoalWizardCopy.ts` → `newGoal` namespace → `NewGoalWizard.tsx`
English defaults). Vocabulary searched, case-insensitive: `date`, `deadline`,
`due`, `schedul*`, `depend*`, `block*`, `prerequisit*`, `waiting`, `after`,
`before`, `calendar`, `remind*`, `expected`, `timing`, `overdue`, plus the
German equivalents (`Termin`, `Frist`, `fällig`, `abhängig`, `wartet`,
`danach`, `Kalender`).

| Surface                                                             | Finding                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/i18n/resources/en/newGoal.json` (whole file, 62 lines)         | **Zero matches** in user-facing copy. The only temporal string is `ready.badgeNote` at **`en/newGoal.json:57`** — _"You'll design your badge when you finish."_ — conditional on completion, not a date, deadline, or schedule.                                                       |
| `src/i18n/resources/de/newGoal.json`                                | **Zero matches.** No `Termin` / `Frist` / `fällig` / `abhängig` / `wartet` / `danach` / `Kalender`.                                                                                                                                                                                   |
| `src/i18n/resources/pseudo/newGoal.json`                            | Mirrors en (generated); nothing to fix.                                                                                                                                                                                                                                               |
| `src/screens/NewGoalScreen/newGoalWizardCopy.ts`                    | All 50 copy props enumerated at **`:24-70`**; none is named or valued for a date or a dependency. Step 3 (build list) forwards only step title, evidence, sub-step, nest, reorder, and delete copy (**`:100-131`**).                                                                  |
| `src/components/NewGoalWizard/NewGoalWizard.tsx` (English defaults) | One match on the vocabulary: **`:337`** `badgeNote = "You'll design your badge when you finish."` — same string as above. Every other hit in the file is a **code comment**, not copy: `:100`, `:103`, `:115`, `:123`, `:131`, `:165`, `:186`, `:196`, `:198`-`:204`, `:424`, `:749`. |
| `src/screens/NewGoalScreen/useNewGoalSteps.ts`                      | One comment hit at **`:50`** ("before typing a title"); no copy.                                                                                                                                                                                                                      |

**Conclusion:** the wizard promises a name, a first step, evidence, sub-steps,
and a badge. It says nothing about when a step happens or what it waits on.
Option 3 requires no copy change.

**Adjacent finding (deliberately not fixed here — D5):** the _Edit Goal_ screen
does carry a false promise —
`src/i18n/resources/en/editGoal.json:23` (`editor.datesInfo`):

> "Dates and dependencies live on each step — open a step in the full planner to set \"after\" or \"waiting on\"."

rendered via `src/components/EditGoalView/EditGoalView.tsx:270` (default) and
`:532` (render), wired at `src/screens/EditModeScreen/editGoalCopy.ts:23,60`,
with de/pseudo siblings at `:23` of each. There is no "full planner". #576 owns
its deletion, by exactly these locations.

## Affected Areas

- `apps/native-rd/docs/plans/phase-b-feature-shapes.md`: one line in §C's
  Smallest Useful Shape, one bullet in §C's Must Not Do, and a new `## B:
Planning` stub section at the end of the file.
- `apps/native-rd/docs/plans/dev-plans/issue-572-bc-authoring-scope.md`: this
  plan (carries the audit result, which is itself a deliverable).

Nothing under `src/`. No tests, no i18n keys, no Storybook.

## Insertion Points (exact)

### §C, insertion 1 — after line 345 (end of the "presentation language" paragraph)

Surrounding text, `phase-b-feature-shapes.md:341-345`:

> The first pass is a **presentation language** tested across the same five
> surfaces as A (NewGoalModal, EditModeScreen, GoalsScreen/GoalCard,
> FocusModeScreen + MiniTimeline, TimelineJourneyScreen), with 2–3 candidate
> treatments (inline note, chip, connector) as side-by-side variants in the app's
> token language.

This is the sentence that makes a reader think the wizard authors dependencies —
`NewGoalModal` is first in the list. The note goes immediately after it, before
the "Two **task-view behaviors**…" paragraph at `:347`.

Proposed text:

```markdown
**Authoring surface — edit time only** (settled 2026-08-13, #572). That list is
where a dependency is _read_. It is **set** in exactly one place: Edit Goal
(`EditModeScreen`). The New Goal wizard (`src/screens/NewGoalScreen/`) gets no
authoring affordance — and nothing to read either, since a freshly created step
has no dependency yet (wizard steps are local state carrying only title +
planned evidence; the marker doesn't exist in code today). Wizard step 3 is the
build list — the moment a user is already naming steps in a row — and per-row
`+ depends` chips there are the clearest way to make "Setting must not feel
required" fail. Authoring is a deliberate second visit. Epic #570 ships Edit
Goal only; revisit only if real use shows the second trip is friction.
```

### §C, insertion 2 — after line 390 (Must Not Do)

Surrounding text, `phase-b-feature-shapes.md:390`:

> - **Setting a dependency must not feel required** — a step with none stays
>   first-class; the affordance can't pressure every step toward a graph.

Add directly beneath it, as the last bullet of the list:

```markdown
- **No dependency authoring in the New Goal wizard** — the create flow stays
  title + evidence, and "quick add" (bare title) stays the fast path (#572).
```

### §B — new section appended at end of file (after line 455)

The file's own rule, `phase-b-feature-shapes.md:27`: _"Sections are appended
below as each stage starts."_ B is Stage 3; appending after §C keeps that order.
The Status table row at `:23` stays **"Not started"** — the stub does not claim
the shape is written.

> **Superseded on merge (2026-08-13).** #579 landed a fuller §B on `main` first —
> partial-section blockquote, the ordering-violation record, the dateless decision
> in prose, and the "was expected" decision. The stub below (and with it D2/D3,
> which existed only because §B was missing) is therefore dropped; the merge keeps
> #579's section and grafts in only what is #572's own: a `### Decided: authoring
is edit time only` subsection plus a Must-Not-Do bullet.

Proposed text (superseded — kept for the record):

```markdown
## B: Planning (merges B-soft, B-deadlines, repeating)

**Shape not written yet — Stage 3.** This heading exists ahead of its stage so
that the `§B: Planning` pointers in the `native-rd: Set B & C authoring`
milestone and in epic #570 resolve. It holds only decisions taken before the
shape is written; the User Need / Smallest Useful Shape / … template is filled
in when Stage 3 starts.

### Decisions recorded ahead of the shape

- **Dateless is `dueAt: null`** (2026-08-11, #570). The Direction B prototype's
  date-sheet `Sometime` / `On a date` mode toggle is retired: a step either has
  a due date or it does not, and the sheet's `Clear` already expresses the
  latter. The toggle came from a gloss of B-soft as "a loose sometime"; B-soft
  means _soft placement_ ("for Tuesday", not "due Tuesday") and needs a day to
  be present. ADR-0013 commits B to three time shapes — a date, a deadline,
  repeating — and "sometime" is not among them. Soft-vs-firm _on a date_ stays
  open for Stage 3.
- **Authoring surface — edit time only** (2026-08-13, #572). A planning date is
  set in Edit Goal (`EditModeScreen`), not in the New Goal wizard. Same
  reasoning as §C: the wizard's build list is the highest-pressure screen in the
  app, and a per-row `+ date` chip there is where "Setting must not feel
  required" fails first. The wizard's copy promises nothing about dates, so
  nothing there contradicts this. Revisit after real use.
```

## Implementation Plan

### Step 1: Land the dev plan

**Files**: `apps/native-rd/docs/plans/dev-plans/issue-572-bc-authoring-scope.md`
**Commit**: `docs(native-rd): plan the B/C authoring-scope decision (#572)`
**Changes**:

- [x] Commit this plan, including the wizard copy audit — the audit result is a
      deliverable of the issue and needs to live in the repo, not in chat.

### Step 2: Record the decision in the feature-shapes doc

**Files**: `apps/native-rd/docs/plans/phase-b-feature-shapes.md`
**Commit**: `docs(native-rd): record B/C authoring as edit-time-only (#572)`
**Changes**:

- [x] §C Smallest Useful Shape — add the "Authoring surface — edit time only"
      paragraph after `:345`.
- [x] §C Must Not Do — add the "No dependency authoring in the New Goal wizard"
      bullet after `:390`.
- [x] Append the `## B: Planning` stub at end of file, with both recorded
      decisions (D2 + D3).
- [x] Leave the Status table at `:17-27` untouched — B is still "Not started".
- [x] Run `bun run format` and confirm `bun run format:check` is clean.

Commit body should state the decision and its reasoning in prose (the pressure
argument on wizard step 3, and that #575/#576 already assume it), following the
house style of `7beb58d`. `Signed-off-by:` trailer is mandatory — husky adds it.

## Testing Strategy

Docs-only. No unit tests apply; do not invent any.

- [x] `bun run format:check` — the only job `ci-docs.yml` runs, and the only CI
      that a `**/*.md`-only PR triggers.
- [x] Verify the new `## B: Planning` heading's anchor
      (`#b-planning-merges-b-soft-b-deadlines-repeating`) matches what the
      Status table row and epic #570's link expect. Confirmed: the slug follows
      the same pattern as the existing §A/§C anchors used by the prototype
      records, and epic #570 links the file with no fragment — so it now lands
      on a doc that actually contains a `B: Planning` heading.
- [x] Re-read §C top to bottom once — the new paragraph must not contradict
      "the marker **informs only**" at `:337-339`. It does not: the new text
      constrains where a dependency is _set_, and says the wizard still _shows_
      one, which is display, not enforcement.

**Changeset: not required.** The repo has no `.changeset/` directory and no
changeset step in any workflow; releases go through release-please
(`release-please.yml`) off conventional commits. A `docs(native-rd):` commit
produces no version bump and needs no release note.

## Not in Scope

| Item                                                            | Reason                                                                                                         | Follow-up      |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------- |
| Posting the decision + reasoning as a comment on #572           | Agents never post GitHub comments; this is the human's half of the deliverable.                                | Human, on #572 |
| A new ADR                                                       | D1 — no architectural position changes; ADR machinery (immutable bodies + index + ledger) is disproportionate. | none           |
| `[Storybook]` sibling for wizard build-list chips               | Only required if the answer were "wizard too". It is not.                                                      | none           |
| Any change to `NewGoalScreen/` or the `newGoal` namespace       | D4 — audit found no promise to correct, and adding reassurance copy would re-create the pressure.              | none           |
| Deleting the `editGoal:editor.datesInfo` "full planner" banner  | D5 — Edit Goal, not the wizard; #576 owns it by name.                                                          | #576           |
| Writing the actual §B: Planning feature shape                   | Stage 3 work, gated by the prototype sequence. The stub says so in its first line.                             | Stage 3        |
| Answering C Q5 in `phase-b-prototype-records/C-dependencies.md` | The record leaves Q5 open; #575 resolves it in the ghost-chip design, and the record is updated at that point. | #575           |
| Bumping `Last Verified` for this doc in `docs/plans/index.md`   | Not repo convention for a content edit — `7beb58d` changed two plan docs and left the index alone.             | none           |

## Discovery Log

<!-- Entries added by implement skill:
- [YYYY-MM-DD HH:MM] <discovery description>
-->

- [2026-08-13] §B: Planning **does not exist** in `phase-b-feature-shapes.md` —
  the Status table (`:23`) lists it Stage 3 / "Not started", and the only §B
  mentions are cross-references from §C (`:411`, `:452`). Both the milestone
  description and epic #570 link `§B: Planning` as though it were written; the
  anchor is dead. Handled by D2/D3.
- [2026-08-13] Wizard copy audit: clean. Full result table above; the one
  temporal string in the whole namespace is `en/newGoal.json:57` "when you
  finish", which is completion-conditional, not a date.
