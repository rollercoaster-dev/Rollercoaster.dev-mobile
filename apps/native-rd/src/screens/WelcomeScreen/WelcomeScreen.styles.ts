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
