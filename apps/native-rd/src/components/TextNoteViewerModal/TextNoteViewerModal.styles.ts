import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3],
    borderBottomWidth: theme.borderWidth.medium,
    borderBottomColor: theme.colors.border,
  },
  heading: {
    fontSize: theme.size.md,
    fontWeight: theme.fontWeight.bold,
    fontFamily: theme.fontFamily.headline,
    color: theme.colors.text,
  },
  closeText: {
    fontSize: 18,
    color: theme.colors.text,
    fontWeight: theme.fontWeight.bold,
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
