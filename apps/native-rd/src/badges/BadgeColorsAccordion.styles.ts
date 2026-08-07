import { StyleSheet } from "react-native-unistyles";

const SWATCH_SIZE = 44;
const TAB_CHIP_SIZE = 22;

export const styles = StyleSheet.create((theme) => ({
  root: {
    gap: theme.space[3],
  },
  tabBar: {
    flexDirection: "row",
    gap: theme.space[2],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.space[1],
    paddingVertical: theme.space[2],
    borderBottomWidth: 3,
    minHeight: 56,
  },
  tabChip: {
    width: TAB_CHIP_SIZE,
    height: TAB_CHIP_SIZE,
    borderRadius: TAB_CHIP_SIZE / 2,
  },
  tabChipRing: {
    backgroundColor: "transparent",
    borderWidth: 3,
  },
  tabChipIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  tabChipGlyph: {
    fontSize: 12,
    fontWeight: "800",
  },
  paletteRow: {
    gap: theme.space[3],
    paddingHorizontal: theme.space[1],
    alignItems: "flex-start",
  },
  cell: {
    alignItems: "center",
    minWidth: 56,
    minHeight: 72,
    gap: theme.space[1],
  },
  swatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: SWATCH_SIZE / 2,
  },
  customSwatch: {
    alignItems: "center",
    justifyContent: "center",
  },
  customGlyph: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: theme.fontFamily.body,
  },
  iconTabBody: {
    gap: theme.space[2],
  },
  opacityControl: {
    gap: theme.space[1],
  },
  opacityLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
}));
