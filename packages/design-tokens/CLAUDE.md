# design-tokens Context

Package-specific context for Claude Code when working in `packages/design-tokens/`.

**npm**: `@rollercoaster-dev/design-tokens`

## Purpose

Single source of truth for the rollercoaster.dev design language. JSON token definitions produce Unistyles theme objects consumed by the native-rd React Native app. (The legacy CSS/JS/Tailwind/Tamagui Style Dictionary platforms were removed in issue #375, Phase 3 — Decision A: unistyles-only.)

## Token Architecture

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

## Exports

| Import path                                  | What                                  | Consumer                 |
| -------------------------------------------- | ------------------------------------- | ------------------------ |
| `@rollercoaster-dev/design-tokens/unistyles` | Palette, tokens, colorModes, variants | native-rd (React Native) |

## Build

```bash
bun run build           # node build-unistyles.js → build/unistyles/*.ts
bun run build:unistyles # same as build
bun run clean           # rm -rf build/*
```

## Key Files

- `build-unistyles.js` -- Generates `build/unistyles/*.ts` from token/theme JSON (reads the JSON directly; no Style Dictionary)
- `src/tokens/*.json` -- DTCG `$value`/`$type` token primitives
- `src/themes/*.json` -- per-theme overrides

## Themes (8 total)

| Theme             | Unistyles variant key | Mood Name              |
| ----------------- | --------------------- | ---------------------- |
| Default (light)   | `default`             | The Full Ride          |
| Dark              | `default` (dark mode) | Night Ride             |
| High Contrast     | `highContrast`        | Bold Ink               |
| Large Text        | `largeText`           | Same Ride, Bigger Seat |
| Dyslexia-Friendly | `dyslexia`            | Warm Studio            |
| Low Vision        | `lowVision`           | Loud & Clear           |
| Low Info          | `lowInfo`             | Clean Signal           |
| Autism-Friendly   | `autismFriendly`      | Still Water            |

Theme class names (`.ob-*-theme`) and `--ob-*` CSS variables no longer exist; the package emits TypeScript only. The contrast validation gate lives in `apps/native-rd/src/themes/` (`contrastPairs.ts` + `__tests__/contrast.test.ts`), surfaced visually by the Storybook `Design System/Contrast Audit` story.

## Conventions

- Token JSON uses DTCG `$value`/`$type` format
- Theme JSON lives in `src/themes/` with structured groups: `surface`, `interactive`, `color`, `narrative`, `form`, `typography`, `aliases`
- `build/unistyles/` files are auto-generated -- never edit directly

## Adding Tokens

1. Add to appropriate `src/tokens/*.json` file
2. If semantic, add mapping in `src/tokens/semantic.json`
3. If theme-varying, add overrides in each `src/themes/*.json`
4. If the token should appear in Unistyles output, update `build-unistyles.js`
5. Run `bun run build` to regenerate `build/unistyles/`
