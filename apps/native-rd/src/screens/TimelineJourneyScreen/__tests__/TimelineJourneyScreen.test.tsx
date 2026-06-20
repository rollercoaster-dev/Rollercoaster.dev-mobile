import React from "react";
import {
  renderWithProviders,
  screen,
  fireEvent,
  within,
} from "../../../__tests__/test-utils";
import { TimelineJourneyScreen } from "../TimelineJourneyScreen";

// --- Mocks ---

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockParentNavigate = jest.fn();
// Controllable so a test can simulate "no tab parent" via
// mockGetParent.mockReturnValueOnce(undefined) — matches the
// BadgeDetailScreen test pattern for the same defensive branch.
const mockGetParent = jest.fn(() => ({ navigate: mockParentNavigate }));
jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual("../../../__tests__/mocks/navigation");
  return {
    ...actual,
    useNavigation: jest.fn(() => ({
      ...actual.useNavigation(),
      goBack: mockGoBack,
      navigate: mockNavigate,
      getParent: mockGetParent,
    })),
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
  goalsQuery: "goalsQuery",
  stepsByGoalQuery: jest.fn((id: string) => `stepsByGoalQuery-${id}`),
  evidenceByGoalQuery: jest.fn((id: string) => `evidenceByGoalQuery-${id}`),
  evidenceByStepQuery: jest.fn((id: string) => `evidenceByStepQuery-${id}`),
  stepEvidenceByGoalQuery: jest.fn(
    (id: string) => `stepEvidenceByGoalQuery-${id}`,
  ),
  findFirstPendingIndex: (rows: { status: string | null }[]) =>
    rows.findIndex((s) => s.status === "pending"),
  // Faithful copy of the real helper (orphan/grandchild promotion) so the
  // screen's grouping + current-leaf calc runs as real code, not stubbed.
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
}));

