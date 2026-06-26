# Handoff prompt — rethink the **bottom navigation** (Rollercoaster.dev goal app)

Paste everything below into a new conversation. Re-attach the **Design System** project and the local repo folder **`Rollercoaster.dev-mobile`** first.

---

You're helping me redesign a React Native app screen by screen as **Design Components** (`.dc.html`). We've now finished a run of the core goal surfaces — **Edit Goal**, **Focus Mode**, **Timeline Journey**, and **step planning/dependencies (Set B & C)**. This conversation steps up a level: **rethink the global bottom navigation** now that those flows exist.

## The app
Rollercoaster.dev — a goal/evidence app for **neurodivergent users**. You document progress toward a goal by completing **steps**, and **every step requires evidence** (photo / video / audio / note / link / file) — that's the core concept, never optional. Repo is attached as the local folder `Rollercoaster.dev-mobile`. The nav lives at `apps/native-rd/src/navigation/` — read the real source before designing: `FocusPillTabBar.tsx` (the custom tab bar), `TabNavigator.tsx`, `types.ts` (the full route map), and `useTabScreenContentInset.ts`.

## Locked design decisions (don't relitigate)
- **Theme: "The Full Ride" (neo-brutalist)** — the app's main theme. Design in Full Ride; other accessibility themes are re-evaluated later.
- **Direction: bold minimalism, low cognitive load** — calm and few targets, rendered in the punchy Full Ride style. This matters doubly for navigation: every extra destination is cognitive cost for this audience.
- **Goal flow**: create → build steps → work → complete → **badge designed at the very end** (not up front). Badge defaults to the first letter of the title until designed.
- Evidence is **required per step**.

## Full Ride tokens (use as literal inline styles — no stylesheets)
- Surfaces: board `#e5e5e5`, screen `#fafafa`, cards `#fff`. Ink/text `#0a0a0a`; muted `#525252`/`#737373`; faint `#9a9a9a`/`#a3a3a3`.
- Primary blue `#2563eb` (white text). Success `#059669`, mint `#d4f4e7`. Yellow `#ffe50c`. Purple band `#a78bfa`, evidence-chip purple `#ede9fe`. Goal/warning amber `#d97706`.
- Borders: ink `#0a0a0a`, widths 1/2/3px (thin/medium/thick). **Hard offset shadows**: `3px 3px 0 rgba(10,10,10,0.85)` (card), `2px 2px 0` (small), `4px 4px 0` (lifted). Radii: cards 2px, buttons 4px, inputs 6px, pills 9999.
- **Fonts** (Google Fonts): **Anybody** 700–900 = display/hero + card titles; **Instrument Sans** 400–700 = all UI + body; **DM Mono** = counts, labels, metadata. Load in `<helmet>`.
- Chrome: status bar `#ffe50c` w/ dark text; header band `#a78bfa` w/ dark bold (Anybody) text + 3px bottom border.
- Tab icons today are **phosphor-react-native** (`Target`, `Medal`, `GearSix`) at 24px `bold`. In an HTML prototype, substitute simple equivalents or copy the phosphor SVGs — keep weights heavy to match.

## What the bottom nav is today (the thing we're rethinking)
A **custom tab bar** (`FocusPillTabBar`), not a default one. Faithfully, today it is:
- **One rounded "pill"** floating at the bottom (64px tall, ink border, hard shadow, `background` surface). The pill's **top half lifts *above* the tab-bar slot** (negative margin = `PILL_LIFT`); the bar's container is purple (`accentPurple`) with a 3px top border.
- Inside the pill, left→right: **Goals** tab (Target icon) · a **center yellow circular "+" FAB** · **Badges** tab (Medal icon). The active tab **morphs**: it expands into a purple capsule and reveals its **text label**; inactive tabs are icon-only 48px circles. A `LayoutAnimation` morph (220ms) plays on tab change (respects an animation pref).
- The **"+" FAB is "New Goal"** — it dispatches to `GoalsTab → NewGoal`. It is **hidden on the Settings tab**.
- **Settings** (GearSix) sits in a **separate small pill** to the right of the main pill — visually detached from the other two.
- So there are **3 real destinations** (GoalsTab, BadgesTab, SettingsTab) + **1 creation action** (the FAB). Each tab is a stack: GoalsTab is by far the deepest (Goals list → FocusMode, EditMode, TimelineJourney, CompletionFlow, NewGoal, EvidenceViewer, all the Capture* screens, BadgeDesigner); BadgesTab is Badges→BadgeDetail→BadgeDesigner; SettingsTab is shallow.
- **Layout coupling to flag for the engineer**: `PILL_LIFT` is consumed by `EvidenceDrawer` and by `useTabScreenContentInset` (screen content padding). Any change to the bar's height/lift ripples into those. Note it; don't silently break it.

