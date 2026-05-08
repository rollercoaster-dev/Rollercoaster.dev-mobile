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
  description: {
    textAlign: "center",
    color: theme.colors.textSecondary,
    marginBottom: theme.space[2],
  },
  buttonGroup: {
    gap: theme.space[3],
  },
  filePreview: {
    alignItems: "center",
    gap: theme.space[2],
    paddingVertical: theme.space[4],
  },
  fileIcon: {
    fontSize: 48,
  },
  fileName: {
    textAlign: "center",
    fontWeight: theme.fontWeight.medium,
  },
  fileMeta: {
    textAlign: "center",
    color: theme.colors.textMuted,
    fontSize: theme.size.xs,
  },
}));
