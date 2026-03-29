# ND Themes: 14 Composed Theme Definitions

**Status:** Current
**Source of Truth:** `@rollercoaster-dev/design-tokens` v0.1.1 → `src/themes/compose.ts`

---

## Overview

The theme system composes **2 color modes × 7 variants = 14 themes**. Each theme is a `ComposedTheme` object built by `composeTheme(colorMode, variant)`.

The `default` and `largeText` variants have no color overrides, so `light-default` = light base colors and `dark-default` = dark base colors.

---

## Theme Table

| Variant          | Mood Name              | Key Trait                                  |
| ---------------- | ---------------------- | ------------------------------------------ |
| `default`        | The Full Ride          | Standard                                   |
| `highContrast`   | Bold Ink               | WCAG AAA, 0 shadows                        |
| `largeText`      | Same Ride, Bigger Seat | 1.25x size scale                           |
| `dyslexia`       | Warm Studio            | Cream bg, Lexend font, relaxed line height |
| `lowVision`      | Loud & Clear           | High contrast + Atkinson font + 1.25x size |
| `autismFriendly` | Still Water            | Muted/desaturated, 0 shadows               |
| `lowInfo`        | Clean Signal           | Minimal visual noise                       |

---

## ComposedTheme Shape

From `src/themes/compose.ts`:

```typescript
interface ComposedTheme {
  colors: Colors; // 13 semantic color properties
  narrative: Narrative; // 4-section narrative arc colors
  shadows: { opacity: number };
  space: typeof space; // Spacing scale (shared across all themes)
  size: SizeScale; // Typography size scale (normal or large)
  radius: typeof radius; // Border radius scale (shared)
  zIndex: typeof zIndex; // Z-index scale (shared)
  fontWeight: typeof fontWeight; // Font weight scale (shared)
  lineHeight: LineHeightScale; // Line height multipliers (normal or large)
  fontFamily?: string; // Optional font override
}
```

---

## Per-Theme Definitions

### Default

**Mood:** The Full Ride
**Overrides:** None — uses base color mode as-is.

| Property       | Light     | Dark      |
| -------------- | --------- | --------- |
| `background`   | `#fafafa` | `#1a1033` |
| `text`         | `#262626` | `#fafafa` |
| Shadow opacity | 0.04      | 0.2       |
| Size scale     | normal    | normal    |
| Line height    | normal    | normal    |

---

### High Contrast

**Mood:** Bold Ink
**Purpose:** WCAG AAA compliance, maximum readability.

| Property              | Value     |
| --------------------- | --------- |
| `background`          | `#ffffff` |
| `backgroundSecondary` | `#f0f0f0` |
| `backgroundTertiary`  | `#000000` |
| `text`                | `#000000` |
| `textSecondary`       | `#000000` |
| `textMuted`           | `#000000` |
| `accentPrimary`       | `#000000` |
| `accentPurple`        | `#606060` |
| `border`              | `#000000` |
| `focusRing`           | `#0055cc` |
| Shadow opacity        | **0**     |

**Narrative overrides:**

| Section | Property                           | Value                                         |
| ------- | ---------------------------------- | --------------------------------------------- |
| Climb   | `bg` / `text`                      | `#ffffff` / `#000000`                         |
| Drop    | `bg` / `bgEnd` / `text` / `accent` | `#000000` / `#000000` / `#ffffff` / `#0055cc` |
| Stories | `bg` / `text`                      | `#2a2a2a` / `#ffffff`                         |
| Stories | `accent1`–`4`                      | `#00ddaa` / `#ff8833` / `#aa55ff` / `#3399ff` |
| Stories | `accentForeground`                 | `#000000`                                     |
| Relief  | `bg` / `text` / `accent`           | `#f0f0f0` / `#000000` / `#008866`             |

---

### Large Text

**Mood:** Same Ride, Bigger Seat
**Purpose:** 1.25x text sizes for improved readability.

| Property   | Override                            |
| ---------- | ----------------------------------- |
| Size scale | `sizeL` (xs=15 through display=120) |

No color or narrative overrides. Composes with any color mode.

---

### Dyslexia-Friendly

