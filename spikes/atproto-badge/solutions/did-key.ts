/**
 * Spec-compliant `did:key` encoding for Ed25519 keys.
 *
 * This exists because the app's current implementation is not spec-compliant.
 * `apps/native-rd/src/badges/credentialBuilder.ts:52-64` builds the DID as
 * `did:key:${publicKeyJwk.x}` — the raw base64url x-coordinate, with no multibase
 * prefix and no multicodec header. Such a DID does not resolve, so a verifier cannot
 * recover the public key and signature verification fails no matter how correct the
 * proof is. That is gap #7 in
 * `apps/native-rd/docs/architecture/ob3-compliance-status.md:86-92`.
 *
 * Fixing it in the app belongs to the OB3 punch-list (issue #598), not to this spike.
 * The spike needs a correct DID for one reason only: question 4 in the README asks
 * whether a `did:key` can stay the credential issuer while atproto merely hosts the
 * record. That question is meaningless with a DID that does not resolve.
 *
 * Encoding, per the did:key method spec for Ed25519:
 *
 *     did:key:z<base58btc( 0xed 0x01 || <32 raw public key bytes> )>
 *
 * `0xed01` is the varint-encoded multicodec for `ed25519-pub`; `z` is the multibase
 * prefix for base58btc. The output satisfies the `did:key:z…` check that
 * `apps/native-rd/scripts/verify-badge.ts:241-252` uses to assert gap #7 is closed.
 *
 * @see https://w3c-ccg.github.io/did-key-spec/
 */

const BASE58BTC_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** Multicodec header for `ed25519-pub`, varint-encoded. */
const ED25519_MULTICODEC = Uint8Array.from([0xed, 0x01]);

const ED25519_PUBLIC_KEY_BYTES = 32;

/**
 * Encode bytes as base58btc.
 *
 * Big-integer base conversion, plus one leading `1` per leading zero byte — base58
 * has no way to represent a leading zero positionally, so they are carried out of band.
 */
function base58btcEncode(bytes: Uint8Array): string {
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

/** Decode a base58btc string back to bytes. Inverse of {@link base58btcEncode}. */
function base58btcDecode(encoded: string): Uint8Array {
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

function base64urlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(Buffer.from(padded, "base64"));
}

function bytesToBase64url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

/**
 * Build a spec-compliant `did:key` from an Ed25519 public key JWK.
 *
 * @param publicKeyJwk - An `OKP`/`Ed25519` JWK; only `x` is read.
 * @throws If the JWK has no `x`, or `x` does not decode to 32 bytes.
 */
export function encodeDidKey(publicKeyJwk: { x?: string }): string {
  if (!publicKeyJwk.x) {
    throw new Error("Invalid public key JWK: missing x coordinate");
  }

  const keyBytes = base64urlToBytes(publicKeyJwk.x);
  if (keyBytes.length !== ED25519_PUBLIC_KEY_BYTES) {
    throw new Error(
      `Expected a ${ED25519_PUBLIC_KEY_BYTES}-byte Ed25519 public key, got ${keyBytes.length}`,
    );
  }

  const prefixed = new Uint8Array(ED25519_MULTICODEC.length + keyBytes.length);
  prefixed.set(ED25519_MULTICODEC, 0);
  prefixed.set(keyBytes, ED25519_MULTICODEC.length);

  return `did:key:z${base58btcEncode(prefixed)}`;
}

/**
 * Recover the Ed25519 public key JWK from a `did:key`.
 *
 * This is the half that matters for the spike's question 4: it runs offline, with no
 * network and no directory lookup, which is exactly the property `did:plc` does not have.
 *
 * @throws If the DID is not a `did:key:z…`, or does not carry an Ed25519 multicodec header.
 */
export function decodeDidKey(did: string): {
  kty: "OKP";
  crv: "Ed25519";
  x: string;
} {
  const withoutFragment = did.split("#")[0]!;
  if (!withoutFragment.startsWith("did:key:z")) {
    throw new Error(`Not a multibase did:key: ${withoutFragment}`);
  }

  const decoded = base58btcDecode(withoutFragment.slice("did:key:z".length));
  if (decoded[0] !== 0xed || decoded[1] !== 0x01) {
    throw new Error(
      `Not an Ed25519 did:key — expected multicodec 0xed01, got 0x${decoded[0]?.toString(16)}${decoded[1]?.toString(16)}`,
    );
  }

  const keyBytes = decoded.slice(ED25519_MULTICODEC.length);
  if (keyBytes.length !== ED25519_PUBLIC_KEY_BYTES) {
    throw new Error(
      `Expected a ${ED25519_PUBLIC_KEY_BYTES}-byte Ed25519 public key, got ${keyBytes.length}`,
    );
  }

  return { kty: "OKP", crv: "Ed25519", x: bytesToBase64url(keyBytes) };
}
