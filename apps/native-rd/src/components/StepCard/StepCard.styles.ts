import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

export const styles = StyleSheet.create((theme) => ({
  container: {
    gap: theme.space[3],
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.space[2],
  },
  stepNumber: {
    fontSize: theme.size.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: theme.letterSpacing.wide,
    fontFamily: theme.fontFamily.body,
  },
  title: {
    fontSize: theme.size["2xl"],
    fontWeight: theme.fontWeight.black,
    color: theme.colors.text,
    fontFamily: theme.fontFamily.headline,
  },
  evidenceBadgeWrapper: {
    position: "relative" as const,
    alignSelf: "flex-start",
    marginTop: theme.space[1],
    // Hard shadow extends 2px below the pill; without this the shadow
    // clips against the ScrollView contentContainer's bottom edge.
    marginBottom: theme.space[1],
  },
  evidenceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[1],
    backgroundColor: theme.colors.accentPurpleLight,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[1],
    minHeight: 44,
    minWidth: 44,
    ...shadowStyle(theme, "cardElevationSmall"),
  },
  evidenceFlash: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accentYellow,
  },
  evidenceText: {
    fontSize: theme.size.xs,
    fontFamily: theme.fontFamily.mono,
    color: theme.colors.text,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[3],
    marginTop: theme.space[1],
  },
  addEvidencePromptText: {
    marginTop: theme.space[1],
    fontSize: theme.size.sm,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.textMuted,
    fontStyle: "italic",
  },
  quickActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space[2],
  },
  quickActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[1],
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[2],
    minHeight: 44,
    ...shadowStyle(theme, "cardElevationSmall"),
  },
  quickActionIcon: {
    fontSize: 16,
  },
  quickActionText: {
    fontSize: theme.size.sm,
    fontWeight: theme.fontWeight.bold,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
  },
}));
