# Handoff — redesign **Welcome** & **Settings**, and make the **theme system** first-class

Paste this whole file into a fresh session that has the `Rollercoaster.dev-mobile` repo mounted and the **Design System** skill attached. It tells you what already exists, what to build, and the traps to avoid.

---

## 0. Where we are

`App Shell.dc.html` is the connected prototype: phone frame + "The Slide" bottom nav + an in-DC route stack wiring the finished screens (Goals cockpit, Focus, Timeline, Edit Goal, New Goal, Finishing Flow/Badge Designer, Badge Detail, Badges wall) plus three **stubs**: Settings, shared Capture, Evidence Viewer.

**This phase replaces two of those:** design the real **Welcome** and **Settings** screens, and treat the **theme switcher + theme tokens** as the centre of gravity — they live in both screens and they touch every other screen in the app.

> ⚠️ Scope discipline. Last phase drifted into inventing Settings rows we don't have ("Reduce motion", "Daily nudge", "Export all credentials"). **Don't invent features.** Everything below is grounded in the actual codebase. Design what exists; flag anything else as a future idea, don't build it.

---

## 1. The single most important fact: themes are **7 peers**, not a light/dark toggle

From `apps/native-rd/src/hooks/useTheme.ts` + `i18n/resources/en/common.json` (`theme.options`). The 7 runtime themes — each is a complete look the whole app adopts the instant it's picked:

| id | Name | What it's for |
|---|---|---|
| `light-default` | **The Full Ride** | Standard theme (current prototype look) |
| `dark-default` | **Night Ride** | Dark mode — *this is the only dark one; it's a peer, not a mode flag* |
| `light-highContrast` | **Bold Ink** | High contrast, WCAG AAA |
| `light-dyslexia` | **Warm Studio** | Cream background, **Lexend** font, roomier line-height |
| `light-autismFriendly` | **Still Water** | Muted/desaturated, shadows off |
| `light-lowVision` | **Loud & Clear** | High-contrast + larger text + **Atkinson Hyperlegible**, shadows off |
| `light-lowInfo` | **Clean Signal** | Reduced visual noise |

There is a **separate axis** — **Content Density** (`settings.json` → `density`): Compact (0.75×) / Default / Comfortable (1.25×). It scales spacing, independent of theme.

So the model is: **one theme name** (e.g. `light-dyslexia`) **× one density**. Not "color mode + variant + dark switch". `largeText` exists as a composable variant in code but is **not** a selectable runtime theme — ignore it as a picker option.

### Why each theme is more than swapped colors
`themes/variants.ts` shows a variant can override: `colors`, `narrative`, `chrome`, `action`, `surfaceBorder`, `shadows.opacity`, `size` scale, `lineHeight`, and `fontFamily`. Real consequences you must show in previews:
- **Warm Studio** → cream `#f8f5e4` bg, Lexend, looser leading.
- **Loud & Clear** & **Still Water** & **Bold Ink** → `shadows.opacity: 0`, so the hard offset-shadow that defines the current look **disappears** and the **border** carries the structure instead.
- **Night Ride** → dark bg, and per `tokens.ts` the card elevation shadow composes to **zero in dark** (border carries depth); only modals/sheets/FABs keep a hard shadow.

A picker that only recolors swatches would be lying. Each preview tile must reflect its own bg, border treatment, shadow on/off, and (where it differs) font.

---

## 2. Build target A — **Welcome** (first-run onboarding)

Real screen: `screens/WelcomeScreen/WelcomeScreen.tsx`. Real copy (`i18n/resources/en/welcome.json`), use verbatim:

- Hero band (purple `HeaderBand`): BrandMark + label **"Hey there 👋"** + display title **"Welcome to your ride."**
- Body 1: *"rollercoaster.dev is your personal goal tracker. Everything stays on your phone — your data, your pace, your ride."*
- Body 2: *"First, let's pick a look that fits your brain. Tap a swatch — the whole app changes so you can see how it feels."*
- A **sample Card** (`common.theme.preview`): badge ★ + title **"Daily reading"** + meta **"3 of 5 days complete"** — this is the live theme preview surface.
- Theme picker label: **"Your look (tap to preview)"** → the **ThemeChipGrid** (the 7 themes as tappable chips).
- Footer CTA button **"Get Started"** + footnote **"You can change this anytime in Settings."**

**The defining interaction:** picking a theme chip **re-skins the entire Welcome screen live** (hero band, body, sample card, button) — onboarding *is* the demo of the theming promise. The prototype must show this: tapping a chip swaps the whole frame's palette/font/shadow, not just a checkmark. Flag (`hasSeenWelcome` in `db/schema.ts`) means it shows once on first launch, then the app boots to Goals.

In the shell: add a `welcome` route that renders **before** the tabs (no bottom nav), with `Get Started` → Goals cockpit. Add a "replay onboarding" affordance from Settings so it's reachable in the prototype.

## 3. Build target B — **Settings**

Real screen: `screens/SettingsScreen/SettingsScreen.tsx`. The **real** sections, in order — nothing more for users:

