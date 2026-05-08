import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

export const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: theme.space[4],
    gap: theme.space[3],
  },
  textInput: {
    flex: 1,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space[3],
    paddingTop: theme.space[3],
    paddingBottom: theme.space[3],
    fontSize: theme.size.md,
    lineHeight: theme.lineHeight.md,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
    backgroundColor: theme.colors.backgroundSecondary,
    minHeight: 200,
    textAlignVertical: "top",
    ...shadowStyle(theme, "cardElevation"),
  },
  textInputFocused: {
    borderColor: theme.colors.focusRing,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3],
  },
  charCount: {
    color: theme.colors.textMuted,
  },
  charCountWarning: {
    color: theme.colors.accentPrimary,
  },
  captionContainer: {
    gap: theme.space[1],
  },
}));
