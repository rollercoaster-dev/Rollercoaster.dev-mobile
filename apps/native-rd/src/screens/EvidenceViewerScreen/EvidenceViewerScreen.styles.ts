import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  counterBar: {
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[2],
    borderBottomWidth: theme.borderWidth.thin,
    borderBottomColor: theme.colors.border,
    alignItems: "center",
  },
  counter: {
    fontSize: theme.size.sm,
    fontFamily: theme.fontFamily.mono,
    color: theme.colors.textMuted,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.space[4],
  },
  loadingIndicator: {
    flex: 1,
  },
}));
