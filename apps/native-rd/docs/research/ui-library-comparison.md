# UI Library Research: React Native for Neurodivergent-First App

**Date:** 2026-02-02
**Status:** Research complete, decision pending
**Context:** Choosing the component/styling foundation for the native rollercoaster.dev app

---

## Requirements

The native app needs:

1. **Deep theming** — 7+ runtime-switchable themes (dark, high-contrast, large-text, dyslexia-friendly, autism-friendly, low-vision, low-info-density)
2. **Accessibility-first** — WCAG AA minimum, screen reader support, keyboard nav, reduced motion, content density options, focus management
3. **Cross-platform potential** — ideally share design tokens with the Vue monorepo's `openbadges-ui`
4. **Expo managed workflow** compatibility
5. **Custom font support** — OpenDyslexic, Anybody (headlines), DM Mono, Atkinson Hyperlegible

The existing monorepo uses a three-tier CSS custom property system:

- **Foundational** — primitive values (palette, fonts, spacing)
- **Semantic** — context tokens (`--ob-primary`, `--ob-background`)
- **Component** — per-component overrides (`--ob-badge-background`)

---

## Top Contenders

### Tamagui

**GitHub:** ~13.6k stars | **Latest:** v2.0.0-rc.0 (Jan 2026) | **Actively maintained**

**Strengths:**

- Three-tier token architecture (`createTokens` → `createThemes` → variants) directly mirrors our CSS custom property system
- Runtime theme switching with smart re-rendering (only updates when accessed keys change)
- 50+ components (buttons, forms, cards, navigation, modals)
- Best-in-class performance — optimizing compiler flattens components at build time (30-40% faster load, 3x render speed)
- Exports CSS variables on web — potential path to sharing tokens with Vue monorepo
- Custom font support via `createFont` configuration
- Universal React Native + Web compilation
- Styled and unstyled component variants

**Weaknesses:**

- Accessibility is manual — every ARIA label, focus trap, screen reader hint must be added by hand
- Steep learning curve (compiler concepts, optimization strategies)
- No direct Vue compatibility (React-only components, but CSS variables exportable)

**ND Theme Assessment:**
| Theme | Support |
|-------|---------|
| Dark | Built-in |
| High Contrast | Custom tokens |
| Large Text | Font tokens |
| Dyslexia-Friendly | Custom fonts (OpenDyslexic via createFont) |
| Autism-Friendly | Color tokens (muted palette) |
| Low Vision | Spacing/size tokens |
| Low Info Density | Spacing tokens |
| Runtime Switching | Smart re-renders |

---

### Gluestack UI v2 + NativeWind v4

**GitHub:** ~4.9k + ~7.6k stars | **Latest:** v4.0.0-alpha (Jan 2026) | **Actively maintained**

**Strengths:**

- Built on `@react-native-aria` — accessibility is automatic (focus trapping, screen reader labels, keyboard nav, WCAG AA out of the box)
- 40+ production-ready accessible components
- NativeWind v4 CSS variables support runtime theme switching
- Tailwind-based theming enables rapid iteration on theme variants
- `tailwind.config.js` can be shared with web projects (token layer)
- Copy-paste component model gives full control over customization
- Designed for Expo managed workflow

**Weaknesses:**

- Copy-paste component approach (more maintenance than npm package)
- NativeWind adds Tailwind learning curve
- Less performant than Tamagui's compiler (76ms vs 70ms mount benchmark)
- Cannot share components with Vue (only Tailwind config/tokens)

**ND Theme Assessment:**
| Theme | Support |
|-------|---------|
| Dark | NativeWind auto |
| High Contrast | Tailwind classes |
| Large Text | Tailwind text sizes |
| Dyslexia-Friendly | Custom fonts supported |
| Autism-Friendly | Tailwind palette |
| Low Vision | Tailwind utilities |
| Low Info Density | Tailwind spacing |
| Runtime Switching | CSS variables |

---

## Also Evaluated

