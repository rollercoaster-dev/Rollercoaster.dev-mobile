/**
 * Sidecar intent loader for the i18n batch translator.
 *
 * Mirrors `translator.ts`'s `parseRegister` discipline: namespace name is
 * embedded in every error so callers don't need to wrap. The asymmetry
 * matters — missing file is the common case (most namespaces have no
 * sidecar), but a present-but-corrupt file is a content-authoring mistake
 * that must surface, not silently degrade the prompt.
 *
 *   - missing file        → `{}` (no throw)
 *   - present but empty   → `{}` (no throw)
 *   - present, `{}`       → `{}` (no throw)
 *   - present, not JSON   → throws
 *   - present, non-object → throws
 *   - present, bad shape  → throws (zod validation)
 *
 * Pure sync `node:fs` I/O — no Bun-specific APIs, no `import.meta`. Jest can
 * import this module directly.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { z } from "zod";

import type { IntentEntry } from "./promptBuilder";

const intentEntrySchema: z.ZodType<IntentEntry> = z
  .object({
    intent: z.string().min(1),
    audience: z.string().optional(),
    register: z.string().optional(),
  })
  .strict();

const intentRecordSchema = z.record(z.string(), intentEntrySchema);

export function loadIntentSidecar(
  enDir: string,
  ns: string,
): Record<string, IntentEntry> {
  const path = join(enDir, `${ns}.intents.json`);
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException)?.code === "ENOENT") {
      return {};
    }
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(`namespace ${ns}: intent sidecar read failed — ${detail}`, {
      cause: e,
    });
  }
  if (raw.trim().length === 0) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(
      `namespace ${ns}: intent sidecar is not valid JSON — ${detail}`,
      { cause: e },
    );
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(
      `namespace ${ns}: intent sidecar has unexpected root type — expected JSON object, got ${
        Array.isArray(parsed)
          ? "array"
          : parsed === null
            ? "null"
            : typeof parsed
      }`,
    );
  }

  const result = intentRecordSchema.safeParse(parsed);
  if (!result.success) {
    const details = result.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new Error(
      `namespace ${ns}: intent sidecar shape invalid — ${details}`,
    );
  }
  return result.data;
}
