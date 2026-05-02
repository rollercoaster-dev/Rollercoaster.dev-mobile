import { renderHook } from "@testing-library/react-native";

const mockUseQuery = jest.fn();
jest.mock("@evolu/react", () => {
  const actual = jest.requireActual("@evolu/react");
  return {
    ...actual,
    useQuery: (...args: unknown[]) => mockUseQuery(...args),
  };
});

jest.mock("../../db", () => ({
  evidenceByGoalQuery: (id: string) => ({ __brand: "evidenceByGoal", id }),
  stepEvidenceByGoalQuery: (id: string) => ({
    __brand: "stepEvidenceByGoal",
    id,
  }),
  EvidenceType: {
    photo: "photo",
    text: "text",
    voice_memo: "voice_memo",
    video: "video",
    link: "link",
    file: "file",
  },
}));

import { useAllEvidenceForGoal } from "../useAllEvidenceForGoal";
import type { GoalId } from "../../db";

const goalId = "goal-1" as unknown as GoalId;

beforeEach(() => {
  jest.clearAllMocks();
});

interface StepEvidenceRow {
  id: string;
  stepId: string;
  type: string;
  description?: string | null;
  uri?: string | null;
  metadata?: string | null;
  stepTitle?: string | null;
  stepOrdinal?: number | null;
}

interface GoalEvidenceRow {
  id: string;
  type: string;
  description?: string | null;
  uri?: string | null;
  metadata?: string | null;
}

function setupQueries(args: {
  stepEvidence: StepEvidenceRow[];
  goalEvidence: GoalEvidenceRow[];
}) {
  mockUseQuery.mockImplementation((q: { __brand: string }) => {
    if (q.__brand === "stepEvidenceByGoal") return args.stepEvidence;
    if (q.__brand === "evidenceByGoal") return args.goalEvidence;
    return [];
  });
}

describe("useAllEvidenceForGoal", () => {
  it("returns empty array when no evidence exists", () => {
    setupQueries({ stepEvidence: [], goalEvidence: [] });
    const { result } = renderHook(() => useAllEvidenceForGoal(goalId));
    expect(result.current).toEqual([]);
  });

  it("orders step evidence by step ordinal then preserves createdAt-desc within step", () => {
    setupQueries({
      // Query orders by createdAt desc, so newer items first
      stepEvidence: [
        {
          id: "ev-b2",
          stepId: "step-b",
          stepOrdinal: 1,
          stepTitle: "Step B",
          type: "photo",
          description: "B-new",
        },
        {
          id: "ev-b1",
          stepId: "step-b",
          stepOrdinal: 1,
          stepTitle: "Step B",
          type: "text",
          description: "B-old",
        },
        {
          id: "ev-a1",
          stepId: "step-a",
          stepOrdinal: 0,
          stepTitle: "Step A",
          type: "voice_memo",
          description: "A",
        },
      ],
      goalEvidence: [],
    });
    const { result } = renderHook(() => useAllEvidenceForGoal(goalId));
    expect(result.current.map((e) => e.id)).toEqual([
      "ev-a1",
      "ev-b2",
      "ev-b1",
    ]);
  });

  it("places goal-level evidence after all step evidence", () => {
    setupQueries({
      stepEvidence: [
        {
          id: "ev-step",
          stepId: "step-a",
          stepOrdinal: 0,
          stepTitle: "Step A",
          type: "photo",
          description: "S",
        },
      ],
      goalEvidence: [
        { id: "ev-goal-2", type: "text", description: "Newer goal" },
        { id: "ev-goal-1", type: "link", description: "Older goal" },
      ],
    });
    const { result } = renderHook(() => useAllEvidenceForGoal(goalId));
    expect(result.current.map((e) => e.id)).toEqual([
      "ev-step",
      "ev-goal-2",
      "ev-goal-1",
    ]);
  });

  it("annotates source and stepTitle for accessibility", () => {
    setupQueries({
      stepEvidence: [
        {
          id: "ev-1",
          stepId: "step-a",
          stepOrdinal: 0,
          stepTitle: "First Step",
          type: "photo",
          description: "Photo",
        },
      ],
      goalEvidence: [{ id: "ev-2", type: "text", description: "Goal note" }],
    });
    const { result } = renderHook(() => useAllEvidenceForGoal(goalId));
    expect(result.current[0]).toMatchObject({
      id: "ev-1",
      source: "step",
      stepId: "step-a",
      stepTitle: "First Step",
    });
    expect(result.current[1]).toMatchObject({
      id: "ev-2",
      source: "goal",
      stepId: null,
      stepTitle: null,
    });
  });

  it("falls back to type when description is missing", () => {
    setupQueries({
      stepEvidence: [
        {
          id: "ev-1",
          stepId: "step-a",
          stepOrdinal: 0,
          stepTitle: "A",
          type: "photo",
          description: null,
        },
      ],
      goalEvidence: [],
    });
    const { result } = renderHook(() => useAllEvidenceForGoal(goalId));
    expect(result.current[0]?.title).toBe("photo");
  });
});
