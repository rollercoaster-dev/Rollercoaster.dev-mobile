import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContainer: {
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.space[4],
    paddingBottom: theme.space[12],
    gap: theme.space[4],
  },
  version: {
    ...theme.textStyles.caption,
    color: theme.colors.textMuted,
    textAlign: "center",
    marginTop: theme.space[4],
  },
}));
