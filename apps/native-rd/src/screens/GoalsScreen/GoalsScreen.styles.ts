import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: theme.space[4],
    gap: theme.space[3],
  },
  loadingIndicator: {
    marginTop: theme.space[8],
  },
  headerCount: {
    color: theme.chrome.screenHeaderFg,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
}));
