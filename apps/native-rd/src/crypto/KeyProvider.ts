/**
 * KeyProvider interface for badge signing
 *
 * Abstracts key storage backend (SecureStore on device, InMemory in tests).
 * Used by badge signing to generate and use Ed25519 keypairs without
 * depending on the storage implementation.
 */

export interface KeyProvider {
  /** Returns true if the underlying secure storage is accessible */
  isAvailable(): Promise<boolean>;

  /** Generate a new Ed25519 keypair, persist it, and return the keyId + public key */
  generateKeyPair(): Promise<{ keyId: string; publicKeyJwk: JsonWebKey }>;

  /** Retrieve the public key JWK for a stored keypair */
  getPublicKey(keyId: string): Promise<JsonWebKey>;

  /** Sign data with the private key identified by keyId */
  sign(keyId: string, data: Uint8Array): Promise<Uint8Array>;
}
