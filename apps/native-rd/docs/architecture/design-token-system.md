# Architecture: Design Token System

**Status:** Current
**Source of Truth:** `@rollercoaster-dev/design-tokens` v0.1.1

---

## Purpose

Single source of truth for the rollercoaster.dev design language across web and mobile. JSON token definitions produce CSS variables, JS objects, Tailwind config, and Unistyles theme objects for React Native.

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

| File | Contents |
|------|----------|
| `colors.json` | Palette primitives (primary, secondary, accents, grays) |
| `typography.json` | Font families, size scale, weights, line heights, letter spacing |
| `spacing.json` | Space scale, border radius, z-index, shadows |
| `semantic.json` | Semantic mappings (surface, interactive, form colors) |
| `narrative.json` | Four-section color narrative (climb, drop, stories, relief) |
| `mood.json` | Theme mood names and descriptions |
| `aliases.json` | Convenience aliases (ink, paper, highlight) |
| `components.json` | Component-level token compositions |

### `src/themes/` — 8 theme override files

| File | Theme |
|------|-------|
| `light.json` | Default (light) base |
| `dark.json` | Dark mode |
| `high-contrast.json` | WCAG AAA high contrast |
| `large-text.json` | 1.25x size scale |
| `dyslexia-friendly.json` | Cream bg, relaxed spacing |
| `low-vision.json` | High contrast + large text |
| `low-info.json` | Reduced visual noise |
| `autism-friendly.json` | Muted/desaturated colors |

---

## Build Pipeline

```text
src/tokens/          JSON primitives (colors, spacing, typography, narrative)
src/themes/          JSON theme overrides (dark, high-contrast, dyslexia, etc.)
        |
        v
style-dictionary     build-themes.js     build-unistyles.js
        |                  |                     |
        v                  v                     v
build/css/           build/css/           build/unistyles/
  tokens.css           themes.css           palette.ts
build/js/                                    tokens.ts
build/tailwind/                              colorModes.ts
build/tamagui/                               variants.ts
                                             narrative.ts
                                             index.ts
css/
  narrative.css      (hand-authored, exportable design language classes)
```

Build commands:

```bash
bun run build           # Full pipeline: style-dictionary + themes + unistyles
bun run build:tokens    # Style Dictionary only
bun run build:themes    # Theme CSS only
bun run build:unistyles # Unistyles JS only
```

---

## Exports

| Import path | What | Consumer |
|-------------|------|----------|
| `@rollercoaster-dev/design-tokens/css` | CSS custom properties (`:root`) | Web apps |
| `@rollercoaster-dev/design-tokens/css/themes` | Theme class overrides | Web apps |
| `@rollercoaster-dev/design-tokens/css/narrative` | Narrative section + badge label classes | Web apps, landing page |
| `@rollercoaster-dev/design-tokens/unistyles` | Palette, tokens, colorModes, variants | native-rd (React Native) |
| `@rollercoaster-dev/design-tokens/tailwind` | Tailwind config preset | Tailwind projects |
| `@rollercoaster-dev/design-tokens/tamagui` | Tamagui token config | Tamagui projects |

---

## Unistyles Output

The `build/unistyles/` directory contains auto-generated TypeScript consumed by native-rd:

| File | Exports |
|------|---------|
| `palette.ts` | `palette` — 30+ raw color constants |
| `tokens.ts` | `space`, `size`, `sizeL`, `radius`, `zIndex`, `fontWeight`, `lineHeight`, `lineHeightL` |
| `colorModes.ts` | `Colors` interface, `lightColors`, `darkColors`, `colorModes` |
| `variants.ts` | `VariantOverride` type, 5 variant color override objects |
| `narrative.ts` | `Narrative` interface, light/dark narrative modes, 5 variant narrative overrides |
| `index.ts` | Re-exports everything above |

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
  src/themes/compose.ts    ← composeTheme() → 14 ComposedThemes
```

---

## Theme Composition

native-rd composes **2 color modes × 7 variants = 14 themes** via `compose.ts`:

```typescript
// compose.ts
const themes = Object.fromEntries(
  colorModeList.flatMap((cm) =>
    variants.map((v) => [`${cm}-${v}`, composeTheme(cm, v)])
  )
) as Record<ThemeName, ComposedTheme>;
```

Theme names follow the pattern `{colorMode}-{variant}`:
`light-default`, `light-highContrast`, `dark-dyslexia`, `dark-lowVision`, etc.

See [ND Themes](../design/nd-themes.md) for the full theme reference.

---

## Overview Pages

The package includes HTML visual reference pages at `overview/` that render all themes side-by-side. These can be viewed locally to verify theme appearance.

---

## Conventions

- Token JSON uses DTCG `$value`/`$type` format
- CSS vars prefixed `--ob-`
- Theme JSON uses structured groups: `surface`, `interactive`, `color`, `narrative`, `form`, `typography`, `aliases`
- `narrative.css` is hand-authored — reusable CSS classes referencing token vars
- `build/unistyles/` files are auto-generated — never edit directly
- All token additions require running `bun run build` to regenerate outputs

---

## Related Documents

- [Design Language](../design/design-language.md) — how tokens translate to React Native
- [ND Themes](../design/nd-themes.md) — all 14 composed theme definitions
- [Design Principles](../vision/design-principles.md) — the themes as day-one requirements
