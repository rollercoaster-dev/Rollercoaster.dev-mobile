/**
 * useCreateBadge
 *
 * Orchestrates OB3 credential creation when a goal is completed.
 * On first call (when no badge exists yet):
 *   1. Builds unsigned credential via buildUnsignedCredential
 *   2. Signs the JSON with the user's Ed25519 key via keyProvider.sign
 *   3. Generates a badge PNG from the goal color
 *   4. Bakes the signed credential into the PNG (OB3 iTXt chunk)
 *   5. Persists the PNG to disk and records the URI
 *   6. Calls createBadge (persists credential + image URI)
 *   7. Calls completeGoal (marks goal as completed)
 *
 * If image generation or baking fails, falls back to the placeholder URI
 * so badge creation still succeeds even without a baked image.
 *
 * Idempotent — returns 'done' immediately if a badge already exists.
 * Race-condition safe — once triggered, the ref guard is never reset,
 * preventing Strict Mode double-invocation or re-render loops from
 * unstable array refs returned by Evolu queries.
 *
 * goalId stability assumption: hasTriggered is keyed to the component
 * instance, not the goalId. If goalId changes while the component stays
 * mounted, no second badge will be created. In practice, CompletionFlowScreen
 * is only mounted for one goal at a time.
 */
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@evolu/react";
import {
  goalsQuery,
  evidenceByGoalQuery,
  stepEvidenceByGoalQuery,
  badgeByGoalQuery,
  canCompleteGoal,
  completeGoal,
  createBadge,
  deleteBadge,
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
  shouldRebake,
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
   * True iff the most recent run produced a fresh credential that replaced
   * a pre-existing badge (rebake path). Distinguishes "first bake" from
   * "re-completion that materially changed something" so callers can vary
   * celebration copy.
   */
  rebaked: boolean;
}

