/**
 * PNG Baking Service
 *
 * Vendored from @rollercoaster-dev/openbadges-core for React Native compatibility.
 * Original: packages/openbadges-core/src/baking/png-baking.ts
 *
 * Changes from upstream:
 *   - Added `import { Buffer } from 'buffer'` (RN has no global Buffer)
 *   - Removed `assertBufferAvailable()` calls (buffer polyfill handles this in RN)
 *   - Inlined BadgeVersion / detectBadgeVersion (not exported from the npm package)
 *   - Removed `.js` extensions from imports (Metro resolver doesn't need them)
 *
 * Implements embedding (baking) and extracting (unbaking) Open Badges
 * credentials in PNG images using iTXt chunks.
 *
 * - OB2 credentials: keyword "openbadges", value is JSON
 * - OB3 credentials: keyword "openbadgecredential", value is JSON or JWS
 *
 * @see https://www.imsglobal.org/spec/ob/v3p0 (Section 5.3.1.1)
 * @see https://www.imsglobal.org/sites/default/files/Badges/OBv2p0Final/baking/index.html
 */

import { Buffer } from 'buffer';
import type { OB2, OB3 } from 'openbadges-types';
import {
  extractChunks,
  encodeChunks,
  findiTXtChunk,
  createiTXtChunk,
} from './png-chunk-utils';

// --- Inlined version detection (not exported from the npm package) ---

// Using a plain object instead of const enum — Babel does not inline const enum values
const BadgeVersion = {
  V2: '2.0',
  V3: '3.0',
} as const;
type BadgeVersion = typeof BadgeVersion[keyof typeof BadgeVersion];

const OBV3_CONTEXT_URLS = [
  'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json',
  'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
];

function detectBadgeVersion(
  credential: Record<string, unknown>,
): BadgeVersion {
  const context = credential['@context'];
  if (Array.isArray(context)) {
    if (context.some((c) => typeof c === 'string' && OBV3_CONTEXT_URLS.includes(c))) {
      return BadgeVersion.V3;
    }
  } else if (typeof context === 'string' && OBV3_CONTEXT_URLS.includes(context)) {
    return BadgeVersion.V3;
  }
  return BadgeVersion.V2;
}

// --- End inlined version detection ---

/** OB2 baking keyword per OB2 baking spec */
const OB2_KEYWORD = 'openbadges';
/** OB3 baking keyword per OB3 spec Section 5.3.1.1 */
const OB3_KEYWORD = 'openbadgecredential';
/** Both keywords for unbaking (try OB3 first, then OB2) */
const BAKING_KEYWORDS = [OB3_KEYWORD, OB2_KEYWORD];

/**
 * Check if a buffer is a valid PNG image
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
 * Determine the correct baking keyword for a credential.
 */
function getBakingKeyword(
  credential: string | OB2.Assertion | OB3.VerifiableCredential,
): string {
  if (typeof credential === 'string') {
    return OB3_KEYWORD;
  }

  const version = detectBadgeVersion(
    credential as unknown as Record<string, unknown>,
  );
  return version === BadgeVersion.V2 ? OB2_KEYWORD : OB3_KEYWORD;
}

/**
 * Embed an Open Badges credential into a PNG image.
 *
 * For OB2: embeds JSON with keyword "openbadges"
 * For OB3: embeds JSON or JWS with keyword "openbadgecredential"
 *
 * @param imageBuffer - The source PNG image as a Buffer
 * @param credential - The credential to embed (OB2.Assertion, OB3.VerifiableCredential, or JWS string)
 * @returns The baked PNG image as a Buffer
 * @throws Error if the image is not a valid PNG
 */
export function bakePNG(
  imageBuffer: Buffer,
  credential: string | OB2.Assertion | OB3.VerifiableCredential,
): Buffer {
  if (!isPNG(imageBuffer)) {
    throw new Error('Invalid PNG image: missing PNG signature');
  }

  const chunks = extractChunks(imageBuffer);
  const keyword = getBakingKeyword(credential);
  const content =
    typeof credential === 'string' ? credential : JSON.stringify(credential);

  const iTxtChunk = createiTXtChunk(keyword, content);

  const iendIndex = chunks.findIndex((chunk) => chunk.name === 'IEND');
  if (iendIndex === -1) {
    throw new Error('Invalid PNG image: missing IEND chunk');
  }

  // Remove any existing baking iTXt chunks (both keywords)
  const filteredChunks = chunks.filter((chunk) => {
    if (chunk.name !== 'iTXt') return true;

    const keywordEndIndex = chunk.data.indexOf(0);
    if (keywordEndIndex === -1) return true;

    const chunkKeyword = Buffer.from(
      chunk.data.slice(0, keywordEndIndex),
    ).toString('utf-8');
    return !BAKING_KEYWORDS.includes(chunkKeyword);
  });

  // Insert new iTXt chunk before IEND
  const newIendIndex = filteredChunks.findIndex(
    (chunk) => chunk.name === 'IEND',
  );
  filteredChunks.splice(newIendIndex, 0, iTxtChunk);

  return encodeChunks(filteredChunks);
}

/**
 * Extract an Open Badges credential from a baked PNG image.
 *
 * Tries OB3 keyword ("openbadgecredential") first, then falls back
 * to OB2 keyword ("openbadges") for backward compatibility.
 *
 * @param imageBuffer - The baked PNG image as a Buffer
 * @returns The extracted credential or JWS string, or null if no credential found
 * @throws Error if the image is not a valid PNG or credential data is malformed
 */
export function unbakePNG(
  imageBuffer: Buffer,
): string | OB2.Assertion | OB3.VerifiableCredential | null {
  if (!isPNG(imageBuffer)) {
    throw new Error('Invalid PNG image: missing PNG signature');
  }

  const chunks = extractChunks(imageBuffer);

  // Try each keyword in order (OB3 first, then OB2)
  let iTxtChunk = null;
  for (const keyword of BAKING_KEYWORDS) {
    iTxtChunk = findiTXtChunk(chunks, keyword);
    if (iTxtChunk) break;
  }

  if (!iTxtChunk) {
    return null;
  }

  // Extract text from iTXt chunk
  // Format: keyword\0 + compression_flag (1 byte) + compression_method (1 byte) + language_tag\0 + translated_keyword\0 + text
  const data = iTxtChunk.data;

  const keywordEnd = data.indexOf(0);
  if (keywordEnd === -1) {
    throw new Error('Invalid iTXt chunk: missing keyword terminator');
  }

  const pos = keywordEnd + 1 + 1 + 1; // After keyword null, compression flag, compression method

  const langTagEnd = data.indexOf(0, pos);
  if (langTagEnd === -1) {
    throw new Error('Invalid iTXt chunk: missing language tag terminator');
  }

  const translatedKeywordEnd = data.indexOf(0, langTagEnd + 1);
  if (translatedKeywordEnd === -1) {
    throw new Error('Invalid iTXt chunk: missing translated keyword terminator');
  }

  const textStart = translatedKeywordEnd + 1;

  if (textStart >= data.length) {
    throw new Error('Invalid iTXt chunk: missing credential data');
  }

  const credentialText = Buffer.from(data.slice(textStart)).toString('utf-8');

  // If it looks like a JWS (three dot-separated segments), return as string
  if (
    credentialText.includes('.') &&
    credentialText.split('.').length === 3 &&
    !credentialText.startsWith('{')
  ) {
    return credentialText;
  }

  // Otherwise parse as JSON
  try {
    return JSON.parse(credentialText) as
      | OB2.Assertion
      | OB3.VerifiableCredential;
  } catch (error) {
    throw new Error(
      `Failed to parse credential JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
