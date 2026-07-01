import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";
import type { Evidence } from "../../themes/adapter";

export const styles = StyleSheet.create((theme) => ({
  container: (bgKey: keyof Evidence) => ({
    flexDirection: "column" as const,
    justifyContent: "space-between" as const,
    gap: theme.space[1],
    // Fixed width gives the horizontal scroller a consistent card rhythm; the
    // 44pt floors satisfy the minimum touch-target contract on both axes.
    width: 140,
    minWidth: 44,
    minHeight: 108,
    padding: theme.space[2],
    backgroundColor: theme.evidence[bgKey],
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    ...shadowStyle(theme, "cardElevationSmall"),
  }),
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  icon: {
    fontSize: 32,
  },
  name: (fgKey: keyof Evidence) => ({
    fontSize: theme.size.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.evidence[fgKey],
    fontFamily: theme.fontFamily.body,
  }),
  typeTag: (fgKey: keyof Evidence) => ({
    fontSize: theme.size.xs,
    color: theme.evidence[fgKey],
    fontFamily: theme.fontFamily.mono,
    textTransform: "uppercase" as const,
  }),
}));
