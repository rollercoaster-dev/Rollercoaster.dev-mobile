# Architecture: Design Token System

**Status:** Current
**Source of Truth:** `@rollercoaster-dev/design-tokens` v0.1.1

---

## Purpose

Single source of truth for the rollercoaster.dev design language on mobile. JSON token definitions produce Unistyles theme objects for React Native. (The legacy CSS/JS/Tailwind/Tamagui Style Dictionary platforms were removed in issue #375, Phase 3 — Decision A: unistyles-only.)

---

## Package

**npm:** `@rollercoaster-dev/design-tokens`
**Repo:** `packages/design-tokens/` in [openbadges-monorepo](https://github.com/rollercoaster-dev/openbadges-monorepo)
**Version:** 0.1.1

---

## Token Format

Tokens use the [DTCG](https://design-tokens.github.io/community-group/format/) `$value`/`$type` format:

```json
// src/tokens/colors.json
{
  "color": {
    "primary": {
      "$value": "#0a0a0a",
      "$type": "color",
      "$description": "Primary brand color - confident black"
    },
    "secondary": {
      "$value": "#a78bfa",
      "$type": "color",
      "$description": "Purple accent"
    }
  }
}
```

```json
// src/tokens/narrative.json
{
  "narrative": {
    "climb": {
      "bg": {
        "$value": "#ffe50c",
        "$type": "color",
        "$description": "The Climb background — bold yellow energy"
      }
    }
  }
}
```

---

## Source Structure

### `src/tokens/` — 8 primitive token files

| File              | Contents                                                         |
| ----------------- | ---------------------------------------------------------------- |
| `colors.json`     | Palette primitives (primary, secondary, accents, grays)          |
| `typography.json` | Font families, size scale, weights, line heights, letter spacing |
| `spacing.json`    | Space scale, border radius, z-index, shadows                     |
| `semantic.json`   | Semantic mappings (surface, interactive, form colors)            |
| `narrative.json`  | Four-section color narrative (climb, drop, stories, relief)      |
| `mood.json`       | Theme mood names and descriptions                                |
| `aliases.json`    | Convenience aliases (ink, paper, highlight)                      |
| `components.json` | Component-level token compositions                               |

### `src/themes/` — 8 theme override files

| File                     | Theme                      |
| ------------------------ | -------------------------- |
| `light.json`             | Default (light) base       |
| `dark.json`              | Dark mode                  |
| `high-contrast.json`     | WCAG AAA high contrast     |
| `large-text.json`        | 1.25x size scale           |
| `dyslexia-friendly.json` | Cream bg, relaxed spacing  |
| `low-vision.json`        | High contrast + large text |
| `low-info.json`          | Reduced visual noise       |
| `autism-friendly.json`   | Muted/desaturated colors   |

---

## Build Pipeline

```text
src/tokens/          JSON primitives (colors, spacing, typography, narrative)
src/themes/          JSON theme overrides (dark, high-contrast, dyslexia, etc.)
        |
        v
build-unistyles.js   (reads JSON directly — no Style Dictionary dependency)
        |
        v
build/unistyles/
  palette.ts
  tokens.ts
  colorModes.ts
  variants.ts
  narrative.ts
  index.ts
```

Build commands:

```bash
bun run build           # node build-unistyles.js → build/unistyles/*.ts
bun run build:unistyles # same as build
```

---

## Exports

| Import path                                  | What                                  | Consumer                 |
| -------------------------------------------- | ------------------------------------- | ------------------------ |
| `@rollercoaster-dev/design-tokens/unistyles` | Palette, tokens, colorModes, variants | native-rd (React Native) |

---

## Unistyles Output

The `build/unistyles/` directory contains auto-generated TypeScript consumed by native-rd:

| File            | Exports                                                                                 |
| --------------- | --------------------------------------------------------------------------------------- |
| `palette.ts`    | `palette` — 30+ raw color constants                                                     |
| `tokens.ts`     | `space`, `size`, `sizeL`, `radius`, `zIndex`, `fontWeight`, `lineHeight`, `lineHeightL` |
| `colorModes.ts` | `Colors` interface, `lightColors`, `darkColors`, `colorModes`                           |
| `variants.ts`   | `VariantOverride` type, 5 variant color override objects                                |
| `narrative.ts`  | `Narrative` interface, light/dark narrative modes, 5 variant narrative overrides        |
| `index.ts`      | Re-exports everything above                                                             |

---

## Adapter Layer

`src/themes/adapter.ts` is the **only file** in native-rd that imports from the design-tokens package. It:

1. **Re-exports** all package tokens (palette, space, size, radius, etc.)
2. **Adds app-specific colors** not in the package (cream tones, desaturated variants)
3. **Adds backward-compat aliases** (e.g., `purple300` → `secondaryLight`)
4. **Computes absolute line heights** for React Native (RN needs px, not multipliers) by multiplying the size scale by the line height multiplier

```
design-tokens package
        |
        v
  src/themes/adapter.ts    ← single import boundary
        |
        v
  src/themes/tokens.ts     ← re-exports space, size, radius, etc.
  src/themes/colorModes.ts ← wraps colors into ColorModeConfig shape
  src/themes/variants.ts   ← variant overrides + mood labels
  src/themes/compose.ts    ← composeTheme() + 7 registered product themes
```

---

## Theme Composition

native-rd exposes **7 product themes** via `compose.ts`. `composeTheme(colorMode, variant)` can still build any color-mode/variant pair for previews and focused tests, but only the product themes are registered with Unistyles at runtime:

```typescript
// compose.ts
const themes = Object.fromEntries(
  productThemeEntries.map(([name, colorMode, variant]) => [
    name,
    composeTheme(colorMode, variant),
  ]),
) as Record<ThemeName, ComposedTheme>;
```

Registered theme names are:
`light-default`, `dark-default`, `light-highContrast`, `light-dyslexia`, `light-autismFriendly`, `light-lowVision`, and `light-lowInfo`.

See [ND Themes](../design/nd-themes.md) for the full theme reference.

---

## Conventions

- Token JSON uses DTCG `$value`/`$type` format
- Theme JSON uses structured groups: `surface`, `interactive`, `color`, `narrative`, `form`, `typography`, `aliases`
- `build/unistyles/` files are auto-generated — never edit directly
- All token additions require running `bun run build` to regenerate outputs

---

## Related Documents

- [Design Language](../design/design-language.md) — how tokens translate to React Native
- [ND Themes](../design/nd-themes.md) — neurodiversity theme definitions
- [Design Principles](../vision/design-principles.md) — the themes as day-one requirements
