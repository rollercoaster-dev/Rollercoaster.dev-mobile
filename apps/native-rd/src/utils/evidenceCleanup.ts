import { File } from "expo-file-system";
import { Logger } from "../shims/rd-logger";
import { EvidenceType } from "../db";

const logger = new Logger("evidenceCleanup");

/** Evidence types that store files on disk. Keep in sync with EvidenceType enum. */
const FILE_BACKED_TYPES: Set<string> = new Set([
  EvidenceType.photo,
  EvidenceType.screenshot,
  EvidenceType.video,
  EvidenceType.voice_memo,
  EvidenceType.file,
]);

/**
 * Delete the physical file associated with an evidence record.
 * Safe to call for any evidence type — text and link evidence are no-ops.
 *
 * @param uri - The evidence URI (file path)
 * @param type - The evidence type
 */
export function deleteEvidenceFile(
  uri: string | undefined,
  type: string,
): void {
  if (!uri || !FILE_BACKED_TYPES.has(type)) {
    return;
  }

  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch (error) {
    // Log but don't throw — the DB record should still be soft-deleted
    logger.error("Failed to delete evidence file from disk", {
      uri,
      type,
      error,
    });
  }
}
