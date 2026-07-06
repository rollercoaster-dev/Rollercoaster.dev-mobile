import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";
import { palette } from "../../themes/palette";
import { GOAL_NODE_SIZE } from "../TimelineNode/TimelineNode.styles";

/**
 * Inline badge-preview size — derived from GOAL_NODE_SIZE so the preview keeps
 * visual rhythm with the star it sits beside (#452 D4).
 */
export const BADGE_PREVIEW_SIZE = GOAL_NODE_SIZE;

export const styles = StyleSheet.create((theme) => ({
  container: {
    flexDirection: "row",
    marginTop: theme.space[2],
  },
  nodeColumn: {
    width: GOAL_NODE_SIZE,
    alignItems: "center",
    marginRight: theme.space[3],
  },
  contentCard: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.space[4],
    ...shadowStyle(theme, "cardElevationSmall"),
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    gap: theme.space[3],
  },
  ctaTextColumn: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.text,
  },
  ctaSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: theme.space[1],
  },
  // Undesigned fallback — mirrors BadgeWallCell's monogram tile: a neutral
  // rounded square (a null design has no shape to represent).
  badgeFallback: {
    width: BADGE_PREVIEW_SIZE,
    height: BADGE_PREVIEW_SIZE,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accentPurple,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeFallbackText: {
    color: palette.white,
    fontSize: theme.size.md,
    fontWeight: theme.fontWeight.black,
    fontFamily: theme.fontFamily.headline,
  },
  evidenceList: {
    marginTop: theme.space[3],
  },
}));
