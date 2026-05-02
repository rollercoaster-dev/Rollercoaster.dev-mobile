import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: theme.space[4],
    gap: theme.space[4],
    justifyContent: "center",
  },
  heading: {
    textAlign: "center",
    marginBottom: theme.space[2],
  },
  buttonGroup: {
    gap: theme.space[3],
  },
}));
