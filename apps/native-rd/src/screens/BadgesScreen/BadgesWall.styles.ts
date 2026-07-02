import { StyleSheet } from "react-native-unistyles";
import { palette } from "../../themes/palette";
import { shadowStyle } from "../../styles/shadows";
import { CELL_SIZE } from "../../components/BadgeWallCell/BadgeWallCell.styles";

/**
 * Horizontal padding of the wall surface (logical px). Exported so the
 * `numColumns` computation in BadgesWall.tsx measures the same frame the grid
 * is laid out in — one source of truth for the gallery math.
 */
export const GALLERY_H_PADDING = 16;
/** Gap between gallery cells on both axes (logical px). */
export const GALLERY_GAP = 12;

export const styles = StyleSheet.create((theme) => ({
  // TOKEN-RISK: the wall is a deliberately fixed dark "wall of proof" surface.
  // No per-theme `chrome.badgeWallBg` token exists yet (verified absent from
  // ChromeColors — 21 keys, none named badgeWallBg). If the 7-theme check shows
  // #161616 needs to adapt (e.g. a warmer dark for dyslexia/autismFriendly),
  // add theme.chrome.badgeWallBg and swap this literal for it (see plan Step 5).
  surface: {
    flex: 1,
    backgroundColor: "#161616",
  },
  galleryContent: {
    paddingHorizontal: GALLERY_H_PADDING,
    paddingBottom: theme.space[8],
    gap: GALLERY_GAP,
  },
  galleryRow: {
    gap: GALLERY_GAP,
  },

  // --- Header: count tally + overline ------------------------------------
  header: {
    paddingHorizontal: GALLERY_H_PADDING,
    paddingTop: theme.space[5],
    paddingBottom: theme.space[4],
    marginBottom: theme.space[4],
    borderBottomWidth: theme.borderWidth.thick,
    // D5: the "pop" divider is celebrationBg (verified >9:1 on #161616 in every
    // variant), never the prototype's literal blue nor accentPrimary (which is
    // #000000 in highContrast → invisible on this dark surface).
    borderBottomColor: theme.chrome.celebrationBg,
  },
  headerCount: {
    fontFamily: theme.fontFamily.headline,
    fontWeight: theme.fontWeight.black,
    fontSize: 34,
    lineHeight: 34,
    color: theme.chrome.celebrationBg,
  },
  headerOverline: {
    fontFamily: theme.fontFamily.mono,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: palette.gray400,
    marginTop: theme.space[2],
  },

  // --- Spotlight: most-recently-earned badge -----------------------------
  spotlightPressable: {
    marginHorizontal: GALLERY_H_PADDING,
    marginBottom: theme.space[4],
  },
  spotlightCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[3],
    padding: theme.space[3],
    borderRadius: theme.radius.sm,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.chrome.celebrationBg,
    backgroundColor: palette.gray800,
  },
  // Pulsing celebration halo — a transparent, out-of-flow box whose only paint
  // is a colored shadow; BadgesWall.tsx animates its opacity so it breathes.
  // Colored shadows render on web/iOS; Android degrades to no halo (acceptable:
  // the static celebrationBg border still marks the card either way).
  glowOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: theme.radius.sm,
    shadowColor: theme.chrome.celebrationBg,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 16,
  },
  // Null-design spotlight art — a neutral rounded-square tile, mirroring
  // BadgeWallCell's fallback (a null design has no shape to draw).
  spotlightArtFallback: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accentPurple,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  spotlightArtFallbackText: {
    color: palette.white,
    fontSize: 24,
    fontWeight: theme.fontWeight.black,
    fontFamily: theme.fontFamily.headline,
  },
  spotlightBody: {
    flex: 1,
  },
  spotlightOverline: {
    fontFamily: theme.fontFamily.mono,
    fontSize: 9,
    letterSpacing: 1,
    color: theme.chrome.celebrationBg,
  },
  spotlightTitle: {
    fontFamily: theme.fontFamily.headline,
    fontWeight: theme.fontWeight.black,
    fontSize: 15,
    color: palette.white,
    marginTop: theme.space[1],
  },
  spotlightDate: {
    fontFamily: theme.fontFamily.mono,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: palette.gray400,
    marginTop: theme.space[1],
  },
  spotlightArrow: {
    fontFamily: theme.fontFamily.headline,
    fontSize: 20,
    color: theme.chrome.celebrationBg,
  },

  // --- Empty state: ghost badge + copy + CTA -----------------------------
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.space[6],
    paddingVertical: theme.space[12],
  },
  ghostWrap: {
    width: 108,
    height: 108,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostBadge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 54,
    borderWidth: theme.borderWidth.thick,
    borderStyle: "dashed",
    borderColor: palette.gray600,
    backgroundColor: palette.gray800,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 54,
    shadowColor: theme.chrome.celebrationBg,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
  },
  emptyTitle: {
    fontFamily: theme.fontFamily.headline,
    fontWeight: theme.fontWeight.black,
    fontSize: 22,
    color: palette.white,
    textAlign: "center",
    marginTop: theme.space[5],
  },
  emptyBody: {
    fontFamily: theme.fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: palette.gray400,
    textAlign: "center",
    maxWidth: 260,
    marginTop: theme.space[2],
  },
  // Bespoke celebrationBg CTA (matches the prototype's yellow button and stays
  // legible on #161616 in every theme — see resolved Open Question / D13). The
  // shared <Button> would fill with accentPrimary (#000000 in highContrast →
  // invisible here), so this is styled directly on-surface.
  cta: {
    minHeight: 50,
    marginTop: theme.space[6],
    paddingHorizontal: theme.space[5],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.sm,
    borderWidth: theme.borderWidth.thick,
    borderColor: palette.black,
    backgroundColor: theme.chrome.celebrationBg,
    ...shadowStyle(theme, "hardMd"),
  },
  ctaPressed: {
    transform: [{ translateX: 2 }, { translateY: 2 }],
    shadowOffset: { width: 1, height: 1 },
  },
  ctaLabel: {
    fontFamily: theme.fontFamily.body,
    fontWeight: theme.fontWeight.bold,
    fontSize: 15,
    color: theme.chrome.celebrationFg,
  },
}));
