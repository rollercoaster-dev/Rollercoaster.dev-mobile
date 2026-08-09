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
  // Corner-parked pin: absolute so it never pushes the hero's centred stack
  // off-axis. Inset by space[2] rather than the hero's space[5] padding so the
  // 36pt control tucks into the corner instead of crowding the ring.
  heroPin: {
    position: "absolute",
    top: theme.space[2],
    right: theme.space[2],
    zIndex: 1,
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
  // Fixed two-column grid (prototype layout): every card is a uniform half-width
  // tile that wraps to the next row after two.
  keepWarmGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: theme.space[3],
  },
  // Owns the grid width so the pin can sit outside the card's Pressable while
  // still being positioned against it. The card Pressable is `accessible`, which
  // collapses its whole subtree into one screen-reader node — a pin nested
  // inside it would be unreachable, so it has to be a sibling.
  keepWarmCell: {
    width: "48%",
    position: "relative",
  },
  keepWarmCard: {
    // Full width of the cell above, which is the half-row that makes two fit per
    // line and a third wrap. No flexGrow/flexShrink — grow would stretch a lone
    // trailing card to full width (reads as a list) and shrink would let a third
    // compress onto the same line. space-between on the row supplies the gutter.
    width: "100%",
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
  // Corner-parked like the hero's, and a sibling of the card rather than a
  // child — see keepWarmCell. Sits above the card's shadow so taps land here.
  keepWarmPin: {
    position: "absolute",
    top: theme.space[2],
    right: theme.space[2],
    zIndex: 1,
  },
  keepWarmTitle: {
    // Reserve the pin's corner so a long title truncates before it rather than
    // running underneath — the pin is out of flow, so padding does the work
    // that `flex: 1` beside an in-flow control used to.
    paddingRight: theme.space[8],
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
