import React from "react";
import { Alert } from "react-native";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { i18n } from "../../../i18n";
import { NewGoalScreen } from "../NewGoalScreen";

// --- Mocks ---

const mockGoBack = jest.fn();
const mockReplace = jest.fn();
jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual("../../../__tests__/mocks/navigation");
  return {
    ...actual,
    useNavigation: jest.fn(() => ({
      ...actual.useNavigation(),
      goBack: mockGoBack,
      replace: mockReplace,
    })),
  };
});

// The build step reuses EditGoalStepList, which drives drag reorder through
// react-native-gesture-handler + haptics and gates its ↑/↓ fallback on the
// animation pref. Mirrors NewGoalWizard.test.tsx's setup so the reused list
// renders in Node, with motion off so the accessible reorder controls exist.
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

type MockResult =
  | { ok: true; value: { id: string } }
  | { ok: false; error: unknown };

const mockCreateGoal = jest.fn(
  (..._args: unknown[]): MockResult => ({ ok: true, value: { id: "goal-1" } }),
);
let nextStepRowId = 1;
const mockCreateStep = jest.fn(
  (..._args: unknown[]): MockResult => ({
    ok: true,
    value: { id: `step-row-${nextStepRowId++}` },
  }),
);
const mockCreateSubStep = jest.fn(
  (..._args: unknown[]): MockResult => ({
    ok: true,
    value: { id: "sub-row-1" },
  }),
);

jest.mock("../../../db", () => ({
  EvidenceType: {
    photo: "photo",
    text: "text",
    voice_memo: "voice_memo",
    video: "video",
    link: "link",
    file: "file",
  },
  createGoal: (...args: unknown[]) => mockCreateGoal(...args),
  createStep: (...args: unknown[]) => mockCreateStep(...args),
  createSubStep: (...args: unknown[]) => mockCreateSubStep(...args),
}));

const mockReportError = jest.fn();
jest.mock("../../../services/sentry-report", () => ({
  reportError: (...args: unknown[]) => mockReportError(...args),
}));

// --- Helpers ---

const GOAL_TITLE = "Build a birdhouse";
const FIRST_STEP = "Sand the edges";

/** First locally-minted row id — the ref counter starts at 1 (see mintId). */
const ROW_1 = "step-1";

/**
 * Loosely-typed `t` for assertions. i18next's generated key union can't express
 * plural lookups — `newGoal:build.stepCount` only exists as `_one`/`_other` in
 * the bundle — so the whole function is widened once here rather than casting at
 * every call site.
 */
const t = i18n.t as (key: string, options?: Record<string, unknown>) => string;

function typeTitleAndAdvance() {
  fireEvent.changeText(screen.getByTestId("new-goal-title-input"), GOAL_TITLE);
  fireEvent.press(screen.getByTestId("new-goal-next-button"));
}

/** name → step → build, seeding row 1 from the first-step screen. */
function advanceToBuild(firstStepTitle = FIRST_STEP) {
  typeTitleAndAdvance();
  fireEvent.changeText(
    screen.getByTestId("new-goal-first-step-input"),
    firstStepTitle,
  );
  fireEvent.press(screen.getByTestId("new-goal-next-button"));
}

function advanceToReady(firstStepTitle = FIRST_STEP) {
  advanceToBuild(firstStepTitle);
  fireEvent.press(screen.getByTestId("new-goal-build-ready-button"));
}

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  nextStepRowId = 1;
  alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
});

afterEach(() => {
  alertSpy.mockRestore();
});

