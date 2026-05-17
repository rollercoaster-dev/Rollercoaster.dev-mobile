import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { GoalEvidenceCard } from "../GoalEvidenceCard";

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
}));

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

  describe("Mark Complete affordance", () => {
    // The check is rendered only when canMarkComplete is true AND
    // onMarkComplete is supplied. Hidden in every other case.
    it("does not render the check when onMarkComplete is omitted", () => {
      renderWithProviders(<GoalEvidenceCard {...defaultProps} />);
      expect(
        screen.queryByRole("checkbox", { name: "Mark goal complete" }),
      ).toBeNull();
      expect(screen.queryByText("Ready")).toBeNull();
    });

    it("does not render the check when canMarkComplete is false", () => {
      renderWithProviders(
        <GoalEvidenceCard
          {...defaultProps}
          canMarkComplete={false}
          onMarkComplete={jest.fn()}
        />,
      );
      expect(
        screen.queryByRole("checkbox", { name: "Mark goal complete" }),
      ).toBeNull();
      expect(screen.queryByText("Ready")).toBeNull();
    });

    it("renders the check and a Ready badge when canMarkComplete is true", () => {
      renderWithProviders(
        <GoalEvidenceCard
          {...defaultProps}
          canMarkComplete={true}
          onMarkComplete={jest.fn()}
        />,
      );
      expect(
        screen.getByRole("checkbox", { name: "Mark goal complete" }),
      ).toBeOnTheScreen();
      expect(screen.getByText("Ready")).toBeOnTheScreen();
    });

    it("calls onMarkComplete when the check is tapped", () => {
      const onMarkComplete = jest.fn();
      renderWithProviders(
        <GoalEvidenceCard
          {...defaultProps}
          canMarkComplete={true}
          onMarkComplete={onMarkComplete}
        />,
      );
      fireEvent.press(
        screen.getByRole("checkbox", { name: "Mark goal complete" }),
      );
      expect(onMarkComplete).toHaveBeenCalledTimes(1);
    });
  });
});
