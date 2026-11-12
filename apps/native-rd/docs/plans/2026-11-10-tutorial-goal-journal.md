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

- App: add three sub-steps under this step.
- Paper: copy them under the goal, any way you like.
- Teaches: step and sub-step authoring.

**4. Say why, out loud** (app leads)

- App: 30-second voice memo.
- Paper: one line of why.
- Teaches: voice memos, which people otherwise never find.

**5. Set one step aside** (app leads)

- App: pause one of the three sub-steps.
- Paper: mark it set aside, in whatever way makes sense to you.
- Teaches: `paused`. Stopping isn't failing.

**6. Five minutes in focus mode** (do, then write)

- App: focus mode on one of your sub-steps.
- Paper: afterwards, write what happened.
- Teaches: `FocusModeScreen`, and writing after doing.

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
5. **Step 3's sub-steps.** They belong to the user's real goal but sit inside the
   tutorial goal. Do they get copied into the real goal at hand-off?
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
