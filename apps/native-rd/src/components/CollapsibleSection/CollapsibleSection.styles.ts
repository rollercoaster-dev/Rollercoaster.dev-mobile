import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  container: {
    gap: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
    paddingVertical: theme.space[3],
  },
  headerPressed: {
    opacity: 0.7,
  },
  title: {
    fontSize: theme.size.xs,
    fontWeight: theme.fontWeight.bold,
    fontFamily: theme.fontFamily.body,
    textTransform: "uppercase",
    letterSpacing: theme.letterSpacing.wide,
    color: theme.colors.textMuted,
  },
  chevron: {
    fontSize: theme.size.md,
    color: theme.colors.textMuted,
  },
  content: {
    paddingTop: theme.space[2],
  },
}));
