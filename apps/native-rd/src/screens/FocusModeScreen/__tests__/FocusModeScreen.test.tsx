import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { i18n } from "../../../i18n";
import { FocusModeScreen } from "../FocusModeScreen";

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

const mockCompleteStep = jest.fn();
const mockUncompleteStep = jest.fn();
const mockDeleteEvidence = jest.fn();
const mockRestoreEvidence = jest.fn();
const mockCreateEvidence = jest.fn();
const mockCanCompleteStep = jest.fn().mockReturnValue(true);

jest.mock("../../../utils/evidenceCleanup", () => ({
  deleteEvidenceFile: jest.fn(),
}));

jest.mock("../../../services/sentry-report", () => ({
  reportError: jest.fn(),
  breadcrumb: jest.fn(),
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
  restoreEvidence: (...args: unknown[]) => mockRestoreEvidence(...args),
  createEvidence: (...args: unknown[]) => mockCreateEvidence(...args),
  canCompleteStep: (...args: unknown[]) => mockCanCompleteStep(...args),
  createUserSettings: jest.fn(),
  updateUserSettings: jest.fn(),
  isPendingStep: (s: { status: string | null }) => s.status === "pending",
  findFirstPendingIndex: (rows: { status: string | null }[]) =>
    rows.findIndex((s) => s.status === "pending"),
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
    expect(screen.getByText("Goal not found.")).toBeOnTheScreen();
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
    expect(screen.getByLabelText("Step navigation")).toBeOnTheScreen();
    // "Goal evidence" label appears in both MiniTimeline and ProgressDots
    expect(
      screen.getAllByLabelText("Goal evidence").length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("renders StepCard for current step", () => {
    setupQueries();
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    expect(screen.getByText("Step 1 of 2")).toBeOnTheScreen();
    expect(screen.getByText("Read docs")).toBeOnTheScreen();
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
    expect(screen.getByText("Step 1 of 2")).toBeOnTheScreen();
    fireEvent.press(screen.getByText("Mark complete"));
    expect(mockCompleteStep).toHaveBeenCalledWith("step-1", null, []);
    // Carousel should advance to step-2 instead of staying on the completed step.
    expect(screen.getByText("Step 2 of 2")).toBeOnTheScreen();
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
    expect(screen.getByText("Step 3 of 3")).toBeOnTheScreen();
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
    expect(screen.getByText("Step 1 of 2")).toBeOnTheScreen();
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
    expect(screen.getByText("Step 3 of 3")).toBeOnTheScreen();
    // Complete step-3. Forward search finds nothing pending, so the wrap
    // path must pull the carousel back to step-1.
    fireEvent.press(screen.getByText("Mark complete"));
    expect(mockCompleteStep).toHaveBeenCalledWith("step-3", null, []);
    expect(screen.getByText("Step 1 of 3")).toBeOnTheScreen();
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
    expect(screen.getByText("Step 2 of 2")).toBeOnTheScreen();
    fireEvent.press(screen.getByText("Mark complete"));
    expect(mockCompleteStep).toHaveBeenCalledWith("step-2", null, []);
    // No other pending steps — carousel stays put. The all-steps-complete
    // effect handles the navigation to CompletionFlow separately.
    expect(screen.getByText("Step 2 of 2")).toBeOnTheScreen();
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
    fireEvent.press(screen.getByText("Mark complete"));
    expect(screen.getByText("Step 2 of 2")).toBeOnTheScreen();
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
    expect(screen.getByText("Step 1 of 2")).toBeOnTheScreen();
    fireEvent.press(screen.getByText("Mark complete"));
    // Error toast appears, carousel must NOT advance.
    expect(
      screen.getByText("Could not update step: DB write failed"),
    ).toBeOnTheScreen();
    expect(screen.getByText("Step 1 of 2")).toBeOnTheScreen();
  });

  it("calls completeStep when step checkbox is toggled", () => {
    setupQueries();
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    fireEvent.press(screen.getByText("Mark complete"));
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
    // "Completed" appears as both StatusBadge label and Checkbox label
    // Target the checkbox specifically
    const completedElements = screen.getAllByText("Completed");
    // The checkbox's Completed text is the one we want to press
    fireEvent.press(completedElements[completedElements.length - 1]);
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
    expect(screen.getByText("Focus Mode")).toBeOnTheScreen();
  });

  // The goal card lives at the end of the CardCarousel, which sets
  // accessibilityElementsHidden on every non-center card. Navigate to the
  // goal card via the "Goal evidence" indicator before asserting on the
  // Mark Complete check — that's what a real user does.
  const navigateToGoalCard = () => {
    fireEvent.press(screen.getAllByLabelText("Goal evidence")[0]);
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
      screen.queryByRole("button", { name: "Mark goal complete" }),
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
      screen.queryByRole("button", { name: "Mark goal complete" }),
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
      screen.getByRole("button", { name: "Mark goal complete" }),
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

    fireEvent.press(screen.getByRole("button", { name: "Mark goal complete" }));
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
      screen.getByRole("button", { name: "Mark goal complete" }),
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

    fireEvent.press(screen.getByRole("button", { name: "Mark goal complete" }));
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
    expect(screen.getByText("Delete evidence?")).toBeOnTheScreen();

    // Confirm the deletion
    fireEvent.press(screen.getByText("Delete"));
    expect(mockDeleteEvidence).toHaveBeenCalledWith("ev-s1");
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
    fireEvent.press(screen.getByText("Cancel"));
    expect(mockDeleteEvidence).not.toHaveBeenCalled();
  });

  it("shows undo toast after confirming evidence deletion", () => {
    setupQueries();
    renderWithProviders(<FocusModeScreen {...routeProps} />);

    // Open drawer → long-press → confirm
    fireEvent.press(screen.getByLabelText("Toggle evidence drawer"));
    fireEvent(screen.getByLabelText(/text evidence:/), "longPress");
    fireEvent.press(screen.getByText("Delete"));

    // Toast should appear with undo action
    expect(screen.getByText("Evidence deleted")).toBeOnTheScreen();
    expect(screen.getByLabelText("Undo")).toBeOnTheScreen();
  });

  it("restores evidence when undo is pressed in toast", () => {
    setupQueries();
    renderWithProviders(<FocusModeScreen {...routeProps} />);

    // Open drawer → long-press → confirm
    fireEvent.press(screen.getByLabelText("Toggle evidence drawer"));
    fireEvent(screen.getByLabelText(/text evidence:/), "longPress");
    fireEvent.press(screen.getByText("Delete"));

    // Press undo
    fireEvent.press(screen.getByLabelText("Undo"));
    expect(mockRestoreEvidence).toHaveBeenCalledWith("ev-s1");
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
    fireEvent.press(screen.getByText("Mark complete"));
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
    fireEvent.press(screen.getByText("Mark complete"));
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
    fireEvent.press(screen.getByText("Mark complete"));
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
    // Target the checkbox — "Completed" appears in both StatusBadge and Checkbox
    const completedElements = screen.getAllByText("Completed");
    fireEvent.press(completedElements[completedElements.length - 1]);
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
    fireEvent.press(screen.getAllByLabelText("Mark complete")[0]);

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
    fireEvent.press(screen.getAllByLabelText("Goal evidence")[0]);
    expect(
      screen.queryByRole("button", { name: "Mark goal complete" }),
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
      screen.getByRole("button", { name: "Mark goal complete" }),
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
    expect(screen.getByText("Mark complete")).toBeOnTheScreen();
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
    fireEvent.press(screen.getByText("Mark complete"));
    expect(mockCompleteStep).toHaveBeenCalledWith("step-1", null, []);
  });

  describe("pseudo locale", () => {
    afterEach(async () => {
      if (i18n.language !== "en") await i18n.changeLanguage("en");
    });

    it("renders the Focus Mode title under pseudo locale", async () => {
      await i18n.changeLanguage("pseudo");
      setupQueries();
      renderWithProviders(<FocusModeScreen {...routeProps} />);
      const pseudo = i18n.t("focusMode:title");
      expect(pseudo.startsWith("[")).toBe(true);
      expect(screen.getByText(pseudo)).toBeOnTheScreen();
    });

    it("renders the Edit goal a11y label under pseudo locale", async () => {
      await i18n.changeLanguage("pseudo");
      setupQueries();
      renderWithProviders(<FocusModeScreen {...routeProps} />);
      const pseudo = i18n.t("focusMode:header.editGoal");
      expect(pseudo.startsWith("[")).toBe(true);
      expect(screen.getByLabelText(pseudo)).toBeOnTheScreen();
    });

    it("renders the Hide timeline a11y label under pseudo locale", async () => {
      await i18n.changeLanguage("pseudo");
      setupQueries();
      renderWithProviders(<FocusModeScreen {...routeProps} />);
      const pseudo = i18n.t("focusMode:header.hideTimeline");
      expect(pseudo.startsWith("[")).toBe(true);
      expect(screen.getByLabelText(pseudo)).toBeOnTheScreen();
    });

    it("renders the Goal not found error under pseudo locale", async () => {
      await i18n.changeLanguage("pseudo");
      setupQueries({ goal: null, steps: [] });
      renderWithProviders(<FocusModeScreen {...routeProps} />);
      const pseudo = i18n.t("focusMode:errors.goalNotFound");
      expect(pseudo.startsWith("[")).toBe(true);
      expect(screen.getByText(pseudo)).toBeOnTheScreen();
    });

    it("resolves interpolated step-uncompleted announcement under pseudo locale", async () => {
      // Announcements go through AccessibilityInfo and aren't queryable in jsdom,
      // so we assert resolution + interpolation directly. Pseudo brackets the
      // template; the {{title}} value should pass through verbatim.
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
});
