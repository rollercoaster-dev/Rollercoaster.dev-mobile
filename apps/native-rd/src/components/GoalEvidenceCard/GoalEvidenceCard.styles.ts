import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";
import { palette } from "../../themes/palette";

export const styles = StyleSheet.create((theme) => ({
  wrapper: {
    borderTopWidth: 6,
    borderTopColor: palette.yellow300,
  },
  container: {
    gap: theme.space[3],
  },
  goalLabel: {
    fontSize: theme.size.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.warning,
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
  description: {
    fontSize: theme.size.sm,
    color: theme.colors.textMuted,
    fontFamily: theme.fontFamily.body,
    lineHeight: theme.lineHeight.sm,
  },
  evidenceBadgeWrapper: {
    position: "relative" as const,
    alignSelf: "flex-start" as const,
  },
  evidenceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[1],
    backgroundColor: theme.colors.accentPurpleLight,
    borderWidth: theme.borderWidth.thin,
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
}));
