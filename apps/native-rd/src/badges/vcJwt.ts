/**
 * ES256 VC-JWT external proof.
 *
 * OB 3.0 accepts two proof formats. The embedded DataIntegrityProof form needs
 * RDFC-1.0 canonicalization, which has no working implementation available to
 * this app; the external form is a plain compact JWS over the credential and
 * needs none. See docs/research/ob3-proof-format-spike.md.
 *
 * The result is a three-segment `header.payload.signature` string — the whole
 * credential, not a JSON object carrying a `proof` array. That string is what
 * gets stored on the badge row and baked into the PNG (both the baker and the
 * unbaker already branch on JWS-vs-JSON).
 *
 * Pure and platform-agnostic apart from `Buffer`: the private key never
 * appears here, only a `sign` callback that reaches SecureStoreKeyProvider.
 */
import { Buffer } from "buffer";

/** The public half of a P-256 JWK, with any private or advisory fields dropped. */
export interface PublicP256Jwk {
  kty: "EC";
  crv: "P-256";
  x: string;
  y: string;
}

export interface VcJwtInput {
  /** The unsigned OB3 VerifiableCredential, exactly as `buildUnsignedCredential` returns it. */
  unsignedCredential: Record<string, unknown>;
  /** Issuer DID — becomes the `iss` claim. */
  issuerDid: string;
  /** Public key of the signing key, inlined into the protected header. */
  publicKeyJwk: JsonWebKey;
  /** ISO-8601 issuance timestamp — becomes `iat`/`nbf`. */
  issuedOn: string;
  /** Credential id — becomes the `jti` claim. */
  credentialId: string;
  /** Produces a raw IEEE-P1363 `r‖s` signature over the given bytes. */
  sign: (signingInput: Uint8Array) => Promise<Uint8Array>;
}

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

const BASE64URL_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/**
 * Decodes a base64url segment to a UTF-8 string.
 *
 * Hand-rolled on purpose. `Buffer.from(s, "base64url")` works under Jest,
 * which resolves `buffer` to Node's core module, but the app bundles the
 * feross `buffer` polyfill (see package.json), and that has no `base64url`
 * encoding — on device it throws `Unknown encoding`. Callers here swallow
 * parse errors to hide a section, so the failure would have been silent.
 */
function base64UrlToString(segment: string): string {
  const bytes: number[] = [];
  let bits = 0;
  let acc = 0;
  for (const char of segment) {
    if (char === "=") break;
    const digit = BASE64URL_ALPHABET.indexOf(char);
    if (digit < 0) {
      throw new Error(`Invalid base64url character: '${char}'`);
    }
    acc = (acc << 6) | digit;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((acc >> bits) & 0xff);
    }
  }
  return new TextDecoder().decode(Uint8Array.from(bytes));
}

/**
 * True when a stored credential string is a compact JWS rather than
 * credential JSON. Same shape test `png-baking.ts` uses to decide how to
 * embed one.
 */
function isCompactJws(credential: string): boolean {
  const trimmed = credential.trim();
  return !trimmed.startsWith("{") && trimmed.split(".").length === 3;
}

/**
 * Unwraps a stored `badge.credential` to the VC object inside it.
 *
 * Badges signed since #598 are compact JWS strings carrying the credential
 * under the payload's `vc` claim; badges earned before it are plain
 * credential JSON. Old badges are never migrated or re-signed — their
 * signature covers the exact stored bytes — so both shapes stay readable
 * indefinitely. Throws on malformed input; callers decide what to show.
 */
export function parseStoredCredential(
  credential: string,
): Record<string, unknown> {
  const trimmed = credential.trim();
  if (!isCompactJws(trimmed)) {
    return JSON.parse(trimmed) as Record<string, unknown>;
  }
  const payload = JSON.parse(base64UrlToString(trimmed.split(".")[1]!)) as {
    vc?: unknown;
  };
  return (payload.vc ?? {}) as Record<string, unknown>;
}

function jsonToBase64Url(value: unknown): string {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}

/**
 * Narrows a JWK to the four public P-256 fields.
 *
 * Deliberately an allowlist, not a `delete d`: `crypto.subtle.exportKey`
 * returns `key_ops`/`ext` alongside the coordinates, and this object is
 * published inside every badge — nothing gets in that isn't named here.
 */
export function toPublicP256Jwk(jwk: JsonWebKey): PublicP256Jwk {
  if (jwk.kty !== "EC" || jwk.crv !== "P-256") {
    throw new Error(
      `Cannot build an ES256 proof from a ${String(jwk.kty)}/${String(jwk.crv)} key — expected EC/P-256`,
    );
  }
  if (!jwk.x || !jwk.y) {
    throw new Error("Invalid P-256 public key JWK: missing x or y coordinate");
  }
  return { kty: "EC", crv: "P-256", x: jwk.x, y: jwk.y };
}

/**
 * Signs an unsigned OB3 credential as a compact ES256 JWS.
 *
 * The public key rides in the protected header as an inline `jwk` rather than
 * a dereferenceable `kid` URL, so a badge verifies with no network access —
 * which is the whole point for a local-first app.
 */
export async function signCredentialAsVcJwt(
  input: VcJwtInput,
): Promise<string> {
  const publicJwk = toPublicP256Jwk(input.publicKeyJwk);

  const header = { alg: "ES256", typ: "JWT", jwk: publicJwk };

  const issuedAtSeconds = Math.floor(new Date(input.issuedOn).getTime() / 1000);
  if (!Number.isFinite(issuedAtSeconds)) {
    throw new Error(`Invalid issuedOn timestamp: ${input.issuedOn}`);
  }

  const subject = input.unsignedCredential["credentialSubject"] as
    | { id?: unknown }
    | undefined;

  const payload = {
    iss: input.issuerDid,
    // Self-sovereign assertion: the subject is the issuer. Fall back to the
    // issuer DID only if the credential somehow carries no subject id, so the
    // claim never silently disagrees with the credential it wraps.
    sub: typeof subject?.id === "string" ? subject.id : input.issuerDid,
    jti: input.credentialId,
    nbf: issuedAtSeconds,
    iat: issuedAtSeconds,
    vc: input.unsignedCredential,
  };

  const signingInput = `${jsonToBase64Url(header)}.${jsonToBase64Url(payload)}`;
  const signature = await input.sign(new TextEncoder().encode(signingInput));

  return `${signingInput}.${toBase64Url(signature)}`;
}
