/**
 * Badge Image Storage
 *
 * Persists baked PNG badge images to {document}/badges/.
 *
 * Uses FileSystem.writeAsStringAsync with base64 encoding for binary writes —
 * File.write(Uint8Array) triggers an unregistered JSI type error on iOS
 * ("unordered_map::at: key not found") because the native dispatch map only
 * handles string and ArrayBuffer, not Uint8Array directly.
 */

import { Buffer } from "buffer";
import * as FileSystem from "expo-file-system/legacy";

import { slugifyBadgeName } from "./badgeFilename";

const BADGES_SUBDIR = "badges";

function getBadgesDirectory(): string {
  return `${FileSystem.documentDirectory}${BADGES_SUBDIR}/`;
}

// Name files after the badge so they're recognisable in the share sheet / Files
// app, while keeping a short timestamp+random suffix to guarantee uniqueness
// (multiple badges can share a title; re-bakes shouldn't collide).
function generateBadgeFilename(badgeName?: string): string {
  const slug = slugifyBadgeName(badgeName);
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${slug}-${timestamp}-${random}.png`;
}

/**
 * Save a baked PNG buffer to the badges directory.
 *
 * Creates the directory if it does not exist.
 *
 * @param data - PNG image bytes
 * @param badgeName - Badge/goal title used to name the file (sanitised to a
 *   slug). Omit to fall back to a generic name.
 * @returns Local file URI that can be stored in the badge row's imageUri field
 */
export async function saveBadgePNG(
  data: Uint8Array,
  badgeName?: string,
): Promise<string> {
  const badgesDir = getBadgesDirectory();

  try {
    const dirInfo = await FileSystem.getInfoAsync(badgesDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(badgesDir, { intermediates: true });
    }
  } catch (dirErr) {
    throw new Error(
      `Failed to create badges directory at ${badgesDir}: ${dirErr instanceof Error ? dirErr.message : String(dirErr)}`,
    );
  }

  const uri = `${badgesDir}${generateBadgeFilename(badgeName)}`;
  try {
    await FileSystem.writeAsStringAsync(
      uri,
      Buffer.from(data).toString("base64"),
      { encoding: FileSystem.EncodingType.Base64 },
    );
  } catch (writeErr) {
    throw new Error(
      `Failed to write badge PNG to ${uri}: ${writeErr instanceof Error ? writeErr.message : String(writeErr)}`,
    );
  }

  // Post-write verification — writeAsStringAsync has been observed to resolve
  // without surfacing iOS storage errors (sandbox / quota), leaving us with a
  // URI that points to nothing. If the file isn't there afterwards, treat the
  // save as failed so the caller's placeholder fallback engages instead of
  // shipping a broken URI into the badge row.
  const verify = await FileSystem.getInfoAsync(uri);
  if (!verify.exists) {
    throw new Error(
      `Badge PNG write completed but file is missing at ${uri}. Likely an iOS sandbox / quota issue.`,
    );
  }

  return uri;
}

/**
 * Read a previously-saved badge PNG back into memory.
 *
 * Throws when the file is missing or unreadable — callers must decide whether
 * to fall back to another bake source. No silent placeholder fallback.
 */
export async function readBadgePNG(uri: string): Promise<Buffer> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return Buffer.from(base64, "base64");
}
