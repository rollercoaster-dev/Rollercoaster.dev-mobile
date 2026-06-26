# Handoff prompt — redesign **Timeline / Journey** (Rollercoaster.dev goal app)

Paste everything below into a new conversation. Re-attach the **Design System** project and the local repo folder **`Rollercoaster.dev-mobile`** first. Also attach the prior artifacts for continuity (see bottom).

---

You're helping me redesign a React Native app screen by screen as **Design Components** (`.dc.html`). We've finished **Edit Goal** (Screen 1) and **Focus Mode** (Screen 2). This conversation is **Phase 2, Screen 3: the Timeline / Journey** — the goal's full overview.

## The app
Rollercoaster.dev — a goal/evidence app for **neurodivergent users**. You document progress toward a goal by completing **steps**, and **every step requires evidence** (photo / video / audio / note / link / file) — that's the core concept, never optional. Repo is attached as the local folder `Rollercoaster.dev-mobile`. This screen lives at `apps/native-rd/src/screens/TimelineJourneyScreen/`. Read the real source before designing — components it uses: `TimelineStep` (+ `TimelineNode`), `ProgressBar`, `FinishLine`, `ScreenSubHeader`, `EvidenceItem`, and the shared `groupStepsByParent` / status helpers in `db`.

## Locked design decisions (don't relitigate)
- **Theme: "The Full Ride" (neo-brutalist)** — the app's main theme. Design in Full Ride.
- **Direction: bold minimalism, one focus at a time** — calm, low-load, punchy Full Ride style.
- **Goal flow**: create → build steps → work → complete → **badge designed at the very end** (badge defaults to the first letter of the title until designed). The Timeline's end (`FinishLine`) is where the finished goal + badge live.
- Evidence is **required per step**; type is picked per step (default Note, one tap to change via a 6-type picker sheet).

## Carry forward from Focus Mode (Screen 2 — already decided)
- **One overview surface.** Focus Mode was stripped to one task at a time and now delegates "see everything" to **this screen** — its "See all steps" link opens the Timeline, and tapping any node jumps back into Focus on that step. So the Timeline now carries more weight than it used to; it is *the* place cross-step structure is read.
- **The metadata band.** Each step carries up to ~3 quiet, informative-only truth-lines: an **E** state pill, a **C** dependency sub-line, a **B** date line. Reuse that same language here (inline, never punitive).
- **One state-color language everywhere** (ADR-0011 §E, decided 2026-06-14): a state is one color across pill, dot, mini-node, and the big journey node — `pending` / `in-progress` / `paused` / `completed`. The journey's `TimelineNode` is currently hard-wired to `palette.blue600`, a *different* language than the StepCard pill — that split is an accident to fix, not a decision to keep.
- **Only evidence gates anything.** Dependencies, paused, and dates all inform; nothing blocks, hides, dims, or refuses (ADR-0010 C-as-constraint; ADR-0012 no-auto-judgment).

## Full Ride tokens (use as literal inline styles — no stylesheets)
- Surfaces: board `#e5e5e5`, screen `#fafafa`, cards `#fff`. Ink/text `#0a0a0a`; muted `#525252`/`#737373`; faint `#9a9a9a`/`#a3a3a3`.
- Primary blue `#2563eb` (white text). Success `#059669`, mint `#d4f4e7`. Yellow `#ffe50c`. Purple band `#a78bfa`, evidence/paused purple `#ede9fe`. Goal/external-wait amber `#d97706`.
- Borders: ink `#0a0a0a`, widths 1/2/3px. **Hard offset shadows**: `3px 3px 0 rgba(10,10,10,0.85)` (card), `2px 2px 0` (small), `4px 4px 0` (lifted). Radii: cards 2px, buttons 4px, inputs 6px, pills 9999.
- **State colors (one language everywhere):** pending `#fff`, in-progress `#ffe50c`, paused `#ede9fe`, completed `#d4f4e7` (✓). Goal/finish node ★ goes `#ffe50c` when reached.
- **Fonts** (Google Fonts): **Anybody** 700–900 = display/hero + titles; **Instrument Sans** 400–700 = UI + body; **DM Mono** = counts, labels, metadata, dates. Load in `<helmet>`.
- Chrome: status bar `#ffe50c` w/ dark text; header band `#a78bfa` w/ dark bold (Anybody) text + 3px bottom border. A persistent global **nav pill** (Goals / ＋ / Badges / Settings, purple strip, lifted) sits at the bottom of every screen — leave room for it.

