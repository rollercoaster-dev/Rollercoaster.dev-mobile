#!/usr/bin/env bun
/**
 * Pull German translations from the self-hosted Tolgee instance and write them
 * into src/i18n/resources/de/<ns>.json.
 *
 * Why this exists separately from `tolgee pull` (the official CLI):
 *
 *   The @tolgee/cli@2.16 push/pull commands send the API key in the
 *   `Authorization: Bearer` header on the final apply/export call. The
 *   self-hosted Tolgee server expects `X-API-Key` for both project API keys
 *   (`tgpak_*`) and personal access tokens (`tgpat_*`); it rejects Bearer-
 *   wrapped keys with `invalid_project_api_key` / `invalid_pat`. The CLI's
 *   pull therefore fails 401 against a working server config. Filed against
 *   tolgee/tolgee-cli; until it's fixed we drive the export endpoint directly.
 *
 * Reads three env vars:
 *   TOLGEE_API_URL     — base URL, e.g. http://hail-mary:8085
 *   TOLGEE_API_KEY     — project API key (tgpak_*) OR PAT (tgpat_*)
 *   TOLGEE_PROJECT_ID  — project ID (required when using a PAT; ignored for
 *                        project keys since they embed the ID)
 *
 * Run: `bun run i18n:pull` (which also runs the prune afterwards).
 */

import { mkdtempSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const RESOURCES_DIR = join(import.meta.dir, "..", "src", "i18n", "resources");

function fail(message: string): never {
  throw new Error(message);
}

async function main(): Promise<void> {
  const apiUrl = (
    process.env.TOLGEE_API_URL ??
    fail("Missing required env var: TOLGEE_API_URL")
  ).replace(/\/+$/, "");
  const apiKey =
    process.env.TOLGEE_API_KEY ??
    fail("Missing required env var: TOLGEE_API_KEY");
  const isProjectKey = apiKey.startsWith("tgpak_");
  const projectId = isProjectKey
    ? undefined
    : (process.env.TOLGEE_PROJECT_ID ??
      fail(
        "Missing required env var: TOLGEE_PROJECT_ID (required when using a PAT)",
      ));

  // For project API keys, /v2/projects/export resolves the project from the
  // key itself; PATs must hit /v2/projects/{id}/export.
  const exportPath = isProjectKey
    ? "/v2/projects/export"
    : `/v2/projects/${projectId}/export`;

  const params = new URLSearchParams({
    languages: "de",
    format: "JSON_I18NEXT",
    // Default structureDelimiter (".") nests keys so `de/common.json` mirrors
    // the nested shape of `en/common.json` instead of emitting flat-dotted
    // keys like `"actions.save": "Speichern"`.
    fileStructureTemplate: "{languageTag}/{namespace}.{extension}",
  });

  console.log(`Fetching de translations from ${apiUrl}${exportPath}...`);
  const res = await fetch(`${apiUrl}${exportPath}?${params}`, {
    headers: { "X-API-Key": apiKey },
  });
  if (!res.ok) {
    throw new Error(
      `Tolgee export failed: HTTP ${res.status} ${await res.text()}`,
    );
  }

  const zipBuffer = Buffer.from(await res.arrayBuffer());
  const tmpDir = mkdtempSync(join(tmpdir(), "tolgee-pull-"));
  const zipPath = join(tmpDir, "export.zip");
  writeFileSync(zipPath, zipBuffer);

  const unzip = spawnSync("unzip", ["-qo", zipPath, "-d", tmpDir]);
  if (unzip.status !== 0) {
    throw new Error(`unzip failed: ${unzip.stderr.toString()}`);
  }

  // Tolgee returns only namespaces that have at least one translation in the
  // requested language. Existing empty `resources/de/<ns>.json` files stay as
  // they are — the prune script handles structural cleanup on what we wrote.
  const deDir = join(tmpDir, "de");
  let written = 0;
  try {
    for (const name of readdirSync(deDir)) {
      if (!name.endsWith(".json")) continue;
      const src = join(deDir, name);
      const dst = join(RESOURCES_DIR, "de", name);
      const content = readFileSync(src, "utf-8");
      // Re-emit through JSON.stringify so prettier-friendly indentation matches
      // every other resource file.
      const parsed = JSON.parse(content) as unknown;
      writeFileSync(dst, `${JSON.stringify(parsed, null, 2)}\n`);
      written += 1;
      console.log(`  wrote ${name}`);
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      console.log("(server returned no German translations yet)");
    } else {
      throw err;
    }
  }
  console.log(`wrote ${written} file(s) under resources/de/`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
