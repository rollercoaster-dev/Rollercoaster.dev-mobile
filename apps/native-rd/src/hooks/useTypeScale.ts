import { useCallback } from "react";
import { useWindowDimensions } from "react-native";
import { useUnistyles } from "react-native-unistyles";
import {
  ACCESSIBILITY_SIZE_AT,
  LARGE_TYPE_AT,
  capForRole,
  themeScaleOf,
  type TypeRole,
} from "../utils/typeScale";

/**
 * The active theme's type scale (1.25 for Low Vision) without subscribing to
 * window dimensions. Shared `Text` and `Input` only need this to set their
 * cap; RN applies the OS scale natively, so they need not re-render on it.
 */
export function useThemeScale(): number {
  const { theme } = useUnistyles();
  return themeScaleOf(theme.size);
}

/**
 * The app's only reader of the OS font scale. `useWindowDimensions` re-renders
 * when the user changes Dynamic Type; `PixelRatio.getFontScale()` does not.
 *
 * `scaleFor(role)` is the multiplier RN applies to that role's theme size
 * once its cap kicks in — use it for layout math that has to track rendered
 * text (e.g. a badge sized to its text column). Exact on iOS. Android 14+
 * scales large sp sizes non-linearly, so there it is an upper bound.
 */
export function useTypeScale() {
  const { fontScale: rawFontScale } = useWindowDimensions();
  const fontScale =
    Number.isFinite(rawFontScale) && rawFontScale > 0 ? rawFontScale : 1;
  const themeScale = useThemeScale();

  const scaleFor = useCallback(
    (role: TypeRole) => Math.min(fontScale, capForRole(role, themeScale)),
    [fontScale, themeScale],
  );

  return {
    fontScale,
    isLargeType: fontScale >= LARGE_TYPE_AT || themeScale > 1,
    isAccessibilitySize: fontScale >= ACCESSIBILITY_SIZE_AT,
    themeScale,
    scaleFor,
  };
}
