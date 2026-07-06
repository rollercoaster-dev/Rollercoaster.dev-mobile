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

  // --- "step" / "build" placeholder body (D2, filled by #463/#464) ---
  placeholderBody: {
    flex: 1,
  },
}));
