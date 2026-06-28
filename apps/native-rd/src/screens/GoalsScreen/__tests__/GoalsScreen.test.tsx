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
  StepStatus: { pending: "pending", completed: "completed" },
  // Faithful copy of the real resolver (leaf/invite/flat/none + orphan
  // promotion) so buildCockpitGoal's next-step resolution is exercised, not
  // stubbed — keeps the #292/#337/#338 sub-step cases under test.
  // Keep in sync with resolveNextActionableStep in src/db/queries.ts.
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
        return { kind: "leaf", index: pendingChild.index, parentIndex: step.index }; // prettier-ignore
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
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

/** Route both home queries: goals to activeGoalsQuery, steps to the steps query. */
const mockData = (
  goals: Record<string, unknown>[],
  steps: Record<string, unknown>[] = [],
) => {
  mockUseQuery.mockImplementation((query: { __brand?: string }) => {
    if (query?.__brand === "activeGoalsQuery") return goals;
    if (query?.__brand === "stepsForActiveGoalsQuery") return steps;
    return [];
  });
};

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
    it("renders the Goals title when empty", () => {
      renderWithProviders(<GoalsScreen />);
      expect(screen.getByText(i18n.t("goals:title"))).toBeOnTheScreen();
    });

    it("renders the Today title and goal count when goals exist", () => {
      mockData([
        makeGoalRow({ id: "goal-1", title: "Learn TypeScript" }),
        makeGoalRow({ id: "goal-2", title: "Learn Rust" }),
      ]);

      renderWithProviders(<GoalsScreen />);
      expect(screen.getByText(i18n.t("goals:todayTitle"))).toBeOnTheScreen();
      expect(
        screen.getByText(i18n.t("goals:goalCount", { count: 2 })),
      ).toBeOnTheScreen();
    });

    it("does not render an add button in the header", () => {
      renderWithProviders(<GoalsScreen />);
      expect(screen.queryByLabelText("Create new goal")).toBeNull();
    });
  });

  describe("cockpit", () => {
    it("renders the hero and keep-warm goals", () => {
      mockData([
        makeGoalRow({ id: "goal-1", title: "Learn TypeScript" }),
        makeGoalRow({ id: "goal-2", title: "Learn Rust" }),
      ]);

      renderWithProviders(<GoalsScreen />);
      // Hero title surfaces inside the "Do this next · <title>" overline.
      expect(
        screen.getByText(
          i18n.t("goals:cockpit.doThisNext", { title: "Learn TypeScript" }),
        ),
      ).toBeOnTheScreen();
      // The runner-up renders as a keep-warm card.
      expect(screen.getByText("Learn Rust")).toBeOnTheScreen();
      expect(screen.getByTestId("keep-warm-goal-2")).toBeOnTheScreen();
    });

    it("navigates to FocusMode when the hero Start/Resume is pressed", () => {
      mockData([makeGoalRow({ id: "goal-1", title: "Learn TypeScript" })]);

      renderWithProviders(<GoalsScreen />);
      fireEvent.press(screen.getByTestId("goals-cockpit-start-resume"));
      expect(mockNavigate).toHaveBeenCalledWith("FocusMode", {
        goalId: "goal-1",
      });
    });

    it("navigates to FocusMode when a keep-warm card is tapped", () => {
      mockData([
        makeGoalRow({ id: "goal-1", title: "Learn TypeScript" }),
        makeGoalRow({ id: "goal-2", title: "Learn Rust" }),
      ]);

      renderWithProviders(<GoalsScreen />);
      fireEvent.press(screen.getByTestId("keep-warm-goal-2"));
      expect(mockNavigate).toHaveBeenCalledWith("FocusMode", {
        goalId: "goal-2",
      });
    });
  });

  describe("hero recency ranking", () => {
    it("ranks the most-recently-worked goal as the hero (D2)", () => {
      // goal-1 is newer by creation date, but goal-2 has a step touched far more
      // recently, so goal-2 — the goal you're actually resuming — is the hero.
      const goals = [
        makeGoalRow({
          id: "goal-1",
          title: "Newer goal",
          createdAt: "2026-02-01T00:00:00.000Z",
          updatedAt: "2026-02-01T00:00:00.000Z",
        }),
        makeGoalRow({
          id: "goal-2",
          title: "Older but active",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        }),
      ];
      const steps = [
        {
          id: "s1",
          goalId: "goal-2",
          parentStepId: null,
          title: "Recently touched step",
          status: "pending",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
      ];
      mockData(goals, steps);

      renderWithProviders(<GoalsScreen />);
      // goal-2 is promoted to hero (no keep-warm card for it)…
      expect(screen.queryByTestId("keep-warm-goal-2")).toBeNull();
      // …and goal-1 is demoted to keep-warm.
      expect(screen.getByTestId("keep-warm-goal-1")).toBeOnTheScreen();
      expect(screen.getByTestId("goals-cockpit-next-step")).toHaveTextContent(
        "Recently touched step",
      );
    });
  });

  describe("next step surfacing", () => {
    it("surfaces the first pending step as the hero next step", () => {
      mockData(
        [makeGoalRow({ id: "goal-1", title: "Save €10,000" })],
        [
          { id: "step-1", goalId: "goal-1", parentStepId: null, title: "Open a savings account", status: "pending" }, // prettier-ignore
          { id: "step-2", goalId: "goal-1", parentStepId: null, title: "Set up direct deposit", status: "pending" }, // prettier-ignore
        ],
      );

      renderWithProviders(<GoalsScreen />);
      expect(screen.getByTestId("goals-cockpit-next-step")).toHaveTextContent(
        "Open a savings account",
      );
    });

    it("skips completed steps when picking the next pending one", () => {
      mockData(
        [makeGoalRow({ id: "goal-1", title: "Save €10,000" })],
        [
          { id: "step-1", goalId: "goal-1", parentStepId: null, title: "Open a savings account", status: "completed" }, // prettier-ignore
          { id: "step-2", goalId: "goal-1", parentStepId: null, title: "Set up direct deposit", status: "pending" }, // prettier-ignore
        ],
      );

      renderWithProviders(<GoalsScreen />);
      expect(screen.getByTestId("goals-cockpit-next-step")).toHaveTextContent(
        "Set up direct deposit",
      );
      expect(screen.queryByText("Open a savings account")).toBeNull();
    });

    it("scopes steps to their owning goal when multiple goals exist", () => {
      mockData(
        [
          makeGoalRow({ id: "goal-1", title: "Save €10,000" }),
          makeGoalRow({ id: "goal-2", title: "Train to ride 200k" }),
        ],
        [
          { id: "step-1", goalId: "goal-1", parentStepId: null, title: "Open a savings account", status: "pending" }, // prettier-ignore
          { id: "step-2", goalId: "goal-2", parentStepId: null, title: "Buy cycling shoes", status: "pending" }, // prettier-ignore
        ],
      );

      renderWithProviders(<GoalsScreen />);
      // Hero (goal-1) surfaces its own next step…
      expect(screen.getByTestId("goals-cockpit-next-step")).toHaveTextContent(
        "Open a savings account",
      );
      // …and the keep-warm card (goal-2) surfaces its own.
      expect(screen.getByText("Buy cycling shoes")).toBeOnTheScreen();
    });
  });

  describe("sub-step next-step resolution", () => {
    const goalId = "goal-1";
    const goalRow = makeGoalRow({ id: goalId, title: "Build practice panel" });

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

    it("leads with the pending leaf as the hero next step (leaf state)", () => {
      mockData([goalRow], LEAF_STEPS);
      renderWithProviders(<GoalsScreen />);
      // The pending child is the hero; the cockpit shows no parent context line.
      expect(screen.getByTestId("goals-cockpit-next-step")).toHaveTextContent(
        "20-amp small-appliance circuit",
      );
    });

    it("leads with the pending parent as the hero next step (invite state)", () => {
      mockData([goalRow], INVITE_STEPS);
      renderWithProviders(<GoalsScreen />);
      expect(screen.getByTestId("goals-cockpit-next-step")).toHaveTextContent(
        "Wire the circuits",
      );
    });

    it("counts every unit (parents + children) for progress — 4/6", () => {
      mockData([goalRow], INVITE_STEPS);
      renderWithProviders(<GoalsScreen />);
      // The ring sublabel carries the every-unit progress count.
      expect(
        screen.getByText(
          i18n.t("goals:cockpit.ringSteps", { completed: 4, total: 6 }),
        ),
      ).toBeOnTheScreen();
    });

    it("shows a flat step as the hero next step", () => {
      mockData(
        [goalRow],
        [
          { id: "s1", goalId, parentStepId: null, title: "Open a savings account", status: "pending" }, // prettier-ignore
        ],
      );
      renderWithProviders(<GoalsScreen />);
      expect(screen.getByTestId("goals-cockpit-next-step")).toHaveTextContent(
        "Open a savings account",
      );
    });

    it("renders no next-step line when every step is completed", () => {
      mockData(
        [goalRow],
        [
          { id: "s1", goalId, parentStepId: null, title: "Plan", status: "completed" }, // prettier-ignore
          { id: "s2", goalId, parentStepId: null, title: "Wire", status: "completed" }, // prettier-ignore
          { id: "s2a", goalId, parentStepId: "s2", title: "15-amp", status: "completed" }, // prettier-ignore
        ],
      );
      renderWithProviders(<GoalsScreen />);
      expect(screen.queryByTestId("goals-cockpit-next-step")).toBeNull();
    });

    it("surfaces an orphaned sub-step (deleted parent) as the next step", () => {
      // s2 was soft-deleted, leaving s2a with a dangling parentStepId. The
      // orphan is promoted to top-level so its pending work stays visible —
      // without the promotion it would bucket under the absent s2 and the
      // cockpit would wrongly read "nothing to do" (#292 regression).
      mockData(
        [goalRow],
        [
          { id: "s1", goalId, parentStepId: null, title: "Plan layout", status: "completed" }, // prettier-ignore
          { id: "s2a", goalId, parentStepId: "s2", title: "20-amp small-appliance circuit", status: "pending" }, // prettier-ignore
        ],
      );
      renderWithProviders(<GoalsScreen />);
      expect(screen.getByTestId("goals-cockpit-next-step")).toHaveTextContent(
        "20-amp small-appliance circuit",
      );
    });

    it("surfaces a pending leaf under a manually-completed parent", () => {
      // Step completion is per-step, not cascaded (completeStep), so a user can
      // mark the parent done while a child is still pending. The pending leaf
      // must remain the next step — skipping the parent on its own status would
      // hide live work and wrongly read "nothing to do" (#338 regression).
      mockData(
        [goalRow],
        [
          { id: "s1", goalId, parentStepId: null, title: "Plan layout", status: "completed" }, // prettier-ignore
          { id: "s2", goalId, parentStepId: null, title: "Wire the circuits", status: "completed" }, // prettier-ignore
          { id: "s2a", goalId, parentStepId: "s2", title: "20-amp small-appliance circuit", status: "pending" }, // prettier-ignore
        ],
      );
      renderWithProviders(<GoalsScreen />);
      expect(screen.getByTestId("goals-cockpit-next-step")).toHaveTextContent(
        "20-amp small-appliance circuit",
      );
    });
  });

  describe("delete flow", () => {
    it("shows confirm modal on long press and deletes on confirm", () => {
      mockData([makeGoalRow({ id: "goal-1", title: "Learn TypeScript" })]);

      renderWithProviders(<GoalsScreen />);

      // Long press the hero to trigger delete.
      fireEvent(screen.getByTestId("goals-cockpit-hero"), "onLongPress");

      // Confirm modal should show the goal title.
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
    // confirm-modal message / confirm-modal buttons. A revert that misses one
    // screen surface won't pass by sneaking past a single asserted key.
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
      mockData([makeGoalRow({ id: "goal-1", title: "Learn TypeScript" })]);

      await i18n.changeLanguage("pseudo");
      renderWithProviders(<GoalsScreen />);
      fireEvent(screen.getByTestId("goals-cockpit-hero"), "onLongPress");
      const pseudo = i18n.t("goals:confirmDelete.message", {
        title: "Learn TypeScript",
      });
      expect(pseudo.startsWith("[")).toBe(true);
      expect(screen.getByText(pseudo)).toBeOnTheScreen();
    });

    it.each(["common:actions.delete", "common:actions.cancel"] as const)(
      "renders confirm modal %s button under pseudo locale",
      async (key) => {
        mockData([makeGoalRow({ id: "goal-1", title: "Learn TypeScript" })]);

        await i18n.changeLanguage("pseudo");
        renderWithProviders(<GoalsScreen />);
        fireEvent(screen.getByTestId("goals-cockpit-hero"), "onLongPress");
        const pseudo = i18n.t(key);
        expect(pseudo.startsWith("[")).toBe(true);
        expect(screen.getByText(pseudo)).toBeOnTheScreen();
      },
    );
  });
});
