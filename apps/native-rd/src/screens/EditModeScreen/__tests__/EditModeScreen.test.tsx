import React from "react";
import { Alert } from "react-native";
import { act } from "@testing-library/react-native";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { i18n } from "../../../i18n";
import { EditModeScreen } from "../EditModeScreen";

// --- Mocks ---

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual("../../../__tests__/mocks/navigation");
  return {
    ...actual,
    useNavigation: jest.fn(() => ({
      ...actual.useNavigation(),
      goBack: mockGoBack,
      navigate: mockNavigate,
    })),
  };
});

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

// "none" keeps EditGoalStepList's accessible reorder / nest / un-nest controls
// rendered — the only entry point for exercising the hierarchy handlers without
// a live drag gesture.
jest.mock("../../../hooks/useAnimationPref", () => ({
  useAnimationPref: () => ({
    animationPref: "none",
    shouldAnimate: false,
    shouldReduceMotion: true,
    setAnimationPref: jest.fn(),
  }),
}));

// All goal/step mutations return an Evolu Result; the handlers route through
// runEvoluMutation and check `result.ok`, so the mocks must hand back a success
// Result by default. Individual tests override with an ok:false Result or a
// thrown error to exercise the failure branches. reorderSteps/reorderSubSteps
// return void (they throw on failure), so they stay bare.
type MockResult = { ok: true } | { ok: false; error: unknown };
const okResult: MockResult = { ok: true };
const mockUpdateGoal = jest.fn((..._args: unknown[]): MockResult => okResult);
const mockCreateStep = jest.fn((..._args: unknown[]): MockResult => okResult);
const mockCreateSubStep = jest.fn(
  (..._args: unknown[]): MockResult => okResult,
);
const mockUpdateStep = jest.fn((..._args: unknown[]): MockResult => okResult);
const mockDeleteStep = jest.fn((..._args: unknown[]): MockResult => okResult);
const mockDeleteGoal = jest.fn((..._args: unknown[]): MockResult => okResult);
const mockReorderSteps = jest.fn();
const mockReorderSubSteps = jest.fn();

interface StepRow {
  id: string;
  parentStepId?: string | null;
  [key: string]: unknown;
}

