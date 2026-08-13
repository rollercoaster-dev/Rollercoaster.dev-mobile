import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

/** a11y floor shared by the timing line, every candidate row and both buttons. */
export const TOUCH_TARGET_MIN = 44;

/** Cap on the candidate list before it scrolls inside the editor. */
const CANDIDATE_LIST_MAX_HEIGHT = 220;

export const styles = StyleSheet.create((theme) => ({
  root: {
    gap: theme.space[2],
  },

  // --- The timing line: one affordance per step, never two ghost chips. ---
  timingLine: {
    minHeight: TOUCH_TARGET_MIN,
    justifyContent: "center",
    paddingVertical: theme.space[1],
    paddingHorizontal: theme.space[1],
    borderRadius: theme.radius.sm,
    gap: theme.space[1],
  },
  timingLinePressed: {
    backgroundColor: theme.colors.backgroundTertiary,
  },
  truthLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[2],
  },
  truthGlyph: {
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.size.sm,
  },
  truthGlyphAfter: {
    color: theme.colors.success,
  },
  truthGlyphDue: {
    color: theme.colors.textSecondary,
  },
  truthText: {
    flex: 1,
    fontSize: theme.size.sm,
    color: theme.colors.textSecondary,
  },
  doneTag: {
    color: theme.colors.success,
  },
  // The unset state: quiet, singular, and absent entirely on a completed step.
  whenPrompt: {
    fontSize: theme.size.sm,
    color: theme.colors.textMuted,
  },

  // --- The editor, unfolded in the row. No sheet, no modal, no scrim. ---
  editor: {
    marginTop: theme.space[2],
    paddingTop: theme.space[3],
    borderTopWidth: theme.borderWidth.thick,
    borderTopColor: theme.colors.border,
    borderStyle: "dashed",
    gap: theme.space[3],
  },
  question: {
    fontFamily: theme.fontFamily.headline,
    fontWeight: theme.fontWeight.bold,
    fontSize: theme.size.md,
    color: theme.colors.text,
  },
  // The ADR-0012 promise for B, in the surface that makes it: intent, not a
  // deadline. It ships.
  intentSub: {
    marginTop: theme.space[1],
    fontSize: theme.size.sm,
    color: theme.colors.textSecondary,
  },

  fieldLabel: {
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.size.xs,
    letterSpacing: theme.letterSpacing.label,
    color: theme.colors.success,
    marginBottom: theme.space[1],
    textTransform: "uppercase",
  },

  // --- Depends on ---
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[2],
    minHeight: TOUCH_TARGET_MIN,
    paddingVertical: theme.space[2],
    paddingHorizontal: theme.space[3],
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    ...shadowStyle(theme, "cardElevationSmall"),
  },
  pickerButtonPressed: {
    backgroundColor: theme.colors.backgroundTertiary,
  },
  pickerValue: {
    flex: 1,
    fontSize: theme.size.sm,
    color: theme.colors.text,
  },
  pickerPlaceholder: {
    flex: 1,
    fontSize: theme.size.sm,
    color: theme.colors.textMuted,
  },
  caret: {
    fontSize: theme.size.xs,
    color: theme.colors.textSecondary,
  },
  candidateList: {
    maxHeight: CANDIDATE_LIST_MAX_HEIGHT,
    marginTop: theme.space[2],
  },
  candidateListContent: {
    gap: theme.space[1],
  },
  candidateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[2],
    minHeight: TOUCH_TARGET_MIN,
    paddingVertical: theme.space[2],
    paddingHorizontal: theme.space[2],
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.backgroundTertiary,
    borderRadius: theme.radius.sm,
  },
  candidateRowSelected: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.accentPurpleLight,
  },
  // Sub-steps indent, matching the prototype's `.after-opt.is-child`.
  candidateRowChild: {
    marginLeft: theme.space[4],
  },
  candidateTitle: {
    flex: 1,
    fontSize: theme.size.sm,
    color: theme.colors.textSecondary,
  },
  candidateTitleSelected: {
    color: theme.colors.text,
  },
  candidateTitleCompleted: {
    color: theme.colors.textMuted,
  },
  tick: {
    fontSize: theme.size.xs,
    color: theme.colors.accentPrimary,
  },
  emptyCandidates: {
    paddingVertical: theme.space[3],
    paddingHorizontal: theme.space[3],
    fontSize: theme.size.sm,
    color: theme.colors.textSecondary,
  },

  // The ordinal badge, shared by the picker button and every candidate row.
  ordinal: {
    minWidth: theme.space[5],
    height: theme.space[5],
    paddingHorizontal: theme.space[1],
    borderRadius: theme.radius.full,
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  ordinalCompleted: {
    backgroundColor: theme.colors.accentMint,
  },
  ordinalLabel: {
    fontFamily: theme.fontFamily.headline,
    fontWeight: theme.fontWeight.bold,
    fontSize: theme.size.xs,
    color: theme.colors.text,
  },

  /**
   * The neutral ordering note. Informs, never enforces (ADR-0010/0012): body
   * copy weight, a quiet left rule, no icon, no error/warning token, nothing
   * disabled and nothing refused.
   */
  note: {
    backgroundColor: theme.colors.backgroundTertiary,
    borderLeftWidth: theme.borderWidth.thick,
    borderLeftColor: theme.colors.border,
    paddingVertical: theme.space[2],
    paddingHorizontal: theme.space[3],
  },
  noteText: {
    fontSize: theme.size.sm,
    lineHeight: theme.lineHeight.md,
    color: theme.colors.textSecondary,
  },

  // --- Footer ---
  footer: {
    flexDirection: "row",
    gap: theme.space[3],
  },
  footerButton: {
    minHeight: TOUCH_TARGET_MIN,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.space[4],
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    ...shadowStyle(theme, "cardElevation"),
  },
  clearButton: {
    flexGrow: 0,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  clearLabel: {
    fontWeight: theme.fontWeight.bold,
    fontSize: theme.size.sm,
    color: theme.colors.textSecondary,
  },
  doneButton: {
    flex: 1,
    backgroundColor: theme.colors.accentPrimary,
  },
  doneLabel: {
    fontWeight: theme.fontWeight.bold,
    fontSize: theme.size.sm,
    color: theme.colors.background,
  },
  buttonPressed: {
    opacity: 0.9,
  },
}));
