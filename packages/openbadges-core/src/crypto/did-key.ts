/**
 * did:key encoding for P-256 (ES256) public keys.
 *
 * Produces the spec-compliant `did:key:z…` form: multibase base58btc (`z`)
 * over a multicodec-prefixed, SEC1-compressed public key.
 *
 *   did:key:z<base58btc( varint(0x1200) || compressed-point )>
 *
 * `0x1200` is the multicodec code for `p256-pub`; its unsigned-varint
 * encoding is the two bytes `0x80 0x24`. The compressed point is 33 bytes:
 * a `0x02`/`0x03` parity prefix followed by the 32-byte X coordinate.
 *
 * Dependency-free by design — no multiformats/base58 package exists in this
 * monorepo, and both encodings are small and fully specified. Uses only
 * native `BigInt`, so it runs unchanged under Hermes, Node, and Bun.
 */

/** Multicodec `p256-pub` (0x1200) as an unsigned varint. */
const P256_PUB_MULTICODEC = Uint8Array.from([0x80, 0x24]);

const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** P-256 field prime (`p ≡ 3 mod 4`, which is what makes sqrt a single exponentiation). */
const P256_PRIME = BigInt(
  "115792089210356248762697446949407573530086143415290314195533631308867097853951",
);
/** P-256 curve coefficient `b`. `a` is fixed at -3 and inlined below. */
const P256_B = BigInt(
  "41058363725152142129326129780047268409114441015993725554835256314039467401291",
);

/** Encodes bytes as base58btc (Bitcoin alphabet), preserving leading zeros as `1`s. */
export function base58btcEncode(bytes: Uint8Array): string {
  if (bytes.length === 0) return "";

  // Leading zero bytes carry no numeric weight, so they must be re-added as
  // '1' characters rather than falling out of the big-integer conversion.
  let leadingZeros = 0;
  while (leadingZeros < bytes.length && bytes[leadingZeros] === 0) {
    leadingZeros++;
  }

  let value = 0n;
  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte);
  }

  let out = "";
  while (value > 0n) {
    const remainder = Number(value % 58n);
    value /= 58n;
    out = BASE58_ALPHABET[remainder] + out;
  }

  return "1".repeat(leadingZeros) + out;
}

/** Decodes a base58btc (Bitcoin alphabet) string. Throws on any character outside the alphabet. */
export function base58btcDecode(encoded: string): Uint8Array {
  if (encoded.length === 0) return new Uint8Array(0);

  let leadingOnes = 0;
  while (leadingOnes < encoded.length && encoded[leadingOnes] === "1") {
    leadingOnes++;
  }

  let value = 0n;
  for (const char of encoded) {
    const digit = BASE58_ALPHABET.indexOf(char);
    if (digit < 0) {
      throw new Error(`Invalid base58btc character: '${char}'`);
    }
    value = value * 58n + BigInt(digit);
  }

  const digits: number[] = [];
  while (value > 0n) {
    digits.unshift(Number(value & 0xffn));
    value >>= 8n;
  }

  const out = new Uint8Array(leadingOnes + digits.length);
  out.set(digits, leadingOnes);
  return out;
}

const BASE64URL_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

// Hand-rolled rather than via atob/btoa or Buffer: this module has to run
// unchanged under Hermes, where neither is guaranteed to be on the global.
function base64UrlToBytes(input: string): Uint8Array {
  const out: number[] = [];
  let bits = 0;
  let acc = 0;
  for (const char of input) {
    if (char === "=") break;
    const digit = BASE64URL_ALPHABET.indexOf(char);
    if (digit < 0) {
      throw new Error(`Invalid base64url character: '${char}'`);
    }
    acc = (acc << 6) | digit;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((acc >> bits) & 0xff);
    }
  }
  return Uint8Array.from(out);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let out = "";
  let bits = 0;
  let acc = 0;
  for (const byte of bytes) {
    acc = (acc << 8) | byte;
    bits += 8;
    while (bits >= 6) {
      bits -= 6;
      out += BASE64URL_ALPHABET[(acc >> bits) & 0x3f];
    }
  }
  if (bits > 0) {
    out += BASE64URL_ALPHABET[(acc << (6 - bits)) & 0x3f];
  }
  return out;
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);
  return value;
}

function bigIntTo32Bytes(value: bigint): Uint8Array {
  const out = new Uint8Array(32);
  let remaining = value;
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
  return out;
}

function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  let result = 1n;
  let b = base % modulus;
  let e = exponent;
  while (e > 0n) {
    if (e & 1n) result = (result * b) % modulus;
    b = (b * b) % modulus;
    e >>= 1n;
  }
  return result;
}

