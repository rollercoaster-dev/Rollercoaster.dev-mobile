/**
 * Tests for the reorder logic used in StepList drag-to-reorder.
 * Extracted as pure functions to test without React rendering.
 */

interface Step {
  id: string;
  title: string;
  completed: boolean;
}

function makeSteps(count: number): Step[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `step-${i}`,
    title: `Step ${i + 1}`,
    completed: false,
  }));
}

/** Reorder by moving item at draggedIndex to hoverIndex (same logic as StepList) */
function reorder(
  steps: Step[],
  draggedIndex: number,
  hoverIndex: number,
): string[] {
  const newOrder = [...steps];
  const [moved] = newOrder.splice(draggedIndex, 1);
  newOrder.splice(hoverIndex, 0, moved);
  return newOrder.map((s) => s.id);
}

/** Calculate hover index from translation (same logic as StepList) */
function calcHoverIndex(
  draggedIndex: number,
  translationY: number,
  itemHeight: number,
  total: number,
): number {
  const offset = Math.round(translationY / itemHeight);
  return Math.max(0, Math.min(total - 1, draggedIndex + offset));
}

/** Move step up by swapping with previous (same logic as StepList) */
function moveUp(steps: Step[], index: number): string[] {
  const newOrder = [...steps];
  [newOrder[index - 1], newOrder[index]] = [
    newOrder[index],
    newOrder[index - 1],
  ];
  return newOrder.map((s) => s.id);
}

/** Move step down by swapping with next (same logic as StepList) */
function moveDown(steps: Step[], index: number): string[] {
  const newOrder = [...steps];
  [newOrder[index], newOrder[index + 1]] = [
    newOrder[index + 1],
    newOrder[index],
  ];
  return newOrder.map((s) => s.id);
}

describe("reorder logic", () => {
  describe("drag reorder", () => {
    it("moves first item to last position", () => {
      const steps = makeSteps(4);
      const result = reorder(steps, 0, 3);
      expect(result).toEqual(["step-1", "step-2", "step-3", "step-0"]);
    });

    it("moves last item to first position", () => {
      const steps = makeSteps(4);
      const result = reorder(steps, 3, 0);
      expect(result).toEqual(["step-3", "step-0", "step-1", "step-2"]);
    });

    it("moves middle item up one position", () => {
      const steps = makeSteps(4);
      const result = reorder(steps, 2, 1);
      expect(result).toEqual(["step-0", "step-2", "step-1", "step-3"]);
    });

    it("moves middle item down one position", () => {
      const steps = makeSteps(4);
      const result = reorder(steps, 1, 2);
      expect(result).toEqual(["step-0", "step-2", "step-1", "step-3"]);
    });

    it("no-op when dragged to same position", () => {
      const steps = makeSteps(3);
      const result = reorder(steps, 1, 1);
      expect(result).toEqual(["step-0", "step-1", "step-2"]);
    });

    it("works with two items", () => {
      const steps = makeSteps(2);
      const result = reorder(steps, 0, 1);
      expect(result).toEqual(["step-1", "step-0"]);
    });
  });

  describe("calcHoverIndex", () => {
    const itemHeight = 48;

    it("returns same index for zero translation", () => {
      expect(calcHoverIndex(2, 0, itemHeight, 5)).toBe(2);
    });

    it("moves down for positive translation", () => {
      expect(calcHoverIndex(0, 96, itemHeight, 5)).toBe(2);
    });

    it("moves up for negative translation", () => {
      expect(calcHoverIndex(3, -96, itemHeight, 5)).toBe(1);
    });

    it("clamps to 0 for large negative translation", () => {
      expect(calcHoverIndex(1, -500, itemHeight, 5)).toBe(0);
    });

    it("clamps to last index for large positive translation", () => {
      expect(calcHoverIndex(1, 500, itemHeight, 5)).toBe(4);
    });

    it("rounds to nearest item", () => {
      expect(calcHoverIndex(0, 30, itemHeight, 5)).toBe(1); // 30/48 rounds to 1
      expect(calcHoverIndex(0, 20, itemHeight, 5)).toBe(0); // 20/48 rounds to 0
    });
  });

  describe("accessible move up/down", () => {
    it("moves step up by swapping with previous", () => {
      const steps = makeSteps(3);
      const result = moveUp(steps, 1);
      expect(result).toEqual(["step-1", "step-0", "step-2"]);
    });

    it("moves step down by swapping with next", () => {
      const steps = makeSteps(3);
      const result = moveDown(steps, 1);
      expect(result).toEqual(["step-0", "step-2", "step-1"]);
    });

    it("moves first step down", () => {
      const steps = makeSteps(3);
      const result = moveDown(steps, 0);
      expect(result).toEqual(["step-1", "step-0", "step-2"]);
    });

    it("moves last step up", () => {
      const steps = makeSteps(3);
      const result = moveUp(steps, 2);
      expect(result).toEqual(["step-0", "step-2", "step-1"]);
    });
  });
});
