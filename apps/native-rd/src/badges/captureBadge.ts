/**
 * captureBadge
 *
 * Rasterizes a mounted BadgeRenderer to a PNG Buffer via the renderer's
 * imperative handle (which calls `react-native-svg`'s `Svg.toDataURL` under
 * the hood — serializing the SVG model on the native side rather than
 * snapshotting a view buffer).
 *
 * The caller must:
 *   1. Render the BadgeRenderer with a ref of type `BadgeRendererHandle`:
 *        const ref = useRef<BadgeRendererHandle | null>(null);
 *        <BadgeRenderer ref={ref} design={...} />
 *      The handle is exposed via `forwardRef` + `useImperativeHandle` from
 *      BadgeRenderer itself, so there's no wrapper view in the capture loop.
 *   2. Pass that ref to this function.
 *   3. Pass dimensions from `getCaptureDimensions(design, options)`. The
 *      `options` argument must reflect the renderer's actual theme-derived
 *      `{ strokeWidth, hasShadow }` (see `getRendererLayoutOptions`).
 *
 * Returns a Buffer containing the PNG bytes, ready for bakePNG().
 */

import { Buffer } from "buffer";
import { isPNG } from "./png-baking";
import { getBadgeLayoutBoxes, type LayoutBoxesOptions } from "./layoutBoxes";
import type { BadgeDesign } from "./types";
import type { BadgeRendererHandle, CaptureBadgeOptions } from "./BadgeRenderer";

const DEFAULT_SIZE = 512;

// Re-export so callers can `import { CaptureBadgeOptions } from "./captureBadge"`
// without having to know it's declared alongside the handle type.
export type { CaptureBadgeOptions };

/**
 * Compute aspect-ratio-preserving capture dimensions for a badge design.
 *
 * The BadgeRenderer's SVG viewBox is non-square whenever a top banner or
 * bottom label is present, and the shadow / stroke configuration shifts the
 * viewBox proportions further. The capture path requests a target output
 * width/height, so asking for a square output on a non-square source produces
 * a visually squashed PNG. Use this helper to pick dimensions that match the
 * source viewBox.
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
 * Capture a mounted BadgeRenderer as a PNG Buffer.
 *
 * @param ref - React ref attached to the BadgeRenderer (BadgeRendererHandle)
 * @param options - Output dimensions (default 512x512)
 * @returns PNG Buffer suitable for bakePNG()
 */
export async function captureBadge(
  ref: React.RefObject<BadgeRendererHandle | null>,
  options?: CaptureBadgeOptions,
): Promise<Buffer> {
  const handle = ref.current;
  if (!handle) {
    throw new Error(
      "captureBadge: ref.current is null — ensure the BadgeRenderer is mounted before calling captureBadge",
    );
  }

  const width = options?.width ?? DEFAULT_SIZE;
  const height = options?.height ?? DEFAULT_SIZE;

  let buffer: Buffer;
  try {
    buffer = await handle.captureAsPng({ width, height });
  } catch (err) {
    throw new Error(
      `captureBadge: capture failed — ${err instanceof Error ? err.message : String(err)}`,
      { cause: err },
    );
  }

  if (!isPNG(buffer)) {
    throw new Error("captureBadge: captured data is not a valid PNG");
  }

  return buffer;
}
