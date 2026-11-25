import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

// Same card as BadgeOverflowMenu so the two ⋯ menus read as one pattern.
export const styles = StyleSheet.create((theme) => ({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  // Centred rather than anchored under the ⋯: the trigger sits on any of
  // several cards, and the title row says which goal the menu is for.
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.space[6],
  },
  menu: {
    minWidth: 240,
    maxWidth: 360,
    width: "100%",
    backgroundColor: theme.surfaceBorder.surfaceCardBg,
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.surfaceBorder.borderStrong,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
    ...shadowStyle(theme, "modalElevation"),
  },
  title: {
    paddingTop: theme.space[4],
    paddingBottom: theme.space[3],
    paddingHorizontal: theme.space[4],
    color: theme.surfaceBorder.surfaceCardFg,
    borderBottomWidth: theme.borderWidth.medium,
    borderBottomColor: theme.surfaceBorder.borderSubtle,
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
  label: {
    flexShrink: 1,
    color: theme.surfaceBorder.surfaceCardFg,
    fontWeight: theme.fontWeight.semibold,
  },
  // Destructive tone rides the icon and weight; the words stay in the card's
  // text colour because colors.error is under 4.5:1 as text on some themes.
  deleteLabel: {
    flexShrink: 1,
    color: theme.surfaceBorder.surfaceCardFg,
    fontWeight: theme.fontWeight.bold,
  },
}));
