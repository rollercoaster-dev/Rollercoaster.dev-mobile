/**
 * Layout boxes — pure geometric description of every visible badge layer.
 *
 * `getBadgeLayoutBoxes` is the single source of truth for where each layer
 * sits in the SVG viewport. The renderer consumes it to position layers, and
 * the invariant test matrix consumes it to assert centering, containment and
 * non-overlap across hundreds of design permutations.
 */

import type { BadgeDesign } from "./types";
import {
  getBadgeLayoutMetrics,
  ICON_SIZE_RATIO,
  type BadgeLayoutDensity,
  type BadgeLayoutMetrics,
} from "./layout";
import {
  FRAME_BAND_RATIO,
  getPathTextCenterY,
  getPathTextRadius,
} from "./shapes/contours";
import {
  BANNER_TOP_VISIBLE_RATIO,
  getBannerBox,
  getBannerOverflow,
  getBannerTopVisibleRatio,
} from "./text/Banner";
import {
  BOTTOM_LABEL_SIZE_RATIO,
  BOTTOM_LABEL_MAX_CHARS,
  getBottomLabelY,
  getBottomLabelBottomOverflow,
  getBottomLabelExtraOffset,
} from "./text/BottomLabel";
import { getMonogramFontSize } from "./text/MonogramCenter";
import { PATH_TEXT_FONT_SIZE_RATIO } from "./text/PathText";
import { measureTextWidth } from "./text/measureTextWidth";

/** Axis-aligned bounding box in SVG user-units. */
export type Box = { x: number; y: number; w: number; h: number };

/**
 * The icon and the monogram are both centered points with a characteristic
 * size — for the icon `size` is the rendered glyph size, for the monogram
 * it's the font size.
 */
export type CenterContent = { cx: number; cy: number; size: number };

export type LayoutBoxes = {
  /** Full SVG viewport, including shadow + banner overflow. */
  viewBox: Box;
  /** Bounding box of the inscribed badge shape (without shadow). */
  shape: Box;
  /** Frame band bounding box, or null when frame is `'none'`. */
  frame: Box | null;
  /** Center icon or monogram. */
  iconOrMonogram: CenterContent;
  /** Top-arc path text band (null when not visible). */
  pathTextTop: Box | null;
  /** Bottom-arc path text band (null when not visible). */
  pathTextBottom: Box | null;
  /** Banner ribbon (null when no banner text). */
  banner: Box | null;
  /** Bottom label below the badge (null when empty). */
  bottomLabel: Box | null;
  /** Resolved layout density — exposed for tests asserting density transitions. */
  density: BadgeLayoutDensity;
  /** Full layout metrics — surfaced so the renderer can consume scales without a second computation. */
  metrics: BadgeLayoutMetrics;
  /** Stroke half-width used as the outer inset. */
  inset: number;
  /** Inner inset (outer inset + frame band). */
  innerInset: number;
  /** Banner top-visible-ratio used (with star-shape override applied for top-position banners). */
  bannerTopVisibleRatio: number;
  /** Extra offset applied to the bottom label to clear star points or a bottom banner. */
  bottomLabelExtraOffset: number;
};

/** Renderer-default stroke width (matches the renderer's non-highContrast path). */
export const DEFAULT_STROKE_WIDTH = 3;

/** Hard-shadow offset applied to the badge silhouette. */
export const SHADOW_OFFSET = 5;

/** Extra viewport breathing room for curved text glyph ascenders/descenders. */
export const PATH_TEXT_VIEWBOX_PADDING_RATIO = 0.04;

export type LayoutBoxesOptions = {
  /** Stroke width used for the shape border. Default 3 (renderer default). */
  strokeWidth?: number;
  /** Whether the badge renders with a hard shadow. Default true. */
  hasShadow?: boolean;
};

function hasVisibleBanner(design: BadgeDesign): boolean {
  return Boolean(design.banner?.text?.trim());
}

function hasTopText(design: BadgeDesign): boolean {
  const position = design.pathTextPosition ?? "top";
  return (
    (position === "top" || position === "both") &&
    Boolean(design.pathText?.trim())
  );
}

function hasBottomText(design: BadgeDesign): boolean {
  const position = design.pathTextPosition ?? "top";
  return (
    (position === "bottom" || position === "both") &&
    Boolean(design.pathTextBottom?.trim())
  );
}

/**
 * Derive the geometric layout for a badge design.
 *
 * Pure function — no React, no SVG, no theme. The renderer plugs theme-derived
 * `strokeWidth` / `hasShadow` through `options`; tests use the defaults.
 */
