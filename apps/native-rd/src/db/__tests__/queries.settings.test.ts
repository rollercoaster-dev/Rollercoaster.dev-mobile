/**
 * UserSettings CRUD operation tests
 *
 * Tests singleton pattern, validation, and fixed updateUserSettings API
 */

import {
  createUserSettings,
  pinGoal,
  unpinGoal,
  updateUserSettings,
} from "../queries";
import type { GoalId, UserSettingsId } from "../schema";

const mockSettingsId = "settings_test_123" as UserSettingsId;
const mockGoalId = "goal_test_123" as GoalId;

describe("UserSettings CRUD Operations", () => {
  test("createUserSettings should succeed", () => {
    expect(() => createUserSettings()).not.toThrow();
  });

  test.each([
    ["theme", "dark", "Theme"],
    ["density", "compact", "Density"],
    ["animationPref", "reduced", "Animation preference"],
  ] as const)(
    "should validate %s field (empty rejects, valid/null accepts)",
    (field, validValue, errorLabel) => {
      expect(() => updateUserSettings(mockSettingsId, { [field]: "" })).toThrow(
        `${errorLabel} must be 1-1000 characters`,
      );

      expect(() =>
        updateUserSettings(mockSettingsId, { [field]: "a".repeat(1001) }),
      ).toThrow(`${errorLabel} must be 1-1000 characters`);

      expect(() =>
        updateUserSettings(mockSettingsId, { [field]: validValue }),
      ).not.toThrow();

      expect(() =>
        updateUserSettings(mockSettingsId, { [field]: null }),
      ).not.toThrow();
    },
  );

  test("should throw when fontScale is not an integer", () => {
    expect(() =>
      updateUserSettings(mockSettingsId, { fontScale: 1.5 }),
    ).toThrow("Font scale must be an integer");
  });

  test.each([80, 100, 150])("should accept fontScale %i", (scale) => {
    expect(() =>
      updateUserSettings(mockSettingsId, { fontScale: scale }),
    ).not.toThrow();
  });

  test("should accept null fontScale", () => {
    expect(() =>
      updateUserSettings(mockSettingsId, { fontScale: null }),
    ).not.toThrow();
  });

  test("should throw when focusTimelineHidden is not an integer", () => {
    expect(() =>
      updateUserSettings(mockSettingsId, { focusTimelineHidden: 1.5 }),
    ).toThrow("focusTimelineHidden must be an integer");
  });

  test.each([1, 0])("should accept focusTimelineHidden %i", (value) => {
    expect(() =>
      updateUserSettings(mockSettingsId, { focusTimelineHidden: value }),
    ).not.toThrow();
  });

  test("should accept null focusTimelineHidden", () => {
    expect(() =>
      updateUserSettings(mockSettingsId, { focusTimelineHidden: null }),
    ).not.toThrow();
  });

  test("should succeed updating multiple fields", () => {
    expect(() =>
      updateUserSettings(mockSettingsId, {
        theme: "dark",
        density: "compact",
        animationPref: "full",
        fontScale: 100,
        focusTimelineHidden: 1,
      }),
    ).not.toThrow();
  });

  test("should succeed with mix of values and nulls", () => {
    expect(() =>
      updateUserSettings(mockSettingsId, {
        theme: "light",
        density: null,
        animationPref: "reduced",
        fontScale: null,
        focusTimelineHidden: null,
      }),
    ).not.toThrow();
  });
});

describe("cockpit pin (#396)", () => {
  test("pinGoal writes the goal id onto the settings singleton", () => {
    const result = pinGoal(mockSettingsId, mockGoalId);
    expect(result).toEqual({
      ok: true,
      value: { id: mockSettingsId, pinnedGoalId: mockGoalId },
    });
  });

  test("unpinGoal clears pinnedGoalId", () => {
    const result = unpinGoal(mockSettingsId);
    expect(result).toEqual({
      ok: true,
      value: { id: mockSettingsId, pinnedGoalId: null },
    });
  });

  test("pinning a second goal replaces the first — one slot, no clear step", () => {
    pinGoal(mockSettingsId, mockGoalId);
    const second = pinGoal(mockSettingsId, "goal_test_456" as GoalId);
    expect(second).toEqual({
      ok: true,
      value: { id: mockSettingsId, pinnedGoalId: "goal_test_456" },
    });
  });
});
