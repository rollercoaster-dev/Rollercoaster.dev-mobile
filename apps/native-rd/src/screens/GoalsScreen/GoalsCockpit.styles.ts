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
    padding: theme.space[5],
    gap: theme.space[3],
    alignItems: "center",
    ...shadowStyle(theme, "hardLg"),
  },
  overline: {
    color: theme.colors.textMuted,
    fontSize: 10,
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
    marginTop: theme.space[1],
  },
  keepWarmSection: {
    gap: theme.space[3],
  },
  sectionLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  // Two-up row of compact cards (prototype layout). Cards grow to fill the row
  // and wrap to the next line beyond two.
  keepWarmGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space[3],
  },
  keepWarmCard: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "45%",
    minWidth: 0,
    backgroundColor: theme.surfaceBorder.surfaceCardBg,
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.space[3],
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
  // Quiet dashed "+ New goal" ghost box — deliberately understated so the hero
  // keeps the screen's emphasis.
  newGoal: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.space[3],
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderStyle: "dashed",
    borderRadius: theme.radius.sm,
  },
  newGoalPressed: {
    opacity: 0.6,
  },
  newGoalLabel: {
    color: theme.colors.textMuted,
    fontWeight: theme.fontWeight.semibold,
    textAlign: "center",
  },
  // Bespoke empty state — reticle in a dashed frame + warm "prove something"
  // copy + a single blue CTA (prototype's Goals · Empty).
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.space[6],
    paddingVertical: theme.space[12],
    gap: theme.space[4],
  },
  emptyIconBox: {
    width: 74,
    height: 74,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    borderStyle: "dashed",
    borderRadius: theme.radius.md,
  },
  emptyTitle: {
    color: theme.colors.text,
    textAlign: "center",
  },
  emptyBody: {
    color: theme.colors.textMuted,
    textAlign: "center",
    maxWidth: 260,
  },
  emptyAction: {
    marginTop: theme.space[2],
  },
}));
