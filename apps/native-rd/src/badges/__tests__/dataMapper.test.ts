import { computeFrameParams } from "../frames/dataMapper";
import type { ComputeFrameParamsInput } from "../frames/dataMapper";

const base: ComputeFrameParamsInput = {
  stepCount: 3,
  stepNames: ["Plan", "Build", "Ship"],
  evidenceCount: 5,
  evidenceTypes: 2,
  createdAt: "2026-01-01T00:00:00.000Z",
  completedAt: "2026-01-15T00:00:00.000Z",
};

describe("computeFrameParams", () => {
  test("maps a typical goal with steps and evidence", () => {
    const result = computeFrameParams(base);

    expect(result).toEqual({
      variant: 0,
      stepCount: 3,
      evidenceCount: 5,
      evidenceTypes: 2,
      daysToComplete: 14,
      stepNames: ["Plan", "Build", "Ship"],
    });
  });

  test("variant is always 0", () => {
    const result = computeFrameParams(base);
    expect(result.variant).toBe(0);
  });

  describe("daysToComplete", () => {
    test.each([
      {
        name: "same-day completion",
        createdAt: "2026-03-01T08:00:00Z",
        completedAt: "2026-03-01T20:00:00Z",
        expected: 0,
      },
      {
        name: "multi-day span",
        createdAt: "2026-01-01T00:00:00Z",
        completedAt: "2026-02-01T00:00:00Z",
        expected: 31,
      },
      {
        name: "completedAt before createdAt clamps to 0",
        createdAt: "2026-03-10T00:00:00Z",
        completedAt: "2026-03-01T00:00:00Z",
        expected: 0,
      },
      {
        name: "invalid createdAt returns 0",
        createdAt: "not-a-date",
        completedAt: "2026-03-01T00:00:00Z",
        expected: 0,
      },
      {
        name: "invalid completedAt returns 0",
        createdAt: "2026-01-01T00:00:00Z",
        completedAt: "garbage",
        expected: 0,
      },
    ])("$name", ({ createdAt, completedAt, expected }) => {
      const result = computeFrameParams({ ...base, createdAt, completedAt });
      expect(result.daysToComplete).toBe(expected);
    });

    test("null completedAt uses Date.now()", () => {
      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now);

      const createdAt = new Date(now - 3 * 86_400_000).toISOString();
      const result = computeFrameParams({
        ...base,
        createdAt,
        completedAt: null,
      });

      expect(result.daysToComplete).toBe(3);
      jest.restoreAllMocks();
    });
  });

  describe("zero counts", () => {
    test("0 steps with empty stepNames omits stepNames key", () => {
      const result = computeFrameParams({
        ...base,
        stepCount: 0,
        stepNames: [],
      });
      expect(result.stepCount).toBe(0);
      expect(result).not.toHaveProperty("stepNames");
    });

    test("0 evidence and 0 evidence types", () => {
      const result = computeFrameParams({
        ...base,
        evidenceCount: 0,
        evidenceTypes: 0,
      });
      expect(result.evidenceCount).toBe(0);
      expect(result.evidenceTypes).toBe(0);
    });
  });

  describe("stepNames", () => {
    test("non-empty array is passed through", () => {
      const result = computeFrameParams({
        ...base,
        stepNames: ["Alpha", "Beta"],
      });
      expect(result.stepNames).toEqual(["Alpha", "Beta"]);
    });

    test("empty array omits stepNames from output", () => {
      const result = computeFrameParams({ ...base, stepNames: [] });
      expect(result.stepNames).toBeUndefined();
    });
  });
});
