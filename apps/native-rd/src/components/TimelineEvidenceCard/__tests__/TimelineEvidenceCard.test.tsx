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
});
