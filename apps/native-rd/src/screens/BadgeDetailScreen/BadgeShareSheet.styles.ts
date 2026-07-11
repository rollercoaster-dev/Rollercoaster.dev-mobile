import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

// Every color traces to a theme token (zero hardcoded hex is a hard acceptance
// gate for #412). Token mapping to the prototype (Badge Detail C Prototype):
//   blue CTA / verifiable panel #2563eb -> colors.info (+ infoForeground ink)
//   sheet panel #fafafa               -> surfaceBorder.surfaceSheetBg / Fg
//   card rows #ffffff                 -> surfaceBorder.surfaceCardBg / Fg
//   hard ink border #0a0a0a           -> surfaceBorder.borderStrong
//   row divider / grabber #d4d4d4     -> surfaceBorder.borderSubtle
//   RECOMMENDED pill #ffe50c          -> colors.accentYellow (+ accentYellowFg)
//   "may drop the credential" #d97706 -> colors.warning
export const styles = StyleSheet.create((theme) => ({
  // Primary "Share badge" CTA — the single page-body action that replaces the
  // old stacked 3-button export card. Blue info surface with its paired
  // on-color ink so it flips correctly per theme.
  cta: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.space[2],
    paddingHorizontal: theme.space[4],
    backgroundColor: theme.colors.info,
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.surfaceBorder.borderStrong,
    borderRadius: theme.radius.md,
    ...shadowStyle(theme, "cardElevation"),
  },
  ctaPressed: {
    transform: [{ translateX: 2 }, { translateY: 2 }],
    shadowOffset: { width: 1, height: 1 },
  },
  ctaLabel: {
    color: theme.colors.infoForeground,
    fontWeight: theme.fontWeight.bold,
  },

  // The sheet's chrome (backdrop, panel, grabber, title, sub-line) is now owned
  // by the shared AnimatedSheet / EvidenceTypePicker.styles (#501, D3); only the
  // share-row styles below remain bespoke to this screen.

  // Row 1 — verifiable badge, the recommended path. Blue panel matching the CTA
  // so it reads as the primary choice inside the sheet.
  rowHighlighted: {
    minHeight: 44,
    backgroundColor: theme.colors.info,
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.surfaceBorder.borderStrong,
    borderRadius: theme.radius.md,
    padding: theme.space[3],
    marginBottom: theme.space[3],
    ...shadowStyle(theme, "cardElevationSmall"),
  },
  // Header line of row 1: icon + label + RECOMMENDED tag.
  rowHighlightedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[2],
    marginBottom: theme.space[1],
  },

  // Rows 2 & 3 share a white card container with a divider between them.
  rowCard: {
    backgroundColor: theme.surfaceBorder.surfaceCardBg,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.surfaceBorder.borderStrong,
    borderRadius: theme.radius.md,
    overflow: "hidden",
    ...shadowStyle(theme, "cardElevationSmall"),
  },
  // A single card row: leading icon + stacked label/detail text column.
  row: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[3],
    padding: theme.space[3],
  },
  rowDivider: {
    borderBottomWidth: theme.borderWidth.medium,
    borderBottomColor: theme.surfaceBorder.borderSubtle,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowDisabled: {
    opacity: 0.4,
  },
  // Text column for card rows (label over detail).
  rowText: {
    flex: 1,
    gap: theme.space[1],
  },

  rowLabel: {
    flex: 1,
    fontWeight: theme.fontWeight.semibold,
    color: theme.surfaceBorder.surfaceCardFg,
  },
  rowLabelOnHighlight: {
    color: theme.colors.infoForeground,
    fontWeight: theme.fontWeight.bold,
  },
  rowDetail: {
    color: theme.colors.textMuted,
  },
  rowDetailOnHighlight: {
    color: theme.colors.infoForeground,
  },
  // Save-as-image trade-off — amber caution, matching the prototype's warning ink.
  rowDetailWarn: {
    color: theme.colors.warning,
  },

  // RECOMMENDED pill — self-contained: yellow fill, locked-dark ink, hard ink
  // border. The border (not yellow-on-blue contrast) is what separates it from
  // the blue row; accentYellowFg-on-accentYellow is already contrast-tested.
  tag: {
    backgroundColor: theme.colors.accentYellow,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.surfaceBorder.borderStrong,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space[2],
    paddingVertical: 2,
  },
  tagLabel: {
    color: theme.colors.accentYellowFg,
    fontFamily: theme.fontFamily.mono,
    fontWeight: theme.fontWeight.semibold,
  },
}));
