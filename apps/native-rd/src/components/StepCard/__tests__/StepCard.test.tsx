import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import {
  StepCard,
  type StepCardStep,
  type StepCardStatus,
  type StepCardPart,
} from "../StepCard";

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

  it("renders rows in document order: band → title → quick actions → badge → foot prompt", () => {
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
    // The top band (carrying the status badge) is pinned above the scrollable
    // body, so the badge label marks the band's position at the top of the tree.
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

  // --- Parent band (sub-steps, #360): the purple "↳ [parent] · part N of M"
  // top band replaces the former quiet in-body context line. ---

  describe("parent band", () => {
    it("renders the purple parent band when parentTitle + part info are set", () => {
      renderWithProviders(
        <StepCard
          step={makeStep({
            parentTitle: "Wire the circuits",
            partIndex: 1,
            partTotal: 3,
          })}
          {...defaultProps}
        />,
      );
      expect(screen.getByTestId("step-card-parent-band")).toBeOnTheScreen();
      expect(
        screen.getByText("↳ Wire the circuits · part 1 of 3"),
      ).toBeOnTheScreen();
    });

    it("shows the plain band (no parent band) when parentTitle is null", () => {
      renderWithProviders(
        <StepCard step={makeStep({ parentTitle: null })} {...defaultProps} />,
      );
      expect(screen.queryByTestId("step-card-parent-band")).toBeNull();
      expect(screen.getByTestId("step-card-top-band")).toBeOnTheScreen();
    });

    it("shows the plain band when parentTitle is absent", () => {
      renderWithProviders(<StepCard step={makeStep()} {...defaultProps} />);
      expect(screen.queryByTestId("step-card-parent-band")).toBeNull();
      expect(screen.getByTestId("step-card-top-band")).toBeOnTheScreen();
    });

    it("falls back to the plain band when part info is missing", () => {
      // FocusModeScreen always supplies part numbers for real children, but a
      // parentTitle without them must not render a malformed band.
      renderWithProviders(
        <StepCard
          step={makeStep({ parentTitle: "Wire the circuits" })}
          {...defaultProps}
        />,
      );
      expect(screen.queryByTestId("step-card-parent-band")).toBeNull();
      expect(screen.getByTestId("step-card-top-band")).toBeOnTheScreen();
    });
  });

  // --- Overview mode (candidate C, #360): a parent card listing its parts as a
  // timeline spine, an evidence rollup, and the manual complete-parent invite. ---

  describe("overview mode", () => {
    const makePart = (overrides: Partial<StepCardPart> = {}): StepCardPart => ({
      id: "part-1",
      title: "Part one",
      status: "pending",
      evidenceCount: 0,
      ...overrides,
    });

    const overviewProps = {
      ...defaultProps,
      kind: "overview" as const,
    };

    const PARTS: StepCardPart[] = [
      { id: "p1", title: "Drill A", status: "completed", evidenceCount: 1 },
      { id: "p2", title: "Drill B", status: "pending", evidenceCount: 2 },
      { id: "p3", title: "Drill C", status: "pending", evidenceCount: 0 },
    ];

    it("renders a spine row for every part", () => {
      renderWithProviders(
        <StepCard
          step={makeStep({ title: "Wire the circuits" })}
          parts={PARTS}
          {...overviewProps}
        />,
      );
      expect(screen.getByTestId("overview-part-p1")).toBeOnTheScreen();
      expect(screen.getByTestId("overview-part-p2")).toBeOnTheScreen();
      expect(screen.getByTestId("overview-part-p3")).toBeOnTheScreen();
    });

    it("labels the overview band as an overview", () => {
      renderWithProviders(
        <StepCard
          step={makeStep({ title: "Wire the circuits" })}
          parts={PARTS}
          stepIndex={0}
          totalSteps={5}
          onToggleComplete={jest.fn()}
          onEvidenceTap={jest.fn()}
          kind="overview"
        />,
      );
      expect(screen.getByText("1 of 5 · Overview")).toBeOnTheScreen();
    });

    it("shows a check icon only for completed parts", () => {
      renderWithProviders(
        <StepCard
          step={makeStep({ title: "Wire the circuits" })}
          parts={[
            { id: "p1", title: "Drill A", status: "completed", evidenceCount: 0 }, // prettier-ignore
            { id: "p2", title: "Drill B", status: "pending", evidenceCount: 0 },
            { id: "p3", title: "Drill C", status: "pending", evidenceCount: 0 },
          ]}
          {...overviewProps}
        />,
      );
      // One done part → exactly one ✓. While parts remain the foot is a text
      // prompt (no checkbox), so no stray checkmark leaks in. The icon is
      // accessibilityElementsHidden (the row carries the full label), so include
      // hidden elements to count the rendered glyph.
      expect(
        screen.getAllByText("✓", { includeHiddenElements: true }),
      ).toHaveLength(1);
    });

    it("announces each part with its title and status", () => {
      renderWithProviders(
        <StepCard
          step={makeStep({ title: "Wire the circuits" })}
          parts={PARTS}
          {...overviewProps}
        />,
      );
      expect(screen.getByLabelText("Drill A, Completed")).toBeOnTheScreen();
      expect(screen.getByLabelText("Drill B, Pending")).toBeOnTheScreen();
    });

    it("rolls up evidence as the sum across all parts", () => {
      renderWithProviders(
        <StepCard
          step={makeStep({ title: "Wire the circuits" })}
          parts={PARTS}
          {...overviewProps}
        />,
      );
      // 1 + 2 + 0 = 3
      const rollup = screen.getByTestId("overview-evidence-rollup");
      expect(rollup.props.accessibilityLabel).toBe("Evidence across parts: 3");
    });

    it("shows a quiet prompt (no completion control) while parts are pending", () => {
      renderWithProviders(
        <StepCard
          step={makeStep({ id: "parent-1", title: "Wire the circuits" })}
          parts={PARTS}
          {...overviewProps}
        />,
      );
      // No complete invite, and no bespoke navigation action — just the prompt,
      // mirroring a blocked leaf card's foot.
      expect(screen.queryByRole("checkbox")).toBeNull();
      expect(
        screen.getByTestId("overview-parts-pending-prompt"),
      ).toBeOnTheScreen();
      expect(
        screen.getByText("Complete the parts to finish"),
      ).toBeOnTheScreen();
    });

    it("shows the mark-parent-complete invite once every part is done", () => {
      renderWithProviders(
        <StepCard
          step={makeStep({ title: "Wire the circuits" })}
          parts={[
            makePart({ id: "p1", title: "Drill A", status: "completed" }),
            makePart({ id: "p2", title: "Drill B", status: "completed" }),
          ]}
          {...overviewProps}
        />,
      );
      expect(screen.queryByTestId("overview-parts-pending-prompt")).toBeNull();
      expect(
        screen.getByRole("checkbox", {
          name: 'Mark "Wire the circuits" complete',
        }),
      ).toBeOnTheScreen();
    });

    it("calls onToggleComplete from the complete invite", () => {
      const onToggleComplete = jest.fn();
      renderWithProviders(
        <StepCard
          step={makeStep({ id: "parent-1", title: "Wire the circuits" })}
          parts={[makePart({ id: "p1", status: "completed" })]}
          {...overviewProps}
          onToggleComplete={onToggleComplete}
        />,
      );
      fireEvent.press(screen.getByRole("checkbox"));
      expect(onToggleComplete).toHaveBeenCalledWith("parent-1");
    });

    it("opens a part's card when its spine row is tapped", () => {
      const onOpenPart = jest.fn();
      renderWithProviders(
        <StepCard
          step={makeStep({ title: "Wire the circuits" })}
          parts={PARTS}
          {...overviewProps}
          onOpenPart={onOpenPart}
        />,
      );
      fireEvent.press(screen.getByTestId("overview-part-p2"));
      expect(onOpenPart).toHaveBeenCalledWith("p2");
    });

    it("marks spine rows as buttons when navigable", () => {
      renderWithProviders(
        <StepCard
          step={makeStep({ title: "Wire the circuits" })}
          parts={PARTS}
          {...overviewProps}
          onOpenPart={jest.fn()}
        />,
      );
      // The row keeps its title+status label; the button role + open hint signal
      // it is now actionable (a part's own card).
      expect(
        screen.getByLabelText("Drill A, Completed").props.accessibilityRole,
      ).toBe("button");
    });

    it("leaves spine rows read-only when no navigation handler is supplied", () => {
      renderWithProviders(
        <StepCard
          step={makeStep({ title: "Wire the circuits" })}
          parts={PARTS}
          {...overviewProps}
        />,
      );
      expect(
        screen.getByLabelText("Drill A, Completed").props.accessibilityRole,
      ).toBe("text");
    });

    it("shows a checked, completed invite when the parent itself is complete", () => {
      renderWithProviders(
        <StepCard
          step={makeStep({ title: "Wire the circuits", status: "completed" })}
          parts={[
            makePart({ id: "p1", status: "completed" }),
            makePart({ id: "p2", status: "pending" }),
          ]}
          {...overviewProps}
        />,
      );
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox.props.accessibilityState?.checked).toBe(true);
      expect(checkbox.props.accessibilityLabel).toBe("Completed");
    });
  });
});
