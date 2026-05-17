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

// Must match the `size` prop every capture-bearing BadgeRenderer is mounted
// at (160 in BadgeDesignerScreen, CompletionFlowScreen fallback + preview,
// and BadgeDetailScreen). iOS react-native-svg renders `toDataURL` content
// at the Svg view's on-screen layout size and stamps it into the upper-left
// of the requested PNG canvas — asking for a larger PNG than the view
// leaves the rest of the canvas transparent. Android scales freely, so it
// ignored the mismatch. If a new caller mounts BadgeRenderer at a different
// size, pass that size explicitly to getCaptureDimensions rather than
// editing this default.
const DEFAULT_SIZE = 160;

// Re-export so callers can `import { CaptureBadgeOptions } from "./captureBadge"`
// without having to know it's declared alongside the handle type.
export type { CaptureBadgeOptions };

/**
 * Compute capture dimensions that match the BadgeRenderer's viewBox exactly.
 *
 * iOS `react-native-svg.toDataURL` renders the SVG at the view's on-screen
 * layout size (= viewBox.w × viewBox.h) and stamps it into a PNG canvas of
 * the requested dimensions. Any mismatch leaves transparent margins or crops
 * content: ask for less than viewBox and you crop the bottom-right (losing
 * the badge shadow); ask for more and you get the badge stamped in the
 * corner of a mostly-empty PNG. Returning the exact viewBox dimensions
 * keeps the two sides aligned. Android scales freely, so the same numbers
 * also produce a correctly-filled PNG there.
 *
 * Pass `layoutOptions` matching the renderer's actual theme (use
 * `getRendererLayoutOptions(theme)` from `BadgeRenderer`). Omitting it falls
 * back to `getBadgeLayoutBoxes` defaults, which only matches the
 * non-highContrast / shadowed render path.
 *
 * `size` is the badge's core dimension (matches BadgeRenderer's `size` prop).
 * The returned width/height extend it to cover shadow, banner, and label
 * overflow exactly as the renderer's Svg view bounds do.
 */
export function getCaptureDimensions(
  design: BadgeDesign,
  size: number = DEFAULT_SIZE,
  layoutOptions: LayoutBoxesOptions = {},
): { width: number; height: number } {
  const { viewBox } = getBadgeLayoutBoxes(design, size, layoutOptions);
  return { width: Math.round(viewBox.w), height: Math.round(viewBox.h) };
}

/**
 * Capture a mounted BadgeRenderer as a PNG Buffer.
 *
 * @param ref - React ref attached to the BadgeRenderer (BadgeRendererHandle)
 * @param options - Output dimensions (default 160x160 to match renderer mounts)
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
