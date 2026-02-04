import { describe, test, expect } from "bun:test";
import { InMemoryKeyProvider } from "../../src/crypto/key-provider";
import {
  generateJWTProof,
  verifyJWTProof,
  getRecommendedAlgorithm,
  isJWTProof,
  ProofFormat,
  type VerifiableCredentialClaims,
} from "../../src/crypto/jwt-proof";
import type { Shared } from "openbadges-types";

const sampleCredential: VerifiableCredentialClaims = {
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
  ],
  type: ["VerifiableCredential", "OpenBadgeCredential"],
  credentialSubject: {
    type: "AchievementSubject",
    achievement: { name: "Test Badge" },
  },
};

describe("generateJWTProof and verifyJWTProof", () => {
  test("Ed25519: generate and verify JWT proof", async () => {
    const provider = new InMemoryKeyProvider();
    const { keyId } = await provider.generateKeyPair("Ed25519");
    const privateKey = await provider.getPrivateKey(keyId);
    const publicKey = await provider.getPublicKey(keyId);

    const proof = await generateJWTProof(sampleCredential, {
      privateKey,
      algorithm: "EdDSA",
      keyId,
      verificationMethod: "https://example.com/keys/1" as Shared.IRI,
      issuer: "https://example.com" as Shared.IRI,
    });

    expect(proof.type).toBe("JwtProof2020");
    expect(proof.jws).toBeDefined();
    expect(proof.jws.split(".")).toHaveLength(3);

    const result = await verifyJWTProof(proof, {
      publicKey,
      expectedIssuer: "https://example.com" as Shared.IRI,
    });

    expect(result.isValid).toBe(true);
    expect(result.format).toBe(ProofFormat.JWT);
    expect(result.algorithm).toBe("EdDSA");
  });

  test("RSA: generate and verify JWT proof", async () => {
    const provider = new InMemoryKeyProvider();
    const { keyId } = await provider.generateKeyPair("RSA");
    const privateKey = await provider.getPrivateKey(keyId);
    const publicKey = await provider.getPublicKey(keyId);

    const proof = await generateJWTProof(sampleCredential, {
      privateKey,
      algorithm: "RS256",
      keyId,
      verificationMethod: "https://example.com/keys/1" as Shared.IRI,
      issuer: "https://example.com" as Shared.IRI,
    });

    const result = await verifyJWTProof(proof, {
      publicKey,
      expectedIssuer: "https://example.com" as Shared.IRI,
    });

    expect(result.isValid).toBe(true);
  });

  test("verification fails with wrong key", async () => {
    const provider = new InMemoryKeyProvider();
    const { keyId: signKeyId } = await provider.generateKeyPair("Ed25519");
    const { keyId: wrongKeyId } = await provider.generateKeyPair("Ed25519");

    const privateKey = await provider.getPrivateKey(signKeyId);
    const wrongPublicKey = await provider.getPublicKey(wrongKeyId);

    const proof = await generateJWTProof(sampleCredential, {
      privateKey,
      algorithm: "EdDSA",
      verificationMethod: "https://example.com/keys/1" as Shared.IRI,
      issuer: "https://example.com" as Shared.IRI,
    });

    const result = await verifyJWTProof(proof, { publicKey: wrongPublicKey });
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("getRecommendedAlgorithm", () => {
  test("returns EdDSA for ed25519", () => {
    expect(getRecommendedAlgorithm("ed25519")).toBe("EdDSA");
  });

  test("returns RS256 for rsa", () => {
    expect(getRecommendedAlgorithm("rsa")).toBe("RS256");
  });

  test("returns ES256 for ec", () => {
    expect(getRecommendedAlgorithm("ec")).toBe("ES256");
  });

  test("throws for unknown key type", () => {
    expect(() => getRecommendedAlgorithm("unknown")).toThrow(
      "Unknown key type",
    );
  });
});

describe("isJWTProof", () => {
  test("returns true for JWT proof", () => {
    expect(
      isJWTProof({
        type: "JwtProof2020",
        jws: "header.payload.signature",
        created: "2024-01-01",
        verificationMethod: "https://example.com",
        proofPurpose: "assertionMethod",
      }),
    ).toBe(true);
  });

  test("returns false for non-JWT proof", () => {
    expect(isJWTProof({ type: "DataIntegrityProof" })).toBe(false);
    expect(isJWTProof(null)).toBe(false);
    expect(isJWTProof("string")).toBe(false);
  });
});
