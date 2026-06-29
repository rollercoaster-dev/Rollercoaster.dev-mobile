import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

export const styles = StyleSheet.create((theme) => ({
  // Full-width celebration band. `overflow: "hidden"` is load-bearing: it
  // clips the absolutely-positioned Confetti so particles fade at the band
  // edge instead of raining down the whole screen (Confetti measures the
  // window height internally). The View's default `position: relative` makes
  // the band the containing block for that absolute Confetti layer.
  band: {
    alignItems: "center",
    overflow: "hidden",
    paddingHorizontal: theme.space[4],
    paddingTop: theme.space[3],
    paddingBottom: theme.space[6],
    gap: theme.space[4],
    backgroundColor: theme.chrome.screenHeaderBg,
    borderBottomColor: theme.chrome.screenHeaderBorder,
    borderBottomWidth: theme.borderWidth.medium,
  },
  // Decorative sparkle layer fills the band; individual glyphs are positioned
  // absolutely within it (see SPARKLES in the component). Non-interactive.
  sparkleLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sparkle: {
    position: "absolute",
  },
  // Back arrow (left) and ⋯ overflow (right) on the same row as the band's
  // chrome. `alignSelf: "stretch"` lets space-between push them to the edges
  // even though the band centers the badge/chip below.
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    alignSelf: "stretch",
  },
  // Verifiable-credential pill that sits under the badge: a card-surface
  // chip with the screen-header border so it reads as part of the band.
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[2],
    paddingVertical: theme.space[2],
    paddingHorizontal: theme.space[4],
    backgroundColor: theme.surfaceBorder.surfaceCardBg,
    borderColor: theme.chrome.screenHeaderBorder,
    borderWidth: theme.borderWidth.medium,
    borderRadius: theme.radius.pill,
    ...shadowStyle(theme, "cardElevationSmall"),
  },
  chipText: {
    gap: theme.space[1],
  },
  chipTitle: {
    color: theme.surfaceBorder.surfaceCardFg,
  },
  chipDate: {
    color: theme.colors.textMuted,
  },
}));
