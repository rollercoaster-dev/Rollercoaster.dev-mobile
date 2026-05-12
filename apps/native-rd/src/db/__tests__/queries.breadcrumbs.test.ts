/**
 * Asserts mutation functions emit closed-enum breadcrumbs at entry so a
 * thrown error's preceding trail captures the attempted action — including
 * validation failures, which still leave a "user tried X" crumb.
 */
import {
  createGoal,
  updateGoal,
  completeGoal,
  uncompleteGoal,
  deleteGoal,
  createStep,
  updateStep,
  completeStep,
  uncompleteStep,
  deleteStep,
  reorderSteps,
  createEvidence,
} from "../queries";
import { EvidenceType } from "../schema";
import type { GoalId, StepId } from "../schema";
import * as Sentry from "@sentry/react-native";

const GOAL_ID = "goal_test_123" as GoalId;
const STEP_ID = "step_test_123" as StepId;

const mockAddBreadcrumb = Sentry.addBreadcrumb as jest.Mock;

beforeEach(() => {
  mockAddBreadcrumb.mockClear();
});

function lastBreadcrumb() {
  const calls = mockAddBreadcrumb.mock.calls;
  return calls[calls.length - 1][0];
}

describe("goal mutation breadcrumbs", () => {
  it("createGoal emits goal/create even on validation failure", () => {
    expect(() => createGoal("")).toThrow();
    expect(lastBreadcrumb()).toMatchObject({
      category: "goal",
      message: "create",
      level: "info",
    });
  });

  it("createGoal emits goal/create on success", () => {
    createGoal("Valid title");
    expect(lastBreadcrumb()).toMatchObject({
      category: "goal",
      message: "create",
    });
  });

  it("updateGoal emits goal/update", () => {
    updateGoal(GOAL_ID, { title: "Updated" });
    expect(lastBreadcrumb()).toMatchObject({
      category: "goal",
      message: "update",
    });
  });

  it("completeGoal emits goal/complete", () => {
    completeGoal(GOAL_ID, [{ type: "photo" }]);
    expect(lastBreadcrumb()).toMatchObject({
      category: "goal",
      message: "complete",
    });
  });

  it("uncompleteGoal emits goal/update (no dedicated 'uncomplete' message in the closed union)", () => {
    uncompleteGoal(GOAL_ID);
    expect(lastBreadcrumb()).toMatchObject({
      category: "goal",
      message: "update",
    });
  });

  it("deleteGoal emits goal/delete", () => {
    deleteGoal(GOAL_ID);
    expect(lastBreadcrumb()).toMatchObject({
      category: "goal",
      message: "delete",
    });
  });
});

describe("step mutation breadcrumbs", () => {
  it("createStep emits step/create", () => {
    createStep(GOAL_ID, "Step title");
    expect(lastBreadcrumb()).toMatchObject({
      category: "step",
      message: "create",
    });
  });

  it("updateStep emits step/update", () => {
    updateStep(STEP_ID, { title: "Updated" });
    expect(lastBreadcrumb()).toMatchObject({
      category: "step",
      message: "update",
    });
  });

  it("completeStep emits step/toggle", () => {
    completeStep(STEP_ID, null, [{ type: "photo" }]);
    expect(lastBreadcrumb()).toMatchObject({
      category: "step",
      message: "toggle",
    });
  });

  it("uncompleteStep emits step/toggle", () => {
    uncompleteStep(STEP_ID);
    expect(lastBreadcrumb()).toMatchObject({
      category: "step",
      message: "toggle",
    });
  });

  it("deleteStep emits step/delete", () => {
    deleteStep(STEP_ID);
    expect(lastBreadcrumb()).toMatchObject({
      category: "step",
      message: "delete",
    });
  });

  it("reorderSteps emits step/reorder", () => {
    reorderSteps(GOAL_ID, [STEP_ID]);
    expect(lastBreadcrumb()).toMatchObject({
      category: "step",
      message: "reorder",
    });
  });
});

describe("evidence mutation breadcrumbs", () => {
  it.each([
    ["photo", EvidenceType.photo],
    ["video", EvidenceType.video],
    ["text", EvidenceType.text],
    ["link", EvidenceType.link],
    ["file", EvidenceType.file],
  ])("createEvidence emits evidence/save with kind:%s", (label, type) => {
    createEvidence({
      goalId: GOAL_ID,
      type,
      uri: `file:///fake/${label}.dat`,
    });
    expect(lastBreadcrumb()).toMatchObject({
      category: "evidence",
      message: "save",
      data: { kind: type },
    });
  });
});
