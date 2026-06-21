import React from "react";
import { StyleSheet } from "react-native";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { i18n } from "../../../i18n";
import { evidenceByStepQuery } from "../../../db";
import { FocusModeScreen } from "../FocusModeScreen";

// --- Mocks ---

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual("../../../__tests__/mocks/navigation");
  let navigation: ReturnType<typeof actual.useNavigation> | undefined;
  return {
    ...actual,
    useNavigation: jest.fn(() => {
      navigation ??= {
        ...actual.useNavigation(),
        goBack: mockGoBack,
        navigate: mockNavigate,
      };
      return navigation;
    }),
  };
});

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
}));

// GoalEvidenceCard now renders BadgeRenderer (react-native-svg). jsdom can't
// render SVG, and there's no global RN-SVG mock — so stub the renderer the same
// way BadgeCard.test.tsx and CompletionFlowScreen.test.tsx do.
jest.mock("../../../badges/BadgeRenderer", () => ({
  BadgeRenderer: () => null,
  getRendererLayoutOptions: () => ({ strokeWidth: 3, hasShadow: false }),
}));

jest.mock("../../../utils/haptics", () => ({
  triggerDragStart: jest.fn(),
  triggerDragDrop: jest.fn(),
}));

jest.mock("../../../hooks/useAnimationPref", () => ({
  useAnimationPref: () => ({
    animationPref: "full",
    shouldAnimate: true,
    shouldReduceMotion: false,
    setAnimationPref: jest.fn(),
  }),
}));

const mockUseFlashOnIncrease = jest.fn((_count: number) => ({}));
jest.mock("../../../hooks/useFlashOnIncrease", () => ({
  useFlashOnIncrease: (count: number) => mockUseFlashOnIncrease(count),
}));

const mockCompleteStep = jest.fn();
const mockUncompleteStep = jest.fn();
const mockDeleteEvidence = jest.fn();
const mockCreateEvidence = jest.fn();
const mockCanCompleteStep = jest.fn().mockReturnValue(true);
const mockDeleteEvidenceFile = jest.fn((_uri: string, _type: string) => {});
jest.mock("../../../utils/evidenceCleanup", () => ({
  deleteEvidenceFile: (uri: string, type: string) =>
    mockDeleteEvidenceFile(uri, type),
}));

jest.mock("../../../services/sentry-report", () => ({
  reportError: jest.fn(),
  breadcrumb: jest.fn(),
}));

const mockViewEvidence = jest.fn();
jest.mock("../../../utils/evidenceViewers", () => ({
  useEvidenceViewer: () => ({
    viewEvidence: mockViewEvidence,
    viewerModals: null,
  }),
}));

