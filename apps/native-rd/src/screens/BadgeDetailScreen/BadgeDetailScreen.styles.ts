import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

export const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[2],
  },
  topBarTitle: {
    ...theme.textStyles.title,
    color: theme.colors.text,
  },
  spacer: {
    width: 48,
  },
  scrollContent: {
    padding: theme.space[4],
    paddingBottom: theme.space[12],
    gap: theme.space[4],
    alignItems: "center",
  },
  badgeImage: {
    width: 120,
    height: 120,
    borderRadius: theme.radius.sm,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.accentPurple,
    alignItems: "center",
    justifyContent: "center",
    ...shadowStyle(theme, "cardElevation"),
  },
  badgeInitial: {
    fontSize: theme.size["5xl"],
    lineHeight: theme.size["5xl"] * 1.3,
    fontWeight: theme.fontWeight.black,
    fontFamily: theme.fontFamily.headline,
    color: theme.colors.background,
  },
  infoSection: {
    width: "100%",
    gap: theme.space[3],
  },
  title: {
    ...theme.textStyles.headline,
    color: theme.colors.text,
    textAlign: "center",
  },
  description: {
    ...theme.textStyles.body,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  sectionLabel: {
    ...theme.textStyles.label,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
  },
  criteriaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[2],
  },
  criteriaText: {
    ...theme.textStyles.body,
    color: theme.colors.text,
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
}));
