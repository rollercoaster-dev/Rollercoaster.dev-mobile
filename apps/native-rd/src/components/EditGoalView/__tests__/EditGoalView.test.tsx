import React from "react";
import { AccessibilityInfo, BackHandler } from "react-native";
import {
  renderWithProviders,
  screen,
  fireEvent,
  act,
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
    onReorderSubSteps: jest.fn(),
    onReparentStep: jest.fn(),
    onAddStep: jest.fn(),
    onStepTitleChange: jest.fn(),
    onStepEvidenceChange: jest.fn(),
    onAddSubStep: jest.fn(),
    onSubStepTitleChange: jest.fn(),
    onSubStepEvidenceChange: jest.fn(),
    onDeleteSubStep: jest.fn(),
    onDeleteStep: jest.fn(),
    onOverflowPress: jest.fn(),
    onBack: jest.fn(),
    onDone: jest.fn(),
    ...overrides,
  };
}

const withSub: EditGoalStep[] = [
  {
    id: "s1",
    title: "Parent step",
    plannedEvidenceTypes: [EvidenceType.text],
    subSteps: [
      {
        id: "sub1",
        title: "Sub-step",
        plannedEvidenceTypes: [EvidenceType.text],
      },
    ],
  },
  {
    id: "s2",
    title: "Bare step",
    plannedEvidenceTypes: [EvidenceType.photo],
  },
];

