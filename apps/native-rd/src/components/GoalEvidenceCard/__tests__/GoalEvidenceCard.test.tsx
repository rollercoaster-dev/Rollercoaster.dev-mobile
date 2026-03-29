import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { GoalEvidenceCard } from "../GoalEvidenceCard";

const defaultProps = {
  evidenceCount: 0,
  onEvidenceTap: jest.fn(),
};

describe("GoalEvidenceCard", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders goal label", () => {
    renderWithProviders(<GoalEvidenceCard {...defaultProps} />);
    expect(screen.getByText("★ Goal")).toBeOnTheScreen();
  });

  it('renders "Goal Evidence" title', () => {
    renderWithProviders(<GoalEvidenceCard {...defaultProps} />);
    expect(screen.getByText("Goal Evidence")).toBeOnTheScreen();
  });

  it("renders description text", () => {
    renderWithProviders(<GoalEvidenceCard {...defaultProps} />);
    expect(
      screen.getByText(
        "Evidence for the overall goal, not tied to a specific step",
      ),
    ).toBeOnTheScreen();
  });

  it("displays evidence count with plural label", () => {
    renderWithProviders(
      <GoalEvidenceCard {...defaultProps} evidenceCount={5} />,
    );
    expect(screen.getByText("5 items")).toBeOnTheScreen();
  });

  it("displays singular evidence label for 1 item", () => {
    renderWithProviders(
      <GoalEvidenceCard {...defaultProps} evidenceCount={1} />,
    );
    expect(screen.getByText("1 item")).toBeOnTheScreen();
  });

  it('displays "add evidence" prompt when count is 0', () => {
    renderWithProviders(<GoalEvidenceCard {...defaultProps} />);
    expect(screen.getByText("+ add evidence")).toBeOnTheScreen();
  });

  it("calls onEvidenceTap when evidence badge is pressed", () => {
    const onEvidenceTap = jest.fn();
    renderWithProviders(
      <GoalEvidenceCard evidenceCount={3} onEvidenceTap={onEvidenceTap} />,
    );
    fireEvent.press(
      screen.getByLabelText("3 goal evidence items, tap to view"),
    );
    expect(onEvidenceTap).toHaveBeenCalledTimes(1);
  });

  it("has accessible evidence badge label", () => {
    renderWithProviders(
      <GoalEvidenceCard {...defaultProps} evidenceCount={7} />,
    );
    expect(
      screen.getByLabelText("7 goal evidence items, tap to view"),
    ).toBeOnTheScreen();
  });

  it("title has header accessibility role", () => {
    renderWithProviders(<GoalEvidenceCard {...defaultProps} />);
    expect(screen.getByRole("header")).toBeOnTheScreen();
  });
});
