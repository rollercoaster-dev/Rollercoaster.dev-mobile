# Handoff: Adapting the 7 Themes to the App Redesign

## Overview

The Rollercoaster app has been **redesigned** — a new, bold neo-brutalist visual language
(thick black borders, hard offset shadows, a colored screen-header band, a yellow status bar,
display headlines in *Anybody*, pill nav, journey timelines, a badge gallery, evidence chips).

The app already ships **7 accessibility themes** (Full Ride, Night Ride, Bold Ink, Warm Studio,
Still Water, Loud & Clear, Clean Signal), defined today in `packages/design-tokens` as `--ob-*`
CSS variables. **Those tokens were built for the *old* UI.** The redesign introduces surfaces and
treatments the old token set never modeled, so it does not "map" onto the existing `--ob-*` vars —
and it shouldn't. This is not a bug to patch screen-by-screen.

**The task: extend the design-token system so all 7 themes can express the new design, then drive
the redesign entirely from those tokens (zero hardcoded color).**

This bundle is the design reference + the architecture + a concrete plan to get there with Claude Code.

---

## About the Design Files

The files in `prototypes/` are **design references created in HTML** (a lightweight component format —
`.dc.html` rendered by `support.js`). They are **not production code to copy**. They show the
intended look and behavior of the redesign. Your job is to **recreate this in the real codebase**
(`apps/native-rd`, React Native) using its established patterns, and to **author the token values**
in `packages/design-tokens`.

To view a prototype: open the `.dc.html` file in a browser (it self-loads `support.js`). Start with
`prototypes/App Shell (token-backed).dc.html` — it already reads theme values from the real
`tokens/*.css` via a runtime probe, with the theme switcher in Settings.

**Fidelity: high.** Colors, type, spacing, radii, shadows, and interactions are final-intent.
Recreate pixel-faithfully, but source every visual value from a token (see below) — not from the hex
in the HTML.

---

## The Core Idea: the redesign needs its own *semantic token contract*

The old `--ob-*` tokens describe the old UI's surfaces. The redesign has roles the old set never had.
So step one is **naming the redesign's roles** — that's the new contract. Every screen then reads
*only* these roles; each theme supplies the values.

The prototype already contains ~80% of this contract: the hand-typed `THEMES` map in
`App Shell.dc.html` (logic class, ~line 705). It is the **right shape** — it just needs to be
(a) extended to cover everything the redesign uses, and (b) made the single source every screen reads.

### Make each theme cheap to author (the key to not drowning)

The trap: 7 themes × ~60 component values = unmaintainable transcription. Instead, **each theme is
~15 _primitives_, and every component token is _derived_ from them.** Authoring a theme = ~15 decisions;
journey nodes, badge tiles, chips, and shadows fall out automatically.

**Per-theme primitives (~15):**

| Primitive | Role | Example (Full Ride / Night Ride) |
|---|---|---|
| `bg` | page background | `#fafafa` / `#1a1033` |
| `surface` | card background | `#ffffff` / `#241845` |
| `surfaceAlt` | sunken / alt panel | `#f3f3f3` / `#2d1f52` |
| `ink` | primary text | `#0a0a0a` / `#fafafa` |
| `inkSoft` | secondary text | `#525252` / `#cfc7e0` |
| `muted` | tertiary / captions | `#9a9a9a` / `#a89cc4` |
| `brand` | screen-header band + active accents | `#a78bfa` / `#2a1d4e` |
| `brandInk` | text on `brand` | `#0a0a0a` / `#fafafa` |
| `status` / `statusInk` | top status bar | `#ffe50c` `#0a0a0a` / `#ffe50c` `#0a0a0a` |
| `primary` / `primaryFg` | primary CTA | `#2563eb` `#fff` / `#5eead4` `#0a1f1a` |
| `success` / `successFg` | evidence / positive | (new) e.g. `#0f9d63` `#fff` |
| `borderCol` + `borderW` | border treatment | `#0a0a0a` 2.5–3px / `#4e3f73` 2px |
| `shadowStyle` | **hard** offset vs soft vs none | hard `3px 3px 0 …` / none |
| `radius` | corner radius | `4px` / `6px` |
| `headFont` `headW` / `bodyFont` / `monoFont` / `fs` / `lineH` | type | Anybody 900 / Instrument / DM Mono / 1 / 1.5 |

**Derived component tokens (computed from primitives, not authored per theme):**

