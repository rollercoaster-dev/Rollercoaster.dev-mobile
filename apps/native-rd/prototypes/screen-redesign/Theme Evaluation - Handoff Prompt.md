# Handoff — build a **Theme Evaluation page** that renders every theme against the **real `--ob-*` tokens**

## Goal

Right now `App Shell.dc.html` is skinned from a **hand-derived `cur` map** (7 themes × ~25 keys, transcribed into the shell's logic class). That map is a lossy simplification of the real design-token system, and we've only re-skinned the primary surfaces. Before we push the theme work further we need to **see every theme rendered from the real tokens, with every token group exercised on one screen**, so we can judge:

1. Where each theme actually breaks (contrast, unreadable text, missing elevation, washed-out states).
2. Where our `cur` map **diverges from the real tokens** and should be corrected at the source.
3. Where the **real tokens themselves** have gaps or wrong values worth fixing upstream.

Build a **`Theme Eval.dc.html`** Design Component: a pannable canvas with **one phone-screen frame per theme**, each frame scoped to that theme and exercising the full token vocabulary, with the **token name printed next to every sample**.

> Paste this into a fresh session with the `Rollercoaster.dev-mobile` repo mounted and the **Design System** skill attached.

---

## 0. The most important decision: consume the REAL generated CSS, not the `cur` map

The design-tokens package compiles to plain CSS custom properties. **Do not re-transcribe values by hand** — copy the generated stylesheets in and reference `var(--ob-*)` directly. That is the whole point: we are testing the real contract.

Two generated files (in the mounted repo):

- `Rollercoaster.dev-mobile/packages/design-tokens/build/css/tokens.css` — the **`:root`** layer: every foundational + semantic + component `--ob-*` var, set to the **Full Ride (light-default)** defaults.
- `Rollercoaster.dev-mobile/packages/design-tokens/build/css/themes.css` — **per-theme override blocks**, each scoped by a class.

**Copy both into the project** (`local_copy_to_project`) e.g. to `tokens/tokens.css` and `tokens/themes.css`, then load them in the DC `<helmet>`:

```html
<helmet>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Anybody:wght@700;800;900&family=Instrument+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&family=Lexend:wght@400;500;700&family=Atkinson+Hyperlegible:wght@400;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="./tokens/tokens.css">
  <link rel="stylesheet" href="./tokens/themes.css">
</helmet>
```

Loading two generated **token** stylesheets in `<helmet>` and then referencing them inline via `var(--ob-*)` is the sanctioned design-system pattern (same as loading a DS bundle). **All layout still stays inline-styled** — only the token values come from CSS vars. Do **not** author component classes.

### Theme id → scoping class (this is the runtime set of 7 — `large-text` is NOT a runtime theme)

`apps/native-rd/src/hooks/useTheme.ts` is the source of truth for the 7 product themes. Map each to its `themes.css` selector:

| Shell `cur` id | Product name | Scope to apply on the frame |
|---|---|---|
| `light-default` | The Full Ride | *(none — `:root` defaults)* |
| `dark-default` | Night Ride | `class="ob-dark-theme"` |
| `light-highContrast` | Bold Ink | `class="ob-high-contrast-theme"` |
| `light-dyslexia` | Warm Studio | `class="ob-dyslexia-friendly-theme"` |
| `light-autismFriendly` | Still Water | `class="ob-autism-friendly-theme"` |
| `light-lowVision` | Loud & Clear | `class="ob-low-vision-theme"` |
| `light-lowInfo` | Clean Signal | `class="ob-low-info-theme"` |

Put the class on the **frame's root element**; every `var(--ob-*)` inside resolves to that theme's value because `themes.css` scopes overrides to `.ob-*-theme`. (Ignore `.ob-large-text-theme` — it exists in CSS but is not a runtime theme.)

---

## 1. Page structure — canvas, one frame per theme

Use canvas mode so all 7 sit side by side for scanning:

- `<meta name="design_doc_mode" content="canvas">` in `<helmet>`.
- 7 frames as **direct children of the root** (after `</helmet>`, no wrapper), each absolutely positioned with generous gaps (~80px). Keep every `left`/`top` ≥ 0.
- Each frame: a small label (`data-drags-parent="1"`) with the theme name + id above a **white card** (`background:#fff; border-radius:2px; box-shadow:0 1px 3px rgba(0,0,0,.08)`).
- Inside the white card, a **360px-wide phone-screen column** whose root carries the theme class and `background:var(--ob-background); color:var(--ob-foreground); font-family:var(--ob-font-family);` — this is the actual evaluation surface.

Lay the 7 frames in a row (or 4-then-3 grid). Each phone column is tall (≈1400px) because it stacks every token group — that's fine on a canvas.

This is template-heavy and repetitive across 7 frames. **Drive the repetition from the logic class**: define a `THEME_FRAMES` array (`{id, name, cls}`) and a single `TOKENS` description structure, and render frames with `<sc-for>` + a child `<dc-import name="TokenScreen" theme-class="..." ...>`. One `TokenScreen.dc.html` child is justified here (it repeats 7× with real props) — this is the rare case where a child DC is correct.

---

## 2. What each phone-screen frame must exercise (the coverage checklist)

Every group below must appear, **each sample labelled with the literal token name** (small `--ob-mono` caption) so a reviewer can point at a defect and name the token. Group them with section headers.

**A. Surfaces & text**
`--ob-background`, `--ob-foreground`, `--ob-card` / `--ob-surface-card-bg`, `--ob-card-foreground`, `--ob-muted` / `--ob-surface-sunken-bg`, `--ob-muted-foreground`, `--ob-popover` / `--ob-surface-sheet-bg`, `--ob-surface-elevated-bg`, `--ob-surface-input-bg`. Render: page bg, a card, a sunken panel, a sheet, an input — each with body + caption text on it.

**B. Typography roles** (real type scale — exposes Loud & Clear's larger scale, Warm Studio's Lexend, Clean Signal's Atkinson, line-height changes)
`--ob-typo-display-*`, `--ob-typo-heading-1/2/3-*`, `--ob-typo-body-*`, `--ob-typo-body-sm-size`, `--ob-typo-label-*`, `--ob-typo-caption-*`, `--ob-typo-mono-*`, plus `--ob-font-family` / `--ob-font-headline` / `--ob-font-mono`. Render a full type ramp (Display → caption) using the real size/weight/family vars.

**C. Chrome** (header / tab bar / top bar / modal)
`--ob-chrome-top-bar-bg` + `--ob-chrome-top-bar-fg` (the status bar), `--ob-chrome-header-bg/fg/border`, `--ob-chrome-tab-bar-bg/fg/active-fg/indicator` (the bottom nav), `--ob-chrome-modal-bg/fg/overlay/border`. Render a mini status bar, a header, a 3-tab bar (one active), and a modal card.

**D. Actions / buttons & selection states**
`--ob-action-primary-bg/fg/hover-bg/active-bg`, `--ob-action-secondary-bg/fg/hover-bg`, `--ob-action-destructive-bg/fg`, `--ob-action-disabled-bg/fg/border`, `--ob-action-selection-bg/fg/border`. Render primary / secondary / destructive / disabled buttons + a selected list row.

**E. Borders & focus**
`--ob-border-default`, `--ob-border-strong`, `--ob-border-subtle`, `--ob-border-input`, `--ob-border-focus`, `--ob-border-destructive`, `--ob-border-success`, plus `--ob-border-width` / `--ob-border-width-medium` and `--ob-radius-*`. Render bordered swatches showing each border tier + width + radius.

**F. Shadows / elevation** (exposes the shadow-off themes and dark's special `lg`)
`--ob-shadow-sm`, `--ob-shadow-md`, `--ob-shadow-lg`, `--ob-shadow-focus`. Render four identical cards, one per shadow token, so "shadow collapses to none" is visible per theme.

**G. Feedback / status**
`--ob-success(-foreground)`, `--ob-warning(-foreground)`, `--ob-info(-foreground)`, `--ob-destructive(-foreground)`, `--ob-highlight(-foreground)`. Render status pills/banners.

**H. Journey** (this app's core domain — goals/steps/progress/timeline)
`--ob-journey-goal-bg/fg/border`, `--ob-journey-step-bg/fg`, `--ob-journey-step-active-bg/fg`, `--ob-journey-step-complete-bg/fg`, `--ob-journey-progress-track/fill`, `--ob-journey-timeline-line/node-bg/node-fg`, `--ob-journey-completion-bg/fg/accent`. Render a goal card, a row of step dots (default/active/complete), a progress bar, and a 2-node timeline.

**I. Reward / badges**
`--ob-reward-badge-chrome-bg/fg/border`, `--ob-reward-badge-accent-1..5`, `--ob-reward-badge-label-bg/fg`, `--ob-reward-celebration-burst-1..6`, `--ob-reward-celebration-text`, `--ob-reward-level-{novice,intermediate,advanced,expert}-bg`. Render a badge chrome card, an accent swatch strip, a burst-color strip, and the 4 level chips.

**J. Narrative sections** (used by the marketing/landing surfaces)
`--ob-narrative-climb-bg/text`, `--ob-narrative-drop-bg/text/accent`, `--ob-narrative-stories-bg/text/accent-1..4`, `--ob-narrative-relief-bg/text/accent`. Render the four section blocks.

**K. Component overrides** (where present)
`--ob-component-badge-*`, `--ob-component-form-*`, `--ob-component-dashboard-*`. Render a couple so theme-specific component tweaks (e.g. high-contrast 3px badge border, no shadow) are visible.

> If a `var(--ob-…)` you reference doesn't resolve (renders as the unset fallback), that itself is a finding — note it. Confirm exact names against `tokens.css` (the `:root` block lists every var) before using them; don't guess.

---

## 3. The comparison overlay — `cur` map vs real token (the actionable part)

The point isn't just "look at the themes" — it's "fix our map and/or the source." So add, **per frame** (or as one wide table beside the row), a **divergence panel** that puts the shell's `cur` value next to the real token, side by side, for the keys the shell actually uses. For each row show both swatches and flag a mismatch.

Suggested key mapping (shell `cur.*` → real `--ob-*`) to audit:

- `cur.bg` ↔ `--ob-background`
- `cur.surface` ↔ `--ob-card` / `--ob-surface-card-bg`
- `cur.surfaceAlt` ↔ `--ob-muted` / `--ob-surface-sunken-bg`
- `cur.ink` ↔ `--ob-foreground`; `cur.inkSoft` ↔ `--ob-text-secondary`; `cur.muted` ↔ `--ob-muted-foreground`
- `cur.band` / `cur.bandInk` ↔ `--ob-chrome-tab-bar-bg` / `--ob-chrome-tab-bar-active-fg`
- `cur.status` / `cur.statusInk` ↔ `--ob-chrome-top-bar-bg` / `--ob-chrome-top-bar-fg`
- `cur.primary` / `cur.primaryFg` ↔ `--ob-action-primary-bg` / `--ob-action-primary-fg`
- `cur.accent` / `cur.accentFg` ↔ `--ob-accent` (or tab-bar) / `--ob-accent-foreground`
- `cur.borderCol` ↔ `--ob-border-default`; `cur.cardShadow` ↔ `--ob-shadow-md` (and `--ob-shadow-lg`)
- `cur.check` / `cur.sel` ↔ `--ob-action-selection-bg` / `--ob-ring`
- `cur.headFont` ↔ `--ob-font-headline`; `cur.bodyFont` ↔ `--ob-font-family`; `cur.fs` ↔ derived from `--ob-typo-body-size`

Pull the `cur` values straight from the `THEMES` map in `App Shell.dc.html`'s logic class (copy it into this DC's logic, or import it) so the comparison stays honest. Render each row as: `token name · [cur swatch] vs [--ob swatch] · ⚠ if different`.

---

## 4. Known suspicions to confirm or kill (seed the evaluation)

These came out of reading the token source — verify them on the page and capture verdicts:

- **Header band color is probably wrong in our map.** Our shell paints per-screen **header bands** in `cur.band` (brand purple). In the real tokens the purple is the **bottom tab bar** (`--ob-chrome-tab-bar-bg`); the native top bar is **yellow** (`--ob-chrome-top-bar-bg`) and the web header (`--ob-chrome-header-*`) is hidden in native-rd. So our purple headers may not correspond to any real chrome token. Decide what the shell headers *should* read from.
- **Destructive is amber, not red.** `--ob-action-destructive-bg` resolves to the **warning/amber** tone by design — our map has no destructive token and the shell hardcodes red (`#dc2626`). Confirm and reconcile.
- **Dark elevation is lost.** Night Ride sets `--ob-shadow-sm/md = none` but `--ob-shadow-lg = 0 6px 0 0 rgba(0,0,0,1)` (a hard bottom shadow for modals/FABs). Our `cur.cardShadow:"none"` throws that away. The shadow frame (group F) should make this obvious.
- **Journey/reward richness is flattened.** The shell collapses goals/steps/badges onto `primary`/`accent`; the real tokens have dedicated `journey-*` and `reward-*` scales. Groups H/I will show how much nuance we're dropping.
- **Type scale per theme.** Loud & Clear (`--ob-typo-*` larger) and the font swaps (Lexend / Atkinson / Arial) should visibly change the type ramp in group B — confirm our `cur.fs:"1.2"` approximation matches the real scale.

---

## 5. Deliverable & guardrails

- New files: `Theme Eval.dc.html` (+ `TokenScreen.dc.html` child), and `tokens/tokens.css` + `tokens/themes.css` copied from the repo build output. **Do not edit** the copied CSS (it's auto-generated) — if a token value is wrong, the fix belongs in `packages/design-tokens/src/**` and a rebuild, which is out of scope for this page; just **flag** it.
- Inline styles only for layout; token **values** come exclusively from `var(--ob-*)`. No hand-typed hex except the canvas frame chrome (labels, white cards).
- Don't touch `App Shell.dc.html` in this pass — the eval page is read-only diagnostics. Once findings land, a *separate* pass corrects the shell's `THEMES` map (or rewires it to consume `--ob-*` directly) and, if warranted, files token-source fixes.
- End by listing the concrete findings (per group, per theme) so we can prioritize map fixes vs. source-token fixes.

## 6. Files worth opening
- `Rollercoaster.dev-mobile/packages/design-tokens/build/css/tokens.css` — every `--ob-*` name + default value (`:root`).
- `Rollercoaster.dev-mobile/packages/design-tokens/build/css/themes.css` — per-theme override blocks + the class names.
- `Rollercoaster.dev-mobile/packages/design-tokens/src/tokens/{semantic,chrome,action,surface-border,journey,badge-reward,typography-roles}.json` — descriptions of what each token *means* (use for the section labels).
- `Rollercoaster.dev-mobile/packages/design-tokens/src/themes/*.json` — per-theme override intent (e.g. high-contrast's "thick borders become a feature", dark's hard `lg` shadow).
- `Rollercoaster.dev-mobile/apps/native-rd/src/hooks/useTheme.ts` — the canonical 7 `themeOptions`.
- `Rollercoaster.dev-mobile/packages/design-tokens/overview/theme-*.html` — the existing static token galleries; useful reference for layout, but they don't do the per-theme phone-screen + `cur` comparison we need.
- `App Shell.dc.html` — the `THEMES` map (in the logic class) to pull `cur` values from for §3.
