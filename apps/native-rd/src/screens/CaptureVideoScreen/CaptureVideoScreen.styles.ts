import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  chooserContent: {
    flex: 1,
    padding: theme.space[4],
    gap: theme.space[4],
    justifyContent: "center",
  },
  chooserHeading: {
    textAlign: "center",
    marginBottom: theme.space[2],
  },
  chooserButtonGroup: {
    gap: theme.space[3],
  },
  previewWrapper: {
    flex: 1,
  },
  previewContainer: {
    flex: 1,
    margin: theme.space[4],
    borderRadius: theme.radius.md,
    overflow: "hidden",
    backgroundColor: theme.colors.backgroundTertiary,
  },
  previewCaption: {
    textAlign: "center",
    color: theme.colors.textSecondary,
    paddingVertical: theme.space[2],
  },
  previewControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: theme.space[4],
    gap: theme.space[3],
  },
  previewButton: {
    flex: 1,
  },
}));
