/**
 * KeyProvider interface and InMemoryKeyProvider implementation
 *
 * The KeyProvider abstraction allows different platforms to manage keys their own way:
 * - Server: FileSystemKeyProvider (reads from keys/ directory)
 * - Native app: SecureStoreKeyProvider (Expo SecureStore)
 * - Tests: InMemoryKeyProvider (ships with core)
 */

import type { JWK } from "jose";
import { generateKeyPair, exportJWK, importJWK } from "jose";

/**
 * Supported key algorithms
 */
export type KeyAlgorithm = "Ed25519" | "RSA";

/**
 * Key status for lifecycle management
 */
export enum KeyStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  REVOKED = "revoked",
}

/**
 * Metadata about a stored key
 */
export interface KeyMetadata {
  keyId: string;
  algorithm: KeyAlgorithm;
  created: string;
  status: KeyStatus;
}

/**
 * Result of key pair generation
 */
export interface KeyPairResult {
  publicKey: JWK;
  privateKey: JWK;
  keyId: string;
}

/**
 * Platform-agnostic interface for cryptographic key management.
 *
 * Each platform provides its own implementation:
 * - Server uses filesystem storage
 * - Mobile uses secure keychain
 * - Tests use in-memory storage
 */
export interface KeyProvider {
  getPublicKey(keyId: string): Promise<JWK>;
  getPrivateKey(keyId: string): Promise<JWK>;
  generateKeyPair(algorithm: KeyAlgorithm): Promise<KeyPairResult>;
  listKeys(): Promise<KeyMetadata[]>;
}

interface StoredKeyPair {
  publicKey: JWK;
  privateKey: JWK;
  metadata: KeyMetadata;
}

/**
 * In-memory KeyProvider implementation for testing.
 *
 * Keys are stored in a Map and lost when the instance is garbage collected.
 * Ships with openbadges-core so tests don't need platform-specific providers.
 */
export class InMemoryKeyProvider implements KeyProvider {
  private keys = new Map<string, StoredKeyPair>();
  private counter = 0;

  /**
   * Retrieve a public key by its identifier.
   * @param keyId - The unique identifier of the key pair
   * @returns The public key in JWK format
   * @throws Error if the key is not found
   */
  async getPublicKey(keyId: string): Promise<JWK> {
    const stored = this.keys.get(keyId);
    if (!stored) {
      throw new Error(`Key not found: ${keyId}`);
    }
    return stored.publicKey;
  }

  /**
   * Retrieve a private key by its identifier.
   * @param keyId - The unique identifier of the key pair
   * @returns The private key in JWK format
   * @throws Error if the key is not found
   */
  async getPrivateKey(keyId: string): Promise<JWK> {
    const stored = this.keys.get(keyId);
    if (!stored) {
      throw new Error(`Key not found: ${keyId}`);
    }
    return stored.privateKey;
  }

  async generateKeyPair(algorithm: KeyAlgorithm): Promise<KeyPairResult> {
    const alg = algorithm === "Ed25519" ? "EdDSA" : "RS256";
    const options =
      algorithm === "Ed25519"
        ? { crv: "Ed25519" as const, extractable: true }
        : { modulusLength: 2048, extractable: true };

    const { publicKey, privateKey } = await generateKeyPair(alg, options);

    const publicJwk = await exportJWK(publicKey);
    const privateJwk = await exportJWK(privateKey);

    const keyId = `key-${++this.counter}`;

    // Set key metadata in JWK
    publicJwk.kid = keyId;
    publicJwk.use = "sig";
    publicJwk.alg = alg;

    privateJwk.kid = keyId;
    privateJwk.use = "sig";
    privateJwk.alg = alg;

    const metadata: KeyMetadata = {
      keyId,
      algorithm,
      created: new Date().toISOString(),
      status: KeyStatus.ACTIVE,
    };

    this.keys.set(keyId, {
      publicKey: publicJwk,
      privateKey: privateJwk,
      metadata,
    });

    return { publicKey: publicJwk, privateKey: privateJwk, keyId };
  }

  async listKeys(): Promise<KeyMetadata[]> {
    return Array.from(this.keys.values()).map((stored) => stored.metadata);
  }

  /**
   * Import an existing JWK key pair (useful for test fixtures).
   *
   * Note: This method does not verify that the public and private keys
   * form a matching cryptographic pair. Callers must ensure key consistency.
   * Importing with an existing keyId will overwrite the previous key pair.
   */
  async importKeyPair(
    keyId: string,
    publicKey: JWK,
    privateKey: JWK,
    algorithm: KeyAlgorithm,
  ): Promise<void> {
    // Validate keys by attempting import
    const alg = algorithm === "Ed25519" ? "EdDSA" : "RS256";
    await importJWK(publicKey, alg);
    await importJWK(privateKey, alg);

    const metadata: KeyMetadata = {
      keyId,
      algorithm,
      created: new Date().toISOString(),
      status: KeyStatus.ACTIVE,
    };

    this.keys.set(keyId, { publicKey, privateKey, metadata });
  }
}
