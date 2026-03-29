import React from "react";
import { renderWithProviders, screen } from "../../../__tests__/test-utils";
import { FinishLine } from "../FinishLine";
import type { EvidenceItemData } from "../../EvidenceDrawer";

const evidence: EvidenceItemData[] = [
  { id: "ev-1", type: "photo", label: "Final screenshot" },
  { id: "ev-2", type: "text", label: "Reflection note" },
];

describe("FinishLine", () => {
  it("renders star node and heading", () => {
    renderWithProviders(<FinishLine goalEvidence={[]} />);
    expect(screen.getByText("\u2605")).toBeOnTheScreen();
    expect(screen.getByText("Goal Evidence")).toBeOnTheScreen();
  });

  it("shows evidence items", () => {
    renderWithProviders(<FinishLine goalEvidence={evidence} />);
    expect(screen.getByText("Final screenshot")).toBeOnTheScreen();
    expect(screen.getByText("Reflection note")).toBeOnTheScreen();
  });

  it('shows "No goal evidence yet" when empty', () => {
    renderWithProviders(<FinishLine goalEvidence={[]} />);
    expect(screen.getByText("No goal evidence yet")).toBeOnTheScreen();
  });

  it("has accessible evidence labels", () => {
    renderWithProviders(<FinishLine goalEvidence={evidence} />);
    expect(
      screen.getByLabelText("photo evidence: Final screenshot"),
    ).toBeOnTheScreen();
  });
});
