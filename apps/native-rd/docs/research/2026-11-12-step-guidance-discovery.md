# Step Guidance — How a Goal Shows Its Earner What To Do

**Date:** 2026-11-12
**Status:** Discovery. Nothing here is decided.
**Owner:** Joe

**Related:** [tutorial plan](../plans/2026-11-10-tutorial-goal-journal.md) · [product vision §goal templates](../vision/product-vision.md) · [badge criteria authoring](./2026-10-26-bike-badge-criteria-authoring.md) · [step model gap](./step-model-gap.md)

---

## Provenance

Joe ran the "Find your footing" tutorial on 2026-11-12. It covers the important steps, but it uses app terms such as "set aside" without showing where they are. The step said "Set this step aside" and left the reader to find the control.

The same day's copy pass (branch `fix/tutorial-names-controls`) names each control as its button reads. That fixes the wording. It does not fix the cause.

## The problem

A step can guide its reader with exactly two things: a title and one block of prose (`TemplateStep.description`, `src/templates/types.ts`). So a step can only tell. It cannot point at a control, show a picture, or say what counts as done.

The tutorial is the first goal written by one person for another to follow. Shared goals make that the normal case: someone at a bike workshop writes a goal, and a learner they may never meet follows it. Whatever the tutorial lacks, every shared-goal author will lack too.

## Two kinds of guidance

They need different tools, and mixing them is what makes the current prose hard to follow.

| Kind                   | Example                              | Who needs it                  |
| ---------------------- | ------------------------------------ | ----------------------------- |
| How to use the app     | "Tap Set this step aside"            | The tutorial, almost only     |
| How to do the real job | "Fold the sheets in half and staple" | Every shared goal, every step |

Shared-goal authors mostly write the second kind. The tutorial is unusual in needing both.

## Options

### A. Name the control in prose (done)

Quote the button label and say where it sits. Cheap, works today, translates with the rest of the copy.

Found on the emulator, 2026-11-12: the first version of the new copy was three short paragraphs, and it pushed "Set this step aside" below the fold on a Pixel 8 in the default theme. The step told the reader to tap a button they could not see. Trimming the text fixed that one screen. Larger-text themes and smaller phones will still hide it, so prose length and control visibility pull against each other. That is an argument for B.

Limits: the copy drifts when a label changes, and nothing checks it. A tutorial goal already started keeps its old text, because template strings are copied into the user's own rows at insert.

### B. Highlight the real control

A step names a control (`highlight: "set-aside"`). While that step is current, the app outlines the real button.

- Always right for theme, language and layout, because it is the live UI.
- Needs a small fixed vocabulary of highlightable controls, owned by the app.
- Must respect reduce-motion: a static outline, no pulsing.
- Open: the highlight only helps while the control is on screen. "Find it again under See all steps" spans two screens.

### C. Screenshots of the app

Not recommended. Seven themes times two languages times every UI change. A screenshot that no longer matches the screen misleads more than no screenshot. Option B covers the same need without the upkeep.

### D. Author images on a step

A photo or diagram for the real-world job: the folded journal, a knot, a finished example. This is where a picture beats prose, and where shared-goal authors will want it most.

- Needs storage, a place in the template format, and required alt text.
- Must stay distinct from evidence. A template never carries evidence; "the pile has to be the user's" (`types.ts`). A guidance image is the author's, shown to the earner, and never counts toward completion.
- Open: where the image lives when a goal is shared phone to phone, and how big it may be.

### E. Structured step text

Split the one prose block into named parts, so every step reads the same way:

- **Do** — the real-world action.
- **In the app** — which control, if any (pairs with B).
- **Done when** — what the earner captures, in the author's words.

"Done when" overlaps with badge criteria. The bike research found criteria read best as observable results ("the checks that guarantee the user's safety have been done"). A step's "done when" could be the same sentence at step size.

Risk: three fields are more work than one. Authors may leave them empty or paste the same text in each. Needs testing with a real author before any schema change.

### F. Author-side checks

- Preview as earner: the author walks their own goal before sharing it.
- A lint that flags an app term used with no pointer. Only useful for the tutorial and other app-teaching goals.

## Guardrails that apply

- **ADR-0012, no auto-judgment.** Guidance may say what to do and what done looks like. It may not grade, count, or mark a step late or wrong.
- **An adopted goal is the earner's own.** The vision says an adopted template "becomes an ordinary user-created goal". So the earner can edit or delete any guidance, and it must still make sense after they do.
- **Accessibility contract.** Alt text on every image, 44pt targets, reduce-motion, all seven themes.

## Open questions

1. Does guidance belong to the step forever, or only until the step is first done? A highlight on a control the user already knows is noise.
2. Is "how to use the app" a tutorial-only need? If yes, B could stay internal and never reach the shared-goal format.
3. Can a shared-goal author realistically fill in Do / In the app / Done when? Who do we test this with — the bike-pilot practitioners?
4. Where do guidance images live and travel, given local-first storage and phone-to-phone sharing?
5. Does "done when" become the badge criteria, feed it, or stay separate?
6. Should improved template copy reach goals already inserted? Today it cannot.

## Suggested next steps

- Ship the copy pass (A).
- Prototype B on the "set aside" step alone and run the tutorial again.
- Ask one bike-pilot practitioner to write a three-step goal on paper, with no format given, and see what they naturally include. That answers question 3 before any schema work.
