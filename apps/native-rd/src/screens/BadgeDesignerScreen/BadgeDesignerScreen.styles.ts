import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

export const styles = StyleSheet.create((theme) => ({
  editorRoot: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  scrollContent: {
    gap: theme.space[4],
    alignItems: "center",
  },
  previewOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    paddingVertical: theme.space[2],
    zIndex: 3,
  },
  previewContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: theme.space[4],
    borderRadius: 0,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundSecondary,
    ...shadowStyle(theme, "hardMd"),
  },
  sectionContainer: {
    width: "100%",
    gap: theme.space[2],
  },
  sectionLabel: {
    ...theme.textStyles.label,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    paddingHorizontal: theme.space[4],
  },
  iconSection: {
    width: "100%",
    gap: theme.space[2],
  },
  centerLabelInput: {
    marginHorizontal: theme.space[4],
    minHeight: 44,
    paddingHorizontal: theme.space[3],
    borderWidth: theme.borderWidth.medium,
    borderRadius: 0,
    ...theme.textStyles.body,
    fontWeight: "600" as const,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
  },
  footer: {
    paddingTop: theme.space[6],
    paddingBottom: theme.space[4],
    paddingHorizontal: theme.space[4],
    width: "100%",
    gap: theme.space[3],
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.space[4],
  },
  loadingIndicator: {
    marginTop: theme.space[8],
  },
}));
