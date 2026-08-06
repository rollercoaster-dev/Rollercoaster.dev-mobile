import React from "react";
import { AccessibilityInfo } from "react-native";
import {
  renderWithProviders,
  screen,
  fireEvent,
} from "../../../__tests__/test-utils";
import { reportError } from "../../../services/sentry-report";
import { i18n } from "../../../i18n";
import { evidenceLabel, evidenceShortLabel } from "../../../i18n/labels";
import { FocusModeScreen } from "../FocusModeScreen";

// --- Mocks ---

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
// The shared navigation stub has no `setParams`; the screen calls it to consume
// the Timeline-return `stepId` param (#467 D2), so it needs one here.
const mockSetParams = jest.fn();
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
        setParams: mockSetParams,
      };
      return navigation;
    }),
  };
});

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
}));

jest.mock("../../../hooks/useAnimationPref", () => ({
  useAnimationPref: () => ({
    animationPref: "full",
    shouldAnimate: true,
    shouldReduceMotion: false,
    setAnimationPref: jest.fn(),
  }),
}));

jest.mock("../../../services/sentry-report", () => ({
  reportError: jest.fn(),
  breadcrumb: jest.fn(),
}));

// Evolu writes return a Result rather than void, and the screen now checks it —
// so these mocks hand back `{ ok: true }` like a successful real write. A test
// that wants the returned-failure path overrides with `{ ok: false, error }`.
const okMutation = () =>
  jest.fn((..._args: unknown[]) => ({ ok: true as const, value: undefined }));
const mockCompleteStep = okMutation();
const mockUncompleteStep = okMutation();
const mockPauseStep = okMutation();
const mockResumeStep = okMutation();
const mockUpdateStep = okMutation();

jest.mock("../../../db", () => {
  // The completion gate below calls the *production* helpers rather than
  // re-deriving their behavior: `resolvePlannedEvidenceTypes` drops non-string
  // elements and treats an all-non-string array as unset (→ ["text"], #466 D4),
  // and `validateEvidenceType` folds unknown types to `file`. Hand-copying
  // either is how a mock silently diverges from real gating on corrupted JSON.
  // Both are pure leaf modules, so requiring them here pulls in no Evolu
  // runtime.
  const { resolvePlannedEvidenceTypes } = jest.requireActual<
    typeof import("../../../utils/parsePlannedEvidenceTypes")
  >("../../../utils/parsePlannedEvidenceTypes");
  const { validateEvidenceType } = jest.requireActual<
    typeof import("../../../types/evidence")
  >("../../../types/evidence");
  // Fixtures feed deliberately corrupt JSON; the real gate logs those through
  // rd-logger, so swallow them here instead of spraying the test output.
  const quietLogger = { warn: () => {}, error: () => {} };

  return {
    // `paused` is load-bearing here — the screen branches on it for the
    // "Pick this back up" card and the resolver skips it (#417).
    StepStatus: {
      pending: "pending",
      completed: "completed",
      paused: "paused",
    },
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
    stepEvidenceByGoalQuery: jest.fn(
      (id: string) => `stepEvidenceByGoalQuery-${id}`,
    ),
    userSettingsQuery: "userSettingsQuery",
    createUserSettings: jest.fn(),
    updateUserSettings: jest.fn(),
    completeStep: (...args: unknown[]) => mockCompleteStep(...args),
    uncompleteStep: (...args: unknown[]) => mockUncompleteStep(...args),
    pauseStep: (...args: unknown[]) => mockPauseStep(...args),
    resumeStep: (...args: unknown[]) => mockResumeStep(...args),
    updateStep: (...args: unknown[]) => mockUpdateStep(...args),
    canCompleteStep: (
      plannedJson: string | null,
      evidence: { type: string | null }[],
    ) => {
      const planned = resolvePlannedEvidenceTypes(plannedJson, quietLogger).map(
        validateEvidenceType,
      );
      const captured = evidence
        .filter((e) => e.type !== null)
        .map((e) => validateEvidenceType(e.type!));
      return captured.some((type) => planned.includes(type));
    },
    // Faithful copy: an empty list is *not* complete, which is what makes the
    // screen's stepless-goal branch (D6) distinguishable from the all-done one.
    areAllStepsComplete: (rows: readonly { status: string | null }[]) =>
      rows.length > 0 && rows.every((s) => s.status === "completed"),
    resolveStepDependencyBand: (
      step: {
        id: string;
        afterStepId: string | null;
        waitingOnLabel: string | null;
        waitingOnExpectedAt: string | null;
        dueAt: string | null;
      },
      goalSteps: readonly { id: string; title: string | null }[],
    ) => ({
      afterStepTitle:
        step.afterStepId && step.afterStepId !== step.id
          ? (goalSteps.find((s) => s.id === step.afterStepId)?.title ?? null)
          : null,
      waitingOnLabel: step.waitingOnLabel ?? null,
      waitingOnExpectedAt: step.waitingOnExpectedAt ?? null,
      dueAt: step.dueAt ?? null,
    }),
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
    // Faithful copy of the real resolver (leaf/invite/parked/flat/none + orphan
    // promotion, paused skipped like completed) so the #292/#337 resolution the
    // screen depends on is exercised, not stubbed.
    // Keep in sync with resolveNextActionableStep in src/db/queries.ts.
    resolveNextActionableStep: (
      rows: readonly {
        id: string;
        parentStepId: string | null;
        status: string | null;
      }[],
    ) => {
      const skip = (s: string | null) => s === "completed" || s === "paused";
      const rootIds = new Set(
        rows.filter((r) => r.parentStepId == null).map((r) => r.id),
      );
      const childrenByParent = new Map<
        string,
        { index: number; status: string | null }[]
      >();
      const topLevel: { id: string; index: number; status: string | null }[] =
        [];
      rows.forEach((row, index) => {
        if (row.parentStepId != null && rootIds.has(row.parentStepId)) {
          const entry = { index, status: row.status };
          const list = childrenByParent.get(row.parentStepId);
          if (list) list.push(entry);
          else childrenByParent.set(row.parentStepId, [entry]);
        } else {
          topLevel.push({ id: row.id, index, status: row.status });
        }
      });
      for (const step of topLevel) {
        const children = childrenByParent.get(step.id) ?? [];
        const pendingChild = children.find((c) => !skip(c.status));
        if (pendingChild) {
          return { kind: "leaf", index: pendingChild.index, parentIndex: step.index }; // prettier-ignore
        }
        if (skip(step.status)) continue;
        if (children.length > 0) {
          // All children completed is `invite`; any paused among them is
          // `parked` — set aside is not done (#536).
          const allChildrenCompleted = children.every((c) => c.status === "completed"); // prettier-ignore
          return { kind: allChildrenCompleted ? "invite" : "parked", index: step.index, childCount: children.length }; // prettier-ignore
        }
        return { kind: "flat", index: step.index };
      }
      return { kind: "none" };
    },
    // Behavioural stub of the index collapse, not a structural copy: the real
    // resolveActionableIndex is an exhaustive switch, so a kind added without a
    // case fails to compile there. This shim would silently return null
    // instead — it agrees only for the five kinds above. queries.step.test.ts
    // owns the real helper's coverage.
    resolveActionableIndex: (result: { kind: string; index?: number }) =>
      result.kind === "none" ? null : (result.index ?? null),
  };
});

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

