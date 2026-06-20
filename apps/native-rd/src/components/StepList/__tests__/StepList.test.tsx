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

  describe("drag-disable guard", () => {
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

    it("disables reordering when any sub-step is present", () => {
      const withSubStep: Step[] = [
        { id: "p", title: "Parent", completed: false },
        { id: "c1", title: "Child one", completed: false, parentStepId: "p" },
      ];
      renderWithProviders(
        <StepList steps={withSubStep} onReorderSteps={jest.fn()} />,
      );
      expect(screen.queryByLabelText('Move "Parent" down')).toBeNull();
      expect(screen.queryByLabelText('Move "Child one" up')).toBeNull();
    });
  });
});
