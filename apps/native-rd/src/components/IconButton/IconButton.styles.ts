import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

export type IconButtonSize = "sm" | "md" | "lg";
export type IconButtonVariant = "default" | "ghost" | "destructive";

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
  variantDefault: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    ...shadowStyle(theme, "hardSm"),
  },
  variantGhost: {
    backgroundColor: "transparent",
  },
  variantDestructive: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    ...shadowStyle(theme, "hardSm"),
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
}));
