import React from "react";
import { Alert } from "react-native";
import { act } from "@testing-library/react-native";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
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

jest.mock("../../../hooks/useAnimationPref", () => ({
  useAnimationPref: () => ({
    animationPref: "none",
    shouldAnimate: false,
    shouldReduceMotion: true,
    setAnimationPref: jest.fn(),
  }),
}));

const mockUpdateGoal = jest.fn();
const mockCreateStep = jest.fn();
const mockUpdateStep = jest.fn();
const mockDeleteStep = jest.fn();
const mockReorderSteps = jest.fn();

jest.mock("../../../db", () => ({
  GoalStatus: { active: "active", completed: "completed" },
  StepStatus: { pending: "pending", completed: "completed" },
  EvidenceType: {
    photo: "photo",
    screenshot: "screenshot",
    text: "text",
    voice_memo: "voice_memo",
    video: "video",
    link: "link",
    file: "file",
  },
  goalsQuery: "goalsQuery",
  stepsByGoalQuery: jest.fn(() => "stepsByGoalQuery"),
  updateGoal: (...args: unknown[]) => mockUpdateGoal(...args),
  createStep: (...args: unknown[]) => mockCreateStep(...args),
  updateStep: (...args: unknown[]) => mockUpdateStep(...args),
  deleteStep: (...args: unknown[]) => mockDeleteStep(...args),
  reorderSteps: (...args: unknown[]) => mockReorderSteps(...args),
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

function makeRouteProps(cameFromFocus = false) {
  return {
    route: {
      key: "EditMode-1",
      name: "EditMode" as const,
      params: { goalId: "goal-1", cameFromFocus },
    },
    navigation: {} as any,
  };
}

function setupQueries(goal: object | null = GOAL, steps = STEPS) {
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
    it("renders goal title in input", () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      const titleInput = screen.getByLabelText("Goal title");
      expect(titleInput.props.value).toBe("Learn TypeScript");
    });

    it("renders goal description in textarea", () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      const descInput = screen.getByLabelText("Goal description");
      expect(descInput.props.value).toBe("Master the type system");
    });

    it("renders step titles", () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      expect(screen.getByText("Read docs")).toBeOnTheScreen();
      expect(screen.getByText("Practice")).toBeOnTheScreen();
      expect(screen.getByText("Build project")).toBeOnTheScreen();
    });

    it("renders step count", () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      expect(screen.getByText("3 steps")).toBeOnTheScreen();
    });

    it('renders "Start Working" when cameFromFocus is false', () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps(false)} />);
      expect(screen.getByText("Start Working")).toBeOnTheScreen();
    });

    it('renders "Back to Focus" when cameFromFocus is true', () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps(true)} />);
      expect(screen.getByText("Back to Focus")).toBeOnTheScreen();
    });

    it('shows "Goal not found." when goal does not exist', () => {
      setupQueries(null, []);
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      expect(screen.getByText("Goal not found.")).toBeOnTheScreen();
    });

    it('renders "Edit Goal" header', () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      expect(screen.getByText("Edit Goal")).toBeOnTheScreen();
    });
  });

  describe("interactions", () => {
    it("updates title input on change and debounces mutation", async () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      const titleInput = screen.getByLabelText("Goal title");
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

    it("shows error when title is cleared", async () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      const titleInput = screen.getByLabelText("Goal title");
      fireEvent.changeText(titleInput, "   ");

      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      expect(screen.getByText("Title cannot be empty")).toBeOnTheScreen();
      expect(mockUpdateGoal).not.toHaveBeenCalled();
    });

    it("updates description input on change and debounces mutation", async () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      const descInput = screen.getByLabelText("Goal description");
      fireEvent.changeText(descInput, "New description");

      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      expect(mockUpdateGoal).toHaveBeenCalledWith("goal-1", {
        description: "New description",
      });
    });

    it("calls createStep when submitting add step input", () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      const addInput = screen.getByLabelText("Add a new step");
      fireEvent.changeText(addInput, "New step");
      fireEvent(addInput, "submitEditing");
      expect(mockCreateStep).toHaveBeenCalledWith("goal-1", "New step", 3, [
        "text",
      ]);
    });

    it("calls deleteStep when delete button pressed", () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      fireEvent.press(screen.getByLabelText('Delete "Read docs"'));
      expect(mockDeleteStep).toHaveBeenCalledWith("step-1");
    });

    it("navigates to FocusMode when button pressed", () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      fireEvent.press(screen.getByText("Start Working"));
      expect(mockNavigate).toHaveBeenCalledWith("FocusMode", {
        goalId: "goal-1",
      });
    });

    it("navigates back when back button pressed", () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      fireEvent.press(screen.getByLabelText("Go back"));
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe("step deletion guard", () => {
    it("does not show delete buttons when only 1 step exists", () => {
      setupQueries(GOAL, SINGLE_STEP);
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      expect(screen.queryByLabelText('Delete "Only step"')).toBeNull();
    });

    it("shows delete buttons when multiple steps exist", () => {
      setupQueries(GOAL, STEPS);
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      expect(screen.getByLabelText('Delete "Read docs"')).toBeOnTheScreen();
    });
  });

  describe("accessibility", () => {
    it("has accessibility labels on inputs", () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      expect(screen.getByLabelText("Goal title")).toBeOnTheScreen();
      expect(screen.getByLabelText("Goal description")).toBeOnTheScreen();
      expect(screen.getByLabelText("Go back")).toBeOnTheScreen();
      expect(screen.getByLabelText("Add a new step")).toBeOnTheScreen();
    });

    it("button has correct accessibility role", () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      expect(
        screen.getByRole("button", { name: "Start Working" }),
      ).toBeOnTheScreen();
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
      const addInput = screen.getByLabelText("Add a new step");
      fireEvent.changeText(addInput, "Bad step");
      fireEvent(addInput, "submitEditing");

      expect(alertSpy).toHaveBeenCalledWith("Error", "Could not create step.");
    });

    it("shows error text when updateGoal title fails", async () => {
      setupQueries();
      mockUpdateGoal.mockImplementation(() => {
        throw new Error("fail");
      });

      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      const titleInput = screen.getByLabelText("Goal title");
      fireEvent.changeText(titleInput, "Valid Title");

      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      expect(screen.getByText("Failed to update title")).toBeOnTheScreen();
    });
  });
});
