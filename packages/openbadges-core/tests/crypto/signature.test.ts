import { describe, test, expect } from "bun:test";
import { InMemoryKeyProvider } from "../../src/crypto/key-provider";
import {
  signData,
  verifySignature,
  createDataIntegrityProof,
  verifyDataIntegrityProof,
  detectKeyType,
  KeyType,
  Cryptosuite,
} from "../../src/crypto/signature";
import type { Shared } from "openbadges-types";

describe("signData and verifySignature", () => {
  test("Ed25519: sign and verify round-trip", async () => {
    const provider = new InMemoryKeyProvider();
    const { keyId } = await provider.generateKeyPair("Ed25519");
    const privateKey = await provider.getPrivateKey(keyId);
    const publicKey = await provider.getPublicKey(keyId);

    const data = "hello world";
    const signature = await signData(data, privateKey, KeyType.Ed25519);

    expect(signature).toBeDefined();
    expect(typeof signature).toBe("string");

    const valid = await verifySignature(
      data,
      signature,
      publicKey,
      KeyType.Ed25519,
    );
    expect(valid).toBe(true);
  });

  test("RSA: sign and verify round-trip", async () => {
    const provider = new InMemoryKeyProvider();
    const { keyId } = await provider.generateKeyPair("RSA");
    const privateKey = await provider.getPrivateKey(keyId);
    const publicKey = await provider.getPublicKey(keyId);

    const data = "test data for RSA";
    const signature = await signData(data, privateKey, KeyType.RSA);
    const valid = await verifySignature(
      data,
      signature,
      publicKey,
      KeyType.RSA,
    );

    expect(valid).toBe(true);
  });

  test("verification fails with wrong data", async () => {
    const provider = new InMemoryKeyProvider();
    const { keyId } = await provider.generateKeyPair("Ed25519");
    const privateKey = await provider.getPrivateKey(keyId);
    const publicKey = await provider.getPublicKey(keyId);

    const signature = await signData("original", privateKey);
    const valid = await verifySignature("tampered", signature, publicKey);

    expect(valid).toBe(false);
  });

  test("verification fails with wrong key", async () => {
    const provider = new InMemoryKeyProvider();
    const { keyId: keyId1 } = await provider.generateKeyPair("Ed25519");
    const { keyId: keyId2 } = await provider.generateKeyPair("Ed25519");

    const privateKey = await provider.getPrivateKey(keyId1);
    const wrongPublicKey = await provider.getPublicKey(keyId2);

    const signature = await signData("data", privateKey);
    const valid = await verifySignature("data", signature, wrongPublicKey);

    expect(valid).toBe(false);
  });

  test("verify propagates key import errors (bad key format)", async () => {
    // A malformed JWK should throw from importJWK, not silently return false
    const badKey = { kty: "OKP", crv: "Ed25519" }; // missing required 'x' parameter

    await expect(
      verifySignature("data", "fake.jwt.signature", badKey, KeyType.Ed25519),
    ).rejects.toThrow();
  });
});

describe("detectKeyType", () => {
  test("detects Ed25519 from JWK", () => {
    expect(detectKeyType({ kty: "OKP", crv: "Ed25519", x: "abc" })).toBe(
      KeyType.Ed25519,
    );
  });

  test("detects RSA from JWK", () => {
    expect(detectKeyType({ kty: "RSA", n: "abc", e: "AQAB" })).toBe(
      KeyType.RSA,
    );
  });

  test("throws for unsupported key type", () => {
    expect(() => detectKeyType({ kty: "unknown" })).toThrow(
      "Unsupported key type",
    );
  });
});

