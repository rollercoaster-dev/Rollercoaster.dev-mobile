import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
  waitFor,
  act,
} from "../../../__tests__/test-utils";
import { CompletionFlowScreen } from "../CompletionFlowScreen";

// --- Mocks ---

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockParentNavigate = jest.fn();
const mockGetParent = jest.fn(() => ({ navigate: mockParentNavigate }));
let lastFocusCallback: (() => void | (() => void)) | undefined;
jest.mock("@react-navigation/native", () => {
  const ReactRuntime = require("react");
  const actual = jest.requireActual("../../../__tests__/mocks/navigation");
  return {
    ...actual,
    useNavigation: jest.fn(() => ({
      ...actual.useNavigation(),
      goBack: mockGoBack,
      navigate: mockNavigate,
      replace: mockReplace,
      getParent: mockGetParent,
    })),
    useFocusEffect: jest.fn((callback: () => void | (() => void)) => {
      lastFocusCallback = callback;
      ReactRuntime.useEffect(callback, []);
    }),
  };
});

jest.mock("../../../hooks/useAnimationPref", () => ({
  useAnimationPref: jest.fn(() => ({
    animationPref: "full",
    shouldAnimate: true,
    shouldReduceMotion: false,
    setAnimationPref: jest.fn(),
  })),
}));

const mockUseCreateBadge = jest.fn<
  { status: string; error: string | null },
  [string, { enabled?: boolean; design?: unknown }]
>(() => ({ status: "done", error: null }));
jest.mock("../../../hooks/useCreateBadge", () => ({
  PLACEHOLDER_IMAGE_URI: "pending:baked-image",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useCreateBadge: (goalId: any, opts: any) => mockUseCreateBadge(goalId, opts),
}));

