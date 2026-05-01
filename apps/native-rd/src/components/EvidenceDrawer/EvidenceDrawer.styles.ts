import { StyleSheet } from "react-native-unistyles";
import { palette } from "../../themes/palette";
import { PILL_LIFT } from "../../navigation/FocusPillTabBar";

/** Visible peek height above the lifted pill — handle, label, FAB. */
export const PEEK_HEIGHT = 56;

/** Drawer's closed total height. The bottom `PILL_LIFT` is hidden behind
 * the lifted tab bar pill so the drawer's bg merges seamlessly with the
 * pill instead of leaving a transparent strip. */
export const DRAWER_CLOSED_HEIGHT = PEEK_HEIGHT + PILL_LIFT;

export const styles = StyleSheet.create((theme) => ({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: `${theme.colors.shadow}cc`,
    zIndex: 20,
  },
  overlayPressable: {
    flex: 1,
  },
  drawer: (isGoal: boolean) => ({
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background,
    borderTopWidth: isGoal ? 3 : theme.borderWidth.medium,
    borderTopColor: isGoal ? palette.yellow300 : theme.colors.border,
    borderLeftWidth: theme.borderWidth.thin,
    borderRightWidth: theme.borderWidth.thin,
    borderLeftColor: theme.colors.border,
    borderRightColor: theme.colors.border,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    zIndex: 21,
    overflow: "hidden" as const,
  }),
  handleArea: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingVertical: theme.space[3],
    paddingHorizontal: theme.space[4],
    minHeight: PEEK_HEIGHT,
  },
  handleLeft: {
    flexDirection: "column" as const,
    alignItems: "center" as const,
    flex: 1,
    gap: theme.space[1],
  },
  handleBar: (isGoal: boolean) => ({
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: isGoal ? palette.yellow300 : theme.colors.textMuted,
  }),
  handleLabel: {
    fontSize: theme.size.sm,
    color: theme.colors.textSecondary,
    fontFamily: theme.fontFamily.body,
    fontWeight: theme.fontWeight.bold,
  },
  scrollView: {
    flex: 1,
  },
  grid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: theme.space[2],
    paddingTop: 0,
    paddingHorizontal: theme.space[4],
    paddingBottom: theme.space[6],
  },
  gridItem: (width: number) => ({
    width,
  }),
  emptyText: {
    fontSize: theme.size.sm,
    color: theme.colors.textMuted,
    fontFamily: theme.fontFamily.body,
    fontStyle: "italic",
    textAlign: "center",
    width: "100%",
    paddingVertical: theme.space[4],
  },
  fabMenuContainer: {
    alignItems: "flex-end" as const,
    paddingHorizontal: theme.space[4],
    paddingBottom: theme.space[2],
  },
}));
