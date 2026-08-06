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
  StepStatus: { pending: "pending", paused: "paused", completed: "completed" },
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
  // Faithful copy of the real helper (empty list is not complete).
  areAllStepsComplete: (rows: readonly { status: string | null }[]) =>
    rows.length > 0 && rows.every((s) => s.status === "completed"),
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
  // Faithful copy of the real resolver (queries.ts), incl. the unresolved-
  // reference and self-reference guards, so the C·B band wiring is exercised
  // against real resolution rules rather than a stub.
  resolveStepDependencyBand: (
    step: {
      id: string;
      afterStepId: string | null;
      waitingOnLabel: string | null;
      waitingOnExpectedAt: string | null;
      dueAt: string | null;
    },
    goalSteps: readonly { id: string; title: string | null }[],
  ) => {
    const afterStep =
      step.afterStepId === null || step.afterStepId === step.id
        ? null
        : (goalSteps.find((s) => s.id === step.afterStepId) ?? null);
    return {
      afterStepTitle: afterStep?.title ?? null,
      waitingOnLabel: step.waitingOnLabel,
      waitingOnExpectedAt: step.waitingOnExpectedAt,
      dueAt: step.dueAt,
    };
  },
  // Faithful copy of the real resolver (queries.ts) so the screen's accent runs
  // real leaf/invite/flat bucketing — including the paused skip (#417) — instead
  // of a stub. Same convention as groupStepsByParent above.
  resolveNextActionableStep: (
    rows: readonly {
      id: string;
      parentStepId: string | null;
      status: string | null;
    }[],
  ) => {
    const rootIds = new Set(
      rows.filter((r) => r.parentStepId == null).map((r) => r.id),
    );
    const childrenByParent = new Map<
      string,
      { index: number; status: string | null }[]
    >();
    const topLevel: { id: string; index: number; status: string | null }[] = [];
    rows.forEach((row, index) => {
      if (row.parentStepId != null && rootIds.has(row.parentStepId)) {
        const list = childrenByParent.get(row.parentStepId);
        if (list) list.push({ index, status: row.status });
        else
          childrenByParent.set(row.parentStepId, [
            { index, status: row.status },
          ]);
      } else {
        topLevel.push({ id: row.id, index, status: row.status });
      }
    });
    for (const step of topLevel) {
      const children = childrenByParent.get(step.id) ?? [];
      const pendingChild = children.find(
        (c) => c.status !== "completed" && c.status !== "paused",
      );
      if (pendingChild) {
        return {
          kind: "leaf",
          index: pendingChild.index,
          parentIndex: step.index,
        };
      }
      if (step.status === "completed" || step.status === "paused") continue;
      if (children.length > 0) {
        return {
          kind: "invite",
          index: step.index,
          childCount: children.length,
        };
      }
      return { kind: "flat", index: step.index };
    }
    return { kind: "none" };
  },
  // Faithful copy of the index collapse every actionable kind goes through.
  resolveActionableIndex: (result: { kind: string; index?: number }) =>
    result.kind === "none" ? null : (result.index ?? null),
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

// The first non-completed row is paused ("set aside", #417) — it must neither
// take the in-progress accent nor render as pending.
const STEPS_WITH_PAUSED = [
  {
    id: "step-1",
    title: "Done thing",
    status: "completed",
    ordinal: 0,
    parentStepId: null,
  },
  {
    id: "step-2",
    title: "Set aside thing",
    status: "paused",
    ordinal: 1,
    parentStepId: null,
  },
  {
    id: "step-3",
    title: "Next thing",
    status: "pending",
    ordinal: 2,
    parentStepId: null,
  },
];

// Fixed local-time noon (no trailing `Z`) so the formatted-date assertions
// depend on neither the runner's clock nor its timezone — mirrors the same
// guard in utils/__tests__/format.test.ts.
const BAND_ISO = "2026-01-28T12:00:00";
const BAND_ISO_FORMATTED = "Jan 28, 2026";

