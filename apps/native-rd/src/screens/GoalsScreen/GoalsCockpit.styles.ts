import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

export const styles = StyleSheet.create((theme) => ({
  container: {
    gap: theme.space[6],
  },
  // Dominant hero: the single Start/Resume affordance lives here and nowhere
  // else on this screen (S3 coherence — see #381). Heavier shadow than a
  // regular Card (hardLg vs cardElevation) marks it as the screen's focal point.
  hero: {
    backgroundColor: theme.surfaceBorder.surfaceCardBg,
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.space[6],
    gap: theme.space[4],
    alignItems: "center",
    ...shadowStyle(theme, "hardLg"),
  },
  overline: {
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    textAlign: "center",
  },
  nextStep: {
    color: theme.surfaceBorder.surfaceCardFg,
    textAlign: "center",
  },
  // Stretch the CTA across the hero so it reads as the primary action.
  heroAction: {
    alignSelf: "stretch",
  },
  keepWarmSection: {
    gap: theme.space[3],
  },
  sectionLabel: {
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  keepWarmCard: {
    backgroundColor: theme.surfaceBorder.surfaceCardBg,
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.space[4],
    gap: theme.space[2],
    ...shadowStyle(theme, "cardElevationSmall"),
  },
  keepWarmPressed: {
    transform: [{ translateX: 2 }, { translateY: 2 }],
    shadowOffset: { width: 1, height: 1 },
  },
  keepWarmTitle: {
    color: theme.surfaceBorder.surfaceCardFg,
  },
  keepWarmNextStep: {
    color: theme.colors.textMuted,
  },
}));
