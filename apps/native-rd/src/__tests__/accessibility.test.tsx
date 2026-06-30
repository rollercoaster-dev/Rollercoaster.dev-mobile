/**
 * Consolidated accessibility contract tests
 *
 * Covers sole a11y coverage for: GoalCard, ProgressBar, Checkbox,
 * CollapsibleSection, ConfirmDeleteModal.
 *
 * These tests verify screen-reader-facing props (roles, labels, states, values)
 * that no other test file covers.
 */

import React from "react";
import { Modal, StyleSheet, Text as RNText, View } from "react-native";
import { renderWithProviders, screen, fireEvent } from "./test-utils";
import {
  expectAccessible,
  expectAccessibleRole,
  expectAccessibleLabel,
  expectAccessibleValue,
  expectAccessibleState,
  expectModalAccessibility,
  expectLiveRegion,
} from "./a11y-helpers";
import { i18n } from "../i18n";
import { GoalCard, type GoalCardGoal } from "../components/GoalCard";
import { ProgressBar } from "../components/ProgressBar";
import { Checkbox } from "../components/Checkbox";
import { CollapsibleSection } from "../components/CollapsibleSection";
import { ConfirmDeleteModal } from "../screens/ConfirmDeleteModal/ConfirmDeleteModal";
import { StepList, type Step } from "../components/StepList/StepList";
import { MiniTimeline } from "../components/MiniTimeline/MiniTimeline";
import {
  TimelineStep,
  type TimelineStepChild,
} from "../components/TimelineStep/TimelineStep";
import { SMALL_NODE_SIZE } from "../components/TimelineNode/TimelineNode.styles";

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
}));

// StepList renders inside a GestureHandlerRootView and its rows wrap
// GestureDetector; the chainable Proxy mirrors StepList.test.tsx so the gesture
// builder chains resolve without the native module.
jest.mock("react-native-gesture-handler", () => {
  const chainable = () => new Proxy({}, { get: () => chainable });
  return {
    GestureHandlerRootView: ({ children }: { children: React.ReactNode }) =>
      children,
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    Gesture: {
      Pan: chainable,
      LongPress: chainable,
      Simultaneous: chainable,
    },
  };
});

jest.mock("../utils/haptics", () => ({
  triggerDragStart: jest.fn(),
  triggerDragDrop: jest.fn(),
}));

// Mutable so the reparent-controls block can flip on "accessible controls"
// (showAccessibleControls = screenReaderActive || animationPref === "none").
// Defaults to "full" — the real default — so every other test is unaffected.
let mockAnimationPref = "full";
jest.mock("../hooks/useAnimationPref", () => ({
  useAnimationPref: () => ({
    animationPref: mockAnimationPref,
    shouldAnimate: mockAnimationPref !== "none",
    shouldReduceMotion: mockAnimationPref === "none",
    setAnimationPref: jest.fn(),
  }),
}));

const activeGoal: GoalCardGoal = {
  id: "1",
  title: "Learn TypeScript",
  status: "active",
  stepsTotal: 5,
  stepsCompleted: 2,
  nextStepTitle: null,
};

const completedGoal: GoalCardGoal = {
  id: "2",
  title: "Read a book",
  status: "completed",
  stepsTotal: 3,
  stepsCompleted: 3,
  nextStepTitle: null,
};

const labelFor = (goal: GoalCardGoal) =>
  i18n.t("goals:card.a11y.label", {
    title: goal.title,
    stepsCompleted: goal.stepsCompleted,
    stepsTotal: goal.stepsTotal,
    status: i18n.t(`common:status.${goal.status}`),
  });

