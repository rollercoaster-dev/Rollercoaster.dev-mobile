import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  InMemoryKeyProvider,
  buildCredential,
  serializeOB3,
  createDataIntegrityProof,
  verifyDataIntegrityProof,
  bakePNG,
  unbakePNG,
  configure,
  getPlatformConfig,
  resetPlatformConfig,
  NodeCryptoAdapter,
  KeyType,
} from "../../src/index.js";
import {
  BadgeVersion,
  VC_V2_CONTEXT_URL,
  OBV3_CONTEXT_URL,
} from "../../src/credentials/version.js";
import type { Shared } from "openbadges-types";
import type {
  IssuerData,
  BadgeClassData,
  AssertionData,
} from "../../src/credentials/types.js";
import type { OB2, OB3 } from "openbadges-types";

// Shared test fixtures
const testIssuer: IssuerData = {
  id: "https://example.edu/issuer/1" as Shared.IRI,
  name: "Test University",
  url: "https://example.edu" as Shared.IRI,
};

const testBadgeClass: BadgeClassData = {
  id: "https://example.edu/badges/100" as Shared.IRI,
  name: "Integration Testing",
  description: "Demonstrates full credential lifecycle",
  image: "https://example.edu/badges/100/image.png" as Shared.IRI,
  criteria: { narrative: "Pass all integration tests" },
  issuer: testIssuer.id as Shared.IRI,
};

const testAssertion: AssertionData = {
  id: "https://example.edu/assertions/200" as Shared.IRI,
  badgeClass: testBadgeClass.id as Shared.IRI,
  recipient: {
    type: "email",
    identity: "student@example.edu",
    hashed: false,
  },
  issuedOn: "2024-06-01T12:00:00Z",
};

