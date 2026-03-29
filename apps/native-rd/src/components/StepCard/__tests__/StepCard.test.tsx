import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { StepCard, type StepCardStep, type StepCardStatus } from "../StepCard";

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
}));

const makeStep = (overrides: Partial<StepCardStep> = {}): StepCardStep => ({
  id: "step-1",
  title: "Review component architecture",
  status: "pending",
  evidenceCount: 0,
  plannedEvidenceTypes: null,
  capturedEvidenceTypes: [],
  ...overrides,
});

const defaultProps = {
  stepIndex: 0,
  totalSteps: 5,
  onToggleComplete: jest.fn(),
  onEvidenceTap: jest.fn(),
  onQuickNote: jest.fn(),
};

describe("StepCard", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders step number label", () => {
    renderWithProviders(<StepCard step={makeStep()} {...defaultProps} />);
    expect(screen.getByText("Step 1 of 5")).toBeOnTheScreen();
  });

  it("renders step title", () => {
    renderWithProviders(<StepCard step={makeStep()} {...defaultProps} />);
    expect(screen.getByText("Review component architecture")).toBeOnTheScreen();
  });

  it.each([
    ["completed", "Status: Completed"],
    ["in-progress", "Status: In Progress"],
    ["pending", "Status: Pending"],
  ] satisfies [StepCardStatus, string][])(
    "shows correct status badge for %s status",
    (status, expectedA11yLabel) => {
      renderWithProviders(
        <StepCard step={makeStep({ status })} {...defaultProps} />,
      );
      expect(screen.getByLabelText(expectedA11yLabel)).toBeOnTheScreen();
    },
  );

  it("displays evidence count with plural label", () => {
    renderWithProviders(
      <StepCard step={makeStep({ evidenceCount: 3 })} {...defaultProps} />,
    );
    expect(screen.getByText("3 items")).toBeOnTheScreen();
  });

  it("displays singular evidence label for 1 item", () => {
    renderWithProviders(
      <StepCard step={makeStep({ evidenceCount: 1 })} {...defaultProps} />,
    );
    expect(screen.getByText("1 item")).toBeOnTheScreen();
  });

  it('displays "add evidence" prompt when count is 0', () => {
    renderWithProviders(
      <StepCard step={makeStep({ evidenceCount: 0 })} {...defaultProps} />,
    );
    expect(screen.getByText("+ add evidence")).toBeOnTheScreen();
  });

  it("calls onToggleComplete when checkbox is pressed", () => {
    const onToggleComplete = jest.fn();
    renderWithProviders(
      <StepCard
        step={makeStep()}
        {...defaultProps}
        onToggleComplete={onToggleComplete}
      />,
    );
    fireEvent.press(screen.getByRole("checkbox"));
    expect(onToggleComplete).toHaveBeenCalledTimes(1);
  });

  it("calls onEvidenceTap when evidence badge is pressed", () => {
    const onEvidenceTap = jest.fn();
    renderWithProviders(
      <StepCard
        step={makeStep({ evidenceCount: 2 })}
        {...defaultProps}
        onEvidenceTap={onEvidenceTap}
      />,
    );
    fireEvent.press(screen.getByLabelText("2 evidence items, tap to view"));
    expect(onEvidenceTap).toHaveBeenCalledTimes(1);
  });

  it("has accessible evidence badge label", () => {
    renderWithProviders(
      <StepCard step={makeStep({ evidenceCount: 4 })} {...defaultProps} />,
    );
    expect(
      screen.getByLabelText("4 evidence items, tap to view"),
    ).toBeOnTheScreen();
  });

  it("checkbox reflects completed state", () => {
    renderWithProviders(
      <StepCard step={makeStep({ status: "completed" })} {...defaultProps} />,
    );
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox.props.accessibilityState?.checked).toBe(true);
  });

  it("checkbox reflects uncompleted state", () => {
    renderWithProviders(
      <StepCard step={makeStep({ status: "pending" })} {...defaultProps} />,
    );
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox.props.accessibilityState?.checked).toBe(false);
  });

  it('shows "Completed" checkbox label when step is done', () => {
    renderWithProviders(
      <StepCard step={makeStep({ status: "completed" })} {...defaultProps} />,
    );
    // "Completed" appears in both StatusBadge and Checkbox — verify checkbox has it via a11y
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox.props.accessibilityLabel).toBe("Completed");
  });

  it('shows "Mark complete" label when step is not done', () => {
    renderWithProviders(
      <StepCard step={makeStep({ status: "pending" })} {...defaultProps} />,
    );
    expect(screen.getByText("Mark complete")).toBeOnTheScreen();
  });

  // --- Planned evidence types ---

  it("renders planned evidence type chips when plannedEvidenceTypes is set", () => {
    renderWithProviders(
      <StepCard
        step={makeStep({
          plannedEvidenceTypes: ["photo", "text"],
          capturedEvidenceTypes: [],
        })}
        {...defaultProps}
      />,
    );
    expect(screen.getByLabelText("Planned evidence types")).toBeOnTheScreen();
  });

  it("does not render chips when plannedEvidenceTypes is null", () => {
    renderWithProviders(
      <StepCard
        step={makeStep({ plannedEvidenceTypes: null })}
        {...defaultProps}
      />,
    );
    expect(screen.queryByLabelText("Planned evidence types")).toBeNull();
  });

  it("renders hint text when completion is blocked", () => {
    renderWithProviders(
      <StepCard
        step={makeStep({
          plannedEvidenceTypes: ["photo"],
          capturedEvidenceTypes: [],
        })}
        {...defaultProps}
      />,
    );
    expect(screen.getByText(/Add.*Take Photo.*to complete/)).toBeOnTheScreen();
  });

  it("does not render hint when evidence matches planned type", () => {
    renderWithProviders(
      <StepCard
        step={makeStep({
          plannedEvidenceTypes: ["photo"],
          capturedEvidenceTypes: ["photo"],
        })}
        {...defaultProps}
      />,
    );
    expect(screen.queryByText(/to complete/)).toBeNull();
  });

  it("checkbox is accessible-disabled when blocked", () => {
    renderWithProviders(
      <StepCard
        step={makeStep({
          plannedEvidenceTypes: ["photo"],
          capturedEvidenceTypes: [],
        })}
        {...defaultProps}
      />,
    );
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox.props.accessibilityState?.disabled).toBe(true);
  });

  it("tapping blocked checkbox calls onEvidenceTap instead of onToggleComplete", () => {
    const onToggleComplete = jest.fn();
    const onEvidenceTap = jest.fn();
    renderWithProviders(
      <StepCard
        step={makeStep({
          plannedEvidenceTypes: ["photo"],
          capturedEvidenceTypes: [],
        })}
        {...defaultProps}
        onToggleComplete={onToggleComplete}
        onEvidenceTap={onEvidenceTap}
      />,
    );
    fireEvent.press(screen.getByRole("checkbox"));
    expect(onEvidenceTap).toHaveBeenCalledTimes(1);
    expect(onToggleComplete).not.toHaveBeenCalled();
  });

  // --- Quick note ---

  it("renders quick-note input when text is a planned type and not yet captured", () => {
    renderWithProviders(
      <StepCard
        step={makeStep({
          plannedEvidenceTypes: ["text"],
          capturedEvidenceTypes: [],
        })}
        {...defaultProps}
      />,
    );
    expect(screen.getByLabelText("Add a quick text note")).toBeOnTheScreen();
  });

  it("does not render quick-note input when text is already captured", () => {
    renderWithProviders(
      <StepCard
        step={makeStep({
          plannedEvidenceTypes: ["text"],
          capturedEvidenceTypes: ["text"],
        })}
        {...defaultProps}
      />,
    );
    expect(screen.queryByLabelText("Add a quick text note")).toBeNull();
  });

  it("calls onQuickNote with trimmed text on submit", () => {
    const onQuickNote = jest.fn();
    renderWithProviders(
      <StepCard
        step={makeStep({
          plannedEvidenceTypes: ["text"],
          capturedEvidenceTypes: [],
        })}
        {...defaultProps}
        onQuickNote={onQuickNote}
      />,
    );
    const input = screen.getByLabelText("Add a quick text note");
    fireEvent.changeText(input, "  My reflection  ");
    fireEvent.press(screen.getByLabelText("Submit quick note"));
    expect(onQuickNote).toHaveBeenCalledWith("My reflection");
  });

  it("does not render quick-note when step is completed", () => {
    renderWithProviders(
      <StepCard
        step={makeStep({
          status: "completed",
          plannedEvidenceTypes: ["text"],
          capturedEvidenceTypes: [],
        })}
        {...defaultProps}
      />,
    );
    expect(screen.queryByLabelText("Add a quick text note")).toBeNull();
  });

  it("does not call onQuickNote when input is empty or whitespace", () => {
    const onQuickNote = jest.fn();
    renderWithProviders(
      <StepCard
        step={makeStep({
          plannedEvidenceTypes: ["text"],
          capturedEvidenceTypes: [],
        })}
        {...defaultProps}
        onQuickNote={onQuickNote}
      />,
    );
    const input = screen.getByLabelText("Add a quick text note");
    fireEvent.changeText(input, "   ");
    fireEvent.press(screen.getByLabelText("Submit quick note"));
    expect(onQuickNote).not.toHaveBeenCalled();
  });

  it("does not render chips or block completion when plannedEvidenceTypes is empty array", () => {
    renderWithProviders(
      <StepCard
        step={makeStep({ plannedEvidenceTypes: [], capturedEvidenceTypes: [] })}
        {...defaultProps}
      />,
    );
    expect(screen.queryByLabelText("Planned evidence types")).toBeNull();
    expect(screen.queryByText(/to complete/)).toBeNull();
    expect(
      screen.getByRole("checkbox").props.accessibilityState?.disabled,
    ).toBe(false);
  });
});
