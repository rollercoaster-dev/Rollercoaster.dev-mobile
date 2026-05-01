import React from "react";
import { Text } from "react-native-svg";
import { getSafeTextColor } from "../../utils/accessibility";
import {
  fontFamily as fontFamilyTokens,
  fontWeight as fontWeightTokens,
} from "../../themes/tokens";

export interface MonogramCenterProps {
  monogram: string | undefined;
  size: number;
  fillColor: string;
  /** Font family name. Callers should pass theme.fontFamily.headline for a11y variant support. */
  fontFamily?: string;
  /** Font weight for the center monogram. */
  fontWeight?: string;
  /** Scale factor from layout density system. Scales font size. Default 1. */
  scale?: number;
  /** Center Y position from layout density system. Default size/2. */
  centerY?: number;
}

/** Font size as fraction of badge diameter — 1 character */
export const MONOGRAM_SIZE_RATIO_1 = 0.35;
/** Font size as fraction of badge diameter — 2 characters */
export const MONOGRAM_SIZE_RATIO_2 = 0.28;
/** Font size as fraction of badge diameter — 3 characters */
export const MONOGRAM_SIZE_RATIO_3 = 0.22;

const RATIO_BY_LENGTH = [
  MONOGRAM_SIZE_RATIO_1,
  MONOGRAM_SIZE_RATIO_2,
  MONOGRAM_SIZE_RATIO_3,
];

/**
 * Resolve the rendered monogram font size for a non-empty trimmed string,
 * applying the same 1/2/3-char ratio table the component uses. Pure — usable
 * by layout-box consumers that need monogram dimensions without rendering.
 *
 * Precondition: `monogram.trim()` is non-empty. Returns 0 for empty input
 * so layout consumers don't silently get a non-zero size for absent text.
 */
export function getMonogramFontSize(
  monogram: string,
  size: number,
  scale = 1,
): number {
  const chars = monogram.trim().slice(0, 3);
  if (chars.length === 0) return 0;
  const ratio = RATIO_BY_LENGTH[chars.length - 1];
  return size * ratio * scale;
}

export function MonogramCenter({
  monogram,
  size,
  fillColor,
  fontFamily = fontFamilyTokens.headline,
  fontWeight = fontWeightTokens.bold,
  scale = 1,
  centerY,
}: MonogramCenterProps) {
  if (!monogram || monogram.trim().length === 0) return null;

  const chars = monogram.trim().slice(0, 3);
  const fontSize = getMonogramFontSize(monogram, size, scale);
  const textColor = getSafeTextColor(fillColor, "MonogramCenter");
  const cx = size / 2;
  const cy = centerY ?? size / 2;

  return (
    <Text
      x={cx}
      y={cy}
      textAnchor="middle"
      alignmentBaseline="central"
      fontFamily={fontFamily}
      fontWeight={fontWeight}
      fontSize={fontSize}
      fill={textColor}
    >
      {chars}
    </Text>
  );
}
