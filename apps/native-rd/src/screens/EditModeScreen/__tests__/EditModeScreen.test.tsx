import React from "react";
import { Alert } from "react-native";
import { act } from "@testing-library/react-native";
import {
  renderWithProviders,
  screen,
  fireEvent,
  within,
} from "../../../__tests__/test-utils";
import { i18n } from "../../../i18n";
import { EditModeScreen } from "../EditModeScreen";

// --- Mocks ---

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual("../../../__tests__/mocks/navigation");
  return {
    ...actual,
    useNavigation: jest.fn(() => ({
      ...actual.useNavigation(),
      goBack: mockGoBack,
      navigate: mockNavigate,
    })),
  };
});

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

// "none" keeps EditGoalStepList's accessible reorder / nest / un-nest controls
// rendered — the only entry point for exercising the hierarchy handlers without
// a live drag gesture.
jest.mock("../../../hooks/useAnimationPref", () => ({
  useAnimationPref: () => ({
    animationPref: "none",
    shouldAnimate: false,
    shouldReduceMotion: true,
    setAnimationPref: jest.fn(),
  }),
}));

// All goal/step mutations return an Evolu Result; the handlers route through
// runEvoluMutation and check `result.ok`, so the mocks must hand back a success
// Result by default. Individual tests override with an ok:false Result or a
// thrown error to exercise the failure branches. reorderSteps/reorderSubSteps
// return void (they throw on failure), so they stay bare.
type MockResult = { ok: true } | { ok: false; error: unknown };
const okResult: MockResult = { ok: true };
const mockUpdateGoal = jest.fn((..._args: unknown[]): MockResult => okResult);
const mockCreateStep = jest.fn((..._args: unknown[]): MockResult => okResult);
const mockCreateSubStep = jest.fn(
  (..._args: unknown[]): MockResult => okResult,
);
const mockUpdateStep = jest.fn((..._args: unknown[]): MockResult => okResult);
const mockDeleteStep = jest.fn((..._args: unknown[]): MockResult => okResult);
const mockDeleteGoal = jest.fn((..._args: unknown[]): MockResult => okResult);
const mockReorderSteps = jest.fn();
const mockReorderSubSteps = jest.fn();

interface StepRow {
  id: string;
  parentStepId?: string | null;
  [key: string]: unknown;
}

