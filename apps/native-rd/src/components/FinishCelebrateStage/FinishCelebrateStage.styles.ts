import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    flexDirection: "column",
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: theme.space[6],
  },
  eyebrow: {
    color: theme.colors.success,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: theme.space[3],
  },
  headline: {
    color: theme.colors.text,
    marginBottom: theme.space[3],
  },
  summary: {
    color: theme.colors.textSecondary,
    marginBottom: theme.space[5],
  },
  notePrompt: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[2],
    backgroundColor: theme.colors.background,
    borderWidth: theme.borderWidth.medium,
    borderStyle: "dashed",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.space[3],
    paddingHorizontal: theme.space[3],
  },
  notePromptIcon: {
    fontSize: theme.size.md,
  },
  notePromptText: {
    color: theme.colors.textMuted,
  },
  noteOptional: {
    color: theme.colors.textMuted,
  },
  noteInput: {
    minHeight: 74,
    backgroundColor: theme.colors.background,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.space[3],
    paddingHorizontal: theme.space[3],
    color: theme.colors.text,
    fontFamily: theme.fontFamily.body,
    textAlignVertical: "top",
  },
  // Exposed so the component can pass a themed placeholder color to TextInput's
  // `placeholderTextColor` prop (which does not read from a StyleSheet).
  notePlaceholderColor: {
    color: theme.colors.textMuted,
  },
  footer: {
    paddingHorizontal: theme.space[5],
    paddingBottom: theme.space[5],
    paddingTop: theme.space[2],
  },
  subcopy: {
    color: theme.colors.textMuted,
    textAlign: "center",
    marginTop: theme.space[2],
  },
}));
