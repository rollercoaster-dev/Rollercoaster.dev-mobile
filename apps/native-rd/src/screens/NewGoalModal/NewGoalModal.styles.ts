import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[2],
  },
  spacer: {
    width: 48,
  },
  closeIcon: {
    fontSize: 16,
    fontWeight: theme.fontWeight.bold,
  },
  form: {
    padding: theme.space[4],
    gap: theme.space[4],
  },
}));
