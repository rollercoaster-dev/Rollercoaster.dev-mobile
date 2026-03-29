/**
 * OB3 credential builder for goal completion
 *
 * Pure function — no React, no side effects.
 * Uses openbadges-core's serializeOB3 for data structure construction.
 * Signing is handled separately by useCreateBadge via SecureStoreKeyProvider.
 */
import { serializeOB3 } from "@rollercoaster-dev/openbadges-core";
import type {
  IssuerData,
  BadgeClassData,
  AssertionData,
} from "@rollercoaster-dev/openbadges-core";
import type { Shared } from "openbadges-types";

// Cast a plain string to the branded IRI type required by openbadges-core
const iri = (s: string): Shared.IRI => s as unknown as Shared.IRI;

export interface GoalData {
  id: string;
  title: string;
  description: string | null;
}

export interface EvidenceRow {
  id: string;
  type: string | null;
  uri: string;
  description: string | null;
  stepTitle?: string | null;
}

export interface CredentialInput {
  goal: GoalData;
  evidence: EvidenceRow[];
  issuerDid: string;
  publicKeyJwk: JsonWebKey;
  credentialId: string;
  issuedOn: string;
}

/**
 * Constructs a simplified did:key identifier from an Ed25519 public key JWK.
 *
 * NOTE: Simplified implementation for Iteration A only.
 * A fully spec-compliant did:key requires multibase+multicodec encoding
 * (0xed01 prefix + raw 32-byte key, base58btc with 'z' prefix).
 * The JWK 'x' field is the base64url-encoded raw Ed25519 public key.
 * Proper verification is not implemented until Iteration D.
 */
export function buildDid(publicKeyJwk: JsonWebKey): string {
  if (!publicKeyJwk.x) {
    throw new Error("Invalid public key JWK: missing x coordinate");
  }
  return `did:key:${publicKeyJwk.x}`;
}

/**
 * Builds an unsigned OB3 Verifiable Credential from goal + evidence data.
 * Returns a plain object ready to be signed and stored.
 */
export function buildUnsignedCredential(
  input: CredentialInput,
): Record<string, unknown> {
  const issuer: IssuerData = {
    id: iri(input.issuerDid),
    name: "rollercoaster.dev",
    url: iri("https://rollercoaster.dev"),
    did: input.issuerDid,
    publicKey: input.publicKeyJwk,
  };

  // NOTE (Iteration A): Appending a path segment to a did:key: identifier produces
  // an invalid DID URL — did:key: DIDs do not support path components per the spec.
  // A proper achievementId should be a separate HTTPS URI. Fixed in Iteration D.
  const achievementId = iri(
    `${input.issuerDid}/achievements/${encodeURIComponent(input.goal.id)}`,
  );

  // image is intentionally omitted — OB3 Achievement.image is OPTIONAL per spec.
  // A local file:// URI is not a valid or shareable IRI; a hosted URL would be
  // needed here. BadgeClassData requires image but the OB3 spec does not — cast
  // to suppress the type error until openbadges-core relaxes its type definition.
  // When the app gains a hosted badge image endpoint, add: image: iri(hostedUrl).
  const badgeClass = {
    id: achievementId,
    issuer: iri(input.issuerDid),
    name: input.goal.title,
    description: input.goal.description ?? `Achievement: ${input.goal.title}`,
    criteria: {
      narrative:
        input.evidence.length > 0
          ? `Complete all steps for: ${input.goal.title}. Evidence: ${input.evidence.length} ${input.evidence.length === 1 ? "item" : "items"}.`
          : `Complete all steps for: ${input.goal.title}`,
    },
  } as unknown as BadgeClassData;

  const assertion: AssertionData = {
    id: iri(input.credentialId),
    badgeClass: achievementId,
    recipient: {
      // Self-sovereign assertion: the user who earns the badge is also its issuer.
      // This is intentional for a local-first app — the device key identifies both roles.
      identity: input.issuerDid,
      type: "did",
      hashed: false,
    },
    issuedOn: input.issuedOn,
    evidence: input.evidence.map((ev) => ({
      id: iri(`urn:ulid:${ev.id}`),
      type: ["Evidence"],
      name:
        ev.stepTitle ??
        ev.description ??
        input.goal.title ??
        ev.type ??
        "Evidence",
      ...(ev.description ? { description: ev.description } : {}),
      ...(ev.type ? { genre: ev.type } : {}),
    })),
  };

  return serializeOB3(assertion, badgeClass, issuer) as unknown as Record<
    string,
    unknown
  >;
}
