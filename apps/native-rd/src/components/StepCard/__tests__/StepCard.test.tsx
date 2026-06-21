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
    expect(screen.getByText("1 of 5")).toBeOnTheScreen();
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

  it("does not render the evidence badge when count is 0", () => {
    renderWithProviders(
      <StepCard step={makeStep({ evidenceCount: 0 })} {...defaultProps} />,
    );
    expect(screen.queryByText("+ add evidence")).toBeNull();
    expect(screen.queryByLabelText(/evidence items, tap to view/)).toBeNull();
  });

  it("renders the evidence badge when count is > 0", () => {
    renderWithProviders(
      <StepCard step={makeStep({ evidenceCount: 2 })} {...defaultProps} />,
    );
    expect(screen.getByText("2 items")).toBeOnTheScreen();
    expect(
      screen.getByLabelText("2 evidence items, tap to view"),
    ).toBeOnTheScreen();
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
    expect(onToggleComplete).toHaveBeenCalledWith("step-1");
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

  it("does not render the planned-types chip row (collapsed into action buttons)", () => {
    renderWithProviders(
      <StepCard
        step={makeStep({
          plannedEvidenceTypes: ["photo", "text"],
          capturedEvidenceTypes: [],
        })}
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
      screen.getByLabelText("Add Photo to complete this step"),
    ).toBeOnTheScreen();
  });

  it("stays blocked when only some of multiple planned types are captured", () => {
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
    expect(onQuickEvidence).toHaveBeenCalledWith("step-1", "file");
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
    expect(onQuickEvidence).toHaveBeenCalledWith("step-1", "text");
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

  // --- Evidence rail (Phase 2): always-visible add affordance + read-only
  // summary of the pieces already captured. We never surface what is
  // "missing" — adding evidence simply reveals the completion checkbox. ---

  describe("evidence rail", () => {
    it("always shows the Add evidence button, even with no evidence", () => {
      renderWithProviders(<StepCard step={makeStep()} {...defaultProps} />);
      expect(screen.getByTestId("step-card-add-evidence")).toBeOnTheScreen();
      expect(screen.getByText("+ Add evidence")).toBeOnTheScreen();
    });

    it("calls onEvidenceTap when the Add evidence button is pressed", () => {
      const onEvidenceTap = jest.fn();
      renderWithProviders(
        <StepCard
          step={makeStep()}
          {...defaultProps}
          onEvidenceTap={onEvidenceTap}
        />,
      );
      fireEvent.press(screen.getByTestId("step-card-add-evidence"));
      expect(onEvidenceTap).toHaveBeenCalledTimes(1);
    });

    it("renders a read-only chip for each captured evidence type", () => {
      renderWithProviders(
        <StepCard
          step={makeStep({ capturedEvidenceTypes: ["photo", "text"] })}
          {...defaultProps}
        />,
      );
      expect(
        screen.getByTestId("step-card-evidence-chip-photo"),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId("step-card-evidence-chip-text"),
      ).toBeOnTheScreen();
      // Chips are status, not actions.
      expect(
        screen.getByTestId("step-card-evidence-chip-photo").props
          .accessibilityRole,
      ).toBe("text");
    });

    it("shows the captured chip for a partially-captured step without any 'missing' marker", () => {
      renderWithProviders(
        <StepCard
          step={makeStep({
            plannedEvidenceTypes: ["photo", "text"],
            capturedEvidenceTypes: ["photo"],
          })}
          {...defaultProps}
        />,
      );
      expect(screen.getByText("+ Add evidence")).toBeOnTheScreen();
      expect(
        screen.getByTestId("step-card-evidence-chip-photo"),
      ).toBeOnTheScreen();
    });

    // The rail never tells the user something is missing/needed — adding
    // evidence simply unlocks the checkbox. Locks in Joe's directive
    // (2026-06-21): no deficiency framing, ever.
    it.each([
      [
        "partially captured",
        {
          plannedEvidenceTypes: ["photo", "text"],
          capturedEvidenceTypes: ["photo"],
        },
      ],
      [
        "nothing captured",
        { plannedEvidenceTypes: ["photo"], capturedEvidenceTypes: [] },
      ],
      [
        "no planned types",
        { plannedEvidenceTypes: null, capturedEvidenceTypes: [] },
      ],
      [
        "completed",
        {
          status: "completed" as StepCardStatus,
          plannedEvidenceTypes: ["photo"],
          capturedEvidenceTypes: [],
        },
      ],
    ])("never shows a 'needed'/'missing' marker (%s)", (_label, overrides) => {
      renderWithProviders(
        <StepCard step={makeStep(overrides)} {...defaultProps} />,
      );
      expect(screen.queryByText(/needed/i)).toBeNull();
      expect(screen.queryByText(/missing/i)).toBeNull();
      expect(screen.queryByText(/•/)).toBeNull();
    });
  });

  // --- Reading order (locks in the zoned scaffold: scrollable body, then the
  // pinned foot). The completion prompt/checkbox moved out of the scroll body
  // into the foot, so it now follows the evidence badge in document order. ---

  it("renders rows in document order: meta → title → quick actions → badge → foot prompt", () => {
    renderWithProviders(
      <StepCard
        step={makeStep({
          title: "Review component architecture",
          evidenceCount: 1,
          plannedEvidenceTypes: ["photo"],
          capturedEvidenceTypes: [],
          status: "in-progress",
        })}
        {...defaultProps}
      />,
    );
    const tree = JSON.stringify(screen.toJSON());
    // "1 of 5" is split into separate JSX children by interpolation, so it
    // doesn't appear as one contiguous substring. Use the status badge label
    // (a single Text child) to mark the metaRow's position instead — since
    // the badge sits inside metaRow, locating it locates the row.
    const positions = {
      meta: tree.indexOf("In Progress"),
      title: tree.indexOf("Review component architecture"),
      quickActions: tree.indexOf("Add Photo evidence"),
      badge: tree.indexOf("1 item"),
      prompt: tree.indexOf("Add evidence to complete"),
    };
    Object.values(positions).forEach((idx) => expect(idx).toBeGreaterThan(-1));
    expect(positions.meta).toBeLessThan(positions.title);
    expect(positions.title).toBeLessThan(positions.quickActions);
    // Evidence badge stays in the scroll body; the foot prompt comes last.
    expect(positions.quickActions).toBeLessThan(positions.badge);
    expect(positions.badge).toBeLessThan(positions.prompt);
  });

  // --- Parent context line (sub-steps, #292) ---

  describe("parent context line", () => {
    it("renders the context line when parentTitle is set", () => {
      renderWithProviders(
        <StepCard
          step={makeStep({ parentTitle: "Wire the circuits" })}
          {...defaultProps}
        />,
      );
      expect(screen.getByTestId("step-card-parent-context")).toBeOnTheScreen();
      expect(screen.getByText("↳ in Wire the circuits")).toBeOnTheScreen();
    });

    it("omits the context line when parentTitle is null", () => {
      renderWithProviders(
        <StepCard step={makeStep({ parentTitle: null })} {...defaultProps} />,
      );
      expect(screen.queryByTestId("step-card-parent-context")).toBeNull();
    });

    it("omits the context line when parentTitle is absent", () => {
      renderWithProviders(<StepCard step={makeStep()} {...defaultProps} />);
      expect(screen.queryByTestId("step-card-parent-context")).toBeNull();
    });
  });
});
