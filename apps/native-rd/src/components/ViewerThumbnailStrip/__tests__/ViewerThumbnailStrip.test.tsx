import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { ViewerThumbnailStrip } from "../ViewerThumbnailStrip";
import type { ViewerEvidence } from "../../../hooks/useAllEvidenceForGoal";

const evidence: ViewerEvidence[] = [
  {
    id: "ev-1",
    title: "First",
    type: "photo",
    uri: "/p1.jpg",
    source: "goal",
    stepId: null,
    stepTitle: null,
  },
  {
    id: "ev-2",
    title: "Second",
    type: "text",
    source: "step",
    stepId: "s-1",
    stepTitle: "Step One",
  },
];

describe("ViewerThumbnailStrip", () => {
  it("renders nothing when there is at most one item", () => {
    renderWithProviders(
      <ViewerThumbnailStrip
        evidence={[evidence[0]]}
        activeIndex={0}
        onSelect={jest.fn()}
      />,
    );
    expect(screen.queryByLabelText("Evidence items")).toBeNull();
  });

  it("renders a thumb for each item when there are multiple", () => {
    renderWithProviders(
      <ViewerThumbnailStrip
        evidence={evidence}
        activeIndex={0}
        onSelect={jest.fn()}
      />,
    );
    expect(screen.getByLabelText("Evidence items")).toBeOnTheScreen();
    expect(
      screen.getByLabelText("photo evidence: First, from Goal Evidence"),
    ).toBeOnTheScreen();
    expect(
      screen.getByLabelText("text evidence: Second, from Step One"),
    ).toBeOnTheScreen();
  });

  it("calls onSelect with the tapped index", () => {
    const onSelect = jest.fn();
    renderWithProviders(
      <ViewerThumbnailStrip
        evidence={evidence}
        activeIndex={0}
        onSelect={onSelect}
      />,
    );
    fireEvent.press(
      screen.getByLabelText("text evidence: Second, from Step One"),
    );
    expect(onSelect).toHaveBeenCalledWith(1);
  });
});
