/**
 * Orchestrates OB3 credential creation on goal completion (first-time and
 * rebake-after-reopen). Race-safe: once a mutating branch fires, the ref
 * guard is never reset, so Strict-Mode double-invocation and Evolu's
 * unstable array refs cannot re-enter.
 *
 * ## Terminal error state and recovery
 *
 * The bake pipeline is a single guarded effect: `hasTriggered` flips to `true`
 * on the first mutating run and is *never* reset internally. If the pipeline
 * throws (build/sign/bake/store), the hook lands on `status: "error"` with the
 * guard still `true`, so the effect cannot re-fire — the error state is
 * terminal until something resets the guard. Left alone, the caller is stuck
 * showing an error with no path forward (issue #39).
 *
 * `retryBake()` is that path: it clears `hasTriggered`, returns `status` to
 * `"idle"`, and clears `error`. On the next render the effect re-evaluates its
 * preconditions and — assuming the caller's `enabled` is still `true` — re-runs
 * the full pipeline from the start. It does NOT touch `enabled`; the caller's
 * commit-to-bake state is unchanged, so retry is in-place rather than bouncing
 * the user back to a pre-bake choice. `retryBake` is only meaningful from the
 * `"error"` state; calling it from `"done"` or a permanent `"no-key"` failure
 * would re-arm the guard without changing the underlying cause.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@evolu/react";
import { useTranslation } from "react-i18next";
import {
  goalsQuery,
  evidenceByGoalQuery,
  stepEvidenceByGoalQuery,
  badgeByGoalQuery,
  canCompleteGoal,
  completeGoal,
  createBadge,
  updateBadge,
  GoalStatus,
} from "../db";
import type { GoalId, BadgeId } from "../db";
import { keyProvider } from "../crypto";
import {
  buildUnsignedCredential,
  buildDid,
  bakePNG,
  isPNG,
  saveBadgePNG,
  readBadgePNG,
} from "../badges";
import { Buffer } from "buffer";
import { useUserKey } from "./useUserKey";
import { reportError, breadcrumb } from "../services/sentry-report";
import { Logger } from "../shims/rd-logger";

const logger = new Logger("useCreateBadge");

export const PLACEHOLDER_IMAGE_URI = "pending:baked-image";

export type BadgeCreationStatus =
  | "idle"
  | "loading" // key not ready yet — transient, not a user-visible error
  | "building"
  | "signing"
  | "baking" // generating + baking the PNG image
  | "storing"
  | "done"
  | "error"
  | "no-key"; // key is ready but absent (permanent failure)

export interface UseCreateBadgeResult {
  status: BadgeCreationStatus;
  error: string | null;
  /**
   * Resets the terminal `"error"` state so the bake pipeline can re-run.
   * Clears the re-entry guard, returns status to `"idle"`, and clears `error`.
   * No-op in effect unless the hook is currently in `"error"`. See the
   * "Terminal error state and recovery" note above.
   */
  retryBake: () => void;
}

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export interface UseCreateBadgeOptions {
  /**
   * Authoritative pre-captured PNG from the BadgeDesigner save (Redesign First
   * round-trip via pendingDesignStore). Wins over both the existing on-disk
   * PNG and the offscreen-host fallback — this is the design the user just
   * committed to.
   */
  freshCapturedPng?: Buffer;
  /**
   * Opportunistic offscreen-host capture (first completion default-design path).
   * Only used when neither freshCapturedPng nor a readable existing PNG is
   * available.
   */
  capturedPng?: Buffer;
  /** Serialized BadgeDesign JSON to persist on the badge record. */
  design?: string;
  /** When false, delays badge creation until enabled. Defaults to true. */
  enabled?: boolean;
}

