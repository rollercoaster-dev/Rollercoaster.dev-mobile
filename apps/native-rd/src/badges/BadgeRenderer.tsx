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

import React, {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useId,
} from "react";
import { Buffer } from "buffer";
import Svg, { G, Path } from "react-native-svg";
import { useUnistyles } from "react-native-unistyles";
import type { IconWeight } from "phosphor-react-native";

import { BADGE_COLOR_THEME_SENTINEL, type BadgeDesign } from "./types";
import type { AppTheme } from "../themes";
import { generateShapePath } from "./shapes/paths";
import {
  getBadgeLayoutBoxes,
  SHADOW_OFFSET,
  type LayoutBoxesOptions,
} from "./layoutBoxes";
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

/**
 * Output dimensions for `captureAsPng` / `captureBadge`. Both axes are
 * required together — passing one without the other was a footgun in the
 * previous shape (the inner guard silently dropped both).
 *
 * Source via `getCaptureDimensions(design, max, layoutOptions)` with
 * layoutOptions matching the live theme, so the requested PNG aspect ratio
 * lines up with the renderer's actual viewBox.
 */
export interface CaptureBadgeOptions {
  width: number;
  height: number;
}

/**
 * Imperative handle exposed via `forwardRef`. Use with `useRef<BadgeRendererHandle>`
 * and pass the ref to `captureBadge(ref, options)`.
 *
 * `captureAsPng` serializes from the SVG model on the native side via
 * `react-native-svg`'s `toDataURL`, sidestepping the view-buffer timing race
 * that `react-native-view-shot`'s `captureRef` exhibited for non-trivial
 * designs.
 */
export interface BadgeRendererHandle {
  captureAsPng: (options?: CaptureBadgeOptions) => Promise<Buffer>;
}

/**
 * How long `captureAsPng` waits for the native `Svg.toDataURL` callback
 * before rejecting. A dropped native bridge or unmounted-mid-flight Svg
 * leaves the callback uninvoked — without this timeout, every awaiting
 * caller hangs indefinitely (the original failure mode this rewrite was
 * meant to escape, just one bridge call deeper).
 */
const CAPTURE_TIMEOUT_MS = 5_000;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Returns the `{ strokeWidth, hasShadow }` the renderer will actually use for
 * a given theme. Capture pipelines must consume this so `getCaptureDimensions`
 * sees the same viewBox the renderer mounts — a theme mismatch (e.g.
 * highContrast strokeWidth=4, shadowless variants) shifts the viewBox and the
 * requested capture dimensions need to stay in sync.
 */
export function getRendererLayoutOptions(
  theme: AppTheme,
  showShadowOverride?: boolean,
): Required<LayoutBoxesOptions> {
  const hasShadow = showShadowOverride ?? theme.shadows.opacity > 0;
  const isHighContrast =
    theme.variant === "highContrast" || theme.variant === "lowVision";
  const strokeWidth = isHighContrast ? 4 : 3;
  return { strokeWidth, hasShadow };
}

export const BadgeRenderer = forwardRef<
  BadgeRendererHandle,
  BadgeRendererProps
