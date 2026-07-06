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
      // Back arrow is absent on the first step (ScreenSubHeader spacer, D8).
      expect(screen.queryByRole("button", { name: "Go back" })).toBeNull();
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
      "disables Next and blocks onNext for empty/whitespace-only title %#",
      (goalTitle) => {
        const onNext = jest.fn();
        renderWizard({ currentStep: "name", goalTitle, onNext });

        const nextButton = screen.getByTestId("new-goal-next-button");
        expect(nextButton.props.accessibilityState).toMatchObject({
          disabled: true,
        });

        // The a11y flag is only half the guard — pressing while disabled must
        // not advance. Catches a refactor that computes `disabled` for a11y but
        // wires the press path around it.
        fireEvent.press(nextButton);
        expect(onNext).not.toHaveBeenCalled();
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

      expect(screen.getByRole("button", { name: "Go back" })).toBeOnTheScreen();
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
      [-2, "0 steps · evidence on each"],
      [1.5, "1 step · evidence on each"],
    ])("pluralizes the step count summary for %s", (stepCount, label) => {
      renderWizard({ currentStep: "ready", stepCount });

      expect(screen.getByText(label)).toBeOnTheScreen();
    });

    it("fires onBack and onStartWorking from ready step controls", () => {
      const onBack = jest.fn();
      const onStartWorking = jest.fn();
      renderWizard({ currentStep: "ready", onBack, onStartWorking });

      fireEvent.press(screen.getByRole("button", { name: "Go back" }));
      fireEvent.press(screen.getByTestId("new-goal-start-working-button"));

      expect(onBack).toHaveBeenCalledTimes(1);
      expect(onStartWorking).toHaveBeenCalledTimes(1);
    });

    it("routes the step count through an injected stepCountSummary", () => {
      // The pluralizer is the seam #444 threads real t() pluralization
      // through; lock that the prop is called with stepCount and its output
      // rendered, so a refactor can't quietly hardcode the default.
      const stepCountSummary = jest.fn(() => "three-ish steps");
      renderWizard({ currentStep: "ready", stepCount: 3, stepCountSummary });

      expect(stepCountSummary).toHaveBeenCalledWith(3);
      expect(screen.getByText("three-ish steps")).toBeOnTheScreen();
    });

    it("hides the decorative badge emoji from screen readers", () => {
      // a11y contract: the 🏆 is decoration, not content — it must not be
      // announced. It's excluded from the accessibility tree, so the query
      // needs includeHiddenElements to reach it; that it's hidden at all is the
      // point. Guards the accessibilityElementsHidden/importantForAccessibility
      // pair against an edit to the banner.
      renderWizard({ currentStep: "ready" });

      const emoji = screen.getByText("🏆", { includeHiddenElements: true });
      expect(emoji.props.importantForAccessibility).toBe("no");
      expect(emoji.props.accessibilityElementsHidden).toBe(true);
    });
  });

  describe("step 2 · first step", () => {
    it("renders the goal recap, headline, first-step input, default Note chip, and Next CTA", () => {
      renderWizard({
        currentStep: "step",
        goalTitle: "Build a birdhouse",
        firstStepTitle: "",
      });

      expect(screen.getByText("Goal")).toBeOnTheScreen();
      // Goal recap echoes the step-1 title so the first-step input has context.
      expect(screen.getByText("Build a birdhouse")).toBeOnTheScreen();
      expect(screen.getByText("What's the first step?")).toBeOnTheScreen();
      expect(screen.getByTestId("new-goal-first-step-input")).toBeOnTheScreen();
      // Chip is born as "Note" (D4) — a real type on first paint, never empty.
      expect(screen.getByText("📝")).toBeOnTheScreen();
      expect(screen.getByText("Note")).toBeOnTheScreen();
      expect(screen.getByText("change")).toBeOnTheScreen();
      expect(screen.getByTestId("new-goal-next-button")).toBeOnTheScreen();
    });

    it("defaults the planned-evidence chip to Note when plannedEvidenceType is omitted", () => {
      // D4 regression: with the prop absent, the default parameter must render a
      // real type ("Note"/📝), never a missing/undefined state.
      renderWizard({ currentStep: "step" });

      expect(screen.getByText("📝")).toBeOnTheScreen();
      expect(screen.getByText("Note")).toBeOnTheScreen();
    });

    it("fires onFirstStepTitleChange when the first-step input changes", () => {
      const onFirstStepTitleChange = jest.fn();
      renderWizard({ currentStep: "step", onFirstStepTitleChange });

      fireEvent.changeText(
        screen.getByTestId("new-goal-first-step-input"),
        "Cut the plywood",
      );

      expect(onFirstStepTitleChange).toHaveBeenCalledWith("Cut the plywood");
    });

    it.each(["", "   ", "\n\t"])(
      "disables Next and blocks onNext for empty/whitespace-only first-step title %#",
      (firstStepTitle) => {
        const onNext = jest.fn();
        renderWizard({ currentStep: "step", firstStepTitle, onNext });

        const nextButton = screen.getByTestId("new-goal-next-button");
        expect(nextButton.props.accessibilityState).toMatchObject({
          disabled: true,
        });

        fireEvent.press(nextButton);
        expect(onNext).not.toHaveBeenCalled();
      },
    );

    it("enables Next when the first-step title has non-whitespace text", () => {
      renderWizard({ currentStep: "step", firstStepTitle: "  Cut plywood  " });

      expect(
        screen.getByTestId("new-goal-next-button").props.accessibilityState,
      ).toMatchObject({ disabled: false });
    });

    it("opens the evidence picker when the chip is pressed", () => {
      const onOpenEvidencePicker = jest.fn();
      renderWizard({ currentStep: "step", onOpenEvidencePicker });

      fireEvent.press(screen.getByTestId("new-goal-evidence-chip"));

      expect(onOpenEvidencePicker).toHaveBeenCalledTimes(1);
    });

    it("names the chip press target with the action and current type for screen readers", () => {
      // D7 a11y contract: the whole chip is one node whose label states the
      // action and the current planned type (mirrors FocusCurrentTaskCard).
      renderWizard({ currentStep: "step" });

      expect(
        screen.getByRole("button", {
          name: "Change evidence type, currently Note",
        }),
      ).toBeOnTheScreen();
    });

    it("shows the composed capture sheet with the 'Evidence type' header when open", () => {
      renderWizard({ currentStep: "step", evidencePickerOpen: true });

      expect(screen.getByText("Evidence type")).toBeOnTheScreen();
      // The single-select capture grid is present (a real type option renders).
      expect(screen.getByRole("radio", { name: "Photo" })).toBeOnTheScreen();
    });

    it("hides the capture sheet header while the picker is closed", () => {
      renderWizard({ currentStep: "step", evidencePickerOpen: false });

      expect(screen.queryByText("Evidence type")).toBeNull();
    });

    it("changes the planned type and closes the sheet when a type is selected", () => {
      const onPlannedEvidenceTypeChange = jest.fn();
      const onCloseEvidencePicker = jest.fn();
      renderWizard({
        currentStep: "step",
        evidencePickerOpen: true,
        onPlannedEvidenceTypeChange,
        onCloseEvidencePicker,
      });

      fireEvent.press(screen.getByRole("radio", { name: "Photo" }));

      expect(onPlannedEvidenceTypeChange).toHaveBeenCalledTimes(1);
      expect(onCloseEvidencePicker).toHaveBeenCalledTimes(1);
    });
  });

  it.each(["name", "step", "ready"] as const)(
    "fires onClose from the %s step",
    (currentStep) => {
      const onClose = jest.fn();
      renderWizard({ currentStep, onClose });

      fireEvent.press(screen.getByTestId("new-goal-close-button"));

      expect(onClose).toHaveBeenCalledTimes(1);
    },
  );

  it.each(["step", "ready"] as const)(
    "renders the back arrow and fires onBack from the %s step",
    (currentStep) => {
      const onBack = jest.fn();
      renderWizard({ currentStep, onBack });

      const backButton = screen.getByRole("button", { name: "Go back" });
      expect(backButton).toBeOnTheScreen();

      fireEvent.press(backButton);
      expect(onBack).toHaveBeenCalledTimes(1);
    },
  );

  it("renders the build placeholder without a body regression", () => {
    renderWizard({ currentStep: "build" });

    expect(screen.getByText("New goal")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Go back" })).toBeOnTheScreen();
    expect(screen.getByTestId("new-goal-close-button")).toBeOnTheScreen();
    expect(screen.queryByText("What do you want to work toward?")).toBeNull();
    expect(screen.queryByText("You're set.")).toBeNull();
    expect(screen.queryByText("What's the first step?")).toBeNull();
  });

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

  it.each<[NewGoalWizardStep, number]>([
    ["name", 1],
    ["step", 2],
    ["build", 3],
    ["ready", 4],
  ])(
    "exposes step %s as position %i of 4 via accessibilityValue",
    (currentStep, now) => {
      renderWizard({ currentStep });

      expect(screen.getByRole("progressbar").props.accessibilityValue).toEqual({
        min: 1,
        max: 4,
        now,
      });
    },
  );

  it.each([
    ["name", "What do you want to work toward?"],
    ["step", "What's the first step?"],
    ["ready", "You're set."],
  ] as const)(
    "marks the %s-step headline with the header role for screen readers",
    (currentStep, headline) => {
      renderWizard({ currentStep });

      expect(screen.getByText(headline).props.accessibilityRole).toBe("header");
    },
  );

  it("exposes accessible labels and roles for ready-step controls", () => {
    renderWizard({ currentStep: "ready" });

    expect(screen.getByRole("button", { name: "Go back" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Close" })).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Start Working" }),
    ).toBeOnTheScreen();
  });

  it("exposes accessible labels and roles for name-step controls", () => {
    renderWizard({ currentStep: "name" });

    expect(screen.getByLabelText("Name your goal")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Quick add, skip to the list" }),
    ).toBeOnTheScreen();
  });
});
