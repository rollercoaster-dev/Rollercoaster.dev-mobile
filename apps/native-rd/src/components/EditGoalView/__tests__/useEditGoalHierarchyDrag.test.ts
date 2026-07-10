/**
 * Unit tests for useEditGoalHierarchyDrag dispatch wiring + canDrag + geometry
 * normalization (issue #496, Step 2). These cover the coordinator's dispatch
 * paths and the R13 canDrag derivation / lone-child promote regression. They do
 * NOT re-test classifyDrop's own guards (review #6) — only the wiring from
 * flat-list + armed target → callback dispatch.
 *
 * The hook is driven directly via its returned handlers with injected row
 * geometry (registerRowLayout), so no native gesture runtime is needed.
 */
import { renderHook, act } from "../../../__tests__/test-utils";
import { AccessibilityInfo } from "react-native";
import { useEditGoalHierarchyDrag } from "../useEditGoalHierarchyDrag";
import type { EditGoalStep } from "../EditGoalView";
import { EvidenceType } from "../../../db";

jest.mock("../../../utils/haptics", () => ({
  triggerDragStart: jest.fn(),
  triggerDragDrop: jest.fn(),
}));

function step(
  id: string,
  title: string,
  subSteps?: EditGoalStep["subSteps"],
): EditGoalStep {
  return { id, title, plannedEvidenceTypes: [EvidenceType.text], subSteps };
}
function sub(id: string, title: string) {
  return { id, title, plannedEvidenceTypes: [EvidenceType.text] };
}

// Register a uniform-height grid of rows starting at originY=0 (list-local =
// absolute since listOrigin defaults to 0). Each row is 50px tall.
function registerGrid(
  result: ReturnType<typeof useEditGoalHierarchyDrag>,
  flatIds: string[],
  height = 50,
) {
  for (let i = 0; i < flatIds.length; i++) {
    result.registerRowLayout(flatIds[i], {
      absoluteY: i * height,
      height,
    });
  }
}

