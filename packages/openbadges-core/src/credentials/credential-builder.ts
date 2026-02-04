/**
 * High-level credential building API
 *
 * @module credentials/credential-builder
 */

import { createSerializer } from "./serializer.js";
import { BadgeVersion } from "./version.js";
import type {
  IssuerData,
  BadgeClassData,
  AssertionData,
  VerifiableCredentialData,
} from "./types.js";

/**
 * Options for building an Open Badges credential.
 * @property assertion - The assertion data containing recipient and issuance info
 * @property badgeClass - The badge class/achievement definition
 * @property issuer - The issuer profile data
 * @property version - Target badge version (defaults to V3/OB3)
 */
export interface CredentialOptions {
  assertion: AssertionData;
  badgeClass: BadgeClassData;
  issuer: IssuerData;
  version?: BadgeVersion;
}

/**
 * Builds an Open Badges credential from component data.
 * Defaults to OB3 (VerifiableCredential) format.
 *
 * @param options - Configuration containing assertion, badgeClass, issuer, and optional version
 * @returns An OB2 Assertion or OB3 VerifiableCredential based on the specified version
 */
export function buildCredential(
  options: CredentialOptions,
):
  | (AssertionData & { "@context": string | string[]; type: string | string[] })
  | VerifiableCredentialData {
  const version = options.version ?? BadgeVersion.V3;
  const serializer = createSerializer(version);
  return serializer.serializeAssertion(
    options.assertion,
    options.badgeClass,
    options.issuer,
  );
}

/**
 * Serializes data directly to OB3 VerifiableCredential format.
 */
export function serializeOB3(
  assertion: AssertionData,
  badgeClass: BadgeClassData,
  issuer: IssuerData,
): VerifiableCredentialData {
  const serializer = createSerializer(BadgeVersion.V3);
  return serializer.serializeAssertion(
    assertion,
    badgeClass,
    issuer,
  ) as VerifiableCredentialData;
}
