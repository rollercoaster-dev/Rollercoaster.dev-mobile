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
import { evolu } from "../evolu";
import type { GoalId, StepId, EvidenceId } from "../schema";

/** Payload of the last mocked `evolu.<op>` call (see __tests__/setup.ts). */
function lastWritten(op: "insert" | "update"): Record<string, unknown> {
  const calls = (evolu[op] as jest.Mock).mock.calls;
  return calls[calls.length - 1][1] as Record<string, unknown>;
}
const mockGoalId = "goal_test_123" as GoalId;
const mockStepId = "step_test_456" as StepId;
const mockEvidenceId = "evidence_test_789" as EvidenceId;

describe("Evidence CRUD Operations", () => {
  describe("createEvidence - Parent Attachment (critical constraint)", () => {
    test("should throw when both goalId and stepId are provided", () => {
      expect(() =>
        // @ts-expect-error — type system prevents this, testing runtime guard
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
        // @ts-expect-error — type system prevents this, testing runtime guard
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

    test("should ignore inherited attachment fields", () => {
      // Simulates prototype-chain leaks that bypass TypeScript at runtime
      const params = Object.assign(Object.create({ goalId: mockGoalId }), {
        stepId: mockStepId,
        type: "photo",
        uri: "file://photo.jpg",
      });

      expect(() =>
        createEvidence(params as Parameters<typeof createEvidence>[0]),
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
    // @ts-expect-error — intentionally invalid fields to test runtime validation
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
    ["valid uri", { uri: "content:text;Edited note" }, false],
    ["empty uri", { uri: "" }, true],
    [">1000 char uri", { uri: "a".repeat(1001) }, true],
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

  // The completion flow edits a saved closing note in place through this
  // field; the row must actually receive the new uri, not just validate it.
  test("updateEvidence writes the replacement uri", () => {
    const result = updateEvidence(mockEvidenceId, {
      uri: "content:text;Edited note",
    });
    expect(result).toEqual({
      ok: true,
      value: { id: mockEvidenceId, uri: "content:text;Edited note" },
    });
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

  describe("createEvidence - stored file URI form", () => {
    test.each([
      [
        "app Documents file",
        "file:///documents/evidence/photos/a.jpg",
        "appdoc:evidence/photos/a.jpg",
      ],
      [
        "stale iOS container file",
        "file:///var/mobile/Containers/Data/Application/OLD/Documents/evidence/files/f.pdf",
        "appdoc:evidence/files/f.pdf",
      ],
      ["text note", "content:text;hello", "content:text;hello"],
      ["link", "https://example.com/x", "https://example.com/x"],
    ])("stores a %s as %s", (_label, uri, stored) => {
      createEvidence({ goalId: mockGoalId, type: "photo", uri });
      expect(lastWritten("insert").uri).toBe(stored);
    });
  });
});
