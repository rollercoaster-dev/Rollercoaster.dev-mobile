/**
 * Tests for the ES256 VC-JWT proof builder.
 *
 * The signature bytes come from a stub `sign` — cryptographic verification of
 * a real ES256 signature is scripts/verify-badge.ts's job. What's pinned here
 * is the JWS shape: what goes into the header, what goes into the claims, and
 * which bytes are handed to the signer.
 */
import {
  signCredentialAsVcJwt,
  toPublicP256Jwk,
  parseStoredCredential,
} from "../vcJwt";
import { Buffer } from "buffer";

const PUBLIC_JWK: JsonWebKey = {
  kty: "EC",
  crv: "P-256",
  x: "fyNYMN0976ci7xqiSdag3buk-ZCwgXU4kz9XNkBlNUI",
  y: "hW2ojTNfH7Jbi8--CJUo3OCbH3y5n91g-IMA9MLMbTU",
};
const ISSUER_DID = "did:key:zDnaerDaTF5BXEavCrfRZEk316dpbLsfPDZ3WJ5hRTPFU2169";
const ISSUED_ON = "2026-02-18T00:00:00.000Z";
const CREDENTIAL_ID = "urn:uuid:cred-01";

const UNSIGNED_CREDENTIAL: Record<string, unknown> = {
  "@context": ["https://www.w3.org/ns/credentials/v2"],
  id: CREDENTIAL_ID,
  type: ["VerifiableCredential", "OpenBadgeCredential"],
  name: "Learn React Native",
  issuer: { id: ISSUER_DID },
  validFrom: ISSUED_ON,
  credentialSubject: {
    id: ISSUER_DID,
    achievement: { id: "urn:ulid:goal-01" },
  },
  evidence: [{ id: "urn:ulid:ev-1", name: "A note" }],
};

/** 64 bytes — the length of a real IEEE-P1363 `r‖s` P-256 signature. */
const SIGNATURE = Uint8Array.from({ length: 64 }, (_, i) => i + 1);

function decodeSegment(segment: string): Record<string, unknown> {
  return JSON.parse(
    Buffer.from(segment, "base64url").toString("utf8"),
  ) as Record<string, unknown>;
}

async function sign(): Promise<string> {
  return signCredentialAsVcJwt({
    unsignedCredential: UNSIGNED_CREDENTIAL,
    issuerDid: ISSUER_DID,
    publicKeyJwk: PUBLIC_JWK,
    issuedOn: ISSUED_ON,
    credentialId: CREDENTIAL_ID,
    sign: async () => SIGNATURE,
  });
}

describe("signCredentialAsVcJwt", () => {
  it("produces a three-segment compact JWS", async () => {
    const jws = await sign();
    expect(jws.split(".")).toHaveLength(3);
  });

  it("emits base64url segments only (no +, / or = padding)", async () => {
    const jws = await sign();
    expect(jws).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });

  it("declares alg ES256 in the protected header", async () => {
    const [header] = (await sign()).split(".");
    // EdDSA here would be rejected outright by the validator's external-proof
    // probe — the whole reason the signing key moved to P-256.
    expect(decodeSegment(header!)["alg"]).toBe("ES256");
    expect(decodeSegment(header!)["typ"]).toBe("JWT");
  });

  it("inlines the public key as `jwk` so verification needs no network", async () => {
    const [header] = (await sign()).split(".");
    expect(decodeSegment(header!)["jwk"]).toEqual(PUBLIC_JWK);
  });

  it("never leaks private or advisory JWK fields into the header", async () => {
    const jws = await signCredentialAsVcJwt({
      unsignedCredential: UNSIGNED_CREDENTIAL,
      issuerDid: ISSUER_DID,
      publicKeyJwk: {
        ...PUBLIC_JWK,
        d: "PRIVATE-KEY-MATERIAL",
        ext: true,
        key_ops: ["sign"],
      },
      issuedOn: ISSUED_ON,
      credentialId: CREDENTIAL_ID,
      sign: async () => SIGNATURE,
    });
    const header = decodeSegment(jws.split(".")[0]!);
    expect(header["jwk"]).toEqual(PUBLIC_JWK);
    expect(jws).not.toContain("PRIVATE-KEY-MATERIAL");
  });

  it("carries the whole unsigned credential under the `vc` claim", async () => {
    const [, payload] = (await sign()).split(".");
    expect(decodeSegment(payload!)["vc"]).toEqual(UNSIGNED_CREDENTIAL);
  });

  it("sets iss, sub and jti from the credential", async () => {
    const claims = decodeSegment((await sign()).split(".")[1]!);
    expect(claims["iss"]).toBe(ISSUER_DID);
    expect(claims["sub"]).toBe(ISSUER_DID);
    expect(claims["jti"]).toBe(CREDENTIAL_ID);
  });

  it("sets iat and nbf to issuedOn as epoch seconds", async () => {
    const claims = decodeSegment((await sign()).split(".")[1]!);
    expect(claims["iat"]).toBe(Date.parse(ISSUED_ON) / 1000);
    expect(claims["nbf"]).toBe(claims["iat"]);
  });

  it("signs exactly the `header.payload` bytes, not the credential JSON", async () => {
    let signed: Uint8Array | null = null;
    const jws = await signCredentialAsVcJwt({
      unsignedCredential: UNSIGNED_CREDENTIAL,
      issuerDid: ISSUER_DID,
      publicKeyJwk: PUBLIC_JWK,
      issuedOn: ISSUED_ON,
      credentialId: CREDENTIAL_ID,
      sign: async (bytes) => {
        signed = bytes;
        return SIGNATURE;
      },
    });
    const [header, payload] = jws.split(".");
    expect(Buffer.from(signed!).toString("utf8")).toBe(`${header}.${payload}`);
  });

  it("appends the signature bytes as the third segment", async () => {
    const [, , sig] = (await sign()).split(".");
    expect(Buffer.from(sig!, "base64url").equals(Buffer.from(SIGNATURE))).toBe(
      true,
    );
  });

  it("falls back to the issuer DID when the credential has no subject id", async () => {
    const jws = await signCredentialAsVcJwt({
      unsignedCredential: { ...UNSIGNED_CREDENTIAL, credentialSubject: {} },
      issuerDid: ISSUER_DID,
      publicKeyJwk: PUBLIC_JWK,
      issuedOn: ISSUED_ON,
      credentialId: CREDENTIAL_ID,
      sign: async () => SIGNATURE,
    });
    expect(decodeSegment(jws.split(".")[1]!)["sub"]).toBe(ISSUER_DID);
  });

  it("rejects an unparseable issuedOn rather than emitting NaN claims", async () => {
    await expect(
      signCredentialAsVcJwt({
        unsignedCredential: UNSIGNED_CREDENTIAL,
        issuerDid: ISSUER_DID,
        publicKeyJwk: PUBLIC_JWK,
        issuedOn: "not-a-date",
        credentialId: CREDENTIAL_ID,
        sign: async () => SIGNATURE,
      }),
    ).rejects.toThrow("Invalid issuedOn timestamp");
  });
});

