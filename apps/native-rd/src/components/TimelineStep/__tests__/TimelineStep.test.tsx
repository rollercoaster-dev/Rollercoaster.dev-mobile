import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
  within,
} from "../../../__tests__/test-utils";
import { TimelineStep } from "../TimelineStep";
import type { TimelineStepChild } from "../TimelineStep";
import type { EvidenceItemData } from "../../EvidenceDrawer";

const baseStep = {
  id: "step-1",
  title: "Read the docs",
  status: "in-progress" as const,
  evidenceCount: 2,
};

const evidence: EvidenceItemData[] = [
  { id: "ev-1", type: "photo", label: "Progress photo" },
  { id: "ev-2", type: "link", label: "Useful article" },
];

const baseProps = {
  step: baseStep,
  stepIndex: 0,
  evidence,
  onNodePress: jest.fn(),
  onEvidencePress: jest.fn(),
};

describe("TimelineStep", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders step title and status pill", () => {
    renderWithProviders(<TimelineStep {...baseProps} />);
    expect(screen.getByText("Read the docs")).toBeOnTheScreen();
    expect(screen.getByText("Active")).toBeOnTheScreen();
  });

  it.each([
    { status: "completed" as const, label: "Done" },
    { status: "in-progress" as const, label: "Active" },
    { status: "pending" as const, label: "Pending" },
  ])('shows "$label" for $status status', ({ status, label }) => {
    renderWithProviders(
      <TimelineStep {...baseProps} step={{ ...baseStep, status }} />,
    );
    expect(screen.getByText(label)).toBeOnTheScreen();
  });

  it("evidence section is collapsed by default", () => {
    renderWithProviders(<TimelineStep {...baseProps} />);
    expect(screen.queryByText("Progress photo")).not.toBeOnTheScreen();
  });

  it("expands evidence on header tap", () => {
    renderWithProviders(<TimelineStep {...baseProps} />);
    fireEvent.press(screen.getByLabelText("Read the docs, Active"));
    expect(screen.getByText("Progress photo")).toBeOnTheScreen();
    expect(screen.getByText("Useful article")).toBeOnTheScreen();
  });

  it("collapses evidence on second header tap", () => {
    renderWithProviders(<TimelineStep {...baseProps} />);
    const header = screen.getByLabelText("Read the docs, Active");
    fireEvent.press(header);
    expect(screen.getByText("Progress photo")).toBeOnTheScreen();
    fireEvent.press(header);
    expect(screen.queryByText("Progress photo")).not.toBeOnTheScreen();
  });

  it('shows "No evidence yet" when empty', () => {
    renderWithProviders(<TimelineStep {...baseProps} evidence={[]} />);
    fireEvent.press(screen.getByLabelText("Read the docs, Active"));
    expect(screen.getByText("No evidence yet")).toBeOnTheScreen();
  });

  it("calls onNodePress when node is tapped", () => {
    const onNodePress = jest.fn();
    renderWithProviders(
      <TimelineStep {...baseProps} stepIndex={2} onNodePress={onNodePress} />,
    );
    fireEvent.press(screen.getByLabelText("Go to step 3: Read the docs"));
    expect(onNodePress).toHaveBeenCalledWith(2);
  });

  it("calls onEvidencePress with evidence id when an evidence card is tapped", () => {
    const onEvidencePress = jest.fn();
    renderWithProviders(
      <TimelineStep {...baseProps} onEvidencePress={onEvidencePress} />,
    );
    fireEvent.press(screen.getByLabelText("Read the docs, Active"));
    fireEvent.press(screen.getByLabelText("photo evidence: Progress photo"));
    expect(onEvidencePress).toHaveBeenCalledWith("ev-1");
    expect(onEvidencePress).toHaveBeenCalledTimes(1);
  });

  describe("sub-spine (children)", () => {
    const subSteps: TimelineStepChild[] = [
      {
        id: "c1",
        title: "First child",
        status: "completed",
        evidence: [{ id: "ce1", type: "link", label: "Child link" }],
      },
      {
        id: "c2",
        title: "Second child",
        status: "in-progress",
        evidence: [],
      },
      {
        id: "c3",
        title: "Third child",
        status: "pending",
        evidence: [{ id: "ce3", type: "photo", label: "Child photo" }],
      },
    ];

    const pendingSubSteps: TimelineStepChild[] = [
      { id: "p1", title: "Sub one", status: "pending", evidence: [] },
      { id: "p2", title: "Sub two", status: "pending", evidence: [] },
      { id: "p3", title: "Sub three", status: "pending", evidence: [] },
    ];

    it("renders no sub-spine when subSteps is absent", () => {
      renderWithProviders(<TimelineStep {...baseProps} />);
      expect(screen.queryByLabelText(/^Sub-step/)).toBeNull();
    });

    it("renders the parent and every sub-step title", () => {
      renderWithProviders(<TimelineStep {...baseProps} subSteps={subSteps} />);
      expect(screen.getByText("Read the docs")).toBeOnTheScreen();
      expect(screen.getByText("First child")).toBeOnTheScreen();
      expect(screen.getByText("Second child")).toBeOnTheScreen();
      expect(screen.getByText("Third child")).toBeOnTheScreen();
    });

    it("labels sub-step nodes with letter ordinals a, b, c", () => {
      renderWithProviders(
        <TimelineStep {...baseProps} subSteps={pendingSubSteps} />,
      );
      expect(screen.getByText("a")).toBeOnTheScreen();
      expect(screen.getByText("b")).toBeOnTheScreen();
      expect(screen.getByText("c")).toBeOnTheScreen();
    });

    it.each([
      { status: "completed" as const, glyph: "✓", badge: "Done" },
      { status: "in-progress" as const, glyph: "a", badge: "Active" },
      { status: "pending" as const, glyph: "a", badge: "Pending" },
    ])(
      "renders a $status sub-step with the right node glyph and status badge",
      ({ status, glyph, badge }) => {
        renderWithProviders(
          <TimelineStep
            {...baseProps}
            subSteps={[
              { id: "only", title: "Only child", status, evidence: [] },
            ]}
          />,
        );
        const node = screen.getByLabelText("Go to step a: Only child");
        expect(within(node).getByText(glyph)).toBeOnTheScreen();
        const card = screen.getByLabelText("Sub-step a: Only child");
        expect(within(card).getByText(badge)).toBeOnTheScreen();
      },
    );

    it("expands a sub-step's evidence independently of the parent", () => {
      renderWithProviders(<TimelineStep {...baseProps} subSteps={subSteps} />);
      fireEvent.press(screen.getByLabelText("Sub-step c: Third child"));
      expect(screen.getByText("Child photo")).toBeOnTheScreen();
      // Parent evidence stays collapsed — each drawer owns its own state.
      expect(screen.queryByText("Progress photo")).toBeNull();
    });

    it("shows the empty-evidence message for a sub-step with no evidence", () => {
      renderWithProviders(<TimelineStep {...baseProps} subSteps={subSteps} />);
      fireEvent.press(screen.getByLabelText("Sub-step b: Second child"));
      expect(screen.getByText("No evidence yet")).toBeOnTheScreen();
    });

    it("calls onNodePress with the parent index when a sub-step node is tapped", () => {
      const onNodePress = jest.fn();
      renderWithProviders(
        <TimelineStep
          {...baseProps}
          stepIndex={2}
          subSteps={pendingSubSteps}
          onNodePress={onNodePress}
        />,
      );
      fireEvent.press(screen.getByLabelText("Go to step b: Sub two"));
      expect(onNodePress).toHaveBeenCalledWith(2);
    });
  });
});
