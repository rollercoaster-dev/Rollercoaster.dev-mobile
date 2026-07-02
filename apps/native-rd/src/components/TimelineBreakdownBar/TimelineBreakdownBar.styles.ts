import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

/** Bar height (px) — matches the prototype's honest-breakdown row. */
export const TRACK_HEIGHT = 12;
/** Legend swatch edge (px) — a small square color chip beside each label. */
export const SWATCH_SIZE = 12;

export const styles = StyleSheet.create((theme) => ({
  // Bordered, hard-shadowed container matching the "honest header" card in the
  // Timeline Directions prototype (plan D7): medium border, cardElevation (the
  // semantic card-elevation token — a hard shadow in the flagship themes,
  // softened or dropped to no shadow in the a11y variants), radius.lg — rounded
  // up from the 6px design intent (no exact 6px token; md=4 and lg=8 are
  // equidistant).
  card: {
    backgroundColor: theme.colors.background,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.space[3],
    gap: theme.space[2],
    ...shadowStyle(theme, "cardElevation"),
  },
  // Segmented bar row. Segment backgroundColor + flex are set inline per state
  // (data-driven); overflow:hidden contains the segment fills within the track's
  // border box (the track itself has no radius).
  track: {
    flexDirection: "row",
    height: TRACK_HEIGHT,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space[2],
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[1],
  },
  // Decorative color square (no accessible role, plan D6); its fill is set
  // inline via stepStateNodeBg per state.
  swatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: theme.radius.sm,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
  },
  chipText: {
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.size.xs,
    color: theme.colors.textMuted,
  },
}));
