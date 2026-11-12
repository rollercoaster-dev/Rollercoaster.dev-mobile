import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  container: {
    alignItems: "center",
    padding: theme.space[8],
    gap: theme.space[2],
  },
  icon: {
    // 48pt glyph: every Text variant's lineHeight is shorter and would clip it.
    lineHeight: 58,
    fontSize: 48,
    marginBottom: theme.space[2],
  },
  title: {
    ...theme.textStyles.title,
    color: theme.colors.text,
    textAlign: "center",
  },
  body: {
    ...theme.textStyles.body,
    color: theme.colors.textSecondary,
    textAlign: "center",
    fontSize: theme.size.sm,
    lineHeight: theme.lineHeight.sm,
  },
  action: {
    marginTop: theme.space[3],
  },
}));
