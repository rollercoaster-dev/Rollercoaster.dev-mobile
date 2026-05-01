import React from "react";
import { Text } from "react-native-svg";
import { BadgeShape } from "../types";
import { getSafeTextColor } from "../../utils/accessibility";
import { fontFamily as fontFamilyTokens } from "../../themes/tokens";

export interface BottomLabelProps {
  label: string | undefined;
  size: number;
  fillColor: string;
  extraOffset?: number;
  /** Font family name. Callers should pass theme.fontFamily.body for a11y variant support. */
  fontFamily?: string;
  /** Scale factor from layout density system. Scales font size. Default 1. */
  scale?: number;
}

/** Font size as fraction of badge diameter (~15%) */
export const BOTTOM_LABEL_SIZE_RATIO = 0.15;

/** Gap between badge bottom and the outside label, as a fraction of badge size */
export const BOTTOM_LABEL_TOP_MARGIN_RATIO = 0.03;

/** Maximum characters for bottom label */
export const BOTTOM_LABEL_MAX_CHARS = 10;

/**
 * Star badges have a deep concavity at the bottom, so the bottom label is
 * nudged further down to clear the points. Expressed as a fraction of size.
 */
export const STAR_BOTTOM_LABEL_EXTRA_OFFSET_RATIO = 0.18;

export function getBottomLabelExtraOffset(
  shape: BadgeShape,
  size: number,
): number {
  return shape === BadgeShape.star
    ? size * STAR_BOTTOM_LABEL_EXTRA_OFFSET_RATIO
    : 0;
}

export function getBottomLabelY(size: number, scale = 1): number {
  const fontSize = size * BOTTOM_LABEL_SIZE_RATIO * scale;
  const topMargin = size * BOTTOM_LABEL_TOP_MARGIN_RATIO;
  return size + topMargin + fontSize / 2;
}

export function getBottomLabelBottomOverflow(size: number, scale = 1): number {
  const fontSize = size * BOTTOM_LABEL_SIZE_RATIO * scale;
  const topMargin = size * BOTTOM_LABEL_TOP_MARGIN_RATIO;
  return topMargin + fontSize;
}

export function BottomLabel({
  label,
  size,
  fillColor,
  extraOffset = 0,
  fontFamily = fontFamilyTokens.body,
  scale = 1,
}: BottomLabelProps) {
  if (!label || label.trim().length === 0) return null;

  const text = label.trim().slice(0, BOTTOM_LABEL_MAX_CHARS);
  const fontSize = size * BOTTOM_LABEL_SIZE_RATIO * scale;
  const textColor = getSafeTextColor(fillColor, "BottomLabel");
  const cx = size / 2;
  const cy = getBottomLabelY(size, scale) + extraOffset;

  return (
    <Text
      x={cx}
      y={cy}
      textAnchor="middle"
      alignmentBaseline="central"
      fontFamily={fontFamily}
      fontSize={fontSize}
      fill={textColor}
    >
      {text}
    </Text>
  );
}
