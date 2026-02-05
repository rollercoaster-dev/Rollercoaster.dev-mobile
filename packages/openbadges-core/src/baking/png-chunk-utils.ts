/**
 * PNG chunk manipulation utilities
 *
 * Provides functions for extracting, encoding, and creating PNG chunks,
 * specifically for embedding Open Badges credentials in iTXt chunks.
 */

import extract from "png-chunks-extract";
import encode from "png-chunks-encode";

/**
 * PNG chunk structure
 */
export interface Chunk {
  name: string;
  data: Uint8Array;
}

/**
 * Extract all chunks from a PNG buffer
 *
 * @param buffer - PNG image buffer
 * @returns Array of PNG chunks
 */
export function extractChunks(buffer: Buffer): Chunk[] {
  return extract(buffer);
}

/**
 * Encode chunks back to a PNG buffer
 *
 * @param chunks - Array of PNG chunks
 * @returns PNG image buffer
 */
export function encodeChunks(chunks: Chunk[]): Buffer {
  return Buffer.from(encode(chunks));
}

/**
 * Find an iTXt chunk by keyword
 *
 * @param chunks - Array of PNG chunks
 * @param keyword - iTXt chunk keyword to search for
 * @returns The matching chunk or null if not found
 */
export function findiTXtChunk(chunks: Chunk[], keyword: string): Chunk | null {
  for (const chunk of chunks) {
    if (chunk.name !== "iTXt") {
      continue;
    }

    // iTXt format: keyword + null byte + ...
    const keywordEndIndex = chunk.data.indexOf(0);
    if (keywordEndIndex === -1) {
      continue;
    }

    const chunkKeyword = Buffer.from(
      chunk.data.slice(0, keywordEndIndex),
    ).toString("utf-8");
    if (chunkKeyword === keyword) {
      return chunk;
    }
  }

  return null;
}

/**
 * Create an iTXt chunk with the specified keyword and text
 *
 * iTXt chunk format (uncompressed):
 * - Keyword (null-terminated)
 * - Compression flag (1 byte, 0 = uncompressed)
 * - Compression method (1 byte, 0 = deflate)
 * - Language tag (null-terminated, empty for no language)
 * - Translated keyword (null-terminated, empty for none)
 * - Text (UTF-8)
 *
 * @param keyword - The iTXt keyword (e.g., "openbadges")
 * @param text - The text content to embed
 * @returns PNG iTXt chunk
 */
export function createiTXtChunk(keyword: string, text: string): Chunk {
  const keywordBuffer = Buffer.from(keyword, "utf-8");
  const textBuffer = Buffer.from(text, "utf-8");

  // iTXt format: keyword + null + compression_flag + compression_method + null + null + text
  const data = Buffer.concat([
    keywordBuffer,
    Buffer.from([0]), // Null terminator for keyword
    Buffer.from([0]), // Compression flag (0 = uncompressed)
    Buffer.from([0]), // Compression method (0 = deflate, unused when uncompressed)
    Buffer.from([0]), // Language tag (empty, null-terminated)
    Buffer.from([0]), // Translated keyword (empty, null-terminated)
    textBuffer,
  ]);

  return {
    name: "iTXt",
    data: new Uint8Array(data),
  };
}
