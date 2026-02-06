/**
 * Platform provider interfaces for cross-platform crypto operations.
 *
 * These interfaces allow consumers to inject platform-specific implementations:
 * - Node.js/Bun: Use the default NodeCryptoAdapter (zero config)
 * - React Native: Provide an adapter using expo-crypto or react-native-quick-crypto
 */

import type { JWK } from "jose";
import type { KeyProvider } from "../key-provider.js";

/**
 * Abstraction for cryptographic signing and verification.
 *
 * The default NodeCryptoAdapter delegates to jose (pure JS).
 * React Native consumers can provide adapters using native crypto libraries.
 */
export interface CryptoProvider {
  /** Sign data with a private key, returning a compact JWS */
  sign(data: string, privateKey: JWK, algorithm: string): Promise<string>;

  /** Verify a compact JWS signature against data and a public key */
  verify(
    data: string,
    signature: string,
    publicKey: JWK,
    algorithm: string,
  ): Promise<boolean>;

  /** Generate an Ed25519 or RSA key pair */
  generateKeyPair(algorithm: "Ed25519" | "RSA"): Promise<{
    publicKey: JWK;
    privateKey: JWK;
  }>;
}

/**
 * Full platform configuration for openbadges-core.
 *
 * Node.js/Bun environments get defaults automatically via lazy initialization.
 * React Native environments must call configure() before any crypto operations.
 */
export interface PlatformConfig {
  crypto: CryptoProvider;
  keyProvider: KeyProvider;
}
