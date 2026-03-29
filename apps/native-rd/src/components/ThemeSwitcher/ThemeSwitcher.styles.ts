import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

export const styles = StyleSheet.create((theme) => ({
  container: {},
  title: {
    fontSize: theme.size["2xl"],
    lineHeight: theme.lineHeight["2xl"],
    fontWeight: theme.fontWeight.bold,
    fontFamily: theme.fontFamily.headline,
    color: theme.colors.text,
    marginBottom: theme.space[4],
  },
  option: {
    padding: theme.space[4],
    borderRadius: theme.radius.md,
    borderWidth: theme.borderWidth.medium,
    minHeight: 48,
    justifyContent: "center" as const,
    marginBottom: theme.space[3],
  },
  optionSelected: {
    ...shadowStyle(theme, "hardMd"),
  },
}));
