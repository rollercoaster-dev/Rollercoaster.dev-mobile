import { describe, expect, it } from "bun:test";
import {
  createiTXtChunk,
  encodeChunks,
  extractChunks,
  findiTXtChunk,
  type Chunk,
} from "../../src/baking/png-chunk-utils.js";

// Minimal valid PNG file (1x1 white pixel)
const MINIMAL_PNG = Buffer.from([
  0x89,
  0x50,
  0x4e,
  0x47,
  0x0d,
  0x0a,
  0x1a,
  0x0a, // PNG signature
  0x00,
  0x00,
  0x00,
  0x0d,
  0x49,
  0x48,
  0x44,
  0x52, // IHDR chunk length and type
  0x00,
  0x00,
  0x00,
  0x01,
  0x00,
  0x00,
  0x00,
  0x01, // Width and height (1x1)
  0x08,
  0x02,
  0x00,
  0x00,
  0x00,
  0x90,
  0x77,
  0x53, // Bit depth, color type, compression, filter, interlace, CRC
  0xde,
  0x00,
  0x00,
  0x00,
  0x0c,
  0x49,
  0x44,
  0x41, // IDAT chunk length and type
  0x54,
  0x08,
  0xd7,
  0x63,
  0xf8,
  0xff,
  0xff,
  0x3f, // IDAT data
  0x00,
  0x05,
  0xfe,
  0x02,
  0xfe,
  0xdc,
  0xcc,
  0x59, // IDAT CRC
  0xe7,
  0x00,
  0x00,
  0x00,
  0x00,
  0x49,
  0x45,
  0x4e, // IEND chunk length and type
  0x44,
  0xae,
  0x42,
  0x60,
  0x82, // IEND CRC
]);

describe("PNG chunk utilities", () => {
  describe("extractChunks", () => {
    it("should extract chunks from valid PNG", () => {
      const chunks = extractChunks(MINIMAL_PNG);

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].name).toBe("IHDR");
      expect(chunks[chunks.length - 1].name).toBe("IEND");
    });

    it("should extract all standard PNG chunks", () => {
      const chunks = extractChunks(MINIMAL_PNG);
      const chunkNames = chunks.map((c) => c.name);

      expect(chunkNames).toContain("IHDR");
      expect(chunkNames).toContain("IDAT");
      expect(chunkNames).toContain("IEND");
    });
  });

  describe("encodeChunks", () => {
    it("should encode chunks back to PNG buffer", () => {
      const chunks = extractChunks(MINIMAL_PNG);
      const encoded = encodeChunks(chunks);

      expect(encoded).toBeInstanceOf(Buffer);
      expect(encoded.length).toBeGreaterThan(0);
    });

    it("should preserve PNG structure in round-trip", () => {
      const original = extractChunks(MINIMAL_PNG);
      const encoded = encodeChunks(original);
      const decoded = extractChunks(encoded);

      expect(decoded.length).toBe(original.length);
      for (let i = 0; i < original.length; i++) {
        expect(decoded[i].name).toBe(original[i].name);
        expect(Buffer.from(decoded[i].data)).toEqual(
          Buffer.from(original[i].data),
        );
      }
    });
  });

  describe("createiTXtChunk", () => {
    it("should create valid iTXt chunk structure", () => {
      const chunk = createiTXtChunk("test", "hello world");

      expect(chunk.name).toBe("iTXt");
      expect(chunk.data).toBeInstanceOf(Uint8Array);
      expect(chunk.data.length).toBeGreaterThan(0);
    });

    it("should encode keyword and text correctly", () => {
      const keyword = "openbadges";
      const text = '{"credential": "data"}';
      const chunk = createiTXtChunk(keyword, text);

      // Verify keyword is at the start
      const keywordBuffer = Buffer.from(keyword, "utf-8");
      const dataStart = Buffer.from(chunk.data.slice(0, keywordBuffer.length));
      expect(dataStart.toString("utf-8")).toBe(keyword);

      // Verify text is at the end
      const textBuffer = Buffer.from(text, "utf-8");
      const dataEnd = Buffer.from(
        chunk.data.slice(chunk.data.length - textBuffer.length),
      );
      expect(dataEnd.toString("utf-8")).toBe(text);
    });

    it("should use uncompressed format", () => {
      const chunk = createiTXtChunk("test", "data");
      const data = Buffer.from(chunk.data);

      // Find the null terminator after keyword
      const nullIndex = data.indexOf(0);
      expect(nullIndex).toBeGreaterThan(0);

      // Compression flag should be 0 (uncompressed)
      expect(data[nullIndex + 1]).toBe(0);

      // Compression method should be 0
      expect(data[nullIndex + 2]).toBe(0);
    });
  });

  describe("findiTXtChunk", () => {
    it("should find iTXt chunk by keyword", () => {
      const chunks = extractChunks(MINIMAL_PNG);
      const iTxtChunk = createiTXtChunk("openbadges", "test data");

      const chunksWithiTxt: Chunk[] = [
        ...chunks.slice(0, -1),
        iTxtChunk,
        chunks[chunks.length - 1],
      ];

      const found = findiTXtChunk(chunksWithiTxt, "openbadges");
      expect(found).not.toBeNull();
      expect(found?.name).toBe("iTXt");
    });

    it("should return null when keyword not found", () => {
      const chunks = extractChunks(MINIMAL_PNG);
      const found = findiTXtChunk(chunks, "nonexistent");

      expect(found).toBeNull();
    });

    it("should return null when no iTXt chunks exist", () => {
      const chunks = extractChunks(MINIMAL_PNG);
      const found = findiTXtChunk(chunks, "openbadges");

      expect(found).toBeNull();
    });

    it("should find correct iTXt chunk when multiple exist", () => {
      const chunks = extractChunks(MINIMAL_PNG);
      const iTxt1 = createiTXtChunk("first", "data1");
      const iTxt2 = createiTXtChunk("openbadges", "credential data");
      const iTxt3 = createiTXtChunk("third", "data3");

      const chunksWithMultipleiTxt: Chunk[] = [
        ...chunks.slice(0, -1),
        iTxt1,
        iTxt2,
        iTxt3,
        chunks[chunks.length - 1],
      ];

      const found = findiTXtChunk(chunksWithMultipleiTxt, "openbadges");
      expect(found).not.toBeNull();

      const data = Buffer.from(found!.data);
      const text = data.toString("utf-8");
      expect(text).toContain("credential data");
    });
  });

  describe("round-trip with iTXt chunks", () => {
    it("should preserve iTXt chunk through encode/decode cycle", () => {
      const chunks = extractChunks(MINIMAL_PNG);
      const originalText = '{"type": "OpenBadgeCredential"}';
      const iTxtChunk = createiTXtChunk("openbadges", originalText);

      const chunksWithiTxt: Chunk[] = [
        ...chunks.slice(0, -1),
        iTxtChunk,
        chunks[chunks.length - 1],
      ];

      const encoded = encodeChunks(chunksWithiTxt);
      const decoded = extractChunks(encoded);

      const found = findiTXtChunk(decoded, "openbadges");
      expect(found).not.toBeNull();

      const data = Buffer.from(found!.data);
      const text = data.toString("utf-8");
      expect(text).toContain(originalText);
    });
  });
});
