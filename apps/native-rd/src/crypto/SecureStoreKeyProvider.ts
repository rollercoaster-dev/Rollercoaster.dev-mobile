/**
 * SecureStoreKeyProvider
 *
 * Implements KeyProvider using Expo SecureStore (Keychain on iOS, Keystore on Android).
 * Keys are stored as serialized JWK JSON under prefixed keys:
 *   rcd_privkey_<keyId>  — private key JWK
 *   rcd_pubkey_<keyId>   — public key JWK
 *
 * Requires react-native-quick-crypto to be installed at app entry (index.ts does this).
 */
import * as SecureStore from "expo-secure-store";
import type { KeyProvider } from "./KeyProvider";
import { Logger } from "../shims/rd-logger";

const logger = new Logger("crypto");

const PRIV_KEY_PREFIX = "rcd_privkey_";
const PUB_KEY_PREFIX = "rcd_pubkey_";

export class SecureStoreKeyProvider implements KeyProvider {
  async isAvailable(): Promise<boolean> {
    try {
      await SecureStore.getItemAsync("rcd_availability_check");
      return true;
    } catch {
      return false;
    }
  }

  async generateKeyPair(): Promise<{
    keyId: string;
    publicKeyJwk: JsonWebKey;
  }> {
    const keyPair = await crypto.subtle.generateKey(
      { name: "Ed25519" },
      true, // extractable — needed to export as JWK
      ["sign", "verify"],
    );

    const [privateKeyJwk, publicKeyJwk] = await Promise.all([
      crypto.subtle.exportKey("jwk", keyPair.privateKey),
      crypto.subtle.exportKey("jwk", keyPair.publicKey),
    ]);

    const keyId = crypto.randomUUID();

    // TODO: if either setItemAsync throws, the keyId is returned but one or both
    // keys are not stored. The caller (useUserKey) will then persist an orphaned
    // keyId that causes "key not found" errors on the next launch. A full fix
    // would clean up the partial write in a catch block, but SecureStore has no
    // atomic multi-set — for now the error propagates and the hook surfaces it.
    await Promise.all([
      SecureStore.setItemAsync(
        `${PRIV_KEY_PREFIX}${keyId}`,
        JSON.stringify(privateKeyJwk),
      ),
      SecureStore.setItemAsync(
        `${PUB_KEY_PREFIX}${keyId}`,
        JSON.stringify(publicKeyJwk),
      ),
    ]);

    logger.info("Ed25519 keypair generated and stored", { keyId });
    return { keyId, publicKeyJwk };
  }

  async getPublicKey(keyId: string): Promise<JsonWebKey> {
    const raw = await SecureStore.getItemAsync(`${PUB_KEY_PREFIX}${keyId}`);
    if (!raw) {
      throw new Error(`Public key not found for keyId: ${keyId}`);
    }
    return JSON.parse(raw) as JsonWebKey;
  }

  async sign(keyId: string, data: Uint8Array): Promise<Uint8Array> {
    const raw = await SecureStore.getItemAsync(`${PRIV_KEY_PREFIX}${keyId}`);
    if (!raw) {
      throw new Error(`Private key not found for keyId: ${keyId}`);
    }

    const privateKeyJwk = JSON.parse(raw) as JsonWebKey;
    const cryptoKey = await crypto.subtle.importKey(
      "jwk",
      privateKeyJwk,
      { name: "Ed25519" },
      false, // not extractable after import
      ["sign"],
    );

    // Slice to a plain ArrayBuffer — crypto.subtle.sign requires BufferSource (not SharedArrayBuffer)
    const buffer = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength,
    ) as ArrayBuffer;
    const signature = await crypto.subtle.sign("Ed25519", cryptoKey, buffer);
    return new Uint8Array(signature);
  }
}
