/**
 * Tests for SecureStoreKeyProvider
 *
 * Mocks expo-secure-store (via moduleNameMapper) and globalThis.crypto.subtle
 * to test key generation, retrieval, and signing without real crypto or storage.
 */
import { getItemAsync, setItemAsync } from 'expo-secure-store';
import { SecureStoreKeyProvider } from '../SecureStoreKeyProvider';

const mockGetItem = getItemAsync as jest.Mock;
const mockSetItem = setItemAsync as jest.Mock;

// --- Crypto mocks ---

const MOCK_KEY_ID = 'test-uuid-1234';
const MOCK_PUB_JWK: JsonWebKey = { kty: 'OKP', crv: 'Ed25519', x: 'pubkeydata', key_ops: ['verify'] };
const MOCK_PRIV_JWK: JsonWebKey = { kty: 'OKP', crv: 'Ed25519', x: 'pubkeydata', d: 'privkeydata', key_ops: ['sign'] };
const MOCK_SIGNATURE = new Uint8Array([1, 2, 3, 4]);

// Two distinct objects so exportKey can tell private from public by reference
const mockPrivKey = { type: 'private' } as unknown as CryptoKey;
const mockPubKey = { type: 'public' } as unknown as CryptoKey;

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
  Object.defineProperty(globalThis, 'crypto', {
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

describe('SecureStoreKeyProvider', () => {
  let provider: SecureStoreKeyProvider;

  beforeEach(() => {
    provider = new SecureStoreKeyProvider();
  });

  describe('isAvailable()', () => {
    it('returns true when SecureStore is accessible', async () => {
      await expect(provider.isAvailable()).resolves.toBe(true);
    });

    it('returns false when SecureStore throws', async () => {
      mockGetItem.mockRejectedValueOnce(new Error('SecureStore unavailable'));
      await expect(provider.isAvailable()).resolves.toBe(false);
    });
  });

  describe('generateKeyPair()', () => {
    it('generates an Ed25519 keypair via crypto.subtle', async () => {
      await provider.generateKeyPair();
      expect(mockSubtle.generateKey).toHaveBeenCalledWith(
        { name: 'Ed25519' },
        true,
        ['sign', 'verify'],
      );
    });

    it('exports both private and public keys as JWK', async () => {
      await provider.generateKeyPair();
      expect(mockSubtle.exportKey).toHaveBeenCalledTimes(2);
      expect(mockSubtle.exportKey).toHaveBeenCalledWith('jwk', expect.anything());
    });

    it('stores the private JWK and public JWK in SecureStore under correct keys', async () => {
      await provider.generateKeyPair();
      expect(mockSetItem).toHaveBeenCalledTimes(2);
      expect(mockSetItem).toHaveBeenCalledWith(
        `rcd_privkey_${MOCK_KEY_ID}`,
        JSON.stringify(MOCK_PRIV_JWK),
      );
      expect(mockSetItem).toHaveBeenCalledWith(
        `rcd_pubkey_${MOCK_KEY_ID}`,
        JSON.stringify(MOCK_PUB_JWK),
      );
    });

    it('returns the generated keyId and publicKeyJwk', async () => {
      const result = await provider.generateKeyPair();
      expect(result.keyId).toBe(MOCK_KEY_ID);
      expect(result.publicKeyJwk).toEqual(MOCK_PUB_JWK);
    });
  });

  describe('getPublicKey()', () => {
    it('retrieves and parses the public key JWK from SecureStore', async () => {
      mockGetItem.mockResolvedValueOnce(JSON.stringify(MOCK_PUB_JWK));
      const key = await provider.getPublicKey(MOCK_KEY_ID);
      expect(mockGetItem).toHaveBeenCalledWith(`rcd_pubkey_${MOCK_KEY_ID}`);
      expect(key).toEqual(MOCK_PUB_JWK);
    });

    it('throws if the key is not found', async () => {
      mockGetItem.mockResolvedValueOnce(null);
      await expect(provider.getPublicKey('missing-key-id')).rejects.toThrow(
        'Public key not found for keyId: missing-key-id',
      );
    });
  });

  describe('sign()', () => {
    it('retrieves the private key and signs the data', async () => {
      mockGetItem.mockResolvedValueOnce(JSON.stringify(MOCK_PRIV_JWK));
      const data = new Uint8Array([10, 20, 30]);

      const signature = await provider.sign(MOCK_KEY_ID, data);

      expect(mockGetItem).toHaveBeenCalledWith(`rcd_privkey_${MOCK_KEY_ID}`);
      expect(mockSubtle.importKey).toHaveBeenCalledWith(
        'jwk',
        MOCK_PRIV_JWK,
        { name: 'Ed25519' },
        false,
        ['sign'],
      );
      expect(mockSubtle.sign).toHaveBeenCalledWith('Ed25519', mockPrivKey, expect.any(ArrayBuffer));
      expect(signature).toBeInstanceOf(Uint8Array);
    });

    it('throws if the private key is not found', async () => {
      mockGetItem.mockResolvedValueOnce(null);
      await expect(provider.sign('missing-key-id', new Uint8Array([1]))).rejects.toThrow(
        'Private key not found for keyId: missing-key-id',
      );
    });
  });
});
