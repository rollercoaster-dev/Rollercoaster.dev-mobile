# Handoff — wire **Welcome (rail)** + **Settings (chips)** + the **theme/density system** into `App Shell.dc.html`

The exploration is done and decided. This phase folds the chosen directions into the connected prototype as live routes, and promotes **theme** + **density** to real shell-wide state. Paste this into a fresh session with the `Rollercoaster.dev-mobile` repo mounted and the **Design System** skill attached.

---

## 0. What's already built (don't redo)

`Welcome + Settings Directions.dc.html` is the approved canvas. It contains the full, working system as child DCs you should reuse:

- **`ThemeSampleCard.dc.html`** — the signature card (★ badge + "Daily reading" + "3 of 5 done" + "+ ADD"), rendered live from a `t` token object. Prop: `t`.
- **`WelcomeFrame.dc.html`** — full Welcome screen. Props: `mode` (`"chips"|"rail"`), `cur` (current theme tokens), `themes` (list w/ per-item `pick`/`selected`/swatch fields). **Use `mode="rail"`.**
- **`SettingsFrame.dc.html`** — full Settings screen. Props: `mode` (`"rows"|"chips"|"condensed"`), `cur`, `themes`, `densityRows`, `onReplay`. **Use `mode="chips"`.**
- The `THEMES` map + `buildThemes()` / `buildDensRows()` helpers live in the canvas's logic class — **copy them verbatim** into the shell's logic class (values reproduced in §3 below so you don't have to dig).

> ⚠️ The shipped native app uses **chip grid on Welcome** and **sample-card rows in Settings**. We are intentionally diverging: **Welcome = swatch rail, Settings = chip grid** (unifies the picker on the compact swatch pattern, keeps Settings short). Note this divergence for the eng team; it's a deliberate product call, not an oversight.

---

## 1. DECIDED — the two form factors

| Screen | Chosen form factor | Why |
|---|---|---|
| **Welcome** | **B — swatch rail + live preview** | First-run breathes; a horizontal rail of round 3-band swatches with the selected theme's name/desc below, and the live sample card above. Picking re-skins the whole frame. |
| **Settings** | **B — chip grid** | 7 two-up swatch chips with a ✓ on the active one. Compact, scannable, unifies with Welcome's swatch language. |

Both already implemented and live in the canvas — you're moving them, not rebuilding them.

---

## 2. The 7 themes are peers, not a light/dark toggle (recap)

One **theme name** (7 options) × one **density** (Compact 0.75× / Default / Comfortable 1.25×). `largeText` is NOT a runtime picker option — ignore it. Each theme is a complete look: bg, ink, border, **shadow on/off**, font-family, spacing scale.

Honesty requirements the previews already satisfy and the shell MUST keep:
- **Night Ride** → dark bg; card elevation shadow composes to **0** (border carries depth); only modals/FABs keep a hard shadow.
- **Bold Ink / Still Water / Loud & Clear** → `shadows.opacity: 0` — the signature `box-shadow: 3px 3px 0` **disappears**, the border carries structure.
- **Warm Studio** → cream `#f8f5e4`, **Lexend** font, looser leading, soft (not hard-offset) shadow.
- **Loud & Clear** → **Atkinson Hyperlegible**, ~1.2× type scale.
- **Clean Signal** → **Atkinson Hyperlegible**, single dark accent, minimal.
- **Still Water** → **Arial**, muted/desaturated, thin borders, no shadow.

---

## 3. The token map (copy verbatim into the shell's logic class)

Each theme exposes the fields the shell needs to drive its chrome. `fs` is a type-scale multiplier used via `font-size:calc(Npx * {{ t.fs }})`. `cardShadow:"none"` is how shadow-off themes are honest.

```js
THEMES = {
  "light-default":      { id:"light-default", name:"The Full Ride", desc:"Standard theme",
    bg:"#fafafa", surface:"#ffffff", surfaceAlt:"#f3f3f3", ink:"#0a0a0a", inkSoft:"#525252", muted:"#9a9a9a",
    band:"#a78bfa", bandInk:"#0a0a0a", bandSub:"#3a2d6b", accent:"#a78bfa", accentFg:"#0a0a0a",
    primary:"#2563eb", primaryFg:"#ffffff", check:"#7c5cff", sel:"#7c5cff",
    cardBorder:"2.5px solid #0a0a0a", cardShadow:"3px 3px 0 rgba(10,10,10,0.85)", radius:"4px", borderCol:"#0a0a0a",
    status:"#ffe50c", statusInk:"#0a0a0a", headFont:"'Anybody',sans-serif", headW:"900",
    bodyFont:"'Instrument Sans',sans-serif", monoFont:"'DM Mono',monospace", lineH:"1.5", fs:"1" },

  "dark-default":       { id:"dark-default", name:"Night Ride", desc:"Dark mode",
    bg:"#1a1033", surface:"#241845", surfaceAlt:"#2d1f52", ink:"#fafafa", inkSoft:"#cfc7e0", muted:"#a89cc4",
    band:"#2a1d4e", bandInk:"#fafafa", bandSub:"#a89cc4", accent:"#c4b5fd", accentFg:"#1a1033",
    primary:"#5eead4", primaryFg:"#0a1f1a", check:"#5eead4", sel:"#5eead4",
    cardBorder:"2px solid #4e3f73", cardShadow:"none", radius:"6px", borderCol:"#4e3f73",
    status:"#ffe50c", statusInk:"#0a0a0a", headFont:"'Anybody',sans-serif", headW:"900",
    bodyFont:"'Instrument Sans',sans-serif", monoFont:"'DM Mono',monospace", lineH:"1.5", fs:"1" },

  "light-highContrast": { id:"light-highContrast", name:"Bold Ink", desc:"High contrast (WCAG AAA)",
    bg:"#ffffff", surface:"#ffffff", surfaceAlt:"#f0f0f0", ink:"#000000", inkSoft:"#000000", muted:"#2a2a2a",
    band:"#000000", bandInk:"#ffffff", bandSub:"#cfcfcf", accent:"#000000", accentFg:"#ffffff",
    primary:"#000000", primaryFg:"#ffffff", check:"#0055cc", sel:"#0055cc",
    cardBorder:"3px solid #000000", cardShadow:"none", radius:"2px", borderCol:"#000000",
    status:"#ffffff", statusInk:"#000000", headFont:"'Anybody',sans-serif", headW:"900",
    bodyFont:"'Instrument Sans',sans-serif", monoFont:"'DM Mono',monospace", lineH:"1.45", fs:"1" },

  "light-dyslexia":     { id:"light-dyslexia", name:"Warm Studio", desc:"Dyslexia-friendly",
    bg:"#f8f5e4", surface:"#f8f5e4", surfaceAlt:"#f0edd8", ink:"#333333", inkSoft:"#555555", muted:"#7a755f",
    band:"#8860a0", bandInk:"#f8f5e4", bandSub:"#e9ddf0", accent:"#8860a0", accentFg:"#ffffff",
    primary:"#4e7d9e", primaryFg:"#ffffff", check:"#4e7d9e", sel:"#4e7d9e",
    cardBorder:"2px solid #c8c3a9", cardShadow:"0 2px 5px rgba(80,60,20,0.12)", radius:"8px", borderCol:"#c8c3a9",
    status:"#f5e6a0", statusInk:"#333333", headFont:"'Lexend',sans-serif", headW:"700",
    bodyFont:"'Lexend',sans-serif", monoFont:"'DM Mono',monospace", lineH:"1.7", fs:"1" },

  "light-autismFriendly": { id:"light-autismFriendly", name:"Still Water", desc:"Autism-friendly",
    bg:"#f7f7f7", surface:"#ffffff", surfaceAlt:"#eeeeee", ink:"#333333", inkSoft:"#555555", muted:"#777777",
    band:"#8a7a9a", bandInk:"#ffffff", bandSub:"#e6e0ee", accent:"#8a7a9a", accentFg:"#ffffff",
    primary:"#4d6d7d", primaryFg:"#ffffff", check:"#4d6d7d", sel:"#4d6d7d",
    cardBorder:"1px solid #dddddd", cardShadow:"none", radius:"6px", borderCol:"#dddddd",
    status:"#d5c88a", statusInk:"#333333", headFont:"Arial,sans-serif", headW:"700",
    bodyFont:"Arial,sans-serif", monoFont:"'DM Mono',monospace", lineH:"1.55", fs:"1" },

  "light-lowVision":    { id:"light-lowVision", name:"Loud & Clear", desc:"Low vision support",
    bg:"#ffffff", surface:"#ffffff", surfaceAlt:"#f0f0f0", ink:"#111111", inkSoft:"#333333", muted:"#333333",
    band:"#003d99", bandInk:"#ffffff", bandSub:"#bcd0f0", accent:"#003d99", accentFg:"#ffffff",
    primary:"#003d99", primaryFg:"#ffffff", check:"#003d99", sel:"#003d99",
    cardBorder:"3px solid #555555", cardShadow:"none", radius:"6px", borderCol:"#555555",
    status:"#ffe50c", statusInk:"#000000", headFont:"'Atkinson Hyperlegible',sans-serif", headW:"700",
    bodyFont:"'Atkinson Hyperlegible',sans-serif", monoFont:"'DM Mono',monospace", lineH:"1.6", fs:"1.2" },

  "light-lowInfo":      { id:"light-lowInfo", name:"Clean Signal", desc:"Reduced visual noise",
    bg:"#ffffff", surface:"#ffffff", surfaceAlt:"#f5f5f5", ink:"#222222", inkSoft:"#444444", muted:"#666666",
    band:"#222222", bandInk:"#ffffff", bandSub:"#bbbbbb", accent:"#222222", accentFg:"#ffffff",
    primary:"#222222", primaryFg:"#ffffff", check:"#222222", sel:"#222222",
    cardBorder:"2px solid #cccccc", cardShadow:"none", radius:"2px", borderCol:"#cccccc",
    status:"#ffffff", statusInk:"#222222", headFont:"'Atkinson Hyperlegible',sans-serif", headW:"700",
    bodyFont:"'Atkinson Hyperlegible',sans-serif", monoFont:"'DM Mono',monospace", lineH:"1.6", fs:"1" },
};
```

Order is the runtime `themeOptions` order (Full Ride, Night Ride, Bold Ink, Warm Studio, Still Water, Loud & Clear, Clean Signal). Density list: `[{id:"compact",label:"Compact",desc:"Tighter spacing (0.75×)"},{id:"default",label:"Default",desc:"Standard spacing"},{id:"comfortable",label:"Comfortable",desc:"Roomier spacing (1.25×)"}]`.

Verbatim copy (already in the children, keep it): Welcome hero "Hey there 👋" / "Welcome to your ride."; body1/body2 and footnote from `i18n/welcome.json`; sample card "Daily reading" / "3 of 5 done" / "+ ADD"; Settings sections Theme → Content Density → Onboarding (Replay welcome) → About ("App / rollercoaster.dev", "Version / 1.0.0", footer "Built with Expo + Evolu + Unistyles").

---

## 4. Build target — wire into `App Shell.dc.html`

`App Shell.dc.html` (≈1034 lines) is a single big DC: phone frame (360×760) → status bar (`#ffe50c`) → scrollable content with `<sc-if>` route blocks → "The Slide" bottom nav (gated by `showTab`) → overlays. Logic class holds `state` and a fat `renderVals()`.

**A. Promote theme + density to state.**
- Add `theme: "light-default"` and `density: "default"` to `state` (and the `THEMES`/`DENSITIES` maps + `buildThemes`/`buildDensRows` from the canvas).
- In `renderVals()` expose `cur = THEMES[s.theme]` and `dScale` (0.75/1/1.25 from `s.density`).
- **Persist**: read `localStorage["rd_theme"]` / `["rd_density"]` in the constructor (fall back to defaults), and write them in the theme/density setters. The shell already persists route state — match that pattern, and never clobber unrelated keys.

**B. Re-skin the WHOLE shell (full scope — decided).** Every route's chrome reads from `cur` instead of hardcoded literals:
- Header bands `#a78bfa` → `{{ cur.band }}` / text `{{ cur.bandInk }}`.
- Page bg `#fafafa`/`#161616` → `{{ cur.bg }}`; card surfaces `#fff` → `{{ cur.surface }}`.
- The signature `border:…#0a0a0a` + `box-shadow:3px 3px 0 …` → `{{ cur.cardBorder }}` + `{{ cur.cardShadow }}` (so shadow-off + dark themes look right).
- Status bar bg/ink, bottom-nav pill (`{{ cur.surface }}` + active `{{ cur.accent }}`), primary buttons (`{{ cur.primary }}`/`{{ cur.primaryFg }}`), headline font `{{ cur.headFont }}`/`{{ cur.headW }}`.
- This is the bulk of the work — methodical find/replace of literals to `cur.*` across the route blocks. Style holes are correct here (live runtime value).

**C. Replace the Settings stub.** Delete the invented block (profile card, "Reduce motion", reminder, account rows — currently ~lines 128-155, the `<sc-if value="{{ rSettings }}">`). Drop in `<dc-import name="SettingsFrame" mode="chips" cur="{{ cur }}" themes="{{ themesList }}" density-rows="{{ densList }}" on-replay="{{ goWelcome }}" hint-size="100%,100%">`. Keep the route gated by `rSettings`; Settings keeps the bottom nav (it's a tab).

**D. Add the `welcome` route (first-run only).**
- New `<sc-if value="{{ rWelcome }}">` rendering `<dc-import name="WelcomeFrame" mode="rail" cur="{{ cur }}" themes="{{ themesList }}" hint-size="100%,100%">`, **before the tabs, with no bottom nav** (add `welcome` to the `showTab` exclusion list alongside `newgoal`/`finish`).
- Boot logic: if `localStorage["rd_hasSeenWelcome"]` is unset, start `route:"welcome"`; else boot to `goals`. The WelcomeFrame's "Get Started" should set `rd_hasSeenWelcome` and `goTab("goals")` — pass an `onGetStarted` handler (add the prop to `WelcomeFrame` if needed; today it has no CTA callback — wire the footer CTA's `onClick`).
- `goWelcome` (from Settings "Replay welcome") sets `route:"welcome"` so it's reachable in the prototype.

**E. Tweakable props (decided).** Make `theme` and `density` **props on the App Shell root DC** via `dc_set_props` (enum editors), read as `this.props.theme ?? state.theme`. Lets reviewers flip the whole prototype's look from the Tweaks panel.

**F. Leave alone.** Capture / evidence-viewer stubs stay as-is. Don't invent Settings rows beyond Theme / Density / Replay / About.

---

## 5. Traps

- **Shadow-off honesty**: don't leave any hardcoded `3px 3px 0` in re-skinned blocks — they'll wrongly reappear in Bold Ink / dark. Route every card shadow through `{{ cur.cardShadow }}`.
- **Fonts**: the shell helmet only loads Anybody / Instrument Sans / DM Mono. Add **Lexend** + **Atkinson Hyperlegible** to the Google Fonts `<link>` (Warm Studio / Loud & Clear / Clean Signal need them). Arial is system.
- **`WelcomeFrame` CTA** currently has no callback prop — add `onGetStarted` and wire the footer button before relying on it for the boot flow.
- **Density scope**: density rows in `SettingsFrame` already move the ✓; to make density actually scale the live shell you'd thread `dScale` into spacing/type via `calc(Npx * {{ dScale }})`. If that's too broad for one pass, ship theme re-skin shell-wide + density visibly working on Welcome/Settings, and flag full-shell density scaling as the next increment.
- **Don't fork the children** — import them. If you tweak a token, edit the shared `THEMES` map, not per-screen literals.
- Small-change discipline: this is a big wiring pass, but only touch chrome/tokens + the two route blocks. Don't redesign Goals/Focus/Badges layouts.

---

## 6. Files worth opening
- `Welcome + Settings Directions.dc.html` — approved canvas; source of `THEMES`, `buildThemes`, `buildDensRows`, and the two chosen frames.
- `ThemeSampleCard.dc.html`, `WelcomeFrame.dc.html`, `SettingsFrame.dc.html` — the child DCs to import.
- `App Shell.dc.html` — target. Key anchors: `state = {` (~767), `renderVals()` (~835), `showTab`/`tabRoots` (~838), Settings stub `rSettings` (~128-155), bottom nav `showTab` (~602).
- Repo truth (read-only): `apps/native-rd/src/hooks/useTheme.ts` (7 `themeOptions`), `themes/variants.ts` (names + overrides), `packages/design-tokens/src/themes/*.json` (resolved per-theme colors), `i18n/resources/en/{welcome,settings,common}.json` (verbatim copy).