jest.mock("../../../db", () => ({
  GoalStatus: { active: "active", completed: "completed" },
  StepStatus: { pending: "pending", completed: "completed" },
  EvidenceType: {
    photo: "photo",
    text: "text",
    voice_memo: "voice_memo",
    video: "video",
    link: "link",
    file: "file",
  },
  goalsQuery: "goalsQuery",
  stepsByGoalQuery: jest.fn(() => "stepsByGoalQuery"),
  updateGoal: (...args: unknown[]) => mockUpdateGoal(...args),
  deleteGoal: (...args: unknown[]) => mockDeleteGoal(...args),
  createStep: (...args: unknown[]) => mockCreateStep(...args),
  createSubStep: (...args: unknown[]) => mockCreateSubStep(...args),
  updateStep: (...args: unknown[]) => mockUpdateStep(...args),
  deleteStep: (...args: unknown[]) => mockDeleteStep(...args),
  reorderSteps: (...args: unknown[]) => mockReorderSteps(...args),
  reorderSubSteps: (...args: unknown[]) => mockReorderSubSteps(...args),
  // Faithful lightweight stand-ins for the pure query helpers.
  groupStepsByParent: (rows: StepRow[]) => {
    const rootIds = new Set(
      rows.filter((r) => r.parentStepId == null).map((r) => r.id),
    );
    const nodes = new Map(
      rows.map((r) => [r.id, { ...r, children: [] as StepRow[] }]),
    );
    const roots: (StepRow & { children: StepRow[] })[] = [];
    for (const row of rows) {
      const node = nodes.get(row.id)!;
      const parentId = row.parentStepId;
      if (parentId != null && rootIds.has(parentId)) {
        nodes.get(parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  },
  resolveStepDependencyBand: (
    step: StepRow,
    goalSteps: StepRow[],
    now: Date,
  ) => ({
    // Self-references are invalid and resolve to null, same as the real helper.
    afterStepTitle:
      step.afterStepId && step.afterStepId !== step.id
        ? ((goalSteps.find((s) => s.id === step.afterStepId)?.title as
            | string
            | undefined) ?? null)
        : null,
    waitingOnLabel: step.waitingOnLabel ?? null,
    waitingOnExpectedAt: step.waitingOnExpectedAt ?? null,
    dueAt: step.dueAt ?? null,
    // Strict <, same boundary as the real helper (#571 D4). The row type here is
    // index-signature loose, so the ISO string needs narrowing.
    waitingOnExpectedIsPast:
      typeof step.waitingOnExpectedAt === "string" &&
      new Date(step.waitingOnExpectedAt).getTime() < now.getTime(),
  }),
}));

const mockUseQuery = jest.fn();
jest.mock("@evolu/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  EvoluProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// --- Helpers ---

const GOAL = {
  id: "goal-1",
  title: "Learn TypeScript",
  description: "Master the type system",
  status: "active",
};

const STEPS = [
  { id: "step-1", title: "Read docs", status: "pending", ordinal: 0 },
  { id: "step-2", title: "Practice", status: "completed", ordinal: 1 },
  { id: "step-3", title: "Build project", status: "pending", ordinal: 2 },
];

const SINGLE_STEP = [
  { id: "step-1", title: "Only step", status: "pending", ordinal: 0 },
];

// Two parents, each with one child. Child ordinals are deliberately higher
// than every root ordinal so a goal-wide (un-scoped) max would pick the wrong
// next ordinal — letting the tests distinguish sibling-scoped from goal-wide.
const STEPS_TREE = [
  { id: "p1", title: "Parent one", status: "pending", ordinal: 0 },
  {
    id: "p1c1",
    title: "P1 child",
    status: "pending",
    ordinal: 0,
    parentStepId: "p1",
  },
  { id: "p2", title: "Parent two", status: "pending", ordinal: 1 },
  {
    id: "p2c1",
    title: "P2 child",
    status: "pending",
    ordinal: 7,
    parentStepId: "p2",
  },
];

function makeRouteProps() {
  return {
    route: {
      key: "EditMode-1",
      name: "EditMode" as const,
      params: { goalId: "goal-1" },
    },
    navigation: {} as any,
  };
}

function setupQueries(goal: object | null = GOAL, steps: object[] = STEPS) {
  mockUseQuery.mockImplementation((query: unknown) => {
    if (query === "goalsQuery") {
      return goal ? [goal] : [];
    }
    return steps;
  });
}

// --- Tests ---

describe("EditModeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseQuery.mockReturnValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("rendering", () => {
    it("renders goal title in EditGoalView's title card", () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      expect(screen.getByTestId("edit-goal-title-input").props.value).toBe(
        "Learn TypeScript",
      );
    });

    it("renders goal description in the description input", () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      expect(
        screen.getByTestId("edit-goal-description-input").props.value,
      ).toBe("Master the type system");
    });

    it("renders step titles", () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      expect(screen.getByText("Read docs")).toBeOnTheScreen();
      expect(screen.getByText("Practice")).toBeOnTheScreen();
      expect(screen.getByText("Build project")).toBeOnTheScreen();
    });

    it("renders sub-steps nested under their parent, not as top-level steps", () => {
      setupQueries(GOAL, STEPS_TREE);
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

      expect(screen.getByText("P1 child")).toBeOnTheScreen();
      // Only the two roots count toward the "Steps" header.
      expect(
        screen.getByText(i18n.t("editGoal:stepList.count", { count: 2 })),
      ).toBeOnTheScreen();
    });

    it("renders step count", () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      expect(
        screen.getByText(i18n.t("editGoal:stepList.count", { count: 3 })),
      ).toBeOnTheScreen();
    });

    it('renders the "Done" footer button', () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      expect(screen.getByTestId("edit-goal-done-button")).toBeOnTheScreen();
    });

    it('shows "Goal not found." when goal does not exist', () => {
      setupQueries(null, []);
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      expect(
        screen.getByText(i18n.t("editGoal:errors.goalNotFound")),
      ).toBeOnTheScreen();
    });

    it("renders a single Edit Goal header (EditGoalView is the screen host)", () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      expect(screen.getAllByText(i18n.t("editGoal:title"))).toHaveLength(1);
    });
  });

  describe("interactions", () => {
    it("updates title input on change and debounces mutation", async () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      const titleInput = screen.getByTestId("edit-goal-title-input");
      fireEvent.changeText(titleInput, "Updated Title");
      expect(titleInput.props.value).toBe("Updated Title");

      expect(mockUpdateGoal).not.toHaveBeenCalled();

      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      expect(mockUpdateGoal).toHaveBeenCalledWith("goal-1", {
        title: "Updated Title",
      });
    });

    it("alerts and skips the write when the title is cleared", async () => {
      setupQueries();
      const alertSpy = jest.spyOn(Alert, "alert");
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      fireEvent.changeText(screen.getByTestId("edit-goal-title-input"), "   ");

      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      expect(alertSpy).toHaveBeenCalledWith(
        i18n.t("editGoal:errors.alertErrorTitle"),
        i18n.t("editGoal:errors.titleRequired"),
      );
      expect(mockUpdateGoal).not.toHaveBeenCalled();
    });

    it("updates description input on change and debounces mutation", async () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      fireEvent.changeText(
        screen.getByTestId("edit-goal-description-input"),
        "New description",
      );

      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      expect(mockUpdateGoal).toHaveBeenCalledWith("goal-1", {
        description: "New description",
      });
    });

    // D4: the editor's add-step flow has no evidence-types input, so no
    // plannedEvidenceTypes argument is written — the read path resolves the
    // unset column to the default plan instead.
    it("calls createStep without a planned-evidence argument", () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      fireEvent.changeText(
        screen.getByTestId("edit-goal-add-step-input"),
        "New step",
      );
      fireEvent.press(screen.getByTestId("edit-goal-add-step-button"));
      expect(mockCreateStep).toHaveBeenCalledWith("goal-1", "New step", 3);
    });

    it("calls updateStep with the title only when a step is renamed inline", () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

      fireEvent.press(screen.getByTestId("edit-goal-step-title-step-1"));
      const input = screen.getByTestId("edit-goal-step-edit-step-1");
      fireEvent.changeText(input, "Read the docs");
      fireEvent(input, "submitEditing");

      expect(mockUpdateStep).toHaveBeenCalledWith("step-1", {
        title: "Read the docs",
      });
    });

    it("calls updateStep with planned evidence only when the picker toggles a type", () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

      fireEvent.press(screen.getByTestId("edit-goal-step-evidence-step-1"));
      fireEvent.press(screen.getByLabelText("Photo"));

      expect(mockUpdateStep).toHaveBeenCalledWith("step-1", {
        plannedEvidenceTypes: ["text", "photo"],
      });
    });

    it("navigates to FocusMode when Done is pressed", () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      fireEvent.press(screen.getByTestId("edit-goal-done-button"));
      expect(mockNavigate).toHaveBeenCalledWith("FocusMode", {
        goalId: "goal-1",
      });
    });

    it("navigates back when the back button is pressed", () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      fireEvent.press(screen.getByLabelText("Go back"));
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe("step deletion", () => {
    it("calls deleteStep only after the confirm modal is confirmed", () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

      fireEvent.press(screen.getByTestId("edit-goal-step-delete-step-1"));
      expect(mockDeleteStep).not.toHaveBeenCalled();

      fireEvent.press(
        screen.getByRole("button", { name: i18n.t("common:actions.delete") }),
      );
      expect(mockDeleteStep).toHaveBeenCalledWith("step-1");
    });

    it("deletes a sub-step through the same mutation", () => {
      setupQueries(GOAL, STEPS_TREE);
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

      fireEvent.press(screen.getByTestId("edit-goal-substep-delete-p1c1"));
      fireEvent.press(
        screen.getByRole("button", { name: i18n.t("common:actions.delete") }),
      );
      expect(mockDeleteStep).toHaveBeenCalledWith("p1c1");
    });

    // D9 drops the old "can't delete the goal's last step" guard: a goal with
    // zero steps is a supported state across the redesign, not an error.
    it("offers delete even when the goal has a single step", () => {
      setupQueries(GOAL, SINGLE_STEP);
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

      fireEvent.press(screen.getByTestId("edit-goal-step-delete-step-1"));
      fireEvent.press(
        screen.getByRole("button", { name: i18n.t("common:actions.delete") }),
      );
      expect(mockDeleteStep).toHaveBeenCalledWith("step-1");
    });
  });

  describe("date/dependency chips", () => {
    // One chip per tone, built from whatever columns the step carries. The
    // resolver output is the same one Timeline and Focus read (#454).
    it.each([
      {
        tone: "after",
        row: { afterStepId: "step-2" },
        expected: () =>
          i18n.t("editGoal:stepList.dateDepChips.after", { title: "Practice" }),
      },
      {
        tone: "waiting",
        row: { waitingOnLabel: "Alex" },
        expected: () =>
          i18n.t("editGoal:stepList.dateDepChips.waitingOn", { who: "Alex" }),
      },
      {
        tone: "due",
        row: { dueAt: "2026-03-06T00:00:00.000Z" },
        expected: () =>
          i18n.t("editGoal:stepList.dateDepChips.due", {
            date: "Mar 6, 2026",
          }),
      },
    ])(
      "renders the $tone chip on a step that carries it",
      ({ row, expected }) => {
        setupQueries(GOAL, [{ ...STEPS[0], ...row }, STEPS[1]]);
        renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
        expect(screen.getByText(expected())).toBeOnTheScreen();
      },
    );

    // The screen reads the real clock, so these two dates are far enough either
    // side of it that the assertion can't drift with the calendar (#571).
    it.each([
      {
        tense: "past",
        waitingOnExpectedAt: "2020-03-06T00:00:00.000Z",
        key: "wasExpected" as const,
        gone: "waitingOnExpected" as const,
        date: "Mar 6, 2020",
      },
      {
        tense: "future",
        waitingOnExpectedAt: "2099-03-06T00:00:00.000Z",
        key: "waitingOnExpected" as const,
        gone: "wasExpected" as const,
        date: "Mar 6, 2099",
      },
    ])(
      "reads a $tense expected date with the matching tense",
      ({ waitingOnExpectedAt, key, gone, date }) => {
        setupQueries(GOAL, [
          { ...STEPS[0], waitingOnLabel: "Alex", waitingOnExpectedAt },
          STEPS[1],
        ]);
        renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

        expect(
          screen.getByText(
            i18n.t(`editGoal:stepList.dateDepChips.${key}`, {
              who: "Alex",
              date,
            }),
          ),
        ).toBeOnTheScreen();
        expect(
          screen.queryByText(
            i18n.t(`editGoal:stepList.dateDepChips.${gone}`, {
              who: "Alex",
              date,
            }),
          ),
        ).toBeNull();
      },
    );

    it("prefers the waiting-on chip over after when both columns are set", () => {
      setupQueries(GOAL, [
        { ...STEPS[0], afterStepId: "step-2", waitingOnLabel: "Alex" },
        STEPS[1],
      ]);
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

      expect(
        screen.getByText(
          i18n.t("editGoal:stepList.dateDepChips.waitingOn", { who: "Alex" }),
        ),
      ).toBeOnTheScreen();
      expect(
        screen.queryByText(
          i18n.t("editGoal:stepList.dateDepChips.after", { title: "Practice" }),
        ),
      ).toBeNull();
    });

    // The chip row has no testID of its own, so absence is asserted through the
    // per-tone glyphs EditGoalStepRow renders inside it — never a placeholder
    // like "no due date" (ND rule: show what's there, not what's absent).
    it("renders no chip row at all when a step carries no band data", () => {
      setupQueries(GOAL, [
        { ...STEPS[0], dueAt: "2026-03-06T00:00:00.000Z" },
        STEPS[1],
      ]);
      const withBand = renderWithProviders(
        <EditModeScreen {...makeRouteProps()} />,
      );
      // The glyphs are hidden from the a11y tree (the chip text carries the
      // meaning), so they only surface with includeHiddenElements.
      expect(
        screen.getByText("▦", { includeHiddenElements: true }),
      ).toBeOnTheScreen();
      withBand.unmount();

      setupQueries(GOAL, STEPS);
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      for (const glyph of ["↩", "⏳", "▦"]) {
        expect(
          screen.queryByText(glyph, { includeHiddenElements: true }),
        ).toBeNull();
      }
    });
  });

  describe("sub-step ordinal scoping", () => {
    it("creates a sub-step with an ordinal scoped to its parent's children", () => {
      setupQueries(GOAL, STEPS_TREE);
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

      fireEvent.press(screen.getByTestId("edit-goal-add-substep-p1"));

      // p1's only child has ordinal 0, so the next sibling ordinal is 1 —
      // NOT 8 (which a goal-wide max over p2c1's ordinal 7 would yield).
      expect(mockCreateSubStep).toHaveBeenCalledWith(
        "goal-1",
        "p1",
        i18n.t("editGoal:editor.newSubStepTitle"),
        1,
      );
    });

    it("creates a top-level step with an ordinal scoped to root steps only", () => {
      setupQueries(GOAL, STEPS_TREE);
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

      fireEvent.changeText(
        screen.getByTestId("edit-goal-add-step-input"),
        "New root",
      );
      fireEvent.press(screen.getByTestId("edit-goal-add-step-button"));

      // Roots are ordinals 0 and 1, so the next root ordinal is 2 — NOT 8
      // (a goal-wide max would inherit the child's ordinal 7).
      expect(mockCreateStep).toHaveBeenCalledWith("goal-1", "New root", 2);
    });
  });

  describe("error handling", () => {
    it("shows alert when createStep fails", () => {
      setupQueries();
      mockCreateStep.mockImplementation(() => {
        throw new Error("fail");
      });
      const alertSpy = jest.spyOn(Alert, "alert");

      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      fireEvent.changeText(
        screen.getByTestId("edit-goal-add-step-input"),
        "Bad step",
      );
      fireEvent.press(screen.getByTestId("edit-goal-add-step-button"));

      expect(alertSpy).toHaveBeenCalledWith(
        i18n.t("editGoal:errors.alertErrorTitle"),
        i18n.t("editGoal:errors.createStepMessage"),
      );
    });

    it("shows alert when createStep returns { ok: false }", () => {
      setupQueries();
      mockCreateStep.mockReturnValue({
        ok: false,
        error: { type: "WriteError" },
      });
      const alertSpy = jest.spyOn(Alert, "alert");

      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      fireEvent.changeText(
        screen.getByTestId("edit-goal-add-step-input"),
        "Bad step",
      );
      fireEvent.press(screen.getByTestId("edit-goal-add-step-button"));

      expect(alertSpy).toHaveBeenCalledWith(
        i18n.t("editGoal:errors.alertErrorTitle"),
        i18n.t("editGoal:errors.createStepMessage"),
      );
    });

    // Evolu reports write failures via { ok: false } WITHOUT throwing, so the
    // ok:false path must surface the same feedback as the thrown path — a
    // discarded Result would let the failure vanish silently.
    it.each([
      [
        "throws",
        () =>
          mockUpdateGoal.mockImplementation(() => {
            throw new Error("fail");
          }),
      ],
      [
        "returns { ok: false }",
        () =>
          mockUpdateGoal.mockReturnValue({
            ok: false,
            error: { type: "WriteError" },
          }),
      ],
    ])("shows alert when updateGoal title %s", async (_desc, arm) => {
      setupQueries();
      arm();
      const alertSpy = jest.spyOn(Alert, "alert");

      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      fireEvent.changeText(
        screen.getByTestId("edit-goal-title-input"),
        "Valid Title",
      );

      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      expect(alertSpy).toHaveBeenCalledWith(
        i18n.t("editGoal:errors.alertErrorTitle"),
        i18n.t("editGoal:errors.updateTitleFailed"),
      );
    });

    // Description saves fire-and-forget on a debounce; a rejected write must
    // still surface an alert. Both failure modes must converge on the same
    // feedback — mirrors the title-update coverage above.
    it.each([
      [
        "throws",
        () =>
          mockUpdateGoal.mockImplementation(() => {
            throw new Error("fail");
          }),
      ],
      [
        "returns { ok: false }",
        () =>
          mockUpdateGoal.mockReturnValue({
            ok: false,
            error: { type: "WriteError" },
          }),
      ],
    ])("shows alert when updateGoal description %s", async (_desc, arm) => {
      setupQueries();
      arm();
      const alertSpy = jest.spyOn(Alert, "alert");

      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      fireEvent.changeText(
        screen.getByTestId("edit-goal-description-input"),
        "New description",
      );

      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      expect(alertSpy).toHaveBeenCalledWith(
        i18n.t("editGoal:errors.alertErrorTitle"),
        i18n.t("editGoal:errors.updateDescriptionMessage"),
      );
    });
  });

  describe("overflow menu → delete goal", () => {
    function openMenu() {
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      fireEvent.press(screen.getByTestId("edit-goal-overflow-trigger"));
    }

    it("opens the ⋯ popover with Delete goal as its only action", () => {
      setupQueries();
      openMenu();
      expect(screen.getByTestId("edit-goal-overflow-delete")).toBeOnTheScreen();
    });

    it("closes the popover without deleting when Cancel is pressed", () => {
      setupQueries();
      openMenu();
      fireEvent.press(
        screen.getByRole("button", { name: i18n.t("common:actions.cancel") }),
      );

      expect(screen.queryByTestId("edit-goal-overflow-delete")).toBeNull();
      expect(mockDeleteGoal).not.toHaveBeenCalled();
    });

    it("routes Delete goal through the confirm modal before mutating", () => {
      setupQueries();
      openMenu();
      fireEvent.press(screen.getByTestId("edit-goal-overflow-delete"));

      expect(mockDeleteGoal).not.toHaveBeenCalled();
      expect(
        screen.getByText(i18n.t("editGoal:confirmDelete.title")),
      ).toBeOnTheScreen();
    });
  });

  describe("delete goal (destructive navigation guard)", () => {
    function openDeleteConfirm() {
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      fireEvent.press(screen.getByTestId("edit-goal-overflow-trigger"));
      fireEvent.press(screen.getByTestId("edit-goal-overflow-delete"));
    }

    it("navigates to Goals and closes the modal only after a successful delete", () => {
      setupQueries();
      openDeleteConfirm();
      fireEvent.press(screen.getByRole("button", { name: "Delete" }));

      expect(mockDeleteGoal).toHaveBeenCalledWith("goal-1");
      expect(mockNavigate).toHaveBeenCalledWith("Goals");
      // Modal is dismissed on success — its confirm button is gone.
      expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
    });

    // Both failure modes must keep the user on the Edit screen with the modal
    // open — the pre-fix bug closed the modal and navigated away regardless.
    it.each([
      {
        label: "{ ok: false }",
        arm: () =>
          mockDeleteGoal.mockReturnValue({
            ok: false,
            error: { type: "WriteError" },
          }),
      },
      {
        label: "thrown error",
        arm: () =>
          mockDeleteGoal.mockImplementation(() => {
            throw new Error("Failed to delete goal. Please try again.");
          }),
      },
    ])(
      "keeps the modal open and does not navigate when delete fails ($label)",
      ({ arm }) => {
        setupQueries();
        arm();
        const alertSpy = jest.spyOn(Alert, "alert");
        openDeleteConfirm();

        fireEvent.press(screen.getByRole("button", { name: "Delete" }));

        expect(mockNavigate).not.toHaveBeenCalled();
        expect(alertSpy).toHaveBeenCalledWith(
          i18n.t("editGoal:errors.deleteGoalTitle"),
          i18n.t("editGoal:errors.deleteGoalMessage"),
        );
        // Modal stays open: its confirm button is still on screen.
        expect(
          screen.getByRole("button", { name: "Delete" }),
        ).toBeOnTheScreen();
      },
    );
  });

  describe("reparent wiring (#330)", () => {
    // animationPref is mocked to "none" file-wide, so the editor renders its
    // accessible reorder / nest / un-nest controls — the reachable entry point
    // for exercising the reparent handlers without a live drag gesture.

    // Two children under one parent so a sibling swap is observable. Child
    // ordinals deliberately differ so a correct sibling-scoped reorder is the
    // only way to produce the expected id order.
    const TREE_TWO_CHILDREN = [
      { id: "p1", title: "Parent one", status: "pending", ordinal: 0 },
      {
        id: "p1c1",
        title: "Child A",
        status: "pending",
        ordinal: 0,
        parentStepId: "p1",
      },
      {
        id: "p1c2",
        title: "Child B",
        status: "pending",
        ordinal: 1,
        parentStepId: "p1",
      },
      { id: "p2", title: "Parent two", status: "pending", ordinal: 1 },
    ];

    // A leaf root ("lr") alongside a parent whose only child carries ordinal 3.
    // lr's root ordinal (9) is deliberately HIGHER than every child ordinal so
    // the demote "append to end" ordinal discriminates scope: child-scoped over
    // p1's children {3} → 4, whereas a goal-wide max {0,3,9} would give 10. A
    // correct sibling-scoped handler must produce 4.
    const TREE_LEAF_ROOT = [
      { id: "p1", title: "Parent one", status: "pending", ordinal: 0 },
      {
        id: "p1c1",
        title: "P1 child",
        status: "pending",
        ordinal: 3,
        parentStepId: "p1",
      },
      { id: "lr", title: "Lone root", status: "pending", ordinal: 9 },
    ];

    it("calls reorderSubSteps with the sibling-scoped order when a child is moved down", () => {
      setupQueries(GOAL, TREE_TWO_CHILDREN);
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

      fireEvent.press(screen.getByTestId("edit-goal-substep-down-p1c1"));

      expect(mockReorderSubSteps).toHaveBeenCalledWith("goal-1", "p1", [
        "p1c2",
        "p1c1",
      ]);
    });

    it("calls reorderSteps with the new root order when a step is moved down", () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

      fireEvent.press(screen.getByTestId("edit-goal-step-down-step-1"));

      expect(mockReorderSteps).toHaveBeenCalledWith("goal-1", [
        "step-2",
        "step-1",
        "step-3",
      ]);
    });

    it("promotes a child via updateStep with parentStepId null and a root-scoped ordinal", () => {
      setupQueries(GOAL, STEPS_TREE);
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

      fireEvent.press(screen.getByTestId("edit-goal-substep-un-nest-p1c1"));

      // Roots p1(0)/p2(1) → next root ordinal is 2, NOT the child's old ordinal.
      expect(mockUpdateStep).toHaveBeenCalledWith("p1c1", {
        parentStepId: null,
        ordinal: 2,
      });
    });

    it("demotes a leaf root under a chosen parent with a child-scoped ordinal", () => {
      setupQueries(GOAL, TREE_LEAF_ROOT);
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

      fireEvent.press(screen.getByTestId("edit-goal-step-nest-under-lr"));
      fireEvent.press(screen.getByTestId("edit-goal-step-nest-target-lr-p1"));

      // p1's only child has ordinal 3 → next child ordinal is 4.
      expect(mockUpdateStep).toHaveBeenCalledWith("lr", {
        parentStepId: "p1",
        ordinal: 4,
      });
    });
  });
});