/** A step row with every #454 dependency/due column explicitly unset. */
const bandStep = (over: Record<string, unknown>) => ({
  status: "completed",
  ordinal: 0,
  parentStepId: null,
  afterStepId: null,
  waitingOnLabel: null,
  waitingOnExpectedAt: null,
  dueAt: null,
  ...over,
});

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

  describe("honest breakdown bar (#451)", () => {
    it("names each bucket instead of a bare completed/total ratio", () => {
      setupQueries();
      renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
      // 2 completed + the in-progress accent on step-3 + 1 still pending.
      expect(screen.getByText("2 done")).toBeOnTheScreen();
      expect(screen.getByText("1 in motion")).toBeOnTheScreen();
      expect(screen.getByText("1 to come")).toBeOnTheScreen();
      // The replaced bare ratio is gone.
      expect(screen.queryByText(/of 4 steps completed/)).toBeNull();
    });

    it("drops the set-aside chip when nothing is paused", () => {
      setupQueries();
      renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
      expect(screen.queryByText(/set aside/)).toBeNull();
    });

    it("counts paused steps into their own set-aside bucket", () => {
      setupQueries({ steps: STEPS_WITH_PAUSED });
      renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
      expect(screen.getByText("1 done")).toBeOnTheScreen();
      expect(screen.getByText("1 in motion")).toBeOnTheScreen();
      expect(screen.getByText("1 set aside")).toBeOnTheScreen();
      // ...and it is NOT double-counted as pending.
      expect(screen.queryByText(/to come/)).toBeNull();
    });
  });

  it("renders timeline steps", () => {
    setupQueries();
    renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
    expect(screen.getByText("Read docs")).toBeOnTheScreen();
    expect(screen.getByText("Practice types")).toBeOnTheScreen();
    expect(screen.getByText("Build project")).toBeOnTheScreen();
    expect(screen.getByText("Write tests")).toBeOnTheScreen();
  });

  it('renders the finish line\'s "Finish & design badge" CTA', () => {
    setupQueries();
    renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
    expect(screen.getByText("Finish & design badge")).toBeOnTheScreen();
  });

  it('navigates to CompletionFlow when the "Finish & design badge" CTA is tapped', () => {
    setupQueries();
    renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
    fireEvent.press(screen.getByLabelText("Finish and design your badge"));
    expect(mockNavigate).toHaveBeenCalledWith("CompletionFlow", {
      goalId: "goal-1",
    });
  });

  it("shows goal evidence in finish line", () => {
    setupQueries({ goalEvidence: GOAL_EVIDENCE });
    renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
    expect(screen.getByText("Reflection note")).toBeOnTheScreen();
  });

  it("renders no goal-evidence absence copy when there is none (#452 D8)", () => {
    setupQueries();
    renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
    expect(screen.queryByText(/no goal evidence/i)).toBeNull();
  });

  it('"Back to Focus" navigates to FocusMode', () => {
    setupQueries();
    renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
    fireEvent.press(screen.getByLabelText("Back to Focus"));
    expect(mockNavigate).toHaveBeenCalledWith("FocusMode", {
      goalId: "goal-1",
    });
  });

  it('"Edit ›" navigates to EditMode for this goal', () => {
    setupQueries();
    renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
    fireEvent.press(screen.getByLabelText("Edit ›"));
    // No cameFromFocus — this entry is from the Timeline, not Focus (D5).
    expect(mockNavigate).toHaveBeenCalledWith("EditMode", { goalId: "goal-1" });
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

  it("step node press navigates to FocusMode with the tapped step's id", () => {
    setupQueries();
    renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
    fireEvent.press(screen.getByLabelText("Go to step 1: Read docs"));
    expect(mockNavigate).toHaveBeenCalledWith("FocusMode", {
      goalId: "goal-1",
      stepId: "step-1",
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

  describe("paused steps (#417)", () => {
    it("never takes the in-progress accent, even as the first non-completed row", () => {
      setupQueries({ steps: STEPS_WITH_PAUSED });
      renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
      expect(screen.getAllByText("Working")).toHaveLength(1);
      // The accent skips the paused row and lands on the next pending one.
      expect(screen.getByLabelText("Next thing, Working")).toBeOnTheScreen();
      expect(screen.queryByLabelText("Set aside thing, Working")).toBeNull();
    });

    it('renders in the "paused" state language, not "pending"', () => {
      setupQueries({ steps: STEPS_WITH_PAUSED });
      renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
      // Pill + a11y label read the paused word ("Set aside", #453) — the step's
      // title happens to be "Set aside thing", hence the doubled label...
      expect(
        screen.getByLabelText("Set aside thing, Set aside"),
      ).toBeOnTheScreen();
      expect(screen.queryByLabelText("Set aside thing, Up next")).toBeNull();
      // ...and the node paints the shared paused marker from stepStateColorMap
      // (#406) rather than its step number. A Phosphor icon since Rule 8: the
      // previous `⏸` rendered in the platform emoji font and ignored the theme.
      expect(
        screen.getByTestId("timeline-node-state-icon-paused"),
      ).toBeOnTheScreen();
      expect(screen.queryByText("⏸")).toBeNull();
    });
  });

  describe("dependency + due-date band (#454)", () => {
    const GROUNDWORK = bandStep({ id: "step-a", title: "Groundwork" });

    test.each([
      ["after (internal dependency)", { afterStepId: "step-a" }, "after Groundwork"], // prettier-ignore
      [
        "waiting on + expected",
        { waitingOnLabel: "Alex", waitingOnExpectedAt: BAND_ISO },
        `waiting on Alex · expected ${BAND_ISO_FORMATTED}`,
      ],
      ["due date", { dueAt: BAND_ISO }, `due ${BAND_ISO_FORMATTED}`],
    ])("renders the %s line from real columns", (_name, columns, expected) => {
      setupQueries({
        steps: [
          GROUNDWORK,
          bandStep({ id: "step-b", title: "The work", ...columns }),
        ],
      });
      renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
      expect(screen.getByText(expected)).toBeOnTheScreen();
    });

    it("renders no band line when none of the three columns is set", () => {
      setupQueries({
        steps: [GROUNDWORK, bandStep({ id: "step-b", title: "The work" })],
      });
      renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
      expect(screen.queryByText(/^(after|waiting on|due) /)).toBeNull();
    });

    it("never renders a band on a sub-step, even with the columns set", () => {
      // Children carry no C/B band (#407 OQ-2) — the screen must not pass these
      // fields down, so a sub-step with real columns stays band-free.
      setupQueries({
        steps: [
          bandStep({ id: "parent", title: "Parent", status: "pending" }),
          bandStep({
            id: "child",
            title: "Child",
            status: "pending",
            parentStepId: "parent",
            waitingOnLabel: "Sam",
            dueAt: BAND_ISO,
          }),
        ],
      });
      renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
      expect(screen.getByText("Child")).toBeOnTheScreen();
      expect(screen.queryByText(/waiting on Sam/)).toBeNull();
      expect(screen.queryByText(`due ${BAND_ISO_FORMATTED}`)).toBeNull();
    });
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
      // The in-progress accent surfaces as a single "Working" state word.
      expect(screen.getAllByText("Working")).toHaveLength(1);
      // ...and it is the first child, not the parent or the second child.
      const firstChild = screen.getByLabelText("Sub-step a: First sub-step");
      expect(within(firstChild).getByText("Working")).toBeOnTheScreen();
    });

    it("counts every unit (parents + children) in the breakdown buckets", () => {
      setupQueries({ steps: STEPS_WITH_CHILDREN });
      renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
      // 3 rows (1 parent + 2 children): the accent leaf in motion, the other
      // two to come. The buckets sum to stepRows.length, not to the roots.
      expect(screen.getByText("1 in motion")).toBeOnTheScreen();
      expect(screen.getByText("2 to come")).toBeOnTheScreen();
      expect(screen.queryByText(/done/)).toBeNull();
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
      expect(screen.getAllByText("Working")).toHaveLength(1);
      const child = screen.getByLabelText("Sub-step a: Still open");
      expect(within(child).getByText("Working")).toBeOnTheScreen();
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
      expect(screen.getAllByText("Working")).toHaveLength(1);
      expect(screen.getByLabelText("Open parent, Working")).toBeOnTheScreen();
    });

    it("never accents a paused sub-step, even as the first non-completed leaf", () => {
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
            title: "Set aside sub",
            status: "paused",
            ordinal: 0,
            parentStepId: "p",
          },
          {
            id: "c2",
            title: "Open sub",
            status: "pending",
            ordinal: 1,
            parentStepId: "p",
          },
        ],
      });
      renderWithProviders(<TimelineJourneyScreen {...routeProps} />);
      expect(screen.getAllByText("Working")).toHaveLength(1);
      // The accent skips the paused first child and lands on the second.
      const openSub = screen.getByLabelText("Sub-step b: Open sub");
      expect(within(openSub).getByText("Working")).toBeOnTheScreen();
      const pausedSub = screen.getByLabelText("Sub-step a: Set aside sub");
      expect(within(pausedSub).getByText("Set aside")).toBeOnTheScreen();
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
      expect(screen.queryAllByText("Working")).toHaveLength(0);
    });
  });
});
