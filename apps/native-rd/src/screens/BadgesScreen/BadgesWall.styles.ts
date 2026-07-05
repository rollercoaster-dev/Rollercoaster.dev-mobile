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

/**
 * Surface width (logical px) below which the spotlight card switches to its
 * compact layout. Above this the full row (60pt art + trailing arrow) has room
 * for a readable title; below it — small/old phones (≤359pt), tablet split
 * views, the Storybook preview frame, or any theme/OS font-scaling that widens
 * each line — the fixed chrome would starve the flexible title column and it
 * truncates mid-word. The compact layout shrinks the art, tightens the gaps,
 * and drops the decorative arrow so the title keeps enough width to stay legible.
 */
export const SPOTLIGHT_NARROW_WIDTH = 360;
/** Badge-art size in the spotlight's compact (narrow-surface) layout. */
export const SPOTLIGHT_ART_COMPACT = 48;

// The badge wall is a deliberately FIXED dark "wall of proof" surface (#404
// D5/D13): it does NOT adapt per theme. These are the only sanctioned
// non-themeable colors here — each contrast-checked against the dark surface.
// Hoisted behind one disable block (rather than scattered inline disables) so
// the no-raw-colors rule still guards the REST of the file against accidental
// hardcodes, while this one documented exception stays explicit.
/* eslint-disable local/no-raw-colors -- fixed dark wall surface, see note above */
const WALL_SURFACE = "#161616";
const WALL_INK = palette.white;
const WALL_INK_MUTED = palette.gray400;
const WALL_PANEL = palette.gray800;
const WALL_GHOST_BORDER = palette.gray600;
const WALL_CTA_BORDER = palette.black;
/* eslint-enable local/no-raw-colors */

export const styles = StyleSheet.create((theme) => ({
  // TOKEN-RISK: the wall is a deliberately fixed dark "wall of proof" surface.
  // No per-theme `chrome.badgeWallBg` token exists yet (verified absent from
  // ChromeColors — 21 keys, none named badgeWallBg). If the 7-theme check shows
  // #161616 needs to adapt (e.g. a warmer dark for dyslexia/autismFriendly),
  // add theme.chrome.badgeWallBg and swap this literal for it (see plan Step 5).
  surface: {
    flex: 1,
    backgroundColor: WALL_SURFACE,
  },
  galleryContent: {
    paddingHorizontal: GALLERY_H_PADDING,
    paddingBottom: theme.space[8],
    gap: GALLERY_GAP,
  },
  galleryRow: {
    gap: GALLERY_GAP,
    // Center the fixed-size cells so leftover width splits evenly on both sides
    // — the grid reads as a centered block rather than left-packed with a ragged
    // right edge (and never spills a partial column off the surface).
    justifyContent: "center",
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
    color: WALL_INK_MUTED,
    marginTop: theme.space[2],
  },

  // --- Spotlight: most-recently-earned badge -----------------------------
  spotlightPressable: {
    marginHorizontal: GALLERY_H_PADDING,
    marginBottom: theme.space[4],
  },
  // Narrow-surface overrides (see SPOTLIGHT_NARROW_WIDTH): reclaim horizontal
  // space for the title by tightening the card's outer margin and inner gap.
  spotlightPressableCompact: {
    marginHorizontal: theme.space[3],
  },
  spotlightCardCompact: {
    gap: theme.space[2],
  },
  spotlightCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space[3],
    padding: theme.space[3],
    borderRadius: theme.radius.sm,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.chrome.celebrationBg,
    backgroundColor: WALL_PANEL,
  },
  // Pulsing celebration halo. iOS only casts a shadow from an OPAQUE layer, so
  // this box carries a solid celebrationBg fill and sits BEHIND the opaque
  // spotlight card (a sibling, not a child): the card hides the fill and only
  // the shadow bleeds out as the halo. BadgesWall.tsx animates its opacity so
  // the halo breathes. iOS + web render it; Android has no `elevation` here so
  // it degrades to no halo (acceptable: the static celebrationBg card border
  // still marks the card either way).
  glowOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.chrome.celebrationBg,
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
    // Designed ink for accentPurple — matches BadgeWallCell.fallbackText (the
    // null-design tile it mirrors). Hardcoded white failed AA in 4/7 themes.
    color: theme.colors.accentPurpleFg,
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
    color: WALL_INK,
    marginTop: theme.space[1],
  },
  spotlightDate: {
    fontFamily: theme.fontFamily.mono,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: WALL_INK_MUTED,
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
    borderColor: WALL_GHOST_BORDER,
    backgroundColor: WALL_PANEL,
    alignItems: "center",
    justifyContent: "center",
  },
  // Same opaque-fill-behind-opaque-shape technique as `glowOverlay`: the solid
  // celebrationBg fill is hidden behind the (opaque) ghostBadge rendered on top,
  // so iOS + web cast the breathing halo from the shadow while nothing tints the
  // glyph. Android degrades to no halo (no elevation).
  ghostGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 54,
    backgroundColor: theme.chrome.celebrationBg,
    shadowColor: theme.chrome.celebrationBg,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
  },
  emptyTitle: {
    fontFamily: theme.fontFamily.headline,
    fontWeight: theme.fontWeight.black,
    fontSize: 22,
    color: WALL_INK,
    textAlign: "center",
    marginTop: theme.space[5],
  },
  emptyBody: {
    fontFamily: theme.fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: WALL_INK_MUTED,
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
    borderColor: WALL_CTA_BORDER,
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
