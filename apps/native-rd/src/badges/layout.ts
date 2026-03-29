import type { BadgeDesign, BadgeShape } from "./types";

export type BadgeLayoutDensity = "default" | "balanced" | "compact";

type BadgeLayoutMetrics = {
  density: BadgeLayoutDensity;
  centerY: number;
  centerContentScale: number;
  centerLabelScale: number;
  pathTextFontScale: number;
  pathTextInset: number;
  bannerScale: number;
};

const SHAPE_PATH_TEXT_SCALE: Record<BadgeShape, number> = {
  circle: 0.92,
  shield: 0.82,
  hexagon: 0.84,
  roundedRect: 0.84,
  star: 0.88,
  diamond: 0.8,
};

const SHAPE_CENTER_Y_OFFSET: Record<BadgeShape, number> = {
  circle: 0,
  shield: -0.01,
  hexagon: 0,
  roundedRect: 0,
  star: 0.015,
  diamond: -0.01,
};

function hasVisibleCenterBanner(design: BadgeDesign) {
  return (
    design.banner?.position === "center" && Boolean(design.banner.text?.trim())
  );
}

function hasVisibleBottomBanner(design: BadgeDesign) {
  return (
    design.banner?.position === "bottom" && Boolean(design.banner.text?.trim())
  );
}

function hasVisibleTopPathText(design: BadgeDesign) {
  const position = design.pathTextPosition ?? "top";
  return (
    (position === "top" || position === "both") &&
    Boolean(design.pathText?.trim())
  );
}

function hasVisibleBottomPathText(design: BadgeDesign) {
  const position = design.pathTextPosition ?? "top";
  return (
    (position === "bottom" || position === "both") &&
    Boolean(design.pathTextBottom?.trim())
  );
}

export function getBadgeLayoutMetrics(
  design: BadgeDesign,
  size: number,
  inset: number,
  innerInset: number,
): BadgeLayoutMetrics {
  const topPathTextVisible = hasVisibleTopPathText(design);
  const bottomPathTextVisible = hasVisibleBottomPathText(design);
  const centerBannerVisible = hasVisibleCenterBanner(design);
  const bottomBannerVisible = hasVisibleBottomBanner(design);
  const centerLabelVisible = Boolean(design.centerLabel?.trim());

  const layoutPressure =
    Number(topPathTextVisible) +
    Number(bottomPathTextVisible) +
    Number(centerBannerVisible || bottomBannerVisible) +
    Number(centerLabelVisible);

  let density: BadgeLayoutDensity = "default";
  if (
    layoutPressure >= 3 ||
    (bottomPathTextVisible && (centerLabelVisible || centerBannerVisible))
  ) {
    density = "compact";
  } else if (layoutPressure >= 2) {
    density = "balanced";
  }

  const densityScale =
    density === "compact" ? 0.82 : density === "balanced" ? 0.9 : 1;

  const shapeOffset = SHAPE_CENTER_Y_OFFSET[design.shape] ?? 0;
  const shapeTextScale = SHAPE_PATH_TEXT_SCALE[design.shape] ?? 0.85;

  const centerY =
    size *
    (0.5 +
      shapeOffset +
      (bottomBannerVisible ? -0.015 : 0) +
      (bottomPathTextVisible ? -0.004 : 0));

  const textInsetReduction =
    density === "compact"
      ? size * 0.055
      : density === "balanced"
        ? size * 0.04
        : size * 0.03;
  const minTextInset = inset + size * 0.03;
  const pathTextInset = Math.max(minTextInset, innerInset - textInsetReduction);
  const compactTextCompression =
    topPathTextVisible && bottomPathTextVisible && centerBannerVisible
      ? 0.78
      : 1;
  const pathTextFontScale =
    shapeTextScale * densityScale * compactTextCompression;

  return {
    density,
    centerY,
    centerContentScale:
      density === "compact" ? 0.78 : density === "balanced" ? 0.88 : 1,
    centerLabelScale:
      density === "compact" ? 0.72 : density === "balanced" ? 0.84 : 1,
    pathTextFontScale,
    pathTextInset,
    bannerScale:
      density === "compact" ? 0.88 : density === "balanced" ? 0.94 : 1,
  };
}
