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

    it("moves a child to the first position without promoting it", () => {
      // a {b, c} — move c before b; the root row above the slot must not make
      // the classifier interpret this as a promotion.
      const list = steps("a", ["b", "a"], ["c", "a"]);
      expect(classifyDrop(list, 2, 1)).toEqual({
        kind: "reorder",
        parentStepId: "a",
        orderedIds: ["c", "b"],
      });
    });

    it("moves a child to the last position of a group when another root follows", () => {
      // a {a1, a2}  b {b1} — drag a1 below a2. The slot's next row is root b,
      // but a1 must stay a child of a (a within-group reorder), NOT promote to
      // a root just because the row after the slot is a root. Regression for
      // "can't move a substep from 2nd-to-last to last".
      const list = steps("a", ["a1", "a"], ["a2", "a"], "b", ["b1", "b"]);
      expect(classifyDrop(list, 1, 2)).toEqual({
        kind: "reorder",
        parentStepId: "a",
        orderedIds: ["a2", "a1"],
      });
    });

    it("moves a middle child to the last position of a non-terminal group", () => {
      // a {a1, a2, a3}  b — drag a1 below a3 (hover a3, idx 3). a1 must land
      // last in a's group, not promote to a root before b.
      const list = steps("a", ["a1", "a"], ["a2", "a"], ["a3", "a"], "b");
      expect(classifyDrop(list, 1, 3)).toEqual({
        kind: "reorder",
        parentStepId: "a",
        orderedIds: ["a2", "a3", "a1"],
      });
    });

    it("moves a root with children below another root group", () => {
      const list = steps("a", ["a-child", "a"], "b", ["b-child", "b"]);
      expect(classifyDrop(list, 0, 3)).toEqual({
        kind: "reorder",
        parentStepId: null,
        orderedIds: ["b", "a"],
      });
    });

    it("moves a root group when hovering the target root itself", () => {
      const list = steps("a", ["a-child", "a"], "b", ["b-child", "b"]);
      expect(classifyDrop(list, 0, 2)).toEqual({
        kind: "reorder",
        parentStepId: null,
        orderedIds: ["b", "a"],
      });
    });

    it("does not reorder a root group over one of its own children", () => {
      const list = steps("a", ["a-child", "a"], "b");
      expect(classifyDrop(list, 0, 1)).toEqual({ kind: "none" });
    });
  });

  describe("promote (positional → root)", () => {
    it("dragging a leaf child to the top promotes it", () => {
      const list = steps("a", ["b", "a"], "c");
      // Drag b above its parent row (idx 0) to promote it.
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

    it("dropping a root leaf at the very end nests it into the trailing group", () => {
      // a  b {b1} — drag a (idx 0) past the end. The post-removal list is
      // [b, b1], so the drop slot has no row after it (atSlot is undefined) and
      // the parent falls back to the row above (b1's parent, b). Regression for
      // the end-of-list `?? aboveParent` fallback in atSlotParent.
      const list = steps("a", "b", ["b1", "b"]);
      expect(classifyDrop(list, 0, 2)).toEqual({
        kind: "reparent",
        stepId: "a",
        newParentStepId: "b",
      });
    });
  });

  describe("dwell-to-demote (armed target)", () => {
    it("nests a leaf root under a childless root", () => {
      const list = steps("a", "b");
      expect(classifyDrop(list, 1, 1, "a")).toEqual({
        kind: "reparent",
        stepId: "b",
        newParentStepId: "a",
      });
    });

    it("nests another leaf under a root that already has children", () => {
      const list = steps("a", ["x", "a"], "b");
      expect(classifyDrop(list, 2, 2, "a")).toEqual({
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
  });
});
