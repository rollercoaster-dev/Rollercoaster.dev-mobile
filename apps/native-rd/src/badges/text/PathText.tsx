import React from "react";
import { Defs, G, Path, Text, TextPath } from "react-native-svg";
import type { BadgeShape, PathTextPosition } from "../types";
import { generateContour } from "../shapes/contours";
import { getSafeTextColor } from "../../utils/accessibility";
import { fontFamily as fontFamilyTokens } from "../../themes/tokens";

export interface PathTextProps {
  pathText: string | undefined;
  pathTextBottom: string | undefined;
  pathTextPosition: PathTextPosition | undefined;
  shape: BadgeShape;
  size: number;
  fillColor: string;
  inset?: number;
  /** Font family for inscription. Callers should pass theme.fontFamily.mono for a11y variant support. */
  fontFamily?: string;
  /** Stable unique identifier for SVG path IDs. Prevents ID collisions across multiple badges. */
  instanceId?: string;
  /** Scale factor applied to font size (from layout density system). Default 1. */
  fontScale?: number;
}

/** Font size as fraction of badge diameter (~9%, midpoint of 8-10% spec) */
export const PATH_TEXT_FONT_SIZE_RATIO = 0.09;

/** Fill opacity for path text — kept at 1.0 so getSafeTextColor contrast holds */
export const PATH_TEXT_OPACITY = 1;

/** Monotonic counter — only used as fallback when no instanceId is provided */
let nextPathTextId = 0;

export function PathText({
  pathText,
  pathTextBottom,
  pathTextPosition,
  shape,
  size,
  fillColor,
  inset = 0,
  fontFamily = fontFamilyTokens.mono,
  instanceId,
  fontScale = 1,
}: PathTextProps): React.ReactElement | null {
  const position = pathTextPosition ?? "top";
  const showTop = position === "top" || position === "both";
  const showBottom = position === "bottom" || position === "both";

  const topText = showTop ? pathText?.trim() : undefined;
  const bottomText = showBottom ? pathTextBottom?.trim() : undefined;

  if (!topText && !bottomText) return null;

  const contour = generateContour(shape, size, inset);
  const id = instanceId ?? String(nextPathTextId++);
  const topId = `pathtext-top-${id}`;
  const bottomId = `pathtext-bottom-${id}`;
  const fontSize = size * PATH_TEXT_FONT_SIZE_RATIO * fontScale;
  const textColor = getSafeTextColor(fillColor, "PathText");
  const rotateTransform = `rotate(180 ${size / 2} ${size / 2})`;
  const renderedTopText = topText;
  const renderedBottomText = bottomText;

  return (
    <>
      <Defs>
        {topText && <Path id={topId} d={contour.textPathTop} fill="none" />}
        {bottomText && (
          <Path id={bottomId} d={contour.textPathBottom} fill="none" />
        )}
      </Defs>
      <G transform={rotateTransform}>
        {renderedTopText && (
          <Text
            fill={textColor}
            fillOpacity={PATH_TEXT_OPACITY}
            fontSize={fontSize}
            fontFamily={fontFamily}
          >
            <TextPath href={`#${topId}`} startOffset="50%" textAnchor="middle">
              {renderedTopText}
            </TextPath>
          </Text>
        )}
        {renderedBottomText && (
          <Text
            fill={textColor}
            fillOpacity={PATH_TEXT_OPACITY}
            fontSize={fontSize}
            fontFamily={fontFamily}
          >
            <TextPath
              href={`#${bottomId}`}
              startOffset="50%"
              textAnchor="middle"
            >
              {renderedBottomText}
            </TextPath>
          </Text>
        )}
      </G>
    </>
  );
}
