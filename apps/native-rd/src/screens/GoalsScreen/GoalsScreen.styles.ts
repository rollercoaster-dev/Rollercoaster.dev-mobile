import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.space[4],
    paddingBottom: theme.space[12],
    gap: theme.space[4],
  },
  addIcon: {
    fontSize: 24,
    lineHeight: 28,
  },
  listContent: {
    gap: theme.space[3],
  },
  loadingIndicator: {
    marginTop: theme.space[8],
  },
}));
