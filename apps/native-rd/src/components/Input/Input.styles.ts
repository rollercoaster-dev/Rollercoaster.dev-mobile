import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create((theme) => ({
  container: {
    gap: theme.space[1],
  },
  label: {
    fontSize: theme.size.sm,
    fontWeight: theme.fontWeight.medium,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  input: {
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[3],
    fontSize: theme.size.md,
    lineHeight: theme.lineHeight.md,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
    backgroundColor: theme.colors.backgroundSecondary,
    minHeight: 48,
  },
  inputFocused: {
    borderColor: theme.colors.focusRing,
  },
  inputError: {
    borderColor: theme.colors.accentPrimary,
  },
  error: {
    fontSize: theme.size.xs,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.accentPrimary,
  },
}));
