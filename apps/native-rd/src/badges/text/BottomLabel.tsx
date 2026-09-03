import React from "react";
import { Rect, Text } from "react-native-svg";
import { BadgeShape } from "../types";
import { getSafeTextColor } from "../../utils/accessibility";
import { fontFamily as fontFamilyTokens } from "../../themes/tokens";
import { measureTextWidth } from "./measureTextWidth";

export interface BottomLabelProps {
  label: string | undefined;
  size: number;
  fillColor: string;
  extraOffset?: number;
  /** Font family name. Callers should pass theme.fontFamily.body for a11y variant support. */
  fontFamily?: string;
  /** Scale factor from layout density system. Scales font size. Default 1. */
  scale?: number;
  /** Plate border color. Pass theme.colors.border (matches the banner's hard border). */
  borderColor: string;
}

/** Font size as fraction of badge diameter (~15%) */
export const BOTTOM_LABEL_SIZE_RATIO = 0.15;

/** Gap between badge bottom and the outside label plate, as a fraction of badge size */
export const BOTTOM_LABEL_TOP_MARGIN_RATIO = 0.03;

/**
 * Horizontal inset inside the badge/frame width. Doubles as the plate's
 * horizontal padding, so the plate's outer edge never exceeds the badge width.
 */
export const BOTTOM_LABEL_HORIZONTAL_PADDING = 4;

/**
 * Vertical plate padding as a fraction of the label font size. The label sits
 * outside the badge on whatever the badge is shown against, so the text gets
 * its own plate in the badge color to guarantee contrast on any background.
 */
export const BOTTOM_LABEL_PLATE_PADDING_Y_RATIO = 0.25;

/** Border width for the plate rect, matching the banner's hard border. */
export const BOTTOM_LABEL_PLATE_BORDER_WIDTH = 2;

/** Maximum input characters for bottom label. Text still scales to fit the frame width. */
export const BOTTOM_LABEL_INPUT_MAX_CHARS = 24;

/** @deprecated Use BOTTOM_LABEL_INPUT_MAX_CHARS. */
export const BOTTOM_LABEL_MAX_CHARS = BOTTOM_LABEL_INPUT_MAX_CHARS;

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

function getBaseFontSize(size: number, scale: number): number {
  return size * BOTTOM_LABEL_SIZE_RATIO * scale;
}

function getPlatePaddingY(fontSize: number): number {
  return fontSize * BOTTOM_LABEL_PLATE_PADDING_Y_RATIO;
}

/** Vertical center of the label text (and its plate), before any extra offset. */
export function getBottomLabelY(size: number, scale = 1): number {
  const fontSize = getBaseFontSize(size, scale);
  const topMargin = size * BOTTOM_LABEL_TOP_MARGIN_RATIO;
  return size + topMargin + getPlatePaddingY(fontSize) + fontSize / 2;
}

/** How far below the badge the plate's outer edge reaches, before any extra offset. */
export function getBottomLabelBottomOverflow(size: number, scale = 1): number {
  const fontSize = getBaseFontSize(size, scale);
  const topMargin = size * BOTTOM_LABEL_TOP_MARGIN_RATIO;
  return topMargin + fontSize + 2 * getPlatePaddingY(fontSize);
}

export function getBottomLabelAvailableWidth(size: number): number {
  return Math.max(0, size - BOTTOM_LABEL_HORIZONTAL_PADDING * 2);
}

export function getBottomLabelFontSize(
  label: string,
  size: number,
  scale = 1,
): number {
  const baseFontSize = getBaseFontSize(size, scale);
  const availableWidth = getBottomLabelAvailableWidth(size);
  const measuredWidth = measureTextWidth(label, baseFontSize);

  if (measuredWidth <= availableWidth || measuredWidth === 0) {
    return baseFontSize;
  }

  return baseFontSize * (availableWidth / measuredWidth);
}

export interface BottomLabelPlateBox {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Resolved (possibly shrunk-to-fit) font size of the label text. */
  fontSize: number;
  /** Vertical center of the text and plate, extra offset included. */
  cy: number;
}

/**
 * Outer box of the label plate (border included) for an already-trimmed label.
 * Shared by the renderer and the layout-box model so both agree on geometry.
 */
export function getBottomLabelPlateBox(
  label: string,
  size: number,
  scale = 1,
  extraOffset = 0,
): BottomLabelPlateBox {
  const fontSize = getBottomLabelFontSize(label, size, scale);
  const cy = getBottomLabelY(size, scale) + extraOffset;
  const textWidth = measureTextWidth(label, fontSize);
  const w = textWidth + BOTTOM_LABEL_HORIZONTAL_PADDING * 2;
  const h = fontSize + 2 * getPlatePaddingY(fontSize);
  return { x: size / 2 - w / 2, y: cy - h / 2, w, h, fontSize, cy };
}

export function BottomLabel({
  label,
  size,
  fillColor,
  extraOffset = 0,
  fontFamily = fontFamilyTokens.body,
  scale = 1,
  borderColor,
}: BottomLabelProps) {
  if (!label || label.trim().length === 0) return null;

  const text = label.trim().slice(0, BOTTOM_LABEL_INPUT_MAX_CHARS);
  const plate = getBottomLabelPlateBox(text, size, scale, extraOffset);
  const textColor = getSafeTextColor(fillColor, "BottomLabel");
  // Stroke is centered on the rect edge, so inset by half the border to keep
  // the plate's outer edge inside the box the layout model reserves for it.
  const inset = BOTTOM_LABEL_PLATE_BORDER_WIDTH / 2;

  return (
    <>
      {/* Plate — badge-colored ground so the label reads on any backdrop */}
      <Rect
        x={plate.x + inset}
        y={plate.y + inset}
        width={plate.w - BOTTOM_LABEL_PLATE_BORDER_WIDTH}
        height={plate.h - BOTTOM_LABEL_PLATE_BORDER_WIDTH}
        fill={fillColor}
        stroke={borderColor}
        strokeWidth={BOTTOM_LABEL_PLATE_BORDER_WIDTH}
      />
      <Text
        x={size / 2}
        y={plate.cy}
        textAnchor="middle"
        alignmentBaseline="central"
        fontFamily={fontFamily}
        fontSize={plate.fontSize}
        fill={textColor}
      >
        {text}
      </Text>
    </>
  );
}
