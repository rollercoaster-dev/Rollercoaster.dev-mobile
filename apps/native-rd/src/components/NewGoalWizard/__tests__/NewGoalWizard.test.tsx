import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
  act,
} from "../../../__tests__/test-utils";
import {
  NewGoalWizard,
  type NewGoalWizardProps,
  type NewGoalWizardStep,
} from "../NewGoalWizard";
import type { EditGoalStep } from "../../EditGoalView";
import { EvidenceType } from "../../../db";

// The build step reuses EditGoalStepList (#489/#490), which drives drag reorder
// through react-native-gesture-handler + haptics and gates its ↑/↓ fallback on
// the animation pref. Mirror EditGoalView.test.tsx's setup so the reused list
// renders in Node and the fallback can be flipped on per-test.
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

// Mutable so a test can flip on "accessible controls" (the ↑/↓ move buttons,
// which only render when a screen reader is on or motion is off).
let mockAnimationPref = "full";
jest.mock("../../../hooks/useAnimationPref", () => ({
  useAnimationPref: () => ({
    animationPref: mockAnimationPref,
    shouldAnimate: mockAnimationPref !== "none",
    shouldReduceMotion: mockAnimationPref === "none",
    setAnimationPref: jest.fn(),
  }),
}));

afterEach(() => {
  mockAnimationPref = "full";
});

// The prototype's own initNG() seed, on EditGoalStepList's rich shape — two
// rows, distinct evidence types (Note / Photo) so the two pills can be told
// apart, multi-select (`plannedEvidenceTypes`, min 1).
const BUILD_STEPS: EditGoalStep[] = [
  {
    id: "s1",
    title: "Sand the edges",
    plannedEvidenceTypes: [EvidenceType.text],
  },
  {
    id: "s2",
    title: "Paint it",
    plannedEvidenceTypes: [EvidenceType.photo],
  },
];