export function getBadgeLayoutBoxes(
  design: BadgeDesign,
  size: number,
  options: LayoutBoxesOptions = {},
): LayoutBoxes {
  const strokeWidth = options.strokeWidth ?? DEFAULT_STROKE_WIDTH;
  const hasShadow = options.hasShadow ?? true;

  const inset = strokeWidth / 2;
  const innerInset = inset + size * FRAME_BAND_RATIO;

  const metrics = getBadgeLayoutMetrics(design, size, inset, innerInset);
  const hasBottomLabel = Boolean(design.bottomLabel?.trim());

  const shapeBox: Box = {
    x: inset,
    y: inset,
    w: size - inset * 2,
    h: size - inset * 2,
  };
  const frameBox: Box | null = design.frame === "none" ? null : shapeBox;

  const cx = size / 2;
  const cy = metrics.centerY;
  const iconOrMonogram: CenterContent =
    design.centerMode === "monogram" && design.monogram?.trim()
      ? {
          cx,
          cy,
          size: getMonogramFontSize(
            design.monogram,
            size,
            metrics.centerContentScale,
          ),
        }
      : {
          cx,
          cy,
          size: Math.round(size * ICON_SIZE_RATIO * metrics.centerContentScale),
        };

  const pathFontSize =
    size * PATH_TEXT_FONT_SIZE_RATIO * metrics.pathTextFontScale;
  const pathInset = metrics.pathTextInset;

  const pathTextTop: Box | null = hasTopText(design)
    ? buildPathTextBox(design, size, pathInset, pathFontSize, "top")
    : null;
  const pathTextBottom: Box | null = hasBottomText(design)
    ? buildPathTextBox(design, size, pathInset, pathFontSize, "bottom")
    : null;

  const visibleBanner = hasVisibleBanner(design)
    ? (design.banner ?? null)
    : null;
  const bannerBox: Box | null = visibleBanner
    ? getBannerBox(visibleBanner, size, metrics.bannerScale, design.shape)
    : null;

  const bottomBannerClearance =
    visibleBanner?.position === "bottom" && bannerBox
      ? bannerBox.y + bannerBox.h - size
      : 0;
  const bottomLabelExtraOffset = hasBottomLabel
    ? Math.max(
        getBottomLabelExtraOffset(design.shape, size),
        bottomBannerClearance,
      )
    : 0;
  const bottomLabelBox: Box | null = hasBottomLabel
    ? buildBottomLabelBox(
        design,
        size,
        metrics.bottomLabelScale,
        bottomLabelExtraOffset,
      )
    : null;

  const bannerTopVisibleRatio = visibleBanner
    ? getBannerTopVisibleRatio(visibleBanner.position, design.shape)
    : BANNER_TOP_VISIBLE_RATIO;

  const viewBox = buildViewBox({
    size,
    hasShadow,
    banner: visibleBanner,
    bannerScale: metrics.bannerScale,
    bottomLabelScale: metrics.bottomLabelScale,
    hasBottomLabel,
    bottomLabelExtraOffset,
    shape: design.shape,
    pathTextTop,
    pathTextBottom,
  });

  return {
    viewBox,
    shape: shapeBox,
    frame: frameBox,
    iconOrMonogram,
    pathTextTop,
    pathTextBottom,
    banner: bannerBox,
    bottomLabel: bottomLabelBox,
    density: metrics.density,
    metrics,
    inset,
    innerInset,
    bannerTopVisibleRatio,
    bottomLabelExtraOffset,
  };
}

function buildPathTextBox(
  design: BadgeDesign,
  size: number,
  inset: number,
  fontSize: number,
  side: "top" | "bottom",
): Box {
  const r = getPathTextRadius(design.shape, size, inset, side);
  const cy = getPathTextCenterY(design.shape, size, side);
  // Bound the arc band as a slim horizontal strip at the apex (y = cy ± r),
  // thickened by fontSize. Width spans the full arc diameter — a conservative
  // bounding box approximation since the text actually traces a curve.
  const apexY = side === "top" ? cy - r : cy + r;
  return {
    x: size / 2 - r,
    y: apexY - fontSize / 2,
    w: 2 * r,
    h: fontSize,
  };
}

function buildBottomLabelBox(
  design: BadgeDesign,
  size: number,
  scale: number,
  extraOffset: number,
): Box {
  const label = (design.bottomLabel ?? "")
    .trim()
    .slice(0, BOTTOM_LABEL_MAX_CHARS);
  const fontSize = size * BOTTOM_LABEL_SIZE_RATIO * scale;
  const cy = getBottomLabelY(size, scale) + extraOffset;
  const textWidth = measureTextWidth(label, fontSize);

  return {
    x: size / 2 - textWidth / 2,
    y: cy - fontSize / 2,
    w: textWidth,
    h: fontSize,
  };
}

type ViewBoxInputs = {
  size: number;
  hasShadow: boolean;
  banner: BadgeDesign["banner"] | null;
  bannerScale: number;
  bottomLabelScale: number;
  hasBottomLabel: boolean;
  bottomLabelExtraOffset: number;
  shape: BadgeDesign["shape"];
  pathTextTop: Box | null;
  pathTextBottom: Box | null;
};

function buildViewBox({
  size,
  hasShadow,
  banner,
  bannerScale,
  bottomLabelScale,
  hasBottomLabel,
  bottomLabelExtraOffset,
  shape,
  pathTextTop,
  pathTextBottom,
}: ViewBoxInputs): Box {
  const shadow = hasShadow ? SHADOW_OFFSET : 0;
  const bannerOverflow = banner
    ? getBannerOverflow(banner, size, bannerScale, shape)
    : { top: 0, bottom: 0 };
  const bottomLabelBottomOverflow = hasBottomLabel
    ? getBottomLabelBottomOverflow(size, bottomLabelScale) +
      bottomLabelExtraOffset
    : 0;
  const pathTextPadding = size * PATH_TEXT_VIEWBOX_PADDING_RATIO;
  const pathTextTopOverflow = pathTextTop
    ? Math.max(0, pathTextPadding - pathTextTop.y)
    : 0;
  const pathTextBottomOverflow = pathTextBottom
    ? Math.max(0, pathTextBottom.y + pathTextBottom.h + pathTextPadding - size)
    : 0;

  return {
    x: 0,
    y: -Math.max(bannerOverflow.top, pathTextTopOverflow),
    w: size + shadow,
    h:
      size +
      shadow +
      Math.max(bannerOverflow.top, pathTextTopOverflow) +
      Math.max(
        bannerOverflow.bottom,
        bottomLabelBottomOverflow,
        pathTextBottomOverflow,
      ),
  };
}
