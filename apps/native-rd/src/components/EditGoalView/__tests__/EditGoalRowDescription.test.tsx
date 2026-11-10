/**
 * Step / sub-step description authoring in Edit Goal (#803), driven through
 * EditGoalView so the list's draft state, save rules and drag gating are all
 * in play.
 */
import React from "react";
import { AccessibilityInfo } from "react-native";
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
import { EvidenceType } from "../../../db";

// findNodeHandle is a lazy getter on react-native's index, so jest.spyOn can't
// replace it in place (same workaround as EditGoalRowTiming.test). Every view
// resolves to one tag; the focus test asserts *whether* focus is requested.
jest.mock("react-native", () => {
  const RN = jest.requireActual("react-native");
  Object.defineProperty(RN, "findNodeHandle", {
    configurable: true,
    value: jest.fn(() => 111),
  });
  return RN;
});

jest.mock("react-native-gesture-handler", () => {
  const chainable = () => new Proxy({}, { get: () => chainable });
  return {
    GestureHandlerRootView: ({ children }: { children: React.ReactNode }) =>
      children,
    // A marker per draggable shell, so drag gating is observable.
    GestureDetector: ({ children }: { children: React.ReactNode }) => {
      const { View } = jest.requireActual("react-native");
      return <View testID="drag-detector">{children}</View>;
    },
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

jest.mock("../../../hooks/useAnimationPref", () => ({
  useAnimationPref: () => ({
    animationPref: "full",
    shouldAnimate: true,
    shouldReduceMotion: false,
    setAnimationPref: jest.fn(),
  }),
}));

const STEPS: EditGoalStep[] = [
  {
    id: "s1",
    title: "Plan the week",
    plannedEvidenceTypes: [EvidenceType.text],
    subSteps: [
      {
        id: "sub1",
        title: "Pick three tasks",
        plannedEvidenceTypes: [EvidenceType.text],
      },
    ],
  },
  {
    id: "s2",
    title: "Write it down",
    description: "Use the paper journal.\n\nOne page per day.",
    plannedEvidenceTypes: [EvidenceType.text],
  },
];

const STEP = "edit-goal-step-description";
const SUB = "edit-goal-substep-description";

function renderView(overrides?: Partial<EditGoalViewProps>) {
  const onStepDescriptionChange = jest.fn(
    (_id: string, _d: string | null): boolean | void => undefined,
  );
  const props: EditGoalViewProps = {
    goalTitle: "My goal",
    onGoalTitleChange: jest.fn(),
    steps: STEPS,
    onReorderSteps: jest.fn(),
    onReorderSubSteps: jest.fn(),
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
    onStepDescriptionChange,
    stepDescriptionMaxLength: 1000,
    ...overrides,
  };
  renderWithProviders(<EditGoalView {...props} />);
  return { onStepDescriptionChange };
}

describe("EditGoalView step description (#803)", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it("adds a multi-line description to a step, keeping its paragraph break", () => {
    const { onStepDescriptionChange } = renderView();

    fireEvent.press(screen.getByTestId(`${STEP}-s1-add`));
    fireEvent.changeText(
      screen.getByTestId(`${STEP}-s1-input`),
      "  Block an hour.\n\nNo phone.  ",
    );
    fireEvent.press(screen.getByTestId(`${STEP}-s1-save`));

    expect(onStepDescriptionChange).toHaveBeenCalledWith(
      "s1",
      "Block an hour.\n\nNo phone.",
    );
    expect(screen.queryByTestId(`${STEP}-s1-input`)).toBeNull();
  });

  it("adds a description to a sub-step under its own id", () => {
    const { onStepDescriptionChange } = renderView();

    fireEvent.press(screen.getByTestId(`${SUB}-sub1-add`));
    fireEvent.changeText(screen.getByTestId(`${SUB}-sub1-input`), "Small.");
    fireEvent.press(screen.getByTestId(`${SUB}-sub1-save`));

    expect(onStepDescriptionChange).toHaveBeenCalledWith("sub1", "Small.");
  });

  it("opens an existing description pre-filled and saves the edit", () => {
    const { onStepDescriptionChange } = renderView();

    fireEvent.press(screen.getByTestId(`${STEP}-s2-text`));
    const input = screen.getByTestId(`${STEP}-s2-input`);
    expect(input.props.value).toBe(STEPS[1].description);

    fireEvent.changeText(input, "Use any notebook.");
    fireEvent.press(screen.getByTestId(`${STEP}-s2-save`));

    expect(onStepDescriptionChange).toHaveBeenCalledWith(
      "s2",
      "Use any notebook.",
    );
  });

  it.each([
    [
      "the Clear control",
      () => fireEvent.press(screen.getByTestId(`${STEP}-s2-clear`)),
    ],
    [
      "whitespace only",
      () =>
        fireEvent.changeText(screen.getByTestId(`${STEP}-s2-input`), " \n "),
    ],
  ])("stores null when the text is emptied via %s", (_label, empty) => {
    const { onStepDescriptionChange } = renderView();

    fireEvent.press(screen.getByTestId(`${STEP}-s2-text`));
    empty();
    fireEvent.press(screen.getByTestId(`${STEP}-s2-save`));

    expect(onStepDescriptionChange).toHaveBeenCalledWith("s2", null);
  });

  it("refuses text over the limit with a visible, announced message and keeps every character", () => {
    const announce = jest
      .spyOn(AccessibilityInfo, "announceForAccessibility")
      .mockImplementation(() => {});
    const { onStepDescriptionChange } = renderView();
    const long = "a".repeat(1001);

    fireEvent.press(screen.getByTestId(`${STEP}-s1-add`));
    fireEvent.changeText(screen.getByTestId(`${STEP}-s1-input`), long);
    const message =
      "A description holds up to 1000 characters. This one has 1001.";
    expect(screen.getByTestId(`${STEP}-s1-too-long`)).toHaveTextContent(
      message,
    );

    fireEvent.press(screen.getByTestId(`${STEP}-s1-save`));

    expect(onStepDescriptionChange).not.toHaveBeenCalled();
    expect(announce).toHaveBeenCalledWith(message);
    expect(screen.getByTestId(`${STEP}-s1-input`).props.value).toBe(long);
  });

  it("accepts exactly the limit", () => {
    const { onStepDescriptionChange } = renderView();
    const max = "a".repeat(1000);

    fireEvent.press(screen.getByTestId(`${STEP}-s1-add`));
    fireEvent.changeText(screen.getByTestId(`${STEP}-s1-input`), max);
    expect(screen.queryByTestId(`${STEP}-s1-too-long`)).toBeNull();
    fireEvent.press(screen.getByTestId(`${STEP}-s1-save`));

    expect(onStepDescriptionChange).toHaveBeenCalledWith("s1", max);
  });

  it("keeps the editor open with the draft when the host reports a failed write", () => {
    const failing = jest.fn((_id: string, _d: string | null) => false);
    renderView({ onStepDescriptionChange: failing });

    fireEvent.press(screen.getByTestId(`${STEP}-s1-add`));
    fireEvent.changeText(screen.getByTestId(`${STEP}-s1-input`), "Draft");
    fireEvent.press(screen.getByTestId(`${STEP}-s1-save`));

    expect(failing).toHaveBeenCalledWith("s1", "Draft");
    expect(screen.getByTestId(`${STEP}-s1-input`).props.value).toBe("Draft");
  });

  it("Cancel closes without writing and shows the saved text again", () => {
    const { onStepDescriptionChange } = renderView();

    fireEvent.press(screen.getByTestId(`${STEP}-s2-text`));
    fireEvent.changeText(screen.getByTestId(`${STEP}-s2-input`), "Changed");
    fireEvent.press(screen.getByTestId(`${STEP}-s2-cancel`));

    expect(onStepDescriptionChange).not.toHaveBeenCalled();
    expect(screen.getByTestId(`${STEP}-s2-text`)).toHaveTextContent(
      "Use the paper journal. One page per day.",
    );
  });

  it("saves the open draft before opening another row's editor", () => {
    const { onStepDescriptionChange } = renderView();

    fireEvent.press(screen.getByTestId(`${STEP}-s1-add`));
    fireEvent.changeText(screen.getByTestId(`${STEP}-s1-input`), "First");
    fireEvent.press(screen.getByTestId(`${SUB}-sub1-add`));

    expect(onStepDescriptionChange).toHaveBeenCalledWith("s1", "First");
    expect(screen.getByTestId(`${SUB}-sub1-input`)).toBeOnTheScreen();
  });

  it("does not write when the text is unchanged", () => {
    const { onStepDescriptionChange } = renderView();

    fireEvent.press(screen.getByTestId(`${STEP}-s2-text`));
    fireEvent.press(screen.getByTestId(`${STEP}-s2-save`));

    expect(onStepDescriptionChange).not.toHaveBeenCalled();
    expect(screen.queryByTestId(`${STEP}-s2-input`)).toBeNull();
  });

  it("keeps an over-limit draft open instead of switching to another row", () => {
    const { onStepDescriptionChange } = renderView();
    const long = "a".repeat(1001);

    fireEvent.press(screen.getByTestId(`${STEP}-s1-add`));
    fireEvent.changeText(screen.getByTestId(`${STEP}-s1-input`), long);
    fireEvent.press(screen.getByTestId(`${SUB}-sub1-add`));

    expect(onStepDescriptionChange).not.toHaveBeenCalled();
    expect(screen.getByTestId(`${STEP}-s1-input`).props.value).toBe(long);
    expect(screen.queryByTestId(`${SUB}-sub1-input`)).toBeNull();
  });

  it("commits an open title rename when a description editor opens", () => {
    const onStepTitleChange = jest.fn();
    renderView({ onStepTitleChange });

    fireEvent.press(screen.getByTestId("edit-goal-step-title-s1"));
    fireEvent.changeText(
      screen.getByTestId("edit-goal-step-edit-s1"),
      "Plan the month",
    );
    fireEvent.press(screen.getByTestId(`${STEP}-s2-text`));

    expect(onStepTitleChange).toHaveBeenCalledWith("s1", "Plan the month");
    expect(screen.queryByTestId("edit-goal-step-edit-s1")).toBeNull();
    expect(screen.getByTestId(`${STEP}-s2-input`)).toBeOnTheScreen();
  });

  it("saves an open description draft before a title rename starts", () => {
    const { onStepDescriptionChange } = renderView();

    fireEvent.press(screen.getByTestId(`${STEP}-s1-add`));
    fireEvent.changeText(screen.getByTestId(`${STEP}-s1-input`), "Notes");
    fireEvent.press(screen.getByTestId("edit-goal-step-title-s2"));

    expect(onStepDescriptionChange).toHaveBeenCalledWith("s1", "Notes");
    expect(screen.getByTestId("edit-goal-step-edit-s2")).toBeOnTheScreen();
  });

  it("turns drag off while a description editor is open", () => {
    renderView();
    expect(screen.queryAllByTestId("drag-detector").length).toBeGreaterThan(0);

    fireEvent.press(screen.getByTestId(`${STEP}-s1-add`));
    expect(screen.queryAllByTestId("drag-detector")).toHaveLength(0);

    fireEvent.press(screen.getByTestId(`${STEP}-s1-cancel`));
    expect(screen.queryAllByTestId("drag-detector").length).toBeGreaterThan(0);
  });

  it("hands screen-reader focus back to the row's line when the editor closes", () => {
    jest.useFakeTimers();
    const setFocus = jest
      .spyOn(AccessibilityInfo, "setAccessibilityFocus")
      .mockImplementation(() => undefined);
    renderView();

    fireEvent.press(screen.getByTestId(`${STEP}-s1-add`));
    jest.runOnlyPendingTimers();
    expect(setFocus).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId(`${STEP}-s1-cancel`));
    jest.runOnlyPendingTimers();
    expect(setFocus).toHaveBeenCalledTimes(1);
  });

  it("labels the controls for screen readers", () => {
    renderView();

    const add = screen.getByTestId(`${STEP}-s1-add`);
    expect(add.props.accessibilityRole).toBe("button");
    expect(add.props.accessibilityLabel).toBe(
      'Add a description to "Plan the week"',
    );
    const text = screen.getByTestId(`${STEP}-s2-text`);
    expect(text.props.accessibilityRole).toBe("button");
    expect(text.props.accessibilityLabel).toBe(
      'Description of "Write it down"',
    );
    expect(text.props.accessibilityValue).toEqual({
      text: STEPS[1].description,
    });
    expect(text.props.accessibilityHint).toBe("Edit the description");

    fireEvent.press(add);
    expect(
      screen.getByTestId(`${STEP}-s1-input`).props.accessibilityLabel,
    ).toBe('Description of "Plan the week"');
  });

  it.each(["add", "text"])("the %s target is at least 44pt tall", (kind) => {
    renderView();
    const id = kind === "add" ? "s1" : "s2";
    const el = screen.getByTestId(`${STEP}-${id}-${kind}`);
    const style =
      typeof el.props.style === "function"
        ? el.props.style({ pressed: false })
        : el.props.style;
    const flat = Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
    expect(flat.minHeight).toBeGreaterThanOrEqual(44);
  });

  it("renders an existing description read-only, with no add prompt, when no write callback is given", () => {
    renderView({ onStepDescriptionChange: undefined });

    expect(screen.getByTestId(`${STEP}-s2-text`)).toHaveTextContent(
      "Use the paper journal. One page per day.",
    );
    expect(screen.getByTestId(`${STEP}-s2-text`).props.accessibilityRole).toBe(
      undefined,
    );
    expect(screen.queryByTestId(`${STEP}-s1-add`)).toBeNull();
  });
});
