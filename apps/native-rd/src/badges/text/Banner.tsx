import React from "react";
import { Rect, Text } from "react-native-svg";
import { BadgeShape, type BannerData } from "../types";
import { getSafeTextColor } from "../../utils/accessibility";
import { fontFamily as fontFamilyTokens } from "../../themes/tokens";

export interface BannerProps {
  banner: BannerData | undefined;
  size: number;
  badgeColor: string;
  topVisibleRatio?: number;
  /** Border/shadow color. Callers should pass theme.colors.border. */
  borderColor?: string;
  /** Font family for banner text. Callers should pass theme.fontFamily.mono for a11y variant support. */
  fontFamily?: string;
  /** Whether to show the hard shadow. When false (e.g. highContrast themes), shadow rect is omitted. Default true. */
  showShadow?: boolean;
  /** Scale factor from layout density system. Scales banner dimensions and font size. Default 1. */
  scale?: number;
}

/** Banner height as fraction of badge size */
export const BANNER_HEIGHT_RATIO = 0.18;

/** Banner width as fraction of badge size */
export const BANNER_WIDTH_RATIO = 0.8;

/** Hard shadow offset in pixels (neo-brutalist) */
export const BANNER_SHADOW_OFFSET = 2;

/** Negative ratio leaves a small gap between the banner and the badge edge. */
export const BANNER_TOP_VISIBLE_RATIO = -0.12;

/** Font size as fraction of badge size */
export const BANNER_FONT_SIZE_RATIO = 0.1;

/** Border width for the banner rect */
export const BANNER_BORDER_WIDTH = 2;

const DEFAULT_BORDER_COLOR = "#000000";
const STAR_BANNER_TOP_VISIBLE_RATIO = -0.45;

export function getBannerTopY(
  position: BannerData["position"],
  size: number,
  topVisibleRatio: number = BANNER_TOP_VISIBLE_RATIO,
): number {
  const bannerH = size * BANNER_HEIGHT_RATIO;
  if (position === "bottom") {
    // Mirror the top strap: 95% of the banner sits below the badge.
    return size - bannerH * topVisibleRatio;
  }

  // Top strap: 95% of the banner sits above the badge.
  return -bannerH * (1 - topVisibleRatio);
}

export function getBannerTopVisibleRatio(
  position: BannerData["position"],
  shape?: BadgeShape,
): number {
  void position;
  // Star uses the same lift on both top and bottom positions because its
  // points cut close to either edge of the badge, so the banner needs the
  // extra clearance regardless of side.
  return shape === BadgeShape.star
    ? STAR_BANNER_TOP_VISIBLE_RATIO
    : BANNER_TOP_VISIBLE_RATIO;
}

/** Banner rect geometry (x/y/width/height) for the given size, scale, and shape. */
export function getBannerBox(
  banner: BannerData,
  size: number,
  scale: number,
  shape?: BadgeShape,
): { x: number; y: number; w: number; h: number } {
  const topVisibleRatio = getBannerTopVisibleRatio(banner.position, shape);
  const w = size * BANNER_WIDTH_RATIO * scale;
  const h = size * BANNER_HEIGHT_RATIO * scale;
  const x = (size - w) / 2;
  const y =
    banner.position === "bottom"
      ? size - h * topVisibleRatio
      : -h * (1 - topVisibleRatio);
  return { x, y, w, h };
}

/**
 * Vertical amount the banner extends beyond the badge bounds: `top` is the
 * height above y=0, `bottom` is the height below y=size. The inactive
 * direction (i.e. the side the banner isn't on) returns 0.
 */
export function getBannerOverflow(
  banner: BannerData,
  size: number,
  scale: number,
  shape?: BadgeShape,
): { top: number; bottom: number } {
  const topVisibleRatio = getBannerTopVisibleRatio(banner.position, shape);
  const overflow = size * BANNER_HEIGHT_RATIO * scale * (1 - topVisibleRatio);
  return {
    top: banner.position !== "bottom" ? overflow : 0,
    bottom: banner.position === "bottom" ? overflow : 0,
  };
}

export function Banner({
  banner,
  size,
  badgeColor,
  topVisibleRatio = BANNER_TOP_VISIBLE_RATIO,
  borderColor = DEFAULT_BORDER_COLOR,
  fontFamily = fontFamilyTokens.mono,
  showShadow = true,
  scale = 1,
}: BannerProps): React.ReactElement | null {
  if (!banner || !banner.text || banner.text.trim().length === 0) return null;

  const bannerW = size * BANNER_WIDTH_RATIO * scale;
  const bannerH = size * BANNER_HEIGHT_RATIO * scale;
  const bannerX = (size - bannerW) / 2;
  // Compute Y using scaled bannerH so position matches rendered size
  const bannerY =
    banner.position === "bottom"
      ? size - bannerH * topVisibleRatio
      : -bannerH * (1 - topVisibleRatio);

  const bannerFill = getSafeTextColor(badgeColor, "Banner:fill");
  const textFill = getSafeTextColor(bannerFill, "Banner:text");
  const fontSize = size * BANNER_FONT_SIZE_RATIO * scale;

  return (
    <>
      {/* Shadow layer — hard shadow, no border radius; hidden in no-shadow themes */}
      {showShadow && (
        <Rect
          x={bannerX + BANNER_SHADOW_OFFSET}
          y={bannerY + BANNER_SHADOW_OFFSET}
          width={bannerW}
          height={bannerH}
          fill="#000000"
        />
      )}
      {/* Banner rect — solid fill, hard border, no border radius */}
      <Rect
        x={bannerX}
        y={bannerY}
        width={bannerW}
        height={bannerH}
        fill={bannerFill}
        stroke={borderColor}
        strokeWidth={BANNER_BORDER_WIDTH}
      />
      {/* Banner text — centered */}
      <Text
        x={size / 2}
        y={bannerY + bannerH / 2}
        textAnchor="middle"
        alignmentBaseline="central"
        fill={textFill}
        fontSize={fontSize}
        fontFamily={fontFamily}
      >
        {banner.text.trim()}
      </Text>
    </>
  );
}
