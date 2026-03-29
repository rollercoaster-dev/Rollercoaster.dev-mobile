export type ParseLogger = {
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

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
