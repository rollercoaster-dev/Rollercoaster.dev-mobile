import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

// Zero hardcoded hex. Mirrors BadgeOverflowMenu's popover tokens (#412):
//   menu surface -> surfaceBorder.surfaceCardBg, hard border -> borderStrong,
//   destructive Delete label -> colors.error.
export const styles = StyleSheet.create((theme) => ({
  // Menu content only — positioning (popover under ⋯ vs. modal) and the
  // confirm-delete flow are the caller's concern (D7). A neo-brutalist card
  // the [Integrate] issue drops into its container.
  menu: {
    minWidth: 220,
    backgroundColor: theme.surfaceBorder.surfaceCardBg,
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.surfaceBorder.borderStrong,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
    ...shadowStyle(theme, "cardElevation"),
  },
  row: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[3],
    paddingVertical: theme.space[3],
    paddingHorizontal: theme.space[4],
  },
  rowPressed: {
    opacity: 0.7,
  },
  // Delete is the sole row and destructive — icon + label in error red.
  deleteLabel: {
    color: theme.colors.error,
    fontWeight: theme.fontWeight.bold,
  },
}));
