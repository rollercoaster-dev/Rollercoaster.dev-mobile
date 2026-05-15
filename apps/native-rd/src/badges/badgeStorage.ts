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

const BADGES_SUBDIR = "badges";

function getBadgesDirectory(): string {
  return `${FileSystem.documentDirectory}${BADGES_SUBDIR}/`;
}

function generateBadgeFilename(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${random}.png`;
}

/** Convert a Uint8Array to a base64 string without relying on Node's Buffer */
function toBase64(data: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

/**
 * Save a baked PNG buffer to the badges directory.
 *
 * Creates the directory if it does not exist.
 *
 * @param data - PNG image bytes
 * @returns Local file URI that can be stored in the badge row's imageUri field
 */
export async function saveBadgePNG(data: Uint8Array): Promise<string> {
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

  const uri = `${badgesDir}${generateBadgeFilename()}`;
  try {
    await FileSystem.writeAsStringAsync(uri, toBase64(data), {
      encoding: FileSystem.EncodingType.Base64,
    });
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
 * Used by the re-completion bake path: re-baking the new credential into the
 * existing on-disk pixels avoids the offscreen-capture timing bug where the
 * SVG hasn't finished painting yet and the snapshot comes back transparent.
 *
 * Throws when the file is missing or unreadable — callers must decide whether
 * to fall back to another bake source. No silent placeholder fallback.
 */
export async function readBadgePNG(uri: string): Promise<Buffer> {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    throw new Error(`Badge PNG not found at ${uri}`);
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return Buffer.from(base64, "base64");
}