1. **ThemeSwitcher** — the 7 themes as full rows: each row shows the theme's own **mini sample card** (badge + "Daily reading" + "3 of 5 done" + "+ ADD" pill) rendered *in that theme's colors/font/shadow*, a label + description, and a checkmark on the active one. This is `components/ThemeSwitcher`. It's a radiogroup. Picking one re-skins the whole app immediately.
2. **Content Density** (`SettingsSection`) — three `SettingsRow`s: Compact "Tighter spacing (0.75×)", Default "Standard spacing", Comfortable "Roomier spacing (1.25×)". Active row shows ✓.
3. **About** — App = "rollercoaster.dev", Version = (build number). Footer line: *"Built with Expo + Evolu + Unistyles"*.

(There are dev-only Language + Dev-tools sections gated by `__DEV__` — **don't** show them in the user-facing design.)

Header: `ScreenHeader` titled **"Settings"**. Settings is a bottom-nav tab, so it keeps "The Slide" nav.

Components to mirror: `SettingsSection` (titled group) and `SettingsRow` (label + value/✓ or toggle + optional chevron). Keep them as the vocabulary; don't redesign rows into cards unless you're proposing a variation.

---

## 4. Design-system truth (use these, don't invent)

Brand palette (from `themes/adapter.ts`, base light): bg `#fafafa`, ink `#0a0a0a`, accentPurple `#a78bfa`, accentMint `#d4f4e7`, accentYellow `#ffe50c`, info/blue `#2563eb`, success `#059669`, error `#dc2626`. Dark (Night Ride): dark bg, `textMuted #a89cc4`, `accentPurple #8d7eb0`. Warm Studio cream `#f8f5e4`.

Type: headline = **Anybody** (900), body = **Instrument Sans**, mono = **DM Mono** (matches the rest of the prototype). Dyslexia → Lexend; Low Vision → Atkinson Hyperlegible.

Signature treatment: 2–3px ink borders + hard offset shadow (`box-shadow: 3px 3px 0`), square-ish radii. **Remember:** that shadow is theme-dependent — gone in Bold Ink / Still Water / Loud & Clear / dark cards.

Token categories that exist (so previews stay honest): `colors`, `chrome` (top bar/header/tab bar/modal), `action` (buttons + states), `surfaceBorder` (cards/sheets/inputs), `narrative`, plus `space / size / radius / borderWidth / letterSpacing / fontFamily / shadow`.

---

## 5. How to wire it into `App Shell.dc.html`

- The shell already has a **live theme** concept only as the fixed Full-Ride look. **Promote theme to state**: add `state.theme` (one of the 7 ids) and `state.density`. Drive the frame's core tokens (bg, ink, border, shadow-on/off, font-family, spacing scale) from a `THEMES[themeName]` map in the logic class, and have Welcome + Settings + (ideally) the whole shell read from it. Minimum bar: Welcome and Settings re-skin live; stretch: the theme persists across all screens.
- Replace the **Settings stub** block with the real three-section design. Remove the invented rows.
- Add the **`welcome`** route (pre-tabs, no bottom nav) + a Settings entry to replay it.
- Keep capture / evidence-viewer stubs as-is this phase.
- Persist `theme` + `density` to `localStorage` so a reload holds the choice (shell already persists route state).

---

## 6. What to actually produce

Default to a **canvas with a few framed options** for the two new screens (per the Canvas skill), then fold the chosen direction into `App Shell.dc.html` as live routes. Specifically explore:
- **Theme picker form factor**: full-width sample-card rows (as built) vs. a compact swatch grid (as on Welcome) — and how the live "whole screen re-skins" moment reads in each.
- **Welcome rhythm**: how much the hero/sample/picker breathe on a first-run screen.
- At least show 3 of the 7 themes rendered for real (incl. Night Ride + one shadow-off variant like Bold Ink or Warm Studio) so the system's range is visible, not asserted.

Make `theme` and `density` **props on the root DC** (tweakable) so reviewers can flip the whole prototype's look from the Tweaks panel.

---

## 7. Open questions to settle first (ask, don't assume)

1. **Live re-skin scope** — minimum (Welcome + Settings re-skin) or full (every shell route picks up the theme)? Affects effort a lot.
2. **Theme picker UI** — keep ThemeSwitcher's sample-card rows in Settings + chip grid in Welcome (as shipped), or unify on one pattern?
3. **Density** — design all three, or Default only with the picker present?
4. **Welcome reachability** — first-run-only with a Settings "replay", or also a normal nav entry for the demo?
5. **How many of the 7 themes** to render pixel-true vs. represent schematically in the prototype?

---

### Appendix — files worth opening
- `hooks/useTheme.ts` — the 7 `themeOptions`, validation, fallback.
- `themes/variants.ts` — what each variant overrides (+ the playful names).
- `themes/adapter.ts`, `themes/colorModes.ts`, `themes/tokens.ts` — real palette + token shapes.
- `components/ThemeSwitcher/ThemeSwitcher.tsx` — per-theme live sample card (the pattern to reproduce).
- `components/ThemeChipGrid/` — Welcome's chip picker.
- `screens/WelcomeScreen/WelcomeScreen.tsx`, `screens/SettingsScreen/SettingsScreen.tsx` — structure + real copy.
- `i18n/resources/en/{welcome,settings,common}.json` — verbatim strings.
