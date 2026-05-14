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

/** Convert a base64 string back to a Uint8Array. Inverse of toBase64. */
function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/**
 * Read a previously-saved badge PNG back into memory.
 *
 * Used by the rebake flow: when re-completing a goal with new evidence but
 * no fresh capture from the Designer, we re-use the previous badge's visual
 * bytes and bake a new credential into them.
 *
 * @param uri - File URI returned by saveBadgePNG
 * @returns PNG bytes
 */
export async function readBadgePNG(uri: string): Promise<Uint8Array> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return fromBase64(base64);
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

  return uri;
}