describe("toPublicP256Jwk", () => {
  it("rejects a pre-migration Ed25519 key", () => {
    expect(() =>
      toPublicP256Jwk({ kty: "OKP", crv: "Ed25519", x: "abc" }),
    ).toThrow("expected EC/P-256");
  });

  it("rejects a P-256 JWK missing a coordinate", () => {
    expect(() =>
      toPublicP256Jwk({ kty: "EC", crv: "P-256", x: "abc" }),
    ).toThrow("missing x or y coordinate");
  });
});

describe("parseStoredCredential", () => {
  it("unwraps the `vc` claim of a JWS produced by signCredentialAsVcJwt", async () => {
    const jws = await sign();
    expect(parseStoredCredential(jws)).toEqual(UNSIGNED_CREDENTIAL);
  });

  it("returns a pre-#598 JSON credential unchanged", () => {
    // Old badges are never migrated or re-signed, so this path has to survive.
    const json = JSON.stringify(UNSIGNED_CREDENTIAL);
    expect(parseStoredCredential(json)).toEqual(UNSIGNED_CREDENTIAL);
  });

  it("decodes payloads carrying the base64url-only characters `-` and `_`", async () => {
    // `Buffer.from(s, "base64url")` reads fine under Jest (Node core buffer)
    // but throws on device, where the feross polyfill is bundled and has no
    // such encoding. Decoding must not depend on it. These bytes force both
    // characters into the segment, which plain base64 would spell + and /.
    const jws = await signCredentialAsVcJwt({
      unsignedCredential: { ...UNSIGNED_CREDENTIAL, name: "ÿ}ø?ÿ}ø?" },
      issuerDid: ISSUER_DID,
      publicKeyJwk: PUBLIC_JWK,
      issuedOn: ISSUED_ON,
      credentialId: CREDENTIAL_ID,
      sign: async () => SIGNATURE,
    });
    const segment = jws.split(".")[1]!;
    expect(segment).toMatch(/[-_]/);
    expect(parseStoredCredential(jws)).toMatchObject({ name: "ÿ}ø?ÿ}ø?" });
  });

  it("round-trips multi-byte UTF-8 in credential text", async () => {
    const jws = await signCredentialAsVcJwt({
      unsignedCredential: {
        ...UNSIGNED_CREDENTIAL,
        name: "Ziel erreicht 🎢 日本語",
      },
      issuerDid: ISSUER_DID,
      publicKeyJwk: PUBLIC_JWK,
      issuedOn: ISSUED_ON,
      credentialId: CREDENTIAL_ID,
      sign: async () => SIGNATURE,
    });
    expect(parseStoredCredential(jws)).toMatchObject({
      name: "Ziel erreicht 🎢 日本語",
    });
  });

  it("yields an empty object for a JWS with no `vc` claim", () => {
    const b64 = (v: unknown) =>
      Buffer.from(JSON.stringify(v))
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
    const jws = `${b64({ alg: "ES256" })}.${b64({ iss: ISSUER_DID })}.sig`;
    expect(parseStoredCredential(jws)).toEqual({});
  });
});
