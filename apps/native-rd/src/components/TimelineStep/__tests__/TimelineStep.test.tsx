import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { TimelineStep } from "../TimelineStep";
import type { EvidenceItemData } from "../../EvidenceDrawer";

const baseStep = {
  id: "step-1",
  title: "Read the docs",
  status: "in-progress" as const,
  evidenceCount: 2,
};

const evidence: EvidenceItemData[] = [
  { id: "ev-1", type: "photo", label: "Screenshot of progress" },
  { id: "ev-2", type: "link", label: "Useful article" },
];

const baseProps = {
  step: baseStep,
  stepIndex: 0,
  evidence,
  onNodePress: jest.fn(),
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
    expect(screen.queryByText("Screenshot of progress")).not.toBeOnTheScreen();
  });

  it("expands evidence on header tap", () => {
    renderWithProviders(<TimelineStep {...baseProps} />);
    fireEvent.press(screen.getByLabelText("Read the docs, Active"));
    expect(screen.getByText("Screenshot of progress")).toBeOnTheScreen();
    expect(screen.getByText("Useful article")).toBeOnTheScreen();
  });

  it("collapses evidence on second header tap", () => {
    renderWithProviders(<TimelineStep {...baseProps} />);
    const header = screen.getByLabelText("Read the docs, Active");
    fireEvent.press(header);
    expect(screen.getByText("Screenshot of progress")).toBeOnTheScreen();
    fireEvent.press(header);
    expect(screen.queryByText("Screenshot of progress")).not.toBeOnTheScreen();
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
});
