import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

/**
 * a11y floor for every touch target on the grid. The prototype's day cell is
 * 40px; 44 is the project minimum and wins. Seven columns on a 360dp screen
 * leaves ~48dp per column, so the width fits without horizontal scroll (#574).
 */
export const DAY_CELL_MIN_SIZE = 44;

export const styles = StyleSheet.create((theme) => ({
  container: {
    gap: theme.space[2],
  },
  // Month header: ‹ | June 2026 | ›
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.space[2],
  },
  monthLabel: {
    flex: 1,
    textAlign: "center",
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.size.sm,
    color: theme.colors.text,
  },
  navButton: {
    minWidth: DAY_CELL_MIN_SIZE,
    minHeight: DAY_CELL_MIN_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  navButtonPressed: {
    backgroundColor: theme.colors.accentMint,
  },
  navGlyph: {
    fontSize: theme.size.md,
    color: theme.colors.text,
  },
  // Seven equal columns, shared by the weekday header and the day grid.
  week: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    // 1/7th of the row. `flexBasis` percentage keeps the columns equal without
    // measuring, so the grid reflows with the container at any text scale.
    flexBasis: `${100 / 7}%`,
  },
  weekdayLabel: {
    textAlign: "center",
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.size.xs,
    color: theme.colors.textMuted,
    letterSpacing: theme.letterSpacing.wide,
    paddingVertical: theme.space[1],
  },
  day: {
    minHeight: DAY_CELL_MIN_SIZE,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: theme.space[1],
    paddingBottom: theme.space[1],
    borderWidth: theme.borderWidth.thick,
    // Reserved ring: today swaps this for a visible border, so a day cell never
    // changes size when it becomes today.
    borderColor: theme.colors.transparent,
    borderRadius: theme.radius.sm,
  },
  dayToday: {
    borderColor: theme.colors.border,
  },
  daySelected: {
    backgroundColor: theme.colors.accentPrimary,
    borderColor: theme.colors.border,
    ...shadowStyle(theme, "cardElevationSmall"),
  },
  dayPressed: {
    backgroundColor: theme.colors.backgroundTertiary,
  },
  dayNumber: {
    fontSize: theme.size.sm,
    color: theme.colors.text,
    // Keeps the digit columns from jittering between 1 and 11 (#574).
    fontVariant: ["tabular-nums"],
  },
  // A past day reads *quieter*. It is never disabled and never refused (#574).
  dayNumberPast: {
    color: theme.colors.textMuted,
  },
  dayNumberSelected: {
    color: theme.colors.background,
    fontWeight: theme.fontWeight.bold,
  },
  marksRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: theme.space[1],
    marginTop: theme.space[1],
  },
  mark: {
    minWidth: theme.space[4],
    paddingHorizontal: theme.space[1],
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.accentMint,
    alignItems: "center",
    justifyContent: "center",
  },
  // The badge sits on the selected day's filled ground, so it needs its own.
  markOnSelected: {
    backgroundColor: theme.colors.background,
  },
  markLabel: {
    fontSize: theme.size.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accentMintFg,
  },
  markLabelOnSelected: {
    color: theme.colors.text,
  },
  legend: {
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.size.xs,
    color: theme.colors.textMuted,
  },
}));
