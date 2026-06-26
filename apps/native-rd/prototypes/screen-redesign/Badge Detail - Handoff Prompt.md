# Handoff prompt — rethink the **Badge Detail screen** (Rollercoaster.dev goal app)

Paste everything below into a new conversation. Re-attach the **Design System** project and the local repo folder **`Rollercoaster.dev-mobile`** first.

---

You're helping me redesign a React Native app screen by screen as **Design Components** (`.dc.html`). We've finished a run of core surfaces — **Edit Goal**, **Focus Mode**, **Timeline Journey**, **step planning/dependencies (Set B & C)**, and the **bottom navigation**. Next screen: **Badge Detail** — the page you land on when you tap an earned badge in the Badges list.

## The app
Rollercoaster.dev — a goal/evidence app for **neurodivergent users**. You document progress toward a goal by completing **steps**, and **every step requires evidence** (photo / video / audio / note / link / file) — that's the core concept, never optional. A goal flow is: create → build steps → work → complete → **design a badge at the very end**. The badge is the *artifact* of a finished goal: a designed, shareable, verifiable credential. Repo is attached as the local folder `Rollercoaster.dev-mobile`.

## Read the real source first (don't design from memory)
The screen lives at `apps/native-rd/src/screens/BadgeDetailScreen/` — read `BadgeDetailScreen.tsx` and `BadgeDetailScreen.styles.ts`. Also relevant:
- `apps/native-rd/src/navigation/BadgesStack.tsx` — the stack: **Badges (list) → BadgeDetail → BadgeDesigner**. Detail is reached from the list; it can also deep-link.
- `apps/native-rd/src/badges/BadgeRenderer.tsx` + `types.ts` (`parseBadgeDesign`) — how the badge graphic itself is drawn (banner + frame + shape + icon + path text). You generally **don't** rethink the badge graphic; you rethink the *page around it*.
- `apps/native-rd/src/hooks/useBadgeExport.ts` — the three export paths (verifiable PNG, credential JSON, lossy image).

## What the screen is today (the thing we're rethinking)
A scrolling detail page with a **floating badge preview** pinned over the top and a back button, faithfully:
- **Chrome**: status bar `#ffe50c`; a purple (`#a78bfa`) `HeaderBand` holding only a back arrow (no title — the floating badge would cover it).
- **Floating preview overlay**: the rendered badge (`BadgeRenderer`, 160px) sits in a bordered, hard-shadow `previewContainer` that **floats over** the top of the scroll content (absolute, `zIndex:3`). The ScrollView reserves `paddingTop = measured previewHeight` so content starts below it. Fallbacks: real image → else the **goal-title initial** on a purple tile.
- **Scroll content**, in order:
  1. **Goal title** (centered, Anybody headline).
  2. **Identity chip** — the goal's emoji icon + a color dot, if set.
  3. **"Earned {date}"** subtitle.
  4. **Info card** with up to three blocks: **About** (goal description) · **How it was earned** (a criteria narrative pulled from the OB3 credential **plus a per-step evidence list** — each row an evidence-type icon + name + type label) · **Details** ("Created {date}").
  5. **View timeline** button (secondary) → hops to the `GoalsTab → TimelineJourney` for this goal.
  6. **Export card**: **Export verifiable badge** (primary — byte-preserving PNG carrying the OB 3.0 credential) · **Export credential** (JSON) · **Save as image** (honest "lossy" path) + a caption explaining the trade-off.
  7. **Delete** button (destructive) → confirm modal.

## Full Ride tokens (use as literal inline styles — no stylesheets)
- **Theme: "The Full Ride" (neo-brutalist)** — the app's main theme. Design in Full Ride only.
- Surfaces: board `#e5e5e5`, screen `#fafafa`, cards `#fff`. Badge canvas background per `badges/constants` (`BADGE_CANVAS_BACKGROUND`). Ink/text `#0a0a0a`; muted `#525252`/`#737373`; faint `#9a9a9a`/`#a3a3a3`.
- Primary blue `#2563eb` (white text). Success `#059669`, mint `#d4f4e7`. Yellow `#ffe50c`. Purple band `#a78bfa`, evidence-chip purple `#ede9fe`. Goal/warning amber `#d97706`. Destructive: red on white with ink border.
- Borders: ink `#0a0a0a`, widths 1/2/3px. **Hard offset shadows**: `3px 3px 0 rgba(10,10,10,0.85)` (card), `2px 2px 0` (small), `4px 4px 0` (lifted). Radii: cards 2px, buttons 4px, inputs 6px, pills 9999. (Note: the live `previewContainer` uses `borderRadius:0` — sharp corners.)
- **Fonts** (Google Fonts, load in `<helmet>`): **Anybody** 700–900 = display/hero + card titles; **Instrument Sans** 400–700 = all UI + body; **DM Mono** = counts, labels, metadata.
- Evidence-type icons today come from `constants/evidenceIcons` (`EVIDENCE_TYPE_ICONS`) — substitute simple equivalents in HTML.

