/**
 * Signing and verification operations for Open Badges
 *
 * Platform-agnostic implementation using jose (pure JS).
 * No direct Node.js crypto imports — works in Node.js, Bun, and React Native.
 */

import type { JWK } from "jose";
import type { Shared } from "openbadges-types";
import { getPlatformConfig } from "../platform.js";

/**
 * Supported key types for digital signatures
 */
export enum KeyType {
  RSA = "rsa",
  Ed25519 = "ed25519",
}

/**
 * Supported cryptosuites for Data Integrity proofs.
 *
 * @see https://www.w3.org/TR/vc-data-integrity/
 */
export enum Cryptosuite {
  /** @deprecated RSA should use JWT proof format, not DataIntegrityProof */
  RsaSha256 = "rsa-sha256",
  /** @deprecated Use EddsaRdfc2022 for W3C compliance */
  Ed25519 = "ed25519-2020",
  /** W3C standard EdDSA cryptosuite with RDF Dataset Canonicalization */
  EddsaRdfc2022 = "eddsa-rdfc-2022",
}

/**
 * Structure of a Data Integrity Proof (W3C VC Data Model / OB 3.0)
 */
export interface DataIntegrityProof {
  type: "DataIntegrityProof";
  cryptosuite: string;
  created: Shared.DateTime;
  proofPurpose: "assertionMethod" | string;
  verificationMethod: Shared.IRI;
  proofValue: string;
}

/**
 * Detect the key type from a JWK
 */
export function detectKeyType(key: JWK): KeyType {
  if (key.kty === "OKP" && key.crv === "Ed25519") return KeyType.Ed25519;
  if (key.kty === "RSA") return KeyType.RSA;
  throw new Error(
    `Unsupported key type: ${key.kty}${key.crv ? ` (curve: ${key.crv})` : ""}. Only Ed25519 and RSA are supported.`,
  );
}

/**
 * Get the jose algorithm string for a key type
 */
function getAlgorithm(keyType: KeyType): string {
  return keyType === KeyType.Ed25519 ? "EdDSA" : "RS256";
}

/**
 * Sign data with a JWK private key.
 * Returns a compact JWS (base64url encoded).
 *
 * Delegates to the configured CryptoProvider (defaults to jose in Node.js/Bun).
 */
export async function signData(
  data: string,
  privateKey: JWK,
  keyType?: KeyType,
): Promise<string> {
  const actualKeyType = keyType ?? detectKeyType(privateKey);
  const alg = getAlgorithm(actualKeyType);
  const { crypto } = getPlatformConfig();
  return crypto.sign(data, privateKey, alg);
}

/**
 * Verify a compact JWS signature against data and a JWK public key.
 *
 * Delegates to the configured CryptoProvider (defaults to jose in Node.js/Bun).
 */
export async function verifySignature(
  data: string,
  signature: string,
  publicKey: JWK,
  keyType?: KeyType,
): Promise<boolean> {
  // Configuration and key detection errors must propagate (not be swallowed).
  // Only verification failures are expected and returned as false.
  const actualKeyType = keyType ?? detectKeyType(publicKey);
  const alg = getAlgorithm(actualKeyType);
  const { crypto } = getPlatformConfig();

  try {
    return await crypto.verify(data, signature, publicKey, alg);
  } catch {
    // Signature verification failures are expected (invalid/tampered signatures).
    // Returns false rather than throwing to provide a clean boolean API.
    return false;
  }
}

/**
 * Create a DataIntegrityProof for an assertion.
 *
 * @param dataToSign - Canonical data to sign
 * @param privateKey - JWK private key
 * @param verificationMethodId - IRI identifying the public key
 * @param keyType - Optional key type (auto-detected from JWK if not provided)
 * @param cryptosuite - Optional cryptosuite (determined from key type if not provided)
 */
export async function createDataIntegrityProof(
  dataToSign: string,
  privateKey: JWK,
  verificationMethodId: Shared.IRI,
  keyType?: KeyType,
  cryptosuite?: Cryptosuite,
): Promise<DataIntegrityProof> {
  const actualKeyType = keyType ?? detectKeyType(privateKey);

  const actualCryptosuite =
    cryptosuite ??
    (actualKeyType === KeyType.Ed25519
      ? Cryptosuite.EddsaRdfc2022
      : Cryptosuite.RsaSha256);

  const proofValue = await signData(dataToSign, privateKey, actualKeyType);

  return {
    type: "DataIntegrityProof",
    cryptosuite: actualCryptosuite,
    created: new Date().toISOString() as Shared.DateTime,
    proofPurpose: "assertionMethod",
    verificationMethod: verificationMethodId,
    proofValue,
  };
}

/**
 * Verify a DataIntegrityProof against data and a JWK public key.
 */
export async function verifyDataIntegrityProof(
  dataToVerify: string,
  proof: DataIntegrityProof,
  publicKey: JWK,
): Promise<boolean> {
  if (!proof.proofValue) return false;

  // Determine key type from cryptosuite
  let keyType: KeyType;
  switch (proof.cryptosuite) {
    case Cryptosuite.RsaSha256:
      keyType = KeyType.RSA;
      break;
    case Cryptosuite.Ed25519:
    case Cryptosuite.EddsaRdfc2022:
      keyType = KeyType.Ed25519;
      break;
    default:
      throw new Error(
        `Unsupported cryptosuite: ${proof.cryptosuite}. Supported: ${Object.values(Cryptosuite).join(", ")}`,
      );
  }

  return verifySignature(dataToVerify, proof.proofValue, publicKey, keyType);
}