// The default-design auto-capture in CompletionContent calls these. Stub the
// renderer (avoid expensive SVG render in jsdom) and resolve captureBadge
// immediately with a fake PNG so the `enabled: true` branch can be observed.
jest.mock("../../../badges/BadgeRenderer", () => ({
  BadgeRenderer: () => null,
  getRendererLayoutOptions: () => ({ strokeWidth: 3, hasShadow: false }),
}));
jest.mock("../../../badges/captureBadge", () => ({
  captureBadge: jest.fn(() =>
    Promise.resolve(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  ),
  getCaptureDimensions: jest.fn(() => ({ width: 512, height: 512 })),
}));

const mockUncompleteGoal = jest.fn();
const mockCreateEvidence = jest.fn();
jest.mock("../../../db", () => ({
  EvidenceType: {
    photo: "photo",
    text: "text",
    voice_memo: "voice_memo",
    video: "video",
    link: "link",
    file: "file",
  },
  GoalStatus: { active: "active", completed: "completed" },
  TEXT_EVIDENCE_PREFIX: "content:text;",
  goalsQuery: "goalsQuery",
  stepsByGoalQuery: jest.fn((id: string) => `stepsByGoalQuery-${id}`),
  evidenceByGoalQuery: jest.fn((id: string) => `evidenceByGoalQuery-${id}`),
  badgeByGoalQuery: jest.fn((id: string) => `badgeByGoalQuery-${id}`),
  badgesQuery: "badgesQuery",
  uncompleteGoal: (...args: unknown[]) => mockUncompleteGoal(...args),
  createEvidence: (...args: unknown[]) => mockCreateEvidence(...args),
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

const COMPLETED_STEPS = [
  { id: "step-1", title: "Read docs", status: "completed", ordinal: 0 },
  { id: "step-2", title: "Practice", status: "completed", ordinal: 1 },
  { id: "step-3", title: "Build project", status: "completed", ordinal: 2 },
];

const GOAL_EVIDENCE = [
  {
    id: "ev-1",
    type: "text",
    description: "Reflection on learning",
    uri: "content:text;I learned a lot",
  },
];

const routeProps = {
  route: {
    key: "CompletionFlow-1",
    name: "CompletionFlow" as const,
    params: { goalId: "goal-1" },
  },
  navigation: {} as any,
};

const BADGE_ROW = {
  id: "badge-1",
  goalId: "goal-1",
  credential: '{"@context":"..."}',
  imageUri: "file:///badges/test-badge.png",
  createdAt: "2026-01-01T00:00:00Z",
};

function setupQueries({
  goal = GOAL,
  steps = COMPLETED_STEPS,
  goalEvidence = [] as object[],
  badge = null as object | null,
  allBadges = [] as object[],
}: {
  goal?: object | null;
  steps?: object[];
  goalEvidence?: object[];
  badge?: object | null;
  allBadges?: object[];
} = {}) {
  mockUseQuery.mockImplementation((query: unknown) => {
    if (query === "goalsQuery") return goal ? [goal] : [];
    if (typeof query === "string" && query.startsWith("stepsByGoalQuery"))
      return steps;
    if (typeof query === "string" && query.startsWith("evidenceByGoalQuery"))
      return goalEvidence;
    if (typeof query === "string" && query.startsWith("badgeByGoalQuery"))
      return badge ? [badge] : [];
    if (query === "badgesQuery") return allBadges;
    return [];
  });
}

// --- Tests ---

describe("CompletionFlowScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue([]);
    mockUseCreateBadge.mockReturnValue({ status: "done", error: null });
  });

  describe("evidence prompt phase (no goal evidence)", () => {
    it("shows evidence prompt when no goal evidence exists", () => {
      setupQueries();
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByText("One last thing!")).toBeOnTheScreen();
      expect(screen.getByText(/Capture your achievement/)).toBeOnTheScreen();
    });

    it("shows inline text input for quick note capture", () => {
      setupQueries();
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(
        screen.getByLabelText("Write about your achievement"),
      ).toBeOnTheScreen();
      expect(
        screen.getByText("Write about what you accomplished"),
      ).toBeOnTheScreen();
    });

    it("shows Save Note button (disabled when empty)", () => {
      setupQueries();
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      const saveButton = screen.getByLabelText("Save Note");
      expect(saveButton).toBeOnTheScreen();
      expect(saveButton).toBeDisabled();
    });

    it("shows evidence type chips for other capture methods", () => {
      setupQueries();
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByText("Or capture another way")).toBeOnTheScreen();
      // Text is excluded from chips (handled inline)
      expect(screen.getByLabelText(/Take Photo/)).toBeOnTheScreen();
      expect(screen.getByLabelText(/Record Video/)).toBeOnTheScreen();
      expect(screen.getByLabelText(/Record Voice Memo/)).toBeOnTheScreen();
      expect(screen.getByLabelText(/Add Link/)).toBeOnTheScreen();
      expect(screen.getByLabelText(/Attach File/)).toBeOnTheScreen();
    });

    it("navigates to CapturePhoto when photo chip is tapped", () => {
      setupQueries();
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      fireEvent.press(screen.getByLabelText(/Take Photo/));
      expect(mockNavigate).toHaveBeenCalledWith("CapturePhoto", {
        goalId: "goal-1",
      });
    });

    it("navigates to CaptureVoiceMemo when voice memo chip is tapped", () => {
      setupQueries();
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      fireEvent.press(screen.getByLabelText(/Record Voice Memo/));
      expect(mockNavigate).toHaveBeenCalledWith("CaptureVoiceMemo", {
        goalId: "goal-1",
      });
    });

    it("saves inline text note and calls createEvidence", () => {
      setupQueries();
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      const input = screen.getByLabelText("Write about your achievement");
      fireEvent.changeText(input, "I mastered TypeScript generics!");
      fireEvent.press(screen.getByLabelText("Save Note"));
      expect(mockCreateEvidence).toHaveBeenCalledWith({
        goalId: "goal-1",
        type: "text",
        uri: "content:text;I mastered TypeScript generics!",
        description: undefined,
      });
    });

    it("does not show confetti during evidence prompt phase", () => {
      setupQueries();
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      // "You did it!" is the celebration headline — should not appear
      expect(screen.queryByText("You did it!")).not.toBeOnTheScreen();
    });

    it("does not show Add Final Evidence button during evidence prompt", () => {
      setupQueries();
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(
        screen.queryByLabelText("Add Final Evidence"),
      ).not.toBeOnTheScreen();
    });

    it("has accessible prompt card", () => {
      setupQueries();
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(
        screen.getByLabelText(
          "Almost there! Capture evidence for Learn TypeScript",
        ),
      ).toBeOnTheScreen();
    });
  });

  describe("celebration phase (goal evidence exists)", () => {
    // For tests that target the post-bake action buttons (Add Final
    // Evidence, View Your Journey, Reopen Goal), use a completed goal:
    // that's the state right after Bake It fires + completeGoal flips
    // status. Pre-bake the celebration phase shows the Bake It /
    // Redesign First gate instead — those have their own tests below.
    const POST_BAKE = { ...GOAL, status: "completed" };

    it("shows celebration immediately when goal already has evidence", () => {
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByText("You did it!")).toBeOnTheScreen();
    });

    it("shows correct summary text with step count and goal title", () => {
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(
        screen.getByText("All 3 steps completed for Learn TypeScript"),
      ).toBeOnTheScreen();
    });

    it("shows both action buttons (post-bake state)", () => {
      setupQueries({ goal: POST_BAKE, goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByLabelText("Add Final Evidence")).toBeOnTheScreen();
      expect(screen.getByLabelText(/View Your Journey/)).toBeOnTheScreen();
    });

    it("shows evidence list when evidence exists", () => {
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByText("Goal Evidence Added")).toBeOnTheScreen();
      expect(screen.getByText("Reflection on learning")).toBeOnTheScreen();
    });

    it('navigates to capture screen when "Add Final Evidence" is tapped', () => {
      setupQueries({ goal: POST_BAKE, goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      fireEvent.press(screen.getByLabelText("Add Final Evidence"));
      expect(mockNavigate).toHaveBeenCalledWith("CapturePhoto", {
        goalId: "goal-1",
      });
    });

    it('navigates to TimelineJourney when "View Your Journey" is tapped', () => {
      setupQueries({ goal: POST_BAKE, goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      fireEvent.press(screen.getByLabelText(/View Your Journey/));
      expect(mockNavigate).toHaveBeenCalledWith("TimelineJourney", {
        goalId: "goal-1",
      });
    });

    it("has accessible celebration card with summary", () => {
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(
        screen.getByLabelText(
          "Congratulations! All 3 steps completed for Learn TypeScript",
        ),
      ).toBeOnTheScreen();
    });

    it("shows Reopen Goal button when goal is completed", () => {
      setupQueries({
        goal: { ...GOAL, status: "completed" },
        goalEvidence: GOAL_EVIDENCE,
      });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByLabelText("Reopen Goal")).toBeOnTheScreen();
    });

    it("does not show Reopen Goal button when goal is active", () => {
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.queryByLabelText("Reopen Goal")).not.toBeOnTheScreen();
    });

    it("calls uncompleteGoal and replaces with FocusMode on reopen", () => {
      setupQueries({
        goal: { ...GOAL, status: "completed" },
        goalEvidence: GOAL_EVIDENCE,
      });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      fireEvent.press(screen.getByLabelText("Reopen Goal"));
      expect(mockUncompleteGoal).toHaveBeenCalledWith("goal-1");
      // replace (not navigate) so a back gesture from FocusMode doesn't
      // drop the user back into the celebration screen they just left.
      expect(mockReplace).toHaveBeenCalledWith("FocusMode", {
        goalId: "goal-1",
      });
    });
  });

  describe("shared behavior", () => {
    it('shows "Goal not found" when goal does not exist', () => {
      setupQueries({ goal: null });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByText("Goal not found.")).toBeOnTheScreen();
    });

    it("navigates back when back button is pressed", () => {
      setupQueries();
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      fireEvent.press(screen.getByLabelText("Go back"));
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('renders "Complete" label in top bar and mode indicator', () => {
      setupQueries();
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getAllByText("Complete").length).toBeGreaterThanOrEqual(1);
    });

    it("calls useCreateBadge with the correct goalId", async () => {
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      // The default-design auto-capture waits for onLayout before
      // snapshotting. RN's test renderer doesn't fire layout events
      // automatically, so we dispatch one synthetically.
      fireEvent(
        screen.getByTestId("completion-fallback-capture-host", {
          includeHiddenElements: true,
        }),
        "layout",
        { nativeEvent: { layout: { x: 0, y: 0, width: 160, height: 160 } } },
      );
      // The bake never fires automatically — user must tap Bake It first.
      // Bake It is disabled until the fallback capture promise resolves
      // (hasAnyBakeSource gate). Wait for it to become enabled before tap.
      await waitFor(() =>
        expect(screen.getByLabelText("Bake It")).not.toBeDisabled(),
      );
      fireEvent.press(screen.getByLabelText("Bake It"));
      await waitFor(() =>
        expect(mockUseCreateBadge).toHaveBeenCalledWith(
          "goal-1",
          expect.objectContaining({ enabled: true }),
        ),
      );
    });

    it("passes enabled: false to useCreateBadge during evidence-prompt phase", () => {
      setupQueries(); // no goal evidence => evidence-prompt phase
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(mockUseCreateBadge).toHaveBeenCalledWith(
        "goal-1",
        expect.objectContaining({ enabled: false }),
      );
    });

    it("passes enabled: false to useCreateBadge in celebration phase until user taps Bake It", async () => {
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      fireEvent(
        screen.getByTestId("completion-fallback-capture-host", {
          includeHiddenElements: true,
        }),
        "layout",
        { nativeEvent: { layout: { x: 0, y: 0, width: 160, height: 160 } } },
      );
      // Without tapping Bake It, enabled stays false even after the
      // fallback capture resolves.
      await waitFor(() => {
        const lastCallArgs =
          mockUseCreateBadge.mock.calls[
            mockUseCreateBadge.mock.calls.length - 1
          ];
        expect(lastCallArgs[1]).toMatchObject({ enabled: false });
      });
    });

    it("passes enabled: true to useCreateBadge after Bake It is tapped", async () => {
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      fireEvent(
        screen.getByTestId("completion-fallback-capture-host", {
          includeHiddenElements: true,
        }),
        "layout",
        { nativeEvent: { layout: { x: 0, y: 0, width: 160, height: 160 } } },
      );
      // Bake It is disabled until the fallback capture resolves.
      await waitFor(() =>
        expect(screen.getByLabelText("Bake It")).not.toBeDisabled(),
      );
      fireEvent.press(screen.getByLabelText("Bake It"));
      await waitFor(() =>
        expect(mockUseCreateBadge).toHaveBeenCalledWith(
          "goal-1",
          expect.objectContaining({ enabled: true }),
        ),
      );
    });
  });

  describe("pre-bake choice (Bake It / Redesign First)", () => {
    it("never auto-bakes — even when a pending captured PNG is present, enabled stays false until Bake It is tapped", async () => {
      // Simulates first completion via NewGoal designer: pendingDesignStore
      // had an entry, outer screen consumed it, inner sees pendingCapturedPng.
      // Earlier code auto-confirmed in this scenario; this regression test
      // pins down that the user always has to tap Bake It.
      const {
        pendingDesignStore,
      } = require("../../../stores/pendingDesignStore");
      pendingDesignStore.set("goal-1", {
        designJson: '{"shape":"circle"}',
        pngBase64: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString(
          "base64",
        ),
      });
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      // No Bake It tap. After all microtasks settle, enabled must remain false.
      await waitFor(() => {
        const lastCallArgs =
          mockUseCreateBadge.mock.calls[
            mockUseCreateBadge.mock.calls.length - 1
          ];
        expect(lastCallArgs[1]).toMatchObject({ enabled: false });
      });
      // Sanity: Bake It is still on screen, waiting for the user.
      expect(screen.getByLabelText("Bake It")).toBeOnTheScreen();
    });

    it("forwards the pendingDesignStore entry to useCreateBadge as freshCapturedPng when Bake It is tapped", async () => {
      // Pins the headline contract: the design the user just saved in
      // BadgeDesigner is the one that gets baked. A regression that swaps
      // freshCapturedPng for capturedPng (the offscreen fallback) would
      // silently bake the wrong design.
      const FRESH_BYTES = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 9, 9]);
      const {
        pendingDesignStore,
      } = require("../../../stores/pendingDesignStore");
      pendingDesignStore.set("goal-1", {
        designJson: '{"shape":"triangle"}',
        pngBase64: FRESH_BYTES.toString("base64"),
      });
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      fireEvent.press(screen.getByLabelText("Bake It"));
      await waitFor(() => {
        const lastCallArgs =
          mockUseCreateBadge.mock.calls[
            mockUseCreateBadge.mock.calls.length - 1
          ];
        expect(lastCallArgs[1]).toMatchObject({ enabled: true });
        expect(
          (lastCallArgs[1] as { freshCapturedPng?: Buffer }).freshCapturedPng,
        ).toBeInstanceOf(Buffer);
        expect(
          (lastCallArgs[1] as { freshCapturedPng?: Buffer }).freshCapturedPng,
        ).toEqual(FRESH_BYTES);
      });
    });

    it("renders Bake It AND Redesign First on first completion — the user gets the choice before every bake", () => {
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByLabelText("Bake It")).toBeOnTheScreen();
      expect(screen.getByLabelText("Redesign First")).toBeOnTheScreen();
    });

    it("disables Bake It until a bake source is available — tapping early stays in enabled:false", async () => {
      // First-completion default-design path: no pending PNG, no existing
      // badge, and the offscreen-host onLayout has not fired so fallbackPng
      // stays null. Without disabling the button, an eager tap flips
      // userConfirmedBake → choice UI disappears → post-bake actions render
      // even though useCreateBadge.enabled is still false, letting the user
      // navigate away before the bake fires.
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      const bakeBtn = screen.getByLabelText("Bake It");
      expect(bakeBtn).toBeDisabled();
      fireEvent.press(bakeBtn);
      // Even after the press, the choice UI stays (userConfirmedBake didn't
      // flip), and the hook still sees enabled:false.
      expect(screen.getByLabelText("Bake It")).toBeOnTheScreen();
      const lastArgs = mockUseCreateBadge.mock.calls[
        mockUseCreateBadge.mock.calls.length - 1
      ][1] as { enabled?: boolean };
      expect(lastArgs.enabled).toBe(false);
    });

    it("Redesign First on first completion navigates to new-goal designer with returnVia: 'back'", () => {
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      fireEvent.press(screen.getByLabelText("Redesign First"));
      expect(mockNavigate).toHaveBeenCalledWith("BadgeDesigner", {
        mode: "new-goal",
        goalId: "goal-1",
        returnVia: "back",
      });
    });

    it("hides the choice once the goal is completed (post-bake / view-only)", () => {
      setupQueries({
        goal: { ...GOAL, status: "completed" },
        goalEvidence: GOAL_EVIDENCE,
      });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.queryByLabelText("Bake It")).not.toBeOnTheScreen();
      expect(screen.queryByLabelText("Redesign First")).not.toBeOnTheScreen();
    });

    it("re-consumes pendingDesignStore on refocus (Redesign First → save → back round-trip)", async () => {
      // Initial mount: store is empty, no freshCapturedPng flows to the hook.
      // Then the user goes to BadgeDesigner via Redesign First, saves a new
      // design (which sets pendingDesignStore), and navigates back. On refocus
      // useFocusEffect must re-consume the store so the new PNG is in hand
      // for the next Bake It tap.
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      const initialArgs = mockUseCreateBadge.mock.calls[
        mockUseCreateBadge.mock.calls.length - 1
      ][1] as { freshCapturedPng?: Buffer };
      expect(initialArgs.freshCapturedPng).toBeUndefined();

      const FRESH = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 2, 2]);
      const {
        pendingDesignStore,
      } = require("../../../stores/pendingDesignStore");
      pendingDesignStore.set("goal-1", {
        designJson: '{"shape":"square"}',
        pngBase64: FRESH.toString("base64"),
      });

      await act(async () => {
        lastFocusCallback?.();
      });
      fireEvent.press(screen.getByLabelText("Bake It"));

      await waitFor(() => {
        const lastCall =
          mockUseCreateBadge.mock.calls[
            mockUseCreateBadge.mock.calls.length - 1
          ];
        expect(lastCall[1]).toMatchObject({ enabled: true });
        expect(
          (lastCall[1] as { freshCapturedPng?: Buffer }).freshCapturedPng,
        ).toEqual(FRESH);
      });
    });

    it("Redesign First on re-completion (badge exists) navigates to BadgeDesigner redesign mode", () => {
      // Pre-bake state: hook hasn't completed the bake yet, so status is
      // "idle". Without this the default "done" mock immediately opens
      // the modal and the pre-bake UI is gone.
      mockUseCreateBadge.mockReturnValue({ status: "idle", error: null });
      setupQueries({
        goalEvidence: GOAL_EVIDENCE,
        badge: BADGE_ROW,
        allBadges: [BADGE_ROW],
      });
      // Re-completion lands on evidence-prompt; advance by re-rendering
      // with a higher evidence count so the count-based advance triggers.
      const { rerender } = renderWithProviders(
        <CompletionFlowScreen {...routeProps} />,
      );
      const FRESH_EVIDENCE = [
        ...GOAL_EVIDENCE,
        {
          id: "ev-2",
          type: "text",
          description: "Fresh reflection",
          uri: "content:text;new note",
        },
      ];
      setupQueries({
        goalEvidence: FRESH_EVIDENCE,
        badge: BADGE_ROW,
        allBadges: [BADGE_ROW],
      });
      rerender(<CompletionFlowScreen {...routeProps} />);
      fireEvent.press(screen.getByLabelText("Redesign First"));
      expect(mockNavigate).toHaveBeenCalledWith("BadgeDesigner", {
        mode: "redesign",
        badgeId: "badge-1",
      });
    });
  });

  describe("badge creation lifecycle", () => {
    it("shows loading indicator while badge is being created", () => {
      mockUseCreateBadge.mockReturnValue({ status: "building", error: null });
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByLabelText("Creating your badge...")).toBeOnTheScreen();
    });

    it("shows loading indicator during signing phase", () => {
      mockUseCreateBadge.mockReturnValue({ status: "signing", error: null });
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByLabelText("Creating your badge...")).toBeOnTheScreen();
    });

    it("does not show loading indicator when done", () => {
      mockUseCreateBadge.mockReturnValue({ status: "done", error: null });
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(
        screen.queryByLabelText("Creating your badge..."),
      ).not.toBeOnTheScreen();
    });

    it("shows error message when badge creation fails", () => {
      mockUseCreateBadge.mockReturnValue({
        status: "error",
        error: "crypto unavailable",
      });
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(
        screen.getByLabelText("Badge creation failed: crypto unavailable"),
      ).toBeOnTheScreen();
    });

    it("shows loading indicator during storing phase", () => {
      mockUseCreateBadge.mockReturnValue({ status: "storing", error: null });
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByLabelText("Creating your badge...")).toBeOnTheScreen();
    });

    it("shows loading indicator during baking phase", () => {
      mockUseCreateBadge.mockReturnValue({ status: "baking", error: null });
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByLabelText("Creating your badge...")).toBeOnTheScreen();
    });

    it("shows key unavailable message when status is no-key", () => {
      mockUseCreateBadge.mockReturnValue({ status: "no-key", error: null });
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(
        screen.getByLabelText(
          "Badge could not be created: signing key unavailable",
        ),
      ).toBeOnTheScreen();
    });

    it("still renders celebration content during badge creation", () => {
      mockUseCreateBadge.mockReturnValue({ status: "building", error: null });
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByText("You did it!")).toBeOnTheScreen();
    });

    it("still renders celebration content when status is no-key", () => {
      mockUseCreateBadge.mockReturnValue({ status: "no-key", error: null });
      setupQueries({ goalEvidence: GOAL_EVIDENCE });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByText("You did it!")).toBeOnTheScreen();
    });
  });

  describe("BadgeEarnedModal integration", () => {
    // The modal appears post-bake. Post-bake the goal is `completed`
    // (completeGoal flipped it). Tests use status: "completed" so the
    // pre-bake choice gate is skipped and the bake hook's `done` status
    // (mocked) immediately opens the modal.
    const POST_BAKE = { ...GOAL, status: "completed" };

    it("shows BadgeEarnedModal when badgeStatus is done and badge exists", () => {
      mockUseCreateBadge.mockReturnValue({ status: "done", error: null });
      setupQueries({
        goal: POST_BAKE,
        goalEvidence: GOAL_EVIDENCE,
        badge: BADGE_ROW,
        allBadges: [BADGE_ROW],
      });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByLabelText("Badge earned")).toBeOnTheScreen();
    });

    it("does not show BadgeEarnedModal when badgeStatus is building", () => {
      mockUseCreateBadge.mockReturnValue({ status: "building", error: null });
      setupQueries({
        goal: POST_BAKE,
        goalEvidence: GOAL_EVIDENCE,
        badge: null,
        allBadges: [],
      });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.queryByLabelText("Badge earned")).not.toBeOnTheScreen();
    });

    it("does not show BadgeEarnedModal when no badge row yet", () => {
      mockUseCreateBadge.mockReturnValue({ status: "done", error: null });
      setupQueries({
        goal: POST_BAKE,
        goalEvidence: GOAL_EVIDENCE,
        badge: null,
        allBadges: [],
      });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.queryByLabelText("Badge earned")).not.toBeOnTheScreen();
    });

    it("shows first-badge microcopy when only one badge exists", () => {
      mockUseCreateBadge.mockReturnValue({ status: "done", error: null });
      setupQueries({
        goal: POST_BAKE,
        goalEvidence: GOAL_EVIDENCE,
        badge: BADGE_ROW,
        allBadges: [BADGE_ROW],
      });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByText("First one. (noted.)")).toBeOnTheScreen();
    });

    it("shows neutral microcopy when multiple badges exist", () => {
      const otherBadge = { ...BADGE_ROW, id: "badge-2", goalId: "goal-2" };
      mockUseCreateBadge.mockReturnValue({ status: "done", error: null });
      setupQueries({
        goal: POST_BAKE,
        goalEvidence: GOAL_EVIDENCE,
        badge: BADGE_ROW,
        allBadges: [BADGE_ROW, otherBadge],
      });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByText("Badge earned.")).toBeOnTheScreen();
    });

    it('dismisses modal on "Keep going"', () => {
      mockUseCreateBadge.mockReturnValue({ status: "done", error: null });
      setupQueries({
        goal: POST_BAKE,
        goalEvidence: GOAL_EVIDENCE,
        badge: BADGE_ROW,
        allBadges: [BADGE_ROW],
      });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      fireEvent.press(screen.getByLabelText("Keep going"));
      expect(screen.queryByText("First one. (noted.)")).not.toBeOnTheScreen();
    });

    it('navigates to BadgeDetail via parent tab navigator on "View Badge"', () => {
      mockUseCreateBadge.mockReturnValue({ status: "done", error: null });
      setupQueries({
        goal: POST_BAKE,
        goalEvidence: GOAL_EVIDENCE,
        badge: BADGE_ROW,
        allBadges: [BADGE_ROW],
      });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      fireEvent.press(screen.getByLabelText("View Badge"));
      expect(mockParentNavigate).toHaveBeenCalledWith("BadgesTab", {
        screen: "BadgeDetail",
        params: { badgeId: "badge-1" },
      });
    });

    it("does not re-show BadgeEarnedModal after dismissal and re-render", () => {
      mockUseCreateBadge.mockReturnValue({ status: "done", error: null });
      setupQueries({
        goal: POST_BAKE,
        goalEvidence: GOAL_EVIDENCE,
        badge: BADGE_ROW,
        allBadges: [BADGE_ROW],
      });
      const { rerender } = renderWithProviders(
        <CompletionFlowScreen {...routeProps} />,
      );
      fireEvent.press(screen.getByLabelText("Keep going"));
      expect(screen.queryByLabelText("Badge earned")).not.toBeOnTheScreen();
      rerender(<CompletionFlowScreen {...routeProps} />);
      expect(screen.queryByLabelText("Badge earned")).not.toBeOnTheScreen();
    });
  });
});
