import { StyleSheet } from "react-native-unistyles";

// Focus Mode progress strip — tuned to the canonical `App Shell.dc.html` strip
// (Focus Mode A prototype matches): a mono done-count + blue "See all steps ›"
// over a thin, flat, white-track bar with a hard 2px border. The bar is bespoke
// (D2): the shared `ProgressBar` is pill-radiused and accent-filled, visually
// unlike this flat bordered rectangle, and lives on 3 unrelated screens. Track =
// `background` fill + `border` border (D1, NOT `journeyProgressTrack` — the
// prototype draws a bordered neutral surface, not a filled gray box); fill =
// `journeyProgressFill`, the one genuine "progress" color semantic and this
// issue's first consumer. No hardcoded hex: every color is a theme token.
export const styles = StyleSheet.create((theme) => ({
  // The whole strip is one tap target (prototype's outer `onClick`), so the
  // Pressable owns the column; label row + bar stack with the prototype's ~6px
  // gap (`space[2]`, nearest).
  strip: {
    gap: theme.space[2],
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.space[2],
  },
  // Mono done-count — prototype 11px (`xs`, nearest), muted secondary ink. Shrinks
  // (never wraps) so "See all steps" stays pinned to the right edge.
  doneCount: {
    flexShrink: 1,
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.size.xs,
    color: theme.colors.textSecondary,
  },
  // Blue "See all steps ›" — prototype 12px (`xs`), bold, accent.
  seeAll: {
    fontSize: theme.size.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.accentPrimary,
  },
  // Flat 9px bar: white track (`background`) + hard 2px border, no radius — the
  // prototype's bordered neutral surface (D1). `overflow: hidden` clips the fill.
  barTrack: {
    height: 9,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    overflow: "hidden",
  },
  // Fill height fills the track; its width is applied inline from the clamped
  // fraction (matching the AudioPlayer progress pattern). Color is the one
  // genuine progress semantic (D1).
  barFill: {
    height: "100%",
    backgroundColor: theme.journey.journeyProgressFill,
  },
}));
