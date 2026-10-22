# Design Language: the Component Contract

**Status:** Current — the one component contract. Values below are what the app composes at runtime; when code and this doc disagree, fix whichever is wrong in the same PR.
**Source of truth:** `@rollercoaster-dev/design-tokens` → `src/themes/adapter.ts` (single import boundary) → `src/themes/compose.ts` (`ComposedTheme`), plus the shared components named below.
**Theme inventory:** [ND Themes](./nd-themes.md) — the seven product themes, their fonts, scales and elevation.

---

## Visual language in one paragraph

Neo-brutalist, calm by default: flat surfaces, a bold 3pt outline, small 2pt corners, and hard offset shadows that themes may turn off. Accessibility themes change _how_ the contract renders (fonts, scale, shadows, color roles), never _which_ components exist. Styles come from `StyleSheet.create((theme) => …)` (react-native-unistyles v3, ADR-0002) and read theme roles, never hex values.

---

## Typography

### Fonts

| Role     | Default theme   | Warm Studio (`light-dyslexia`) | Loud & Clear (`light-lowVision`) | Token                       |
| -------- | --------------- | ------------------------------ | -------------------------------- | --------------------------- |
| Headline | Anybody         | Lexend                         | Atkinson Hyperlegible            | `theme.fontFamily.headline` |
| Body     | Instrument Sans | Lexend                         | Atkinson Hyperlegible            | `theme.fontFamily.body`     |
| Mono     | DM Mono         | DM Mono                        | DM Mono                          | `theme.fontFamily.mono`     |

Fonts are bundled as native resources by the `expo-font` config plugin (`app.json` → `fonts`); `useFonts()` only reports ready. Storybook web loads the same families with `@font-face` from `public/fonts/` (`.storybook-web/preview.tsx`). OpenDyslexic is bundled but no product theme selects it.

**Rule:** every text style sets `fontFamily` from the theme. React Native does not inherit a font through a `View`, so a label without `fontFamily` renders in the system font even when its heading uses Lexend. Prefer `<Text variant="…">` (`src/components/Text`), which applies a full preset.

### Presets (`theme.textStyles`, used by `<Text variant>`)

| Variant    | Size token | Default size | Weight   | Line height | Letter spacing | Family   |
| ---------- | ---------- | ------------ | -------- | ----------- | -------------- | -------- |
| `display`  | `4xl`      | 40           | black    | × 1.05      | `tight`        | headline |
| `headline` | `2xl`      | 24           | bold     | × 1.3       | `tight`        | headline |
| `title`    | `lg`       | 18           | semibold | × 1.3       | `normal`       | body     |
| `body`     | `md`       | 16           | normal   | × 1.6       | `normal`       | body     |
| `caption`  | `xs`       | 12           | normal   | × 1.6       | `label`        | body     |
| `label`    | `sm`       | 14           | medium   | × 1.3       | `wide`         | body     |
| `mono`     | `sm`       | 14           | normal   | × 1.6       | `normal`       | mono     |

Sizes follow the theme's size scale, so Loud & Clear's `body` is 20. Line heights are the multipliers above applied to that size. The presets do **not** yet pick up Warm Studio's relaxed line heights — see [Known gaps](#known-gaps).

Body copy is 16 (`md`); metadata is 14 (`sm`); 12 (`xs`) is the floor for anything a person needs to read. `2xs` (10) is decorative only.

### Size scale (`theme.size`)

| Token     | `size` | `sizeL` (Loud & Clear) |
| --------- | ------ | ---------------------- |
| `2xs`     | 10     | —                      |
| `xs`      | 12     | 15                     |
| `sm`      | 14     | 17.5                   |
| `md`      | 16     | 20                     |
| `lg`      | 18     | 22.5                   |
| `xl`      | 20     | 25                     |
| `2xl`     | 24     | 30                     |
| `3xl`     | 32     | 40                     |
| `4xl`     | 40     | 50                     |
| `5xl`     | 48     | 60                     |
| `6xl`     | 60     | 75                     |
| `7xl`     | 72     | 90                     |
| `display` | 96     | 120                    |

### Line heights (`theme.lineHeight`)

Absolute values keyed by size token (`xs`–`3xl`), because React Native needs points, not multipliers:

