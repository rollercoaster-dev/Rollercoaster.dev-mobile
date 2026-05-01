import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
  },
  heroRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[4],
  },
  heroText: {
    flex: 1,
    gap: theme.space[1],
  },
  heroGreeting: {
    color: theme.colors.accentPurpleFg,
    textTransform: "uppercase",
    opacity: 0.85,
  },
  heroTitle: {
    color: theme.colors.accentPurpleFg,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: theme.space[4],
    gap: theme.space[4],
  },
  copy: {
    color: theme.colors.textSecondary,
  },
  sampleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[3],
  },
  sampleBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.accentPurple,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  sampleBadgeText: {
    color: theme.colors.accentPurpleFg,
    fontSize: theme.size.lg,
    fontWeight: theme.fontWeight.bold,
  },
  sampleText: {
    flex: 1,
  },
  sampleMeta: {
    color: theme.colors.textSecondary,
  },
  pickerLabel: {
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    marginTop: theme.space[2],
  },
  footer: {
    paddingHorizontal: theme.space[4],
    paddingTop: theme.space[3],
    paddingBottom: theme.space[2],
    borderTopWidth: theme.borderWidth.medium,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.accentPurple,
    gap: theme.space[2],
  },
  footnote: {
    textAlign: "center",
    color: theme.colors.accentPurpleFg,
  },
}));
