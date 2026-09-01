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
  // did:key encoding is NOT mocked — it's pure, dependency-free, and the DID
  // shape is exactly what this issue changed, so assert against the real thing.

  encodeP256DidKey:
    require("../../../../../packages/openbadges-core/src/crypto/did-key")
      .encodeP256DidKey,
  serializeOB3: jest.fn((assertion, badgeClass, issuer) => ({
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
    ],
    id: assertion.id,
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    name: badgeClass.name,
    issuer,
    validFrom: assertion.issuedOn,
    issuanceDate: assertion.issuedOn,
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
        creator: issuer,
      },
    },
    evidence: assertion.evidence,
  })),
}));

/**
 * The W3C did:key spec's own P-256 example, and the DID it encodes to.
 * Using the spec pair here keeps the assertion a known answer rather than a
 * restatement of whatever `encodeP256DidKey` happens to produce.
 */
const P256_JWK: JsonWebKey = {
  kty: "EC",
  crv: "P-256",
  x: "fyNYMN0976ci7xqiSdag3buk-ZCwgXU4kz9XNkBlNUI",
  y: "hW2ojTNfH7Jbi8--CJUo3OCbH3y5n91g-IMA9MLMbTU",
};
const P256_DID = "did:key:zDnaerDaTF5BXEavCrfRZEk316dpbLsfPDZ3WJ5hRTPFU2169";

const BASE_INPUT: CredentialInput = {
  goal: {
    id: "goal-01",
    title: "Learn React Native",
    description: "Build a mobile app",
  },
  evidence: [],
  issuerDid: P256_DID,
  publicKeyJwk: P256_JWK,
  credentialId: "urn:uuid:cred-01",
  issuedOn: "2026-02-18T00:00:00.000Z",
  narrative: "Complete all steps for: Learn React Native",
};

describe("buildDid", () => {
  it("encodes a P-256 JWK as a multibase did:key", () => {
    expect(buildDid(P256_JWK)).toBe(P256_DID);
  });

  it("throws for a non-P-256 key (a pre-migration Ed25519 key)", () => {
    expect(() => buildDid({ kty: "OKP", crv: "Ed25519", x: "abc" })).toThrow(
      "Expected a P-256 EC public key JWK",
    );
  });

  it("throws when the y coordinate is absent", () => {
    expect(() => buildDid({ kty: "EC", crv: "P-256", x: P256_JWK.x })).toThrow(
      "missing x or y coordinate",
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

  it("gives the achievement a urn:ulid: IRI, not a path under the issuer DID", () => {
    const cred = buildUnsignedCredential(BASE_INPUT);
    const subject = cred["credentialSubject"] as Record<string, unknown>;
    const achievement = subject["achievement"] as Record<string, unknown>;
    // gap 7: did:key DIDs have no path component, so the old
    // `${issuerDid}/achievements/${goalId}` form was an invalid DID URL.
    expect(achievement["id"]).toBe("urn:ulid:goal-01");
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

  // The narrative is composed + localized by the caller (useCreateBadge) and
  // passed in as a plain string; this module is i18n-free and only forwards it
  // verbatim into criteria.narrative. Plural/evidence-count/locale behavior is
  // covered in useCreateBadge.test.ts where the composition actually lives.
  it("forwards the caller-provided narrative into criteria.narrative verbatim", () => {
    const input: CredentialInput = {
      ...BASE_INPUT,
      narrative: "Schließe alle Schritte ab für: React lernen. Nachweise: 3.",
    };
    const cred = buildUnsignedCredential(input);
    const subject = cred["credentialSubject"] as Record<string, unknown>;
    const achievement = subject["achievement"] as Record<string, unknown>;
    const criteria = achievement["criteria"] as Record<string, unknown>;
    expect(criteria["narrative"]).toBe(
      "Schließe alle Schritte ab für: React lernen. Nachweise: 3.",
    );
  });

  it("passes issuedOn through to the credential", () => {
    const cred = buildUnsignedCredential(BASE_INPUT);
    expect(cred["validFrom"]).toBe("2026-02-18T00:00:00.000Z");
  });
});