## What the Timeline does today (read the source)
- **Header**: goal title + a "Back to Focus" button + optional description + a `ProgressBar` and an "X of Y" label. Progress counts **every** step (parents + substeps).
- **Body**: a vertical run of `TimelineStep`s — each a `TimelineNode` (number / state) plus the step title and a row of captured-evidence chips, with **one-level substeps** nested under their parent. Tapping any node navigates to **Focus Mode**. Tapping an evidence chip opens the `EvidenceViewer`.
- **End**: a `FinishLine` — the goal-level evidence and the badge / finish marker.
- The current in-progress leaf is the journey's single accent; `currentLeafId` never points at a completed step.

### The friction / opportunity to flag in the audit
- **Two color languages.** `TimelineNode` = `blue600`; the StepCard pill = the state palette. They don't even agree on `completed`. Reconcile onto the one state-color language (the carry-forward decision).
- **Progress ratio vs. verdict.** `completed / total` keeps every step in the denominator (good — nothing hidden), but a **paused** step sitting under a completion ratio is exactly where "no composed verdicts / absence uninterpreted" gets tested. It must not read as a judgment over the set-aside step.
- **Color as the sole carrier.** A node has little room for a word, so `paused` risks riding on color alone — the open E worry. Find where the word can ride beside the node.
- **The journey now does more.** Since Focus delegates here, this screen must legibly hold **states (E)**, **dependencies (C)**, **planning dates (B)**, and **substeps (A)** at a glance — without becoming a constraint graph or an outline browser.

## The agreed direction
Make the Timeline the **calm single overview** Focus leans on. Keep the vertical journey spine, reconcile every node to the **one state-color language**, render **C dependencies inline** ("after …" / "waiting on … expected ⟨date⟩", never "blocked by"; the chip overflows a 360px card and the connector tie-line reads graph-like — inline tested calmest), show **B dates factually** (no red, no "overdue," no badge counts), nest **A substeps** one level under their parent, and keep the **progress read honest** over paused steps. Tapping a node still drops into Focus on that step. The `FinishLine` stays the badge/keepsake moment.

## Your task
1. Read the real `TimelineJourneyScreen` + the components above.
2. Produce an **audit** (faithful neo-brutalist reproduction of today's screen + the friction/opportunity flags), then **2–3 directions** as labelled phone frames.
3. After I pick, build a **finished-fidelity interactive prototype** (`.dc.html`, Design Component, inline styles, fonts in helmet, phone ~344–360px) — real state, tappable nodes that hand off to Focus, substeps, the metadata band on each step, and the FinishLine.
4. Close the loop: the **Focus Mode prototype's "See all steps" should open into this finished Timeline** (and the Timeline's node-tap / "Back to Focus" returns there) so the two screens demo as one flow.

## How to work
- Author as **Design Components** with the `dc_write` / `dc_*_str_replace` tools. Inline styles only; fonts + `@font-face`/links in `<helmet>`; `<sc-if>` / `<sc-for>` for state; logic in a `class Component extends DCLogic`.
- Present options as labelled frames in one scrolling board (gray `#e5e5e5` bg, `width:max-content`, start-aligned flex rows).
- Match the existing artifacts for visual continuity (see below). Reuse the state-color language, the inline metadata band, and the bottom nav pill exactly as they appear in the Focus Mode prototype.
- Go one screen at a time; audit → 2–3 variations → I pick → finalize.

## Continuity artifacts (in the project)
- `Focus Mode A Prototype.dc.html` — the finished Screen 2 (quiet card + linear timeline bar, evidence picker, complete/auto-advance, paused, and the Timeline hand-off this screen completes). **Start by reading this** — the visual vocabulary, state colors, nav pill, and metadata band all live here.
- `Focus Mode Directions.dc.html` — Screen 2 audit + the three directions.
- `Focus Mode Loaded Case.dc.html` — the loaded-step study (E/C/B band + real bottom chrome) the metadata band came from.
- `Edit Goal C Prototype.dc.html`, `Edit Goal Directions.dc.html` — Screen 1.
- ADRs: `apps/native-rd/docs/decisions/ADR-0010` / `ADR-0011` (step-model commitments + names); `ADR-0012` (no-auto-judgment). Prototype records: `docs/plans/phase-b-prototype-records/{C-dependencies,E-step-states}.md`. Feature shapes: `docs/plans/phase-b-feature-shapes.md`.
