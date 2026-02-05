/**
 * PNG Baking Service
 *
 * Implements embedding (baking) and extracting (unbaking) Open Badges
 * credentials in PNG images using iTXt chunks.
 *
 * The credential data is embedded in a PNG iTXt chunk with the keyword
 * "openbadges", following the Open Badges baking specification.
 */

import type { OB2, OB3 } from "openbadges-types";
import { Logger } from "@rollercoaster-dev/rd-logger";
import { assertBufferAvailable } from "../platform.js";
import {
  extractChunks,
  encodeChunks,
  findiTXtChunk,
  createiTXtChunk,
} from "./png-chunk-utils.js";

const logger = new Logger({ level: "debug" });

/**
 * Check if a buffer is a valid PNG image
 *
 * @param buffer - The buffer to check
 * @returns True if the buffer starts with the PNG signature
 */
export function isPNG(buffer: Buffer): boolean {
  // PNG signature: 137 80 78 71 13 10 26 10
  return (
    buffer.length >= 8 &&
    buffer[0] === 137 &&
    buffer[1] === 80 &&
    buffer[2] === 78 &&
    buffer[3] === 71 &&
    buffer[4] === 13 &&
    buffer[5] === 10 &&
    buffer[6] === 26 &&
    buffer[7] === 10
  );
}

/**
 * Embed an Open Badges credential into a PNG image
 *
 * @param imageBuffer - The source PNG image as a Buffer
 * @param credential - The OB2 Assertion or OB3 VerifiableCredential to embed
 * @returns The baked PNG image as a Buffer
 * @throws Error if the image is not a valid PNG
 */
export function bakePNG(
  imageBuffer: Buffer,
  credential: OB2.Assertion | OB3.VerifiableCredential,
): Buffer {
  assertBufferAvailable("PNG baking");

  // Validate PNG signature
  if (!isPNG(imageBuffer)) {
    throw new Error("Invalid PNG image: missing PNG signature");
  }

  logger.debug("Starting PNG bake operation", {
    imageSize: imageBuffer.length,
  });

  // Extract existing chunks
  const chunks = extractChunks(imageBuffer);

  // Serialize credential to JSON
  const credentialJSON = JSON.stringify(credential);

  // Create iTXt chunk with the credential data
  const iTxtChunk = createiTXtChunk("openbadges", credentialJSON);

  // Find the IEND chunk (must be last in PNG)
  const iendIndex = chunks.findIndex((chunk) => chunk.name === "IEND");
  if (iendIndex === -1) {
    throw new Error("Invalid PNG image: missing IEND chunk");
  }

  // Remove any existing "openbadges" iTXt chunk first
  const filteredChunks = chunks.filter((chunk) => {
    if (chunk.name !== "iTXt") return true;

    // Check if this is an "openbadges" iTXt chunk
    const keywordEndIndex = chunk.data.indexOf(0);
    if (keywordEndIndex === -1) return true;

    const keyword = Buffer.from(chunk.data.slice(0, keywordEndIndex)).toString(
      "utf-8",
    );
    return keyword !== "openbadges";
  });

  // Insert new iTXt chunk before IEND
  const newIendIndex = filteredChunks.findIndex(
    (chunk) => chunk.name === "IEND",
  );
  filteredChunks.splice(newIendIndex, 0, iTxtChunk);

  // Encode chunks back to PNG buffer
  const result = encodeChunks(filteredChunks);

  logger.debug("PNG bake completed", {
    resultSize: result.length,
    credentialSize: credentialJSON.length,
  });

  return result;
}

/**
 * Extract an Open Badges credential from a baked PNG image
 *
 * @param imageBuffer - The baked PNG image as a Buffer
 * @returns The extracted credential, or null if no credential found
 * @throws Error if the image is not a valid PNG
 */
export function unbakePNG(
  imageBuffer: Buffer,
): (OB2.Assertion | OB3.VerifiableCredential) | null {
  assertBufferAvailable("PNG unbaking");

  // Validate PNG signature
  if (!isPNG(imageBuffer)) {
    throw new Error("Invalid PNG image: missing PNG signature");
  }

  logger.debug("Starting PNG unbake operation", {
    imageSize: imageBuffer.length,
  });

  // Extract chunks
  const chunks = extractChunks(imageBuffer);

  // Find the "openbadges" iTXt chunk
  const iTxtChunk = findiTXtChunk(chunks, "openbadges");

  if (!iTxtChunk) {
    return null;
  }

  // Extract the credential JSON from the iTXt chunk
  // iTXt format: keyword\0 + compression_flag (1 byte) + compression_method (1 byte) + language_tag\0 + translated_keyword\0 + text
  const data = iTxtChunk.data;

  // Find the keyword end (first null byte)
  const keywordEnd = data.indexOf(0);
  if (keywordEnd === -1) {
    throw new Error("Invalid iTXt chunk: missing keyword terminator");
  }

  // Skip keyword, compression flag, compression method, then find language tag and translated keyword terminators
  const pos = keywordEnd + 1 + 1 + 1; // After keyword null, compression flag, compression method

  // Find end of language tag
  const langTagEnd = data.indexOf(0, pos);
  if (langTagEnd === -1) {
    throw new Error("Invalid iTXt chunk: missing language tag terminator");
  }

  // Find end of translated keyword
  const translatedKeywordEnd = data.indexOf(0, langTagEnd + 1);
  if (translatedKeywordEnd === -1) {
    throw new Error(
      "Invalid iTXt chunk: missing translated keyword terminator",
    );
  }

  const textStart = translatedKeywordEnd + 1;

  if (textStart >= data.length) {
    throw new Error("Invalid iTXt chunk: missing credential data");
  }

  // Extract the credential JSON text
  const credentialJSON = Buffer.from(data.slice(textStart)).toString("utf-8");

  // Parse and return the credential
  try {
    const credential = JSON.parse(credentialJSON) as
      | OB2.Assertion
      | OB3.VerifiableCredential;

    logger.debug("PNG unbake completed", {
      credentialSize: credentialJSON.length,
    });

    return credential;
  } catch (error) {
    throw new Error(
      `Failed to parse credential JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
