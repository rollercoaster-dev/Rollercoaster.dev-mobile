import React from "react";
import { StyleSheet } from "react-native";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { i18n } from "../../../i18n";
import {
  MiniTimeline,
  type MiniTimelineStep,
  type StepStatus,
} from "../MiniTimeline";

const TIMELINE_LABEL = i18n.t("common:timeline.a11y.label");

const defaultProps = {
  currentIndex: 0,
  onStepTap: jest.fn(),
  onTimelineTap: jest.fn(),
  accessibilityLabel: TIMELINE_LABEL,
};

const makeSteps = (...statuses: StepStatus[]): MiniTimelineStep[] =>
  statuses.map((status) => ({ status }));

const stepLabel = (index: number, status: StepStatus) =>
  i18n.t("common:timeline.a11y.step", { index, status });

const goalLabel = () => i18n.t("common:timeline.a11y.goalEvidence");

describe("MiniTimeline", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("rendering", () => {
    it("renders correct number of step + goal nodes", () => {
      renderWithProviders(
        <MiniTimeline
          steps={makeSteps("completed", "in-progress", "pending")}
          {...defaultProps}
        />,
      );
      // 3 step nodes + 1 goal node + 1 hint area = 5 buttons
      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(5);
    });

    it("renders hint text", () => {
      renderWithProviders(
        <MiniTimeline steps={makeSteps("pending")} {...defaultProps} />,
      );
      expect(
        screen.getByText(i18n.t("common:timeline.hint")),
      ).toBeOnTheScreen();
    });

    it("renders goal node", () => {
      renderWithProviders(
        <MiniTimeline steps={makeSteps("pending")} {...defaultProps} />,
      );
      expect(screen.getByLabelText(goalLabel())).toBeOnTheScreen();
    });
  });

  describe("interactions", () => {
    it("calls onStepTap with correct index when node pressed", () => {
      const onStepTap = jest.fn();
      renderWithProviders(
        <MiniTimeline
          steps={makeSteps("completed", "in-progress", "pending")}
          {...defaultProps}
          onStepTap={onStepTap}
        />,
      );
      fireEvent.press(screen.getByLabelText(stepLabel(2, "in-progress")));
      expect(onStepTap).toHaveBeenCalledWith(1);
    });

    it("calls onStepTap with steps.length when goal node pressed", () => {
      const onStepTap = jest.fn();
      renderWithProviders(
        <MiniTimeline
          steps={makeSteps("completed", "pending")}
          {...defaultProps}
          onStepTap={onStepTap}
        />,
      );
      fireEvent.press(screen.getByLabelText(goalLabel()));
      expect(onStepTap).toHaveBeenCalledWith(2);
    });

    it("calls onTimelineTap when hint area pressed", () => {
      const onTimelineTap = jest.fn();
      renderWithProviders(
        <MiniTimeline
          steps={makeSteps("pending")}
          {...defaultProps}
          onTimelineTap={onTimelineTap}
        />,
      );
      fireEvent.press(screen.getByLabelText(TIMELINE_LABEL));
      expect(onTimelineTap).toHaveBeenCalled();
    });
  });

  describe("accessibility", () => {
    it.each([["completed"], ["in-progress"], ["pending"]] satisfies [
      StepStatus,
    ][])("step node has correct label for %s status", (status) => {
      renderWithProviders(
        <MiniTimeline steps={makeSteps(status)} {...defaultProps} />,
      );
      expect(screen.getByLabelText(stepLabel(1, status))).toBeOnTheScreen();
    });

    it("hint area has accessible role and label", () => {
      renderWithProviders(
        <MiniTimeline steps={makeSteps("pending")} {...defaultProps} />,
      );
      const hintArea = screen.getByLabelText(TIMELINE_LABEL);
      expect(hintArea).toBeOnTheScreen();
      expect(hintArea.props.accessibilityRole).toBe("button");
    });

    it("hint area has accessibility hint", () => {
      renderWithProviders(
        <MiniTimeline steps={makeSteps("pending")} {...defaultProps} />,
      );
      const hintArea = screen.getByLabelText(TIMELINE_LABEL);
      expect(hintArea.props.accessibilityHint).toBe(
        i18n.t("common:timeline.a11y.hint"),
      );
    });

    it("supports custom accessibilityLabel", () => {
      renderWithProviders(
        <MiniTimeline
          steps={makeSteps("pending")}
          {...defaultProps}
          accessibilityLabel="Custom label"
        />,
      );
      expect(screen.getByLabelText("Custom label")).toBeOnTheScreen();
    });
  });

  describe("E2E mode gating", () => {
    const originalE2E = process.env.EXPO_PUBLIC_E2E_MODE;
    beforeAll(() => {
      process.env.EXPO_PUBLIC_E2E_MODE = "true";
    });
    afterAll(() => {
      process.env.EXPO_PUBLIC_E2E_MODE = originalE2E;
    });

    it("drops Pressable a11y wrapper so the inner Text is reachable", () => {
      renderWithProviders(
        <MiniTimeline steps={makeSteps("pending")} {...defaultProps} />,
      );
      // Under EXPO_PUBLIC_E2E_MODE=true the wrapping Pressable's
      // `accessible+role+label` props are dropped, so iOS no longer
      // collapses the inner hint Text into the composed parent label.
      // Maestro can now match the inner text literally.
      expect(screen.queryByLabelText(TIMELINE_LABEL)).toBeNull();
      expect(
        screen.getByText(i18n.t("common:timeline.hint")),
      ).toBeOnTheScreen();
    });
  });

  describe("sub-spine child nodes", () => {
    const nodeWidth = (index: number): number | undefined => {
      const flat = StyleSheet.flatten(
        screen.getByTestId(`timeline-node-${index}`).props.style,
      ) as Record<string, unknown> | null;
      return flat?.width as number | undefined;
    };

    it("renders a child step with the smaller nodeChild width", () => {
      // Parent at index 0, its sub-step at index 1.
      renderWithProviders(
        <MiniTimeline
          steps={[
            { status: "completed" },
            { status: "pending", isChild: true },
          ]}
          {...defaultProps}
          currentIndex={5}
        />,
      );
      // Standard top-level node is 14; sub-step node is 10.
      expect(nodeWidth(0)).toBe(14);
      expect(nodeWidth(1)).toBe(10);
    });

    it("renders a non-child step with the standard node width", () => {
      renderWithProviders(
        <MiniTimeline
          steps={[{ status: "pending", isChild: false }]}
          {...defaultProps}
          currentIndex={5}
        />,
      );
      expect(nodeWidth(0)).toBe(14);
    });

    it("keeps the node count unchanged when a child is present", () => {
      // 1 parent + 1 child + 1 flat = 3 step nodes + goal node + hint = 5.
      renderWithProviders(
        <MiniTimeline
          steps={[
            { status: "completed" },
            { status: "pending", isChild: true },
            { status: "pending" },
          ]}
          {...defaultProps}
        />,
      );
      expect(screen.getAllByRole("button")).toHaveLength(5);
      expect(screen.getByLabelText(goalLabel())).toBeOnTheScreen();
    });
  });

  describe("edge cases", () => {
    it("renders only goal node when steps array is empty", () => {
      renderWithProviders(<MiniTimeline steps={[]} {...defaultProps} />);
      expect(screen.getByLabelText(goalLabel())).toBeOnTheScreen();
      // Goal node + hint area = 2 buttons
      expect(screen.getAllByRole("button")).toHaveLength(2);
    });

    it("single step renders correctly", () => {
      renderWithProviders(
        <MiniTimeline steps={makeSteps("in-progress")} {...defaultProps} />,
      );
      expect(
        screen.getByLabelText(stepLabel(1, "in-progress")),
      ).toBeOnTheScreen();
      expect(screen.getByLabelText(goalLabel())).toBeOnTheScreen();
    });
  });
});
