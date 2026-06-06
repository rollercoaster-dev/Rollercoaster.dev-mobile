import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  modalRoot: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  headerTitle: {
    ...theme.textStyles.title,
    color: theme.colors.accentPurpleFg,
  },
  headerSpacer: {
    width: 48,
  },
  closeButton: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  closeIconFallback: {
    color: theme.colors.accentPurpleFg,
    fontSize: 18,
    fontWeight: "700",
  },

  pickerContainer: {
    flex: 1,
    paddingHorizontal: theme.space[4],
    paddingTop: theme.space[4],
    gap: theme.space[4],
  },

  // -- Preview swatch row (current vs initial) --
  previewWrapper: {
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    borderRadius: 0,
    height: 60,
    overflow: "hidden",
  },
  previewText: {
    ...theme.textStyles.body,
    color: theme.colors.background,
    fontWeight: "700",
  },

  // -- Panel (saturation/brightness 2D area) --
  panel: {
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    borderRadius: 0,
    aspectRatio: 1,
  },

  // -- Hue slider --
  hueSlider: {
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    borderRadius: 0,
  },

  // -- Footer (Cancel + Confirm) --
  footer: {
    flexDirection: "row",
    gap: theme.space[3],
    paddingHorizontal: theme.space[4],
    paddingTop: theme.space[3],
    borderTopWidth: theme.borderWidth.thick,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  footerButton: {
    flex: 1,
  },
}));
