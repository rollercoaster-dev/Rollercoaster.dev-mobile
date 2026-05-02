import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  playerContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: theme.space[4],
  },
}));
