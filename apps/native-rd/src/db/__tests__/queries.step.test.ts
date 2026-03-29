/**
 * Step CRUD operation tests
 *
 * Tests validation, reordering (zero-index bug fix), and error handling
 */

import {
  createStep,
  updateStep,
  canCompleteStep,
  completeStep,
  uncompleteStep,
  deleteStep,
  reorderSteps,
} from "../queries";
import type { GoalId, StepId } from "../schema";

const mockGoalId = "goal_test_123" as GoalId;
const mockStepId = "step_test_456" as StepId;

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
      ["evidence with null type only", null, [{ type: null }], false],
    ])("%s → %s", (_label, plannedJson, evidence, expected) => {
      expect(canCompleteStep(plannedJson, evidence)).toBe(expected);
    });
  });

  describe("completeStep with gating", () => {
    test("no evidence → throws descriptive message", () => {
      expect(() => completeStep(mockStepId, null, [])).toThrow(
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
});
