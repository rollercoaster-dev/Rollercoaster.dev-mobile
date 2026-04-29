import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

const CHIP_HEIGHT = 72;
export const COLUMN_COUNT = 4;

export const styles = StyleSheet.create((theme) => ({
  grid: {
    gap: theme.space[2],
  },
  row: {
    flexDirection: "row",
    gap: theme.space[2],
  },
  chip: {
    flex: 1,
    height: CHIP_HEIGHT,
    borderRadius: theme.radius.md,
    borderWidth: theme.borderWidth.medium,
    overflow: "hidden",
  },
  chipPlaceholder: {
    flex: 1,
  },
  chipUnselected: {
    borderColor: theme.colors.border,
    ...shadowStyle(theme, "cardElevationSmall"),
  },
  chipSelected: {
    borderColor: theme.colors.focusRing,
    borderWidth: 3,
    ...shadowStyle(theme, "cardElevation"),
  },
  stripeRow: {
    flex: 1,
    flexDirection: "row",
  },
  nameBar: {
    paddingVertical: theme.space[1],
    paddingHorizontal: theme.space[1],
    borderTopWidth: 1,
  },
  nameText: {
    fontSize: 9,
    fontWeight: theme.fontWeight.bold,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    textAlign: "center",
    lineHeight: 11,
  },
}));
