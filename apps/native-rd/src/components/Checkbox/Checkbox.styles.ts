import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[3],
    minHeight: 48,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: theme.radius.sm,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  boxChecked: {
    backgroundColor: theme.colors.accentPrimary,
    borderColor: theme.colors.accentPrimary,
  },
  checkmark: {
    fontSize: 14,
    color: theme.colors.background,
    fontWeight: theme.fontWeight.bold,
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    fontSize: theme.size.md,
    lineHeight: theme.lineHeight.md,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
  },
  labelChecked: {
    textDecorationLine: "line-through",
    color: theme.colors.textSecondary,
  },
  boxDisabled: {
    opacity: 0.4,
    borderColor: theme.colors.textMuted,
  },
}));
