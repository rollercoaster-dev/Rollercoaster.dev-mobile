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
});
