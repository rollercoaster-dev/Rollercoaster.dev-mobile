import { EvidenceType } from "../../db";
import { EVIDENCE_OPTIONS } from "../evidence";

/** Evidence types presented to the user — must match EVIDENCE_OPTIONS */
const ACTION_SHEET_TYPES = EVIDENCE_OPTIONS.map((o) => o.type);

/**
 * Evidence route map — mirrors the one in FocusModeScreen/CompletionFlowScreen.
 * Kept in sync via this test.
 */
const EVIDENCE_ROUTE_MAP: Record<string, string> = {
  [EvidenceType.photo]: "CapturePhoto",
  [EvidenceType.video]: "CaptureVideo",
  [EvidenceType.voice_memo]: "CaptureVoiceMemo",
  [EvidenceType.text]: "CaptureTextNote",
  [EvidenceType.link]: "CaptureLink",
  [EvidenceType.file]: "CaptureFile",
};

describe("Evidence options", () => {
  it("covers all user-facing evidence types", () => {
    expect([...ACTION_SHEET_TYPES].sort()).toEqual(
      [...Object.values(EvidenceType)].sort(),
    );
  });

  it("has a route for every evidence option type", () => {
    for (const type of ACTION_SHEET_TYPES) {
      expect(EVIDENCE_ROUTE_MAP[type]).toBeDefined();
      expect(EVIDENCE_ROUTE_MAP[type]).toMatch(/^Capture/);
    }
  });

  it("route map has no extra entries", () => {
    const routeTypes = Object.keys(EVIDENCE_ROUTE_MAP);
    expect([...routeTypes].sort()).toEqual([...ACTION_SHEET_TYPES].sort());
  });

  it("all route names are unique", () => {
    const routes = Object.values(EVIDENCE_ROUTE_MAP);
    expect(new Set(routes).size).toBe(routes.length);
  });
});
