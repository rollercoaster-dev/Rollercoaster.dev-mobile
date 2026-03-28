# Design Language: React Native Reference

**Status:** Current
**Source of Truth:** `@rollercoaster-dev/design-tokens` v0.1.1 → `src/themes/adapter.ts`

---

## Purpose

Documents how the shared rollercoaster.dev design language maps to React Native via the Unistyles theme system. All values are from generated code — if a value here doesn't match `build/unistyles/`, update this doc.

---

## Platform Differences

| Web (monorepo) | React Native (native-rd) | Adaptation |
|----------------|--------------------------|------------|
| CSS custom properties | Unistyles theme objects | `@rollercoaster-dev/design-tokens/unistyles` |
| `rem` units | Density-independent pixels (dp) | `build-unistyles.js` converts |
| `@media` queries | Unistyles breakpoints | `StyleSheet.configure` |
| `prefers-reduced-motion` | `AccessibilityInfo` | Accessibility hook |
| `:focus-visible` | `onFocus`/`onBlur` + state | Manual focus ring |
| `@font-face` | `expo-font` + `useFonts` | Loaded at app start |
| `box-shadow` | `shadow*` props (iOS) / `elevation` (Android) | Per-theme opacity |
| `prefers-color-scheme` | `useColorScheme()` | System theme detection |
| Theme CSS classes | `useStyles()` from Unistyles | `StyleSheet.configure({ themes })` |

---

## Typography

### Fonts

| Role | Font | Use |
|------|------|-----|
| Headlines | Anybody | Display/headline text |
| Body | Instrument Sans / system | Primary body text |
| Code | DM Mono | Code blocks, monospace |
| Dyslexia variant | Lexend | Body text in dyslexia theme |
| Low vision variant | Atkinson Hyperlegible | Body text in low vision theme |

### Size Scale

From `build/unistyles/tokens.ts` — values in dp:

| Token | dp | Use |
|-------|-----|-----|
| `2xs` | 10 | Decorative metadata only (below 12dp minimum) |
| `xs` | 12 | Captions, timestamps |
| `sm` | 14 | Secondary text, hints |
| `md` | 16 | Body text (default) |
| `lg` | 18 | Emphasized body |
| `xl` | 20 | Card titles |
| `2xl` | 24 | Section headers |
| `3xl` | 32 | Page titles |
| `4xl` | 40 | Display |
| `5xl` | 48 | Display |
| `6xl` | 60 | Display |
| `7xl` | 72 | Display |
| `display` | 96 | Hero sections |

### Large Text Scale (`sizeL`)

1.25x multiplied scale for `largeText` and `lowVision` variants:

| Token | dp |
|-------|----|
| `xs` | 15 |
| `sm` | 17.5 |
| `md` | 20 |
| `lg` | 22.5 |
| `xl` | 25 |
| `2xl` | 30 |
| `3xl` | 40 |
| `4xl` | 50 |
| `5xl` | 60 |
| `6xl` | 75 |
| `7xl` | 90 |
| `display` | 120 |

### Line Height Multipliers

From `build/unistyles/tokens.ts`:

| Token | Multiplier | Use |
|-------|------------|-----|
| `tight` | 1.05 | Single-line display headlines only |
| `compact` | 1.3 | Compact metadata |
| `normal` | 1.6 | Body text |
| `relaxed` | 1.8 | Comfortable reading |

### Large Line Height Multipliers (`lineHeightL`)

Used by `dyslexia` and `lowVision` variants:

| Token | Multiplier |
|-------|------------|
| `tight` | 1.2 |
| `normal` | 1.7 |
| `relaxed` | 1.9 |

The adapter computes absolute px line heights for React Native by multiplying size × multiplier.

### Font Weights

| Token | Value |
|-------|-------|
| `normal` | `'400'` |
| `medium` | `'500'` |
| `semibold` | `'600'` |
| `bold` | `'700'` |
| `black` | `'900'` |

### Letter Spacing

From `src/tokens/typography.json`:

