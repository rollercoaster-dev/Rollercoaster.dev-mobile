# Handoff prompt — redesign **Focus Mode** (Rollercoaster.dev goal app)

Paste everything below into a new conversation. Re-attach the **Design System** project and the local repo folder **`Rollercoaster.dev-mobile`** first.

---

You're helping me redesign a React Native app screen by screen as **Design Components** (`.dc.html`). We've finished the **Edit Goal** screen; this conversation is **Phase 2, Screen 2: Focus Mode**.

## The app
Rollercoaster.dev — a goal/evidence app for **neurodivergent users**. You document progress toward a goal by completing **steps**, and **every step requires evidence** (photo / video / audio / note / link / file) — that's the core concept, never optional. Repo is attached as the local folder `Rollercoaster.dev-mobile`. Focus Mode lives at `apps/native-rd/src/screens/FocusModeScreen/`. Read the real source before designing — components it uses: `MiniTimeline`, `ProgressDots`, `CardCarousel`, `StepCard`, `GoalEvidenceCard`, `EvidenceDrawer`, `ModeIndicator`, plus the `TimelineJourneyScreen`.

## Locked design decisions (don't relitigate)
- **Theme: "The Full Ride" (neo-brutalist)** — the app's main theme. (Other accessibility themes like "Still Water" get re-evaluated later; design in Full Ride for now.)
- **Direction: bold minimalism, one focus at a time** — calm, low-load, but rendered in the punchy Full Ride style (this is intentional and the user likes it).
- **Goal flow**: create → build steps → work → complete → **badge designed at the very end** (not up front). Badge defaults to the first letter of the title until designed.
- Evidence is **required per step**; the only UX question is making the **type** pick effortless (default Note, one tap to change via a 6-type picker sheet).

## Full Ride tokens (use as literal inline styles — no stylesheets)
- Surfaces: board `#e5e5e5`, screen `#fafafa`, cards `#fff`. Ink/text `#0a0a0a`; muted `#525252`/`#737373`; faint `#9a9a9a`/`#a3a3a3`.
- Primary blue `#2563eb` (white text). Success `#059669`, mint `#d4f4e7`. Yellow `#ffe50c`. Purple band `#a78bfa`, evidence-chip purple `#ede9fe`. Goal/warning `#d97706`.
- Borders: ink `#0a0a0a`, widths 1/2/3px (thin/medium/thick). **Hard offset shadows**: `3px 3px 0 rgba(10,10,10,0.85)` (card), `2px 2px 0` (small), `4px 4px 0` (lifted). Radii: cards 2px, buttons 4px, inputs 6px, pills 9999.
- **Fonts** (Google Fonts): **Anybody** 700–900 = display/hero + card titles; **Instrument Sans** 400–700 = all UI + body; **DM Mono** = counts, labels, metadata. Load in `<helmet>`.
- Chrome: status bar `#ffe50c` w/ dark text; header band `#a78bfa` w/ dark bold (Anybody) text + 3px bottom border.

## What Focus Mode does today (the problem)
It stacks **three overlapping navigators at once** — `MiniTimeline` (tappable step strip; tapping it opens the full Timeline screen), `ProgressDots`, and a swipe **CardCarousel** — plus a bottom **EvidenceDrawer** with an add-evidence **FAB** fan-out, plus a header eye-toggle + edit pencil + a "Focus" mode indicator. The current step card (`StepCard`) carries a top band ("{n} of {total}" + status badge), the title, an evidence rail of captured chips, and a foot with a "Mark complete" checkbox + quick-capture buttons (completion is **blocked until required evidence is captured**). Completing a step **auto-advances** to the next pending one. A separate **TimelineJourney** screen already exists as the full overview (tapping a node returns to Focus).

## The agreed direction for Focus Mode
Strip to **one current task on screen**. Drop the redundant dual indicators (mini-timeline + dots) and the drawer/FAB; keep **one** way to see everything — reuse the **existing Timeline screen** as a quiet "See all steps" overview. Auto-advance on complete is the happy path (most sessions need no navigation). Evidence stays required, its type picked per step.

## Your task
1. Read the real `FocusModeScreen` + the components above.
2. Produce an **audit** (faithful neo-brutalist reproduction of today's screen + friction flags), then **2–3 directions** as labelled phone frames.
3. After I pick, build a **finished-fidelity interactive prototype** (`.dc.html`, Design Component, inline styles, fonts in helmet, phone ~340–360px) — real state, tappable, including the evidence-type picker sheet and the hand-off to the Timeline overview.

## How to work
- Author as **Design Components** with the `dc_write` / `dc_*_str_replace` tools. Inline styles only; fonts + `@font-face`/links in `<helmet>`; `<sc-if>` / `<sc-for>` for state; logic in a `class Component extends DCLogic`.
- Present options as labelled frames in one scrolling board (gray `#e5e5e5` bg, `width:max-content`, start-aligned flex rows).
- Match the existing artifacts in this project for visual continuity: `Edit Goal C Prototype.dc.html`, `Edit Goal Directions.dc.html`, `Focus Flow Map v2.dc.html`.
- Go one screen at a time; audit → 2–3 variations → I pick → finalize.