describe("useEditGoalHierarchyDrag", () => {
  const announce = jest
    .spyOn(AccessibilityInfo, "announceForAccessibility")
    .mockImplementation(() => {});
  afterEach(() => announce.mockClear());

  describe("sibling reorder dispatch", () => {
    it("dispatches onReorderSteps for a root reorder", () => {
      const onReorderSteps = jest.fn();
      const onReorderSubSteps = jest.fn();
      const steps = [step("a", "A"), step("b", "B"), step("c", "C")];
      const { result } = renderHook(() =>
        useEditGoalHierarchyDrag({
          steps,
          onReorderSteps,
          onReorderSubSteps,
        }),
      );
      registerGrid(result.current, ["a", "b", "c"]);
      act(() => {
        result.current.handleDragStart("a");
        // Drag a down so its center lands in row c's band (index 2).
        result.current.handleDragMove(120, 120);
        result.current.handleDragEnd();
      });
      expect(onReorderSteps).toHaveBeenCalledWith(["b", "c", "a"]);
      expect(onReorderSubSteps).not.toHaveBeenCalled();
    });

    it("dispatches onReorderSubSteps for a child reorder, scoped to one parent", () => {
      const onReorderSteps = jest.fn();
      const onReorderSubSteps = jest.fn();
      const steps = [
        step("a", "A", [sub("a1", "A1"), sub("a2", "A2"), sub("a3", "A3")]),
        step("b", "B", [sub("b1", "B1")]),
      ];
      const { result } = renderHook(() =>
        useEditGoalHierarchyDrag({ steps, onReorderSteps, onReorderSubSteps }),
      );
      // Flat order: a, a1, a2, a3, b, b1
      registerGrid(result.current, ["a", "a1", "a2", "a3", "b", "b1"]);
      act(() => {
        result.current.handleDragStart("a1");
        // Move a1 down two rows so its center is in a3's band (flat index 3).
        result.current.handleDragMove(120, 120);
        result.current.handleDragEnd();
      });
      expect(onReorderSubSteps).toHaveBeenCalledWith("a", ["a2", "a3", "a1"]);
      expect(onReorderSteps).not.toHaveBeenCalled();
    });

    it("refreshes the list origin and every row before using absolute geometry", () => {
      const onReorderSteps = jest.fn();
      const steps = [step("a", "A"), step("b", "B"), step("c", "C")];
      const { result } = renderHook(() =>
        useEditGoalHierarchyDrag({
          steps,
          onReorderSteps,
          onReorderSubSteps: jest.fn(),
        }),
      );

      // Stale pre-scroll coordinates. Drag start must replace all of them.
      registerGrid(result.current, ["a", "b", "c"], 50);
      result.current.registerRowLayout("a", { absoluteY: 1000, height: 50 });
      result.current.registerRowLayout("b", { absoluteY: 1050, height: 50 });
      result.current.registerRowLayout("c", { absoluteY: 1100, height: 50 });
      const originRemeasure = jest.fn(() =>
        result.current.registerListOrigin(0),
      );
      const rowRemeasures = ["a", "b", "c"].map((id, index) =>
        jest.fn(() =>
          result.current.registerRowLayout(id, {
            absoluteY: index * 50,
            height: 50,
          }),
        ),
      );
      result.current.registerListOriginRemeasure(originRemeasure);
      ["a", "b", "c"].forEach((id, index) =>
        result.current.registerRemeasure(id, rowRemeasures[index]),
      );

      act(() => {
        result.current.handleDragStart("a");
        result.current.handleDragMove(120, 120);
        result.current.handleDragEnd();
      });

      expect(originRemeasure).toHaveBeenCalledTimes(1);
      rowRemeasures.forEach((remeasure) =>
        expect(remeasure).toHaveBeenCalledTimes(1),
      );
      expect(onReorderSteps).toHaveBeenCalledWith(["b", "c", "a"]);
    });
  });

  describe("reparent dispatch (onReparentStep supplied)", () => {
    it("promotes a child to root via a positional drop above its parent", () => {
      const onReparentStep = jest.fn();
      const onReorderSteps = jest.fn();
      const onReorderSubSteps = jest.fn();
      // a {b}  c — flat: a, b, c. Drag b above a (flat index 0).
      const steps = [step("a", "A", [sub("b", "B")]), step("c", "C")];
      const { result } = renderHook(() =>
        useEditGoalHierarchyDrag({
          steps,
          onReorderSteps,
          onReorderSubSteps,
          onReparentStep,
        }),
      );
      registerGrid(result.current, ["a", "b", "c"]);
      act(() => {
        result.current.handleDragStart("b");
        // Move b up so its center is above a's band (flat index 0).
        result.current.handleDragMove(-40, -40);
        result.current.handleDragEnd();
      });
      expect(onReparentStep).toHaveBeenCalledWith("b", null);
      expect(onReorderSteps).not.toHaveBeenCalled();
      expect(onReorderSubSteps).not.toHaveBeenCalled();
    });

    it("demotes a leaf root onto an armed dwell target", () => {
      jest.useFakeTimers();
      const onReparentStep = jest.fn();
      const steps = [step("a", "A"), step("b", "B")];
      const { result } = renderHook(() =>
        useEditGoalHierarchyDrag({
          steps,
          onReorderSteps: jest.fn(),
          onReorderSubSteps: jest.fn(),
          onReparentStep,
        }),
      );
      registerGrid(result.current, ["a", "b"]);
      act(() => {
        result.current.handleDragStart("b");
        // Hover b over a's band (flat index 0) — same row as start? start is
        // b at index 1, hover a at index 0.
        result.current.handleDragMove(-30, -30);
      });
      // Dwell requires a timer; flush it.
      act(() => {
        jest.advanceTimersByTime(250);
      });
      act(() => {
        result.current.handleDragEnd();
      });
      expect(onReparentStep).toHaveBeenCalledWith("b", "a");
      jest.useRealTimers();
    });

    it("does not arm when the insertion target is outside its measured band", () => {
      jest.useFakeTimers();
      const onReparentStep = jest.fn();
      const steps = [step("a", "A"), step("b", "B")];
      const { result } = renderHook(() =>
        useEditGoalHierarchyDrag({
          steps,
          onReorderSteps: jest.fn(),
          onReorderSubSteps: jest.fn(),
          onReparentStep,
        }),
      );
      result.current.registerRowLayout("a", { absoluteY: 0, height: 20 });
      result.current.registerRowLayout("b", { absoluteY: 100, height: 20 });

      act(() => {
        result.current.handleDragStart("b");
        // Center moves above a. It still maps to a as the insertion target,
        // but is outside a's 0..20 dwell band.
        result.current.handleDragMove(-130, -20);
        jest.advanceTimersByTime(250);
        result.current.handleDragEnd();
      });

      expect(onReparentStep).not.toHaveBeenCalledWith("b", "a");
      jest.useRealTimers();
    });

    it("disarms when leaving a target band without changing the hover id", () => {
      jest.useFakeTimers();
      const onReparentStep = jest.fn();
      const steps = [step("a", "A"), step("b", "B")];
      const { result } = renderHook(() =>
        useEditGoalHierarchyDrag({
          steps,
          onReorderSteps: jest.fn(),
          onReorderSubSteps: jest.fn(),
          onReparentStep,
        }),
      );
      result.current.registerRowLayout("a", { absoluteY: 0, height: 20 });
      result.current.registerRowLayout("b", { absoluteY: 100, height: 20 });

      act(() => {
        result.current.handleDragStart("b");
        result.current.handleDragMove(-100, 10); // center 10: inside a
        result.current.handleDragMove(-130, -20); // still hover a, now outside
        jest.advanceTimersByTime(250);
        result.current.handleDragEnd();
      });

      expect(onReparentStep).not.toHaveBeenCalledWith("b", "a");
      jest.useRealTimers();
    });

    it("moves a child between parents via a positional demote", () => {
      const onReparentStep = jest.fn();
      // a {a1}  b {b1} — flat: a, a1, b, b1. Drag a1 into b's group.
      const steps = [
        step("a", "A", [sub("a1", "A1")]),
        step("b", "B", [sub("b1", "B1")]),
      ];
      const { result } = renderHook(() =>
        useEditGoalHierarchyDrag({
          steps,
          onReorderSteps: jest.fn(),
          onReorderSubSteps: jest.fn(),
          onReparentStep,
        }),
      );
      registerGrid(result.current, ["a", "a1", "b", "b1"]);
      act(() => {
        result.current.handleDragStart("a1");
        // Move a1 down to rest in b1's band (flat index 3). a1 starts at
        // index 1 (y=50); moving +100 lands center at 50+100+25=175 → band of
        // b1 (index 3, y=150..200).
        result.current.handleDragMove(100, 100);
        result.current.handleDragEnd();
      });
      expect(onReparentStep).toHaveBeenCalledWith("a1", "b");
    });

    it("refuses to demote a parent-with-children (no callback)", () => {
      jest.useFakeTimers();
      const onReparentStep = jest.fn();
      const onReorderSteps = jest.fn();
      const onReorderSubSteps = jest.fn();
      // a {a1}  b — drag a (parent) and dwell on b → refused.
      const steps = [step("a", "A", [sub("a1", "A1")]), step("b", "B")];
      const { result } = renderHook(() =>
        useEditGoalHierarchyDrag({
          steps,
          onReorderSteps,
          onReorderSubSteps,
          onReparentStep,
        }),
      );
      registerGrid(result.current, ["a", "a1", "b"]);
      act(() => {
        result.current.handleDragStart("a");
        result.current.handleDragMove(100, 100); // hover into b's band
      });
      act(() => {
        jest.advanceTimersByTime(250);
      });
      act(() => {
        result.current.handleDragEnd();
      });
      // A parent-with-children cannot be demoted; the armed target should not
      // arm, and the drop should be a none/snap-back (no reparent).
      expect(onReparentStep).not.toHaveBeenCalledWith("a", "b");
      jest.useRealTimers();
    });

    it("refuses an armed target equal to the dragged step", () => {
      jest.useFakeTimers();
      const onReparentStep = jest.fn();
      const steps = [step("a", "A"), step("b", "B")];
      const { result } = renderHook(() =>
        useEditGoalHierarchyDrag({
          steps,
          onReorderSteps: jest.fn(),
          onReorderSubSteps: jest.fn(),
          onReparentStep,
        }),
      );
      registerGrid(result.current, ["a", "b"]);
      act(() => {
        result.current.handleDragStart("a");
        result.current.handleDragMove(0, 0); // stay on a's own band
      });
      act(() => {
        jest.advanceTimersByTime(250);
      });
      act(() => {
        result.current.handleDragEnd();
      });
      // Armed target equal to dragged is refused; no self-reparent.
      expect(onReparentStep).not.toHaveBeenCalledWith("a", "a");
      jest.useRealTimers();
    });
  });

  describe("omitted onReparentStep collapses to reorder-only", () => {
    it("does not reparent when onReparentStep is omitted, but reorder still works", () => {
      const onReorderSteps = jest.fn();
      const onReorderSubSteps = jest.fn();
      const steps = [step("a", "A", [sub("b", "B")]), step("c", "C")];
      const { result } = renderHook(() =>
        useEditGoalHierarchyDrag({ steps, onReorderSteps, onReorderSubSteps }),
      );
      registerGrid(result.current, ["a", "b", "c"]);
      act(() => {
        result.current.handleDragStart("b");
        result.current.handleDragMove(-40, -40); // promote position
        result.current.handleDragEnd();
      });
      // Without onReparentStep, classifyDrop may return reparent but the
      // dispatch no-ops (onReparentStep undefined). Neither reorder fires for
      // a reparent result.
      expect(onReorderSteps).not.toHaveBeenCalled();
      expect(onReorderSubSteps).not.toHaveBeenCalled();
    });
  });

  describe("R13 canDragRow", () => {
    it("a lone child is draggable when reparent is enabled (single-child promote path)", () => {
      const steps = [step("a", "A", [sub("a1", "A1")]), step("b", "B")];
      const { result } = renderHook(() =>
        useEditGoalHierarchyDrag({
          steps,
          onReorderSteps: jest.fn(),
          onReorderSubSteps: jest.fn(),
          onReparentStep: jest.fn(),
        }),
      );
      expect(result.current.canDragRow("a1")).toBe(true);
    });

    it("a lone child is NOT draggable when reparent is omitted (old behavior)", () => {
      const steps = [step("a", "A", [sub("a1", "A1")]), step("b", "B")];
      const { result } = renderHook(() =>
        useEditGoalHierarchyDrag({
          steps,
          onReorderSteps: jest.fn(),
          onReorderSubSteps: jest.fn(),
        }),
      );
      expect(result.current.canDragRow("a1")).toBe(false);
    });

    it("a lone leaf root is not draggable (no other root target)", () => {
      const steps = [step("a", "A")];
      const { result } = renderHook(() =>
        useEditGoalHierarchyDrag({
          steps,
          onReorderSteps: jest.fn(),
          onReorderSubSteps: jest.fn(),
          onReparentStep: jest.fn(),
        }),
      );
      expect(result.current.canDragRow("a")).toBe(false);
    });

    it("a root with ≥2 roots is draggable in both modes", () => {
      const steps = [step("a", "A"), step("b", "B")];
      const { result } = renderHook(() =>
        useEditGoalHierarchyDrag({
          steps,
          onReorderSteps: jest.fn(),
          onReorderSubSteps: jest.fn(),
          onReparentStep: jest.fn(),
        }),
      );
      expect(result.current.canDragRow("a")).toBe(true);
    });

    it("drag is disabled while a row is being edited", () => {
      const steps = [step("a", "A"), step("b", "B")];
      const { result } = renderHook(() =>
        useEditGoalHierarchyDrag({
          steps,
          onReorderSteps: jest.fn(),
          onReorderSubSteps: jest.fn(),
          onReparentStep: jest.fn(),
          editingId: "a",
        }),
      );
      expect(result.current.canDragRow("a")).toBe(false);
      expect(result.current.canDragRow("b")).toBe(false);
    });
  });

  describe("moveStep (sibling-scoped, R8)", () => {
    it("reorders within a root group and never reparents", () => {
      const onReorderSteps = jest.fn();
      const onReparentStep = jest.fn();
      const steps = [step("a", "A"), step("b", "B"), step("c", "C")];
      const { result } = renderHook(() =>
        useEditGoalHierarchyDrag({
          steps,
          onReorderSteps,
          onReorderSubSteps: jest.fn(),
          onReparentStep,
        }),
      );
      act(() => {
        result.current.moveStep("a", 1);
      });
      expect(onReorderSteps).toHaveBeenCalledWith(["b", "a", "c"]);
      expect(onReparentStep).not.toHaveBeenCalled();
    });

    it("is a no-op at a group boundary (does not promote)", () => {
      const onReparentStep = jest.fn();
      const onReorderSteps = jest.fn();
      const onReorderSubSteps = jest.fn();
      const steps = [
        step("a", "A", [sub("a1", "A1"), sub("a2", "A2")]),
        step("b", "B"),
      ];
      const { result } = renderHook(() =>
        useEditGoalHierarchyDrag({
          steps,
          onReorderSteps,
          onReorderSubSteps,
          onReparentStep,
        }),
      );
      act(() => {
        // a1 is first in its group — moving up is a no-op (no promote).
        result.current.moveStep("a1", -1);
      });
      expect(onReparentStep).not.toHaveBeenCalled();
      expect(onReorderSteps).not.toHaveBeenCalled();
      expect(onReorderSubSteps).not.toHaveBeenCalled();
    });
  });
});
