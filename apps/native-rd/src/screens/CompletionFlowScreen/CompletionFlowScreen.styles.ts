import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";
import { palette } from "../../themes/adapter";

export const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingTop: theme.space[8],
    paddingHorizontal: theme.space[4],
    paddingBottom: theme.space[12],
  },
  card: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.space[6],
    paddingHorizontal: theme.space[5],
    alignItems: "center",
    maxWidth: 340,
    width: "100%",
    ...shadowStyle(theme, "cardElevation"),
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.space[3],
  },
  iconImage: {
    width: 80,
    height: 80,
  },
  iconEmoji: {
    fontSize: 72,
    lineHeight: 96,
    textAlign: "center" as const,
  },
  headline: {
    textAlign: "center",
    marginBottom: theme.space[2],
  },
  summary: {
    textAlign: "center",
    color: theme.colors.textSecondary,
    marginBottom: theme.space[5],
  },
  actions: {
    width: "100%",
    gap: theme.space[3],
  },
  evidenceSection: {
    width: "100%",
    marginTop: theme.space[4],
    alignItems: "flex-start",
  },
  evidenceSectionTitle: {
    color: theme.colors.textSecondary,
    marginBottom: theme.space[2],
  },
  evidenceItem: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[2],
    paddingVertical: theme.space[2],
    paddingHorizontal: theme.space[3],
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderLeftWidth: 4,
    borderLeftColor: palette.yellow300,
    borderRadius: theme.radius.sm,
    marginBottom: theme.space[1],
  },
  evidenceIcon: {
    fontSize: 16,
  },
  evidenceLabel: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.space[4],
  },
  loadingIndicator: {
    marginTop: theme.space[8],
  },
  badgeStatus: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: theme.space[2],
    marginTop: theme.space[3],
    width: "100%",
  },
  badgeStatusText: {
    color: theme.colors.textSecondary,
  },
  // Evidence prompt phase styles
  inlineNoteContainer: {
    width: "100%",
    gap: theme.space[3],
    marginBottom: theme.space[4],
  },
  inlineNoteLabel: {
    color: theme.colors.textSecondary,
  },
  inlineNoteInput: {
    width: "100%",
    minHeight: 100,
    maxHeight: 200,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.space[3],
    fontSize: theme.textStyles.body.fontSize,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
    textAlignVertical: "top" as const,
  },
  evidenceChips: {
    width: "100%",
    gap: theme.space[2],
  },
  evidenceChipsLabel: {
    color: theme.colors.textSecondary,
  },
  evidenceChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space[2],
  },
}));
