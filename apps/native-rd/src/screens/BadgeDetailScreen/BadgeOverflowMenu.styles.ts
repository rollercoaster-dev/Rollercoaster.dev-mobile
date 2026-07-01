import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

// Zero hardcoded hex (hard acceptance gate). Token mapping to the prototype's
// overflow popover (Badge Detail C Prototype):
//   menu surface #ffffff        -> surfaceBorder.surfaceCardBg / Fg
//   hard ink border #0a0a0a     -> surfaceBorder.borderStrong
//   row divider #ececec         -> surfaceBorder.borderSubtle
//   destructive Delete #dc2626  -> colors.error
export const styles = StyleSheet.create((theme) => ({
  // Menu content only — positioning (popover under ⋯ vs. modal) is the caller's
  // concern (#380). A neo-brutalist card that #380 drops into its container.
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
  rowDivider: {
    borderBottomWidth: theme.borderWidth.medium,
    borderBottomColor: theme.surfaceBorder.borderSubtle,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowDisabled: {
    opacity: 0.4,
  },
  label: {
    color: theme.surfaceBorder.surfaceCardFg,
    fontWeight: theme.fontWeight.semibold,
  },
  // Delete is visually distinct (destructive tone) — icon + label in error red.
  deleteLabel: {
    color: theme.colors.error,
    fontWeight: theme.fontWeight.bold,
  },
}));
