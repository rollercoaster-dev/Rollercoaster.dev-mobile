/**
 * Badge Image Generator
 *
 * Generates a 64×64 solid-color RGB PNG from a hex color string.
 *
 * Uses raw PNG construction with a zlib "stored" (uncompressed) IDAT block —
 * no compression library required. This avoids any native module dependency
 * and keeps the generated PNG fully deterministic.
 *
 * PNG structure: signature + IHDR + IDAT + IEND
 * IDAT payload: zlib header (2 bytes) + DEFLATE stored block + Adler-32 (4 bytes)
 * DEFLATE stored block: BFINAL=1, BTYPE=00 (no compression)
 *   + LEN (LE16) + NLEN (LE16) + raw pixel data
 *
 * Each image row: 0x00 filter byte + R,G,B repeated 64 times.
 */

import { Buffer } from 'buffer';
import { encodeChunks } from './png-chunk-utils';

const WIDTH = 64;
const HEIGHT = 64;

/** Default accent blue used as fallback when no goal color is provided */
export const DEFAULT_BADGE_COLOR = '#4B7BE5';

/**
 * Parse a 6-digit hex color string (e.g. "#FF5733") into RGB byte values.
 * Falls back to DEFAULT_BADGE_COLOR if the input is invalid.
 */
function parseHexColor(hex: string): [number, number, number] {
  const clean = hex.startsWith('#') ? hex.slice(1) : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    console.warn(`[badgeImageGenerator] Invalid hex color "${hex}", falling back to ${DEFAULT_BADGE_COLOR}`);
    return [0x4b, 0x7b, 0xe5]; // DEFAULT_BADGE_COLOR hardcoded to avoid recursion
  }
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

/**
 * Compute Adler-32 checksum of a Buffer.
 * Used as the trailing integrity check for the zlib stream.
 */
function adler32(data: Buffer): number {
  const MOD = 65521;
  let s1 = 1;
  let s2 = 0;
  for (let i = 0; i < data.length; i++) {
    s1 = (s1 + data[i]) % MOD;
    s2 = (s2 + s1) % MOD;
  }
  // >>> 0 converts the signed 32-bit bitwise result to an unsigned 32-bit number
  return ((s2 << 16) | s1) >>> 0;
}

/**
 * Generate a 64×64 solid-color PNG from a hex color string.
 *
 * @deprecated Use `captureBadge()` from `./captureBadge` for high-res designer badge export.
 * This function remains as a fallback for callers that don't have a mounted BadgeRenderer.
 *
 * @param hexColor - Hex color string (e.g. "#FF5733"). Falls back to DEFAULT_BADGE_COLOR if invalid.
 * @returns PNG image as Uint8Array
 */
export function generateBadgeImagePNG(hexColor: string): Uint8Array {
  const [r, g, b] = parseHexColor(hexColor);

  // --- Build IHDR data (13 bytes) ---
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(WIDTH, 0);
  ihdrData.writeUInt32BE(HEIGHT, 4);
  ihdrData[8] = 8;  // bit depth: 8 bits per channel
  ihdrData[9] = 2;  // color type: 2 = RGB (truecolor, no alpha)
  ihdrData[10] = 0; // compression method: 0 (deflate)
  ihdrData[11] = 0; // filter method: 0 (adaptive)
  ihdrData[12] = 0; // interlace method: 0 (none)

  // --- Build raw pixel data ---
  // Each row: 1-byte filter (0x00 = None) + WIDTH * 3 bytes of R,G,B
  const rowSize = 1 + WIDTH * 3; // 193 bytes
  const pixelData = Buffer.alloc(HEIGHT * rowSize);

  for (let row = 0; row < HEIGHT; row++) {
    const rowOffset = row * rowSize;
    pixelData[rowOffset] = 0x00; // filter type: None
    for (let col = 0; col < WIDTH; col++) {
      const pixelOffset = rowOffset + 1 + col * 3;
      pixelData[pixelOffset] = r;
      pixelData[pixelOffset + 1] = g;
      pixelData[pixelOffset + 2] = b;
    }
  }

  // --- Build zlib stream wrapping the pixel data ---
  // Format: CMF (1) + FLG (1) + DEFLATE stored block + Adler-32 (4)
  //
  // CMF = 0x78: CM=8 (deflate), CINFO=7 (window size = 32K)
  // FLG = 0x01: no dict, FCHECK=1 (makes 0x7801 divisible by 31 ✓)
  //
  // DEFLATE stored block:
  //   BFINAL=1, BTYPE=00 → first byte = 0x01
  //   LEN  = data length, little-endian 16-bit
  //   NLEN = one's complement of LEN, little-endian 16-bit
  //   DATA = raw pixel bytes

  const dataLen = pixelData.length;
  const nlen = (~dataLen) & 0xffff;
  const checksum = adler32(pixelData);

  // 2 (zlib header) + 1 (BFINAL/BTYPE) + 2 (LEN) + 2 (NLEN) + dataLen + 4 (Adler-32)
  const idatData = Buffer.alloc(2 + 1 + 2 + 2 + dataLen + 4);
  let pos = 0;

  idatData[pos++] = 0x78; // CMF
  idatData[pos++] = 0x01; // FLG
  idatData[pos++] = 0x01; // BFINAL=1, BTYPE=00 (stored)
  idatData[pos++] = dataLen & 0xff;       // LEN low
  idatData[pos++] = (dataLen >> 8) & 0xff; // LEN high
  idatData[pos++] = nlen & 0xff;          // NLEN low
  idatData[pos++] = (nlen >> 8) & 0xff;  // NLEN high
  pixelData.copy(idatData, pos);
  pos += dataLen;
  idatData.writeUInt32BE(checksum, pos);

  // --- Assemble PNG via encodeChunks (handles CRC32 automatically) ---
  const chunks = [
    { name: 'IHDR', data: new Uint8Array(ihdrData) },
    { name: 'IDAT', data: new Uint8Array(idatData) },
    { name: 'IEND', data: new Uint8Array(0) },
  ];

  return new Uint8Array(encodeChunks(chunks));
}
