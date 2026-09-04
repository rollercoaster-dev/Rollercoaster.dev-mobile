/**
 * The sealed-goal predicate (#563 / #653) — one definition shared by
 * CompletionFlowScreen, TimelineJourneyScreen and FocusModeScreen.
 */

import { isGoalSealed } from "../goalSeal";

const BADGE = { id: "badge-1" };

describe("isGoalSealed", () => {
  it.each([
    ["a completed goal with a badge row", { status: "completed" }, BADGE, true],
    // Legacy data (the live bake writes the badge before it flips the goal):
    // not sealed, the flow must stay walkable so the user can still bake.
    [
      "a completed goal with no badge row",
      { status: "completed" },
      null,
      false,
    ],
    // Reopened later (uncompleteGoal): a badge row alone does not seal.
    ["an active goal with a badge row", { status: "active" }, BADGE, false],
    ["an active goal with no badge row", { status: "active" }, null, false],
    ["a goal with no status", { status: null }, BADGE, false],
    ["a missing goal", undefined, BADGE, false],
  ] as const)("%s → %s", (_label, goal, badgeRow, expected) => {
    expect(isGoalSealed(goal, badgeRow)).toBe(expected);
  });
});
