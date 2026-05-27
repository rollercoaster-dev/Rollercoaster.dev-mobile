import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.space[4],
    gap: theme.space[3],
  },
  intro: {
    color: theme.colors.textMuted,
  },
  sectionTitle: {
    marginTop: theme.space[3],
  },
  row: {
    paddingVertical: theme.space[2],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: theme.space[1],
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.space[2],
  },
  api: {
    flexShrink: 1,
  },
  badge: {
    paddingHorizontal: theme.space[2],
    paddingVertical: theme.space[1],
    borderRadius: 4,
    overflow: "hidden",
    color: theme.colors.background,
    fontWeight: "700",
  },
  badgeSupported: {
    backgroundColor: theme.colors.success,
  },
  badgeMissing: {
    backgroundColor: theme.colors.error,
  },
  badgePartial: {
    backgroundColor: theme.colors.warning,
  },
  detail: {
    color: theme.colors.textSecondary,
  },
  pluralLocale: {
    marginTop: theme.space[2],
    color: theme.colors.textMuted,
  },
  pluralRow: {
    flexDirection: "row",
    gap: theme.space[3],
  },
  pluralCount: {
    width: 48,
    color: theme.colors.textMuted,
  },
}));
