import { StyleSheet } from "react-native-unistyles";
import { palette } from "../../themes/palette";

/** Logical-pixel size each badge renders at in the wall grid. */
const CELL_SIZE = 60;

export const styles = StyleSheet.create((theme) => ({
  // 44pt floor guarantees the touch target; the 60pt badge already clears it.
  // No clip here — the badge keeps its own shape (the whole point of #403).
  pressable: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  // Undesigned fallback — a neutral ROUNDED SQUARE (not a circle): a null
  // design has no shape to represent, so a square-ish tile is the honest
  // placeholder. Border mirrors the badge stroke for a coherent wall.
  fallback: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 8,
    backgroundColor: theme.colors.accentPurple,
    borderWidth: 3,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackText: {
    color: palette.white,
    fontSize: 24,
    fontWeight: theme.fontWeight.black,
    fontFamily: theme.fontFamily.headline,
  },
}));
