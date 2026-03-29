/**
 * Evidence CRUD operation tests
 *
 * Priority: CRITICAL (Rating 10/10)
 * Tests the exactly-one-parent constraint and validation logic
 */

import {
  createEvidence,
  updateEvidence,
  deleteEvidence,
  canCompleteGoal,
} from "../queries";
import type { GoalId, StepId, EvidenceId } from "../schema";

const mockGoalId = "goal_test_123" as GoalId;
const mockStepId = "step_test_456" as StepId;
const mockEvidenceId = "evidence_test_789" as EvidenceId;

describe("Evidence CRUD Operations", () => {
  describe("createEvidence - Parent Attachment (critical constraint)", () => {
    test("should throw when both goalId and stepId are provided", () => {
      expect(() =>
        createEvidence({
          goalId: mockGoalId,
          stepId: mockStepId,
          type: "photo",
          uri: "file://photo.jpg",
        }),
      ).toThrow("Evidence must attach to exactly one of goalId or stepId");
    });

    test("should throw when neither goalId nor stepId are provided", () => {
      expect(() =>
        createEvidence({
          type: "photo",
          uri: "file://photo.jpg",
        }),
      ).toThrow("Evidence must attach to exactly one of goalId or stepId");
    });

    test("should succeed with only goalId", () => {
      expect(() =>
        createEvidence({
          goalId: mockGoalId,
          type: "photo",
          uri: "file://photo.jpg",
        }),
      ).not.toThrow();
    });

    test("should succeed with only stepId", () => {
      expect(() =>
        createEvidence({
          stepId: mockStepId,
          type: "photo",
          uri: "file://photo.jpg",
        }),
      ).not.toThrow();
    });
  });

  test.each([
    ["empty type", { type: "", uri: "file://photo.jpg" }, "type"],
    [
      ">1000 char type",
      { type: "a".repeat(1001), uri: "file://photo.jpg" },
      "type",
    ],
    ["empty uri", { type: "photo", uri: "" }, "URI"],
    [
      ">1000 char uri",
      { type: "photo", uri: "file://" + "a".repeat(1001) },
      "URI",
    ],
    [
      ">1000 char description",
      { type: "photo", uri: "file://photo.jpg", description: "a".repeat(1001) },
      "description",
    ],
    [
      ">1000 char metadata",
      { type: "photo", uri: "file://photo.jpg", metadata: "a".repeat(1001) },
      "metadata",
    ],
  ])("createEvidence rejects %s", (_label, fields, expectedField) => {
    expect(() => createEvidence({ goalId: mockGoalId, ...fields })).toThrow(
      new RegExp(`Evidence ${expectedField} must be`, "i"),
    );
  });

  test("createEvidence succeeds with all optional fields", () => {
    expect(() =>
      createEvidence({
        goalId: mockGoalId,
        type: "photo",
        uri: "file://photo.jpg",
        description: "A beautiful sunset",
        metadata: '{"width": 1920, "height": 1080}',
      }),
    ).not.toThrow();
  });

  test.each([
    ["null description", { description: null }, false],
    ["empty description", { description: "" }, true],
    [">1000 char description", { description: "a".repeat(1001) }, true],
    ["null metadata", { metadata: null }, false],
    ["empty metadata", { metadata: "" }, true],
    [">1000 char metadata", { metadata: "a".repeat(1001) }, true],
    [
      "valid both fields",
      { description: "Updated", metadata: '{"updated": true}' },
      false,
    ],
  ] as const)("updateEvidence with %s", (_label, fields, shouldThrow) => {
    if (shouldThrow) {
      expect(() => updateEvidence(mockEvidenceId, fields)).toThrow();
    } else {
      expect(() => updateEvidence(mockEvidenceId, fields)).not.toThrow();
    }
  });

  test("deleteEvidence should succeed", () => {
    expect(() => deleteEvidence(mockEvidenceId)).not.toThrow();
  });

  describe("canCompleteGoal", () => {
    test("empty evidence array → false", () => {
      expect(canCompleteGoal([])).toBe(false);
    });

    test("one evidence item → true", () => {
      expect(canCompleteGoal([{ type: "photo" }])).toBe(true);
    });

    test("multiple evidence items → true", () => {
      expect(canCompleteGoal([{ type: "photo" }, { type: "text" }])).toBe(true);
    });

    test("only null-type evidence → false (consistent with canCompleteStep)", () => {
      expect(canCompleteGoal([{ type: null }])).toBe(false);
    });
  });
});