- `journey.nodeDefault = surfaceAlt`, `node.active = primary`, `node.complete = success`, `conn = borderCol`
- `badge tile palette = reward accent ramp` (a small fixed accent set, tinted per theme if needed)
- `chip.bg = success @ low alpha`, `chip.fg = success` (or `successFg` on filled)
- `card = { background: surface, border: borderW solid borderCol, boxShadow: shadowStyle, borderRadius: radius }`
- `link = primary`
- `celebration / highlight = brand @ low alpha` with `ink = brand` (dark variant)

So a theme is its 15 primitives; the ~45 component tokens are one derivation function.

### The redesign's full role inventory (the contract to define)

Group the new tokens like this (names are suggestions — align with your `--ob-*` conventions):

- **Surfaces & text:** `bg, surface, surfaceAlt, ink, inkSoft, muted`
- **Chrome:** `statusBar.bg/fg`, `screenHeader.bg/fg/border` *(new — see Gap 1)*, `nav.band/pill/activeBg/activeFg/idleFg`
- **Actions:** `primary.bg/fg`, `selection/ring`, `disabled.*`, `destructive.bg/fg` *(see Gap 4)*
- **Feedback:** `success.bg/fg/subtle`, `warning.*`, `info.*`, `highlight.*`
- **Journey (core domain):** `step.node.{default,active,complete}`, `step.connector`, `step.cell.{pending,active,done}`, `progress.{track,fill}`, `timeline.{line,node}`
- **Reward/badges:** `badge.chrome.bg/fg/border`, `badge.accent[1..5]`, `celebration.{accent,text}`, `level.{novice,intermediate,advanced,expert}`
- **Form:** `evidenceChip.bg/fg`, `input.bg/fg/border/placeholder`
- **Structure:** `borderColor`, `borderWidth` (default/medium), `radius` (sm/md/lg), `shadow` (**hard**/soft/none — the redesign treats shadow as a design feature, see Gap 3)
- **Type:** `font.{headline,body,mono}`, `weight.headline`, `scale.body`, `lineHeight.body`
- **Spacing/density:** `space` unit scale *(new — see Density)*

---

## Token Gap Findings (what the redesign uses that the current `--ob-*` set lacks)

Pulled from auditing the prototype's hardcoded hex against `tokens/tokens.css` + `tokens/themes.css`.
These are the **decisions/additions** Claude Code should resolve in `packages/design-tokens`:

1. **Screen-header band.** Every sub-screen paints a brand band (`#a78bfa`, hardcoded). There is *no*
   theme-appropriate "screen header" token — `--ob-chrome-header-*` is card-colored and hidden in
   native; `--ob-chrome-top-bar-*` is the yellow status bar; `--ob-chrome-tab-bar-bg` is the bottom
   nav. **Add a `screen-header` token** (likely `brand` + `brandInk`), authored per theme.
2. **Brand accent ≠ neutral `--ob-accent`.** `--ob-accent` is a gray surface, not the brand purple the
   redesign wants. The redesign's "accent" is the brand color (`--ob-color-accent-purple` / tab bar).
   Repoint or introduce `brand`.
3. **Shadow is a design feature, not `none`.** `--ob-shadow-md` is `none` in every theme; the redesign
   uses **hard offset shadows** (`3px 3px 0 rgba(10,10,10,.85)`) pervasively. Add a `shadow-hard`
   token (it already exists as `--ob-shadow-hard-sm/md` in `:root` but is unused and **not authored
   per theme**) and decide each theme's treatment (dark/soft/flat themes opt out — see Decision 2).
4. **Destructive is amber, not red.** `--ob-action-destructive-bg` resolves to warning/amber; the
   redesign hardcodes red `#dc2626`. Decide: adopt amber, or add a true destructive token.
5. **Journey & reward scales are unused.** `--ob-journey-*` and `--ob-reward-*` exist but the redesign
   hardcodes node/connector/tile colors. Wire the redesign to them (and add any missing states).
6. **Evidence/success-subtle background.** Chips use `#d4f4e7` (a pale success tint). There may be no
   "success-subtle bg" token — add `success.subtle`.
7. **Contrast failures still open** (`Theme Refactor Prep Spec.md` §1): primary, destructive, success,
   warning, info, highlight pairs fail AA in several themes. Fix at the token source during authoring.

---

## Density — separate bug + missing scale

Density (Compact 0.75× / Default / Comfortable 1.25×) **does nothing on screen today.** In the
prototype, `dScale` is computed in `renderVals` but **no layout reads it** — it only toggles a
highlight in Settings. Two parts to fix:

1. **Wire it:** padding, gaps, and font-size on the redesign's primitives must multiply by the density
   scale.
2. **There is no spacing-scale token** to drive this from. Add a `space` scale to the contract
   (e.g. `space-1..6`) and let density select among scales (or multiply a base unit). Then density is
   token-driven, not ad-hoc math.

---

## Two Decisions to Make First

These shape how many primitives each theme needs — answer before authoring:

1. **Where do the themes live?** Extend `packages/design-tokens` with new/renamed `--ob-*` semantic
   tokens (recommended — keep one source of truth, rebuild Style Dictionary → `tokens.css`/`themes.css`),
   or prototype-local first then migrate. This bundle assumes the former.
2. **How much theme divergence?** Do all 7 share the bold treatment (hard shadows, thick black borders)
   and only swap palette/type — or do some themes (Night Ride, Still Water, Clean Signal) intentionally
   *soften / flatten* it? If themes opt out of the treatment, add `borderW` + `shadowStyle` + `radius`
   as per-theme primitives (already in the table above). The prototype's `cur` map already varies these
   per theme, which suggests **per-theme treatment** is intended.

---

## Implementation Plan (for Claude Code in the repo)

1. **Define the contract.** In `packages/design-tokens/src`, add the redesign's semantic roles (see
   inventory). Express component tokens as references to the ~15 per-theme primitives so authoring stays
   small. Keep names consistent with existing `--ob-*` conventions.
2. **Author the 7 themes.** Fill the primitives for each theme. Seed values from the prototype's
   `THEMES` map in `App Shell.dc.html` (it's the validated starting point) and from `tokens/themes.css`.
   Theme id → scope class map is in `App Shell (token-backed).dc.html` (`THEME_SCOPE`).
3. **Fix contrast at the source** (Prep Spec §1) while authoring — every fg/bg pair ≥ 4.5:1 (or 3:1 if
   text is always ≥24px/bold).
4. **Rebuild** Style Dictionary → regenerate `tokens.css` + `themes.css`.
5. **Rewire the app** (`apps/native-rd`): replace every hardcoded color/shadow/radius in the redesigned
   screens with the new tokens. Verify zero literal hex remains in screen styles.
6. **Implement density** from the `space` scale; confirm Compact/Default/Comfortable visibly reflow.
7. **Verify** across all 7 themes × every screen (use `App Shell (token-backed).dc.html`'s screen list
   as the checklist: Goals, Focus active/blocked/paused/parked/done, Timeline, New Goal, Capture,
   Finish, Badge wall/empty/detail, Welcome, Settings).

---

## Files in this bundle

- `prototypes/App Shell.dc.html` — the redesign, all screens inline. **The `THEMES` map (logic class,
  ~line 705) is the seed of the new token contract.** Search for hardcoded hex to find every gap.
- `prototypes/App Shell (token-backed).dc.html` — same shell, but theme values are read from the real
  `tokens/*.css` at runtime (`buildThemesFromTokens`, `THEME_SCOPE`). Shows the mapping + where tokens
  fall short in real layout. Open this one first.
- `prototypes/WelcomeFrame.dc.html`, `prototypes/SettingsFrame.dc.html` — child screens the shell embeds.
- `prototypes/support.js` — the runtime that renders `.dc.html` (so the prototypes open in a browser).
- `prototypes/tokens/tokens.css` — the `:root` layer: every current `--ob-*` var + default.
- `prototypes/tokens/themes.css` — per-theme override blocks + the scope class names.
- `Theme Refactor Prep Spec.md` — the computed contrast-failure list (§1) and the old divergence audit
  (§2); use §1 as the contrast to-fix list during authoring.

## Theme id → scope class (the runtime 7)

| id | Name | Scope class |
|---|---|---|
| `light-default` | The Full Ride | *(none — `:root`)* |
| `dark-default` | Night Ride | `ob-dark-theme` |
| `light-highContrast` | Bold Ink | `ob-high-contrast-theme` |
| `light-dyslexia` | Warm Studio | `ob-dyslexia-friendly-theme` |
| `light-autismFriendly` | Still Water | `ob-autism-friendly-theme` |
| `light-lowVision` | Loud & Clear | `ob-low-vision-theme` |
| `light-lowInfo` | Clean Signal | `ob-low-info-theme` |

(`ob-large-text-theme` exists in CSS but is **not** a runtime theme — ignore it.)
