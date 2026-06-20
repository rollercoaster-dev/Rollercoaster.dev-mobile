import { classifyDrop, type ClassifyStep } from "../classifyDrop";

/**
 * Build a flat render-order list. Each entry is `id` for a root, or
 * `[id, parentId]` for a child. Children must follow their parent (render
 * order), mirroring what `flattenGroupedSteps` produces.
 */
function steps(...spec: (string | [string, string])[]): ClassifyStep[] {
  return spec.map((s) =>
    typeof s === "string"
      ? { id: s, parentStepId: null }
      : { id: s[0], parentStepId: s[1] },
  );
}

describe("classifyDrop", () => {
  describe("no-op", () => {
    it("dragged rests in place with no armed target", () => {
      const list = steps("a", "b", "c");
      expect(classifyDrop(list, 1, 1)).toEqual({ kind: "none" });
    });

    it("out-of-range dragged index", () => {
      const list = steps("a", "b");
      expect(classifyDrop(list, 9, 0)).toEqual({ kind: "none" });
    });
  });

  describe("sibling reorder (parent unchanged)", () => {
    it("reorders roots: move first root to last", () => {
      const list = steps("a", "b", "c");
      expect(classifyDrop(list, 0, 2)).toEqual({
        kind: "reorder",
        parentStepId: null,
        orderedIds: ["b", "c", "a"],
      });
    });

    it("reorders children within their group", () => {
      // a {b, c}  — swap b and c by dragging b below c
      const list = steps("a", ["b", "a"], ["c", "a"]);
      expect(classifyDrop(list, 1, 2)).toEqual({
        kind: "reorder",
        parentStepId: "a",
        orderedIds: ["c", "b"],
      });
    });
  });

  describe("promote (positional → root)", () => {
    it("dragging a leaf child to the top promotes it", () => {
      const list = steps("a", ["b", "a"], "c");
      // drag b (idx 1) to the top (idx 0): row above = none → root
      expect(classifyDrop(list, 1, 0)).toEqual({
        kind: "reparent",
        stepId: "b",
        newParentStepId: null,
      });
    });
  });

  describe("positional demote into an existing group", () => {
    it("dropping a root leaf among another root's children nests it", () => {
      // a {b}  c  — drag c (idx 2) to rest after b (idx 2 slot), row above = b (child of a)
      const list = steps("a", ["b", "a"], "c");
      expect(classifyDrop(list, 2, 2)).toEqual({
        kind: "reparent",
        stepId: "c",
        newParentStepId: "a",
      });
    });
  });

  describe("dwell-to-demote (armed target)", () => {
    it("nesting a leaf root under a childless root", () => {
      const list = steps("a", "b");
      expect(classifyDrop(list, 1, 1, "a")).toEqual({
        kind: "reparent",
        stepId: "b",
        newParentStepId: "a",
      });
    });
  });

  describe("refused drops (one-level cap)", () => {
    it("armed demote of a parent-with-children is refused", () => {
      // a {x}  b  — drag a (a parent) and dwell on b → would create grandchildren
      const list = steps("a", ["x", "a"], "b");
      expect(classifyDrop(list, 0, 0, "b")).toEqual({ kind: "none" });
    });

    it("armed target that is not a root is refused", () => {
      // a {x}  b — dwell on child x while dragging b
      const list = steps("a", ["x", "a"], "b");
      expect(classifyDrop(list, 2, 2, "x")).toEqual({ kind: "none" });
    });

    it("armed target equal to dragged step is refused", () => {
      const list = steps("a", "b");
      expect(classifyDrop(list, 0, 0, "a")).toEqual({ kind: "none" });
    });

    it("positional demote of a parent-with-children is refused", () => {
      // a {x}  b {y} — drag a (parent) to rest among b's children → refused
      const list = steps("a", ["x", "a"], "b", ["y", "b"]);
      // drop a at index 3 (row above in working = y, child of b)
      expect(classifyDrop(list, 0, 3)).toEqual({ kind: "none" });
    });
  });
});
