import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

// Zero hardcoded hex (hard acceptance gate). Token mapping to the App Shell
// prototype's `edit` route:
//   card surface #fff            -> colors.background
//   hard ink border #0a0a0a      -> colors.border
//   muted label #737373          -> colors.textSecondary / textMuted
//   info banner #ede9fe / #3b1f6b-> colors.accentPurpleLight / accentPrimary
//   add "+" button #2563eb       -> colors.accentPrimary
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
    gap: theme.space[2],
  },
  // Plain (non-draggable) step card — the shell placeholder. Step 2 replaces
  // the row body with EditGoalStepRow (drag handle + evidence + date/dep chips).
  stepCard: {
    backgroundColor: theme.colors.background,
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[3],
    ...shadowStyle(theme, "cardElevationSmall"),
  },
  stepTitleText: {
    fontSize: theme.size.md,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
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
