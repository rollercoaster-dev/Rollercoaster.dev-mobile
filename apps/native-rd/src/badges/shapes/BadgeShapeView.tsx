/**
 * BadgeShapeView — renders a badge background shape as SVG.
 *
 * Each shape is drawn as a filled `<Path>` with a thick black stroke and a
 * hard-offset shadow layer (solid black duplicate translated down-right).
 *
 * Theme variants are respected:
 *  - highContrast / lowVision: thicker borders, no shadow
 *  - autismFriendly: no shadow
 *
 * The component renders inside a consistent square bounding box controlled
 * by the `size` prop (default 256).
 */

import React from "react";
import Svg, { Path } from "react-native-svg";
import { useUnistyles } from "react-native-unistyles";
import { type BadgeShape } from "../types";
import { generateShapePath } from "./paths";

export interface BadgeShapeViewProps {
  /** Which shape to render */
  shape: BadgeShape;
  /** Fill color for the shape (hex string) */
  fillColor: string;
  /** Bounding box size in logical pixels. Default 256. */
  size?: number;
  /** Stroke width in logical pixels. Default 3. */
  strokeWidth?: number;
  /** Override shadow visibility (default: derived from theme) */
  showShadow?: boolean;
}

/**
 * Default shadow offset in logical pixels (down-right).
 */
const SHADOW_OFFSET = 5;

export function BadgeShapeView({
  shape,
  fillColor,
  size = 256,
  strokeWidth: strokeWidthProp,
  showShadow: showShadowProp,
}: BadgeShapeViewProps) {
  const { theme } = useUnistyles();

  // Derive shadow visibility from theme when not explicitly set
  const hasShadow = showShadowProp ?? theme.shadows.opacity > 0;

  // High contrast / lowVision: thicker borders (autismFriendly also has opacity 0 but is NOT high contrast)
  const isHighContrast =
    theme.variant === "highContrast" || theme.variant === "lowVision";
  const resolvedStrokeWidth = strokeWidthProp ?? (isHighContrast ? 4 : 3);

  // Inset shapes by half the stroke width so the stroke doesn't clip
  const inset = resolvedStrokeWidth / 2;

  // Expand the SVG to include shadow offset so shape doesn't scale down
  const totalSize = size + (hasShadow ? SHADOW_OFFSET : 0);

  const pathD = generateShapePath(shape, size, inset);

  return (
    <Svg
      width={totalSize}
      height={totalSize}
      viewBox={`0 0 ${totalSize} ${totalSize}`}
      accessibilityRole="image"
      accessibilityLabel={`${shape} badge shape`}
    >
      {/* Shadow layer: solid black duplicate offset down-right */}
      {hasShadow && (
        <Path
          d={pathD}
          fill="#000000"
          strokeLinejoin="round"
          translateX={SHADOW_OFFSET}
          translateY={SHADOW_OFFSET}
        />
      )}

      {/* Main shape */}
      <Path
        d={pathD}
        fill={fillColor}
        stroke={theme.colors.border}
        strokeWidth={resolvedStrokeWidth}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
