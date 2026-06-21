import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

export const styles = StyleSheet.create((theme) => ({
  // Zoned scaffold: the card fills its carousel slot (flex: 1) so the envelope
  // stays the same height between cards; the body scrolls on overflow and the
  // foot stays pinned at the bottom. Mirrors the prototype `.scard`.
  cardOuter: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    ...shadowStyle(theme, "cardElevation"),
  },
  cardBody: {
    flex: 1,
  },
  cardBodyContent: {
    padding: theme.space[4],
    gap: theme.space[3],
  },
  cardFoot: {
    borderTopWidth: theme.borderWidth.medium,
    borderTopColor: theme.colors.border,
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3],
    minHeight: 44,
    // Single row: the completion control (checkbox or quiet prompt) sits at the
    // left, the typed capture buttons are pushed all the way to the right on the
    // same level (Joe 2026-06-21). When only the control is present it stays
    // left, as before.
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.space[3],
  },
  // Pinned, bordered header strip above the body (#360). Plain form (flat /
  // overview cards) and purple `topBandChild` form (sub-steps). Carries the
  // card's context text + the status badge; replaces the former in-body meta
  // row and the quiet "↳ in [parent]" line. Mirrors the prototype `.topband`.
  topBand: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.space[2],
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3],
    borderBottomWidth: theme.borderWidth.medium,
    borderBottomColor: theme.colors.border,
  },
  topBandText: {
    flex: 1,
    fontSize: theme.size.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: theme.letterSpacing.wide,
    fontFamily: theme.fontFamily.body,
  },
  topBandChild: {
    backgroundColor: theme.colors.accentPurpleLight,
  },
  topBandChildText: {
    flex: 1,
    fontSize: theme.size.sm,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.text,
    fontFamily: theme.fontFamily.headline,
  },
  title: {
    fontSize: theme.size["2xl"],
    fontWeight: theme.fontWeight.black,
    color: theme.colors.text,
    fontFamily: theme.fontFamily.headline,
  },
  evidenceBadgeWrapper: {
    position: "relative" as const,
    alignSelf: "flex-start",
    marginTop: theme.space[1],
    // Hard shadow extends 2px below the pill; without this the shadow
    // clips against the ScrollView contentContainer's bottom edge.
    marginBottom: theme.space[1],
  },
  evidenceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[1],
    backgroundColor: theme.colors.accentPurpleLight,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[1],
    minHeight: 44,
    minWidth: 44,
    ...shadowStyle(theme, "cardElevationSmall"),
  },
  evidenceFlash: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accentYellow,
  },
  evidenceText: {
    fontSize: theme.size.xs,
    fontFamily: theme.fontFamily.mono,
    color: theme.colors.text,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[3],
    // Yield width to the right-aligned capture buttons sharing the foot row.
    flexShrink: 1,
  },
  addEvidencePromptText: {
    fontSize: theme.size.sm,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.textMuted,
    fontStyle: "italic",
    // Yield width to the right-aligned capture buttons sharing the foot row.
    flexShrink: 1,
  },
  // Evidence rail — read-only summary of the pieces already captured. The add
  // affordance moved to the foot (typed capture buttons) and the screen FAB, so
  // the rail carries no button. Lives in the scrollable body zone above the
  // pinned foot (D6); hidden until something is captured.
  evidenceRail: {
    gap: theme.space[1],
  },
  evidenceRailLabel: {
    fontSize: theme.size.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: theme.letterSpacing.wide,
    fontFamily: theme.fontFamily.body,
  },
  evidenceRailRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: theme.space[2],
  },
  // Captured-evidence chip: read-only status pill, one per captured type.
  evidenceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[1],
    backgroundColor: theme.colors.accentPurpleLight,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space[2],
    paddingVertical: theme.space[1],
    ...shadowStyle(theme, "cardElevationSmall"),
  },
  evidenceChipIcon: {
    fontSize: 14,
  },
  evidenceChipText: {
    fontSize: theme.size.xs,
    fontFamily: theme.fontFamily.mono,
    color: theme.colors.text,
    // Captions can be long; keep a chip to one line so the rail stays a tidy
    // summary (the full text lives in the evidence drawer).
    maxWidth: 180,
  },
  // Typed quick-capture buttons, pinned in the card foot (#360). One per
  // planned-but-uncaptured evidence type; the row thins out as evidence lands.
  quickActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space[2],
  },
  quickActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[1],
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[2],
    minHeight: 44,
    ...shadowStyle(theme, "cardElevationSmall"),
  },
  quickActionIcon: {
    fontSize: 16,
  },
  quickActionText: {
    fontSize: theme.size.sm,
    fontWeight: theme.fontWeight.bold,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
  },
  // --- Overview card (candidate C, #360) ---
  // The parent's parts rendered as a vertical timeline spine. Mirrors the
  // prototype `.spine` / `.spineList()`: node-on-connector, ✓ for done, the
  // active part ringed and its cell highlighted with the accentYellow
  // in-progress token (D7).
  overviewSpine: {
    gap: theme.space[2],
  },
  spineRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: theme.space[2],
  },
  // Fixed-width left column carrying the node and the connector to the next row.
  spineRail: {
    width: 24,
    alignItems: "center",
  },
  spineNode: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
    ...shadowStyle(theme, "cardElevationSmall"),
  },
  spineNodeDone: {
    backgroundColor: theme.colors.accentPrimary,
    borderColor: theme.colors.accentPrimary,
  },
  spineNodeActive: {
    borderWidth: theme.borderWidth.thick,
  },
  spineNodeCheck: {
    fontSize: 13,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.background,
  },
  // The connector fills the gap between this row's node and the next.
  spineConnector: {
    flex: 1,
    width: theme.borderWidth.medium,
    backgroundColor: theme.colors.textMuted,
  },
  spineCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[2],
    minHeight: 44,
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[2],
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.backgroundSecondary,
    ...shadowStyle(theme, "cardElevationSmall"),
  },
  spineCellActive: {
    backgroundColor: theme.colors.accentYellow,
  },
  spineCellText: {
    flex: 1,
    fontSize: theme.size.sm,
    fontWeight: theme.fontWeight.bold,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
  },
  // The active cell paints itself accentYellow (#ffe50c, same in both modes).
  // theme.colors.text flips to #fafafa in dark and gives ~1.1:1 white-on-yellow,
  // so lock the title to the climb-narrative on-yellow foreground (dark in both
  // modes) — the same token StatusBadge's active variant pairs with yellow.
  spineCellActiveText: {
    color: theme.narrative.climb.text,
  },
  spineEvidenceBadge: {
    backgroundColor: theme.colors.accentPurpleLight,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space[2],
    paddingVertical: theme.space[1] / 2,
  },
  spineEvidenceBadgeText: {
    fontSize: theme.size.xs,
    fontFamily: theme.fontFamily.mono,
    color: theme.colors.text,
  },
  // Evidence rollup row — sum of evidence across all parts (read-only count).
  overviewRollup: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[2],
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[2],
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.backgroundTertiary,
  },
  overviewRollupLabel: {
    flex: 1,
    fontSize: theme.size.sm,
    fontWeight: theme.fontWeight.bold,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
  },
  overviewRollupBadge: {
    backgroundColor: theme.colors.accentPurpleLight,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space[2],
    paddingVertical: theme.space[1] / 2,
  },
  overviewRollupBadgeText: {
    fontSize: theme.size.xs,
    fontFamily: theme.fontFamily.mono,
    color: theme.colors.text,
  },
}));
