import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import {
  NewGoalWizard,
  type BuildStep,
  type NewGoalWizardProps,
  type NewGoalWizardStep,
} from "../NewGoalWizard";
import { EvidenceType } from "../../../db";

// NewGoalWizard imports EditGoalSubStepRow via the EditGoalView barrel (#465),
// whose chain (EditGoalView → EditGoalSubStepList → useEditGoalDrag) reaches
// expo-haptics — untransformed ESM under Jest. Same mocks as EditGoalView's
// own test; the wizard's static (canDrag=false) rows never fire them.
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
}));

jest.mock("../../../utils/haptics", () => ({
  triggerDragStart: jest.fn(),
  triggerDragDrop: jest.fn(),
}));

// The prototype's own initNG() seed — two rows, distinct evidence types so the
// two chips (and pre-selection assertions) can be told apart.
const BUILD_STEPS: BuildStep[] = [
  { id: "s1", title: "Sand the edges", evidenceType: EvidenceType.text },
  { id: "s2", title: "Paint it", evidenceType: EvidenceType.photo },
];

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

    it("pre-selects the current planned type in the sheet (parallels the build side)", () => {
      // pickerSelectedType derives from plannedEvidenceType on the step; guards
      // the step-2 half of that derivation the way the build test guards its own.
      renderWizard({
        currentStep: "step",
        evidencePickerOpen: true,
        plannedEvidenceType: EvidenceType.text,
      });

      expect(
        screen.getByRole("radio", { name: "Note" }).props.accessibilityState,
      ).toMatchObject({ checked: true });
    });

    it("dismisses the sheet without changing the type when the backdrop is tapped", () => {
      // Distinct from the select-a-type path: tapping outside abandons the pick.
      // Catches a refactor that swaps handlePickerClose's ternary arms or wires
      // the backdrop to the wrong wizard callback.
      const onCloseEvidencePicker = jest.fn();
      const onPlannedEvidenceTypeChange = jest.fn();
      renderWizard({
        currentStep: "step",
        evidencePickerOpen: true,
        onCloseEvidencePicker,
        onPlannedEvidenceTypeChange,
      });

      fireEvent.press(screen.getByTestId("capture-sheet-backdrop"));

      expect(onCloseEvidencePicker).toHaveBeenCalledTimes(1);
      expect(onPlannedEvidenceTypeChange).not.toHaveBeenCalled();
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

  it.each(["name", "step", "build", "ready"] as const)(
    "fires onClose from the %s step",
    (currentStep) => {
      const onClose = jest.fn();
      renderWizard({ currentStep, onClose });

      fireEvent.press(screen.getByTestId("new-goal-close-button"));

      expect(onClose).toHaveBeenCalledTimes(1);
    },
  );

  it.each(["step", "build", "ready"] as const)(
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

  describe("build step", () => {
    it("renders the shell, 'Your steps' header + count, and the ready CTA — not the other steps' bodies", () => {
      // Replaces the old "build placeholder" regression: the build body now
      // renders real content, so this asserts it's present *and* that the
      // other steps' bodies stay absent (the cross-step exclusivity the
      // placeholder test used to guard).
      renderWizard({ currentStep: "build", buildSteps: BUILD_STEPS });

      expect(screen.getByText("New goal")).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Go back" })).toBeOnTheScreen();
      expect(screen.getByTestId("new-goal-close-button")).toBeOnTheScreen();
      expect(screen.getByText("Your steps")).toBeOnTheScreen();
      // Count is derived from buildSteps.length (D8), not the stepCount prop.
      expect(screen.getByTestId("new-goal-build-count")).toHaveTextContent(
        String(BUILD_STEPS.length),
      );
      expect(
        screen.getByTestId("new-goal-build-ready-button"),
      ).toBeOnTheScreen();

      expect(screen.queryByText("What do you want to work toward?")).toBeNull();
      expect(screen.queryByText("You're set.")).toBeNull();
      expect(screen.queryByText("What's the first step?")).toBeNull();
    });

    it("renders a row per build step — number, title, and its evidence icon+label", () => {
      renderWizard({ currentStep: "build", buildSteps: BUILD_STEPS });

      expect(screen.getByTestId("new-goal-build-row-s1")).toBeOnTheScreen();
      expect(screen.getByTestId("new-goal-build-row-s2")).toBeOnTheScreen();
      expect(screen.getByText("Sand the edges")).toBeOnTheScreen();
      expect(screen.getByText("Paint it")).toBeOnTheScreen();
      // Distinct types render distinct chips: Note (📝) and Photo (📷).
      expect(screen.getByText("📝")).toBeOnTheScreen();
      expect(screen.getByText("Note")).toBeOnTheScreen();
      expect(screen.getByText("📷")).toBeOnTheScreen();
      expect(screen.getByText("Photo")).toBeOnTheScreen();
    });

    it("derives the header count from buildSteps.length, ignoring the stepCount prop (D8)", () => {
      renderWizard({
        currentStep: "build",
        buildSteps: BUILD_STEPS,
        stepCount: 99,
      });

      expect(screen.getByTestId("new-goal-build-count")).toHaveTextContent("2");
      expect(screen.queryByText("99")).toBeNull();
    });

    it("fires onAddStep when the add-step affordance is pressed", () => {
      const onAddStep = jest.fn();
      renderWizard({
        currentStep: "build",
        buildSteps: BUILD_STEPS,
        onAddStep,
      });

      fireEvent.press(screen.getByTestId("new-goal-add-step-button"));

      expect(onAddStep).toHaveBeenCalledTimes(1);
    });

    it("fires onOpenBuildStepEvidence with the row id when a row's chip is pressed", () => {
      const onOpenBuildStepEvidence = jest.fn();
      renderWizard({
        currentStep: "build",
        buildSteps: BUILD_STEPS,
        onOpenBuildStepEvidence,
      });

      fireEvent.press(screen.getByTestId("new-goal-build-evidence-chip-s2"));

      expect(onOpenBuildStepEvidence).toHaveBeenCalledWith("s2");
    });

    it("names each row's chip press target with the action, row title, and current type", () => {
      // D7 a11y contract, parallel to step 2's chip: one collapsed node whose
      // label states the action + which row + its current planned type.
      renderWizard({ currentStep: "build", buildSteps: BUILD_STEPS });

      expect(
        screen.getByRole("button", {
          name: "Change evidence type for Paint it, currently Photo",
        }),
      ).toBeOnTheScreen();
    });

    it("shows the shared capture sheet, pre-selecting the open row's current type", () => {
      renderWizard({
        currentStep: "build",
        buildSteps: BUILD_STEPS,
        openBuildStepEvidenceId: "s2",
      });

      expect(screen.getByText("Evidence type")).toBeOnTheScreen();
      // Row s2 is Photo, so the Photo radio is the checked one.
      expect(
        screen.getByRole("radio", { name: "Photo" }).props.accessibilityState,
      ).toMatchObject({ checked: true });
    });

    it("keeps the capture sheet closed when no row is targeted", () => {
      renderWizard({
        currentStep: "build",
        buildSteps: BUILD_STEPS,
        openBuildStepEvidenceId: null,
      });

      expect(screen.queryByText("Evidence type")).toBeNull();
    });

    it("changes the targeted row's type and closes the sheet when a type is selected", () => {
      const onBuildStepEvidenceTypeChange = jest.fn();
      const onCloseBuildStepEvidence = jest.fn();
      renderWizard({
        currentStep: "build",
        buildSteps: BUILD_STEPS,
        openBuildStepEvidenceId: "s1",
        onBuildStepEvidenceTypeChange,
        onCloseBuildStepEvidence,
      });

      fireEvent.press(screen.getByRole("radio", { name: "Photo" }));

      expect(onBuildStepEvidenceTypeChange).toHaveBeenCalledWith(
        "s1",
        EvidenceType.photo,
      );
      expect(onCloseBuildStepEvidence).toHaveBeenCalledTimes(1);
    });

    it("dismisses the sheet without changing a row's type when the backdrop is tapped", () => {
      const onBuildStepEvidenceTypeChange = jest.fn();
      const onCloseBuildStepEvidence = jest.fn();
      renderWizard({
        currentStep: "build",
        buildSteps: BUILD_STEPS,
        openBuildStepEvidenceId: "s1",
        onBuildStepEvidenceTypeChange,
        onCloseBuildStepEvidence,
      });

      fireEvent.press(screen.getByTestId("capture-sheet-backdrop"));

      expect(onCloseBuildStepEvidence).toHaveBeenCalledTimes(1);
      expect(onBuildStepEvidenceTypeChange).not.toHaveBeenCalled();
    });

    it("renders the safe empty state (count 0, no rows, add-step still present) for an empty list", () => {
      // buildSteps defaults to [] and a caller can mount "build" before seeding
      // rows; the screen must render a 0 count with the add-step affordance, not
      // crash or show phantom rows.
      renderWizard({ currentStep: "build", buildSteps: [] });

      expect(screen.getByTestId("new-goal-build-count")).toHaveTextContent("0");
      expect(screen.getByTestId("new-goal-add-step-button")).toBeOnTheScreen();
      expect(
        screen.getByTestId("new-goal-build-ready-button"),
      ).toBeOnTheScreen();
      expect(screen.queryByTestId("new-goal-build-row-s1")).toBeNull();
    });

    it("fires onNext from the 'I'm ready →' CTA", () => {
      const onNext = jest.fn();
      renderWizard({ currentStep: "build", buildSteps: BUILD_STEPS, onNext });

      fireEvent.press(screen.getByTestId("new-goal-build-ready-button"));

      expect(onNext).toHaveBeenCalledTimes(1);
    });
  });

  describe("build step · rename (#482)", () => {
    it("renders each row's title as a tap-to-edit button that fires onStartEditingBuildStep", () => {
      const onStartEditingBuildStep = jest.fn();
      renderWizard({
        currentStep: "build",
        buildSteps: BUILD_STEPS,
        onStartEditingBuildStep,
      });

      const title = screen.getByTestId("new-goal-build-step-title-s1");
      expect(title.props.accessibilityRole).toBe("button");
      expect(title.props.accessibilityLabel).toBe("Sand the edges");
      expect(title.props.accessibilityHint).toBe("Tap to edit step title");

      fireEvent.press(title);
      expect(onStartEditingBuildStep).toHaveBeenCalledWith(
        "s1",
        "Sand the edges",
      );
    });

    it("renders a seeded edit field (not the title button) only for the row being edited", () => {
      renderWizard({
        currentStep: "build",
        buildSteps: BUILD_STEPS,
        editingBuildStepId: "s1",
        buildStepEditText: "Sand the edges",
      });

      const input = screen.getByTestId("new-goal-build-step-edit-s1");
      expect(input.props.value).toBe("Sand the edges");
      expect(input.props.accessibilityLabel).toBe("Edit step: Sand the edges");
      // The tap-to-edit title button for that row is gone while editing…
      expect(screen.queryByTestId("new-goal-build-step-title-s1")).toBeNull();
      // …but other rows stay in display mode.
      expect(
        screen.getByTestId("new-goal-build-step-title-s2"),
      ).toBeOnTheScreen();
    });

    it("fires onBuildStepEditTextChange while typing in the edit field", () => {
      const onBuildStepEditTextChange = jest.fn();
      renderWizard({
        currentStep: "build",
        buildSteps: BUILD_STEPS,
        editingBuildStepId: "s1",
        buildStepEditText: "Sand",
        onBuildStepEditTextChange,
      });

      fireEvent.changeText(
        screen.getByTestId("new-goal-build-step-edit-s1"),
        "Sand the edges smooth",
      );

      expect(onBuildStepEditTextChange).toHaveBeenCalledWith(
        "Sand the edges smooth",
      );
    });

    it("commits the edit on both submit and blur", () => {
      const onCommitBuildStepEditing = jest.fn();
      renderWizard({
        currentStep: "build",
        buildSteps: BUILD_STEPS,
        editingBuildStepId: "s1",
        onCommitBuildStepEditing,
      });

      const input = screen.getByTestId("new-goal-build-step-edit-s1");
      fireEvent(input, "submitEditing");
      fireEvent(input, "blur");

      expect(onCommitBuildStepEditing).toHaveBeenCalledTimes(2);
    });

    it("suppresses the mid-rename row's evidence chip and × but keeps other rows' intact (D4)", () => {
      renderWizard({
        currentStep: "build",
        buildSteps: BUILD_STEPS,
        editingBuildStepId: "s1",
      });

      // Editing row: neither the chip nor the × render while the field owns focus.
      expect(
        screen.queryByTestId("new-goal-build-evidence-chip-s1"),
      ).toBeNull();
      expect(screen.queryByTestId("new-goal-build-step-delete-s1")).toBeNull();
      // Non-editing row: both remain.
      expect(
        screen.getByTestId("new-goal-build-evidence-chip-s2"),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId("new-goal-build-step-delete-s2"),
      ).toBeOnTheScreen();
    });
  });

  describe("build step · delete (#482)", () => {
    it.each([
      ["s1", "Sand the edges"],
      ["s2", "Paint it"],
    ])("labels the × for row %s as a delete button", (id, title) => {
      renderWizard({ currentStep: "build", buildSteps: BUILD_STEPS });

      const del = screen.getByTestId(`new-goal-build-step-delete-${id}`);
      expect(del.props.accessibilityRole).toBe("button");
      expect(del.props.accessibilityLabel).toBe(`Delete step: ${title}`);
    });

    it("fires onRequestDeleteBuildStep on × press without removing the row or confirming", () => {
      const onRequestDeleteBuildStep = jest.fn();
      const onConfirmDeleteBuildStep = jest.fn();
      renderWizard({
        currentStep: "build",
        buildSteps: BUILD_STEPS,
        onRequestDeleteBuildStep,
        onConfirmDeleteBuildStep,
      });

      fireEvent.press(screen.getByTestId("new-goal-build-step-delete-s2"));

      expect(onRequestDeleteBuildStep).toHaveBeenCalledWith("s2");
      // The raw × is request-only — it never removes the row nor confirms.
      expect(onConfirmDeleteBuildStep).not.toHaveBeenCalled();
      expect(screen.getByTestId("new-goal-build-row-s2")).toBeOnTheScreen();
    });

    it("keeps the confirm modal closed when no delete is pending", () => {
      renderWizard({ currentStep: "build", buildSteps: BUILD_STEPS });

      expect(screen.queryByText("Delete step?")).toBeNull();
    });

    it("shows the confirm modal with wizard-stage copy for the pending row (D8)", () => {
      renderWizard({
        currentStep: "build",
        buildSteps: BUILD_STEPS,
        pendingDeleteBuildStepId: "s2",
      });

      expect(screen.getByText("Delete step?")).toBeOnTheScreen();
      // Wizard-appropriate message: no evidence/sub-step clause (D8), unlike
      // EditGoalView's equivalent copy — a build row has neither yet.
      expect(
        screen.getByText('Remove "Paint it" from your step list?'),
      ).toBeOnTheScreen();
    });

    it("fires onConfirmDeleteBuildStep on Confirm, never onCancel", () => {
      const onConfirmDeleteBuildStep = jest.fn();
      const onCancelDeleteBuildStep = jest.fn();
      renderWizard({
        currentStep: "build",
        buildSteps: BUILD_STEPS,
        pendingDeleteBuildStepId: "s1",
        onConfirmDeleteBuildStep,
        onCancelDeleteBuildStep,
      });

      fireEvent.press(screen.getByText("Delete"));

      expect(onConfirmDeleteBuildStep).toHaveBeenCalledTimes(1);
      expect(onCancelDeleteBuildStep).not.toHaveBeenCalled();
    });

    it("fires onCancelDeleteBuildStep on Cancel, never onConfirm", () => {
      const onConfirmDeleteBuildStep = jest.fn();
      const onCancelDeleteBuildStep = jest.fn();
      renderWizard({
        currentStep: "build",
        buildSteps: BUILD_STEPS,
        pendingDeleteBuildStepId: "s1",
        onConfirmDeleteBuildStep,
        onCancelDeleteBuildStep,
      });

      fireEvent.press(screen.getByText("Cancel"));

      expect(onCancelDeleteBuildStep).toHaveBeenCalledTimes(1);
      expect(onConfirmDeleteBuildStep).not.toHaveBeenCalled();
    });
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
    ["build", "Your steps"],
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