describe("Accessibility Contracts", () => {
  describe("GoalCard", () => {
    it("has composite label with progress and status", () => {
      renderWithProviders(<GoalCard goal={activeGoal} onPress={jest.fn()} />);
      const card = screen.getByRole("button", {
        name: labelFor(activeGoal),
      });
      expect(card).toBeOnTheScreen();
      expect(card.props.accessibilityHint).toBe(i18n.t("goals:card.a11y.hint"));
    });

    it("title has header role and progressbar has correct value", () => {
      renderWithProviders(<GoalCard goal={activeGoal} onPress={jest.fn()} />);
      screen.getByRole("header", { name: "Learn TypeScript" });
      const progressBar = screen.getByRole("progressbar");
      expectAccessibleValue(progressBar, { min: 0, max: 100, now: 40 });
    });

    it("reflects completed status in label", () => {
      renderWithProviders(
        <GoalCard goal={completedGoal} onPress={jest.fn()} />,
      );
      screen.getByRole("button", { name: labelFor(completedGoal) });
    });

    it("has no button role when non-interactive", () => {
      renderWithProviders(<GoalCard goal={activeGoal} />);
      expect(screen.queryByRole("button")).toBeNull();
    });

    // #292 leaf-led next step: a pending-leaf hero adds a visual "↳ in [parent]"
    // context line. GoalCard.test.tsx covers that the line renders and that the
    // next step is named in the label; this locks the a11y invariant the line is
    // purely decorative — never in the screen-reader label, never a control.
    it("keeps the leaf context line out of the label and gives it no role", () => {
      const leafGoal: GoalCardGoal = {
        id: "9",
        title: "Rewire the kitchen",
        status: "active",
        stepsTotal: 4,
        stepsCompleted: 1,
        nextStepTitle: "Fit the 20-amp circuit",
        nextStepContext: "↳ in Wire the circuits",
      };
      renderWithProviders(<GoalCard goal={leafGoal} onPress={jest.fn()} />);

      const expectedLabel = i18n.t("goals:card.a11y.labelWithNextStep", {
        title: leafGoal.title,
        stepsCompleted: leafGoal.stepsCompleted,
        stepsTotal: leafGoal.stepsTotal,
        status: i18n.t("common:status.active"),
        nextStep: leafGoal.nextStepTitle,
      });
      const card = screen.getByRole("button", { name: expectedLabel });
      expect(card.props.accessibilityLabel).not.toContain("↳");

      const context = screen.getByTestId("goal-card-next-step-context");
      expect(context.props.accessibilityRole).toBeUndefined();
    });
  });

  describe("ProgressBar", () => {
    it("has progressbar role with accessible=true", () => {
      renderWithProviders(<ProgressBar progress={0.5} />);
      const bar = screen.getByRole("progressbar");
      expectAccessible(bar);
      expectAccessibleRole(bar, "progressbar");
    });

    test.each([
      [0, 0],
      [0.5, 50],
      [0.333, 33],
      [1.5, 100],
    ] as const)(
      "reports correct value at progress=%s (now=%i)",
      (progress, expectedNow) => {
        renderWithProviders(<ProgressBar progress={progress} />);
        const bar = screen.getByRole("progressbar");
        expectAccessibleValue(bar, { min: 0, max: 100, now: expectedNow });
      },
    );
  });

  describe("Checkbox", () => {
    it("has checkbox role, label, and checked state", () => {
      renderWithProviders(
        <Checkbox checked={false} onToggle={jest.fn()} label="Step one" />,
      );
      const checkbox = screen.getByRole("checkbox", { name: "Step one" });
      expectAccessibleState(checkbox, { checked: false });
    });

    it("exposes checked=true when checked", () => {
      renderWithProviders(
        <Checkbox checked onToggle={jest.fn()} label="Step one" />,
      );
      const checkbox = screen.getByRole("checkbox", { name: "Step one" });
      expectAccessibleState(checkbox, { checked: true });
    });

    it("label has edit hint when onLabelPress provided", () => {
      renderWithProviders(
        <Checkbox
          checked={false}
          onToggle={jest.fn()}
          label="Step one"
          onLabelPress={jest.fn()}
        />,
      );
      const label = screen.getByLabelText("Edit Step one");
      expect(label.props.accessibilityHint).toBe("Tap to edit step title");
    });
  });

  describe("CollapsibleSection", () => {
    it("has button role with expanded state and toggles", () => {
      renderWithProviders(
        <CollapsibleSection title="Details" defaultExpanded>
          <RNText>Content</RNText>
        </CollapsibleSection>,
      );
      const button = screen.getByRole("button", {
        name: "Details, collapse",
      });
      expectAccessibleState(button, { expanded: true });

      fireEvent.press(button);

      const collapsed = screen.getByRole("button", {
        name: "Details, expand",
      });
      expectAccessibleState(collapsed, { expanded: false });
    });
  });

  describe("Modals", () => {
    function assertModalA11y() {
      const modal = screen.UNSAFE_getByType(Modal);
      expectModalAccessibility(modal);

      const liveViews = screen
        .UNSAFE_getAllByType(View)
        .filter(
          (v: { props: { accessibilityLiveRegion?: string } }) =>
            v.props.accessibilityLiveRegion === "polite",
        );
      expect(liveViews.length).toBeGreaterThan(0);
      expectLiveRegion(liveViews[0]!, "polite");
    }

    it("ConfirmDeleteModal has accessibilityViewIsModal and liveRegion", () => {
      renderWithProviders(
        <ConfirmDeleteModal
          visible
          onCancel={jest.fn()}
          onConfirm={jest.fn()}
          title="Delete this item?"
          message="This action cannot be undone."
        />,
      );
      assertModalA11y();
    });

    it("ConfirmDeleteModal title has header role", () => {
      renderWithProviders(
        <ConfirmDeleteModal
          visible
          onCancel={jest.fn()}
          onConfirm={jest.fn()}
          title="Delete this item?"
          message="This action cannot be undone."
        />,
      );
      screen.getByRole("header", { name: "Delete this item?" });
    });
  });

  // Sub-step authoring affordance shipped in #291: the "+ add sub-step" ghost
  // row, its expanded title input, and the submit button. Each renders once per
  // top-level group whenever onCreateSubStep is wired.
  describe("StepList sub-step affordance", () => {
    const oneParent = (title: string): Step[] => [
      { id: "p", title, completed: false },
    ];

    it.each([["Wire the circuits"], ["Read chapter one"]])(
      'ghost row has button role, label, and hint for parent "%s"',
      (title) => {
        renderWithProviders(
          <StepList steps={oneParent(title)} onCreateSubStep={jest.fn()} />,
        );
        const ghost = screen.getByTestId("step-list-add-sub-step-p");
        expectAccessibleRole(ghost, "button");
        expectAccessibleLabel(
          ghost,
          i18n.t("editGoal:stepList.addSubStepA11yLabel", { title }),
        );
        expect(ghost.props.accessibilityHint).toBe(
          i18n.t("editGoal:stepList.addSubStepA11yHint"),
        );
      },
    );

    it("exposes input label and submit-button role/label once expanded", () => {
      const title = "Wire the circuits";
      renderWithProviders(
        <StepList steps={oneParent(title)} onCreateSubStep={jest.fn()} />,
      );
      fireEvent.press(screen.getByTestId("step-list-add-sub-step-p"));

      const input = screen.getByTestId("step-list-sub-step-input-p");
      expectAccessibleLabel(
        input,
        i18n.t("editGoal:stepList.addSubStepInputA11yLabel", { title }),
      );

      const submit = screen.getByTestId("step-list-add-sub-step-button-p");
      expectAccessibleRole(submit, "button");
      expectAccessibleLabel(
        submit,
        i18n.t("editGoal:stepList.addSubStepButtonA11y", { title }),
      );
    });

    it("keeps the indentation left rail out of the accessibility tree", () => {
      // The child-row left rail is a colour-coded structural decoration (D11);
      // it must stay hidden so it is never a separate screen-reader stop.
      renderWithProviders(
        <StepList
          steps={[
            { id: "p", title: "Parent", completed: false },
            { id: "c", title: "Child", completed: false, parentStepId: "p" },
          ]}
          onCreateSubStep={jest.fn()}
        />,
      );
      const hiddenDecorations = screen
        .UNSAFE_getAllByType(View)
        .filter(
          (v) =>
            v.props.accessibilityElementsHidden === true &&
            v.props.importantForAccessibility === "no",
        );
      expect(hiddenDecorations.length).toBeGreaterThanOrEqual(1);
    });
  });

  // Screen-reader reparent controls shipped in #291 (#330 lineage): the
  // nest-under trigger, the target picker modal + its rows, and the un-nest
  // button. They surface only when showAccessibleControls is true, which
  // animationPref "none" forces.
  describe("StepList nest / un-nest controls", () => {
    beforeEach(() => {
      mockAnimationPref = "none";
    });
    afterEach(() => {
      mockAnimationPref = "full";
    });

    // One fixture covers all three controls and renders exactly one picker
    // Modal: the parent has children (no nest), the lone root nests under it,
    // the child un-nests.
    const mixed: Step[] = [
      { id: "p", title: "Parent", completed: false },
      { id: "c1", title: "Child one", completed: false, parentStepId: "p" },
      { id: "r", title: "Lone root", completed: false },
    ];

    function renderMixed() {
      renderWithProviders(
        <StepList
          steps={mixed}
          onReorderSteps={jest.fn()}
          onReparentStep={jest.fn()}
        />,
      );
    }

    it("nest-under trigger has button role and label", () => {
      renderMixed();
      const trigger = screen.getByTestId("step-nest-under-r");
      expectAccessibleRole(trigger, "button");
      expectAccessibleLabel(
        trigger,
        i18n.t("editGoal:stepList.a11y.nestUnderTriggerA11y"),
      );
    });

    it("un-nest control has button role and label for a child", () => {
      renderMixed();
      const unNest = screen.getByTestId("step-un-nest-c1");
      expectAccessibleRole(unNest, "button");
      expectAccessibleLabel(
        unNest,
        i18n.t("editGoal:stepList.a11y.unNestA11y"),
      );
    });

    it("picker is a modal and its rows carry button role + per-target label", () => {
      renderMixed();
      fireEvent.press(screen.getByTestId("step-nest-under-r"));

      expectModalAccessibility(screen.UNSAFE_getByType(Modal));

      const row = screen.getByTestId("step-nest-target-r-p");
      expectAccessibleRole(row, "button");
      expectAccessibleLabel(
        row,
        i18n.t("editGoal:stepList.a11y.nestUnderA11y", { title: "Parent" }),
      );
    });
  });

  // #292 sub-step nodes render smaller than top-level nodes but must still meet
  // the 44pt touch target via a widened hitSlop. Existing MiniTimeline tests
  // lock the visual node width; these lock the compensating hitSlop contract.
  describe("MiniTimeline node hit targets", () => {
    const stepLabel = (index: number, status: string) =>
      i18n.t("common:timeline.a11y.step", { index, status });

    function renderParentChild() {
      renderWithProviders(
        <MiniTimeline
          steps={[
            { status: "completed" },
            { status: "pending", isChild: true },
          ]}
          currentIndex={0}
          onStepTap={jest.fn()}
          onTimelineTap={jest.fn()}
          accessibilityLabel="Timeline"
        />,
      );
    }

    it.each([
      ["top-level", 1, "completed", 15],
      ["child", 2, "pending", 17],
    ] as const)("%s node carries hitSlop %i", (_kind, index, status, slop) => {
      renderParentChild();
      const node = screen.getByLabelText(stepLabel(index, status));
      expect(node.props.hitSlop).toBe(slop);
    });

    it("child node touch size (width + 2·hitSlop) meets the 44pt minimum", () => {
      renderParentChild();
      const child = screen.getByLabelText(stepLabel(2, "pending"));
      const innerWidth = (
        StyleSheet.flatten(
          screen.getByTestId("timeline-node-1").props.style,
        ) as { width?: number } | null
      )?.width;
      expect(innerWidth).toBeDefined();
      expect(
        innerWidth! + 2 * (child.props.hitSlop as number),
      ).toBeGreaterThanOrEqual(44);
    });
  });

  // #293 timeline sub-spine: each sub-step renders a ChildRow with a small
  // lettered node and a collapsible header. These lock the new ChildRow a11y
  // contract — role, label, expanded state, and the small node's 44pt target.
  describe("TimelineStep sub-step ChildRow", () => {
    const parentStep = {
      id: "p",
      title: "Wire the circuits",
      status: "in-progress" as const,
      evidenceCount: 0,
    };
    const subSteps: TimelineStepChild[] = [
      {
        id: "c-a",
        title: "Strip the wires",
        status: "in-progress",
        evidence: [],
      },
      {
        id: "c-b",
        title: "Connect the breaker",
        status: "pending",
        evidence: [],
      },
    ];

    function renderWithSubSteps() {
      renderWithProviders(
        <TimelineStep
          step={parentStep}
          stepIndex={0}
          evidence={[]}
          onNodePress={jest.fn()}
          onEvidencePress={jest.fn()}
          subSteps={subSteps}
        />,
      );
    }

    it("child expand header has button role, label, and toggles expanded", () => {
      renderWithSubSteps();
      // First sub-step's letter ordinal is "a".
      const expandLabel = i18n.t("timelineJourney:step.a11yChildExpand", {
        ordinal: "a",
        title: "Strip the wires",
      });
      const button = screen.getByLabelText(expandLabel);
      expectAccessibleRole(button, "button");
      expectAccessibleState(button, { expanded: false });

      fireEvent.press(button);
      expectAccessibleState(screen.getByLabelText(expandLabel), {
        expanded: true,
      });
    });

    it("child node has button role, go-to label, and meets the 44pt target", () => {
      renderWithSubSteps();
      const node = screen.getByLabelText(
        i18n.t("timelineJourney:step.a11yGoTo", {
          number: "a",
          title: "Strip the wires",
        }),
      );
      expectAccessibleRole(node, "button");
      // hitPad = ceil((44 - SMALL_NODE_SIZE) / 2) → small node + 2·hitSlop ≥ 44.
      expect(
        SMALL_NODE_SIZE + 2 * (node.props.hitSlop as number),
      ).toBeGreaterThanOrEqual(44);
    });
  });
});
