import { describe, test, expect } from "bun:test";
import { createPublicKey } from "node:crypto";
import {
  base58btcEncode,
  base58btcDecode,
  compressP256PublicKey,
  decompressP256PublicKey,
  encodeP256DidKey,
  decodeP256DidKey,
  isP256DidKey,
} from "../../src/crypto/did-key";

/**
 * Known-answer vector from the W3C did:key method spec's P-256 example.
 * Anchors the whole pipeline (base58btc + multicodec + point decompression)
 * against a value this repo did not compute, so a round-trip test can't pass
 * on a self-consistently wrong encoding.
 */
const SPEC_DID = "did:key:zDnaerDaTF5BXEavCrfRZEk316dpbLsfPDZ3WJ5hRTPFU2169";
const SPEC_JWK: JsonWebKey = {
  kty: "EC",
  crv: "P-256",
  x: "fyNYMN0976ci7xqiSdag3buk-ZCwgXU4kz9XNkBlNUI",
  y: "hW2ojTNfH7Jbi8--CJUo3OCbH3y5n91g-IMA9MLMbTU",
};

async function generateP256Jwk(): Promise<JsonWebKey> {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  return crypto.subtle.exportKey("jwk", pair.publicKey);
}

describe("base58btc", () => {
  test.each([
    [[0x00], "1"],
    [[0x00, 0x00, 0x01], "112"],
    [[0x61], "2g"],
    [[0x62, 0x62, 0x62], "a3gV"],
    [[0x80, 0x24], "Akb"], // the p256-pub multicodec varint
  ])("encodes %p and decodes back", (bytes, expected) => {
    const input = Uint8Array.from(bytes);
    expect(base58btcEncode(input)).toBe(expected);
    expect(Array.from(base58btcDecode(expected))).toEqual(bytes);
  });

  test("rejects characters outside the Bitcoin alphabet", () => {
    // '0', 'O', 'I' and 'l' are the four deliberately-omitted characters.
    expect(() => base58btcDecode("0OIl")).toThrow(
      "Invalid base58btc character",
    );
  });

  test("round-trips 33 random bytes", () => {
    const bytes = crypto.getRandomValues(new Uint8Array(33));
    expect(Array.from(base58btcDecode(base58btcEncode(bytes)))).toEqual(
      Array.from(bytes),
    );
  });
});

describe("P-256 point compression", () => {
  test("compresses to 33 bytes with a parity prefix", () => {
    const point = compressP256PublicKey(SPEC_JWK);
    expect(point.length).toBe(33);
    expect([0x02, 0x03]).toContain(point[0]);
  });

  test("decompresses back to the original coordinates", () => {
    expect(decompressP256PublicKey(compressP256PublicKey(SPEC_JWK))).toEqual(
      SPEC_JWK,
    );
  });

  test("rejects a non-P-256 JWK", () => {
    expect(() =>
      compressP256PublicKey({ kty: "OKP", crv: "Ed25519", x: "abc" }),
    ).toThrow("Expected a P-256 EC public key JWK");
  });

  test("rejects a JWK missing the y coordinate", () => {
    expect(() =>
      compressP256PublicKey({ kty: "EC", crv: "P-256", x: SPEC_JWK.x }),
    ).toThrow("missing x or y coordinate");
  });

  test("rejects an x that is not on the curve", () => {
    const point = compressP256PublicKey(SPEC_JWK);
    point[1] ^= 0xff; // perturb the high byte of x
    expect(() => decompressP256PublicKey(point)).toThrow("not on the curve");
  });

  test("rejects a point of the wrong length", () => {
    expect(() => decompressP256PublicKey(new Uint8Array(32))).toThrow(
      "expected 33 bytes",
    );
  });

  test("rejects an uncompressed-point prefix", () => {
    const point = compressP256PublicKey(SPEC_JWK);
    point[0] = 0x04;
    expect(() => decompressP256PublicKey(point)).toThrow(
      "prefix must be 0x02 or 0x03",
    );
  });
});

describe("encodeP256DidKey / decodeP256DidKey", () => {
  test("encodes the spec's P-256 example to the spec's DID", () => {
    expect(encodeP256DidKey(SPEC_JWK)).toBe(SPEC_DID);
  });

  test("decodes the spec's DID to the spec's JWK", () => {
    expect(decodeP256DidKey(SPEC_DID)).toEqual(SPEC_JWK);
  });

  test("produces a DID whose decoded key Node accepts as a P-256 point", () => {
    const key = createPublicKey({
      key: decodeP256DidKey(SPEC_DID) as Record<string, unknown>,
      format: "jwk",
    });
    expect(key.asymmetricKeyType).toBe("ec");
  });

  test.each([0, 1, 2])(
    "round-trips a freshly generated P-256 keypair (#%i)",
    async () => {
      const jwk = await generateP256Jwk();
      const did = encodeP256DidKey(jwk);
      expect(did.startsWith("did:key:zDna")).toBe(true);
      const decoded = decodeP256DidKey(did);
      expect(decoded.x).toBe(jwk.x!);
      expect(decoded.y).toBe(jwk.y!);
    },
  );

  test("rejects a DID without the multibase `z` prefix", () => {
    expect(() => decodeP256DidKey("did:key:abc123")).toThrow(
      "Not a multibase did:key identifier",
    );
  });

  test("rejects an empty multibase payload", () => {
    expect(() => decodeP256DidKey("did:key:z")).toThrow(
      "Empty did:key multibase payload",
    );
  });

  test("rejects an Ed25519 did:key (wrong multicodec)", () => {
    // Ed25519 multicodec is 0xed01, not 0x1200 — a real, spec-valid DID that
    // this P-256-only decoder must refuse rather than mis-decode.
    const ed25519Did =
      "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK";
    expect(() => decodeP256DidKey(ed25519Did)).toThrow(
      "p256-pub multicodec prefix",
    );
  });

  test("isP256DidKey distinguishes decodable DIDs from malformed ones", () => {
    expect(isP256DidKey(SPEC_DID)).toBe(true);
    // Iteration-A form: raw jwk.x with no multibase/multicodec at all.
    expect(
      isP256DidKey("did:key:fyNYMN0976ci7xqiSdag3buk-ZCwgXU4kz9XNkBlNUI"),
    ).toBe(false);
  });
});
