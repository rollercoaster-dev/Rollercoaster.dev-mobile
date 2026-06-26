# Handoff prompt — wire the redesigned screens into **one connected prototype** (Rollercoaster.dev)

Paste everything below into a new conversation. Re-attach the **Design System** project and the local repo folder **`Rollercoaster.dev-mobile`** first.

---

You're helping me redesign a React Native goal app screen-by-screen as **Design Components** (`.dc.html`). We've now redesigned most of the core surfaces as separate, finished prototypes. **This task is different: don't design a new screen — stitch the finished ones into a single navigable prototype** that walks the whole goal lifecycle, using the app's real navigation structure. Along the way, the gaps in our coverage should become obvious — that's intentional; I want to confirm what's still un-touched before we call this done.

## The app
Rollercoaster.dev — a goal/evidence app for **neurodivergent users**. You document progress toward a goal by completing **steps**, and **every step requires evidence** (photo / video / audio / note / link / file) — that's the core concept, never optional. Lifecycle: **create → build steps → work (focus + evidence) → complete → design a badge → the badge is the artifact** (a designed, shareable, verifiable OB 3.0 credential). Repo is the attached local folder `Rollercoaster.dev-mobile`. Theme is **"The Full Ride"** (neo-brutalist) — design only in Full Ride.

## What's already built in this project (the finished pieces)
Each is a standalone `.dc.html` that draws its **own phone frame + chrome**. Open and read them before wiring — match their copy, palette, and interaction feel exactly.

| Surface | Finished prototype | Chosen direction |
|---|---|---|
| Goals tab **+** Badges tab (incl. bottom nav + empty states) | `Goals + Badges C Prototype.dc.html` | **C** — Goals = momentum *cockpit* (progress ring + one "Start" action); Badges = dark immersive *wall of proof* (count, latest spotlit, dense gallery). Bottom nav = **"The Slide"** (Goals = yellow, Badges = mint, Settings = white). |
| Edit Goal | `Edit Goal C Prototype.dc.html` | C |
| Step planning — dates & dependencies | `Set BC B Prototype.dc.html` | B |
| Focus Mode | `Focus Mode A Prototype.dc.html` | A |
| Add Evidence (entry/nav) | `Add Evidence Nav.dc.html` | — |
| Timeline Journey | `Timeline A Prototype.dc.html` | A |
| Finishing / completion flow | `Finishing Flow A Prototype.dc.html` | A |
| Badge Detail | `Badge Detail C Prototype.dc.html` | C — yellow celebration hero, swipeable proof gallery, single Share sheet, Delete behind confirm |

(Direction boards and flow maps also exist alongside these — `* Directions.dc.html`, `Focus Flow Map*.dc.html`, etc. — use them for context only.)

## Your task
Build **one connected, clickable prototype** — call it `App Shell.dc.html` — that mounts the finished screens behind the app's real navigation and lets me click straight through the lifecycle. Specifically:

1. **A persistent app shell**: one phone frame + the **"The Slide"** bottom tab bar (Goals / Badges / Settings), with a simple in-DC route stack (push/pop, back affordance) layered over the tabs.
2. **Mount the finished screens as routes.** Recommended architecture: refactor each finished prototype into a **frameless screen body** (strip its individual status bar / device frame / its own nav) exposed as a child component, then `dc-import` them into the shell so the shell owns the one frame, status bar, and bottom nav. (Faster fallback if you prefer: keep them as separate pages and link with relative `<a href>` + a shared back button — but the single-shell version reads far better as a prototype.)
3. **Wire the real navigation graph** (from the source — verify against `navigation/`):
   - **Root tabs**: `GoalsTab`, `BadgesTab`, `SettingsTab`. **Focus Mode is NOT a tab** — it's reached *only* by picking a goal. "+ New goal" lives in the Goals list.
   - **Goals stack**: Goals (cockpit) → Focus Mode → { Edit Mode, Add Evidence → Capture*, Evidence Viewer, Timeline Journey, Completion Flow }. Goals → New Goal (modal).
   - **Badges stack**: Badges (wall) → **Badge Detail** → **Badge Designer**. Tapping a badge on the wall opens its Detail; Badge Detail's "View timeline" hops to the Goals stack's Timeline Journey for that goal.
   - **Completion → badge creation**: Completion Flow → **Badge Earned** → **Badge Designer** → the new badge lands on the Badges wall + opens its Detail.
4. **Make the key paths actually click**: Goals cockpit **Start** → Focus Mode; complete a goal → the badge-creation path → it appears on the wall; wall tile → Badge Detail → Share sheet / View timeline / Delete-confirm; tab switches; both empty states reachable.

## ⚠ First, sanity-check this coverage map — the gaps are the point
Before wiring, walk the full lifecycle against what we've actually redesigned. Anything marked **ORIGINAL** is a surface we have **not** touched yet — for each, tell me whether to **(a) stub it** (a faithful but minimal placeholder so the flow is navigable) or **(b) flag it as out of scope** for this pass. Don't silently skip them, and don't quietly invent finished designs for them either.

