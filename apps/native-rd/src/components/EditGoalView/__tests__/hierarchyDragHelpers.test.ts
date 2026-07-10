import { retainEqualDropOutline } from "../hierarchyDragHelpers";
import type { DropOutline } from "../useEditGoalHierarchyDragTypes";

jest.mock("../../../utils/haptics", () => ({
  triggerDragDrop: jest.fn(),
}));

describe("retainEqualDropOutline", () => {
  const previous: DropOutline = { kind: "nested", top: 24, height: 44 };

  it("retains the previous reference when the visual outline is unchanged", () => {
    const equalCopy: DropOutline = { ...previous };
    expect(retainEqualDropOutline(previous, equalCopy)).toBe(previous);
  });

  it.each([
    { kind: "line" as const, top: 24, height: 44 },
    { kind: "nested" as const, top: 25, height: 44 },
    { kind: "nested" as const, top: 24, height: 45 },
  ])("returns the next outline when geometry changes: %o", (next) => {
    expect(retainEqualDropOutline(previous, next)).toBe(next);
  });

  it("propagates transitions to and from no outline", () => {
    expect(retainEqualDropOutline(previous, null)).toBeNull();
    expect(retainEqualDropOutline(null, previous)).toBe(previous);
    expect(retainEqualDropOutline(null, null)).toBeNull();
  });
});
