# Handoff — make the **working prototype** run on the real `--ob-*` tokens (token-backed adapter)

## Goal

Prove the design tokens hold up **in the real app, switching themes live** — not as swatches. Build `App Shell (token-backed).dc.html`: a copy of the working shell whose theme values come from the real generated CSS (`tokens/tokens.css` + `tokens/themes.css`) instead of the hand-typed `cur` map, with the existing theme switcher driving it.

This is the low-risk proof-of-concept for the eventual **PR B** shell refactor. Do it on a **copy** — leave `App Shell.dc.html` untouched.

> Paste into a fresh session with the `Rollercoaster.dev-mobile` repo mounted and the **Design System** skill attached. Read `Theme Refactor Prep Spec.md` and `Theme Eval.dc.html` first — they contain the validated mapping and the expected per-theme result.

---

## 0. The key insight — don't rewrite the template

The shell template consumes one theme object, exposed in `renderVals()` as **`cur: curTheme`**, where `curTheme = this.THEMES[themeId]`. The Settings theme chips come from `buildThemesShell()`, which iterates `Object.values(this.THEMES)`. `setTheme(id)` persists `rd_theme` to `localStorage` and `setState({theme})`.

**So you change exactly one thing: where `this.THEMES` gets its values.** Replace the 7 hand-typed hex blocks with a map of the **same shape**, populated by reading the resolved `var(--ob-*)` values under each theme's scoping class. The template, the chips, `setTheme`, density, and `SettingsFrame` all keep working unchanged.

---

## 1. Mechanics

1. **Copy** `App Shell.dc.html` → `App Shell (token-backed).dc.html`. Do not edit the original.
2. In `<helmet>`, load the token CSS (already in the project from the eval pass):
   ```html
   <link rel="stylesheet" href="./tokens/tokens.css">
   <link rel="stylesheet" href="./tokens/themes.css">
   ```
   Keep the existing font `<link>`s.
