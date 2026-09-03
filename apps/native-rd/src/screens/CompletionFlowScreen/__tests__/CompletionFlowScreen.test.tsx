import React from "react";
import { Buffer } from "buffer";
import {
  renderWithProviders,
  screen,
  fireEvent,
  waitFor,
  act,
} from "../../../__tests__/test-utils";
import { CompletionFlowScreen } from "../CompletionFlowScreen";
import { mapBakeStatus } from "../finishStageCopy";
import type { BadgeDesign } from "../../../badges/types";
import { i18n } from "../../../i18n";

// --- Mocks ---

const mockNavigate = jest.fn();
const mockPopToTop = jest.fn();
const mockParentNavigate = jest.fn();
let mockGetParentResult: { navigate: jest.Mock } | undefined = undefined;
jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual("../../../__tests__/mocks/navigation");
  return {
    ...actual,
    useNavigation: jest.fn(() => ({
      ...actual.useNavigation(),
      navigate: mockNavigate,
      popToTop: mockPopToTop,
      getParent: () => mockGetParentResult,
    })),
  };
});

jest.mock("../../../hooks/useAnimationPref", () => ({
  useAnimationPref: jest.fn(() => ({
    animationPref: "none",
    shouldAnimate: false,
    shouldReduceMotion: true,
    setAnimationPref: jest.fn(),
  })),
}));

const mockRetryBake = jest.fn();
const mockUseCreateBadge = jest.fn<
  { status: string; error: string | null; retryBake: () => void },
  [string, { enabled?: boolean; design?: unknown; freshCapturedPng?: unknown }]
>(() => ({ status: "idle", error: null, retryBake: mockRetryBake }));
jest.mock("../../../hooks/useCreateBadge", () => ({
  PLACEHOLDER_IMAGE_URI: "pending:baked-image",
  useCreateBadge: (goalId: string, opts: Record<string, unknown>) =>
    mockUseCreateBadge(goalId, opts),
}));

// BadgeRenderer is forwardRef'd in production — the stub must forward the ref
// and attach a fake handle too, otherwise previewRef.current stays null and
// the bake-time capture path can never be exercised.
jest.mock("../../../badges/BadgeRenderer", () => {
  const ReactRuntime = require("react");
  const { Buffer: BufferRuntime } = require("buffer");
  return {
    BadgeRenderer: ReactRuntime.forwardRef(
      (_props: unknown, ref: React.Ref<unknown>) => {
        ReactRuntime.useImperativeHandle(
          ref,
          () => ({
            captureAsPng: () =>
              Promise.resolve(
                BufferRuntime.from([137, 80, 78, 71, 13, 10, 26, 10]),
              ),
          }),
          [],
        );
        return null;
      },
    ),
    getRendererLayoutOptions: () => ({ strokeWidth: 3, hasShadow: false }),
  };
});

const CAPTURED_PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
let mockCaptureBadgeImpl: (() => Promise<Buffer>) | undefined;
const mockCaptureBadge = jest.fn<Promise<Buffer>, unknown[]>(() =>
  mockCaptureBadgeImpl ? mockCaptureBadgeImpl() : Promise.resolve(CAPTURED_PNG),
);
// Typed on its first arg so the "captures the edited design" assertion can read
// the design that was actually handed to the capture pipeline.
const mockGetCaptureDimensions = jest.fn<
  { width: number; height: number },
  [BadgeDesign, ...unknown[]]
>(() => ({ width: 512, height: 512 }));
jest.mock("../../../badges/captureBadge", () => ({
  captureBadge: (...args: unknown[]) => mockCaptureBadge(...args),
  getCaptureDimensions: (design: unknown, ...rest: unknown[]) =>
    mockGetCaptureDimensions(design as BadgeDesign, ...rest),
}));

// Rendering the real reanimated-color-picker is out of scope for a screen
// test (and its native-props whitelist call blows up under jest). Same stub
// FinishDesignStage's own test uses.
jest.mock("../../../badges/ColorPickerModal", () => ({
  ColorPickerModal: () => null,
}));

