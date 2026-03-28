/**
 * captureBadge
 *
 * Rasterizes a mounted BadgeRenderer to a 512x512 PNG Buffer using
 * react-native-view-shot's captureRef API.
 *
 * The caller must:
 *   1. Render a <BadgeRenderer ref={ref} design={design} size={512} showShadow={false} />
 *      in the component tree (can be off-screen / zero-opacity)
 *   2. Pass the ref to this function
 *
 * Returns a Buffer containing the PNG bytes, ready for bakePNG().
 */

import { captureRef } from 'react-native-view-shot';
import { Buffer } from 'buffer';
import { isPNG } from './png-baking';

const DEFAULT_SIZE = 512;

export interface CaptureBadgeOptions {
  width?: number;
  height?: number;
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
      'captureBadge: ref.current is null — ensure the BadgeRenderer is mounted before calling captureBadge',
    );
  }

  const width = options?.width ?? DEFAULT_SIZE;
  const height = options?.height ?? DEFAULT_SIZE;

  let base64: string;
  try {
    base64 = await captureRef(ref, {
      format: 'png',
      quality: 1,
      result: 'base64',
      width,
      height,
    });
  } catch (err) {
    throw new Error(
      `captureBadge: captureRef failed — ${err instanceof Error ? err.message : String(err)}`,
      { cause: err },
    );
  }

  const buffer = Buffer.from(base64, 'base64');

  if (!isPNG(buffer)) {
    throw new Error('captureBadge: captured data is not a valid PNG');
  }

  return buffer;
}
