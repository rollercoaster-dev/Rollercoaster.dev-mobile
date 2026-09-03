/**
 * Type definitions for credential data structures
 *
 * Used for badge serialization, JSON-LD context handling, and credential building.
 *
 * @module credentials/types
 */

import type { Shared, OB2 } from "openbadges-types";

/**
 * Common data structure for issuers
 */
export interface IssuerData extends Record<string, unknown> {
  id: Shared.IRI;
  name: string | Shared.MultiLanguageString;
  url: Shared.IRI;
  email?: string;
  description?: string | Shared.MultiLanguageString;
  image?: Shared.IRI | string | Shared.OB3ImageObject | OB2.Image;
  telephone?: string;
  publicKey?: unknown;
  type?: string;
  did?: string;
}

/**
 * Common data structure for badge classes
 */
export interface BadgeClassData extends Record<string, unknown> {
  id: Shared.IRI;
  issuer: Shared.IRI | Record<string, unknown>;
  name: string | Shared.MultiLanguageString;
  description: string | Shared.MultiLanguageString;
  image: Shared.IRI | string | Shared.OB3ImageObject;
  criteria: unknown;
  alignment?: unknown[];
  tags?: string[];
  type?: string;
  achievementType?: string;
  creator?: Shared.IRI | Record<string, unknown>;
  resultDescriptions?: unknown[];
  version?: string;
  related?: unknown[];
  endorsement?: unknown[];
}

/**
 * Common data structure for assertions
 */
export interface AssertionData extends Record<string, unknown> {
  id: Shared.IRI;
  badgeClass: Shared.IRI;
  recipient: RecipientData;
  issuedOn: string;
  expires?: string;
  evidence?: unknown;
  verification?: VerificationData;
  credentialStatus?: unknown;
  revoked?: boolean;
  revocationReason?: string;
  type?: string | string[];
}

/**
 * Data structure for recipients
 */
export interface RecipientData {
  identity: string;
  type: string;
  hashed: boolean;
  salt?: string;
}

/**
 * Data structure for verification
 */
export interface VerificationData {
  type: string;
  creator?: string;
  created?: string;
  signatureValue?: string;
}

/**
 * Data structure for verifiable credentials
 */
export interface VerifiableCredentialData {
  "@context": string | string[];
  id: Shared.IRI;
  type: string | string[];
  // Optional, but always set by `OpenBadges3Serializer`. Requiredness would
  // enforce nothing on the producer (the serializer returns through a cast)
  // while telling every consumer the fields cannot be absent.
  name?: string | Shared.MultiLanguageString;
  issuer: Shared.IRI | Partial<IssuerData>;
  validFrom: string;
  validUntil?: string;
  credentialSubject: {
    id: Shared.IRI;
    type: string | string[];
    achievement: {
      id: Shared.IRI;
      type: string | string[];
      name: string | Shared.MultiLanguageString;
      description: string | Shared.MultiLanguageString;
      image: Shared.IRI | string | Shared.OB3ImageObject;
      criteria: unknown;
      issuer: Shared.IRI;
      alignments?: unknown[];
      tags?: string[];
      achievementType?: string;
      creator?: Shared.IRI | Record<string, unknown>;
      resultDescriptions?: unknown[];
    };
  };
  evidence?: unknown;
  // Array-only, deliberately: OB3 requires `proof` to be a list even with a
  // single entry, and this type has exactly one producer (the serializer) and
  // no parse path — nothing reads stored JSON back into it, so there is no
  // legacy singular shape to tolerate. Credentials persisted before the array
  // change are read as `OB3.VerifiableCredential` (openbadges-types), whose
  // `proof?: Proof` accepts either.
  proof?: Array<{
    type: string;
    /**
     * Cryptosuite for a DataIntegrityProof, e.g. `eddsa-rdfc-2022`. Optional
     * because OB3 permits other proof types; required by `DataIntegrityProof`
     * and switched on by `verifyDataIntegrityProof` (crypto/signature.ts).
     */
    cryptosuite?: string;
    created?: string;
    verificationMethod: string;
    proofPurpose: string;
    proofValue: string;
  }>;
  credentialStatus?: unknown;
}
