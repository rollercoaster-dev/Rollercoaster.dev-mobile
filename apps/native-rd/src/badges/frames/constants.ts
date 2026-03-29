/** Shared constants for frame generators */

/** Default stroke color when none is provided by the caller */
export const DEFAULT_STROKE_COLOR = "#000000";

/** Clamp a value to [min, max] range */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
