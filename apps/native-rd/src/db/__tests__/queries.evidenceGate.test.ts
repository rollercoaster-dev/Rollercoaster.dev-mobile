/**
 * The strict evidence tier (#635).
 *
 * `canCompleteStep` / `canCompleteGoal` are the data-layer floors and are
 * covered in `queries.step.test.ts` / `queries.evidence.test.ts`. These are the
 * tier above them — what the "Mark complete" reveal and the Bake CTA gate on.
 */

import { isStepEvidenceComplete, isGoalEvidenceComplete } from "../queries";
import { EvidenceType, type StepId } from "../schema";
import {
  isEvidencePlanSatisfied,
  type EvidenceTypeValue,
} from "../../types/evidence";

/** A step row as `stepsByGoalQuery` returns it, narrowed to what the gate reads. */
function step(id: string, plannedEvidenceTypes: string | null = null) {
  return { id: id as StepId, plannedEvidenceTypes };
}

/** An evidence row as `stepEvidenceByGoalQuery` returns it. */
function evidence(stepId: string | null, type: string | null) {
  return { stepId: stepId as StepId | null, type };
}

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

describe("isStepEvidenceComplete", () => {
  test.each([
    // An unset plan resolves to the default ["text"] (#466 D4) — it is not an
    // exemption, so a step with nothing captured is not complete.
    ["null plan, no evidence", null, [], false],
    ["null plan, text captured", null, [{ type: "text" }], true],
    ["null plan, photo captured", null, [{ type: "photo" }], false],
    ["explicit plan, nothing captured", '["photo"]', [], false],
    ["explicit plan, satisfied", '["photo"]', [{ type: "photo" }], true],
    // The tier's whole point: `canCompleteStep` says true here, this says false.
    [
      "two planned types, one captured",
      '["photo","video"]',
      [{ type: "video" }],
      false,
    ],
    [
      "two planned types, both captured",
      '["photo","video"]',
      [{ type: "video" }, { type: "photo" }],
      true,
    ],
    ["null-type evidence does not count", null, [{ type: null }], false],
    // Unknown keys normalize to `file` on both sides, same as canCompleteStep.
    [
      "unknown planned type met by file",
      '["sketch"]',
      [{ type: "file" }],
      true,
    ],
    [
      "unknown planned type unmet by an unrelated known type",
      '["sketch"]',
      [{ type: "photo" }],
      false,
    ],
    ["malformed JSON falls back to the default plan", "not-json", [], false],
  ])("%s → %s", (_label, plannedJson, stepEvidence, expected) => {
    expect(isStepEvidenceComplete(plannedJson, stepEvidence)).toBe(expected);
  });
});

describe("isGoalEvidenceComplete", () => {
  test("a goal with no steps is not complete (D3 — no vacuous truth)", () => {
    expect(isGoalEvidenceComplete([], [])).toBe(false);
  });

  test("a goal with no steps stays incomplete even with evidence rows", () => {
    expect(isGoalEvidenceComplete([], [evidence("s1", "text")])).toBe(false);
  });

  test("one step, its planned evidence captured → complete", () => {
    expect(
      isGoalEvidenceComplete([step("s1")], [evidence("s1", EvidenceType.text)]),
    ).toBe(true);
  });

  test("one step, nothing captured → incomplete", () => {
    expect(isGoalEvidenceComplete([step("s1")], [])).toBe(false);
  });

  test("evidence filed under a different step does not satisfy this one", () => {
    expect(
      isGoalEvidenceComplete(
        [step("s1"), step("s2")],
        [evidence("s1", EvidenceType.text), evidence("s1", EvidenceType.photo)],
      ),
    ).toBe(false);
  });

  test("every step satisfied → complete", () => {
    expect(
      isGoalEvidenceComplete(
        [step("s1"), step("s2", '["photo"]')],
        [evidence("s1", EvidenceType.text), evidence("s2", EvidenceType.photo)],
      ),
    ).toBe(true);
  });

  test("a step whose plan is only partly captured blocks the goal", () => {
    expect(
      isGoalEvidenceComplete(
        [step("s1", '["text","photo"]')],
        [evidence("s1", EvidenceType.text)],
      ),
    ).toBe(false);
  });

  // The exact case from #635: six steps, one text note on step 1. The old floor
  // (`canCompleteGoal`) mints a badge here.
  test("six steps with one note on step 1 → incomplete", () => {
    const steps = ["s1", "s2", "s3", "s4", "s5", "s6"].map((id) => step(id));
    expect(
      isGoalEvidenceComplete(steps, [evidence("s1", EvidenceType.text)]),
    ).toBe(false);
  });

  // Goal-scoped rows (the closing note) arrive with a null stepId when a caller
  // passes a mixed array. They can never satisfy a step's plan.
  test("goal-scoped evidence (null stepId) does not satisfy any step", () => {
    expect(
      isGoalEvidenceComplete([step("s1")], [evidence(null, EvidenceType.text)]),
    ).toBe(false);
  });

  test("null-type rows do not satisfy a step", () => {
    expect(isGoalEvidenceComplete([step("s1")], [evidence("s1", null)])).toBe(
      false,
    );
  });
});
