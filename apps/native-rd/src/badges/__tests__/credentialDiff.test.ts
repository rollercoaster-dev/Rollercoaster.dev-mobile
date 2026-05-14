/**
 * Tests for the rebake-policy detection helpers.
 */
import {
  designChangedSinceBake,
  evidenceIdsDifferFromCredential,
  shouldRebake,
} from "../credentialDiff";

const credentialWith = (evidenceIds: string[]) =>
  JSON.stringify({
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential"],
    evidence: evidenceIds.map((id) => ({
      id: `urn:ulid:${id}`,
      type: ["Evidence"],
    })),
  });

describe("evidenceIdsDifferFromCredential", () => {
  it("returns false when current evidence matches the credential set", () => {
    const cred = credentialWith(["ev-1", "ev-2"]);
    expect(
      evidenceIdsDifferFromCredential(cred, [{ id: "ev-1" }, { id: "ev-2" }]),
    ).toBe(false);
  });

  it("ignores order — sets, not arrays", () => {
    const cred = credentialWith(["ev-1", "ev-2"]);
    expect(
      evidenceIdsDifferFromCredential(cred, [{ id: "ev-2" }, { id: "ev-1" }]),
    ).toBe(false);
  });

  it("returns true when an evidence item was added", () => {
    const cred = credentialWith(["ev-1"]);
    expect(
      evidenceIdsDifferFromCredential(cred, [{ id: "ev-1" }, { id: "ev-2" }]),
    ).toBe(true);
  });

  it("returns true when an evidence item was removed", () => {
    const cred = credentialWith(["ev-1", "ev-2"]);
    expect(evidenceIdsDifferFromCredential(cred, [{ id: "ev-1" }])).toBe(true);
  });

  it("returns true when an evidence ID was replaced", () => {
    const cred = credentialWith(["ev-1"]);
    expect(evidenceIdsDifferFromCredential(cred, [{ id: "ev-2" }])).toBe(true);
  });

  it("returns true when current evidence is empty but credential has any", () => {
    const cred = credentialWith(["ev-1"]);
    expect(evidenceIdsDifferFromCredential(cred, [])).toBe(true);
  });

  it("returns false when both credential and current evidence are empty", () => {
    const cred = credentialWith([]);
    expect(evidenceIdsDifferFromCredential(cred, [])).toBe(false);
  });

  it("returns true when credential is empty but current evidence has items", () => {
    const cred = credentialWith([]);
    expect(evidenceIdsDifferFromCredential(cred, [{ id: "ev-1" }])).toBe(true);
  });

  it("treats credentials with no evidence array as empty (no evidence baked in)", () => {
    const cred = JSON.stringify({ "@context": [], type: [] });
    expect(evidenceIdsDifferFromCredential(cred, [])).toBe(false);
    expect(evidenceIdsDifferFromCredential(cred, [{ id: "ev-1" }])).toBe(true);
  });

  it("throws on malformed credential JSON — safer than silently saying 'no change'", () => {
    expect(() => evidenceIdsDifferFromCredential("{not json", [])).toThrow();
  });

  it("strips the urn:ulid: prefix when comparing IDs", () => {
    // Direct prefix match — credential stores `urn:ulid:ev-1`, DB has `ev-1`
    const cred = credentialWith(["ev-1"]);
    expect(evidenceIdsDifferFromCredential(cred, [{ id: "ev-1" }])).toBe(false);
  });
});

describe("designChangedSinceBake", () => {
  it("returns false when timestamps are equal", () => {
    const ts = "2026-05-14T10:00:00.000Z";
    expect(designChangedSinceBake({ createdAt: ts, updatedAt: ts })).toBe(
      false,
    );
  });

  it("returns true when updatedAt is meaningfully after createdAt", () => {
    expect(
      designChangedSinceBake({
        createdAt: "2026-05-14T10:00:00.000Z",
        updatedAt: "2026-05-14T10:05:00.000Z",
      }),
    ).toBe(true);
  });

  it("returns false when updatedAt is null", () => {
    expect(
      designChangedSinceBake({
        createdAt: "2026-05-14T10:00:00.000Z",
        updatedAt: null,
      }),
    ).toBe(false);
  });

  it("returns false when createdAt is null", () => {
    expect(
      designChangedSinceBake({
        createdAt: null,
        updatedAt: "2026-05-14T10:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("ignores sub-second skew (no-op writes can bump updatedAt slightly)", () => {
    expect(
      designChangedSinceBake({
        createdAt: "2026-05-14T10:00:00.000Z",
        updatedAt: "2026-05-14T10:00:00.500Z",
      }),
    ).toBe(false);
  });

  it("returns false on unparseable timestamps", () => {
    expect(
      designChangedSinceBake({
        createdAt: "not-a-date",
        updatedAt: "also-not",
      }),
    ).toBe(false);
  });
});

describe("shouldRebake", () => {
  const baseBadge = {
    credential: credentialWith(["ev-1"]),
    createdAt: "2026-05-14T10:00:00.000Z",
    updatedAt: "2026-05-14T10:00:00.000Z",
  };

  it("returns false when evidence and design are both unchanged", () => {
    expect(shouldRebake(baseBadge, [{ id: "ev-1" }])).toBe(false);
  });

  it("returns true when evidence changed even if design did not", () => {
    expect(shouldRebake(baseBadge, [{ id: "ev-1" }, { id: "ev-2" }])).toBe(
      true,
    );
  });

  it("returns true when design changed even if evidence did not", () => {
    expect(
      shouldRebake({ ...baseBadge, updatedAt: "2026-05-14T10:10:00.000Z" }, [
        { id: "ev-1" },
      ]),
    ).toBe(true);
  });

  it("returns true when both evidence and design changed", () => {
    expect(
      shouldRebake({ ...baseBadge, updatedAt: "2026-05-14T10:10:00.000Z" }, [
        { id: "ev-2" },
      ]),
    ).toBe(true);
  });
});
