import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

export const styles = StyleSheet.create((theme) => ({
  // Full-width celebration band. `overflow: "hidden"` is load-bearing: it
  // clips the absolutely-positioned sparkle layer so glyphs fade at the band
  // edge instead of bleeding onto the screen. The View's default
  // `position: relative` makes the band the containing block for that absolute
  // sparkle layer. The band owns its own celebration surface (yellow in
  // light/dark/lowVision, neutralised for the other ND themes) — distinct
  // from the purple screen-header chrome.
  band: {
    alignItems: "center",
    overflow: "hidden",
    paddingHorizontal: theme.space[4],
    paddingTop: theme.space[3],
    paddingBottom: theme.space[6],
    gap: theme.space[4],
    backgroundColor: theme.chrome.celebrationBg,
    borderBottomColor: theme.chrome.celebrationFg,
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
  // Prominent goal title below the badge, on the celebration band.
  title: {
    color: theme.chrome.celebrationFg,
    textAlign: "center",
  },
  // Verifiable-credential pill under the title: a card-surface chip with the
  // celebration ink as its border so it reads as part of the band.
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[2],
    paddingVertical: theme.space[2],
    paddingHorizontal: theme.space[4],
    backgroundColor: theme.surfaceBorder.surfaceCardBg,
    borderColor: theme.chrome.celebrationFg,
    borderWidth: theme.borderWidth.medium,
    borderRadius: theme.radius.pill,
    ...shadowStyle(theme, "cardElevationSmall"),
  },
  chipLabel: {
    color: theme.surfaceBorder.surfaceCardFg,
    fontWeight: theme.fontWeight.bold,
  },
}));
