# Design Token System — Current State Map

**Status:** Pre-migration snapshot, 2026-04-28
**Companion to:** [design-token-system.md](./design-token-system.md) (intended architecture)
**Purpose:** ground-truth diagram of how design tokens actually flow from JSON to a `theme.colors.X` reference in a screen, and where the friction is.

> This map captures the **pre-migration** state. After PR #935, `chromeColors` is composed into `ComposedTheme.chrome` (commit `7c817ca6`) but no screens read it — header chrome moved to `theme.colors.accentPurple` / `accentPurpleFg` instead. See the [plan doc Learnings](../plans/2026-04-28-design-token-simplification-and-chrome.md#learnings--2026-04-28-after-attempting-steps-1-and-2) for context.

---

## End-to-end data flow

```text
┌─────────────────────────────────────────────────────────────────────┐
│ packages/design-tokens/                                             │
│                                                                     │
│  src/tokens/*.json          src/themes/*.json                       │
│  (primitives)               (8 theme overrides)                     │
│  ─ colors.json              ─ light.json  (default)                 │
│  ─ spacing.json             ─ dark.json                             │
│  ─ typography.json          ─ high-contrast.json                    │
│  ─ semantic.json            ─ dyslexia-friendly.json                │
│  ─ chrome.json              ─ autism-friendly.json                  │
│  ─ action.json              ─ low-vision.json                       │
│  ─ surface-border.json      ─ low-info.json                         │
│  ─ journey.json             ─ large-text.json                       │
│  ─ badge-reward.json                                                │
│  ─ typography-roles.json    each can override any token category    │
│  ─ narrative.json                                                   │
│       │   │  │  │                                                   │
│       ▼   ▼  ▼  ▼                                                   │
│   ┌─────────────────────────────────────────────────────┐           │
│   │ 3 separate build scripts                            │           │
│   │  • style-dictionary.config.js  → css/js/tw/tamagui  │           │
│   │  • build-themes.js              → themes.css        │           │
│   │  • build-unistyles.js (~928 LOC) → unistyles/*.ts   │           │
│   └─────────────────────────────────────────────────────┘           │
│       │                                                             │
│       ▼                                                             │
│  build/unistyles/      (auto-generated TS — DO NOT EDIT)            │
│   ─ palette.ts         primitives                                   │
│   ─ tokens.ts          space, size, radius, fontWeight, etc.        │
│   ─ colorModes.ts      lightColors, darkColors (base palette)       │
│   ─ variants.ts        5 variant color overrides                    │
│   ─ narrative.ts       narrative section colors per mode + variant  │
│   ─ semanticColors.ts  6 categories × per-mode + per-variant:       │
│                          ─ chrome (header/topBar/tabBar/modal)      │
│                          ─ action (primary/secondary/disabled…)     │
│                          ─ surfaceBorder                            │
│                          ─ journey                                  │
│                          ─ badgeReward                              │
│                          ─ typographyRole                           │
│   ─ index.ts           barrel                                       │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            │   import from
                            │   '@rollercoaster-dev/design-tokens/unistyles'
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ apps/native-rd/src/themes/                                          │
│                                                                     │
│  adapter.ts            ◄── single import boundary (project rule)    │
│   ─ re-exports package primitives with `pkgX` aliases               │
│   ─ adds app-only palette entries (cream100, yellow200, …)          │
│   ─ adds aliases for backwards-compat (purple300, mint600, …)       │
│   ─ adds error/warning/success/info to lightColors/darkColors       │
│   ─ computes RN-absolute lineHeights from package multipliers       │
│       │                                                             │
│       ├──► tokens.ts        re-exports primitives (yet another      │
│       │                     re-export layer just for tokens)        │
│       │                                                             │
│       ├──► colorModes.ts    declares `Colors` interface AGAIN       │
│       │                     (duplicates package shape) +            │
│       │                     `ColorModeConfig`                       │
│       │                                                             │
│       ├──► variants.ts      `Variant` type (7 names) +              │
│       │                     `variantOverrides` map combining        │
│       │                     colors + narrative + shadows + size +   │
│       │                     lineHeight + fontFamily per variant.    │
│       │                     ⚠ Manual rename: app's `dyslexia` ↔     │
│       │                     package's `dyslexiaFriendly`            │
│       │                                                             │
│       └──► compose.ts       `ComposedTheme` interface +             │
│                             `composeTheme(mode, variant)`           │
│                             Cartesian product → 14 themes           │
│                             Inline TextStyles preset construction   │
│                                                                     │
│  index.ts                   barrel                                  │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            │   `themes` map registered with
                            │   UnistylesRegistry
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Runtime                                                             │
│   ─ StyleSheet.create((theme) => …)  reactive to theme switch       │
│   ─ useUnistyles() hook                                             │
│   ─ UnistylesRuntime.setTheme(name) switches                        │
│   ─ src/hooks/useTheme.ts wraps it + ThemeProvider context          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## What's actually consumed

| Concept                                                       | Package output                              | Consumed by native-rd?                   | How it's reached in screens                            |
| ------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------- | ------------------------------------------------------ |
| Base palette (`primary`, `accent-yellow`, …)                  | `palette.ts`                                | Yes — via `palette` re-export in adapter | indirect (used for app palette aliases)                |
| Primitive tokens (`space`, `size`, `radius`, `fontWeight`, …) | `tokens.ts`                                 | Yes                                      | `theme.space[4]`, `theme.size.lg`                      |
| Color modes (light/dark base)                                 | `colorModes.ts` (package)                   | Yes — `lightColors`/`darkColors`         | `theme.colors.background`, `.text`, `.accentYellow`, … |
| Variants (color overrides)                                    | `variants.ts` (package)                     | Yes                                      | merged into `theme.colors` via `composeTheme`          |
| Narrative (climb/drop/stories/relief)                         | `narrative.ts`                              | Yes                                      | `theme.narrative.climb.bg`                             |
| **Chrome** (header / topBar / tabBar / modal)                 | `semanticColors.ts` → `chromeColors`        | **No** — sitting unused                  | n/a                                                    |
| **Action** (primary/secondary/destructive bg+fg)              | `semanticColors.ts` → `actionColors`        | **No** — unused                          | n/a                                                    |
| **SurfaceBorder**                                             | `semanticColors.ts`                         | **No** — unused                          | n/a                                                    |
| **Journey** (goal/step states)                                | `semanticColors.ts`                         | **No** — unused                          | n/a                                                    |
| **BadgeReward**                                               | `semanticColors.ts`                         | **No** — unused                          | n/a                                                    |
| **TypographyRole**                                            | `semanticColors.ts`                         | **No** — unused                          | n/a                                                    |
| Shadows                                                       | `tokens.ts` (`shadow.hardSm/hardMd/hardLg`) | Yes — via `shadowStyle()` helper         | `…shadowStyle(theme, "hardMd")`                        |

---

## Friction points — where it gets weird

1. **Six semantic color categories built in the package, none consumed by native-rd.** `chrome`, `action`, `surfaceBorder`, `journey`, `badgeReward`, `typographyRole` are typed and exported in `semanticColors.ts`, with proper per-mode and per-variant overrides in the source theme JSON. Native-rd reaches into `theme.colors.accentYellow` directly instead. Work that's already done at the package level is unwired at the app level.

2. **The `Colors` interface is redeclared in `apps/native-rd/src/themes/colorModes.ts`.** It's a hand-typed mirror of what the package already exports as `Colors`. Drift risk: add a field in the package, native-rd won't pick it up until you also add it in `colorModes.ts`.

3. **Variant name mismatch.** Package: `dyslexiaFriendly`. App: `dyslexia`. Manual rename in `apps/native-rd/src/themes/variants.ts` (`variants.ts:73`).

4. **Adapter rebinds everything via `pkgX → X`.** Per the convention "single import boundary," every package import is `import { X as pkgX } from "..."` then `export const X = pkgX`. For tokens that need transformation (`lightColors`, computed `lineHeight`) this earns its keep. For pass-throughs (most of them) it is pure ceremony.

5. **`tokens.ts` is a second re-export layer.** It imports from `adapter.ts` and re-exports the same names. Two-step pass-through.

6. **Three separate build scripts.** Style Dictionary + custom themes builder + custom unistyles builder (~928 LOC, hand-written). The unistyles builder reproduces type-safe outputs that Style Dictionary could likely emit directly with a custom format.

7. **`compose.ts` does the Cartesian product manually** (mode × variant → 14). The text-style presets are constructed inline in `composeTheme()` rather than living in tokens.

---

## Implication for "fix the headers" work

The chrome system **already exists in the package** with sensible per-theme overrides:

- `chromeTopBarBg` / `chromeTopBarFg` — the yellow brand chrome (light `#ffe50c`, high-contrast `#ffffff`, dyslexia `#f5e6a0`, autism `#d5c88a`, low-info `#ffffff`).
- `chromeHeaderBg` / `chromeHeaderFg` / `chromeHeaderBorder` — the secondary header surface.
- `chromeModalBg` etc. — modal surfaces.

Two values in source JSON still need updating (currently inherit yellow where they shouldn't):

- `dark.json` — `chrome-top-bar-bg: #ffe50c` (still bright yellow on dark navy)
- `low-vision.json` — `chrome-top-bar-bg: #ffe50c` (variant uses `#003d99` accent elsewhere)

To use any of this from native-rd, the wiring needed is at minimum: `compose.ts` reads chrome from adapter, exposes as `theme.chrome.*` on the composed theme. Anything beyond that (rebinding through `colorModes.ts` / `variants.ts`) is the same kind of friction this map documents — avoid it.
