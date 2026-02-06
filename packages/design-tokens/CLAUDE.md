# design-tokens Context

Package-specific context for Claude Code when working in `packages/design-tokens/`.

**npm**: `@rollercoaster-dev/design-tokens`

## Purpose

Single source of truth for the rollercoaster.dev design language. JSON token definitions produce CSS variables, JS objects, Tailwind config, and Unistyles theme objects for React Native.

## Token Architecture

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
                                             index.ts
css/
  narrative.css      (hand-authored, exportable design language classes)
```

## Exports

| Import path                                      | What                                    | Consumer                 |
| ------------------------------------------------ | --------------------------------------- | ------------------------ |
| `@rollercoaster-dev/design-tokens/css`           | CSS custom properties (`:root`)         | Web apps                 |
| `@rollercoaster-dev/design-tokens/css/themes`    | Theme class overrides                   | Web apps                 |
| `@rollercoaster-dev/design-tokens/css/narrative` | Narrative section + badge label classes | Web apps, landing page   |
| `@rollercoaster-dev/design-tokens/unistyles`     | Palette, tokens, colorModes, variants   | native-rd (React Native) |
| `@rollercoaster-dev/design-tokens/tailwind`      | Tailwind config preset                  | Tailwind projects        |
| `@rollercoaster-dev/design-tokens/tamagui`       | Tamagui token config                    | Tamagui projects         |

## Build

```bash
bun run build           # Full pipeline: style-dictionary + themes + unistyles
bun run build:tokens    # Style Dictionary only
bun run build:themes    # Theme CSS only
bun run build:unistyles # Unistyles JS only
```

## Key Files

- `style-dictionary.config.js` -- Style Dictionary config for CSS/JS/Tailwind/Tamagui
- `build-themes.js` -- Generates `build/css/themes.css` from theme JSON
- `build-unistyles.js` -- Generates `build/unistyles/*.ts` from token/theme JSON
- `css/narrative.css` -- Hand-authored design language classes (uses `var(--ob-*)`)

## Themes (8 total)

| Theme             | Class                         | Mood Name              |
| ----------------- | ----------------------------- | ---------------------- |
| Default (light)   | `:root`                       | The Full Ride          |
| Dark              | `.ob-dark-theme`              | Night Ride             |
| High Contrast     | `.ob-high-contrast-theme`     | Bold Ink               |
| Large Text        | `.ob-large-text-theme`        | Same Ride, Bigger Seat |
| Dyslexia-Friendly | `.ob-dyslexia-friendly-theme` | Warm Studio            |
| Low Vision        | `.ob-low-vision-theme`        | Loud & Clear           |
| Low Info          | `.ob-low-info-theme`          | Clean Signal           |
| Autism-Friendly   | `.ob-autism-friendly-theme`   | Still Water            |

## Conventions

- Token JSON uses DTCG `$value`/`$type` format
- CSS vars prefixed `--ob-`
- Theme JSON lives in `src/themes/` with structured groups: `surface`, `interactive`, `color`, `narrative`, `form`, `typography`, `aliases`
- `narrative.css` is hand-authored, not generated -- it contains reusable CSS classes that reference token vars
- `build/unistyles/` files are auto-generated -- never edit directly

## Adding Tokens

1. Add to appropriate `src/tokens/*.json` file
2. If semantic, add mapping in `src/tokens/semantic.json`
3. If theme-varying, add overrides in each `src/themes/*.json`
4. Run `bun run build` to regenerate all outputs
5. If the token should appear in Unistyles output, update `build-unistyles.js`
