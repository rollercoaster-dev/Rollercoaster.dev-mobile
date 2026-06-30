/**
 * Step CRUD operation tests
 *
 * Tests validation, reordering (zero-index bug fix), and error handling
 */

import {
  createStep,
  createSubStep,
  updateStep,
  canCompleteStep,
  completeStep,
  uncompleteStep,
  pauseStep,
  resumeStep,
  deleteStep,
  reorderSteps,
  reorderSubSteps,
  groupStepsByParent,
  flattenGroupedSteps,
  resolveNextActionableStep,
  areAllStepsComplete,
  type GroupedStep,
} from "../queries";
import { evolu } from "../evolu";
import { StepStatus, type GoalId, type StepId } from "../schema";

const mockGoalId = "goal_test_123" as GoalId;
const mockStepId = "step_test_456" as StepId;

/** Build a flat step-row (the post-query shape groupStepsByParent reads). */
function row(
  id: string,
  parentStepId: string | null,
  overrides: Partial<Omit<GroupedStep, "children">> = {},
): Omit<GroupedStep, "children"> {
  return {
    id: id as StepId,
    goalId: mockGoalId,
    parentStepId: parentStepId as StepId | null,
    title: id,
    ordinal: 0,
    status: "pending",
    completedAt: null,
    plannedEvidenceTypes: null,
    ...overrides,
  };
}

