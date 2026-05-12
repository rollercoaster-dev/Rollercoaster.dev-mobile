/**
 * captureBadge
 *
 * Rasterizes a mounted BadgeRenderer to a PNG Buffer using
 * react-native-view-shot's captureRef API.
 *
 * The caller must:
 *   1. Render the BadgeRenderer inside a native wrapper view, e.g.
 *        <View ref={ref} collapsable={false}><BadgeRenderer ... /></View>.
 *      `BadgeRenderer` is a function component without `forwardRef`, so the
 *      ref must target a real native view. The wrapper must be padding/border
 *      free or it will be captured along with the SVG and reintroduce
 *      stretching.
 *   2. Pass that wrapper ref to this function.
 *   3. Pass dimensions from `getCaptureDimensions(design, options)` —
 *      `captureRef` stretches the source view to the requested w/h, so a
 *      non-square viewBox needs matching non-square output. `options` must
 *      reflect the renderer's actual theme-derived `{ strokeWidth, hasShadow }`
 *      (see `getRendererLayoutOptions` in `BadgeRenderer`).
 *
 * Returns a Buffer containing the PNG bytes, ready for bakePNG().
 */

import { captureRef } from "react-native-view-shot";
import { Buffer } from "buffer";
import { isPNG } from "./png-baking";
import { getBadgeLayoutBoxes, type LayoutBoxesOptions } from "./layoutBoxes";
import type { BadgeDesign } from "./types";

const DEFAULT_SIZE = 512;

export interface CaptureBadgeOptions {
  width?: number;
  height?: number;
}

/**
 * Compute aspect-ratio-preserving capture dimensions for a badge design.
 *
 * The BadgeRenderer's SVG viewBox is non-square whenever a top banner or
 * bottom label is present, and the shadow / stroke configuration shifts the
 * viewBox proportions further. `captureRef` stretches the source view to
 * whatever width/height it's given, so asking for a square output on a
 * non-square source produces a visually squashed PNG. Use this helper to pick
 * dimensions that match the source.
 *
 * Pass `layoutOptions` matching the renderer's actual theme (use
 * `getRendererLayoutOptions(theme)` from `BadgeRenderer`). Omitting it falls
 * back to `getBadgeLayoutBoxes` defaults, which only matches the
 * non-highContrast / shadowed render path.
 *
 * The longer side is `maxDimension`; the shorter side is scaled to preserve
 * `viewBox.w / viewBox.h`.
 */
export function getCaptureDimensions(
  design: BadgeDesign,
  maxDimension: number = DEFAULT_SIZE,
  layoutOptions: LayoutBoxesOptions = {},
): { width: number; height: number } {
  const { viewBox } = getBadgeLayoutBoxes(design, maxDimension, layoutOptions);
  const ratio = viewBox.w / viewBox.h;
  return ratio >= 1
    ? { width: maxDimension, height: Math.round(maxDimension / ratio) }
    : { width: Math.round(maxDimension * ratio), height: maxDimension };
}

/**
 * Capture a mounted BadgeRenderer view as a PNG Buffer.
 *
 * @param ref - React ref attached to the BadgeRenderer's wrapping View
 * @param options - Output dimensions (default 512x512)
 * @returns PNG Buffer suitable for bakePNG()
 */
export async function captureBadge(
  ref: React.RefObject<unknown>,
  options?: CaptureBadgeOptions,
): Promise<Buffer> {
  if (!ref.current) {
    throw new Error(
      "captureBadge: ref.current is null — ensure the BadgeRenderer is mounted before calling captureBadge",
    );
  }

  const width = options?.width ?? DEFAULT_SIZE;
  const height = options?.height ?? DEFAULT_SIZE;

  let base64: string;
  try {
    base64 = await captureRef(ref, {
      format: "png",
      quality: 1,
      result: "base64",
      width,
      height,
    });
  } catch (err) {
    throw new Error(
      `captureBadge: captureRef failed — ${err instanceof Error ? err.message : String(err)}`,
      { cause: err },
    );
  }

  const buffer = Buffer.from(base64, "base64");

  if (!isPNG(buffer)) {
    throw new Error("captureBadge: captured data is not a valid PNG");
  }

  return buffer;
}
