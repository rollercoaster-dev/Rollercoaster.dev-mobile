import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

export const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.space[6],
  },
  rootContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.space[6],
    backgroundColor: theme.colors.background,
  },
  compactContainer: {
    alignItems: "center",
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[2],
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
    fontSize: theme.size.sm,
    lineHeight: theme.lineHeight.sm,
  },
  action: {
    marginTop: theme.space[2],
  },
}));
