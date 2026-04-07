import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
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

jest.mock("../../../db", () => ({
  StepStatus: { pending: "pending", completed: "completed" },
  EvidenceType: {
    photo: "photo",
    screenshot: "screenshot",
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
  completeStep: (...args: unknown[]) => mockCompleteStep(...args),
  uncompleteStep: (...args: unknown[]) => mockUncompleteStep(...args),
  deleteEvidence: (...args: unknown[]) => mockDeleteEvidence(...args),
  restoreEvidence: (...args: unknown[]) => mockRestoreEvidence(...args),
  createEvidence: (...args: unknown[]) => mockCreateEvidence(...args),
  canCompleteStep: (...args: unknown[]) => mockCanCompleteStep(...args),
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

  it("auto-navigates to CompletionFlow when all steps are completed", () => {
    jest.useFakeTimers();
    setupQueries({
      steps: [
        { id: "step-1", title: "Read docs", status: "completed", ordinal: 0 },
        { id: "step-2", title: "Practice", status: "completed", ordinal: 1 },
      ],
    });
    renderWithProviders(<FocusModeScreen {...routeProps} />);

    jest.advanceTimersByTime(400);
    expect(mockNavigate).toHaveBeenCalledWith("CompletionFlow", {
      goalId: "goal-1",
    });
    jest.useRealTimers();
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
    // Step has matching evidence (photo), so StepCard is not blocked — press goes to handleToggleStep
    // But canCompleteStep returns false, so completeStep should NOT be called
    fireEvent.press(screen.getByText("Mark complete"));
    expect(mockCompleteStep).not.toHaveBeenCalled();
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
    // Target the checkbox — "Completed" appears in both StatusBadge and Checkbox
    const completedElements = screen.getAllByText("Completed");
    fireEvent.press(completedElements[completedElements.length - 1]);
    expect(mockUncompleteStep).toHaveBeenCalledWith("step-1");
    expect(mockCanCompleteStep).not.toHaveBeenCalled();
  });

  it("calls createEvidence when quick-note is submitted", () => {
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
    const input = screen.getByTestId("step-card-quick-note-input");
    fireEvent.changeText(input, "My reflection");
    fireEvent.press(screen.getByTestId("step-card-quick-note-add-button"));
    expect(mockCreateEvidence).toHaveBeenCalledWith({
      stepId: "step-1",
      goalId: "goal-1",
      type: "text",
      uri: "content:text;My reflection",
      description: "My reflection",
    });
  });

  it("closes the evidence drawer when quick-note entry begins", () => {
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

    fireEvent.press(screen.getByLabelText("Toggle evidence drawer"));
    expect(screen.getByLabelText("Close evidence drawer")).toBeOnTheScreen();

    fireEvent(screen.getByTestId("step-card-quick-note-input"), "focus");

    expect(
      screen.getByLabelText("Close evidence drawer").props.accessible,
    ).toBe(false);
  });

  it("supports the real quick note then complete flow through accessible controls", () => {
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

    setupQueries({
      steps,
      stepEvidence: [],
    });

    const view = renderWithProviders(<FocusModeScreen {...routeProps} />);

    fireEvent.changeText(
      screen.getByTestId("step-card-quick-note-input"),
      "My reflection",
    );
    fireEvent.press(screen.getByTestId("step-card-quick-note-add-button"));

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

    expect(mockCreateEvidence).toHaveBeenCalledWith({
      stepId: "step-1",
      goalId: "goal-1",
      type: "text",
      uri: "content:text;My reflection",
      description: "My reflection",
    });
    expect(mockCompleteStep).toHaveBeenCalledWith("step-1", '["text"]', [
      { type: "text" },
    ]);
  });

  it("auto-navigates to CompletionFlow when all steps complete with evidence gate", () => {
    jest.useFakeTimers();
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
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    jest.advanceTimersByTime(400);
    expect(mockNavigate).toHaveBeenCalledWith("CompletionFlow", {
      goalId: "goal-1",
    });
    jest.useRealTimers();
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
});