/** A flat step row in the shape `stepsByGoalQuery` returns. */
function step(
  id: string,
  overrides: Partial<{
    title: string;
    status: string;
    ordinal: number;
    parentStepId: string | null;
    plannedEvidenceTypes: string | null;
    afterStepId: string | null;
    waitingOnLabel: string | null;
    waitingOnExpectedAt: string | null;
    dueAt: string | null;
  }> = {},
) {
  return {
    id,
    title: id,
    status: "pending",
    ordinal: 0,
    parentStepId: null,
    plannedEvidenceTypes: null,
    afterStepId: null,
    waitingOnLabel: null,
    waitingOnExpectedAt: null,
    dueAt: null,
    ...overrides,
  };
}

/** One pending step planning a photo, with nothing captured yet. */
const PHOTO_STEP = [
  step("step-1", {
    title: "Read docs",
    plannedEvidenceTypes: '["photo"]',
  }),
];

const routeProps = {
  route: {
    key: "FocusMode-1",
    name: "FocusMode" as const,
    params: { goalId: "goal-1" },
  },
  navigation: {} as never,
};

/** Route props as the Timeline-return leg passes them: a tapped step's id. */
function routePropsForStep(stepId: string) {
  return {
    ...routeProps,
    route: { ...routeProps.route, params: { goalId: "goal-1", stepId } },
  };
}

function setupQueries({
  goal = GOAL,
  steps = PHOTO_STEP,
  stepEvidence = [] as object[],
}: {
  goal?: object | null;
  steps?: object[];
  stepEvidence?: object[];
} = {}) {
  mockUseQuery.mockImplementation((query: unknown) => {
    if (query === "goalsQuery") return goal ? [goal] : [];
    if (
      typeof query === "string" &&
      query.startsWith("stepEvidenceByGoalQuery")
    )
      return stepEvidence;
    if (typeof query === "string" && query.startsWith("stepsByGoalQuery"))
      return steps;
    return [];
  });
}

/**
 * The title of the single rendered current-task card. Three headers are on
 * screen, in tree order: the ScreenSubHeader label, the goal title, and last
 * the card's step title (every card variant renders it as a header). Asserting
 * the count keeps this honest — a second card would break it rather than
 * silently changing which title is read.
 */
function currentCardTitle(): string {
  const headers = screen.getAllByRole("header");
  expect(headers).toHaveLength(3);
  return headers[2].props.children as string;
}

const t = i18n.t.bind(i18n);

beforeEach(() => {
  jest.clearAllMocks();
});

// --- Tests ---