**Mood:** Warm Studio
**Purpose:** Reduce visual stress with warm tones and readable typography.

| Property              | Value                                              |
| --------------------- | -------------------------------------------------- |
| `background`          | `#f8f5e4` (cream)                                  |
| `backgroundSecondary` | `#f0edd8`                                          |
| `backgroundTertiary`  | `#c8c3a9`                                          |
| `text`                | `#333333` (dark gray, not pure black)              |
| `textSecondary`       | `#555555`                                          |
| `textMuted`           | `#555555`                                          |
| `accentPrimary`       | `#4e7d9e`                                          |
| `accentPurple`        | `#8860a0`                                          |
| `border`              | `#c8c3a9`                                          |
| `focusRing`           | `#4e7d9e`                                          |
| Line height           | `lineHeightL` (tight=1.2, normal=1.7, relaxed=1.9) |
| Font family           | `Lexend`                                           |

**Narrative overrides:**

| Section | Property                           | Value                                         |
| ------- | ---------------------------------- | --------------------------------------------- |
| Climb   | `bg` / `text`                      | `#f5e6a0` / `#333333`                         |
| Drop    | `bg` / `bgEnd` / `text` / `accent` | `#3b2a4a` / `#332244` / `#f8f5e4` / `#c4a8e0` |
| Stories | `bg` / `text`                      | `#2a3d3d` / `#f8f5e4`                         |
| Stories | `accent1`–`4`                      | `#4a8a62` / `#b86840` / `#8860a0` / `#4e7d9e` |
| Stories | `accentForeground`                 | `#fafafa`                                     |
| Relief  | `bg` / `text` / `accent`           | `#e8f0e0` / `#333333` / `#4a8a62`             |

---

### Low Vision

**Mood:** Loud & Clear
**Purpose:** High contrast + large text + clear focus indicators.

| Property              | Value                  |
| --------------------- | ---------------------- |
| `background`          | `#ffffff`              |
| `backgroundSecondary` | `#f0f0f0`              |
| `backgroundTertiary`  | `#555555`              |
| `text`                | `#111111`              |
| `textSecondary`       | `#333333`              |
| `textMuted`           | `#333333`              |
| `accentPrimary`       | `#003d99`              |
| `accentPurple`        | `#555555`              |
| `border`              | `#555555`              |
| `focusRing`           | `#003d99`              |
| Shadow opacity        | **0**                  |
| Size scale            | `sizeL` (1.25x)        |
| Font family           | `AtkinsonHyperlegible` |

**Narrative overrides:**

| Section | Property                           | Value                                         |
| ------- | ---------------------------------- | --------------------------------------------- |
| Climb   | `text`                             | `#000000`                                     |
| Drop    | `bg` / `bgEnd` / `text` / `accent` | `#000000` / `#000000` / `#ffffff` / `#6699ff` |
| Stories | `bg` / `text`                      | `#1a2d4d` / `#ffffff`                         |
| Stories | `accent1`–`4`                      | `#00aa77` / `#ff8844` / `#cc88ff` / `#66aaff` |
| Stories | `accentForeground`                 | `#ffffff`                                     |
| Relief  | `bg` / `text` / `accent`           | `#e0f0e0` / `#000000` / `#006400`             |

---

### Autism-Friendly

**Mood:** Still Water
**Purpose:** Muted/desaturated colors to reduce sensory overload.

| Property              | Value                       |
| --------------------- | --------------------------- |
| `background`          | `#f7f7f7` (soft, not stark) |
| `backgroundSecondary` | `#eeeeee`                   |
| `backgroundTertiary`  | `#e0e0e0`                   |
| `text`                | `#333333`                   |
| `textMuted`           | `#666666`                   |
| `accentPrimary`       | `#4d6d7d` (desaturated)     |
| `accentPurple`        | `#8a7a9a` (desaturated)     |
| `border`              | `#dddddd`                   |
| `focusRing`           | `#4d6d7d`                   |
| Shadow opacity        | **0**                       |

**Narrative overrides:**