jest.mock("../../../db", () => ({
  GoalStatus: { active: "active", completed: "completed" },
  StepStatus: { pending: "pending", completed: "completed" },
  EvidenceType: {
    photo: "photo",
    text: "text",
    voice_memo: "voice_memo",
    video: "video",
    link: "link",
    file: "file",
  },
  goalsQuery: "goalsQuery",
  stepsByGoalQuery: jest.fn(() => "stepsByGoalQuery"),
  updateGoal: (...args: unknown[]) => mockUpdateGoal(...args),
  deleteGoal: (...args: unknown[]) => mockDeleteGoal(...args),
  createStep: (...args: unknown[]) => mockCreateStep(...args),
  createSubStep: (...args: unknown[]) => mockCreateSubStep(...args),
  updateStep: (...args: unknown[]) => mockUpdateStep(...args),
  deleteStep: (...args: unknown[]) => mockDeleteStep(...args),
  reorderSteps: (...args: unknown[]) => mockReorderSteps(...args),
  reorderSubSteps: (...args: unknown[]) => mockReorderSubSteps(...args),
  // Faithful lightweight stand-ins for the pure query helpers.
  groupStepsByParent: (rows: StepRow[]) => {
    const rootIds = new Set(
      rows.filter((r) => r.parentStepId == null).map((r) => r.id),
    );
    const nodes = new Map(
      rows.map((r) => [r.id, { ...r, children: [] as StepRow[] }]),
    );
    const roots: (StepRow & { children: StepRow[] })[] = [];
    for (const row of rows) {
      const node = nodes.get(row.id)!;
      const parentId = row.parentStepId;
      if (parentId != null && rootIds.has(parentId)) {
        nodes.get(parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  },
  resolveStepDependencyBand: (
    step: StepRow,
    goalSteps: StepRow[],
    now: Date,
  ) => ({
    // Self-references are invalid and resolve to null, same as the real helper.
    afterStepTitle:
      step.afterStepId && step.afterStepId !== step.id
        ? ((goalSteps.find((s) => s.id === step.afterStepId)?.title as
            | string
            | undefined) ?? null)
        : null,
    waitingOnLabel: step.waitingOnLabel ?? null,
    waitingOnExpectedAt: step.waitingOnExpectedAt ?? null,
    dueAt: step.dueAt ?? null,
    // Strict <, same boundary as the real helper (#571 D4). The row type here is
    // index-signature loose, so the ISO string needs narrowing.
    waitingOnExpectedIsPast:
      typeof step.waitingOnExpectedAt === "string" &&
      new Date(step.waitingOnExpectedAt).getTime() < now.getTime(),
  }),
}));

const mockUseQuery = jest.fn();
jest.mock("@evolu/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  EvoluProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// --- Helpers ---

const GOAL = {
  id: "goal-1",
  title: "Learn TypeScript",
  description: "Master the type system",
  status: "active",
};

const STEPS = [
  { id: "step-1", title: "Read docs", status: "pending", ordinal: 0 },
  { id: "step-2", title: "Practice", status: "completed", ordinal: 1 },
  { id: "step-3", title: "Build project", status: "pending", ordinal: 2 },
];

const SINGLE_STEP = [
  { id: "step-1", title: "Only step", status: "pending", ordinal: 0 },
];

// Two parents, each with one child. Child ordinals are deliberately higher
// than every root ordinal so a goal-wide (un-scoped) max would pick the wrong
// next ordinal — letting the tests distinguish sibling-scoped from goal-wide.
const STEPS_TREE = [
  { id: "p1", title: "Parent one", status: "pending", ordinal: 0 },
  {
    id: "p1c1",
    title: "P1 child",
    status: "pending",
    ordinal: 0,
    parentStepId: "p1",
  },
  { id: "p2", title: "Parent two", status: "pending", ordinal: 1 },
  {
    id: "p2c1",
    title: "P2 child",
    status: "pending",
    ordinal: 7,
    parentStepId: "p2",
  },
];

function makeRouteProps() {
  return {
    route: {
      key: "EditMode-1",
      name: "EditMode" as const,
      params: { goalId: "goal-1" },
    },
    navigation: {} as any,
  };
}

function setupQueries(goal: object | null = GOAL, steps: object[] = STEPS) {
  mockUseQuery.mockImplementation((query: unknown) => {
    if (query === "goalsQuery") {
      return goal ? [goal] : [];
    }
    return steps;
  });
}

// --- Tests ---

describe("EditModeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseQuery.mockReturnValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("rendering", () => {
    it("renders goal title in EditGoalView's title card", () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      expect(screen.getByTestId("edit-goal-title-input").props.value).toBe(
        "Learn TypeScript",
      );
    });

    it("renders goal description in the description input", () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      expect(
        screen.getByTestId("edit-goal-description-input").props.value,
      ).toBe("Master the type system");
    });

    it("renders step titles", () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      expect(screen.getByText("Read docs")).toBeOnTheScreen();
      expect(screen.getByText("Practice")).toBeOnTheScreen();
      expect(screen.getByText("Build project")).toBeOnTheScreen();
    });

    it("renders sub-steps nested under their parent, not as top-level steps", () => {
      setupQueries(GOAL, STEPS_TREE);
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

      expect(screen.getByText("P1 child")).toBeOnTheScreen();
      // Only the two roots count toward the "Steps" header.
      expect(
        screen.getByText(i18n.t("editGoal:stepList.count", { count: 2 })),
      ).toBeOnTheScreen();
    });

    it("renders step count", () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      expect(
        screen.getByText(i18n.t("editGoal:stepList.count", { count: 3 })),
      ).toBeOnTheScreen();
    });

    it('renders the "Done" footer button', () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      expect(screen.getByTestId("edit-goal-done-button")).toBeOnTheScreen();
    });

    it('shows "Goal not found." when goal does not exist', () => {
      setupQueries(null, []);
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      expect(
        screen.getByText(i18n.t("editGoal:errors.goalNotFound")),
      ).toBeOnTheScreen();
    });

    it("renders a single Edit Goal header (EditGoalView is the screen host)", () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      expect(screen.getAllByText(i18n.t("editGoal:title"))).toHaveLength(1);
    });
  });

  describe("interactions", () => {
    it("updates title input on change and debounces mutation", async () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      const titleInput = screen.getByTestId("edit-goal-title-input");
      fireEvent.changeText(titleInput, "Updated Title");
      expect(titleInput.props.value).toBe("Updated Title");

      expect(mockUpdateGoal).not.toHaveBeenCalled();

      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      expect(mockUpdateGoal).toHaveBeenCalledWith("goal-1", {
        title: "Updated Title",
      });
    });

    it("alerts and skips the write when the title is cleared", async () => {
      setupQueries();
      const alertSpy = jest.spyOn(Alert, "alert");
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      fireEvent.changeText(screen.getByTestId("edit-goal-title-input"), "   ");

      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      expect(alertSpy).toHaveBeenCalledWith(
        i18n.t("editGoal:errors.alertErrorTitle"),
        i18n.t("editGoal:errors.titleRequired"),
      );
      expect(mockUpdateGoal).not.toHaveBeenCalled();
    });

    it("updates description input on change and debounces mutation", async () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      fireEvent.changeText(
        screen.getByTestId("edit-goal-description-input"),
        "New description",
      );

      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      expect(mockUpdateGoal).toHaveBeenCalledWith("goal-1", {
        description: "New description",
      });
    });

    // D4: the editor's add-step flow has no evidence-types input, so no
    // plannedEvidenceTypes argument is written — the read path resolves the
    // unset column to the default plan instead.
    it("calls createStep without a planned-evidence argument", () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      fireEvent.changeText(
        screen.getByTestId("edit-goal-add-step-input"),
        "New step",
      );
      fireEvent.press(screen.getByTestId("edit-goal-add-step-button"));
      expect(mockCreateStep).toHaveBeenCalledWith("goal-1", "New step", 3);
    });

    it("calls updateStep with the title only when a step is renamed inline", () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

      fireEvent.press(screen.getByTestId("edit-goal-step-title-step-1"));
      const input = screen.getByTestId("edit-goal-step-edit-step-1");
      fireEvent.changeText(input, "Read the docs");
      fireEvent(input, "submitEditing");

      expect(mockUpdateStep).toHaveBeenCalledWith("step-1", {
        title: "Read the docs",
      });
    });

    it("calls updateStep with planned evidence only when the picker toggles a type", () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

      fireEvent.press(screen.getByTestId("edit-goal-step-evidence-step-1"));
      fireEvent.press(screen.getByLabelText("Photo"));

      expect(mockUpdateStep).toHaveBeenCalledWith("step-1", {
        plannedEvidenceTypes: ["text", "photo"],
      });
    });

    it("navigates to FocusMode when Done is pressed", () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      fireEvent.press(screen.getByTestId("edit-goal-done-button"));
      expect(mockNavigate).toHaveBeenCalledWith("FocusMode", {
        goalId: "goal-1",
      });
    });

    it("navigates back when the back button is pressed", () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      fireEvent.press(screen.getByLabelText("Go back"));
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe("step deletion", () => {
    it("calls deleteStep only after the confirm modal is confirmed", () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

      fireEvent.press(screen.getByTestId("edit-goal-step-delete-step-1"));
      expect(mockDeleteStep).not.toHaveBeenCalled();

      fireEvent.press(
        screen.getByRole("button", { name: i18n.t("common:actions.delete") }),
      );
      expect(mockDeleteStep).toHaveBeenCalledWith("step-1");
    });

    it("deletes a sub-step through the same mutation", () => {
      setupQueries(GOAL, STEPS_TREE);
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

      fireEvent.press(screen.getByTestId("edit-goal-substep-delete-p1c1"));
      fireEvent.press(
        screen.getByRole("button", { name: i18n.t("common:actions.delete") }),
      );
      expect(mockDeleteStep).toHaveBeenCalledWith("p1c1");
    });

    // D9 drops the old "can't delete the goal's last step" guard: a goal with
    // zero steps is a supported state across the redesign, not an error.
    it("offers delete even when the goal has a single step", () => {
      setupQueries(GOAL, SINGLE_STEP);
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

      fireEvent.press(screen.getByTestId("edit-goal-step-delete-step-1"));
      fireEvent.press(
        screen.getByRole("button", { name: i18n.t("common:actions.delete") }),
      );
      expect(mockDeleteStep).toHaveBeenCalledWith("step-1");
    });
  });

  describe("date/dependency chips", () => {
    // One chip per tone, built from whatever columns the step carries. The
    // resolver output is the same one Timeline and Focus read (#454).
    it.each([
      {
        tone: "after",
        row: { afterStepId: "step-2" },
        expected: () =>
          i18n.t("editGoal:stepList.dateDepChips.after", { title: "Practice" }),
      },
      {
        tone: "waiting",
        row: { waitingOnLabel: "Alex" },
        expected: () =>
          i18n.t("editGoal:stepList.dateDepChips.waitingOn", { who: "Alex" }),
      },
      {
        tone: "due",
        row: { dueAt: "2026-03-06T00:00:00.000Z" },
        expected: () =>
          i18n.t("editGoal:stepList.dateDepChips.due", {
            date: "Mar 6, 2026",
          }),
      },
    ])(
      "renders the $tone chip on a step that carries it",
      ({ row, expected }) => {
        setupQueries(GOAL, [{ ...STEPS[0], ...row }, STEPS[1]]);
        renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
        expect(screen.getByText(expected())).toBeOnTheScreen();
      },
    );

    // The screen reads the real clock, so these two dates are far enough either
    // side of it that the assertion can't drift with the calendar (#571). Local
    // noon, no trailing Z: formatDate goes through toLocaleDateString, so a
    // UTC-midnight ISO would format as the previous day west of Greenwich and
    // the expected literals below would fail on a US runner.
    //
    // Asserted as English literals, not via i18n.t with the key the component
    // itself calls: that would pass against any copy at all, including copy
    // that dropped "waiting on" or "expected" and left the chip unable to say
    // what its date is. The literals are the contract.
    it.each([
      {
        tense: "past",
        waitingOnExpectedAt: "2020-03-06T12:00:00",
        text: "waiting on Alex · was expected Mar 6, 2020",
        gone: /· expected/,
      },
      {
        tense: "future",
        waitingOnExpectedAt: "2099-03-06T12:00:00",
        text: "waiting on Alex · expected Mar 6, 2099",
        gone: /was expected/,
      },
    ])(
      "reads a $tense expected date with the matching tense",
      ({ waitingOnExpectedAt, text, gone }) => {
        setupQueries(GOAL, [
          { ...STEPS[0], waitingOnLabel: "Alex", waitingOnExpectedAt },
          STEPS[1],
        ]);
        renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

        expect(screen.getByText(text)).toBeOnTheScreen();
        expect(screen.queryByText(gone)).toBeNull();
        // Tone stays "waiting" either side of the date (ADR-0012): a passed
        // date gets no tone of its own, so the chip keeps the waiting glyph
        // rather than picking up the "due" one. The glyph is decorative —
        // accessibilityElementsHidden — hence includeHiddenElements on both
        // queries, so the negative one isn't vacuously true.
        const hidden = { includeHiddenElements: true };
        expect(screen.getByText("⏳", hidden)).toBeOnTheScreen();
        expect(screen.queryByText("▦", hidden)).toBeNull();
      },
    );

    it("prefers the waiting-on chip over after when both columns are set", () => {
      setupQueries(GOAL, [
        { ...STEPS[0], afterStepId: "step-2", waitingOnLabel: "Alex" },
        STEPS[1],
      ]);
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

      expect(
        screen.getByText(
          i18n.t("editGoal:stepList.dateDepChips.waitingOn", { who: "Alex" }),
        ),
      ).toBeOnTheScreen();
      expect(
        screen.queryByText(
          i18n.t("editGoal:stepList.dateDepChips.after", { title: "Practice" }),
        ),
      ).toBeNull();
    });

    // The chip row has no testID of its own, so absence is asserted through the
    // per-tone glyphs EditGoalStepRow renders inside it — never a placeholder
    // like "no due date" (ND rule: show what's there, not what's absent).
    it("renders no chip row at all when a step carries no band data", () => {
      setupQueries(GOAL, [
        { ...STEPS[0], dueAt: "2026-03-06T00:00:00.000Z" },
        STEPS[1],
      ]);
      const withBand = renderWithProviders(
        <EditModeScreen {...makeRouteProps()} />,
      );
      // The glyphs are hidden from the a11y tree (the chip text carries the
      // meaning), so they only surface with includeHiddenElements.
      expect(
        screen.getByText("▦", { includeHiddenElements: true }),
      ).toBeOnTheScreen();
      withBand.unmount();

      setupQueries(GOAL, STEPS);
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      for (const glyph of ["↩", "⏳", "▦"]) {
        expect(
          screen.queryByText(glyph, { includeHiddenElements: true }),
        ).toBeNull();
      }
    });

    // #575 gave EditGoalSubStep its own dateDepChips/isCompleted; until #576
    // the mapper left both unset, so a sub-step's band never rendered at all.
    it.each([
      {
        tone: "after",
        row: { afterStepId: "p2" },
        expected: () =>
          i18n.t("editGoal:stepList.dateDepChips.after", {
            title: "Parent two",
          }),
      },
      {
        tone: "waiting",
        row: { waitingOnLabel: "Alex" },
        expected: () =>
          i18n.t("editGoal:stepList.dateDepChips.waitingOn", { who: "Alex" }),
      },
      {
        tone: "due",
        row: { dueAt: "2026-03-06T12:00:00" },
        expected: () =>
          i18n.t("editGoal:stepList.dateDepChips.due", {
            date: "Mar 6, 2026",
          }),
      },
    ])(
      "renders the $tone chip on a sub-step that carries it",
      ({ row, expected }) => {
        setupQueries(GOAL, [
          STEPS_TREE[0],
          { ...STEPS_TREE[1], ...row },
          STEPS_TREE[2],
        ]);
        renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
        expect(screen.getByText(expected())).toBeOnTheScreen();
      },
    );

    // A finished row has nothing left to plan, so it carries no placeholder.
    // Before #576 every row read as not-completed and a done step still
    // prompted for a date it would never get.
    it("drops the unset prompt on a completed step but keeps set timing", () => {
      setupQueries(GOAL, [
        STEPS[0],
        { ...STEPS[1], dueAt: "2026-03-06T12:00:00" },
        { ...STEPS[2], status: "completed" },
      ]);
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

      // step-2 is completed *and* dated — the date still shows.
      expect(
        screen.getByText(
          i18n.t("editGoal:stepList.dateDepChips.due", { date: "Mar 6, 2026" }),
        ),
      ).toBeOnTheScreen();
      // step-3 is completed with nothing set — no prompt, no line.
      expect(screen.queryByTestId("edit-goal-step-timing-step-3")).toBeNull();
      // step-1 is pending with nothing set — it still offers the prompt.
      expect(
        screen.getByTestId("edit-goal-step-timing-step-1"),
      ).toBeOnTheScreen();
    });
  });

  // The banner pointed at a "full planner" that never existed; timing is
  // authored in the row now (#576). Asserted on the English string rather than
  // the retired key, which `i18n.t` would echo back verbatim.
  describe("retired dates/deps banner", () => {
    it("shows no dates-and-dependencies info banner", () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      expect(
        screen.queryByText(/dates and dependencies live on each step/i),
      ).toBeNull();
      expect(screen.queryByText(/full planner/i)).toBeNull();
    });
  });

  // --- In-row timing editor (#576) ---
  //
  // The screen reads the real clock, so the month grid would otherwise show
  // whatever month the suite runs in and no fixed day testID would exist.
  // Fake timers (already on) plus a pinned instant make June 2026 the open
  // month, which is the prototype's own pinned week.
  describe("in-row timing editor", () => {
    const NOW = new Date(2026, 5, 24);
    /** Local midnight on the day pressed below — what a DateIso write holds. */
    const DAY_30_ISO = new Date(2026, 5, 30).toISOString();

    const timingLine = (id: string) => `edit-goal-step-timing-${id}`;
    const editor = (id: string) => `${timingLine(id)}-editor`;
    const option = (id: string, candidateId: string) =>
      `${timingLine(id)}-depends-on-option-${candidateId}`;

    function expand(id: string) {
      fireEvent.press(screen.getByTestId(timingLine(id)));
    }

    function openPicker(id: string) {
      fireEvent.press(
        screen.getByTestId(`${timingLine(id)}-depends-on-toggle`),
      );
    }

    beforeEach(() => {
      jest.setSystemTime(NOW);
    });

    it("expands the editor in place of the tapped row's timing line", () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

      expect(screen.queryByTestId(editor("step-1"))).toBeNull();
      expand("step-1");

      expect(screen.getByTestId(editor("step-1"))).toBeOnTheScreen();
      // One row at a time: tapping step-1 must not open step-3's editor.
      expect(screen.queryByTestId(editor("step-3"))).toBeNull();
    });

    it("collapses again when the expanded row's line is tapped", () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

      expand("step-1");
      // Expanded, the row's prefix is the editor root and the pressable moves
      // to `-timing-line`.
      fireEvent.press(
        screen.getByTestId(`${timingLine("step-1")}-timing-line`),
      );

      expect(screen.queryByTestId(editor("step-1"))).toBeNull();
      expect(mockUpdateStep).not.toHaveBeenCalled();
    });

    describe("depends-on candidates", () => {
      it("offers every other step and omits the step itself", () => {
        setupQueries();
        renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

        expand("step-1");
        openPicker("step-1");

        expect(
          screen.getByTestId(option("step-1", "step-2")),
        ).toBeOnTheScreen();
        expect(
          screen.getByTestId(option("step-1", "step-3")),
        ).toBeOnTheScreen();
        expect(screen.queryByTestId(option("step-1", "step-1"))).toBeNull();
      });

      // Quietly absent, not disabled with a refusal: guards inform (ADR-0010).
      it("omits a step that already points at this one", () => {
        setupQueries(GOAL, [
          STEPS[0],
          { ...STEPS[1], afterStepId: "step-1" },
          STEPS[2],
        ]);
        renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

        expand("step-1");
        openPicker("step-1");

        expect(screen.queryByTestId(option("step-1", "step-2"))).toBeNull();
        expect(
          screen.getByTestId(option("step-1", "step-3")),
        ).toBeOnTheScreen();
      });

      it("offers sub-steps and other parents' children alike", () => {
        setupQueries(GOAL, STEPS_TREE);
        renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

        expand("p1");
        openPicker("p1");

        for (const candidate of ["p1c1", "p2", "p2c1"]) {
          expect(screen.getByTestId(option("p1", candidate))).toBeOnTheScreen();
        }
        expect(screen.queryByTestId(option("p1", "p1"))).toBeNull();
      });

      // Sub-step letters run goal-wide so no two badges in one goal collide —
      // they are also the marks on the shared month grid.
      it("labels roots 1..n and sub-steps a..n across the whole goal", () => {
        setupQueries(GOAL, STEPS_TREE);
        renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

        expand("p1");
        openPicker("p1");

        const ordinalOf = (candidateId: string) =>
          within(screen.getByTestId(option("p1", candidateId))).getByText(
            /^[0-9a-z]+$/,
          ).props.children;
        expect(ordinalOf("p1c1")).toBe("a");
        expect(ordinalOf("p2")).toBe("2");
        expect(ordinalOf("p2c1")).toBe("b");
      });

      it("says so plainly when a goal's only step has nothing to depend on", () => {
        setupQueries(GOAL, SINGLE_STEP);
        renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

        expand("step-1");
        openPicker("step-1");

        expect(
          screen.getByText(i18n.t("editGoal:editor.timing.noCandidates")),
        ).toBeOnTheScreen();
      });
    });

    describe("writes", () => {
      it("writes the picked day as a local-midnight DateIso and collapses", () => {
        setupQueries();
        renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

        expand("step-1");
        fireEvent.press(
          screen.getByTestId(`${timingLine("step-1")}-grid-day-2026-06-30`),
        );
        fireEvent.press(screen.getByTestId(`${timingLine("step-1")}-done`));

        // Only the field that moved. No waiting columns (dating a step must
        // not wipe a wait another surface recorded) and no `afterStepId`
        // either, which would be a write the user never asked for.
        expect(mockUpdateStep).toHaveBeenCalledWith("step-1", {
          dueAt: DAY_30_ISO,
        });
        expect(screen.queryByTestId(editor("step-1"))).toBeNull();
      });

      it("clears the external wait when a dependency is set", () => {
        setupQueries();
        renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

        expand("step-1");
        openPicker("step-1");
        fireEvent.press(screen.getByTestId(option("step-1", "step-2")));
        fireEvent.press(screen.getByTestId(`${timingLine("step-1")}-done`));

        expect(mockUpdateStep).toHaveBeenCalledWith("step-1", {
          afterStepId: "step-2",
          waitingOnLabel: null,
          waitingOnExpectedAt: null,
        });
      });

      it("nulls all four columns on Clear", () => {
        setupQueries(GOAL, [
          { ...STEPS[0], afterStepId: "step-2", dueAt: "2026-06-30T12:00:00" },
          STEPS[1],
          STEPS[2],
        ]);
        renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

        expand("step-1");
        fireEvent.press(screen.getByTestId(`${timingLine("step-1")}-clear`));

        expect(mockUpdateStep).toHaveBeenCalledWith("step-1", {
          dueAt: null,
          afterStepId: null,
          waitingOnLabel: null,
          waitingOnExpectedAt: null,
        });
        expect(screen.queryByTestId(editor("step-1"))).toBeNull();
      });

      it("writes nothing when Done is pressed on an untouched draft", () => {
        setupQueries();
        renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

        expand("step-1");
        fireEvent.press(screen.getByTestId(`${timingLine("step-1")}-done`));

        expect(mockUpdateStep).not.toHaveBeenCalled();
        expect(screen.queryByTestId(editor("step-1"))).toBeNull();
      });

      // The editor commits a diff against the draft it opened with, so a field
      // it never showed cannot be cleared by a commit that never touched it.
      // Both fixtures below hide step-1's dependency from step-1's own picker:
      // a mutual cycle (step-2 is omitted as the cycle's far side) and a
      // dangling target (step-9 does not exist).
      it.each([
        {
          shape: "the far side of a mutual two-step cycle",
          rows: () => [
            { ...STEPS[0], afterStepId: "step-2" },
            { ...STEPS[1], afterStepId: "step-1" },
            STEPS[2],
          ],
        },
        {
          shape: "a dangling dependency",
          rows: () => [{ ...STEPS[0], afterStepId: "step-9" }, STEPS[1]],
        },
      ])("dating a step leaves $shape alone", ({ rows }) => {
        setupQueries(GOAL, rows());
        renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

        expand("step-1");
        fireEvent.press(
          screen.getByTestId(`${timingLine("step-1")}-grid-day-2026-06-30`),
        );
        fireEvent.press(screen.getByTestId(`${timingLine("step-1")}-done`));

        expect(mockUpdateStep).toHaveBeenCalledWith("step-1", {
          dueAt: DAY_30_ISO,
        });
      });

      it("clears the dependency when the user picks nothing", () => {
        setupQueries(GOAL, [
          { ...STEPS[0], afterStepId: "step-2" },
          STEPS[1],
          STEPS[2],
        ]);
        renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

        expand("step-1");
        openPicker("step-1");
        fireEvent.press(
          screen.getByTestId(
            `${timingLine("step-1")}-depends-on-option-nothing`,
          ),
        );
        fireEvent.press(screen.getByTestId(`${timingLine("step-1")}-done`));

        // Asked for, so written — and the waiting columns stay untouched,
        // since nothing is being set that could contradict a wait.
        expect(mockUpdateStep).toHaveBeenCalledWith("step-1", {
          afterStepId: null,
        });
      });

      it("writes a sub-step's timing through the same mutation", () => {
        setupQueries(GOAL, STEPS_TREE);
        renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

        fireEvent.press(screen.getByTestId("edit-goal-substep-timing-p1c1"));
        fireEvent.press(
          screen.getByTestId(
            "edit-goal-substep-timing-p1c1-grid-day-2026-06-30",
          ),
        );
        fireEvent.press(
          screen.getByTestId("edit-goal-substep-timing-p1c1-done"),
        );

        expect(mockUpdateStep).toHaveBeenCalledWith("p1c1", {
          dueAt: DAY_30_ISO,
        });
      });

      // Both of Evolu's failure modes. A rejected write must not cost the user
      // the draft they were looking at.
      //
      // `...Once`, not the sticky variants: jest.clearAllMocks() resets calls
      // but keeps implementations, so a sticky throw here would leak into every
      // later test in this file.
      it.each([
        {
          mode: "a rejected Result",
          arrange: () =>
            mockUpdateStep.mockReturnValueOnce({
              ok: false,
              error: { type: "WriteFailed" },
            }),
        },
        {
          mode: "a thrown error",
          arrange: () =>
            mockUpdateStep.mockImplementationOnce(() => {
              throw new Error("boom");
            }),
        },
      ])("alerts and keeps the editor open on %s", ({ arrange }) => {
        setupQueries();
        arrange();
        const alertSpy = jest.spyOn(Alert, "alert");
        renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

        expand("step-1");
        fireEvent.press(
          screen.getByTestId(`${timingLine("step-1")}-grid-day-2026-06-30`),
        );
        fireEvent.press(screen.getByTestId(`${timingLine("step-1")}-done`));

        expect(alertSpy).toHaveBeenCalledWith(
          i18n.t("editGoal:errors.alertErrorTitle"),
          i18n.t("editGoal:errors.updateStepMessage"),
        );
        // Still open, and the draft day is still selected.
        expect(screen.getByTestId(editor("step-1"))).toBeOnTheScreen();
        expect(
          screen.getByTestId(`${timingLine("step-1")}-grid-day-2026-06-30`)
            .props.accessibilityState.selected,
        ).toBe(true);
      });

      // The veto is consumed exactly once — a failed write must not leave the
      // row permanently un-collapsible.
      it("collapses on the next attempt after a failed write", () => {
        setupQueries();
        mockUpdateStep.mockReturnValueOnce({
          ok: false,
          error: { type: "WriteFailed" },
        });
        jest.spyOn(Alert, "alert");
        renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

        expand("step-1");
        // An untouched draft writes nothing at all, so the day has to move for
        // there to be a write to reject.
        fireEvent.press(
          screen.getByTestId(`${timingLine("step-1")}-grid-day-2026-06-30`),
        );
        fireEvent.press(screen.getByTestId(`${timingLine("step-1")}-done`));
        expect(screen.getByTestId(editor("step-1"))).toBeOnTheScreen();

        fireEvent.press(screen.getByTestId(`${timingLine("step-1")}-done`));
        expect(screen.queryByTestId(editor("step-1"))).toBeNull();
      });
    });

    // The editor never authors "waiting on" (#573) — but the row it replaces
    // must keep displaying one, and a wait must survive being looked at.
    it("shows a waiting-on row's chip when collapsed and no wait control inside", () => {
      setupQueries(GOAL, [
        { ...STEPS[0], waitingOnLabel: "Alex" },
        STEPS[1],
        STEPS[2],
      ]);
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

      const chip = i18n.t("editGoal:stepList.dateDepChips.waitingOn", {
        who: "Alex",
      });
      expect(screen.getByText(chip)).toBeOnTheScreen();

      expand("step-1");
      expect(screen.queryByText(chip)).toBeNull();
      expect(screen.queryByText(/waiting on/i)).toBeNull();
    });
  });

  describe("sub-step ordinal scoping", () => {
    it("creates a sub-step with an ordinal scoped to its parent's children", () => {
      setupQueries(GOAL, STEPS_TREE);
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

      fireEvent.press(screen.getByTestId("edit-goal-add-substep-p1"));

      // p1's only child has ordinal 0, so the next sibling ordinal is 1 —
      // NOT 8 (which a goal-wide max over p2c1's ordinal 7 would yield).
      expect(mockCreateSubStep).toHaveBeenCalledWith(
        "goal-1",
        "p1",
        i18n.t("editGoal:editor.newSubStepTitle"),
        1,
      );
    });

    it("creates a top-level step with an ordinal scoped to root steps only", () => {
      setupQueries(GOAL, STEPS_TREE);
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

      fireEvent.changeText(
        screen.getByTestId("edit-goal-add-step-input"),
        "New root",
      );
      fireEvent.press(screen.getByTestId("edit-goal-add-step-button"));

      // Roots are ordinals 0 and 1, so the next root ordinal is 2 — NOT 8
      // (a goal-wide max would inherit the child's ordinal 7).
      expect(mockCreateStep).toHaveBeenCalledWith("goal-1", "New root", 2);
    });
  });

  describe("error handling", () => {
    it("shows alert when createStep fails", () => {
      setupQueries();
      mockCreateStep.mockImplementation(() => {
        throw new Error("fail");
      });
      const alertSpy = jest.spyOn(Alert, "alert");

      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      fireEvent.changeText(
        screen.getByTestId("edit-goal-add-step-input"),
        "Bad step",
      );
      fireEvent.press(screen.getByTestId("edit-goal-add-step-button"));

      expect(alertSpy).toHaveBeenCalledWith(
        i18n.t("editGoal:errors.alertErrorTitle"),
        i18n.t("editGoal:errors.createStepMessage"),
      );
    });

    it("shows alert when createStep returns { ok: false }", () => {
      setupQueries();
      mockCreateStep.mockReturnValue({
        ok: false,
        error: { type: "WriteError" },
      });
      const alertSpy = jest.spyOn(Alert, "alert");

      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      fireEvent.changeText(
        screen.getByTestId("edit-goal-add-step-input"),
        "Bad step",
      );
      fireEvent.press(screen.getByTestId("edit-goal-add-step-button"));

      expect(alertSpy).toHaveBeenCalledWith(
        i18n.t("editGoal:errors.alertErrorTitle"),
        i18n.t("editGoal:errors.createStepMessage"),
      );
    });

    // Evolu reports write failures via { ok: false } WITHOUT throwing, so the
    // ok:false path must surface the same feedback as the thrown path — a
    // discarded Result would let the failure vanish silently.
    it.each([
      [
        "throws",
        () =>
          mockUpdateGoal.mockImplementation(() => {
            throw new Error("fail");
          }),
      ],
      [
        "returns { ok: false }",
        () =>
          mockUpdateGoal.mockReturnValue({
            ok: false,
            error: { type: "WriteError" },
          }),
      ],
    ])("shows alert when updateGoal title %s", async (_desc, arm) => {
      setupQueries();
      arm();
      const alertSpy = jest.spyOn(Alert, "alert");

      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      fireEvent.changeText(
        screen.getByTestId("edit-goal-title-input"),
        "Valid Title",
      );

      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      expect(alertSpy).toHaveBeenCalledWith(
        i18n.t("editGoal:errors.alertErrorTitle"),
        i18n.t("editGoal:errors.updateTitleFailed"),
      );
    });

    // Description saves fire-and-forget on a debounce; a rejected write must
    // still surface an alert. Both failure modes must converge on the same
    // feedback — mirrors the title-update coverage above.
    it.each([
      [
        "throws",
        () =>
          mockUpdateGoal.mockImplementation(() => {
            throw new Error("fail");
          }),
      ],
      [
        "returns { ok: false }",
        () =>
          mockUpdateGoal.mockReturnValue({
            ok: false,
            error: { type: "WriteError" },
          }),
      ],
    ])("shows alert when updateGoal description %s", async (_desc, arm) => {
      setupQueries();
      arm();
      const alertSpy = jest.spyOn(Alert, "alert");

      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      fireEvent.changeText(
        screen.getByTestId("edit-goal-description-input"),
        "New description",
      );

      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      expect(alertSpy).toHaveBeenCalledWith(
        i18n.t("editGoal:errors.alertErrorTitle"),
        i18n.t("editGoal:errors.updateDescriptionMessage"),
      );
    });
  });

  describe("overflow menu → delete goal", () => {
    function openMenu() {
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      fireEvent.press(screen.getByTestId("edit-goal-overflow-trigger"));
    }

    it("opens the ⋯ popover with Delete goal as its only action", () => {
      setupQueries();
      openMenu();
      expect(screen.getByTestId("edit-goal-overflow-delete")).toBeOnTheScreen();
    });

    it("closes the popover without deleting when Cancel is pressed", () => {
      setupQueries();
      openMenu();
      fireEvent.press(
        screen.getByRole("button", { name: i18n.t("common:actions.cancel") }),
      );

      expect(screen.queryByTestId("edit-goal-overflow-delete")).toBeNull();
      expect(mockDeleteGoal).not.toHaveBeenCalled();
    });

    it("routes Delete goal through the confirm modal before mutating", () => {
      setupQueries();
      openMenu();
      fireEvent.press(screen.getByTestId("edit-goal-overflow-delete"));

      expect(mockDeleteGoal).not.toHaveBeenCalled();
      expect(
        screen.getByText(i18n.t("editGoal:confirmDelete.title")),
      ).toBeOnTheScreen();
    });
  });

  describe("delete goal (destructive navigation guard)", () => {
    function openDeleteConfirm() {
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);
      fireEvent.press(screen.getByTestId("edit-goal-overflow-trigger"));
      fireEvent.press(screen.getByTestId("edit-goal-overflow-delete"));
    }

    it("navigates to Goals and closes the modal only after a successful delete", () => {
      setupQueries();
      openDeleteConfirm();
      fireEvent.press(screen.getByRole("button", { name: "Delete" }));

      expect(mockDeleteGoal).toHaveBeenCalledWith("goal-1");
      expect(mockNavigate).toHaveBeenCalledWith("Goals");
      // Modal is dismissed on success — its confirm button is gone.
      expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
    });

    // Both failure modes must keep the user on the Edit screen with the modal
    // open — the pre-fix bug closed the modal and navigated away regardless.
    it.each([
      {
        label: "{ ok: false }",
        arm: () =>
          mockDeleteGoal.mockReturnValue({
            ok: false,
            error: { type: "WriteError" },
          }),
      },
      {
        label: "thrown error",
        arm: () =>
          mockDeleteGoal.mockImplementation(() => {
            throw new Error("Failed to delete goal. Please try again.");
          }),
      },
    ])(
      "keeps the modal open and does not navigate when delete fails ($label)",
      ({ arm }) => {
        setupQueries();
        arm();
        const alertSpy = jest.spyOn(Alert, "alert");
        openDeleteConfirm();

        fireEvent.press(screen.getByRole("button", { name: "Delete" }));

        expect(mockNavigate).not.toHaveBeenCalled();
        expect(alertSpy).toHaveBeenCalledWith(
          i18n.t("editGoal:errors.deleteGoalTitle"),
          i18n.t("editGoal:errors.deleteGoalMessage"),
        );
        // Modal stays open: its confirm button is still on screen.
        expect(
          screen.getByRole("button", { name: "Delete" }),
        ).toBeOnTheScreen();
      },
    );
  });

  describe("reparent wiring (#330)", () => {
    // animationPref is mocked to "none" file-wide, so the editor renders its
    // accessible reorder / nest / un-nest controls — the reachable entry point
    // for exercising the reparent handlers without a live drag gesture.

    // Two children under one parent so a sibling swap is observable. Child
    // ordinals deliberately differ so a correct sibling-scoped reorder is the
    // only way to produce the expected id order.
    const TREE_TWO_CHILDREN = [
      { id: "p1", title: "Parent one", status: "pending", ordinal: 0 },
      {
        id: "p1c1",
        title: "Child A",
        status: "pending",
        ordinal: 0,
        parentStepId: "p1",
      },
      {
        id: "p1c2",
        title: "Child B",
        status: "pending",
        ordinal: 1,
        parentStepId: "p1",
      },
      { id: "p2", title: "Parent two", status: "pending", ordinal: 1 },
    ];

    // A leaf root ("lr") alongside a parent whose only child carries ordinal 3.
    // lr's root ordinal (9) is deliberately HIGHER than every child ordinal so
    // the demote "append to end" ordinal discriminates scope: child-scoped over
    // p1's children {3} → 4, whereas a goal-wide max {0,3,9} would give 10. A
    // correct sibling-scoped handler must produce 4.
    const TREE_LEAF_ROOT = [
      { id: "p1", title: "Parent one", status: "pending", ordinal: 0 },
      {
        id: "p1c1",
        title: "P1 child",
        status: "pending",
        ordinal: 3,
        parentStepId: "p1",
      },
      { id: "lr", title: "Lone root", status: "pending", ordinal: 9 },
    ];

    it("calls reorderSubSteps with the sibling-scoped order when a child is moved down", () => {
      setupQueries(GOAL, TREE_TWO_CHILDREN);
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

      fireEvent.press(screen.getByTestId("edit-goal-substep-down-p1c1"));

      expect(mockReorderSubSteps).toHaveBeenCalledWith("goal-1", "p1", [
        "p1c2",
        "p1c1",
      ]);
    });

    it("calls reorderSteps with the new root order when a step is moved down", () => {
      setupQueries();
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

      fireEvent.press(screen.getByTestId("edit-goal-step-down-step-1"));

      expect(mockReorderSteps).toHaveBeenCalledWith("goal-1", [
        "step-2",
        "step-1",
        "step-3",
      ]);
    });

    it("promotes a child via updateStep with parentStepId null and a root-scoped ordinal", () => {
      setupQueries(GOAL, STEPS_TREE);
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

      fireEvent.press(screen.getByTestId("edit-goal-substep-un-nest-p1c1"));

      // Roots p1(0)/p2(1) → next root ordinal is 2, NOT the child's old ordinal.
      expect(mockUpdateStep).toHaveBeenCalledWith("p1c1", {
        parentStepId: null,
        ordinal: 2,
      });
    });

    it("demotes a leaf root under a chosen parent with a child-scoped ordinal", () => {
      setupQueries(GOAL, TREE_LEAF_ROOT);
      renderWithProviders(<EditModeScreen {...makeRouteProps()} />);

      fireEvent.press(screen.getByTestId("edit-goal-step-nest-under-lr"));
      fireEvent.press(screen.getByTestId("edit-goal-step-nest-target-lr-p1"));

      // p1's only child has ordinal 3 → next child ordinal is 4.
      expect(mockUpdateStep).toHaveBeenCalledWith("lr", {
        parentStepId: "p1",
        ordinal: 4,
      });
    });
  });
});
