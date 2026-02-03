/**
 * Platform detection utilities for Open Badges Core
 *
 * Provides runtime environment detection to support both Node.js and Bun environments.
 * Used internally by crypto and baking modules to select appropriate platform APIs.
 */

/**
 * Supported runtime platforms
 */
export type Platform = "node" | "bun" | "unknown";

/**
 * Cached platform result to avoid repeated detection in hot paths
 */
let cachedPlatform: Platform | null = null;

/**
 * Detect the current runtime platform
 *
 * Results are memoized for performance since platform cannot change at runtime.
 *
 * @returns The detected platform type
 */
export function detectPlatform(): Platform {
  if (cachedPlatform !== null) {
    return cachedPlatform;
  }

  if (typeof process !== "undefined" && process.versions) {
    if (process.versions.bun) {
      cachedPlatform = "bun";
      return cachedPlatform;
    }
    if (process.versions.node) {
      cachedPlatform = "node";
      return cachedPlatform;
    }
  }
  cachedPlatform = "unknown";
  return cachedPlatform;
}

/**
 * Check if running in Bun runtime
 *
 * @returns True if running in Bun
 */
export function isBun(): boolean {
  return detectPlatform() === "bun";
}

/**
 * Check if running in Node.js runtime
 *
 * @returns True if running in Node.js
 */
export function isNode(): boolean {
  return detectPlatform() === "node";
}
