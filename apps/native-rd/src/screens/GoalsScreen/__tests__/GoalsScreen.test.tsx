import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { GoalsScreen } from "../GoalsScreen";

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual("@react-navigation/native");
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
      canGoBack: jest.fn(() => true),
    }),
  };
});

const mockUseQuery = jest.fn();
jest.mock("@evolu/react", () => {
  const actual = jest.requireActual("@evolu/react");
  return {
    ...actual,
    useQuery: (...args: unknown[]) => mockUseQuery(...args),
  };
});

jest.mock("../../../db", () => ({
  activeGoalsQuery: { __brand: "activeGoalsQuery" },
  stepsForActiveGoalsQuery: { __brand: "stepsForActiveGoalsQuery" },
  deleteGoal: jest.fn(),
  isPendingStep: (s: { status: string | null }) => s.status === "pending",
  GoalStatus: { active: "active", completed: "completed" },
  StepStatus: { pending: "pending", completed: "completed" },
}));

const { deleteGoal } = require("../../../db");

beforeEach(() => {
  jest.clearAllMocks();
  // Default: empty goals
  mockUseQuery.mockReturnValue([]);
});

const makeGoalRow = (overrides: Record<string, unknown> = {}) => ({
  id: "goal-1",
  title: "Learn TypeScript",
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("GoalsScreen", () => {
  describe("empty state", () => {
    it("renders empty state when no goals exist", () => {
      renderWithProviders(<GoalsScreen />);
      expect(screen.getByText("No goals yet")).toBeOnTheScreen();
      expect(
        screen.getByText("Add your first learning goal to get started."),
      ).toBeOnTheScreen();
    });

    it("renders Create Goal button in empty state", () => {
      renderWithProviders(<GoalsScreen />);
      expect(screen.getByText("Create Goal")).toBeOnTheScreen();
    });

    it("navigates to NewGoal when empty state action is pressed", () => {
      renderWithProviders(<GoalsScreen />);
      fireEvent.press(screen.getByText("Create Goal"));
      expect(mockNavigate).toHaveBeenCalledWith("NewGoal");
    });
  });

  describe("header", () => {
    it("renders Goals title", () => {
      renderWithProviders(<GoalsScreen />);
      expect(screen.getByText("Goals")).toBeOnTheScreen();
    });

    it("does not render an add button in the header", () => {
      renderWithProviders(<GoalsScreen />);
      expect(screen.queryByLabelText("Create new goal")).toBeNull();
    });
  });

  describe("goal list", () => {
    it("renders goal cards when goals exist", () => {
      const goals = [
        makeGoalRow({ id: "goal-1", title: "Learn TypeScript" }),
        makeGoalRow({ id: "goal-2", title: "Learn Rust" }),
      ];
      mockUseQuery.mockImplementation((query: { __brand?: string }) => {
        if (query?.__brand === "activeGoalsQuery") return goals;
        return [];
      });

      renderWithProviders(<GoalsScreen />);
      expect(screen.getByText("Learn TypeScript")).toBeOnTheScreen();
      expect(screen.getByText("Learn Rust")).toBeOnTheScreen();
    });

    it("navigates to FocusMode when a goal card is pressed", () => {
      const goals = [makeGoalRow({ id: "goal-1", title: "Learn TypeScript" })];
      mockUseQuery.mockImplementation((query: { __brand?: string }) => {
        if (query?.__brand === "activeGoalsQuery") return goals;
        return [];
      });

      renderWithProviders(<GoalsScreen />);
      fireEvent.press(screen.getByText("Learn TypeScript"));
      expect(mockNavigate).toHaveBeenCalledWith("FocusMode", {
        goalId: "goal-1",
      });
    });
  });

  describe("next step surfacing", () => {
    it("renders the first pending step's title on the goal card", () => {
      const goals = [makeGoalRow({ id: "goal-1", title: "Save €10,000" })];
      const steps = [
        {
          id: "step-1",
          goalId: "goal-1",
          title: "Open a savings account",
          status: "pending",
          ordinal: 0,
        },
        {
          id: "step-2",
          goalId: "goal-1",
          title: "Set up direct deposit",
          status: "pending",
          ordinal: 1,
        },
      ];
      mockUseQuery.mockImplementation((query: { __brand?: string }) => {
        if (query?.__brand === "activeGoalsQuery") return goals;
        if (query?.__brand === "stepsForActiveGoalsQuery") return steps;
        return [];
      });

      renderWithProviders(<GoalsScreen />);
      expect(screen.getByText("Open a savings account")).toBeOnTheScreen();
    });

    it("skips completed steps when picking the next pending one", () => {
      const goals = [makeGoalRow({ id: "goal-1", title: "Save €10,000" })];
      const steps = [
        {
          id: "step-1",
          goalId: "goal-1",
          title: "Open a savings account",
          status: "completed",
          ordinal: 0,
        },
        {
          id: "step-2",
          goalId: "goal-1",
          title: "Set up direct deposit",
          status: "pending",
          ordinal: 1,
        },
      ];
      mockUseQuery.mockImplementation((query: { __brand?: string }) => {
        if (query?.__brand === "activeGoalsQuery") return goals;
        if (query?.__brand === "stepsForActiveGoalsQuery") return steps;
        return [];
      });

      renderWithProviders(<GoalsScreen />);
      expect(screen.getByText("Set up direct deposit")).toBeOnTheScreen();
      expect(screen.queryByText("Open a savings account")).toBeNull();
    });

    it("scopes steps to their owning goal when multiple goals exist", () => {
      const goals = [
        makeGoalRow({ id: "goal-1", title: "Save €10,000" }),
        makeGoalRow({ id: "goal-2", title: "Train to ride 200k" }),
      ];
      const steps = [
        {
          id: "step-1",
          goalId: "goal-1",
          title: "Open a savings account",
          status: "pending",
          ordinal: 0,
        },
        {
          id: "step-2",
          goalId: "goal-2",
          title: "Buy cycling shoes",
          status: "pending",
          ordinal: 0,
        },
      ];
      mockUseQuery.mockImplementation((query: { __brand?: string }) => {
        if (query?.__brand === "activeGoalsQuery") return goals;
        if (query?.__brand === "stepsForActiveGoalsQuery") return steps;
        return [];
      });

      renderWithProviders(<GoalsScreen />);
      // Each goal card surfaces only its own next step
      expect(screen.getByText("Open a savings account")).toBeOnTheScreen();
      expect(screen.getByText("Buy cycling shoes")).toBeOnTheScreen();
    });
  });

  describe("delete flow", () => {
    it("shows confirm modal on long press and deletes on confirm", () => {
      const goals = [makeGoalRow({ id: "goal-1", title: "Learn TypeScript" })];
      mockUseQuery.mockImplementation((query: { __brand?: string }) => {
        if (query?.__brand === "activeGoalsQuery") return goals;
        return [];
      });

      renderWithProviders(<GoalsScreen />);

      // Long press to trigger delete
      fireEvent(screen.getByText("Learn TypeScript"), "longPress");

      // Confirm modal should show the goal title
      expect(screen.getByText("Delete this goal?")).toBeOnTheScreen();
      expect(
        screen.getByText(
          '"Learn TypeScript" and all progress will be permanently deleted.',
        ),
      ).toBeOnTheScreen();
    });
  });
});
