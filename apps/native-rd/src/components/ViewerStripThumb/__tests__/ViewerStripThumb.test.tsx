import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { ViewerStripThumb } from "../ViewerStripThumb";
import type { ViewerEvidence } from "../../../hooks/useAllEvidenceForGoal";

const goalEvidence: ViewerEvidence = {
  id: "ev-goal",
  title: "Final photo",
  type: "photo",
  uri: "/path/to/photo.jpg",
  source: "goal",
  stepId: null,
  stepTitle: null,
};

const stepEvidence: ViewerEvidence = {
  id: "ev-step",
  title: "Mid-week note",
  type: "text",
  source: "step",
  stepId: "s-1",
  stepTitle: "Read the docs",
};

describe("ViewerStripThumb", () => {
  it("labels goal-level evidence with the Goal Evidence source", () => {
    renderWithProviders(
      <ViewerStripThumb
        evidence={goalEvidence}
        isActive={false}
        onPress={jest.fn()}
      />,
    );
    expect(
      screen.getByLabelText("photo evidence: Final photo, from Goal Evidence"),
    ).toBeOnTheScreen();
  });

  it("labels step-level evidence with the step title as source", () => {
    renderWithProviders(
      <ViewerStripThumb
        evidence={stepEvidence}
        isActive={false}
        onPress={jest.fn()}
      />,
    );
    expect(
      screen.getByLabelText("text evidence: Mid-week note, from Read the docs"),
    ).toBeOnTheScreen();
  });

  it("calls onPress when tapped", () => {
    const onPress = jest.fn();
    renderWithProviders(
      <ViewerStripThumb
        evidence={goalEvidence}
        isActive={false}
        onPress={onPress}
      />,
    );
    fireEvent.press(
      screen.getByLabelText("photo evidence: Final photo, from Goal Evidence"),
    );
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

    it("drops Pressable a11y wrapper so the inner title Text is reachable", () => {
      renderWithProviders(
        <ViewerStripThumb
          evidence={stepEvidence}
          isActive={false}
          onPress={jest.fn()}
        />,
      );
      // Under EXPO_PUBLIC_E2E_MODE=true the wrapping Pressable's
      // `accessible+role+label` props are dropped, so iOS no longer
      // collapses the inner title Text into the composed parent label.
      // Maestro can now match the inner text literally.
      expect(
        screen.queryByLabelText(
          "text evidence: Mid-week note, from Read the docs",
        ),
      ).toBeNull();
      expect(screen.getByText("Mid-week note")).toBeOnTheScreen();
    });
  });
});