// Two parents, each with ≥2 sub-steps (Parent A has a middle position so
// reorder-to-middle is exercised, not just a swap) — plus `withSub`'s lone
// sub-step covers the fallback-absent case. Used by the #459 reorder specs.
const withMultiSub: EditGoalStep[] = [
  {
    id: "s1",
    title: "Parent A",
    plannedEvidenceTypes: [EvidenceType.text],
    subSteps: [
      {
        id: "a1",
        title: "Alpha one",
        plannedEvidenceTypes: [EvidenceType.text],
      },
      {
        id: "a2",
        title: "Alpha two",
        plannedEvidenceTypes: [EvidenceType.text],
      },
      {
        id: "a3",
        title: "Alpha three",
        plannedEvidenceTypes: [EvidenceType.text],
      },
    ],
  },
  {
    id: "s2",
    title: "Parent B",
    plannedEvidenceTypes: [EvidenceType.photo],
    subSteps: [
      {
        id: "b1",
        title: "Beta one",
        plannedEvidenceTypes: [EvidenceType.text],
      },
      {
        id: "b2",
        title: "Beta two",
        plannedEvidenceTypes: [EvidenceType.text],
      },
    ],
  },
];

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

    it("keeps the title and every control on a two-type step with the ↑/↓ fallback (D5 clustering)", () => {
      // The narrow-screen fix splits the row into a rowLead (title) + rowControls
      // (evidence + ↑/↓) so controls wrap instead of crushing the title. This is
      // the worst case for width (two pills + both arrows); the restructure must
      // not drop the title or any control. Layout wrapping itself is verified in
      // Storybook — the Node renderer has no width.
      mockAnimationPref = "none";
      renderWithProviders(<EditGoalView {...makeProps()} />);
      expect(screen.getByText("Second step")).toBeOnTheScreen();
      expect(screen.getByText("Link")).toBeOnTheScreen();
      expect(screen.getByText("Photo")).toBeOnTheScreen();
      expect(screen.getByLabelText('Move "Second step" up')).toBeOnTheScreen();
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

    it("dismisses via its own backdrop testID, distinct from the capture sheet (#493)", () => {
      renderWithProviders(<EditGoalView {...makeProps({ steps: soloStep })} />);
      fireEvent.press(screen.getByTestId("edit-goal-step-evidence-s1"));
      // The shared AnimatedSheet's backdrop is addressable per-consumer: the
      // edit-goal sheet uses its own hook, not the capture sheet's default.
      expect(screen.queryByTestId("capture-sheet-backdrop")).toBeNull();
      const backdrop = screen.getByTestId("edit-goal-evidence-backdrop");
      act(() => {
        fireEvent.press(backdrop);
      });
      expect(screen.queryByTestId("edit-goal-evidence-close")).toBeNull();
    });

    it("closes on Android hardware back while open (#493 — shared AnimatedSheet)", () => {
      const addSpy = jest.spyOn(BackHandler, "addEventListener");
      renderWithProviders(<EditGoalView {...makeProps({ steps: soloStep })} />);
      fireEvent.press(screen.getByTestId("edit-goal-step-evidence-s1"));
      expect(screen.getByTestId("edit-goal-evidence-close")).toBeOnTheScreen();

      // The AnimatedSheet registers its own hardwareBackPress listener (the job
      // the old RN Modal's onRequestClose used to do). Invoking it must claim
      // the event (return true) and dismiss the sheet, not pop the screen.
      const handler = addSpy.mock.calls.find(
        ([event]) => event === "hardwareBackPress",
      )?.[1];
      expect(handler).toBeDefined();
      // Wrap in act: onClose flips the sheet to visible=false, whose exit-timing
      // completion callback synchronously unmounts it (reanimated mock).
      let claimed: boolean | null | undefined;
      act(() => {
        claimed = handler?.();
      });
      expect(claimed).toBe(true);
      expect(screen.queryByTestId("edit-goal-evidence-close")).toBeNull();
    });
  });

  describe("sub-steps (D12)", () => {
    it("renders a sub-step row inside a parent that has one", () => {
      renderWithProviders(<EditGoalView {...makeProps({ steps: withSub })} />);
      expect(screen.getByText("Sub-step")).toBeOnTheScreen();
      expect(
        screen.getByTestId("edit-goal-substep-delete-sub1"),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId("edit-goal-substep-evidence-sub1"),
      ).toBeOnTheScreen();
    });

    it("does not inflate the top-level step count with sub-steps", () => {
      renderWithProviders(<EditGoalView {...makeProps({ steps: withSub })} />);
      expect(screen.getByText("2 steps")).toBeOnTheScreen();
    });

    it("shows 'break into sub-steps' only on a step with none", () => {
      renderWithProviders(<EditGoalView {...makeProps({ steps: withSub })} />);
      // s2 has none → prompt; s1 has one → the add-affordance instead.
      expect(screen.getByText("break into sub-steps")).toBeOnTheScreen();
      expect(screen.getByText("add a sub-step")).toBeOnTheScreen();
      expect(screen.getByTestId("edit-goal-break-into-s2")).toBeOnTheScreen();
      expect(screen.queryByTestId("edit-goal-break-into-s1")).toBeNull();
    });

    it("seeds a default-titled sub-step from 'break into sub-steps'", () => {
      const onAddSubStep = jest.fn();
      renderWithProviders(
        <EditGoalView {...makeProps({ steps: withSub, onAddSubStep })} />,
      );
      fireEvent.press(screen.getByTestId("edit-goal-break-into-s2"));
      expect(onAddSubStep).toHaveBeenCalledWith("s2", "New sub-step");
    });

    it("adds another sub-step from 'add a sub-step'", () => {
      const onAddSubStep = jest.fn();
      renderWithProviders(
        <EditGoalView {...makeProps({ steps: withSub, onAddSubStep })} />,
      );
      fireEvent.press(screen.getByTestId("edit-goal-add-substep-s1"));
      expect(onAddSubStep).toHaveBeenCalledWith("s1", "New sub-step");
    });

    it("deletes a sub-step via its × button after confirming (#460)", () => {
      const onDeleteSubStep = jest.fn();
      renderWithProviders(
        <EditGoalView {...makeProps({ steps: withSub, onDeleteSubStep })} />,
      );
      fireEvent.press(screen.getByTestId("edit-goal-substep-delete-sub1"));
      // The × now opens the confirm modal rather than deleting immediately.
      expect(screen.getByText("Delete sub-step?")).toBeOnTheScreen();
      // Locks the message ternary to the sub-step branch (title interpolated,
      // no "and any sub-steps" clause) — guards against a message swap.
      expect(
        screen.getByText(
          'Delete "Sub-step"? Its evidence will be removed too.',
        ),
      ).toBeOnTheScreen();
      expect(onDeleteSubStep).not.toHaveBeenCalled();
      fireEvent.press(screen.getByText("Delete"));
      expect(onDeleteSubStep).toHaveBeenCalledWith("sub1");
    });

    it("does not delete a sub-step when the confirm is cancelled (#460)", () => {
      const onDeleteSubStep = jest.fn();
      renderWithProviders(
        <EditGoalView {...makeProps({ steps: withSub, onDeleteSubStep })} />,
      );
      fireEvent.press(screen.getByTestId("edit-goal-substep-delete-sub1"));
      fireEvent.press(screen.getByText("Cancel"));
      expect(onDeleteSubStep).not.toHaveBeenCalled();
      expect(screen.queryByText("Delete sub-step?")).toBeNull();
    });

    it("renames a sub-step through inline edit", () => {
      const onSubStepTitleChange = jest.fn();
      renderWithProviders(
        <EditGoalView
          {...makeProps({ steps: withSub, onSubStepTitleChange })}
        />,
      );
      fireEvent.press(screen.getByTestId("edit-goal-substep-title-sub1"));
      const input = screen.getByTestId("edit-goal-substep-edit-sub1");
      fireEvent.changeText(input, "Renamed sub");
      fireEvent(input, "submitEditing");
      expect(onSubStepTitleChange).toHaveBeenCalledWith("sub1", "Renamed sub");
    });

    it("edits a sub-step's evidence via the picker (onSubStepEvidenceChange)", () => {
      const onSubStepEvidenceChange = jest.fn();
      renderWithProviders(
        <EditGoalView
          {...makeProps({ steps: withSub, onSubStepEvidenceChange })}
        />,
      );
      fireEvent.press(screen.getByTestId("edit-goal-substep-evidence-sub1"));
      expect(screen.getByTestId("edit-goal-evidence-close")).toBeOnTheScreen();
      const unchecked = screen
        .getAllByRole("checkbox")
        .filter((b) => !b.props.accessibilityState?.checked);
      fireEvent.press(unchecked[0]);
      expect(onSubStepEvidenceChange).toHaveBeenCalledTimes(1);
      const [subStepId, types] = onSubStepEvidenceChange.mock.calls[0];
      expect(subStepId).toBe("sub1");
      expect(types).toHaveLength(2);
      expect(types).toContain(EvidenceType.text);
    });

    it("refuses to deselect a sub-step's last remaining evidence type", () => {
      const onSubStepEvidenceChange = jest.fn();
      renderWithProviders(
        <EditGoalView
          {...makeProps({ steps: withSub, onSubStepEvidenceChange })}
        />,
      );
      fireEvent.press(screen.getByTestId("edit-goal-substep-evidence-sub1"));
      const checked = screen
        .getAllByRole("checkbox")
        .filter((b) => b.props.accessibilityState?.checked);
      expect(checked).toHaveLength(1);
      fireEvent.press(checked[0]);
      expect(onSubStepEvidenceChange).not.toHaveBeenCalled();
    });

    it("exposes the sub-step delete as a labelled button", () => {
      renderWithProviders(<EditGoalView {...makeProps({ steps: withSub })} />);
      const del = screen.getByTestId("edit-goal-substep-delete-sub1");
      expect(del.props.accessibilityRole).toBe("button");
      expect(del.props.accessibilityLabel).toBe("Delete sub-step: Sub-step");
    });
  });

  describe("step delete (#460)", () => {
    it("renders a × delete affordance on each main step row", () => {
      renderWithProviders(<EditGoalView {...makeProps()} />);
      expect(screen.getByTestId("edit-goal-step-delete-s1")).toBeOnTheScreen();
      expect(screen.getByTestId("edit-goal-step-delete-s2")).toBeOnTheScreen();
    });

    it("opens the confirm modal on × press without deleting immediately", () => {
      const onDeleteStep = jest.fn();
      renderWithProviders(<EditGoalView {...makeProps({ onDeleteStep })} />);
      fireEvent.press(screen.getByTestId("edit-goal-step-delete-s1"));
      expect(screen.getByText("Delete step?")).toBeOnTheScreen();
      // Locks the message ternary to the step branch (title interpolated,
      // "and any sub-steps" clause present) — guards against a message swap.
      expect(
        screen.getByText(
          'Delete "First step"? Its evidence and any sub-steps will be removed too.',
        ),
      ).toBeOnTheScreen();
      expect(onDeleteStep).not.toHaveBeenCalled();
    });

    it("calls onDeleteStep with the step id on Confirm", () => {
      const onDeleteStep = jest.fn();
      renderWithProviders(<EditGoalView {...makeProps({ onDeleteStep })} />);
      fireEvent.press(screen.getByTestId("edit-goal-step-delete-s1"));
      fireEvent.press(screen.getByText("Delete"));
      expect(onDeleteStep).toHaveBeenCalledWith("s1");
    });

    it("does not call onDeleteStep when the confirm is cancelled", () => {
      const onDeleteStep = jest.fn();
      renderWithProviders(<EditGoalView {...makeProps({ onDeleteStep })} />);
      fireEvent.press(screen.getByTestId("edit-goal-step-delete-s1"));
      fireEvent.press(screen.getByText("Cancel"));
      expect(onDeleteStep).not.toHaveBeenCalled();
      expect(screen.queryByText("Delete step?")).toBeNull();
    });

    it("exposes the × as a labelled button", () => {
      renderWithProviders(<EditGoalView {...makeProps()} />);
      const del = screen.getByTestId("edit-goal-step-delete-s1");
      expect(del.props.accessibilityRole).toBe("button");
      expect(del.props.accessibilityLabel).toBe("Delete step: First step");
    });

    it("hides the × while the row is in inline-edit mode", () => {
      renderWithProviders(<EditGoalView {...makeProps()} />);
      fireEvent.press(screen.getByTestId("edit-goal-step-title-s1"));
      expect(screen.getByTestId("edit-goal-step-edit-s1")).toBeOnTheScreen();
      expect(screen.queryByTestId("edit-goal-step-delete-s1")).toBeNull();
    });
  });

  describe("sub-step reorder (#459)", () => {
    it("renders the ≡ handle (not ↳) on sub-step rows, hidden from screen readers", () => {
      renderWithProviders(<EditGoalView {...makeProps({ steps: withSub })} />);
      expect(
        screen.queryByText("↳", { includeHiddenElements: true }),
      ).toBeNull();
      // 2 parent rows + 1 sub-step row all carry a hidden ≡ handle.
      const handles = screen.getAllByText("≡", { includeHiddenElements: true });
      expect(handles).toHaveLength(3);
      handles.forEach((h) =>
        expect(h.props.accessibilityElementsHidden).toBe(true),
      );
    });

    it("shows ↑/↓ fallback on a parent's 2+ sub-steps when motion is off", () => {
      mockAnimationPref = "none";
      renderWithProviders(
        <EditGoalView {...makeProps({ steps: withMultiSub })} />,
      );
      // Middle sub-step gets both; ends get only the one that keeps it in-list.
      expect(screen.getByLabelText('Move "Alpha one" down')).toBeOnTheScreen();
      expect(screen.getByLabelText('Move "Alpha two" up')).toBeOnTheScreen();
      expect(screen.getByLabelText('Move "Alpha two" down')).toBeOnTheScreen();
      expect(screen.getByLabelText('Move "Alpha three" up')).toBeOnTheScreen();
      // First has no ↑, last has no ↓.
      expect(screen.queryByLabelText('Move "Alpha one" up')).toBeNull();
      expect(screen.queryByLabelText('Move "Alpha three" down')).toBeNull();
    });

    it("shows no ↑/↓ fallback on a parent's lone sub-step (isFirst && isLast)", () => {
      mockAnimationPref = "none";
      renderWithProviders(<EditGoalView {...makeProps({ steps: withSub })} />);
      expect(screen.queryByLabelText('Move "Sub-step" up')).toBeNull();
      expect(screen.queryByLabelText('Move "Sub-step" down')).toBeNull();
    });

    it("fires onReorderSubSteps with the parent id + new sibling order — not onReorderSteps", () => {
      mockAnimationPref = "none";
      const onReorderSubSteps = jest.fn();
      const onReorderSteps = jest.fn();
      renderWithProviders(
        <EditGoalView
          {...makeProps({
            steps: withMultiSub,
            onReorderSubSteps,
            onReorderSteps,
          })}
        />,
      );
      fireEvent.press(screen.getByLabelText('Move "Alpha one" down'));
      expect(onReorderSubSteps).toHaveBeenCalledWith("s1", ["a2", "a1", "a3"]);
      expect(onReorderSteps).not.toHaveBeenCalled();
    });

    it("announces the sub-step reorder with the default English builder", () => {
      mockAnimationPref = "none";
      const announce = jest.spyOn(
        AccessibilityInfo,
        "announceForAccessibility",
      );
      renderWithProviders(
        <EditGoalView {...makeProps({ steps: withMultiSub })} />,
      );
      fireEvent.press(screen.getByLabelText('Move "Alpha one" down'));
      expect(announce).toHaveBeenCalledWith('Moved "Alpha one" to position 2');
      announce.mockRestore();
    });

    it("scopes reorder to one parent — the other parent's sub-steps are untouched", () => {
      mockAnimationPref = "none";
      const onReorderSubSteps = jest.fn();
      renderWithProviders(
        <EditGoalView
          {...makeProps({ steps: withMultiSub, onReorderSubSteps })}
        />,
      );
      fireEvent.press(screen.getByLabelText('Move "Beta one" down'));
      expect(onReorderSubSteps).toHaveBeenCalledTimes(1);
      expect(onReorderSubSteps).toHaveBeenCalledWith("s2", ["b2", "b1"]);
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

    it("labels the description input distinctly from the title (no placeholder)", () => {
      // Regression: the fallback used to be `goalSectionLabel` ("Goal"), so the
      // description and title inputs announced identically to screen readers.
      renderWithProviders(
        <EditGoalView {...makeProps({ description: "Why this matters" })} />,
      );
      const description = screen.getByTestId("edit-goal-description-input");
      const title = screen.getByTestId("edit-goal-title-input");
      expect(description.props.accessibilityLabel).toBe("Goal description");
      expect(description.props.accessibilityLabel).not.toBe(
        title.props.accessibilityLabel,
      );
    });

    it("uses descriptionPlaceholder as the a11y label when supplied", () => {
      renderWithProviders(
        <EditGoalView
          {...makeProps({
            description: "Why this matters",
            descriptionPlaceholder: "Why does this goal matter?",
          })}
        />,
      );
      const description = screen.getByTestId("edit-goal-description-input");
      expect(description.props.accessibilityLabel).toBe(
        "Why does this goal matter?",
      );
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

    it("announces the reorder with the default English builder", () => {
      mockAnimationPref = "none";
      const announce = jest.spyOn(
        AccessibilityInfo,
        "announceForAccessibility",
      );
      renderWithProviders(<EditGoalView {...makeProps()} />);
      fireEvent.press(screen.getByLabelText('Move "First step" down'));
      expect(announce).toHaveBeenCalledWith('Moved "First step" to position 2');
      announce.mockRestore();
    });

    it("honors a custom announceReorder builder ([Integrate] i18n)", () => {
      mockAnimationPref = "none";
      const announce = jest.spyOn(
        AccessibilityInfo,
        "announceForAccessibility",
      );
      const announceReorder = jest.fn(
        (title: string, position: number) => `${title} → #${position}`,
      );
      renderWithProviders(<EditGoalView {...makeProps({ announceReorder })} />);
      fireEvent.press(screen.getByLabelText('Move "First step" down'));
      expect(announceReorder).toHaveBeenCalledWith("First step", 2);
      expect(announce).toHaveBeenCalledWith("First step → #2");
      announce.mockRestore();
    });
  });

  describe("reparent (#496)", () => {
    it("fires onReparentStep(id, null) from a sub-step’s Un-nest button", () => {
      mockAnimationPref = "none";
      const onReparentStep = jest.fn();
      renderWithProviders(
        <EditGoalView {...makeProps({ steps: withSub, onReparentStep })} />,
      );
      fireEvent.press(screen.getByTestId("edit-goal-substep-un-nest-sub1"));
      expect(onReparentStep).toHaveBeenCalledWith("sub1", null);
    });

    it("fires onReparentStep(id, targetId) from a leaf root’s Nest-under picker", () => {
      mockAnimationPref = "none";
      const onReparentStep = jest.fn();
      // withSub: s1 (parent with sub1), s2 (bare leaf root). s2 can nest under s1.
      renderWithProviders(
        <EditGoalView {...makeProps({ steps: withSub, onReparentStep })} />,
      );
      fireEvent.press(screen.getByTestId("edit-goal-step-nest-under-s2"));
      // Picker lists eligible roots excluding s2 → s1.
      fireEvent.press(screen.getByTestId("edit-goal-step-nest-target-s2-s1"));
      expect(onReparentStep).toHaveBeenCalledWith("s2", "s1");
    });

    it("renders no Nest-under control on a parent-with-children", () => {
      mockAnimationPref = "none";
      const onReparentStep = jest.fn();
      renderWithProviders(
        <EditGoalView {...makeProps({ steps: withSub, onReparentStep })} />,
      );
      // s1 has children → no nest-under trigger.
      expect(screen.queryByTestId("edit-goal-step-nest-under-s1")).toBeNull();
    });

    it("renders no Nest-under control on a sub-step (one-level cap)", () => {
      mockAnimationPref = "none";
      const onReparentStep = jest.fn();
      renderWithProviders(
        <EditGoalView {...makeProps({ steps: withSub, onReparentStep })} />,
      );
      expect(
        screen.queryByTestId("edit-goal-substep-nest-under-sub1"),
      ).toBeNull();
    });

    it("renders no nest/un-nest controls when onReparentStep is omitted", () => {
      mockAnimationPref = "none";
      renderWithProviders(
        <EditGoalView
          {...makeProps({ steps: withSub, onReparentStep: undefined })}
        />,
      );
      expect(screen.queryByTestId("edit-goal-step-nest-under-s2")).toBeNull();
      expect(screen.queryByTestId("edit-goal-substep-un-nest-sub1")).toBeNull();
    });

    it("does not render a Nest-under trigger when there is only one root", () => {
      mockAnimationPref = "none";
      const onReparentStep = jest.fn();
      const steps: EditGoalStep[] = [
        {
          id: "s1",
          title: "Only step",
          plannedEvidenceTypes: [EvidenceType.text],
        },
      ];
      renderWithProviders(
        <EditGoalView {...makeProps({ steps, onReparentStep })} />,
      );
      expect(screen.queryByTestId("edit-goal-step-nest-under-s1")).toBeNull();
    });

    it("↑/↓ on a child at its group boundary does not promote (no onReparentStep)", () => {
      mockAnimationPref = "none";
      const onReparentStep = jest.fn();
      const onReorderSubSteps = jest.fn();
      renderWithProviders(
        <EditGoalView
          {...makeProps({
            steps: withMultiSub,
            onReparentStep,
            onReorderSubSteps,
          })}
        />,
      );
      // Alpha one is first in its group → moving up is a no-op (no promote).
      expect(screen.queryByLabelText('Move "Alpha one" up')).toBeNull();
      // Moving down is a sibling reorder, not a reparent.
      fireEvent.press(screen.getByLabelText('Move "Alpha one" down'));
      expect(onReorderSubSteps).toHaveBeenCalledWith("s1", ["a2", "a1", "a3"]);
      expect(onReparentStep).not.toHaveBeenCalled();
    });

    it("a sub-step reorder dispatches onReorderSubSteps through the shared coordinator (child-wired-to-coordinator)", () => {
      mockAnimationPref = "none";
      const onReorderSubSteps = jest.fn();
      const onReparentStep = jest.fn();
      renderWithProviders(
        <EditGoalView
          {...makeProps({
            steps: withMultiSub,
            onReorderSubSteps,
            onReparentStep,
          })}
        />,
      );
      // Driving a sub-step’s ↑/↓ routes through the unified coordinator’s
      // moveStep (scoped to the sub-step’s parent), proving the sub-step row
      // is wired to the shared hierarchy coordinator, not a parent-local hook.
      fireEvent.press(screen.getByLabelText('Move "Beta one" down'));
      expect(onReorderSubSteps).toHaveBeenCalledWith("s2", ["b2", "b1"]);
    });

    it("R13: a lone sub-step is draggable (Un-nest present) when reparent is enabled", () => {
      mockAnimationPref = "none";
      const onReparentStep = jest.fn();
      // A parent with a single sub-step.
      const steps: EditGoalStep[] = [
        {
          id: "s1",
          title: "Parent",
          plannedEvidenceTypes: [EvidenceType.text],
          subSteps: [
            {
              id: "only",
              title: "Only child",
              plannedEvidenceTypes: [EvidenceType.text],
            },
          ],
        },
        {
          id: "s2",
          title: "Other root",
          plannedEvidenceTypes: [EvidenceType.text],
        },
      ];
      renderWithProviders(
        <EditGoalView {...makeProps({ steps, onReparentStep })} />,
      );
      // The lone sub-step has an Un-nest control (reparent enabled) and can
      // promote via it — the component-level proof that the old sibling-count
      // gate no longer blocks the single-child promote path.
      fireEvent.press(screen.getByTestId("edit-goal-substep-un-nest-only"));
      expect(onReparentStep).toHaveBeenCalledWith("only", null);
    });

    it("forwards onReparentStep through to the list (prop-chain guard)", () => {
      mockAnimationPref = "none";
      const onReparentStep = jest.fn();
      renderWithProviders(
        <EditGoalView {...makeProps({ steps: withSub, onReparentStep })} />,
      );
      // The nest-under trigger is only rendered when the list received
      // onReparentStep, so its presence proves the host forwarded it.
      expect(
        screen.getByTestId("edit-goal-step-nest-under-s2"),
      ).toBeOnTheScreen();
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