## Why rethink it (tensions to resolve)
1. **The badge is the hero, but the page buries it.** It floats over the top, then a long single-column scroll of cards and buttons follows. Should the artifact get a more celebratory, less utilitarian treatment — this is the *payoff* screen of a whole goal?
2. **"How it was earned" is the most meaningful content and the least prominent.** The evidence list — the actual proof, the heart of the app — is one block inside a shared info card, below "About." Should the evidence/journey be the spine of the page rather than a sub-section?
3. **Three export buttons + a caption = decision load.** For this audience, three near-identical "export" actions is a lot. Is there a single confident primary share, with the rest tucked away?
4. **Action hierarchy is flat.** View timeline, three exports, and delete are all similar-weight stacked buttons. What's the *one* thing you do here? (Likely: admire it / share it.) Delete especially shouldn't sit at the same level as share.
5. **Empty/degraded states.** Badge not yet designed (initial-on-purple fallback), no description, no credential narrative, soft-deleted goal (goalId null → no "View timeline"). The redesign must handle these gracefully, not assume a fully-decorated badge.
6. **Verifiable credential is a real differentiator — is it legible?** The "this is a verifiable, portable credential" story is buried in button labels and a caption. Worth surfacing as a trust/credential signal?

## The agreed *frame* (starting point, not a locked answer)
Make the **badge the celebrated hero**, make the **evidence/"how it was earned" the spine** of the page, collapse the **three exports into one confident Share** (others secondary/overflow), and **demote Delete** out of the primary action set. Keep **View timeline** as the bridge back to the journey. Handle the degraded states. Keep it unmistakably Full Ride. These are defaults to react to — a direction may argue against any with reasoning.

## Your task
1. **Read the real source** (files above) so the audit is faithful — the floating preview + reserved padding, the info-card block order, the three exports, the timeline hop, delete-with-confirm, and the fallbacks.
2. Produce an **audit**: a faithful neo-brutalist reproduction of today's screen (a fully-decorated badge state **and** at least one degraded state — e.g. undesigned/initial fallback or missing narrative), with friction flags tied to the tensions above.
3. Then **2–3 directions** for the rethought screen, as labelled phone frames — each showing how the badge is presented, how evidence/"how earned" is structured, the share/export model, and where View timeline + Delete land. Call out per-direction how it answers tensions 1–6 and any degraded-state handling.
4. After I pick, build a **finished-fidelity interactive prototype** (`.dc.html`, Design Component, inline styles, fonts in helmet, phone ~340–360px): the hero badge, the evidence spine, a working share affordance (e.g. opens a sheet), View timeline, and Delete behind a confirm — with the page scrolling so the floating-preview behavior (or its replacement) reads in situ.

## How to work
- Author as **Design Components** with the `dc_write` / `dc_*_str_replace` tools. Inline styles only; fonts + `@font-face`/links in `<helmet>`; `<sc-if>` / `<sc-for>` for state; logic in a `class Component extends DCLogic`.
- Present options as labelled frames in one scrolling board (gray `#e5e5e5` bg, `width:max-content`, start-aligned flex rows — never center an overflowing row).
- Match the existing artifacts in this project for visual continuity: `Focus Mode A Prototype.dc.html`, `Timeline A Prototype.dc.html`, `Edit Goal C Prototype.dc.html`, `Set BC B Prototype.dc.html`, the `Bottom Nav Cool Directions.dc.html` board, and the `*Directions.dc.html` boards.
- One step at a time: audit → 2–3 variations → I pick → finalize.
