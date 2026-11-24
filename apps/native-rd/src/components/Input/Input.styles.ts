import { StyleSheet } from "react-native-unistyles";

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
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
    backgroundColor: theme.colors.backgroundSecondary,
    minHeight: 48,
  },
  inputFocused: {
    borderColor: theme.colors.focusRing,
  },
  // Semantic error border (>= 3:1 non-text in every theme); the FieldError
  // icon and message below carry the meaning without color (#693).
  inputError: {
    borderColor: theme.colors.error,
  },
}));
