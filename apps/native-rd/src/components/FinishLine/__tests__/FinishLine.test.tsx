import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { FinishLine } from "../FinishLine";
import type { EvidenceItemData } from "../../EvidenceDrawer";

const evidence: EvidenceItemData[] = [
  { id: "ev-1", type: "photo", label: "Final photo" },
  { id: "ev-2", type: "text", label: "Reflection note" },
];

describe("FinishLine", () => {
  it("renders star node and heading", () => {
    renderWithProviders(
      <FinishLine goalEvidence={[]} onEvidencePress={jest.fn()} />,
    );
    expect(screen.getByText("\u2605")).toBeOnTheScreen();
    expect(screen.getByText("Goal Evidence")).toBeOnTheScreen();
  });

  it("shows evidence items", () => {
    renderWithProviders(
      <FinishLine goalEvidence={evidence} onEvidencePress={jest.fn()} />,
    );
    expect(screen.getByText("Final photo")).toBeOnTheScreen();
    expect(screen.getByText("Reflection note")).toBeOnTheScreen();
  });

  it('shows "No goal evidence yet" when empty', () => {
    renderWithProviders(
      <FinishLine goalEvidence={[]} onEvidencePress={jest.fn()} />,
    );
    expect(screen.getByText("No goal evidence yet")).toBeOnTheScreen();
  });

  it("has accessible evidence labels", () => {
    renderWithProviders(
      <FinishLine goalEvidence={evidence} onEvidencePress={jest.fn()} />,
    );
    expect(
      screen.getByLabelText("photo evidence: Final photo"),
    ).toBeOnTheScreen();
  });

  it("calls onEvidencePress with evidence id when an evidence card is tapped", () => {
    const onEvidencePress = jest.fn();
    renderWithProviders(
      <FinishLine goalEvidence={evidence} onEvidencePress={onEvidencePress} />,
    );
    fireEvent.press(screen.getByLabelText("photo evidence: Final photo"));
    expect(onEvidencePress).toHaveBeenCalledWith("ev-1");
    expect(onEvidencePress).toHaveBeenCalledTimes(1);
  });
});
