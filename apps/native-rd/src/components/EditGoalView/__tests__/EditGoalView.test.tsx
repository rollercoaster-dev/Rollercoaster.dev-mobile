import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import {
  EditGoalView,
  type EditGoalStep,
  type EditGoalViewProps,
} from "../EditGoalView";
import { EditGoalOverflowMenu } from "../EditGoalOverflowMenu";
import { reorderStepIds } from "../useEditGoalDrag";
import { EvidenceType } from "../../../db";

// Gesture handler needs a native runtime; a passthrough Proxy keeps the row
// renderable in Node (mirrors StepList's test setup).
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

// Mutable so a test can flip on "accessible controls" (the ↑/↓ move buttons,
// which only render when a screen reader is on or motion is off).
let mockAnimationPref = "full";
jest.mock("../../../hooks/useAnimationPref", () => ({
  useAnimationPref: () => ({
    animationPref: mockAnimationPref,
    shouldAnimate: mockAnimationPref !== "none",
    shouldReduceMotion: mockAnimationPref === "none",
    setAnimationPref: jest.fn(),
  }),
}));

const baseSteps: EditGoalStep[] = [
  { id: "s1", title: "First step", plannedEvidenceTypes: [EvidenceType.text] },
  {
    id: "s2",
    title: "Second step",
    plannedEvidenceTypes: [EvidenceType.link, EvidenceType.photo],
  },
];

function makeProps(overrides?: Partial<EditGoalViewProps>): EditGoalViewProps {
  return {
    goalTitle: "My goal",
    onGoalTitleChange: jest.fn(),
    steps: baseSteps,
    onReorderSteps: jest.fn(),
    onAddStep: jest.fn(),
    onStepTitleChange: jest.fn(),
    onStepEvidenceChange: jest.fn(),
    onOverflowPress: jest.fn(),
    onBack: jest.fn(),
    onDone: jest.fn(),
    ...overrides,
  };
}

afterEach(() => {
  mockAnimationPref = "full";
});

