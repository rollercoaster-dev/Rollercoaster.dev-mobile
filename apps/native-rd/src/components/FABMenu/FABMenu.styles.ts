import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

export const styles = StyleSheet.create((theme) => ({
  container: {
    minWidth: 200,
    ...shadowStyle(theme, "modalElevation"),
  },
  itemList: {
    gap: theme.space[1],
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[3],
    paddingVertical: theme.space[2],
    paddingHorizontal: theme.space[3],
    minHeight: 44,
    borderRadius: theme.radius.md,
  },
  menuItemPressed: {
    backgroundColor: theme.colors.backgroundTertiary,
    opacity: 0.7,
  },
  menuIcon: {
    fontSize: theme.size.lg,
    width: theme.space[6],
    textAlign: "center",
  },
  menuLabel: {
    fontSize: theme.size.sm,
    color: theme.colors.text,
    fontFamily: theme.fontFamily.body,
    fontWeight: theme.fontWeight.semibold,
  },
}));
