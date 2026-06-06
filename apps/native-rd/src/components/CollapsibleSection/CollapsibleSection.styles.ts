import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

export const styles = StyleSheet.create((theme) => ({
  container: {
    gap: 0,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: 0,
    ...shadowStyle(theme, "cardElevation"),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3],
    gap: theme.space[3],
    // Reserve focus-ring space so focus gain/loss only swaps borderColor,
    // never width — prevents a layout jump that would shift touch targets.
    borderWidth: theme.borderWidth.medium,
    borderColor: "transparent",
  },
  headerPressed: {
    opacity: 0.7,
  },
  headerFocused: {
    borderColor: theme.colors.focusRing,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[2],
    flexShrink: 1,
    marginLeft: theme.space[2],
  },
  title: {
    fontSize: theme.size.sm,
    fontWeight: theme.fontWeight.bold,
    fontFamily: theme.fontFamily.headline,
    textTransform: "uppercase",
    letterSpacing: theme.letterSpacing.wide,
    color: theme.colors.text,
  },
  summary: {
    fontSize: theme.size.xs,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.textSecondary,
    flexShrink: 1,
  },
  chevron: {
    fontSize: theme.size.md,
    color: theme.colors.textMuted,
  },
  content: {
    paddingHorizontal: theme.space[4],
    paddingTop: 0,
    paddingBottom: theme.space[4],
    gap: theme.space[3],
  },
}));
