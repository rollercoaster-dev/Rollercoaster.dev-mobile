import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

export const styles = StyleSheet.create((theme) => ({
  container: {
    gap: 0,
  },
  card: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: 0,
    ...shadowStyle(theme, "cardElevation"),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
    paddingVertical: theme.space[3],
  },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3],
    gap: theme.space[3],
  },
  headerPressed: {
    opacity: 0.7,
  },
  headerFocused: {
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.focusRing,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[2],
    flexShrink: 1,
    marginLeft: theme.space[2],
  },
  title: {
    fontSize: theme.size.xs,
    fontWeight: theme.fontWeight.bold,
    fontFamily: theme.fontFamily.body,
    textTransform: "uppercase",
    letterSpacing: theme.letterSpacing.wide,
    color: theme.colors.textMuted,
  },
  titleCard: {
    fontSize: theme.size.sm,
    fontWeight: theme.fontWeight.bold,
    fontFamily: theme.fontFamily.headline,
    textTransform: "uppercase",
    letterSpacing: theme.letterSpacing.wide,
    color: theme.colors.text,
  },
  summary: {
    fontSize: theme.size.xs,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.textSecondary,
    flexShrink: 1,
  },
  chevron: {
    fontSize: theme.size.md,
    color: theme.colors.textMuted,
  },
  content: {
    paddingTop: theme.space[2],
  },
  contentCard: {
    paddingHorizontal: theme.space[4],
    paddingTop: 0,
    paddingBottom: theme.space[4],
    gap: theme.space[3],
  },
}));
