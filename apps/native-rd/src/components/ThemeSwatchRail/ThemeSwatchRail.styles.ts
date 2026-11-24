import { StyleSheet } from "react-native-unistyles";

const SWATCH_SIZE = 40;

export const styles = StyleSheet.create((theme) => ({
  // One labeled radio row per theme, stacked. Rows (not a wrapping set of
  // circles) so every option shows its name and benefit before it is picked
  // (#690), and long names / 1.25x text wrap inside the row instead of
  // pushing a swatch off-screen.
  list: {
    gap: theme.space[2],
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[3],
    minHeight: 44,
    paddingVertical: theme.space[2],
    paddingHorizontal: theme.space[3],
    borderRadius: theme.radius.sm,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  // Selected = thicker border in the text color (max contrast in every theme)
  // plus the ✓ on the swatch, so selection never relies on color alone.
  rowSelected: {
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.text,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  swatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: SWATCH_SIZE / 2,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  // Fills the circle behind the (centered) check overlay. Absolute so it stays
  // out of the swatch's flow and the check can center over it.
  stripeRow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
  },
  check: {
    fontSize: theme.size.md,
    fontWeight: theme.fontWeight.bold,
  },
  text: {
    flex: 1,
    flexShrink: 1,
  },
  label: {
    fontSize: theme.size.md,
    lineHeight: theme.lineHeight.md,
    fontWeight: theme.fontWeight.bold,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
  },
  description: {
    fontSize: theme.size.sm,
    lineHeight: theme.lineHeight.sm,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
}));
