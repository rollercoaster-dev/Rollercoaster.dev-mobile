import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { TimelineEvidenceCard } from "../TimelineEvidenceCard";
import type { EvidenceItemData } from "../../EvidenceDrawer";

const evidence: EvidenceItemData = {
  id: "ev-1",
  type: "photo",
  label: "Progress photo",
};

describe("TimelineEvidenceCard", () => {
  it("renders the evidence label", () => {
    renderWithProviders(
      <TimelineEvidenceCard evidence={evidence} onPress={jest.fn()} />,
    );
    expect(screen.getByText("Progress photo")).toBeOnTheScreen();
  });

  it("calls onPress with the evidence id when tapped", () => {
    const onPress = jest.fn();
    renderWithProviders(
      <TimelineEvidenceCard evidence={evidence} onPress={onPress} />,
    );
    fireEvent.press(screen.getByLabelText("photo evidence: Progress photo"));
    expect(onPress).toHaveBeenCalledWith("ev-1");
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  describe("E2E mode gating", () => {
    const originalE2E = process.env.EXPO_PUBLIC_E2E_MODE;
    beforeAll(() => {
      process.env.EXPO_PUBLIC_E2E_MODE = "true";
    });
    afterAll(() => {
      process.env.EXPO_PUBLIC_E2E_MODE = originalE2E;
    });

    it("drops Pressable a11y wrapper so the inner label Text is reachable", () => {
      renderWithProviders(
        <TimelineEvidenceCard evidence={evidence} onPress={jest.fn()} />,
      );
      // Under EXPO_PUBLIC_E2E_MODE=true the wrapping Pressable's
      // `accessible+role+label` props are dropped, so iOS no longer
      // collapses the inner label Text into the composed parent label.
      // Maestro can now match the inner text literally.
      expect(
        screen.queryByLabelText("photo evidence: Progress photo"),
      ).toBeNull();
      expect(screen.getByText("Progress photo")).toBeOnTheScreen();
    });
  });
});
