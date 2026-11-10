import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

export const styles = StyleSheet.create((theme) => ({
  loading: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  failure: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.space[6],
    backgroundColor: theme.colors.background,
  },
  card: {
    alignItems: "center",
    padding: theme.space[6],
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundSecondary,
    gap: theme.space[3],
    ...shadowStyle(theme, "cardElevation"),
  },
  title: {
    color: theme.colors.text,
    textAlign: "center",
  },
  message: {
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  action: {
    marginTop: theme.space[2],
  },
}));
