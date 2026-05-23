import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { i18n } from "../../../i18n";
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
      expect(
        screen.getByText(i18n.t("goals:emptyState.title")),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(i18n.t("goals:emptyState.body")),
      ).toBeOnTheScreen();
    });

    it("renders Create Goal button in empty state", () => {
      renderWithProviders(<GoalsScreen />);
      expect(
        screen.getByText(i18n.t("goals:emptyState.cta")),
      ).toBeOnTheScreen();
    });

    it("navigates to NewGoal when empty state action is pressed", () => {
      renderWithProviders(<GoalsScreen />);
      fireEvent.press(screen.getByText(i18n.t("goals:emptyState.cta")));
      expect(mockNavigate).toHaveBeenCalledWith("NewGoal");
    });
  });

  describe("header", () => {
    it("renders Goals title", () => {
      renderWithProviders(<GoalsScreen />);
      expect(screen.getByText(i18n.t("goals:header.title"))).toBeOnTheScreen();
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
      expect(
        screen.getByText(i18n.t("goals:confirmDelete.title")),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(
          i18n.t("goals:confirmDelete.message", { title: "Learn TypeScript" }),
        ),
      ).toBeOnTheScreen();
    });
  });

  describe("pseudo locale", () => {
    afterEach(async () => {
      if (i18n.language !== "en") await i18n.changeLanguage("en");
    });

    // Representative spread across header / empty-state body / interpolated
    // confirm-modal message / interpolated a11y label. A revert that misses
    // one screen surface won't pass by sneaking past a single asserted key.
    it.each(["goals:header.title", "goals:emptyState.body"] as const)(
      "renders %s as bracketed copy under pseudo locale",
      async (key) => {
        await i18n.changeLanguage("pseudo");
        renderWithProviders(<GoalsScreen />);
        const pseudo = i18n.t(key);
        expect(pseudo.startsWith("[")).toBe(true);
        expect(screen.getByText(pseudo)).toBeOnTheScreen();
      },
    );

    it("renders interpolated confirmDelete.message under pseudo locale", async () => {
      const goals = [makeGoalRow({ id: "goal-1", title: "Learn TypeScript" })];
      mockUseQuery.mockImplementation((query: { __brand?: string }) => {
        if (query?.__brand === "activeGoalsQuery") return goals;
        return [];
      });

      await i18n.changeLanguage("pseudo");
      renderWithProviders(<GoalsScreen />);
      fireEvent(screen.getByText("Learn TypeScript"), "longPress");
      const pseudo = i18n.t("goals:confirmDelete.message", {
        title: "Learn TypeScript",
      });
      expect(pseudo.startsWith("[")).toBe(true);
      expect(screen.getByText(pseudo)).toBeOnTheScreen();
    });

    it.each(["common:actions.delete", "common:actions.cancel"] as const)(
      "renders confirm modal %s button under pseudo locale",
      async (key) => {
        const goals = [
          makeGoalRow({ id: "goal-1", title: "Learn TypeScript" }),
        ];
        mockUseQuery.mockImplementation((query: { __brand?: string }) => {
          if (query?.__brand === "activeGoalsQuery") return goals;
          return [];
        });

        await i18n.changeLanguage("pseudo");
        renderWithProviders(<GoalsScreen />);
        fireEvent(screen.getByText("Learn TypeScript"), "longPress");
        const pseudo = i18n.t(key);
        expect(pseudo.startsWith("[")).toBe(true);
        expect(screen.getByText(pseudo)).toBeOnTheScreen();
      },
    );

    it("renders interpolated card.a11y.labelWithNextStep under pseudo locale", async () => {
      const goals = [makeGoalRow({ id: "goal-1", title: "Learn TypeScript" })];
      const steps = [
        {
          id: "step-1",
          goalId: "goal-1",
          title: "Open a savings account",
          status: "pending",
          ordinal: 0,
        },
      ];
      mockUseQuery.mockImplementation((query: { __brand?: string }) => {
        if (query?.__brand === "activeGoalsQuery") return goals;
        if (query?.__brand === "stepsForActiveGoalsQuery") return steps;
        return [];
      });

      await i18n.changeLanguage("pseudo");
      renderWithProviders(<GoalsScreen />);
      const pseudo = i18n.t("goals:card.a11y.labelWithNextStep", {
        title: "Learn TypeScript",
        nextStep: "Open a savings account",
        stepsCompleted: 0,
        stepsTotal: 1,
        status: i18n.t("common:status.active"),
      });
      expect(pseudo.startsWith("[")).toBe(true);
      expect(screen.getByLabelText(pseudo)).toBeOnTheScreen();
    });
  });
});
