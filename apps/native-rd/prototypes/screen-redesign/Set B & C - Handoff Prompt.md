# Handoff prompt — design **setting B (Planning) & C (Dependencies)** on a step (Rollercoaster.dev goal app)

Paste everything below into a new conversation. Re-attach the **Design System** project and the local repo folder **`Rollercoaster.dev-mobile`** first. Also attach the prior artifacts for continuity (see bottom).

---

You're helping me redesign a React Native app screen by screen as **Design Components** (`.dc.html`). We've finished **Edit Goal** (Screen 1), **Focus Mode** (Screen 2), and the **Timeline / Journey** (Screen 3). Those three settled the **read** side of the step model. This conversation is the **authoring** side: **how a user *sets* a step's planning date (B) and its dependencies (C)** — the create/edit surfaces where those truth-lines get authored in the first place.

## The app
Rollercoaster.dev — a goal/evidence app for **neurodivergent users**. You document progress toward a goal by completing **steps**, and **every step requires evidence** (photo / video / audio / note / link / file). Repo is attached as the local folder `Rollercoaster.dev-mobile`. The two authoring surfaces this work touches are **`apps/native-rd/src/screens/NewGoalModal/`** (where steps are first created) and **`apps/native-rd/src/screens/EditModeScreen/`** (where structure is edited and reordered). Read the real source before designing. The step itself is `StepCard`; states are `StatusBadge`; the shared model lives in `db` (`groupStepsByParent`, `StepStatus`).

## What's already decided — the *display* of B and C is settled, only *setting* is open
The Focus Mode + Timeline work shipped a **read** language we must now feed:
- **C dependencies** render **inline**: `after <step>` (internal) and `waiting on <person/org> · expected <date>` (external) — **never "blocked by."** Internal-satisfied flips to quiet green history.
- **B planning dates** render **factually**: `due <date>` — no red, no "overdue," no badge counts.
- These live in the **metadata band** (the E·C·B truth-lines) on the Focus card and on the Timeline step, in the **one state-color language** (`pending` / `in-progress` / `paused` / `completed`).

This conversation does **not** relitigate any of that. It designs **the input** that produces those lines.

## The core question (this is the whole job)
From the C prototype record (2026-06-16) and the B feature shape (Stage 3, **not started**), the open authoring questions are:
- **Where does setting a dependency live without pressuring every step toward a graph?** (C feature-shape Q5.) The affordance must be *available* but never make a plain step feel unfinished for lacking one.
- **Tap-count + friction to set / clear** a dependency or a date at create and at edit — kept below the threshold where breaking work into a constraint feels like more trouble than it's worth.
- **The C-vs-B expected-date overlap (C Q10, still open):** C's `expected <date>` names *the world's* timing ("the inspector comes Jun 24"); B's `due <date>` names *the user's* intent ("I want this done Mon"). When a waiting step also carries a user date, **both can co-exist** — the setting UI must let a user author each without conflating them, and without implying one satisfies the other.

## Hard constraints (ADR-0010 C-as-constraint, ADR-0012 no-auto-judgment, B/C feature shapes) — do not cross
- **Inform, never enforce.** Setting a dependency or date never blocks, hides, dims, disables, or refuses the step; its **complete action stays live** (for an external wait, completing it *is* "the event happened"). No constraint engine, no cycle detection.
- **No auto-satisfaction.** A passed expected/due date never marks a dep met, never changes a state, never authors "late" / "overdue" / "behind." (Open sub-question carried from C record: whether a *past* expected date earns a neutral past-tense like "was expected Jun 12" or whether any past-tense leans toward blame — decide in this prototype.)
- **Setting must not feel required.** A step with no dependency and no date stays **first-class**. The entry point can't pressure every step toward structure. "Quick add" (bare title) must stay the fast path.
- **Internal vs external is one structure, two registers** (C record Q4): same marker shape, different verb (`after` / `waiting on`) and palette (internal green/neutral vs external amber + mono date). The picker should make choosing target *type* feel like one affordance, not two features.
- **Two markers can stack** on one step (internal + external) and must stay legible, never reading as "blocked."
- **No counting / scoring / aggregating** waits or dates anywhere.
- **B merges** B-soft (a loose "sometime") + B-deadlines (a firm date) + repeating. Don't build a full calendar/recurrence engine in the first pass — shape the *lightest* date input that can express "soft intent" vs "a real date," and note where repetition would later live.