/** Reads and validates the 32-byte `x`/`y` coordinates of a P-256 public-key JWK. */
function readP256Coordinates(jwk: JsonWebKey): {
  x: Uint8Array;
  y: Uint8Array;
} {
  if (jwk.kty !== "EC" || jwk.crv !== "P-256") {
    throw new Error(
      `Expected a P-256 EC public key JWK, got kty='${String(jwk.kty)}' crv='${String(jwk.crv)}'`,
    );
  }
  if (!jwk.x || !jwk.y) {
    throw new Error("Invalid P-256 public key JWK: missing x or y coordinate");
  }
  const x = base64UrlToBytes(jwk.x);
  const y = base64UrlToBytes(jwk.y);
  if (x.length !== 32 || y.length !== 32) {
    throw new Error(
      `Invalid P-256 public key JWK: coordinates must be 32 bytes (got x=${x.length}, y=${y.length})`,
    );
  }
  return { x, y };
}

/**
 * SEC1 point compression: a P-256 public-key JWK to a 33-byte point whose
 * leading byte encodes the parity of `y` (`0x02` even, `0x03` odd).
 */
export function compressP256PublicKey(jwk: JsonWebKey): Uint8Array {
  const { x, y } = readP256Coordinates(jwk);
  const out = new Uint8Array(33);
  out[0] = (y[31]! & 1) === 0 ? 0x02 : 0x03;
  out.set(x, 1);
  return out;
}

/**
 * Reverses {@link compressP256PublicKey}: recovers `y` from `x` via
 * `y² = x³ - 3x + b mod p`, taking the square root as `y = (y²)^((p+1)/4) mod p`
 * — valid because P-256's prime is `≡ 3 mod 4` — then picking the root whose
 * parity matches the compression prefix.
 */
export function decompressP256PublicKey(point: Uint8Array): JsonWebKey {
  if (point.length !== 33) {
    throw new Error(
      `Invalid compressed P-256 point: expected 33 bytes, got ${point.length}`,
    );
  }
  const prefix = point[0]!;
  if (prefix !== 0x02 && prefix !== 0x03) {
    throw new Error(
      `Invalid compressed P-256 point: prefix must be 0x02 or 0x03, got 0x${prefix.toString(16)}`,
    );
  }

  const xBytes = point.slice(1);
  const x = bytesToBigInt(xBytes);
  if (x >= P256_PRIME) {
    throw new Error("Invalid compressed P-256 point: x is not in the field");
  }

  const ySquared = (((x * x * x - 3n * x) % P256_PRIME) + P256_B) % P256_PRIME;
  let y = modPow(ySquared, (P256_PRIME + 1n) / 4n, P256_PRIME);

  // The exponentiation always returns *something*; only squaring it back
  // proves x was actually on the curve.
  if ((y * y) % P256_PRIME !== ySquared) {
    throw new Error("Invalid compressed P-256 point: x is not on the curve");
  }

  const wantOdd = prefix === 0x03;
  const isOdd = (y & 1n) === 1n;
  if (isOdd !== wantOdd) {
    y = P256_PRIME - y;
  }

  return {
    kty: "EC",
    crv: "P-256",
    x: bytesToBase64Url(xBytes),
    y: bytesToBase64Url(bigIntTo32Bytes(y)),
  };
}

/** Encodes a P-256 public-key JWK as a spec-compliant `did:key:z…` identifier. */
export function encodeP256DidKey(jwk: JsonWebKey): string {
  const compressed = compressP256PublicKey(jwk);
  const prefixed = new Uint8Array(
    P256_PUB_MULTICODEC.length + compressed.length,
  );
  prefixed.set(P256_PUB_MULTICODEC, 0);
  prefixed.set(compressed, P256_PUB_MULTICODEC.length);
  return `did:key:z${base58btcEncode(prefixed)}`;
}

/**
 * Decodes a `did:key:z…` P-256 identifier back to a public-key JWK.
 * Any fragment (`#…`) or path is rejected rather than silently stripped —
 * this app never mints one, so its presence means the DID isn't ours.
 */
export function decodeP256DidKey(did: string): JsonWebKey {
  if (!did.startsWith("did:key:z")) {
    throw new Error(`Not a multibase did:key identifier: ${did}`);
  }
  const multibase = did.slice("did:key:z".length);
  if (multibase.length === 0) {
    throw new Error(`Empty did:key multibase payload: ${did}`);
  }

  const decoded = base58btcDecode(multibase);
  if (
    decoded.length < P256_PUB_MULTICODEC.length ||
    decoded[0] !== P256_PUB_MULTICODEC[0] ||
    decoded[1] !== P256_PUB_MULTICODEC[1]
  ) {
    throw new Error(
      "did:key does not carry the p256-pub multicodec prefix (0x1200)",
    );
  }

  return decompressP256PublicKey(decoded.slice(P256_PUB_MULTICODEC.length));
}

/** True when `did` is a well-formed `did:key` P-256 identifier this module can decode. */
export function isP256DidKey(did: string): boolean {
  try {
    decodeP256DidKey(did);
    return true;
  } catch {
    return false;
  }
}
