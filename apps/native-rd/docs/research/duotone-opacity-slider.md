# Duotone-opacity slider — design research

**Last verified:** 2026-06-07
**Status:** Implemented — `BrutalistSlider` wired into `BadgeColorsAccordion`, behind `design.iconWeight === "duotone"` (PR #255).
**Scope:** Badge Designer → Colors accordion → Icon tab. Conditional on `design.iconWeight === "duotone"`.

## Problem

`phosphor-react-native`'s `duotone` weight renders two SVG paths: a solid outline at `color`, plus a background fill at `duotoneColor` with `opacity={duotoneOpacity}`. The library defaults to `duotoneOpacity = 0.2` and falls back to `duotoneColor = color` when unset (`node_modules/phosphor-react-native/src/lib/icon-base.tsx:62`, `index.tsx:32`). Result: a 20% same-hue ghost behind a 100% same-hue outline — visually almost identical to `regular`.

`BadgeRenderer.tsx:352` currently passes neither prop, so every duotone badge inherits the muted default.

## Decisions already made (not up for re-litigation in this doc)

- **Slider only, no second color picker.** The existing icon color drives both outline and fill; the slider just adjusts the fill's visibility.
- **Conditional render** — slider mounts only when `design.iconWeight === "duotone"`.
- **Default opacity stays 0.2** (matches Phosphor default; users discover the slider).
- **Persist on the design.** New field `iconDuotoneOpacity?: number` on `BadgeDesign`. Value survives weight switches.
- **Snap to discrete steps.** Range 20%–100%, increment TBD (likely 10% — 9 stops).

## Slider library evaluation

### Constraint shortlist (must-haves)

1. Step / snap support (discrete values 0.2, 0.3, …, 1.0).
2. Track + thumb stylable to neo-brutalist (hard borders, no rounded thumb, no platform-native shadow).
3. Already in deps **or** ≤ 1 new dep with no peer-dep churn.
4. Compatible with Expo SDK + RN New Architecture.
5. Active maintenance (release in last ~12 months).

### Candidates

| Library                                | In deps?                                                                                                                                                                    | Step                                                  | Custom thumb                      | Custom track                                                                                 | Bundle                                                                               | Notes                                                                                                 |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `@react-native-community/slider@5.2.0` | ⚠️ **dangling** — declared in `package.json:46` but zero imports across `src/`. Added speculatively via PR #985 (EAS config). Listed in Expo's `bundledNativeModules.json`. | ✅ `step` prop                                        | ⚠️ via `thumbImage` PNG asset     | ⚠️ track tints only (`min/maxTrackTintColor`); `StepMarker` (v4+) renders React at each tick | smallest                                                                             | Official RN community lib. Native UISlider / SeekBar under the hood.                                  |
| `react-native-awesome-slider`          | ❌ new dep                                                                                                                                                                  | ✅ `step`                                             | ✅ `renderThumb` (any React node) | ✅ `renderBubble`, `renderMark`, full styling                                                | larger                                                                               | Reanimated v2/v3 based. Already have Reanimated 4.2.1.                                                |
| `rn-range-slider`                      | ❌ new dep                                                                                                                                                                  | ✅ via `step`                                         | ✅ `renderThumb`                  | ✅ `renderRail`                                                                              | medium                                                                               | Designed for ranges (2 thumbs); single-thumb supported but ergonomically overkill.                    |
| **Build it ourselves**                 | n/a — uses existing `react-native-gesture-handler@2.31.2` + `react-native-reanimated@4.2.1`                                                                                 | trivial (`Math.round((v - min) / step) * step + min`) | full control via theme tokens     | full control via theme tokens                                                                | smallest possible (zero new deps; can also **remove** the dangling community-slider) | ~85–110 LOC. Fits this codebase's pattern of custom primitives (`Text`, `shadows.ts`, theme adapter). |

### Discarded for cause

- `react-native-multi-slider` — last meaningful release > 2 years ago, no New Architecture story. Out.
- Roll-our-own with PanResponder — works, but bypasses the worklet path Reanimated 4 wants. Out in favor of gesture-handler variant if we build.

## Styling-ceiling analysis vs. neo-brutalist

The design system (`apps/native-rd/src/themes/`, `src/styles/shadows.ts`) wants: hard borders (`theme.borderWidth.thick`), `borderRadius: 0`, hard shadows (`shadowStyle(theme, 'hardSm' | 'hardMd')`), bold accent fill, no platform-native blur.

The existing `HueSlider` from `reanimated-color-picker` in `ColorPickerModal.tsx:145` already gets wrapped in a brutalist border (`ColorPickerModal.styles.ts:62-66`). That precedent is "wrap the lib's slider in a brutalist container" — works for the _track frame_ but does nothing for the _thumb_, which on `HueSlider` is a vendor-drawn circle.

For `@react-native-community/slider` specifically:

- **Track frame:** straight box-shadow / border via parent View. ✓
- **Track fill color:** `minimumTrackTintColor` = theme accent, `maximumTrackTintColor` = theme background. ✓
- **Thumb:** the only path to a square hard-shadowed thumb is `thumbImage` (static PNG). That means baking a PNG per theme — 14 themes × ~3 sizes = 42 assets — or accepting the platform-native round thumb. ✗
- **Step marks:** `StepMarker` accepts a React component. We could render brutalist tick blocks here. ✓

For `react-native-awesome-slider`:

- Everything renders through `renderThumb` / `renderMark` / `renderBubble`, taking React nodes. Hard shadow + square + theme-bound trivial via `shadowStyle()`. ✓
- One new dep, but its only peer is Reanimated which we already have.

For build-our-own:

- View + `PanGestureHandler` + `useSharedValue` for thumb position.
- Snap = `Math.round((value - 0.2) / 0.1) * 0.1 + 0.2` inside the worklet.
- ~80–120 LOC including theme integration and a11y (`accessibilityRole="adjustable"`, `accessibilityValue`, `onAccessibilityAction` for `increment`/`decrement`).
- Reusable for future sliders (none planned, but cheap insurance).

## Recommendation

**Build it ourselves** as `src/components/BrutalistSlider.tsx`. Reasoning:

1. **Scope is genuinely small.** The math is `Math.round((value - min) / step) * step + min`; the gesture work is one `PanGestureHandler` + `useSharedValue` + `useAnimatedStyle`. ~85–110 LOC including a11y.
2. **Zero new deps; one dep removed.** Uses `react-native-gesture-handler@2.31.2` + `react-native-reanimated@4.2.1` (both already in). The dangling `@react-native-community/slider` gets dropped in the same PR.
3. **Theme-reactive from line 1.** Direct `useUnistyles()` access to theme tokens — no `renderThumb` plumbing, no inline-style threading, no per-theme PNG assets.
4. **Codebase consistency.** Every other design-system primitive in this app is custom (`src/components/Text.tsx`, `src/styles/shadows.ts`, `src/themes/adapter.ts`). A vendor slider would be an outlier.
5. **Reusable.** Single-value slider is a generic primitive — any future need (haptic intensity, text-scale preview, contrast strength) reuses it.

### Why not `react-native-awesome-slider`

- Render-prop wrapper around the lib would be ~60–80 LOC anyway — once you count the brutalist wrapper, the LOC delta vs. building is ~20–30 lines.
- New dep with its own release cadence and peer-dep surface to track.
- No removal of the dangling community-slider unless we make a separate decision to drop it.

### Why not `@react-native-community/slider`

- Currently unused (see "dangling" note in the table above). "Already installed" was a misleading framing.
- Platform-native thumb (round, soft) is incompatible with neo-brutalist design language.
- The only path to a brutalist thumb is `thumbImage` PNG assets — does not scale to a 14-theme matrix.

### Honest trade-offs of building

- Edge cases (RTL, gesture conflict with parent `ScrollView`, dynamic font scale) — real, but each has a documented fix and we control the code.
- a11y verification (VoiceOver, TalkBack) — same burden as any slider; the `accessibilityRole="adjustable"` + `accessibilityValue` + `onAccessibilityAction` contract is standard.
- Bug surface is ours to own. Mitigated by tight scope and unit tests.

## Implementation surface (sizing only — not a plan)

Assumes **build-it-ourselves** (recommended):

| File                                                                      | Change                                                                                                                                                                                                  | Approx LOC     |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `apps/native-rd/package.json`                                             | **Remove** dangling `@react-native-community/slider`                                                                                                                                                    | -1             |
| `apps/native-rd/src/badges/types.ts`                                      | `iconDuotoneOpacity?: number` + zod schema + sanitization branch                                                                                                                                        | ~30            |
| `apps/native-rd/src/badges/BadgeRenderer.tsx`                             | Forward `duotoneOpacity` to `<IconComponent>` only when weight is `"duotone"`                                                                                                                           | ~5             |
| `apps/native-rd/src/components/BrutalistSlider.tsx` (new)                 | Self-contained slider: `PanGestureHandler` + `useSharedValue` + `useAnimatedStyle`, theme-bound styles, snap, a11y (`accessibilityRole="adjustable"` + `onAccessibilityAction` for increment/decrement) | ~85–110        |
| `apps/native-rd/src/screens/BadgeDesignerScreen/BadgeColorsAccordion.tsx` | New row inside `iconTabBody`, conditional on weight                                                                                                                                                     | ~30            |
| `apps/native-rd/src/screens/BadgeDesignerScreen/BadgeDesignerScreen.tsx`  | `onChangeIconDuotoneOpacity` handler                                                                                                                                                                    | ~10            |
| i18n (`en/badgeDesigner.json` + others)                                   | New keys (label, a11y, value formatter)                                                                                                                                                                 | ~10 per locale |
| Tests: `badges/__tests__/types.test.ts`                                   | Schema + sanitization                                                                                                                                                                                   | ~40            |
| Tests: `components/__tests__/BrutalistSlider.test.tsx` (new)              | Snap, a11y actions, edge values, RTL                                                                                                                                                                    | ~50            |
| Tests: `BadgeColorsAccordion` story / unit                                | Conditional render coverage                                                                                                                                                                             | ~30            |
| `docs/research/index.md`                                                  | Already updated                                                                                                                                                                                         | (done)         |

**Estimate:** ~280–380 LOC, ~9 files (excluding generated locale fanout). Single PR feasible — well under the 500-LOC cap.

If the slider component grows beyond ~150 LOC during build, **split into 2 PRs**: PR-1 lands `BrutalistSlider` + tests as a reusable primitive (independent of badge designer); PR-2 wires it into the Icon tab + adds the design field. Splitting becomes worthwhile if either reviewer time on the primitive is meaningful, or PR-1's LOC alone passes ~300.

## Open questions for ticket

1. Snap increment: **10%** (9 stops) or **5%** (17 stops)? 10% recommended — fewer accidental nudges, clearer brutalist beat.
2. Slider label: "Fill opacity" / "Duotone strength" / something else? Copy decision.
3. Should the slider value display numerically (e.g. `60%`) next to the slider? Adds clarity, costs a row.
4. Accessibility: `accessibilityValue={{min: 20, max: 100, now: ...}}` — confirm this is what VoiceOver reads as percentage.
5. Storybook: dedicated story or add a control to the existing BadgeDesigner story?

## Cross-links

- Phosphor IconBase: `apps/native-rd/node_modules/phosphor-react-native/src/lib/icon-base.tsx:59-69`
- Current renderer call site: `apps/native-rd/src/badges/BadgeRenderer.tsx:352`
- Icon tab UI: `apps/native-rd/src/screens/BadgeDesignerScreen/BadgeColorsAccordion.tsx:202-233`
- Design sentinel pattern (for reference, not used here): `apps/native-rd/src/badges/types.ts:113`
- PR #250 (icon color picker) — preceding work this slider sits on top of.
