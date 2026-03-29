// Type declarations for untyped vendored dependencies

declare module "png-chunks-extract" {
  interface Chunk {
    name: string;
    data: Uint8Array;
  }
  function extractChunks(buffer: Buffer | Uint8Array): Chunk[];
  export = extractChunks;
}

declare module "png-chunks-encode" {
  interface Chunk {
    name: string;
    data: Uint8Array;
  }
  function encodeChunks(chunks: Chunk[]): Uint8Array;
  export = encodeChunks;
}
