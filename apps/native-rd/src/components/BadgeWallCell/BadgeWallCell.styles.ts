import { StyleSheet } from "react-native-unistyles";
import { palette } from "../../themes/palette";

/** Logical-pixel size each badge renders at in the wall grid. */
export const CELL_SIZE = 60;
/**
 * Width of one wall cell including its visible name (#689). Wider than the art
 * so a short title fits on one line; the grid column math uses this, not
 * CELL_SIZE, so labels never collide.
 */
export const CELL_WIDTH = 84;
/** Max lines of the visible badge name under the art. */
export const LABEL_LINES = 2;

// The cell only renders on the fixed dark badge wall (#404 D5), so its name is
// fixed light ink, not a theme token (theme text is dark in 6/7 themes and would
// vanish on #161616). Matches BadgesWall WALL_INK_MUTED (contrast-checked).
/* eslint-disable local/no-raw-colors -- fixed dark wall surface */
const WALL_LABEL_INK = palette.gray400;
/* eslint-enable local/no-raw-colors */

export const styles = StyleSheet.create((theme) => ({
  // 44pt floor guarantees the touch target; the 60pt badge already clears it.
  // No clip here — the badge keeps its own shape (the whole point of #403).
  pressable: {
    width: CELL_WIDTH,
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  label: {
    ...theme.textStyles.metadata,
    color: WALL_LABEL_INK,
    textAlign: "center",
    marginTop: theme.space[1],
    width: CELL_WIDTH,
  },
  // Undesigned fallback — a neutral ROUNDED SQUARE (not a circle): a null
  // design has no shape to represent, so a square-ish tile is the honest
  // placeholder. Border mirrors the badge stroke for a coherent wall.
  fallback: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accentPurple,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackText: {
    // Designed ink for accentPurple (dark in most themes, white only where the
    // theme's purple is dark enough) — hardcoded white failed AA in 4/7 themes.
    color: theme.colors.accentPurpleFg,
    fontSize: 24,
    fontWeight: theme.fontWeight.black,
    fontFamily: theme.fontFamily.headline,
  },
}));