describe("NewGoalScreen", () => {
  it("mounts the wizard on the name step with real i18n copy", () => {
    renderWithProviders(<NewGoalScreen />);

    // Proves the copy props are threaded from the newGoal namespace rather
    // than falling through to the component's English defaults.
    expect(screen.getByText(t("newGoal:header.label"))).toBeOnTheScreen();
    expect(screen.getByText(t("newGoal:name.title"))).toBeOnTheScreen();
    expect(screen.getByText(t("newGoal:name.hint"))).toBeOnTheScreen();
    expect(
      screen.getByPlaceholderText(t("newGoal:name.placeholder")),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText(t("common:actions.close"))).toBeOnTheScreen();
  });

  describe("linear flow", () => {
    // One marker per wizard position, so a step landing on the wrong body is a
    // failure rather than a silent pass.
    it.each([
      [0, () => t("newGoal:name.title")],
      [1, () => t("newGoal:step.headline")],
      [2, () => t("newGoal:build.yourSteps")],
      [3, () => t("newGoal:ready.headline")],
    ])("shows position %i's body after advancing", (advances, marker) => {
      renderWithProviders(<NewGoalScreen />);
      if (advances >= 1) typeTitleAndAdvance();
      if (advances >= 2) {
        fireEvent.changeText(
          screen.getByTestId("new-goal-first-step-input"),
          FIRST_STEP,
        );
        fireEvent.press(screen.getByTestId("new-goal-next-button"));
      }
      if (advances >= 3) {
        fireEvent.press(screen.getByTestId("new-goal-build-ready-button"));
      }

      expect(screen.getByText(marker())).toBeOnTheScreen();
    });

    it("carries the first step into the build list as row 1", () => {
      renderWithProviders(<NewGoalScreen />);
      advanceToBuild();

      expect(screen.getByText(FIRST_STEP)).toBeOnTheScreen();
      expect(
        screen.getByTestId(`edit-goal-step-title-${ROW_1}`),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(t("newGoal:build.stepCount", { count: 1 })),
      ).toBeOnTheScreen();
    });

    it("echoes the goal title and step count on the ready summary", () => {
      renderWithProviders(<NewGoalScreen />);
      advanceToReady();

      expect(screen.getByText(GOAL_TITLE)).toBeOnTheScreen();
      expect(
        screen.getByText(t("newGoal:ready.stepCountSummary", { count: 1 })),
      ).toBeOnTheScreen();
    });
  });

  describe("quick add", () => {
    it("jumps to an empty build list with no phantom placeholder row", () => {
      renderWithProviders(<NewGoalScreen />);
      fireEvent.changeText(
        screen.getByTestId("new-goal-title-input"),
        GOAL_TITLE,
      );
      fireEvent.press(screen.getByTestId("new-goal-quick-add"));

      expect(screen.getByText(t("newGoal:build.yourSteps"))).toBeOnTheScreen();
      expect(
        screen.getByText(t("newGoal:build.stepCount", { count: 0 })),
      ).toBeOnTheScreen();
      expect(screen.queryByTestId(`edit-goal-step-title-${ROW_1}`)).toBeNull();
    });

    it("returns to the name step on back, not to the skipped first step", () => {
      renderWithProviders(<NewGoalScreen />);
      fireEvent.changeText(
        screen.getByTestId("new-goal-title-input"),
        GOAL_TITLE,
      );
      fireEvent.press(screen.getByTestId("new-goal-quick-add"));

      fireEvent.press(
        screen.getByLabelText(t("common:screenHeader.a11y.goBack")),
      );

      expect(screen.getByText(t("newGoal:name.title"))).toBeOnTheScreen();
      expect(screen.queryByText(t("newGoal:step.headline"))).toBeNull();
    });
  });

  describe("first-step evidence", () => {
    it("seeds row 1's planned evidence from the chip picked before any row existed", () => {
      const photo = t("common:evidenceTypes.photo.label");
      renderWithProviders(<NewGoalScreen />);
      typeTitleAndAdvance();

      // Pick Photo with the first-step field still empty — this must not mint a
      // row, only remember the chip's value for the row that follows.
      fireEvent.press(screen.getByTestId("new-goal-evidence-chip"));
      fireEvent.press(screen.getByRole("radio", { name: photo }));
      expect(screen.getByText(photo)).toBeOnTheScreen();

      fireEvent.changeText(
        screen.getByTestId("new-goal-first-step-input"),
        FIRST_STEP,
      );
      fireEvent.press(screen.getByTestId("new-goal-next-button"));

      // Row 1 now carries Photo, not the default Note.
      expect(
        screen.getByTestId(`edit-goal-step-evidence-${ROW_1}`),
      ).toBeTruthy();
      expect(screen.getByText(photo)).toBeOnTheScreen();
      expect(
        screen.queryByText(t("common:evidenceTypes.text.label")),
      ).toBeNull();
    });

    it("drops the row again when the first-step field is cleared back to blank", () => {
      renderWithProviders(<NewGoalScreen />);
      typeTitleAndAdvance();
      const input = screen.getByTestId("new-goal-first-step-input");
      fireEvent.changeText(input, FIRST_STEP);
      fireEvent.changeText(input, "");

      // Advancing is blocked, so the only way on is quick-add from the name
      // step — which must not surface an empty row.
      expect(
        screen.getByTestId("new-goal-next-button").props.accessibilityState
          ?.disabled,
      ).toBe(true);
      fireEvent.press(
        screen.getByLabelText(t("common:screenHeader.a11y.goBack")),
      );
      fireEvent.press(screen.getByTestId("new-goal-quick-add"));

      expect(
        screen.getByText(t("newGoal:build.stepCount", { count: 0 })),
      ).toBeOnTheScreen();
    });
  });

  describe("build list", () => {
    it("appends a step typed into the list's inline input", () => {
      renderWithProviders(<NewGoalScreen />);
      advanceToBuild();

      fireEvent.changeText(
        screen.getByTestId("edit-goal-add-step-input"),
        "Paint it",
      );
      fireEvent.press(screen.getByTestId("edit-goal-add-step-button"));

      expect(screen.getByText("Paint it")).toBeOnTheScreen();
      expect(
        screen.getByText(t("newGoal:build.stepCount", { count: 2 })),
      ).toBeOnTheScreen();
    });

    it("renames a row in place", () => {
      renderWithProviders(<NewGoalScreen />);
      advanceToBuild();

      fireEvent.press(screen.getByTestId(`edit-goal-step-title-${ROW_1}`));
      const input = screen.getByTestId(`edit-goal-step-edit-${ROW_1}`);
      fireEvent.changeText(input, "Sand it smooth");
      fireEvent(input, "submitEditing");

      expect(screen.getByText("Sand it smooth")).toBeOnTheScreen();
      expect(screen.queryByText(FIRST_STEP)).toBeNull();
    });

    it("deletes a row after the confirm modal", () => {
      renderWithProviders(<NewGoalScreen />);
      advanceToBuild();

      fireEvent.press(screen.getByTestId(`edit-goal-step-delete-${ROW_1}`));
      expect(
        screen.getByText(t("newGoal:build.deleteStepConfirmTitle")),
      ).toBeOnTheScreen();
      fireEvent.press(screen.getByText(t("common:actions.delete")));

      expect(screen.queryByText(FIRST_STEP)).toBeNull();
      expect(
        screen.getByText(t("newGoal:build.stepCount", { count: 0 })),
      ).toBeOnTheScreen();
    });

    it("reorders rows via the accessible move controls", () => {
      renderWithProviders(<NewGoalScreen />);
      advanceToBuild();
      fireEvent.changeText(
        screen.getByTestId("edit-goal-add-step-input"),
        "Paint it",
      );
      fireEvent.press(screen.getByTestId("edit-goal-add-step-button"));

      fireEvent.press(screen.getByLabelText(`Move "${FIRST_STEP}" down`));

      // The reorder is local, so it shows up in the persist batch's ordinals.
      fireEvent.press(screen.getByTestId("new-goal-build-ready-button"));
      fireEvent.press(screen.getByTestId("new-goal-start-working-button"));
      expect(
        mockCreateStep.mock.calls.map((call) => [call[1], call[2]]),
      ).toEqual([
        ["Paint it", 0],
        [FIRST_STEP, 1],
      ]);
    });
  });

  describe("start working", () => {
    it("creates the goal, its steps and their sub-steps, then replaces to Focus Mode", () => {
      renderWithProviders(<NewGoalScreen />);
      advanceToBuild();
      // Break row 1 into a sub-step so the batch covers the nested branch.
      fireEvent.press(screen.getByTestId(`edit-goal-break-into-${ROW_1}`));
      fireEvent.press(screen.getByTestId("new-goal-build-ready-button"));

      fireEvent.press(screen.getByTestId("new-goal-start-working-button"));

      expect(mockCreateGoal).toHaveBeenCalledWith(GOAL_TITLE);
      expect(mockCreateStep).toHaveBeenCalledTimes(1);
      expect(mockCreateStep).toHaveBeenCalledWith("goal-1", FIRST_STEP, 0, [
        "text",
      ]);
      expect(mockCreateSubStep).toHaveBeenCalledWith(
        "goal-1",
        "step-row-1",
        t("newGoal:build.newSubStepTitle"),
        0,
        ["text"],
      );
      expect(mockReplace).toHaveBeenCalledWith("FocusMode", {
        goalId: "goal-1",
      });
      expect(mockReportError).not.toHaveBeenCalled();
    });

    it("creates a goal with no steps when the build list is left empty", () => {
      renderWithProviders(<NewGoalScreen />);
      fireEvent.changeText(
        screen.getByTestId("new-goal-title-input"),
        GOAL_TITLE,
      );
      fireEvent.press(screen.getByTestId("new-goal-quick-add"));
      fireEvent.press(screen.getByTestId("new-goal-build-ready-button"));
      fireEvent.press(screen.getByTestId("new-goal-start-working-button"));

      expect(mockCreateGoal).toHaveBeenCalledWith(GOAL_TITLE);
      expect(mockCreateStep).not.toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith("FocusMode", {
        goalId: "goal-1",
      });
    });

    // Evolu signals a failed write two ways, and both must keep the user on the
    // ready step rather than navigating into a goal that doesn't exist.
    it.each([
      [
        "returns an { ok: false } Result",
        () => {
          const error = { type: "ValidMutationSizeError" };
          mockCreateGoal.mockReturnValueOnce({ ok: false, error });
          return error;
        },
      ],
      [
        "throws",
        () => {
          const error = new Error("db locked");
          mockCreateGoal.mockImplementationOnce(() => {
            throw error;
          });
          return error;
        },
      ],
    ])("surfaces the failure when createGoal %s", (_label, arrange) => {
      const error = arrange();
      renderWithProviders(<NewGoalScreen />);
      advanceToReady();

      fireEvent.press(screen.getByTestId("new-goal-start-working-button"));

      expect(mockReplace).not.toHaveBeenCalled();
      expect(mockCreateStep).not.toHaveBeenCalled();
      expect(mockReportError).toHaveBeenCalledWith(error, {
        area: "goal.mutate",
        kind: "create",
      });
      expect(alertSpy).toHaveBeenCalledWith(
        t("newGoal:errors.createFailedTitle"),
        t("newGoal:errors.createFailedMessage"),
      );
      // Still on the ready step, so the user can retry.
      expect(screen.getByText(t("newGoal:ready.headline"))).toBeOnTheScreen();
    });

    // Quick add doesn't gate on the title the way Next does, so the ready step
    // is reachable with it blank. That must land the user back on step 1, not on
    // the generic create-failed alert from createGoal's validation guard.
    it("returns to the name step when the title is still blank", () => {
      renderWithProviders(<NewGoalScreen />);
      fireEvent.press(screen.getByTestId("new-goal-quick-add"));
      fireEvent.press(screen.getByTestId("new-goal-build-ready-button"));

      fireEvent.press(screen.getByTestId("new-goal-start-working-button"));

      expect(mockCreateGoal).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
      expect(mockReportError).not.toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith(
        t("newGoal:errors.missingTitleTitle"),
        t("newGoal:errors.missingTitleMessage"),
      );
      expect(screen.getByText(t("newGoal:name.title"))).toBeOnTheScreen();
      // History was reset with it, so name is the root again — no back arrow.
      expect(
        screen.queryByLabelText(t("common:screenHeader.a11y.goBack")),
      ).toBeNull();
    });

    it("stops the batch and does not navigate when a step insert fails", () => {
      const error = { type: "ValidMutationSizeError" };
      mockCreateStep.mockReturnValueOnce({ ok: false, error });
      renderWithProviders(<NewGoalScreen />);
      advanceToReady();

      fireEvent.press(screen.getByTestId("new-goal-start-working-button"));

      expect(mockCreateSubStep).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
      expect(mockReportError).toHaveBeenCalledWith(error, {
        area: "goal.mutate",
        kind: "create",
      });
    });
  });

  it("writes nothing and pops when closed", () => {
    renderWithProviders(<NewGoalScreen />);
    advanceToReady();

    fireEvent.press(screen.getByTestId("new-goal-close-button"));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockCreateGoal).not.toHaveBeenCalled();
    expect(mockCreateStep).not.toHaveBeenCalled();
    expect(mockCreateSubStep).not.toHaveBeenCalled();
  });
});
