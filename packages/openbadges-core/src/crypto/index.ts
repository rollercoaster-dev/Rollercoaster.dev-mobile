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
export type {
  CryptoProvider,
  CompressionProvider,
  PlatformConfig,
} from "./adapters/types.js";
export { NodeCryptoAdapter } from "./adapters/node-crypto.adapter.js";

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
