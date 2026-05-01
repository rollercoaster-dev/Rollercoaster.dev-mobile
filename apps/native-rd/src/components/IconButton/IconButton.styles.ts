import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";
import type { ComposedTheme } from "../../themes/compose";

export type IconButtonSize = "sm" | "md" | "lg";
export type IconButtonTone =
  | "chrome"
  | "ghost"
  | "surface"
  | "primary"
  | "destructive";

const sizeValues = {
  sm: 36,
  md: 44,
  lg: 52,
} as const;

// hitSlop expands touch target to 44pt minimum without inflating visual size
const hitSlopValues: Record<IconButtonSize, number> = {
  sm: 4,
  md: 0,
  lg: 0,
};

export const styles = StyleSheet.create((theme) => ({
  pressable: (size: IconButtonSize = "md") => ({
    width: sizeValues[size],
    height: sizeValues[size],
    borderRadius: theme.radius.sm,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    hitSlop: hitSlopValues[size],
  }),
  // Chrome and ghost are both transparent so the surface they sit on shows
  // through; the difference is which token the foreground resolves against.
  toneChrome: {
    backgroundColor: "transparent",
  },
  toneGhost: {
    backgroundColor: "transparent",
  },
  toneSurface: {
    backgroundColor: theme.action.actionSecondaryBg,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.surfaceBorder.borderDefault,
    ...shadowStyle(theme, "cardElevationSmall"),
  },
  tonePrimary: {
    backgroundColor: theme.action.actionPrimaryBg,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.surfaceBorder.borderDefault,
    ...shadowStyle(theme, "cardElevationSmall"),
  },
  toneDestructive: {
    backgroundColor: theme.action.actionDestructiveBg,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.surfaceBorder.borderDestructive,
    ...shadowStyle(theme, "cardElevationSmall"),
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
}));

// Lives in the styles module so call sites never reach for a token to set
// icon color themselves.
export function resolveIconColor(
  theme: Pick<ComposedTheme, "chrome" | "action" | "surfaceBorder">,
  tone: IconButtonTone,
): string {
  switch (tone) {
    case "chrome":
      // Foreground on the app's purple chrome band — same role as tab bar text.
      return theme.chrome.chromeTabBarFg;
    case "ghost":
      return theme.surfaceBorder.surfaceCardFg;
    case "surface":
      return theme.action.actionSecondaryFg;
    case "primary":
      return theme.action.actionPrimaryFg;
    case "destructive":
      return theme.action.actionDestructiveFg;
  }
}