/** base64url-encode a Uint8Array without relying on Node's Buffer */
function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export interface UseCreateBadgeOptions {
  /** Pre-captured 512x512 PNG from captureBadge(). When provided, replaces the solid-color fallback. */
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

  const goals = useQuery(goalsQuery);
  const goal = goals.find((g) => g.id === goalId) ?? null;

  const goalEvidence = useQuery(evidenceByGoalQuery(goalId));
  const stepEvidence = useQuery(stepEvidenceByGoalQuery(goalId));
  const badgeRows = useQuery(badgeByGoalQuery(goalId));
  const existingBadge = badgeRows[0] ?? null;

  const [status, setStatus] = useState<BadgeCreationStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [rebaked, setRebaked] = useState(false);

  // Capture latest evidence in a ref so the effect can read it without
  // listing the arrays as deps (Evolu returns new refs every render).
  const evidenceRef = useRef({ goalEvidence, stepEvidence });
  evidenceRef.current = { goalEvidence, stepEvidence };

  // Same pattern for capturedPng and design — read latest value without adding to deps.
  const capturedPngRef = useRef(options?.capturedPng);
  capturedPngRef.current = options?.capturedPng;
  const designRef = useRef(options?.design);
  designRef.current = options?.design;

  // Once triggered, never reset — prevents re-entry after status state updates
  // or after existingBadge reactively updates from null to a badge object.
  const hasTriggered = useRef(false);

  useEffect(() => {
    // Key still initialising — transient state, not a user-visible problem
    if (!isReady) {
      setStatus("loading");
      return;
    }

    // Key is ready but absent — permanent failure (generation failed)
    if (!keyId) {
      setStatus("no-key");
      return;
    }

    // Goal data not loaded yet
    if (!goal) return;

    // Caller requested to delay badge creation (e.g. waiting for evidence)
    if (!enabled) return;

    const { goalEvidence: gev, stepEvidence: sev } = evidenceRef.current;

    // Rebake policy: when a badge already exists, decide whether to issue a
    // new credential (rebake) or short-circuit. shouldRebake returns true iff
    // evidence has changed OR the design has been edited since the bake.
    // Same-evidence + same-design = same-credential = idempotent done.
    const currentEvidenceIds = [
      ...gev.map((ev) => ({ id: ev.id as string })),
      ...sev.map((ev) => ({ id: ev.id as string })),
    ];
    const isRebake = existingBadge
      ? shouldRebake(
          {
            credential: existingBadge.credential as string,
            createdAt: existingBadge.createdAt as string | null,
            updatedAt: existingBadge.updatedAt as string | null,
          },
          currentEvidenceIds,
        )
      : false;

    if (existingBadge && !isRebake) {
      setStatus("done");
      return;
    }

    // Guard against re-entry
    if (hasTriggered.current) return;
    hasTriggered.current = true;

    const previousBadgeId = existingBadge
      ? (existingBadge.id as BadgeId)
      : null;
    const previousImageUri = existingBadge
      ? (existingBadge.imageUri as string | null)
      : null;
    const previousDesign = existingBadge
      ? (existingBadge.design as string | null)
      : null;

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

        const unsignedCredential = buildUnsignedCredential({
          goal: {
            id: goal.id as string,
            title: goal.title as string,
            description: (goal.description as string | null) ?? null,
          },
          evidence: allEvidence,
          issuerDid,
          publicKeyJwk,
          credentialId,
          issuedOn,
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
        breadcrumb({
          category: "badge",
          message: isRebake ? "rebake" : "bake",
        });

        // PNG source priority:
        //   1. Caller-provided capturedPng (fresh Designer capture, or
        //      auto-captured default for first-time bake)
        //   2. Rebake with no fresh capture → read prior baked PNG from disk
        //      to preserve the visual. Known limitation: design-only edits
        //      don't visually propagate via this path; user must re-capture
        //      via Designer. Tracked as a follow-up.
        // The old solid-color fallback baked an unloved blue square into the
        // credential and is gone for good — capturedPng (or a readable prior
        // PNG on rebake) is required.
        let pngBuffer: Buffer;
        if (capturedPngRef.current) {
          if (!isPNG(capturedPngRef.current)) {
            throw new Error(
              "useCreateBadge: capturedPng is not a valid PNG buffer",
            );
          }
          pngBuffer = capturedPngRef.current;
        } else if (
          isRebake &&
          previousImageUri &&
          previousImageUri !== PLACEHOLDER_IMAGE_URI
        ) {
          const prev = await readBadgePNG(previousImageUri);
          pngBuffer = Buffer.from(prev);
        } else {
          throw new Error(
            "useCreateBadge: capturedPng is required — callers must provide a captured badge PNG (from a pending design or auto-captured default) before enabling badge creation",
          );
        }
        const bakedPng = bakePNG(pngBuffer, JSON.stringify(signedCredential));

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

        // createBadge first — it validates and can throw (non-empty credential required).
        // If it throws, completeGoal/deleteBadge have not yet fired, so no partial state.
        // On rebake: the new row inserts BEFORE the previous is soft-deleted, so
        // badgeByGoalQuery transitions atomically from "old row visible" to
        // "new row visible" without an empty interval.
        // All Evolu mutations are synchronous CRDT writes — no await needed.
        const persistedDesign =
          designRef.current ?? previousDesign ?? undefined;
        createBadge({
          goalId,
          credential: JSON.stringify(signedCredential),
          imageUri,
          ...(persistedDesign ? { design: persistedDesign } : {}),
        });
        completeGoal(goalId, goalEvidenceForGating);

        if (isRebake && previousBadgeId) {
          // Soft-delete the prior canonical row AFTER the new one is committed.
          // If this throws (extremely unlikely — it's a flag update), the new
          // row is already in place; the next read picks the newest and the
          // history modal will simply show both as "active". Worth the noise.
          try {
            deleteBadge(previousBadgeId);
          } catch (deleteErr) {
            logger.error("Rebake: failed to soft-delete previous badge row", {
              goalId,
              previousBadgeId,
              error: deleteErr,
            });
            reportError(deleteErr, {
              area: "badge.create",
              kind: "rebake.delete",
            });
          }
        }

        if (isRebake) setRebaked(true);
        setStatus("done");
        logger.info(isRebake ? "Badge rebaked" : "Badge credential created", {
          goalId,
          credentialId,
          previousBadgeId,
        });
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

  return { status, error, rebaked };
}
