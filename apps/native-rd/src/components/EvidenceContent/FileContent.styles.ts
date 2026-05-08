import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

export const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.space[4],
    justifyContent: "center",
  },
  card: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.space[4],
    gap: theme.space[3],
    alignItems: "center",
    ...shadowStyle(theme, "hardMd"),
  },
  icon: {
    fontSize: 48,
  },
  filename: {
    fontSize: theme.size.lg,
    fontFamily: theme.fontFamily.headline,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    textAlign: "center",
  },
  mimeType: {
    fontSize: theme.size.xs,
    fontFamily: theme.fontFamily.mono,
    color: theme.colors.textMuted,
  },
  description: {
    fontSize: theme.size.sm,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
    textAlign: "center",
  },
}));
