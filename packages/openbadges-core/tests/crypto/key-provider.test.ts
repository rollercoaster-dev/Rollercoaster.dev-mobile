import { describe, test, expect } from "bun:test";
import { InMemoryKeyProvider, KeyStatus } from "../../src/crypto/key-provider";

describe("InMemoryKeyProvider", () => {
  test("generates Ed25519 key pair", async () => {
    const provider = new InMemoryKeyProvider();
    const result = await provider.generateKeyPair("Ed25519");

    expect(result.keyId).toBeDefined();
    expect(result.publicKey.kty).toBe("OKP");
    expect(result.publicKey.crv).toBe("Ed25519");
    expect(result.publicKey.kid).toBe(result.keyId);
    expect(result.privateKey.kty).toBe("OKP");
    expect(result.privateKey.d).toBeDefined(); // private key has "d" param
  });

  test("generates RSA key pair", async () => {
    const provider = new InMemoryKeyProvider();
    const result = await provider.generateKeyPair("RSA");

    expect(result.publicKey.kty).toBe("RSA");
    expect(result.publicKey.n).toBeDefined();
    expect(result.publicKey.e).toBeDefined();
    expect(result.privateKey.d).toBeDefined();
  });

  test("retrieves public key by ID", async () => {
    const provider = new InMemoryKeyProvider();
    const { keyId, publicKey } = await provider.generateKeyPair("Ed25519");

    const retrieved = await provider.getPublicKey(keyId);
    expect(retrieved).toEqual(publicKey);
  });

  test("retrieves private key by ID", async () => {
    const provider = new InMemoryKeyProvider();
    const { keyId, privateKey } = await provider.generateKeyPair("Ed25519");

    const retrieved = await provider.getPrivateKey(keyId);
    expect(retrieved).toEqual(privateKey);
  });

  test("throws on unknown key ID", async () => {
    const provider = new InMemoryKeyProvider();

    await expect(provider.getPublicKey("nonexistent")).rejects.toThrow(
      "Key not found: nonexistent",
    );
    await expect(provider.getPrivateKey("nonexistent")).rejects.toThrow(
      "Key not found: nonexistent",
    );
  });

  test("lists keys with metadata", async () => {
    const provider = new InMemoryKeyProvider();
    await provider.generateKeyPair("Ed25519");
    await provider.generateKeyPair("RSA");

    const keys = await provider.listKeys();
    expect(keys).toHaveLength(2);
    expect(keys[0]!.algorithm).toBe("Ed25519");
    expect(keys[0]!.status).toBe(KeyStatus.ACTIVE);
    expect(keys[1]!.algorithm).toBe("RSA");
  });

  test("generates unique key IDs", async () => {
    const provider = new InMemoryKeyProvider();
    const k1 = await provider.generateKeyPair("Ed25519");
    const k2 = await provider.generateKeyPair("Ed25519");

    expect(k1.keyId).not.toBe(k2.keyId);
  });

  test("imports existing key pair", async () => {
    const provider = new InMemoryKeyProvider();
    const { publicKey, privateKey } = await provider.generateKeyPair("Ed25519");

    const importProvider = new InMemoryKeyProvider();
    await importProvider.importKeyPair(
      "imported-key",
      publicKey,
      privateKey,
      "Ed25519",
    );

    const retrieved = await importProvider.getPublicKey("imported-key");
    expect(retrieved).toEqual(publicKey);

    const retrievedPrivate = await importProvider.getPrivateKey("imported-key");
    expect(retrievedPrivate).toEqual(privateKey);
  });

  test("importKeyPair rejects invalid keys", async () => {
    const provider = new InMemoryKeyProvider();

    await expect(
      provider.importKeyPair(
        "bad-key",
        { kty: "OKP" },
        { kty: "OKP" },
        "Ed25519",
      ),
    ).rejects.toThrow();
  });
});
