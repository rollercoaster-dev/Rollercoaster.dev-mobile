/**
 * SecureStoreKeyProvider
 *
 * Implements KeyProvider using Expo SecureStore (Keychain on iOS, Keystore on Android).
 * Keys are stored as serialized JWK JSON under prefixed keys:
 *   rcd_privkey_<keyId>  — private key JWK
 *   rcd_pubkey_<keyId>   — public key JWK
 *
 * Keys are ECDSA P-256 (ES256). P-256 rather than Ed25519 because the OB3
 * external-proof (VC-JWT) path only accepts RS256/ES256 — an EdDSA JWS is
 * rejected outright by the validator. See docs/research/ob3-proof-format-spike.md.
 *
 * Every item is written with WHEN_UNLOCKED_THIS_DEVICE_ONLY so the signing key
 * stays out of iOS device backups and never migrates to another device (#765).
 * Keys written before that by older builds are moved by ensureDeviceOnly().
 *
 * Requires react-native-quick-crypto to be installed at app entry (index.ts does this).
 */
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { KeyProvider } from "./KeyProvider";
import { Logger } from "../shims/rd-logger";

const logger = new Logger("crypto");

const PRIV_KEY_PREFIX = "rcd_privkey_";
const PUB_KEY_PREFIX = "rcd_pubkey_";
/** Marker item: present once a keypair is known to be stored device-only. */
const DEVICE_ONLY_PREFIX = "rcd_deviceonly_";
/** Suffix of the temporary copy held while an item is re-created. */
const MOVING_SUFFIX = "_moving";

/**
 * Not migrated to a new device and not restored from a backup. Android ignores
 * this option; there the expo-secure-store config plugin keeps SecureStore out
 * of Auto Backup and device transfer instead.
 */
const DEVICE_ONLY: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

/**
 * Read an item, falling back to the temporary copy a move leaves behind if the
 * app was killed between its delete and re-add. Without the fallback such a
 * key would look missing and be replaced by a new one, changing the did:key.
 */
async function readItem(name: string): Promise<string | null> {
  return (
    (await SecureStore.getItemAsync(name)) ??
    (await SecureStore.getItemAsync(`${name}${MOVING_SUFFIX}`))
  );
}

/**
 * Re-create one item with the device-only accessibility class, keeping its
 * value. Overwriting is not enough: on iOS setItemAsync over an existing item
 * updates the value only and leaves the old accessibility class in place, so
 * the item has to be deleted and added again. The value sits in a temporary
 * copy while that happens, so an interruption at any point leaves it
 * recoverable on the next run.
 */
async function recreateDeviceOnly(name: string): Promise<void> {
  const movingName = `${name}${MOVING_SUFFIX}`;
  const value = await readItem(name);
  // Nothing under either name: the key is an orphan, which useUserKey handles.
  if (value === null) return;

  await SecureStore.setItemAsync(movingName, value, DEVICE_ONLY);
  await SecureStore.deleteItemAsync(name);
  await SecureStore.setItemAsync(name, value, DEVICE_ONLY);
  await SecureStore.deleteItemAsync(movingName);
}

export class SecureStoreKeyProvider implements KeyProvider {
  /** In-flight ensureDeviceOnly() runs; reads of a key wait for its run. */
  private readonly moving = new Map<string, Promise<void>>();

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
      { name: "ECDSA", namedCurve: "P-256" },
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
        DEVICE_ONLY,
      ),
      SecureStore.setItemAsync(
        `${PUB_KEY_PREFIX}${keyId}`,
        JSON.stringify(publicKeyJwk),
        DEVICE_ONLY,
      ),
    ]);
    await SecureStore.setItemAsync(
      `${DEVICE_ONLY_PREFIX}${keyId}`,
      "1",
      DEVICE_ONLY,
    );

    logger.info("P-256 keypair generated and stored", { keyId });
    return { keyId, publicKeyJwk };
  }

  async ensureDeviceOnly(keyId: string): Promise<void> {
    // Android has no accessibility class to change, so there is nothing to move.
    if (Platform.OS !== "ios") return;

    const inFlight = this.moving.get(keyId);
    if (inFlight) return inFlight;

    const run = (async () => {
      const markerName = `${DEVICE_ONLY_PREFIX}${keyId}`;
      if ((await SecureStore.getItemAsync(markerName)) !== null) return;

      await recreateDeviceOnly(`${PRIV_KEY_PREFIX}${keyId}`);
      await recreateDeviceOnly(`${PUB_KEY_PREFIX}${keyId}`);
      await SecureStore.setItemAsync(markerName, "1", DEVICE_ONLY);
      logger.info("Keypair moved to device-only storage", { keyId });
    })();

    this.moving.set(keyId, run);
    try {
      await run;
    } finally {
      this.moving.delete(keyId);
    }
  }

  /** Wait out a move so a read never lands between its delete and re-add. */
  private async settled(keyId: string): Promise<void> {
    await this.moving.get(keyId)?.catch(() => undefined);
  }

  async getPublicKey(keyId: string): Promise<JsonWebKey> {
    await this.settled(keyId);
    const raw = await readItem(`${PUB_KEY_PREFIX}${keyId}`);
    if (!raw) {
      throw new Error(`Public key not found for keyId: ${keyId}`);
    }
    return JSON.parse(raw) as JsonWebKey;
  }

  async sign(keyId: string, data: Uint8Array): Promise<Uint8Array> {
    await this.settled(keyId);
    const raw = await readItem(`${PRIV_KEY_PREFIX}${keyId}`);
    if (!raw) {
      throw new Error(`Private key not found for keyId: ${keyId}`);
    }

    const privateKeyJwk = JSON.parse(raw) as JsonWebKey;
    const cryptoKey = await crypto.subtle.importKey(
      "jwk",
      privateKeyJwk,
      { name: "ECDSA", namedCurve: "P-256" },
      false, // not extractable after import
      ["sign"],
    );

    // Slice to a plain ArrayBuffer — crypto.subtle.sign requires BufferSource (not SharedArrayBuffer)
    const buffer = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength,
    ) as ArrayBuffer;
    // WebCrypto's ECDSA sign() returns the raw IEEE-P1363 `r‖s` pair, which is
    // exactly the form a JWS ES256 signature takes — no DER unwrapping needed.
    const signature = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      cryptoKey,
      buffer,
    );
    return new Uint8Array(signature);
  }
}
