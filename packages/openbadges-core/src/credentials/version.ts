/**
 * Badge version detection and context URL constants for Open Badges
 *
 * Supports OB 2.0 and OB 3.0 (VC Data Model 2.0) badge versions.
 *
 * @module credentials/version
 */

export enum BadgeVersion {
  V2 = "2.0",
  V3 = "3.0",
}

/** W3C Verifiable Credentials Data Model 2.0 context URL — required as first context in OB3 credentials */
export const VC_V2_CONTEXT_URL = "https://www.w3.org/ns/credentials/v2";

/** W3C Verifiable Credentials Data Model 1.1 context URL — legacy, still valid for OB3 */
export const VC_V1_CONTEXT_URL = "https://www.w3.org/2018/credentials/v1";

/** Open Badges 3.0 context URL (versioned) — canonical URL for OB3 context */
export const OBV3_CONTEXT_URL =
  "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json";

/** Open Badges 3.0 context URL (unversioned) — also valid, resolves to latest */
export const OBV3_CONTEXT_URL_UNVERSIONED =
  "https://purl.imsglobal.org/spec/ob/v3p0/context.json";

/**
 * Badge version context URLs
 *
 * For OB3 (VC Data Model 2.0), the @context array order is critical:
 * 1. VC 2.0 context MUST be first
 * 2. OB3 context second
 *
 * @see https://www.w3.org/TR/vc-data-model-2.0/#contexts
 */
export const BADGE_VERSION_CONTEXTS = {
  [BadgeVersion.V2]: "https://w3id.org/openbadges/v2",
  [BadgeVersion.V3]: [VC_V2_CONTEXT_URL, OBV3_CONTEXT_URL],
};

/** All known OB3 context URLs (versioned and unversioned) */
const OB3_CONTEXT_URLS = [OBV3_CONTEXT_URL, OBV3_CONTEXT_URL_UNVERSIONED];

/**
 * Check if a value is a known OB3 context URL
 */
function isOB3Context(url: unknown): boolean {
  return typeof url === "string" && OB3_CONTEXT_URLS.includes(url);
}

/**
 * Detects the Open Badges version from a JSON-LD object.
 *
 * Recognizes OB3 credentials using either VC v1.1 or v2.0 context,
 * and both versioned and unversioned OB3 context URLs.
 *
 * @param obj The JSON-LD object to check
 * @returns The detected badge version or undefined if not detected
 */
export function detectBadgeVersion(
  obj: Record<string, unknown>,
): BadgeVersion | undefined {
  if (!obj || typeof obj !== "object") {
    return undefined;
  }

  const context = obj["@context"];
  if (!context) {
    return undefined;
  }

  // Handle array context
  if (Array.isArray(context)) {
    if (context.some(isOB3Context)) {
      return BadgeVersion.V3;
    }
    if (context.includes(BADGE_VERSION_CONTEXTS[BadgeVersion.V2])) {
      return BadgeVersion.V2;
    }
    return undefined;
  }

  // Handle string context
  if (typeof context === "string") {
    if (context === BADGE_VERSION_CONTEXTS[BadgeVersion.V2]) {
      return BadgeVersion.V2;
    }
    if (isOB3Context(context)) {
      return BadgeVersion.V3;
    }
  }

  return undefined;
}