// One parent broken into two sub-steps + a bare sibling — exercises the
// sub-step block, its rename/evidence/delete/reorder, and the "break into
// sub-steps" prompt on the row that has none.
const BUILD_STEPS_WITH_SUB: EditGoalStep[] = [
  {
    id: "s1",
    title: "Sand the edges",
    plannedEvidenceTypes: [EvidenceType.text],
    subSteps: [
      {
        id: "sub1",
        title: "Rough pass",
        plannedEvidenceTypes: [EvidenceType.photo],
      },
      {
        id: "sub2",
        title: "Fine pass",
        plannedEvidenceTypes: [EvidenceType.text],
      },
    ],
  },
  {
    id: "s2",
    title: "Paint it",
    plannedEvidenceTypes: [EvidenceType.photo],
  },
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

  // The build step reuses EditGoalStepList (#489) whole, so these are
  // wiring-only tests: the wizard renders the list with the right `steps` and
  // each callback fires with the right id/args. The list's own internal
  // behavior (edit-state transitions, picker toggling, drag math) is covered by
  // EditGoalView.test.tsx and is not re-asserted here.
  describe("build step", () => {
    it("renders the shell, 'Your steps' header + count, and the ready CTA — not the other steps' bodies", () => {
      // Replaces the old "build placeholder" regression: the build body now
      // renders EditGoalStepList, so this asserts its header/count/rows are
      // present *and* that the other steps' bodies stay absent (the cross-step
      // exclusivity the placeholder test used to guard).
      renderWizard({ currentStep: "build", steps: BUILD_STEPS });

      expect(screen.getByText("New goal")).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Go back" })).toBeOnTheScreen();
      expect(screen.getByTestId("new-goal-close-button")).toBeOnTheScreen();
      // "Your steps" is fed to EditGoalStepList as stepsSectionLabel (D1); the
      // count is the list's own default "N steps" label over steps.length.
      expect(screen.getByText("Your steps")).toBeOnTheScreen();
      expect(screen.getByText("2 steps")).toBeOnTheScreen();
      expect(
        screen.getByTestId("new-goal-build-ready-button"),
      ).toBeOnTheScreen();

      expect(screen.queryByText("What do you want to work toward?")).toBeNull();
      expect(screen.queryByText("You're set.")).toBeNull();
      expect(screen.queryByText("What's the first step?")).toBeNull();
    });

    it("renders a row per step via EditGoalStepList — title + evidence pill", () => {
      renderWizard({ currentStep: "build", steps: BUILD_STEPS });

      expect(screen.getByTestId("edit-goal-step-title-s1")).toBeOnTheScreen();
      expect(screen.getByTestId("edit-goal-step-title-s2")).toBeOnTheScreen();
      expect(screen.getByText("Sand the edges")).toBeOnTheScreen();
      expect(screen.getByText("Paint it")).toBeOnTheScreen();
      // Distinct types render distinct pills: Note (text) and Photo.
      expect(screen.getByText("Note")).toBeOnTheScreen();
      expect(screen.getByText("Photo")).toBeOnTheScreen();
    });

    it("reflects steps.length in the built-in count, ignoring the stepCount prop", () => {
      // The build-step count comes from EditGoalStepList over the `steps` prop,
      // not the ready-card `stepCount` — a stale stepCount can't leak in.
      renderWizard({
        currentStep: "build",
        steps: BUILD_STEPS,
        stepCount: 99,
      });

      expect(screen.getByText("2 steps")).toBeOnTheScreen();
      expect(screen.queryByText("99")).toBeNull();
    });

    it("adds a step with the typed title via the list's inline input (D3)", () => {
      // The wizard's old title-less '+ add another step' link is gone; add now
      // flows through EditGoalStepList's typed input + button, firing onAddStep
      // with the entered title.
      const onAddStep = jest.fn();
      renderWizard({ currentStep: "build", steps: BUILD_STEPS, onAddStep });

      fireEvent.changeText(
        screen.getByTestId("edit-goal-add-step-input"),
        "Seal it",
      );
      fireEvent.press(screen.getByTestId("edit-goal-add-step-button"));

      expect(onAddStep).toHaveBeenCalledWith("Seal it");
    });

    it("toggles a row's planned evidence via the wizard's evidence sheet (onStepEvidenceChange)", () => {
      const onStepEvidenceChange = jest.fn();
      renderWizard({
        currentStep: "build",
        steps: BUILD_STEPS,
        onStepEvidenceChange,
      });

      // The chip opens the wizard-owned AnimatedSheet (#494); add a second type.
      fireEvent.press(screen.getByTestId("edit-goal-step-evidence-s1"));
      const unchecked = screen
        .getAllByRole("checkbox")
        .filter((n) => !n.props.accessibilityState?.checked);
      fireEvent.press(unchecked[0]);

      expect(onStepEvidenceChange).toHaveBeenCalledTimes(1);
      expect(onStepEvidenceChange.mock.calls[0][0]).toBe("s1");
    });

    it("fires onReorderSteps from the ↑/↓ fallback, scoped to the step order", () => {
      // With motion off the accessible ↑/↓ controls render; pressing one is the
      // deterministic reorder path in Node (drag needs a native runtime).
      mockAnimationPref = "none";
      const onReorderSteps = jest.fn();
      renderWizard({
        currentStep: "build",
        steps: BUILD_STEPS,
        onReorderSteps,
      });

      fireEvent.press(screen.getByLabelText('Move "Sand the edges" down'));

      expect(onReorderSteps).toHaveBeenCalledWith(["s2", "s1"]);
    });

    it("renders the safe empty state (list header + add input, no rows) for an empty list", () => {
      // steps defaults to [] and a caller can mount "build" before seeding rows;
      // the screen must render a 0 count with the add affordance, not crash.
      renderWizard({ currentStep: "build", steps: [] });

      expect(screen.getByText("0 steps")).toBeOnTheScreen();
      expect(screen.getByTestId("edit-goal-add-step-input")).toBeOnTheScreen();
      expect(
        screen.getByTestId("new-goal-build-ready-button"),
      ).toBeOnTheScreen();
      expect(screen.queryByTestId("edit-goal-step-title-s1")).toBeNull();
    });

    it("fires onNext from the 'I'm ready →' CTA", () => {
      const onNext = jest.fn();
      renderWizard({ currentStep: "build", steps: BUILD_STEPS, onNext });

      fireEvent.press(screen.getByTestId("new-goal-build-ready-button"));

      expect(onNext).toHaveBeenCalledTimes(1);
    });
  });

  describe("build step · rename", () => {
    it("routes an inline title edit through onStepTitleChange", () => {
      const onStepTitleChange = jest.fn();
      renderWizard({
        currentStep: "build",
        steps: BUILD_STEPS,
        onStepTitleChange,
      });

      // Tap the title to enter edit mode (EditGoalStepList owns the edit state),
      // then commit a new title — the wizard's callback carries it out.
      fireEvent.press(screen.getByTestId("edit-goal-step-title-s1"));
      const input = screen.getByTestId("edit-goal-step-edit-s1");
      fireEvent.changeText(input, "Sand the edges smooth");
      fireEvent(input, "submitEditing");

      expect(onStepTitleChange).toHaveBeenCalledWith(
        "s1",
        "Sand the edges smooth",
      );
    });
  });

  describe("build step · delete", () => {
    it("opens the confirm modal on × and fires onDeleteStep only on Confirm", () => {
      const onDeleteStep = jest.fn();
      renderWizard({
        currentStep: "build",
        steps: BUILD_STEPS,
        onDeleteStep,
      });

      // The × opens EditGoalStepList's own ConfirmDeleteModal — it does not
      // remove the row on the raw press.
      fireEvent.press(screen.getByTestId("edit-goal-step-delete-s2"));
      expect(screen.getByText("Delete step?")).toBeOnTheScreen();
      expect(onDeleteStep).not.toHaveBeenCalled();

      fireEvent.press(screen.getByText("Delete"));
      expect(onDeleteStep).toHaveBeenCalledWith("s2");
    });

    it("does not fire onDeleteStep when the confirm is cancelled", () => {
      const onDeleteStep = jest.fn();
      renderWizard({
        currentStep: "build",
        steps: BUILD_STEPS,
        onDeleteStep,
      });

      fireEvent.press(screen.getByTestId("edit-goal-step-delete-s1"));
      fireEvent.press(screen.getByText("Cancel"));

      expect(onDeleteStep).not.toHaveBeenCalled();
    });
  });

  // New coverage — one-level sub-steps were impossible on the wizard's build
  // step before this reuse. Still wiring-only: assert the wizard's callbacks
  // fire; EditGoalView.test.tsx owns the list's internal sub-step behavior.
  describe("build step · sub-steps", () => {
    it("fires onAddSubStep from the 'break into sub-steps' prompt on a row with none", () => {
      const onAddSubStep = jest.fn();
      renderWizard({
        currentStep: "build",
        steps: BUILD_STEPS,
        onAddSubStep,
      });

      fireEvent.press(screen.getByTestId("edit-goal-break-into-s1"));

      expect(onAddSubStep).toHaveBeenCalledWith("s1", "New sub-step");
    });

    it("renders seeded sub-steps and routes rename/evidence/delete through their callbacks", () => {
      const onSubStepTitleChange = jest.fn();
      const onSubStepEvidenceChange = jest.fn();
      const onDeleteSubStep = jest.fn();
      renderWizard({
        currentStep: "build",
        steps: BUILD_STEPS_WITH_SUB,
        onSubStepTitleChange,
        onSubStepEvidenceChange,
        onDeleteSubStep,
      });

      // Sub-step rows render inside their parent.
      expect(screen.getByText("Rough pass")).toBeOnTheScreen();
      expect(screen.getByText("Fine pass")).toBeOnTheScreen();

      // Rename.
      fireEvent.press(screen.getByTestId("edit-goal-substep-title-sub1"));
      const input = screen.getByTestId("edit-goal-substep-edit-sub1");
      fireEvent.changeText(input, "Rough sanding pass");
      fireEvent(input, "submitEditing");
      expect(onSubStepTitleChange).toHaveBeenCalledWith(
        "sub1",
        "Rough sanding pass",
      );

      // Evidence — the sub-step chip opens the wizard-owned AnimatedSheet
      // (#494); toggling a type in its grid routes through onSubStepEvidenceChange.
      fireEvent.press(screen.getByTestId("edit-goal-substep-evidence-sub2"));
      const unchecked = screen
        .getAllByRole("checkbox")
        .filter((n) => !n.props.accessibilityState?.checked);
      fireEvent.press(unchecked[0]);
      expect(onSubStepEvidenceChange).toHaveBeenCalledTimes(1);
      expect(onSubStepEvidenceChange.mock.calls[0][0]).toBe("sub2");

      // Close the sheet before deleting — while open it's modal, hiding the
      // underlying rows from queries (RNTL excludes a11y-hidden nodes).
      act(() => {
        fireEvent.press(screen.getByTestId("new-goal-evidence-backdrop"));
      });

      // Delete (confirmed).
      fireEvent.press(screen.getByTestId("edit-goal-substep-delete-sub1"));
      fireEvent.press(screen.getByText("Delete"));
      expect(onDeleteSubStep).toHaveBeenCalledWith("sub1");
    });

    it("fires onReorderSubSteps scoped to one parent from the ↑/↓ fallback", () => {
      mockAnimationPref = "none";
      const onReorderSubSteps = jest.fn();
      const onReorderSteps = jest.fn();
      renderWizard({
        currentStep: "build",
        steps: BUILD_STEPS_WITH_SUB,
        onReorderSubSteps,
        onReorderSteps,
      });

      fireEvent.press(screen.getByLabelText('Move "Rough pass" down'));

      expect(onReorderSubSteps).toHaveBeenCalledWith("s1", ["sub2", "sub1"]);
      expect(onReorderSteps).not.toHaveBeenCalled();
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

  describe("build step · reparent (#496)", () => {
    it("forwards onReparentStep: nest-under picker dispatches through the wizard", () => {
      mockAnimationPref = "none";
      const onReparentStep = jest.fn();
      renderWizard({
        currentStep: "build",
        steps: BUILD_STEPS_WITH_SUB,
        onReparentStep,
      });
      // s2 is a bare leaf root; it can nest under s1 (the parent).
      fireEvent.press(screen.getByTestId("edit-goal-step-nest-under-s2"));
      fireEvent.press(screen.getByTestId("edit-goal-step-nest-target-s2-s1"));
      expect(onReparentStep).toHaveBeenCalledWith("s2", "s1");
    });

    it("forwards onReparentStep: a sub-step Un-nest dispatches through the wizard", () => {
      mockAnimationPref = "none";
      const onReparentStep = jest.fn();
      renderWizard({
        currentStep: "build",
        steps: BUILD_STEPS_WITH_SUB,
        onReparentStep,
      });
      fireEvent.press(screen.getByTestId("edit-goal-substep-un-nest-sub1"));
      expect(onReparentStep).toHaveBeenCalledWith("sub1", null);
    });

    it("omitted onReparentStep: build step still reorders and renders no reparent controls", () => {
      mockAnimationPref = "none";
      const onReorderSteps = jest.fn();
      renderWizard({
        currentStep: "build",
        steps: BUILD_STEPS,
        onReorderSteps,
        onReparentStep: undefined,
      });
      expect(screen.queryByTestId("edit-goal-step-nest-under-s1")).toBeNull();
      // Reorder still works (sibling reorder only).
      fireEvent.press(screen.getByLabelText('Move "Sand the edges" down'));
      expect(onReorderSteps).toHaveBeenCalledWith(["s2", "s1"]);
    });
  });
});
