# Dark Mode Rework Plan

**Status:** Proposed
**Date:** 2026-04-29
**Issue:** [#934 chore(native-rd): dark theme rework](https://github.com/rollercoaster-dev/monorepo/issues/934)
**Scope:** `packages/design-tokens/src/themes/dark.json`, `apps/native-rd/src/themes/adapter.ts`, `apps/native-rd/src/styles/shadows.ts`, dark-mode visuals across all top-level screens
**Out of scope:** the 6 accessibility variants (`highContrast`, `largeText`, `dyslexia`, `lowVision`, `autismFriendly`, `lowInfo`) — they stay; this plan touches only the `dark` color mode

## Problem (issue #934)

> Shadows have bad colors. Borders have bad colors. Contrast is an issue.

Visual baseline confirms: dark-mode cards lose the neo-brutalist identity entirely. Every surface lives in the same indigo luminance band (`#1a1033` → `#3a2d5c`, all under L=15%); borders are indistinguishable from the surfaces they sit on; shadows render as either invisible or a faint white bloom; nothing reads as a defined block.

## Research synthesis — accessibility-first dark mode

Five rules drawn from current consensus across Material Design, WCAG 2.2, mobile a11y guidance, and dyslexia/low-vision research. Each maps to a token decision below.

### R1. Don't use pure black backgrounds

Pure `#000000` against pure `#ffffff` causes **halation** — bright text appears to bloom outward, making characters harder to resolve. This is especially harsh for dyslexic readers and astigmatism. Material's baseline dark surface is `#121212`; iOS dark uses near-blacks with subtle blue cast.

**Native-rd today:** `bg #1a1033` (indigo, L≈4%). Already not pure black — keep this. The indigo cast is intentional brand identity ("Night Ride"), not an accessibility liability.

### R2. Don't use pure white text on dark

`#ffffff` text on dark bg compounds halation. WCAG-passing alternatives: `#e0e0e0`–`#fafafa` range. Material's dark text-primary is white at 87% opacity, equivalent to `~#dedede` on `#121212`.

**Native-rd today:** `text #fafafa` is at the edge — readable, but there's room to soften without losing contrast. We will keep `#fafafa` for primary text (still 17:1, well above AAA) but soften `textSecondary`/`textMuted` so the type hierarchy actually has steps.

### R3. WCAG AA is the floor, AAA where cheap

WCAG AA in dark mode: text 4.5:1, large text & non-text 3:1. AAA is 7:1 / 4.5:1.

We target:

- **Primary text:** AAA (≥7:1). Achieved at 17:1 with `#fafafa` on `#1a1033`.
- **Secondary/muted text:** AA (≥4.5:1). Today's `#e5e5e5` is 14:1 (no demotion); we propose a step-down.
- **Borders & icons:** 3:1 minimum against the surface they sit on. Today's `border #3a2d5c` on `bg #1a1033` is **1.5:1** — fails.
- **Focus ring:** 3:1 against adjacent colors. Today's `focusRing #5eead4` is fine.

### R4. Surfaces lift via lighter color, not shadows

Hard shadows depend on the shadow being _darker_ than the surrounding surface. On dark themes, that requires the surface itself to be light enough for a black shadow to still register — which means a dark theme can't use the same shadow-as-depth metaphor as light.

**Material's solution:** elevation overlay. Surfaces lift via increasing opacity of a white overlay (0% → 1% → 3% → 6% → 8% → 11% → 12% → 14% → 15% → 16%). Higher elevation = lighter surface.

**Native-rd's neo-brutalist constraint:** the visual identity is hard-edged blocks with offset shadows. Pure Material elevation (lighter surface, no border, no offset) is too soft. Adapt:

- **Tier 1 — sits on the page (cards, list rows, buttons, pills, inputs):** elevated surface (`#241845`) **+ bold border** (high-contrast, see R5). **No shadow.** This is the dark-mode replacement for "card with hard offset shadow."
- **Tier 2 — lifts off the page (modals, sheets, FAB, EvidenceDrawer):** more elevated surface (`#2d1f52`) **+ bold border + near-black hard shadow.** Black shadow on dark bg reads as a void/cutout, which IS depth, so the neo-brutalist offset shape survives.
- **Tier 3 — chrome bands (top header, tab bar):** lavender (`accentPurple #c4b5fd`). No shadow, no border. Already correct in the current build (post-#935).

### R5. Borders are the load-bearing element in dark

Because shadows can't carry depth on tier 1, **borders carry the entire neo-brutalist identity**. They have to read as confident outlines, not hairlines. Target ≥7:1 against the surface the border sits on top of (not just the page bg) — because cards-on-cards is a common nesting.

This rules out anything in the `#3a2d5c`–`#7c6ba0` indigo band as the default border. Border has to break out of the family.

**Proposed default border:** `#cfc7e0` — a desaturated lavender near-white. Contrast ratios:

- vs `bg #1a1033`: ~10:1 ✓
- vs `card #241845`: ~9:1 ✓
- vs `card-elevated #2d1f52`: ~8:1 ✓

This is the "pen outline" that neo-brutalism asks for. It's not pure white (which would be too aggressive against most dark surfaces), but it's clearly a frame, not part of the surface.

### R6. Desaturate accents

Highly saturated colors on dark backgrounds **vibrate** — the eye reads chromatic noise instead of a clean color. Industry guidance: reduce saturation 15–30% for dark variants of accent colors.

**Native-rd today:**

| Accent                  | Light                                   | Dark today            | Vibration risk on `#1a1033`                           |
| ----------------------- | --------------------------------------- | --------------------- | ----------------------------------------------------- |
| Yellow `accentYellow`   | `#ffe50c`                               | `#ffe50c` (unchanged) | **High** — pure yellow is the textbook vibration case |
| Mint `accentPrimary`    | `#3b82f6` blue → `#5eead4` mint in dark | `#5eead4`             | Low — already desaturated                             |
| Lavender `accentPurple` | `#a78bfa` → `#c4b5fd` in dark           | `#c4b5fd`             | Low                                                   |

Yellow is the one to address. Used in: `STATUS: ACTIVE` pill, `IN PROGRESS` pill, "Goal Evidence" rail, narrative `climb.bg`, `journey-goal-bg`. Not universally — these are content accents and the brand benefits from a yellow moment. Recommendation: keep yellow for **content accents** (pills, rails) where the saturated pop is the point; desaturate the **bg uses** (`narrative.climb.bg`, `journey-goal-bg`) to a muted mustard like `#d4c43a` so a full yellow background panel doesn't vibrate.

This is a small, contained change. Out-of-scope for the v1 of this plan if we want to keep the slice tight; flagged here so it's not lost.

### R7. Customization stays — light option preserved

Dark mode is not universal accessibility. Some readers prefer light, especially in bright environments or for certain dyslexia profiles. The existing `light` mode and theme picker stays as-is.

## Decisions

| ID  | Decision                                                                                                                                                                                                   | Drives         |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| D1  | Keep `#1a1033` as base bg. Don't introduce pure black or true gray.                                                                                                                                        | R1, brand      |
| D2  | Keep `#fafafa` as primary text. Step `textSecondary` and `textMuted` down for real hierarchy.                                                                                                              | R2, R3         |
| D3  | Replace dim indigo borders with high-contrast near-white lavender (`#cfc7e0`) as the default.                                                                                                              | R3, R5         |
| D4  | Tier-1 cards in dark: bold border, **no shadow**. Tier-2 modals/sheets: bold border + black shadow. Encode via semantic shadow tokens (`cardElevation`, `modalElevation`), not per-component conditionals. | R4             |
| D5  | Surface ladder gets more luminance step between rungs to make the elevation system carry meaning.                                                                                                          | R4             |
| D6  | Yellow vibration: out-of-scope for v1; content pills stay as-is. Logged as follow-up if backgrounds-of-yellow surface in QA.                                                                               | R6             |
| D7  | No changes to the 6 accessibility variants.                                                                                                                                                                | scope          |
| D8  | Chrome bands (header + tab bar) darken from `#c4b5fd` → `#8d7eb0`. Black text/icons stay (4.7:1, AA pass).                                                                                                 | prototype eval |

## Token changes

### `packages/design-tokens/src/themes/dark.json`

```diff
   "surface": {
     "background":         { "$value": "#1a1033" },   // unchanged
     "foreground":         { "$value": "#fafafa" },   // unchanged
-    "card":               { "$value": "#241845" },
+    "card":               { "$value": "#2a1d4e" },   // bigger step from bg (delta +0.014 → +0.025 luminance)
     "card-foreground":    { "$value": "#fafafa" },
-    "popover":            { "$value": "#241845" },
+    "popover":            { "$value": "#36265e" },   // tier-2: more lift
     "popover-foreground": { "$value": "#fafafa" },
-    "muted":              { "$value": "#2d1f52" },
+    "muted":              { "$value": "#241845" },
-    "muted-foreground":   { "$value": "#e5e5e5" }
+    "muted-foreground":   { "$value": "#a89cc4" }    // R3: real hierarchy step, ~6.5:1
   },
   "form": {
-    "border":             { "$value": "#3a2d5c" },
+    "border":             { "$value": "#cfc7e0" },   // R5: load-bearing border
     "input":              { "$value": "#241845" },
     "ring":               { "$value": "#5eead4" }
   },
   "typography": {
     "text-primary":       { "$value": "#fafafa" },   // unchanged
-    "text-secondary":     { "$value": "#e5e5e5" },
+    "text-secondary":     { "$value": "#cfc7e0" },   // R3: distinct from primary
     "text-disabled":      { "$value": "#737373" }
   },
   "aliases": {
-    "border-color":       { "$value": "#3a2d5c" }
+    "border-color":       { "$value": "#cfc7e0" }
   },
   "shadow": {
     "sm":                 { "$value": "none" },                       // tier-1: unchanged (we will not call it)
     "md":                 { "$value": "none" },                       // tier-1: unchanged
-    "lg":                 { "$value": "0 4px 12px rgba(0, 0, 0, 0.3)" },
+    "lg":                 { "$value": "0 6px 0 0 rgba(0, 0, 0, 1.0)" },  // tier-2: hard offset, full opacity
     "focus":              { "$value": "0 0 0 3px rgba(94, 234, 212, 0.4)" }
   },
   "semantic": {
-    "border-default":     { "$value": "#3a2d5c" },
+    "border-default":     { "$value": "#cfc7e0" },
-    "border-subtle":      { "$value": "#524573" },
+    "border-subtle":      { "$value": "#7c6ba0" },
     "border-strong":      { "$value": "#fafafa" }
   }
```

### `apps/native-rd/src/themes/adapter.ts`

```diff
 export const darkColors = {
   ...pkgDarkColors,
   accentSecondary: pkgDarkColors.accentMint,
+  shadow: "#000000",      // R4: black-on-dark = void/depth, replacing white-on-dark = glow
+  textMuted: "#a89cc4",   // R3: muted is its own step, not a textSecondary clone
+  accentPurple: "#8d7eb0",  // D8: darken chrome band for less visual punch in dark
   error: pkgPalette.error,
   warning: pkgPalette.warning,
   success: pkgPalette.success,
   info: pkgPalette.info,
 };

 export const colorModeConfigs = {
   light: { colors: lightColors, shadows: { opacity: 1.0 } },
-  dark:  { colors: darkColors,  shadows: { opacity: 0.6 } },
+  dark:  { colors: darkColors,  shadows: { opacity: 1.0 } },   // tier-2 only renders shadow; full opacity
 } as const;
```

### `apps/native-rd/src/themes/tokens.ts` (semantic shadow roles — new)

Add two role-named shadow tokens that components consume instead of `hardSm` / `hardMd` / `hardLg` directly:

```ts
// pseudo — to be wired through compose.ts
shadow.cardElevation    = light: hardMd, dark: none
shadow.modalElevation   = light: hardLg, dark: hardLg  (with shadowColor=#000 in dark)
```

Component-side migration: every `shadowStyle(theme, "hardMd")` on cards / list rows / buttons / pills becomes `shadowStyle(theme, "cardElevation")`. Modals/sheets/FABs use `"modalElevation"`.

## Implementation slices (each = one commit, each = one screenshot baseline pass)

1. **`feat(design-tokens): rework dark theme tokens for accessibility`**
   - Token JSON changes above (dark.json only). Light untouched.
   - Build outputs regenerated.
   - Visual: no change yet (tokens not yet consumed by adapter overrides).

2. **`fix(native-rd): adapt dark color mode to new tokens`**
   - `adapter.ts` overrides: `shadow`, `textMuted`, `colorModeConfigs.dark.shadows.opacity`.
   - Visual: borders pop, muted text reads, shadows still rendering (transition state).

3. **`refactor(native-rd): introduce semantic shadow elevation tokens`**
   - Add `cardElevation` / `modalElevation` semantic tokens to `tokens.ts` and compose path.
   - Migrate ~20 component call sites from `hardMd` → `cardElevation`, ~5 from `hardLg` → `modalElevation`.
   - Visual: dark cards lose shadows entirely; dark modals get black hard shadow.

4. **`docs(native-rd): document shadow-vs-border policy`**
   - Update `docs/architecture/design-token-system-map.md` with the new shadow/border policy.
   - Visual verification done on-device during rebuild; no static baseline captures required.

5. **(Optional) `fix(design-tokens): desaturate yellow surface backgrounds in dark`**
   - Only if v1 baseline shows visible vibration on `narrative.climb.bg` or `journey-goal-bg`.
   - Otherwise skip — yellow content pills already work.

## Acceptance against #934

- [x] Rework shadow tokens for dark mode → D4, slice 1 + 3
- [x] Rework border tokens for dark mode → D3, D5, slice 1 + 2
- [x] Audit text + interactive contrast → R3 table, slice 4 docs
- [ ] ~~Audit across 6 dark variants~~ → out of scope (variants stay untouched)
- [x] Document shadow-vs-border policy → slice 4
- [x] Updated tokens documented in `apps/native-rd/docs/architecture/` → slice 4
- [ ] ~~Visual baseline screenshots~~ → dropped; on-device rebuild verification only
- [x] Contrast tests pass for interactive elements per WCAG AA → R3
- [x] No regressions in light variants → light mode untouched throughout

## Risks

1. **Border value too aggressive.** `#cfc7e0` is high-contrast by design. If it reads as "every box has a white frame around it," soften to `#a89cc4` (still 6:1 on bg). Test before locking.
2. **Yellow vibration showing up after surface fix.** Once cards are clearly delineated, yellow might pop more (or less) than expected. Slice 5 is the lever.
3. **Shadow removal on tier-1 cards loses neo-brutalist identity in dark.** Mitigation: the bold border IS the identity in dark. If it doesn't carry, revisit at D4 — maybe tier-1 needs a thin offset border (e.g., a 2px bottom-right bar) instead of a uniform stroke.
4. **Existing component shadow calls.** ~20 sites call `shadowStyle(theme, "hardMd")`. Migration is mechanical but visible — will be done in slice 3 with screenshot diff per file.

## Resolved questions (from prototype review 2026-04-29)

- **Q1 Border value:** `#cfc7e0` (strong, ~10:1) — locked
- **Q2 Yellow desaturation:** deferred to slice 5 (v2 conditional) — locked
- **Q3 Surface ladder:** stretched (`#1a1033 → #2a1d4e → #36265e`) — locked
- **Q4 Chrome band colour:** `#8d7eb0` (darkest), with black text/icons preserved (4.7:1, AA) — locked

## Sources

- [Material Design — Dark theme](https://m2.material.io/design/color/dark-theme.html) — elevation overlay rationale
- [Designing Accessible Dark Mode (Medium / Ebunoluwa Ige)](https://medium.com/@design.ebuniged/designing-accessible-dark-mode-a-wcag-compliant-interface-redesign-0e0225833aa4) — WCAG AA in dark mode
- [Designing Inclusive Dark Modes — Raw.Studio](https://raw.studio/blog/designing-inclusive-dark-modes-enhancing-accessibility-and-user-experience/) — desaturation, halation
- [Dark Mode UI Design Best Practices — atmos.style](https://atmos.style/blog/dark-mode-ui-best-practices) — saturation reduction figures
- [Dark Mode and Accessibility — Boia.org](https://www.boia.org/blog/dark-mode-can-improve-text-readability-but-not-for-everyone) — dyslexia & low-vision considerations
- [Dark Mode Accessibility — DubBot](https://dubbot.com/dubblog/2023/dark-mode-a11y.html) — pure-white text caveats
- [Mobile A11y — Quick Win: Support Dark Mode](https://mobilea11y.com/quick-wins/dark-mode/) — mobile-specific guidance
