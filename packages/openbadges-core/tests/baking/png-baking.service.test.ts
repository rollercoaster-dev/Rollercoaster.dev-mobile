import { describe, it, expect } from "bun:test";
import {
  bakePNG,
  unbakePNG,
  isPNG,
} from "../../src/baking/png-baking.service.js";
import type { OB2, OB3 } from "openbadges-types";
import { createIRI, createDateTime } from "openbadges-types";

/**
 * Create a minimal valid PNG image buffer (1x1 transparent pixel)
 */
function createMinimalPNG(): Buffer {
  return Buffer.from([
    137,
    80,
    78,
    71,
    13,
    10,
    26,
    10, // PNG signature
    0,
    0,
    0,
    13,
    73,
    72,
    68,
    82, // IHDR chunk header
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    1,
    8,
    6,
    0,
    0,
    0, // IHDR data
    31,
    21,
    196,
    137, // IHDR CRC
    0,
    0,
    0,
    13,
    73,
    68,
    65,
    84, // IDAT chunk header
    120,
    218,
    99,
    100,
    248,
    207,
    80,
    15,
    0,
    3,
    134,
    1,
    128, // IDAT data
    90,
    52,
    125,
    107, // IDAT CRC
    0,
    0,
    0,
    0,
    73,
    69,
    78,
    68,
    174,
    66,
    96,
    130, // IEND chunk
  ]);
}

function createMockOB2Assertion(): OB2.Assertion {
  return {
    "@context": "https://w3id.org/openbadges/v2",
    type: "Assertion",
    id: createIRI("https://example.org/assertions/123"),
    recipient: {
      type: "email",
      identity: "test@example.org",
      hashed: false,
    },
    badge: createIRI("https://example.org/badges/test-badge"),
    issuedOn: createDateTime("2024-01-01T00:00:00Z"),
    verification: {
      type: "hosted",
    },
  };
}

function createMockOB3Credential(): OB3.VerifiableCredential {
  return {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
    ],
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    id: createIRI("https://example.org/credentials/123"),
    issuer: {
      id: createIRI("https://example.org/issuers/1"),
      type: ["Profile"],
      name: "Test Issuer",
      url: createIRI("https://example.org/issuers/1"),
    },
    validFrom: createDateTime("2024-01-01T00:00:00Z"),
    credentialSubject: {
      id: createIRI("did:example:recipient123"),
      type: ["AchievementSubject"],
      achievement: {
        id: createIRI("https://example.org/achievements/1"),
        type: ["Achievement"],
        name: "Test Achievement",
        description: "A test achievement for unit testing",
        criteria: {
          narrative: "Complete the test",
        },
      },
    },
  };
}

