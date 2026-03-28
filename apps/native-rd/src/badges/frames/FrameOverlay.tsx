/**
 * FrameOverlay — delegates to the correct frame generator from the registry.
 *
 * Thin integration layer between BadgeRenderer and the frame generator
 * registry. Returns null for 'none' frames or missing params.
 * Catches generator errors to prevent frame bugs from crashing the badge.
 */
import React from 'react';
import type { BadgeFrame, BadgeShape, FrameDataParams } from '../types';
import { frameRegistry } from './registry';

export interface FrameOverlayProps {
  frame: BadgeFrame;
  shape: BadgeShape;
  size: number;
  inset: number;
  innerInset: number;
  params: FrameDataParams | undefined;
  strokeColor?: string;
}

export function FrameOverlay({
  frame,
  shape,
  size,
  inset,
  innerInset,
  params,
  strokeColor,
}: FrameOverlayProps): React.ReactElement | null {
  if (frame === 'none' || params === undefined) return null;

  const generator = frameRegistry[frame];
  if (!generator) {
    if (__DEV__) {
      console.warn(`[FrameOverlay] Unknown frame type "${frame}". Rendering without frame.`);
    }
    return null;
  }

  try {
    return generator({ shape, size, inset, innerInset, params, strokeColor });
  } catch (error) {
    if (__DEV__) {
      console.warn('[FrameOverlay] Frame generator threw, rendering without frame.', {
        frame,
        shape,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
}
