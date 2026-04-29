import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.space[4],
    paddingBottom: theme.space[12],
    gap: theme.space[4],
  },
  listContent: {
    gap: theme.space[3],
  },
  loadingIndicator: {
    marginTop: theme.space[8],
  },
}));