describe("PNG Baking Service", () => {
  describe("isPNG", () => {
    it("should return true for valid PNG", () => {
      expect(isPNG(createMinimalPNG())).toBe(true);
    });

    it("should return false for non-PNG data", () => {
      expect(isPNG(Buffer.from([1, 2, 3, 4]))).toBe(false);
    });

    it("should return false for buffer shorter than 8 bytes", () => {
      expect(isPNG(Buffer.from([137, 80, 78]))).toBe(false);
    });
  });

  describe("bakePNG", () => {
    it("should embed credential into PNG image", () => {
      const png = createMinimalPNG();
      const credential = createMockOB2Assertion();

      const bakedPNG = bakePNG(png, credential);

      expect(bakedPNG).toBeInstanceOf(Buffer);
      expect(bakedPNG.length).toBeGreaterThan(png.length);
    });

    it("should throw error for invalid PNG (missing signature)", () => {
      const invalidPNG = Buffer.from([1, 2, 3, 4]);
      const credential = createMockOB2Assertion();

      expect(() => bakePNG(invalidPNG, credential)).toThrow(
        "Invalid PNG image: missing PNG signature",
      );
    });

    it("should replace existing baked credential", () => {
      const png = createMinimalPNG();
      const credential1 = createMockOB2Assertion();
      const credential2: OB2.Assertion = {
        ...credential1,
        id: createIRI("https://example.org/assertions/456"),
      };

      const bakedPNG1 = bakePNG(png, credential1);
      const bakedPNG2 = bakePNG(bakedPNG1, credential2);

      const extracted = unbakePNG(bakedPNG2);
      expect(extracted).not.toBeNull();
      expect((extracted as OB2.Assertion)?.id).toBe(
        createIRI("https://example.org/assertions/456"),
      );
    });
  });

  describe("unbakePNG", () => {
    it("should extract credential from baked PNG", () => {
      const png = createMinimalPNG();
      const credential = createMockOB2Assertion();

      const bakedPNG = bakePNG(png, credential);
      const extracted = unbakePNG(bakedPNG);

      expect(extracted).not.toBeNull();
      expect(extracted?.id).toBe(credential.id);
    });

    it("should return null for unbaked PNG", () => {
      const png = createMinimalPNG();
      const extracted = unbakePNG(png);
      expect(extracted).toBeNull();
    });

    it("should throw error for invalid PNG", () => {
      const invalidPNG = Buffer.from([1, 2, 3, 4]);
      expect(() => unbakePNG(invalidPNG)).toThrow(
        "Invalid PNG image: missing PNG signature",
      );
    });
  });

  describe("round-trip baking and unbaking", () => {
    it("should preserve OB2 credential data through bake/unbake cycle", () => {
      const png = createMinimalPNG();
      const credential = createMockOB2Assertion();

      const bakedPNG = bakePNG(png, credential);
      const extracted = unbakePNG(bakedPNG);

      expect(extracted).toEqual(credential);
    });

    it("should preserve OB3 credential through bake/unbake cycle", () => {
      const png = createMinimalPNG();
      const credential = createMockOB3Credential();

      const bakedPNG = bakePNG(png, credential);
      const extracted = unbakePNG(bakedPNG);

      expect(extracted).toEqual(credential);
    });

    it("should handle complex credential with nested objects", () => {
      const png = createMinimalPNG();
      const credential: OB2.Assertion = {
        ...createMockOB2Assertion(),
        evidence: [
          {
            id: createIRI("https://example.org/evidence/1"),
            name: "Test Evidence",
            description: "Evidence description",
          },
        ],
      };

      const bakedPNG = bakePNG(png, credential);
      const extracted = unbakePNG(bakedPNG);

      expect(extracted).toEqual(credential);
    });
  });

  describe("error handling", () => {
    it("should throw for PNG missing IEND chunk", () => {
      // PNG signature + IHDR only, no IEND
      const truncatedPNG = Buffer.from([
        137,
        80,
        78,
        71,
        13,
        10,
        26,
        10, // PNG signature
        0,
        0,
        0,
        13,
        73,
        72,
        68,
        82, // IHDR chunk header
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        1,
        8,
        6,
        0,
        0,
        0, // IHDR data
        31,
        21,
        196,
        137, // IHDR CRC
      ]);
      const credential = createMockOB2Assertion();

      expect(() => bakePNG(truncatedPNG, credential)).toThrow(/IEND/i);
    });

    it("should return false for isPNG with empty buffer", () => {
      expect(isPNG(Buffer.alloc(0))).toBe(false);
    });

    it("should return false for isPNG with JPEG data", () => {
      // JPEG magic bytes
      expect(isPNG(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]))).toBe(
        false,
      );
    });

    it("should handle bake/unbake with large credential", () => {
      const png = createMinimalPNG();
      const credential = createMockOB3Credential();
      // Add large evidence array
      (credential as Record<string, unknown>).evidence = Array.from(
        { length: 100 },
        (_, i) => ({
          id: createIRI(`https://example.org/evidence/${i}`),
          type: ["Evidence"],
          name: `Evidence item ${i}`,
          description: "A".repeat(200),
        }),
      );

      const baked = bakePNG(png, credential);
      const extracted = unbakePNG(baked);
      expect(extracted).toEqual(credential);
    });
  });
});
