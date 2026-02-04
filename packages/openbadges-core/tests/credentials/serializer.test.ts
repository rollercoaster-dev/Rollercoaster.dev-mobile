import { describe, expect, it } from "bun:test";
import {
  OpenBadges2Serializer,
  OpenBadges3Serializer,
  createSerializer,
} from "../../src/credentials/serializer";
import {
  BadgeVersion,
  VC_V2_CONTEXT_URL,
  OBV3_CONTEXT_URL,
} from "../../src/credentials/version";
import type { Shared } from "openbadges-types";
import type {
  IssuerData,
  BadgeClassData,
  AssertionData,
} from "../../src/credentials/types";

const mockIssuer: IssuerData = {
  id: "https://example.edu/issuer/1" as Shared.IRI,
  name: "Example University",
  url: "https://example.edu" as Shared.IRI,
  email: "badges@example.edu",
};

const mockBadgeClass: BadgeClassData = {
  id: "https://example.edu/badges/123" as Shared.IRI,
  name: "Web Development Fundamentals",
  description: "Demonstrates competency in web development basics",
  image: "https://example.edu/badges/123/image.png" as Shared.IRI,
  criteria: {
    narrative: "Complete the web development course with 80% or higher",
  },
  issuer: mockIssuer.id as Shared.IRI,
};

const mockAssertion: AssertionData = {
  id: "https://example.edu/assertions/456" as Shared.IRI,
  badgeClass: mockBadgeClass.id as Shared.IRI,
  recipient: {
    type: "email",
    identity: "student@example.edu",
    hashed: false,
  },
  issuedOn: "2024-01-15T10:00:00Z",
  expires: "2025-01-15T10:00:00Z",
};

describe("OpenBadges3Serializer", () => {
  const serializer = new OpenBadges3Serializer();

  describe("@context ordering (CRITICAL)", () => {
    it("should have VC 2.0 context as first item in VerifiableCredential", () => {
      const result = serializer.serializeAssertion(
        mockAssertion,
        mockBadgeClass,
        mockIssuer,
      );
      const context = result["@context"] as string[];
      expect(context[0]).toBe(VC_V2_CONTEXT_URL);
    });

    it("should have OB3 context as second item", () => {
      const result = serializer.serializeAssertion(
        mockAssertion,
        mockBadgeClass,
        mockIssuer,
      );
      const context = result["@context"] as string[];
      expect(context[1]).toBe(OBV3_CONTEXT_URL);
    });

    it("should have exactly two context URLs", () => {
      const result = serializer.serializeAssertion(
        mockAssertion,
        mockBadgeClass,
        mockIssuer,
      );
      const context = result["@context"] as string[];
      expect(context.length).toBe(2);
    });
  });

  describe("serializeIssuer", () => {
    it("should serialize issuer with OB3 context", () => {
      const result = serializer.serializeIssuer(mockIssuer);
      expect(Array.isArray(result["@context"])).toBe(true);
      expect(result["@context"] as string[]).toContain(VC_V2_CONTEXT_URL);
      expect(result.type).toEqual(["Profile"]);
      expect(result.name).toBe("Example University");
    });
  });

  describe("serializeBadgeClass", () => {
    it("should serialize as Achievement type", () => {
      const result = serializer.serializeBadgeClass(mockBadgeClass);
      expect(result.type).toEqual(["Achievement"]);
    });

    it("should map alignment to alignments", () => {
      const badgeWithAlignment = {
        ...mockBadgeClass,
        alignment: [{ targetName: "Standard 1" }],
      };
      const result = serializer.serializeBadgeClass(badgeWithAlignment);
      expect(result["alignments"]).toEqual([{ targetName: "Standard 1" }]);
    });
  });

  describe("serializeAssertion", () => {
    it("should create VerifiableCredential when all components provided", () => {
      const result = serializer.serializeAssertion(
        mockAssertion,
        mockBadgeClass,
        mockIssuer,
      );
      expect(result.type).toEqual([
        "VerifiableCredential",
        "OpenBadgeCredential",
      ]);
      expect(result["validFrom"]).toBe("2024-01-15T10:00:00Z");
      expect(result["validUntil"]).toBe("2025-01-15T10:00:00Z");
    });

    it("should throw when badgeClass and issuer are missing", () => {
      expect(() => serializer.serializeAssertion(mockAssertion)).toThrow(
        "OB3 VerifiableCredential requires both badgeClass and issuer",
      );
    });

    it("should include credentialSubject with AchievementSubject", () => {
      const result = serializer.serializeAssertion(
        mockAssertion,
        mockBadgeClass,
        mockIssuer,
      );
      const subject = result["credentialSubject"] as Record<string, unknown>;
      expect(subject.type).toEqual(["AchievementSubject"]);
      expect(subject.id).toBe("student@example.edu");
    });
  });

  it("should return V3 from getVersion()", () => {
    expect(serializer.getVersion()).toBe(BadgeVersion.V3);
  });
});

describe("OpenBadges2Serializer", () => {
  const serializer = new OpenBadges2Serializer();

  it("should use OB2 string context", () => {
    const result = serializer.serializeIssuer(mockIssuer);
    expect(result["@context"]).toBe("https://w3id.org/openbadges/v2");
  });

  it("should serialize issuer with Issuer type", () => {
    const result = serializer.serializeIssuer(mockIssuer);
    expect(result.type).toBe("Issuer");
  });

  it("should serialize badge class with BadgeClass type", () => {
    const result = serializer.serializeBadgeClass(mockBadgeClass);
    expect(result.type).toBe("BadgeClass");
  });

  it("should serialize assertion with Assertion type", () => {
    const result = serializer.serializeAssertion(mockAssertion);
    expect(result.type).toBe("Assertion");
    expect(result["issuedOn"]).toBe("2024-01-15T10:00:00Z");
  });

  it("should return V2 from getVersion()", () => {
    expect(serializer.getVersion()).toBe(BadgeVersion.V2);
  });
});

describe("createSerializer", () => {
  it("should create OB2 serializer", () => {
    const serializer = createSerializer(BadgeVersion.V2);
    expect(serializer.getVersion()).toBe(BadgeVersion.V2);
  });

  it("should create OB3 serializer", () => {
    const serializer = createSerializer(BadgeVersion.V3);
    expect(serializer.getVersion()).toBe(BadgeVersion.V3);
  });

  it("should throw for unsupported version", () => {
    expect(() => createSerializer("1.0" as BadgeVersion)).toThrow(
      "Unsupported badge version",
    );
  });
});
