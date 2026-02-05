import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  configure,
  getPlatformConfig,
  resetPlatformConfig,
  NodeCryptoAdapter,
  InMemoryKeyProvider,
} from "../src/index.js";
import type { CryptoProvider } from "../src/index.js";

describe("Platform Configuration", () => {
  beforeEach(() => {
    resetPlatformConfig();
  });

  afterEach(() => {
    resetPlatformConfig();
  });

  describe("getPlatformConfig()", () => {
    test("returns Node.js defaults when not configured", () => {
      const config = getPlatformConfig();
      expect(config.crypto).toBeInstanceOf(NodeCryptoAdapter);
      expect(config.keyProvider).toBeInstanceOf(InMemoryKeyProvider);
      expect(config.compression).toBeUndefined();
    });

    test("returns same instance on repeated calls (memoized)", () => {
      const config1 = getPlatformConfig();
      const config2 = getPlatformConfig();
      expect(config1).toBe(config2);
    });
  });

  describe("configure()", () => {
    test("overrides default config with custom providers", () => {
      const mockCrypto: CryptoProvider = {
        sign: async () => "mock-signature",
        verify: async () => true,
        generateKeyPair: async () => ({
          publicKey: {},
          privateKey: {},
        }),
      };
      const mockKeyProvider = new InMemoryKeyProvider();

      configure({
        crypto: mockCrypto,
        keyProvider: mockKeyProvider,
      });

      const config = getPlatformConfig();
      expect(config.crypto).toBe(mockCrypto);
      expect(config.keyProvider).toBe(mockKeyProvider);
    });

    test("supports optional compression provider", () => {
      const mockCompression = {
        compress: async (data: Uint8Array) => data,
        decompress: async (data: Uint8Array) => data,
      };

      configure({
        crypto: new NodeCryptoAdapter(),
        keyProvider: new InMemoryKeyProvider(),
        compression: mockCompression,
      });

      const config = getPlatformConfig();
      expect(config.compression).toBe(mockCompression);
    });
  });

  describe("resetPlatformConfig()", () => {
    test("clears config so defaults are re-initialized", () => {
      const mockCrypto: CryptoProvider = {
        sign: async () => "mock",
        verify: async () => true,
        generateKeyPair: async () => ({ publicKey: {}, privateKey: {} }),
      };

      configure({ crypto: mockCrypto, keyProvider: new InMemoryKeyProvider() });
      expect(getPlatformConfig().crypto).toBe(mockCrypto);

      resetPlatformConfig();
      const config = getPlatformConfig();
      expect(config.crypto).toBeInstanceOf(NodeCryptoAdapter);
    });
  });
});

describe("NodeCryptoAdapter", () => {
  const adapter = new NodeCryptoAdapter();

  test("sign and verify round-trip with Ed25519", async () => {
    const { publicKey, privateKey } = await adapter.generateKeyPair("Ed25519");
    const data = "test data to sign";

    const signature = await adapter.sign(data, privateKey, "EdDSA");
    const isValid = await adapter.verify(data, signature, publicKey, "EdDSA");

    expect(isValid).toBe(true);
  });

  test("verify returns false for tampered data", async () => {
    const { publicKey, privateKey } = await adapter.generateKeyPair("Ed25519");
    const signature = await adapter.sign("original", privateKey, "EdDSA");

    const isValid = await adapter.verify(
      "tampered",
      signature,
      publicKey,
      "EdDSA",
    );
    expect(isValid).toBe(false);
  });

  test("generateKeyPair returns valid JWK keys", async () => {
    const { publicKey, privateKey } = await adapter.generateKeyPair("Ed25519");

    expect(publicKey.kty).toBe("OKP");
    expect(publicKey.crv).toBe("Ed25519");
    expect(privateKey.kty).toBe("OKP");
    expect(privateKey.crv).toBe("Ed25519");
    // Private key has the 'd' parameter
    expect(privateKey.d).toBeDefined();
    // Public key should not have 'd'
    expect(publicKey.d).toBeUndefined();
  });
});