| Lifecycle step | Source screen | Status |
|---|---|---|
| First run / onboarding | `WelcomeScreen` | **ORIGINAL** — never redesigned |
| Goals list | `GoalsScreen` | ✅ done (Goals + Badges C) |
| Create a goal | `NewGoalModal` | **ORIGINAL** — only *audited* in the Set BC board |
| Edit goal + steps | `EditModeScreen` | ✅ done (Edit Goal C) |
| Step dates / dependencies | (within Edit) | ✅ done (Set BC B) |
| Work a step | `FocusModeScreen` | ✅ done (Focus Mode A) |
| Add evidence (entry) | (nav) | ✅ done (Add Evidence Nav) |
| Capture evidence | `CapturePhoto / CaptureVideo / CaptureFile / CaptureLink / CaptureTextNote / VoiceMemo` | **ORIGINAL** — not redesigned |
| View evidence | `EvidenceViewerScreen` | **ORIGINAL** — not redesigned |
| Timeline / journey | `TimelineJourneyScreen` | ✅ done (Timeline A) |
| Complete a goal | `CompletionFlowScreen` | ✅ done (Finishing Flow A) |
| **The "you earned it" moment** | `BadgeEarnedModal` | **ORIGINAL — not redesigned** |
| **Design the badge** | `BadgeDesignerScreen` | **ORIGINAL — not redesigned** |
| Badge detail | `BadgeDetailScreen` | ✅ done (Badge Detail C) |
| Badges collection | `BadgesScreen` | ✅ done (Goals + Badges C) |
| Settings | `SettingsScreen` | **ORIGINAL** — but the bottom nav has a **Settings tab**, so it can't stay a dead end |

**My read on what's most conspicuously missing:** the entire **badge-*creation*** path — **Badge Earned → Badge Designer**. We lovingly redesigned the badge's *detail* and built a celebratory *wall* of badges, but the moment you actually **earn and design** the badge (the literal payoff the handoffs call "design a badge at the very end") is still the original screens. After that, **Settings** (a live tab with no redesigned destination) and **New Goal** (the front door to the whole app) are the next gaps. Confirm whether these match what you had in mind, and which to stub vs. defer.

## The badge graphic itself
Our prototypes draw badges as static CSS/SVG art. In the real app the badge is rendered by `badges/BadgeRenderer.tsx` (banner + frame + shape + icon + path text from `parseBadgeDesign`). For the wired prototype, the static art is fine as a stand-in — just don't present it as the final renderer, and keep the **verifiable** signal (green check + mint chip) consistent with Badge Detail C.

## Full Ride tokens (inline styles only — no stylesheets)
- Surfaces: board `#e5e5e5`, screen `#fafafa`, cards `#fff`. **Wall-of-proof dark surface `#161616`** (Badges tab, our addition). Ink `#0a0a0a`; muted `#525252`/`#737373`; faint `#9a9a9a`/`#a3a3a3`.
- Primary blue `#2563eb` (white text). Success green `#059669`, mint `#d4f4e7`. Yellow `#ffe50c`. Purple header band `#a78bfa`. Evidence purple `#ede9fe`. Amber `#d97706`. Destructive red `#dc2626` on white.
- Borders ink, widths 1/2/3px. **Hard offset shadows**: `3px 3px 0 rgba(10,10,10,0.85)` card, `2px 2px 0` small, `4px 4px 0` lifted (on dark, shadow goes light/black per surface). Radii: cards 2px, buttons 4px, inputs 6px, pills 9999.
- **Fonts** (Google Fonts, load in `<helmet>`): **Anybody** 700–900 = display/hero + titles; **Instrument Sans** 400–700 = UI/body; **DM Mono** = counts, labels, metadata.
- Bottom nav "The Slide": ink footer, fafafa rounded bar, active slot fills with its tab colour (Goals = `#ffe50c`, Badges = `#d4f4e7`, Settings = white) and shows its label; inactive slots are muted icons only.

## How to work
- Author as **Design Components** with the `dc_write` / `dc_*_str_replace` tools. Inline styles only; fonts + `@font-face`/keyframes in `<helmet>`; `<sc-if>` / `<sc-for>` for state/routes; logic in a `class Component extends DCLogic` (route stack + active tab live here).
- Reuse the existing prototypes' markup — copy their screen bodies in rather than re-deriving from memory; keep their copy and feel.
- Phone frame ~360px wide; let the screen body scroll inside the frame while the status bar + bottom nav stay fixed (as in `Goals + Badges C Prototype.dc.html`).
- Finish with `ready_for_verification({path})`.

## Order of work
1. Read `navigation/` (the tab navigator + `GoalsStack` / `BadgesStack`) so the route graph is faithful, and re-read the finished prototypes you'll mount.
2. **Present the coverage map above and get my call on the ORIGINAL screens (stub vs. defer) before building the shell.**
3. Build the shell + tabs + route stack; mount the done screens; wire the click paths.
4. Stub whatever I approve (faithful, minimal, unmistakably Full Ride), clearly marked as stubs.
5. One connected prototype, navigable end to end.
</content>
