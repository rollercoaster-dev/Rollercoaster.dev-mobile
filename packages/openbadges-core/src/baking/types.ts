/**
 * Baking Service Types
 *
 * Type definitions for the badge baking service that embeds
 * Open Badges credential data into PNG and SVG images.
 *
 * Baking allows badges to be "self-contained" - the image file
 * itself contains all the credential information needed for
 * verification, making badges portable and shareable.
 */

import type { OB2, OB3 } from "openbadges-types";

/**
 * Supported image formats for badge baking
 *
 * - png: Embeds credential as iTXt chunk with keyword 'openbadges'
 * - svg: Embeds credential in metadata or assertion element
 */
export type ImageFormat = "png" | "svg";

/**
 * Options for baking a badge credential into an image
 */
export interface BakeOptions {
  /**
   * The target image format for baking
   * Determines the embedding strategy used
   */
  format: ImageFormat;

  /**
   * Whether to compress the embedded credential data
   * Only applicable to PNG format (uses zlib compression)
   * @default false
   */
  compress?: boolean;

  /**
   * Whether to validate the credential before baking
   * When true, the service will verify the credential structure
   * @default true
   */
  validateCredential?: boolean;

  /**
   * Whether to preserve existing embedded credentials
   * When true, throws an error if credential data already exists
   * When false, any existing baked data will be replaced
   * @default false
   */
  preserveExisting?: boolean;
}

/**
 * Result of a successful bake operation
 */
export interface BakedImage {
  /**
   * The image data with embedded credential as a Buffer
   */
  data: Buffer;

  /**
   * The MIME type of the baked image
   * Either 'image/png' or 'image/svg+xml'
   */
  mimeType: "image/png" | "image/svg+xml";

  /**
   * The format of the baked image
   */
  format: ImageFormat;

  /**
   * Size of the baked image in bytes
   */
  size: number;

  /**
   * Whether the credential data was compressed
   */
  compressed: boolean;
}

/**
 * Result of extracting (unbaking) credential data from an image
 */
export interface UnbakeResult {
  /**
   * Whether credential data was found in the image
   */
  found: boolean;

  /**
   * The extracted credential data (if found)
   * Can be either OB 2.0 Assertion or OB 3.0 Verifiable Credential
   */
  credential?: OB2.Assertion | OB3.VerifiableCredential;

  /**
   * The raw credential data as a string (if found)
   * Useful for debugging or custom parsing
   */
  rawData?: string;

  /**
   * The format of the source image
   */
  sourceFormat: ImageFormat;
}

/**
 * Baking service interface
 *
 * Defines the contract for embedding and extracting Open Badges
 * credential data from image files.
 */
export interface BakingService {
  /**
   * Embed a credential into an image (baking)
   */
  bake(
    imageData: Buffer,
    credential: OB2.Assertion | OB3.VerifiableCredential,
    options?: Partial<BakeOptions>,
  ): Promise<BakedImage>;

  /**
   * Extract a credential from a baked image (unbaking)
   */
  unbake(imageData: Buffer): Promise<UnbakeResult>;

  /**
   * Detect the format of an image
   */
  detectFormat(imageData: Buffer): ImageFormat | null;

  /**
   * Check if an image contains baked credential data
   */
  isBaked(imageData: Buffer): Promise<boolean>;
}