const mockUseQuery = jest.fn();
jest.mock("@evolu/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  EvoluProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// --- Test Data ---

const GOAL = {
  id: "goal-1",
  title: "Learn TypeScript",
  description: "Master the type system",
  status: "active",
};

const MIXED_STEPS = [
  { id: "step-1", title: "Read docs", status: "completed", ordinal: 0 },
  { id: "step-2", title: "Practice types", status: "completed", ordinal: 1 },
  { id: "step-3", title: "Build project", status: "pending", ordinal: 2 },
  { id: "step-4", title: "Write tests", status: "pending", ordinal: 3 },
];

// One parent with two sub-steps (the flat query order the screen groups). All
// pending so the current leaf is the first child (#293).
const STEPS_WITH_CHILDREN = [
  {
    id: "parent-1",
    title: "Parent step",
    status: "pending",
    ordinal: 0,
    parentStepId: null,
  },
  {
    id: "child-1",
    title: "First sub-step",
    status: "pending",
    ordinal: 0,
    parentStepId: "parent-1",
  },
  {
    id: "child-2",
    title: "Second sub-step",
    status: "pending",
    ordinal: 1,
    parentStepId: "parent-1",
  },
];

const STEP_EVIDENCE = [
  {
    id: "ev-1",
    type: "photo",
    description: "Photo proof",
    uri: "/photo.jpg",
    stepId: "step-1",
  },
];

const GOAL_EVIDENCE = [
  {
    id: "ev-g1",
    type: "text",
    description: "Reflection note",
    uri: "content:text;note",
  },
];

const routeProps = {
  route: {
    key: "TimelineJourney-1",
    name: "TimelineJourney" as const,
    params: { goalId: "goal-1" },
  },
  navigation: {} as any,
};

function setupQueries({
  goal = GOAL,
  steps = MIXED_STEPS,
  goalEvidence = [] as object[],
  stepEvidence = [] as object[],
}: {
  goal?: object | null;
  steps?: object[];
  goalEvidence?: object[];
  stepEvidence?: object[];
} = {}) {
  mockUseQuery.mockImplementation((query: unknown) => {
    if (query === "goalsQuery") return goal ? [goal] : [];
    if (typeof query === "string" && query.startsWith("stepsByGoalQuery"))
      return steps;
    if (typeof query === "string" && query.startsWith("evidenceByGoalQuery"))
      return goalEvidence;
    if (
      typeof query === "string" &&
      query.startsWith("stepEvidenceByGoalQuery")
    )
      return stepEvidence;
    if (typeof query === "string" && query.startsWith("evidenceByStepQuery"))
      return stepEvidence;
    return [];
  });
}

// --- Tests ---

describe("TimelineJourneyScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue([]);
  });

  it("renders goal title and description", () => {
    setupQueries();
    renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
    expect(screen.getByText("Learn TypeScript")).toBeOnTheScreen();
    expect(screen.getByText("Master the type system")).toBeOnTheScreen();
  });

  it('renders "Timeline" label in top bar and mode indicator', () => {
    setupQueries();
    renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
    expect(screen.getAllByText("Timeline").length).toBeGreaterThanOrEqual(1);
  });

  it("shows progress bar and completion label", () => {
    setupQueries();
    renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
    expect(screen.getByText("2 of 4 steps completed")).toBeOnTheScreen();
  });

  it("renders timeline steps", () => {
    setupQueries();
    renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
    expect(screen.getByText("Read docs")).toBeOnTheScreen();
    expect(screen.getByText("Practice types")).toBeOnTheScreen();
    expect(screen.getByText("Build project")).toBeOnTheScreen();
    expect(screen.getByText("Write tests")).toBeOnTheScreen();
  });

  it('renders finish line with "Goal Evidence" heading', () => {
    setupQueries();
    renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
    expect(screen.getByText("Goal Evidence")).toBeOnTheScreen();
  });

  it("shows goal evidence in finish line", () => {
    setupQueries({ goalEvidence: GOAL_EVIDENCE });
    renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
    expect(screen.getByText("Reflection note")).toBeOnTheScreen();
  });

  it('shows "No goal evidence yet" when no goal evidence', () => {
    setupQueries();
    renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
    expect(screen.getByText("No goal evidence yet")).toBeOnTheScreen();
  });

  it('"Back to Focus" navigates to FocusMode', () => {
    setupQueries();
    renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
    fireEvent.press(screen.getByLabelText("Back to Focus"));
    expect(mockNavigate).toHaveBeenCalledWith("FocusMode", {
      goalId: "goal-1",
    });
  });

  it("back button navigates back", () => {
    setupQueries();
    renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
    fireEvent.press(screen.getByLabelText("Go back"));
    expect(mockGoBack).toHaveBeenCalled();
    // Pin the no-origin baseline: a future refactor that inverts the
    // `if (originBadgeId)` branch would otherwise still pass this test.
    expect(mockParentNavigate).not.toHaveBeenCalled();
  });

  it("step node press navigates to FocusMode", () => {
    setupQueries();
    renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
    fireEvent.press(screen.getByLabelText("Go to step 1: Read docs"));
    expect(mockNavigate).toHaveBeenCalledWith("FocusMode", {
      goalId: "goal-1",
    });
  });

  it('shows "Goal not found" when goal missing', () => {
    setupQueries({ goal: null });
    renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
    expect(screen.getByText("Goal not found.")).toBeOnTheScreen();
  });

  describe("origin = badge", () => {
    const badgeRouteProps = {
      ...routeProps,
      route: {
        ...routeProps.route,
        params: { goalId: "goal-1", originBadgeId: "badge-7" },
      },
    };

    it('relabels the back button to "Back to Badge"', () => {
      setupQueries();
      renderWithProviders(<TimelineJourneyScreen {...badgeRouteProps} />);
      expect(screen.getByLabelText("Back to Badge")).toBeOnTheScreen();
      expect(screen.queryByLabelText("Back to Focus")).toBeNull();
    });

    it("back button hops to BadgesTab/BadgeDetail with the origin badgeId", () => {
      setupQueries();
      renderWithProviders(<TimelineJourneyScreen {...badgeRouteProps} />);
      fireEvent.press(screen.getByLabelText("Back to Badge"));
      expect(mockParentNavigate).toHaveBeenCalledWith("BadgesTab", {
        screen: "BadgeDetail",
        params: { badgeId: "badge-7" },
        initial: false,
      });
      // Should NOT fall through to the FocusMode path.
      expect(mockNavigate).not.toHaveBeenCalledWith(
        "FocusMode",
        expect.anything(),
      );
    });

    it("header back arrow also hops to BadgesTab/BadgeDetail", () => {
      setupQueries();
      renderWithProviders(<TimelineJourneyScreen {...badgeRouteProps} />);
      fireEvent.press(screen.getByLabelText("Go back"));
      expect(mockParentNavigate).toHaveBeenCalledWith("BadgesTab", {
        screen: "BadgeDetail",
        params: { badgeId: "badge-7" },
        initial: false,
      });
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it("falls back to FocusMode when no tab parent is available", () => {
      // Deep link / modal host / Storybook: getParent() returns undefined and
      // we must not leave the button inert.
      mockGetParent.mockReturnValueOnce(
        undefined as unknown as ReturnType<typeof mockGetParent>,
      );
      setupQueries();
      renderWithProviders(<TimelineJourneyScreen {...badgeRouteProps} />);
      fireEvent.press(screen.getByLabelText("Back to Badge"));
      expect(mockNavigate).toHaveBeenCalledWith("FocusMode", {
        goalId: "goal-1",
      });
    });

    it("header back falls back to goBack() when no tab parent is available", () => {
      // Same defensive branch as the in-body button, but the header arrow
      // falls through to goBack() (not FocusMode) — pinning the divergence.
      mockGetParent.mockReturnValueOnce(
        undefined as unknown as ReturnType<typeof mockGetParent>,
      );
      setupQueries();
      renderWithProviders(<TimelineJourneyScreen {...badgeRouteProps} />);
      fireEvent.press(screen.getByLabelText("Go back"));
      expect(mockGoBack).toHaveBeenCalled();
      expect(mockParentNavigate).not.toHaveBeenCalled();
    });
  });

  it("shows step evidence when expanded", () => {
    setupQueries({ stepEvidence: STEP_EVIDENCE });
    renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
    // Expand first step
    fireEvent.press(screen.getByLabelText("Read docs, Done"));
    expect(screen.getByText("Photo proof")).toBeOnTheScreen();
  });

  describe("sub-steps", () => {
    it("groups flat rows and renders the parent with its sub-steps", () => {
      setupQueries({ steps: STEPS_WITH_CHILDREN });
      renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
      expect(screen.getByText("Parent step")).toBeOnTheScreen();
      expect(screen.getByText("First sub-step")).toBeOnTheScreen();
      expect(screen.getByText("Second sub-step")).toBeOnTheScreen();
    });

    it("marks exactly one node in-progress — the first pending leaf", () => {
      setupQueries({ steps: STEPS_WITH_CHILDREN });
      renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
      // The in-progress accent surfaces as a single "Active" status badge.
      expect(screen.getAllByText("Active")).toHaveLength(1);
      // ...and it is the first child, not the parent or the second child.
      const firstChild = screen.getByLabelText("Sub-step a: First sub-step");
      expect(within(firstChild).getByText("Active")).toBeOnTheScreen();
    });

    it("counts every unit (parents + children) in the progress label", () => {
      setupQueries({ steps: STEPS_WITH_CHILDREN });
      renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
      expect(screen.getByText("0 of 3 steps completed")).toBeOnTheScreen();
    });

    // A manually-completed parent does NOT hide a still-pending child — the
    // pending leaf stays current (completion is per-step, not cascaded). This is
    // the branch that makes findCurrentLeafId diverge from the prototype's
    // nextInfo; it mirrors FocusMode's findFirstPendingLeafIndex (#292/#293).
    it("keeps a pending child current even when its parent is completed", () => {
      setupQueries({
        steps: [
          {
            id: "p",
            title: "Done parent",
            status: "completed",
            ordinal: 0,
            parentStepId: null,
          },
          {
            id: "c1",
            title: "Still open",
            status: "pending",
            ordinal: 0,
            parentStepId: "p",
          },
        ],
      });
      renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
      // Exactly one accent, and it is the child — not the completed parent.
      expect(screen.getAllByText("Active")).toHaveLength(1);
      const child = screen.getByLabelText("Sub-step a: Still open");
      expect(within(child).getByText("Active")).toBeOnTheScreen();
      expect(screen.getByLabelText("Done parent, Done")).toBeOnTheScreen();
    });

    // Invite state: all children done but the parent is still open, so the
    // parent itself becomes the current accent (it is never auto-completed).
    it("marks the parent current in the invite state (all children done)", () => {
      setupQueries({
        steps: [
          {
            id: "p",
            title: "Open parent",
            status: "pending",
            ordinal: 0,
            parentStepId: null,
          },
          {
            id: "c1",
            title: "Sub done",
            status: "completed",
            ordinal: 0,
            parentStepId: "p",
          },
          {
            id: "c2",
            title: "Sub also done",
            status: "completed",
            ordinal: 1,
            parentStepId: "p",
          },
        ],
      });
      renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
      // The single accent sits on the parent header, not on either done child.
      expect(screen.getAllByText("Active")).toHaveLength(1);
      expect(screen.getByLabelText("Open parent, Active")).toBeOnTheScreen();
    });

    it("shows no in-progress accent when every step is completed", () => {
      setupQueries({
        steps: [
          {
            id: "p",
            title: "Done parent",
            status: "completed",
            ordinal: 0,
            parentStepId: null,
          },
          {
            id: "c1",
            title: "Done child",
            status: "completed",
            ordinal: 0,
            parentStepId: "p",
          },
        ],
      });
      renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
      expect(screen.queryAllByText("Active")).toHaveLength(0);
    });
  });
});
