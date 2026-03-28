# ADR-0002: UI Styling Library

**Date:** 2026-02-03
**Status:** Accepted
**Owner:** Joe

---

## Context

The native rollercoaster.dev app requires a styling solution that supports:

1. **7 neurodiversity-focused accessibility themes** with frequent runtime switching
2. Performance suitable for mobile devices
3. React Native + Expo compatibility
4. Maintainable, scalable styling patterns

We built two prototypes to evaluate options:
- `prototypes/ui-tamagui` — Tamagui with token-based theming
- `prototypes/ui-nativewind` — NativeWind with Tailwind CSS approach

Both prototypes successfully implemented the 7-theme system with BadgeCard and ThemeSwitcher components.

## Research

While evaluating prototypes, we reviewed Vercel's v0 iOS app architecture ([How We Built the v0 iOS App](https://vercel.com/blog/how-we-built-the-v0-ios-app)). Key finding:

> "Shared values let us update state without triggering re-renders."

The v0 team chose **react-native-unistyles** specifically because it provides theming without React Context, avoiding re-renders on theme changes.

## Decision

Use **react-native-unistyles** for styling instead of Tamagui or NativeWind.

## Comparison

| Requirement | Tamagui | NativeWind | Unistyles |
|-------------|---------|------------|-----------|
| Theme switching without re-renders | ❌ Context-based | ❌ Context-based | ✅ Native layer |
| 7 accessibility themes | ⚠️ Re-renders on switch | ⚠️ Re-renders on switch | ✅ Zero re-renders |
| Bundle size | ⚠️ ~150kb | ✅ ~20kb | ✅ ~15kb |
| Production proven at scale | ✅ | ✅ | ✅ (v0 iOS) |
| Component library included | ✅ | ❌ | ❌ |
| Learning curve | ⚠️ Complex | ✅ Tailwind familiar | ✅ Simple |

## Rationale

1. **Theme switching is a core interaction** — Users with different accessibility needs will switch themes frequently. Context-based re-renders degrade this experience.

2. **Vercel validated the approach** — The v0 iOS app targets Apple Design Award quality and chose Unistyles for the same reasons we need it.

3. **Simpler mental model** — Unistyles is styling-focused, not a component library. We build our own components with native primitives (per v0's approach).

4. **The prototypes weren't wasted** — Theme tokens, component structure, and accessibility patterns transfer directly. Only the styling API changes.

## Consequences

**Positive:**
- Zero re-render theme switching for 7 accessibility themes
- Smaller bundle size than Tamagui
- Aligns with production-proven v0 architecture
- Simpler dependency (styling only, not a component framework)

**Negative / Risks:**
- No built-in component library (we build our own)
- Less community resources than Tamagui or NativeWind
- Prototype code needs adaptation (styling API differs)

**Mitigations:**
- Use native components where possible (native modals, Zeego for menus)
- Adopt complementary libraries from v0 stack (LegendList, Reanimated, Tanstack Query)
- Theme tokens from prototypes transfer to Unistyles themes

## Recommended Stack

Based on v0 architecture research:

| Layer | Library |
|-------|---------|
| Styling | react-native-unistyles |
| Lists | LegendList |
| Animation | React Native Reanimated |
| Menus | Zeego |
| Data fetching | Tanstack Query |

## Related Documents

- [Vercel React Native Insights](../../research/vercel-react-native-insights.md)
- [ADR-0001: Iteration Strategy](./ADR-0001-iteration-strategy.md)
- [UI Library Comparison](../research/ui-library-comparison.md)

---

_Accepted 2026-02-03. Zero re-renders, zero compromises._
