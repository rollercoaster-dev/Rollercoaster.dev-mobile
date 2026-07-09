import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

// Zero hardcoded hex (hard acceptance gate). Token map to the App Shell
// `edit` route: card surface #fff → background · ink border #0a0a0a →
// border · muted #737373 → textSecondary · banner surface #ede9fe →
// accentPurpleLight · add-button #2563eb → accentPrimary. The banner ink
// #3b1f6b is *re-toned* (not a literal match) to accentPrimary — the blue
// #2563eb accent, reused as the ink.
export const styles = StyleSheet.create((theme) => ({
  container: {
    gap: 0,
  },
  body: {
    padding: theme.space[4],
    gap: theme.space[3],
  },

  // --- Optional description block (D3) ---
  descriptionBlock: {
    gap: theme.space[1],
  },
  descriptionInput: {
    minHeight: 44,
    fontSize: theme.size.md,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[2],
    textAlignVertical: "top" as const,
  },

  // --- Goal-title card ---
  sectionLabel: {
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.size.xs,
    textTransform: "uppercase" as const,
    letterSpacing: theme.letterSpacing.wide,
    color: theme.colors.textSecondary,
  },
  titleCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: theme.space[2],
    backgroundColor: theme.colors.background,
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[3],
    ...shadowStyle(theme, "cardElevation"),
  },
  titleInput: {
    flex: 1,
    fontFamily: theme.fontFamily.headline,
    fontWeight: theme.fontWeight.black,
    fontSize: theme.size.lg,
    color: theme.colors.text,
    padding: 0,
  },

  // --- Steps section header ---
  stepsHeader: {
    flexDirection: "row" as const,
    alignItems: "baseline" as const,
    justifyContent: "space-between" as const,
  },
  stepsLabel: {
    fontFamily: theme.fontFamily.headline,
    fontWeight: theme.fontWeight.bold,
  },
  stepCount: {
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.size.sm,
    color: theme.colors.textSecondary,
  },
  stepList: {
    position: "relative" as const,
    gap: theme.space[2],
  },

  // --- Step row (EditGoalStepRow) ---
  rowCard: {
    backgroundColor: theme.colors.background,
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[3],
    ...shadowStyle(theme, "cardElevationSmall"),
  },
  rowCardDragging: {
    borderColor: theme.colors.accentPrimary,
  },
  // Wraps so the trailing controls drop to a second line on narrow screens
  // instead of crushing the title (D5). rowLead holds [handle][number][title]
  // and grows to fill; rowControls holds [evidence][↑↓] and wraps under it.
  rowMain: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    alignItems: "center" as const,
    columnGap: theme.space[2],
    rowGap: theme.space[2],
  },
  // Leading cluster: grows to fill the line but never shrinks below a legible
  // floor — below that the sibling rowControls wraps rather than the title.
  rowLead: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: theme.space[2],
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 140,
  },
  // Trailing cluster: natural width, never shrinks; wraps to its own line when
  // the row can't hold both clusters (right-aligned there via marginLeft auto).
  rowControls: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: theme.space[2],
    flexShrink: 0,
    marginLeft: "auto" as const,
  },
  dragHandle: {
    fontSize: theme.size.md,
    color: theme.colors.textMuted,
  },
  stepNumber: {
    fontFamily: theme.fontFamily.headline,
    fontWeight: theme.fontWeight.bold,
    fontSize: theme.size.sm,
    color: theme.colors.text,
  },
  rowTitlePress: {
    flex: 1,
    minHeight: 44,
    justifyContent: "center" as const,
  },
  rowTitleText: {
    fontSize: theme.size.sm,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
  },
  editInput: {
    flex: 1,
    minHeight: 44,
    fontSize: theme.size.sm,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
    padding: 0,
  },
  evidenceChip: {
    minHeight: 32,
    justifyContent: "center" as const,
    paddingVertical: theme.space[1],
  },
  reorderButtons: {
    flexDirection: "row" as const,
    gap: theme.space[1],
  },
  // Empty placeholder that fills a hidden arrow's slot (first row hides ↑, last
  // row hides ↓) so every row reserves two reorder slots and the chip/× columns
  // stay aligned across rows (A-D3). Matches the `sm` IconButton footprint
  // (36pt). Label-free, so reorder tests that assert arrow absence by label hold.
  reorderSlot: {
    width: 36,
    height: 36,
  },
  // Per-step delete × on the main row (#460) — mirrors subStepDelete/Glyph (D3).
  stepDelete: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  stepDeleteGlyph: {
    fontSize: theme.size.lg,
    color: theme.colors.textMuted,
  },
  // Date/dependency chip row (D5) — rendered only when chips are present.
  chipRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: theme.space[2],
    marginTop: theme.space[2],
  },
  dateDepChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    backgroundColor: theme.colors.background,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space[2],
    paddingVertical: 2,
  },
  dateDepChipGlyph: {
    fontSize: 10,
  },
  dateDepChipText: {
    fontFamily: theme.fontFamily.mono,
    fontSize: 10,
  },
  // Reorder insertion indicator, drawn at the real landing slot mid-drag.
  dropLine: {
    position: "absolute" as const,
    left: 0,
    right: 0,
    height: 3,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accentPrimary,
    zIndex: 50,
  },

  // --- Sub-steps block (D12) ---
  // Indented, mint-railed block under a parent step that has some. accentMint is
  // the token nearest the prototype's #d4f4e7 rail (the Badges mint family).
  subStepBlock: {
    // position: relative anchors the per-parent drop-line (#459), which is
    // absolutely positioned among the sub-step rows it shares this box with.
    position: "relative" as const,
    marginTop: theme.space[2],
    paddingLeft: theme.space[3],
    borderLeftWidth: theme.borderWidth.thick,
    borderLeftColor: theme.colors.accentMint,
    gap: theme.space[1],
  },
  // Same wrap treatment as rowMain (D5): [handle][title] in rowLead, and
  // [evidence][↑↓][×] in rowControls, which drops to a second line on narrow
  // screens rather than crushing the sub-step title.
  subStepRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    alignItems: "center" as const,
    columnGap: theme.space[2],
    rowGap: theme.space[2],
  },
  // Lifted-row accent while dragging (#459, D3). A bare subStepRow has no border
  // to swap (unlike the parent's rowCard → rowCardDragging), so add the same
  // accentPrimary border here — tokens only, mirroring the parent's accent.
  subStepRowDragging: {
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.accentPrimary,
    borderRadius: theme.radius.sm,
  },
  subStepMarker: {
    fontSize: theme.size.md,
    color: theme.colors.textMuted,
  },
  subStepTitlePress: {
    flex: 1,
    minHeight: 44,
    justifyContent: "center" as const,
  },
  subStepTitleText: {
    fontSize: theme.size.sm,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
  },
  subStepEditInput: {
    flex: 1,
    minHeight: 44,
    fontSize: theme.size.sm,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
    padding: 0,
  },
  subStepDelete: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  subStepDeleteGlyph: {
    fontSize: theme.size.lg,
    color: theme.colors.textMuted,
  },
  // "add a sub-step" — inside the rail, blue (accentPrimary) like the proto.
  addSubStepRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: theme.space[1],
    minHeight: 44,
  },
  addSubStepGlyph: {
    fontSize: theme.size.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accentPrimary,
  },
  addSubStepText: {
    fontSize: theme.size.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accentPrimary,
  },
  // "break into sub-steps" — prompt on a step with none, green (success).
  breakIntoRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: theme.space[1],
    marginTop: theme.space[2],
    minHeight: 44,
  },
  breakIntoGlyph: {
    fontSize: theme.size.sm,
    color: theme.colors.success,
  },
  breakIntoText: {
    fontSize: theme.size.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.success,
  },

  // --- Add-step row ---
  addRow: {
    flexDirection: "row" as const,
    gap: theme.space[2],
  },
  addInputCard: {
    flex: 1,
    justifyContent: "center" as const,
    minHeight: 48,
    backgroundColor: theme.colors.background,
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.space[3],
    ...shadowStyle(theme, "cardElevation"),
  },
  addInput: {
    fontSize: theme.size.md,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
    padding: 0,
  },
  addButton: {
    width: 48,
    minHeight: 48,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: theme.colors.accentPrimary,
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    ...shadowStyle(theme, "cardElevation"),
  },
  addButtonText: {
    fontSize: theme.size.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.background,
  },

  // --- Dates & dependencies info banner ---
  infoBanner: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: theme.space[2],
    backgroundColor: theme.colors.accentPurpleLight,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[3],
  },
  infoBannerIcon: {
    fontSize: 14,
  },
  infoBannerText: {
    flex: 1,
    fontSize: theme.size.sm,
    lineHeight: theme.size.sm * 1.45,
    color: theme.colors.accentPrimary,
  },

  // --- Done footer ---
  footer: {
    padding: theme.space[4],
    borderTopWidth: theme.borderWidth.medium,
    borderTopColor: theme.colors.border,
  },

  // --- Evidence-type picker bottom sheet (D8) ---
  // Mirrors EvidenceTypePicker's capture-sheet treatment: scrim + bottom-anchored
  // neo-brutalist sheet with a hard top border and modal shadow.
  pickerOverlay: {
    flex: 1,
    justifyContent: "flex-end" as const,
    backgroundColor: `${theme.colors.shadow}cc`,
  },
  pickerBackdrop: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  pickerSheet: {
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
  pickerHandle: {
    alignSelf: "center" as const,
    width: 40,
    height: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.border,
  },
  pickerHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  pickerTitle: {
    fontFamily: theme.fontFamily.headline,
    fontWeight: theme.fontWeight.bold,
    fontSize: theme.size.lg,
    color: theme.colors.text,
  },
  pickerClose: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  pickerCloseIcon: {
    fontSize: theme.size.lg,
    color: theme.colors.text,
  },
}));
