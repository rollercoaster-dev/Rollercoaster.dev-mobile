import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

export const styles = StyleSheet.create((theme) => ({
  container: {
    gap: theme.space[2],
  },
  label: {
    fontSize: theme.size.xs,
    fontWeight: theme.fontWeight.bold,
    fontFamily: theme.fontFamily.body,
    textTransform: "uppercase" as const,
    letterSpacing: theme.letterSpacing.wide,
    color: theme.colors.textMuted,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space[2],
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[1],
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[2],
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.background,
    minHeight: 44,
    ...shadowStyle(theme, "cardElevationSmall"),
  },
  chipSelected: {
    backgroundColor: theme.colors.accentPrimary,
    borderColor: theme.colors.border,
  },
  chipIcon: {
    fontSize: 16,
  },
  chipLabel: {
    fontSize: theme.size.sm,
    fontFamily: theme.fontFamily.body,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  chipLabelSelected: {
    color: theme.colors.background,
  },
  compactChipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space[1],
  },
  compactChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: theme.space[1],
    paddingVertical: 2,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  compactChipIcon: {
    fontSize: 12,
  },
  compactChipLabel: {
    fontSize: theme.size.xs,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.textSecondary,
  },

  // --- Capture mode (mode="capture") bottom sheet ---
  // Scrim fills the screen and anchors the sheet to the bottom. Alpha suffix on
  // theme.colors.shadow mirrors EvidenceDrawer.styles.ts's overlay treatment.
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: `${theme.colors.shadow}cc`,
  },
  // Full-screen backdrop behind the sheet; tapping the exposed area dismisses.
  // Rendered before the sheet so the sheet sits on top and absorbs its own taps.
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Neo-brutalist bottom sheet: hard top border + rounded top corners + hard shadow.
  sheet: {
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    borderTopWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.space[4],
    paddingTop: theme.space[3],
    paddingBottom: theme.space[4],
    gap: theme.space[3],
    ...shadowStyle(theme, "modalElevation"),
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.border,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: {
    fontSize: theme.size.lg,
    fontWeight: theme.fontWeight.bold,
    fontFamily: theme.fontFamily.headline,
    color: theme.colors.text,
  },
  // 44x44 tap target for the × dismiss control.
  closeButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  closeIcon: {
    fontSize: theme.size.lg,
    color: theme.colors.text,
  },
  // Prototype renders the sub-line in DM Mono.
  subLine: {
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.size.sm,
    color: theme.colors.textMuted,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space[2],
  },
  // flexBasis ~30% + grow yields a stable 3-up grid for the 6 options.
  cell: {
    flexBasis: "30%",
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.space[1],
    minHeight: 44,
    paddingVertical: theme.space[3],
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.background,
    ...shadowStyle(theme, "cardElevationSmall"),
  },
  cellSelected: {
    backgroundColor: theme.colors.accentPrimary,
  },
  cellIcon: {
    fontSize: 24,
  },
  cellLabel: {
    fontSize: theme.size.sm,
    fontFamily: theme.fontFamily.body,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  cellLabelSelected: {
    color: theme.colors.background,
  },
}));
