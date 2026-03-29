/**
 * Microprint frame generator — tiny repeating text rendered as texture.
 *
 * Step names are joined with bullet separators and repeated to fill
 * concentric text paths inside the frame band. The text is readable
 * only when zoomed in, appearing as a fine texture at normal distance.
 *
 * Ring count is driven by evidenceCount: 2–4 concentric text rings.
 */
import React from "react";
import { ClipPath, Defs, G, Path, Text, TextPath } from "react-native-svg";
import { generateShapePath } from "../shapes/paths";
import { DEFAULT_STROKE_COLOR, clamp } from "./constants";
import type { FrameGenerator } from "./types";

let clipCounter = 0;

/** Font size as a fraction of badge size (~3%) */
export const MICROPRINT_FONT_SIZE_RATIO = 0.03;

/** Group opacity for the microprint texture (midpoint of 40–60% range) */
export const MICROPRINT_OPACITY = 0.5;

/** Minimum content string length to ensure full path coverage */
const MIN_CONTENT_LENGTH = 500;

/**
 * Build the text content string: step names joined with " • " separator,
 * repeated to reach minLength. Falls back to bullet pattern when empty.
 */
export function buildMicroprintContent(
  stepNames: string[] | undefined,
  minLength: number = MIN_CONTENT_LENGTH,
): string {
  const base =
    stepNames && stepNames.length > 0
      ? stepNames.join(" \u2022 ") + " \u2022 "
      : "\u2022 \u2022 \u2022 ";

  const repeats = Math.ceil(minLength / base.length);
  return base.repeat(repeats);
}

/**
 * Compute ring count from evidenceCount (2–4 rings, clamped).
 *
 * 0–4 evidence → 2 rings, 5–9 → 3 rings, 10+ → 4 rings.
 */
export function computeRingCount(evidenceCount: number): number {
  return clamp(Math.floor(evidenceCount / 5) + 2, 2, 4);
}

export const microprintGenerator: FrameGenerator = ({
  shape,
  size,
  inset,
  innerInset,
  params,
  strokeColor = DEFAULT_STROKE_COLOR,
}) => {
  if (innerInset <= inset) {
    if (__DEV__) {
      console.warn(
        "[microprintGenerator] Degenerate geometry: innerInset " +
          `(${innerInset}) <= inset (${inset}). Frame skipped.`,
      );
    }
    return null;
  }

  const clipId = `microprint-${++clipCounter}`;
  const fontSize = size * MICROPRINT_FONT_SIZE_RATIO;
  const ringCount = computeRingCount(params.evidenceCount);
  const bandWidth = innerInset - inset;
  const content = buildMicroprintContent(params.stepNames);

  const outerPath = generateShapePath(shape, size, inset);
  const innerPath = generateShapePath(shape, size, innerInset);

  // Build ring path definitions and text elements
  const ringPathDefs: React.ReactElement[] = [];
  const ringTexts: React.ReactElement[] = [];

  for (let i = 0; i < ringCount; i++) {
    const ringInset = inset + bandWidth * ((i + 0.5) / ringCount);
    const ringPathId = `microprint-path-${clipId}-${i}`;
    const ringD = generateShapePath(shape, size, ringInset);

    ringPathDefs.push(
      React.createElement(Path, {
        key: `path-${i}`,
        id: ringPathId,
        d: ringD,
        fill: "none",
      }),
    );

    ringTexts.push(
      React.createElement(
        Text,
        {
          key: `text-${i}`,
          fill: strokeColor,
          fontSize,
          fontFamily: "monospace",
        },
        React.createElement(
          TextPath,
          { href: `#${ringPathId}`, startOffset: "0%" },
          content,
        ),
      ),
    );
  }

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      Defs,
      null,
      React.createElement(
        ClipPath,
        { id: clipId },
        React.createElement(Path, {
          d: `${outerPath} ${innerPath}`,
          clipRule: "evenodd",
          fillRule: "evenodd",
        }),
      ),
      ...ringPathDefs,
    ),
    React.createElement(
      G,
      { clipPath: `url(#${clipId})`, opacity: MICROPRINT_OPACITY },
      ...ringTexts,
    ),
  );
};
