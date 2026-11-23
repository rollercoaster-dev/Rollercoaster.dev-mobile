import { StyleSheet } from "react-native-unistyles";
import { PILL_LIFT } from "../../navigation/FocusPillTabBar";

export const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    // The thumbnail strip is pinned to the bottom edge, so the screen clears
    // the half of the tab pill that sticks up above its own slot — the same
    // contract FocusModeScreen and BadgeDetailScreen use for their pinned
    // footers (#694). The slot itself already sits above the safe area.
    paddingBottom: PILL_LIFT + theme.space[3],
  },
  container: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  counterBar: {
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[2],
    borderBottomWidth: theme.borderWidth.thin,
    borderBottomColor: theme.colors.border,
    alignItems: "center",
    gap: theme.space[1],
  },
  activeTitle: {
    color: theme.colors.text,
    textAlign: "center",
  },
  counter: {
    fontSize: theme.size.sm,
    fontFamily: theme.fontFamily.mono,
    color: theme.colors.textMuted,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.space[4],
  },
  loadingIndicator: {
    flex: 1,
  },
}));
