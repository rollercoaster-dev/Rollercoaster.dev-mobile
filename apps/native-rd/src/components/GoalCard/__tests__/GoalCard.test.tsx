import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { i18n } from "../../../i18n";
import { GoalCard, type GoalCardGoal } from "../GoalCard";

const makeGoal = (overrides?: Partial<GoalCardGoal>): GoalCardGoal => ({
  id: "1",
  title: "Learn TypeScript",
  status: "active",
  stepsTotal: 5,
  stepsCompleted: 2,
  nextStepTitle: null,
  ...overrides,
});

const labelFor = (goal: GoalCardGoal) =>
  i18n.t("goals:card.a11y.label", {
    title: goal.title,
    stepsCompleted: goal.stepsCompleted,
    stepsTotal: goal.stepsTotal,
    status: i18n.t(`common:status.${goal.status}`),
  });

const labelWithNextStepFor = (goal: GoalCardGoal, nextStep: string) =>
  i18n.t("goals:card.a11y.labelWithNextStep", {
    title: goal.title,
    nextStep,
    stepsCompleted: goal.stepsCompleted,
    stepsTotal: goal.stepsTotal,
    status: i18n.t(`common:status.${goal.status}`),
  });

describe("GoalCard", () => {
  it("renders progress bar and step label when stepsTotal > 0", () => {
    renderWithProviders(<GoalCard goal={makeGoal()} />);
    expect(
      screen.getByText(
        i18n.t("goals:card.progressLabel", { completed: 2, total: 5 }),
      ),
    ).toBeOnTheScreen();
  });

  it("hides progress bar and step label when stepsTotal is 0", () => {
    renderWithProviders(
      <GoalCard goal={makeGoal({ stepsTotal: 0, stepsCompleted: 0 })} />,
    );
    expect(screen.queryByText(/steps/)).toBeNull();
  });

  it("composes accessibilityLabel from goal data", () => {
    const goal = makeGoal();
    const onPress = jest.fn();
    renderWithProviders(<GoalCard goal={goal} onPress={onPress} />);
    expect(screen.getByLabelText(labelFor(goal))).toBeOnTheScreen();
  });

  it("forwards onPress to the underlying Card", () => {
    const goal = makeGoal();
    const onPress = jest.fn();
    renderWithProviders(<GoalCard goal={goal} onPress={onPress} />);
    fireEvent.press(screen.getByLabelText(labelFor(goal)));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("forwards onLongPress to the underlying Card", () => {
    const goal = makeGoal();
    const onLongPress = jest.fn();
    const onPress = jest.fn();
    renderWithProviders(
      <GoalCard goal={goal} onPress={onPress} onLongPress={onLongPress} />,
    );
    fireEvent(screen.getByLabelText(labelFor(goal)), "onLongPress");
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it("omits accessibilityLabel when onPress is not provided", () => {
    const goal = makeGoal();
    renderWithProviders(<GoalCard goal={goal} />);
    expect(screen.queryByLabelText(labelFor(goal))).toBeNull();
  });

  describe("statusVariant mapping", () => {
    it('shows "Done" badge for completed goals', () => {
      renderWithProviders(
        <GoalCard goal={makeGoal({ status: "completed" })} />,
      );
      expect(
        screen.getByText(i18n.t("common:status.completed")),
      ).toBeOnTheScreen();
    });

    it('shows "Active" badge for active goals', () => {
      renderWithProviders(<GoalCard goal={makeGoal({ status: "active" })} />);
      expect(
        screen.getByText(i18n.t("common:status.active")),
      ).toBeOnTheScreen();
    });
  });

  describe("next step rendering", () => {
    it("renders the next step title when provided", () => {
      renderWithProviders(
        <GoalCard
          goal={makeGoal({ nextStepTitle: "Open a savings account" })}
        />,
      );
      expect(screen.getByText("Open a savings account")).toBeOnTheScreen();
    });

    it("omits the next step line when nextStepTitle is null", () => {
      renderWithProviders(
        <GoalCard goal={makeGoal({ nextStepTitle: null })} />,
      );
      expect(screen.getByText("Learn TypeScript")).toBeOnTheScreen();
      expect(screen.queryByTestId("goal-card-next-step")).toBeNull();
    });

    it("treats whitespace-only nextStepTitle as no next step", () => {
      renderWithProviders(
        <GoalCard goal={makeGoal({ nextStepTitle: "   " })} />,
      );
      expect(screen.queryByTestId("goal-card-next-step")).toBeNull();
    });

    it("includes the next step in the accessibilityLabel", () => {
      const nextStep = "Open a savings account";
      const goal = makeGoal({ nextStepTitle: nextStep });
      const onPress = jest.fn();
      renderWithProviders(<GoalCard goal={goal} onPress={onPress} />);
      expect(
        screen.getByLabelText(labelWithNextStepFor(goal, nextStep)),
      ).toBeOnTheScreen();
    });
  });

  describe("next step context line", () => {
    it("renders the context line below the hero when provided", () => {
      renderWithProviders(
        <GoalCard
          goal={makeGoal({
            nextStepTitle: "20-amp small-appliance circuit",
            nextStepContext: "↳ in Wire the circuits",
          })}
        />,
      );
      expect(
        screen.getByText("20-amp small-appliance circuit"),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId("goal-card-next-step-context"),
      ).toBeOnTheScreen();
      expect(screen.getByText("↳ in Wire the circuits")).toBeOnTheScreen();
    });

    it("omits the context line when nextStepContext is null", () => {
      renderWithProviders(
        <GoalCard
          goal={makeGoal({
            nextStepTitle: "Open a savings account",
            nextStepContext: null,
          })}
        />,
      );
      expect(screen.getByTestId("goal-card-next-step")).toBeOnTheScreen();
      expect(screen.queryByTestId("goal-card-next-step-context")).toBeNull();
    });

    it("omits the context line when there is no next-step hero", () => {
      // Context is subordinate to the hero — no hero, no context line.
      renderWithProviders(
        <GoalCard
          goal={makeGoal({
            nextStepTitle: null,
            nextStepContext: "↳ in Wire the circuits",
          })}
        />,
      );
      expect(screen.queryByTestId("goal-card-next-step")).toBeNull();
      expect(screen.queryByTestId("goal-card-next-step-context")).toBeNull();
    });
  });
});
