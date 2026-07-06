import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { FinishLine, type FinishLineProps } from "../FinishLine";
import {
  BadgeShape,
  BadgeFrame,
  BadgeIconWeight,
  type BadgeDesign,
} from "../../../badges/types";
import type { EvidenceItemData } from "../../EvidenceDrawer";

const evidence: EvidenceItemData[] = [
  { id: "ev-1", type: "photo", label: "Final photo" },
  { id: "ev-2", type: "text", label: "Reflection note" },
];

const design: BadgeDesign = {
  shape: BadgeShape.circle,
  frame: BadgeFrame.none,
  color: "#a78bfa",
  iconName: "Trophy",
  iconWeight: BadgeIconWeight.regular,
  title: "Read 12 books",
  centerMode: "icon",
};

function renderFinishLine(overrides: Partial<FinishLineProps> = {}) {
  const props: FinishLineProps = {
    goalTitle: "Read 12 books",
    badgeDesign: null,
    allStepsComplete: false,
    onBadgePress: jest.fn(),
    goalEvidence: [],
    onEvidencePress: jest.fn(),
    ...overrides,
  };
  renderWithProviders(<FinishLine {...props} />);
  return props;
}

describe("FinishLine", () => {
  it("renders the star node and the CTA title", () => {
    renderFinishLine();
    expect(screen.getByText("★")).toBeOnTheScreen();
    expect(screen.getByText("Finish & design badge")).toBeOnTheScreen();
  });

  it("renders the goal title's first letter, uppercased, when there is no design", () => {
    renderFinishLine({ badgeDesign: null });
    expect(screen.getByText("R")).toBeOnTheScreen();
  });

  it("renders the real BadgeRenderer instead of the letter tile when a design exists", () => {
    renderFinishLine({ badgeDesign: design });
    expect(screen.getByTestId("finish-line-badge-preview")).toBeOnTheScreen();
    expect(screen.queryByText("R")).toBeNull();
  });

  // The no-"missing"/"needed" invariant — show what is present, never what is
  // absent. Empty goal evidence renders nothing, not an absence message.
  it("never frames empty goal evidence as absent", () => {
    renderFinishLine({ goalEvidence: [] });
    expect(JSON.stringify(screen.toJSON())).not.toMatch(
      /\b(missing|needed)\b/i,
    );
    expect(screen.queryByText(/no .* evidence/i)).toBeNull();
  });

  it("calls onBadgePress exactly once when the CTA row is tapped", () => {
    const props = renderFinishLine();
    fireEvent.press(screen.getByLabelText("Finish and design your badge"));
    expect(props.onBadgePress).toHaveBeenCalledTimes(1);
  });

  it("shows evidence items", () => {
    renderFinishLine({ goalEvidence: evidence });
    expect(screen.getByText("Final photo")).toBeOnTheScreen();
    expect(screen.getByText("Reflection note")).toBeOnTheScreen();
  });

  it("has accessible evidence labels", () => {
    renderFinishLine({ goalEvidence: evidence });
    expect(
      screen.getByLabelText("photo evidence: Final photo"),
    ).toBeOnTheScreen();
  });

  it("evidence taps call onEvidencePress with the id and never bleed into onBadgePress", () => {
    const props = renderFinishLine({ goalEvidence: evidence });
    fireEvent.press(screen.getByLabelText("photo evidence: Final photo"));
    expect(props.onEvidencePress).toHaveBeenCalledWith("ev-1");
    expect(props.onEvidencePress).toHaveBeenCalledTimes(1);
    expect(props.onBadgePress).not.toHaveBeenCalled();
  });
});