## Full Ride tokens (use as literal inline styles — no stylesheets; match the prior artifacts exactly)
- Surfaces: board `#e5e5e5`, screen `#fafafa`, cards `#fff`. Ink `#0a0a0a`; muted `#525252`/`#737373`; faint `#9a9a9a`/`#a3a3a3`.
- Primary blue `#2563eb` (white text). Success `#059669`, mint `#d4f4e7`. Yellow `#ffe50c`. Purple band `#a78bfa`, evidence/paused purple `#ede9fe`. External-wait amber `#d97706`.
- Borders ink `#0a0a0a`, widths 1/2/3px. **Hard offset shadows** `3px 3px 0 rgba(10,10,10,0.85)` (card), `2px 2px 0` (small), `4px 4px 0` (lifted). Radii: cards 2px, buttons 4px, inputs 6px, pills 9999.
- **State colors (one language):** pending `#fff`, in-progress `#ffe50c`, paused `#ede9fe`, completed `#d4f4e7` (✓).
- **Fonts:** **Anybody** 700–900 = display/titles; **Instrument Sans** 400–700 = UI/body; **DM Mono** = counts, labels, dates. Load in `<helmet>`.
- Chrome: status bar `#ffe50c`; header band `#a78bfa` w/ dark Anybody text + 3px bottom border; persistent bottom **nav pill** (Goals / ＋ / Badges / Settings). Leave room for it. Bottom sheets are the established pattern for pickers (see the Focus evidence-type sheet).

## The agreed direction
Make setting B and C feel like a **quiet, optional second gesture on a step you've already named** — reachable in one tap from the step row in create/edit, defaulting to nothing, and producing exactly the inline truth-lines the Timeline/Focus already render. Reuse the **bottom-sheet picker** pattern (one sheet that lets you pick *after <step>* vs *waiting on <someone> · expected <date>*, and set a *due <date>*), the same way the evidence-type picker works. The C marker wording is settled — your job is the **affordance + the picker UX + the tap economy**, and resolving the **C-expected vs B-due** two-date question in the input.

## Your task
1. Read the real `NewGoalModal` + `EditModeScreen` + `StepCard`, and the C prototype record + the B and C feature-shape sections (paths below).
2. Produce an **audit** (faithful neo-brutalist reproduction of how a step is created/edited today + where B/C *can't* be set, flagged), then **2–3 directions** for the setting affordance + picker, as labelled phone frames.
3. After I pick, build a **finished-fidelity interactive prototype** (`.dc.html`, Design Component, inline styles, fonts in helmet, phone ~344–360px): a step row with the entry point, the picker sheet(s) for internal-dep / external-wait / due-date, set + clear, the two-date case, and a live preview of the resulting inline truth-line in the one-state-color language.
4. Close the loop: the steps you author here should read out **exactly** as the metadata band already renders them in **`Focus Mode A Prototype.dc.html`** and **`Timeline A Prototype.dc.html`** — same glyphs, verbs, palette, and `expected`/`due` wording. If a step set here opened in Focus/Timeline, the lines must match.

## How to work
- Author as **Design Components** with `dc_write` / `dc_*_str_replace`. Inline styles only; fonts + `@font-face`/links in `<helmet>`; `<sc-if>`/`<sc-for>` for state; logic in `class Component extends DCLogic`.
- Present options as labelled frames in one scrolling board (gray `#e5e5e5`, `width:max-content`, start-aligned flex rows).
- Match the existing artifacts for visual continuity. Reuse the state-color language, the inline metadata band wording, the bottom-sheet picker, and the nav pill exactly as they appear in the Focus/Timeline prototypes.
- Go one screen at a time; audit → 2–3 variations → I pick → finalize. Don't fold in ideas I didn't ask for (e.g. don't reframe the progress read — that's settled).

## Continuity artifacts (in the project)
- `Timeline A Prototype.dc.html` — finished Screen 3 (one-state-color spine, inline E·C·B band, substeps, tappable nodes ↔ Focus). **Start here** for the exact rendered form of `after…` / `waiting on … expected…` / `due…`.
- `Focus Mode A Prototype.dc.html` — finished Screen 2 (the metadata band, the evidence-type bottom sheet to mirror, nav pill). Its "See all steps" already opens the Timeline.
- `Timeline Directions.dc.html`, `Focus Mode Directions.dc.html` — the audit + directions records for Screens 2–3.
- `Edit Goal C Prototype.dc.html`, `Edit Goal Directions.dc.html` — Screen 1, the New-Goal create flow + step list (the surface this work extends).
- ADRs: `apps/native-rd/docs/decisions/ADR-0010` / `ADR-0011` (step-model commitments + names) / `ADR-0012` (no-auto-judgment).
- **Prototype records / feature shapes (read these — they ARE the brief):** `docs/plans/phase-b-prototype-records/C-dependencies.md` (wording settled, treatment + setting open; Q5/Q10/passed-date carried forward); `docs/plans/phase-b-feature-shapes.md` §**C: Dependencies** and §**B: Planning** (B is Stage 3, not started — you're shaping its smallest useful input).
