import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { StepList, type Step } from "../StepList";

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

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
}));

jest.mock("../../../utils/haptics", () => ({
  triggerDragStart: jest.fn(),
  triggerDragDrop: jest.fn(),
}));

// Mutable so a test can flip on "accessible controls" (which surface the
// keyboard move-up/down buttons that only DraggableStepItem renders).
let mockAnimationPref = "full";
jest.mock("../../../hooks/useAnimationPref", () => ({
  useAnimationPref: () => ({
    animationPref: mockAnimationPref,
    shouldAnimate: mockAnimationPref !== "none",
    shouldReduceMotion: mockAnimationPref === "none",
    setAnimationPref: jest.fn(),
  }),
}));

const mockSteps: Step[] = [
  { id: "1", title: "Step one", completed: false },
  { id: "2", title: "Step two", completed: true },
];

afterEach(() => {
  mockAnimationPref = "full";
});

describe("StepList", () => {
  it("renders steps with header and count", () => {
    renderWithProviders(<StepList steps={mockSteps} />);
    expect(screen.getByText("Steps")).toBeOnTheScreen();
    expect(screen.getByText("2 steps")).toBeOnTheScreen();
    expect(screen.getByText("Step one")).toBeOnTheScreen();
    expect(screen.getByText("Step two")).toBeOnTheScreen();
  });

  it("renders singular step count for one step", () => {
    renderWithProviders(
      <StepList steps={[{ id: "1", title: "Only step", completed: false }]} />,
    );
    expect(screen.getByText("1 step")).toBeOnTheScreen();
  });

  it("renders drag handles for each step", () => {
    renderWithProviders(<StepList steps={mockSteps} />);
    const handles = screen.getAllByText("≡", { includeHiddenElements: true });
    expect(handles).toHaveLength(mockSteps.length);
  });

  it("shows add step input and button when onCreateStep is provided", () => {
    renderWithProviders(
      <StepList steps={mockSteps} onCreateStep={jest.fn()} />,
    );
    expect(screen.getByLabelText("Add a new step")).toBeOnTheScreen();
    expect(screen.getByLabelText("Add step")).toBeOnTheScreen();
  });

  it("calls onCreateStep when add step button is pressed", () => {
    const onCreate = jest.fn();
    renderWithProviders(<StepList steps={mockSteps} onCreateStep={onCreate} />);
    const addInput = screen.getByLabelText("Add a new step");
    fireEvent.changeText(addInput, "New step");
    fireEvent.press(screen.getByLabelText("Add step"));
    expect(onCreate).toHaveBeenCalledWith("New step", ["text"]);
  });

  it("renders delete buttons when onDeleteStep is provided", () => {
    renderWithProviders(
      <StepList steps={mockSteps} onDeleteStep={jest.fn()} />,
    );
    expect(screen.getByLabelText('Delete "Step one"')).toBeOnTheScreen();
    expect(screen.getByLabelText('Delete "Step two"')).toBeOnTheScreen();
  });

  describe("sub-steps", () => {
    const parentWithChildren: Step[] = [
      { id: "p", title: "Parent", completed: false },
      { id: "c1", title: "Child one", completed: false, parentStepId: "p" },
      { id: "c2", title: "Child two", completed: false, parentStepId: "p" },
    ];

    it("renders the add-sub-step affordance once, after the last child of a group", () => {
      renderWithProviders(
        <StepList steps={parentWithChildren} onCreateSubStep={jest.fn()} />,
      );
      // A regression that placed the ghost after every child (or after the
      // parent) would render more than one ghost keyed to the same parent.
      expect(screen.getAllByTestId("step-list-add-sub-step-p")).toHaveLength(1);
    });

    it("renders an add-sub-step affordance under each top-level step", () => {
      renderWithProviders(
        <StepList steps={mockSteps} onCreateSubStep={jest.fn()} />,
      );
      expect(screen.getByTestId("step-list-add-sub-step-1")).toBeOnTheScreen();
      expect(screen.getByTestId("step-list-add-sub-step-2")).toBeOnTheScreen();
    });

    it("does not render the affordance when onCreateSubStep is omitted", () => {
      renderWithProviders(<StepList steps={parentWithChildren} />);
      expect(screen.queryByTestId("step-list-add-sub-step-p")).toBeNull();
    });

    it("calls onCreateSubStep with the parent id, title, and evidence types", () => {
      const onCreateSubStep = jest.fn();
      renderWithProviders(
        <StepList
          steps={parentWithChildren}
          onCreateSubStep={onCreateSubStep}
        />,
      );
      fireEvent.press(screen.getByTestId("step-list-add-sub-step-p"));
      fireEvent.changeText(
        screen.getByTestId("step-list-sub-step-input-p"),
        "New sub-step",
      );
      fireEvent.press(screen.getByTestId("step-list-add-sub-step-button-p"));
      expect(onCreateSubStep).toHaveBeenCalledWith("p", "New sub-step", [
        "text",
      ]);
    });

    it("does not call onCreateSubStep for a blank title and collapses the input", () => {
      const onCreateSubStep = jest.fn();
      renderWithProviders(
        <StepList
          steps={parentWithChildren}
          onCreateSubStep={onCreateSubStep}
        />,
      );
      fireEvent.press(screen.getByTestId("step-list-add-sub-step-p"));
      fireEvent.changeText(
        screen.getByTestId("step-list-sub-step-input-p"),
        "   ",
      );
      fireEvent.press(screen.getByTestId("step-list-add-sub-step-button-p"));
      expect(onCreateSubStep).not.toHaveBeenCalled();
      // Input collapses back to the ghost affordance.
      expect(screen.getByTestId("step-list-add-sub-step-p")).toBeOnTheScreen();
      expect(screen.queryByTestId("step-list-sub-step-input-p")).toBeNull();
    });
  });

  describe("drag-enable guard", () => {
    // Surfacing the keyboard move buttons (only DraggableStepItem renders them)
    // is the observable proxy for "drag is enabled" once gestures are mocked.
    beforeEach(() => {
      mockAnimationPref = "none";
    });

    it("renders keyboard move controls for a flat list", () => {
      renderWithProviders(
        <StepList steps={mockSteps} onReorderSteps={jest.fn()} />,
      );
      expect(screen.getByLabelText('Move "Step one" down')).toBeOnTheScreen();
      expect(screen.getByLabelText('Move "Step two" up')).toBeOnTheScreen();
    });

    it("enables reordering for goals with sub-steps (D13 guard removed)", () => {
      // The old `!hasSubSteps` guard disabled drag whenever any child existed.
      // With the reparent-aware gesture (#330) it is gone — hierarchical goals
      // get the same ↑/↓ controls as flat ones.
      const withSubStep: Step[] = [
        { id: "p", title: "Parent", completed: false },
        { id: "c1", title: "Child one", completed: false, parentStepId: "p" },
      ];
      renderWithProviders(
        <StepList steps={withSubStep} onReorderSteps={jest.fn()} />,
      );
      expect(screen.getByLabelText('Move "Parent" down')).toBeOnTheScreen();
      expect(screen.getByLabelText('Move "Child one" up')).toBeOnTheScreen();
    });
  });

  describe("screen-reader reparent controls (#330)", () => {
    // Accessible nest/un-nest controls surface only for screen-reader /
    // reduced-motion users (dwell-to-demote isn't reachable without sighted
    // drag). animationPref "none" is the reachable lever to render them.
    beforeEach(() => {
      mockAnimationPref = "none";
    });

    const twoRoots: Step[] = [
      { id: "1", title: "Step one", completed: false },
      { id: "2", title: "Step two", completed: false },
    ];

    const threeRoots: Step[] = [
      { id: "1", title: "Step one", completed: false },
      { id: "2", title: "Step two", completed: false },
      { id: "3", title: "Step three", completed: false },
    ];

    const parentWithChildren: Step[] = [
      { id: "p", title: "Parent", completed: false },
      { id: "c1", title: "Child one", completed: false, parentStepId: "p" },
      { id: "c2", title: "Child two", completed: false, parentStepId: "p" },
    ];

    it("renders a nest-under trigger for a leaf root with an eligible target", () => {
      renderWithProviders(
        <StepList
          steps={twoRoots}
          onReorderSteps={jest.fn()}
          onReparentStep={jest.fn()}
        />,
      );
      expect(screen.getByTestId("step-nest-under-1")).toBeOnTheScreen();
      expect(screen.getByTestId("step-nest-under-2")).toBeOnTheScreen();
    });

    it("does not render a nest-under trigger for a root that already has children", () => {
      renderWithProviders(
        <StepList
          steps={parentWithChildren}
          onReorderSteps={jest.fn()}
          onReparentStep={jest.fn()}
        />,
      );
      // A parent-with-children can't be demoted (classifyDrop refuses it), so
      // the screen-reader control must agree and not offer it.
      expect(screen.queryByTestId("step-nest-under-p")).toBeNull();
    });

    it("lists every eligible root (excluding self) in the picker", () => {
      renderWithProviders(
        <StepList
          steps={threeRoots}
          onReorderSteps={jest.fn()}
          onReparentStep={jest.fn()}
        />,
      );
      fireEvent.press(screen.getByTestId("step-nest-under-1"));
      expect(screen.getByTestId("step-nest-target-1-2")).toBeOnTheScreen();
      expect(screen.getByTestId("step-nest-target-1-3")).toBeOnTheScreen();
      // Self is never an eligible nest target.
      expect(screen.queryByTestId("step-nest-target-1-1")).toBeNull();
    });

    it("dispatches onReparentStep with the chosen target when a picker row is selected", () => {
      const onReparentStep = jest.fn();
      renderWithProviders(
        <StepList
          steps={twoRoots}
          onReorderSteps={jest.fn()}
          onReparentStep={onReparentStep}
        />,
      );
      fireEvent.press(screen.getByTestId("step-nest-under-1"));
      fireEvent.press(screen.getByTestId("step-nest-target-1-2"));
      expect(onReparentStep).toHaveBeenCalledWith("1", "2");
    });

    it("renders an un-nest control for a child and promotes (parent null) on press", () => {
      const onReparentStep = jest.fn();
      renderWithProviders(
        <StepList
          steps={parentWithChildren}
          onReorderSteps={jest.fn()}
          onReparentStep={onReparentStep}
        />,
      );
      // A child cannot be nested again (one-level cap) — only un-nested.
      expect(screen.queryByTestId("step-nest-under-c1")).toBeNull();
      fireEvent.press(screen.getByTestId("step-un-nest-c1"));
      expect(onReparentStep).toHaveBeenCalledWith("c1", null);
    });
  });

  describe("keyboard reorder is sibling-scoped (#330, Q2)", () => {
    // ↑/↓ never change nesting level — they reorder within the step's own
    // sibling group and no-op at a group boundary (WCAG 3.2 predictability).
    beforeEach(() => {
      mockAnimationPref = "none";
    });

    it("reorders roots among roots via the down control", () => {
      const onReorderSteps = jest.fn();
      const onReparentStep = jest.fn();
      renderWithProviders(
        <StepList
          steps={mockSteps}
          onReorderSteps={onReorderSteps}
          onReparentStep={onReparentStep}
        />,
      );
      fireEvent.press(screen.getByLabelText('Move "Step one" down'));
      expect(onReorderSteps).toHaveBeenCalledWith(["2", "1"]);
      expect(onReparentStep).not.toHaveBeenCalled();
    });

    it("reorders children among siblings via onReorderSubSteps", () => {
      const onReorderSubSteps = jest.fn();
      const parentWithChildren: Step[] = [
        { id: "p", title: "Parent", completed: false },
        { id: "c1", title: "Child one", completed: false, parentStepId: "p" },
        { id: "c2", title: "Child two", completed: false, parentStepId: "p" },
      ];
      renderWithProviders(
        <StepList
          steps={parentWithChildren}
          onReorderSteps={jest.fn()}
          onReorderSubSteps={onReorderSubSteps}
        />,
      );
      fireEvent.press(screen.getByLabelText('Move "Child one" down'));
      expect(onReorderSubSteps).toHaveBeenCalledWith("p", ["c2", "c1"]);
    });

    it("is a no-op at a sibling-group boundary (never promotes/demotes)", () => {
      const onReorderSteps = jest.fn();
      const onReorderSubSteps = jest.fn();
      const onReparentStep = jest.fn();
      // p1c1 is the only child of p1 — at the bottom of its group — but not the
      // last row overall, so the ↓ control still renders.
      const list: Step[] = [
        { id: "p1", title: "Parent one", completed: false },
        { id: "p1c1", title: "P1 child", completed: false, parentStepId: "p1" },
        { id: "p2", title: "Parent two", completed: false },
      ];
      renderWithProviders(
        <StepList
          steps={list}
          onReorderSteps={onReorderSteps}
          onReorderSubSteps={onReorderSubSteps}
          onReparentStep={onReparentStep}
        />,
      );
      fireEvent.press(screen.getByLabelText('Move "P1 child" down'));
      expect(onReorderSteps).not.toHaveBeenCalled();
      expect(onReorderSubSteps).not.toHaveBeenCalled();
      expect(onReparentStep).not.toHaveBeenCalled();
    });
  });
});