jest.mock("../../../db", () => ({
  StepStatus: { pending: "pending", completed: "completed" },
  EvidenceType: {
    photo: "photo",
    text: "text",
    voice_memo: "voice_memo",
    video: "video",
    link: "link",
    file: "file",
  },
  TEXT_EVIDENCE_PREFIX: "content:text;",
  goalsQuery: "goalsQuery",
  stepsByGoalQuery: jest.fn((id: string) => `stepsByGoalQuery-${id}`),
  evidenceByGoalQuery: jest.fn((id: string) => `evidenceByGoalQuery-${id}`),
  evidenceByStepQuery: jest.fn((id: string) => `evidenceByStepQuery-${id}`),
  stepEvidenceByGoalQuery: jest.fn(
    (id: string) => `stepEvidenceByGoalQuery-${id}`,
  ),
  userSettingsQuery: "userSettingsQuery",
  completeStep: (...args: unknown[]) => mockCompleteStep(...args),
  uncompleteStep: (...args: unknown[]) => mockUncompleteStep(...args),
  deleteEvidence: (...args: unknown[]) => mockDeleteEvidence(...args),
  createEvidence: (...args: unknown[]) => mockCreateEvidence(...args),
  canCompleteStep: (...args: unknown[]) => mockCanCompleteStep(...args),
  createUserSettings: jest.fn(),
  updateUserSettings: jest.fn(),
  isPendingStep: (s: { status: string | null }) => s.status === "pending",
  findFirstPendingIndex: (rows: { status: string | null }[]) =>
    rows.findIndex((s) => s.status === "pending"),
  // Faithful copies of the real helpers (orphan/grandchild promotion + flatten)
  // so the screen's parent-then-children reordering is exercised, not stubbed.
  groupStepsByParent: (
    rows: readonly { id: string; parentStepId: string | null }[],
  ) => {
    const rootIds = new Set(
      rows.filter((r) => r.parentStepId == null).map((r) => r.id),
    );
    const nodes = new Map(
      rows.map((r) => [r.id, { ...r, children: [] as unknown[] }]),
    );
    const roots: {
      id: string;
      parentStepId: string | null;
      children: unknown[];
    }[] = [];
    for (const row of rows) {
      const node = nodes.get(row.id)!;
      const parentId = row.parentStepId;
      if (parentId != null && rootIds.has(parentId)) {
        (nodes.get(parentId)!.children as unknown[]).push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  },
  flattenGroupedSteps: (grouped: readonly { children: unknown[] }[]) => {
    const out: unknown[] = [];
    for (const root of grouped) {
      out.push(root);
      out.push(...root.children);
    }
    return out;
  },
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
  {
    id: "step-1",
    title: "Read docs",
    status: "pending",
    ordinal: 0,
    plannedEvidenceTypes: null,
  },
  {
    id: "step-2",
    title: "Practice",
    status: "completed",
    ordinal: 1,
    plannedEvidenceTypes: null,
  },
];

const GOAL_EVIDENCE = [
  {
    id: "ev-g1",
    type: "photo",
    uri: "/goal-photo.jpg",
    description: "Goal photo",
  },
];

const STEP_EVIDENCE = [
  {
    id: "ev-s1",
    type: "text",
    uri: "content:text;My notes",
    description: "Step notes",
    stepId: "step-1",
  },
];

const routeProps = {
  route: {
    key: "FocusMode-1",
    name: "FocusMode" as const,
    params: { goalId: "goal-1" },
  },
  navigation: {} as any,
};

function setupQueries({
  goal = GOAL,
  steps = STEPS,
  goalEvidence = GOAL_EVIDENCE,
  stepEvidence = STEP_EVIDENCE,
}: {
  goal?: object | null;
  steps?: object[];
  goalEvidence?: object[];
  stepEvidence?: object[];
} = {}) {
  mockUseQuery.mockImplementation((query: unknown) => {
    if (query === "goalsQuery") return goal ? [goal] : [];
    if (typeof query === "string" && query.startsWith("evidenceByGoalQuery"))
      return goalEvidence;
    if (
      typeof query === "string" &&
      query.startsWith("stepEvidenceByGoalQuery")
    )
      return stepEvidence;
    if (typeof query === "string" && query.startsWith("evidenceByStepQuery"))
      return stepEvidence;
    if (typeof query === "string" && query.startsWith("stepsByGoalQuery"))
      return steps;
    return [];
  });
}

// --- Tests ---

describe("FocusModeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue([]);
    mockCanCompleteStep.mockReturnValue(true);
  });

  it("renders goal title in header", () => {
    setupQueries();
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    expect(screen.getByText("Learn TypeScript")).toBeOnTheScreen();
  });

  it('shows "Goal not found" when goal does not exist', () => {
    setupQueries({ goal: null, steps: [] });
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    expect(
      screen.getByText(i18n.t("focusMode:errors.goalNotFound")),
    ).toBeOnTheScreen();
  });

  it("renders MiniTimeline with step navigation", () => {
    setupQueries();
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    // Labels appear in both MiniTimeline (button) and ProgressDots (tab)
    expect(
      screen.getAllByLabelText("Step 1: in-progress").length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByLabelText("Step 2: completed").length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("renders ProgressDots with step and goal dots", () => {
    setupQueries();
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    // ProgressDots renders tab elements
    expect(
      screen.getByLabelText(i18n.t("common:progressDots.a11y.label")),
    ).toBeOnTheScreen();
    // "Goal evidence" label appears in both MiniTimeline and ProgressDots
    expect(
      screen.getAllByLabelText(i18n.t("common:timeline.a11y.goalEvidence"))
        .length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("renders StepCard for current step", () => {
    setupQueries();
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    expect(
      screen.getByText(
        i18n.t("common:stepCard.progress", { current: 1, total: 2 }),
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("Read docs")).toBeOnTheScreen();
  });

  it("never creates a per-step evidence query while navigating or opening the drawer", () => {
    setupQueries();
    renderWithProviders(<FocusModeScreen {...routeProps} />);

    fireEvent.press(screen.getByLabelText("Next card"));
    fireEvent.press(screen.getByLabelText("Toggle evidence drawer"));

    expect(evidenceByStepQuery).not.toHaveBeenCalled();
  });

  it("only re-renders the outgoing and incoming cards during navigation", () => {
    setupQueries({
      steps: [
        { id: "step-1", title: "Read docs", status: "pending", ordinal: 0 },
        { id: "step-2", title: "Practice", status: "pending", ordinal: 1 },
        { id: "step-3", title: "Build it", status: "pending", ordinal: 2 },
      ],
      stepEvidence: [],
    });
    renderWithProviders(<FocusModeScreen {...routeProps} />);

    mockUseFlashOnIncrease.mockClear();
    fireEvent.press(screen.getByLabelText("Next card"));

    // useFlashOnIncrease runs during each StepCard/GoalEvidenceCard render.
    // Only the two StepCards whose derived status changed should render.
    expect(mockUseFlashOnIncrease).toHaveBeenCalledTimes(2);
  });

  it("advances the carousel to the next pending step after completing one", () => {
    setupQueries({
      steps: [
        {
          id: "step-1",
          title: "Read docs",
          status: "pending",
          ordinal: 0,
          plannedEvidenceTypes: null,
        },
        {
          id: "step-2",
          title: "Practice",
          status: "pending",
          ordinal: 1,
          plannedEvidenceTypes: null,
        },
      ],
      stepEvidence: [],
    });
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    // Lands on step-1 (first pending). Mark it complete.
    expect(
      screen.getByText(
        i18n.t("common:stepCard.progress", { current: 1, total: 2 }),
      ),
    ).toBeOnTheScreen();
    fireEvent.press(
      screen.getByRole("checkbox", {
        name: i18n.t("common:stepCard.checkbox.markComplete"),
      }),
    );
    expect(mockCompleteStep).toHaveBeenCalledWith("step-1", null, []);
    // Carousel should advance to step-2 instead of staying on the completed step.
    expect(
      screen.getByText(
        i18n.t("common:stepCard.progress", { current: 2, total: 2 }),
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("Practice")).toBeOnTheScreen();
  });

  it("auto-snaps the carousel to the first pending step on mount", () => {
    setupQueries({
      steps: [
        { id: "step-1", title: "Read docs", status: "completed", ordinal: 0 },
        { id: "step-2", title: "Practice", status: "completed", ordinal: 1 },
        { id: "step-3", title: "Build it", status: "pending", ordinal: 2 },
      ],
    });
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    // The current step indicator reflects the snapped index, so users land on
    // the first pending step instead of swiping past completed ones.
    expect(
      screen.getByText(
        i18n.t("common:stepCard.progress", { current: 3, total: 3 }),
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("Build it")).toBeOnTheScreen();
  });

  it("does not snap when the first step is already pending", () => {
    setupQueries({
      steps: [
        { id: "step-1", title: "Read docs", status: "pending", ordinal: 0 },
        { id: "step-2", title: "Practice", status: "pending", ordinal: 1 },
      ],
    });
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    expect(
      screen.getByText(
        i18n.t("common:stepCard.progress", { current: 1, total: 2 }),
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("Read docs")).toBeOnTheScreen();
  });

  it("wraps backward to find a pending step earlier than the just-completed one", () => {
    setupQueries({
      steps: [
        { id: "step-1", title: "Read docs", status: "pending", ordinal: 0 },
        { id: "step-2", title: "Practice", status: "completed", ordinal: 1 },
        { id: "step-3", title: "Build it", status: "pending", ordinal: 2 },
      ],
      stepEvidence: [],
    });
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    // Snap puts us on step-1 (first pending). Swipe forward twice to reach
    // step-3 (also pending), bypassing the completed step-2.
    fireEvent.press(screen.getByLabelText("Next card"));
    fireEvent.press(screen.getByLabelText("Next card"));
    expect(
      screen.getByText(
        i18n.t("common:stepCard.progress", { current: 3, total: 3 }),
      ),
    ).toBeOnTheScreen();
    // Complete step-3. Forward search finds nothing pending, so the wrap
    // path must pull the carousel back to step-1.
    fireEvent.press(
      screen.getByRole("checkbox", {
        name: i18n.t("common:stepCard.checkbox.markComplete"),
      }),
    );
    expect(mockCompleteStep).toHaveBeenCalledWith("step-3", null, []);
    expect(
      screen.getByText(
        i18n.t("common:stepCard.progress", { current: 1, total: 3 }),
      ),
    ).toBeOnTheScreen();
  });

  it("does not advance when the last pending step is completed", () => {
    setupQueries({
      steps: [
        { id: "step-1", title: "Read docs", status: "completed", ordinal: 0 },
        { id: "step-2", title: "Practice", status: "pending", ordinal: 1 },
      ],
      stepEvidence: [],
    });
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    // Snap puts us on step-2 (the only pending one).
    expect(
      screen.getByText(
        i18n.t("common:stepCard.progress", { current: 2, total: 2 }),
      ),
    ).toBeOnTheScreen();
    fireEvent.press(
      screen.getByRole("checkbox", {
        name: i18n.t("common:stepCard.checkbox.markComplete"),
      }),
    );
    expect(mockCompleteStep).toHaveBeenCalledWith("step-2", null, []);
    // No other pending steps — carousel stays put. The all-steps-complete
    // effect handles the navigation to CompletionFlow separately.
    expect(
      screen.getByText(
        i18n.t("common:stepCard.progress", { current: 2, total: 2 }),
      ),
    ).toBeOnTheScreen();
  });

  it("closes the evidence drawer when auto-advancing after step completion", () => {
    setupQueries({
      steps: [
        { id: "step-1", title: "Read docs", status: "pending", ordinal: 0 },
        { id: "step-2", title: "Practice", status: "pending", ordinal: 1 },
      ],
      stepEvidence: [
        {
          id: "ev-s1",
          type: "text",
          uri: "/note.txt",
          description: "Step notes",
          stepId: "step-1",
        },
      ],
    });
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    // Open the evidence drawer on step-1. The overlay's `accessible` prop
    // tracks the drawer's open state — true when open, false when closed.
    fireEvent.press(screen.getByLabelText("Toggle evidence drawer"));
    expect(
      screen.getByLabelText("Close evidence drawer").props.accessible,
    ).toBe(true);
    // Complete step-1; advance to step-2 must also close the drawer so the
    // overlay doesn't persist over the next step's content.
    fireEvent.press(
      screen.getByRole("checkbox", {
        name: i18n.t("common:stepCard.checkbox.markComplete"),
      }),
    );
    expect(
      screen.getByText(
        i18n.t("common:stepCard.progress", { current: 2, total: 2 }),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByLabelText("Close evidence drawer").props.accessible,
    ).toBe(false);
  });

  it("keeps the carousel in place and toasts when completeStep throws", () => {
    setupQueries({
      steps: [
        { id: "step-1", title: "Read docs", status: "pending", ordinal: 0 },
        { id: "step-2", title: "Practice", status: "pending", ordinal: 1 },
      ],
      stepEvidence: [],
    });
    mockCompleteStep.mockImplementationOnce(() => {
      throw new Error("DB write failed");
    });
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    expect(
      screen.getByText(
        i18n.t("common:stepCard.progress", { current: 1, total: 2 }),
      ),
    ).toBeOnTheScreen();
    fireEvent.press(
      screen.getByRole("checkbox", {
        name: i18n.t("common:stepCard.checkbox.markComplete"),
      }),
    );
    // Error toast appears, carousel must NOT advance.
    expect(
      screen.getByText(
        i18n.t("focusMode:errors.couldNotUpdateStep", {
          message: "DB write failed",
        }),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        i18n.t("common:stepCard.progress", { current: 1, total: 2 }),
      ),
    ).toBeOnTheScreen();
  });

  it("calls completeStep when step checkbox is toggled", () => {
    setupQueries();
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    fireEvent.press(
      screen.getByRole("checkbox", {
        name: i18n.t("common:stepCard.checkbox.markComplete"),
      }),
    );
    expect(mockCompleteStep).toHaveBeenCalledWith("step-1", null, [
      { type: "text" },
    ]);
  });

  it("calls uncompleteStep when completed step checkbox is toggled", () => {
    setupQueries({
      steps: [
        { id: "step-1", title: "Read docs", status: "completed", ordinal: 0 },
        { id: "step-2", title: "Practice", status: "pending", ordinal: 1 },
      ],
    });
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    // FocusMode auto-snaps to the first pending step (step-2). Swipe back to
    // the completed step so its checkbox is the active card.
    fireEvent.press(screen.getByLabelText("Previous card"));
    // Role query scopes to the checkbox, skipping the StatusBadge that also
    // shows "Completed" — no need to index into a getAllByText list.
    fireEvent.press(
      screen.getByRole("checkbox", {
        name: i18n.t("common:stepCard.checkbox.completed"),
      }),
    );
    expect(mockUncompleteStep).toHaveBeenCalledWith("step-1");
  });

  it("renders FAB button for adding evidence", () => {
    setupQueries();
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    expect(screen.getByLabelText("Add evidence")).toBeOnTheScreen();
  });

  it("opens FABMenu when FAB is pressed", () => {
    setupQueries();
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    fireEvent.press(screen.getByLabelText("Add evidence"));
    expect(screen.getByLabelText("Add evidence menu")).toBeOnTheScreen();
  });

  it("navigates to capture screen when evidence type is selected", () => {
    setupQueries();
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    // Open FAB menu
    fireEvent.press(screen.getByLabelText("Add evidence"));
    // Select Photo
    fireEvent.press(screen.getByLabelText("Photo"));
    expect(mockNavigate).toHaveBeenCalledWith("CapturePhoto", {
      goalId: "goal-1",
      stepId: "step-1",
    });
  });

  it("navigates to capture screen when quick evidence action is pressed", () => {
    setupQueries({
      steps: [
        {
          id: "step-1",
          title: "Read docs",
          status: "pending",
          ordinal: 0,
          plannedEvidenceTypes: '["photo"]',
        },
        {
          id: "step-2",
          title: "Practice",
          status: "completed",
          ordinal: 1,
          plannedEvidenceTypes: null,
        },
      ],
      stepEvidence: [],
    });
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    fireEvent.press(screen.getByLabelText("Add Photo evidence"));
    expect(mockNavigate).toHaveBeenCalledWith("CapturePhoto", {
      goalId: "goal-1",
      stepId: "step-1",
    });
  });

  it("navigates back when back button is pressed", () => {
    setupQueries();
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    fireEvent.press(screen.getByLabelText("Go back"));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it("navigates to EditMode when edit button is pressed", () => {
    setupQueries();
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    fireEvent.press(screen.getByLabelText("Edit goal"));
    expect(mockNavigate).toHaveBeenCalledWith("EditMode", {
      goalId: "goal-1",
      cameFromFocus: true,
    });
  });

  it('renders "Focus Mode" label in top bar', () => {
    setupQueries();
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    expect(screen.getByText(i18n.t("focusMode:title"))).toBeOnTheScreen();
  });

  // The goal card lives at the end of the CardCarousel, which sets
  // accessibilityElementsHidden on every non-center card. Navigate to the
  // goal card via the "Goal evidence" indicator before asserting on the
  // Mark Complete check — that's what a real user does.
  const navigateToGoalCard = () => {
    fireEvent.press(
      screen.getAllByLabelText(i18n.t("common:timeline.a11y.goalEvidence"))[0],
    );
  };

  it("Mark Complete check is hidden while any step is pending", () => {
    setupQueries({
      steps: [
        { id: "step-1", title: "Read docs", status: "completed", ordinal: 0 },
        { id: "step-2", title: "Practice", status: "pending", ordinal: 1 },
      ],
    });
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    navigateToGoalCard();

    expect(
      screen.queryByRole("button", {
        name: i18n.t("common:goalCard.markComplete"),
      }),
    ).toBeNull();
  });

  it("Mark Complete check appears when all steps are complete", () => {
    setupQueries({
      steps: [
        { id: "step-1", title: "Read docs", status: "completed", ordinal: 0 },
        { id: "step-2", title: "Practice", status: "pending", ordinal: 1 },
      ],
    });
    const view = renderWithProviders(<FocusModeScreen {...routeProps} />);
    navigateToGoalCard();
    expect(
      screen.queryByRole("button", {
        name: i18n.t("common:goalCard.markComplete"),
      }),
    ).toBeNull();

    // Flip the pending step to completed and rerender. The snap effect
    // moves the carousel back to the goal card on the incomplete →
    // complete transition, so the check becomes queryable without a
    // second manual navigation.
    setupQueries({
      steps: [
        { id: "step-1", title: "Read docs", status: "completed", ordinal: 0 },
        { id: "step-2", title: "Practice", status: "completed", ordinal: 1 },
      ],
    });
    view.rerender(<FocusModeScreen {...routeProps} />);

    expect(
      screen.getByRole("button", {
        name: i18n.t("common:goalCard.markComplete"),
      }),
    ).toBeOnTheScreen();
  });

  it("tapping Mark Complete navigates to CompletionFlow", () => {
    setupQueries({
      steps: [
        { id: "step-1", title: "Read docs", status: "completed", ordinal: 0 },
        { id: "step-2", title: "Practice", status: "completed", ordinal: 1 },
      ],
    });
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    navigateToGoalCard();

    fireEvent.press(
      screen.getByRole("button", {
        name: i18n.t("common:goalCard.markComplete"),
      }),
    );
    expect(mockNavigate).toHaveBeenCalledWith("CompletionFlow", {
      goalId: "goal-1",
    });
  });

  it("does NOT auto-navigate to CompletionFlow on the pending→complete transition", () => {
    jest.useFakeTimers();
    // Regression guard for the removed auto-nav. The user must tap
    // Mark Complete themselves; observing the transition alone must
    // never trigger navigation.
    setupQueries({
      steps: [
        { id: "step-1", title: "Read docs", status: "completed", ordinal: 0 },
        { id: "step-2", title: "Practice", status: "pending", ordinal: 1 },
      ],
    });
    const view = renderWithProviders(<FocusModeScreen {...routeProps} />);

    setupQueries({
      steps: [
        { id: "step-1", title: "Read docs", status: "completed", ordinal: 0 },
        { id: "step-2", title: "Practice", status: "completed", ordinal: 1 },
      ],
    });
    view.rerender(<FocusModeScreen {...routeProps} />);
    // Drain any timers in case a future regression reintroduces deferred nav.
    jest.advanceTimersByTime(2000);

    expect(mockNavigate).not.toHaveBeenCalledWith("CompletionFlow", {
      goalId: "goal-1",
    });
    jest.useRealTimers();
  });

  it("stepless goal: Mark Complete is visible from first mount", () => {
    setupQueries({ steps: [] });
    renderWithProviders(<FocusModeScreen {...routeProps} />);

    expect(
      screen.getByRole("button", {
        name: i18n.t("common:goalCard.markComplete"),
      }),
    ).toBeOnTheScreen();
  });

  it("stepless goal: timeline toggle (eye icon) is hidden — nothing to toggle", () => {
    setupQueries({ steps: [] });
    renderWithProviders(<FocusModeScreen {...routeProps} />);

    expect(screen.queryByLabelText("Hide timeline")).toBeNull();
    expect(screen.queryByLabelText("Show timeline")).toBeNull();
  });

  it("stepped goal: timeline toggle (eye icon) is visible", () => {
    setupQueries();
    renderWithProviders(<FocusModeScreen {...routeProps} />);

    expect(screen.getByLabelText("Hide timeline")).toBeOnTheScreen();
  });

  it("badge on goal card navigates to BadgeDesigner in new-goal mode", () => {
    setupQueries({ steps: [] });
    renderWithProviders(<FocusModeScreen {...routeProps} />);

    fireEvent.press(
      screen.getByLabelText(
        "Badge preview for Learn TypeScript, tap to edit design",
      ),
    );
    expect(mockNavigate).toHaveBeenCalledWith("BadgeDesigner", {
      mode: "new-goal",
      goalId: "goal-1",
      returnVia: "back",
    });
  });

  it("renders goal description on the goal card when present", () => {
    setupQueries({ steps: [] });
    renderWithProviders(<FocusModeScreen {...routeProps} />);

    expect(screen.getByText("Master the type system")).toBeOnTheScreen();
  });

  it("omits goal description on the goal card when null", () => {
    setupQueries({
      goal: { ...GOAL, description: null },
      steps: [],
    });
    renderWithProviders(<FocusModeScreen {...routeProps} />);

    expect(screen.queryByText("Master the type system")).toBeNull();
  });

  it("stepless goal: tapping Mark Complete navigates to CompletionFlow", () => {
    setupQueries({ steps: [] });
    renderWithProviders(<FocusModeScreen {...routeProps} />);

    fireEvent.press(
      screen.getByRole("button", {
        name: i18n.t("common:goalCard.markComplete"),
      }),
    );
    expect(mockNavigate).toHaveBeenCalledWith("CompletionFlow", {
      goalId: "goal-1",
    });
  });

  it("does not auto-navigate when steps are still pending", () => {
    jest.useFakeTimers();
    setupQueries();
    renderWithProviders(<FocusModeScreen {...routeProps} />);

    jest.advanceTimersByTime(500);
    expect(mockNavigate).not.toHaveBeenCalledWith(
      "CompletionFlow",
      expect.anything(),
    );
    jest.useRealTimers();
  });

  it("shows confirm dialog on evidence long-press and deletes on confirm", () => {
    setupQueries();
    renderWithProviders(<FocusModeScreen {...routeProps} />);

    // Open the evidence drawer first
    fireEvent.press(screen.getByLabelText("Toggle evidence drawer"));

    // Long press on evidence item to trigger delete
    const evidenceItem = screen.getByLabelText(/text evidence:/);
    fireEvent(evidenceItem, "longPress");

    // Confirm dialog should appear
    expect(
      screen.getByText(i18n.t("focusMode:confirmDelete.title")),
    ).toBeOnTheScreen();

    // Confirm the deletion
    fireEvent.press(
      screen.getByRole("button", { name: i18n.t("common:actions.delete") }),
    );
    expect(mockDeleteEvidence).toHaveBeenCalledWith("ev-s1");
  });

  it("uses the current step's goal-wide evidence row for view and delete", () => {
    jest.useFakeTimers();
    setupQueries({
      steps: [
        { id: "step-1", title: "Read docs", status: "pending", ordinal: 0 },
        { id: "step-2", title: "Practice", status: "pending", ordinal: 1 },
      ],
      stepEvidence: [
        {
          id: "ev-s1",
          type: "text",
          uri: "content:text;First",
          description: "First step note",
          stepId: "step-1",
        },
        {
          id: "ev-s2",
          type: "photo",
          uri: "/step-2.jpg",
          description: "Second step photo",
          metadata: '{"width":1200}',
          stepId: "step-2",
        },
      ],
    });
    renderWithProviders(<FocusModeScreen {...routeProps} />);

    fireEvent.press(screen.getByLabelText("Next card"));
    fireEvent.press(screen.getByLabelText("Toggle evidence drawer"));

    const evidenceItem = screen.getByLabelText(
      "photo evidence: Second step photo",
    );
    expect(
      screen.queryByLabelText(/text evidence: First step note/),
    ).toBeNull();

    fireEvent.press(evidenceItem);
    expect(mockViewEvidence).toHaveBeenCalledWith({
      id: "ev-s2",
      title: "Second step photo",
      type: "photo",
      uri: "/step-2.jpg",
      metadata: '{"width":1200}',
    });

    fireEvent(evidenceItem, "longPress");
    fireEvent.press(
      screen.getByRole("button", { name: i18n.t("common:actions.delete") }),
    );
    expect(mockDeleteEvidence).toHaveBeenCalledWith("ev-s2");

    jest.advanceTimersByTime(5000);
    expect(mockDeleteEvidenceFile).toHaveBeenCalledWith("/step-2.jpg", "photo");
    jest.useRealTimers();
  });

  it("cancels evidence deletion when cancel is pressed", () => {
    setupQueries();
    renderWithProviders(<FocusModeScreen {...routeProps} />);

    // Open the evidence drawer first
    fireEvent.press(screen.getByLabelText("Toggle evidence drawer"));

    // Long press to open confirm dialog
    const evidenceItem = screen.getByLabelText(/text evidence:/);
    fireEvent(evidenceItem, "longPress");

    // Cancel the deletion
    fireEvent.press(
      screen.getByRole("button", { name: i18n.t("common:actions.cancel") }),
    );
    expect(mockDeleteEvidence).not.toHaveBeenCalled();
  });

  it("shows a confirmation toast without an undo action after confirming", () => {
    setupQueries();
    renderWithProviders(<FocusModeScreen {...routeProps} />);

    // Open drawer → long-press → confirm
    fireEvent.press(screen.getByLabelText("Toggle evidence drawer"));
    fireEvent(screen.getByLabelText(/text evidence:/), "longPress");
    fireEvent.press(
      screen.getByRole("button", { name: i18n.t("common:actions.delete") }),
    );

    // The informational toast appears, but there is no undo action to chase.
    expect(
      screen.getByText(i18n.t("focusMode:toast.evidenceDeleted")),
    ).toBeOnTheScreen();
    expect(screen.queryByLabelText(i18n.t("common:actions.undo"))).toBeNull();
  });

  it("cleans up the evidence file immediately on confirm (no deferred timer)", () => {
    setupQueries();
    renderWithProviders(<FocusModeScreen {...routeProps} />);

    // Open drawer → long-press → confirm
    fireEvent.press(screen.getByLabelText("Toggle evidence drawer"));
    fireEvent(screen.getByLabelText(/text evidence:/), "longPress");
    fireEvent.press(
      screen.getByRole("button", { name: i18n.t("common:actions.delete") }),
    );

    // Soft-delete and file cleanup both fire synchronously on confirm.
    expect(mockDeleteEvidence).toHaveBeenCalledWith("ev-s1");
    expect(mockDeleteEvidenceFile).toHaveBeenCalledWith(
      "content:text;My notes",
      "text",
    );
  });

  // --- Evidence-gated completion ---

  it("does not call completeStep when canCompleteStep returns false", () => {
    mockCanCompleteStep.mockReturnValue(false);
    setupQueries({
      steps: [
        {
          id: "step-1",
          title: "Read docs",
          status: "pending",
          ordinal: 0,
          plannedEvidenceTypes: '["photo"]',
        },
        {
          id: "step-2",
          title: "Practice",
          status: "pending",
          ordinal: 1,
          plannedEvidenceTypes: null,
        },
      ],
      stepEvidence: [
        {
          id: "ev-s1",
          type: "photo",
          uri: "/photo.jpg",
          description: "Photo",
          stepId: "step-1",
        },
      ],
    });
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    fireEvent.press(
      screen.getByRole("checkbox", {
        name: i18n.t("common:stepCard.checkbox.markComplete"),
      }),
    );
    expect(mockCompleteStep).not.toHaveBeenCalled();
  });

  it("calls completeStep for a step with no planned types and no evidence", () => {
    mockCanCompleteStep.mockReturnValue(true);
    setupQueries({
      steps: [
        {
          id: "step-1",
          title: "Read docs",
          status: "pending",
          ordinal: 0,
          plannedEvidenceTypes: null,
        },
        {
          id: "step-2",
          title: "Practice",
          status: "completed",
          ordinal: 1,
          plannedEvidenceTypes: null,
        },
      ],
      stepEvidence: [],
    });
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    fireEvent.press(
      screen.getByRole("checkbox", {
        name: i18n.t("common:stepCard.checkbox.markComplete"),
      }),
    );
    expect(mockCanCompleteStep).toHaveBeenCalledWith(null, []);
    expect(mockCompleteStep).toHaveBeenCalledWith("step-1", null, []);
  });

  it("calls completeStep when canCompleteStep returns true", () => {
    setupQueries({
      steps: [
        {
          id: "step-1",
          title: "Read docs",
          status: "pending",
          ordinal: 0,
          plannedEvidenceTypes: '["photo"]',
        },
        {
          id: "step-2",
          title: "Practice",
          status: "pending",
          ordinal: 1,
          plannedEvidenceTypes: null,
        },
      ],
      stepEvidence: [
        {
          id: "ev-s1",
          type: "photo",
          uri: "/photo.jpg",
          description: "Photo",
          stepId: "step-1",
        },
      ],
    });
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    fireEvent.press(
      screen.getByRole("checkbox", {
        name: i18n.t("common:stepCard.checkbox.markComplete"),
      }),
    );
    expect(mockCompleteStep).toHaveBeenCalledWith("step-1", '["photo"]', [
      { type: "photo" },
    ]);
  });

  it("calls uncompleteStep without evidence check", () => {
    setupQueries({
      steps: [
        {
          id: "step-1",
          title: "Read docs",
          status: "completed",
          ordinal: 0,
          plannedEvidenceTypes: '["photo"]',
        },
        {
          id: "step-2",
          title: "Practice",
          status: "pending",
          ordinal: 1,
          plannedEvidenceTypes: null,
        },
      ],
    });
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    // Auto-snap puts us on step-2 (pending); swipe back to the completed step.
    fireEvent.press(screen.getByLabelText("Previous card"));
    // Role query scopes to the checkbox, skipping the StatusBadge "Completed".
    fireEvent.press(
      screen.getByRole("checkbox", {
        name: i18n.t("common:stepCard.checkbox.completed"),
      }),
    );
    expect(mockUncompleteStep).toHaveBeenCalledWith("step-1");
    expect(mockCanCompleteStep).not.toHaveBeenCalled();
  });

  it("navigates to CaptureTextNote when the Note quick-action is pressed", () => {
    setupQueries({
      steps: [
        {
          id: "step-1",
          title: "Read docs",
          status: "pending",
          ordinal: 0,
          plannedEvidenceTypes: '["text"]',
        },
        {
          id: "step-2",
          title: "Practice",
          status: "completed",
          ordinal: 1,
          plannedEvidenceTypes: null,
        },
      ],
      stepEvidence: [],
    });
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    fireEvent.press(screen.getByLabelText("Add Note evidence"));
    expect(mockNavigate).toHaveBeenCalledWith("CaptureTextNote", {
      goalId: "goal-1",
      stepId: "step-1",
    });
  });

  it("supports the text-note then complete flow once captured externally", () => {
    const steps = [
      {
        id: "step-1",
        title: "Read docs",
        status: "pending",
        ordinal: 0,
        plannedEvidenceTypes: '["text"]',
      },
      {
        id: "step-2",
        title: "Practice",
        status: "completed",
        ordinal: 1,
        plannedEvidenceTypes: null,
      },
    ];

    // Step 1: from Focus Mode, tapping the Note quick-action navigates to
    // the dedicated capture screen — text creation itself happens there.
    setupQueries({ steps, stepEvidence: [] });
    const view = renderWithProviders(<FocusModeScreen {...routeProps} />);
    fireEvent.press(screen.getByLabelText("Add Note evidence"));
    expect(mockNavigate).toHaveBeenCalledWith("CaptureTextNote", {
      goalId: "goal-1",
      stepId: "step-1",
    });

    // Step 2: once the user has captured a text note in CaptureTextNote and
    // returned, FocusMode should let them complete the step.
    setupQueries({
      steps,
      stepEvidence: [
        {
          id: "ev-s1",
          type: "text",
          uri: "content:text;My reflection",
          description: "My reflection",
          stepId: "step-1",
        },
      ],
    });

    view.unmount();
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    fireEvent.press(
      screen.getAllByRole("checkbox", {
        name: i18n.t("common:stepCard.checkbox.markComplete"),
      })[0],
    );

    expect(mockCompleteStep).toHaveBeenCalledWith("step-1", '["text"]', [
      { type: "text" },
    ]);
  });

  it("Mark Complete stays hidden while an evidence-gated step is incomplete, appears after it completes", () => {
    setupQueries({
      steps: [
        {
          id: "step-1",
          title: "Read docs",
          status: "completed",
          ordinal: 0,
          plannedEvidenceTypes: '["text"]',
        },
        {
          id: "step-2",
          title: "Practice",
          status: "pending",
          ordinal: 1,
          plannedEvidenceTypes: null,
        },
      ],
    });
    const view = renderWithProviders(<FocusModeScreen {...routeProps} />);
    fireEvent.press(
      screen.getAllByLabelText(i18n.t("common:timeline.a11y.goalEvidence"))[0],
    );
    expect(
      screen.queryByRole("button", {
        name: i18n.t("common:goalCard.markComplete"),
      }),
    ).toBeNull();

    setupQueries({
      steps: [
        {
          id: "step-1",
          title: "Read docs",
          status: "completed",
          ordinal: 0,
          plannedEvidenceTypes: '["text"]',
        },
        {
          id: "step-2",
          title: "Practice",
          status: "completed",
          ordinal: 1,
          plannedEvidenceTypes: null,
        },
      ],
    });
    view.rerender(<FocusModeScreen {...routeProps} />);
    expect(
      screen.getByRole("button", {
        name: i18n.t("common:goalCard.markComplete"),
      }),
    ).toBeOnTheScreen();
  });

  it("treats malformed plannedEvidenceTypes JSON as null (no gating)", () => {
    setupQueries({
      steps: [
        {
          id: "step-1",
          title: "Read docs",
          status: "pending",
          ordinal: 0,
          plannedEvidenceTypes: "not-valid-json",
        },
        {
          id: "step-2",
          title: "Practice",
          status: "pending",
          ordinal: 1,
          plannedEvidenceTypes: null,
        },
      ],
      stepEvidence: [],
    });
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    expect(
      screen.getByRole("checkbox", {
        name: i18n.t("common:stepCard.checkbox.markComplete"),
      }),
    ).toBeOnTheScreen();
  });

  it("completes step without planned types even with no evidence", () => {
    setupQueries({
      steps: [
        {
          id: "step-1",
          title: "Read docs",
          status: "pending",
          ordinal: 0,
          plannedEvidenceTypes: null,
        },
        {
          id: "step-2",
          title: "Practice",
          status: "pending",
          ordinal: 1,
          plannedEvidenceTypes: null,
        },
      ],
      stepEvidence: [],
    });
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    fireEvent.press(
      screen.getByRole("checkbox", {
        name: i18n.t("common:stepCard.checkbox.markComplete"),
      }),
    );
    expect(mockCompleteStep).toHaveBeenCalledWith("step-1", null, []);
  });

  describe("pseudo locale", () => {
    afterEach(async () => {
      if (i18n.language !== "en") await i18n.changeLanguage("en");
    });

    it.each([
      { key: "focusMode:title", query: "text" },
      { key: "focusMode:header.editGoal", query: "label" },
      { key: "focusMode:header.hideTimeline", query: "label" },
    ] as const)(
      "renders $key as bracketed copy under pseudo locale",
      async ({ key, query }) => {
        await i18n.changeLanguage("pseudo");
        setupQueries();
        renderWithProviders(<FocusModeScreen {...routeProps} />);
        const pseudo = i18n.t(key);
        expect(pseudo.startsWith("[")).toBe(true);
        const get = query === "text" ? screen.getByText : screen.getByLabelText;
        expect(get(pseudo)).toBeOnTheScreen();
      },
    );

    it("renders the Goal not found error under pseudo locale", async () => {
      await i18n.changeLanguage("pseudo");
      setupQueries({ goal: null, steps: [] });
      renderWithProviders(<FocusModeScreen {...routeProps} />);
      const pseudo = i18n.t("focusMode:errors.goalNotFound");
      expect(pseudo.startsWith("[")).toBe(true);
      expect(screen.getByText(pseudo)).toBeOnTheScreen();
    });

    it("resolves interpolated step-uncompleted announcement under pseudo locale", async () => {
      // Announcements fire through AccessibilityInfo and aren't queryable in jsdom.
      await i18n.changeLanguage("pseudo");
      const pseudo = i18n.t("focusMode:a11y.stepUncompleted", {
        title: "Read docs",
      });
      expect(pseudo.startsWith("[")).toBe(true);
      expect(pseudo).toContain("Read docs");
    });
  });

  describe("breadcrumbs", () => {
    const { breadcrumb: mockBreadcrumb } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("../../../services/sentry-report");

    it("emits focus/enter on mount and focus/exit on unmount", () => {
      setupQueries();
      const { unmount } = renderWithProviders(
        <FocusModeScreen {...routeProps} />,
      );

      expect(mockBreadcrumb).toHaveBeenCalledWith({
        category: "focus",
        message: "enter",
      });
      expect(mockBreadcrumb).not.toHaveBeenCalledWith({
        category: "focus",
        message: "exit",
      });

      unmount();

      expect(mockBreadcrumb).toHaveBeenCalledWith({
        category: "focus",
        message: "exit",
      });
    });
  });

  describe("sub-steps (#292)", () => {
    // Parent step-2 has a pending child → snap should resolve to the leaf, not
    // the container parent.
    const LEAF_STEPS = [
      { id: "step-1", title: "Read docs", status: "completed", ordinal: 0, parentStepId: null }, // prettier-ignore
      { id: "step-2", title: "Practice", status: "pending", ordinal: 1, parentStepId: null }, // prettier-ignore
      { id: "step-2a", title: "Drill A", status: "pending", ordinal: 0, parentStepId: "step-2" }, // prettier-ignore
      { id: "step-2b", title: "Drill B", status: "pending", ordinal: 1, parentStepId: "step-2" }, // prettier-ignore
      { id: "step-3", title: "Build it", status: "pending", ordinal: 2, parentStepId: null }, // prettier-ignore
    ];

    // All of step-2's children done, parent still pending → invite state; snap
    // resolves to the parent and the children are non-current child nodes.
    const INVITE_STEPS = [
      { id: "step-1", title: "Read docs", status: "completed", ordinal: 0, parentStepId: null }, // prettier-ignore
      { id: "step-2", title: "Practice", status: "pending", ordinal: 1, parentStepId: null }, // prettier-ignore
      { id: "step-2a", title: "Drill A", status: "completed", ordinal: 0, parentStepId: "step-2" }, // prettier-ignore
      { id: "step-2b", title: "Drill B", status: "completed", ordinal: 1, parentStepId: "step-2" }, // prettier-ignore
      { id: "step-3", title: "Build it", status: "pending", ordinal: 2, parentStepId: null }, // prettier-ignore
    ];

    const nodeWidth = (index: number): number | undefined => {
      const flat = StyleSheet.flatten(
        screen.getByTestId(`timeline-node-${index}`).props.style,
      ) as Record<string, unknown> | null;
      return flat?.width as number | undefined;
    };

    it("snaps to the first pending leaf, not the parent that contains it", () => {
      setupQueries({ steps: LEAF_STEPS, stepEvidence: [] });
      renderWithProviders(<FocusModeScreen {...routeProps} />);
      // step-2a is the first pending leaf (part 1 of 2). Child cards show the
      // parent band, not a global "N of M" (#360); the band being on-screen
      // (off-screen cards are hidden) confirms it is the current card. The
      // carousel index itself is asserted via the MiniTimeline node tests.
      expect(
        screen.getByText(
          i18n.t("focusMode:band.childContext", {
            parent: "Practice",
            index: 1,
            total: 2,
          }),
        ),
      ).toBeOnTheScreen();
      // The child title also appears in the parent's overview spine (#360), so
      // scope to the leaf card's header to confirm it is the current card.
      expect(screen.getByRole("header", { name: "Drill A" })).toBeOnTheScreen();
    });

    it("renders the parent band on a leaf step card", () => {
      setupQueries({ steps: LEAF_STEPS, stepEvidence: [] });
      renderWithProviders(<FocusModeScreen {...routeProps} />);
      expect(screen.getByTestId("step-card-parent-band")).toBeOnTheScreen();
      expect(
        screen.getByText(
          i18n.t("focusMode:band.childContext", {
            parent: "Practice",
            index: 1,
            total: 2,
          }),
        ),
      ).toBeOnTheScreen();
    });

    it("passes isChild through to the MiniTimeline (smaller child node)", () => {
      // Invite state snaps to the parent (index 1), so the children stay
      // non-current — their nodes render at the smaller sub-step size.
      setupQueries({ steps: INVITE_STEPS, stepEvidence: [] });
      renderWithProviders(<FocusModeScreen {...routeProps} />);
      expect(nodeWidth(0)).toBe(14); // top-level step
      expect(nodeWidth(2)).toBe(10); // sub-step (child) node
    });

    it("opens a part's own card when its overview spine row is tapped (#360)", () => {
      // Invite state snaps to the parent overview card (index 1). Drill A/B
      // appear there only as spine rows, not headers, until their leaf is opened.
      setupQueries({ steps: INVITE_STEPS, stepEvidence: [] });
      renderWithProviders(<FocusModeScreen {...routeProps} />);
      fireEvent.press(screen.getByTestId("overview-part-step-2b"));
      // step-2b's leaf is now the current card → its header is on screen.
      expect(screen.getByRole("header", { name: "Drill B" })).toBeOnTheScreen();
    });

    // Real query order: `stepsByGoalQuery` is `(ordinal, createdAt)`-ordered and
    // child ordinals are sibling-scoped, so a child of a later parent interleaves
    // among the top-level steps — here `step-2a` (ord 0) sorts before its parent
    // `step-2` (ord 1). The screen must flatten via groupStepsByParent before
    // rendering; otherwise the leaf lands at the wrong carousel index and the
    // MiniTimeline groups it under the wrong lead (#292).
    const INTERLEAVED_STEPS = [
      { id: "step-1", title: "Read docs", status: "completed", ordinal: 0, parentStepId: null }, // prettier-ignore
      { id: "step-2a", title: "Drill A", status: "pending", ordinal: 0, parentStepId: "step-2" }, // prettier-ignore
      { id: "step-2", title: "Practice", status: "pending", ordinal: 1, parentStepId: null }, // prettier-ignore
      { id: "step-3", title: "Build it", status: "pending", ordinal: 2, parentStepId: null }, // prettier-ignore
    ];

    it("reorders interleaved (real-query-order) rows so the leaf snaps to its flattened position", () => {
      setupQueries({ steps: INTERLEAVED_STEPS, stepEvidence: [] });
      renderWithProviders(<FocusModeScreen {...routeProps} />);
      // After flatten: [step-1, step-2, step-2a, step-3] → leaf step-2a is the
      // current card (the only child of step-2 → part 1 of 1). Without the
      // flatten it would land on the wrong index and group under the wrong lead.
      expect(
        screen.getByText(
          i18n.t("focusMode:band.childContext", {
            parent: "Practice",
            index: 1,
            total: 1,
          }),
        ),
      ).toBeOnTheScreen();
      expect(screen.getByRole("header", { name: "Drill A" })).toBeOnTheScreen();
      // step-2a is the current leaf → child-current width (14), not the
      // lead-current width (18). Proves it renders as a sub-step, not a lead.
      expect(nodeWidth(2)).toBe(14);
    });

    // Parent step-2's first child is done, second pending → resolution must pick
    // the first *pending* child via .find(pending), not children[0].
    const PARTIAL_LEAF_STEPS = [
      { id: "step-1", title: "Read docs", status: "completed", ordinal: 0, parentStepId: null }, // prettier-ignore
      { id: "step-2", title: "Practice", status: "pending", ordinal: 1, parentStepId: null }, // prettier-ignore
      { id: "step-2a", title: "Drill A", status: "completed", ordinal: 0, parentStepId: "step-2" }, // prettier-ignore
      { id: "step-2b", title: "Drill B", status: "pending", ordinal: 1, parentStepId: "step-2" }, // prettier-ignore
      { id: "step-3", title: "Build it", status: "pending", ordinal: 2, parentStepId: null }, // prettier-ignore
    ];

    it("snaps to the first pending child when an earlier sibling is complete", () => {
      setupQueries({ steps: PARTIAL_LEAF_STEPS, stepEvidence: [] });
      renderWithProviders(<FocusModeScreen {...routeProps} />);
      // step-2b is the first pending leaf (part 2 of 2). A children[0] resolution
      // would wrongly land on the completed step-2a (part 1 of 2).
      expect(screen.getByRole("header", { name: "Drill B" })).toBeOnTheScreen();
      expect(
        screen.getByText(
          i18n.t("focusMode:band.childContext", {
            parent: "Practice",
            index: 2,
            total: 2,
          }),
        ),
      ).toBeOnTheScreen();
    });

    // Orphan: step-2a's parent (step-2) was soft-deleted, so only the child
    // survives carrying a dangling parentStepId. It must be promoted to a
    // reachable top-level step, not hidden (#292 regression — the old flat
    // find(isPendingStep) surfaced it; bucketed resolution dropped it).
    const ORPHAN_STEPS = [
      { id: "step-1", title: "Read docs", status: "completed", ordinal: 0, parentStepId: null }, // prettier-ignore
      { id: "step-2a", title: "Drill A", status: "pending", ordinal: 0, parentStepId: "step-2" }, // prettier-ignore
    ];

    it("promotes an orphaned sub-step (deleted parent) to a reachable lead", () => {
      setupQueries({ steps: ORPHAN_STEPS, stepEvidence: [] });
      renderWithProviders(<FocusModeScreen {...routeProps} />);
      // The orphan is the only pending step → snap lands on it ("2 of 2").
      // Old bucketed resolution returned -1 here and left the user on the
      // completed step-1 ("1 of 2").
      expect(
        screen.getByText(
          i18n.t("common:stepCard.progress", { current: 2, total: 2 }),
        ),
      ).toBeOnTheScreen();
      expect(screen.getByText("Drill A")).toBeOnTheScreen();
      // The orphan is the current step → lead-current width (18), not the
      // child-current width (14). Proves it renders as a lead, not a sub-step.
      // And the plain band (no purple parent band), since its parent is gone.
      expect(nodeWidth(1)).toBe(18);
      expect(screen.queryByTestId("step-card-parent-band")).toBeNull();
      expect(screen.getByTestId("step-card-top-band")).toBeOnTheScreen();
    });

    // Parent step-2 is manually completed while child step-2b is still pending.
    // Step completion is per-step, not cascaded (completeStep), so this state is
    // reachable. The snap must still land on the pending leaf — skipping the
    // parent on its own status would return -1 and strand the user on step-1.
    const COMPLETED_PARENT_PENDING_CHILD_STEPS = [
      { id: "step-1", title: "Read docs", status: "completed", ordinal: 0, parentStepId: null }, // prettier-ignore
      { id: "step-2", title: "Practice", status: "completed", ordinal: 1, parentStepId: null }, // prettier-ignore
      { id: "step-2a", title: "Drill A", status: "completed", ordinal: 0, parentStepId: "step-2" }, // prettier-ignore
      { id: "step-2b", title: "Drill B", status: "pending", ordinal: 1, parentStepId: "step-2" }, // prettier-ignore
      { id: "step-3", title: "Build it", status: "completed", ordinal: 2, parentStepId: null }, // prettier-ignore
    ];

    it("snaps to a pending leaf even when its parent is manually completed", () => {
      setupQueries({
        steps: COMPLETED_PARENT_PENDING_CHILD_STEPS,
        stepEvidence: [],
      });
      renderWithProviders(<FocusModeScreen {...routeProps} />);
      // step-2b is the only pending work (part 2 of 2). A resolution that skipped
      // the completed parent first would return -1 and leave the carousel on the
      // completed step-1.
      expect(screen.getByRole("header", { name: "Drill B" })).toBeOnTheScreen();
      // Still a leaf, so the parent band stays.
      expect(
        screen.getByText(
          i18n.t("focusMode:band.childContext", {
            parent: "Practice",
            index: 2,
            total: 2,
          }),
        ),
      ).toBeOnTheScreen();
    });
  });

  // Candidate C (#360): a parent with present children renders as an overview
  // card — a spine of its parts, an evidence rollup, and the manual complete
  // invite once all parts are done.
  describe("parent overview (#360)", () => {
    // step-2's children are all done → snap lands on the parent (invite state),
    // so the overview is the current, visible card.
    const INVITE_STEPS = [
      { id: "step-1", title: "Read docs", status: "completed", ordinal: 0, parentStepId: null }, // prettier-ignore
      { id: "step-2", title: "Practice", status: "pending", ordinal: 1, parentStepId: null }, // prettier-ignore
      { id: "step-2a", title: "Drill A", status: "completed", ordinal: 0, parentStepId: "step-2" }, // prettier-ignore
      { id: "step-2b", title: "Drill B", status: "completed", ordinal: 1, parentStepId: "step-2" }, // prettier-ignore
      { id: "step-3", title: "Build it", status: "pending", ordinal: 2, parentStepId: null }, // prettier-ignore
    ];

    it("renders a parent as an overview card with a spine of its parts", () => {
      setupQueries({ steps: INVITE_STEPS, stepEvidence: [] });
      renderWithProviders(<FocusModeScreen {...routeProps} />);
      expect(screen.getByTestId("overview-part-step-2a")).toBeOnTheScreen();
      expect(screen.getByTestId("overview-part-step-2b")).toBeOnTheScreen();
    });

    it("rolls up evidence as the sum across the parent's parts", () => {
      setupQueries({
        steps: INVITE_STEPS,
        stepEvidence: [
          { id: "e1", type: "photo", stepId: "step-2a" },
          { id: "e2", type: "text", stepId: "step-2a" },
          { id: "e3", type: "photo", stepId: "step-2b" },
        ],
      });
      renderWithProviders(<FocusModeScreen {...routeProps} />);
      // 2 (step-2a) + 1 (step-2b) = 3
      expect(
        screen.getByLabelText("Evidence across parts: 3"),
      ).toBeOnTheScreen();
    });

    it("offers the mark-parent-complete invite when all parts are done", () => {
      setupQueries({ steps: INVITE_STEPS, stepEvidence: [] });
      renderWithProviders(<FocusModeScreen {...routeProps} />);
      expect(
        screen.getByRole("checkbox", {
          name: i18n.t("focusMode:overview.markComplete", {
            parent: "Practice",
          }),
        }),
      ).toBeOnTheScreen();
    });

    // step-A is a flat pending step, so the snap stays on it (index 0), leaving
    // the parent overview at index 1 — reachable by swiping forward.
    const PENDING_PARENT_STEPS = [
      { id: "step-A", title: "Gather parts", status: "pending", ordinal: 0, parentStepId: null }, // prettier-ignore
      { id: "step-B", title: "Wire it", status: "pending", ordinal: 1, parentStepId: null }, // prettier-ignore
      { id: "step-B1", title: "Solder joints", status: "pending", ordinal: 0, parentStepId: "step-B" }, // prettier-ignore
      { id: "step-B2", title: "Test continuity", status: "pending", ordinal: 1, parentStepId: "step-B" }, // prettier-ignore
    ];

    it("shows the complete-the-parts prompt (no completion control) while parts are pending", () => {
      setupQueries({ steps: PENDING_PARENT_STEPS, stepEvidence: [] });
      renderWithProviders(<FocusModeScreen {...routeProps} />);
      // Snap stays on the flat step-A; move to the parent overview (index 1).
      fireEvent.press(screen.getByLabelText("Next card"));
      // The overview foot mirrors a blocked leaf card: a quiet prompt, no
      // completion control and no bespoke navigation (parts are reached by
      // swiping, like every other card).
      expect(
        screen.getByTestId("overview-parts-pending-prompt"),
      ).toBeOnTheScreen();
      expect(screen.queryByRole("checkbox")).toBeNull();
    });

    it("each child part is reachable by swiping past the overview", () => {
      setupQueries({ steps: PENDING_PARENT_STEPS, stepEvidence: [] });
      renderWithProviders(<FocusModeScreen {...routeProps} />);
      // step-A (0) → overview (1) → step-B1 (2): the first pending part.
      fireEvent.press(screen.getByLabelText("Next card"));
      fireEvent.press(screen.getByLabelText("Next card"));
      expect(
        screen.getByText(
          i18n.t("focusMode:band.childContext", {
            parent: "Wire it",
            index: 1,
            total: 2,
          }),
        ),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole("header", { name: "Solder joints" }),
      ).toBeOnTheScreen();
    });
  });
});
