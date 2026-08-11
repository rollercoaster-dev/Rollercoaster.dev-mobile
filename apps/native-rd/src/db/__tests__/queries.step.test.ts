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
  resolveActionableIndex,
  resolveStepDependencyBand,
  areAllStepsComplete,
  type GroupedStep,
} from "../queries";
import { evolu } from "../evolu";
import { dateToDateIso } from "@evolu/common";
import { StepStatus, type GoalId, type StepId } from "../schema";

const mockGoalId = "goal_test_123" as GoalId;
const mockStepId = "step_test_456" as StepId;

/** Build a branded DateIso for update-payload assertions (#454). */
function dateIso(iso: string) {
  const result = dateToDateIso(new Date(iso));
  if (!result.ok) throw new Error(`invalid test date: ${iso}`);
  return result.value;
}

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
    afterStepId: null,
    waitingOnLabel: null,
    waitingOnExpectedAt: null,
    dueAt: null,
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

  describe("updateStep dependency + due-date fields (#454)", () => {
    const updateMock = evolu.update as jest.Mock;
    const siblingId = "step_sibling_1" as StepId;
    const expectedDate = dateIso("2026-06-24T00:00:00.000Z");
    const dueDate = dateIso("2026-06-12T00:00:00.000Z");

    beforeEach(() => {
      updateMock.mockClear();
    });

    test("sets afterStepId alone — only id + afterStepId in payload", () => {
      updateStep(mockStepId, { afterStepId: siblingId });
      const [, payload] = updateMock.mock.calls.at(-1)!;
      expect(payload).toEqual({ id: mockStepId, afterStepId: siblingId });
    });

    test("sets waitingOnLabel + waitingOnExpectedAt together", () => {
      updateStep(mockStepId, {
        waitingOnLabel: "Manager sign-off",
        waitingOnExpectedAt: expectedDate,
      });
      const [, payload] = updateMock.mock.calls.at(-1)!;
      expect(payload).toEqual({
        id: mockStepId,
        waitingOnLabel: "Manager sign-off",
        waitingOnExpectedAt: expectedDate,
      });
    });

    test("sets dueAt alone", () => {
      updateStep(mockStepId, { dueAt: dueDate });
      const [, payload] = updateMock.mock.calls.at(-1)!;
      expect(payload).toEqual({ id: mockStepId, dueAt: dueDate });
    });

    test.each([
      ["afterStepId", { afterStepId: null }],
      ["waitingOnLabel", { waitingOnLabel: null }],
      ["waitingOnExpectedAt", { waitingOnExpectedAt: null }],
      ["dueAt", { dueAt: null }],
    ] as const)("clears %s back to null", (key, fields) => {
      updateStep(mockStepId, fields);
      const [, payload] = updateMock.mock.calls.at(-1)!;
      expect(payload).toEqual({ id: mockStepId, [key]: null });
    });

    test("omitted new fields are absent from the payload entirely", () => {
      updateStep(mockStepId, { title: "Same Title" });
      const [, payload] = updateMock.mock.calls.at(-1)!;
      expect(payload).not.toHaveProperty("afterStepId");
      expect(payload).not.toHaveProperty("waitingOnLabel");
      expect(payload).not.toHaveProperty("waitingOnExpectedAt");
      expect(payload).not.toHaveProperty("dueAt");
    });

    test("empty/whitespace waitingOnLabel clears to null rather than throwing", () => {
      expect(() =>
        updateStep(mockStepId, { waitingOnLabel: "   \n\t " }),
      ).not.toThrow();
      const [, payload] = updateMock.mock.calls.at(-1)!;
      expect(payload).toEqual({ id: mockStepId, waitingOnLabel: null });
    });

    test("over-length waitingOnLabel throws rather than silently clearing", () => {
      expect(() =>
        updateStep(mockStepId, { waitingOnLabel: "x".repeat(1001) }),
      ).toThrow(/Waiting-on label must be 1-1000 characters/);
      expect(updateMock).not.toHaveBeenCalled();
    });
  });

  describe("canCompleteStep", () => {
    // An unset plan resolves to the default ["text"] rather than exempting the
    // step (#466 D4) — same list FocusCurrentTaskCard renders, so the gate and
    // the card's "Mark complete" reveal cannot disagree.
    test.each([
      ["no evidence, null planned types", null, [], false],
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
      [
        "text evidence satisfies the default plan (null planned types)",
        null,
        [{ type: "text" }],
        true,
      ],
      [
        "non-text evidence does not satisfy the default plan",
        null,
        [{ type: "photo" }],
        false,
      ],
      [
        "empty planned array falls back to the default plan",
        "[]",
        [{ type: "text" }],
        true,
      ],
      [
        "multiple planned types, partial match",
        '["photo","video"]',
        [{ type: "video" }],
        true,
      ],
      [
        "malformed JSON falls back to the default plan",
        "not-json",
        [{ type: "text" }],
        true,
      ],
      [
        "evidence with null type only, null planned types",
        null,
        [{ type: null }],
        false,
      ],
      // Unknown keys normalize to `file` on both sides, matching
      // FocusCurrentTaskCard's validateEvidenceType fallback — otherwise the
      // card could reveal "Mark complete" on a step this gate refuses.
      [
        "unknown planned type is satisfied by file evidence",
        '["sketch"]',
        [{ type: "file" }],
        true,
      ],
      [
        "unknown planned type is satisfied by equally unknown evidence",
        '["sketch"]',
        [{ type: "doodle" }],
        true,
      ],
      [
        "unknown planned type is not satisfied by an unrelated known type",
        '["sketch"]',
        [{ type: "photo" }],
        false,
      ],
    ])("%s → %s", (_label, plannedJson, evidence, expected) => {
      expect(canCompleteStep(plannedJson, evidence)).toBe(expected);
    });
  });

  describe("completeStep with gating", () => {
    // #466 D4: an unset plan is no longer an exemption — it means one text note.
    test("no planned evidence types and no evidence → throws", () => {
      expect(() => completeStep(mockStepId, null, [])).toThrow(
        "Cannot complete step: no evidence attached",
      );
    });

    test("no planned evidence types, non-text evidence → throws", () => {
      expect(() => completeStep(mockStepId, null, [{ type: "photo" }])).toThrow(
        "Cannot complete step: no evidence matching the planned types",
      );
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
      // #536 / #533 F2: `invite` means the subtree is *finished*, so it must
      // require every child completed. A parent whose remaining children are
      // merely set aside is `parked` — a distinct non-actionable state — so the
      // "all parts done, want to close this?" offer can never appear over work
      // nobody finished. `childCount` is the total child count either way (D3).
      [
        "parked state: every child paused, parent still pending",
        [
          row("s1", null),
          row("s1a", "s1", { status: "paused" }),
          row("s1b", "s1", { status: "paused" }),
        ],
        { kind: "parked", index: 0, childCount: 2 },
      ],
      [
        "parked state: completed + paused mix is not invite",
        [
          row("s1", null),
          row("s1a", "s1", { status: "completed" }),
          row("s1b", "s1", { status: "paused" }),
        ],
        { kind: "parked", index: 0, childCount: 2 },
      ],
      [
        "a pending child still beats an otherwise-parked parent",
        [
          row("s1", null),
          row("s1a", "s1", { status: "paused" }),
          row("s1b", "s1", { status: "completed" }),
          row("s1c", "s1"),
        ],
        { kind: "leaf", index: 3, parentIndex: 0 },
      ],
      [
        "a paused parent is still skipped, parked or not",
        [
          row("s1", null, { status: "paused" }),
          row("s1a", "s1", { status: "paused" }),
        ],
        { kind: "none" },
      ],
      [
        "a completed parent with a paused child is skipped, not parked",
        [
          row("s1", null, { status: "completed" }),
          row("s1a", "s1", { status: "paused" }),
        ],
        { kind: "none" },
      ],
      // `parked` must *terminate* the top-level scan exactly as `invite` does —
      // it is a pending parent, so it is still the next action, it just isn't a
      // finished one. Without a later pending sibling in the fixture, a resolver
      // that `continue`d past parked instead of returning would look identical.
      // #537 gives `parked` distinct rendering, which is precisely when someone
      // is tempted to skip it; this pins that skipping it is a behavior change.
      [
        "parked parent short-circuits the scan — a later pending root loses",
        [
          row("s1", null),
          row("s1a", "s1", { status: "paused" }),
          row("s2", null),
        ],
        { kind: "parked", index: 0, childCount: 1 },
      ],
      // The invite/parked split rests on pendingChild having already caught
      // anything that is neither `completed` nor `paused`. These pin that
      // invariant at the boundary: a null or unrecognised status is *pending*,
      // so it yields `leaf` and never reaches the `every(completed)` test. If
      // the skip set ever grows, these fail rather than silently bucketing the
      // new status as `parked`.
      [
        "a null-status child is pending, not parked",
        [row("s1", null), row("s1a", "s1", { status: null })],
        { kind: "leaf", index: 1, parentIndex: 0 },
      ],
      [
        "an unrecognised child status is pending, not parked",
        [row("s1", null), row("s1a", "s1", { status: "blocked" })],
        { kind: "leaf", index: 1, parentIndex: 0 },
      ],
      // Two-level model: a grandchild is promoted to top level, so `s1`'s only
      // *direct* child being paused makes it parked, and the promoted pending
      // grandchild at index 2 is never reached.
      [
        "parked reasons over direct children only — a pending grandchild loses",
        [
          row("s1", null),
          row("s1a", "s1", { status: "paused" }),
          row("s1a1", "s1a"),
        ],
        { kind: "parked", index: 0, childCount: 1 },
      ],
      [
        "a parked parent beats a promoted pending orphan",
        [
          row("s1", null),
          row("s1a", "s1", { status: "paused" }),
          row("orphan", "ghost"),
        ],
        { kind: "parked", index: 0, childCount: 1 },
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

  describe("resolveActionableIndex (#536)", () => {
    // The collapse three screens share. Exhaustiveness is enforced at compile
    // time by its assertNever; what these pin is that every actionable kind —
    // `parked` included — still yields its row rather than falling through to
    // null, which is what would silently blank a screen's next-step readout.
    test.each([
      ["leaf", { kind: "leaf", index: 3, parentIndex: 1 }, 3],
      ["invite", { kind: "invite", index: 1, childCount: 2 }, 1],
      ["parked", { kind: "parked", index: 1, childCount: 2 }, 1],
      ["flat", { kind: "flat", index: 0 }, 0],
      ["none", { kind: "none" }, null],
    ] as const)("%s → %s", (_label, result, expected) => {
      expect(resolveActionableIndex(result)).toBe(expected);
    });

    // Unreachable from typed callers — the point is that it throws loudly
    // rather than returning null, which would blank the next-step readout with
    // no signal. Pins the choice so nobody "simplifies" the default branch into
    // a silent fallback.
    test("an unknown kind throws instead of silently resolving to null", () => {
      expect(() => resolveActionableIndex({ kind: "future" } as never)).toThrow(
        /Unhandled NextActionableStep kind: future/,
      );
    });
  });

  describe("resolveStepDependencyBand (#454)", () => {
    // Sibling present in the goal list so afterStepId can resolve to its title.
    const goalSteps = [
      row("sibling_a", null, { title: "Draft the outline" }),
      row("other", null),
    ];
    // A fixed clock, never the real one (#571) — every date literal below is
    // deliberately after it, so the pre-existing cases keep asserting the
    // untouched present-tense reading.
    const NOW = new Date("2026-06-01T00:00:00.000Z");

    test.each([
      [
        "no dependency/date data → every band field null",
        row("s", null),
        {
          afterStepTitle: null,
          waitingOnLabel: null,
          waitingOnExpectedAt: null,
          dueAt: null,
          waitingOnExpectedIsPast: false,
        },
      ],
      [
        "afterStepId resolves to the present sibling's title",
        row("s", null, { afterStepId: "sibling_a" as StepId }),
        {
          afterStepTitle: "Draft the outline",
          waitingOnLabel: null,
          waitingOnExpectedAt: null,
          dueAt: null,
          waitingOnExpectedIsPast: false,
        },
      ],
      [
        "afterStepId absent from goalSteps (soft-deleted) → afterStepTitle null",
        row("s", null, { afterStepId: "ghost_step" as StepId }),
        {
          afterStepTitle: null,
          waitingOnLabel: null,
          waitingOnExpectedAt: null,
          dueAt: null,
          waitingOnExpectedIsPast: false,
        },
      ],
      [
        // The step is itself present in goalSteps, so an unguarded find() would
        // resolve afterStepId to its own title ("Draft the outline") — the guard
        // must return null instead.
        "afterStepId pointing at the step itself (self-reference) → afterStepTitle null",
        row("sibling_a", null, {
          title: "Draft the outline",
          afterStepId: "sibling_a" as StepId,
        }),
        {
          afterStepTitle: null,
          waitingOnLabel: null,
          waitingOnExpectedAt: null,
          dueAt: null,
          waitingOnExpectedIsPast: false,
        },
      ],
      [
        "waitingOnLabel without expected date passes through unpaired",
        row("s", null, { waitingOnLabel: "Vendor quote" }),
        {
          afterStepTitle: null,
          waitingOnLabel: "Vendor quote",
          waitingOnExpectedAt: null,
          dueAt: null,
          waitingOnExpectedIsPast: false,
        },
      ],
      [
        "waitingOnLabel + expected date both pass through (the 'waiting on X · expected Y' pair)",
        row("s", null, {
          waitingOnLabel: "Manager sign-off",
          waitingOnExpectedAt: "2026-06-24T00:00:00.000Z",
        }),
        {
          afterStepTitle: null,
          waitingOnLabel: "Manager sign-off",
          waitingOnExpectedAt: "2026-06-24T00:00:00.000Z",
          dueAt: null,
          waitingOnExpectedIsPast: false,
        },
      ],
      [
        "dueAt alone → only dueAt non-null in the band",
        row("s", null, { dueAt: "2026-06-12T00:00:00.000Z" }),
        {
          afterStepTitle: null,
          waitingOnLabel: null,
          waitingOnExpectedAt: null,
          dueAt: "2026-06-12T00:00:00.000Z",
          waitingOnExpectedIsPast: false,
        },
      ],
    ])("%s", (_label, step, expected) => {
      expect(resolveStepDependencyBand(step, goalSteps, NOW)).toEqual(expected);
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
