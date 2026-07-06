import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.space[5],
    paddingHorizontal: theme.space[6],
    backgroundColor: theme.colors.background,
  },
  badgeDim: {
    opacity: 0.5,
  },
  label: {
    color: theme.colors.textSecondary,
  },
}));
