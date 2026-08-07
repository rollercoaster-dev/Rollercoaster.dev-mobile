import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

// The form styling this module used to own moved into EditGoalView, which is
// the screen host now (#446/D1). What's left is the goal-not-found fallback,
// the Suspense spinner, and the ⋯ overflow popover's chrome (D7).
export const styles = StyleSheet.create((theme) => ({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.space[4],
  },
  loadingIndicator: {
    marginTop: theme.space[8],
  },
  // Overflow popover (D7): scrim + bottom-anchored card, mirroring the
  // nest-under picker in EditGoalStepRow.
  overflowOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    padding: theme.space[4],
  },
  overflowContainer: {
    width: "100%",
  },
  overflowCard: {
    backgroundColor: theme.colors.background,
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.space[4],
    gap: theme.space[3],
    ...shadowStyle(theme, "cardElevation"),
  },
}));
