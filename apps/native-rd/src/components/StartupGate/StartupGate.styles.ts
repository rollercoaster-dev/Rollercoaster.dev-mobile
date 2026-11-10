import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

export const styles = StyleSheet.create((theme) => ({
  loading: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  // Scrolls so the Restart button stays reachable at large type.
  failure: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.background,
  },
  failureContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.space[6],
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
    fontSize: theme.size.sm,
    lineHeight: theme.lineHeight.sm,
  },
  action: {
    marginTop: theme.space[2],
  },
}));
