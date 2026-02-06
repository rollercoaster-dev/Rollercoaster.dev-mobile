/**
 * Badge Baking Module
 *
 * Handles embedding Open Badges credentials into image files.
 * Currently supports PNG format via iTXt chunk embedding.
 *
 * @example
 * ```typescript
 * import { bakePNG, unbakePNG } from '@rollercoaster-dev/openbadges-core';
 *
 * // Embed a credential into a PNG image
 * const bakedPNG = bakePNG(imageBuffer, credential);
 *
 * // Extract a credential from a baked PNG
 * const credential = unbakePNG(bakedPNG);
 * ```
 */

// PNG baking
export { bakePNG, unbakePNG, isPNG } from "./png-baking.js";

// Chunk utilities (for advanced usage)
export type { Chunk } from "./png-chunk-utils.js";
