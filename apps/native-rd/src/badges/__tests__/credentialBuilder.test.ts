/**
 * Tests for buildUnsignedCredential and buildDid
 *
 * openbadges-core (and its dep jose) are ESM-only and cannot be loaded by Jest's
 * CJS runtime. We mock serializeOB3 to return a predictable object so we can
 * verify our data-mapping logic without re-testing the library itself.
 */
import { buildUnsignedCredential, buildDid } from "../credentialBuilder";
import type { CredentialInput } from "../credentialBuilder";

jest.mock("@rollercoaster-dev/openbadges-core", () => ({
  serializeOB3: jest.fn((assertion, badgeClass, issuer) => ({
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
    ],
    id: assertion.id,
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    issuer,
    validFrom: assertion.issuedOn,
    credentialSubject: {
      id: assertion.recipient.identity,
      type: ["AchievementSubject"],
      achievement: {
        id: badgeClass.id,
        type: ["Achievement"],
        name: badgeClass.name,
        description: badgeClass.description,
        image: badgeClass.image,
        criteria: badgeClass.criteria,
        issuer: badgeClass.issuer,
      },
    },
    evidence: assertion.evidence,
  })),
}));

const BASE_INPUT: CredentialInput = {
  goal: {
    id: "goal-01",
    title: "Learn React Native",
    description: "Build a mobile app",
  },
  evidence: [],
  issuerDid: "did:key:abc123",
  publicKeyJwk: { kty: "OKP", crv: "Ed25519", x: "abc123" },
  credentialId: "urn:uuid:cred-01",
  issuedOn: "2026-02-18T00:00:00.000Z",
};

describe("buildDid", () => {
  it("returns a string starting with did:key:", () => {
    const did = buildDid({ kty: "OKP", crv: "Ed25519", x: "somekey" });
    expect(did).toMatch(/^did:key:/);
  });

  it("uses the x value from the JWK", () => {
    const did = buildDid({ kty: "OKP", crv: "Ed25519", x: "mykey" });
    expect(did).toBe("did:key:mykey");
  });

  it("throws when x is absent", () => {
    expect(() => buildDid({ kty: "OKP", crv: "Ed25519" })).toThrow(
      "missing x coordinate",
    );
  });
});

