/**
 * useUserKey
 *
 * Ensures an Ed25519 keypair exists for the current user/device.
 * On first mount (when UserSettings has no keyId), generates a keypair
 * via SecureStoreKeyProvider and persists the keyId to UserSettings.
 *
 * Idempotent — does nothing if a keyId is already stored.
 * Silent — no UI, key generation happens in the background.
 */
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@evolu/react";
import {
  userSettingsQuery,
  createUserSettings,
  updateUserSettingsKey,
} from "../db";
import { keyProvider } from "../crypto";
import { Logger } from "../shims/rd-logger";

const logger = new Logger("useUserKey");

export interface UserKeyState {
  /** The keyId stored in UserSettings (null until generation completes) */
  keyId: string | null;
  /** True once the key is ready (either already existed or just generated) */
  isReady: boolean;
  /** Set if SecureStore is unavailable or key generation failed */
  error: string | null;
}

export function useUserKey(): UserKeyState {
  const rows = useQuery(userSettingsQuery);
  const settings = rows[0] ?? null;
  const didInit = useRef(false);
  const isGenerating = useRef(false);

  const [error, setError] = useState<string | null>(null);

  // Ensure a settings row exists (singleton pattern — same as useDensity)
  useEffect(() => {
    if (!settings && !didInit.current) {
      didInit.current = true;
      createUserSettings();
    }
  }, [settings]);

  // Generate keypair if settings row exists but has no keyId yet
  useEffect(() => {
    if (!settings || settings.keyId || isGenerating.current) return;

    isGenerating.current = true;

    (async () => {
      try {
        const available = await keyProvider.isAvailable();
        if (!available) {
          setError("Secure storage is unavailable on this device");
          logger.warn("SecureStore unavailable — badge signing will not work");
          return;
        }

        const { keyId } = await keyProvider.generateKeyPair();
        // Evolu mutations are synchronous CRDT operations — no await needed.
        updateUserSettingsKey(settings.id, keyId);
        logger.info("Ed25519 keypair ready", { keyId });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(`Key generation failed: ${message}`);
        logger.error("Failed to generate or store keypair", { error: err });
      } finally {
        isGenerating.current = false;
      }
    })();
  }, [settings]);

  const keyId = (settings?.keyId as string | null | undefined) ?? null;
  const isReady = keyId !== null && error === null;

  return { keyId, isReady, error };
}
