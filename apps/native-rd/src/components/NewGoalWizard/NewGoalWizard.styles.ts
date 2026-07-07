import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

// Zero hardcoded hex (hard acceptance gate). Token map to the App Shell
// `newgoal` route (header band chrome is owned by ScreenSubHeader now, D8):
// progress fill #ffe50c → accentYellow (D4 — wizard position, not step state,
// so not journey-*) · card/input surface #fff → background · ink border
// #0a0a0a → border · muted #737373 → textSecondary · CTA #2563eb →
// accentPrimary (via Button) · badge banner surface #ede9fe →
// accentPurpleLight. The banner ink #3b1f6b is *re-toned* (not a literal
// match) to accentPrimary — the blue #2563eb accent, reused as the ink.
export const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // Header chrome now comes from the shared ScreenSubHeader (D8).

  // --- 4-segment progress bar (D4) ---
  progressRow: {
    flexDirection: "row" as const,
    gap: theme.space[2],
    paddingHorizontal: theme.space[4],
    paddingTop: theme.space[4],
  },
  progressSegment: {
    flex: 1,
    height: 6,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
  },
  progressSegmentFilled: {
    backgroundColor: theme.colors.accentYellow,
  },
  progressSegmentUnfilled: {
    backgroundColor: theme.colors.background,
  },

  // --- Shared step body / footer frame ---
  stepBody: {
    flex: 1,
    justifyContent: "center" as const,
    paddingHorizontal: theme.space[5],
    gap: theme.space[3],
  },
  footer: {
    paddingHorizontal: theme.space[4],
    paddingTop: theme.space[3],
    paddingBottom: theme.space[5],
    gap: theme.space[3],
  },

  // --- Step 1 · name ---
  eyebrow: {
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.size.xs,
    textTransform: "uppercase" as const,
    letterSpacing: theme.letterSpacing.wide,
    color: theme.colors.textSecondary,
  },
  nameHeadline: {
    fontFamily: theme.fontFamily.headline,
    fontWeight: theme.fontWeight.black,
    fontSize: theme.size["2xl"],
    lineHeight: theme.size["2xl"] * 1.15,
    color: theme.colors.text,
  },
  titleInput: {
    minHeight: 48,
    fontSize: theme.size.md,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[3],
    ...shadowStyle(theme, "cardElevation"),
  },
  hint: {
    fontSize: theme.size.sm,
    lineHeight: theme.size.sm * 1.5,
    color: theme.colors.textSecondary,
  },
  quickAddPress: {
    minHeight: 44,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  quickAddText: {
    fontSize: theme.size.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textSecondary,
    textAlign: "center" as const,
  },
  quickAddLink: {
    color: theme.colors.accentPrimary,
  },

  // --- Step 4 · ready ---
  readyHeadline: {
    fontFamily: theme.fontFamily.headline,
    fontWeight: theme.fontWeight.black,
    fontSize: theme.size["3xl"],
    lineHeight: theme.size["3xl"] * 1.05,
    color: theme.colors.text,
  },
  summaryCard: {
    backgroundColor: theme.colors.background,
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.space[4],
    gap: theme.space[1],
    ...shadowStyle(theme, "cardElevation"),
  },
  summaryTitle: {
    fontFamily: theme.fontFamily.headline,
    fontWeight: theme.fontWeight.bold,
    fontSize: theme.size.lg,
    color: theme.colors.text,
  },
  summaryMeta: {
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.size.sm,
    color: theme.colors.textSecondary,
  },
  badgeNoteBanner: {
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
  badgeNoteIcon: {
    // theme.size.sm (14 in the base theme) so the glyph scales with the
    // largeText/lowVision ND variants instead of staying pinned at 14.
    fontSize: theme.size.sm,
  },
  badgeNoteText: {
    flex: 1,
    fontSize: theme.size.sm,
    lineHeight: theme.size.sm * 1.45,
    color: theme.colors.accentPrimary,
  },

  // --- Step 2 · first step (#463) ---
  // Goal-title echo under the "Goal" eyebrow — quiet body text so the recap
  // reads as context, not a second headline.
  stepGoalRecap: {
    fontSize: theme.size.sm,
    color: theme.colors.textSecondary,
  },
  evidenceRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: theme.space[2],
  },
  // Whole press target (chip + "change"); a 44pt-min row keeps the tap area
  // honest even though the chip itself is compact.
  evidencePress: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: theme.space[2],
    minHeight: 44,
  },
  // Compact recap pill — the prototype's #ede9fe / 9999px / 12px DM Mono chip,
  // shared with the build-row and ready-banner tier (accentPurpleLight). Uses
  // the small hard-shadow token, which theme-aware ND variants zero out (D8).
  evidenceChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: theme.space[1],
    backgroundColor: theme.colors.accentPurpleLight,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.space[2],
    paddingVertical: theme.space[1],
    ...shadowStyle(theme, "hardSm"),
  },
  evidenceChipIcon: {
    // size.xs (12) — scales with the largeText/lowVision ND variants.
    fontSize: theme.size.xs,
  },
  evidenceChipLabel: {
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.size.xs,
    color: theme.colors.text,
  },
  evidenceChipChange: {
    fontSize: theme.size.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accentPrimary,
  },

  // --- Step 3 · build list (#464) ---
  // Top-aligned (not centered like stepBody): the list grows from the top and
  // scrolls, so its content must start at the top edge. flex:1 lets the
  // ScrollView claim the space between progress bar and footer.
  buildBody: {
    flex: 1,
  },
  buildScrollContent: {
    paddingHorizontal: theme.space[5],
    paddingTop: theme.space[4],
  },
  // "Your steps" + live count, baseline-aligned across the row edges.
  buildHeaderRow: {
    flexDirection: "row" as const,
    alignItems: "baseline" as const,
    justifyContent: "space-between" as const,
    marginBottom: theme.space[3],
  },
  buildHeaderTitle: {
    fontFamily: theme.fontFamily.headline,
    fontWeight: theme.fontWeight.bold,
    fontSize: theme.size.lg,
    color: theme.colors.text,
  },
  buildHeaderCount: {
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.size.sm,
    color: theme.colors.textSecondary,
  },
  // Per-step card — same surface/border/hard-shadow idiom as the ready
  // summaryCard, one tier lighter (hardSm) since rows stack.
  buildRowCard: {
    backgroundColor: theme.colors.background,
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.space[3],
    marginBottom: theme.space[2],
    ...shadowStyle(theme, "hardSm"),
  },
  // Wraps so the trailing controls (chip + ×) drop to a second line on narrow /
  // largeText renders instead of crushing the title (D7) — the same treatment
  // EditGoalStepRow's rowMain uses now that the row carries three affordances.
  buildRowInner: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    alignItems: "center" as const,
    columnGap: theme.space[2],
    rowGap: theme.space[2],
  },
  // Leading cluster: [number][title/input]. Grows to fill the line but never
  // shrinks below a legible floor — below that buildRowControls wraps instead.
  buildRowLead: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: theme.space[2],
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 140,
  },
  // Trailing cluster: natural width, never shrinks; wraps to its own line,
  // right-aligned there via marginLeft auto (mirrors EditGoalStepRow rowControls).
  buildRowControls: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: theme.space[2],
    flexShrink: 0,
    marginLeft: "auto" as const,
  },
  buildRowNumber: {
    fontFamily: theme.fontFamily.headline,
    fontWeight: theme.fontWeight.bold,
    fontSize: theme.size.sm,
    color: theme.colors.text,
  },
  // Tap-to-edit title press target — 44pt-min row keeps the tap area honest
  // (mirrors EditGoalStepRow's rowTitlePress/rowTitleText).
  buildRowTitlePress: {
    flex: 1,
    minHeight: 44,
    justifyContent: "center" as const,
  },
  buildRowTitle: {
    fontSize: theme.size.sm,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
  },
  // Inline title-edit field replacing the title while a row is mid-rename.
  buildRowEditInput: {
    flex: 1,
    minHeight: 44,
    fontSize: theme.size.sm,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
    padding: 0,
  },
  // Whole chip is the press target here (no separate "change" link like step 2);
  // 44pt-min keeps the tap area honest even though the pill is compact.
  buildRowEvidencePress: {
    minHeight: 44,
    minWidth: 44,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  // Per-row × delete (#482) — 44×44 min touch target, muted glyph. Mirrors
  // EditGoalView.styles' stepDelete/stepDeleteGlyph (D6).
  buildRowDelete: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  buildRowDeleteGlyph: {
    fontSize: theme.size.lg,
    color: theme.colors.textMuted,
  },
  // "+ add another step" — mirrors quickAddPress's single-accessible-node shape;
  // an accent link row below the list, not a bordered button (prototype).
  addStepPress: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: theme.space[1],
    minHeight: 44,
    paddingBottom: theme.space[3],
  },
  addStepPlus: {
    fontSize: theme.size.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accentPrimary,
  },
  addStepLabel: {
    fontSize: theme.size.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accentPrimary,
  },
}));
