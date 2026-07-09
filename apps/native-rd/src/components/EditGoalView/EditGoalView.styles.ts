import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

// Zero hardcoded hex (hard acceptance gate). Token map to the App Shell
// `edit` route: card surface #fff → background · ink border #0a0a0a →
// border · muted #737373 → textSecondary · banner surface #ede9fe →
// accentPurpleLight · add-button #2563eb → accentPrimary. The banner ink
// #3b1f6b is *re-toned* (not a literal match) to accentPrimary — the blue
// #2563eb accent, reused as the ink.
export const styles = StyleSheet.create((theme) => ({
  // flex:1 screen host (#493/D8): splits into [header][scroll][footer] so the
  // evidence sheet's absolute overlay — a sibling of the ScrollView — fills the
  // viewport, not the scroll content. Was `gap: 0` when the body was a plain
  // content-sized View.
  container: {
    flex: 1,
  },
  // The internal ScrollView claims the space between header and footer.
  scroll: {
    flex: 1,
  },
  // Padding + inter-section gap that used to live on the `body` View now ride
  // the ScrollView's contentContainerStyle (the scrollable content is a flex
  // column, so `gap` still applies).
  scrollContent: {
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
  // A plain single flex row (A-D4): rowLead absorbs remaining width and the
  // title wraps to as many lines as it needs *inside its own box*, so the
  // controls cluster can never wrap on top of the next row's title. No
  // flexWrap — the old wrap heuristic is what caused the row-collision class.
  rowMain: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    columnGap: theme.space[2],
  },
  // Leading cluster: grows to fill the line and shrinks to yield width to the
  // controls; its title Text wraps in place rather than pushing the row wider.
  rowLead: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: theme.space[2],
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  // Trailing cluster: natural width, never shrinks; vertically centered beside
  // a title that may wrap to multiple lines.
  rowControls: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: theme.space[2],
    flexShrink: 0,
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
  // Fixed-width (two 36pt `sm` IconButton footprints + gap) so the evidence and ×
  // columns stay aligned across rows regardless of how many arrows show. Contents
  // are right-aligned (`flex-end`), so a row with a single arrow (first row has no
  // ↑, last row has no ↓) parks that arrow in the rightmost slot next to the × —
  // every visible arrow lands in one column instead of staircasing (A-D3).
  reorderButtons: {
    flexDirection: "row" as const,
    justifyContent: "flex-end" as const,
    gap: theme.space[1],
    width: 36 * 2 + theme.space[1],
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
    gap: theme.space[2],
  },
  // Same plain single-row treatment as rowMain (A-D4): [handle][title] in
  // rowLead (title wraps in place), [evidence][↑↓][×] in rowControls at natural
  // width — no flexWrap, so the controls never paint over the next sub-row.
  subStepRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    columnGap: theme.space[2],
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
}));