describe("Step CRUD Operations", () => {
  test.each([
    ["empty string", "", undefined, undefined, true],
    ["whitespace only", "   \n\t  ", undefined, undefined, true],
    ["exceeds 1000 chars", "a".repeat(1001), undefined, undefined, true],
    ["valid title", "Valid Step", undefined, undefined, false],
    ["valid title with ordinal 0", "Valid Step", 0, undefined, false],
    ["valid title with ordinal", "Valid Step", 5, undefined, false],
    [
      "valid title with null plannedEvidenceTypes",
      "Valid Step",
      undefined,
      null,
      false,
    ],
    [
      "valid title with plannedEvidenceTypes",
      "Valid Step",
      undefined,
      ["photo", "text"],
      false,
    ],
    [
      "no plannedEvidenceTypes param (backward compat)",
      "Valid Step",
      undefined,
      undefined,
      false,
    ],
  ])(
    "createStep with %s",
    (_label, title, ordinal, plannedTypes, shouldThrow) => {
      if (shouldThrow) {
        expect(() =>
          createStep(mockGoalId, title, ordinal, plannedTypes),
        ).toThrow("Step title must be 1-1000 characters");
      } else {
        expect(() =>
          createStep(mockGoalId, title, ordinal, plannedTypes),
        ).not.toThrow();
      }
    },
  );

  test.each([
    ["empty title", { title: "" }, true],
    [">1000 char title", { title: "a".repeat(1001) }, true],
    ["valid title", { title: "Updated Title" }, false],
    ["ordinal update", { ordinal: 5 }, false],
    ["null ordinal", { ordinal: null }, false],
    ["title and ordinal", { title: "New Title", ordinal: 3 }, false],
    [
      "null plannedEvidenceTypes (clears)",
      { plannedEvidenceTypes: null },
      false,
    ],
    ["valid plannedEvidenceTypes", { plannedEvidenceTypes: ["photo"] }, false],
    ["no plannedEvidenceTypes field", { title: "Same Title" }, false],
  ] as const)("updateStep with %s", (_label, fields, shouldThrow) => {
    if (shouldThrow) {
      expect(() => updateStep(mockStepId, fields)).toThrow();
    } else {
      expect(() => updateStep(mockStepId, fields)).not.toThrow();
    }
  });

  describe("canCompleteStep", () => {
    test.each([
      ["no evidence, null planned types", null, [], true],
      ["no evidence, planned types set", '["photo"]', [], false],
      [
        'wrong type evidence, planned types = ["photo"]',
        '["photo"]',
        [{ type: "text" }],
        false,
      ],
      [
        'matching evidence, planned types = ["photo"]',
        '["photo"]',
        [{ type: "photo" }],
        true,
      ],
      ["any evidence, null planned types", null, [{ type: "text" }], true],
      [
        "multiple planned types, partial match",
        '["photo","video"]',
        [{ type: "video" }],
        true,
      ],
      [
        "malformed JSON treats as any-type",
        "not-json",
        [{ type: "text" }],
        true,
      ],
      [
        "evidence with null type only, null planned types",
        null,
        [{ type: null }],
        true,
      ],
    ])("%s → %s", (_label, plannedJson, evidence, expected) => {
      expect(canCompleteStep(plannedJson, evidence)).toBe(expected);
    });
  });

  describe("completeStep with gating", () => {
    test("no planned evidence types and no evidence → succeeds", () => {
      expect(() => completeStep(mockStepId, null, [])).not.toThrow();
    });

    test("planned type with no evidence → throws descriptive message", () => {
      expect(() => completeStep(mockStepId, '["photo"]', [])).toThrow(
        "Cannot complete step: no evidence attached",
      );
    });

    test("wrong type evidence → throws planned-types message", () => {
      expect(() =>
        completeStep(mockStepId, '["photo"]', [{ type: "text" }]),
      ).toThrow("Cannot complete step: no evidence matching the planned types");
    });

    test("matching evidence → succeeds", () => {
      expect(() =>
        completeStep(mockStepId, null, [{ type: "text" }]),
      ).not.toThrow();
    });

    test("planned types with matching evidence → succeeds", () => {
      expect(() =>
        completeStep(mockStepId, '["photo"]', [{ type: "photo" }]),
      ).not.toThrow();
    });
  });

  test("uncompleteStep should succeed (no evidence guard)", () => {
    expect(() => uncompleteStep(mockStepId)).not.toThrow();
  });

  describe("pauseStep / resumeStep (#417)", () => {
    const updateMock = evolu.update as jest.Mock;

    beforeEach(() => {
      updateMock.mockClear();
    });

    test("pauseStep writes status=paused and leaves completedAt untouched", () => {
      pauseStep(mockStepId);
      expect(updateMock).toHaveBeenCalledWith("step", {
        id: mockStepId,
        status: StepStatus.paused,
      });
      // A paused step was never completed — no completedAt in the payload
      // (contrast completeStep, which stamps it). Guards against a copy-paste
      // from completeStep that would clobber/zero a real completion time.
      const [, payload] = updateMock.mock.calls.at(-1)!;
      expect(payload).not.toHaveProperty("completedAt");
    });

    test("resumeStep writes status=pending (pick back up)", () => {
      resumeStep(mockStepId);
      expect(updateMock).toHaveBeenCalledWith("step", {
        id: mockStepId,
        status: StepStatus.pending,
      });
      // Locks the documented difference from uncompleteStep: resume "mirrors
      // uncompleteStep minus the completedAt clear" — paused never set it, so
      // the payload must omit completedAt rather than write `null`.
      const [, payload] = updateMock.mock.calls.at(-1)!;
      expect(payload).not.toHaveProperty("completedAt");
    });
  });

  describe("goal completion semantics — paused blocks completion (D6)", () => {
    // Asserts the production predicate `areAllStepsComplete` — the same helper
    // FocusModeScreen's `allStepsComplete` gate now calls (grep that identifier).
    // Testing the shared helper (not a re-implementation) keeps this contract
    // honest: if the gate's rule changes, these assertions move with it.
    test("all steps completed → markable", () => {
      expect(
        areAllStepsComplete([
          row("a", null, { status: "completed" }),
          row("b", null, { status: "completed" }),
        ]),
      ).toBe(true);
    });

    test("a paused step blocks completion even when every other step is done", () => {
      expect(
        areAllStepsComplete([
          row("a", null, { status: "completed" }),
          row("b", null, { status: "paused" }),
        ]),
      ).toBe(false);
    });

    test("empty step list is not complete", () => {
      expect(areAllStepsComplete([])).toBe(false);
    });
  });

  test("deleteStep should succeed", () => {
    expect(() => deleteStep(mockStepId)).not.toThrow();
  });

  describe("reorderSteps - Zero-Index Bug Fix", () => {
    test("should handle ordinal 0 correctly (zero-index bug fix)", () => {
      const stepIds = [
        "step_1" as StepId,
        "step_2" as StepId,
        "step_3" as StepId,
      ];
      expect(() => reorderSteps(mockGoalId, stepIds)).not.toThrow();
    });

    test("should handle empty step list", () => {
      expect(() => reorderSteps(mockGoalId, [])).not.toThrow();
    });

    test("should handle single step", () => {
      expect(() =>
        reorderSteps(mockGoalId, ["step_1" as StepId]),
      ).not.toThrow();
    });

    test("should handle many steps", () => {
      const stepIds = Array.from(
        { length: 100 },
        (_, i) => `step_${i}` as StepId,
      );
      expect(() => reorderSteps(mockGoalId, stepIds)).not.toThrow();
    });
  });

  describe("groupStepsByParent", () => {
    test("flat goal: all rows become roots with empty children", () => {
      const rows = [row("a", null), row("b", null), row("c", null)];
      const grouped = groupStepsByParent(rows);
      expect(grouped.map((g) => g.id)).toEqual(["a", "b", "c"]);
      expect(grouped.every((g) => g.children.length === 0)).toBe(true);
    });

    test("mixed goal: children nest under their parent, not at root", () => {
      const rows = [
        row("a", null),
        row("b", "a"),
        row("c", "a"),
        row("d", null),
      ];
      const grouped = groupStepsByParent(rows);
      expect(grouped.map((g) => g.id)).toEqual(["a", "d"]);
      expect(grouped[0].children.map((c) => c.id)).toEqual(["b", "c"]);
      expect(grouped[1].children).toEqual([]);
    });

    test("preserves input order among siblings (ordinal/createdAt tie-break)", () => {
      // groupStepsByParent is pure over an already-ordered query result; the
      // (ordinal, createdAt) ORDER BY lives in stepsByGoalQuery. Two children
      // with the same ordinal arrive pre-sorted by createdAt — confirm the
      // grouper keeps that order rather than reshuffling.
      const rows = [
        row("a", null),
        row("early", "a", { ordinal: 0 }),
        row("late", "a", { ordinal: 0 }),
      ];
      const grouped = groupStepsByParent(rows);
      expect(grouped[0].children.map((c) => c.id)).toEqual(["early", "late"]);
    });

    test("orphan guard: child of a missing root is promoted to root level", () => {
      const rows = [row("a", null), row("orphan", "ghost")];
      const grouped = groupStepsByParent(rows);
      expect(grouped.map((g) => g.id)).toEqual(["a", "orphan"]);
      expect(grouped.find((g) => g.id === "orphan")?.children).toEqual([]);
    });

    test("depth guard: a child-of-a-child is promoted, never nested two deep", () => {
      const rows = [row("a", null), row("b", "a"), row("c", "b")];
      const grouped = groupStepsByParent(rows);
      // a -> b is valid; c points at b (a non-root), so c surfaces at root.
      expect(grouped.map((g) => g.id)).toEqual(["a", "c"]);
      expect(grouped[0].children.map((x) => x.id)).toEqual(["b"]);
    });
  });

  describe("flattenGroupedSteps", () => {
    test("parent with two children flattens to render order", () => {
      const grouped = groupStepsByParent([
        row("a", null),
        row("b", "a"),
        row("c", "a"),
      ]);
      expect(flattenGroupedSteps(grouped).map((s) => s.id)).toEqual([
        "a",
        "b",
        "c",
      ]);
    });

    test("flat goal round-trips unchanged", () => {
      const grouped = groupStepsByParent([row("a", null), row("b", null)]);
      expect(flattenGroupedSteps(grouped).map((s) => s.id)).toEqual(["a", "b"]);
    });
  });

  describe("resolveNextActionableStep", () => {
    // Cases mirror the named sub-step fixtures in FocusModeScreen.test.tsx and
    // GoalsScreen.test.tsx so the unit-level resolver stays traceable to the
    // #292 screen behaviour it now backs (#337). `index` is the position in the
    // input array; the wiring (`s2a` shapes) matches those screen tests.
    test.each([
      ["empty goal → none", [], { kind: "none" }],
      [
        "flat goal, all pending → first step is the flat next action",
        [row("a", null), row("b", null)],
        { kind: "flat", index: 0 },
      ],
      [
        "flat goal, first completed → next pending flat step",
        [row("a", null, { status: "completed" }), row("b", null)],
        { kind: "flat", index: 1 },
      ],
      [
        "leaf state: first pending child (earlier sibling already done)",
        [
          row("s1", null, { status: "completed" }),
          row("s2", null),
          row("s2a", "s2", { status: "completed" }),
          row("s2b", "s2"),
          row("s2c", "s2"),
          row("s3", null),
        ],
        { kind: "leaf", index: 3, parentIndex: 1 },
      ],
      [
        "invite state: all children done, parent still pending",
        [
          row("s1", null, { status: "completed" }),
          row("s2", null),
          row("s2a", "s2", { status: "completed" }),
          row("s2b", "s2", { status: "completed" }),
          row("s2c", "s2", { status: "completed" }),
          row("s3", null),
        ],
        { kind: "invite", index: 1, childCount: 3 },
      ],
      [
        "orphan (parent absent) is promoted and read as a flat step",
        [row("s1", null, { status: "completed" }), row("s2a", "s2")],
        { kind: "flat", index: 1 },
      ],
      [
        "interleaved query order: child before parent still indexes the child",
        [
          row("s2a", "s2"),
          row("s1", null, { status: "completed" }),
          row("s2", null),
        ],
        { kind: "leaf", index: 0, parentIndex: 2 },
      ],
      [
        "pending leaf under a manually-completed parent still wins",
        [
          row("s1", null, { status: "completed" }),
          row("s2", null, { status: "completed" }),
          row("s2a", "s2"),
        ],
        { kind: "leaf", index: 2, parentIndex: 1 },
      ],
      [
        "all steps completed → none",
        [
          row("s1", null, { status: "completed" }),
          row("s2", null, { status: "completed" }),
          row("s2a", "s2", { status: "completed" }),
        ],
        { kind: "none" },
      ],
      // #417: paused ("set aside") steps are skipped like completed ones.
      [
        "paused-only flat → none",
        [row("a", null, { status: "paused" })],
        { kind: "none" },
      ],
      [
        "paused first, pending second → skips paused, returns pending",
        [row("a", null, { status: "paused" }), row("b", null)],
        { kind: "flat", index: 1 },
      ],
      [
        "paused child skipped, next pending child returned",
        [
          row("s1", null),
          row("s1a", "s1", { status: "paused" }),
          row("s1b", "s1"),
        ],
        { kind: "leaf", index: 2, parentIndex: 0 },
      ],
      // A pending child surfaces even when its parent is paused: the resolver
      // finds pendingChild before applying the parent's own status skip, so a
      // set-aside parent can't hide still-actionable work below it. Pins the
      // pendingChild-first ordering against a refactor that moves the skip up.
      // (Whether a paused parent *should* expose its child is a UI-semantics
      // call deferred to #377/#378; this test locks the current behavior.)
      [
        "pending child under a paused parent still surfaces the child",
        [row("s1", null, { status: "paused" }), row("s1a", "s1")],
        { kind: "leaf", index: 1, parentIndex: 0 },
      ],
      [
        "all steps completed or paused → none",
        [
          row("s1", null, { status: "completed" }),
          row("s2", null, { status: "paused" }),
        ],
        { kind: "none" },
      ],
    ])("%s", (_label, rows, expected) => {
      expect(resolveNextActionableStep(rows)).toEqual(expected);
    });
  });

  describe("createSubStep", () => {
    const parentId = "step_parent_1" as StepId;

    test("throws on empty title (validation parity with createStep)", () => {
      expect(() => createSubStep(mockGoalId, parentId, "")).toThrow(
        "Step title must be 1-1000 characters",
      );
    });

    test("succeeds with valid title and stamps parentStepId", () => {
      const result = createSubStep(
        mockGoalId,
        parentId,
        "Sub-step",
        2,
      ) as unknown as {
        value: { parentStepId: StepId; title: string };
      };
      expect(result.value.parentStepId).toBe(parentId);
      expect(result.value.title).toBe("Sub-step");
    });
  });

  describe("reorderSubSteps", () => {
    const parentId = "step_parent_1" as StepId;
    const updateMock = evolu.update as jest.Mock;

    beforeEach(() => {
      updateMock.mockClear();
    });

    test("assigns sequential ordinals (0..n-1) to children in order", () => {
      const childIds = [
        "child_1" as StepId,
        "child_2" as StepId,
        "child_3" as StepId,
      ];
      reorderSubSteps(mockGoalId, parentId, childIds);

      // One ordinal write per child, indexed from 0 — the zero-index value
      // must be assigned, not skipped (Int.orNull guards 0 explicitly).
      const stepUpdates = updateMock.mock.calls.filter(
        ([table]) => table === "step",
      );
      expect(stepUpdates).toEqual([
        ["step", { id: "child_1", ordinal: 0 }],
        ["step", { id: "child_2", ordinal: 1 }],
        ["step", { id: "child_3", ordinal: 2 }],
      ]);
    });

    test("empty child list issues no updates and does not throw", () => {
      expect(() => reorderSubSteps(mockGoalId, parentId, [])).not.toThrow();
      expect(updateMock).not.toHaveBeenCalled();
    });
  });

  describe("updateStep reparent", () => {
    test("promote: setting parentStepId to null is included in payload", () => {
      const result = updateStep(mockStepId, {
        parentStepId: null,
      }) as unknown as {
        value: { parentStepId: StepId | null };
      };
      expect(result.value.parentStepId).toBeNull();
    });

    test("demote: setting parentStepId to a root id is included in payload", () => {
      const rootId = "step_root_1" as StepId;
      const result = updateStep(mockStepId, {
        parentStepId: rootId,
      }) as unknown as {
        value: { parentStepId: StepId | null };
      };
      expect(result.value.parentStepId).toBe(rootId);
    });
  });
});
