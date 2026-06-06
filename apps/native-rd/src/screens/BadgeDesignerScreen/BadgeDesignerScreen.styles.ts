import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";
import { BADGE_CANVAS_BACKGROUND } from "../../badges/constants";

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
    gap: theme.space[3],
    paddingHorizontal: theme.space[4],
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
    backgroundColor: BADGE_CANVAS_BACKGROUND,
    ...shadowStyle(theme, "cardElevation"),
  },
  // Padding-free wrapper around BadgeRenderer. The capture ref must attach
  // here, not on previewContainer, so captureRef sees the same aspect ratio
  // as getBadgeLayoutBoxes' viewBox — otherwise the padding/border on
  // previewContainer reintroduces stretching in the exported PNG.
  badgeCanvas: {
    backgroundColor: BADGE_CANVAS_BACKGROUND,
  },
  sectionStack: {
    gap: theme.space[3],
  },
  contrastWarning: {
    color: theme.colors.text,
    fontWeight: "600" as const,
    paddingHorizontal: theme.space[2],
  },
  bottomLabelInput: {
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
