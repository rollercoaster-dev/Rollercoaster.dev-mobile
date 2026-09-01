/**
 * Cryptographic Operations Module
 *
 * Provides signing, verification, and key management for Open Badges.
 * Platform-agnostic — works in Node.js, Bun, and React Native.
 */

// Key management
export type {
  KeyProvider,
  KeyAlgorithm,
  KeyMetadata,
  KeyPairResult,
} from "./key-provider.js";
export { InMemoryKeyProvider, KeyStatus } from "./key-provider.js";

// Signing and DataIntegrityProof
export type { DataIntegrityProof } from "./signature.js";
import type { DataIntegrityProof } from "./signature.js";
import type { JWTProof } from "./jwt-proof.js";

/** Discriminated union of all proof types (discriminant: `type`) */
export type Proof = DataIntegrityProof | JWTProof;
export {
  KeyType,
  Cryptosuite,
  detectKeyType,
  signData,
  verifySignature,
  createDataIntegrityProof,
  verifyDataIntegrityProof,
} from "./signature.js";

// Platform adapters
export type { CryptoProvider, PlatformConfig } from "./adapters/types.js";
export { NodeCryptoAdapter } from "./adapters/node-crypto.adapter.js";

// did:key encoding (P-256). The base58btc and point-compression primitives
// stay module-local — they are unit-tested directly and have no consumer of
// their own; export them when one appears.
export { encodeP256DidKey, decodeP256DidKey } from "./did-key.js";

// JWT proof
export type {
  JWTProof,
  JWTProofPayload,
  VerifiableCredentialClaims,
  JWTProofGenerationOptions,
  JWTProofVerificationOptions,
  ProofVerificationResult,
  SupportedJWTAlgorithm,
} from "./jwt-proof.js";
export {
  ProofFormat,
  SUPPORTED_JWT_ALGORITHMS,
  generateJWTProof,
  verifyJWTProof,
  getRecommendedAlgorithm,
  isJWTProof,
} from "./jwt-proof.js";
