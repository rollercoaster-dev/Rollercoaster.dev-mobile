import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
  act,
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
  // Faithful copy of the real resolver (leaf/invite/flat/none + orphan
  // promotion) so buildGoalCardGoal's next-step resolution is exercised, not
  // stubbed — keeps the #292 sub-step cases under test after the #337 extract.
  resolveNextActionableStep: (
    rows: readonly {
      id: string;
      parentStepId: string | null;
      status: string | null;
    }[],
  ) => {
    const rootIds = new Set(
      rows.filter((r) => r.parentStepId == null).map((r) => r.id),
    );
    const childrenByParent = new Map<
      string,
      { index: number; status: string | null }[]
    >();
    const topLevel: { id: string; index: number; status: string | null }[] = [];
    rows.forEach((row, index) => {
      if (row.parentStepId != null && rootIds.has(row.parentStepId)) {
        const entry = { index, status: row.status };
        const list = childrenByParent.get(row.parentStepId);
        if (list) list.push(entry);
        else childrenByParent.set(row.parentStepId, [entry]);
      } else {
        topLevel.push({ id: row.id, index, status: row.status });
      }
    });
    for (const step of topLevel) {
      const children = childrenByParent.get(step.id) ?? [];
      const pendingChild = children.find((c) => c.status !== "completed");
      if (pendingChild) {
        return { kind: "leaf", index: pendingChild.index, parentId: step.id };
      }
      if (step.status === "completed") continue;
      if (children.length > 0) {
        return { kind: "invite", index: step.index, childCount: children.length }; // prettier-ignore
      }
      return { kind: "flat", index: step.index };
    }
    return { kind: "none" };
  },
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
      expect(screen.getByText(i18n.t("goals:title"))).toBeOnTheScreen();
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
      fireEvent.press(screen.getByTestId("goal-card-goal-1"));
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

  describe("sub-step next-step resolution", () => {
    const goalId = "goal-1";
    const goalRow = makeGoalRow({ id: goalId, title: "Build practice panel" });

    const mockSteps = (steps: Record<string, unknown>[]) => {
      mockUseQuery.mockImplementation((query: { __brand?: string }) => {
        if (query?.__brand === "activeGoalsQuery") return [goalRow];
        if (query?.__brand === "stepsForActiveGoalsQuery") return steps;
        return [];
      });
    };

    // `tomas-done` shape with one child still pending → leaf state.
    const LEAF_STEPS = [
      { id: "s1", goalId, parentStepId: null, title: "Plan layout", status: "completed" }, // prettier-ignore
      { id: "s2", goalId, parentStepId: null, title: "Wire the circuits", status: "pending" }, // prettier-ignore
      { id: "s2a", goalId, parentStepId: "s2", title: "15-amp lighting circuit", status: "completed" }, // prettier-ignore
      { id: "s2b", goalId, parentStepId: "s2", title: "20-amp small-appliance circuit", status: "pending" }, // prettier-ignore
      { id: "s2c", goalId, parentStepId: "s2", title: "240V dryer circuit", status: "pending" }, // prettier-ignore
      { id: "s3", goalId, parentStepId: null, title: "Inspection & labels", status: "pending" }, // prettier-ignore
    ];

    // Same shape, but all of s2's children are completed (parent still pending)
    // → invite state. 6 rows, 4 completed → 4/6.
    const INVITE_STEPS = [
      { id: "s1", goalId, parentStepId: null, title: "Plan layout", status: "completed" }, // prettier-ignore
      { id: "s2", goalId, parentStepId: null, title: "Wire the circuits", status: "pending" }, // prettier-ignore
      { id: "s2a", goalId, parentStepId: "s2", title: "15-amp lighting circuit", status: "completed" }, // prettier-ignore
      { id: "s2b", goalId, parentStepId: "s2", title: "20-amp small-appliance circuit", status: "completed" }, // prettier-ignore
      { id: "s2c", goalId, parentStepId: "s2", title: "240V dryer circuit", status: "completed" }, // prettier-ignore
      { id: "s3", goalId, parentStepId: null, title: "Inspection & labels", status: "pending" }, // prettier-ignore
    ];

    it("leads with the pending leaf + parent context (leaf state)", () => {
      mockSteps(LEAF_STEPS);
      renderWithProviders(<GoalsScreen />);
      expect(
        screen.getByText("20-amp small-appliance circuit"),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(
          i18n.t("goals:card.nextStepContext", {
            parent: "Wire the circuits",
          }),
        ),
      ).toBeOnTheScreen();
      // The container parent is context, not the hero.
      expect(screen.queryByTestId("goal-card-next-step")).toHaveTextContent(
        "20-amp small-appliance circuit",
      );
    });

    it("leads with the parent + 'all N substeps done' readout (invite state)", () => {
      mockSteps(INVITE_STEPS);
      renderWithProviders(<GoalsScreen />);
      expect(screen.getByText("Wire the circuits")).toBeOnTheScreen();
      expect(
        screen.getByText(i18n.t("goals:card.allSubstepsDone", { count: 3 })),
      ).toBeOnTheScreen();
    });

    it("counts every unit (parents + children) for progress — 4/6", () => {
      mockSteps(INVITE_STEPS);
      renderWithProviders(<GoalsScreen />);
      expect(
        screen.getByText(
          i18n.t("goals:card.progressLabel", { completed: 4, total: 6 }),
        ),
      ).toBeOnTheScreen();
    });

    it("shows a flat step as the hero with no context line", () => {
      mockSteps([
        { id: "s1", goalId, parentStepId: null, title: "Open a savings account", status: "pending" }, // prettier-ignore
      ]);
      renderWithProviders(<GoalsScreen />);
      expect(screen.getByText("Open a savings account")).toBeOnTheScreen();
      expect(screen.queryByTestId("goal-card-next-step-context")).toBeNull();
    });

    it("renders no next-step line when every step is completed", () => {
      mockSteps([
        { id: "s1", goalId, parentStepId: null, title: "Plan", status: "completed" }, // prettier-ignore
        { id: "s2", goalId, parentStepId: null, title: "Wire", status: "completed" }, // prettier-ignore
        { id: "s2a", goalId, parentStepId: "s2", title: "15-amp", status: "completed" }, // prettier-ignore
      ]);
      renderWithProviders(<GoalsScreen />);
      expect(screen.queryByTestId("goal-card-next-step")).toBeNull();
      expect(screen.queryByTestId("goal-card-next-step-context")).toBeNull();
    });

    it("surfaces an orphaned sub-step (deleted parent) as the next step", () => {
      // s2 was soft-deleted, leaving s2a with a dangling parentStepId. The
      // orphan is promoted to top-level so its pending work stays visible —
      // without the promotion it would bucket under the absent s2 and the card
      // would wrongly read "nothing to do" (#292 regression).
      mockSteps([
        { id: "s1", goalId, parentStepId: null, title: "Plan layout", status: "completed" }, // prettier-ignore
        { id: "s2a", goalId, parentStepId: "s2", title: "20-amp small-appliance circuit", status: "pending" }, // prettier-ignore
      ]);
      renderWithProviders(<GoalsScreen />);
      expect(screen.queryByTestId("goal-card-next-step")).toHaveTextContent(
        "20-amp small-appliance circuit",
      );
      // Treated as a flat hero (parent is gone), so no context line.
      expect(screen.queryByTestId("goal-card-next-step-context")).toBeNull();
    });

    it("surfaces a pending leaf under a manually-completed parent", () => {
      // Step completion is per-step, not cascaded (completeStep), so a user can
      // mark the parent done while a child is still pending. The pending leaf
      // must remain the next step — skipping the parent on its own status would
      // hide live work and wrongly read "nothing to do" (#338 regression).
      mockSteps([
        { id: "s1", goalId, parentStepId: null, title: "Plan layout", status: "completed" }, // prettier-ignore
        { id: "s2", goalId, parentStepId: null, title: "Wire the circuits", status: "completed" }, // prettier-ignore
        { id: "s2a", goalId, parentStepId: "s2", title: "20-amp small-appliance circuit", status: "pending" }, // prettier-ignore
      ]);
      renderWithProviders(<GoalsScreen />);
      expect(screen.queryByTestId("goal-card-next-step")).toHaveTextContent(
        "20-amp small-appliance circuit",
      );
      // Still rendered as a leaf, so the parent stays the context line.
      expect(
        screen.getByText(
          i18n.t("goals:card.nextStepContext", {
            parent: "Wire the circuits",
          }),
        ),
      ).toBeOnTheScreen();
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
      fireEvent(screen.getByTestId("goal-card-goal-1"), "longPress");

      // Confirm modal should show the goal title
      expect(
        screen.getByText(i18n.t("goals:confirmDelete.title")),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(
          i18n.t("goals:confirmDelete.message", { title: "Learn TypeScript" }),
        ),
      ).toBeOnTheScreen();

      fireEvent.press(screen.getByText(i18n.t("common:actions.delete")));
      expect(deleteGoal).toHaveBeenCalledWith("goal-1");
      expect(deleteGoal).toHaveBeenCalledTimes(1);
    });
  });

  describe("pseudo locale", () => {
    afterEach(async () => {
      if (i18n.language !== "en") {
        await act(async () => {
          await i18n.changeLanguage("en");
        });
      }
    });

    // Representative spread across header / empty-state body / interpolated
    // confirm-modal message / interpolated a11y label. A revert that misses
    // one screen surface won't pass by sneaking past a single asserted key.
    it.each(["goals:title", "goals:emptyState.body"] as const)(
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
      fireEvent(screen.getByTestId("goal-card-goal-1"), "longPress");
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
        fireEvent(screen.getByTestId("goal-card-goal-1"), "longPress");
        const pseudo = i18n.t(key);
        expect(pseudo.startsWith("[")).toBe(true);
        expect(screen.getByText(pseudo)).toBeOnTheScreen();
      },
    );

    it("renders card.a11y.label (no next step) under pseudo locale", async () => {
      const goals = [makeGoalRow({ id: "goal-1", title: "Learn TypeScript" })];
      mockUseQuery.mockImplementation((query: { __brand?: string }) => {
        if (query?.__brand === "activeGoalsQuery") return goals;
        return [];
      });

      await i18n.changeLanguage("pseudo");
      renderWithProviders(<GoalsScreen />);
      const pseudo = i18n.t("goals:card.a11y.label", {
        title: "Learn TypeScript",
        stepsCompleted: 0,
        stepsTotal: 0,
        status: i18n.t("common:status.active"),
      });
      expect(pseudo.startsWith("[")).toBe(true);
      expect(screen.getByLabelText(pseudo)).toBeOnTheScreen();
    });

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
