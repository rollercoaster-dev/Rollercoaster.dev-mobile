/**
 * useUserKey
 *
 * Ensures a P-256 (ES256) keypair exists for the current user/device.
 * On first mount (when UserSettings has no keyId), generates a keypair
 * via SecureStoreKeyProvider and persists the keyId to UserSettings.
 *
 * Self-healing — if a stored keyId points to SecureStore data that's gone
 * (e.g. iOS keychain wipe on reinstall, simulator reset, bundle id change),
 * the orphan keyId is cleared so the generation effect can produce a fresh
 * keypair. Without this, badge creation fails with "Public key not found".
 *
 * Also self-heals across the Ed25519 → P-256 migration (#598): a key stored
 * by a pre-upgrade build is the wrong algorithm for the ES256 VC-JWT proof
 * the app now signs, and the validator rejects EdDSA outright, so such a key
 * is cleared exactly like an orphan and a fresh P-256 key is generated in its
 * place. Badges already earned under the old key are left untouched — the
 * rotation only affects the next badge signed.
 *
 * Idempotent — does nothing if a verified keyId is already stored.
 * Silent — no UI, key generation happens in the background.
 */
import { useEffect, useRef, useState } from "react";
import { updateUserSettingsKey, clearUserSettingsKey } from "../db";
import { useUserSettingsRow } from "./useUserSettingsRow";
import { keyProvider } from "../crypto";
import { reportError, breadcrumb } from "../services/sentry-report";
import { Logger } from "../shims/rd-logger";

const logger = new Logger("useUserKey");

/**
 * True for the ECDSA P-256 public keys `SecureStoreKeyProvider` now mints.
 * Anything else — most concretely a pre-#598 `{kty: "OKP", crv: "Ed25519"}`
 * key — is stale and gets rotated out.
 */
function isP256Jwk(jwk: JsonWebKey | null | undefined): boolean {
  return jwk?.kty === "EC" && jwk.crv === "P-256";
}

export interface UserKeyState {
  /** The keyId stored in UserSettings (null until generation completes) */
  keyId: string | null;
  /** True once the key is ready (verified to exist in SecureStore) */
  isReady: boolean;
  /** Set if SecureStore is unavailable or key generation failed */
  error: string | null;
}

export function useUserKey(): UserKeyState {
  const { settings } = useUserSettingsRow();
  const isGenerating = useRef(false);
  // The most recently completed verification — if storedKeyId still matches
  // this, we skip the probe. Reset implicitly when storedKeyId changes.
  const verifiedKeyId = useRef<string | null>(null);
  // The keyId the verification effect *intends* to verify (the latest one
  // requested). Used to (a) skip starting a duplicate probe for the same
  // keyId and (b) detect stale resolutions from a previous keyId so they
  // don't poison state for the current one.
  const pendingKeyId = useRef<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  // Verify the stored keyId still resolves in SecureStore. If the underlying
  // key data has been wiped (iOS keychain reset, app reinstall, bundle id
  // change), clear the orphan so the generation effect below can re-run.
  //
  // Race protection: track which keyId is currently being verified so a late
  // resolution from a previous keyId can't poison state for a replacement
  // keyId. Without this guard, settings.keyId could change mid-verification
  // and the stale promise would set verified=true / clear-orphan against
  // the wrong key.
  useEffect(() => {
    const storedKeyId = (settings?.keyId as string | null | undefined) ?? null;

    if (!settings || !storedKeyId) {
      setVerified(false);
      return;
    }

    // Already verified this exact keyId — nothing to do.
    if (verifiedKeyId.current === storedKeyId) return;
    // Already probing this exact keyId — let the in-flight call finish.
    if (pendingKeyId.current === storedKeyId) return;

    // Mark this keyId as the latest intent BEFORE awaiting. If a newer
    // settings.keyId arrives mid-flight, pendingKeyId will move on and the
    // older promise's resolution will fail the staleness check below.
    const verifyingKeyId = storedKeyId;
    pendingKeyId.current = storedKeyId;
    setVerified(false);

    (async () => {
      try {
        breadcrumb({ category: "key", message: "verify" });
        const publicKeyJwk = await keyProvider.getPublicKey(verifyingKeyId);
        // Stale-result guard: if settings.keyId changed during verification,
        // discard this result rather than marking a different key verified.
        if (pendingKeyId.current !== verifyingKeyId) return;

        // Wrong-algorithm branch (#598): a pre-upgrade Ed25519 key can never
        // produce a badge the OB3 validator accepts, so treat it exactly like
        // an orphan — clear it and let the generation effect mint a P-256 key.
        if (!isP256Jwk(publicKeyJwk)) {
          logger.warn(
            "Stored key is not P-256 — clearing so a fresh P-256 keypair can be generated",
            { keyId: verifyingKeyId },
          );
          breadcrumb({ category: "key", message: "rotate" });
          clearUserSettingsKey(settings.id);
          setVerified(false);
          return;
        }

        verifiedKeyId.current = verifyingKeyId;
        setVerified(true);
      } catch (err) {
        if (pendingKeyId.current !== verifyingKeyId) return;
        const message = err instanceof Error ? err.message : String(err);
        // Distinguish orphan ("not found") from transient store errors so
        // we don't wipe a valid keyId during a flaky SecureStore read.
        if (message.includes("not found")) {
          logger.warn(
            "Stored keyId orphaned in SecureStore — clearing so a fresh keypair can be generated",
            { keyId: verifyingKeyId },
          );
          clearUserSettingsKey(settings.id);
        } else {
          logger.error("Failed to verify stored keyId", {
            keyId: verifyingKeyId,
            error: err,
          });
          reportError(err, { area: "key.verify" });
          setError(`Key verification failed: ${message}`);
        }
        setVerified(false);
      }
    })();
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

        breadcrumb({ category: "key", message: "generate" });
        const { keyId } = await keyProvider.generateKeyPair();
        // Evolu mutations are synchronous CRDT operations — no await needed.
        updateUserSettingsKey(settings.id, keyId);
        logger.info("P-256 keypair ready", { keyId });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(`Key generation failed: ${message}`);
        logger.error("Failed to generate or store keypair", { error: err });
        reportError(err, { area: "key.generate" });
      } finally {
        isGenerating.current = false;
      }
    })();
  }, [settings]);

  const keyId = (settings?.keyId as string | null | undefined) ?? null;
  const isReady = keyId !== null && verified && error === null;

  return { keyId, isReady, error };
}
