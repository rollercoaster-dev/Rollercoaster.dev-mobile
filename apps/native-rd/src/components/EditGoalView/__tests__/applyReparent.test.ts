import { applyReparent } from "../applyReparent";
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

describe("applyReparent", () => {
  it("promotes a child to the end of the root array and removes it from the source parent", () => {
    const steps = [
      step("a", "A", [sub("a1", "A1"), sub("a2", "A2")]),
      step("b", "B"),
    ];
    const result = applyReparent(steps, "a1", null);
    expect(result.map((s) => s.id)).toEqual(["a", "b", "a1"]);
    const a = result.find((s) => s.id === "a");
    expect(a?.subSteps?.map((ss) => ss.id)).toEqual(["a2"]);
    const promoted = result.find((s) => s.id === "a1");
    expect(promoted?.subSteps).toEqual([]);
  });

  it("demotes a leaf root to the end of the target parent's sub-steps", () => {
    const steps = [step("a", "A", [sub("a1", "A1")]), step("b", "B")];
    const result = applyReparent(steps, "b", "a");
    expect(result.map((s) => s.id)).toEqual(["a"]);
    const a = result.find((s) => s.id === "a");
    expect(a?.subSteps?.map((ss) => ss.id)).toEqual(["a1", "b"]);
    expect(result.find((s) => s.id === "b")).toBeUndefined();
  });

  it("moves a child between parents, appending to the destination's sub-steps", () => {
    const steps = [
      step("a", "A", [sub("a1", "A1"), sub("a2", "A2")]),
      step("b", "B", [sub("b1", "B1")]),
    ];
    const result = applyReparent(steps, "a2", "b");
    const a = result.find((s) => s.id === "a");
    const b = result.find((s) => s.id === "b");
    expect(a?.subSteps?.map((ss) => ss.id)).toEqual(["a1"]);
    expect(b?.subSteps?.map((ss) => ss.id)).toEqual(["b1", "a2"]);
  });

  it("refuses to demote a parent-with-children (one-level cap) and returns the input unchanged", () => {
    const steps = [step("a", "A", [sub("a1", "A1")]), step("b", "B")];
    const result = applyReparent(steps, "a", "b");
    expect(result.map((s) => s.id)).toEqual(["a", "b"]);
    expect(
      result.find((s) => s.id === "a")?.subSteps?.map((ss) => ss.id),
    ).toEqual(["a1"]);
  });

  it("refuses to nest a step under itself and returns the input unchanged", () => {
    const steps = [step("a", "A"), step("b", "B")];
    const result = applyReparent(steps, "a", "a");
    expect(result.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("refuses to nest under a non-existent parent and returns the input unchanged", () => {
    const steps = [step("a", "A")];
    const result = applyReparent(steps, "a", "nope");
    expect(result.map((s) => s.id)).toEqual(["a"]);
  });

  it("does not mutate the input array", () => {
    const steps = [step("a", "A", [sub("a1", "A1")]), step("b", "B")];
    const snapshot = JSON.parse(JSON.stringify(steps));
    applyReparent(steps, "a1", null);
    expect(steps).toEqual(snapshot);
  });
});
