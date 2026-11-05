import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

export const styles = StyleSheet.create((theme) => ({
  container: {
    position: "absolute" as const,
    bottom: 56,
    left: theme.space[4],
    right: theme.space[4],
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: theme.space[3],
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingVertical: theme.space[3],
    paddingHorizontal: theme.space[4],
    ...shadowStyle(theme, "modalElevation"),
  },
  // Accessibility sizes: message on top, action below it (#751).
  containerStacked: {
    flexDirection: "column" as const,
    alignItems: "stretch" as const,
  },
  message: {
    flex: 1,
    fontWeight: theme.fontWeight.bold,
  },
  // In a column, flex:1 would size the message from a zero basis; size it to
  // its text instead.
  messageStacked: {
    flex: 0,
  },
  actionButton: {
    backgroundColor: theme.colors.warning,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingVertical: theme.space[1],
    paddingHorizontal: theme.space[3],
    minHeight: 44,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  actionButtonStacked: {
    alignSelf: "flex-start" as const,
  },
  actionLabel: {
    fontWeight: theme.fontWeight.bold,
  },
}));
