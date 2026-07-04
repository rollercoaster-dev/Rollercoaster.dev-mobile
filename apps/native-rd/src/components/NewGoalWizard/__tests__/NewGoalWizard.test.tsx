import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import {
  NewGoalWizard,
  type NewGoalWizardProps,
  type NewGoalWizardStep,
} from "../NewGoalWizard";

function makeProps(
  overrides?: Partial<NewGoalWizardProps>,
): NewGoalWizardProps {
  return {
    currentStep: "name",
    goalTitle: "Build a birdhouse",
    onGoalTitleChange: jest.fn(),
    stepCount: 2,
    onBack: jest.fn(),
    onClose: jest.fn(),
    onNext: jest.fn(),
    onQuickAdd: jest.fn(),
    onStartWorking: jest.fn(),
    ...overrides,
  };
}

function renderWizard(overrides?: Partial<NewGoalWizardProps>) {
  const props = makeProps(overrides);
  renderWithProviders(<NewGoalWizard {...props} />);
  return props;
}

describe("NewGoalWizard", () => {
  describe("name step", () => {
    it("renders the shell, title input, hint, Next CTA, and quick-add fast path", () => {
      renderWizard({ currentStep: "name", goalTitle: "" });

      expect(screen.getByText("New goal")).toBeOnTheScreen();
      expect(screen.queryByTestId("new-goal-back-button")).toBeNull();
      expect(screen.getByTestId("new-goal-close-button")).toBeOnTheScreen();
      expect(screen.getByText("Step 1 of 4")).toBeOnTheScreen();
      expect(
        screen.getByText("What do you want to work toward?"),
      ).toBeOnTheScreen();
      expect(screen.getByLabelText("Name your goal")).toBeOnTheScreen();
      expect(
        screen.getByText("Something you'll show progress on."),
      ).toBeOnTheScreen();
      expect(screen.getByTestId("new-goal-next-button")).toBeOnTheScreen();
      expect(
        screen.getByText("Quick add — skip to the list ›"),
      ).toBeOnTheScreen();
    });

    it("fires onGoalTitleChange when the title input changes", () => {
      const onGoalTitleChange = jest.fn();
      renderWizard({ currentStep: "name", onGoalTitleChange });

      fireEvent.changeText(
        screen.getByTestId("new-goal-title-input"),
        "Learn guitar",
      );

      expect(onGoalTitleChange).toHaveBeenCalledWith("Learn guitar");
    });

    it("fires distinct callbacks for Next and quick add", () => {
      const onNext = jest.fn();
      const onQuickAdd = jest.fn();
      renderWizard({ currentStep: "name", onNext, onQuickAdd });

      fireEvent.press(screen.getByTestId("new-goal-next-button"));
      fireEvent.press(screen.getByTestId("new-goal-quick-add"));

      expect(onNext).toHaveBeenCalledTimes(1);
      expect(onQuickAdd).toHaveBeenCalledTimes(1);
    });

    it.each(["", "   ", "\n\t"])(
      "disables Next for empty/whitespace-only title %#",
      (goalTitle) => {
        renderWizard({ currentStep: "name", goalTitle });

        expect(
          screen.getByTestId("new-goal-next-button").props.accessibilityState,
        ).toMatchObject({ disabled: true });
      },
    );

    it("enables Next when the title has non-whitespace text", () => {
      renderWizard({ currentStep: "name", goalTitle: "  Build a birdhouse  " });

      expect(
        screen.getByTestId("new-goal-next-button").props.accessibilityState,
      ).toMatchObject({ disabled: false });
    });
  });

  describe("ready step", () => {
    it("renders the ready summary, badge note, Start Working CTA, and back arrow", () => {
      renderWizard({ currentStep: "ready", goalTitle: "Build a birdhouse" });

      expect(screen.getByTestId("new-goal-back-button")).toBeOnTheScreen();
      expect(screen.getByText("You're set.")).toBeOnTheScreen();
      expect(screen.getByText("Build a birdhouse")).toBeOnTheScreen();
      expect(screen.getByText("2 steps · evidence on each")).toBeOnTheScreen();
      expect(
        screen.getByText("You'll design your badge when you finish."),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId("new-goal-start-working-button"),
      ).toBeOnTheScreen();
    });

    it.each([
      [1, "1 step · evidence on each"],
      [2, "2 steps · evidence on each"],
      [4, "4 steps · evidence on each"],
    ])("pluralizes the step count summary for %i", (stepCount, label) => {
      renderWizard({ currentStep: "ready", stepCount });

      expect(screen.getByText(label)).toBeOnTheScreen();
    });

    it("fires onBack and onStartWorking from ready step controls", () => {
      const onBack = jest.fn();
      const onStartWorking = jest.fn();
      renderWizard({ currentStep: "ready", onBack, onStartWorking });

      fireEvent.press(screen.getByTestId("new-goal-back-button"));
      fireEvent.press(screen.getByTestId("new-goal-start-working-button"));

      expect(onBack).toHaveBeenCalledTimes(1);
      expect(onStartWorking).toHaveBeenCalledTimes(1);
    });
  });

  it.each(["name", "ready"] as const)(
    "fires onClose from the %s step",
    (currentStep) => {
      const onClose = jest.fn();
      renderWizard({ currentStep, onClose });

      fireEvent.press(screen.getByTestId("new-goal-close-button"));

      expect(onClose).toHaveBeenCalledTimes(1);
    },
  );

  it.each(["step", "build"] as const)(
    "renders the %s placeholder without a body regression",
    (currentStep) => {
      renderWizard({ currentStep });

      expect(screen.getByText("New goal")).toBeOnTheScreen();
      expect(screen.getByTestId("new-goal-back-button")).toBeOnTheScreen();
      expect(screen.getByTestId("new-goal-close-button")).toBeOnTheScreen();
      expect(screen.queryByText("What do you want to work toward?")).toBeNull();
      expect(screen.queryByText("You're set.")).toBeNull();
    },
  );

  it.each<[NewGoalWizardStep, number]>([
    ["name", 1],
    ["step", 2],
    ["build", 3],
    ["ready", 4],
  ])("%s fills %i progress segments", (currentStep, filledCount) => {
    renderWizard({ currentStep });

    expect(screen.queryAllByTestId("new-goal-progress-filled")).toHaveLength(
      filledCount,
    );
    expect(screen.queryAllByTestId("new-goal-progress-unfilled")).toHaveLength(
      4 - filledCount,
    );
  });

  it("exposes accessible labels and roles for controls", () => {
    renderWizard({ currentStep: "ready" });

    expect(screen.getByRole("button", { name: "Go back" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Close" })).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Start Working" }),
    ).toBeOnTheScreen();

    renderWizard({ currentStep: "name" });

    expect(screen.getByLabelText("Name your goal")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Quick add, skip to the list" }),
    ).toBeOnTheScreen();
  });
});