function createTestPNG(): Buffer {
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

describe("Credential Lifecycle Integration", () => {
  beforeEach(() => {
    resetPlatformConfig();
  });

  afterEach(() => {
    resetPlatformConfig();
  });

  test("minimal OB3 credential: build → sign → verify", async () => {
    const provider = new InMemoryKeyProvider();
    const { keyId } = await provider.generateKeyPair("Ed25519");
    const privateKey = await provider.getPrivateKey(keyId);
    const publicKey = await provider.getPublicKey(keyId);

    // Build
    const credential = serializeOB3(testAssertion, testBadgeClass, testIssuer);
    expect(credential.type).toEqual([
      "VerifiableCredential",
      "OpenBadgeCredential",
    ]);

    // Sign
    const verificationMethod = `${testIssuer.id}#${keyId}` as Shared.IRI;
    const proof = await createDataIntegrityProof(
      JSON.stringify(credential),
      privateKey,
      verificationMethod,
    );
    expect(proof.type).toBe("DataIntegrityProof");
    expect(proof.verificationMethod).toBe(verificationMethod);

    // Verify
    const valid = await verifyDataIntegrityProof(
      JSON.stringify(credential),
      proof,
      publicKey,
    );
    expect(valid).toBe(true);
  });

  test("full lifecycle: build → sign → bake → unbake → verify", async () => {
    const provider = new InMemoryKeyProvider();
    const { keyId } = await provider.generateKeyPair("Ed25519");
    const privateKey = await provider.getPrivateKey(keyId);
    const publicKey = await provider.getPublicKey(keyId);

    // Build credential
    const credential = serializeOB3(testAssertion, testBadgeClass, testIssuer);

    // Sign
    const verificationMethod = `${testIssuer.id}#${keyId}` as Shared.IRI;
    const proof = await createDataIntegrityProof(
      JSON.stringify(credential),
      privateKey,
      verificationMethod,
    );

    // Attach proof to credential for baking
    const signedCredential = { ...credential, proof };

    // Bake into PNG
    const png = createTestPNG();
    const bakedPNG = bakePNG(
      png,
      signedCredential as unknown as OB3.VerifiableCredential,
    );
    expect(bakedPNG.length).toBeGreaterThan(png.length);

    // Unbake
    const extracted = unbakePNG(bakedPNG) as Record<string, unknown>;
    expect(extracted).not.toBeNull();

    // Verify the extracted credential's proof is intact
    const extractedProof = extracted.proof as typeof proof;
    expect(extractedProof.type).toBe("DataIntegrityProof");
    expect(extractedProof.verificationMethod).toBe(verificationMethod);

    // Strip proof to verify signature against original data
    const { proof: _extractedProof, ...credentialWithoutProof } = extracted;
    const valid = await verifyDataIntegrityProof(
      JSON.stringify(credentialWithoutProof),
      extractedProof,
      publicKey,
    );
    expect(valid).toBe(true);
  });

  test("self-signed credential: sign and detect tampering", async () => {
    const provider = new InMemoryKeyProvider();
    const { keyId } = await provider.generateKeyPair("Ed25519");
    const privateKey = await provider.getPrivateKey(keyId);
    const publicKey = await provider.getPublicKey(keyId);

    const credential = serializeOB3(testAssertion, testBadgeClass, testIssuer);
    const data = JSON.stringify(credential);

    const proof = await createDataIntegrityProof(
      data,
      privateKey,
      `${testIssuer.id}#${keyId}` as Shared.IRI,
    );

    // Valid signature
    expect(await verifyDataIntegrityProof(data, proof, publicKey)).toBe(true);

    // Tampered data fails
    const tampered = JSON.stringify({ ...credential, validFrom: "2099-01-01" });
    expect(await verifyDataIntegrityProof(tampered, proof, publicKey)).toBe(
      false,
    );
  });

  test("credential with evidence: full lifecycle", async () => {
    const provider = new InMemoryKeyProvider();
    const { keyId } = await provider.generateKeyPair("Ed25519");
    const privateKey = await provider.getPrivateKey(keyId);
    const publicKey = await provider.getPublicKey(keyId);

    const assertionWithEvidence: AssertionData = {
      ...testAssertion,
      evidence: [
        {
          id: "https://example.edu/evidence/1",
          type: ["Evidence"],
          name: "Final Project",
          description: "Student's capstone project submission",
        },
      ],
    };

    const credential = serializeOB3(
      assertionWithEvidence,
      testBadgeClass,
      testIssuer,
    );
    expect(credential.evidence).toBeDefined();

    const data = JSON.stringify(credential);
    const proof = await createDataIntegrityProof(
      data,
      privateKey,
      `${testIssuer.id}#${keyId}` as Shared.IRI,
    );

    expect(await verifyDataIntegrityProof(data, proof, publicKey)).toBe(true);
  });

  test("OB2 credential build and bake round-trip", () => {
    const credential = buildCredential({
      assertion: testAssertion,
      badgeClass: testBadgeClass,
      issuer: testIssuer,
      version: BadgeVersion.V2,
    });

    expect(credential.type).toBe("Assertion");
    expect(credential["@context"]).toBe("https://w3id.org/openbadges/v2");

    // Bake OB2 credential
    const png = createTestPNG();
    const bakedPNG = bakePNG(png, credential as unknown as OB2.Assertion);
    const extracted = unbakePNG(bakedPNG) as Record<string, unknown>;

    expect(extracted).not.toBeNull();
    expect(extracted.type).toBe("Assertion");
    expect(extracted.id).toBe(testAssertion.id);
  });

  test("platform config integration: custom providers work end-to-end", async () => {
    const customProvider = new InMemoryKeyProvider();
    const customCrypto = new NodeCryptoAdapter();

    configure({
      crypto: customCrypto,
      keyProvider: customProvider,
    });

    // Use the configured providers
    const config = getPlatformConfig();
    expect(config.crypto).toBe(customCrypto);
    expect(config.keyProvider).toBe(customProvider);

    // Generate key via configured provider
    const { keyId } = await customProvider.generateKeyPair("Ed25519");
    const privateKey = await customProvider.getPrivateKey(keyId);
    const publicKey = await customProvider.getPublicKey(keyId);

    // Build and sign
    const credential = serializeOB3(testAssertion, testBadgeClass, testIssuer);
    const data = JSON.stringify(credential);
    const proof = await createDataIntegrityProof(
      data,
      privateKey,
      `${testIssuer.id}#${keyId}` as Shared.IRI,
    );

    // Verify
    expect(await verifyDataIntegrityProof(data, proof, publicKey)).toBe(true);
  });

  test("reject signing with public key only (no private key parameter)", async () => {
    const provider = new InMemoryKeyProvider();
    const { keyId } = await provider.generateKeyPair("Ed25519");
    const publicKey = await provider.getPublicKey(keyId);

    // Public key lacks the "d" parameter needed for signing
    expect(publicKey.d).toBeUndefined();

    await expect(
      createDataIntegrityProof(
        "data",
        publicKey,
        "https://example.com/keys/1" as Shared.IRI,
      ),
    ).rejects.toThrow(/key/i);
  });

  test("@context ordering matches OB3 spec", () => {
    const credential = serializeOB3(testAssertion, testBadgeClass, testIssuer);
    const context = credential["@context"] as string[];

    // VC Data Model 2.0 context MUST be first
    expect(context[0]).toBe(VC_V2_CONTEXT_URL);
    // OB3 context second
    expect(context[1]).toBe(OBV3_CONTEXT_URL);
  });

  test("credentialSubject structure matches OB3 spec", () => {
    const credential = serializeOB3(testAssertion, testBadgeClass, testIssuer);

    expect(credential.credentialSubject.type).toEqual(["AchievementSubject"]);
    expect(credential.credentialSubject.achievement.type).toEqual([
      "Achievement",
    ]);
    expect(credential.credentialSubject.achievement.name).toBe(
      testBadgeClass.name,
    );
    expect(credential.credentialSubject.achievement.criteria).toEqual(
      testBadgeClass.criteria,
    );
  });

  test("RSA key flow: sign and verify", async () => {
    const provider = new InMemoryKeyProvider();
    const { keyId } = await provider.generateKeyPair("RSA");
    const privateKey = await provider.getPrivateKey(keyId);
    const publicKey = await provider.getPublicKey(keyId);

    const credential = serializeOB3(testAssertion, testBadgeClass, testIssuer);
    const data = JSON.stringify(credential);

    const proof = await createDataIntegrityProof(
      data,
      privateKey,
      `${testIssuer.id}#${keyId}` as Shared.IRI,
      KeyType.RSA,
    );

    expect(await verifyDataIntegrityProof(data, proof, publicKey)).toBe(true);
  });
});