describe("DataIntegrityProof", () => {
  test("creates and verifies Ed25519 proof", async () => {
    const provider = new InMemoryKeyProvider();
    const { keyId } = await provider.generateKeyPair("Ed25519");
    const privateKey = await provider.getPrivateKey(keyId);
    const publicKey = await provider.getPublicKey(keyId);

    const data = JSON.stringify({ name: "Test Badge" });
    const verificationMethod = "https://example.com/keys/1" as Shared.IRI;

    const proof = await createDataIntegrityProof(
      data,
      privateKey,
      verificationMethod,
    );

    expect(proof.type).toBe("DataIntegrityProof");
    expect(proof.cryptosuite).toBe(Cryptosuite.EddsaRdfc2022);
    expect(proof.proofPurpose).toBe("assertionMethod");
    expect(proof.verificationMethod).toBe(verificationMethod);
    expect(proof.proofValue).toBeDefined();
    expect(proof.created).toBeDefined();

    const valid = await verifyDataIntegrityProof(data, proof, publicKey);
    expect(valid).toBe(true);
  });

  test("creates and verifies RSA proof", async () => {
    const provider = new InMemoryKeyProvider();
    const { keyId } = await provider.generateKeyPair("RSA");
    const privateKey = await provider.getPrivateKey(keyId);
    const publicKey = await provider.getPublicKey(keyId);

    const data = JSON.stringify({ name: "Test Badge" });
    const verificationMethod = "https://example.com/keys/1" as Shared.IRI;

    const proof = await createDataIntegrityProof(
      data,
      privateKey,
      verificationMethod,
      KeyType.RSA,
    );

    expect(proof.cryptosuite).toBe(Cryptosuite.RsaSha256);
    const valid = await verifyDataIntegrityProof(data, proof, publicKey);
    expect(valid).toBe(true);
  });

  test("verification fails with tampered data", async () => {
    const provider = new InMemoryKeyProvider();
    const { keyId } = await provider.generateKeyPair("Ed25519");
    const privateKey = await provider.getPrivateKey(keyId);
    const publicKey = await provider.getPublicKey(keyId);

    const verificationMethod = "https://example.com/keys/1" as Shared.IRI;
    const proof = await createDataIntegrityProof(
      "original data",
      privateKey,
      verificationMethod,
    );

    const valid = await verifyDataIntegrityProof(
      "tampered data",
      proof,
      publicKey,
    );
    expect(valid).toBe(false);
  });

  test("returns false for proof with empty proofValue", async () => {
    const provider = new InMemoryKeyProvider();
    const { keyId } = await provider.generateKeyPair("Ed25519");
    const publicKey = await provider.getPublicKey(keyId);

    const emptyProof = {
      type: "DataIntegrityProof" as const,
      cryptosuite: Cryptosuite.EddsaRdfc2022,
      created: new Date().toISOString() as Shared.DateTime,
      proofPurpose: "assertionMethod" as const,
      verificationMethod: "https://example.com/keys/1" as Shared.IRI,
      proofValue: "",
    };

    expect(await verifyDataIntegrityProof("data", emptyProof, publicKey)).toBe(
      false,
    );
  });

  test("throws for unsupported cryptosuite", async () => {
    const proof = {
      type: "DataIntegrityProof" as const,
      cryptosuite: "unknown-suite",
      created: new Date().toISOString() as Shared.DateTime,
      proofPurpose: "assertionMethod" as const,
      verificationMethod: "https://example.com/keys/1" as Shared.IRI,
      proofValue: "some-value",
    };

    await expect(
      verifyDataIntegrityProof("data", proof, {
        kty: "OKP",
        crv: "Ed25519",
      }),
    ).rejects.toThrow("Unsupported cryptosuite");
  });

  test("signs credential with multiple proofs using different keys", async () => {
    const provider = new InMemoryKeyProvider();
    const { keyId: keyId1 } = await provider.generateKeyPair("Ed25519");
    const { keyId: keyId2 } = await provider.generateKeyPair("Ed25519");

    const privateKey1 = await provider.getPrivateKey(keyId1);
    const publicKey1 = await provider.getPublicKey(keyId1);
    const privateKey2 = await provider.getPrivateKey(keyId2);
    const publicKey2 = await provider.getPublicKey(keyId2);

    const data = JSON.stringify({ name: "Multi-signed Badge" });
    const method1 = "https://example.com/keys/1" as Shared.IRI;
    const method2 = "https://example.com/keys/2" as Shared.IRI;

    const proof1 = await createDataIntegrityProof(data, privateKey1, method1);
    const proof2 = await createDataIntegrityProof(data, privateKey2, method2);

    // Both proofs should be independently verifiable
    expect(await verifyDataIntegrityProof(data, proof1, publicKey1)).toBe(true);
    expect(await verifyDataIntegrityProof(data, proof2, publicKey2)).toBe(true);

    // Cross-key verification should fail
    expect(await verifyDataIntegrityProof(data, proof1, publicKey2)).toBe(
      false,
    );
    expect(await verifyDataIntegrityProof(data, proof2, publicKey1)).toBe(
      false,
    );

    // Each proof has its own verificationMethod
    expect(proof1.verificationMethod).toBe(method1);
    expect(proof2.verificationMethod).toBe(method2);
  });
});
