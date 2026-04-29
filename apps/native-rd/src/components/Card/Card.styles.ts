import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";
import type { space } from "../../themes/tokens";

export type CardSize = "compact" | "normal" | "spacious";

const sizeMap: Record<CardSize, keyof typeof space> = {
  compact: "3",
  normal: "6",
  spacious: "8",
};

export const styles = StyleSheet.create((theme) => ({
  pressable: (size: CardSize = "normal") => ({
    minHeight: 48,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.space[sizeMap[size]],
    ...shadowStyle(theme, "cardElevation"),
  }),
  container: (size: CardSize = "normal") => ({
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.space[sizeMap[size]],
    ...shadowStyle(theme, "cardElevation"),
  }),
  pressed: {
    transform: [{ translateX: 2 }, { translateY: 2 }],
    shadowOffset: { width: 1, height: 1 },
  },
}));