describe("Custom CryptoProvider integration", () => {
  beforeEach(() => {
    resetPlatformConfig();
  });

  afterEach(() => {
    resetPlatformConfig();
  });

  test("signData uses the configured provider", async () => {
    const signCalls: string[] = [];
    const mockCrypto: CryptoProvider = {
      sign: async (data) => {
        signCalls.push(data);
        return "mock-jws";
      },
      verify: async () => true,
      generateKeyPair: async () => ({ publicKey: {}, privateKey: {} }),
    };

    configure({ crypto: mockCrypto, keyProvider: new InMemoryKeyProvider() });

    const { signData } = await import("../src/crypto/signature.js");
    const result = await signData("hello", { kty: "OKP", crv: "Ed25519" });

    expect(result).toBe("mock-jws");
    expect(signCalls).toEqual(["hello"]);
  });

  test("verifySignature uses the configured provider", async () => {
    const verifyCalls: string[] = [];
    const mockCrypto: CryptoProvider = {
      sign: async () => "mock-jws",
      verify: async (data) => {
        verifyCalls.push(data);
        return true;
      },
      generateKeyPair: async () => ({ publicKey: {}, privateKey: {} }),
    };

    configure({ crypto: mockCrypto, keyProvider: new InMemoryKeyProvider() });

    const { verifySignature } = await import("../src/crypto/signature.js");
    const result = await verifySignature("hello", "sig", {
      kty: "OKP",
      crv: "Ed25519",
    });

    expect(result).toBe(true);
    expect(verifyCalls).toEqual(["hello"]);
  });
});

describe("Configure/reset lifecycle", () => {
  beforeEach(() => {
    resetPlatformConfig();
  });

  afterEach(() => {
    resetPlatformConfig();
  });

  test("configure then reset then configure uses latest config", () => {
    const mockCrypto1: CryptoProvider = {
      sign: async () => "sig1",
      verify: async () => true,
      generateKeyPair: async () => ({ publicKey: {}, privateKey: {} }),
    };
    const mockCrypto2: CryptoProvider = {
      sign: async () => "sig2",
      verify: async () => false,
      generateKeyPair: async () => ({ publicKey: {}, privateKey: {} }),
    };

    configure({ crypto: mockCrypto1, keyProvider: new InMemoryKeyProvider() });
    expect(getPlatformConfig().crypto).toBe(mockCrypto1);

    resetPlatformConfig();
    configure({ crypto: mockCrypto2, keyProvider: new InMemoryKeyProvider() });
    expect(getPlatformConfig().crypto).toBe(mockCrypto2);
  });

  test("configure with custom keyProvider makes it available", () => {
    const customProvider = new InMemoryKeyProvider();
    configure({
      crypto: new NodeCryptoAdapter(),
      keyProvider: customProvider,
    });

    const config = getPlatformConfig();
    expect(config.keyProvider).toBe(customProvider);
  });

  test("default config keyProvider supports key operations", async () => {
    const config = getPlatformConfig();
    const { keyId, publicKey, privateKey } =
      await config.keyProvider.generateKeyPair("Ed25519");

    expect(keyId).toBeDefined();
    expect(publicKey.kty).toBe("OKP");
    expect(privateKey.d).toBeDefined();

    const retrieved = await config.keyProvider.getPublicKey(keyId);
    expect(retrieved).toEqual(publicKey);
  });

  test("default config crypto supports sign/verify", async () => {
    const config = getPlatformConfig();
    const { publicKey, privateKey } =
      await config.crypto.generateKeyPair("Ed25519");

    const sig = await config.crypto.sign("test", privateKey, "EdDSA");
    const valid = await config.crypto.verify("test", sig, publicKey, "EdDSA");
    expect(valid).toBe(true);
  });
});