### React Native Paper (14.3k stars)

- Most comprehensive components (60+), excellent accessibility (WCAG 2.1 AA)
- **Rejected:** Material Design lock-in conflicts with custom ND themes. High contrast, muted palettes, and autism-friendly aesthetics fight Material Design's opinionated visual language.

### React Native Unistyles (2.8k stars)

- Zero JS re-renders on theme changes (C++ layer optimization)
- Styling-only — needs pairing with component library
- **Interesting as performance layer** but adds complexity of managing two libraries

### NativeWind v4 standalone (7.6k stars)

- Excellent theming with CSS variables, Tailwind config shareable with web
- Styling-only — no components. Best used with Gluestack UI v2.

### Dripsy (2.1k stars)

- Theme-UI inspired, responsive arrays
- **Passed:** Less active community, minimal component set, no accessibility features

### Shopify Restyle (3.4k stars)

- Type-enforced theme system, used in Shopify's production app
- **Passed:** No pre-built components, requires building entire component library

---

## Core Trade-off

|                    | Tamagui                                       | Gluestack + NativeWind       |
| ------------------ | --------------------------------------------- | ---------------------------- |
| **Theming**        | Best architecture (mirrors our 3-tier system) | Good (Tailwind + CSS vars)   |
| **Accessibility**  | Manual (significant work)                     | Automatic (built-in WCAG AA) |
| **Performance**    | Best (compiler optimization)                  | Good (slightly behind)       |
| **Components**     | 50+ styled/unstyled                           | 40+ all accessible           |
| **Learning curve** | Steep                                         | Moderate                     |
| **Token sharing**  | CSS variable export                           | Tailwind config sharing      |
| **Maintenance**    | npm package                                   | Copy-paste model             |

**The tension:** Tamagui has the best theming architecture and performance. Gluestack has the best accessibility with the least manual work. Since neurodivergent-first accessibility is our non-negotiable differentiator, Gluestack's automatic accessibility has a real advantage — but Tamagui's token system is a better architectural match.

---

## Hybrid Possibility

**Unistyles + Gluestack UI v2** — Use Unistyles for zero-rerender theming and Gluestack for accessible components. Gets best of both worlds but adds architectural complexity of coordinating two systems.

---

## Design Token Sharing Strategy

Regardless of library choice, sharing tokens between the React Native app and the Vue monorepo requires:

1. **Single source of truth** — JSON token file defining all foundational + semantic tokens
2. **Style Dictionary** (or similar) — transforms tokens into platform-specific formats:
   - CSS custom properties for Vue/web (`openbadges-ui`)
   - JS theme objects for React Native (Tamagui or NativeWind)
3. **Shared Tailwind config** (if NativeWind) — `tailwind.config.js` can be consumed by both platforms

This token sharing layer should live in a shared package (e.g., `@rollercoaster-dev/design-tokens`).

---

## Open Questions

1. **Prototype both?** — Build a single screen (badge card with theme switching) in both Tamagui and Gluestack to evaluate real-world DX
2. **Accessibility audit** — How much manual work does Tamagui actually require for our 7 themes?
3. **Token extraction** — Can we extract the existing `openbadges-ui` CSS tokens into a shared JSON format as a starting point?
4. **Unistyles hybrid** — Is the complexity of Unistyles + Gluestack worth the performance gain for theme switching?

---

## Recommendation

**Defer final decision until prototyping.** Both Tamagui and Gluestack + NativeWind are strong candidates. The decision should be informed by:

- A prototype of badge display + theme switching in each
- Accessibility audit of the Tamagui prototype (how much manual work?)
- Token sharing proof-of-concept between the chosen library and `openbadges-ui`

**Leaning:** Gluestack + NativeWind for accessibility-first development, with potential migration to Tamagui if performance becomes a bottleneck as the skill tree visualization grows.

---

_Research conducted 2026-02-02. Sources include GitHub repos, official docs, LogRocket, Expo blog, and community benchmarks._
