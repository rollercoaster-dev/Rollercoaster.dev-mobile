/**
 * Tests for SecureStoreKeyProvider
 *
 * Mocks expo-secure-store (via moduleNameMapper) and globalThis.crypto.subtle
 * to test key generation, retrieval, and signing without real crypto or storage.
 */
import { Platform } from "react-native";
import {
  deleteItemAsync,
  getItemAsync,
  setItemAsync,
  WHEN_UNLOCKED_THIS_DEVICE_ONLY,
} from "expo-secure-store";
import { SecureStoreKeyProvider } from "../SecureStoreKeyProvider";

const mockGetItem = getItemAsync as jest.Mock;
const mockSetItem = setItemAsync as jest.Mock;
const mockDeleteItem = deleteItemAsync as jest.Mock;

const DEVICE_ONLY = { keychainAccessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY };

/**
 * Back the SecureStore mock with a Map that behaves like the iOS keychain:
 * each item keeps the accessibility class it was first added with, and a set
 * over an existing item changes the value only.
 */
function useFakeKeychain(initial: Record<string, string>) {
  const items = new Map(
    Object.entries(initial).map(([name, value]) => [
      name,
      { value, accessible: undefined as string | undefined },
    ]),
  );
  mockGetItem.mockImplementation(
    async (name: string) => items.get(name)?.value ?? null,
  );
  mockSetItem.mockImplementation(
    async (
      name: string,
      value: string,
      options?: { keychainAccessible?: string },
    ) => {
      const existing = items.get(name);
      if (existing) existing.value = value;
      else items.set(name, { value, accessible: options?.keychainAccessible });
    },
  );
  mockDeleteItem.mockImplementation(async (name: string) => {
    items.delete(name);
  });
  return items;
}

// --- Crypto mocks ---

const MOCK_KEY_ID = "test-uuid-1234";
const MOCK_PUB_JWK: JsonWebKey = {
  kty: "EC",
  crv: "P-256",
  x: "pubkeyx",
  y: "pubkeyy",
  key_ops: ["verify"],
};
const MOCK_PRIV_JWK: JsonWebKey = {
  kty: "EC",
  crv: "P-256",
  x: "pubkeyx",
  y: "pubkeyy",
  d: "privkeydata",
  key_ops: ["sign"],
};
const MOCK_SIGNATURE = new Uint8Array([1, 2, 3, 4]);

// Two distinct objects so exportKey can tell private from public by reference
const mockPrivKey = { type: "private" } as unknown as CryptoKey;
const mockPubKey = { type: "public" } as unknown as CryptoKey;

const mockSubtle = {
  generateKey: jest.fn().mockResolvedValue({
    privateKey: mockPrivKey,
    publicKey: mockPubKey,
  }),
  exportKey: jest.fn().mockImplementation((_format: string, key: CryptoKey) => {
    return key === mockPrivKey ? MOCK_PRIV_JWK : MOCK_PUB_JWK;
  }),
  importKey: jest.fn().mockResolvedValue(mockPrivKey),
  sign: jest.fn().mockResolvedValue(MOCK_SIGNATURE.buffer),
};

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(globalThis, "crypto", {
    value: {
      subtle: mockSubtle,
      randomUUID: jest.fn().mockReturnValue(MOCK_KEY_ID),
    },
    writable: true,
    configurable: true,
  });
  // Default: SecureStore available
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
});

