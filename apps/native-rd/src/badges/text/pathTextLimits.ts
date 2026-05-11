import type { BadgeShape } from "../types";
import {
  MAX_ARC_ANGLE,
  getPathTextRadius,
  type PathTextSide,
} from "../shapes/contours";
import { PATH_TEXT_FONT_SIZE_RATIO } from "./PathText";
import { measureTextWidth } from "./measureTextWidth";

/** Matches the BadgeDesigner preview at which arc geometry is calibrated. */
const REFERENCE_SIZE = 160;
/**
 * Matches `metrics.pathTextInset` at REFERENCE_SIZE in default density —
 * the value BadgeRenderer actually passes into PathText/generateContour,
 * not the raw stroke half-width. At size=160:
 *   strokeWidth/2 + REFERENCE_SIZE * (FRAME_BAND_RATIO − textInsetReduction)
 *   = 1.5 + 160 * (0.12 − 0.03) = 15.9
 * Rounded up so the derived cap is conservative. Using 1.5 here
 * overestimated arc capacity and still let strings overflow on device.
 */
const REFERENCE_INSET = 16;
/** Headroom for kerning + the largeText/dyslexia a11y font scales. */
const SAFETY_MARGIN = 0.92;

/**
 * Maximum path-text length, in characters, that fits on a given shape's arc
 * at the reference preview size. Derived from arc capacity rather than
 * hardcoded so changes to `getPathTextRadius`, `MAX_ARC_ANGLE`, or
 * `measureTextWidth`'s char-width factor reflow automatically.
 */
export function getPathTextMaxChars(
  shape: BadgeShape,
  side: PathTextSide,
): number {
  const r = getPathTextRadius(shape, REFERENCE_SIZE, REFERENCE_INSET, side);
  const arcLength = r * MAX_ARC_ANGLE;
  const fontSize = REFERENCE_SIZE * PATH_TEXT_FONT_SIZE_RATIO;
  const pxPerChar = measureTextWidth("X", fontSize);
  return Math.max(3, Math.floor((arcLength * SAFETY_MARGIN) / pxPerChar));
}
