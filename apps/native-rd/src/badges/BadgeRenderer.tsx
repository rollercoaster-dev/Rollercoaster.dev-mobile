/**
 * BadgeRenderer — renders a full badge from a BadgeDesign configuration.
 *
 * Composes six layers (bottom to top):
 * 1. Shadow layer — solid black duplicate of the shape, offset down-right
 * 2. Shape layer — filled background shape with thick border
 * 3. Frame overlay — decorative frame band (boldBorder, guilloche, etc.)
 * 4. PathText — coin-style inscriptions following the shape contour
 * 5. Center layer — monogram text (centerMode: 'monogram') OR Phosphor icon
 *    (centerMode: 'icon'); optional BottomLabel rendered below the badge
 * 6. Banner — neo-brutalist ribbon overlay with text
 *
 * The icon color is auto-calculated for WCAG AA contrast against the shape
 * fill color using the existing accessibility utility.
 *
 * Theme variants are respected:
 *  - highContrast / lowVision: thicker borders, no shadow
 *  - autismFriendly: no shadow
 */

import React, { useMemo, useId } from "react";
import Svg, { G, Path } from "react-native-svg";
import { useUnistyles } from "react-native-unistyles";
import type { IconWeight } from "phosphor-react-native";

import type { BadgeDesign } from "./types";
import { generateShapePath } from "./shapes/paths";
import { getBadgeLayoutBoxes, SHADOW_OFFSET } from "./layoutBoxes";
import { FrameOverlay } from "./frames/FrameOverlay";
import { PathText } from "./text/PathText";
import { Banner } from "./text/Banner";
import { MonogramCenter } from "./text/MonogramCenter";
import { BottomLabel } from "./text/BottomLabel";
import { getIconComponent } from "./iconRegistry";
import { getSafeTextColor } from "../utils/accessibility";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BadgeRendererProps {
  /** Badge design configuration to render */
  design: BadgeDesign;
  /** Rendering size in logical pixels. Default 256. */
  size?: number;
  /** Override shadow visibility (default: derived from theme) */
  showShadow?: boolean;
  /** Test ID for testing */
  testID?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BadgeRenderer({
  design,
  size = 256,
  showShadow: showShadowProp,
  testID = "badge-renderer",
}: BadgeRendererProps) {
  const { theme } = useUnistyles();
  const pathTextId = useId();

  const hasShadow = showShadowProp ?? theme.shadows.opacity > 0;

  // highContrast / lowVision use thicker borders (autismFriendly is also no-shadow but uses normal borders).
  const isHighContrast =
    theme.variant === "highContrast" || theme.variant === "lowVision";
  const strokeWidth = isHighContrast ? 4 : 3;

  const boxes = useMemo(
    () => getBadgeLayoutBoxes(design, size, { strokeWidth, hasShadow }),
    [design, size, strokeWidth, hasShadow],
  );
  const {
    inset,
    innerInset,
    viewBox,
    iconOrMonogram,
    metrics: layout,
    bannerTopVisibleRatio,
    bottomLabelExtraOffset,
  } = boxes;

  const pathD = useMemo(
    () => generateShapePath(design.shape, size, inset),
    [design.shape, size, inset],
  );

  const iconColor = useMemo(
    () => getSafeTextColor(design.color, "BadgeRenderer"),
    [design.color],
  );

  const iconSize = iconOrMonogram.size;
  const iconOffsetX = iconOrMonogram.cx - iconSize / 2;
  const iconOffsetY = iconOrMonogram.cy - iconSize / 2;

  // Resolve icon component
  const IconComponent = getIconComponent(design.iconName);

  return (
    <Svg
      width={viewBox.w}
      height={viewBox.h}
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
      accessibilityRole="image"
      accessibilityLabel={`${design.title} badge, ${design.shape} shape`}
      testID={testID}
    >
      {/* Layer 1: Shadow — solid black duplicate offset down-right */}
      {hasShadow && (
        <Path
          d={pathD}
          fill="#000000"
          strokeLinejoin="round"
          translateX={SHADOW_OFFSET}
          translateY={SHADOW_OFFSET}
        />
      )}

      {/* Layer 2: Shape — filled background with border */}
      <Path
        d={pathD}
        fill={design.color}
        stroke={theme.colors.border}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />

      {/* Layer 3: Frame overlay */}
      <FrameOverlay
        frame={design.frame}
        shape={design.shape}
        size={size}
        inset={inset}
        innerInset={innerInset}
        params={design.frameParams}
        strokeColor={theme.colors.border}
      />

      {/* Layer 4: PathText — coin-style inscriptions along shape contour */}
      <PathText
        pathText={design.pathText}
        pathTextBottom={design.pathTextBottom}
        pathTextPosition={design.pathTextPosition}
        shape={design.shape}
        size={size}
        fillColor={design.color}
        inset={layout.pathTextInset}
        fontFamily={theme.fontFamily.mono}
        instanceId={pathTextId}
        fontScale={layout.pathTextFontScale}
      />

      {/* Layer 5: Center content — monogram OR icon */}
      {design.centerMode === "monogram" && design.monogram?.trim() ? (
        <MonogramCenter
          monogram={design.monogram}
          size={size}
          fillColor={design.color}
          fontFamily={theme.fontFamily.headline}
          scale={layout.centerContentScale}
          centerY={layout.centerY}
        />
      ) : (
        IconComponent && (
          <G x={iconOffsetX} y={iconOffsetY}>
            <IconComponent
              size={iconSize}
              weight={(design.iconWeight ?? "regular") as IconWeight}
              color={iconColor}
            />
          </G>
        )
      )}

      {/* Layer 5b: BottomLabel — optional label rendered below the badge */}
      <BottomLabel
        label={design.bottomLabel}
        size={size}
        fillColor={design.color}
        extraOffset={bottomLabelExtraOffset}
        fontFamily={theme.fontFamily.body}
        scale={layout.bottomLabelScale}
      />

      {/* Layer 6: Banner — neo-brutalist ribbon overlay */}
      <Banner
        banner={design.banner}
        size={size}
        badgeColor={design.color}
        topVisibleRatio={bannerTopVisibleRatio}
        borderColor={theme.colors.border}
        fontFamily={theme.fontFamily.mono}
        showShadow={hasShadow}
        scale={layout.bannerScale}
      />
    </Svg>
  );
}
