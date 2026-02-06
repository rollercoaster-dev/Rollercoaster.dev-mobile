import { describe, expect, it } from "bun:test";
import {
  BadgeVersion,
  BADGE_VERSION_CONTEXTS,
  VC_V2_CONTEXT_URL,
  VC_V1_CONTEXT_URL,
  OBV3_CONTEXT_URL,
  OBV3_CONTEXT_URL_UNVERSIONED,
  detectBadgeVersion,
} from "../../src/credentials/version";

describe("BadgeVersion", () => {
  it("should have V2 and V3 values", () => {
    expect(BadgeVersion.V2).toBe("2.0");
    expect(BadgeVersion.V3).toBe("3.0");
  });
});

describe("BADGE_VERSION_CONTEXTS", () => {
  it("should have OB2 string context", () => {
    expect(BADGE_VERSION_CONTEXTS[BadgeVersion.V2]).toBe(
      "https://w3id.org/openbadges/v2",
    );
  });

  it("should have OB3 context array with VC 2.0 first", () => {
    const v3Context = BADGE_VERSION_CONTEXTS[BadgeVersion.V3];
    expect(Array.isArray(v3Context)).toBe(true);
    expect(v3Context[0]).toBe(VC_V2_CONTEXT_URL);
    expect(v3Context[1]).toBe(OBV3_CONTEXT_URL);
  });
});

describe("detectBadgeVersion", () => {
  it("should detect OB2 from string context", () => {
    const result = detectBadgeVersion({
      "@context": "https://w3id.org/openbadges/v2",
    });
    expect(result).toBe(BadgeVersion.V2);
  });

  it("should detect OB2 from array context", () => {
    const result = detectBadgeVersion({
      "@context": ["https://w3id.org/openbadges/v2"],
    });
    expect(result).toBe(BadgeVersion.V2);
  });

  it("should return undefined for VC 2.0 context alone (not OB3-specific)", () => {
    const result = detectBadgeVersion({
      "@context": VC_V2_CONTEXT_URL,
    });
    expect(result).toBeUndefined();
  });

  it("should detect OB3 from string context (OB3 URL)", () => {
    const result = detectBadgeVersion({
      "@context": OBV3_CONTEXT_URL,
    });
    expect(result).toBe(BadgeVersion.V3);
  });

  it("should detect OB3 from standard array context", () => {
    const result = detectBadgeVersion({
      "@context": [VC_V2_CONTEXT_URL, OBV3_CONTEXT_URL],
    });
    expect(result).toBe(BadgeVersion.V3);
  });

  it("should return undefined for missing context", () => {
    expect(detectBadgeVersion({})).toBeUndefined();
  });

  it("should return undefined for null/invalid input", () => {
    expect(
      detectBadgeVersion(null as unknown as Record<string, unknown>),
    ).toBeUndefined();
  });

  it("should return undefined for unknown context", () => {
    expect(
      detectBadgeVersion({ "@context": "https://unknown.example.com" }),
    ).toBeUndefined();
  });

  it("should detect OB3 from VC v1.1 context + OB3 unversioned URL", () => {
    const result = detectBadgeVersion({
      "@context": [VC_V1_CONTEXT_URL, OBV3_CONTEXT_URL_UNVERSIONED],
    });
    expect(result).toBe(BadgeVersion.V3);
  });

  it("should detect OB3 from VC v1.1 context + OB3 versioned URL", () => {
    const result = detectBadgeVersion({
      "@context": [VC_V1_CONTEXT_URL, OBV3_CONTEXT_URL],
    });
    expect(result).toBe(BadgeVersion.V3);
  });

  it("should detect OB3 from unversioned OB3 context URL alone", () => {
    const result = detectBadgeVersion({
      "@context": OBV3_CONTEXT_URL_UNVERSIONED,
    });
    expect(result).toBe(BadgeVersion.V3);
  });
});
