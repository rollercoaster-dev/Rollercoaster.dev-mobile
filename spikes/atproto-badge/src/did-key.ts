/**
 * LESSON 02 — see ../lessons/02-did-key.md
 *
 * Your job: turn an Ed25519 public key into a `did:key` identifier, and back again.
 *
 * The base58btc codec below is given to you. It is fiddly big-integer arithmetic and it
 * is not what this lesson is about — the lesson is about *what gets encoded and why*.
 *
 * Check your work:  bun test tests/02-did-key.test.ts
 */

const BASE58BTC_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** Multicodec header for `ed25519-pub`, varint-encoded. See lesson 02. */
export const ED25519_MULTICODEC = Uint8Array.from([0xed, 0x01]);

export const ED25519_PUBLIC_KEY_BYTES = 32;

/**
 * GIVEN. Encode bytes as base58btc.
 *
 * Big-integer base conversion, plus one leading `1` per leading zero byte — base58 has
 * no positional way to represent a leading zero, so they are carried out of band.
 */
export function base58btcEncode(bytes: Uint8Array): string {
  if (bytes.length === 0) return "";

  const digits: number[] = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i]! << 8;
      digits[i] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }

  let leadingZeros = 0;
  while (leadingZeros < bytes.length && bytes[leadingZeros] === 0)
    leadingZeros++;

  return (
    "1".repeat(leadingZeros) +
    digits
      .reverse()
      .map((d) => BASE58BTC_ALPHABET[d]!)
      .join("")
  );
}

/** GIVEN. Decode a base58btc string back to bytes. */
export function base58btcDecode(encoded: string): Uint8Array {
  const bytes: number[] = [0];
  for (const char of encoded) {
    const value = BASE58BTC_ALPHABET.indexOf(char);
    if (value === -1) throw new Error(`Invalid base58btc character: ${char}`);
    let carry = value;
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i]! * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  let leadingZeros = 0;
  while (leadingZeros < encoded.length && encoded[leadingZeros] === "1")
    leadingZeros++;

  return Uint8Array.from([
    ...new Array<number>(leadingZeros).fill(0),
    ...bytes.reverse(),
  ]);
}

/** GIVEN. JWK `x` fields are base64url. */
export function base64urlToBytes(value: string): Uint8Array {
  return Uint8Array.from(Buffer.from(value, "base64url"));
}

/** GIVEN. */
export function bytesToBase64url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

/**
 * YOUR TURN (1 of 2).
 *
 * Build a spec-compliant `did:key` from an Ed25519 public key JWK.
 *
 * The shape you are aiming for:
 *
 *     did:key:z<base58btc( <multicodec header> || <32 raw key bytes> )>
 *
 * Steps:
 *   1. Reject a JWK with no `x`. (The tests check the error.)
 *   2. Decode `x` from base64url into bytes. Reject anything that is not 32 bytes.
 *   3. Prepend ED25519_MULTICODEC to those bytes.
 *   4. base58btc-encode the result.
 *   5. Prefix the string with `did:key:z`.
 *
 * Why each step exists is in lesson 02. Do not skip the reading — step 3 is the whole
 * point of the exercise and it looks like a pointless two bytes until you know why.
 */
export function encodeDidKey(publicKeyJwk: { x?: string }): string {
  throw new Error("Not implemented — see lessons/02-did-key.md");
}

/**
 * YOUR TURN (2 of 2).
 *
 * Recover the Ed25519 public key JWK from a `did:key`.
 *
 * This is the half that matters most. It runs offline: no network, no directory, no
 * server. Given only the DID string, you get back the key that verifies the signature.
 *
 * Steps:
 *   1. Strip any `#fragment`.
 *   2. Reject anything not starting `did:key:z`.
 *   3. base58btc-decode the rest (after the `z`).
 *   4. Check the first two bytes are the Ed25519 multicodec. Reject other key types —
 *      a secp256k1 did:key is valid, it is just not one you can verify with Ed25519.
 *   5. Return `{ kty: "OKP", crv: "Ed25519", x: <base64url of the remaining bytes> }`.
 */
export function decodeDidKey(did: string): {
  kty: "OKP";
  crv: "Ed25519";
  x: string;
} {
  throw new Error("Not implemented — see lessons/02-did-key.md");
}