describe("EditGoalView", () => {
  it("renders the header, title, steps, count, add-row, banner, and Done", () => {
    renderWithProviders(<EditGoalView {...makeProps()} />);
    expect(screen.getByText("Edit goal")).toBeOnTheScreen();
    expect(screen.getByDisplayValue("My goal")).toBeOnTheScreen();
    expect(screen.getByText("First step")).toBeOnTheScreen();
    expect(screen.getByText("Second step")).toBeOnTheScreen();
    expect(screen.getByText("2 steps")).toBeOnTheScreen();
    expect(screen.getByTestId("edit-goal-add-step-input")).toBeOnTheScreen();
    expect(
      screen.getByText(/Dates & dependencies live on each step/),
    ).toBeOnTheScreen();
    expect(screen.getByTestId("edit-goal-done-button")).toBeOnTheScreen();
  });

  it("fires onOverflowPress when the ⋯ trigger is pressed", () => {
    const onOverflowPress = jest.fn();
    renderWithProviders(<EditGoalView {...makeProps({ onOverflowPress })} />);
    fireEvent.press(screen.getByTestId("edit-goal-overflow-trigger"));
    expect(onOverflowPress).toHaveBeenCalledTimes(1);
  });

  it("fires onDone when the footer button is pressed", () => {
    const onDone = jest.fn();
    renderWithProviders(<EditGoalView {...makeProps({ onDone })} />);
    fireEvent.press(screen.getByTestId("edit-goal-done-button"));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("adds a step with a trimmed title and clears the input", () => {
    const onAddStep = jest.fn();
    renderWithProviders(<EditGoalView {...makeProps({ onAddStep })} />);
    const input = screen.getByTestId("edit-goal-add-step-input");
    fireEvent.changeText(input, "  New step  ");
    fireEvent.press(screen.getByTestId("edit-goal-add-step-button"));
    expect(onAddStep).toHaveBeenCalledWith("New step");
    expect(screen.getByTestId("edit-goal-add-step-input").props.value).toBe("");
  });

  it("does not add a whitespace-only step", () => {
    const onAddStep = jest.fn();
    renderWithProviders(<EditGoalView {...makeProps({ onAddStep })} />);
    fireEvent.changeText(screen.getByTestId("edit-goal-add-step-input"), "   ");
    fireEvent.press(screen.getByTestId("edit-goal-add-step-button"));
    expect(onAddStep).not.toHaveBeenCalled();
  });

  it("fires onGoalTitleChange when the goal title is edited", () => {
    const onGoalTitleChange = jest.fn();
    renderWithProviders(<EditGoalView {...makeProps({ onGoalTitleChange })} />);
    fireEvent.changeText(
      screen.getByTestId("edit-goal-title-input"),
      "New title",
    );
    expect(onGoalTitleChange).toHaveBeenCalledWith("New title");
  });

  describe("row anatomy", () => {
    it("omits the date/dependency chip row when a step has no chips", () => {
      renderWithProviders(<EditGoalView {...makeProps()} />);
      expect(screen.queryByText("Alex")).toBeNull();
      expect(screen.queryByText(/^after /)).toBeNull();
    });

    it("renders each date/dependency chip when present", () => {
      const steps: EditGoalStep[] = [
        {
          id: "s1",
          title: "Review with mentor",
          plannedEvidenceTypes: [EvidenceType.voice_memo],
          dateDepChips: [
            { tone: "after", text: "after Draft" },
            { tone: "waiting", text: "Alex" },
            { tone: "due", text: "Fri" },
          ],
        },
      ];
      renderWithProviders(<EditGoalView {...makeProps({ steps })} />);
      expect(screen.getByText("after Draft")).toBeOnTheScreen();
      expect(screen.getByText("Alex")).toBeOnTheScreen();
      expect(screen.getByText("Fri")).toBeOnTheScreen();
    });

    it("shows one evidence pill for a single-type step", () => {
      const steps: EditGoalStep[] = [
        { id: "s1", title: "Solo", plannedEvidenceTypes: [EvidenceType.text] },
      ];
      renderWithProviders(<EditGoalView {...makeProps({ steps })} />);
      // "Note" is the text-type label; picker (which also uses it) is closed.
      expect(screen.getAllByText("Note")).toHaveLength(1);
    });

    it("shows one pill per type for a multi-type step", () => {
      const steps: EditGoalStep[] = [
        {
          id: "s1",
          title: "Multi",
          plannedEvidenceTypes: [EvidenceType.link, EvidenceType.photo],
        },
      ];
      renderWithProviders(<EditGoalView {...makeProps({ steps })} />);
      expect(screen.getByText("Link")).toBeOnTheScreen();
      expect(screen.getByText("Photo")).toBeOnTheScreen();
    });
  });

  describe("evidence picker (D8)", () => {
    const soloStep: EditGoalStep[] = [
      { id: "s1", title: "Solo", plannedEvidenceTypes: [EvidenceType.text] },
    ];

    it("opens the multi-select picker when the evidence chip is tapped", () => {
      renderWithProviders(<EditGoalView {...makeProps({ steps: soloStep })} />);
      expect(screen.queryByTestId("edit-goal-evidence-close")).toBeNull();
      fireEvent.press(screen.getByTestId("edit-goal-step-evidence-s1"));
      expect(screen.getByTestId("edit-goal-evidence-close")).toBeOnTheScreen();
      expect(screen.getAllByRole("checkbox")).toHaveLength(6);
    });

    it("adds a type on toggle via onStepEvidenceChange", () => {
      const onStepEvidenceChange = jest.fn();
      renderWithProviders(
        <EditGoalView
          {...makeProps({ steps: soloStep, onStepEvidenceChange })}
        />,
      );
      fireEvent.press(screen.getByTestId("edit-goal-step-evidence-s1"));
      const unchecked = screen
        .getAllByRole("checkbox")
        .filter((b) => !b.props.accessibilityState?.checked);
      fireEvent.press(unchecked[0]);
      expect(onStepEvidenceChange).toHaveBeenCalledTimes(1);
      const [stepId, types] = onStepEvidenceChange.mock.calls[0];
      expect(stepId).toBe("s1");
      expect(types).toHaveLength(2);
      expect(types).toContain(EvidenceType.text);
    });

    it("refuses to deselect the last remaining type (every step needs evidence)", () => {
      const onStepEvidenceChange = jest.fn();
      renderWithProviders(
        <EditGoalView
          {...makeProps({ steps: soloStep, onStepEvidenceChange })}
        />,
      );
      fireEvent.press(screen.getByTestId("edit-goal-step-evidence-s1"));
      const checked = screen
        .getAllByRole("checkbox")
        .filter((b) => b.props.accessibilityState?.checked);
      expect(checked).toHaveLength(1);
      fireEvent.press(checked[0]);
      expect(onStepEvidenceChange).not.toHaveBeenCalled();
    });
  });

  describe("description prop (D3)", () => {
    it("renders no description field when the prop is omitted", () => {
      renderWithProviders(<EditGoalView {...makeProps()} />);
      expect(screen.queryByTestId("edit-goal-description-input")).toBeNull();
    });

    it("renders the description field when the prop is supplied", () => {
      renderWithProviders(
        <EditGoalView {...makeProps({ description: "Why this matters" })} />,
      );
      const field = screen.getByTestId("edit-goal-description-input");
      expect(field).toBeOnTheScreen();
      expect(field.props.value).toBe("Why this matters");
    });
  });

  describe("accessibility", () => {
    it("exposes the ⋯ trigger as a labelled button", () => {
      renderWithProviders(<EditGoalView {...makeProps()} />);
      const trigger = screen.getByTestId("edit-goal-overflow-trigger");
      expect(trigger.props.accessibilityRole).toBe("button");
      expect(trigger.props.accessibilityLabel).toBe("More options");
    });

    it("hides the drag handles from screen readers", () => {
      renderWithProviders(<EditGoalView {...makeProps()} />);
      const handles = screen.getAllByText("≡", {
        includeHiddenElements: true,
      });
      expect(handles).toHaveLength(baseSteps.length);
      handles.forEach((h) =>
        expect(h.props.accessibilityElementsHidden).toBe(true),
      );
    });

    it("shows ↑/↓ fallback controls when motion is off", () => {
      mockAnimationPref = "none";
      renderWithProviders(<EditGoalView {...makeProps()} />);
      expect(screen.getByLabelText('Move "First step" down')).toBeOnTheScreen();
      expect(screen.getByLabelText('Move "Second step" up')).toBeOnTheScreen();
    });

    it("moves a step via the ↑/↓ fallback (onReorderSteps)", () => {
      mockAnimationPref = "none";
      const onReorderSteps = jest.fn();
      renderWithProviders(<EditGoalView {...makeProps({ onReorderSteps })} />);
      fireEvent.press(screen.getByLabelText('Move "First step" down'));
      expect(onReorderSteps).toHaveBeenCalledWith(["s2", "s1"]);
    });
  });
});

describe("EditGoalOverflowMenu", () => {
  it("fires onDelete from the Delete goal row", () => {
    const onDelete = jest.fn();
    renderWithProviders(<EditGoalOverflowMenu onDelete={onDelete} />);
    const row = screen.getByTestId("edit-goal-overflow-delete");
    expect(row.props.accessibilityRole).toBe("button");
    expect(row.props.accessibilityLabel).toBe("Delete goal");
    fireEvent.press(row);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});

describe("reorderStepIds (D6)", () => {
  it.each([
    {
      name: "moves an item down",
      ids: ["a", "b", "c", "d"],
      from: 0,
      to: 2,
      expected: ["b", "c", "a", "d"],
    },
    {
      name: "moves an item up (last to first)",
      ids: ["a", "b", "c", "d"],
      from: 3,
      to: 0,
      expected: ["d", "a", "b", "c"],
    },
    {
      name: "is a no-op when from === to",
      ids: ["a", "b", "c"],
      from: 1,
      to: 1,
      expected: ["a", "b", "c"],
    },
    {
      name: "clamps an out-of-range target",
      ids: ["a", "b", "c"],
      from: 0,
      to: 9,
      expected: ["b", "c", "a"],
    },
    {
      name: "returns input for an out-of-range source",
      ids: ["a", "b", "c"],
      from: -1,
      to: 0,
      expected: ["a", "b", "c"],
    },
  ])("$name", ({ ids, from, to, expected }) => {
    expect(reorderStepIds(ids, from, to)).toEqual(expected);
  });
});
