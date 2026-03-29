/**
 * BadgeRenderer — renders a full badge from a BadgeDesign configuration.
 *
 * Composes six layers (bottom to top):
 * 1. Shadow layer — solid black duplicate of the shape, offset down-right
 * 2. Shape layer — filled background shape with thick border
 * 3. Frame overlay — decorative frame band (boldBorder, guilloche, etc.)
 * 4. PathText — coin-style inscriptions following the shape contour
 * 5. Center layer — monogram text (centerMode: 'monogram') OR Phosphor icon
 *    (centerMode: 'icon'); optional CenterLabel below
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
import { FRAME_BAND_RATIO } from "./shapes/contours";
import { getBadgeLayoutMetrics } from "./layout";
import { FrameOverlay } from "./frames/FrameOverlay";
import { PathText } from "./text/PathText";
import {
  Banner,
  BANNER_HEIGHT_RATIO,
  BANNER_TOP_VISIBLE_RATIO,
  getBannerTopVisibleRatio,
} from "./text/Banner";
import { MonogramCenter } from "./text/MonogramCenter";
import { CenterLabel, getCenterLabelBottomOverflow } from "./text/CenterLabel";
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
// Constants
// ---------------------------------------------------------------------------

/** Shadow offset in logical pixels (down-right) */
const SHADOW_OFFSET = 5;

/** Icon size as a fraction of badge size */
const ICON_SIZE_RATIO = 0.45;
const STAR_CENTER_LABEL_EXTRA_OFFSET_RATIO = 0.18;

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

  // Derive shadow visibility from theme when not explicitly set
  const hasShadow = showShadowProp ?? theme.shadows.opacity > 0;

  // High contrast / lowVision: thicker borders (autismFriendly also has opacity 0 but is NOT high contrast)
  const isHighContrast =
    theme.variant === "highContrast" || theme.variant === "lowVision";
  const strokeWidth = isHighContrast ? 4 : 3;

  // Inset shapes by half the stroke width so the stroke doesn't clip
  const inset = strokeWidth / 2;
  const innerInset = inset + size * FRAME_BAND_RATIO;

  // Adaptive layout density — scales text/content when badge gets crowded
  const layout = getBadgeLayoutMetrics(design, size, inset, innerInset);

  const bannerTopVisibleRatio = design.banner
    ? getBannerTopVisibleRatio(design.banner.position, design.shape)
    : BANNER_TOP_VISIBLE_RATIO;
  const centerLabelExtraOffset =
    design.shape === "star" && design.centerLabel?.trim()
      ? size * STAR_CENTER_LABEL_EXTRA_OFFSET_RATIO
      : 0;

  // Expand the SVG to include shadow offset so badge doesn't scale down
  const totalWidth = size + (hasShadow ? SHADOW_OFFSET : 0);
  const bannerOverflowAmount = design.banner
    ? size *
      BANNER_HEIGHT_RATIO *
      layout.bannerScale *
      (1 - bannerTopVisibleRatio)
    : 0;
  const bannerTopOverflow =
    design.banner?.position !== "bottom" ? bannerOverflowAmount : 0;
  const bannerBottomOverflow =
    design.banner?.position === "bottom" ? bannerOverflowAmount : 0;
  const centerLabelBottomOverflow = design.centerLabel?.trim()
    ? getCenterLabelBottomOverflow(size, layout.centerLabelScale) +
      centerLabelExtraOffset
    : 0;
  const totalHeight =
    size +
    (hasShadow ? SHADOW_OFFSET : 0) +
    bannerTopOverflow +
    Math.max(bannerBottomOverflow, centerLabelBottomOverflow);

  // Generate the shape path
  const pathD = useMemo(
    () => generateShapePath(design.shape, size, inset),
    [design.shape, size, inset],
  );

  // Calculate icon color for WCAG AA contrast against fill
  const iconColor = useMemo(
    () => getSafeTextColor(design.color, "BadgeRenderer"),
    [design.color],
  );

  // Icon sizing — centered at ~45% of badge diameter, scaled by layout density
  const iconSize = Math.round(
    size * ICON_SIZE_RATIO * layout.centerContentScale,
  );
  const iconOffsetX = (size - iconSize) / 2;
  const iconOffsetY = layout.centerY - iconSize / 2;

  // Resolve icon component
  const IconComponent = getIconComponent(design.iconName);

  return (
    <Svg
      width={totalWidth}
      height={totalHeight}
      viewBox={`0 ${-bannerTopOverflow} ${totalWidth} ${totalHeight}`}
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

      {/* Layer 5b: CenterLabel — optional label below center content */}
      <CenterLabel
        label={design.centerLabel}
        size={size}
        fillColor={design.color}
        extraOffset={centerLabelExtraOffset}
        fontFamily={theme.fontFamily.body}
        scale={layout.centerLabelScale}
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
