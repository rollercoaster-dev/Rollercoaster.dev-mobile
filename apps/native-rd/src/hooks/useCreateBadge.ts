/**
 * useCreateBadge
 *
 * Orchestrates OB3 credential creation when a goal is completed.
 *
 * First completion (no existing badge):
 *   1. Build unsigned credential, 2. sign, 3. bake PNG, 4. save to disk,
 *   5. createBadge (persist credential + image URI), 6. completeGoal.
 *
 * Re-completion (existing badge + goal reopened to active):
 *   - completed goal → idempotent done, no DB writes.
 *   - active goal → fall through to bake IIFE, write via updateBadge
 *     (preserves badge id; existing design is kept). The bake source is
 *     either the caller's freshCapturedPng (designer redesign), the
 *     existing on-disk PNG (re-uses prior pixels with the refreshed
 *     credential), or the offscreen-host capturedPng fallback.
 *
 * Race-condition safe — once a mutating branch fires, the ref guard is
 * never reset, preventing Strict Mode double-invocation or re-render
 * loops from unstable array refs returned by Evolu queries.
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

  const goals = useQuery(goalsQuery);
  const goal = goals.find((g) => g.id === goalId) ?? null;

  const goalEvidence = useQuery(evidenceByGoalQuery(goalId));
  const stepEvidence = useQuery(stepEvidenceByGoalQuery(goalId));
  const badgeRows = useQuery(badgeByGoalQuery(goalId));
  const existingBadge = badgeRows[0] ?? null;

  const [status, setStatus] = useState<BadgeCreationStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  // Capture latest evidence in a ref so the effect can read it without
  // listing the arrays as deps (Evolu returns new refs every render).
  const evidenceRef = useRef({ goalEvidence, stepEvidence });
  evidenceRef.current = { goalEvidence, stepEvidence };

  // Same pattern for PNG inputs and design — read latest value without adding to deps.
  const freshCapturedPngRef = useRef(options?.freshCapturedPng);
  freshCapturedPngRef.current = options?.freshCapturedPng;
  const capturedPngRef = useRef(options?.capturedPng);
  capturedPngRef.current = options?.capturedPng;
  const designRef = useRef(options?.design);
  designRef.current = options?.design;

  // Once triggered, never reset — prevents re-entry after status state updates
  // or after existingBadge reactively updates from null to a badge object.
  const hasTriggered = useRef(false);

  useEffect(() => {
    // Goal data not loaded yet — every downstream branch needs goal.status.
    if (!goal) return;

    // Existing badge AND goal already completed — idempotent done. Catches
    // the post-bake reactive update too: completeGoal flips status before
    // the next render and lands us here without re-firing any mutation.
    if (existingBadge && goal.status === GoalStatus.completed) {
      setStatus("done");
      return;
    }

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

    // Caller requested to delay badge creation (e.g. waiting for evidence
    // or for the user to tap Bake It in the celebration phase).
    if (!enabled) return;

    // Guard against re-entry
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
        breadcrumb({ category: "badge", message: "bake" });

        // PNG source priority:
        //   1. freshCapturedPng — designer's authoritative capture (Redesign
        //      First). Reflects the user's most recent commitment.
        //   2. Existing on-disk PNG — re-completion's Bake It reuses prior
        //      pixels with the refreshed credential. Skips the offscreen
        //      capture host, which has a known race where the SVG hasn't
        //      painted yet and the snapshot comes back transparent.
        //   3. capturedPng — offscreen-host fallback (first completion
        //      default-design path).
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
            try {
              const existing = await readBadgePNG(existingImageUri);
              if (isPNG(existing)) {
                pngBuffer = existing;
              } else {
                logger.warn(
                  "Existing badge PNG is not a valid PNG; falling back to capture",
                  { goalId, imageUri: existingImageUri },
                );
              }
            } catch (readErr) {
              logger.warn(
                "Failed to read existing badge PNG; falling back to capture",
                { goalId, imageUri: existingImageUri, error: readErr },
              );
            }
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

        // Persist credential + image. createBadge / updateBadge each validate
        // their inputs and can throw before completeGoal fires, so a failure
        // here leaves the goal active rather than completed-without-badge.
        // Both are synchronous Evolu CRDT mutations — no await needed.
        if (existingBadge) {
          // Rebake path: refresh credential + image; Redesign First's design
          // write already landed via BadgeDesignerScreen's handleSave.
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

  return { status, error };
}