| Token | Value | Use |
|-------|-------|-----|
| `tight` | -0.03em | Headlines, display text |
| `normal` | 0 | Body text |
| `label` | 0.05em | Uppercase label tracking |
| `wide` | 0.1em | Spaced text |
| `caps` | 0.15em | Uppercase labels and captions |

---

## Color System

### `Colors` Interface

13 semantic color properties per theme (from `build/unistyles/colorModes.ts`):

```typescript
interface Colors {
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accentPrimary: string;
  accentPurple: string;
  accentMint: string;
  accentYellow: string;
  border: string;
  shadow: string;
  focusRing: string;
}
```

### Light Mode Colors

| Property | Value | Use |
|----------|-------|-----|
| `background` | `#fafafa` | Main content background |
| `backgroundSecondary` | `#fafafa` | Cards, secondary areas |
| `backgroundTertiary` | `#e5e5e5` | Dividers, subtle bg |
| `text` | `#262626` | Headings, primary text |
| `textSecondary` | `#737373` | Body, descriptions |
| `textMuted` | `#737373` | Hints, timestamps |
| `accentPrimary` | `#0a0a0a` | Buttons, focus |
| `accentPurple` | `#a78bfa` | Highlights, badges |
| `accentMint` | `#d4f4e7` | Success backgrounds |
| `accentYellow` | `#ffe50c` | Attention (sparingly) |
| `border` | `#e5e5e5` | Default borders |
| `shadow` | `#0a0a0a` | Shadow color |
| `focusRing` | `#0a0a0a` | Focus ring color |

### Dark Mode Colors

| Property | Value | Notes |
|----------|-------|-------|
| `background` | `#1a1033` | Deep indigo |
| `backgroundSecondary` | `#2d1f52` | Elevated purple |
| `backgroundTertiary` | `#3a2d5c` | Tertiary purple |
| `text` | `#fafafa` | Off-white |
| `textSecondary` | `#e5e5e5` | Light gray |
| `textMuted` | `#e5e5e5` | Light gray |
| `accentPrimary` | `#fafafa` | Inverted |
| `accentPurple` | `#c4b5fd` | Lighter purple for contrast |
| `accentMint` | `#1a3a2a` | Dark mint |
| `accentYellow` | `#ffe50c` | Unchanged |
| `border` | `#3a2d5c` | Purple-tinted |
| `shadow` | `#fafafa` | Light shadow on dark bg |
| `focusRing` | `#fafafa` | Light focus ring |

### Palette Primitives

From `build/unistyles/palette.ts` — 30+ raw color constants used by tokens and themes:

| Key | Value | Key | Value |
|-----|-------|-----|-------|
| `primary` | `#0a0a0a` | `accentPurple` | `#a78bfa` |
| `primaryDark` | `#000000` | `accentMint` | `#d4f4e7` |
| `primaryLight` | `#333333` | `accentYellow` | `#ffe50c` |
| `secondary` | `#a78bfa` | `accentEmerald` | `#059669` |
| `secondaryDark` | `#7c5cbf` | `accentTeal` | `#00d4aa` |
| `secondaryLight` | `#c4b5fd` | `accentOrange` | `#ff6b35` |
| `success` | `#059669` | `accentSky` | `#38bdf8` |
| `error` | `#dc2626` | `accentPurpleVivid` | `#a855f7` |
| `warning` | `#d97706` | `deepIndigo` | `#1a1033` |
| `info` | `#2563eb` | `white` | `#fafafa` |
| `gray50`–`gray900` | neutral scale | `black` | `#0a0a0a` |

---

## Narrative Arc

The `Narrative` interface defines colors for the four-section landing page narrative (from `build/unistyles/narrative.ts`):

```typescript
interface Narrative {
  climb: { bg: string; text: string };
  drop: { bg: string; bgEnd: string; text: string; accent: string };
  stories: {
    bg: string; text: string;
    accent1: string; accent2: string; accent3: string; accent4: string;
    accentForeground: string;
  };
  relief: { bg: string; text: string; accent: string };
}
```

Light narrative values:

| Section | Property | Value | Description |
|---------|----------|-------|-------------|
| **Climb** | `bg` | `#ffe50c` | Bold yellow energy |
| | `text` | `#0a0a0a` | Dark on yellow |
| **Drop** | `bg` | `#0a0a0a` | Near-black |
| | `bgEnd` | `#1a1033` | Deep indigo gradient end |
| | `text` | `#fafafa` | Light on dark |
| | `accent` | `#a78bfa` | Soft purple |
| **Stories** | `bg` | `#2b1f4b` | Elevated purple |
| | `text` | `#fafafa` | Light on indigo |
| | `accent1` | `#00d4aa` | Teal |
| | `accent2` | `#ff6b35` | Orange |
| | `accent3` | `#a855f7` | Vivid purple |
| | `accent4` | `#38bdf8` | Sky blue |
| | `accentForeground` | `#0a0a0a` | Text on accent bg |
| **Relief** | `bg` | `#d4f4e7` | Soft mint |
| | `text` | `#0a0a0a` | Dark on mint |
| | `accent` | `#059669` | Emerald |

Each variant can override any narrative value — see [ND Themes](./nd-themes.md) for per-theme narrative overrides.

---

## Spacing

From `build/unistyles/tokens.ts`:

| Token | dp | Use |
|-------|-----|-----|
| `0` | 0 | None |
| `1` | 4 | Tight gaps |
| `2` | 8 | Icon gaps, compact padding |
| `3` | 12 | Button padding |
| `4` | 16 | Card padding, section gaps |
| `5` | 20 | Comfortable card padding |
| `6` | 24 | Card margins |
| `8` | 32 | Section padding |
| `10` | 40 | Large section gaps |
| `12` | 48 | Page margins |
| `16` | 64 | Maximum spacing |

---

## Border Radius

From `build/unistyles/tokens.ts`:

| Token | dp | Use |
|-------|-----|-----|
| `sm` | 2 | Small elements |
| `md` | 4 | Buttons, inputs |
| `lg` | 8 | Cards |
| `xl` | 12 | Large cards |
| `pill` | 9999 | Circles, pills |

The adapter adds a `full` alias pointing to `pill` for backward compatibility.

---

## Shadows

Shadows use per-theme opacity from `ColorModeConfig`:

| Color mode | Shadow opacity |
|------------|---------------|
| Light | 0.04 |
| Dark | 0.2 |

Variants override shadow opacity:
- `highContrast`: 0 (borders define edges)
- `autismFriendly`: 0 (reduce sensory input)
- `lowVision`: 0 (borders define edges)

---

## Z-Index

From `build/unistyles/tokens.ts`:

| Token | Value |
|-------|-------|
| `dropdown` | 1000 |
| `sticky` | 1100 |
| `modal` | 1300 |
| `tooltip` | 1400 |

The adapter adds numeric aliases `0`–`5` (0, 100, 200, 300, 400, 500) for backward compatibility.

---

## Component Patterns

### Card

```typescript
const stylesheet = StyleSheet.create((theme) => ({
  card: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.space[4],
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: theme.shadows.opacity,
    shadowRadius: 2,
  },
}));
```

### Button (Primary)

```typescript
const stylesheet = StyleSheet.create((theme) => ({
  button: {
    backgroundColor: theme.colors.accentPrimary,
    paddingVertical: theme.space[3],
    paddingHorizontal: theme.space[6],
    borderRadius: theme.radius.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: theme.colors.background,
    fontSize: theme.size.md,
    fontWeight: theme.fontWeight.semibold,
  },
}));
```

### Text Input

```typescript
const stylesheet = StyleSheet.create((theme) => ({
  input: {
    paddingVertical: theme.space[3],
    paddingHorizontal: theme.space[4],
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    fontSize: theme.size.md,  // 16dp — prevents iOS auto-zoom
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
    minHeight: 48,
  },
}));
```

---

## Related Documents

- [Design Token System](../architecture/design-token-system.md) — package architecture and build pipeline
- [ND Themes](./nd-themes.md) — all 14 composed theme definitions
- [Design Principles](../vision/design-principles.md) — philosophy and rules
