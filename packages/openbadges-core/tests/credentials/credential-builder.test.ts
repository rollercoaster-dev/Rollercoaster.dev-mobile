import { describe, expect, it } from "bun:test";
import {
  buildCredential,
  serializeOB3,
} from "../../src/credentials/credential-builder";
import { OpenBadges3Serializer } from "../../src/credentials/serializer";
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
  VerifiableCredentialData,
} from "../../src/credentials/types";

const mockIssuer: IssuerData = {
  id: "https://example.edu/issuer/1" as Shared.IRI,
  name: "Example University",
  url: "https://example.edu" as Shared.IRI,
};

const mockBadgeClass: BadgeClassData = {
  id: "https://example.edu/badges/123" as Shared.IRI,
  name: "Web Development",
  description: "Web dev basics",
  image: "https://example.edu/badges/123/image.png" as Shared.IRI,
  criteria: { narrative: "Complete course" },
  issuer: mockIssuer.id as Shared.IRI,
};

const mockAssertion: AssertionData = {
  id: "https://example.edu/assertions/456" as Shared.IRI,
  badgeClass: mockBadgeClass.id as Shared.IRI,
  recipient: { type: "email", identity: "student@example.edu", hashed: false },
  issuedOn: "2024-01-15T10:00:00Z",
};

describe("buildCredential", () => {
  it("should build OB3 credential by default", () => {
    const result = buildCredential({
      assertion: mockAssertion,
      badgeClass: mockBadgeClass,
      issuer: mockIssuer,
    });
    expect(result.type).toEqual([
      "VerifiableCredential",
      "OpenBadgeCredential",
    ]);
  });

  it("should build OB2 credential when specified", () => {
    const result = buildCredential({
      assertion: mockAssertion,
      badgeClass: mockBadgeClass,
      issuer: mockIssuer,
      version: BadgeVersion.V2,
    });
    expect(result.type).toBe("Assertion");
    expect(result["@context"]).toBe("https://w3id.org/openbadges/v2");
  });

  it("should have correct @context ordering for OB3", () => {
    const result = buildCredential({
      assertion: mockAssertion,
      badgeClass: mockBadgeClass,
      issuer: mockIssuer,
    });
    const context = result["@context"] as string[];
    expect(context[0]).toBe(VC_V2_CONTEXT_URL);
  });
});

describe("serializeOB3", () => {
  it("should create valid VerifiableCredential", () => {
    const result = serializeOB3(mockAssertion, mockBadgeClass, mockIssuer);
    expect(result.type).toEqual([
      "VerifiableCredential",
      "OpenBadgeCredential",
    ]);
    expect(result.validFrom).toBe("2024-01-15T10:00:00Z");
    expect(result.credentialSubject.type).toEqual(["AchievementSubject"]);
  });
});

describe("OB3 serializer error handling", () => {
  const serializer = new OpenBadges3Serializer();

  it("should throw when badgeClass is missing", () => {
    expect(() =>
      serializer.serializeAssertion(mockAssertion, undefined, mockIssuer),
    ).toThrow("OB3 VerifiableCredential requires both badgeClass and issuer");
  });

  it("should throw when issuer is missing", () => {
    expect(() =>
      serializer.serializeAssertion(mockAssertion, mockBadgeClass, undefined),
    ).toThrow("OB3 VerifiableCredential requires both badgeClass and issuer");
  });

  it("should include proof only when required verification fields are present", () => {
    const assertionWithVerification: AssertionData = {
      ...mockAssertion,
      verification: {
        type: "Ed25519Signature2020",
        creator: "https://example.edu/keys/1",
        signatureValue: "abc123",
        created: "2024-01-15T10:00:00Z",
      },
    };
    const result = serializer.serializeAssertion(
      assertionWithVerification,
      mockBadgeClass,
      mockIssuer,
    ) as VerifiableCredentialData;
    expect(result.proof).toBeDefined();
    expect(result.proof!.type).toBe("Ed25519Signature2020");
    expect(result.proof!.proofValue).toBe("abc123");
  });

  it("should skip proof when verification fields are incomplete", () => {
    const assertionWithPartialVerification: AssertionData = {
      ...mockAssertion,
      verification: {
        type: "Ed25519Signature2020",
        // missing creator and signatureValue
      },
    };
    const result = serializer.serializeAssertion(
      assertionWithPartialVerification,
      mockBadgeClass,
      mockIssuer,
    ) as VerifiableCredentialData;
    expect(result.proof).toBeUndefined();
  });
});

describe("credential building edge cases", () => {
  it("should include evidence in OB3 credential", () => {
    const assertionWithEvidence: AssertionData = {
      ...mockAssertion,
      evidence: [
        {
          id: "https://example.edu/evidence/1",
          type: ["Evidence"],
          name: "Project submission",
          description: "Student's final project",
        },
      ],
    };
    const result = serializeOB3(
      assertionWithEvidence,
      mockBadgeClass,
      mockIssuer,
    );
    expect(result.evidence).toBeDefined();
    expect(result.evidence).toHaveLength(1);
    expect((result.evidence as Array<{ name: string }>)[0]!.name).toBe(
      "Project submission",
    );
  });

  it("should include achievementType when provided", () => {
    const badgeWithType: BadgeClassData = {
      ...mockBadgeClass,
      achievementType: "Competency",
    };
    const result = serializeOB3(mockAssertion, badgeWithType, mockIssuer);
    expect(result.credentialSubject.achievement.achievementType).toBe(
      "Competency",
    );
  });

  it("should map issuedOn to validFrom in OB3", () => {
    const result = serializeOB3(mockAssertion, mockBadgeClass, mockIssuer);
    expect(result.validFrom).toBe(mockAssertion.issuedOn);
  });

  it("should map expires to validUntil in OB3", () => {
    const assertionWithExpiry: AssertionData = {
      ...mockAssertion,
      expires: "2025-01-15T10:00:00Z",
    };
    const result = serializeOB3(
      assertionWithExpiry,
      mockBadgeClass,
      mockIssuer,
    );
    expect(result.validUntil).toBe("2025-01-15T10:00:00Z");
  });

  it("should have OB3 @context with VC 2.0 first and OB3 second", () => {
    const result = serializeOB3(mockAssertion, mockBadgeClass, mockIssuer);
    const context = result["@context"] as string[];
    expect(context).toHaveLength(2);
    expect(context[0]).toBe(VC_V2_CONTEXT_URL);
    expect(context[1]).toBe(OBV3_CONTEXT_URL);
  });

  it("should set credentialSubject.id from recipient identity", () => {
    const result = serializeOB3(mockAssertion, mockBadgeClass, mockIssuer);
    expect(result.credentialSubject.id).toBe("student@example.edu");
  });

  it("should include issuer details in OB3 credential", () => {
    const issuerWithDetails: IssuerData = {
      ...mockIssuer,
      email: "admin@example.edu",
      description: "A leading university",
    };
    const result = serializeOB3(
      mockAssertion,
      mockBadgeClass,
      issuerWithDetails,
    );
    const issuer = result.issuer as Record<string, unknown>;
    expect(issuer.email).toBe("admin@example.edu");
    expect(issuer.description).toBe("A leading university");
    expect((issuer.type as string[])[0]).toBe("Profile");
  });
});