3. Keep the current hand-typed `THEMES` map as a **fallback** (first paint, and in case CSS hasn't loaded). In `componentDidMount`, call a new `buildThemesFromTokens()`, assign the result to `this.THEMES`, and `forceUpdate()`. This guarantees the design paints immediately and then upgrades to token-derived values.
4. `buildThemesFromTokens()`: create one hidden host appended to `document.body`; for each theme id, append a `<div class="<scope-class>">` (empty class for `light-default`), append a probe `<div>` per token with `style.background = 'var(--ob-…)'` (or `style.color` for fg tokens), read `getComputedStyle(probe).backgroundColor`, compose the composite keys (below), and assemble a `{id,name,desc, …}` object in the **exact `cur` shape**. Remove the host before returning. (This is the same probe technique `TokenScreen`/`Theme Eval` already use — copy it.)
5. Apply the theme's scope class to the **phone-frame root** as well (`class="<scope-class>"`). Not required for the JS-derived `cur`, but it lets any future direct `var(--ob-*)` usage resolve and makes the file a clean starting point for the real refactor.

### Scope classes (the runtime 7 — `large-text` excluded)
`light-default`→*(none)* · `dark-default`→`ob-dark-theme` · `light-highContrast`→`ob-high-contrast-theme` · `light-dyslexia`→`ob-dyslexia-friendly-theme` · `light-autismFriendly`→`ob-autism-friendly-theme` · `light-lowVision`→`ob-low-vision-theme` · `light-lowInfo`→`ob-low-info-theme`

---

## 2. The mapping — `cur.*` key → real token

Validated against the divergence matrix. Straight reads:

| `cur` key | token |
|---|---|
| `bg` | `--ob-background` |
| `surface` | `--ob-surface-card-bg` |
| `surfaceAlt` | `--ob-surface-sunken-bg` |
| `ink` | `--ob-foreground` |
| `inkSoft` | `--ob-text-secondary` |
| `muted` | `--ob-muted-foreground` |
| `primary` | `--ob-action-primary-bg` |
| `primaryFg` | `--ob-action-primary-fg` |
| `check` | `--ob-action-selection-bg` |
| `sel` | `--ob-ring` |
| `borderCol` | `--ob-border-default` |
| `status` | `--ob-chrome-top-bar-bg` |
| `statusInk` | `--ob-chrome-top-bar-fg` |
| `bodyFont` | `--ob-font-family` |
| `monoFont` | `--ob-font-mono` |

Composites (build the string the template already expects):

- `cardBorder` → `` `${--ob-border-width} solid ${--ob-border-default}` ``
- `radius` → `--ob-border-radius-md` (alias of `--ob-radius-md`)
- `lineH` → `--ob-typo-body-line-height`
- `fs` → parse `--ob-typo-body-size` and divide by 16px (1rem→`"1"`, 1.25rem→`"1.25"`) so the shell's existing `fs` scaling still works
- `headW` → read `--ob-typo-heading-1-weight` (fallback `--ob-font-weight-bold`); the shell uses `900`/`700`
- `bandSub` → no token; keep `--ob-muted-foreground` (it's a faint sublabel on the band)

---

## 3. The four decisions the adapter forces (this is the point)

These `cur` keys have **no clean source token** — the adapter makes you choose. Pick a default, wire it, and leave a one-line comment so PR B inherits the decision:

1. **`band` / `bandInk` (the screen header).** The shell paints headers in `cur.band`, but purple is the bottom **tab bar**, not a header. Real options: the native top bar (`--ob-chrome-top-bar-bg`/`-fg`, yellow) or the web header (`--ob-chrome-header-bg`/`-fg`, card-colored, hidden in native). **Recommended default:** map `band`→`--ob-chrome-header-bg`, `bandInk`→`--ob-chrome-header-fg` (a real, theme-aware header). Note the alternative in a comment.
2. **`accent` / `accentFg`.** `--ob-accent` is a neutral **gray** — not the brand purple the shell wants. **Recommended default:** map `accent`→`--ob-chrome-tab-bar-bg` and `accentFg`→`--ob-chrome-tab-bar-active-fg` (the real brand-accent surface). Do **not** use `--ob-accent`.
3. **`cardShadow`.** Real `--ob-shadow-md` is `none` in every theme; Night Ride alone defines a hard `--ob-shadow-lg`. **Recommended default:** map `cardShadow`→`--ob-shadow-md` (honest: most themes go flat) and additionally expose `cardShadowLg`→`--ob-shadow-lg` if you want the dark-theme FAB/modal lift. Confirm flat cards read acceptably; if not, that's a token-source finding.
4. **`headFont`.** Themes never override `--ob-font-headline` (stays `Anybody`), but the shell swaps headline font per theme. **Recommended default:** map `headFont`→`--ob-font-headline` (Anybody everywhere — matches the token contract). If the per-theme headline swap is intended product behavior, keep the shell's value and flag it as a deliberate divergence instead.

---

## 4. Known out-of-scope hardcodes (flag, don't fix)

The focus view, timeline, and badge designer use **decorative hex independent of theme** — e.g. status glyph colors (`#d97706`, `#5a8a6a`), `nodeBg`/`connBg` step colors, the badge-designer `COLORS`/`#2563eb`. These are not in the `cur` map and won't follow the theme. Leave them; **list every one you find** so PR B can decide whether they should map to `journey-*` / `reward-*` tokens.

---

## 5. Acceptance — how to "be sure"

- Switch through all 7 themes in Settings. Walk every screen: Goals (populated + empty), Focus (active/blocked/parked/done), Timeline, New Goal flow, Badge designer, Welcome, Settings.
- Cross-check each theme against its column in `Theme Eval.dc.html` — surfaces, borders, selection, chrome should match.
- Specifically confirm **interaction states** the swatches can't show: focus ring visibility, selected list rows, modal/sheet borders, the dark-theme FAB/modal shadow.
- **Contrast is not fixed yet** — expect the failures from `Theme Refactor Prep Spec.md` §1 to be visible (e.g. status pills). That's PR A; don't patch it here. Re-run this adapter after the token rebuild to confirm contrast in-context.

## 6. Deliverable & guardrails

- New file only: `App Shell (token-backed).dc.html`. Do **not** edit `App Shell.dc.html`, the token CSS, or the eval files.
- Theme values come exclusively from `var(--ob-*)`; the only hand-typed values left are the documented out-of-scope decorative hex (§4).
- End by listing: (a) the four decisions as you wired them, (b) the out-of-scope hardcodes you found, (c) anything the tokens still can't express in real layout.

## 7. Files worth opening
- `App Shell.dc.html` — the `THEMES` map (lines ~705–761), `setTheme`/`buildThemesShell` (~777–790), and `cur: curTheme` in `renderVals` (~1101).
- `Theme Eval.dc.html` / `TokenScreen.dc.html` — the probe technique to copy, and the per-theme expected result.
- `Theme Refactor Prep Spec.md` — the validated mapping and the contrast failures to expect.
- `tokens/tokens.css` (`:root` — every var + default) and `tokens/themes.css` (per-theme overrides + class names).
