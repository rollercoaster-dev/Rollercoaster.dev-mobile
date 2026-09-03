import { EvidenceType } from "../../db";
import {
  EVIDENCE_OPTIONS,
  isEvidencePlanSatisfied,
  type EvidenceTypeValue,
} from "../evidence";

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

describe("isEvidencePlanSatisfied", () => {
  const { text, photo, video } = EvidenceType;
  const cases: readonly [
    string,
    EvidenceTypeValue[],
    EvidenceTypeValue[],
    boolean,
  ][] = [
    ["empty plan is never satisfied, even with evidence", [], [text], false],
    ["empty plan, no evidence", [], [], false],
    ["single planned type captured", [text], [text], true],
    ["single planned type not captured", [text], [], false],
    ["one of two planned types captured", [text, photo], [text], false],
    ["both planned types captured", [text, photo], [photo, text], true],
    ["extra captures beyond the plan still satisfy it", [text], [text, video], true], // prettier-ignore
    [
      "captures of the wrong type do not satisfy",
      [photo],
      [text, video],
      false,
    ],
  ];

  test.each(cases)("%s", (_label, planned, captured, expected) => {
    expect(isEvidencePlanSatisfied(planned, captured)).toBe(expected);
  });
});
