/**
 * Type declarations for png-chunks-extract and png-chunks-encode
 *
 * These modules handle PNG chunk extraction and encoding for badge baking.
 */

declare module "png-chunks-extract" {
  interface PNGChunk {
    name: string;
    data: Uint8Array;
  }

  /**
   * Extract all chunks from a PNG buffer
   */
  function extract(buffer: Buffer | Uint8Array): PNGChunk[];
  export = extract;
}

declare module "png-chunks-encode" {
  interface PNGChunk {
    name: string;
    data: Uint8Array;
  }

  /**
   * Encode chunks into a PNG buffer
   */
  function encode(chunks: PNGChunk[]): Uint8Array;
  export = encode;
}
