/**
 * JWT proof generation and verification for Open Badges 3.0
 *
 * Uses jose library (pure JS) for cross-platform JWT operations.
 */

import type { JWK, JWTPayload, JWTHeaderParameters } from "jose";
import {
  SignJWT,
  jwtVerify,
  importJWK,
  importPKCS8,
  importSPKI,
  decodeProtectedHeader,
} from "jose";
import type { Shared } from "openbadges-types";

/**
 * Supported JWT algorithms for Open Badges
 */
export const SUPPORTED_JWT_ALGORITHMS = [
  "RS256",
  "RS384",
  "RS512",
  "ES256",
  "ES384",
  "ES512",
  "EdDSA",
] as const;

export type SupportedJWTAlgorithm = (typeof SUPPORTED_JWT_ALGORITHMS)[number];

/**
 * Verifiable Credential claims within JWT payload
 */
export interface VerifiableCredentialClaims {
  "@context": string | string[];
  id?: Shared.IRI;
  type: string | string[];
  credentialSubject: Record<string, unknown>;
  validFrom?: string;
  validUntil?: string;
  credentialStatus?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * JWT Payload for Open Badges JWT proofs
 */
export interface JWTProofPayload {
  iss: Shared.IRI;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  vc: VerifiableCredentialClaims;
  [key: string]: unknown;
}

/**
 * JWT Proof object for Open Badges
 */
export interface JWTProof {
  type: "JwtProof2020" | "JsonWebSignature2020";
  created: Shared.DateTime;
  verificationMethod: Shared.IRI;
  proofPurpose:
    | "assertionMethod"
    | "authentication"
    | "keyAgreement"
    | "capabilityInvocation"
    | "capabilityDelegation";
  jws: string;
  [key: string]: unknown;
}

/**
 * Proof format enumeration
 */
export enum ProofFormat {
  DataIntegrity = "DataIntegrityProof",
  JWT = "JwtProof2020",
  JWS = "JsonWebSignature2020",
}

/**
 * Result of proof verification
 */
export interface ProofVerificationResult {
  isValid: boolean;
  format: ProofFormat;
  verificationMethod?: Shared.IRI;
  algorithm?: string;
  error?: string;
  details?: Record<string, unknown>;
}

/**
 * JWT proof generation options
 */
export interface JWTProofGenerationOptions {
  privateKey: JWK | string;
  algorithm: SupportedJWTAlgorithm;
  keyId?: string;
  verificationMethod: Shared.IRI;
  proofPurpose?:
    | "assertionMethod"
    | "authentication"
    | "keyAgreement"
    | "capabilityInvocation"
    | "capabilityDelegation";
  issuer: Shared.IRI;
  subject?: string;
  audience?: string | string[];
  expiresIn?: number;
  notBefore?: number;
}

/**
 * JWT proof verification options
 */
export interface JWTProofVerificationOptions {
  publicKey: JWK | string;
  expectedIssuer?: Shared.IRI;
  expectedAudience?: string | string[];
  clockTolerance?: number;
}

/**
 * Import a private key (JWK or PEM) for signing.
 * @returns CryptoKey when Web Crypto API is available (Node.js 15+, Bun, browsers),
 *          or Uint8Array for symmetric keys / raw key material.
 */
async function importPrivateKeyForSigning(
  key: JWK | string,
  algorithm: SupportedJWTAlgorithm,
): Promise<CryptoKey | Uint8Array> {
  if (typeof key === "string") {
    return await importPKCS8(key, algorithm);
  }
  return (await importJWK(key, algorithm)) as CryptoKey | Uint8Array;
}

/**
 * Import a public key (JWK or PEM) for verification.
 * @returns CryptoKey when Web Crypto API is available (Node.js 15+, Bun, browsers),
 *          or Uint8Array for symmetric keys / raw key material.
 */
async function importPublicKeyForVerification(
  key: JWK | string,
  algorithm: string,
): Promise<CryptoKey | Uint8Array> {
  if (typeof key === "string") {
    return await importSPKI(key, algorithm);
  }
  return (await importJWK(key, algorithm)) as CryptoKey | Uint8Array;
}

/**
 * Generate a JWT proof for a Verifiable Credential
 */
export async function generateJWTProof(
  credentialData: VerifiableCredentialClaims,
  options: JWTProofGenerationOptions,
): Promise<JWTProof> {
  const privateKey = await importPrivateKeyForSigning(
    options.privateKey,
    options.algorithm,
  );

  const now = Math.floor(Date.now() / 1000);
  const payload: JWTProofPayload = {
    iss: options.issuer,
    iat: now,
    vc: credentialData,
  };

  if (options.subject) payload.sub = options.subject;
  if (options.audience) payload.aud = options.audience;
  if (options.expiresIn) payload.exp = now + options.expiresIn;
  if (options.notBefore) payload.nbf = now + options.notBefore;

  const jwt = await new SignJWT(payload as JWTPayload)
    .setProtectedHeader({
      alg: options.algorithm,
      typ: "JWT",
      ...(options.keyId && { kid: options.keyId }),
    } as JWTHeaderParameters)
    .sign(privateKey);

  return {
    type: "JwtProof2020",
    created: new Date().toISOString() as Shared.DateTime,
    verificationMethod: options.verificationMethod,
    proofPurpose: options.proofPurpose ?? "assertionMethod",
    jws: jwt,
  };
}

/**
 * Verify a JWT proof
 */
export async function verifyJWTProof(
  jwtProof: JWTProof,
  options: JWTProofVerificationOptions,
): Promise<ProofVerificationResult> {
  try {
    const header = decodeProtectedHeader(jwtProof.jws);
    if (!header.alg) {
      throw new Error(
        "JWT missing required 'alg' header parameter. Cannot determine verification algorithm.",
      );
    }
    const algorithm = header.alg;

    const publicKey = await importPublicKeyForVerification(
      options.publicKey,
      algorithm,
    );

    const { payload, protectedHeader } = await jwtVerify(
      jwtProof.jws,
      publicKey,
      {
        issuer: options.expectedIssuer,
        audience: options.expectedAudience,
        clockTolerance: options.clockTolerance ?? 60,
      },
    );

    if (!payload.vc) {
      throw new Error("JWT payload missing vc claim");
    }

    return {
      isValid: true,
      format: ProofFormat.JWT,
      verificationMethod: jwtProof.verificationMethod,
      algorithm: protectedHeader.alg,
      details: {
        issuer: payload.iss,
        subject: payload.sub,
        audience: payload.aud,
        issuedAt: payload.iat,
        expiresAt: payload.exp,
      },
    };
  } catch (error) {
    return {
      isValid: false,
      format: ProofFormat.JWT,
      verificationMethod: jwtProof.verificationMethod,
      error:
        error instanceof Error ? error.message : "Unknown verification error",
    };
  }
}

/**
 * Get the recommended JWT algorithm for a key type
 */
export function getRecommendedAlgorithm(
  keyType: string,
): SupportedJWTAlgorithm {
  switch (keyType.toLowerCase()) {
    case "rsa":
      return "RS256";
    case "ec":
    case "ecdsa":
      return "ES256";
    case "ed25519":
    case "eddsa":
      return "EdDSA";
    default:
      throw new Error(
        `Unknown key type: ${keyType}. Supported: rsa, ec, ecdsa, ed25519, eddsa`,
      );
  }
}

/**
 * Type guard: check if a proof is a JWT proof
 */
export function isJWTProof(proof: unknown): proof is JWTProof {
  return (
    typeof proof === "object" &&
    proof !== null &&
    "type" in proof &&
    ["JwtProof2020", "JsonWebSignature2020"].includes(
      (proof as { type: string }).type,
    ) &&
    "jws" in proof
  );
}
