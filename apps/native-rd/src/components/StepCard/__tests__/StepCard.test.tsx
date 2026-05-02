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
  onQuickEvidence: jest.fn(),
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

  it("does not render the redundant orange hint text when blocked", () => {
    renderWithProviders(
      <StepCard
        step={makeStep({
          plannedEvidenceTypes: ["photo"],
          capturedEvidenceTypes: [],
        })}
        {...defaultProps}
      />,
    );
    // The visible "Add X to complete" prompt was removed; chips + checkbox a11y hint cover it.
    expect(screen.queryByText(/Add.*Take Photo.*to complete/)).toBeNull();
  });

  it("hides the Mark Complete checkbox when blocked", () => {
    renderWithProviders(
      <StepCard
        step={makeStep({
          plannedEvidenceTypes: ["photo"],
          capturedEvidenceTypes: [],
        })}
        {...defaultProps}
      />,
    );
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByText("Mark complete")).toBeNull();
  });

  it("shows the 'Add evidence to complete' prompt when blocked", () => {
    renderWithProviders(
      <StepCard
        step={makeStep({
          plannedEvidenceTypes: ["photo"],
          capturedEvidenceTypes: [],
        })}
        {...defaultProps}
      />,
    );
    expect(screen.getByText("Add evidence to complete")).toBeOnTheScreen();
  });

  it("exposes blocker reason via prompt accessibilityLabel when blocked", () => {
    renderWithProviders(
      <StepCard
        step={makeStep({
          plannedEvidenceTypes: ["photo"],
          capturedEvidenceTypes: [],
        })}
        {...defaultProps}
      />,
    );
    expect(
      screen.getByLabelText("Add Take Photo to complete this step"),
    ).toBeOnTheScreen();
  });

  it("stays blocked when only some of multiple planned types are captured (regression: PR #987)", () => {
    renderWithProviders(
      <StepCard
        step={makeStep({
          plannedEvidenceTypes: ["photo", "video", "text"],
          capturedEvidenceTypes: ["photo"],
        })}
        {...defaultProps}
      />,
    );
    // Earlier `some(...)` logic would have unblocked the step after the
    // first capture; with `every` semantics it remains blocked until all
    // planned types are present.
    expect(screen.getByText("Add evidence to complete")).toBeOnTheScreen();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("unblocks only after every planned type has been captured", () => {
    renderWithProviders(
      <StepCard
        step={makeStep({
          plannedEvidenceTypes: ["photo", "text"],
          capturedEvidenceTypes: ["photo", "text"],
        })}
        {...defaultProps}
      />,
    );
    expect(screen.getByRole("checkbox")).toBeOnTheScreen();
    expect(screen.queryByText("Add evidence to complete")).toBeNull();
  });

  it("shows checkbox (not prompt) when evidence matches planned type", () => {
    renderWithProviders(
      <StepCard
        step={makeStep({
          plannedEvidenceTypes: ["photo"],
          capturedEvidenceTypes: ["photo"],
        })}
        {...defaultProps}
      />,
    );
    expect(screen.getByRole("checkbox")).toBeOnTheScreen();
    expect(screen.queryByText("Add evidence to complete")).toBeNull();
  });

  it("renders quick evidence actions for all missing planned types including text", () => {
    renderWithProviders(
      <StepCard
        step={makeStep({
          plannedEvidenceTypes: ["photo", "video", "text"],
          capturedEvidenceTypes: ["video"],
        })}
        {...defaultProps}
      />,
    );
    expect(screen.getByLabelText("Add Photo evidence")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Add Video evidence")).toBeNull();
    expect(screen.getByLabelText("Add Note evidence")).toBeOnTheScreen();
  });

  it("calls onQuickEvidence with the type when a quick action is pressed", () => {
    const onQuickEvidence = jest.fn();
    renderWithProviders(
      <StepCard
        step={makeStep({
          plannedEvidenceTypes: ["file"],
          capturedEvidenceTypes: [],
        })}
        {...defaultProps}
        onQuickEvidence={onQuickEvidence}
      />,
    );
    fireEvent.press(screen.getByLabelText("Add File evidence"));
    expect(onQuickEvidence).toHaveBeenCalledWith("file");
  });

  it("calls onQuickEvidence with 'text' when the Note quick action is pressed", () => {
    const onQuickEvidence = jest.fn();
    renderWithProviders(
      <StepCard
        step={makeStep({
          plannedEvidenceTypes: ["text"],
          capturedEvidenceTypes: [],
        })}
        {...defaultProps}
        onQuickEvidence={onQuickEvidence}
      />,
    );
    fireEvent.press(screen.getByLabelText("Add Note evidence"));
    expect(onQuickEvidence).toHaveBeenCalledWith("text");
  });

  it("hides quick evidence actions when onQuickEvidence callback is not provided", () => {
    const { onQuickEvidence: _omit, ...propsWithoutQuickEvidence } =
      defaultProps;
    renderWithProviders(
      <StepCard
        step={makeStep({
          plannedEvidenceTypes: ["photo"],
          capturedEvidenceTypes: [],
        })}
        {...propsWithoutQuickEvidence}
      />,
    );
    expect(screen.queryByLabelText("Add Photo evidence")).toBeNull();
  });

  it("renders no quick evidence actions when all planned types are captured", () => {
    renderWithProviders(
      <StepCard
        step={makeStep({
          plannedEvidenceTypes: ["photo", "video", "text"],
          capturedEvidenceTypes: ["photo", "video", "text"],
        })}
        {...defaultProps}
      />,
    );
    expect(screen.queryByLabelText("Add Photo evidence")).toBeNull();
    expect(screen.queryByLabelText("Add Video evidence")).toBeNull();
    expect(screen.queryByLabelText("Add Note evidence")).toBeNull();
  });

  it("renders no quick evidence actions when step is completed", () => {
    renderWithProviders(
      <StepCard
        step={makeStep({
          status: "completed",
          plannedEvidenceTypes: ["photo", "text"],
          capturedEvidenceTypes: [],
        })}
        {...defaultProps}
      />,
    );
    expect(screen.queryByLabelText("Add Photo evidence")).toBeNull();
    expect(screen.queryByLabelText("Add Note evidence")).toBeNull();
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