describe("FocusModeScreen", () => {
  describe("single-card body (#466)", () => {
    it("renders exactly one current-task card for the resolved step", () => {
      setupQueries({
        steps: [
          step("step-1", { title: "Read docs", status: "completed" }),
          step("step-2", { title: "Practice", ordinal: 1 }),
          step("step-3", { title: "Build it", ordinal: 2 }),
        ],
      });
      renderWithProviders(<FocusModeScreen {...routeProps} />);

      // step-2 is the first actionable step; step-3 must not also be on screen.
      expect(
        screen.getByRole("header", { name: "Practice" }),
      ).toBeOnTheScreen();
      expect(screen.queryByText("Build it")).toBeNull();
      expect(screen.queryByText("Read docs")).toBeNull();
    });

    it("drops the old navigators and drawer chrome", () => {
      setupQueries();
      renderWithProviders(<FocusModeScreen {...routeProps} />);

      // MiniTimeline nodes, ProgressDots, the carousel and the evidence drawer
      // all had these hooks; none should survive the rebuild.
      expect(screen.queryByTestId("timeline-node-0")).toBeNull();
      expect(screen.queryByTestId("step-card-parent-band")).toBeNull();
      expect(screen.queryByTestId("step-card-top-band")).toBeNull();
      expect(
        screen.queryByLabelText(t("focusMode:a11y.carousel", { count: 1 })),
      ).toBeNull();
    });

    it("keeps the edit pencil and drops the timeline eye-toggle", () => {
      setupQueries();
      renderWithProviders(<FocusModeScreen {...routeProps} />);

      expect(
        screen.getByLabelText(t("focusMode:header.editGoal")),
      ).toBeOnTheScreen();
      expect(
        screen.queryByLabelText(t("focusMode:header.hideTimeline")),
      ).toBeNull();
      expect(
        screen.queryByLabelText(t("focusMode:header.showTimeline")),
      ).toBeNull();
    });

    it("renders nothing but chrome when the goal has no steps", () => {
      setupQueries({ steps: [] });
      renderWithProviders(<FocusModeScreen {...routeProps} />);

      expect(screen.getByText("Learn TypeScript")).toBeOnTheScreen();
      expect(
        screen.getByText(t("focusMode:progressStrip.doneCount", { done: 0, total: 0 })), // prettier-ignore
      ).toBeOnTheScreen();
      expect(
        screen.queryByText(t("focusMode:currentTask.inProgress.evidenceRequired")), // prettier-ignore
      ).toBeNull();
      // Neither the parked nor the all-done state: "0 set aside" and "every step
      // done" are both nonsense for a goal with no steps at all (#467 D6).
      expect(screen.queryByText(t("focusMode:parked.heading"))).toBeNull();
      expect(
        screen.queryByText(t("focusMode:currentTask.allComplete.heading")),
      ).toBeNull();
    });

    it("shows the goal-not-found message when the goal is missing", () => {
      setupQueries({ goal: null, steps: [] });
      renderWithProviders(<FocusModeScreen {...routeProps} />);
      expect(
        screen.getByText(t("focusMode:errors.goalNotFound")),
      ).toBeOnTheScreen();
    });
  });

  describe("progress strip", () => {
    it("counts completed steps against the total", () => {
      setupQueries({
        steps: [
          step("step-1", { status: "completed" }),
          step("step-2", { status: "completed", ordinal: 1 }),
          step("step-3", { ordinal: 2 }),
        ],
      });
      renderWithProviders(<FocusModeScreen {...routeProps} />);

      expect(
        screen.getByText(t("focusMode:progressStrip.doneCount", { done: 2, total: 3 })), // prettier-ignore
      ).toBeOnTheScreen();
    });

    it("navigates to the Timeline when tapped", () => {
      setupQueries();
      renderWithProviders(<FocusModeScreen {...routeProps} />);

      fireEvent.press(
        screen.getByLabelText(
          t("focusMode:progressStrip.a11yLabel", { done: 0, total: 1 }),
        ),
      );
      expect(mockNavigate).toHaveBeenCalledWith("TimelineJourney", {
        goalId: "goal-1",
      });
    });
  });

  describe("step state mapping", () => {
    // Routed with the step pinned (#467 D2). The resolver skips paused and
    // completed steps, so those two variants are only ever on screen because the
    // user tapped that node in the Timeline — pinning is how the screen reaches
    // them at all now that auto-advance owns the unpinned case.
    it.each([
      ["pending", "pending", "currentTask.inProgress.pauseCta"],
      ["paused", "paused", "currentTask.paused.pickUpCta"],
      ["completed", "completed", "currentTask.completed.reopenCta"],
    ] as const)(
      "renders the %s card variant for a %s step",
      (_label, status, ctaKey) => {
        setupQueries({
          steps: [step("step-1", { title: "Read docs", status })],
        });
        renderWithProviders(
          <FocusModeScreen {...routePropsForStep("step-1")} />,
        );

        expect(currentCardTitle()).toBe("Read docs");
        expect(screen.getByText(t(`focusMode:${ctaKey}`))).toBeOnTheScreen();
      },
    );
  });

  describe("all-done state (#467 D5/D8)", () => {
    const ALL_DONE_STEPS = [
      step("step-1", { title: "Read docs", status: "completed" }),
      step("step-2", { title: "Practice", status: "completed", ordinal: 1 }),
    ];

    it("renders the all-complete card when every step is done", () => {
      setupQueries({ steps: ALL_DONE_STEPS });
      renderWithProviders(<FocusModeScreen {...routeProps} />);

      expect(
        screen.getByText(t("focusMode:currentTask.allComplete.heading")),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(t("focusMode:currentTask.allComplete.body")),
      ).toBeOnTheScreen();
      // Not a per-step card: no "Reopen this step" for the last completed step.
      expect(
        screen.queryByText(t("focusMode:currentTask.completed.reopenCta")),
      ).toBeNull();
    });

    it("opens CompletionFlow from Design your badge", () => {
      setupQueries({ steps: ALL_DONE_STEPS });
      renderWithProviders(<FocusModeScreen {...routeProps} />);

      fireEvent.press(
        screen.getByLabelText(
          t("focusMode:currentTask.allComplete.designBadgeA11y"),
        ),
      );
      expect(mockNavigate).toHaveBeenCalledWith("CompletionFlow", {
        goalId: "goal-1",
      });
    });

    it("reaches the all-done state by completing the last pending step", () => {
      setupQueries({
        steps: [
          step("step-1", { title: "Read docs", status: "completed" }),
          step("step-2", { title: "Practice", ordinal: 1 }),
        ],
        stepEvidence: [{ id: "ev-1", type: "text", stepId: "step-2" }],
      });
      const { rerender } = renderWithProviders(
        <FocusModeScreen {...routeProps} />,
      );
      expect(currentCardTitle()).toBe("Practice");

      fireEvent.press(
        screen.getByLabelText(
          t("focusMode:currentTask.inProgress.markCompleteA11y"),
        ),
      );
      setupQueries({
        steps: ALL_DONE_STEPS,
        stepEvidence: [{ id: "ev-1", type: "text", stepId: "step-2" }],
      });
      rerender(<FocusModeScreen {...routeProps} />);

      expect(
        screen.getByText(t("focusMode:currentTask.allComplete.heading")),
      ).toBeOnTheScreen();
    });
  });

  describe("parked state (#467 D5/D9)", () => {
    it("renders the parked state when every remaining step is set aside", () => {
      setupQueries({
        steps: [
          step("step-1", { title: "Read docs", status: "paused" }),
          step("step-2", { title: "Practice", status: "paused", ordinal: 1 }),
        ],
      });
      renderWithProviders(<FocusModeScreen {...routeProps} />);

      expect(screen.getByText(t("focusMode:parked.heading"))).toBeOnTheScreen();
      expect(
        screen.getByText(t("focusMode:parked.body", { count: 2 })),
      ).toBeOnTheScreen();
      // One resumable row per set-aside step, and no step card beside them.
      expect(screen.getByTestId("focus-parked-row-step-1")).toBeOnTheScreen();
      expect(screen.getByTestId("focus-parked-row-step-2")).toBeOnTheScreen();
      expect(
        screen.queryByText(t("focusMode:currentTask.paused.pickUpCta")),
      ).toBeNull();
    });

    it("resumes that row's own step when a row is tapped", () => {
      setupQueries({
        steps: [
          step("step-1", { title: "Read docs", status: "paused" }),
          step("step-2", { title: "Practice", status: "paused", ordinal: 1 }),
        ],
      });
      renderWithProviders(<FocusModeScreen {...routeProps} />);

      fireEvent.press(screen.getByTestId("focus-parked-row-step-2"));
      expect(mockResumeStep).toHaveBeenCalledWith("step-2");
      expect(mockResumeStep).toHaveBeenCalledTimes(1);
    });

    it("surfaces a failed row resume as a toast rather than silently", () => {
      // Parked rows go through runStepMutation like every other write (D7).
      mockResumeStep.mockImplementationOnce(() => {
        throw new Error("write failed");
      });
      setupQueries({
        steps: [step("step-1", { title: "Read docs", status: "paused" })],
      });
      renderWithProviders(<FocusModeScreen {...routeProps} />);

      fireEvent.press(screen.getByTestId("focus-parked-row-step-1"));
      expect(
        screen.getByText(
          t("focusMode:errors.couldNotUpdateStep", { message: "write failed" }),
        ),
      ).toBeOnTheScreen();
    });

    it("prefers the parked state over the all-done one for a mixed goal", () => {
      // Nothing actionable, but not every step is complete — the D5 ordering
      // (all-done checked first) must not claim this goal as finished.
      setupQueries({
        steps: [
          step("step-1", { title: "Read docs", status: "completed" }),
          step("step-2", { title: "Practice", status: "paused", ordinal: 1 }),
        ],
      });
      renderWithProviders(<FocusModeScreen {...routeProps} />);

      expect(
        screen.getByText(t("focusMode:parked.body", { count: 1 })),
      ).toBeOnTheScreen();
      expect(
        screen.queryByText(t("focusMode:currentTask.allComplete.heading")),
      ).toBeNull();
    });

    it("shows the card, not the parked state, while a step is still actionable", () => {
      setupQueries({
        steps: [
          step("step-1", { title: "Read docs", status: "paused" }),
          step("step-2", { title: "Practice", ordinal: 1 }),
        ],
      });
      renderWithProviders(<FocusModeScreen {...routeProps} />);

      expect(currentCardTitle()).toBe("Practice");
      expect(screen.queryByText(t("focusMode:parked.heading"))).toBeNull();
    });
  });

  describe("set aside / pick back up / reopen (#417)", () => {
    it("calls pauseStep without navigating away", () => {
      setupQueries();
      renderWithProviders(<FocusModeScreen {...routeProps} />);

      fireEvent.press(
        screen.getByLabelText(t("focusMode:currentTask.inProgress.pauseA11y")),
      );
      expect(mockPauseStep).toHaveBeenCalledWith("step-1");
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("calls resumeStep from a paused card", () => {
      setupQueries({ steps: [step("step-1", { status: "paused" })] });
      renderWithProviders(<FocusModeScreen {...routePropsForStep("step-1")} />);

      fireEvent.press(
        screen.getByLabelText(t("focusMode:currentTask.paused.pickUpA11y")),
      );
      expect(mockResumeStep).toHaveBeenCalledWith("step-1");
    });

    it("calls uncompleteStep from a completed card", () => {
      setupQueries({ steps: [step("step-1", { status: "completed" })] });
      renderWithProviders(<FocusModeScreen {...routePropsForStep("step-1")} />);

      fireEvent.press(
        screen.getByLabelText(t("focusMode:currentTask.completed.reopenA11y")),
      );
      expect(mockUncompleteStep).toHaveBeenCalledWith("step-1");
    });

    it("toasts rather than throwing when a mutation fails", () => {
      mockPauseStep.mockImplementationOnce(() => {
        throw new Error("write failed");
      });
      setupQueries();
      renderWithProviders(<FocusModeScreen {...routeProps} />);

      fireEvent.press(
        screen.getByLabelText(t("focusMode:currentTask.inProgress.pauseA11y")),
      );
      expect(
        screen.getByText(
          t("focusMode:errors.couldNotUpdateStep", { message: "write failed" }),
        ),
      ).toBeOnTheScreen();
    });

    it("toasts and reports when a mutation returns a failed Result", () => {
      // Evolu's engine reports write failures by returning `{ ok: false }`
      // without throwing — that path must surface exactly like a thrown one.
      mockPauseStep.mockReturnValueOnce({
        ok: false,
        error: new Error("write rejected"),
      } as never);
      setupQueries();
      renderWithProviders(<FocusModeScreen {...routeProps} />);

      fireEvent.press(
        screen.getByLabelText(t("focusMode:currentTask.inProgress.pauseA11y")),
      );
      expect(
        screen.getByText(
          t("focusMode:errors.couldNotUpdateStep", {
            message: "write rejected",
          }),
        ),
      ).toBeOnTheScreen();
      expect(reportError).toHaveBeenCalledWith(expect.any(Error), {
        area: "focus.mode",
        kind: "step-toggle",
      });
    });

    it("announces the reopen only when the write succeeds", () => {
      const announce = jest.spyOn(
        AccessibilityInfo,
        "announceForAccessibility",
      );
      // The failure toast announces itself, so assert on the success line
      // specifically rather than on "nothing was announced".
      const successLine = t("focusMode:a11y.stepUncompleted", {
        title: "step-1",
      });
      mockUncompleteStep.mockReturnValueOnce({
        ok: false,
        error: new Error("write rejected"),
      } as never);
      setupQueries({ steps: [step("step-1", { status: "completed" })] });
      renderWithProviders(<FocusModeScreen {...routePropsForStep("step-1")} />);
      const reopen = screen.getByLabelText(
        t("focusMode:currentTask.completed.reopenA11y"),
      );

      fireEvent.press(reopen);
      expect(announce).not.toHaveBeenCalledWith(successLine);

      // Second press falls through to the `{ ok: true }` default.
      fireEvent.press(reopen);
      expect(announce).toHaveBeenCalledWith(successLine);
      announce.mockRestore();
    });
  });

  describe("current-step resolution while mounted", () => {
    it("auto-advances to the next actionable step once the focused step completes", () => {
      setupQueries({
        steps: [
          step("step-1", { title: "Read docs" }),
          step("step-2", { title: "Practice", ordinal: 1 }),
        ],
      });
      const { rerender } = renderWithProviders(
        <FocusModeScreen {...routeProps} />,
      );
      expect(currentCardTitle()).toBe("Read docs");

      // The query re-emits with step-1 completed — the card must move on rather
      // than sit on the finished step (#467 D1 replaces #466's resolve-and-hold).
      setupQueries({
        steps: [
          step("step-1", { title: "Read docs", status: "completed" }),
          step("step-2", { title: "Practice", ordinal: 1 }),
        ],
      });
      rerender(<FocusModeScreen {...routeProps} />);

      expect(currentCardTitle()).toBe("Practice");
    });

    it("advances past a step that was set aside", () => {
      setupQueries({
        steps: [
          step("step-1", { title: "Read docs" }),
          step("step-2", { title: "Practice", ordinal: 1 }),
        ],
      });
      const { rerender } = renderWithProviders(
        <FocusModeScreen {...routeProps} />,
      );

      fireEvent.press(
        screen.getByLabelText(t("focusMode:currentTask.inProgress.pauseA11y")),
      );
      expect(mockPauseStep).toHaveBeenCalledWith("step-1");

      setupQueries({
        steps: [
          step("step-1", { title: "Read docs", status: "paused" }),
          step("step-2", { title: "Practice", ordinal: 1 }),
        ],
      });
      rerender(<FocusModeScreen {...routeProps} />);

      expect(currentCardTitle()).toBe("Practice");
    });

    it("lands on the parent once its last pending sub-step completes", () => {
      // The static resolution table below proves the resolver's answer on first
      // render; this proves a *live* child → parent transition reaches it.
      const steps = (drillBStatus: string) => [
        step("step-1", { title: "Read docs", status: "completed" }),
        step("step-2", { title: "Practice", ordinal: 1 }),
        step("step-2a", { title: "Drill A", status: "completed", parentStepId: "step-2" }), // prettier-ignore
        step("step-2b", { title: "Drill B", status: drillBStatus, ordinal: 1, parentStepId: "step-2" }), // prettier-ignore
      ];
      const evidence = [{ id: "ev-1", type: "text", stepId: "step-2b" }];
      setupQueries({ steps: steps("pending"), stepEvidence: evidence });
      const { rerender } = renderWithProviders(
        <FocusModeScreen {...routeProps} />,
      );
      expect(currentCardTitle()).toBe("Drill B");

      fireEvent.press(
        screen.getByLabelText(
          t("focusMode:currentTask.inProgress.markCompleteA11y"),
        ),
      );
      expect(mockCompleteStep).toHaveBeenCalledWith("step-2b", null, [
        { type: "text" },
      ]);

      setupQueries({ steps: steps("completed"), stepEvidence: evidence });
      rerender(<FocusModeScreen {...routeProps} />);

      // Every child done → the resolver's `invite` on the parent itself.
      expect(currentCardTitle()).toBe("Practice");
    });

    it("re-resolves when the focused step is gone from the rows", () => {
      setupQueries({
        steps: [
          step("step-1", { title: "Read docs" }),
          step("step-2", { title: "Practice", ordinal: 1 }),
        ],
      });
      const { rerender } = renderWithProviders(
        <FocusModeScreen {...routeProps} />,
      );
      expect(currentCardTitle()).toBe("Read docs");

      // EditMode deletes the focused step while this screen stays mounted — a
      // dangling id would leave the card section empty.
      setupQueries({ steps: [step("step-2", { title: "Practice" })] });
      rerender(<FocusModeScreen {...routeProps} />);

      expect(currentCardTitle()).toBe("Practice");
    });
  });

  describe("Timeline return leg (#467 D2)", () => {
    const TWO_PENDING = [
      step("step-1", { title: "Read docs" }),
      step("step-2", { title: "Practice", ordinal: 1 }),
    ];

    it("lands on the tapped step instead of the resolver's pick", () => {
      // The resolver would pick step-1 (first pending); the route param wins.
      setupQueries({ steps: TWO_PENDING });
      renderWithProviders(<FocusModeScreen {...routePropsForStep("step-2")} />);

      expect(currentCardTitle()).toBe("Practice");
    });

    it("consumes the param so a later arrival cannot re-pin a stale step", () => {
      setupQueries({ steps: TWO_PENDING });
      renderWithProviders(<FocusModeScreen {...routePropsForStep("step-2")} />);

      expect(mockSetParams).toHaveBeenCalledWith({ stepId: undefined });
    });

    it("ignores a pinned id that is not in the rows", () => {
      // EditMode can delete the step between the Timeline tap and this render.
      setupQueries({ steps: TWO_PENDING });
      renderWithProviders(<FocusModeScreen {...routePropsForStep("gone")} />);

      expect(currentCardTitle()).toBe("Read docs");
    });

    it("drops the pin once the user acts on the pinned step", () => {
      setupQueries({
        steps: [
          step("step-1", { title: "Read docs" }),
          step("step-2", { title: "Practice", status: "paused", ordinal: 1 }),
        ],
      });
      const { rerender } = renderWithProviders(
        <FocusModeScreen {...routePropsForStep("step-2")} />,
      );
      expect(currentCardTitle()).toBe("Practice");

      fireEvent.press(
        screen.getByLabelText(t("focusMode:currentTask.paused.pickUpA11y")),
      );
      expect(mockResumeStep).toHaveBeenCalledWith("step-2");

      // step-2 is still in the rows, so a *held* pin would keep showing it. With
      // the pin dropped, resolution is back to the resolver — which picks
      // step-1, the earlier pending step.
      setupQueries({ steps: TWO_PENDING });
      rerender(<FocusModeScreen {...routePropsForStep("step-2")} />);

      expect(currentCardTitle()).toBe("Read docs");
    });
  });

  describe("evidence-gated completion", () => {
    it("hides Mark complete until every planned type is captured", () => {
      setupQueries({
        steps: [step("step-1", { plannedEvidenceTypes: '["photo","text"]' })],
        stepEvidence: [{ id: "ev-1", type: "photo", stepId: "step-1" }],
      });
      renderWithProviders(<FocusModeScreen {...routeProps} />);

      expect(
        screen.queryByText(t("focusMode:currentTask.inProgress.markCompleteCta")), // prettier-ignore
      ).toBeNull();
      // The unmet type is still invited; the met one is not.
      expect(
        screen.getByTestId("focus-current-task-add-text"),
      ).toBeOnTheScreen();
      expect(screen.queryByTestId("focus-current-task-add-photo")).toBeNull();
    });

    it("reveals Mark complete once the plan is satisfied and completes the step", () => {
      setupQueries({
        steps: [step("step-1", { plannedEvidenceTypes: '["photo"]' })],
        stepEvidence: [{ id: "ev-1", type: "photo", stepId: "step-1" }],
      });
      renderWithProviders(<FocusModeScreen {...routeProps} />);

      fireEvent.press(
        screen.getByLabelText(
          t("focusMode:currentTask.inProgress.markCompleteA11y"),
        ),
      );
      expect(mockCompleteStep).toHaveBeenCalledWith("step-1", '["photo"]', [
        { type: "photo" },
      ]);
    });

    it("invites a text note when the step has no evidence plan (#466 D4)", () => {
      // plannedEvidenceTypes is null — the default ["text"] applies, so the step
      // owes one note rather than being completable with nothing.
      setupQueries({ steps: [step("step-1")] });
      renderWithProviders(<FocusModeScreen {...routeProps} />);

      expect(
        screen.getByTestId("focus-current-task-add-text"),
      ).toBeOnTheScreen();
      expect(
        screen.queryByText(t("focusMode:currentTask.inProgress.markCompleteCta")), // prettier-ignore
      ).toBeNull();
    });

    it("completes a null-plan step once a text note exists (#466 D4)", () => {
      setupQueries({
        steps: [step("step-1")],
        stepEvidence: [{ id: "ev-1", type: "text", stepId: "step-1" }],
      });
      renderWithProviders(<FocusModeScreen {...routeProps} />);

      fireEvent.press(
        screen.getByLabelText(
          t("focusMode:currentTask.inProgress.markCompleteA11y"),
        ),
      );
      expect(mockCompleteStep).toHaveBeenCalledWith("step-1", null, [
        { type: "text" },
      ]);
    });

    it("falls back to the default plan when every stored type is unusable", () => {
      // The column is free-form JSON, so `[1,2,3]` is reachable. Every element
      // is dropped as a non-string, which parses as *unset* rather than as an
      // empty plan — so the step owes a text note, not nothing.
      setupQueries({
        steps: [step("step-1", { plannedEvidenceTypes: "[1,2,3]" })],
      });
      renderWithProviders(<FocusModeScreen {...routeProps} />);

      expect(
        screen.getByTestId("focus-current-task-add-text"),
      ).toBeOnTheScreen();
      expect(
        screen.queryByText(t("focusMode:currentTask.inProgress.markCompleteCta")), // prettier-ignore
      ).toBeNull();
    });

    it("shows captured evidence on the read-only rail", () => {
      setupQueries({
        steps: [step("step-1", { plannedEvidenceTypes: '["photo"]' })],
        stepEvidence: [
          {
            id: "ev-1",
            type: "photo",
            stepId: "step-1",
            description: "Bench shot",
          },
        ],
      });
      renderWithProviders(<FocusModeScreen {...routeProps} />);

      expect(screen.getByText("Bench shot")).toBeOnTheScreen();
    });
  });

  describe("evidence capture (#409 capture sheet)", () => {
    it("navigates straight to the capture screen for a specific type", () => {
      setupQueries({
        steps: [step("step-1", { plannedEvidenceTypes: '["photo"]' })],
      });
      renderWithProviders(<FocusModeScreen {...routeProps} />);

      fireEvent.press(screen.getByTestId("focus-current-task-add-photo"));
      expect(mockNavigate).toHaveBeenCalledWith("CapturePhoto", {
        goalId: "goal-1",
        stepId: "step-1",
      });
    });

    it("opens the capture sheet for the open-ended add, then navigates on pick", () => {
      setupQueries({
        steps: [step("step-1", { plannedEvidenceTypes: '["photo"]' })],
        stepEvidence: [{ id: "ev-1", type: "photo", stepId: "step-1" }],
      });
      renderWithProviders(<FocusModeScreen {...routeProps} />);

      // Plan satisfied → the generic "Add more evidence" CTA is the one shown.
      fireEvent.press(screen.getByTestId("focus-current-task-add-more"));
      expect(mockNavigate).not.toHaveBeenCalled();

      fireEvent.press(
        screen.getByRole("radio", { name: evidenceLabel(t, "link") }),
      );
      expect(mockNavigate).toHaveBeenCalledWith("CaptureLink", {
        goalId: "goal-1",
        stepId: "step-1",
      });
    });
  });

  describe("evidence plan sheet (#409 authoring grid)", () => {
    it("is closed until the planned box's change affordance is tapped", () => {
      setupQueries();
      renderWithProviders(<FocusModeScreen {...routeProps} />);

      expect(
        screen.queryByText(t("focusMode:evidencePlanSheet.title")),
      ).toBeNull();
      fireEvent.press(screen.getByTestId("focus-current-task-change-plan"));
      expect(
        screen.getByText(t("focusMode:evidencePlanSheet.title")),
      ).toBeOnTheScreen();
    });

    it("writes the new plan when a type is toggled on", () => {
      setupQueries({
        steps: [step("step-1", { plannedEvidenceTypes: '["photo"]' })],
      });
      renderWithProviders(<FocusModeScreen {...routeProps} />);

      fireEvent.press(screen.getByTestId("focus-current-task-change-plan"));
      fireEvent.press(
        screen.getByRole("checkbox", { name: evidenceLabel(t, "video") }),
      );
      expect(mockUpdateStep).toHaveBeenCalledWith("step-1", {
        plannedEvidenceTypes: ["photo", "video"],
      });
    });

    it("writes the reduced plan when a type is toggled off", () => {
      setupQueries({
        steps: [step("step-1", { plannedEvidenceTypes: '["photo","video"]' })],
      });
      renderWithProviders(<FocusModeScreen {...routeProps} />);

      fireEvent.press(screen.getByTestId("focus-current-task-change-plan"));
      fireEvent.press(
        screen.getByRole("checkbox", { name: evidenceLabel(t, "video") }),
      );
      expect(mockUpdateStep).toHaveBeenCalledWith("step-1", {
        plannedEvidenceTypes: ["photo"],
      });
    });

    it("refuses to deselect the last remaining type", () => {
      // "Every step requires evidence" — a step must never reach a 0-type plan.
      setupQueries({
        steps: [step("step-1", { plannedEvidenceTypes: '["photo"]' })],
      });
      renderWithProviders(<FocusModeScreen {...routeProps} />);

      fireEvent.press(screen.getByTestId("focus-current-task-change-plan"));
      fireEvent.press(
        screen.getByRole("checkbox", { name: evidenceLabel(t, "photo") }),
      );
      expect(mockUpdateStep).not.toHaveBeenCalled();
    });

    it("clears rather than re-adds a chip when an unknown stored type selected it", () => {
      // The column is free-form JSON, so an unknown type can be stored. It
      // renders and selects as `file` (`validateEvidenceType`); the toggle must
      // compare against that same normalized key, or tapping the chip would
      // append "file" alongside the unknown one instead of clearing it.
      setupQueries({
        steps: [step("step-1", { plannedEvidenceTypes: '["sketch","photo"]' })],
      });
      renderWithProviders(<FocusModeScreen {...routeProps} />);

      fireEvent.press(screen.getByTestId("focus-current-task-change-plan"));
      fireEvent.press(
        screen.getByRole("checkbox", { name: evidenceLabel(t, "file") }),
      );
      expect(mockUpdateStep).toHaveBeenCalledWith("step-1", {
        plannedEvidenceTypes: ["photo"],
      });
    });
  });

  describe("dependency + due-date band (#454)", () => {
    it("renders the after-step and waiting-on lines from the resolved band", () => {
      setupQueries({
        steps: [
          step("step-1", { title: "Read docs", status: "completed" }),
          step("step-2", {
            title: "Practice",
            ordinal: 1,
            afterStepId: "step-1",
            waitingOnLabel: "Manager sign-off",
          }),
        ],
      });
      renderWithProviders(<FocusModeScreen {...routeProps} />);

      expect(
        screen.getByText(
          t("focusMode:currentTask.metadata.after", { title: "Read docs" }),
        ),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(
          t("focusMode:currentTask.metadata.waitingOn", {
            who: "Manager sign-off",
          }),
        ),
      ).toBeOnTheScreen();
    });

    it("omits the band entirely when no dependency fields are set", () => {
      setupQueries();
      renderWithProviders(<FocusModeScreen {...routeProps} />);

      expect(
        screen.queryByText(
          t("focusMode:currentTask.metadata.after", { title: "Read docs" }),
        ),
      ).toBeNull();
    });
  });

  // #292/#337: which step is "current" is decided by the shared resolver. The
  // old suite asserted this through carousel index / MiniTimeline node widths;
  // with one card on screen the current step *is* the card's title.
  describe("next-actionable-step resolution (#292/#337)", () => {
    const LEAF_STEPS = [
      step("step-1", { title: "Read docs", status: "completed" }),
      step("step-2", { title: "Practice", ordinal: 1 }),
      step("step-2a", { title: "Drill A", parentStepId: "step-2" }),
      step("step-2b", { title: "Drill B", ordinal: 1, parentStepId: "step-2" }),
      step("step-3", { title: "Build it", ordinal: 2 }),
    ];

    const INVITE_STEPS = [
      step("step-1", { title: "Read docs", status: "completed" }),
      step("step-2", { title: "Practice", ordinal: 1 }),
      step("step-2a", { title: "Drill A", status: "completed", parentStepId: "step-2" }), // prettier-ignore
      step("step-2b", { title: "Drill B", status: "completed", ordinal: 1, parentStepId: "step-2" }), // prettier-ignore
      step("step-3", { title: "Build it", ordinal: 2 }),
    ];

    // Real query order: child ordinals are sibling-scoped, so a child sorts
    // before its own parent. The screen must flatten before resolving (#292).
    const INTERLEAVED_STEPS = [
      step("step-1", { title: "Read docs", status: "completed" }),
      step("step-2a", { title: "Drill A", parentStepId: "step-2" }),
      step("step-2", { title: "Practice", ordinal: 1 }),
      step("step-3", { title: "Build it", ordinal: 2 }),
    ];

    // First child done, second pending → must pick the first *pending* child,
    // not children[0].
    const PARTIAL_LEAF_STEPS = [
      step("step-1", { title: "Read docs", status: "completed" }),
      step("step-2", { title: "Practice", ordinal: 1 }),
      step("step-2a", { title: "Drill A", status: "completed", parentStepId: "step-2" }), // prettier-ignore
      step("step-2b", { title: "Drill B", ordinal: 1, parentStepId: "step-2" }),
      step("step-3", { title: "Build it", ordinal: 2 }),
    ];

    // Orphan: step-2a's parent was soft-deleted, leaving a dangling
    // parentStepId. It must be promoted, not hidden.
    const ORPHAN_STEPS = [
      step("step-1", { title: "Read docs", status: "completed" }),
      step("step-2a", { title: "Drill A", parentStepId: "step-2" }),
    ];

    // Parent manually completed while a child is still pending — reachable,
    // because completion is per-step, not cascaded.
    const COMPLETED_PARENT_PENDING_CHILD_STEPS = [
      step("step-1", { title: "Read docs", status: "completed" }),
      step("step-2", { title: "Practice", status: "completed", ordinal: 1 }),
      step("step-2a", { title: "Drill A", status: "completed", parentStepId: "step-2" }), // prettier-ignore
      step("step-2b", { title: "Drill B", ordinal: 1, parentStepId: "step-2" }),
      step("step-3", { title: "Build it", status: "completed", ordinal: 2 }),
    ];

    // A pending step deliberately set aside is skipped like a completed one.
    const PAUSED_SKIP_STEPS = [
      step("step-1", { title: "Read docs", status: "paused" }),
      step("step-2", { title: "Practice", ordinal: 1 }),
    ];

    // INVITE_STEPS with one child set aside instead of done → `parked`, not
    // `invite` (#536). Focus Mode must still land on the parent: the split is a
    // resolver-level honesty fix, and rendering it differently is #537's job.
    // Without this row the parked branch of this file's resolver mock is never
    // evaluated, so "no screen behavior changed" would be untested.
    const PARKED_STEPS = [
      step("step-1", { title: "Read docs", status: "completed" }),
      step("step-2", { title: "Practice", ordinal: 1 }),
      step("step-2a", { title: "Drill A", status: "completed", parentStepId: "step-2" }), // prettier-ignore
      step("step-2b", { title: "Drill B", status: "paused", ordinal: 1, parentStepId: "step-2" }), // prettier-ignore
      step("step-3", { title: "Build it", ordinal: 2 }),
    ];

    it.each([
      ["the first pending leaf, not its container parent", LEAF_STEPS, "Drill A"], // prettier-ignore
      ["the parent itself once all its children are done", INVITE_STEPS, "Practice"], // prettier-ignore
      ["the parent itself when its remaining children are set aside", PARKED_STEPS, "Practice"], // prettier-ignore
      ["the leaf after flattening interleaved query order", INTERLEAVED_STEPS, "Drill A"], // prettier-ignore
      ["the first pending child when an earlier sibling is done", PARTIAL_LEAF_STEPS, "Drill B"], // prettier-ignore
      ["an orphaned sub-step promoted to a reachable lead", ORPHAN_STEPS, "Drill A"], // prettier-ignore
      ["a pending leaf under a manually completed parent", COMPLETED_PARENT_PENDING_CHILD_STEPS, "Drill B"], // prettier-ignore
      ["past a step that was set aside", PAUSED_SKIP_STEPS, "Practice"],
    ] as const)("focuses %s", (_label, steps, expectedTitle) => {
      setupQueries({ steps: [...steps] });
      renderWithProviders(<FocusModeScreen {...routeProps} />);
      expect(currentCardTitle()).toBe(expectedTitle);
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

  describe("pseudo locale", () => {
    afterEach(async () => {
      if (i18n.language !== "en") await i18n.changeLanguage("en");
    });

    it.each([
      { key: "focusMode:title", query: "text" },
      { key: "focusMode:header.editGoal", query: "label" },
      { key: "focusMode:currentTask.inProgress.pauseA11y", query: "label" },
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

    it("resolves the interpolated capture-error message under pseudo locale", async () => {
      await i18n.changeLanguage("pseudo");
      const pseudo = i18n.t("focusMode:errors.couldNotOpenCapture", {
        label: evidenceShortLabel(i18n.t.bind(i18n), "photo"),
      });
      expect(pseudo.startsWith("[")).toBe(true);
    });
  });
});
