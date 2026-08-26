/**
 * LESSON 02 checks. Run: bun test tests/02-did-key.test.ts
 *
 * Every vector here is real. The Ed25519 one is lifted from the did:key spec itself
 * (https://w3c-ccg.github.io/did-key-spec/); the secp256k1 one is a live Bluesky
 * account's actual signing key, pulled from the PLC directory.
 */

import { describe, expect, test } from "bun:test";
import { decodeDidKey, encodeDidKey } from "../src/did-key.js";

/**
 * Assert that `fn` rejects its input *on purpose*.
 *
 * A plain `.toThrow()` would pass against an unimplemented stub, which is worse than
 * useless — it would tell you half the suite is green before you had written a line.
 * So this also insists the error is not the "Not implemented" sentinel.
 */
function expectRejects(fn: () => unknown): void {
  let message: string | null = null;
  try {
    fn();
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  expect(message).not.toBeNull();
  expect(message).not.toMatch(/not implemented/i);
}

/** The did:key spec's own Ed25519 example, and the JWK x that produces it. */
const SPEC_DID = "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK";
const SPEC_JWK_X = "Lm_M42cB3HkUiODQsXRcweM6TByfzEHGO9ND274JcOY";

/** A real secp256k1 key from a live account's DID document. Valid — but not Ed25519. */
const SECP256K1_DID =
  "did:key:zQ3shQo6TF2moaqMTrUZEM1jeuYRQXeHEx4evX9751y2qPqRA";

/** The shape the app emits today: raw base64url, no multibase, no multicodec. */
const BROKEN_ITERATION_A_DID = `did:key:${SPEC_JWK_X}`;

describe("encodeDidKey", () => {
  test("produces the exact DID the spec says it should", () => {
    expect(encodeDidKey({ x: SPEC_JWK_X })).toBe(SPEC_DID);
  });

  test("always starts did:key:z — the multibase marker", () => {
    expect(encodeDidKey({ x: SPEC_JWK_X })).toStartWith("did:key:z");
  });

  test("rejects a JWK with no x coordinate", () => {
    expectRejects(() => encodeDidKey({}));
  });

  test("rejects a key that is not 32 bytes", () => {
    // 31 bytes of zeroes — structurally a JWK, cryptographically nonsense.
    const tooShort = Buffer.alloc(31).toString("base64url");
    expectRejects(() => encodeDidKey({ x: tooShort }));
  });
});

describe("decodeDidKey", () => {
  test("recovers the original JWK from the spec's DID", () => {
    expect(decodeDidKey(SPEC_DID)).toEqual({
      kty: "OKP",
      crv: "Ed25519",
      x: SPEC_JWK_X,
    });
  });

  test("ignores a #fragment", () => {
    expect(decodeDidKey(`${SPEC_DID}#key-1`).x).toBe(SPEC_JWK_X);
  });

  test("rejects the broken form the app emits today", () => {
    // This is the actual bug in apps/native-rd/src/badges/credentialBuilder.ts.
    // A DID in this shape carries no type information and no multibase prefix,
    // so nothing can resolve it. See lesson 02.
    expectRejects(() => decodeDidKey(BROKEN_ITERATION_A_DID));
  });

  test("rejects a valid did:key that is not Ed25519", () => {
    // Being strict here is the point: silently treating secp256k1 bytes as an
    // Ed25519 key would produce a key that never verifies, with no clue why.
    expectRejects(() => decodeDidKey(SECP256K1_DID));
  });

  test("rejects something that is not a DID at all", () => {
    expectRejects(() => decodeDidKey("https://example.com/key"));
  });
});

describe("round trip", () => {
  test("encode then decode returns the input", () => {
    expect(encodeDidKey(decodeDidKey(SPEC_DID))).toBe(SPEC_DID);
  });
});
