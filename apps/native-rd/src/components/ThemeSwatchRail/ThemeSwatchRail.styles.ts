import { StyleSheet } from "react-native-unistyles";

const SWATCH_SIZE = 48;

export const styles = StyleSheet.create((theme) => ({
  rail: {
    gap: theme.space[3],
  },
  scrollContent: {
    flexDirection: "row",
    gap: theme.space[3],
    paddingVertical: theme.space[1],
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
  captionLabel: {
    fontSize: theme.size.lg,
    lineHeight: theme.lineHeight.lg,
    fontWeight: theme.fontWeight.bold,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
  },
  captionDescription: {
    fontSize: theme.size.sm,
    lineHeight: theme.lineHeight.sm,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
}));
