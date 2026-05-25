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
 * Author-facing format is nested JSON that mirrors `en/<ns>.json`, with
 * string leaves replaced by `{ intent, audience?, register? }` objects.
 * The loader flattens these to dotted source-path keys (`"hero.title"`)
 * before returning, which is what `translator.ts` re-keys onto synthetic
 * `k{n}` dict keys. The `lintSource.ts` sidecar walker already assumes
 * the nested shape — this loader is what makes a correctly-authored
 * sidecar actually load.
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
    intent: z.string().trim().min(1),
    audience: z.string().trim().min(1).optional(),
    register: z.string().trim().min(1).optional(),
  })
  .strict();

const INTENT_LEAF_KEYS = new Set(["intent", "audience", "register"]);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/**
 * A node is treated as a leaf when it's a plain object that declares at
 * least one `IntentEntry` field (`intent`, `audience`, or `register`).
 * That's enough signal: strict zod then either accepts it or produces a
 * targeted error — "Required: intent" for `{ audience: "..." }`, or
 * "Unrecognized key: 'audiance'" for typos. Pure branch objects (e.g.
 * `{ hero: { title: { ... } } }`) have none of these keys at any given
 * level, so the heuristic doesn't false-positive on namespace structure.
 *
 * Empty objects are not leaves — recursion bottoms out with zero output,
 * and the loader's documented `{}` -> `{}` contract is preserved.
 */
function looksLikeLeaf(node: Record<string, unknown>): boolean {
  for (const k of Object.keys(node)) {
    if (INTENT_LEAF_KEYS.has(k)) return true;
  }
  return false;
}

function flattenIntoRecord(
  node: unknown,
  prefix: string,
  ns: string,
  out: Record<string, IntentEntry>,
): void {
  if (!isPlainObject(node)) {
    throw new Error(
      `namespace ${ns}: intent sidecar shape invalid — ${
        prefix || "(root)"
      }: expected object, got ${
        Array.isArray(node) ? "array" : node === null ? "null" : typeof node
      }`,
    );
  }

  if (looksLikeLeaf(node)) {
    const result = intentEntrySchema.safeParse(node);
    if (!result.success) {
      const details = result.error.issues
        .map((i) => {
          const leafPath = i.path.join(".");
          const full =
            prefix && leafPath
              ? `${prefix}.${leafPath}`
              : prefix || leafPath || "(root)";
          return `${full}: ${i.message}`;
        })
        .join("; ");
      throw new Error(
        `namespace ${ns}: intent sidecar shape invalid — ${details}`,
      );
    }
    if (prefix === "") {
      throw new Error(
        `namespace ${ns}: intent sidecar shape invalid — (root): leaf intent entry at root, expected nested object mirroring source namespace`,
      );
    }
    out[prefix] = result.data;
    return;
  }

  for (const [key, value] of Object.entries(node)) {
    const next = prefix === "" ? key : `${prefix}.${key}`;
    flattenIntoRecord(value, next, ns, out);
  }
}

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

  const out: Record<string, IntentEntry> = {};
  flattenIntoRecord(parsed, "", ns, out);
  return out;
}
