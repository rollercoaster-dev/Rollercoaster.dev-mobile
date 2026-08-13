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
    // The inherited body lineHeight (26) would eat most of the 44pt cell and
    // shove the mark badges down. Tighten it to the digits.
    lineHeight: theme.size.md,
    textAlign: "center",
    includeFontPadding: false,
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
  // Same circle rule as the editor's ordinal badge: minWidth === height, no
  // horizontal padding, so a single ordinal is round rather than oval.
  mark: {
    minWidth: theme.space[4],
    height: theme.space[4],
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
    // See StepTimingEditor's ordinalLabel: the inherited body lineHeight (26)
    // overflows a badge this small and pushes the glyph off centre.
    lineHeight: theme.size.xs,
    textAlign: "center",
    includeFontPadding: false,
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