| Section | Property                           | Value                                         |
| ------- | ---------------------------------- | --------------------------------------------- |
| Climb   | `bg` / `text`                      | `#f5f0d0` / `#444444`                         |
| Drop    | `bg` / `bgEnd` / `text` / `accent` | `#4a5a6a` / `#3d4d5d` / `#eeeeee` / `#8a9aaa` |
| Stories | `bg` / `text`                      | `#2d4d47` / `#eeeeee`                         |
| Stories | `accent1`–`4`                      | `#6a9a8a` / `#a08a70` / `#887a96` / `#6a8a9e` |
| Stories | `accentForeground`                 | `#fafafa`                                     |
| Relief  | `bg` / `text` / `accent`           | `#e8f0e8` / `#444444` / `#5a8a6a`             |

---

### Low Info

**Mood:** Clean Signal
**Purpose:** Reduced visual noise, minimal color variation.

| Property              | Value     |
| --------------------- | --------- |
| `background`          | `#ffffff` |
| `backgroundSecondary` | `#f0f0f0` |
| `backgroundTertiary`  | `#dddddd` |
| `text`                | `#222222` |
| `textMuted`           | `#444444` |
| `accentPrimary`       | `#222222` |
| `accentPurple`        | `#666666` |
| `border`              | `#cccccc` |
| `focusRing`           | `#222222` |

**Narrative overrides:**

| Section | Property                           | Value                                         |
| ------- | ---------------------------------- | --------------------------------------------- |
| Climb   | `bg` / `text`                      | `#ffffff` / `#222222`                         |
| Drop    | `bg` / `bgEnd` / `text` / `accent` | `#222222` / `#222222` / `#ffffff` / `#003d99` |
| Stories | `bg` / `text`                      | `#152840` / `#ffffff`                         |
| Stories | `accent1`–`4`                      | all `#003d99` (monochromatic)                 |
| Stories | `accentForeground`                 | `#ffffff`                                     |
| Relief  | `bg` / `text` / `accent`           | `#f0f0f0` / `#222222` / `#003d99`             |

---

## Theme Names

All 14 theme names follow the pattern `{colorMode}-{variant}`:

| #   | Theme Name             |
| --- | ---------------------- |
| 1   | `light-default`        |
| 2   | `light-highContrast`   |
| 3   | `light-largeText`      |
| 4   | `light-dyslexia`       |
| 5   | `light-lowVision`      |
| 6   | `light-autismFriendly` |
| 7   | `light-lowInfo`        |
| 8   | `dark-default`         |
| 9   | `dark-highContrast`    |
| 10  | `dark-largeText`       |
| 11  | `dark-dyslexia`        |
| 12  | `dark-lowVision`       |
| 13  | `dark-autismFriendly`  |
| 14  | `dark-lowInfo`         |

---

## Theme Switching

```typescript
import { StyleSheet } from "react-native-unistyles";
import { themes } from "./themes/compose";

// Configure all themes at app startup
StyleSheet.configure({ themes });

// Set initial theme
useInitialTheme("light-default");

// Switch at runtime
StyleSheet.setTheme("dark-dyslexia");
```

---

## Testing Matrix

All 14 theme combinations should be tested:

- [ ] `light-default`
- [ ] `light-highContrast`
- [ ] `light-largeText`
- [ ] `light-dyslexia`
- [ ] `light-lowVision`
- [ ] `light-autismFriendly`
- [ ] `light-lowInfo`
- [ ] `dark-default`
- [ ] `dark-highContrast`
- [ ] `dark-largeText`
- [ ] `dark-dyslexia`
- [ ] `dark-lowVision`
- [ ] `dark-autismFriendly`
- [ ] `dark-lowInfo`

Additionally:

- [ ] Test with OS Dynamic Type at 200%
- [ ] Test with OS Bold Text enabled
- [ ] Test with OS Reduce Motion enabled
- [ ] Test with VoiceOver (iOS) and TalkBack (Android)
- [ ] Verify `prefers-color-scheme` detection selects correct color mode

---

## Related Documents

- [Design Language](./design-language.md) — token values and component patterns
- [Design Token System](../architecture/design-token-system.md) — package architecture
- [Design Principles](../vision/design-principles.md) — philosophy and rules
