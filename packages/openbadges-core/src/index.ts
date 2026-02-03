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

// Platform utilities
export { detectPlatform, isBun, isNode } from "./platform.js";
export type { Platform } from "./platform.js";

// Future exports (placeholders for upcoming implementation):
// - Badge baking (will be implemented in issue #686)
// - Crypto utilities (will be implemented in issue #685)
// - Credential generation (will be implemented in issue #684)
