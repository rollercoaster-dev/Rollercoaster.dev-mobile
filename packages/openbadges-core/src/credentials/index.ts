/**
 * Credentials Module
 *
 * Provides credential building and serialization for Open Badges 2.0 and 3.0.
 */

export {
  BadgeVersion,
  BADGE_VERSION_CONTEXTS,
  VC_V2_CONTEXT_URL,
  OBV3_CONTEXT_URL,
  detectBadgeVersion,
} from "./version.js";

export type {
  IssuerData,
  BadgeClassData,
  AssertionData,
  RecipientData,
  VerificationData,
  VerifiableCredentialData,
} from "./types.js";

export type { BadgeSerializer } from "./serializer.js";
export {
  OpenBadges2Serializer,
  OpenBadges3Serializer,
  createSerializer,
} from "./serializer.js";

export {
  buildCredential,
  serializeOB3,
  type CredentialOptions,
} from "./credential-builder.js";
