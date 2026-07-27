import type { EvidenceTypeValue } from "../types/evidence";

export type ParseLogger = {
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

/**
 * What an *unset* evidence plan means: one text note (#466 D4).
 *
 * A step can reach this state legitimately — `EditGoalView`'s default "add
 * step" flow never writes a plan — so "unset" needs a concrete meaning rather
 * than an exemption. Treating it as "no evidence required" would contradict the
 * app-wide invariant that completion is *revealed by* present evidence (#360),
 * and would strand the step in the UI: `FocusCurrentTaskCard` only reveals
 * "Mark complete" once every planned type is captured, so a step planning
 * nothing could never be completed from Focus Mode at all.
 *
 * The *value* is a bare string literal rather than `EvidenceType.text` on
 * purpose: `src/db/queries.ts` imports this module, so importing the schema
 * back would close a runtime cycle. The annotation still pins it to
 * `EvidenceTypeValue` — `import type` is erased at compile time, so this buys
 * a typo check on a cross-layer contract without reopening that cycle.
 */
export const DEFAULT_PLANNED_EVIDENCE_TYPES: readonly EvidenceTypeValue[] = [
  "text",
];

/**
 * {@link parsePlannedEvidenceTypes}, with the unset case resolved to
 * {@link DEFAULT_PLANNED_EVIDENCE_TYPES} instead of `null`.
 *
 * Use this wherever a plan is about to drive UI or a completion gate, so the
 * card's "what do I still owe?" reading and `canCompleteStep`'s verdict are
 * computed from the same list and cannot disagree (#466 D4). Use the raw
 * `parsePlannedEvidenceTypes` only where "the user never set a plan" is itself
 * the thing being inspected.
 */
export function resolvePlannedEvidenceTypes(
  json: string | null | undefined,
  logger?: ParseLogger,
): readonly string[] {
  return parsePlannedEvidenceTypes(json, logger) ?? DEFAULT_PLANNED_EVIDENCE_TYPES; // prettier-ignore
}

/**
 * Parse the `plannedEvidenceTypes` JSON column into a string array.
 *
 * Returns `null` for missing/invalid/non-array values so callers can
 * treat null as "no specific types planned".
 *
 * Accepts an optional logger so DB-layer callers can route through
 * rd-logger with structured context instead of bare console calls.
 */
export function parsePlannedEvidenceTypes(
  json: string | null | undefined,
  logger?: ParseLogger,
): string[] | null {
  if (!json) return null;

  const log = logger ?? console;

  try {
    const parsed = JSON.parse(json);

    if (!Array.isArray(parsed)) {
      log.warn("[parsePlannedEvidenceTypes] not an array", { raw: json });
      return null;
    }

    const strings = parsed.filter(
      (item): item is string => typeof item === "string",
    );
    if (strings.length !== parsed.length) {
      log.warn("[parsePlannedEvidenceTypes] filtered non-string elements", {
        raw: json,
      });
    }

    return strings.length > 0 ? strings : null;
  } catch (error) {
    log.error("[parsePlannedEvidenceTypes] invalid JSON", { raw: json, error });
    return null;
  }
}
