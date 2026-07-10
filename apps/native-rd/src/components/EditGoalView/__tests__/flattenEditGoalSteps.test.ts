import { flattenEditGoalSteps } from "../flattenEditGoalSteps";
import type { EditGoalStep } from "../EditGoalView";
import { EvidenceType } from "../../../db";

function step(
  id: string,
  title: string,
  subSteps?: EditGoalStep["subSteps"],
): EditGoalStep {
  return {
    id,
    title,
    plannedEvidenceTypes: [EvidenceType.text],
    subSteps,
  };
}

function sub(id: string, title: string) {
  return { id, title, plannedEvidenceTypes: [EvidenceType.text] };
}

describe("flattenEditGoalSteps", () => {
  it("flattens a flat root-only list", () => {
    const steps = [step("a", "A"), step("b", "B"), step("c", "C")];
    expect(flattenEditGoalSteps(steps)).toEqual([
      { id: "a", parentStepId: null },
      { id: "b", parentStepId: null },
      { id: "c", parentStepId: null },
    ]);
  });

  it("flattens a parent with three sub-steps in render order", () => {
    const steps = [
      step("a", "A", [sub("a1", "A1"), sub("a2", "A2"), sub("a3", "A3")]),
    ];
    expect(flattenEditGoalSteps(steps)).toEqual([
      { id: "a", parentStepId: null },
      { id: "a1", parentStepId: "a" },
      { id: "a2", parentStepId: "a" },
      { id: "a3", parentStepId: "a" },
    ]);
  });

  it("flattens two parents each with children", () => {
    const steps = [
      step("a", "A", [sub("a1", "A1")]),
      step("b", "B", [sub("b1", "B1"), sub("b2", "B2")]),
    ];
    expect(flattenEditGoalSteps(steps)).toEqual([
      { id: "a", parentStepId: null },
      { id: "a1", parentStepId: "a" },
      { id: "b", parentStepId: null },
      { id: "b1", parentStepId: "b" },
      { id: "b2", parentStepId: "b" },
    ]);
  });

  it("flattens an empty list to an empty array", () => {
    expect(flattenEditGoalSteps([])).toEqual([]);
  });

  it("flattens a parent with no sub-steps as just itself", () => {
    const steps = [step("a", "A", [])];
    expect(flattenEditGoalSteps(steps)).toEqual([
      { id: "a", parentStepId: null },
    ]);
  });
});