- `lineHeight` (default): `size[key] × 1.6` — `md` → 26.
- `lineHeightL` (Warm Studio): `sizeL[key] × 1.9` — `md` → 38.

### Weights and letter spacing

`theme.fontWeight`: `normal` 400 · `medium` 500 · `semibold` 600 · `bold` 700 · `black` 900.

`theme.letterSpacing` (points): `tight` −0.48 · `normal` 0 · `label` 0.8 · `wide` 1.6 · `caps` 2.4.

---

## Color roles

Hex values live in the token sources and the _Design System / Colors_ story, not here (see [ND Themes → Colors](./nd-themes.md#colors)). Components read roles:

| Group                 | What it colors                                                                     |
| --------------------- | ---------------------------------------------------------------------------------- |
| `theme.colors`        | Base surfaces, text, borders, accents, focus ring, feedback (success/warning…)     |
| `theme.chrome`        | Screen header band, brand mark, navigation chrome                                  |
| `theme.action`        | Action fills and foregrounds: primary, secondary, destructive, disabled, selection |
| `theme.surfaceBorder` | Card, sheet and input border hierarchy                                             |
| `theme.journey`       | Timeline nodes, step states, progress, goal completion                             |
| `theme.evidence`      | Per-evidence-type proof-card tints                                                 |
| `theme.narrative`     | Climb / drop / stories / relief section colors for celebratory surfaces            |

---

## Elevation

Use the semantic roles through `shadowStyle(theme, role)` (`src/styles/shadows.ts`); never write `shadow*` props by hand.

| Role                 | Use                        | Built from |
| -------------------- | -------------------------- | ---------- |
| `cardElevation`      | Cards, buttons             | `hardMd`   |
| `cardElevationSmall` | Chips, small controls      | `hardSm`   |
| `modalElevation`     | Sheets, modals, focus card | `hardLg`   |

How a role renders depends on the theme:

| Themes                              | Rendering                                                  |
| ----------------------------------- | ---------------------------------------------------------- |
| The Full Ride, Clean Signal         | Hard offset, no blur — 2 / 3 / 4pt down-right, 0.8 opacity |
| Night Ride                          | 6pt straight-down cutout, no blur                          |
| Warm Studio                         | Soft, low shadow (1–3pt, small blur, 0.1 opacity)          |
| Bold Ink, Still Water, Loud & Clear | None — the 3pt border alone defines the edge               |

Because three themes drop shadows entirely, an element must never rely on its shadow to be distinguishable. The border carries the edge.

---

## Shape

**Borders** (`theme.borderWidth`): `thin`/`default` 1 · `medium` 2 · `thick` 3. The shared `Card` and `Button` surfaces use `thick`; inputs, chips, pills, rows, checkboxes, dividers and bordered icon buttons use `medium`; `thin` is for internal dividers only.

**Radius** (`theme.radius`): `sm` 2 · `md` 4 · `lg` 8 · `xl` 12 · `pill` 9999 (`full` aliases `pill`). Cards and icon buttons use `sm`; buttons and inputs use `md`.

**Spacing** (`theme.space`): `1` 4 · `2` 8 · `3` 12 · `4` 16 · `5` 20 · `6` 24 · `8` 32 · `10` 40 · `12` 48 · `16` 64.

**Z-index** (`theme.zIndex`): `dropdown` 1000 · `sticky` 1100 · `modal` 1300 · `tooltip` 1400.

---

## Components

### Surface — `Card`

```typescript
container: {
  backgroundColor: theme.colors.backgroundSecondary,
  borderWidth: theme.borderWidth.thick,
  borderColor: theme.colors.border,
  borderRadius: theme.radius.sm,
  padding: theme.space[6], // compact 3 · normal 6 · spacious 8
  ...shadowStyle(theme, "cardElevation"),
},
```

A pressable card has a 48pt minimum height and the shared pressed state below.

### Actions — `Button`

Every new action uses the shared `Button` (`src/components/Button`).

| Variant       | Fill                         | Border                     | Label                         | Shadow          |
| ------------- | ---------------------------- | -------------------------- | ----------------------------- | --------------- |
| `primary`     | `colors.accentPrimary`       | 3pt `colors.accentPrimary` | `colors.background`           | `cardElevation` |
| `secondary`   | `colors.backgroundSecondary` | 3pt `colors.border`        | `colors.text`                 | `cardElevation` |
| `ghost`       | transparent                  | 3pt transparent            | `colors.text`                 | none            |
| `destructive` | `colors.warning`             | 3pt `colors.text`          | `#262626` (contrast-verified) | `cardElevation` |

| Size | Padding (h / v) | Label size | Minimum height |
| ---- | --------------- | ---------- | -------------- |
| `sm` | 12 / 4          | `sm`       | 48             |
| `md` | 16 / 8          | `md`       | 48             |
| `lg` | 20 / 12         | `lg`       | 52             |

| State    | Treatment                                                                                |
| -------- | ---------------------------------------------------------------------------------------- |
| Pressed  | Moves 2pt right and down; shadow collapses to 1pt — the button "presses into" its shadow |
| Disabled | 0.4 opacity, not pressable, `accessibilityState.disabled`                                |
| Loading  | Spinner replaces the label; disabled and `accessibilityState.busy`                       |

Labels are bold, body family. A leading icon is a Phosphor element (or a text mark in its own run) and is excluded from the accessible label.

### Icon actions — `IconButton`

Square, `radius.sm`. `surface`, `primary` and `destructive` tones add a 2pt border and `cardElevationSmall`; `chrome`, `celebration` and `ghost` are transparent. Filled tones read `theme.action` (`actionSecondaryBg`, `actionPrimaryBg`, `actionDestructiveBg`). Pressed is 0.7 opacity rather than the `Button` press-in; disabled is 0.4 opacity. Sizes 36 / 44 / 52; `sm` adds `hitSlop` so every target reaches 44pt. Tones: `chrome`, `celebration`, `ghost`, `surface`, `primary`, `destructive`. An icon-only action always has an `accessibilityLabel`.

### Text input — `Input`

```typescript
input: {
  borderWidth: theme.borderWidth.medium,
  borderColor: theme.colors.border,       // focus → colors.focusRing
  borderRadius: theme.radius.md,
  paddingHorizontal: theme.space[3],
  paddingVertical: theme.space[3],
  fontSize: theme.size.md,                // 16 — prevents iOS zoom
  fontFamily: theme.fontFamily.body,
  color: theme.colors.text,
  backgroundColor: theme.colors.backgroundSecondary,
  minHeight: 48,
},
```

Label above the field: `sm`, medium, `colors.textSecondary`. Error: border and `xs` message in `colors.accentPrimary`.

### Keyboard and pinned footers — `KeyboardAvoidingFrame`

Screens with a text input above a pinned footer CTA wrap the `[body][footer]` pair in `KeyboardAvoidingFrame` (`src/components/KeyboardAvoidingFrame`); the header stays a sibling above it. Footers that reserve space for the floating tab bar or home indicator use `useKeyboardFooterPadding` so the CTA tracks the keyboard.

---

## Known gaps

Runtime places that do not yet meet this contract. Each is tracked; fix them there, not by rewriting the contract to match.

| Gap                                                                                                                                         | Tracking                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Some text styles omit `fontFamily`; `textStyles` use fixed multipliers so Warm Studio line heights miss them; 9–10pt essential labels       | [#684](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/684) (UI-01) |
| Focus actions and the badge-wall CTA use their own button treatment (`theme.action`, modal elevation, no pressed state) instead of `Button` | [#691](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/691) (UI-08) |
| Pinned action groups and the badge-detail hero are unbounded on small screens                                                               | [#694](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/694) (UI-11) |

---

## Reviewing against the contract

Storybook web (`bun run storybook:web`) is the reference preview. The toolbar lists the seven product themes. _Design System_ stories show tokens; _Composed Screens_ stories render real screens inside the app shell (floating tab bar, safe area, keyboard frame) at phone size, so layout is checked in context rather than only as individually framed parts. Storybook is a review aid: confirm layout and keyboard behavior on a native build before calling it verified.

---

## Related Documents

- [ND Themes](./nd-themes.md) — the seven product themes
- [Design Token System](../architecture/design-token-system.md) — package architecture and build pipeline
- [Design Principles](../vision/design-principles.md) — philosophy and rules
- [Accessibility Guidelines](../accessibility-guidelines.md) — WCAG targets, touch targets, testing