## Why rethink it now (the problem the new prototypes surface)
The recent work deepened the **Goal** axis enormously — Focus Mode (work one task), Timeline Journey (see the whole arc), Edit Goal (author steps), Set B & C (planning dates + dependencies) — while the nav still treats "Goals" as a single flat tab and spends its most prominent slot (the center FAB) on **New Goal**, a *rare* action. Tensions to resolve:
1. **Wrong thing is loudest.** The brightest, most central control creates a new goal. For this audience the daily loop is *resume the goal I'm already working* (Focus Mode), not start a new one. Should the prime affordance be "jump back into my current focus" instead of "+ new"? Where does "+ new goal" go if so?
2. **No global "resume."** Focus Mode is only reachable by drilling Goals list → a goal. There's no one-tap "back into what I was doing." Given the prototypes, that may be the single highest-value global affordance.
3. **Badges weighting.** Badges gets a full equal tab, but it's the *reward/after* axis. Is it a peer of Goals, or a quieter destination?
4. **The detached Settings pill** reads as an afterthought bolted on. Is Settings even a bottom-nav peer, or should it move (profile/overflow)?
5. **Morph + lift complexity.** The expanding-label morph and the half-lifted pill are charming but add motion and an unusual hit-target shape — worth pressure-testing against the low-load mandate (and the existing animation pref).
6. **Does the nav need to change at all per context?** Today the FAB hides on Settings. With richer goal screens, should the bar adapt (e.g. inside Focus Mode), or stay globally stable for predictability (usually better for this audience)?

## The agreed *frame* (starting point, not a locked answer)
Lead with **resume/continue the current goal** as the primary action, demote **+ new goal** to a secondary spot, keep destinations to **3 or fewer**, and hold the **bar stable across contexts** unless a variation makes a strong case otherwise. Keep it unmistakably Full Ride. These are the defaults to react to — a direction may argue against any of them with reasoning.

## Your task
1. **Read the real source** in `apps/native-rd/src/navigation/` (files listed above) so the audit is faithful — the lift, the morph, the FAB-hides-on-Settings rule, the separate Settings pill, the 3 stacks.
2. Produce an **audit**: a faithful neo-brutalist reproduction of today's bar (both an active-Goals and active-Settings state so the FAB-hide + label-morph read), with friction flags tied to the tensions above.
3. Then **2–3 directions** for the rethought bar, as labelled phone frames — each showing the resting bar **and** its key state(s) (active tab, what the prime action does, where "+ new goal" lives). Call out per-direction how it answers tensions 1–6 and any `PILL_LIFT`/inset consequence.
4. After I pick, build a **finished-fidelity interactive prototype** (`.dc.html`, Design Component, inline styles, fonts in helmet, phone ~340–360px): real tab switching, the prime action wired to a plausible target, the morph/active treatment, and at least two screen contexts behind the bar so the bar's behavior is visible in situ.

## How to work
- Author as **Design Components** with the `dc_write` / `dc_*_str_replace` tools. Inline styles only; fonts + `@font-face`/links in `<helmet>`; `<sc-if>` / `<sc-for>` for state; logic in a `class Component extends DCLogic`.
- Present options as labelled frames in one scrolling board (gray `#e5e5e5` bg, `width:max-content`, start-aligned flex rows — never center an overflowing row).
- Match the existing artifacts in this project for visual continuity and to see the screens the bar sits under: `Focus Mode A Prototype.dc.html`, `Timeline A Prototype.dc.html`, `Edit Goal C Prototype.dc.html`, `Set BC B Prototype.dc.html`, and the `*Directions.dc.html` boards.
- One step at a time: audit → 2–3 variations → I pick → finalize.