>(function BadgeRenderer(
  { design, size = 256, showShadow: showShadowProp, testID = "badge-renderer" },
  ref,
) {
  const { theme } = useUnistyles();
  const pathTextId = useId();
  const svgRef = useRef<Svg>(null);

  useImperativeHandle(
    ref,
    () => ({
      captureAsPng: (options) =>
        new Promise<Buffer>((resolve, reject) => {
          const node = svgRef.current;
          if (!node) {
            reject(
              new Error(
                "BadgeRenderer.captureAsPng: Svg is not mounted yet — attach the ref before calling capture",
              ),
            );
            return;
          }
          // react-native-svg attaches toDataURL as a class field on every
          // <Svg> instance. Older versions and forks may strip it.
          if (typeof node.toDataURL !== "function") {
            reject(
              new Error(
                "BadgeRenderer.captureAsPng: Svg.toDataURL is unavailable — check react-native-svg version",
              ),
            );
            return;
          }
          // Timeout guards against a dropped native bridge: the callback
          // would never fire, and the Promise constructor doesn't reject on
          // its own. Late callbacks after timeout become no-ops because
          // resolve/reject are latched.
          let settled = false;
          const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            reject(
              new Error(
                `BadgeRenderer.captureAsPng: toDataURL did not respond within ${CAPTURE_TIMEOUT_MS}ms — native bridge may have dropped the call`,
              ),
            );
          }, CAPTURE_TIMEOUT_MS);
          try {
            node.toDataURL((base64: unknown) => {
              if (settled) return;
              settled = true;
              clearTimeout(timer);
              // The (base64: string) annotation in react-native-svg's types
              // is a claim about the bridge contract, not an enforcement.
              // Older versions / forks have passed null/objects on failure.
              if (typeof base64 !== "string") {
                reject(
                  new Error(
                    `BadgeRenderer.captureAsPng: toDataURL returned a non-string (${typeof base64})`,
                  ),
                );
                return;
              }
              if (base64.length === 0) {
                reject(
                  new Error(
                    "BadgeRenderer.captureAsPng: toDataURL returned an empty result",
                  ),
                );
                return;
              }
              resolve(Buffer.from(base64, "base64"));
            }, options);
          } catch (err) {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            reject(
              err instanceof Error
                ? err
                : new Error(`BadgeRenderer.captureAsPng: ${String(err)}`),
            );
          }
        }),
    }),
    [],
  );

  const { strokeWidth, hasShadow } = getRendererLayoutOptions(
    theme,
    showShadowProp,
  );

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

  /**
   * Resolve the saved `borderColor` to a concrete color string. The `'theme'`
   * sentinel and a missing field both fall back to `theme.colors.border` so
   * existing badges keep tracking the active theme.
   */
  const resolvedBorderColor = useMemo(() => {
    const stored = design.borderColor;
    if (!stored || stored === BADGE_COLOR_THEME_SENTINEL) {
      return theme.colors.border;
    }
    return stored;
  }, [design.borderColor, theme.colors.border]);

  /**
   * Resolve the saved `iconColor`. Explicit hex wins; `'theme'` sentinel and
   * absent both fall back to the auto-contrast color so legacy designs keep
   * the prior behaviour.
   */
  const resolvedIconColor = useMemo(() => {
    const stored = design.iconColor;
    if (stored && stored !== BADGE_COLOR_THEME_SENTINEL) {
      return stored;
    }
    return getSafeTextColor(design.color, "BadgeRenderer");
  }, [design.iconColor, design.color]);

  /**
   * Resolve the saved `frameColor`. Explicit hex wins; `'theme'` sentinel and
   * absent both fall back to `theme.colors.border`, matching the historical
   * default for the frame ring before per-channel colors landed.
   */
  const frameStrokeColor = useMemo(() => {
    const stored = design.frameColor;
    if (stored && stored !== BADGE_COLOR_THEME_SENTINEL) {
      return stored;
    }
    return theme.colors.border;
  }, [design.frameColor, theme.colors.border]);
  const bannerBorderColor = theme.colors.border;

  const iconSize = iconOrMonogram.size;
  const iconOffsetX = iconOrMonogram.cx - iconSize / 2;
  const iconOffsetY = iconOrMonogram.cy - iconSize / 2;

  // Resolve icon component
  const IconComponent = getIconComponent(design.iconName);

  return (
    <Svg
      ref={svgRef}
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
        stroke={resolvedBorderColor}
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
        strokeColor={frameStrokeColor}
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
          textColor={resolvedIconColor}
        />
      ) : (
        IconComponent && (
          <G x={iconOffsetX} y={iconOffsetY}>
            <IconComponent
              size={iconSize}
              weight={(design.iconWeight ?? "regular") as IconWeight}
              color={resolvedIconColor}
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
        borderColor={bannerBorderColor}
        fontFamily={theme.fontFamily.mono}
        showShadow={hasShadow}
        scale={layout.bannerScale}
      />
    </Svg>
  );
});

BadgeRenderer.displayName = "BadgeRenderer";
