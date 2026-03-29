jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
}));

import { impactAsync, ImpactFeedbackStyle } from "expo-haptics";
import { triggerDragStart, triggerDragDrop } from "../haptics";

const mockImpact = impactAsync as jest.MockedFunction<typeof impactAsync>;

describe("haptics utilities", () => {
  beforeEach(() => {
    mockImpact.mockClear();
    mockImpact.mockResolvedValue(undefined);
  });

  describe("triggerDragStart", () => {
    it("triggers medium impact feedback", () => {
      triggerDragStart();
      expect(mockImpact).toHaveBeenCalledWith(ImpactFeedbackStyle.Medium);
    });

    it("does not throw if haptics reject", () => {
      mockImpact.mockRejectedValue(new Error("no haptics"));
      expect(() => triggerDragStart()).not.toThrow();
    });
  });

  describe("triggerDragDrop", () => {
    it("triggers light impact feedback", () => {
      triggerDragDrop();
      expect(mockImpact).toHaveBeenCalledWith(ImpactFeedbackStyle.Light);
    });

    it("does not throw if haptics reject", () => {
      mockImpact.mockRejectedValue(new Error("no haptics"));
      expect(() => triggerDragDrop()).not.toThrow();
    });
  });
});
