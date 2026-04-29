import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

const sizeMap = {
  sm: { paddingH: "3", paddingV: "1", fontSize: "sm", minHeight: 36 },
  md: { paddingH: "4", paddingV: "2", fontSize: "md", minHeight: 44 },
  lg: { paddingH: "5", paddingV: "3", fontSize: "lg", minHeight: 52 },
} as const;

export const styles = StyleSheet.create((theme) => ({
  pressable: (size: ButtonSize = "md") => ({
    // WCAG AA requires 44x44 minimum touch target; we use 48px minimum for better UX
    minHeight: Math.max(sizeMap[size].minHeight, 48),
    borderRadius: theme.radius.md,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: theme.space[sizeMap[size].paddingH],
    paddingVertical: theme.space[sizeMap[size].paddingV],
    gap: theme.space[2],
  }),
  variantPrimary: {
    backgroundColor: theme.colors.accentPrimary,
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.accentPrimary,
    ...shadowStyle(theme, "cardElevation"),
  },
  variantSecondary: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    ...shadowStyle(theme, "cardElevation"),
  },
  variantGhost: {
    backgroundColor: "transparent",
    borderWidth: theme.borderWidth.thick,
    borderColor: "transparent",
  },
  variantDestructive: {
    backgroundColor: theme.colors.warning,
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.text,
    ...shadowStyle(theme, "cardElevation"),
  },
  pressed: {
    transform: [{ translateX: 2 }, { translateY: 2 }],
    shadowOffset: { width: 1, height: 1 },
  },
  disabled: {
    opacity: 0.4,
  },
  label: (size: ButtonSize = "md") => ({
    fontSize: theme.size[sizeMap[size].fontSize],
    fontWeight: theme.fontWeight.bold,
    fontFamily: theme.fontFamily.body,
  }),
  labelPrimary: {
    color: theme.colors.background,
  },
  labelSecondary: {
    color: theme.colors.text,
  },
  labelGhost: {
    color: theme.colors.text,
  },
  labelDestructive: {
    // Use dark text on warning background for better contrast
    // Light mode: #262626 on #d97706 = 4.75:1 ✓
    // Dark mode: #262626 on #d97706 = 4.75:1 ✓ (better than #fafafa = 3.05:1 ✗)
    // eslint-disable-next-line local/no-raw-colors -- contrast-verified exception, see ratios above
    color: "#262626",
  },
}));
