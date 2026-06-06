# Badge Designer UX Prototypes — Implementation Plan

**Status:** Draft
**Goal:** Produce static HTML prototypes for three candidate UX directions for the badge designer so they can be evaluated visually before any React Native code is touched.
**Location:** `apps/native-rd/prototypes/`
**Convention reference:** existing `approach-{a,b,c}-*.html` + `approach-combined.html`

---

## Context

The current `BadgeDesignerScreen.tsx` stacks 9 flat sections in a single `ScrollView` (Shape, Color, Frame, Center, Icon, Bottom Label, Path Text, Banner, Save). Feels busy. Also missing: a user-controllable **border color** — today the shape stroke, frame overlay stroke, and banner border all resolve to `theme.colors.border`.

Three UX approaches were proposed (see prior conversation):

- **A — Accordion sections + grouped Colors block.** Lowest-leap change; keeps the linear scroll model, sections become collapsible, Fill+Border live together in a Colors group.
- **B — Three tabs: Structure / Center / Text.** Segmented control under the preview; each tab is a single short scroll. Border-color sits in Structure with a sub-control for "applies to: Shape / Shape+Frame / All".
- **C — Quick / Advanced two-mode editor.** Quick view surfaces only the most-touched controls; Advanced reveals everything (re-uses Option A's accordion).

This plan covers building the prototype set, not picking a winner.

---

## Files to create

```text
apps/native-rd/prototypes/
├── badge-designer-a-accordion.html        # individual
├── badge-designer-b-tabs.html             # individual
├── badge-designer-c-quick-advanced.html   # individual
└── badge-designer-combined.html           # side-by-side via iframes
```

Self-contained HTML per file (matches existing prototype convention — no shared CSS/JS in the directory). The combined file is iframe-based so each option stays its own source of truth.

---

## Shared shell (in every individual file)

1. **Mobile-frame chrome** — 390px-wide centered frame, neo-brutalist border + hard shadow, background from `--rd-color-background`. Mimics iPhone 14 logical width.
2. **Font loads** — `@font-face` for Anybody (700, 900), Instrument Sans (400, 600, 700), DM Mono (700), Lexend (400), Atkinson Hyperlegible (400). Paths relative to `../assets/fonts/` (same as `welcome-a-live-mirror.html`).
3. **Token values** — `light-default` CSS custom properties inlined at the top of each file, mirroring the convention established by `welcome-a-live-mirror.html`. Source of truth: `packages/design-tokens/build/css/tokens.css` + `themes.css`. (The plan originally claimed pre-existing symlinks in `docs/badges/`; that turned out to be wrong — the symlinks under `wireframe-a/` pointed at a sibling repo that doesn't exist locally, so inlining is the only working option and matches the welcome-\* prototypes.)
4. **Single theme rendered** — `data-theme="light-default"` hardcoded on `<body>`. No switcher. Theme adaptation is not what this prototype is evaluating; the welcome-\* prototypes are where that behavior lives.
5. **Mock badge SVG** — one shared inline SVG (~80 LOC). Representative shield shape, purple fill, bold-border frame, "M" monogram (Anybody Black), "EARNED 2026" bottom label (DM Mono). **Static** — no live editing. Deliberately _not_ mirroring a specific user-baked badge: the prototype evaluates section organization, not rendering fidelity, and matching a real badge would conflate the two questions.
6. **Fixed preview overlay** — pinned at top, matches the real `PREVIEW_OVERLAY_HEIGHT = 200` constant.

Shell totals ~370 LOC per file. Yes, repeated across files — that is the existing convention.

---

## Per-option content

### `badge-designer-a-accordion.html` (~250 LOC on top of shell)

- Each section is a native `<details>` element styled as a neo-brutalist card (`border-width: 2px`, `border-radius: 0`, hard shadow, chevron via `summary::after`).
- Initial open state: only **Shape** expanded; others closed.
- Section order: **Shape** → **Frame** → **Center** → **Colors** (Fill, Border, Match-theme chip, "Apply to: Shape / Shape+Frame / All" sub-control — same control shown in B and C for direct comparison) → **Inscriptions** (combines Bottom Label + Path Text + Banner). Matches the RN `BadgeDesignerScreen` order so this prototype stays a faithful preview of production.
- Small JS controller on the `<details>` elements enforces single-open (opening one closes the others); all-collapsed is permitted so the user can hide every section to see the preview unobstructed (mirrors commit `1d3fa09`).
- `@media (prefers-reduced-motion: reduce)` disables the expand transition.

### `badge-designer-b-tabs.html` (~300 LOC on top of shell)

- Segmented control under the preview overlay: `[Structure] [Center] [Text]`. Neo-brutalist treatment — active state has border + hard shadow, inactive is flat.
- ~30 LOC JS: tab click toggles `hidden` on three panels.
- **Structure** tab: Shape selector row, Fill swatches, Border swatches, "Border applies to" segmented sub-control (the canonical home for this control — A and C show the same control for comparison, but B is where it reads most naturally), Frame selector row.
- **Center** tab: Icon ↔ Monogram mode toggle, then conditional Icon picker grid or Monogram input.
- **Text** tab: Bottom label input, Path text top + bottom, Banner toggle + input + position selector.
- Sticky `[Save]` footer at the bottom of every tab.
- 44×44pt minimum on every interactive element — easy to slip on segmented controls.

### `badge-designer-c-quick-advanced.html` (~350 LOC on top of shell)

- Top mode toggle: `[Quick] [Advanced]`. Persists in `localStorage` (mimics the Evolu setting that would back this in production).
- **Quick** view: compact horizontally-scrolling shape row, Fill swatches, Border swatches + match-theme chip, "Border applies to" sub-control (so all three prototypes carry it — direct comparison is the point), Icon/Monogram swap as a single tap, "More options →" link to Advanced, Save.
- **Advanced** view: inline copy of Option A's accordion markup. This keeps the demo honest — shipping Option C also requires shipping Option A. (Considered the alternative: today's flat-section layout. Rejected because it would hide the implementation coupling that picking C creates.)
- ~40 LOC JS: mode toggle + localStorage persistence.

### `badge-designer-combined.html` (~150 LOC)

- 3 iframes side-by-side at desktop widths (≥1200px), stacked vertically at narrower widths. (Considered hiding all but the active iframe with a top-of-page selector — rejected because it defeats the side-by-side purpose; a long scroll on narrow screens is acceptable.)
- Each iframe is 410px wide × 900px tall.
- Header row above iframes with the labels and one-sentence summaries.

---

## Explicitly NOT building

- **No live editing.** Color swatches don't recolor the badge — visual only. Adding live editing would mean reimplementing `BadgeRenderer` in vanilla SVG/JS; cost > value for a layout-evaluation prototype.
- **No frame overlays beyond bold-border** in the mock SVG. Guilloche/crosshatch/etc. aren't visually load-bearing for evaluating section layout.
- **No i18n.** Hardcoded English. Real keys land when this becomes RN code.
- **No real Phosphor icons.** Inline SVG paths or Unicode glyphs as placeholders in the icon picker grid.
- **No Storybook integration.** Prototypes live in `prototypes/` only.

---

## Estimate

- **~370 LOC** shared shell × 3 individual files = ~1110 LOC of shell
- **~900 LOC** of option-specific content (250 + 300 + 350)
- **~150 LOC** for combined viewer
- **Total: ~2160 LOC across 4 files.** 100% hand-written — no generated content.

### PR strategy

Three reasonable splits:

1. **1 PR, all four files** — argued as "one prototype set." Each file is independent so review is tractable despite the line count. Prototype HTML is closer to docs than to production code, so the 500-LOC cap weighs less.
2. **2 PRs:** (shell + Option A + combined-skeleton) then (Options B + C + wire combined). Each ~1100 LOC.
3. **3 PRs:** one per option, combined deferred. Slowest, most reviewable.

**Default recommendation: #2.** Gets Option A in front of you fastest; B/C iterate without blocking review.

---

## Resolved decisions

Settled before implementation starts; reasoning kept so future changes can be argued against the original tradeoff.

1. **Mock badge appearance — representative shield + monogram.** Matching a specific user-baked badge would conflate "is the layout good?" with "is this badge ugly?". Prototype evaluates section organization, not rendering fidelity.
2. **No theme switcher — single `light-default` render.** This prototype evaluates designer layout, not theme adaptation. The welcome-\* prototypes already cover the cross-theme question.
3. **Option C's Advanced view — reuses Option A's accordion markup.** Surfaces the implementation coupling honestly: shipping C in RN also means shipping A. The "flat-sections-if-A-weren't-shipped" alternative hides that.
4. **Border-color "Apply to" sub-control — appears in all three prototypes.** Direct comparison is the point of having three. B remains the canonical home for the control; A and C carry it to make the comparison fair.
5. **Combined viewer narrow-screen — stack vertically below 1200px.** The selector-and-hide alternative defeats side-by-side; long-scroll is acceptable for narrow desktops/tablets where the combined view is already secondary.

---

## Stretch goals (not in v1)

- Live color swatch → badge fill recolor via a single `fill` attribute swap. ~20 LOC per file, low risk.
- Screenshots committed to `docs/screenshots/` so the prototypes can be referenced in PR descriptions and ADRs without a local server.

---

## Cross-cutting border-color decisions (informs whichever option ships)

These apply to the eventual RN implementation, not the prototype itself — capturing here so they don't get lost.

1. **Default behavior.** Default remains `theme.colors.border` so badges adapt to theme switches. Picking a custom color opts out of theme-tracking — surface this in the UI (e.g. "Match theme" chip selected by default).
2. **Contrast safety.** The exported PNG sits on arbitrary backgrounds; a near-white user-picked border on the badge canvas would vanish. Either constrain border to the accent palette, run a contrast check against `BADGE_CANVAS_BACKGROUND`, or auto-darken below a threshold.
3. **Scope.** Three reasonable interpretations:
   - Shape border only — simplest, but visually disjointed when a Frame is on.
   - Shape border + frame stroke — coherent "outline color." Probably what most users mean.
   - All three (shape + frame + banner) — most consistent, biggest blast radius.
4. **i18n.** New keys under `badgeDesigner:sections.borderColor`, `colors.border.matchTheme`, etc.

---

## Source references

- `apps/native-rd/src/screens/BadgeDesignerScreen/BadgeDesignerScreen.tsx` — current designer
- `apps/native-rd/src/badges/BadgeRenderer.tsx:273,286,341` — three places `theme.colors.border` is consumed
- `apps/native-rd/src/badges/types.ts` — `BadgeDesign` type (where a `borderColor?: string` field would land)
- `apps/native-rd/docs/badges/index.html` — existing badge wireframe, closest prior art
- `apps/native-rd/prototypes/approach-{a,b,c}-*.html` — naming and self-contained-HTML convention
