import type { ComposedTheme } from "../themes/compose";

type ShadowKey = keyof ComposedTheme["shadow"];

/**
 * Build React Native shadow style props from a theme shadow token.
 * Hard shadows (hardSm, hardMd, hardLg) have radius: 0 for the neo-brutalist look.
 */
export function shadowStyle(theme: ComposedTheme, key: ShadowKey) {
  const s = theme.shadow[key];
  return {
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: s.offsetX, height: s.offsetY },
    shadowOpacity: s.opacity * theme.shadows.opacity,
    shadowRadius: s.radius,
  } as const;
}
