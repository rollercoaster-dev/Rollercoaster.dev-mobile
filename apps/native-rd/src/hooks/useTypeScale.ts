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
 * The app's only reader of the OS font scale. `useWindowDimensions` re-renders
 * when the user changes Dynamic Type; `PixelRatio.getFontScale()` does not.
 *
 * `scaleFor(role)` is the multiplier RN actually applies to that role's
 * theme size once its cap kicks in — use it for layout math that has to
 * track rendered text (e.g. a badge sized to its text column).
 */
export function useTypeScale() {
  const { fontScale } = useWindowDimensions();
  const { theme } = useUnistyles();
  const themeScale = themeScaleOf(theme.size);

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
