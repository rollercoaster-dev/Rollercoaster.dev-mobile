/**
 * Platform detection and configuration for Open Badges Core
 *
 * Provides runtime environment detection and a configure() system for
 * injecting platform-specific crypto/key providers. Node.js and Bun get
 * defaults automatically; React Native must call configure() at startup.
 */

import type { PlatformConfig } from "./crypto/adapters/types.js";
import { NodeCryptoAdapter } from "./crypto/adapters/node-crypto.adapter.js";
import { InMemoryKeyProvider } from "./crypto/key-provider.js";

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

// --- Platform Configuration ---

let platformConfig: PlatformConfig | null = null;

/**
 * Configure platform-specific providers for openbadges-core.
 *
 * Must be called before any crypto operations in React Native.
 * Node.js/Bun environments auto-initialize with defaults if not called.
 *
 * @example
 * ```typescript
 * // React Native — required
 * import { configure } from '@rollercoaster-dev/openbadges-core';
 * configure({
 *   crypto: expoCryptoAdapter,
 *   keyProvider: secureStoreKeyProvider,
 * });
 *
 * // Node.js/Bun — optional (defaults are provided)
 * // No configure() call needed.
 * ```
 */
export function configure(config: PlatformConfig): void {
  platformConfig = config;
}

/**
 * Get the current platform configuration.
 *
 * In Node.js/Bun, lazily initializes with defaults (NodeCryptoAdapter + InMemoryKeyProvider).
 * In React Native, throws if configure() has not been called.
 */
export function getPlatformConfig(): PlatformConfig {
  if (platformConfig !== null) {
    return platformConfig;
  }

  const platform = detectPlatform();
  if (platform === "react-native") {
    throw new Error(
      "openbadges-core: configure() must be called before using crypto operations in React Native. " +
        "Provide a CryptoProvider and KeyProvider for your platform. " +
        "See: https://github.com/rollercoaster-dev/monorepo/tree/main/packages/openbadges-core#platform-configuration",
    );
  }

  // Auto-initialize with Node.js/Bun defaults
  platformConfig = {
    crypto: new NodeCryptoAdapter(),
    keyProvider: new InMemoryKeyProvider(),
  };
  return platformConfig;
}

/**
 * Reset platform configuration (for testing only).
 * @internal
 */
export function resetPlatformConfig(): void {
  platformConfig = null;
}
