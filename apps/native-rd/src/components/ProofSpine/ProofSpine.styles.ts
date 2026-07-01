import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  container: {
    gap: theme.space[2],
  },
  header: {
    fontSize: theme.size.xs,
    color: theme.colors.textMuted,
    fontFamily: theme.fontFamily.mono,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  scrollContent: {
    gap: theme.space[2],
    paddingVertical: theme.space[1],
  },
  emptyState: {
    padding: theme.space[4],
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    borderStyle: "dashed",
    borderRadius: theme.radius.sm,
  },
  emptyStateText: {
    fontSize: theme.size.sm,
    color: theme.colors.textMuted,
    fontFamily: theme.fontFamily.body,
  },
}));