describe("buildUnsignedCredential", () => {
  it("returns an OB3 VerifiableCredential structure", () => {
    const cred = buildUnsignedCredential(BASE_INPUT);
    const type = cred["type"] as string[];
    expect(type).toContain("VerifiableCredential");
    expect(cred["@context"]).toBeDefined();
  });

  it("maps goal title to achievement name", () => {
    const cred = buildUnsignedCredential(BASE_INPUT);
    const subject = cred["credentialSubject"] as Record<string, unknown>;
    const achievement = subject["achievement"] as Record<string, unknown>;
    expect(achievement["name"]).toBe("Learn React Native");
  });

  it("maps goal description to achievement description", () => {
    const cred = buildUnsignedCredential(BASE_INPUT);
    const subject = cred["credentialSubject"] as Record<string, unknown>;
    const achievement = subject["achievement"] as Record<string, unknown>;
    expect(achievement["description"]).toBe("Build a mobile app");
  });

  it("falls back to a default description when goal description is null", () => {
    const cred = buildUnsignedCredential({
      ...BASE_INPUT,
      goal: { ...BASE_INPUT.goal, description: null },
    });
    const subject = cred["credentialSubject"] as Record<string, unknown>;
    const achievement = subject["achievement"] as Record<string, unknown>;
    expect(achievement["description"]).toContain("Learn React Native");
  });

  it("includes the credential id", () => {
    const cred = buildUnsignedCredential(BASE_INPUT);
    expect(cred["id"]).toBe("urn:uuid:cred-01");
  });

  it("includes evidence rows when provided", () => {
    const input: CredentialInput = {
      ...BASE_INPUT,
      evidence: [
        {
          id: "ev-01",
          type: "photo",
          uri: "file:///photo.jpg",
          description: "My photo",
        },
      ],
    };
    const cred = buildUnsignedCredential(input);
    const evidence = cred["evidence"] as unknown[];
    expect(evidence).toHaveLength(1);
  });

  it("uses urn:ulid:<id> format for evidence id (not URI)", () => {
    const input: CredentialInput = {
      ...BASE_INPUT,
      evidence: [
        {
          id: "ev-01",
          type: "photo",
          uri: "file:///photo.jpg",
          description: "My photo",
        },
      ],
    };
    const cred = buildUnsignedCredential(input);
    const evidence = cred["evidence"] as Record<string, unknown>[];
    expect(evidence[0]["id"]).toBe("urn:ulid:ev-01");
  });

  it("sets genre from evidence type", () => {
    const input: CredentialInput = {
      ...BASE_INPUT,
      evidence: [
        {
          id: "ev-01",
          type: "photo",
          uri: "file:///photo.jpg",
          description: null,
        },
      ],
    };
    const cred = buildUnsignedCredential(input);
    const evidence = cred["evidence"] as Record<string, unknown>[];
    expect(evidence[0]["genre"]).toBe("photo");
  });

  it("omits genre when type is null", () => {
    const input: CredentialInput = {
      ...BASE_INPUT,
      evidence: [
        { id: "ev-01", type: null, uri: "content:empty", description: null },
      ],
    };
    const cred = buildUnsignedCredential(input);
    const evidence = cred["evidence"] as Record<string, unknown>[];
    expect(evidence[0]).not.toHaveProperty("genre");
  });

  it("includes description as a separate OB3 field when available", () => {
    const input: CredentialInput = {
      ...BASE_INPUT,
      evidence: [
        {
          id: "ev-01",
          type: "text",
          uri: "content:text;hello",
          description: "A detailed note",
        },
      ],
    };
    const cred = buildUnsignedCredential(input);
    const evidence = cred["evidence"] as Record<string, unknown>[];
    expect(evidence[0]["description"]).toBe("A detailed note");
  });

  it.each([
    {
      stepTitle: "Step 1: Code",
      description: "My photo",
      type: "photo",
      expected: "Step 1: Code",
    },
    {
      stepTitle: null,
      description: "My photo",
      type: "photo",
      expected: "My photo",
    },
    {
      stepTitle: null,
      description: null,
      type: "text",
      expected: "Learn React Native",
    },
    {
      stepTitle: null,
      description: null,
      type: null,
      expected: "Learn React Native",
    },
  ])(
    "name fallback: stepTitle=$stepTitle, desc=$description, type=$type → $expected",
    ({ stepTitle, description, type, expected }) => {
      const input: CredentialInput = {
        ...BASE_INPUT,
        evidence: [
          { id: "ev-01", type, uri: "file:///x", description, stepTitle },
        ],
      };
      const cred = buildUnsignedCredential(input);
      const evidence = cred["evidence"] as Record<string, unknown>[];
      expect(evidence[0]["name"]).toBe(expected);
    },
  );

  it("includes evidence count in criteria narrative", () => {
    const input: CredentialInput = {
      ...BASE_INPUT,
      evidence: [
        { id: "ev-01", type: "photo", uri: "file:///a.jpg", description: null },
        { id: "ev-02", type: "text", uri: "content:text;x", description: null },
        { id: "ev-03", type: "photo", uri: "file:///b.jpg", description: null },
      ],
    };
    const cred = buildUnsignedCredential(input);
    const subject = cred["credentialSubject"] as Record<string, unknown>;
    const achievement = subject["achievement"] as Record<string, unknown>;
    const criteria = achievement["criteria"] as Record<string, unknown>;
    expect(criteria["narrative"]).toContain("3 items");
  });

  it('uses singular "item" for single evidence entry', () => {
    const input: CredentialInput = {
      ...BASE_INPUT,
      evidence: [
        { id: "ev-01", type: "text", uri: "content:text;x", description: null },
      ],
    };
    const cred = buildUnsignedCredential(input);
    const subject = cred["credentialSubject"] as Record<string, unknown>;
    const achievement = subject["achievement"] as Record<string, unknown>;
    const criteria = achievement["criteria"] as Record<string, unknown>;
    expect(criteria["narrative"]).toContain("1 item");
    expect(criteria["narrative"]).not.toContain("1 items");
  });

  it("omits evidence count from narrative when evidence is empty (backwards compat)", () => {
    const cred = buildUnsignedCredential(BASE_INPUT);
    const subject = cred["credentialSubject"] as Record<string, unknown>;
    const achievement = subject["achievement"] as Record<string, unknown>;
    const criteria = achievement["criteria"] as Record<string, unknown>;
    expect(criteria["narrative"]).toBe(
      "Complete all steps for: Learn React Native",
    );
  });

  it("passes issuedOn through to the credential", () => {
    const cred = buildUnsignedCredential(BASE_INPUT);
    expect(cred["validFrom"]).toBe("2026-02-18T00:00:00.000Z");
  });
});
