import { StyleSheet } from "react-native-unistyles";

import { shadowStyle } from "../../styles/shadows";

export const THUMB_SIZE = 24;

export const styles = StyleSheet.create((theme) => ({
  touchTarget: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: THUMB_SIZE / 2,
  },
  track: {
    height: 12,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundTertiary,
    position: "relative",
  },
  fill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    backgroundColor: theme.colors.accentPrimary,
  },
  marks: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mark: {
    width: 2,
    height: 6,
    backgroundColor: theme.colors.border,
  },
  thumb: {
    position: "absolute",
    top: -(THUMB_SIZE - 8) / 2,
    marginLeft: -THUMB_SIZE / 2,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    ...shadowStyle(theme, "hardMd"),
  },
}));
