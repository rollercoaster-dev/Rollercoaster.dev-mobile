import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.space[4],
  },
  noteText: {
    fontSize: theme.size.md,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[2],
    borderTopWidth: theme.borderWidth.medium,
    borderTopColor: theme.colors.border,
  },
  timestampText: {
    fontSize: theme.size.xs,
    fontFamily: theme.fontFamily.mono,
    color: theme.colors.textMuted,
    textAlign: "center",
  },
}));
