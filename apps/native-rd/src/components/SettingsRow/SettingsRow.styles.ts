import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
    paddingVertical: theme.space[3],
    paddingHorizontal: theme.space[4],
  },
  pressed: {
    backgroundColor: theme.colors.backgroundTertiary,
  },
  label: {
    flex: 1,
    fontSize: theme.size.md,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
  },
  value: {
    fontSize: theme.size.sm,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.textSecondary,
    marginLeft: theme.space[3],
  },
  chevron: {
    fontSize: theme.size.sm,
    color: theme.colors.textMuted,
    marginLeft: theme.space[2],
  },
}));
