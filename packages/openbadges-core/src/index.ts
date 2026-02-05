/**
 * @rollercoaster-dev/openbadges-core
 *
 * Shared core library for Open Badges functionality across Rollercoaster.dev applications.
 *
 * This package provides:
 * - Badge baking utilities (PNG metadata embedding)
 * - Cryptographic operations (signing, verification, key management)
 * - Credential generation and validation
 * - Platform-agnostic implementations for Node.js and Bun
 *
 * @packageDocumentation
 */

// Platform utilities and configuration
export {
  detectPlatform,
  isBun,
  isNode,
  isReactNative,
  assertBufferAvailable,
  configure,
  getPlatformConfig,
  resetPlatformConfig,
} from "./platform.js";
export type { Platform } from "./platform.js";

// Credentials module
export * from "./credentials/index.js";

// Crypto module
export * from "./crypto/index.js";

// Baking module
export * from "./baking/index.js";