describe("SecureStoreKeyProvider", () => {
  let provider: SecureStoreKeyProvider;

  beforeEach(() => {
    provider = new SecureStoreKeyProvider();
  });

  describe("isAvailable()", () => {
    it("returns true when SecureStore is accessible", async () => {
      await expect(provider.isAvailable()).resolves.toBe(true);
    });

    it("returns false when SecureStore throws", async () => {
      mockGetItem.mockRejectedValueOnce(new Error("SecureStore unavailable"));
      await expect(provider.isAvailable()).resolves.toBe(false);
    });
  });

  describe("generateKeyPair()", () => {
    it("generates a P-256 ECDSA keypair via crypto.subtle", async () => {
      await provider.generateKeyPair();
      expect(mockSubtle.generateKey).toHaveBeenCalledWith(
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign", "verify"],
      );
    });

    it("exports both private and public keys as JWK", async () => {
      await provider.generateKeyPair();
      expect(mockSubtle.exportKey).toHaveBeenCalledTimes(2);
      expect(mockSubtle.exportKey).toHaveBeenCalledWith(
        "jwk",
        expect.anything(),
      );
    });

    it("stores the private JWK and public JWK in SecureStore under correct keys", async () => {
      await provider.generateKeyPair();
      expect(mockSetItem).toHaveBeenCalledWith(
        `rcd_privkey_${MOCK_KEY_ID}`,
        JSON.stringify(MOCK_PRIV_JWK),
        DEVICE_ONLY,
      );
      expect(mockSetItem).toHaveBeenCalledWith(
        `rcd_pubkey_${MOCK_KEY_ID}`,
        JSON.stringify(MOCK_PUB_JWK),
        DEVICE_ONLY,
      );
    });

    it("stores every item device-only so the key stays out of backups", async () => {
      await provider.generateKeyPair();
      expect(mockSetItem.mock.calls.length).toBeGreaterThan(0);
      for (const call of mockSetItem.mock.calls) {
        expect(call[2]).toEqual(DEVICE_ONLY);
      }
    });

    it("leaves a new keypair with nothing to move afterwards", async () => {
      const items = useFakeKeychain({});
      await provider.generateKeyPair();
      mockDeleteItem.mockClear();

      await provider.ensureDeviceOnly(MOCK_KEY_ID);

      expect(mockDeleteItem).not.toHaveBeenCalled();
      expect(items.get(`rcd_privkey_${MOCK_KEY_ID}`)?.accessible).toBe(
        WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      );
    });

    it("returns the generated keyId and publicKeyJwk", async () => {
      const result = await provider.generateKeyPair();
      expect(result.keyId).toBe(MOCK_KEY_ID);
      expect(result.publicKeyJwk).toEqual(MOCK_PUB_JWK);
    });
  });

  describe("ensureDeviceOnly()", () => {
    const PRIV = `rcd_privkey_${MOCK_KEY_ID}`;
    const PUB = `rcd_pubkey_${MOCK_KEY_ID}`;
    const legacy = () => ({
      [PRIV]: JSON.stringify(MOCK_PRIV_JWK),
      [PUB]: JSON.stringify(MOCK_PUB_JWK),
    });
    const originalOS = Platform.OS;

    beforeEach(() => {
      Platform.OS = "ios";
    });
    afterEach(() => {
      Platform.OS = originalOS;
    });

    it("moves a key stored by an older build to device-only without changing it", async () => {
      const items = useFakeKeychain(legacy());

      await provider.ensureDeviceOnly(MOCK_KEY_ID);

      expect(items.get(PRIV)).toEqual({
        value: JSON.stringify(MOCK_PRIV_JWK),
        accessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      expect(items.get(PUB)).toEqual({
        value: JSON.stringify(MOCK_PUB_JWK),
        accessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      // No temporary copy of the private key is left behind.
      expect([...items.keys()].sort()).toEqual(
        [PRIV, PUB, `rcd_deviceonly_${MOCK_KEY_ID}`].sort(),
      );
    });

    it("does the move once, not on every launch", async () => {
      useFakeKeychain(legacy());
      await provider.ensureDeviceOnly(MOCK_KEY_ID);
      mockDeleteItem.mockClear();
      mockSetItem.mockClear();

      await provider.ensureDeviceOnly(MOCK_KEY_ID);

      expect(mockDeleteItem).not.toHaveBeenCalled();
      expect(mockSetItem).not.toHaveBeenCalled();
    });

    it("recovers the same key when a move was interrupted after the delete", async () => {
      const items = useFakeKeychain(legacy());
      // First run dies re-adding the private key: the original is already gone.
      const realSet = mockSetItem.getMockImplementation()!;
      mockSetItem.mockImplementation(async (name: string, ...rest) => {
        if (name === PRIV) throw new Error("keychain write failed");
        return realSet(name, ...rest);
      });
      await expect(provider.ensureDeviceOnly(MOCK_KEY_ID)).rejects.toThrow(
        "keychain write failed",
      );
      expect(items.has(PRIV)).toBe(false);

      mockSetItem.mockImplementation(realSet);
      await provider.ensureDeviceOnly(MOCK_KEY_ID);

      expect(items.get(PRIV)).toEqual({
        value: JSON.stringify(MOCK_PRIV_JWK),
        accessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      expect(items.has(`${PRIV}_moving`)).toBe(false);
    });

    it("still reads a key whose move was cut off by an app kill", async () => {
      // State after a kill between the delete and the re-add: only the
      // temporary copies exist. A fresh launch reads before it moves.
      useFakeKeychain({
        [`${PRIV}_moving`]: JSON.stringify(MOCK_PRIV_JWK),
        [`${PUB}_moving`]: JSON.stringify(MOCK_PUB_JWK),
      });

      await expect(provider.getPublicKey(MOCK_KEY_ID)).resolves.toEqual(
        MOCK_PUB_JWK,
      );
      await provider.sign(MOCK_KEY_ID, new Uint8Array([1]));
      expect(mockSubtle.importKey).toHaveBeenCalledWith(
        "jwk",
        MOCK_PRIV_JWK,
        expect.anything(),
        false,
        ["sign"],
      );
    });

    it("makes sign() wait for a move in progress instead of missing the key", async () => {
      useFakeKeychain(legacy());
      let releaseDelete!: () => void;
      const deleteGate = new Promise<void>((resolve) => {
        releaseDelete = resolve;
      });
      const realDelete = mockDeleteItem.getMockImplementation()!;
      mockDeleteItem.mockImplementation(async (name: string) => {
        await realDelete(name);
        if (name === PRIV) await deleteGate;
      });

      const move = provider.ensureDeviceOnly(MOCK_KEY_ID);
      const signing = provider.sign(MOCK_KEY_ID, new Uint8Array([1]));
      releaseDelete();

      await expect(signing).resolves.toBeInstanceOf(Uint8Array);
      await move;
    });

    it("leaves Android storage alone", async () => {
      Platform.OS = "android";
      useFakeKeychain(legacy());

      await provider.ensureDeviceOnly(MOCK_KEY_ID);

      expect(mockDeleteItem).not.toHaveBeenCalled();
      expect(mockSetItem).not.toHaveBeenCalled();
    });
  });

  describe("getPublicKey()", () => {
    it("retrieves and parses the public key JWK from SecureStore", async () => {
      mockGetItem.mockResolvedValueOnce(JSON.stringify(MOCK_PUB_JWK));
      const key = await provider.getPublicKey(MOCK_KEY_ID);
      expect(mockGetItem).toHaveBeenCalledWith(`rcd_pubkey_${MOCK_KEY_ID}`);
      expect(key).toEqual(MOCK_PUB_JWK);
    });

    it("throws if the key is not found", async () => {
      mockGetItem.mockResolvedValueOnce(null);
      await expect(provider.getPublicKey("missing-key-id")).rejects.toThrow(
        "Public key not found for keyId: missing-key-id",
      );
    });
  });

  describe("sign()", () => {
    it("retrieves the private key and signs the data", async () => {
      mockGetItem.mockResolvedValueOnce(JSON.stringify(MOCK_PRIV_JWK));
      const data = new Uint8Array([10, 20, 30]);

      const signature = await provider.sign(MOCK_KEY_ID, data);

      expect(mockGetItem).toHaveBeenCalledWith(`rcd_privkey_${MOCK_KEY_ID}`);
      expect(mockSubtle.importKey).toHaveBeenCalledWith(
        "jwk",
        MOCK_PRIV_JWK,
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["sign"],
      );
      // SHA-256 is what makes this ES256 rather than any other ECDSA variant —
      // a JWS with alg:ES256 over a differently-hashed signature won't verify.
      expect(mockSubtle.sign).toHaveBeenCalledWith(
        { name: "ECDSA", hash: "SHA-256" },
        mockPrivKey,
        expect.any(ArrayBuffer),
      );
      expect(signature).toBeInstanceOf(Uint8Array);
    });

    it("throws if the private key is not found", async () => {
      mockGetItem.mockResolvedValueOnce(null);
      await expect(
        provider.sign("missing-key-id", new Uint8Array([1])),
      ).rejects.toThrow("Private key not found for keyId: missing-key-id");
    });
  });
});
