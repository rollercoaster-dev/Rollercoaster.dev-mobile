# ND Themes: the Seven Product Themes

**Status:** Current — the theme inventory. Other docs link here instead of restating it.
**Source of truth:** `src/themes/compose.ts` (`productThemeEntries`, `composeTheme`) and `src/themes/variants.ts`; display names in `src/i18n/resources/*/common.json` → `theme.options`.
**Kept honest by:** `src/themes/__tests__/themeInventoryDocs.test.ts`, which fails if the inventory table below drifts from runtime.

---

## Overview

The app ships **seven peer themes**. Each is a `ComposedTheme` built by `composeTheme(colorMode, variant)` and registered with Unistyles; the same seven are the only names persistence accepts (`VALID_THEME_NAMES` in `src/hooks/useTheme.ts`).

Night Ride (`dark-default`) is one of the seven — dark is a theme a person picks, not a second axis applied to every variant. The accessibility variants are authored for light mode only.

`composeTheme` can still build any `{colorMode}-{variant}` pair, including the `largeText` variant and `dark-<variant>` combinations. Those exist for tests and previews; they are **not** product themes, never appear in the picker, and are rejected by persistence.

---

## Inventory

<!-- theme-inventory:start -->

| Theme id               | Name          | Purpose                  | Body font             | Headline font         | Size scale      | Line height   | Elevation           |
| ---------------------- | ------------- | ------------------------ | --------------------- | --------------------- | --------------- | ------------- | ------------------- |
| `light-default`        | The Full Ride | Standard theme           | Instrument Sans       | Anybody               | `size`          | `lineHeight`  | Hard offset shadows |
| `dark-default`         | Night Ride    | Dark mode                | Instrument Sans       | Anybody               | `size`          | `lineHeight`  | 6pt drop cutout     |
| `light-highContrast`   | Bold Ink      | High contrast (WCAG AAA) | Instrument Sans       | Anybody               | `size`          | `lineHeight`  | None — borders only |
| `light-dyslexia`       | Warm Studio   | Dyslexia-friendly        | Lexend                | Lexend                | `size`          | `lineHeightL` | Soft low shadows    |
| `light-autismFriendly` | Still Water   | Autism-friendly          | Instrument Sans       | Anybody               | `size`          | `lineHeight`  | None — borders only |
| `light-lowVision`      | Loud & Clear  | Low vision support       | Atkinson Hyperlegible | Atkinson Hyperlegible | `sizeL` (1.25×) | `lineHeight`  | None — borders only |
| `light-lowInfo`        | Clean Signal  | Reduced visual noise     | Instrument Sans       | Anybody               | `size`          | `lineHeight`  | Hard offset shadows |

<!-- theme-inventory:end -->

Order matches the picker (`themeOptions`). Mono text uses DM Mono in every theme.

- **Fonts.** A variant font replaces both body and headline. OpenDyslexic ships in `assets/fonts/` but no product theme uses it.
- **Size scale.** `sizeL` multiplies the type scale by 1.25 (`md` 16 → 20). See [Design Language → Typography](./design-language.md#typography).
- **Line height.** `lineHeightL` raises `theme.lineHeight` for Warm Studio. The `theme.textStyles` presets do not read it yet — tracked in [#684](https://github.com/rollercoaster-dev/Rollercoaster.dev-mobile/issues/684).
- **Elevation.** Every theme exposes the same semantic shadow roles; what changes is how they render. See [Design Language → Elevation](./design-language.md#elevation).

---

## Colors

Color values are **not** copied into this doc — hand-copied hex tables drifted from the generated tokens and misled contributors. Read them from:

- **Storybook:** _Design System / Colors_ (switch theme in the toolbar) and _Design System / Contrast Audit_.
- **Token sources:** `packages/design-tokens/src/tokens/` — base palette and color modes in `colors.json` / `semantic.json`; role groups in `chrome.json`, `action.json`, `surface-border.json`, `journey.json`, `evidence.json`, `narrative.json`. Per-variant overrides live alongside each group.
- **Generated output:** `packages/design-tokens/build/unistyles/`, consumed only through `src/themes/adapter.ts`.

The role groups on a composed theme are `colors`, `chrome`, `action`, `surfaceBorder`, `journey`, `evidence` and `narrative`. Components read roles (`theme.action.actionPrimaryBg`, `theme.surfaceBorder…`), never hex values.

---

## Theme Switching

```typescript
import { useThemeContext } from "../hooks/useTheme";

const { setTheme } = useThemeContext();

// Returns false if persisting the choice failed; surface a toast.
const saved = setTheme("light-dyslexia");
```

`StyleSheet.configure({ themes })` in `unistyles.ts` registers the seven composed themes once at startup, and `StyleSheet.create((theme) => …)` styles re-resolve on every switch.

---

## Testing Matrix

UI changes are checked against all seven product themes:

- [ ] `light-default` — The Full Ride
- [ ] `dark-default` — Night Ride
- [ ] `light-highContrast` — Bold Ink
- [ ] `light-dyslexia` — Warm Studio
- [ ] `light-autismFriendly` — Still Water
- [ ] `light-lowVision` — Loud & Clear
- [ ] `light-lowInfo` — Clean Signal

Additionally:

- [ ] OS Dynamic Type at 200% and the largest accessibility size, against the caps in [Text Scaling](../accessibility-guidelines.md#text-scaling)
- [ ] OS Bold Text enabled
- [ ] OS Reduce Motion enabled
- [ ] VoiceOver (iOS) and TalkBack (Android)

The Storybook toolbar lists exactly these seven, so stories can be swept per theme.

---

## Related Documents

- [Design Language](./design-language.md) — the component contract: typography, elevation, borders, action states
- [Design Token System](../architecture/design-token-system.md) — package architecture
- [Design Principles](../vision/design-principles.md) — philosophy and rules
