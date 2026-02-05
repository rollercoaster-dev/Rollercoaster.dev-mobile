/**
 * Platform detection utilities for Open Badges Core
 *
 * Provides runtime environment detection to support both Node.js and Bun environments.
 * Used internally by crypto and baking modules to select appropriate platform APIs.
 */

/**
 * Supported runtime platforms
 */
export type Platform = "node" | "bun" | "react-native" | "unknown";

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

  // React Native detection (check before Node.js since RN may polyfill process)
  const nav = globalThis.navigator as { product?: string } | undefined;
  if (nav?.product === "ReactNative") {
    cachedPlatform = "react-native";
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

/**
 * Check if running in React Native
 *
 * @returns True if running in React Native
 */
export function isReactNative(): boolean {
  return detectPlatform() === "react-native";
}

/**
 * Assert that the current platform supports Node.js Buffer APIs.
 * Throws a descriptive error in React Native or unknown environments.
 *
 * @param feature - Name of the feature requiring server-side APIs
 */
export function assertBufferAvailable(feature: string): void {
  const platform = detectPlatform();
  if (platform === "react-native") {
    throw new Error(
      `${feature} is not supported in React Native. PNG baking requires Node.js or Bun runtime.`,
    );
  }
  if (platform === "unknown" && typeof Buffer === "undefined") {
    throw new Error(
      `${feature} requires Node.js or Bun runtime (Buffer API not available).`,
    );
  }
}
