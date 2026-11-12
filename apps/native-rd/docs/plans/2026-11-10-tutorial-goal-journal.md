# Tutorial goal + paper journal

Status: in progress, 2026-11-10. Reworks the nine-step "Find your footing" tutorial
from epic #593 (child H) and proposes an answer to child D (the tutorial badge).

## The idea

The tutorial teaches two things at once: how the app works, and how to keep a goal
journal on paper. The app leads at first, and paper takes over step by step. By the end
the user can track a goal with a notebook alone.

## Settled in the workshop

- "Journal" always means the physical notebook. It is never an app feature.
- The notebook is freeform. The app never prescribes a layout.
- Step 1 is getting or making a journal.
- Photos of pages are offered on paper steps and never required.
- Corrected 2026-11-10: a step cannot be ticked off with no evidence. The app's rule is
  that every step owes evidence, and "Mark complete" only appears once the planned
  types are captured. So each paper step plans a text note (one line, e.g. "wrote it
  on page 1"). The photo stays an optional extra.
- The badge is a real self-issued badge: it certifies the journal practice.

## The steps

Each step lists what happens in the app, what goes on paper, and what it teaches.
Evidence types are planned on the step, never pre-inserted. Where a step says "photo
offered", it plans a text note and the photo is extra.

**1. Get or make a journal** (app leads)

- App: tick the step. Photo offered.
- Paper: any notebook. Or fold a few sheets in half. Staple or tie them if you like.
- Teaches: completing a step, photo evidence.

**2. Name one thing you actually want** (app leads)

- App: write it as text evidence.
- Paper: write the same thing on the first page, in your own words.
- Teaches: text evidence. Seeds the user's first real goal.

**3. Break it into three steps you can picture** (app leads)

- App: ~~add three sub-steps under this step~~ type the three steps as a note.
  Changed by #829: adding a step moved to step 6.
- Paper: copy them under the goal, any way you like.
- Teaches: ~~step and sub-step authoring~~ breaking a goal down, on paper.

**4. Say why, out loud** (app leads)

- App: 30-second voice memo.
- Paper: one line of why.
- Teaches: voice memos, which people otherwise never find.

**5. Set one step aside** (app leads)

- App: ~~pause one of the three sub-steps~~ set this step aside, then pick it back up
  (#829: a sub-step left set aside would hide the badge card at the end).
- Paper: mark it set aside, in whatever way makes sense to you.
- Teaches: `paused`. Stopping isn't failing.

**6. Five minutes in focus mode** (do, then write)

- App: add your first step as a sub-step of this one in Edit Goal, then work on it
  in focus mode (#829).
- Paper: afterwards, write what happened.
- Teaches: adding a step, `FocusModeScreen`, and writing after doing.

**7. Make it yours** (do, then write)

- App: pick the theme that looks right for your eyes.
- Paper: put your name or a mark on the cover.
- Teaches: the seven themes.

**8. One session on paper only** (paper leads)

- Paper: next time you work on your thing, track it in the journal and leave the app shut.
- App: afterwards, log it. Photo of the page offered. Then look at your timeline.
- Teaches: adding evidence after the fact, `TimelineJourneyScreen`, and that the
  journal works on its own.

**9. Design your badge and finish** (hand-off)

- App: badge designer, then completion.
- Paper: write the date. Turn the page and start your real goal there.
- Teaches: `BadgeDesignerScreen`, `CompletionFlowScreen`. Offers the template picker
  with the goal from step 2.

## Changes from the epic's nine steps

- New step 1 (journal). New step 8 (paper only).
- "Take one photo of where you're starting" is folded into step 1's photo.
- "Look at your timeline" is folded into step 8.

## Open questions

1. ~~Where does how-to text live?~~ Settled: steps have an optional description,
   shown under the title on the Focus card.
2. **Step 8 needs a second session.** The tutorial can no longer finish in one sitting.
   The epic allows "one sitting to one week", so this may be fine.
3. **Badge on the wall.** The epic worried a 20-minute tutorial badge devalues the wall.
   Does certifying a practice answer that, or does it still need a visual mark?
4. **Goal title.** "Find your footing" (epic) or "Start my goal journal".
5. ~~**Step 3's sub-steps.** They belong to the user's real goal but sit inside the
   tutorial goal. Do they get copied into the real goal at hand-off?~~ No longer
   applies: step 3 adds no sub-steps (#829).
6. **Copy cost.** Paper lines roughly double the tutorial's strings (en + de).

## Built so far

Landed with this plan:

- `goal.templateId`: which template a goal came from.
- `src/templates/`: the template format, a validator, and `insertTemplate`.
- `step.description`: stored, writable through `createStep` / `createSubStep` /
  `updateStep`, carried by templates, shown on the in-progress Focus card.

- The tutorial template itself (`src/templates/tutorial.ts`, copy in the `templates`
  i18n namespace, English only so far) and a Settings row, "Start the tutorial goal",
  that seeds it and opens it in Focus Mode. Checked on the Android emulator.
- The template is flat: no sub-steps. Step 3 is done on paper with the three steps
  typed as the note, and step 5 pauses and resumes itself.
- Step 6 has the reader add a step of their own (#829, decision below).

## Decision: where the tutorial teaches adding a step (#829)

Decided 2026-11-12 as a default. The owner may overrule it.

**Step 6, not step 3, teaches adding a step.** The reader adds their first step as a
sub-step of step 6, does five minutes on it, finishes it, then finishes step 6. Step 3
stays a journal step with a note. Step 5 keeps setting aside step 5 itself.

### What a first-time user has to do

From Focus Mode (labels as the buttons read, en / de):

1. The pencil next to the goal's name. It has no text; its screen-reader label is
   "Edit goal" / "Ziel bearbeiten". It opens Edit Goal.
2. On the step's card in Edit Goal: "break into sub-steps" / "in Unterschritte
   aufteilen". This adds a sub-step titled "New sub-step" / "Neuer Unterschritt" at once.
3. Tap that title to rename it inline, and type.
4. "Done" / "Fertig" returns to Focus Mode.

A user-added sub-step plans a text note by default (`DEFAULT_PLANNED_EVIDENCE_TYPES`),
so it finishes the way every tutorial step does: "Add Note", then "Mark complete".

### Why the planned flow (three sub-steps in step 3) was not built

Checked against `resolveNextActionableStep` and `areAllStepsComplete` (`src/db/queries.ts`):

- **A pending sub-step comes before its parent and everything after it.** Three
  sub-steps added under step 3 become the next three Focus cards at once. Steps 4 to 9
  stay hidden until the reader finishes or sets aside all three. Those are steps of the
  reader's real goal ("buy paint"), not things they can do in the tutorial.
- **A set-aside step keeps the goal from reading as done.** `areAllStepsComplete` is
  false while any step is paused. A sub-step left set aside from step 5 means that after
  step 9 Focus Mode shows "Nothing in progress. 1 set aside" instead of the card with
  "Design your badge", which step 9 tells the reader to tap.
- So every step the reader adds must be finished inside the tutorial. The only one they
  can honestly finish is the one they work on: step 6's five minutes.

A parent with sub-steps can still be marked complete. Once its sub-steps are done, Focus
Mode returns to the parent with its own text and evidence, and "Mark complete" works as
on any step. That is what step 6's copy relies on: "Finish it as usual, then this step."

### Options considered

- **Three sub-steps in step 3 (the plan).** Blocked by the ordering above.
- **One sub-step in step 5, then set it aside.** Teaches adding and setting aside
  together, but the set-aside sub-step blocks the badge card unless the reader picks
  it back up and finishes it. Too many moves for one step.
- **A new top-level step via "Add step...".** It lands after step 9 and blocks the
  badge card in the same way.
- **One sub-step in step 6 (built).** It opens next, is finished in the same five
  minutes, and leaves step 9's badge card in place. Test:
  `src/templates/__tests__/tutorial.test.ts`.

### Limits

- Step 6's text is longer than on #826 (en 141 → 240 characters, de 161 → 241), at or
  under step 5's length in each language (en 255, de 243). Step 5 is the step whose
  control was checked on screen. Not yet checked on a device.
- "Done" pushes a second Focus Mode on top of the first (React Navigation 7 `navigate`
  no longer goes back to a screen already in the stack). The reader lands in the right
  place; the back gesture afterwards returns to Edit Goal. This is true of every
  Edit Goal visit, not just the tutorial.
- Coming back to step 6, the reader sees the same text again, including the Edit Goal
  instructions. Nothing on the card says the sub-step is done.
- Tutorial goals already started keep their old step 6 text.
- Open question 5 (do the step 3 sub-steps move to the real goal?) no longer applies.
  The step 6 sub-step stays in the tutorial goal.

## Follow-ups

- **Description editor in Edit Goal (#803).** The description can be read but not edited in
  the app yet. The epic's rule is that nothing a template writes is locked, so this
  has to land before the tutorial ships.
- Description on the timeline and on the paused and completed cards: decide whether
  it shows there.
- Storybook story for the Focus card with a description.
- `docs/architecture/data-model.md`: add `goal.templateId` and `step.description`.
- Tutorial template content and copy (en + de), picker and first-run wiring
  (epic children E, G, H, I). Done so far: a dismissable tutorial offer on the
  Goals screen (`TutorialOfferCard`, `useTutorialOffer`). It goes away for good
  once the tutorial is started, declined, or a tutorial goal already exists
  (`userSettings.tutorialOfferHidden`).
- Tapping "Start the tutorial goal" twice in Settings makes two tutorial goals.
  The Goals-screen offer guards against this; the Settings row does not yet.
- German copy for the `templates` namespace (bundle is `{}`, falls back to English).
- `scripts/worktree-boot.sh` passes `--no-dev-tools`, which this Expo CLI rejects.
- From #829 review: a sub-step's Focus card does not name its parent step, so a
  reader on their step 6 sub-step loses sight of step 6's text until they finish
  it. Showing the parent's title there would help any goal with sub-steps.
- From #829 review: Edit Goal's "Done" pushes a second Focus Mode instead of going
  back to the first (see the #829 decision's Limits). Needs its own issue.
- Step 6's new copy needs an emulator pass in en and de: the Focus card's
  controls must stay on screen, and renaming "New sub-step" then tapping "Done"
  must keep the typed name.