const mockCreateEvidence = jest.fn();
jest.mock("../../../db", () => ({
  EvidenceType: { photo: "photo", text: "text" },
  TEXT_EVIDENCE_PREFIX: "content:text;",
  goalsQuery: "goalsQuery",
  stepsByGoalQuery: jest.fn((id: string) => `stepsByGoalQuery-${id}`),
  stepEvidenceByGoalQuery: jest.fn(
    (id: string) => `stepEvidenceByGoalQuery-${id}`,
  ),
  badgeByGoalQuery: jest.fn((id: string) => `badgeByGoalQuery-${id}`),
  createEvidence: (...args: unknown[]) => mockCreateEvidence(...args),
  GoalStatus: { active: "active", completed: "completed" },
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
  color: "#c026d3",
  design: null,
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
  completedAt: "2026-02-03T00:00:00.000Z",
};

// `plannedEvidenceTypes` is null on both, which resolves to the default plan of
// one text note (#466 D4) — so one text row per step satisfies the bake gate.
const STEPS = [
  {
    id: "step-1",
    title: "Read docs",
    status: "completed",
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

/** Step-scoped evidence rows as `stepEvidenceByGoalQuery` returns them. */
const stepNote = (stepId: string, type = "text") => ({
  id: `evidence-${stepId}-${type}`,
  stepId,
  type,
  uri: "content:text;done",
});

/** Every step in STEPS carrying the one text note its default plan asks for. */
const SATISFYING_EVIDENCE = STEPS.map((step) => stepNote(step.id));

const BADGE_ROW = {
  id: "badge-1",
  goalId: "goal-1",
  credential: "{}",
  imageUri: "file:///badges/test-badge.png",
};

const routeProps = {
  route: {
    key: "CompletionFlow-1",
    name: "CompletionFlow" as const,
    params: { goalId: "goal-1" },
  },
  navigation: {} as never,
};

function setupQueries({
  goal = GOAL as object | null,
  steps = STEPS as object[],
  stepEvidence = SATISFYING_EVIDENCE as object[],
  badge = null as object | null,
} = {}) {
  mockUseQuery.mockImplementation((query: unknown) => {
    if (query === "goalsQuery") return goal ? [goal] : [];
    if (typeof query === "string" && query.startsWith("stepsByGoalQuery"))
      return steps;
    if (
      typeof query === "string" &&
      query.startsWith("stepEvidenceByGoalQuery")
    )
      return stepEvidence;
    if (typeof query === "string" && query.startsWith("badgeByGoalQuery"))
      return badge ? [badge] : [];
    return [];
  });
}

// i18n.t's key union is literal-typed; these assertions build keys as plain
// strings, so the function itself is re-typed once here rather than casting at
// every call site.
const t = i18n.t as unknown as (
  key: string,
  opts?: Record<string, unknown>,
) => string;

/** celebrate → design. */
const goToDesign = () =>
  fireEvent.press(screen.getByTestId("finish-celebrate-cta"));

/** design → baking, awaiting the capture promise that gates the transition. */
const pressBake = async () => {
  fireEvent.press(screen.getByTestId("finish-design-bake"));
  await waitFor(() =>
    expect(screen.getByTestId("finish-baking-stage")).toBeOnTheScreen(),
  );
};

// --- Tests ---

describe("CompletionFlowScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCaptureBadgeImpl = undefined;
    mockGetCaptureDimensions.mockReturnValue({ width: 512, height: 512 });
    mockGetParentResult = { navigate: mockParentNavigate };
    mockUseCreateBadge.mockReturnValue({
      status: "idle",
      error: null,
      retryBake: mockRetryBake,
    });
    setupQueries();
  });

  describe("stage transitions", () => {
    it("opens on the celebrate stage — never the old evidence-prompt UI", () => {
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);

      expect(screen.getByTestId("finish-celebrate-stage")).toBeOnTheScreen();
      expect(
        screen.getByText(t("completion:finish.celebrate.headline")),
      ).toBeOnTheScreen();
      expect(screen.queryByTestId("finish-design-stage")).toBeNull();
    });

    it("threads the goal title and step count into the celebrate summary", () => {
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);

      expect(
        screen.getByText(
          t("completion:finish.celebrate.summary", {
            count: STEPS.length,
            title: GOAL.title,
          }),
        ),
      ).toBeOnTheScreen();
    });

    it("uses the no-steps summary when the goal has no steps", () => {
      setupQueries({ steps: [] });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);

      expect(
        screen.getByText(
          t("completion:finish.celebrate.summaryNoSteps", {
            title: GOAL.title,
          }),
        ),
      ).toBeOnTheScreen();
    });

    it("advances celebrate → design on the CTA", () => {
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      goToDesign();

      expect(screen.getByTestId("finish-design-stage")).toBeOnTheScreen();
      expect(screen.queryByTestId("finish-celebrate-stage")).toBeNull();
    });

    it("returns design → celebrate on the back chevron", () => {
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      goToDesign();
      fireEvent.press(screen.getByTestId("finish-design-back"));

      expect(screen.getByTestId("finish-celebrate-stage")).toBeOnTheScreen();
    });

    it("advances design → baking once the capture resolves", async () => {
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      goToDesign();
      await pressBake();

      expect(screen.queryByTestId("finish-design-stage")).toBeNull();
    });

    it("advances baking → reveal after the success hold", async () => {
      jest.useFakeTimers();
      try {
        mockUseCreateBadge.mockReturnValue({
          status: "done",
          error: null,
          retryBake: mockRetryBake,
        });
        setupQueries({ badge: BADGE_ROW });
        renderWithProviders(<CompletionFlowScreen {...routeProps} />);
        goToDesign();

        fireEvent.press(screen.getByTestId("finish-design-bake"));
        await act(async () => {});
        expect(screen.getByTestId("finish-baking-stage")).toBeOnTheScreen();

        await act(async () => {
          jest.runAllTimers();
        });
        expect(screen.getByTestId("finish-reveal-stage")).toBeOnTheScreen();
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe("bake gate (#635)", () => {
    it("blocks Bake when no step has captured its planned evidence", () => {
      setupQueries({ stepEvidence: [] });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      goToDesign();

      expect(screen.getByTestId("finish-design-bake")).toBeDisabled();
      // Both steps are outstanding, and the copy says so rather than restating
      // the rule.
      expect(
        screen.getByTestId("finish-design-bake-blocked"),
      ).toHaveTextContent(
        t("completion:finish.design.bakeBlockedMessage", { count: 2 }),
      );
    });

    it("names a single outstanding step in the singular", () => {
      setupQueries({ stepEvidence: [stepNote("step-1")] });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      goToDesign();

      expect(
        screen.getByTestId("finish-design-bake-blocked"),
      ).toHaveTextContent(
        t("completion:finish.design.bakeBlockedMessage", { count: 1 }),
      );
    });

    // The closing note is goal-scoped. Feeding the gate `stepEvidenceByGoalQuery`
    // rather than a mixed array is what keeps it from unblocking anything, and a
    // row with a null stepId is what a switch to `evidenceByGoalQuery` would
    // deliver here (#635 D1, pinned against the old `canCompleteGoal` floor).
    it("stays blocked when the only evidence is goal-scoped", () => {
      setupQueries({
        stepEvidence: [{ ...stepNote("step-1"), stepId: null }],
      });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      goToDesign();

      expect(screen.getByTestId("finish-design-bake")).toBeDisabled();
    });

    it("blocks Bake when only some steps have their evidence", () => {
      setupQueries({ stepEvidence: [stepNote("step-1")] });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      goToDesign();

      expect(screen.getByTestId("finish-design-bake")).toBeDisabled();
    });

    // The issue's own case: a goal whose steps are untouched but which has one
    // typed row filed somewhere. `canCompleteGoal` — the old floor — says yes.
    it("blocks Bake when a step carries only part of a multi-type plan", () => {
      setupQueries({
        steps: [
          { ...STEPS[0], plannedEvidenceTypes: '["text","photo"]' },
          { ...STEPS[1] },
        ],
        stepEvidence: [stepNote("step-1"), stepNote("step-2")],
      });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      goToDesign();

      expect(screen.getByTestId("finish-design-bake")).toBeDisabled();
    });

    it("stays on the design stage when a blocked Bake is pressed", () => {
      setupQueries({ stepEvidence: [] });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      goToDesign();

      fireEvent.press(screen.getByTestId("finish-design-bake"));

      expect(screen.getByTestId("finish-design-stage")).toBeOnTheScreen();
      expect(mockCaptureBadge).not.toHaveBeenCalled();
    });

    it("opens Bake once every step has all of its planned evidence", () => {
      setupQueries({
        steps: [
          { ...STEPS[0], plannedEvidenceTypes: '["text","photo"]' },
          { ...STEPS[1] },
        ],
        stepEvidence: [
          stepNote("step-1"),
          stepNote("step-1", "photo"),
          stepNote("step-2"),
        ],
      });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      goToDesign();

      expect(screen.getByTestId("finish-design-bake")).toBeEnabled();
      expect(screen.queryByTestId("finish-design-bake-blocked")).toBeNull();
    });

    // A goal with no steps has nothing to evidence, so it cannot bake either
    // (D3) — the vacuous `[].every(...)` hole, at the screen level.
    it("blocks a stepless goal and points at adding a step, not capturing", () => {
      setupQueries({ steps: [], stepEvidence: [] });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      goToDesign();

      expect(screen.getByTestId("finish-design-bake")).toBeDisabled();
      // Nothing is outstanding on a stepless goal, so the count copy would read
      // "0 steps" — it gets its own line instead.
      expect(
        screen.getByTestId("finish-design-bake-blocked"),
      ).toHaveTextContent(t("completion:finish.design.bakeBlockedNoSteps"));
    });
  });

  describe("bake-time capture", () => {
    it("captures the edited design, not the seeded default", async () => {
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      goToDesign();

      // Shape is the section that starts open, so it's reachable directly.
      fireEvent.press(
        screen.getByLabelText(
          t("badgeDesigner:shape.optionA11y", {
            label: t("badgeDesigner:shape.options.star"),
          }),
        ),
      );
      await pressBake();

      expect(mockGetCaptureDimensions).toHaveBeenCalledWith(
        expect.objectContaining({ shape: "star" }),
        expect.anything(),
        expect.anything(),
      );
    });

    it("passes the captured PNG to useCreateBadge and enables it on baking", async () => {
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      goToDesign();
      await pressBake();

      const lastCall =
        mockUseCreateBadge.mock.calls[mockUseCreateBadge.mock.calls.length - 1];
      expect(lastCall[1]).toMatchObject({
        enabled: true,
        freshCapturedPng: CAPTURED_PNG,
      });
    });

    it("keeps useCreateBadge disabled before the user reaches baking", () => {
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);

      expect(mockUseCreateBadge.mock.calls[0][1]).toMatchObject({
        enabled: false,
      });
    });

    it("surfaces a capture failure as the error state, and its Retry returns to design", async () => {
      mockCaptureBadgeImpl = () =>
        Promise.reject(new Error("view not mounted"));
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      goToDesign();
      await pressBake();

      expect(screen.getByTestId("finish-baking-error-alert")).toBeOnTheScreen();
      // A failed capture never enables the pipeline — there is no PNG to bake.
      const lastCall =
        mockUseCreateBadge.mock.calls[mockUseCreateBadge.mock.calls.length - 1];
      expect(lastCall[1]).toMatchObject({ enabled: false });

      fireEvent.press(screen.getByTestId("finish-baking-retry-button"));
      expect(screen.getByTestId("finish-design-stage")).toBeOnTheScreen();
      expect(mockRetryBake).not.toHaveBeenCalled();
    });
  });

  describe("mapBakeStatus", () => {
    // idle/loading fold into the busy phase rather than a distinct pre-bake UI
    // — that collapse is what lets FinishBakingStage's reset effect see a
    // non-error tick during retryBake() and re-arm the Retry button.
    it.each([
      ["idle", "building"],
      ["loading", "building"],
      ["building", "building"],
      ["signing", "signing"],
      ["baking", "baking"],
      ["storing", "storing"],
      ["done", "success"],
      ["error", "error"],
      ["no-key", "no-key"],
    ] as const)("maps %s → %s", (hookStatus, expected) => {
      expect(mapBakeStatus(hookStatus)).toBe(expected);
    });
  });

  describe("baking states", () => {
    const renderAtBaking = async (
      status: string,
      error: string | null = null,
    ) => {
      mockUseCreateBadge.mockReturnValue({
        status,
        error,
        retryBake: mockRetryBake,
      });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      goToDesign();
      await pressBake();
    };

    it("renders the localized busy label while building", async () => {
      await renderAtBaking("building");
      expect(
        screen.getByText(t("completion:finish.baking.label")),
      ).toBeOnTheScreen();
    });

    it("renders the no-key alert with a working exit to the goals list", async () => {
      await renderAtBaking("no-key");

      expect(
        screen.getByLabelText(t("completion:badge.noKeyMessage")),
      ).toBeOnTheScreen();
      fireEvent.press(screen.getByTestId("finish-baking-exit-button"));
      expect(mockPopToTop).toHaveBeenCalledTimes(1);
    });

    it("renders the pipeline error with the hook's message and calls retryBake", async () => {
      await renderAtBaking("error", "signing blew up");

      expect(
        screen.getByLabelText(
          t("completion:badge.errorMessage", { message: "signing blew up" }),
        ),
      ).toBeOnTheScreen();
      fireEvent.press(screen.getByTestId("finish-baking-retry-button"));
      expect(mockRetryBake).toHaveBeenCalledTimes(1);
    });

    // The bug the issue warns about: if the mapped status went error → error
    // with no busy tick between, FinishBakingStage's reset effect never fires
    // and Retry stays disabled after the first press.
    it("never hands FinishBakingStage two consecutive error statuses across a retry", async () => {
      mockUseCreateBadge.mockReturnValue({
        status: "error",
        error: "first failure",
        retryBake: mockRetryBake,
      });
      const { rerender } = renderWithProviders(
        <CompletionFlowScreen {...routeProps} />,
      );
      goToDesign();
      await pressBake();

      const seen: string[] = ["error"];
      // retryBake() walks the hook error → idle → building → error again.
      for (const hookStatus of ["idle", "building", "error"]) {
        mockUseCreateBadge.mockReturnValue({
          status: hookStatus,
          error: hookStatus === "error" ? "second failure" : null,
          retryBake: mockRetryBake,
        });
        rerender(<CompletionFlowScreen {...routeProps} />);
        seen.push(mapBakeStatus(hookStatus as never));
      }

      expect(seen).toEqual(["error", "building", "building", "error"]);
      const consecutive = seen.some(
        (s, idx) => idx > 0 && s === "error" && seen[idx - 1] === "error",
      );
      expect(consecutive).toBe(false);
      // And the retry button is live again after the round trip.
      expect(
        screen.getByTestId("finish-baking-retry-button"),
      ).not.toBeDisabled();
    });
  });

  describe("closing note", () => {
    it("saves a goal-scoped text evidence row on blur", () => {
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);

      fireEvent.press(screen.getByTestId("finish-celebrate-note-prompt"));
      const input = screen.getByTestId("finish-celebrate-note-input");
      fireEvent.changeText(input, "  That took a while.  ");
      fireEvent(input, "blur");

      expect(mockCreateEvidence).toHaveBeenCalledWith({
        goalId: "goal-1",
        type: "text",
        uri: "content:text;That took a while.",
        description: undefined,
      });
    });

    it("saves nothing for an empty or whitespace-only note", () => {
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);

      fireEvent.press(screen.getByTestId("finish-celebrate-note-prompt"));
      const input = screen.getByTestId("finish-celebrate-note-input");
      fireEvent.changeText(input, "   ");
      fireEvent(input, "blur");

      expect(mockCreateEvidence).not.toHaveBeenCalled();
    });

    it("does not append a duplicate row when the same text blurs twice", () => {
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);

      fireEvent.press(screen.getByTestId("finish-celebrate-note-prompt"));
      const input = screen.getByTestId("finish-celebrate-note-input");
      fireEvent.changeText(input, "Done and dusted.");
      fireEvent(input, "blur");
      fireEvent(input, "blur");

      expect(mockCreateEvidence).toHaveBeenCalledTimes(1);
    });
  });

  describe("reveal stage", () => {
    const renderAtReveal = async () => {
      mockUseCreateBadge.mockReturnValue({
        status: "done",
        error: null,
        retryBake: mockRetryBake,
      });
      setupQueries({ badge: BADGE_ROW });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      goToDesign();
      fireEvent.press(screen.getByTestId("finish-design-bake"));
      await waitFor(() =>
        expect(screen.getByTestId("finish-reveal-stage")).toBeOnTheScreen(),
      );
    };

    it("shows the goal title and the formatted earned date", async () => {
      await renderAtReveal();

      expect(screen.getByText(GOAL.title)).toBeOnTheScreen();
      // From goal.completedAt, formatted in the active UI language.
      expect(screen.getByText(/2026/)).toBeOnTheScreen();
    });

    it("navigates cross-tab to the real BadgeDetail on View badge", async () => {
      await renderAtReveal();
      fireEvent.press(screen.getByTestId("finish-reveal-view-badge"));

      expect(mockParentNavigate).toHaveBeenCalledWith("BadgesTab", {
        screen: "BadgeDetail",
        params: { badgeId: "badge-1" },
        initial: false,
      });
    });

    // The finish route is presented as a modal on GoalsStack, and an iOS
    // native-stack modal covers the whole screen. Switching the tab underneath
    // without dismissing it leaves BadgeDetail rendering invisibly behind the
    // modal — which reads as "View badge does nothing".
    it("dismisses the finish modal before hopping to the badges tab", async () => {
      await renderAtReveal();
      fireEvent.press(screen.getByTestId("finish-reveal-view-badge"));

      expect(mockPopToTop).toHaveBeenCalledTimes(1);
      expect(mockPopToTop.mock.invocationCallOrder[0]).toBeLessThan(
        mockParentNavigate.mock.invocationCallOrder[0],
      );
    });

    it("pops to the goals list on Back to goals", async () => {
      await renderAtReveal();
      fireEvent.press(screen.getByTestId("finish-reveal-back-to-goals"));

      expect(mockPopToTop).toHaveBeenCalledTimes(1);
    });

    it("does not throw when the parent tab navigator is missing", async () => {
      await renderAtReveal();
      mockGetParentResult = undefined;

      fireEvent.press(screen.getByTestId("finish-reveal-view-badge"));
      expect(mockParentNavigate).not.toHaveBeenCalled();
    });
  });

  describe("completed goal re-entry (#563)", () => {
    const COMPLETED_GOAL = { ...GOAL, status: "completed" };
    const BAKED_BADGE_ROW = { ...BADGE_ROW, design: '{"shape":"star"}' };

    /** Shape of the design CompletionFlow is currently rendering, read off the
     *  JSON it hands useCreateBadge — the same value the reveal renders. */
    const renderedDesignShape = () => {
      const lastCall =
        mockUseCreateBadge.mock.calls[mockUseCreateBadge.mock.calls.length - 1];
      return (JSON.parse(lastCall[1].design as string) as { shape: string })
        .shape;
    };

    it("opens on the read-only reveal, never on celebrate or design", () => {
      mockUseCreateBadge.mockReturnValue({
        status: "done",
        error: null,
        retryBake: mockRetryBake,
      });
      setupQueries({ goal: COMPLETED_GOAL, badge: BAKED_BADGE_ROW });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);

      expect(screen.getByTestId("finish-reveal-stage")).toBeOnTheScreen();
      expect(screen.queryByTestId("finish-celebrate-stage")).toBeNull();
      expect(screen.queryByTestId("finish-design-stage")).toBeNull();
      expect(screen.queryByTestId("finish-design-bake")).toBeNull();
    });

    it("reveals the badge on record (badge.design), not a default synthesized from the goal", () => {
      mockUseCreateBadge.mockReturnValue({
        status: "done",
        error: null,
        retryBake: mockRetryBake,
      });
      // goal.design is null on every goal completed through this flow — the
      // bake writes badge.design only — so the old goal-first seed rendered a
      // design the user had never seen.
      setupQueries({ goal: COMPLETED_GOAL, badge: BAKED_BADGE_ROW });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);

      expect(renderedDesignShape()).toBe("star");
    });

    it("prefers badge.design over goal.design when both are set", () => {
      setupQueries({
        goal: { ...GOAL, design: '{"shape":"circle"}' },
        badge: BAKED_BADGE_ROW,
      });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      goToDesign();

      expect(renderedDesignShape()).toBe("star");
    });

    it("still opens on celebrate for a completed goal with no badge row", () => {
      // The completed-without-badge partial state (completeGoal ok, badge write
      // failed) is not sealed — the flow must stay walkable so the user can bake.
      setupQueries({ goal: COMPLETED_GOAL, badge: null });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);

      expect(screen.getByTestId("finish-celebrate-stage")).toBeOnTheScreen();
    });

    it("still opens on celebrate for an active goal that already has a badge row", () => {
      setupQueries({ goal: GOAL, badge: BADGE_ROW });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);

      expect(screen.getByTestId("finish-celebrate-stage")).toBeOnTheScreen();
    });
  });

  describe("goal not found", () => {
    it("renders the fallback message instead of any stage", () => {
      setupQueries({ goal: null });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);

      expect(
        screen.getByText(t("completion:errors.goalNotFound")),
      ).toBeOnTheScreen();
      expect(screen.queryByTestId("finish-celebrate-stage")).toBeNull();
    });
  });
});
