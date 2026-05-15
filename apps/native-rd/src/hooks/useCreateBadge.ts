/**
 * useCreateBadge
 *
 * Orchestrates OB3 credential creation when a goal is completed.
 *
 * First completion (no existing badge):
 *   1. Build unsigned credential, 2. sign, 3. bake PNG, 4. save to disk,
 *   5. createBadge (persist credential + image URI), 6. completeGoal.
 *   If image save fails, falls back to a placeholder URI so badge creation
 *   still succeeds.
 *
 * Re-completion (existing badge + goal reopened to active):
 *   - completed goal      → idempotent done, no DB writes.
 *   - no diff vs snapshot → silent completeGoal, status done (modal
 *                           shows the original badge).
 *   - diff detected       → status `rebake-required` until the caller
 *                           passes `confirmRebake: true`, then the same
 *                           pipeline runs and writes via updateBadge
 *                           (preserves badge id; existing design is kept).
 *
 * Race-condition safe — once a mutating branch fires, the ref guard is
 * never reset, preventing Strict Mode double-invocation or re-render
 * loops from unstable array refs returned by Evolu queries.
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
  hasChangesSinceBake,
  mergeEvidenceRows,
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
  | "no-key" // key is ready but absent (permanent failure)
  | "rebake-required"; // existing badge + active goal + diff vs snapshot — awaiting user confirmation

export interface UseCreateBadgeResult {
  status: BadgeCreationStatus;
  error: string | null;
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
  /**
   * **Authoritative** pre-captured PNG of the badge the user just committed
   * to — e.g. the result of the BadgeDesigner's captureBadge on save. When
   * set, this is the source of truth for the bake; it wins over any
   * existing-on-disk badge image.
   */
  freshCapturedPng?: Buffer;
  /**
   * **Opportunistic** pre-captured PNG, intended for the first-bake fallback
   * when the user skipped the designer (CompletionFlowScreen's offscreen
   * BadgeRenderer host). Only used when neither `freshCapturedPng` nor the
   * existing-on-disk image is available — the offscreen capture has been
   * observed to snapshot a transparent layer before the SVG paints.
   */
  capturedPng?: Buffer;
  /** Serialized BadgeDesign JSON to persist on the badge record. */
  design?: string;
  /** When false, delays badge creation until enabled. Defaults to true. */
  enabled?: boolean;
  /**
   * When the hook would otherwise sit in `rebake-required`, set this to `true` to
   * approve the rebake. The pipeline then re-signs the credential with the current
   * goal/evidence state and writes via `updateBadge` instead of `createBadge`.
   */
  confirmRebake?: boolean;
}

export function useCreateBadge(
  goalId: GoalId,
  options?: UseCreateBadgeOptions,
): UseCreateBadgeResult {
  const enabled = options?.enabled !== false;
  const confirmRebake = options?.confirmRebake === true;
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
    // Goal data not loaded yet — every downstream branch needs goal.title /
    // status / description, so bail before reading them.
    if (!goal) return;

    if (existingBadge) {
      // Goal already completed — idempotent done. Catches the post-rebake
      // reactive update too: completeGoal flips status before the next render
      // and lands us here without re-firing any mutation.
      if (goal.status === GoalStatus.completed) {
        setStatus("done");
        return;
      }

      // Active + existing badge means the user reopened. Diff the current
      // goal/evidence state against the credential's frozen snapshot.
      const { goalEvidence: gev, stepEvidence: sev } = evidenceRef.current;
      const mergedEvidence = mergeEvidenceRows(gev, sev);
      const goalForDiff = {
        id: goal.id as string,
        title: goal.title as string,
        description: (goal.description as string | null) ?? null,
      };

      if (
        !hasChangesSinceBake(
          existingBadge.credential as string | null,
          goalForDiff,
          mergedEvidence,
        )
      ) {
        // No changes since the original bake — silently complete the goal so
        // the celebration screen lands on the existing badge.
        if (!enabled) return;
        if (!hasTriggered.current) {
          hasTriggered.current = true;
          try {
            const goalEvidenceForGating = gev.map((ev) => ({
              type: (ev.type as string | null) ?? null,
            }));
            if (!canCompleteGoal(goalEvidenceForGating)) {
              // Matches the bake-path gating at line 385 — refuse to claim
              // completion when evidence requirements aren't satisfied.
              throw new Error(
                "Cannot complete goal: no evidence attached. Add at least one evidence item first.",
              );
            }
            completeGoal(goalId, goalEvidenceForGating);
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Unknown error";
            setError(message);
            setStatus("error");
            logger.error("Silent re-complete failed", { goalId, error: err });
            // Silent re-complete failures don't map cleanly onto the build/sign/bake/store
            // taxonomy — report without a kind tag and rely on the area + log payload.
            reportError(err, { area: "badge.create" });
            return;
          }
        }
        setStatus("done");
        return;
      }

      // Changes detected — wait for caller to confirm via confirmRebake.
      if (!confirmRebake) {
        setStatus("rebake-required");
        return;
      }

      // Confirmed → fall through to the bake IIFE, which will branch on
      // existingBadge for updateBadge vs createBadge.
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

    // Caller requested to delay badge creation (e.g. waiting for evidence)
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

        const allEvidence = mergeEvidenceRows(gev, sev);

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

        // PNG source priority (highest first):
        //   1. `freshCapturedPng` — caller-supplied authoritative capture
        //      (BadgeDesigner save → pendingDesignStore). Reflects the
        //      user's most recent design choice, so it wins over anything
        //      we'd read from disk.
        //   2. Existing badge's previously baked file. For Rebake-without-
        //      redesign: same pixels as the badge the user already had,
        //      just re-baked with the refreshed credential. Skips the
        //      offscreen capture host, which has been observed to snapshot
        //      a transparent layer before the SVG paints.
        //   3. `capturedPng` — offscreen fallback. Last-resort for first
        //      bakes when the user skipped the designer.
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

        // Persist credential + image. createBadge / updateBadge each validate
        // their inputs and can throw before completeGoal fires, so a failure
        // here leaves the goal active rather than completed-without-badge.
        // Both are synchronous Evolu CRDT mutations — no await needed.
        const credentialJsonOut = JSON.stringify(signedCredential);
        if (existingBadge) {
          // Rebake path: keep the existing design (Redesign-first already
          // wrote a new one via the designer), refresh the credential + PNG.
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
  }, [existingBadge, isReady, keyId, goal, goalId, enabled, confirmRebake]); // evidence read via ref, not deps

  return { status, error };
}