export function useCreateBadge(
  goalId: GoalId,
  options?: UseCreateBadgeOptions,
): UseCreateBadgeResult {
  const enabled = options?.enabled !== false;
  const { keyId, isReady } = useUserKey();
  // Narrative is localized at bake time in the active UI language and frozen
  // into the signed credential — single language, by design. See docs/i18n.md.
  const { t } = useTranslation("badges");

  const goals = useQuery(goalsQuery);
  const goal = goals.find((g) => g.id === goalId) ?? null;

  const goalEvidence = useQuery(evidenceByGoalQuery(goalId));
  const stepEvidence = useQuery(stepEvidenceByGoalQuery(goalId));
  const badgeRows = useQuery(badgeByGoalQuery(goalId));
  const existingBadge = badgeRows[0] ?? null;

  const [status, setStatus] = useState<BadgeCreationStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  // Refs let the effect read latest values without listing them as deps —
  // Evolu queries return fresh array refs every render.
  const evidenceRef = useRef({ goalEvidence, stepEvidence });
  evidenceRef.current = { goalEvidence, stepEvidence };
  const freshCapturedPngRef = useRef(options?.freshCapturedPng);
  freshCapturedPngRef.current = options?.freshCapturedPng;
  const capturedPngRef = useRef(options?.capturedPng);
  capturedPngRef.current = options?.capturedPng;
  const designRef = useRef(options?.design);
  designRef.current = options?.design;
  // t() identity changes on language switch; ref it so the bake effect reads
  // the current language without re-running on every render (matches the
  // Evolu-ref pattern above). hasTriggered guards re-entry regardless.
  const tRef = useRef(t);
  tRef.current = t;

  // Never reset — prevents re-entry after status state updates or after
  // existingBadge reactively flips from null to a row.
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (!goal) return;

    // Idempotent done — also catches the post-bake reactive tick where
    // completeGoal has flipped status before the next render.
    if (existingBadge && goal.status === GoalStatus.completed) {
      setStatus("done");
      return;
    }

    if (!isReady) {
      setStatus("loading");
      return;
    }

    // Key ready but absent → permanent failure (generation failed).
    if (!keyId) {
      setStatus("no-key");
      return;
    }

    if (!enabled) return;

    if (hasTriggered.current) return;
    hasTriggered.current = true;

    const { goalEvidence: gev, stepEvidence: sev } = evidenceRef.current;

    (async () => {
      try {
        setStatus("building");
        breadcrumb({ category: "badge", message: "build" });

        const publicKeyJwk = await keyProvider.getPublicKey(keyId);
        const issuerDid = buildDid(publicKeyJwk);
        const credentialId = `urn:uuid:${crypto.randomUUID()}`;
        const issuedOn = new Date().toISOString();

        const allEvidence = [
          ...gev.map((ev) => ({
            id: ev.id as string,
            type: (ev.type as string | null) ?? null,
            uri: (ev.uri as string | null) ?? "",
            description: (ev.description as string | null) ?? null,
          })),
          ...sev.map((ev) => ({
            id: ev.id as string,
            type: (ev.type as string | null) ?? null,
            uri: (ev.uri as string | null) ?? "",
            description: (ev.description as string | null) ?? null,
            stepTitle: (ev.stepTitle as string | null) ?? null,
          })),
        ];

        const goalTitle = goal.title as string;
        // Compose the criteria narrative in the active UI language. Two forms:
        // the evidence-count sentence (plural via i18next _one/_other) and the
        // zero-evidence sentence, which drops the "Evidence:" clause entirely.
        const narrative =
          allEvidence.length > 0
            ? tRef.current("credential.narrative", {
                count: allEvidence.length,
                title: goalTitle,
              })
            : tRef.current("credential.narrativeNoEvidence", {
                title: goalTitle,
              });

        const unsignedCredential = buildUnsignedCredential({
          goal: {
            id: goal.id as string,
            title: goalTitle,
            description: (goal.description as string | null) ?? null,
          },
          evidence: allEvidence,
          issuerDid,
          publicKeyJwk,
          credentialId,
          issuedOn,
          narrative,
        });

        setStatus("signing");
        breadcrumb({ category: "badge", message: "sign" });

        const credentialJson = JSON.stringify(unsignedCredential);
        const encoded = new TextEncoder().encode(credentialJson);
        const signatureBytes = await keyProvider.sign(keyId, encoded);
        const proofValue = toBase64Url(signatureBytes);

        // NOTE (Iteration A): The `eddsa-rdfc-2022` cryptosuite spec requires
        // RDFC-1.0 canonicalization and a multibase `u`-prefixed proofValue.
        // We sign raw JSON.stringify() and emit plain base64url instead, so
        // this proof will NOT verify under a spec-compliant verifier.
        // Full spec-compliant signing (RDFC canonicalization + multibase) is
        // Iteration D work.
        const signedCredential = {
          ...unsignedCredential,
          proof: {
            type: "DataIntegrityProof",
            cryptosuite: "eddsa-raw-json-iteration-a",
            created: issuedOn,
            proofPurpose: "assertionMethod",
            verificationMethod: `${issuerDid}#key-1`,
            proofValue,
          },
        };

        setStatus("baking");
        breadcrumb({ category: "badge", message: "bake" });

        // PNG source priority: designer redesign > existing on-disk PNG >
        // offscreen capture. The middle source dodges the transparent-
        // snapshot race in the capture host on iOS.
        let pngBuffer: Buffer | null = null;

        if (freshCapturedPngRef.current) {
          if (!isPNG(freshCapturedPngRef.current)) {
            throw new Error(
              "useCreateBadge: freshCapturedPng is not a valid PNG buffer",
            );
          }
          pngBuffer = freshCapturedPngRef.current;
        }

        if (!pngBuffer) {
          const existingImageUri =
            existingBadge?.imageUri &&
            existingBadge.imageUri !== PLACEHOLDER_IMAGE_URI
              ? (existingBadge.imageUri as string)
              : null;
          if (existingImageUri) {
            let existing: Buffer;
            try {
              existing = await readBadgePNG(existingImageUri);
            } catch (readErr) {
              // Surface the URI so the user-visible badgeError points at the
              // missing/unreadable file instead of a raw FileSystem message.
              throw new Error(
                `useCreateBadge: failed to read existing badge PNG at ${existingImageUri}: ${readErr instanceof Error ? readErr.message : String(readErr)}`,
              );
            }
            if (!isPNG(existing)) {
              throw new Error(
                `useCreateBadge: existing badge PNG at ${existingImageUri} is not a valid PNG`,
              );
            }
            pngBuffer = existing;
          }
        }

        if (!pngBuffer) {
          if (!capturedPngRef.current) {
            throw new Error(
              "useCreateBadge: no PNG source available — callers must provide freshCapturedPng or capturedPng (or there must be a readable existing badge image)",
            );
          }
          if (!isPNG(capturedPngRef.current)) {
            throw new Error(
              "useCreateBadge: capturedPng is not a valid PNG buffer",
            );
          }
          pngBuffer = capturedPngRef.current;
        }
        const credentialJsonOut = JSON.stringify(signedCredential);
        const bakedPng = bakePNG(pngBuffer, credentialJsonOut);

        // Save to disk — legitimately recoverable (filesystem errors). Fall back
        // to placeholder so badge creation still succeeds without a baked image.
        let imageUri = PLACEHOLDER_IMAGE_URI;
        try {
          imageUri = await saveBadgePNG(bakedPng);
        } catch (imageErr) {
          logger.error("Badge image save failed, using placeholder", {
            goalId,
            error: imageErr,
          });
          // Fallback path is invisible to the outer catch; report explicitly
          // so chronic FS / SecureStore failures are not silently shipped.
          reportError(imageErr, { area: "badge.create", kind: "store" });
        }

        setStatus("storing");
        breadcrumb({ category: "badge", message: "store" });

        // Validate evidence gating BEFORE any mutations to prevent partial state
        // (badge created but goal not completed).
        const goalEvidenceForGating = gev.map((e) => ({
          type: (e.type as string | null) ?? null,
        }));
        if (!canCompleteGoal(goalEvidenceForGating)) {
          throw new Error(
            "Cannot complete goal: no evidence attached. Add at least one evidence item first.",
          );
        }

        // createBadge / updateBadge validate inputs and can throw before
        // completeGoal — a failure leaves the goal active rather than
        // completed-without-badge.
        if (existingBadge) {
          updateBadge(existingBadge.id as BadgeId, {
            credential: credentialJsonOut,
            imageUri,
          });
        } else {
          createBadge({
            goalId,
            credential: credentialJsonOut,
            imageUri,
            ...(designRef.current ? { design: designRef.current } : {}),
          });
        }
        completeGoal(goalId, goalEvidenceForGating);

        setStatus("done");
        logger.info("Badge credential created", { goalId, credentialId });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        setStatus("error");
        logger.error("Failed to create badge credential", {
          goalId,
          error: err,
        });
        // Single outer report — the broad catch covers build/sign/bake/store
        // stages. Sub-stage granularity would require per-stage try/catch and
        // is deferred until triage data shows we need it.
        reportError(err, { area: "badge.create" });
      }
      // No finally reset — hasTriggered.current stays true permanently
    })();
  }, [existingBadge, isReady, keyId, goal, goalId, enabled]); // evidence read via ref, not deps

  // Recovery from the terminal "error" state: clear the never-reset guard and
  // return to "idle" so the guarded effect can re-run on the next render.
  const retryBake = useCallback(() => {
    hasTriggered.current = false;
    setStatus("idle");
    setError(null);
  }, []);

  return { status, error, retryBake };
}
